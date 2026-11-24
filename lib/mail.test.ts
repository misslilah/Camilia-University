import assert from "node:assert/strict"
import test from "node:test"
import { campusAddress, lettersIn, unreadCount } from "./mail.ts"

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

test("unread mail is inbox letters that were never opened", () => {
  const ids = ["desk", "registrar", "board"]
  assert.equal(unreadCount(ids, []), 3)
  assert.equal(unreadCount(ids, ["desk"]), 2)
  assert.equal(unreadCount(lettersIn(ids, ["desk"], [], "inbox"), []), 2)
  assert.equal(unreadCount(lettersIn(ids, ["desk"], ["registrar"], "inbox"), ["board"]), 0)
  assert.equal(unreadCount([], ["desk"]), 0)
})
