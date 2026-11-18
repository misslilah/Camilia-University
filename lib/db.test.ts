import assert from "node:assert/strict"
import test from "node:test"
import { sslForDatabase } from "./db.ts"

test("a local database does not ask for TLS", () => {
  assert.equal(sslForDatabase("postgres://camilia@127.0.0.1:5432/camilia"), undefined)
})

test("Supabase is accepted when its pooler certificate is outside Node's trust store", () => {
  const ssl = sslForDatabase("postgresql://postgres.example:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres")
  assert.deepEqual(ssl, { rejectUnauthorized: false })
})

test("another hosted database still verifies its certificate", () => {
  const ssl = sslForDatabase("postgresql://camilia:secret@db.example.com:5432/camilia")
  assert.deepEqual(ssl, { rejectUnauthorized: true })
})
