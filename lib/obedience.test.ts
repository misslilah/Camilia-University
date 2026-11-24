import assert from "node:assert/strict"
import test from "node:test"
import { LINES, advance, handTyped, letterMarks, lineReady, saveObedience } from "./obedience.ts"

test("a wrong letter is marked and the line is not ready", () => {
  const marks = letterMarks(LINES[0], "I taxe")
  assert.deepEqual(
    marks.map((mark) => mark.wrong),
    [false, false, false, false, true, false],
  )
  assert.equal(lineReady(LINES[0], "I taxe"), false)
})

test("the writing box accepts one keystroke and refuses a pasted line", () => {
  assert.equal(handTyped("", "I"), "I")
  assert.equal(handTyped("I take", "I taxe"), "I taxe")
  assert.equal(handTyped("hello", "h"), "h")
  assert.equal(handTyped("abcd", "x"), "x")
  assert.equal(handTyped("", LINES[0]), "")
  assert.equal(handTyped("I take my", LINES[0]), "I take my")
  assert.equal(handTyped("abcd", "xy"), "abcd")
})

test("finishing the course announces the new letter once", () => {
  const events: string[] = []
  const memory = new Map<string, string>()
  const previous = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
      },
      dispatchEvent: (event: Event) => {
        events.push(event.type)
        return true
      },
    },
  })
  try {
    saveObedience("Lila", { done: false, line: 0, copy: 1 })
    assert.deepEqual(events, [])
    saveObedience("Lila", { done: true, line: 2, copy: 5 })
    assert.deepEqual(events, ["camilia-mail"])
    saveObedience("Lila", { done: true, line: 2, copy: 5 })
    assert.deepEqual(events, ["camilia-mail"])
    const stored = JSON.parse(memory.get("camilia-obedience") || "") as { name?: string; done?: boolean }
    assert.equal(stored.name, "Lila")
    assert.equal(stored.done, true)
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window
    else Object.defineProperty(globalThis, "window", { configurable: true, value: previous })
  }
})

test("an exact line is ready and a fifth copy finishes it", () => {
  assert.equal(lineReady(LINES[0], LINES[0]), true)
  let state = { done: false, line: 0, copy: 4 }
  state = advance(state)
  assert.equal(state.line, 1)
  assert.equal(state.copy, 0)
  state = { done: false, line: 2, copy: 4 }
  state = advance(state)
  assert.equal(state.done, true)
})
