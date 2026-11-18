import { connection, type NextRequest } from "next/server"
import { endLogin } from "@/lib/patreon-server"

export async function POST(request: NextRequest) {
  await connection()
  return endLogin(request)
}
