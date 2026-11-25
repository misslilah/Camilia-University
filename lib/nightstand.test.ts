import assert from "node:assert/strict"
import test from "node:test"
import { bottlePlace, cupboardDuration, cupboardMarks, cupboardReveal, loadBottle, saveBottle, subscribeBottle } from "./nightstand.ts"

test("the bottle stays in the nightstand until that student sets it on the desk", () => {
  assert.equal(bottlePlace(null, "Lila"), "drawer")
  assert.equal(bottlePlace("nope", "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Noa", place: "desk" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "shelf" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "drawer" }), "Lila"), "drawer")
  assert.equal(bottlePlace(JSON.stringify({ name: "Lila", place: "desk" }), "Lila"), "desk")
})

test("the course reads the same bottle the nightstand just saved", () => {
  const memory = new Map<string, string>()
  const storageListeners: Array<(event: { key: string | null }) => void> = []
  let blocked = false
  const previous = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
        setItem: (key: string, value: string) => {
          if (blocked) throw new Error("blocked")
          memory.set(key, value)
        },
      },
      addEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
        if (type === "storage") storageListeners.push(listener)
      },
      removeEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
        if (type !== "storage") return
        const index = storageListeners.indexOf(listener)
        if (index >= 0) storageListeners.splice(index, 1)
      },
    },
  })
  try {
    memory.set("camilia-nightstand", JSON.stringify({ name: "Lila", place: "drawer" }))
    assert.equal(loadBottle("Lila"), "drawer")
    let seen = 0
    const stop = subscribeBottle(() => {
      seen += 1
    })
    saveBottle("Lila", "desk")
    assert.equal(seen, 1)
    assert.equal(loadBottle("Lila"), "desk")
    assert.equal(loadBottle("Noa"), "drawer")
    saveBottle("Lila", "drawer")
    assert.equal(loadBottle("Lila"), "drawer")
    assert.equal(seen, 2)
    blocked = true
    saveBottle("Lila", "desk")
    assert.equal(memory.get("camilia-nightstand"), JSON.stringify({ name: "Lila", place: "drawer" }))
    assert.equal(loadBottle("Lila"), "desk")
    assert.equal(seen, 3)
    stop()
    assert.equal(storageListeners.length, 0)
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "window")
    else Object.defineProperty(globalThis, "window", { configurable: true, value: previous })
  }
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
