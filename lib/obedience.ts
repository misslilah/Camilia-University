export const LINES = [
  "I take my training seriously.",
  "I am fully committed to my personal development.",
  "My training is one of my highest priorities.",
] as const

export const COPIES = 5

export type Obedience = { done: boolean; line: number; copy: number }

export const FRESH: Obedience = { done: false, line: 0, copy: 0 }

export function letterMarks(target: string, typed: string) {
  return [...typed].map((char, index) => ({
    char,
    wrong: index >= target.length || char !== target[index],
  }))
}

export function lineReady(target: string, typed: string) {
  return typed === target
}

export function handTyped(previous: string, next: string) {
  const clean = next.replace(/\n/g, "")
  return singleKeystroke(previous, clean) ? clean : previous
}

function singleKeystroke(previous: string, next: string) {
  const before = [...previous]
  const after = [...next]
  let start = 0
  const shared = Math.min(before.length, after.length)
  while (start < shared && before[start] === after[start]) start += 1
  let prevEnd = before.length
  let nextEnd = after.length
  while (prevEnd > start && nextEnd > start && before[prevEnd - 1] === after[nextEnd - 1]) {
    prevEnd -= 1
    nextEnd -= 1
  }
  return nextEnd - start <= 1
}

export function advance(state: Obedience): Obedience {
  if (state.done) return state
  if (state.copy + 1 < COPIES) return { done: false, line: state.line, copy: state.copy + 1 }
  if (state.line + 1 < LINES.length) return { done: false, line: state.line + 1, copy: 0 }
  return { done: true, line: LINES.length - 1, copy: COPIES }
}

const KEY = "camilia-obedience"

export function loadObedience(name: string): Obedience {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "") as { name?: unknown; done?: unknown; line?: unknown; copy?: unknown }
    if (parsed?.name !== name) return FRESH
    if (parsed.done === true) return { done: true, line: LINES.length - 1, copy: COPIES }
    const line = typeof parsed.line === "number" && parsed.line >= 0 && parsed.line < LINES.length ? Math.floor(parsed.line) : 0
    const copy = typeof parsed.copy === "number" && parsed.copy >= 0 && parsed.copy < COPIES ? Math.floor(parsed.copy) : 0
    return { done: false, line, copy }
  } catch {
    return FRESH
  }
}

export function saveObedience(name: string, state: Obedience) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name, ...state }))
  } catch {
    // The page still keeps this visit when storage is blocked.
  }
}
