export type BottlePlace = "drawer" | "desk"

const KEY = "camilia-nightstand"

// The camera and the cupboard share this clock: the drawer opens, the view
// zooms in, then the camera rises and only then may the objects appear.
export function cupboardMarks(reduced: boolean) {
  if (reduced) return { open: 0.16, zoom: 0.2, over: 0.26 }
  return { open: 0.85, zoom: 0.82, over: 1.02 }
}

export function cupboardDuration(reduced: boolean) {
  const marks = cupboardMarks(reduced)
  return marks.open + marks.zoom + marks.over
}

function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function cupboardReveal(elapsed: number, reduced: boolean) {
  const marks = cupboardMarks(reduced)
  const rise = marks.open + marks.zoom
  const start = rise + marks.over * 0.55
  const end = rise + marks.over
  if (elapsed <= start) return 0
  if (elapsed >= end) return 1
  return smootherstep((elapsed - start) / (end - start))
}

export function bottlePlace(stored: string | null, name: string): BottlePlace {
  try {
    const parsed = JSON.parse(stored || "") as { name?: unknown; place?: unknown }
    if (parsed?.name !== name) return "drawer"
    return parsed.place === "desk" ? "desk" : "drawer"
  } catch {
    return "drawer"
  }
}

// This visit's placement. The bedroom and the course both read it, so the
// desk check cannot drift from the bottle the student actually moved.
let remembered: { name: string; place: BottlePlace } | null = null
const listeners = new Set<() => void>()

export function loadBottle(name: string): BottlePlace {
  if (remembered?.name === name) return remembered.place
  try {
    return bottlePlace(window.localStorage.getItem(KEY), name)
  } catch {
    return "drawer"
  }
}

export function saveBottle(name: string, place: BottlePlace) {
  remembered = { name, place }
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name, place }))
  } catch {
    // The room still keeps this visit's placement when storage is blocked.
  }
  for (const listener of listeners) listener()
}

export function subscribeBottle(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return
    remembered = null
    listener()
  }
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage)
  }
}
