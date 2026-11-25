"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadPlayableCourse, revokeAudio, type PlayableCourse } from "@/lib/course-client"
import { defaultCourse } from "@/lib/obedience-course"

export type PlayableState =
  | { status: "loading" }
  | { status: "error"; message: string; fallback: PlayableCourse | null }
  | { status: "ready"; playable: PlayableCourse }

export function usePlayableCourse() {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<PlayableState>({ status: "loading" })
  const held = useRef<PlayableCourse | null>(null)

  useEffect(() => {
    let cancel = false
    loadPlayableCourse().then((result) => {
      if (cancel) {
        if (result.ok) revokeAudio(result.playable.audio)
        else if (result.fallback) revokeAudio(result.fallback.audio)
        return
      }
      if (result.ok) {
        held.current = result.playable
        setState({ status: "ready", playable: result.playable })
        return
      }
      setState({ status: "error", message: result.error, fallback: result.fallback })
    })
    return () => {
      cancel = true
      if (held.current) revokeAudio(held.current.audio)
      held.current = null
    }
  }, [nonce])

  const reload = useCallback(() => {
    setState({ status: "loading" })
    setNonce((value) => value + 1)
  }, [])

  const useFallback = useCallback((fallback: PlayableCourse | null) => {
    const playable: PlayableCourse = fallback ?? { course: defaultCourse(), audio: {}, source: "default", note: null }
    held.current = playable
    setState({ status: "ready", playable })
  }, [])

  return { state, reload, useFallback }
}
