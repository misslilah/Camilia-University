"use client"

import { useEffect } from "react"
import { isClipboardShortcut } from "@/lib/clipboard"

const PASTE_INPUT = new Set(["insertFromPaste", "insertFromPasteAsQuotation", "insertFromDrop", "insertFromYank"])

export function ClipboardLock() {
  useEffect(() => {
    const block = (event: Event) => {
      event.preventDefault()
    }
    const onBeforeInput = (event: Event) => {
      if (PASTE_INPUT.has((event as InputEvent).inputType)) event.preventDefault()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isClipboardShortcut(event)) return
      event.preventDefault()
    }
    document.addEventListener("copy", block, true)
    document.addEventListener("cut", block, true)
    document.addEventListener("paste", block, true)
    document.addEventListener("beforeinput", onBeforeInput, true)
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("drop", block, true)
    return () => {
      document.removeEventListener("copy", block, true)
      document.removeEventListener("cut", block, true)
      document.removeEventListener("paste", block, true)
      document.removeEventListener("beforeinput", onBeforeInput, true)
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("drop", block, true)
    }
  }, [])
  return null
}
