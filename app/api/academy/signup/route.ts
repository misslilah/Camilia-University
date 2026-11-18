import { connection, type NextRequest } from "next/server"
import { academySignUp } from "@/lib/academy-server"

export async function POST(request: NextRequest) {
  await connection()
  return academySignUp(request)
}
