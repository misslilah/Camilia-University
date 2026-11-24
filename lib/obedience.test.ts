import assert from "node:assert/strict"
import test from "node:test"
import { LINES, advance, handTyped, letterMarks, lineReady } from "./obedience.ts"

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
