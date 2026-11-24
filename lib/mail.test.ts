import assert from "node:assert/strict"
import test from "node:test"
import { campusAddress, inboxMailIds, lettersIn, missedMail, unreadCount } from "./mail.ts"

test("a pseudo becomes a university mailbox", () => {
  assert.equal(campusAddress("Lila Morel"), "lila.morel@university.mail")
  assert.equal(campusAddress("Élodie"), "elodie@university.mail")
  assert.equal(campusAddress("Camilia!!!"), "camilia@university.mail")
  assert.equal(campusAddress("   "), "student@university.mail")
})

test("trash hides a letter from the inbox until it is gone", () => {
  const ids = ["desk", "registrar", "board"]
  assert.deepEqual(lettersIn(ids, ["desk"], [], "inbox"), ["registrar", "board"])
  assert.deepEqual(lettersIn(ids, ["desk"], [], "trash"), ["desk"])
  assert.deepEqual(lettersIn(ids, ["desk"], ["desk"], "trash"), [])
  assert.deepEqual(lettersIn(ids, ["desk"], ["desk"], "inbox"), ["registrar", "board"])
})

test("the welcome letter is unread only after the first course", () => {
  assert.deepEqual(inboxMailIds(false), ["desk", "registrar", "board"])
  assert.deepEqual(inboxMailIds(true), ["gift", "desk", "registrar", "board"])
  assert.equal(unreadCount(inboxMailIds(false), []), 3)
  assert.equal(unreadCount(inboxMailIds(true), []), 4)
  assert.equal(unreadCount(inboxMailIds(true), ["gift"]), 3)
  assert.equal(unreadCount(lettersIn(inboxMailIds(true), ["gift"], [], "inbox"), []), 3)

  const memory = new Map<string, string>()
  const previous = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
      },
    },
  })
  try {
    memory.set("camilia-obedience", JSON.stringify({ name: "Lila", done: false, line: 1, copy: 2 }))
    assert.equal(missedMail("Lila"), 3)
    memory.set("camilia-obedience", JSON.stringify({ name: "Lila", done: true, line: 2, copy: 5 }))
    assert.equal(missedMail("Lila"), 4)
    memory.set("camilia-mail-read", JSON.stringify({ name: "Lila", ids: ["gift"] }))
    assert.equal(missedMail("Lila"), 3)
    memory.set("camilia-mail-read", JSON.stringify({ name: "Lila", ids: [] }))
    memory.set("camilia-mail-trash", JSON.stringify({ name: "Lila", ids: ["gift"] }))
    assert.equal(missedMail("Lila"), 3)
    assert.equal(missedMail("Noa"), 3)
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window
    else Object.defineProperty(globalThis, "window", { configurable: true, value: previous })
  }
})

test("unread mail is inbox letters that were never opened", () => {
  const ids = ["desk", "registrar", "board"]
  assert.equal(unreadCount(ids, []), 3)
  assert.equal(unreadCount(ids, ["desk"]), 2)
  assert.equal(unreadCount(lettersIn(ids, ["desk"], [], "inbox"), []), 2)
  assert.equal(unreadCount(lettersIn(ids, ["desk"], ["registrar"], "inbox"), ["board"]), 0)
  assert.equal(unreadCount([], ["desk"]), 0)
})
