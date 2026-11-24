export type BottlePlace = "drawer" | "desk"

const KEY = "camilia-nightstand"

export function bottlePlace(stored: string | null, name: string): BottlePlace {
  try {
    const parsed = JSON.parse(stored || "") as { name?: unknown; place?: unknown }
    if (parsed?.name !== name) return "drawer"
    return parsed.place === "desk" ? "desk" : "drawer"
  } catch {
    return "drawer"
  }
}

export function loadBottle(name: string): BottlePlace {
  try {
    return bottlePlace(window.localStorage.getItem(KEY), name)
  } catch {
    return "drawer"
  }
}

export function saveBottle(name: string, place: BottlePlace) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name, place }))
  } catch {
    // The room still keeps this visit's placement when storage is blocked.
  }
}
