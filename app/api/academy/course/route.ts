import { connection, type NextRequest } from "next/server"
import { readCourse, writeCourse } from "@/lib/course-server"

export async function GET(request: NextRequest) {
  await connection()
  return readCourse(request)
}

export async function PUT(request: NextRequest) {
  await connection()
  return writeCourse(request)
}
