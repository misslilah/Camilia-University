export type NoticePost = {
  id: string
  kind: "audio" | "video"
  name: string
}

export type NoticeMemory = {
  primed: boolean
  announced: string[]
  seen: string[]
}

export type NoticeUpdate = {
  memory: NoticeMemory
  badge: boolean
  fresh: NoticePost[]
}

const EMPTY: NoticeMemory = { primed: false, announced: [], seen: [] }

function remember(previous: string[], current: string[]) {
  const must = new Set(current)
  const rest = previous.filter((id) => !must.has(id))
  const room = Math.max(0, 500 - must.size)
  return [...rest.slice(-room), ...current]
}

export function noticeUpdate(memory: NoticeMemory, posts: NoticePost[], appOpen: boolean): NoticeUpdate {
  const ids = posts.map((post) => post.id)
  if (!memory.primed) {
    return { memory: { primed: true, announced: ids, seen: ids }, badge: false, fresh: [] }
  }
  const announced = new Set(memory.announced)
  const fresh = posts.filter((post) => !announced.has(post.id))
  const seen = new Set(memory.seen)
  if (appOpen) for (const id of ids) seen.add(id)
  return {
    memory: {
      primed: true,
      announced: remember([...memory.announced, ...fresh.map((post) => post.id)], ids),
      seen: remember([...seen], appOpen ? ids : []),
    },
    badge: ids.some((id) => !seen.has(id)),
    fresh,
  }
}

function storageKey(who: string) {
  return `camilia-patreon-notices:${who}`
}

export function loadNotices(who: string): NoticeMemory {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(who)) || "") as Partial<NoticeMemory>
    if (!parsed || parsed.primed !== true) return EMPTY
    const announced = Array.isArray(parsed.announced) ? parsed.announced.filter((id) => typeof id === "string") : []
    const seen = Array.isArray(parsed.seen) ? parsed.seen.filter((id) => typeof id === "string") : []
    return { primed: true, announced, seen }
  } catch {
    return EMPTY
  }
}

export function saveNotices(who: string, memory: NoticeMemory) {
  try {
    window.localStorage.setItem(storageKey(who), JSON.stringify(memory))
  } catch {
    // The badge still works for this visit when storage is blocked.
  }
}
