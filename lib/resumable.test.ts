import assert from "node:assert/strict"
import test from "node:test"
import { resumableEndpoint, resumableHeaders } from "./resumable.ts"

test("a signed upload uses the resumable sign endpoint", () => {
  assert.equal(
    resumableEndpoint("https://lshvqrwwtzpnjofvehsq.supabase.co"),
    "https://lshvqrwwtzpnjofvehsq.storage.supabase.co/storage/v1/upload/resumable/sign",
  )
})

test("the signed token is sent as a signature, not as a session", () => {
  const headers = resumableHeaders("signed-token", "anon-key")
  assert.equal(headers["x-signature"], "signed-token")
  assert.equal(headers.apikey, "anon-key")
  assert.equal("authorization" in headers, false)
})
