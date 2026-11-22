import { randomBytes, timingSafeEqual } from "crypto"
import { NextResponse, type NextRequest } from "next/server"
import { dbQuery, databaseUrl, logDatabaseError } from "@/lib/db"
import {
  listLibraryMedia,
  loadLibraryMedia,
  loadLibrarySession,
  putLibraryMedia,
  removeLibraryMedia,
  removeLibrarySession,
  removeUserSession,
  storeLibrarySession,
  type LibraryMedia,
  type LibrarySession,
} from "@/lib/library-store"
import { deleteObject, mediaPath, objectSize, signedDownloadUrl, signedUpload, supabaseConfig } from "@/lib/supabase"
import {
  entitledTo,
  isCampaignCreator,
  membershipNotice,
  sameId,
  sampleLibrary,
  tierById,
  tierLabel,
  tooLargeMessage,
  storageLimitMessage,
  MAX_UPLOAD_BYTES,
  type CampaignTier,
  type EntitledTier,
  type LibraryItem,
  type LibraryStatus,
  type MediaKind,
} from "@/lib/patreon-access"

const SESSION_COOKIE = "camilia_patreon"
const STATE_COOKIE = "camilia_patreon_state"
const USER_AGENT = "CamiliaUniversity/1.0"
const TOKEN_URL = "https://www.patreon.com/api/oauth2/token"
const OAUTH_SCOPES = "identity identity.memberships campaigns"
const HOST_RE = /^[a-z0-9.-]+(?::\d{1,5})?$/i
const SESSION_ID = /^[a-f0-9]{64}$/
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_JSON_BODY = 64 * 1024

const AUDIO_EXT = new Set(["wav", "mp3", "ogg", "m4a", "aac", "flac", "opus", "webm"])
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "mkv", "ogg"])

type Config = { clientId: string; clientSecret: string; campaignId: string }

type StoredSession = {
  id: string
  patreonUserId: string
  fullName: string | null
  refreshToken: string
  accessToken: string
  accessExpiresAt: Date
  isAdmin: boolean
  patronStatus: string | null
  tierTitle: string | null
  entitled: EntitledTier[]
  updatedAt: Date
}

type TokenBundle = { accessToken: string; refreshToken: string; expiresAt: Date }

type Membership = { patronStatus: string | null; entitled: EntitledTier[] }

type Identity = {
  userId: string
  fullName: string | null
  campaignId: string | null
  membership: Membership | null
}

type SessionRow = {
  id: string
  patreon_user_id: string
  full_name: string | null
  refresh_token: string
  access_token: string
  access_expires_at: Date
  is_admin: boolean
  patron_status: string | null
  tier_title: string | null
  entitled: unknown
  updated_at: Date
}

type MediaRow = {
  id: string
  kind: string
  name: string
  mime: string
  size: number
  duration: number | null
  tier_title: string
  tier_cents: number | null
  added_at: Date
}

const refreshing = new Map<string, Promise<StoredSession | null>>()

export function patreonConfig(): Config | null {
  const clientId = process.env.PATREON_CLIENT_ID?.trim() ?? ""
  const clientSecret = process.env.PATREON_CLIENT_SECRET?.trim() ?? ""
  const campaignId = process.env.PATREON_CAMPAIGN_ID?.trim() ?? ""
  if (!clientId || !clientSecret || !campaignId) return null
  return { clientId, clientSecret, campaignId }
}

// Patreon only accepts redirect URIs registered on the client. Preview and
// internal deployment hosts are ignored; the request must arrive on one of
// these public addresses, or on the address in APP_ORIGIN.
const PUBLIC_ORIGINS = [
  "https://camilia-university.pro",
  "https://www.camilia-university.pro",
  "https://camilia-university.apps.grok.bot",
  "https://camilia-university-misslilahs-projects.vercel.app",
]

function allowedOrigins() {
  const extra = process.env.APP_ORIGIN?.trim().replace(/\/$/, "") ?? ""
  const list = [...PUBLIC_ORIGINS]
  if (extra.startsWith("https://") && !list.includes(extra)) list.push(extra)
  return list
}

function originForHost(host: string, protocol: string) {
  if (!HOST_RE.test(host)) return ""
  if (host.startsWith("127.0.0.1") || host.startsWith("localhost") || host.startsWith("[::1]")) {
    const proto = protocol === "http:" ? "http" : "https"
    return `${proto}://${host}`
  }
  return allowedOrigins().find((origin) => new URL(origin).host === host) ?? ""
}

export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? ""
  const hostHeader = request.headers.get("host")?.trim() ?? ""
  for (const candidate of [forwarded, hostHeader, url.host]) {
    const origin = originForHost(candidate, url.protocol)
    if (origin) return origin
  }
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "") ?? ""
  if (configured.startsWith("https://")) return configured
  return PUBLIC_ORIGINS[0]
}

export function oauthRedirectUri(request: Request) {
  return `${requestOrigin(request)}/api/patreon/callback`
}

function secureCookie(request: Request) {
  return requestOrigin(request).startsWith("https://")
}

function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

function redirectTo(request: Request, path: string, cookies: { name: string; value: string; maxAge: number }[] = []) {
  const response = NextResponse.redirect(new URL(path, requestOrigin(request)), 303)
  const secure = secureCookie(request)
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: cookie.maxAge,
    })
  }
  response.headers.set("Cache-Control", "no-store")
  return response
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function crossSite(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host !== new URL(requestOrigin(request)).host
  } catch {
    return true
  }
}

function readEntitled(value: unknown): EntitledTier[] {
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

function toSession(row: SessionRow): StoredSession {
  return {
    id: row.id,
    patreonUserId: row.patreon_user_id,
    fullName: row.full_name,
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessExpiresAt: new Date(row.access_expires_at),
    isAdmin: row.is_admin,
    patronStatus: row.patron_status,
    tierTitle: row.tier_title,
    entitled: readEntitled(row.entitled),
    updatedAt: new Date(row.updated_at),
  }
}

function parseToken(value: unknown, previousRefresh?: string): TokenBundle | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const accessToken = typeof row.access_token === "string" ? row.access_token : ""
  const refreshToken = typeof row.refresh_token === "string" && row.refresh_token.length > 0 ? row.refresh_token : (previousRefresh ?? "")
  const expiresIn = typeof row.expires_in === "number" ? row.expires_in : Number(row.expires_in)
  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || expiresIn <= 0) return null
  return { accessToken, refreshToken, expiresAt: new Date(Date.now() + expiresIn * 1000) }
}

type Resource = {
  type?: string
  id?: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: { type?: string; id?: string } | { type?: string; id?: string }[] | null }>
}

function asResource(value: unknown): Resource | null {
  if (!value || typeof value !== "object") return null
  return value as Resource
}

function idText(value: unknown) {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function relOne(resource: Resource, name: string) {
  const data = resource.relationships?.[name]?.data
  const item = Array.isArray(data) ? data[0] : data
  if (!item || typeof item !== "object") return null
  const id = idText(item.id)
  return id || null
}

function relMany(resource: Resource, name: string) {
  const data = resource.relationships?.[name]?.data
  if (!Array.isArray(data)) return []
  return data.flatMap((item) => {
    const id = idText(item.id)
    return id ? [id] : []
  })
}

function includedMap(body: unknown) {
  const map = new Map<string, Resource>()
  if (!body || typeof body !== "object") return map
  const included = (body as { included?: unknown }).included
  if (!Array.isArray(included)) return map
  for (const item of included) {
    const resource = asResource(item)
    if (resource?.type && resource.id) map.set(`${resource.type}:${resource.id}`, resource)
  }
  return map
}

function amountCents(resource: Resource) {
  const value = resource.attributes?.amount_cents
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null
}

function parseIdentity(body: unknown, campaignId: string): Identity | null {
  if (!body || typeof body !== "object") return null
  const data = asResource((body as { data?: unknown }).data)
  if (!data || data.type !== "user" || typeof data.id !== "string") return null
  const included = includedMap(body)
  const fullName = typeof data.attributes?.full_name === "string" ? data.attributes.full_name : null
  let membership: Membership | null = null
  for (const memberId of relMany(data, "memberships")) {
    const member = included.get(`member:${memberId}`)
    if (!member) continue
    if (!sameId(relOne(member, "campaign"), campaignId)) continue
    const status = typeof member.attributes?.patron_status === "string" ? member.attributes.patron_status : null
    const entitled = relMany(member, "currently_entitled_tiers").flatMap((tierId) => {
      const tier = included.get(`tier:${tierId}`)
      const title = typeof tier?.attributes?.title === "string" ? tier.attributes.title.trim() : ""
      if (!title) return []
      return [{ id: tierId, title, amountCents: tier ? amountCents(tier) : null }]
    })
    const next = { patronStatus: status, entitled }
    if (!membership || (next.patronStatus === "active_patron" && membership.patronStatus !== "active_patron")) membership = next
  }
  return { userId: data.id, fullName, campaignId: relOne(data, "campaign"), membership }
}

async function patreonGet(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
    cache: "no-store",
  })
  return response
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function exchangeCode(config: Config, code: string, redirectUri: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  })
  if (!response.ok) {
    console.error("patreon token exchange failed", response.status)
    return null
  }
  return parseToken(await readJson(response))
}

async function refreshTokens(config: Config, refreshToken: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    cache: "no-store",
  })
  if (!response.ok) {
    console.error("patreon token refresh failed", response.status)
    return null
  }
  return parseToken(await readJson(response), refreshToken)
}

async function persistToken(session: StoredSession, token: TokenBundle) {
  if (supabaseConfig()) {
    const next: StoredSession = { ...session, refreshToken: token.refreshToken, accessToken: token.accessToken, accessExpiresAt: token.expiresAt, updatedAt: new Date() }
    return (await storeLibrarySession(libraryFromStored(next))) ? next : null
  }
  const result = await dbQuery<SessionRow>(
    `UPDATE patreon_session
     SET refresh_token = $2, access_token = $3, access_expires_at = $4, updated_at = now()
     WHERE id = $1
     RETURNING id, patreon_user_id, full_name, refresh_token, access_token, access_expires_at, is_admin, patron_status, tier_title, entitled, updated_at`,
    [session.id, token.refreshToken, token.accessToken, token.expiresAt.toISOString()],
  )
  const row = result?.rows[0]
  return row ? toSession(row) : null
}

function identityUrl() {
  const url = new URL("https://www.patreon.com/api/oauth2/v2/identity")
  url.searchParams.set("include", "memberships,memberships.currently_entitled_tiers,memberships.campaign,campaign")
  url.searchParams.set("fields[user]", "full_name")
  url.searchParams.set("fields[member]", "patron_status")
  url.searchParams.set("fields[tier]", "title,amount_cents")
  url.searchParams.set("fields[campaign]", "creation_name")
  return url
}

async function loadIdentity(accessToken: string, campaignId: string) {
  const response = await patreonGet(identityUrl().toString(), accessToken)
  if (!response.ok) {
    console.error("patreon identity failed", response.status)
    return null
  }
  return parseIdentity(await readJson(response), campaignId)
}

function tiersOf(campaign: Resource, included: Map<string, Resource>): CampaignTier[] {
  const tiers = relMany(campaign, "tiers").flatMap((tierId) => {
    const tier = included.get(`tier:${tierId}`)
    const title = typeof tier?.attributes?.title === "string" ? tier.attributes.title.trim() : ""
    if (!title) return []
    return [{ id: tierId, title, amountCents: tier ? amountCents(tier) : null }]
  })
  tiers.sort((a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0) || a.title.localeCompare(b.title))
  return tiers
}

async function loadCampaign(accessToken: string, campaignId: string) {
  const url = new URL(`https://www.patreon.com/api/oauth2/v2/campaigns/${encodeURIComponent(campaignId)}`)
  url.searchParams.set("include", "tiers,creator")
  url.searchParams.set("fields[tier]", "title,amount_cents")
  url.searchParams.set("fields[user]", "full_name")
  const response = await patreonGet(url.toString(), accessToken)
  if (!response.ok) {
    console.error("patreon campaign failed", response.status)
    return null
  }
  const body = await readJson(response)
  const data = asResource(body && typeof body === "object" ? (body as { data?: unknown }).data : null)
  if (!data) return null
  const included = includedMap(body)
  return { creatorId: relOne(data, "creator"), tiers: tiersOf(data, included) }
}

type CreatorAccess = { owns: boolean; tiers: CampaignTier[]; ownedIds: string[] }

async function loadCreatorAccess(accessToken: string, campaignId: string, userId: string): Promise<CreatorAccess | null> {
  const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns")
  url.searchParams.set("include", "tiers,creator")
  url.searchParams.set("fields[tier]", "title,amount_cents")
  url.searchParams.set("fields[user]", "full_name")
  const response = await patreonGet(url.toString(), accessToken)
  if (!response.ok) {
    console.error("patreon campaigns failed", response.status)
    const single = await loadCampaign(accessToken, campaignId).catch(() => null)
    if (!single?.creatorId) return null
    const owns = sameId(single.creatorId, userId)
    return { owns, tiers: single.tiers, ownedIds: owns ? [campaignId] : [] }
  }
  const body = await readJson(response)
  const data = body && typeof body === "object" ? (body as { data?: unknown }).data : null
  const included = includedMap(body)
  const list = Array.isArray(data) ? data.flatMap((item) => asResource(item) ?? []) : asResource(data) ? [asResource(data)!] : []
  const ownedIds: string[] = []
  let matched: CampaignTier[] | null = null
  for (const campaign of list) {
    const id = idText(campaign.id)
    if (!id || ownedIds.includes(id)) continue
    ownedIds.push(id)
    if (!sameId(id, campaignId)) continue
    matched = tiersOf(campaign, included)
  }
  if (matched && matched.length === 0) {
    const single = await loadCampaign(accessToken, campaignId).catch(() => null)
    if (single && single.tiers.length > 0) matched = single.tiers
  }
  if (ownedIds.length === 0) return null
  return { owns: matched != null, tiers: matched ?? [], ownedIds }
}

function recordsReady() {
  return supabaseConfig() != null || databaseUrl() != null
}

function storedFromLibrary(session: LibrarySession): StoredSession {
  return { ...session, accessExpiresAt: new Date(session.accessExpiresAt), updatedAt: new Date(session.updatedAt) }
}

function libraryFromStored(session: StoredSession): LibrarySession {
  return { ...session, accessExpiresAt: session.accessExpiresAt.toISOString(), updatedAt: session.updatedAt.toISOString() }
}

function mediaRow(item: LibraryMedia): MediaRow & { storage_path: string } {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    mime: item.mime,
    size: item.size,
    duration: item.duration,
    tier_title: item.tierTitle,
    tier_cents: item.tierCents,
    added_at: new Date(item.addedAt),
    storage_path: item.storagePath,
  }
}

function decideAdmin(identity: Identity, campaignId: string, access: CreatorAccess | null) {
  return isCampaignCreator({
    campaignId,
    identityCampaignId: identity.campaignId,
    ownsListedCampaign: access?.owns === true,
  })
}

async function saveSession(id: string, identity: Identity, token: TokenBundle, admin: boolean) {
  const entitled = identity.membership?.entitled ?? []
  const patronStatus = identity.membership?.patronStatus ?? null
  const label = tierLabel(entitled)
  if (supabaseConfig()) {
    return storeLibrarySession({
      id,
      patreonUserId: identity.userId,
      fullName: identity.fullName,
      refreshToken: token.refreshToken,
      accessToken: token.accessToken,
      accessExpiresAt: token.expiresAt.toISOString(),
      isAdmin: admin,
      patronStatus,
      tierTitle: label,
      entitled,
      updatedAt: new Date().toISOString(),
    })
  }
  const result = await dbQuery(
    `INSERT INTO patreon_session
      (id, patreon_user_id, full_name, refresh_token, access_token, access_expires_at, is_admin, patron_status, tier_title, entitled, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb, now())`,
    [id, identity.userId, identity.fullName, token.refreshToken, token.accessToken, token.expiresAt.toISOString(), admin, patronStatus, label, JSON.stringify(entitled)],
  )
  return result != null
}

async function updateSession(session: StoredSession, identity: Identity, token: TokenBundle, admin: boolean) {
  const entitled = identity.membership?.entitled ?? []
  const patronStatus = identity.membership?.patronStatus ?? null
  const label = tierLabel(entitled)
  if (supabaseConfig()) {
    const next: StoredSession = {
      ...session,
      fullName: identity.fullName,
      refreshToken: token.refreshToken,
      accessToken: token.accessToken,
      accessExpiresAt: token.expiresAt,
      isAdmin: admin,
      patronStatus,
      tierTitle: label,
      entitled,
      updatedAt: new Date(),
    }
    return (await storeLibrarySession(libraryFromStored(next))) ? next : null
  }
  const result = await dbQuery<SessionRow>(
    `UPDATE patreon_session
     SET full_name = $2, refresh_token = $3, access_token = $4, access_expires_at = $5,
         is_admin = $6, patron_status = $7, tier_title = $8, entitled = $9::jsonb, updated_at = now()
     WHERE id = $1
     RETURNING id, patreon_user_id, full_name, refresh_token, access_token, access_expires_at, is_admin, patron_status, tier_title, entitled, updated_at`,
    [session.id, identity.fullName, token.refreshToken, token.accessToken, token.expiresAt.toISOString(), admin, patronStatus, label, JSON.stringify(entitled)],
  )
  const row = result?.rows[0]
  return row ? toSession(row) : null
}

async function deleteSession(id: string) {
  if (supabaseConfig()) {
    await removeLibrarySession(id)
    return
  }
  await dbQuery("DELETE FROM patreon_session WHERE id = $1", [id])
}

async function readSession(id: string) {
  if (supabaseConfig()) {
    const found = await loadLibrarySession(id)
    if (found === undefined) return undefined
    return found ? storedFromLibrary(found) : null
  }
  const result = await dbQuery<SessionRow>(
    `SELECT id, patreon_user_id, full_name, refresh_token, access_token, access_expires_at, is_admin, patron_status, tier_title, entitled, updated_at
     FROM patreon_session WHERE id = $1`,
    [id],
  )
  if (!result) return undefined
  const row = result.rows[0]
  return row ? toSession(row) : null
}

async function applyMembership(session: StoredSession, config: Config, token: TokenBundle) {
  const identity = await loadIdentity(token.accessToken, config.campaignId)
  if (!identity || identity.userId !== session.patreonUserId) return null
  const access = await loadCreatorAccess(token.accessToken, config.campaignId, identity.userId).catch(() => null)
  const admin = decideAdmin(identity, config.campaignId, access)
  return updateSession(session, identity, token, admin)
}

async function refreshSession(session: StoredSession, config: Config) {
  const current = refreshing.get(session.id)
  if (current) return current
  const job = (async () => {
    let active = session
    const expiring = session.accessExpiresAt.getTime() < Date.now() + 60_000
    if (expiring) {
      const token = await refreshTokens(config, session.refreshToken)
      if (!token) {
        if (session.accessExpiresAt.getTime() > Date.now()) return session
        await deleteSession(session.id).catch((error: unknown) => logDatabaseError(error))
        return null
      }
      const saved = await persistToken(session, token).catch((error: unknown) => {
        logDatabaseError(error)
        return null
      })
      active = saved ?? { ...session, accessToken: token.accessToken, refreshToken: token.refreshToken, accessExpiresAt: token.expiresAt }
    }
    const token = { accessToken: active.accessToken, refreshToken: active.refreshToken, expiresAt: active.accessExpiresAt }
    const next = await applyMembership(active, config, token).catch((error: unknown) => {
      logDatabaseError(error)
      return null
    })
    return next ?? active
  })().finally(() => refreshing.delete(session.id))
  refreshing.set(session.id, job)
  return job
}

async function currentSession(request: NextRequest, forceRefresh: boolean) {
  const config = patreonConfig()
  if (!config) return { kind: "unconfigured" as const }
  if (!recordsReady()) return { kind: "database" as const }
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? ""
  if (!SESSION_ID.test(raw)) return { kind: "guest" as const, config, expired: false }
  let session: StoredSession | null | undefined
  try {
    session = await readSession(raw)
  } catch (error) {
    logDatabaseError(error)
    return { kind: "database" as const }
  }
  if (session === undefined) return { kind: "database" as const }
  if (!session) return { kind: "guest" as const, config, expired: false }
  const stale = forceRefresh || Date.now() - session.updatedAt.getTime() > 5 * 60_000 || session.accessExpiresAt.getTime() < Date.now() + 60_000
  if (!stale) return { kind: "session" as const, config, session, expired: false }
  try {
    const next = await refreshSession(session, config)
    if (!next) return { kind: "guest" as const, config, expired: true }
    return { kind: "session" as const, config, session: next, expired: false }
  } catch (error) {
    logDatabaseError(error)
    if (session.accessExpiresAt.getTime() > Date.now()) return { kind: "session" as const, config, session, expired: false }
    return { kind: "database" as const }
  }
}

function visibleItems(session: StoredSession, rows: MediaRow[]): LibraryItem[] {
  const active = session.patronStatus === "active_patron"
  if (!session.isAdmin && !active) return []
  return rows.map((row) => {
    const file = { tierTitle: row.tier_title, tierCents: row.tier_cents }
    const allowed = session.isAdmin || entitledTo(file, session.entitled)
    return {
      id: row.id,
      kind: row.kind === "audio" ? "audio" : "video",
      name: row.name,
      size: Number(row.size),
      mime: row.mime,
      addedAt: new Date(row.added_at).getTime(),
      duration: row.duration,
      tierTitle: row.tier_title,
      tierCents: row.tier_cents,
      sample: false,
      locked: !allowed,
      url: allowed ? `/api/patreon/media/${row.id}` : null,
    }
  })
}

async function listMedia() {
  if (supabaseConfig()) {
    const items = await listLibraryMedia()
    return items ? items.map(mediaRow) : null
  }
  const result = await dbQuery<MediaRow>(
    `SELECT id, kind, name, mime, size, duration, tier_title, tier_cents, added_at
     FROM patreon_media ORDER BY added_at DESC, id ASC`,
  )
  return result?.rows ?? null
}

function guestStatus(expired: boolean): LibraryStatus {
  return {
    configured: true,
    connected: false,
    admin: false,
    name: null,
    tierTitle: null,
    notice: expired ? "The Patreon session expired. Connect again." : "Connect with Patreon to see the files your membership includes.",
    tiers: null,
    items: [],
  }
}

export async function libraryStatus(request: NextRequest) {
  if (!patreonConfig()) return apiJson(sampleLibrary())
  const loaded = await currentSession(request, true)
  if (loaded.kind === "unconfigured") return apiJson(sampleLibrary())
  if (loaded.kind === "database") {
    return apiJson({
      configured: true,
      connected: false,
      admin: false,
      name: null,
      tierTitle: null,
      notice: supabaseConfig() ? "Supabase storage could not be opened." : "Supabase is not configured on this server.",
      tiers: null,
      items: [],
    } satisfies LibraryStatus)
  }
  if (loaded.kind === "guest") return apiJson(guestStatus(loaded.expired))
  let rows: MediaRow[] | null = null
  try {
    rows = await listMedia()
  } catch (error) {
    logDatabaseError(error)
    rows = null
  }
  if (!rows) {
    return apiJson({
      configured: true,
      connected: true,
      admin: loaded.session.isAdmin,
      name: loaded.session.fullName,
      tierTitle: loaded.session.tierTitle,
      notice: "Supabase storage could not be opened.",
      tiers: null,
      items: [],
    } satisfies LibraryStatus)
  }
  const active = loaded.session.patronStatus === "active_patron"
  const access = await loadCreatorAccess(loaded.session.accessToken, loaded.config.campaignId, loaded.session.patreonUserId).catch(() => null)
  const tiers = loaded.session.isAdmin && access?.owns ? access.tiers : null
  const notice = membershipNotice({
    admin: loaded.session.isAdmin,
    active,
    campaignId: loaded.config.campaignId,
    ownedIds: access?.ownedIds ?? [],
  })
  const body: LibraryStatus = {
    configured: true,
    connected: true,
    admin: loaded.session.isAdmin,
    name: loaded.session.fullName,
    tierTitle: loaded.session.tierTitle,
    notice,
    tiers,
    items: visibleItems(loaded.session, rows),
  }
  return apiJson(body)
}

export function beginLogin(request: NextRequest) {
  const config = patreonConfig()
  if (!config) return redirectTo(request, "/?patreon=error&reason=config")
  if (!recordsReady()) return redirectTo(request, "/?patreon=error&reason=database")
  const state = randomBytes(32).toString("hex")
  const authorize = new URL("https://www.patreon.com/oauth2/authorize")
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", config.clientId)
  authorize.searchParams.set("redirect_uri", oauthRedirectUri(request))
  authorize.searchParams.set("scope", OAUTH_SCOPES)
  authorize.searchParams.set("state", state)
  return redirectTo(request, authorize.toString(), [{ name: STATE_COOKIE, value: state, maxAge: 600 }])
}

export async function finishLogin(request: NextRequest) {
  const config = patreonConfig()
  const clearState = { name: STATE_COOKIE, value: "", maxAge: 0 }
  if (!config) return redirectTo(request, "/?patreon=error&reason=config", [clearState])
  const url = new URL(request.url)
  if (url.searchParams.get("error")) return redirectTo(request, "/?patreon=error&reason=denied", [clearState])
  const code = url.searchParams.get("code") ?? ""
  const state = url.searchParams.get("state") ?? ""
  const expected = request.cookies.get(STATE_COOKIE)?.value ?? ""
  if (!code || !state || !expected || !safeEqual(state, expected)) return redirectTo(request, "/?patreon=error&reason=state", [clearState])
  if (!recordsReady()) return redirectTo(request, "/?patreon=error&reason=database", [clearState])
  const token = await exchangeCode(config, code, oauthRedirectUri(request))
  if (!token) return redirectTo(request, "/?patreon=error&reason=token", [clearState])
  const identity = await loadIdentity(token.accessToken, config.campaignId)
  if (!identity) return redirectTo(request, "/?patreon=error&reason=identity", [clearState])
  const access = await loadCreatorAccess(token.accessToken, config.campaignId, identity.userId).catch(() => null)
  const admin = decideAdmin(identity, config.campaignId, access)
  const id = randomBytes(32).toString("hex")
  try {
    if (supabaseConfig()) await removeUserSession(identity.userId)
    else await dbQuery("DELETE FROM patreon_session WHERE patreon_user_id = $1", [identity.userId])
    const saved = await saveSession(id, identity, token, admin)
    if (!saved) return redirectTo(request, "/?patreon=error&reason=database", [clearState])
  } catch (error) {
    logDatabaseError(error)
    return redirectTo(request, "/?patreon=error&reason=database", [clearState])
  }
  return redirectTo(request, "/?patreon=connected", [
    clearState,
    { name: SESSION_COOKIE, value: id, maxAge: 60 * 60 * 24 * 60 },
  ])
}

export async function endLogin(request: NextRequest) {
  if (crossSite(request)) return apiJson({ error: "The request was refused." }, 403)
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? ""
  if (SESSION_ID.test(raw)) {
    try {
      await deleteSession(raw)
    } catch (error) {
      logDatabaseError(error)
    }
  }
  const response = apiJson({ ok: true })
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}

function cleanName(value: string, kind: MediaKind) {
  const base = value.trim().split(/[/\\]/).pop()?.trim() ?? ""
  const name = base.replace(/[\u0000-\u001f]/g, "").slice(0, 180)
  return name || (kind === "audio" ? "Audio" : "Video")
}

function extensionOf(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return ext === name.toLowerCase() ? "" : ext
}

function mimeFor(kind: MediaKind, name: string, type: string) {
  const declared = type.toLowerCase().split(";")[0]?.trim() ?? ""
  if (declared.startsWith(`${kind}/`)) return declared
  if (declared && declared !== "application/octet-stream") return ""
  const ext = extensionOf(name)
  const known: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: kind === "audio" ? "audio/ogg" : "video/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    opus: "audio/opus",
    mp4: "video/mp4",
    webm: kind === "audio" ? "audio/webm" : "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    mkv: "video/webm",
  }
  const allowed = kind === "audio" ? AUDIO_EXT : VIDEO_EXT
  if (!allowed.has(ext)) return ""
  return known[ext] ?? ""
}

function canStream(session: StoredSession, tierTitle: string, tierCents: number | null) {
  if (session.isAdmin) return true
  if (session.patronStatus !== "active_patron") return false
  return entitledTo({ tierTitle, tierCents }, session.entitled)
}

type UploadRequest = {
  step: "prepare" | "finish"
  id?: string
  kind?: string
  tierId?: string
  name?: string
  size?: number
  mime?: string
  duration?: number | null
}

function readUpload(value: unknown): UploadRequest | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const step = row.step === "prepare" || row.step === "finish" ? row.step : null
  if (!step) return null
  return {
    step,
    id: typeof row.id === "string" ? row.id : undefined,
    kind: typeof row.kind === "string" ? row.kind : undefined,
    tierId: typeof row.tierId === "string" ? row.tierId : undefined,
    name: typeof row.name === "string" ? row.name : undefined,
    size: typeof row.size === "number" ? row.size : undefined,
    mime: typeof row.mime === "string" ? row.mime : undefined,
    duration: typeof row.duration === "number" ? row.duration : row.duration === null ? null : undefined,
  }
}

function mediaMeta(body: UploadRequest, tiers: CampaignTier[]) {
  const kind: MediaKind | null = body.kind === "audio" || body.kind === "video" ? body.kind : null
  if (!kind) return { error: "Choose audio or video." }
  const tier = tierById(tiers, body.tierId ?? "")
  if (!tier) return { error: "Choose one of your Patreon tiers." }
  const name = cleanName(body.name ?? "", kind)
  const size = body.size
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) return { error: `"${name}" is empty.` }
  if (size > MAX_UPLOAD_BYTES) return { error: tooLargeMessage(name) }
  const mime = mimeFor(kind, name, body.mime ?? "")
  if (!mime) return { error: `"${name}" is not ${kind === "audio" ? "an audio file" : "a video file"}.` }
  let duration: number | null = null
  if (typeof body.duration === "number" && Number.isFinite(body.duration) && body.duration >= 0 && body.duration <= 24 * 60 * 60) {
    duration = body.duration
  }
  return { kind, tier, name, size, mime, duration }
}

export async function uploadMedia(request: NextRequest) {
  if (crossSite(request)) return apiJson({ error: "The request was refused." }, 403)
  const length = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(length) && length > MAX_JSON_BODY) return apiJson({ error: tooLargeMessage() }, 413)
  if (!patreonConfig()) return apiJson({ error: "Patreon is not configured yet." }, 503)
  if (!supabaseConfig()) return apiJson({ error: "File storage is not connected yet." }, 503)
  const loaded = await currentSession(request, false)
  if (loaded.kind === "database") return apiJson({ error: "The library could not be opened." }, 503)
  if (loaded.kind !== "session" || !loaded.session.isAdmin) return apiJson({ error: "Only the creator can upload a file." }, 403)
  const access = await loadCreatorAccess(loaded.session.accessToken, loaded.config.campaignId, loaded.session.patreonUserId).catch(() => null)
  if (!access?.owns) return apiJson({ error: "Only the creator can upload a file." }, 403)
  const body = readUpload(await request.json().catch(() => null))
  if (!body) return apiJson({ error: "Choose a file to upload." }, 400)
  const meta = mediaMeta(body, access.tiers)
  if ("error" in meta) return apiJson({ error: meta.error }, 400)
  if (body.step === "prepare") {
    const id = crypto.randomUUID()
    const ticket = await signedUpload(mediaPath(id))
    if (!ticket) return apiJson({ error: `"${meta.name}" could not be saved.` }, 503)
    return apiJson({ id, ...ticket, mime: meta.mime })
  }
  if (!body.id || !MEDIA_ID.test(body.id)) return apiJson({ error: "Choose a file to upload." }, 400)
  const path = mediaPath(body.id)
  let stored = await objectSize(path)
  for (let attempt = 0; stored !== meta.size && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    stored = await objectSize(path)
  }
  if (stored == null || stored !== meta.size) {
    if (stored != null) await deleteObject(path)
    return apiJson({ error: stored != null && stored > MAX_UPLOAD_BYTES ? storageLimitMessage() : `"${meta.name}" could not be saved.` }, 503)
  }
  if (supabaseConfig()) {
    const saved = await putLibraryMedia({
      id: body.id,
      kind: meta.kind,
      name: meta.name,
      mime: meta.mime,
      size: meta.size,
      duration: meta.duration,
      tierTitle: meta.tier.title,
      tierCents: meta.tier.amountCents,
      storagePath: path,
      addedAt: new Date().toISOString(),
    })
    if (!saved) {
      await deleteObject(path)
      return apiJson({ error: "The library could not be opened." }, 503)
    }
    return apiJson({ id: body.id })
  }
  try {
    const inserted = await dbQuery(
      `INSERT INTO patreon_media (id, kind, name, mime, size, duration, tier_title, tier_cents, bytes, storage_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [body.id, meta.kind, meta.name, meta.mime, meta.size, meta.duration, meta.tier.title, meta.tier.amountCents, null, path],
    )
    if (!inserted) {
      await deleteObject(path)
      return apiJson({ error: "The library could not be opened." }, 503)
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : ""
    if (code !== "23505") {
      await deleteObject(path)
      logDatabaseError(error)
      return apiJson({ error: `"${meta.name}" could not be saved.` }, 500)
    }
  }
  return apiJson({ id: body.id })
}

function titleName(value: unknown) {
  if (typeof value !== "string") return ""
  const base = value.trim().split(/[/\\]/).pop()?.trim() ?? ""
  return base.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").slice(0, 120)
}

export async function renameMedia(request: NextRequest, id: string) {
  if (crossSite(request)) return apiJson({ error: "The request was refused." }, 403)
  if (!MEDIA_ID.test(id)) return apiJson({ error: "That file was not found." }, 404)
  if (!patreonConfig()) return apiJson({ error: "Patreon is not configured yet." }, 503)
  const loaded = await currentSession(request, false)
  if (loaded.kind === "database") return apiJson({ error: "The library could not be opened." }, 503)
  if (loaded.kind !== "session" || !loaded.session.isAdmin) return apiJson({ error: "Only the creator can rename a file." }, 403)
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = titleName(body?.name)
  if (!name) return apiJson({ error: "Enter a name." }, 400)
  try {
    if (supabaseConfig()) {
      const existing = await loadLibraryMedia(id)
      if (existing === undefined) return apiJson({ error: "The library could not be opened." }, 503)
      if (!existing) return apiJson({ error: "That file was not found." }, 404)
      const saved = await putLibraryMedia({ ...existing, name })
      if (!saved) return apiJson({ error: "That name could not be saved." }, 503)
      return apiJson({ ok: true, name })
    }
    const result = await dbQuery("UPDATE patreon_media SET name = $2 WHERE id = $1", [id, name])
    if (!result) return apiJson({ error: "The library could not be opened." }, 503)
    if (result.rowCount === 0) return apiJson({ error: "That file was not found." }, 404)
  } catch (error) {
    logDatabaseError(error)
    return apiJson({ error: "That name could not be saved." }, 500)
  }
  return apiJson({ ok: true, name })
}

export async function removeMedia(request: NextRequest, id: string) {
  if (crossSite(request)) return apiJson({ error: "The request was refused." }, 403)
  if (!MEDIA_ID.test(id)) return apiJson({ error: "That file was not found." }, 404)
  if (!patreonConfig()) return apiJson({ error: "Patreon is not configured yet." }, 503)
  const loaded = await currentSession(request, false)
  if (loaded.kind === "database") return apiJson({ error: "The library could not be opened." }, 503)
  if (loaded.kind !== "session" || !loaded.session.isAdmin) return apiJson({ error: "Only the creator can delete a file." }, 403)
  try {
    if (supabaseConfig()) {
      const existing = await loadLibraryMedia(id)
      if (existing === undefined) return apiJson({ error: "The library could not be opened." }, 503)
      if (!existing) return apiJson({ error: "That file was not found." }, 404)
      if (!(await removeLibraryMedia(id))) return apiJson({ error: "The library could not be opened." }, 503)
      await deleteObject(existing.storagePath)
      return apiJson({ ok: true })
    }
    const existing = await dbQuery<{ storage_path: string | null }>("SELECT storage_path FROM patreon_media WHERE id = $1", [id])
    if (!existing) return apiJson({ error: "The library could not be opened." }, 503)
    const path = existing.rows[0]?.storage_path
    const result = await dbQuery("DELETE FROM patreon_media WHERE id = $1", [id])
    if (!result) return apiJson({ error: "The library could not be opened." }, 503)
    if (result.rowCount === 0) return apiJson({ error: "That file was not found." }, 404)
    if (path) await deleteObject(path)
  } catch (error) {
    logDatabaseError(error)
    return apiJson({ error: "That file could not be deleted." }, 500)
  }
  return apiJson({ ok: true })
}

function safeMime(mime: string, kind: MediaKind) {
  const value = mime.toLowerCase().split(";")[0]?.trim() ?? ""
  if (value.startsWith(`${kind}/`)) return value
  return kind === "audio" ? "audio/mpeg" : "video/mp4"
}

function downloadName(name: string) {
  return name.replace(/[\r\n"]/g, "").slice(0, 180) || "media"
}

export async function streamMedia(request: NextRequest, id: string) {
  if (!MEDIA_ID.test(id)) return apiJson({ error: "That file was not found." }, 404)
  if (!patreonConfig()) return apiJson({ error: "Patreon is not configured yet." }, 503)
  const loaded = await currentSession(request, false)
  if (loaded.kind === "database") return apiJson({ error: "The library could not be opened." }, 503)
  if (loaded.kind !== "session") return apiJson({ error: "Connect with Patreon to play this file." }, 401)
  type ByteRow = MediaRow & { bytes: Buffer | null; storage_path: string | null }
  let row: ByteRow | undefined
  try {
    if (supabaseConfig()) {
      const item = await loadLibraryMedia(id)
      if (item === undefined) return apiJson({ error: "The library could not be opened." }, 503)
      if (!item) return apiJson({ error: "That file was not found." }, 404)
      const listed = mediaRow(item)
      row = { ...listed, bytes: null, storage_path: listed.storage_path }
    }
    const result = row ? { rows: [row] } : await dbQuery<ByteRow>(
      `SELECT id, kind, name, mime, size, duration, tier_title, tier_cents, added_at, bytes, storage_path FROM patreon_media WHERE id = $1`,
      [id],
    )
    row = result?.rows[0]
    if (!result) return apiJson({ error: "The library could not be opened." }, 503)
  } catch (error) {
    logDatabaseError(error)
    return apiJson({ error: "The library could not be opened." }, 503)
  }
  if (!row) return apiJson({ error: "That file was not found." }, 404)
  const kind: MediaKind = row.kind === "audio" ? "audio" : "video"
  if (!canStream(loaded.session, row.tier_title, row.tier_cents)) return apiJson({ error: "This file is not included in your tier." }, 403)
  if (row.storage_path) {
    const signed = await signedDownloadUrl(row.storage_path, 6 * 60 * 60)
    if (!signed) return apiJson({ error: "That file could not be opened." }, 503)
    return NextResponse.redirect(signed, { status: 302, headers: { "Cache-Control": "private, no-store" } })
  }
  const bytes = Buffer.isBuffer(row.bytes) ? row.bytes : Buffer.from(row.bytes ?? [])
  const total = bytes.length
  const headers = new Headers({
    "Content-Type": safeMime(row.mime, kind),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${downloadName(row.name)}"`,
  })
  const range = request.headers.get("range")
  if (!range) {
    headers.set("Content-Length", String(total))
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers })
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match) {
    headers.set("Content-Range", `bytes */${total}`)
    return new NextResponse(null, { status: 416, headers })
  }
  let start = match[1] ? Number(match[1]) : NaN
  let end = match[2] ? Number(match[2]) : total - 1
  if (!match[1] && match[2]) {
    const suffix = Number(match[2])
    start = Math.max(0, total - suffix)
    end = total - 1
  }
  if (!Number.isFinite(start) || start < 0) start = 0
  if (!Number.isFinite(end) || end >= total) end = total - 1
  if (start >= total || end < start) {
    headers.set("Content-Range", `bytes */${total}`)
    return new NextResponse(null, { status: 416, headers })
  }
  const chunk = bytes.subarray(start, end + 1)
  headers.set("Content-Length", String(chunk.length))
  headers.set("Content-Range", `bytes ${start}-${end}/${total}`)
  return new NextResponse(new Uint8Array(chunk), { status: 206, headers })
}
