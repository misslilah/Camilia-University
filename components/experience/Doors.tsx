"use client"

import { Suspense, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  type BufferGeometry,
  type Group,
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { setCursor } from "@/lib/cursor"
import { BACK_Z, DOOR_HALF, DOOR_HEIGHT, SERIF_FONT, SILL_Y, type Phase } from "@/lib/scene"
import { getTextures } from "@/lib/textures"

const LEAF_W = DOOR_HALF + 0.004
const LEAF_H = DOOR_HEIGHT - 0.04
const LEAF_T = 0.07
const STILE = 0.15
const OPENING_W = LEAF_W - STILE * 2
const LOCK_X = LEAF_W / 2 - STILE / 2
const HANDLE_Y = -0.2

// Leaf construction from the bottom up; heights add up to LEAF_H.
const ROWS: { h: number; kind: "rail" | "panel" | "glass" }[] = [
  { h: 0.28, kind: "rail" },
  { h: 0.84, kind: "panel" },
  { h: 0.17, kind: "rail" },
  { h: 0.78, kind: "glass" },
  { h: 0.12, kind: "rail" },
  { h: 0.18, kind: "panel" },
  { h: 0.15, kind: "rail" },
]

const LINING = DOOR_HALF - 0.008
const CASING = 0.2
const HEAD_Y = DOOR_HEIGHT - 0.008
const PLINTH = 0.24
const WALL_HALF = 0.12

function grainUV(geometry: BufferGeometry, vertical: boolean, seed: number) {
  const position = geometry.getAttribute("position")
  const normal = geometry.getAttribute("normal")
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const nx = Math.abs(normal.getX(i))
    const ny = Math.abs(normal.getY(i))
    const nz = Math.abs(normal.getZ(i))
    const along = vertical ? y : x
    let across = vertical ? x : y
    if (nx > nz && nx > ny) across = z
    else if (ny > nz && ny > nx) across = z
    uv[i * 2] = across / 0.9 + seed
    uv[i * 2 + 1] = along / 2.6 + seed * 0.37
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2))
  return geometry
}

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new BoxGeometry(w, h, d).toNonIndexed().translate(x, y, z)
}

function rectShape(w: number, h: number) {
  const shape = new Shape()
  shape.moveTo(-w / 2, -h / 2)
  shape.lineTo(w / 2, -h / 2)
  shape.lineTo(w / 2, h / 2)
  shape.lineTo(-w / 2, h / 2)
  shape.closePath()
  return shape
}

// A molded block: total footprint w x h, rising from z = 0 to z = rise with rounded or chamfered edges.
function molded(w: number, h: number, rise: number, bevel: number, segments: number) {
  const thickness = Math.min(bevel, rise / 2.2)
  const geometry = new ExtrudeGeometry(rectShape(w - bevel * 2, h - bevel * 2), {
    depth: rise - thickness * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: thickness,
    bevelSegments: segments,
    curveSegments: 1,
  })
  return geometry.translate(0, 0, thickness)
}

function moldedRing(w: number, h: number, band: number, rise: number) {
  const bevel = 0.004
  const shape = rectShape(w - bevel * 2, h - bevel * 2)
  const inner = w - band * 2 + bevel * 2
  const innerH = h - band * 2 + bevel * 2
  const hole = new Path()
  hole.moveTo(-inner / 2, -innerH / 2)
  hole.lineTo(-inner / 2, innerH / 2)
  hole.lineTo(inner / 2, innerH / 2)
  hole.lineTo(inner / 2, -innerH / 2)
  hole.closePath()
  shape.holes.push(hole)
  const thickness = rise / 3
  return new ExtrudeGeometry(shape, {
    depth: rise - thickness * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: thickness,
    bevelSegments: 2,
    curveSegments: 1,
  }).translate(0, 0, thickness)
}

function onFace(geometry: BufferGeometry, face: 1 | -1, z: number) {
  geometry.translate(0, 0, z)
  if (face === -1) geometry.rotateY(Math.PI)
  return geometry
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)))
  parts.forEach((part) => part.dispose())
  if (!merged) throw new Error("Door geometry could not be merged")
  return merged
}

function layoutRows() {
  let y = -LEAF_H / 2
  return ROWS.map((row) => {
    const center = y + row.h / 2
    y += row.h
    return { ...row, y: center }
  })
}

function leafWood() {
  const parts: BufferGeometry[] = []
  let seed = 0.13
  for (const sx of [-1, 1]) {
    parts.push(grainUV(box(STILE, LEAF_H, LEAF_T, sx * LOCK_X, 0, 0), true, (seed += 0.29)))
  }
  for (const row of layoutRows()) {
    if (row.kind === "rail") {
      parts.push(grainUV(box(OPENING_W + 0.002, row.h, LEAF_T, 0, row.y, 0), false, (seed += 0.29)))
      continue
    }
    for (const face of [1, -1] as const) {
      const ring = onFace(moldedRing(OPENING_W + 0.008, row.h + 0.008, 0.026, 0.014), face, LEAF_T / 2 - 0.009)
      parts.push(grainUV(ring.translate(0, row.y, 0), true, seed))
    }
    if (row.kind === "panel") {
      parts.push(grainUV(box(OPENING_W + 0.02, row.h + 0.02, 0.026, 0, row.y, 0), true, (seed += 0.29)))
      for (const face of [1, -1] as const) {
        const field = onFace(molded(OPENING_W - 0.04, row.h - 0.04, 0.022, 0.05, 1), face, 0.012)
        parts.push(grainUV(field.translate(0, row.y, 0), true, seed + 0.5))
      }
    }
  }
  return merge(parts)
}

function leafBrass(lock: 1 | -1) {
  const x = lock * LOCK_X
  const front = LEAF_T / 2
  const parts: BufferGeometry[] = []
  parts.push(new CylinderGeometry(0.011, 0.011, 0.6, 16).translate(x, HANDLE_Y, front + 0.058))
  for (const dy of [-0.23, 0.23]) {
    parts.push(new CylinderGeometry(0.008, 0.008, 0.058, 10).rotateX(Math.PI / 2).translate(x, HANDLE_Y + dy, front + 0.029))
    parts.push(new CylinderGeometry(0.02, 0.022, 0.006, 20).rotateX(Math.PI / 2).translate(x, HANDLE_Y + dy, front + 0.003))
  }
  parts.push(box(0.1, 0.34, 0.004, x, HANDLE_Y + 0.08, -front - 0.002))
  return merge(parts)
}

function kickPlates() {
  return merge(
    [1, -1].map((face) => box(LEAF_W - 0.08, 0.2, 0.003, 0, -LEAF_H / 2 + 0.13, face * (LEAF_T / 2 + 0.0015))),
  )
}

function doorwayWood() {
  const parts: BufferGeometry[] = []
  const legX = LINING + CASING / 2
  const legH = HEAD_Y - PLINTH
  const headW = (LINING + CASING) * 2 + 0.02
  const headY = HEAD_Y + CASING / 2
  for (const face of [1, -1] as const) {
    const side = (geometry: BufferGeometry, vertical: boolean, seed: number) =>
      parts.push(grainUV(onFace(geometry, face, WALL_HALF + 0.001), vertical, seed))
    for (const sx of [-1, 1]) {
      side(molded(CASING, legH, 0.036, 0.01, 3).translate(sx * legX, PLINTH + legH / 2, 0), true, 0.2 + sx * 0.3)
      side(molded(0.028, legH, 0.05, 0.01, 3).translate(sx * (LINING + 0.014), PLINTH + legH / 2, 0), true, 0.6)
      side(molded(0.036, legH, 0.054, 0.012, 3).translate(sx * (LINING + CASING - 0.018), PLINTH + legH / 2, 0), true, 0.8)
      side(molded(CASING + 0.04, PLINTH, 0.064, 0.008, 2).translate(sx * legX, PLINTH / 2, 0), true, 0.1)
    }
    side(molded(headW, CASING, 0.036, 0.01, 3).translate(0, headY, 0), false, 0.4)
    side(molded(LINING * 2 + 0.056, 0.028, 0.05, 0.01, 3).translate(0, HEAD_Y + 0.014, 0), false, 0.7)
    side(molded(headW, 0.036, 0.054, 0.012, 3).translate(0, HEAD_Y + CASING - 0.018, 0), false, 0.9)
    const friezeY = HEAD_Y + CASING
    side(box(headW - 0.04, 0.07, 0.03, 0, friezeY + 0.035, 0.015), false, 0.3)
    side(molded(headW + 0.05, 0.035, 0.06, 0.012, 3).translate(0, friezeY + 0.0875, 0), false, 0.5)
    side(box(headW + 0.15, 0.05, 0.1, 0, friezeY + 0.13, 0.05), false, 0.15)
    side(molded(headW + 0.19, 0.025, 0.115, 0.01, 2).translate(0, friezeY + 0.1675, 0), false, 0.65)
  }
  for (const sx of [-1, 1]) {
    parts.push(grainUV(box(0.11, DOOR_HEIGHT + 0.004, WALL_HALF * 2 + 0.008, sx * (LINING + 0.055), DOOR_HEIGHT / 2, 0), true, 0.45))
  }
  parts.push(grainUV(box(LINING * 2 + 0.22, 0.08, WALL_HALF * 2 + 0.008, 0, HEAD_Y + 0.04, 0), false, 0.55))
  return merge(parts).translate(0, SILL_Y, BACK_Z + WALL_HALF)
}

function useDoorAssets() {
  return useMemo(() => {
    const textures = getTextures()
    return {
      wood: new MeshPhysicalMaterial({
        map: textures.walnut,
        color: "#f2e4d8",
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.55,
        clearcoatRoughness: 0.32,
      }),
      brass: new MeshStandardMaterial({ color: "#c9a35c", metalness: 0.72, roughness: 0.3 }),
      satinBrass: new MeshStandardMaterial({ color: "#d2b075", metalness: 0.35, roughness: 0.38 }),
      glass: new MeshPhysicalMaterial({
        color: "#c4d1cc",
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
      kickPlates: kickPlates(),
      leafWood: leafWood(),
      brassLeft: leafBrass(1),
      brassRight: leafBrass(-1),
      glassPane: new BoxGeometry(OPENING_W + 0.01, ROWS[3].h + 0.01, 0.006),
      glassY: layoutRows()[3].y,
      doorway: doorwayWood(),
    }
  }, [])
}

type DoorAssets = ReturnType<typeof useDoorAssets>

export function Doors({
  openRef,
  phase,
  onOpen,
}: {
  openRef: { current: number }
  phase: Phase
  onOpen: () => void
}) {
  const assets = useDoorAssets()
  return (
    <group>
      <Leaf side={-1} assets={assets} openRef={openRef} phase={phase} onOpen={onOpen} />
      <Leaf side={1} assets={assets} openRef={openRef} phase={phase} onOpen={onOpen} />
      <mesh geometry={assets.doorway} material={assets.wood} castShadow receiveShadow />
      <Plaque brass={assets.brass} />
    </group>
  )
}

function Leaf({
  side,
  assets,
  openRef,
  phase,
  onOpen,
}: {
  side: -1 | 1
  assets: DoorAssets
  openRef: { current: number }
  phase: Phase
  onOpen: () => void
}) {
  const ref = useRef<Group>(null)
  const y = SILL_Y + DOOR_HEIGHT / 2

  useFrame(() => {
    if (!ref.current) return
    ref.current.rotation.y = -side * openRef.current * 1.22
  })

  return (
    <group ref={ref} position={[side * DOOR_HALF, y, BACK_Z + (side === 1 ? 0.082 : 0.07)]}>
      <group
        position={[-side * (LEAF_W / 2), 0, 0]}
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
        <mesh geometry={assets.leafWood} material={assets.wood} castShadow receiveShadow />
        <mesh geometry={side === -1 ? assets.brassLeft : assets.brassRight} material={assets.brass} castShadow />
        <mesh geometry={assets.kickPlates} material={assets.satinBrass} />
        <mesh geometry={assets.glassPane} material={assets.glass} position={[0, assets.glassY, 0]} />
      </group>
    </group>
  )
}

function Plaque({ brass }: { brass: MeshStandardMaterial }) {
  const face = BACK_Z + 0.24
  const x = -(LINING + CASING) - 0.42
  const y = SILL_Y + 1.52
  const plate = useMemo(() => molded(0.5, 0.1, 0.008, 0.004, 1), [])
  return (
    <group position={[x, y, face]}>
      <mesh geometry={plate} material={brass} />
      <Suspense fallback={null}>
        <Text
          font={SERIF_FONT}
          position={[0, 0, 0.0095]}
          fontSize={0.036}
          letterSpacing={0.18}
          color="#3a2718"
          anchorX="center"
          anchorY="middle"
        >
          AMPHITHEATER I
        </Text>
      </Suspense>
    </group>
  )
}
