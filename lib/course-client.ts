import { resumableHeaders } from "@/lib/resumable"
import {
  MAX_AUDIO_BYTES,
  courseAudioIds,
  courseAudioMime,
  parseCourse,
  type ObedienceCourse,
} from "@/lib/obedience-course"

const CACHE_KEY = "camilia-obedience-course"
const DB_NAME = "camilia-course-audio"
const STORE = "clips"

export type PlayableCourse = {
  course: ObedienceCourse
  audio: Record<string, string>
  source: "remote" | "file" | "browser" | "default"
  note: string | null
}

const FILE_NOTE = "File storage is not connected. This course is kept on this computer."
const BROWSER_NOTE = "The course service is unavailable. This copy stays in this browser."
const LOCAL_COPY_NOTE = "Showing the copy saved on this computer."
export const LOCAL_CLIP_NOTE = "File storage is not connected. This clip stays in this browser."

type RemoteBody = {
  course: unknown
  source: "remote" | "file" | "default"
  audio: { id?: unknown; url?: unknown }[]
}

function noteFor(source: PlayableCourse["source"]) {
  if (source === "file") return FILE_NOTE
  if (source === "browser") return LOCAL_COPY_NOTE
  return null
}

function messageFrom(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error.slice(0, 240)
  return fallback
}

export function readCourseCache(): ObedienceCourse | null {
  if (typeof window === "undefined") return null
  try {
    return parseCourse(JSON.parse(window.localStorage.getItem(CACHE_KEY) || ""))
  } catch {
    return null
  }
}

export function writeCourseCache(course: ObedienceCourse) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(course))
  } catch {
    // The page still keeps this visit when storage is blocked.
  }
}

function openClips() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("storage"))
  })
}

async function rememberClip(id: string, file: File) {
  if (typeof indexedDB === "undefined") return URL.createObjectURL(file)
  const db = await openClips()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ name: file.name, type: file.type || "audio/mpeg", blob: file }, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("storage"))
  })
  db.close()
  return URL.createObjectURL(file)
}

async function localAudio(ids: string[]) {
  const audio: Record<string, string> = {}
  if (ids.length === 0 || typeof indexedDB === "undefined") return audio
  try {
    const db = await openClips()
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve) => {
            const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id)
            request.onsuccess = () => {
              const row = request.result as { blob?: Blob } | undefined
              if (row?.blob) audio[id] = URL.createObjectURL(row.blob)
              resolve()
            }
            request.onerror = () => resolve()
          }),
      ),
    )
    db.close()
  } catch {
    return audio
  }
  return audio
}

async function materialize(
  course: ObedienceCourse,
  remote: { id?: unknown; url?: unknown }[],
  source: PlayableCourse["source"],
): Promise<PlayableCourse> {
  const audio = await localAudio(courseAudioIds(course))
  for (const item of remote) {
    if (!item || typeof item.id !== "string" || typeof item.url !== "string" || !item.url.startsWith("/")) continue
    const previous = audio[item.id]
    if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous)
    audio[item.id] = item.url
  }
  return { course, audio, source, note: noteFor(source) }
}

function isRemote(value: unknown): value is RemoteBody {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<RemoteBody>
  return (row.source === "remote" || row.source === "file" || row.source === "default") && Array.isArray(row.audio)
}

async function cachedPlayable() {
  const cached = readCourseCache()
  if (!cached) return null
  return materialize(cached, [], "browser")
}

export function revokeAudio(audio: Record<string, string>) {
  for (const url of Object.values(audio)) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url)
  }
}

export async function loadPlayableCourse(): Promise<
  | { ok: true; playable: PlayableCourse }
  | { ok: false; error: string; fallback: PlayableCourse | null }
> {
  try {
    const response = await fetch("/api/academy/course", { credentials: "same-origin", cache: "no-store" })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok || !isRemote(body)) {
      return { ok: false, error: messageFrom(body, "The course could not be opened."), fallback: await cachedPlayable().catch(() => null) }
    }
    const course = parseCourse(body.course)
    if (!course) {
      return { ok: false, error: "The course could not be opened.", fallback: await cachedPlayable().catch(() => null) }
    }
    if (body.source !== "default") {
      writeCourseCache(course)
      return { ok: true, playable: await materialize(course, body.audio, body.source) }
    }
    const cached = readCourseCache()
    if (cached) return { ok: true, playable: await materialize(cached, [], "browser") }
    return { ok: true, playable: await materialize(course, [], "default") }
  } catch {
    return { ok: false, error: "The course could not be opened.", fallback: await cachedPlayable().catch(() => null) }
  }
}

export async function saveCourseConfig(course: ObedienceCourse): Promise<
  | { ok: true; course: ObedienceCourse; storage: "remote" | "file"; note: string | null }
  | { ok: false; error: string; keptLocally: boolean }
> {
  const parsed = parseCourse(course)
  if (!parsed) return { ok: false, error: "Add at least one line before saving.", keptLocally: false }
  try {
    const response = await fetch("/api/academy/course", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    })
    const body: unknown = await response.json().catch(() => null)
    if (response.ok && body && typeof body === "object" && "course" in body) {
      const saved = parseCourse((body as { course: unknown }).course) ?? parsed
      const storage = (body as { storage?: unknown }).storage === "file" ? "file" : "remote"
      writeCourseCache(saved)
      return { ok: true, course: saved, storage, note: storage === "file" ? FILE_NOTE : null }
    }
    if (response.status === 503) {
      writeCourseCache(parsed)
      return { ok: false, error: BROWSER_NOTE, keptLocally: true }
    }
    return { ok: false, error: messageFrom(body, "The course could not be saved."), keptLocally: false }
  } catch {
    writeCourseCache(parsed)
    return { ok: false, error: BROWSER_NOTE, keptLocally: true }
  }
}

type UploadTicket = {
  id: string
  token: string
  endpoint: string
  bucket: string
  path: string
  apikey: string
  mime: string
}

function isTicket(value: unknown): value is UploadTicket {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<UploadTicket>
  return [row.id, row.token, row.endpoint, row.bucket, row.path, row.apikey, row.mime].every((item) => typeof item === "string" && item.length > 0)
}

function sendToStorage(file: File, ticket: UploadTicket) {
  return import("tus-js-client").then(
    ({ Upload }) =>
      new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: ticket.endpoint,
          retryDelays: [0, 3000, 5000],
          headers: resumableHeaders(ticket.token, ticket.apikey),
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: ticket.bucket,
            objectName: ticket.path,
            contentType: ticket.mime,
            cacheControl: "private, max-age=3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(error),
          onSuccess: () => resolve(),
        })
        upload.start()
      }),
  )
}

async function keepLocal(id: string, file: File, name: string) {
  const url = await rememberClip(id, file)
  return { ok: true as const, id, name, local: true, url }
}

export async function uploadCourseAudio(file: File): Promise<
  | { ok: true; id: string; name: string; local: boolean; url: string }
  | { ok: false; error: string }
> {
  const name = file.name.trim().slice(0, 120) || "Audio"
  const mime = courseAudioMime(file.name, file.type)
  if (!mime) return { ok: false, error: `"${name}" is not an audio file.` }
  if (file.size <= 0) return { ok: false, error: `"${name}" is empty.` }
  if (file.size > MAX_AUDIO_BYTES) return { ok: false, error: `"${name}" is larger than 12 MB.` }
  try {
    const prepared = await fetch("/api/academy/course/audio", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "prepare", name, size: file.size, mime }),
    })
    const body: unknown = await prepared.json().catch(() => null)
    if (prepared.status === 403) return { ok: false, error: messageFrom(body, "Only the creator can add a clip.") }
    const localId = body && typeof body === "object" && "id" in body && typeof body.id === "string" ? body.id : crypto.randomUUID()
    if (prepared.status === 503 || (body && typeof body === "object" && "local" in body && body.local === true)) {
      return keepLocal(localId, file, name)
    }
    if (!prepared.ok || !isTicket(body)) return { ok: false, error: messageFrom(body, `"${name}" could not be saved.`) }
    try {
      await sendToStorage(file, body)
      const finished = await fetch("/api/academy/course/audio", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "finish", id: body.id, name, size: file.size, mime }),
      })
      if (!finished.ok) return keepLocal(crypto.randomUUID(), file, name)
    } catch {
      return keepLocal(crypto.randomUUID(), file, name)
    }
    const url = await rememberClip(body.id, file)
    return { ok: true, id: body.id, name, local: false, url }
  } catch {
    try {
      return await keepLocal(crypto.randomUUID(), file, name)
    } catch {
      return { ok: false, error: `"${name}" could not be saved.` }
    }
  }
}
