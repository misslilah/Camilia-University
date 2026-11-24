"use client"

import { useEffect, useState } from "react"
import { DoubleSide } from "three"
import { setCursor } from "@/lib/cursor"
import { loadBottleArt, type BottleArt } from "@/lib/bottle-art"

export function useBottleArt() {
  const [art, setArt] = useState<BottleArt | null>(null)
  useEffect(() => {
    let live = true
    loadBottleArt()
      .then((next) => {
        if (live) setArt(next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return art
}

function usePointer(active: boolean) {
  const [hover, setHover] = useState(false)
  const bind = {
    onPointerOver: (event: { stopPropagation: () => void }) => {
      if (!active) return
      event.stopPropagation()
      setHover(true)
      setCursor("pointer")
    },
    onPointerOut: () => {
      setHover(false)
      if (active) setCursor("auto")
    },
  }
  return [hover, bind] as const
}

export function DeskBottle({
  active,
  art,
  onToggle,
}: {
  active: boolean
  art: BottleArt | null
  onToggle: () => void
}) {
  const [hover, bind] = usePointer(active)
  const bodyR = 0.022
  const bodyH = 0.09
  const capH = 0.02
  const capR = 0.0205
  const capY = bodyH + capH / 2
  return (
    <group
      position={[0.47, hover ? 0.766 : 0.758, 0.2]}
      rotation={[0, -0.35, 0]}
      onClick={(event) => {
        if (!active) return
        event.stopPropagation()
        if (event.delta >= 10) return
        setCursor("auto")
        onToggle()
      }}
      {...bind}
    >
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[0.07, 0.14, 0.07]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, bodyH / 2, 0]} castShadow>
        <cylinderGeometry args={[bodyR, bodyR * 1.02, bodyH, 28]} />
        <meshStandardMaterial
          map={art?.metal}
          color={art ? "#ffffff" : "#d7dce0"}
          metalness={0.78}
          roughness={0.32}
        />
      </mesh>
      <mesh position={[0, bodyH * 0.48, bodyR + 0.001]}>
        <planeGeometry args={[0.034, 0.052]} />
        <meshBasicMaterial map={art?.label} color={art ? "#ffffff" : "#f4f4f2"} toneMapped={false} />
      </mesh>
      <mesh position={[0, capY, 0]} castShadow>
        <cylinderGeometry args={[capR, capR, capH, 24]} />
        <meshStandardMaterial color="#121212" roughness={0.55} metalness={0.18} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * (capR + 0.0006), capY, Math.cos(a) * (capR + 0.0006)]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.0024, capH * 0.86, 0.0028]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.45} />
          </mesh>
        )
      })}
      <mesh position={[0, bodyH + capH + 0.001, 0]}>
        <cylinderGeometry args={[capR * 0.92, capR * 0.92, 0.003, 24]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.4} />
      </mesh>
    </group>
  )
}

export function CupboardGoods({
  art,
  bottle,
  active,
  onBottle,
}: {
  art: BottleArt | null
  bottle: boolean
  active: boolean
  onBottle: () => void
}) {
  const [hover, bind] = usePointer(active && bottle)
  return (
    <group>
      <group position={[-0.09, 0.316, -0.02]} rotation={[0, 0.18, 0]}>
        <mesh>
          <boxGeometry args={[0.078, 0.011, 0.054]} />
          <meshStandardMaterial color="#7a2433" roughness={0.72} />
        </mesh>
        <mesh position={[0.037, 0, 0]}>
          <boxGeometry args={[0.005, 0.009, 0.046]} />
          <meshStandardMaterial color="#f3ead7" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.006, 0]}>
          <boxGeometry args={[0.062, 0.001, 0.004]} />
          <meshStandardMaterial color="#e4c98a" roughness={0.45} />
        </mesh>
      </group>

      <group position={[0.09, 0.316, -0.035]} rotation={[0, -0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.042, 0.012, 0.034]} />
          <meshStandardMaterial color="#f7f7f5" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.0064, 0]}>
          <boxGeometry args={[0.042, 0.001, 0.0016]} />
          <meshStandardMaterial color="#b9b9b4" roughness={0.5} />
        </mesh>
      </group>

      <group position={[0.055, 0.312, 0.1]} rotation={[0, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[0.072, 0.004, 0.018]} />
          <meshBasicMaterial color="#141414" />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[-0.028 + i * 0.008, 0, 0.013]}>
            <boxGeometry args={[0.0024, 0.003, 0.01]} />
            <meshBasicMaterial color="#141414" />
          </mesh>
        ))}
      </group>

      {bottle && (
        <group
          position={[-0.01, 0.314, 0.03]}
          rotation={[0, -0.2, 0]}
          scale={hover ? 1.05 : 1}
          onClick={(event) => {
            if (!active) return
            event.stopPropagation()
            if (event.delta >= 10) return
            setCursor("auto")
            onBottle()
          }}
          {...bind}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.002, 0.001, 0.004]}>
            <planeGeometry args={[0.034, 0.1]} />
            <meshBasicMaterial color="#2a241c" transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} castShadow>
            <planeGeometry args={[0.044, 0.12]} />
            <meshBasicMaterial map={art?.card} transparent alphaTest={0.15} toneMapped={false} side={DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
            <planeGeometry args={[0.06, 0.14]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
