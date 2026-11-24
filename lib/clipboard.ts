export function isClipboardShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && (key === "c" || key === "v" || key === "x")) return true
  if (event.shiftKey && key === "insert") return true
  if (event.ctrlKey && key === "insert") return true
  return false
}
