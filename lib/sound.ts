import { doorDuration, enterDuration, riseDuration, sitDuration } from "@/lib/scene"

type Voice = { stop: () => void }
type Source = AudioBufferSourceNode | OscillatorNode

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

function noiseBuffer(ctx: AudioContext) {
  const cached = noiseBuffers.get(ctx)
  if (cached) return cached
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let seed = 0x6d2b79f5
  for (let i = 0; i < length; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    data[i] = seed / 4294967296 * 2 - 1
  }
  noiseBuffers.set(ctx, buffer)
  return buffer
}

function voice(source: Source, ...nodes: AudioNode[]): Voice {
  let stopped = false
  return {
    stop() {
      if (stopped) return
      stopped = true
      try {
        source.stop()
      } catch {
        // The source may already have ended.
      }
      source.disconnect()
      for (const node of nodes) node.disconnect()
    },
  }
}

function noiseSource(ctx: AudioContext, when: number, until: number, rate = 1) {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  source.loop = true
  source.playbackRate.value = rate
  source.start(when)
  source.stop(until)
  return source
}

function envelope(ctx: AudioContext, when: number, attack: number, hold: number, release: number, amount: number) {
  const gain = ctx.createGain()
  const peak = Math.max(0.0001, amount)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + attack)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.72), when + attack + hold)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release)
  return gain
}

function latch(ctx: AudioContext, dest: AudioNode, when: number): Voice[] {
  const click = noiseSource(ctx, when, when + 0.06, 1.4)
  const high = ctx.createBiquadFilter()
  high.type = "highpass"
  high.frequency.value = 1800
  const clickGain = envelope(ctx, when, 0.004, 0.01, 0.04, 0.18)
  click.connect(high)
  high.connect(clickGain)
  clickGain.connect(dest)

  const osc = ctx.createOscillator()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(210, when)
  osc.frequency.exponentialRampToValueAtTime(90, when + 0.09)
  const body = envelope(ctx, when, 0.004, 0.02, 0.08, 0.16)
  osc.connect(body)
  body.connect(dest)
  osc.start(when)
  osc.stop(when + 0.12)
  return [voice(click, high, clickGain), voice(osc, body)]
}

function creak(ctx: AudioContext, dest: AudioNode, when: number, duration: number, amount: number): Voice {
  const source = noiseSource(ctx, when, when + duration + 0.05, 0.8)
  const band = ctx.createBiquadFilter()
  band.type = "bandpass"
  band.Q.value = 16
  const steps = Math.max(6, Math.floor(duration * 48))
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const flutter = Math.sin(t * 34) * 0.18 + Math.sin(t * 15.5) * 0.1
    const stick = Math.sin(t * 21.7) > 0.88 ? 0.65 : 0
    const rise = Math.sin(t * Math.PI) ** 0.85
    const freq = 240 + rise * 1500 * (1 + flutter) + stick * 620
    band.frequency.setValueAtTime(Math.max(90, freq), when + t * duration)
  }
  const gain = ctx.createGain()
  const peak = Math.max(0.0001, amount)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + Math.min(0.12, duration * 0.25))
  gain.gain.setValueAtTime(peak * 0.75, when + duration * 0.72)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)
  source.connect(band)
  band.connect(gain)
  gain.connect(dest)
  return voice(source, band, gain)
}

function air(ctx: AudioContext, dest: AudioNode, when: number, duration: number): Voice {
  const source = noiseSource(ctx, when, when + duration, 0.5)
  const low = ctx.createBiquadFilter()
  low.type = "lowpass"
  low.frequency.setValueAtTime(700, when)
  low.frequency.exponentialRampToValueAtTime(180, when + duration)
  const gain = envelope(ctx, when, duration * 0.2, duration * 0.35, duration * 0.4, 0.05)
  source.connect(low)
  low.connect(gain)
  gain.connect(dest)
  return voice(source, low, gain)
}

function footstep(ctx: AudioContext, dest: AudioNode, when: number, weight: number): Voice[] {
  const osc = ctx.createOscillator()
  osc.type = "sine"
  const freq = 78 + (when * 13) % 18
  osc.frequency.setValueAtTime(freq, when)
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.1)
  const body = envelope(ctx, when, 0.006, 0.02, 0.09, 0.2 * weight)
  osc.connect(body)
  body.connect(dest)
  osc.start(when)
  osc.stop(when + 0.14)

  const scuff = noiseSource(ctx, when, when + 0.12, 0.7 + (when % 0.3))
  const low = ctx.createBiquadFilter()
  low.type = "lowpass"
  low.frequency.setValueAtTime(520, when)
  low.frequency.exponentialRampToValueAtTime(180, when + 0.08)
  const grain = envelope(ctx, when, 0.008, 0.015, 0.07, 0.11 * weight)
  scuff.connect(low)
  low.connect(grain)
  grain.connect(dest)
  return [voice(osc, body), voice(scuff, low, grain)]
}

function footsteps(ctx: AudioContext, dest: AudioNode, when: number, duration: number, weight: number): Voice[] {
  const count = Math.max(2, Math.round(duration / 0.52))
  const begin = when + Math.min(0.42, duration * 0.16)
  const span = Math.max(0.2, duration - (begin - when) - 0.12)
  const voices: Voice[] = []
  for (let i = 0; i < count; i += 1) {
    const u = count === 1 ? 0 : i / (count - 1)
    const at = begin + u ** 1.12 * span
    voices.push(...footstep(ctx, dest, at, weight * (i % 2 === 0 ? 1 : 0.82)))
  }
  return voices
}

function scrape(ctx: AudioContext, dest: AudioNode, when: number, duration: number): Voice {
  const source = noiseSource(ctx, when, when + duration + 0.05, 0.9)
  const band = ctx.createBiquadFilter()
  band.type = "bandpass"
  band.Q.value = 6.5
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  const pulls = [0.04, 0.36, 0.66]
  let cursor = when
  for (const pull of pulls) {
    const start = when + pull * duration
    const length = Math.max(0.08, duration * 0.22)
    if (start + length <= cursor) continue
    gain.gain.setValueAtTime(0.0001, Math.max(start, cursor))
    gain.gain.exponentialRampToValueAtTime(0.16, start + Math.min(0.03, length * 0.3))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    band.frequency.setValueAtTime(980, start)
    band.frequency.exponentialRampToValueAtTime(320, start + length)
    cursor = start + length
  }
  source.connect(band)
  band.connect(gain)
  gain.connect(dest)
  return voice(source, band, gain)
}

function settle(ctx: AudioContext, dest: AudioNode, when: number): Voice[] {
  const osc = ctx.createOscillator()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(160, when)
  osc.frequency.exponentialRampToValueAtTime(70, when + 0.12)
  const gain = envelope(ctx, when, 0.005, 0.02, 0.1, 0.18)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(when)
  osc.stop(when + 0.16)

  const tap = noiseSource(ctx, when, when + 0.05, 1.1)
  const band = ctx.createBiquadFilter()
  band.type = "bandpass"
  band.frequency.value = 900
  band.Q.value = 2
  const grain = envelope(ctx, when, 0.003, 0.008, 0.04, 0.1)
  tap.connect(band)
  band.connect(grain)
  grain.connect(dest)
  return [voice(osc, gain), voice(tap, band, grain)]
}

function chalkStroke(ctx: AudioContext, dest: AudioNode, when: number, length: number, amount: number): Voice {
  const source = noiseSource(ctx, when, when + length + 0.02, 1.3)
  const high = ctx.createBiquadFilter()
  high.type = "highpass"
  high.frequency.value = 1400
  const band = ctx.createBiquadFilter()
  band.type = "bandpass"
  band.frequency.value = 2800 + (when * 500) % 900
  band.Q.value = 1.1
  const gain = envelope(ctx, when, 0.008, length * 0.35, length * 0.5, amount)
  source.connect(high)
  high.connect(band)
  band.connect(gain)
  gain.connect(dest)
  return voice(source, high, band, gain)
}

function chalk(ctx: AudioContext, dest: AudioNode, when: number, strokes: number, amount: number): Voice[] {
  const voices: Voice[] = []
  let cursor = when
  for (let i = 0; i < strokes; i += 1) {
    const length = 0.05 + ((i * 17) % 5) * 0.012
    voices.push(chalkStroke(ctx, dest, cursor, length, amount * (i % 3 === 0 ? 1 : 0.75)))
    cursor += length + 0.035 + ((i * 13) % 4) * 0.012
  }
  return voices
}

function erase(ctx: AudioContext, dest: AudioNode, when: number): Voice {
  const source = noiseSource(ctx, when, when + 0.42, 0.6)
  const low = ctx.createBiquadFilter()
  low.type = "lowpass"
  low.frequency.setValueAtTime(2400, when)
  low.frequency.exponentialRampToValueAtTime(420, when + 0.36)
  const gain = envelope(ctx, when, 0.02, 0.12, 0.22, 0.07)
  source.connect(low)
  low.connect(gain)
  gain.connect(dest)
  return voice(source, low, gain)
}

class HallSound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private motion: Voice[] = []
  private writing: Voice[] = []
  muted = false

  prime(muted: boolean) {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.value = muted ? 0 : 0.9
    }
  }

  private ensure() {
    if (this.ctx && this.master) return this.ctx
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.9
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    return ctx
  }

  private cue() {
    const ctx = this.ensure()
    void ctx.resume()
    return { ctx, when: ctx.currentTime + 0.02, dest: this.master! }
  }

  setMuted(muted: boolean) {
    this.prime(muted)
  }

  private stop(list: Voice[]) {
    for (const item of list) item.stop()
    list.length = 0
  }

  private attempt(play: () => void) {
    try {
      play()
    } catch (error) {
      this.stop(this.motion)
      this.stop(this.writing)
      console.warn("Camilia sound skipped a cue.", error)
    }
  }

  entrance(reduced: boolean) {
    this.attempt(() => {
      this.stop(this.motion)
      const { ctx, when, dest } = this.cue()
      const door = doorDuration(reduced)
      const walk = enterDuration(reduced)
      this.motion = [
        ...latch(ctx, dest, when),
        creak(ctx, dest, when + 0.04, Math.max(0.2, door * 0.95), 0.2),
        air(ctx, dest, when, Math.min(0.7, door)),
        ...latch(ctx, dest, when + door * 0.96),
        ...footsteps(ctx, dest, when, walk, 0.72),
      ]
    })
  }

  glideIn(reduced: boolean) {
    this.attempt(() => {
      this.stop(this.motion)
      const { ctx, when, dest } = this.cue()
      const glide = riseDuration(reduced)
      this.motion = [
        ...latch(ctx, dest, when),
        creak(ctx, dest, when + 0.02, Math.min(0.45, glide), 0.12),
        ...footsteps(ctx, dest, when, glide, 0.55),
      ]
    })
  }

  sit(reduced: boolean) {
    this.attempt(() => {
      this.stop(this.motion)
      const { ctx, when, dest } = this.cue()
      const duration = sitDuration(reduced)
      this.motion = [
        scrape(ctx, dest, when, duration * 0.78),
        ...settle(ctx, dest, when + duration * 0.8),
      ]
    })
  }

  stand(reduced: boolean) {
    this.attempt(() => {
      this.stop(this.writing)
      this.stop(this.motion)
      const { ctx, when, dest } = this.cue()
      const duration = riseDuration(reduced)
      this.motion = [
        ...settle(ctx, dest, when),
        scrape(ctx, dest, when + Math.min(0.08, duration * 0.15), duration * 0.7),
      ]
    })
  }

  writeMenu() {
    this.attempt(() => {
      this.stop(this.writing)
      const { ctx, when, dest } = this.cue()
      this.writing = chalk(ctx, dest, when, 8, 0.045)
    })
  }

  writePage() {
    this.attempt(() => {
      this.stop(this.writing)
      const { ctx, when, dest } = this.cue()
      this.writing = chalk(ctx, dest, when, 5, 0.04)
    })
  }

  wipeBoard() {
    this.attempt(() => {
      this.stop(this.writing)
      const { ctx, when, dest } = this.cue()
      this.writing = [erase(ctx, dest, when)]
    })
  }

  tap() {
    this.attempt(() => {
      const { ctx, when, dest } = this.cue()
      const voices = latch(ctx, dest, when)
      window.setTimeout(() => {
        for (const item of voices) item.stop()
      }, 400)
    })
  }

  stopAll() {
    this.stop(this.motion)
    this.stop(this.writing)
  }
}

export const sound = new HallSound()
