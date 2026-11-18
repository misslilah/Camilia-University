import { connection, type NextRequest } from "next/server"
import { readProgress, writeProgress } from "@/lib/academy-server"

export async function GET(request: NextRequest) {
  await connection()
  return readProgress(request)
}

export async function PUT(request: NextRequest) {
  await connection()
  return writeProgress(request)
}
