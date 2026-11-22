const listeners = new Set<() => void>()
let tierId: string | null = null

export function previewTierId() {
  return tierId
}

export function subscribePreview(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setPreviewTier(id: string | null) {
  tierId = id
  listeners.forEach((listener) => listener())
}
