import { NextResponse, type NextRequest } from "next/server"
import { requestOrigin } from "@/lib/patreon-server"
import {
  downloadObject,
  progressPath,
  refreshAuth,
  signIn,
  signUp,
  supabaseConfig,
  uploadObject,
  type AuthSession,
} from "@/lib/supabase"

const COOKIE = "camilia_academy"
const HAIR = new Set(["short", "crop", "medium", "bob", "long", "bun", "ponytail"])

type StudentSession = AuthSession & { name: string }

export type Student = { name: string; email: string }

function cookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    secure: requestOrigin(request).startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

function refused(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).host !== new URL(requestOrigin(request)).host
  } catch {
    return true
  }
}

function encode(session: StudentSession) {
  return Buffer.from(JSON.stringify(session)).toString("base64url")
}

function decode(value: string): StudentSession | null {
  try {
    const data = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<StudentSession>
    if (!data.userId || !data.email || !data.accessToken || !data.refreshToken || !data.name) return null
    if (typeof data.expiresAt !== "number") return null
    return data as StudentSession
  } catch {
    return null
  }
}

function withSession(request: Request, session: StudentSession | null) {
  const response = NextResponse.json(session ? { student: { name: session.name, email: session.email } } : { student: null })
  if (session) response.cookies.set(COOKIE, encode(session), cookieOptions(request, 60 * 60 * 24 * 60))
  return response
}

async function current(request: NextRequest): Promise<StudentSession | null> {
  const raw = request.cookies.get(COOKIE)?.value
  if (!raw) return null
  const session = decode(raw)
  if (!session) return null
  if (session.expiresAt > Date.now() + 60_000) return session
  const refreshed = await refreshAuth(session.refreshToken)
  if (!refreshed) return null
  return { ...refreshed, name: session.name, email: refreshed.email || session.email }
}

export async function academyStatus(request: NextRequest) {
  const session = await current(request)
  const response = NextResponse.json({
    configured: Boolean(supabaseConfig()),
    student: session ? { name: session.name, email: session.email } : null,
  })
  if (session) response.cookies.set(COOKIE, encode(session), cookieOptions(request, 60 * 60 * 24 * 60))
  response.headers.set("Cache-Control", "no-store")
  return response
}

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return ""
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160 ? email : ""
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return ""
  const name = value.trim().replace(/\s+/g, " ")
  return name.length >= 2 && name.length <= 80 ? name : ""
}

function cleanPassword(value: unknown) {
  return typeof value === "string" && value.length >= 8 && value.length <= 200 ? value : ""
}

export async function academySignUp(request: NextRequest) {
  if (refused(request)) return NextResponse.json({ error: "The request was refused." }, { status: 403 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = cleanName(body?.name)
  const email = cleanEmail(body?.email)
  const password = cleanPassword(body?.password)
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 })
  }
  const result = await signUp(email, password, name)
  if ("error" in result && result.error) return NextResponse.json({ error: result.error }, { status: supabaseConfig() ? 400 : 503 })
  if (!("session" in result) || !result.session) return NextResponse.json({ error: "The academy could not open that record." }, { status: 400 })
  return withSession(request, { ...result.session, name })
}

export async function academySignIn(request: NextRequest) {
  if (refused(request)) return NextResponse.json({ error: "The request was refused." }, { status: 403 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const email = cleanEmail(body?.email)
  const password = cleanPassword(body?.password)
  if (!email || !password) return NextResponse.json({ error: "Enter the email and password of your student record." }, { status: 400 })
  const result = await signIn(email, password)
  if ("error" in result && result.error) return NextResponse.json({ error: result.error }, { status: supabaseConfig() ? 401 : 503 })
  if (!("session" in result) || !result.session) return NextResponse.json({ error: "Those details don't match a student record." }, { status: 401 })
  const name = cleanName(body?.name) || result.session.email.split("@")[0] || "Student"
  return withSession(request, { ...result.session, name })
}

export async function academySignOut(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE, "", cookieOptions(request, 0))
  return response
}

function characterOf(value: unknown) {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (row.sex !== "man" && row.sex !== "woman") return null
  if (typeof row.height !== "number" || row.height < 0 || row.height > 1) return null
  if (typeof row.skin !== "string" || !/^#[0-9a-f]{6}$/i.test(row.skin)) return null
  if (typeof row.hair !== "string" || !HAIR.has(row.hair)) return null
  if (typeof row.hairColor !== "string" || !/^#[0-9a-f]{6}$/i.test(row.hairColor)) return null
  if (!row.outfit || typeof row.outfit !== "object") return null
  const slots = row.outfit as Record<string, unknown>
  const outfit: Record<string, string> = {}
  for (const key of ["underwear", "top", "bottom", "shoes"]) {
    const slot = slots[key]
    if (typeof slot !== "string" || slot.length > 40) return null
    outfit[key] = slot
  }
  return {
    sex: row.sex,
    height: row.height,
    skin: row.skin,
    hair: row.hair,
    hairColor: row.hairColor,
    outfit,
    created: true,
  }
}

export async function readProgress(request: NextRequest) {
  const session = await current(request)
  if (!session) return NextResponse.json({ error: "Sign in to open your student record." }, { status: 401 })
  const file = await downloadObject(progressPath(session.userId), null)
  if (!file) return NextResponse.json({ character: null })
  try {
    const parsed = JSON.parse(file.bytes.toString("utf8")) as { character?: unknown }
    return NextResponse.json({ character: characterOf(parsed.character) })
  } catch {
    return NextResponse.json({ character: null })
  }
}

export async function writeProgress(request: NextRequest) {
  if (refused(request)) return NextResponse.json({ error: "The request was refused." }, { status: 403 })
  const session = await current(request)
  if (!session) return NextResponse.json({ error: "Sign in to keep your progress." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { character?: unknown } | null
  const character = characterOf(body?.character)
  if (!character) return NextResponse.json({ error: "That student record could not be saved." }, { status: 400 })
  const saved = await uploadObject(
    progressPath(session.userId),
    Buffer.from(JSON.stringify({ character })),
    "application/json",
  )
  if (!saved) return NextResponse.json({ error: "Your progress could not be saved." }, { status: 503 })
  return NextResponse.json({ ok: true })
}
