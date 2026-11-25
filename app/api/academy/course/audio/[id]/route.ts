import { connection, type NextRequest } from "next/server"
import { streamCourseAudio } from "@/lib/course-server"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await context.params
  return streamCourseAudio(request, id)
}
