import { useSyncExternalStore } from "react"

// Where the monitor screen lands on the page once the camera has framed it,
// so the DOM desktop can be laid exactly over it.
export type ScreenRect = { left: number; top: number; width: number; height: number }

let current: ScreenRect | null = null
const listeners = new Set<() => void>()

export function setScreenRect(next: ScreenRect | null) {
  if (
    current === next ||
    (current &&
      next &&
      Math.abs(current.left - next.left) < 0.5 &&
      Math.abs(current.top - next.top) < 0.5 &&
      Math.abs(current.width - next.width) < 0.5 &&
      Math.abs(current.height - next.height) < 0.5)
  ) {
    return
  }
  current = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useScreenRect() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
