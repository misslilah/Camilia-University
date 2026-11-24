import assert from "node:assert/strict"
import test from "node:test"
import { noticeUpdate, type NoticePost } from "./patreon-notices.ts"

const clip = (id: string, kind: NoticePost["kind"] = "video"): NoticePost => ({ id, kind, name: id })

test("the catalog already on the desk does not announce itself", () => {
  const update = noticeUpdate({ primed: false, announced: [], seen: [] }, [clip("a"), clip("b", "audio")], false)
  assert.deepEqual(update.fresh, [])
  assert.equal(update.badge, false)
  assert.equal(update.memory.primed, true)
})

test("a post added later is announced once and keeps the badge until the app opens", () => {
  const first = noticeUpdate({ primed: false, announced: [], seen: [] }, [clip("a")], false)
  const published = noticeUpdate(first.memory, [clip("a"), clip("b", "audio")], false)
  assert.deepEqual(published.fresh.map((post) => post.id), ["b"])
  assert.equal(published.badge, true)
  const again = noticeUpdate(published.memory, [clip("a"), clip("b", "audio")], false)
  assert.deepEqual(again.fresh, [])
  assert.equal(again.badge, true)
  const opened = noticeUpdate(again.memory, [clip("a"), clip("b", "audio")], true)
  assert.equal(opened.badge, false)
  assert.deepEqual(opened.fresh, [])
})

test("a post that arrives while Patreon is open is announced without a badge", () => {
  const first = noticeUpdate({ primed: false, announced: [], seen: [] }, [clip("a")], true)
  const published = noticeUpdate(first.memory, [clip("a"), clip("b")], true)
  assert.deepEqual(published.fresh.map((post) => post.id), ["b"])
  assert.equal(published.badge, false)
})
