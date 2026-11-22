export type MediaKind = "audio" | "video"

export type EntitledTier = {
  id: string
  title: string
  amountCents: number | null
}

export type CampaignTier = {
  id: string
  title: string
  amountCents: number | null
}

export type LibraryItem = {
  id: string
  kind: MediaKind
  name: string
  size: number
  mime: string
  addedAt: number
  duration: number | null
  tierTitle: string
  tierCents: number | null
  sample: boolean
  locked: boolean
  url: string | null
}

export type LibraryStatus = {
  configured: boolean
  connected: boolean
  admin: boolean
  name: string | null
  tierTitle: string | null
  notice: string | null
  tiers: CampaignTier[] | null
  entitled: EntitledTier[] | null
  page: string | null
  items: LibraryItem[]
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export function tooLargeMessage(name?: string) {
  if (!name) return "This file is larger than 2 GB. Choose a smaller file."
  return `"${name}" is larger than 2 GB. Choose a smaller file.`
}

export function storageLimitMessage() {
  return "Supabase refused a file this large. Open Storage, then Settings, and set the global file size limit to 2 GB. On the Free plan the ceiling is 50 MB."
}

const SAMPLE_AT = Date.UTC(2026, 2, 1, 15, 0)

const SAMPLES: LibraryItem[] = [
  {
    id: "sample-video-welcome",
    kind: "video",
    name: "Welcome to the studio (sample)",
    size: 18_400_000,
    mime: "video/mp4",
    addedAt: SAMPLE_AT,
    duration: 84,
    tierTitle: "Listeners",
    tierCents: 300,
    sample: true,
    locked: false,
    url: null,
  },
  {
    id: "sample-video-rehearsal",
    kind: "video",
    name: "Rehearsal (sample)",
    size: 22_100_000,
    mime: "video/mp4",
    addedAt: SAMPLE_AT + 86_400_000,
    duration: 126,
    tierTitle: "Studio",
    tierCents: 800,
    sample: true,
    locked: true,
    url: null,
  },
  {
    id: "sample-audio-note",
    kind: "audio",
    name: "Voice note (sample)",
    size: 2_600_000,
    mime: "audio/mpeg",
    addedAt: SAMPLE_AT + 3_600_000,
    duration: 36,
    tierTitle: "Listeners",
    tierCents: 300,
    sample: true,
    locked: false,
    url: null,
  },
]

export function sampleLibrary(): LibraryStatus {
  return {
    configured: false,
    connected: false,
    admin: false,
    name: null,
    tierTitle: null,
    notice: "Sample library. These are examples, not subscriber files.",
    tiers: null,
    entitled: null,
    page: null,
    items: SAMPLES,
  }
}

export function entitledTo(file: { tierTitle: string; tierCents: number | null }, tiers: EntitledTier[]) {
  const title = file.tierTitle.trim()
  for (const tier of tiers) {
    if (title.length > 0 && tier.title.trim() === title) return true
    if (file.tierCents != null && tier.amountCents != null && tier.amountCents >= file.tierCents) return true
  }
  return false
}

export function tierLabel(tiers: EntitledTier[]) {
  const titles = tiers.map((tier) => tier.title.trim()).filter((title) => title.length > 0)
  const unique = [...new Set(titles)]
  return unique.length > 0 ? unique.join(", ") : null
}

export function sameId(left: string | null | undefined, right: string | null | undefined) {
  const a = left?.trim() ?? ""
  const b = right?.trim() ?? ""
  return a.length > 0 && a === b
}

export function isCampaignCreator(input: { campaignId: string; identityCampaignId: string | null; ownsListedCampaign: boolean }) {
  if (input.ownsListedCampaign) return true
  return sameId(input.identityCampaignId, input.campaignId)
}

export function membershipNotice(input: { admin: boolean; active: boolean; campaignId: string; ownedIds: string[] }) {
  if (input.admin || input.active) return null
  const owned = [...new Set(input.ownedIds.map((id) => id.trim()).filter((id) => id.length > 0))]
  if (owned.length > 0) {
    return `This Patreon account owns campaign ${owned.join(", ")}, not ${input.campaignId}. In Vercel, set PATREON_CAMPAIGN_ID to the campaign your students use, then disconnect and connect again.`
  }
  return "No active membership on this campaign. Paid files stay hidden."
}

export function tierById(tiers: CampaignTier[], id: string) {
  const key = id.trim()
  if (!key) return null
  return tiers.find((tier) => tier.id === key) ?? null
}

export type LibrarySort = "newest" | "tier-up" | "tier-down"

export function viewAsTier(item: LibraryItem, tier: CampaignTier): LibraryItem {
  if (item.sample) return item
  const open = entitledTo(item, [tier])
  if (open) return { ...item, locked: false }
  return { ...item, locked: true, url: null }
}

export function tierChoices(items: LibraryItem[]) {
  const map = new Map<string, number | null>()
  for (const item of items) {
    const title = item.tierTitle.trim()
    if (!title || map.has(title)) continue
    map.set(title, item.tierCents)
  }
  return [...map.entries()]
    .map(([title, amountCents]) => ({ title, amountCents }))
    .sort((a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0) || a.title.localeCompare(b.title))
}

export function arrangeLibrary(items: LibraryItem[], sort: LibrarySort, tierTitle: string | null) {
  const wanted = tierTitle?.trim() ?? ""
  const filtered = wanted ? items.filter((item) => item.tierTitle.trim() === wanted) : items
  return [...filtered].sort((a, b) => {
    if (sort === "newest") return b.addedAt - a.addedAt || a.name.localeCompare(b.name)
    const amount = (a.tierCents ?? 0) - (b.tierCents ?? 0)
    const tier = sort === "tier-up" ? amount : -amount
    if (tier !== 0) return tier
    return a.name.localeCompare(b.name)
  })
}

export type TierOffer = {
  id: string
  title: string
  amountCents: number | null
  href: string
}

const VANITY = /^[A-Za-z0-9_-]{1,80}$/
const TIER_ID = /^\d{1,20}$/

export function campaignPage(vanity: string | null) {
  const page = vanity?.trim() ?? ""
  if (!VANITY.test(page)) return null
  return `https://www.patreon.com/cw/${page}`
}

export function vanityFromPage(page: string | null) {
  if (!page) return null
  try {
    const url = new URL(page)
    if (url.origin !== "https://www.patreon.com") return null
    const parts = url.pathname.split("/").filter((part) => part.length > 0)
    const slug = parts[0] === "cw" || parts[0] === "c" ? parts[1] : parts[0]
    if (!slug || !VANITY.test(slug)) return null
    return slug
  } catch {
    return null
  }
}

export function checkoutHref(vanity: string, tierId: string) {
  const page = vanity.trim()
  const id = tierId.trim()
  if (!VANITY.test(page) || !TIER_ID.test(id)) return null
  return `https://www.patreon.com/checkout/${page}?rid=${id}`
}

export function upgradeChoices(tiers: CampaignTier[], entitled: EntitledTier[], vanity: string | null): TierOffer[] {
  if (!vanity) return []
  const amounts = entitled.flatMap((tier) => (tier.amountCents == null ? [] : [tier.amountCents]))
  const ceiling = amounts.length > 0 ? Math.max(...amounts) : null
  const titles = new Set(entitled.map((tier) => tier.title.trim()).filter((title) => title.length > 0))
  const offers: TierOffer[] = []
  for (const tier of tiers) {
    if (tier.amountCents == null || tier.amountCents <= 0) continue
    if (ceiling != null && tier.amountCents <= ceiling) continue
    if (ceiling == null && titles.has(tier.title.trim())) continue
    const href = checkoutHref(vanity, tier.id)
    if (!href) continue
    offers.push({ id: tier.id, title: tier.title, amountCents: tier.amountCents, href })
  }
  offers.sort((a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0) || a.title.localeCompare(b.title))
  return offers
}

export function tierOptionLabel(tier: CampaignTier) {
  if (tier.amountCents == null) return tier.title
  const major = Math.trunc(tier.amountCents / 100)
  const minor = String(Math.abs(tier.amountCents % 100)).padStart(2, "0")
  return `${tier.title} · ${major}.${minor}`
}
