"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"
import { setCursor } from "@/lib/cursor"
import { BACK_Z, DOOR_HALF, DOOR_HEIGHT, SILL_Y, type Phase } from "@/lib/scene"

export function Doors({
  openRef,
  phase,
  onOpen,
}: {
  openRef: { current: number }
  phase: Phase
  onOpen: () => void
}) {
  return (
    <group>
      <Leaf side={-1} openRef={openRef} phase={phase} onOpen={onOpen} />
      <Leaf side={1} openRef={openRef} phase={phase} onOpen={onOpen} />
    </group>
  )
}

function Leaf({
  side,
  openRef,
  phase,
  onOpen,
}: {
  side: -1 | 1
  openRef: { current: number }
  phase: Phase
  onOpen: () => void
}) {
  const ref = useRef<Group>(null)
  const width = DOOR_HALF + 0.02
  const y = SILL_Y + DOOR_HEIGHT / 2

  useFrame(() => {
    if (!ref.current) return
    ref.current.rotation.y = -side * openRef.current * 1.22
  })

  return (
    <group ref={ref} position={[side * DOOR_HALF, y, BACK_Z + (side === 1 ? 0.082 : 0.07)]}>
      <mesh
        position={[-side * (width / 2), 0, 0]}
        castShadow
        onClick={(event) => {
          event.stopPropagation()
          if (phase === "arrival") onOpen()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (phase === "arrival") setCursor("pointer")
        }}
        onPointerOut={() => {
          setCursor("auto")
        }}
      >
        <boxGeometry args={[width, DOOR_HEIGHT - 0.04, 0.07]} />
        <meshStandardMaterial color="#5b3b22" roughness={0.62} metalness={0.04} />
      </mesh>
      {[0.42, -0.42].map((panelY) => (
        <mesh key={panelY} position={[-side * (width / 2), panelY, 0.04]}>
          <boxGeometry args={[width - 0.22, DOOR_HEIGHT * 0.32, 0.012]} />
          <meshStandardMaterial color="#6d4a2c" roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[-side * (width - 0.16), -0.05, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.42, 10]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[-side * (width - 0.16), 0.18, 0.06]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[-side * (width - 0.16), -0.28, 0.06]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.72} roughness={0.28} />
      </mesh>
    </group>
  )
}
