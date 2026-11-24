import assert from "node:assert/strict"
import test from "node:test"
import { campusAddress } from "./mail.ts"

test("a pseudo becomes a university mailbox", () => {
  assert.equal(campusAddress("Lila Morel"), "lila.morel@university.mail")
  assert.equal(campusAddress("Élodie"), "elodie@university.mail")
  assert.equal(campusAddress("Camilia!!!"), "camilia@university.mail")
  assert.equal(campusAddress("   "), "student@university.mail")
})
