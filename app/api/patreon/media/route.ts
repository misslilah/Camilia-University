import { connection, type NextRequest } from "next/server"
import { uploadMedia } from "@/lib/patreon-server"

export async function POST(request: NextRequest) {
  await connection()
  return uploadMedia(request)
}
