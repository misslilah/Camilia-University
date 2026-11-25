import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { parseCourse, type ObedienceCourse } from "@/lib/obedience-course"
import { readObject, supabaseConfig, uploadObject } from "@/lib/supabase"

const OBJECT = "courses/obedience-training.json"
const FILE = path.join(process.cwd(), "data", "obedience-course.json")

export function courseAudioPath(id: string) {
  return `courses/obedience-audio/${id}`
}

export async function loadStoredCourse(): Promise<{ course: ObedienceCourse; source: "remote" | "file" } | null | undefined> {
  if (supabaseConfig()) {
    const bytes = await readObject(OBJECT)
    if (bytes === undefined) return undefined
    if (bytes === null) return null
    try {
      const course = parseCourse(JSON.parse(bytes.toString("utf8")))
      return course ? { course, source: "remote" } : null
    } catch {
      return null
    }
  }
  try {
    const raw = await readFile(FILE, "utf8")
    const course = parseCourse(JSON.parse(raw))
    return course ? { course, source: "file" } : null
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : ""
    if (code === "ENOENT" || error instanceof SyntaxError) return null
    return undefined
  }
}

export async function saveStoredCourse(course: ObedienceCourse): Promise<"remote" | "file" | null> {
  const body = JSON.stringify(course)
  if (supabaseConfig()) {
    try {
      const saved = await uploadObject(OBJECT, Buffer.from(body), "application/json")
      return saved ? "remote" : null
    } catch {
      return null
    }
  }
  try {
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, body, "utf8")
    return "file"
  } catch {
    return null
  }
}
