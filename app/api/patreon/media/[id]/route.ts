import { connection, type NextRequest } from "next/server"
import { removeMedia, streamMedia } from "@/lib/patreon-server"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await context.params
  return streamMedia(request, id)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await context.params
  return removeMedia(request, id)
}
