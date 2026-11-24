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

export const MAIL_IDS = ["desk", "registrar", "board"] as const

export function unreadCount(inboxIds: readonly string[], readIds: readonly string[]) {
  const read = new Set(readIds)
  return inboxIds.filter((id) => !read.has(id)).length
}

export function missedMail(name: string) {
  if (typeof window === "undefined") return 0
  const who = name.trim() || "Student"
  const inbox = lettersIn(MAIL_IDS, loadTrash(who), loadGone(who), "inbox")
  return unreadCount(inbox, loadRead(who))
}

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

let mailNoticeQueued = false

function saveIds(key: string, name: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify({ name, ids }))
  if (mailNoticeQueued) return
  mailNoticeQueued = true
  queueMicrotask(() => {
    mailNoticeQueued = false
    window.dispatchEvent(new Event("camilia-mail"))
  })
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
