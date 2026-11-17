import { useSyncExternalStore } from "react"

export type SiteId = "avazon" | "threadline" | "velvet"

export type Site = {
  id: SiteId
  name: string
  host: string
  tagline: string
  // Locked sites are left off the new-tab page and suggestions, and their
  // address answers like an unknown host until they are unlocked.
  locked?: boolean
}

export const SITES: Site[] = [
  { id: "avazon", name: "avazon", host: "avazon.com", tagline: "Furniture for every room" },
  { id: "threadline", name: "Threadline", host: "threadline.com", tagline: "Everyday clothing" },
  { id: "velvet", name: "Velvet", host: "velvet.shop", tagline: "Adult boutique", locked: true },
]

export type WebLocation = { host: string; path: string }

export function parseUrl(input: string): WebLocation {
  const clean = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
  const slash = clean.indexOf("/")
  const host = slash === -1 ? clean : clean.slice(0, slash)
  const path = slash === -1 ? "" : clean.slice(slash + 1).replace(/\/+$/, "")
  return { host, path }
}

export function formatUrl(location: WebLocation) {
  return location.path ? `${location.host}/${location.path}` : location.host
}

type WebState = { carts: Partial<Record<SiteId, Record<string, number>>>; unlocked: SiteId[] }

const STORAGE_KEY = "camilia-web"
const EMPTY: WebState = { carts: {}, unlocked: [] }

// Products removed from a shop. Saved carts drop these lines so counts and
// the drawer stay in step with the catalog.
const RETIRED_PRODUCTS: Partial<Record<SiteId, ReadonlySet<string>>> = {
  avazon: new Set([
    "pine-bunk-bed",
    "linen-daybed",
    "corner-desk-l",
    "reading-armchair",
    "bar-stool-oak",
    "tall-bookcase",
    "three-drawer-dresser",
    "arched-mirror",
  ]),
}

let state: WebState | null = null
const listeners = new Set<() => void>()

function read(): WebState {
  if (state) return state
  state = EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WebState>
      const carts: WebState["carts"] = {}
      for (const site of SITES) {
        const cart = parsed.carts?.[site.id]
        if (!cart || typeof cart !== "object") continue
        const retired = RETIRED_PRODUCTS[site.id]
        const clean = Object.fromEntries(
          Object.entries(cart).filter(([id, qty]) => Number.isInteger(qty) && qty > 0 && qty < 100 && !retired?.has(id)),
        )
        carts[site.id] = clean
      }
      const unlocked = Array.isArray(parsed.unlocked)
        ? parsed.unlocked.filter((id): id is SiteId => SITES.some((site) => site.id === id))
        : []
      state = { carts, unlocked }
      if (retiredProductsStored(parsed.carts)) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch {}
      }
    }
  } catch {
    state = EMPTY
  }
  return state
}

function retiredProductsStored(carts: WebState["carts"] | undefined) {
  if (!carts) return false
  return SITES.some((site) => {
    const retired = RETIRED_PRODUCTS[site.id]
    const cart = carts[site.id]
    return Boolean(retired && cart && Object.keys(cart).some((id) => retired.has(id)))
  })
}

function write(next: WebState) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWeb() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function isOpen(site: Site, web: WebState) {
  return !site.locked || web.unlocked.includes(site.id)
}

export function findSite(host: string, web: WebState) {
  const site = SITES.find((item) => item.host === host)
  return site && isOpen(site, web) ? site : null
}

export function visibleSites(web: WebState) {
  return SITES.filter((site) => isOpen(site, web))
}

export function unlockSite(id: SiteId) {
  const current = read()
  if (!current.unlocked.includes(id)) write({ ...current, unlocked: [...current.unlocked, id] })
}

export function setCartQty(site: SiteId, product: string, qty: number) {
  const current = read()
  const cart = { ...current.carts[site] }
  if (qty > 0 && !RETIRED_PRODUCTS[site]?.has(product)) cart[product] = Math.min(99, qty)
  else delete cart[product]
  write({ ...current, carts: { ...current.carts, [site]: cart } })
}

export function addToCart(site: SiteId, product: string) {
  setCartQty(site, product, (read().carts[site]?.[product] ?? 0) + 1)
}

export function cartCount(web: WebState, site: SiteId) {
  const retired = RETIRED_PRODUCTS[site]
  return Object.entries(web.carts[site] ?? {}).reduce((sum, [id, qty]) => sum + (retired?.has(id) ? 0 : qty), 0)
}
