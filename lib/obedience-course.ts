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

export type ObedienceCourse = {
  sniffSeconds: number
  lines: CourseLine[]
  praise: PraiseClip[]
}

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
  }
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

export function floatingPraise(completed: number) {
  const count = Math.min(PRAISE.length, Math.max(0, Math.floor(Number.isFinite(completed) ? completed : 0)))
  return PRAISE.slice(0, count)
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
  return { sniffSeconds, lines, praise }
}
