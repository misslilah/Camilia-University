export function campusAddress(name: string) {
  const local = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48)
  return `${local || "student"}@university.mail`
}

export type MailFolder = "inbox" | "trash"

export function lettersIn(ids: readonly string[], trashed: readonly string[], gone: readonly string[], folder: MailFolder) {
  const removed = new Set(gone)
  const bin = new Set(trashed)
  return ids.filter((id) => !removed.has(id) && (folder === "trash" ? bin.has(id) : !bin.has(id)))
}

const KEY = "camilia-mail-read"
const TRASH_KEY = "camilia-mail-trash"
const GONE_KEY = "camilia-mail-gone"

export function loadRead(name: string) {
  return loadIds(KEY, name)
}

export function saveRead(name: string, ids: string[]) {
  saveIds(KEY, name, ids)
}

export function loadTrash(name: string) {
  return loadIds(TRASH_KEY, name)
}

export function saveTrash(name: string, ids: string[]) {
  saveIds(TRASH_KEY, name, ids)
}

export function loadGone(name: string) {
  return loadIds(GONE_KEY, name)
}

export function saveGone(name: string, ids: string[]) {
  saveIds(GONE_KEY, name, ids)
}

function saveIds(key: string, name: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify({ name, ids }))
}

function loadIds(key: string, name: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "") as { name?: unknown; ids?: unknown }
    if (parsed?.name !== name || !Array.isArray(parsed.ids)) return []
    return parsed.ids.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}
