"use client"

import { useEffect, useMemo } from "react"
import { MeshStandardMaterial } from "three"
import { createChairGeometry } from "@/lib/chair"
import { setCursor } from "@/lib/cursor"
import { SEATS, type Phase, type Seat } from "@/lib/scene"

const LEATHER = ["#742433", "#68202e", "#812a3a", "#6c2834"]

function tintIndex(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 33 + id.charCodeAt(i)) >>> 0
  return hash % LEATHER.length
}

export function Seating({
  phase,
  activeId,
  onHover,
  onPick,
}: {
  phase: Phase
  activeId: string | null
  onHover: (id: string | null) => void
  onPick: (id: string) => void
}) {
  const geometry = useMemo(() => createChairGeometry(), [])
  const wood = useMemo(
    () => new MeshStandardMaterial({ color: "#6b4528", roughness: 0.68, metalness: 0.04 }),
    [],
  )
  const leathers = useMemo(
    () => LEATHER.map((color) => new MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.05 })),
    [],
  )
  const hot = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#b85a68",
        roughness: 0.42,
        metalness: 0.08,
        emissive: "#6a2430",
        emissiveIntensity: 0.45,
      }),
    [],
  )
  const professor = useMemo(
    () => new MeshStandardMaterial({ color: "#1d4a3a", roughness: 0.55, metalness: 0.05 }),
    [],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      wood.dispose()
      hot.dispose()
      professor.dispose()
      leathers.forEach((material) => material.dispose())
    }
  }, [geometry, hot, leathers, professor, wood])

  return (
    <group>
      {SEATS.map((seat) => (
        <Chair
          key={seat.id}
          seat={seat}
          geometry={geometry}
          wood={wood}
          cushion={activeId === seat.id ? hot : leathers[tintIndex(seat.id)]}
          enabled={phase === "inside"}
          onHover={onHover}
          onPick={onPick}
        />
      ))}
      <group position={[0, 0, -5.72]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geometry} material={wood} castShadow />
        <mesh position={[0, 0.545, 0]} material={professor} castShadow>
          <boxGeometry args={[0.36, 0.045, 0.32]} />
        </mesh>
      </group>
    </group>
  )
}

function Chair({
  seat,
  geometry,
  wood,
  cushion,
  enabled,
  onHover,
  onPick,
}: {
  seat: Seat
  geometry: ReturnType<typeof createChairGeometry>
  wood: MeshStandardMaterial
  cushion: MeshStandardMaterial
  enabled: boolean
  onHover: (id: string | null) => void
  onPick: (id: string) => void
}) {
  return (
    <group position={seat.position} rotation={[0, seat.yaw, 0]}>
      <mesh geometry={geometry} material={wood} castShadow receiveShadow />
      <mesh position={[0, 0.545, 0]} material={cushion} castShadow>
        <boxGeometry args={[0.36, 0.045, 0.32]} />
      </mesh>
      <mesh
        position={[0, 0.62, 0]}
        onClick={(event) => {
          event.stopPropagation()
          if (enabled) onPick(seat.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!enabled) return
          onHover(seat.id)
          setCursor("pointer")
        }}
        onPointerOut={() => {
          onHover(null)
          setCursor("auto")
        }}
      >
        <boxGeometry args={[0.64, 1.2, 0.78]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
