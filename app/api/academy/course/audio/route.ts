import { connection, type NextRequest } from "next/server"
import { receiveCourseAudio } from "@/lib/course-server"

export async function POST(request: NextRequest) {
  await connection()
  return receiveCourseAudio(request)
}
