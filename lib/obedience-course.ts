export const DEFAULT_SNIFF_SECONDS = 4
export const SNIFF_MIN = 1
export const SNIFF_MAX = 180
export const MAX_LINES = 24
export const MAX_LINE_CHARS = 240
export const MAX_PRAISE = 12
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024

export const PRAISE = [
  "GOOD GIRL",
  "SUCH AN OBEDIENT STUDENT",
  "THAT'S MY GOOD GIRL",
  "PERFECT LINE",
  "KEEP GOING",
  "SO OBEDIENT",
] as const

const LINE_ID = /^[a-zA-Z0-9_-]{1,80}$/
const AUDIO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const AUDIO_EXT: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  opus: "audio/opus",
  webm: "audio/webm",
}

const AUDIO_MIME: Record<string, string> = {
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/flac": "audio/flac",
  "audio/webm": "audio/webm",
  "audio/opus": "audio/opus",
}

export type CourseLine = {
  id: string
  text: string
  audioId: string | null
  audioName: string | null
}

export type PraiseClip = {
  id: string
  name: string
}

export type CourseTrack = {
  id: string
  name: string
}

export type ObedienceCourse = {
  sniffSeconds: number
  lines: CourseLine[]
  praise: PraiseClip[]
  track: CourseTrack | null
}

export type CourseDeskView = "list" | "train" | "edit"

const DEFAULT_LINES: CourseLine[] = [
  { id: "line-listen", text: "I listen, and I obey.", audioId: null, audioName: null },
  { id: "line-training", text: "I take my training seriously.", audioId: null, audioName: null },
  { id: "line-student", text: "I am an obedient student.", audioId: null, audioName: null },
]

export function defaultCourse(): ObedienceCourse {
  return {
    sniffSeconds: DEFAULT_SNIFF_SECONDS,
    lines: DEFAULT_LINES.map((line) => ({ ...line })),
    praise: [],
    track: null,
  }
}

export function courseEditorControl(admin: boolean) {
  return admin === true
}

export function courseEditorOpen(admin: boolean, view: CourseDeskView) {
  return courseEditorControl(admin) && view === "edit"
}

export function obedienceTrainingOffered(done: boolean) {
  return done === true
}

export function clampSniff(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SNIFF_SECONDS
  const rounded = Math.round(value * 10) / 10
  if (rounded < SNIFF_MIN) return SNIFF_MIN
  if (rounded > SNIFF_MAX) return SNIFF_MAX
  return rounded
}

export function sniffProgress(elapsedMs: number, seconds: number) {
  const total = clampSniff(seconds) * 1000
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  return Math.min(1, elapsedMs / total)
}

export type SniffPhase = "uncap" | "approach" | "sniff" | "praise" | "dizzy" | "write"

export function sniffBeats(seconds: number, reduced: boolean): { phase: SniffPhase; ms: number }[] {
  const sniff = Math.round(clampSniff(seconds) * 1000)
  if (reduced) {
    return [
      { phase: "sniff", ms: sniff },
      { phase: "praise", ms: 280 },
      { phase: "write", ms: 0 },
    ]
  }
  return [
    { phase: "uncap", ms: 1700 },
    { phase: "approach", ms: 1400 },
    { phase: "sniff", ms: sniff },
    { phase: "praise", ms: 460 },
    { phase: "dizzy", ms: 1100 },
    { phase: "write", ms: 0 },
  ]
}

export const PRAISE_MS = 5000

export function praiseLine(successIndex: number) {
  const count = Math.floor(Number.isFinite(successIndex) ? successIndex : 0)
  const safe = count > 0 ? count : 0
  return PRAISE[safe % PRAISE.length] ?? PRAISE[0]
}

function unitRoll(random: () => number) {
  const value = random()
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value >= 1) return 1
  return value
}

export function praiseSpot(random: () => number = Math.random) {
  const where = unitRoll(random)
  const x = 30 + unitRoll(random) * 40
  const across = unitRoll(random)
  const drift = unitRoll(random)
  const lift = unitRoll(random)
  const y = where < 0.5 ? 4 + across * 4 : 93 + across * 4
  return {
    x,
    y,
    driftX: Math.round((drift - 0.5) * 40),
    driftY: Math.round(-12 - lift * 28),
  }
}

function shuffledIndexes(length: number, random: () => number) {
  const order = Array.from({ length }, (_, index) => index)
  for (let index = length - 1; index > 0; index -= 1) {
    const roll = random()
    const span = index + 1
    const swap = Number.isFinite(roll) ? Math.min(index, Math.max(0, Math.floor(roll * span))) : 0
    const current = order[index] ?? index
    order[index] = order[swap] ?? swap
    order[swap] = current
  }
  return order
}

// Draw the next line from the phrases still unused in this pass. An empty
// bag reshuffles the creator's list. One phrase is drawn again.
export function takeWritingLine(length: number, pending: readonly number[], random: () => number = Math.random) {
  const count = Number.isInteger(length) && length > 0 ? length : 0
  if (count === 0) return { index: 0, pending: [] as number[] }
  const bag = pending.length > 0 ? [...pending] : shuffledIndexes(count, random)
  const picked = bag.shift()
  const index = typeof picked === "number" && picked >= 0 && picked < count ? picked : 0
  return { index, pending: bag }
}

// About one correct line in four. The first three successes stay quiet.
export function praiseCue(successIndex: number) {
  return Number.isInteger(successIndex) && successIndex >= 0 && successIndex % 4 === 3
}

export function praiseClip(successIndex: number, count: number) {
  if (!praiseCue(successIndex) || !Number.isInteger(count) || count <= 0) return null
  return successIndex % count
}

export function courseAudioIds(course: ObedienceCourse) {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const line of course.lines) {
    if (!line.audioId || seen.has(line.audioId)) continue
    seen.add(line.audioId)
    ids.push(line.audioId)
  }
  for (const clip of course.praise) {
    if (seen.has(clip.id)) continue
    seen.add(clip.id)
    ids.push(clip.id)
  }
  if (course.track && !seen.has(course.track.id)) ids.push(course.track.id)
  return ids
}

export function courseAudioMime(name: string, type: string) {
  const declared = type.toLowerCase().split(";")[0]?.trim() ?? ""
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const fromExt = AUDIO_EXT[ext] ?? ""
  if (AUDIO_MIME[declared]) return AUDIO_MIME[declared]
  if (!declared || declared === "application/octet-stream") return fromExt
  return ""
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_LINE_CHARS)
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, 120)
}

export function parseCourse(value: unknown): ObedienceCourse | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.lines)) return null
  const sniffSeconds = clampSniff(typeof row.sniffSeconds === "number" ? row.sniffSeconds : DEFAULT_SNIFF_SECONDS)
  const lines: CourseLine[] = []
  const seen = new Set<string>()
  for (const item of row.lines) {
    if (lines.length >= MAX_LINES) break
    if (!item || typeof item !== "object") continue
    const line = item as Record<string, unknown>
    const id = typeof line.id === "string" && LINE_ID.test(line.id) ? line.id : ""
    const text = cleanText(line.text)
    if (!id || !text || seen.has(id)) continue
    seen.add(id)
    const audioId = typeof line.audioId === "string" && AUDIO_ID.test(line.audioId) ? line.audioId : null
    const audioName = audioId ? cleanName(line.audioName) : ""
    lines.push({ id, text, audioId, audioName: audioName || null })
  }
  if (lines.length === 0) return null
  const praise: PraiseClip[] = []
  const heard = new Set<string>()
  if (Array.isArray(row.praise)) {
    for (const item of row.praise) {
      if (praise.length >= MAX_PRAISE) break
      if (!item || typeof item !== "object") continue
      const clip = item as Record<string, unknown>
      const id = typeof clip.id === "string" && AUDIO_ID.test(clip.id) ? clip.id : ""
      if (!id || heard.has(id)) continue
      heard.add(id)
      praise.push({ id, name: cleanName(clip.name) || "Praise" })
    }
  }
  const track = courseTrack(row.track)
  return { sniffSeconds, lines, praise, track }
}

function courseTrack(value: unknown): CourseTrack | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === "string" && AUDIO_ID.test(row.id) ? row.id : ""
  if (!id) return null
  return { id, name: cleanName(row.name) || "Course audio" }
}
