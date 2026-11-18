import { connection, type NextRequest } from "next/server"
import { finishLogin } from "@/lib/patreon-server"

export async function GET(request: NextRequest) {
  await connection()
  return finishLogin(request)
}
