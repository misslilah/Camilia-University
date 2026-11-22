import assert from "node:assert/strict"
import test from "node:test"
import { joinRoster, tierLine, type RosterLink } from "./roster.ts"

const listeners: RosterLink = {
  academyUserId: "student-1",
  tierTitle: "Listeners",
  patronStatus: "active_patron",
  isAdmin: false,
  updatedAt: "2026-03-01T00:00:00.000Z",
}

test("a student without a Patreon link stays unconnected", () => {
  const [row] = joinRoster([{ id: "student-2", name: "Ada", email: "ada@example.com", createdAt: "2026-01-01" }], [])
  assert.equal(row.tier, "Patreon not connected")
  assert.equal(tierLine(undefined), "Patreon not connected")
})

test("the newest link supplies the tier, and the creator is labeled", () => {
  const older: RosterLink = { ...listeners, tierTitle: "Studio", updatedAt: "2026-01-01T00:00:00.000Z" }
  const creator: RosterLink = { ...listeners, academyUserId: "creator", isAdmin: true, tierTitle: null, patronStatus: null }
  const rows = joinRoster(
    [
      { id: "student-1", name: "Bea", email: "bea@example.com", createdAt: "2026-02-01" },
      { id: "creator", name: "Camilia", email: "camilia@example.com", createdAt: "2026-01-01" },
    ],
    [older, listeners, creator],
  )
  assert.deepEqual(
    rows.map((row) => [row.name, row.tier]),
    [
      ["Bea", "Listeners"],
      ["Camilia", "Creator"],
    ],
  )
  assert.equal(tierLine({ ...listeners, tierTitle: "  ", patronStatus: "active_patron" }), "Active member")
  assert.equal(tierLine({ ...listeners, patronStatus: "declined_patron" }), "Connected, no paid tier")
})
