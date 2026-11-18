import { connection, type NextRequest } from "next/server"
import { academyStatus } from "@/lib/academy-server"

export async function GET(request: NextRequest) {
  await connection()
  return academyStatus(request)
}
