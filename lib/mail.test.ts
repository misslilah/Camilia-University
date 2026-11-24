import assert from "node:assert/strict"
import test from "node:test"
import { campusAddress, lettersIn } from "./mail.ts"

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
