import { connection, type NextRequest } from "next/server"
import { beginLogin } from "@/lib/patreon-server"

export async function GET(request: NextRequest) {
  await connection()
  return beginLogin(request)
}
