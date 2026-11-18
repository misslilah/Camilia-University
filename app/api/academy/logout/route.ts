import { connection, type NextRequest } from "next/server"
import { academySignOut } from "@/lib/academy-server"

export async function POST(request: NextRequest) {
  await connection()
  return academySignOut(request)
}
