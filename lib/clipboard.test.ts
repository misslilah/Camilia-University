import assert from "node:assert/strict"
import test from "node:test"
import { isClipboardShortcut } from "./clipboard.ts"

test("copy, cut and paste shortcuts are blocked", () => {
  assert.equal(isClipboardShortcut({ key: "c", ctrlKey: true, metaKey: false, shiftKey: false }), true)
  assert.equal(isClipboardShortcut({ key: "v", ctrlKey: false, metaKey: true, shiftKey: false }), true)
  assert.equal(isClipboardShortcut({ key: "x", ctrlKey: true, metaKey: false, shiftKey: true }), true)
  assert.equal(isClipboardShortcut({ key: "Insert", ctrlKey: false, metaKey: false, shiftKey: true }), true)
  assert.equal(isClipboardShortcut({ key: "Insert", ctrlKey: true, metaKey: false, shiftKey: false }), true)
  assert.equal(isClipboardShortcut({ key: "a", ctrlKey: true, metaKey: false, shiftKey: false }), false)
  assert.equal(isClipboardShortcut({ key: "v", ctrlKey: false, metaKey: false, shiftKey: false }), false)
})
