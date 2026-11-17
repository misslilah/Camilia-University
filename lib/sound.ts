import { Vector3 } from "three"
import {
  BACK_Z,
  INSIDE,
  OUTSIDE,
  ROOM_APPROACH,
  doorDuration,
  enterDuration,
  fromRoomDuration,
  riseDuration,
  sampleEnter,
  sitDuration,
  toRoomDuration,
  type Seat,
} from "@/lib/scene"

const CLIPS = [
  "door-latch",
  "door-open-a",
  "door-open-b",
  "door-creak-a",
  "door-creak-b",
  "door-close",
  "step-stone-0",
  "step-stone-1",
  "step-stone-2",
  "step-stone-3",
  "step-carpet-0",
  "step-carpet-1",
  "step-carpet-2",
  "step-carpet-3",
  "step-carpet-4",
  "step-wood-0",
  "step-wood-1",
  "step-wood-2",
  "step-wood-3",
  "step-wood-4",
  "chair-sit",
  "chair-stand",
  "chair-creak",
  "chair-knock",
  "cloth-a",
  "cloth-b",
  "chalk-menu",
  "chalk-page",
  "erase-a",
  "erase-b",
] as const

type Clip = (typeof CLIPS)[number]
type Surface = "stone" | "carpet" | "wood"

type Hit = {
  clip: Clip
  at: number
  gain: number
  pan?: number
  rate?: number
  wet?: number
  length?: number
}

const STEPS: Record<Surface, Clip[]> = {
  stone: ["step-stone-0", "step-stone-1", "step-stone-2", "step-stone-3"],
  carpet: ["step-carpet-0", "step-carpet-1", "step-carpet-2", "step-carpet-3", "step-carpet-4"],
  wood: ["step-wood-0", "step-wood-1", "step-wood-2", "step-wood-3", "step-wood-4"],
}

const STEP_GAIN: Record<Surface, number> = { stone: 0.46, carpet: 0.58, wood: 0.42 }
const STRIDE = 0.72
const MIN_CADENCE = 0.46
const MAX_CADENCE = 0.66
const LATE_LIMIT = 0.12
const ROOM_LEVEL = 0.005
const VOLUME = 1.8

function impulse(ctx: AudioContext, seconds: number, decay: number) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const buffer = ctx.createBuffer(2, length, rate)
  let seed = 0x2f6b4a1d
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    let smooth = 0
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const white = (seed / 4294967296) * 2 - 1
      const t = i / length
      // Air absorbs the highs first, so the tail darkens as it fades.
      const darken = 0.25 + t * 0.7
      smooth += (white - smooth) * (1 - darken)
      const early = i < rate * 0.012 ? 0 : 1
      data[i] = smooth * Math.pow(1 - t, decay) * early
    }
  }
  return buffer
}

// The camera glides faster than anyone walks, so steps keep a human cadence
// instead of following its speed one stride at a time.
function horizontalWalk(
  points: { time: number; x: number; z: number }[],
  surfaceAt: (z: number) => Surface,
  stride = STRIDE,
) {
  const steps: { time: number; surface: Surface }[] = []
  let next = -1
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const dt = Math.max(1e-4, b.time - a.time)
    const speed = Math.hypot(b.x - a.x, b.z - a.z) / dt
    if (speed < 0.35) continue
    if (next < 0) next = b.time + 0.06
    if (b.time >= next) {
      steps.push({ time: b.time, surface: surfaceAt(b.z) })
      const interval = Math.min(MAX_CADENCE, Math.max(MIN_CADENCE, stride / speed))
      next = b.time + interval
    }
  }
  const last = points[points.length - 1]
  const previous = steps[steps.length - 1]
  if (previous && last.time - previous.time > 0.34) {
    steps.push({ time: last.time - 0.05, surface: surfaceAt(last.z) })
  }
  return steps
}

function hallSurface(z: number): Surface {
  return z > BACK_Z + 0.05 ? "stone" : "carpet"
}

function smooth(t: number) {
  return t * t * (3 - 2 * t)
}

class HallSound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private room: GainNode | null = null
  private raw = new Map<Clip, Promise<ArrayBuffer | null>>()
  private decoded = new Map<Clip, Promise<AudioBuffer | null>>()
  private playing = new Set<AudioBufferSourceNode>()
  private writing = new Set<AudioBufferSourceNode>()
  private variant = 0
  private muted = false

  preload() {
    if (typeof window === "undefined" || this.raw.size) return
    for (const clip of CLIPS) {
      this.raw.set(
        clip,
        fetch(`/sounds/${clip}.mp3`)
          .then((response) => (response.ok ? response.arrayBuffer() : null))
          .catch(() => null),
      )
    }
  }

  prime(muted: boolean) {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.ctx.currentTime, 0.04)
    }
  }

  setMuted(muted: boolean) {
    this.prime(muted)
  }

  unlock() {
    try {
      const ctx = this.ensure()
      void ctx.resume()
    } catch {
      // Audio is optional; the hall works without it.
    }
  }

  private ensure() {
    if (this.ctx) return this.ctx
    this.preload()
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : VOLUME
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -4
    limiter.ratio.value = 8
    limiter.attack.value = 0.003
    limiter.release.value = 0.2
    master.connect(limiter)
    limiter.connect(ctx.destination)

    const reverb = ctx.createConvolver()
    reverb.buffer = impulse(ctx, 2.6, 3.2)
    const reverbReturn = ctx.createGain()
    reverbReturn.gain.value = 0.9
    reverb.connect(reverbReturn)
    reverbReturn.connect(master)

    this.ctx = ctx
    this.master = master
    this.reverb = reverb
    for (const clip of CLIPS) this.buffer(clip)
    return ctx
  }

  private buffer(clip: Clip) {
    const existing = this.decoded.get(clip)
    if (existing) return existing
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(null)
    this.preload()
    const raw = this.raw.get(clip) ?? Promise.resolve(null)
    const pending = raw.then(async (data) => {
      if (!data) return null
      try {
        return await ctx.decodeAudioData(data.slice(0))
      } catch {
        return null
      }
    })
    this.decoded.set(clip, pending)
    return pending
  }

  private startRoom() {
    const ctx = this.ctx
    if (!ctx || !this.master || this.room) return
    const length = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = 0x51ed27
    let brown = 0
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      brown = (brown + ((seed / 4294967296) * 2 - 1) * 0.02) * 0.996
      data[i] = brown * 3.2
    }
    const fade = 2048
    for (let i = 0; i < fade; i += 1) {
      const k = i / fade
      data[i] *= k
      data[length - 1 - i] *= k
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const low = ctx.createBiquadFilter()
    low.type = "lowpass"
    low.frequency.value = 420
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(low)
    low.connect(gain)
    gain.connect(this.master)
    source.start()
    this.room = gain
  }

  private roomLevel(level: number, seconds: number) {
    const ctx = this.ctx
    if (!ctx) return
    this.startRoom()
    this.room?.gain.setTargetAtTime(level, ctx.currentTime, seconds / 3)
  }

  private play(hits: Hit[], group: Set<AudioBufferSourceNode> = this.playing) {
    let ctx: AudioContext
    try {
      ctx = this.ensure()
    } catch {
      return
    }
    void ctx.resume()
    const start = ctx.currentTime + 0.03
    for (const hit of hits) {
      void this.buffer(hit.clip).then((buffer) => {
        if (!buffer || !this.master || !this.reverb) return
        const due = start + hit.at
        const now = ctx.currentTime
        if (due < now - LATE_LIMIT) return
        const when = Math.max(due, now)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.playbackRate.value = hit.rate ?? 1
        const gain = ctx.createGain()
        gain.gain.value = hit.gain
        const pan = ctx.createStereoPanner()
        pan.pan.value = hit.pan ?? 0
        const send = ctx.createGain()
        send.gain.value = hit.wet ?? 0.25
        source.connect(gain)
        gain.connect(pan)
        pan.connect(this.master)
        pan.connect(send)
        send.connect(this.reverb)
        if (hit.length) {
          const end = when + hit.length
          gain.gain.setValueAtTime(hit.gain, Math.max(when, end - 0.18))
          gain.gain.linearRampToValueAtTime(0.0001, end)
          source.start(when)
          source.stop(end + 0.02)
        } else {
          source.start(when)
        }
        group.add(source)
        source.onended = () => {
          group.delete(source)
          source.disconnect()
          gain.disconnect()
          pan.disconnect()
          send.disconnect()
        }
      })
    }
  }

  private silence(group: Set<AudioBufferSourceNode>) {
    for (const source of group) {
      try {
        source.stop()
      } catch {
        // Already ended.
      }
    }
    group.clear()
  }

  private steps(steps: { time: number; surface: Surface }[], wet: (surface: Surface) => number) {
    return steps.map((step, index): Hit => {
      const pool = STEPS[step.surface]
      this.variant = (this.variant + 1 + (index % 2)) % 997
      return {
        clip: pool[this.variant % pool.length],
        at: step.time,
        gain: STEP_GAIN[step.surface] * (index % 2 === 0 ? 1 : 0.86),
        pan: index % 2 === 0 ? -0.12 : 0.12,
        rate: 0.94 + ((this.variant * 7) % 9) * 0.012,
        wet: wet(step.surface),
      }
    })
  }

  private doors(at: number, quick: boolean): Hit[] {
    const spread = quick ? 0.03 : 0.09
    return [
      { clip: "door-latch", at, gain: 0.36, pan: -0.05, wet: 0.1 },
      { clip: "door-open-a", at: at + 0.05, gain: 0.44, pan: -0.42, wet: 0.16, rate: quick ? 1.18 : 1 },
      { clip: "door-open-b", at: at + 0.05 + spread, gain: 0.4, pan: 0.42, wet: 0.16, rate: quick ? 1.2 : 0.97 },
      { clip: "door-creak-a", at: at + 0.22, gain: quick ? 0.12 : 0.2, pan: -0.5, wet: 0.2, rate: 0.92 },
      ...(quick ? [] : [{ clip: "door-creak-b" as Clip, at: at + 0.58, gain: 0.14, pan: 0.5, wet: 0.22, rate: 0.88 }]),
    ]
  }

  entrance(reduced: boolean) {
    this.silence(this.playing)
    const total = enterDuration(reduced)
    const lead = reduced ? 0.08 : 0.36
    const p = new Vector3()
    const l = new Vector3()
    const points: { time: number; x: number; z: number }[] = []
    for (let i = 0; i <= 240; i += 1) {
      const moveT = i / 240
      sampleEnter(moveT, p, l)
      points.push({ time: lead + moveT * (total - lead), x: p.x, z: p.z })
    }
    const steps = horizontalWalk(points, hallSurface)
    this.play([
      ...this.doors(0, reduced),
      ...this.steps(steps, (surface) => (surface === "stone" ? 0.14 : 0.3)),
    ])
    this.roomLevel(ROOM_LEVEL, doorDuration(reduced) + 1.2)
  }

  glideIn(reduced: boolean) {
    this.silence(this.playing)
    const total = riseDuration(reduced)
    const points: { time: number; x: number; z: number }[] = []
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120
      const e = smooth(t)
      points.push({
        time: t * total,
        x: OUTSIDE.position[0] + (INSIDE.position[0] - OUTSIDE.position[0]) * e,
        z: OUTSIDE.position[2] + (INSIDE.position[2] - OUTSIDE.position[2]) * e,
      })
    }
    const steps = horizontalWalk(points, hallSurface, 0.95)
    this.play([...this.doors(0, true), ...this.steps(steps, () => 0.24)])
    this.roomLevel(ROOM_LEVEL, 0.6)
  }

  sit(reduced: boolean, seat: Seat) {
    this.silence(this.playing)
    const total = sitDuration(reduced)
    const walkUntil = total * 0.55
    const points: { time: number; x: number; z: number }[] = []
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120
      const e = smooth(t)
      points.push({
        time: t * walkUntil,
        x: INSIDE.position[0] + (seat.sit[0] - INSIDE.position[0]) * e,
        z: INSIDE.position[2] + (seat.sit[2] - INSIDE.position[2]) * e,
      })
    }
    const steps = horizontalWalk(points, () => "wood", 0.82).filter((step) => step.time < walkUntil)
    const side = Math.max(-0.5, Math.min(0.5, seat.position[0] / 10))
    this.play([
      ...this.steps(steps, () => 0.28),
      { clip: "chair-sit", at: total * 0.46, gain: 0.32, pan: side, wet: 0.22, rate: 1.04 },
      { clip: "cloth-a", at: total * 0.78, gain: 0.3, pan: side * 0.5, wet: 0.08 },
      { clip: "chair-creak", at: total * 0.86, gain: 0.22, pan: side * 0.5, wet: 0.14, rate: 0.82 },
      { clip: "chair-knock", at: total * 0.9, gain: 0.12, pan: side * 0.5, wet: 0.18, rate: 0.9 },
    ])
  }

  stand(reduced: boolean, seat: Seat | null) {
    this.silence(this.writing)
    this.silence(this.playing)
    const total = riseDuration(reduced)
    const side = seat ? Math.max(-0.5, Math.min(0.5, seat.position[0] / 10)) : 0
    const from = seat ? seat.sit : INSIDE.position
    const points: { time: number; x: number; z: number }[] = []
    const begin = total * 0.32
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120
      const e = smooth(t)
      points.push({
        time: begin + t * (total - begin),
        x: from[0] + (INSIDE.position[0] - from[0]) * e,
        z: from[2] + (INSIDE.position[2] - from[2]) * e,
      })
    }
    const steps = horizontalWalk(points, () => "wood", 0.82)
    this.play([
      { clip: "cloth-b", at: 0, gain: 0.26, pan: side * 0.5, wet: 0.08 },
      { clip: "chair-creak", at: 0.04, gain: 0.18, pan: side * 0.5, wet: 0.14, rate: 0.95 },
      { clip: "chair-stand", at: 0.1, gain: 0.34, pan: side, wet: 0.22 },
      ...this.steps(steps, () => 0.28),
    ])
  }

  toRoom(reduced: boolean) {
    this.silence(this.writing)
    this.silence(this.playing)
    const total = toRoomDuration(reduced)
    const lead = reduced ? 0.05 : 0.35
    const points: { time: number; x: number; z: number }[] = []
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120
      const e = t * t * t * (t * (t * 6 - 15) + 10)
      points.push({
        time: lead + t * (total - lead),
        x: OUTSIDE.position[0] + (ROOM_APPROACH.position[0] - OUTSIDE.position[0]) * e,
        z: OUTSIDE.position[2] + (ROOM_APPROACH.position[2] - OUTSIDE.position[2]) * e,
      })
    }
    const steps = horizontalWalk(points, () => "stone", 0.8).filter((step) => step.time < total * 0.92)
    this.play([
      { clip: "door-latch", at: 0, gain: 0.32, pan: 0.3, wet: 0.1, rate: 1.06 },
      { clip: "door-open-b", at: 0.06, gain: 0.36, pan: 0.32, wet: 0.14, rate: 1.04 },
      { clip: "door-creak-b", at: 0.3, gain: 0.1, pan: 0.36, wet: 0.16, rate: 1.1 },
      ...this.steps(steps, () => 0.14),
    ])
  }

  roomArrive(reduced: boolean) {
    this.silence(this.playing)
    const fade = reduced ? 0.1 : 0.25
    this.play([
      { clip: "step-wood-1", at: fade * 0.4, gain: 0.32, pan: -0.1, wet: 0.05, rate: 1.05 },
      { clip: "step-wood-3", at: fade * 0.4 + 0.48, gain: 0.26, pan: 0.1, wet: 0.05, rate: 1.02 },
      { clip: "door-close", at: fade + 0.62, gain: 0.34, pan: 0.05, wet: 0.06 },
    ])
    this.roomLevel(ROOM_LEVEL * 0.6, 0.6)
  }

  fromRoom(reduced: boolean) {
    this.silence(this.playing)
    const total = fromRoomDuration(reduced)
    this.play([
      { clip: "door-latch", at: 0, gain: 0.3, pan: 0.05, wet: 0.05, rate: 1.06 },
      { clip: "door-open-b", at: 0.05, gain: 0.3, pan: 0.05, wet: 0.06, rate: 1.06 },
      { clip: "step-wood-2", at: total * 0.55, gain: 0.26, pan: -0.08, wet: 0.05 },
    ])
  }

  hallReturn() {
    this.silence(this.playing)
    this.play([
      { clip: "step-stone-1", at: 0.05, gain: 0.36, pan: 0.2, wet: 0.14 },
      { clip: "door-close", at: 0.36, gain: 0.3, pan: 0.38, wet: 0.16, rate: 0.98 },
      { clip: "step-stone-3", at: 0.6, gain: 0.3, pan: 0.1, wet: 0.14 },
    ])
    this.roomLevel(ROOM_LEVEL, 0.6)
  }

  writeMenu() {
    this.silence(this.writing)
    this.play([{ clip: "chalk-menu", at: 0, gain: 0.8, wet: 0.2, length: 2.2 }], this.writing)
  }

  writePage() {
    this.silence(this.writing)
    this.play([{ clip: "chalk-page", at: 0, gain: 0.72, wet: 0.2, rate: 1.04 }], this.writing)
  }

  wipeBoard() {
    this.silence(this.writing)
    this.play(
      [
        { clip: "erase-a", at: 0, gain: 0.42, pan: -0.08, wet: 0.16, rate: 0.9 },
        { clip: "erase-b", at: 0.2, gain: 0.36, pan: 0.08, wet: 0.16, rate: 0.86 },
      ],
      this.writing,
    )
  }

  tap() {
    this.play([{ clip: "door-latch", at: 0, gain: 0.25, wet: 0.08, rate: 1.3 }])
  }

  stopAll() {
    this.silence(this.playing)
    this.silence(this.writing)
  }
}

export const sound = new HallSound()
