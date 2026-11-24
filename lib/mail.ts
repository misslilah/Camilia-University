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

const KEY = "camilia-mail-read"

export function loadRead(name: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "") as { name?: unknown; ids?: unknown }
    if (parsed?.name !== name || !Array.isArray(parsed.ids)) return []
    return parsed.ids.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}

export function saveRead(name: string, ids: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify({ name, ids }))
}
