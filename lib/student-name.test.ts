import assert from "node:assert/strict"
import test from "node:test"
import { properName } from "./student-name.ts"

test("a chosen name is kept", () => {
  assert.equal(properName("Camilia", "camillesouvant@gmail.com"), "Camilia")
})

test("an email is not used as the student name", () => {
  assert.equal(properName("camillesouvant@gmail.com", "camillesouvant@gmail.com"), "")
  assert.equal(properName("  someone@example.com "), "")
})
