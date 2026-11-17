"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { ACESFilmicToneMapping, SRGBColorSpace } from "three"
import { FlatCampus } from "@/components/flat-campus"
import { Blackboard, Signage } from "@/components/experience/Blackboard"
import { Director } from "@/components/experience/Director"
import { Doors } from "@/components/experience/Doors"
import { Hall, Lights, Motes } from "@/components/experience/Hall"
import { Hud } from "@/components/experience/Hud"
import { Seating } from "@/components/experience/Seating"
import { sound } from "@/lib/sound"
import {
  CHAPTERS,
  OUTSIDE,
  neighbor,
  seatById,
  type Phase,
} from "@/lib/scene"

export default function Experience() {
  const [webgl] = useState(() => {
    try {
      const canvas = document.createElement("canvas")
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
    } catch {
      return false
    }
  })
  const [phase, setPhase] = useState<Phase>("arrival")
  const [phaseAt, setPhaseAt] = useState(0)
  const [seatId, setSeatId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const [chapterId, setChapterId] = useState<string | null>(null)
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const [muted, setMuted] = useState(() => {
    try {
      return window.localStorage.getItem("camilia-muted") === "1"
    } catch {
      return false
    }
  })
  const openRef = useRef(0)

  useEffect(() => {
    sound.prime(muted)
  }, [muted])

  useEffect(() => {
    return () => sound.stopAll()
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduced(media.matches)
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  const go = useCallback((next: Phase) => {
    setPhase(next)
    setPhaseAt(performance.now())
    if (next !== "sitting") {
      setSettled(false)
      setChapterId(null)
      if (next !== "inside") setSeatId(null)
    }
  }, [])

  const openDoors = useCallback(() => {
    if (phase !== "arrival") return
    sound.entrance(reduced)
    go("opening")
  }, [go, phase, reduced])

  const skip = useCallback(() => {
    sound.glideIn(reduced)
    go("inside")
  }, [go, reduced])

  const pickSeat = useCallback(
    (id: string) => {
      if (phase !== "inside") return
      setSeatId(id)
      setFocused(id)
      setSettled(false)
      setChapterId(null)
      sound.sit(reduced)
      go("sitting")
    },
    [go, phase, reduced],
  )

  const stand = useCallback(() => {
    if (seatId) setFocused(seatId)
    sound.stand(reduced)
    go("inside")
  }, [go, reduced, seatId])

  const openChapter = useCallback((id: string) => {
    setChapterId(id)
    sound.writePage()
  }, [])

  const closeChapter = useCallback(() => {
    setChapterId(null)
    sound.wipeBoard()
  }, [])

  const toggleSound = useCallback(() => {
    const next = !muted
    sound.setMuted(next)
    try {
      window.localStorage.setItem("camilia-muted", next ? "1" : "0")
    } catch {
      // Storage can be blocked; the button still mutes this visit.
    }
    if (!next) sound.tap()
    setMuted(next)
  }, [muted])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && target.closest("button, a, input, textarea")) return
      if (phase === "arrival" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        openDoors()
      }
      if (phase === "opening" && event.key === "Escape") skip()
      if (phase === "inside" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault()
        const dir =
          event.key === "ArrowLeft"
            ? "left"
            : event.key === "ArrowRight"
              ? "right"
              : event.key === "ArrowUp"
                ? "up"
                : "down"
        setFocused((current) => neighbor(current, dir))
      }
      if (phase === "inside" && event.key === "Enter" && focused) pickSeat(focused)
      if (phase === "sitting" && event.key === "Escape") {
        if (chapterId) closeChapter()
        else stand()
      }
      if (phase === "sitting" && settled && !chapterId && /^[1-6]$/.test(event.key)) {
        const chapter = CHAPTERS[Number(event.key) - 1]
        if (chapter) openChapter(chapter.id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [chapterId, closeChapter, focused, openChapter, openDoors, phase, pickSeat, settled, skip, stand])

  if (!webgl) return <FlatCampus />

  const seat = seatById(seatId)
  const activeId = phase === "inside" ? hovered || focused : seatId

  return (
    <div className="relative h-full w-full bg-[#140f0c]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: OUTSIDE.position, fov: OUTSIDE.fov, near: 0.05, far: 90 }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
          outputColorSpace: SRGBColorSpace,
        }}
      >
        <color attach="background" args={["#cbb89f"]} />
        <Lights seated={phase === "sitting"} openRef={openRef} />
        <Hall />
        <Doors openRef={openRef} phase={phase} onOpen={openDoors} />
        <Seating phase={phase} activeId={activeId} onHover={setHovered} onPick={pickSeat} />
        <Motes />
        <Suspense fallback={null}>
          <Signage />
          <Blackboard
            showMenu={phase === "sitting" && settled}
            chapterId={chapterId}
            onSelect={openChapter}
            onBack={closeChapter}
          />
        </Suspense>
        <Director
          phase={phase}
          phaseAt={phaseAt}
          reduced={reduced}
          seat={seat}
          openRef={openRef}
          onEntered={() => go("inside")}
          onSat={() => {
            setSettled(true)
            sound.writeMenu()
          }}
        />
      </Canvas>
      <Hud
        phase={phase}
        seat={seat}
        hovered={phase === "inside" ? hovered || focused : null}
        chapterId={chapterId}
        onOpen={openDoors}
        onSkip={skip}
        onStand={stand}
        onSelect={openChapter}
        onBack={closeChapter}
        muted={muted}
        onToggleSound={toggleSound}
      />
    </div>
  )
}
