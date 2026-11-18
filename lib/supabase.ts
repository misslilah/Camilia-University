// Server-only Supabase client. The anon key and service role never reach the browser.

const BUCKET = "academy"

export type SupabaseConfig = { url: string; anonKey: string; serviceKey: string }

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  email: string
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "") ?? ""
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
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
  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    bytes,
    status: response.status,
    contentRange: response.headers.get("content-range"),
    total: response.headers.get("content-length"),
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
