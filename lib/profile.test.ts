import assert from "node:assert/strict"
import test from "node:test"
import { blankSkills, describeLevel, describeRank, totalXp } from "./profile.ts"

test("a new student is a level 1 initiate with empty skills", () => {
  const skills = blankSkills()
  const level = describeLevel(totalXp(skills))
  assert.equal(level.level, 1)
  assert.equal(level.title, "Initiate")
  assert.equal(level.into, 0)
  assert.equal(level.need, 100)
  for (const xp of Object.values(skills)) {
    const rank = describeRank(xp)
    assert.equal(rank.title, "Untrained")
    assert.equal(rank.into, 0)
    assert.equal(rank.need, 40)
  }
})

test("one hundred total xp reaches level 2", () => {
  const level = describeLevel(100)
  assert.equal(level.level, 2)
  assert.equal(level.into, 0)
  assert.equal(level.need, 150)
})

test("forty skill xp leaves the untrained rank", () => {
  const rank = describeRank(40)
  assert.equal(rank.title, "Novice")
  assert.equal(rank.into, 0)
  assert.equal(rank.need, 70)
})
