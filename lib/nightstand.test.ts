import assert from "node:assert/strict"
import test from "node:test"
import { bottlePlace } from "./nightstand.ts"

test("the bottle stays in the nightstand until that student sets it on the desk", () => {
  assert.equal(bottlePlace(null, "Lila"), "drawer")
  assert.equal(bottlePlace("nope", "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Noa", place: "desk" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "shelf" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "drawer" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "desk" }), "Lila"), "desk")
})
