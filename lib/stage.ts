let videos = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function videoPlaying() {
  return videos > 0
}

export function subscribeStage(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function holdStage(active: boolean) {
  videos += active ? 1 : -1
  if (videos < 0) videos = 0
  emit()
}
