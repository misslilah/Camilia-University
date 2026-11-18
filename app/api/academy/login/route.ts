import { connection, type NextRequest } from "next/server"
import { academySignIn } from "@/lib/academy-server"

export async function POST(request: NextRequest) {
  await connection()
  return academySignIn(request)
}
