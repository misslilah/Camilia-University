import { connection, type NextRequest } from "next/server"
import { libraryStatus } from "@/lib/patreon-server"

export async function GET(request: NextRequest) {
  await connection()
  return libraryStatus(request)
}
