import assert from "node:assert/strict"
import test from "node:test"
import { bottlePlace, cupboardDuration, cupboardMarks, cupboardReveal } from "./nightstand.ts"

test("the bottle stays in the nightstand until that student sets it on the desk", () => {
  assert.equal(bottlePlace(null, "Lila"), "drawer")
  assert.equal(bottlePlace("nope", "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Noa", place: "desk" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "shelf" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "drawer" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "desk" }), "Lila"), "desk")
})

test("the cupboard stays empty until the camera is above it", () => {
  for (const reduced of [false, true]) {
    const marks = cupboardMarks(reduced)
    assert.equal(cupboardReveal(0, reduced), 0)
    assert.equal(cupboardReveal(marks.open, reduced), 0)
    assert.equal(cupboardReveal(marks.open + marks.zoom, reduced), 0)
    assert.equal(cupboardReveal(marks.open + marks.zoom + marks.over * 0.4, reduced), 0)
    assert.equal(cupboardReveal(cupboardDuration(reduced), reduced), 1)
  }
})
