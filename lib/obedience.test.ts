import assert from "node:assert/strict"
import test from "node:test"
import { LINES, advance, letterMarks, lineReady } from "./obedience.ts"

test("a wrong letter is marked and the line is not ready", () => {
  const marks = letterMarks(LINES[0], "I taxe")
  assert.deepEqual(
    marks.map((mark) => mark.wrong),
    [false, false, false, false, true, false],
  )
  assert.equal(lineReady(LINES[0], "I taxe"), false)
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
