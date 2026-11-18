import { useEffect, useSyncExternalStore } from "react"
import { MAX_UPLOAD_BYTES, sampleLibrary, storageLimitMessage, tierById, tooLargeMessage, type LibraryItem, type LibraryStatus, type MediaKind } from "@/lib/patreon-access"

export type { LibraryItem, LibraryStatus, MediaKind }

type Snapshot = LibraryStatus & { ready: boolean; error: string | null; progress: string | null }

const EMPTY: Snapshot = { ...sampleLibrary(), ready: false, notice: null, items: [], error: null, progress: null }

let state: Snapshot = EMPTY
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

const OAUTH_ERRORS: Record<string, string> = {
  config: "Patreon is not configured yet.",
  denied: "The Patreon connection was cancelled.",
  state: "The Patreon connection could not be confirmed. Try again.",
  token: "Patreon did not accept the connection. Try again.",
  identity: "Patreon did not return your membership. Try again.",
  database: "Supabase is not configured on this server.",
}

function takeOauthError() {
  const params = new URLSearchParams(window.location.search)
  if (params.get("patreon") == null) return null
  const reason = params.get("reason")
  const message = params.get("patreon") === "error" ? (OAUTH_ERRORS[reason ?? ""] ?? "Patreon could not be connected. Try again.") : null
  params.delete("patreon")
  params.delete("reason")
  const query = params.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
  window.history.replaceState(null, "", next)
  return message
}

function isStatus(value: unknown): value is LibraryStatus {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<LibraryStatus>
  return typeof row.configured === "boolean" && typeof row.connected === "boolean" && Array.isArray(row.items)
}

async function readStatus(): Promise<{ status: LibraryStatus; error: string | null }> {
  const oauth = takeOauthError()
  const response = await fetch("/api/patreon/status", { credentials: "same-origin", cache: "no-store" })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isStatus(body)) {
    return { status: { ...sampleLibrary(), items: [], notice: "The library could not be opened." }, error: oauth }
  }
  return { status: body, error: oauth }
}

async function ensureLoaded() {
  if (state.ready) return
  if (!loading) {
    loading = readStatus()
      .then(({ status, error }) => {
        state = { ...status, ready: true, error, progress: null }
        emit()
      })
      .catch(() => {
        loading = null
        state = { ...sampleLibrary(), items: [], ready: true, notice: "The library could not be opened.", error: null, progress: null }
        emit()
      })
  }
  await loading
}

function fileLabel(file: File, kind: MediaKind) {
  const name = file.name.trim()
  return name || (kind === "audio" ? "Audio" : "Video")
}

function wrongKind(file: File, kind: MediaKind) {
  const type = file.type.toLowerCase()
  if (!type || type.startsWith(`${kind}/`)) return null
  return `"${fileLabel(file, kind)}" is not ${kind === "audio" ? "an audio file" : "a video file"}.`
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
    const timer = window.setTimeout(() => finishProbe(() => reject(new Error(`"${name}" could not be read. Choose a file this browser can play.`))), 8000)
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
    el.onerror = () => finishProbe(() => reject(new Error(`"${name}" could not be read. Choose a file this browser can play.`)))
    document.body.appendChild(el)
    el.src = url
  })
}

async function errorMessage(response: Response, fallback: string) {
  if (response.status === 413) return tooLargeMessage()
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error.slice(0, 240)
  return fallback
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

function uploadFailure(error: unknown) {
  const text = error instanceof Error ? error.message : ""
  if (/size|413|entity too large|maximum/i.test(text)) return storageLimitMessage()
  return ""
}

function sendToStorage(file: File, ticket: UploadTicket, onProgress: (sent: number, total: number) => void) {
  return import("tus-js-client").then(
    ({ Upload }) =>
      new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: ticket.endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${ticket.token}`,
            "x-signature": ticket.token,
            apikey: ticket.apikey,
            "x-upsert": "true",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: ticket.bucket,
            objectName: ticket.path,
            contentType: ticket.mime,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(error),
          onProgress: (sent, total) => onProgress(sent, total),
          onSuccess: () => resolve(),
        })
        upload.start()
      }),
  )
}

export function uploadFiles(kind: MediaKind, files: File[], tierId: string) {
  return enqueue(async () => {
    await ensureLoaded()
    state = { ...state, error: null }
    emit()
    const tier = tierById(state.tiers ?? [], tierId)
    if (!state.admin) {
      state = { ...state, error: "Only the creator can upload a file." }
      emit()
      return state.error
    }
    if (!tier) {
      state = { ...state, error: "Choose the tier that can play this file." }
      emit()
      return state.error
    }
    let first: string | null = null
    for (const file of files) {
      const name = fileLabel(file, kind)
      const mismatch = wrongKind(file, kind)
      if (mismatch) {
        first ??= mismatch
        continue
      }
      if (file.size <= 0) {
        first ??= `"${name}" is empty.`
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        first ??= tooLargeMessage(name)
        continue
      }
      let duration: number | null = null
      if (file.size <= 80 * 1024 * 1024) {
        try {
          duration = await probeDuration(file, kind, name)
        } catch {
          duration = null
        }
      }
      try {
        const prepared = await fetch("/api/patreon/media", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "prepare", kind, tierId: tier.id, name, size: file.size, mime: file.type, duration }),
        })
        const ticket: unknown = await prepared.json().catch(() => null)
        if (!prepared.ok || !isTicket(ticket)) {
          const message = ticket && typeof ticket === "object" && "error" in ticket && typeof ticket.error === "string" ? ticket.error : ""
          first ??= message || `"${name}" could not be saved.`
          continue
        }
        let shown = -1
        await sendToStorage(file, ticket, (sent, total) => {
          const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0
          if (percent === shown) return
          shown = percent
          state = { ...state, progress: `Saving ${percent}%` }
          emit()
        })
        const finished = await fetch("/api/patreon/media", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "finish", id: ticket.id, kind, tierId: tier.id, name, size: file.size, mime: file.type, duration }),
        })
        if (!finished.ok) first ??= await errorMessage(finished, `"${name}" could not be saved.`)
      } catch (error) {
        first ??= uploadFailure(error) || `"${name}" could not be saved.`
      }
    }
    const fresh = await readStatus().catch(() => null)
    state = fresh
      ? { ...fresh.status, ready: true, error: first ?? fresh.error, progress: null }
      : { ...state, error: first ?? "The library could not be opened.", progress: null }
    emit()
    return first
  })
}

export function deleteMedia(id: string) {
  return enqueue(async () => {
    await ensureLoaded()
    try {
      const response = await fetch(`/api/patreon/media/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" })
      if (!response.ok) {
        const message = await errorMessage(response, "That file could not be deleted.")
        state = { ...state, error: message }
        emit()
        return
      }
      const fresh = await readStatus()
      state = { ...fresh.status, ready: true, error: fresh.error, progress: null }
      emit()
    } catch {
      state = { ...state, error: "That file could not be deleted." }
      emit()
    }
  })
}

export function disconnectPatreon() {
  return enqueue(async () => {
    await ensureLoaded()
    try {
      const response = await fetch("/api/patreon/logout", { method: "POST", credentials: "same-origin" })
      if (!response.ok) {
        state = { ...state, error: "Patreon could not be disconnected." }
        emit()
        return
      }
    } catch {
      state = { ...state, error: "Patreon could not be disconnected." }
      emit()
      return
    }
    const fresh = await readStatus().catch(() => null)
    state = fresh
      ? { ...fresh.status, ready: true, error: fresh.error, progress: null }
      : { ...state, connected: false, admin: false, tierTitle: null, items: [], error: null, progress: null }
    emit()
  })
}

export function clearLibraryError() {
  if (!state.error) return
  state = { ...state, error: null }
  emit()
}

function forgetLocalLibrary() {
  if (typeof indexedDB === "undefined") return
  try {
    indexedDB.deleteDatabase("camilia-patreon")
  } catch {
    // The old browser-only copies are unused once the library is on the server.
  }
}

export function useLibrary() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY)
  useEffect(() => {
    forgetLocalLibrary()
    void ensureLoaded()
  }, [])
  return snapshot
}

export function usePatreonAdmin() {
  return useSyncExternalStore(subscribe, () => state.admin, () => false)
}
