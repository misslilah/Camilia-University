import { useEffect, useSyncExternalStore } from "react"

// The admin library keeps the audio and video bytes in IndexedDB.
// localStorage is too small for video, and it cannot store a Blob.
export type MediaKind = "audio" | "video"

export type MediaItem = {
  id: string
  kind: MediaKind
  name: string
  size: number
  mime: string
  addedAt: number
  duration: number | null
  url: string
}

type MediaRecord = Omit<MediaItem, "url"> & { blob: Blob }

type Snapshot = {
  ready: boolean
  items: MediaItem[]
  error: string | null
}

const DB_NAME = "camilia-patreon"
const STORE = "media"
const EMPTY: Snapshot = { ready: false, items: [], error: null }

let state: Snapshot = EMPTY
let database: Promise<IDBDatabase> | null = null
let loading: Promise<void> | null = null
let tail: Promise<unknown> = Promise.resolve()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = tail.then(job, job)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export class LibraryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LibraryError"
  }
}

function isQuota(error: unknown) {
  if (!error || typeof error !== "object") return false
  const name = "name" in error ? String(error.name) : ""
  const code = "code" in error ? Number(error.code) : 0
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22
}

function fileLabel(file: File, kind: MediaKind) {
  const name = file.name.trim()
  return name || (kind === "audio" ? "Audio" : "Video")
}

function explain(error: unknown, name: string) {
  if (error instanceof LibraryError) return error.message
  if (isQuota(error)) {
    return `This browser has no room left for "${name}". Delete a file from the library and try again.`
  }
  return `"${name}" could not be saved.`
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new LibraryError("The library could not be opened in this browser."))
  }
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          database = null
        }
        resolve(db)
      }
      request.onerror = () => {
        database = null
        reject(request.error ?? new LibraryError("The library could not be opened in this browser."))
      }
    })
  }
  return database
}

function finish(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const fail = () => {
      if (settled) return
      settled = true
      reject(tx.error ?? new Error("The library could not be updated."))
    }
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      resolve()
    }
    tx.onerror = fail
    tx.onabort = fail
  })
}

function isRecord(value: unknown): value is MediaRecord {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<MediaRecord>
  return (
    typeof row.id === "string" &&
    (row.kind === "audio" || row.kind === "video") &&
    typeof row.name === "string" &&
    typeof row.size === "number" &&
    typeof row.mime === "string" &&
    typeof row.addedAt === "number" &&
    (row.duration === null || typeof row.duration === "number") &&
    row.blob instanceof Blob
  )
}

async function listRecords() {
  const db = await openDatabase()
  return new Promise<MediaRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const request = tx.objectStore(STORE).getAll()
    let settled = false
    const fail = () => {
      if (settled) return
      settled = true
      reject(tx.error ?? request.error ?? new Error("The library could not be read."))
    }
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      const rows = Array.isArray(request.result) ? request.result : []
      resolve(rows.filter(isRecord).sort((a, b) => b.addedAt - a.addedAt || a.id.localeCompare(b.id)))
    }
    tx.onerror = fail
    tx.onabort = fail
  })
}

function withUrl(record: MediaRecord): MediaItem {
  const { blob, ...rest } = record
  return { ...rest, url: URL.createObjectURL(blob) }
}

async function ensureLoaded() {
  if (state.ready) return
  if (!loading) {
    loading = listRecords()
      .then((records) => {
        state = { ready: true, error: null, items: records.map(withUrl) }
        emit()
      })
      .catch((error: unknown) => {
        loading = null
        const message = error instanceof LibraryError ? error.message : "The library could not be opened in this browser."
        state = { ready: true, error: message, items: [] }
        emit()
      })
  }
  await loading
}

function wrongKind(file: File, kind: MediaKind) {
  const type = file.type.toLowerCase()
  if (!type || type.startsWith(`${kind}/`)) return null
  return `"${fileLabel(file, kind)}" is not ${kind === "audio" ? "an audio file" : "a video file"}.`
}

function mimeFor(file: File, kind: MediaKind) {
  if (file.type) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const known: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: kind === "audio" ? "audio/ogg" : "video/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    opus: "audio/opus",
    mp4: "video/mp4",
    webm: kind === "audio" ? "audio/webm" : "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    mkv: "video/webm",
  }
  return known[ext] ?? ""
}

function probeDuration(file: File, kind: MediaKind, name: string) {
  return new Promise<number | null>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(kind)
    let settled = false
    const finishProbe = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      el.onloadedmetadata = null
      el.ondurationchange = null
      el.onerror = null
      el.remove()
      URL.revokeObjectURL(url)
      fn()
    }
    const timer = window.setTimeout(
      () => finishProbe(() => reject(new LibraryError(`"${name}" could not be read. Choose a file this browser can play.`))),
      8000,
    )
    el.preload = "metadata"
    el.muted = true
    el.setAttribute("playsinline", "")
    el.style.cssText = "position:fixed;left:-9999px;width:8px;height:8px;opacity:0;pointer-events:none"
    const ready = () => {
      const duration = el.duration
      finishProbe(() => resolve(Number.isFinite(duration) ? duration : null))
    }
    el.onloadedmetadata = ready
    el.ondurationchange = () => {
      if (Number.isFinite(el.duration)) ready()
    }
    el.onerror = () => finishProbe(() => reject(new LibraryError(`"${name}" could not be read. Choose a file this browser can play.`)))
    document.body.appendChild(el)
    el.src = url
  })
}

async function putRecord(record: MediaRecord) {
  const db = await openDatabase()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).put(record)
  await finish(tx)
}

// Runs inside the library queue. Callers own the error shown on the window.
async function uploadOne(kind: MediaKind, file: File) {
  await ensureLoaded()
  const name = fileLabel(file, kind)
  const mismatch = wrongKind(file, kind)
  if (mismatch) throw new LibraryError(mismatch)
  if (file.size <= 0) throw new LibraryError(`"${name}" is empty.`)
  let duration: number | null
  try {
    duration = await probeDuration(file, kind, name)
  } catch (error) {
    throw error instanceof LibraryError ? error : new LibraryError(explain(error, name))
  }
  const mime = mimeFor(file, kind)
  const record: MediaRecord = {
    id: crypto.randomUUID(),
    kind,
    name,
    size: file.size,
    mime,
    addedAt: Date.now(),
    duration,
    blob: file.slice(0, file.size, mime || undefined),
  }
  try {
    await putRecord(record)
  } catch (error) {
    throw new LibraryError(explain(error, name))
  }
  const item = withUrl(record)
  state = { ...state, ready: true, items: [item, ...state.items.filter((entry) => entry.id !== item.id)] }
  emit()
  return item
}

export function uploadFiles(kind: MediaKind, files: File[]) {
  return enqueue(async () => {
    state = { ...state, error: null }
    emit()
    let first: string | null = null
    for (const file of files) {
      try {
        await uploadOne(kind, file)
      } catch (error) {
        first ??= error instanceof LibraryError ? error.message : explain(error, fileLabel(file, kind))
      }
    }
    if (first) {
      state = { ...state, error: first }
      emit()
    }
    return first
  })
}

export function deleteMedia(id: string) {
  return enqueue(async () => {
    await ensureLoaded()
    try {
      const db = await openDatabase()
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(id)
      await finish(tx)
      const item = state.items.find((entry) => entry.id === id)
      state = { ...state, items: state.items.filter((entry) => entry.id !== id), error: null }
      emit()
      if (item) window.setTimeout(() => URL.revokeObjectURL(item.url), 0)
    } catch (error) {
      const message = explain(error, "that file")
      state = { ...state, error: message }
      emit()
      throw new LibraryError(message)
    }
  })
}

export function clearLibraryError() {
  if (!state.error) return
  state = { ...state, error: null }
  emit()
}

export function useLibrary() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY)
  useEffect(() => {
    void ensureLoaded()
  }, [])
  return snapshot
}
