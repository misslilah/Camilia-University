import assert from "node:assert/strict"
import test from "node:test"
import { entitledTo, tierById, tierLabel, tierOptionLabel, tooLargeMessage } from "./patreon-access.ts"

const studio = { id: "studio", title: "Studio", amountCents: 800 }
const listeners = { id: "listeners", title: "Listeners", amountCents: 300 }

test("an entitled tier title can open that file", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: null }, [studio]), true)
})

test("a higher amount opens a lower tier", () => {
  assert.equal(entitledTo({ tierTitle: "Listeners", tierCents: 300 }, [studio]), true)
})

test("a lower amount does not open a higher tier", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: 800 }, [listeners]), false)
})

test("a different title without an amount stays closed", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: null }, [listeners]), false)
})

test("tier titles stay in Patreon's wording", () => {
  assert.equal(tierLabel([listeners, studio]), "Listeners, Studio")
  assert.equal(tooLargeMessage("clip.mp4"), `"clip.mp4" is larger than 24 MB. Choose a smaller file.`)
})

test("an upload can only name a tier returned for the creator", () => {
  assert.equal(tierById([listeners, studio], "studio")?.title, "Studio")
  assert.equal(tierById([listeners, studio], "missing"), null)
  assert.equal(tierOptionLabel(studio), "Studio · 8.00")
})
