import { connection, type NextRequest } from "next/server"
import { studentRoster } from "@/lib/patreon-server"

export async function GET(request: NextRequest) {
  await connection()
  return studentRoster(request)
}
