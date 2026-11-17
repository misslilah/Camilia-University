"use client"

import { useEffect, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { PerspectiveCamera, Vector3 } from "three"
import { setFade } from "@/lib/fade"
import {
  INSIDE,
  OUTSIDE,
  ROOM_APPROACH,
  ROOM_VIEW,
  SIT_FOV,
  doorAmount,
  enterDuration,
  fromRoomDuration,
  leaveDuration,
  riseDuration,
  roomDoorDuration,
  sampleEnter,
  sitDuration,
  smootherstep,
  toRoomDuration,
  type Phase,
  type Seat,
} from "@/lib/scene"

export type LookOffset = { yaw: number; pitch: number }

type Mode = "hold" | "enter" | "lerp" | "leaving" | "toRoom" | "room" | "fromRoom"

export function Director({
  phase,
  phaseAt,
  reduced,
  seat,
  openRef,
  roomDoorRef,
  lookRef,
  onEntered,
  onSat,
  onRoomReached,
  onLeftRoom,
  onLeftHall,
}: {
  phase: Phase
  phaseAt: number
  reduced: boolean
  seat: Seat | null
  openRef: { current: number }
  roomDoorRef: { current: number }
  lookRef: { current: LookOffset }
  onEntered: () => void
  onSat: () => void
  onRoomReached: () => void
  onLeftRoom: () => void
  onLeftHall: () => void
}) {
  const look = useRef(new Vector3(...OUTSIDE.look))
  const fromP = useRef(new Vector3())
  const toP = useRef(new Vector3())
  const fromL = useRef(new Vector3())
  const toL = useRef(new Vector3())
  const roomBase = useRef(new Vector3())
  const roomTurn = useRef({ yaw: 0, pitch: 0 })
  const anim = useRef({
    phase: "",
    seatId: "",
    elapsed: 0,
    duration: 1,
    mode: "hold" as Mode,
    toFov: OUTSIDE.fov,
    notified: false,
    fade: 0,
  })
  const callbacks = useRef({ onEntered, onSat, onRoomReached, onLeftRoom, onLeftHall })

  useEffect(() => {
    callbacks.current = { onEntered, onSat, onRoomReached, onLeftRoom, onLeftHall }
  }, [onEntered, onSat, onRoomReached, onLeftRoom, onLeftHall])

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera
    const motion = anim.current
    const seatId = seat?.id ?? ""
    const narrow = window.innerWidth < 760

    if (motion.phase !== phase || motion.seatId !== seatId) {
      const previous = motion.phase
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
        motion.duration = sitDuration(reduced)
        toP.current.set(...seat.sit)
        toL.current.set(...seat.look)
        motion.toFov = narrow ? 64 : SIT_FOV
      } else if (phase === "inside") {
        motion.mode = "lerp"
        motion.duration = riseDuration(reduced)
        toP.current.set(...INSIDE.position)
        toL.current.set(...INSIDE.look)
        motion.toFov = INSIDE.fov
      } else if (phase === "leaving") {
        motion.mode = "leaving"
        motion.duration = leaveDuration(reduced)
      } else if (phase === "toRoom") {
        motion.mode = "toRoom"
        motion.duration = toRoomDuration(reduced)
        toP.current.set(...ROOM_APPROACH.position)
        toL.current.set(...ROOM_APPROACH.look)
        motion.toFov = OUTSIDE.fov + 6
      } else if (phase === "room") {
        motion.mode = "room"
        motion.fade = 1
        camera.position.set(...ROOM_VIEW.position)
        roomBase.current.set(...ROOM_VIEW.look)
        look.current.copy(roomBase.current)
        roomTurn.current = { yaw: 0, pitch: 0 }
        motion.toFov = narrow ? 74 : ROOM_VIEW.fov
        camera.fov = motion.toFov
        camera.updateProjectionMatrix()
      } else if (phase === "fromRoom") {
        motion.mode = "fromRoom"
        motion.duration = fromRoomDuration(reduced)
      } else {
        motion.mode = "hold"
        motion.toFov = OUTSIDE.fov
        if (previous === "fromRoom" || previous === "leaving") {
          motion.fade = 1
          camera.fov = OUTSIDE.fov
          camera.updateProjectionMatrix()
        }
        camera.position.set(...OUTSIDE.position)
        look.current.set(...OUTSIDE.look)
      }
    }

    const elapsed = (performance.now() - phaseAt) / 1000
    const openingElapsed = phase === "opening" ? elapsed : 0
    openRef.current = phase === "leaving" ? 1 : doorAmount(phase, openingElapsed, reduced)

    if (phase === "toRoom") {
      roomDoorRef.current = smootherstep(Math.min(1, elapsed / roomDoorDuration(reduced)))
    } else if (phase === "room" || phase === "fromRoom") {
      roomDoorRef.current = 1
    } else {
      roomDoorRef.current = Math.max(0, roomDoorRef.current - delta * 1.4)
    }

    if (motion.mode === "enter") {
      const duration = enterDuration(reduced)
      const lead = reduced ? 0.08 : 0.36
      const moveT = Math.min(1, Math.max(0, (openingElapsed - lead) / Math.max(0.2, duration - lead)))
      sampleEnter(moveT, camera.position, look.current)
      if (openingElapsed >= duration && !motion.notified) {
        motion.notified = true
        callbacks.current.onEntered()
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
        callbacks.current.onSat()
      }
    } else if (motion.mode === "leaving") {
      motion.elapsed += delta
      motion.fade = Math.min(1, motion.elapsed / motion.duration)
      if (motion.elapsed >= motion.duration && !motion.notified) {
        motion.notified = true
        callbacks.current.onLeftHall()
      }
    } else if (motion.mode === "toRoom") {
      const lead = reduced ? 0.05 : 0.35
      const t = Math.min(1, Math.max(0, (elapsed - lead) / Math.max(0.2, motion.duration - lead)))
      const eased = smootherstep(t)
      camera.position.lerpVectors(fromP.current, toP.current, eased)
      camera.position.y += Math.sin(eased * Math.PI * 4) * 0.012
      look.current.lerpVectors(fromL.current, toL.current, eased)
      motion.fade = Math.min(1, Math.max(0, (elapsed - motion.duration * 0.62) / (motion.duration * 0.33)))
      if (elapsed >= motion.duration && !motion.notified) {
        motion.notified = true
        callbacks.current.onRoomReached()
      }
    } else if (motion.mode === "room") {
      motion.fade = Math.max(0, motion.fade - delta / (reduced ? 0.25 : 0.7))
      const goal = lookRef.current
      const ease = 1 - Math.exp(-delta * 4)
      roomTurn.current.yaw += (goal.yaw - roomTurn.current.yaw) * ease
      roomTurn.current.pitch += (goal.pitch - roomTurn.current.pitch) * ease
      const time = performance.now() / 1000
      camera.position.set(
        ROOM_VIEW.position[0] + Math.sin(time * 0.3) * 0.012,
        ROOM_VIEW.position[1] + Math.sin(time * 0.45) * 0.008,
        ROOM_VIEW.position[2],
      )
      const dx = roomBase.current.x - camera.position.x
      const dz = roomBase.current.z - camera.position.z
      const cos = Math.cos(roomTurn.current.yaw)
      const sin = Math.sin(roomTurn.current.yaw)
      look.current.set(
        camera.position.x + dx * cos - dz * sin,
        roomBase.current.y + roomTurn.current.pitch * 2.4,
        camera.position.z + dx * sin + dz * cos,
      )
    } else if (motion.mode === "fromRoom") {
      motion.elapsed += delta
      motion.fade = Math.min(1, motion.elapsed / motion.duration)
      if (motion.elapsed >= motion.duration && !motion.notified) {
        motion.notified = true
        callbacks.current.onLeftRoom()
      }
    } else {
      if (motion.fade > 0) motion.fade = Math.max(0, motion.fade - delta / (reduced ? 0.25 : 0.7))
      const time = performance.now() / 1000
      camera.position.set(
        OUTSIDE.position[0] + Math.sin(time * 0.27) * 0.04,
        OUTSIDE.position[1] + Math.sin(time * 0.41) * 0.012,
        OUTSIDE.position[2],
      )
      look.current.set(...OUTSIDE.look)
    }

    setFade(motion.fade)

    if (Math.abs(camera.fov - motion.toFov) > 0.03) {
      camera.fov += (motion.toFov - camera.fov) * (1 - Math.exp(-delta * 2.4))
      camera.updateProjectionMatrix()
    }
    camera.lookAt(look.current)
  })

  return null
}
