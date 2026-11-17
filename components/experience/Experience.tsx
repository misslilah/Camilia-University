"use client"

import { Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Canvas } from "@react-three/fiber"
import { Bedroom, RoomDoor } from "@/components/experience/Bedroom"
import { ACESFilmicToneMapping, SRGBColorSpace } from "three"
import { FlatCampus } from "@/components/flat-campus"
import { Blackboard, Signage } from "@/components/experience/Blackboard"
import { Director, type LookOffset } from "@/components/experience/Director"
import { Doors } from "@/components/experience/Doors"
import { Hall, Lights, Motes } from "@/components/experience/Hall"
import { Hud } from "@/components/experience/Hud"
import { Seating } from "@/components/experience/Seating"
import { WardrobePanel } from "@/components/experience/WardrobePanel"
import { baseCharacter, loadCharacter, saveCharacter, type Character, type Sex } from "@/lib/avatar"
import { setCursor } from "@/lib/cursor"
import { FADE_ID } from "@/lib/fade"
import { sound } from "@/lib/sound"
import {
  CHAPTERS,
  OUTSIDE,
  inRoom,
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
  const roomDoorRef = useRef(0)
  const lookRef = useRef<LookOffset>({ yaw: 0, pitch: 0 })
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  const [saved] = useState(() => loadCharacter())
  const [character, setCharacter] = useState<Character | null>(saved?.character ?? null)
  const [created, setCreated] = useState(saved?.created ?? false)
  const avatarYawRef = useRef(0)
  const spinRef = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    sound.prime(muted)
  }, [muted])

  useEffect(() => {
    sound.preload()
    const unlock = () => sound.unlock()
    window.addEventListener("pointerdown", unlock, { once: true })
    window.addEventListener("keydown", unlock, { once: true })
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
      sound.stopAll()
    }
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

  const enterRoom = useCallback(() => {
    if (phase !== "arrival") return
    sound.toRoom(reduced)
    go("toRoom")
  }, [go, phase, reduced])

  const roomReached = useCallback(() => {
    lookRef.current = { yaw: 0, pitch: 0 }
    sound.roomArrive(reduced)
    go("room")
  }, [go, reduced])

  const leaveRoom = useCallback(() => {
    if (phase !== "room") return
    sound.fromRoom(reduced)
    go("fromRoom")
  }, [go, phase, reduced])

  const openWardrobe = useCallback(() => {
    if (phase !== "room") return
    setCursor("auto")
    avatarYawRef.current = 0
    sound.wardrobeOpen()
    go("wardrobe")
  }, [go, phase])

  const closeWardrobe = useCallback(() => {
    if (phase !== "wardrobe") return
    spinRef.current = null
    lookRef.current = { yaw: 0, pitch: 0 }
    sound.wardrobeClose()
    go("room")
  }, [go, phase])

  // A character being created stays a draft until it is confirmed.
  const updateCharacter = useCallback(
    (next: Character) => {
      setCharacter(next)
      if (created) saveCharacter(next)
    },
    [created],
  )

  const createCharacter = useCallback(() => {
    if (!character) return
    saveCharacter(character)
    setCreated(true)
  }, [character])

  const chooseBody = useCallback(
    (sex: Sex) => updateCharacter(baseCharacter(sex)),
    [updateCharacter],
  )

  const turnAvatar = useCallback((step: number) => {
    avatarYawRef.current += step
  }, [])

  const leaveHall = useCallback(() => {
    if (phase !== "inside") return
    setHovered(null)
    sound.leaveHall()
    go("leaving")
  }, [go, phase])

  const hallLeft = useCallback(() => {
    sound.hallReturn()
    go("arrival")
  }, [go])

  const roomLeft = useCallback(() => {
    sound.hallReturn()
    go("arrival")
  }, [go])

  const look = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (phase === "wardrobe") {
        const spin = spinRef.current
        if (spin) {
          const rect = event.currentTarget.getBoundingClientRect()
          avatarYawRef.current = spin.yaw + ((event.clientX - spin.x) / rect.width) * 5
        }
        return
      }
      if (phase !== "room") return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.pointerType === "mouse") {
        const nx = (event.clientX - rect.left) / rect.width - 0.5
        const ny = (event.clientY - rect.top) / rect.height - 0.5
        lookRef.current = { yaw: nx * 1.25, pitch: -ny * 0.42 }
        return
      }
      const drag = dragRef.current
      if (!drag) return
      const yaw = drag.yaw - ((event.clientX - drag.x) / rect.width) * 2.2
      const pitch = drag.pitch + ((event.clientY - drag.y) / rect.height) * 0.8
      lookRef.current = {
        yaw: Math.max(-1.1, Math.min(1.1, yaw)),
        pitch: Math.max(-0.3, Math.min(0.3, pitch)),
      }
    },
    [phase],
  )

  const pickSeat = useCallback(
    (id: string) => {
      if (phase !== "inside") return
      setSeatId(id)
      setFocused(id)
      setSettled(false)
      setChapterId(null)
      const target = seatById(id)
      if (target) sound.sit(reduced, target)
      go("sitting")
    },
    [go, phase, reduced],
  )

  const stand = useCallback(() => {
    if (seatId) setFocused(seatId)
    sound.stand(reduced, seatById(seatId))
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
      if (target instanceof HTMLElement && target.closest("button, a, input, textarea, [role=slider], [role=tab]")) return
      if (phase === "arrival" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        openDoors()
      }
      if (phase === "opening" && event.key === "Escape") skip()
      if (phase === "room" && event.key === "Escape") leaveRoom()
      if (phase === "wardrobe" && event.key === "Escape") closeWardrobe()
      if (phase === "wardrobe" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault()
        turnAvatar(event.key === "ArrowLeft" ? -0.4 : 0.4)
      }
      if (phase === "room" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault()
        const step = event.key === "ArrowLeft" ? -0.25 : 0.25
        const current = lookRef.current
        lookRef.current = { ...current, yaw: Math.max(-1.1, Math.min(1.1, current.yaw + step)) }
      }
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
      if (phase === "inside" && event.key === "Escape") leaveHall()
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
  }, [chapterId, closeChapter, closeWardrobe, focused, leaveHall, leaveRoom, openChapter, openDoors, phase, pickSeat, settled, skip, stand, turnAvatar])

  if (!webgl) return <FlatCampus />

  const seat = seatById(seatId)
  const activeId = phase === "inside" ? hovered || focused : seatId

  return (
    <div
      className="relative h-full w-full touch-none bg-[#140f0c]"
      onPointerMove={look}
      onPointerDown={(event) => {
        if (phase === "room" && event.pointerType !== "mouse") {
          dragRef.current = { x: event.clientX, y: event.clientY, ...lookRef.current }
        }
        if (phase === "wardrobe" && event.target instanceof HTMLCanvasElement) {
          spinRef.current = { x: event.clientX, yaw: avatarYawRef.current }
        }
      }}
      onPointerUp={() => {
        dragRef.current = null
        spinRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
        spinRef.current = null
      }}
    >
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
        <Lights seated={phase === "sitting"} away={inRoom(phase)} openRef={openRef} />
        <group visible={phase !== "wardrobe"}>
          <Hall />
          <Doors openRef={openRef} phase={phase} onOpen={openDoors} />
          <RoomDoor phase={phase} amountRef={roomDoorRef} onOpen={enterRoom} />
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
        </group>
        <Bedroom
          phase={phase}
          reduced={reduced}
          character={character}
          avatarYawRef={avatarYawRef}
          onWardrobe={openWardrobe}
        />
        <Director
          phase={phase}
          phaseAt={phaseAt}
          reduced={reduced}
          seat={seat}
          openRef={openRef}
          roomDoorRef={roomDoorRef}
          lookRef={lookRef}
          onRoomReached={roomReached}
          onLeftRoom={roomLeft}
          onLeftHall={hallLeft}
          onEntered={() => go("inside")}
          onSat={() => {
            setSettled(true)
            sound.writeMenu()
          }}
        />
      </Canvas>
      <div id={FADE_ID} aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-[#07080b]" style={{ opacity: 0 }} />
      <Hud
        phase={phase}
        seat={seat}
        hovered={phase === "inside" ? hovered || focused : null}
        chapterId={chapterId}
        onOpen={openDoors}
        onSkip={skip}
        onStand={stand}
        onRoom={enterRoom}
        onLeaveRoom={leaveRoom}
        onLeaveHall={leaveHall}
        onSelect={openChapter}
        onBack={closeChapter}
        muted={muted}
        onToggleSound={toggleSound}
      />
      <WardrobePanel
        open={phase === "wardrobe"}
        character={character}
        onChoose={chooseBody}
        created={created}
        onChange={updateCharacter}
        onCreate={createCharacter}
        onDone={closeWardrobe}
        onTurn={turnAvatar}
      />
    </div>
  )
}
