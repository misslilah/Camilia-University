import assert from "node:assert/strict"
import test from "node:test"
import { INITIAL_CELLS, monitorIcons } from "./desktop.ts"

test("the room screen lists every desktop app in its cell", () => {
  const icons = monitorIcons({ cells: INITIAL_CELLS, admin: false, badges: { mail: 2, patreon: 1 } })
  assert.equal(icons.some((icon) => icon.id === "admin"), false)
  assert.equal(icons.length, 8)
  assert.deepEqual(
    icons.find((icon) => icon.id === "mail"),
    { id: "mail", name: "Mail", from: "#c45b6a", to: "#8d3044", mark: "M", col: 1, row: 3, badge: 2 },
  )
  assert.equal(icons.find((icon) => icon.id === "patreon")?.badge, 1)
  assert.equal(icons.find((icon) => icon.id === "profile")?.col, 1)
})

test("the creator sees the admin icon on the same screen", () => {
  const icons = monitorIcons({ cells: INITIAL_CELLS, admin: true })
  assert.equal(icons.some((icon) => icon.id === "admin"), true)
})
