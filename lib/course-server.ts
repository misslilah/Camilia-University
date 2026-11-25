import { NextResponse, type NextRequest } from "next/server"
import { courseAudioPath, loadStoredCourse, saveStoredCourse } from "@/lib/course-store"
import {
  MAX_AUDIO_BYTES,
  courseAudioIds,
  courseAudioMime,
  defaultCourse,
  parseCourse,
  type ObedienceCourse,
} from "@/lib/obedience-course"
import { creatorGate, requestOrigin } from "@/lib/patreon-server"
import { deleteObject, objectSize, signedDownloadUrl, signedUpload, supabaseConfig } from "@/lib/supabase"

const MAX_JSON = 64 * 1024
const AUDIO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

function refused(request: Request) {
  const site = request.headers.get("sec-fetch-site")
  if (site === "cross-site") return true
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).host !== new URL(requestOrigin(request)).host
  } catch {
    return true
  }
}

function tooBig(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0")
  return Number.isFinite(length) && length > MAX_JSON
}

async function audioList(course: ObedienceCourse) {
  const remote = Boolean(supabaseConfig())
  const audio: { id: string; url: string | null }[] = []
  for (const id of courseAudioIds(course)) {
    if (!remote) {
      audio.push({ id, url: null })
      continue
    }
    let size: number | null = null
    try {
      size = await objectSize(courseAudioPath(id))
    } catch {
      size = 1
    }
    audio.push({ id, url: size ? `/api/academy/course/audio/${id}` : null })
  }
  return audio
}

export async function readCourse(request: NextRequest) {
  if (refused(request)) return json({ error: "The request was refused." }, 403)
  const stored = await loadStoredCourse()
  if (stored === undefined) return json({ error: "The course could not be opened." }, 503)
  const course = stored?.course ?? defaultCourse()
  const source = stored?.source ?? "default"
  return json({ course, source, audio: await audioList(course) })
}

export async function writeCourse(request: NextRequest) {
  if (refused(request)) return json({ error: "The request was refused." }, 403)
  if (tooBig(request)) return json({ error: "That course could not be saved." }, 413)
  const gate = await creatorGate(request)
  if (gate === "unavailable") return json({ error: "The creator sign-in is not available." }, 503)
  if (gate !== "ok") return json({ error: "Only the creator can change this course." }, 403)
  const course = parseCourse(await request.json().catch(() => null))
  if (!course) return json({ error: "Add at least one line before saving." }, 400)
  const storage = await saveStoredCourse(course)
  if (!storage) return json({ error: "The course could not be saved." }, 503)
  return json({ ok: true, storage, course })
}

function cleanFileName(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().split(/[/\\]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120) ?? ""
}

function readAudio(value: unknown) {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const step = row.step === "prepare" || row.step === "finish" ? row.step : null
  if (!step) return null
  return {
    step,
    id: typeof row.id === "string" ? row.id : "",
    name: cleanFileName(row.name),
    size: typeof row.size === "number" ? row.size : NaN,
    mime: typeof row.mime === "string" ? row.mime : "",
  }
}

export async function receiveCourseAudio(request: NextRequest) {
  if (refused(request)) return json({ error: "The request was refused." }, 403)
  if (tooBig(request)) return json({ error: "That clip could not be saved." }, 413)
  const gate = await creatorGate(request)
  if (gate === "unavailable") return json({ error: "The creator sign-in is not available." }, 503)
  if (gate !== "ok") return json({ error: "Only the creator can add a clip." }, 403)
  const body = readAudio(await request.json().catch(() => null))
  if (!body) return json({ error: "Choose an audio file." }, 400)
  const name = body.name || "Audio"
  if (!Number.isInteger(body.size) || body.size <= 0) return json({ error: `"${name}" is empty.` }, 400)
  if (body.size > MAX_AUDIO_BYTES) return json({ error: `"${name}" is larger than 12 MB.` }, 413)
  const mime = courseAudioMime(name, body.mime)
  if (!mime) return json({ error: `"${name}" is not an audio file.` }, 400)
  if (!supabaseConfig()) return json({ local: true, id: crypto.randomUUID() })
  if (body.step === "prepare") {
    const id = crypto.randomUUID()
    const ticket = await signedUpload(courseAudioPath(id))
    if (!ticket) return json({ error: `"${name}" could not be saved.` }, 503)
    return json({ id, ...ticket, mime })
  }
  if (!AUDIO_ID.test(body.id)) return json({ error: "Choose an audio file." }, 400)
  const path = courseAudioPath(body.id)
  const measured = async () => {
    try {
      return await objectSize(path)
    } catch {
      return null
    }
  }
  let stored = await measured()
  for (let attempt = 0; stored !== body.size && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    stored = await measured()
  }
  if (stored == null || stored !== body.size) {
    if (stored != null) await deleteObject(path)
    return json({ error: `"${name}" could not be saved.` }, 503)
  }
  return json({ ok: true, id: body.id })
}

export async function streamCourseAudio(request: NextRequest, id: string) {
  if (refused(request)) return json({ error: "The request was refused." }, 403)
  if (!AUDIO_ID.test(id)) return json({ error: "That clip was not found." }, 404)
  const stored = await loadStoredCourse()
  if (stored === undefined) return json({ error: "The course could not be opened." }, 503)
  if (!stored || !courseAudioIds(stored.course).includes(id)) return json({ error: "That clip was not found." }, 404)
  if (!supabaseConfig()) return json({ error: "That clip is kept on the computer where it was added." }, 404)
  const signed = await signedDownloadUrl(courseAudioPath(id), 60 * 60)
  if (!signed) return json({ error: "That clip could not be opened." }, 503)
  return NextResponse.redirect(signed, { status: 302, headers: { "Cache-Control": "private, no-store" } })
}
