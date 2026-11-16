"use client"

import { useEffect, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { PerspectiveCamera, Vector3 } from "three"
import {
  INSIDE,
  OUTSIDE,
  SIT_FOV,
  doorAmount,
  enterDuration,
  sampleEnter,
  type Phase,
  type Seat,
} from "@/lib/scene"

export function Director({
  phase,
  phaseAt,
  reduced,
  seat,
  openRef,
  onEntered,
  onSat,
}: {
  phase: Phase
  phaseAt: number
  reduced: boolean
  seat: Seat | null
  openRef: { current: number }
  onEntered: () => void
  onSat: () => void
}) {
  const look = useRef(new Vector3(...OUTSIDE.look))
  const fromP = useRef(new Vector3())
  const toP = useRef(new Vector3())
  const fromL = useRef(new Vector3())
  const toL = useRef(new Vector3())
  const anim = useRef({
    phase: "",
    seatId: "",
    elapsed: 0,
    duration: 1,
    mode: "hold" as "hold" | "enter" | "lerp",
    toFov: OUTSIDE.fov,
    notified: false,
  })
  const entered = useRef(onEntered)
  const sat = useRef(onSat)

  useEffect(() => {
    entered.current = onEntered
    sat.current = onSat
  }, [onEntered, onSat])

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera
    const motion = anim.current
    const seatId = seat?.id ?? ""

    if (motion.phase !== phase || motion.seatId !== seatId) {
      fromP.current.copy(camera.position)
      fromL.current.copy(look.current)
      motion.phase = phase
      motion.seatId = seatId
      motion.elapsed = 0
      motion.notified = false
      if (phase === "opening") {
        motion.mode = "enter"
        motion.toFov = INSIDE.fov
      } else if (phase === "sitting" && seat) {
        motion.mode = "lerp"
        motion.duration = reduced ? 0.4 : 1.85
        toP.current.set(...seat.sit)
        toL.current.set(...seat.look)
        motion.toFov = window.innerWidth < 760 ? 64 : SIT_FOV
      } else if (phase === "inside") {
        motion.mode = "lerp"
        motion.duration = reduced ? 0.4 : 1.3
        toP.current.set(...INSIDE.position)
        toL.current.set(...INSIDE.look)
        motion.toFov = INSIDE.fov
      } else {
        motion.mode = "hold"
        motion.toFov = OUTSIDE.fov
        camera.position.set(...OUTSIDE.position)
        look.current.set(...OUTSIDE.look)
      }
    }

    const openingElapsed = phase === "opening" ? (performance.now() - phaseAt) / 1000 : 0
    openRef.current = doorAmount(phase, openingElapsed, reduced)

    if (motion.mode === "enter") {
      const duration = enterDuration(reduced)
      const lead = reduced ? 0.08 : 0.36
      const moveT = Math.min(1, Math.max(0, (openingElapsed - lead) / Math.max(0.2, duration - lead)))
      sampleEnter(moveT, camera.position, look.current)
      if (openingElapsed >= duration && !motion.notified) {
        motion.notified = true
        entered.current()
      }
    } else if (motion.mode === "lerp") {
      motion.elapsed += delta
      const t = Math.min(1, motion.elapsed / motion.duration)
      const eased = t * t * (3 - 2 * t)
      camera.position.lerpVectors(fromP.current, toP.current, eased)
      look.current.lerpVectors(fromL.current, toL.current, eased)
      if (phase === "inside" && t >= 1) {
        const time = performance.now() / 1000
        camera.position.x += Math.sin(time * 0.32) * 0.02
        camera.position.y += Math.sin(time * 0.46) * 0.01
      }
      if (t >= 1 && phase === "sitting" && !motion.notified) {
        motion.notified = true
        sat.current()
      }
    } else {
      const time = performance.now() / 1000
      camera.position.set(
        OUTSIDE.position[0] + Math.sin(time * 0.27) * 0.04,
        OUTSIDE.position[1] + Math.sin(time * 0.41) * 0.012,
        OUTSIDE.position[2],
      )
      look.current.set(...OUTSIDE.look)
    }

    if (Math.abs(camera.fov - motion.toFov) > 0.03) {
      camera.fov += (motion.toFov - camera.fov) * (1 - Math.exp(-delta * 2.4))
      camera.updateProjectionMatrix()
    }
    camera.lookAt(look.current)
  })

  return null
}
