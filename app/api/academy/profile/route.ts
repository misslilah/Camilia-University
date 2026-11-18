import { connection, type NextRequest } from "next/server"
import { academyRename } from "@/lib/academy-server"

export async function PUT(request: NextRequest) {
  await connection()
  return academyRename(request)
}
