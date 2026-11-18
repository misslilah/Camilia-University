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

export function tierById(tiers: CampaignTier[], id: string) {
  const key = id.trim()
  if (!key) return null
  return tiers.find((tier) => tier.id === key) ?? null
}

export function tierOptionLabel(tier: CampaignTier) {
  if (tier.amountCents == null) return tier.title
  const major = Math.trunc(tier.amountCents / 100)
  const minor = String(Math.abs(tier.amountCents % 100)).padStart(2, "0")
  return `${tier.title} · ${major}.${minor}`
}
