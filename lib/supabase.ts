import { MAX_UPLOAD_BYTES } from "@/lib/patreon-access"

// Server-only Supabase client. The service role never reaches the browser.
// A direct upload receives only a short-lived signature and the anon key.

const BUCKET = "academy"

export type SupabaseConfig = { url: string; anonKey: string; serviceKey: string }

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  email: string
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "") ?? ""
    if (value) return value
  }
  return ""
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = envValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "")
  const anonKey = envValue("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const serviceKey = envValue("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !anonKey || !serviceKey) return null
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return null
  return { url, anonKey, serviceKey }
}

function authHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

type AuthPayload = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id?: string; email?: string }
}

function readSession(payload: AuthPayload, email: string): AuthSession | null {
  const accessToken = payload.access_token ?? ""
  const refreshToken = payload.refresh_token ?? ""
  const userId = payload.user?.id ?? ""
  if (!accessToken || !refreshToken || !userId) return null
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userId,
    email: payload.user?.email || email,
  }
}

export async function signUp(email: string, password: string, name: string) {
  const config = supabaseConfig()
  if (!config) return { error: "Enrollment is not open yet." }
  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({ email, password, data: { full_name: name } }),
  })
  const payload = (await response.json().catch(() => ({}))) as AuthPayload & { msg?: string; error_description?: string; code?: string }
  if (!response.ok) {
    const message = `${payload.msg ?? ""} ${payload.error_description ?? ""}`.toLowerCase()
    if (message.includes("already")) return { error: "A student with this email is already enrolled. Sign in instead." }
    return { error: "The academy could not open that record." }
  }
  const session = readSession(payload, email)
  if (!session) return { confirm: true as const }
  return { session }
}

export async function signIn(email: string, password: string) {
  const config = supabaseConfig()
  if (!config) return { error: "Enrollment is not open yet." }
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({ email, password }),
  })
  const payload = (await response.json().catch(() => ({}))) as AuthPayload
  if (!response.ok) return { error: "Those details don't match a student record." }
  const session = readSession(payload, email)
  if (!session) return { error: "Those details don't match a student record." }
  return { session }
}

// The user id used for stored progress comes only from this check, never from the cookie.
export async function verifyAccess(accessToken: string) {
  const config = supabaseConfig()
  if (!config || !accessToken) return null
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const user = (await response.json().catch(() => null)) as { id?: string; email?: string } | null
  if (!user?.id) return null
  return { id: user.id, email: user.email ?? "" }
}

export async function refreshAuth(refreshToken: string) {
  const config = supabaseConfig()
  if (!config) return null
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!response.ok) return null
  const payload = (await response.json().catch(() => ({}))) as AuthPayload
  return readSession(payload, payload.user?.email ?? "")
}

let bucketReady: Promise<boolean> | null = null

function serviceHeaders(contentType?: string) {
  const config = supabaseConfig()
  if (!config) return null
  const headers: Record<string, string> = {
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
  }
  if (contentType) headers["Content-Type"] = contentType
  return { config, headers }
}

export function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const ready = serviceHeaders("application/json")
      if (!ready) return false
      const response = await fetch(`${ready.config.url}/storage/v1/bucket`, {
        method: "POST",
        headers: ready.headers,
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
      })
      return response.ok || response.status === 409 || response.status === 400
    })().catch(() => {
      bucketReady = null
      return false
    })
  }
  return bucketReady
}

async function allowLargeFiles() {
  const ready = serviceHeaders("application/json")
  if (!ready) return
  await fetch(`${ready.config.url}/storage/v1/bucket/${BUCKET}`, {
    method: "PUT",
    headers: ready.headers,
    body: JSON.stringify({ public: false, file_size_limit: MAX_UPLOAD_BYTES }),
  }).catch(() => undefined)
}

export type DirectUpload = {
  token: string
  endpoint: string
  bucket: string
  path: string
  apikey: string
}

export async function signedUpload(path: string): Promise<DirectUpload | null> {
  if (!(await ensureBucket())) return null
  await allowLargeFiles()
  const ready = serviceHeaders("application/json")
  if (!ready) return null
  const response = await fetch(`${ready.config.url}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...ready.headers, "x-upsert": "true" },
    body: "{}",
  })
  if (!response.ok) return null
  const payload = (await response.json().catch(() => null)) as { url?: string; token?: string } | null
  let token = payload?.token ?? ""
  if (!token && payload?.url) {
    try {
      token = new URL(payload.url, ready.config.url).searchParams.get("token") ?? ""
    } catch {
      token = ""
    }
  }
  if (!token) return null
  const endpoint = `${ready.config.url.replace(".supabase.co", ".storage.supabase.co")}/storage/v1/upload/resumable`
  return { token, endpoint, bucket: BUCKET, path, apikey: ready.config.anonKey }
}

export async function signedDownloadUrl(path: string, expiresIn: number) {
  const ready = serviceHeaders("application/json")
  if (!ready) return null
  const response = await fetch(`${ready.config.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: ready.headers,
    body: JSON.stringify({ expiresIn }),
  })
  if (!response.ok) return null
  const payload = (await response.json().catch(() => null)) as { signedURL?: string } | null
  const signed = payload?.signedURL ?? ""
  if (!signed.startsWith("/object/")) return null
  return `${ready.config.url}/storage/v1${signed}`
}

export async function objectSize(path: string) {
  const ready = serviceHeaders()
  if (!ready) return null
  const url = `${ready.config.url}/storage/v1/object/${BUCKET}/${path}`
  const head = await fetch(url, { method: "HEAD", headers: ready.headers })
  if (head.ok) {
    const length = Number(head.headers.get("content-length"))
    if (Number.isFinite(length) && length > 0) return length
  }
  const probe = await fetch(url, { headers: { ...ready.headers, Range: "bytes=0-0" } })
  const range = probe.headers.get("content-range") ?? ""
  await probe.body?.cancel().catch(() => undefined)
  if (!probe.ok && probe.status !== 206) return null
  const match = /\/(\d+)$/.exec(range)
  return match ? Number(match[1]) : null
}

export async function uploadObject(path: string, body: Buffer, contentType: string) {
  if (!(await ensureBucket())) return false
  const ready = serviceHeaders(contentType)
  if (!ready) return false
  const response = await fetch(`${ready.config.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...ready.headers, "x-upsert": "true", "cache-control": "private, no-store" },
    body: new Uint8Array(body),
  })
  return response.ok
}

export async function downloadObject(path: string, range: string | null) {
  if (!(await ensureBucket())) return null
  const ready = serviceHeaders()
  if (!ready) return null
  const headers = { ...ready.headers }
  if (range) headers.Range = range
  const response = await fetch(`${ready.config.url}/storage/v1/object/${BUCKET}/${path}`, { headers })
  if (!response.ok && response.status !== 206) return null
  const length = Number(response.headers.get("content-length") ?? "0")
  if (Number.isFinite(length) && length > 1024 * 1024) return null
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > 1024 * 1024) return null
  return {
    bytes,
    status: response.status,
    contentRange: response.headers.get("content-range"),
    total: response.headers.get("content-length"),
  }
}

export async function readObject(path: string): Promise<Buffer | null | undefined> {
  if (!(await ensureBucket())) return undefined
  const ready = serviceHeaders()
  if (!ready) return undefined
  try {
    const response = await fetch(`${ready.config.url}/storage/v1/object/${BUCKET}/${path}`, { headers: ready.headers })
    if (response.status === 404) return null
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      if (response.status === 400 && /not found/i.test(detail)) return null
      return undefined
    }
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > 1024 * 1024) return undefined
    return bytes
  } catch {
    return undefined
  }
}

export async function listObjects(prefix: string) {
  if (!(await ensureBucket())) return null
  const ready = serviceHeaders("application/json")
  if (!ready) return null
  const names: string[] = []
  try {
    for (let offset = 0; offset < 1_000; offset += 100) {
      const response = await fetch(`${ready.config.url}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: ready.headers,
        body: JSON.stringify({ prefix, limit: 100, offset }),
      })
      if (!response.ok) return null
      const rows = (await response.json().catch(() => null)) as { name?: string; id?: string | null }[] | null
      if (!Array.isArray(rows) || rows.length === 0) break
      for (const row of rows) {
        if (typeof row.name === "string" && row.name && row.id) names.push(`${prefix}${row.name}`)
      }
      if (rows.length < 100) break
    }
    return names
  } catch {
    return null
  }
}

export async function deleteObject(path: string) {
  const ready = serviceHeaders("application/json")
  if (!ready) return false
  const response = await fetch(`${ready.config.url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: ready.headers,
    body: JSON.stringify({ prefixes: [path] }),
  })
  return response.ok
}

export function progressPath(userId: string) {
  return `users/${userId}/progress.json`
}

export function mediaPath(id: string) {
  return `media/${id}`
}
