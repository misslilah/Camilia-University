import type { CampaignTier, EntitledTier } from "@/lib/patreon-access"
import { deleteObject, listObjects, readObject, uploadObject } from "@/lib/supabase"

export type LibrarySession = {
  id: string
  patreonUserId: string
  fullName: string | null
  refreshToken: string
  accessToken: string
  accessExpiresAt: string
  isAdmin: boolean
  patronStatus: string | null
  tierTitle: string | null
  entitled: EntitledTier[]
  updatedAt: string
}

export type LibraryMedia = {
  id: string
  kind: string
  name: string
  mime: string
  size: number
  duration: number | null
  tierTitle: string
  tierCents: number | null
  storagePath: string
  addedAt: string
}

function sessionPath(id: string) {
  return `patreon/sessions/${id}.json`
}

function userPath(userId: string) {
  return `patreon/users/${userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}.json`
}

function mediaPath(id: string) {
  return `patreon/media-index/${id}.json`
}

async function writeJson(path: string, value: unknown) {
  return uploadObject(path, Buffer.from(JSON.stringify(value)), "application/json")
}

async function readJson(path: string) {
  const bytes = await readObject(path)
  if (bytes === undefined) return undefined
  if (bytes === null) return null
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown
  } catch {
    return null
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function entitled(value: unknown): EntitledTier[] {
  if (!Array.isArray(value)) return []
  const tiers: EntitledTier[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const title = typeof row.title === "string" ? row.title.trim() : ""
    if (!title) continue
    const id = typeof row.id === "string" && row.id ? row.id : title
    const amount = typeof row.amountCents === "number" && Number.isFinite(row.amountCents) ? Math.round(row.amountCents) : null
    tiers.push({ id, title, amountCents: amount })
  }
  return tiers
}

export function sessionFromJson(value: unknown): LibrarySession | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const patreonUserId = text(row.patreonUserId)
  const refreshToken = text(row.refreshToken)
  const accessToken = text(row.accessToken)
  const accessExpiresAt = text(row.accessExpiresAt)
  const updatedAt = text(row.updatedAt)
  if (!id || !patreonUserId || !refreshToken || !accessToken || !accessExpiresAt || !updatedAt) return null
  if (Number.isNaN(Date.parse(accessExpiresAt)) || Number.isNaN(Date.parse(updatedAt))) return null
  return {
    id,
    patreonUserId,
    fullName: typeof row.fullName === "string" ? row.fullName : null,
    refreshToken,
    accessToken,
    accessExpiresAt,
    isAdmin: row.isAdmin === true,
    patronStatus: typeof row.patronStatus === "string" ? row.patronStatus : null,
    tierTitle: typeof row.tierTitle === "string" ? row.tierTitle : null,
    entitled: entitled(row.entitled),
    updatedAt,
  }
}

export function mediaFromJson(value: unknown): LibraryMedia | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const kind = text(row.kind)
  const name = text(row.name)
  const mime = text(row.mime)
  const storagePath = text(row.storagePath)
  const addedAt = text(row.addedAt)
  const tierTitle = text(row.tierTitle)
  const size = typeof row.size === "number" ? row.size : Number(row.size)
  if (!id || !kind || !name || !mime || !storagePath || !tierTitle || !addedAt) return null
  if (!Number.isInteger(size) || size < 0 || Number.isNaN(Date.parse(addedAt))) return null
  const tierCents = typeof row.tierCents === "number" && Number.isFinite(row.tierCents) ? Math.round(row.tierCents) : null
  const duration = typeof row.duration === "number" && Number.isFinite(row.duration) ? row.duration : null
  return { id, kind, name, mime, size, duration, tierTitle, tierCents, storagePath, addedAt }
}

export async function loadLibrarySession(id: string) {
  const value = await readJson(sessionPath(id))
  if (value === undefined) return undefined
  if (value === null) return null
  return sessionFromJson(value)
}

export async function storeLibrarySession(session: LibrarySession) {
  const saved = await writeJson(sessionPath(session.id), session)
  if (!saved) return false
  return writeJson(userPath(session.patreonUserId), { id: session.id })
}

export async function removeLibrarySession(id: string) {
  await deleteObject(sessionPath(id))
}

export async function removeUserSession(userId: string) {
  const value = await readJson(userPath(userId))
  const previous = value && typeof value === "object" ? text((value as { id?: unknown }).id) : ""
  if (previous) await deleteObject(sessionPath(previous))
  await deleteObject(userPath(userId))
}

export async function putLibraryMedia(item: LibraryMedia) {
  return writeJson(mediaPath(item.id), item)
}

export async function loadLibraryMedia(id: string) {
  const value = await readJson(mediaPath(id))
  if (value === undefined) return undefined
  if (value === null) return null
  return mediaFromJson(value)
}

export async function listLibraryMedia() {
  const names = await listObjects("patreon/media-index/")
  if (!names) return null
  const items: LibraryMedia[] = []
  for (const name of names) {
    const value = await readJson(name)
    if (!value) continue
    const item = mediaFromJson(value)
    if (item) items.push(item)
  }
  items.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id))
  return items
}

export async function removeLibraryMedia(id: string) {
  return deleteObject(mediaPath(id))
}

const CATALOG_PATH = "patreon/catalog.json"

export async function storeCampaignCatalog(catalog: { vanity: string; tiers: CampaignTier[] }) {
  return writeJson(CATALOG_PATH, { vanity: catalog.vanity, tiers: catalog.tiers })
}

export async function loadCampaignCatalog() {
  const value = await readJson(CATALOG_PATH)
  if (value === undefined) return undefined
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const vanity = text(row.vanity).trim()
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(vanity) || !Array.isArray(row.tiers)) return null
  const tiers: CampaignTier[] = []
  for (const item of row.tiers) {
    if (!item || typeof item !== "object") continue
    const tier = item as Record<string, unknown>
    const id = text(tier.id).trim()
    const title = text(tier.title).trim()
    if (!/^\d{1,20}$/.test(id) || !title) continue
    const amount = typeof tier.amountCents === "number" && Number.isFinite(tier.amountCents) ? Math.round(tier.amountCents) : null
    tiers.push({ id, title, amountCents: amount })
  }
  return { vanity, tiers }
}
