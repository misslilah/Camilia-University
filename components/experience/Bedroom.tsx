"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import { BackSide, DoubleSide, Object3D, PlaneGeometry, type Group, type PointLight, type SpotLight } from "three"
import { Reflector } from "three/examples/jsm/objects/Reflector.js"
import { Avatar } from "@/components/experience/Avatar"
import { AVATAR_LAYER, type Character } from "@/lib/avatar"
import { setCursor } from "@/lib/cursor"
import {
  AVATAR_SPOT,
  DESK,
  MIRROR,
  ROOM,
  ROOM_DOOR,
  ROOM_ORIGIN,
  SERIF_FONT,
  SILL_Y,
  WARDROBE,
  inRoom,
  smootherstep,
  type Phase,
} from "@/lib/scene"
import { getRoomTextures, getTextures } from "@/lib/textures"

const HALF_W = ROOM.width / 2
const HALF_D = ROOM.depth / 2
const H = ROOM.height
const WALL = 0.12

const WINDOW = { z0: -1.45, z1: -0.25, y0: 0.95, y1: 2.12 }
const ENTRY_X = 0.3

type Box = [x: number, y: number, z: number, w: number, h: number, d: number]

function Block({
  box,
  color,
  roughness = 0.7,
  metalness = 0,
  shadow = true,
}: {
  box: Box
  color: string
  roughness?: number
  metalness?: number
  shadow?: boolean
}) {
  const [x, y, z, w, h, d] = box
  return (
    <mesh position={[x, y, z]} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

export function Bedroom({
  phase,
  reduced,
  character,
  avatarYawRef,
  onWardrobe,
  onComputer,
}: {
  phase: Phase
  reduced: boolean
  character: Character | null
  avatarYawRef: { current: number }
  onWardrobe: () => void
  onComputer: () => void
}) {
  const active = inRoom(phase)
  return (
    <group>
      <group position={ROOM_ORIGIN} visible={phase !== "inside" && phase !== "sitting" && phase !== "opening" && phase !== "leaving"}>
        <Shell />
        <Bed />
        <Nightstand />
        <Desk phase={phase} onOpen={onComputer} />
        <DeskChair />
        <Wardrobe phase={phase} onOpen={onWardrobe} reduced={reduced} />
        <Mirror lit={active} />
        <Decor />
        <RoomLights active={active} />
      </group>
      {character && (
        <Avatar
          character={character}
          visible={phase === "wardrobe"}
          position={AVATAR_SPOT}
          facing={Math.PI / 2}
          yawRef={avatarYawRef}
          reduced={reduced}
        />
      )}
    </group>
  )
}

function Shell() {
  const t = useMemo(() => getRoomTextures(), [])
  const windowH = WINDOW.y1 - WINDOW.y0
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial map={t.floor} roughness={0.62} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#f1efe9" roughness={0.95} />
      </mesh>

      <WallBox box={[0, H / 2, -HALF_D - WALL / 2, ROOM.width + WALL * 2, H, WALL]} />
      <WallBox box={[HALF_W + WALL / 2, H / 2, 0, WALL, H, ROOM.depth]} />
      <WallBox box={[0, H / 2, HALF_D + WALL / 2, ROOM.width + WALL * 2, H, WALL]} />

      <WallBox box={[-HALF_W - WALL / 2, WINDOW.y0 / 2, 0, WALL, WINDOW.y0, ROOM.depth]} />
      <WallBox box={[-HALF_W - WALL / 2, (WINDOW.y1 + H) / 2, 0, WALL, H - WINDOW.y1, ROOM.depth]} />
      <WallBox
        box={[-HALF_W - WALL / 2, (WINDOW.y0 + WINDOW.y1) / 2, (-HALF_D + WINDOW.z0) / 2, WALL, windowH, WINDOW.z0 + HALF_D]}
      />
      <WallBox
        box={[-HALF_W - WALL / 2, (WINDOW.y0 + WINDOW.y1) / 2, (WINDOW.z1 + HALF_D) / 2, WALL, windowH, HALF_D - WINDOW.z1]}
      />

      {[
        [0, 0.05, -HALF_D + 0.012, ROOM.width, 0.1, 0.024],
        [HALF_W - 0.012, 0.05, 0, 0.024, 0.1, ROOM.depth],
        [-HALF_W + 0.012, 0.05, 0, 0.024, 0.1, ROOM.depth],
        [0, 0.05, HALF_D - 0.012, ROOM.width, 0.1, 0.024],
      ].map((box, i) => (
        <Block key={i} box={box as Box} color="#f4f2ec" roughness={0.5} shadow={false} />
      ))}

      <Window />
      <EntryDoor />
    </group>
  )
}

function WallBox({ box }: { box: Box }) {
  const t = useMemo(() => getRoomTextures(), [])
  const [x, y, z, w, h, d] = box
  return (
    <mesh position={[x, y, z]} receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial map={t.wall} roughness={0.92} />
    </mesh>
  )
}

function Window() {
  const t = useMemo(() => getRoomTextures(), [])
  const cy = (WINDOW.y0 + WINDOW.y1) / 2
  const cz = (WINDOW.z0 + WINDOW.z1) / 2
  const w = WINDOW.z1 - WINDOW.z0
  const h = WINDOW.y1 - WINDOW.y0
  const x = -HALF_W - WALL / 2
  return (
    <group>
      <mesh position={[x - 0.9, cy, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w * 2.6, h * 2.2]} />
        <meshBasicMaterial map={t.sky} toneMapped={false} />
      </mesh>
      <mesh position={[x, cy, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#dfefff" transparent opacity={0.12} roughness={0.05} side={DoubleSide} />
      </mesh>
      {[
        [x + 0.02, WINDOW.y0 - 0.02, cz, 0.18, 0.05, w + 0.16],
        [x + 0.02, WINDOW.y1 + 0.02, cz, 0.08, 0.05, w + 0.16],
        [x + 0.02, cy, WINDOW.z0 - 0.02, 0.08, h + 0.08, 0.05],
        [x + 0.02, cy, WINDOW.z1 + 0.02, 0.08, h + 0.08, 0.05],
        [x, cy, cz, 0.04, h, 0.035],
        [x, cy + 0.12, cz, 0.04, 0.035, w],
      ].map((box, i) => (
        <Block key={i} box={box as Box} color="#f6f4ee" roughness={0.45} shadow={false} />
      ))}
      <Block box={[-HALF_W + 0.03, WINDOW.y1 + 0.16, cz, 0.03, 0.03, w + 0.9]} color="#3a3d44" metalness={0.5} roughness={0.4} shadow={false} />
      {[WINDOW.z0 - 0.26, WINDOW.z1 + 0.26].map((z) => (
        <mesh key={z} position={[-HALF_W + 0.07, (WINDOW.y1 + 0.16 + 0.75) / 2, z]} castShadow>
          <boxGeometry args={[0.05, WINDOW.y1 + 0.16 - 0.75, 0.36]} />
          <meshStandardMaterial color="#e6ddc8" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function EntryDoor() {
  return (
    <group position={[ENTRY_X, 0, HALF_D - 0.02]}>
      <Block box={[0, 1.06, 0, 0.84, 2.12, 0.04]} color="#efe9dc" roughness={0.55} shadow={false} />
      <Block box={[-0.46, 1.08, -0.01, 0.07, 2.2, 0.05]} color="#f6f4ee" shadow={false} />
      <Block box={[0.46, 1.08, -0.01, 0.07, 2.2, 0.05]} color="#f6f4ee" shadow={false} />
      <Block box={[0, 2.19, -0.01, 0.99, 0.07, 0.05]} color="#f6f4ee" shadow={false} />
      <Block box={[0.32, 1.0, -0.05, 0.12, 0.025, 0.04]} color="#b7bcc4" metalness={0.8} roughness={0.25} shadow={false} />
    </group>
  )
}

function Bed() {
  const t = useMemo(() => getRoomTextures(), [])
  const x = -HALF_W + 0.5
  const length = 2.02
  const z = -HALF_D + length / 2 + 0.02
  return (
    <group position={[x, 0, z]}>
      <Block box={[0, 0.2, 0, 0.98, 0.24, length]} color="#a87a4f" roughness={0.6} />
      {[
        [-0.45, 0.06, -length / 2 + 0.06],
        [0.45, 0.06, -length / 2 + 0.06],
        [-0.45, 0.06, length / 2 - 0.06],
        [0.45, 0.06, length / 2 - 0.06],
      ].map((p, i) => (
        <Block key={i} box={[p[0], p[1], p[2], 0.07, 0.12, 0.07]} color="#8a6240" />
      ))}
      <Block box={[0, 0.62, -length / 2 + 0.03, 0.98, 0.95, 0.06]} color="#a87a4f" roughness={0.6} />
      <Block box={[0, 0.39, length / 2 - 0.03, 0.98, 0.42, 0.05]} color="#a87a4f" roughness={0.6} />
      <Block box={[0, 0.39, 0, 0.9, 0.16, length - 0.12]} color="#f2f1ec" roughness={0.9} />
      <mesh position={[0, 0.49, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.07, length - 0.46]} />
        <meshStandardMaterial map={t.duvet} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.43, 0.2]} castShadow>
        <boxGeometry args={[1.0, 0.18, length - 0.5]} />
        <meshStandardMaterial map={t.duvet} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.535, -length / 2 + 0.28]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.66, 0.12, 0.36]} />
        <meshStandardMaterial color="#f7f6f1" roughness={0.95} />
      </mesh>
      <Block box={[0.25, 0.55, 0.15, 0.32, 0.05, 0.24]} color="#e1b54a" roughness={0.7} />
    </group>
  )
}

function Nightstand() {
  const x = -HALF_W + 1.25
  const z = -HALF_D + 0.26
  return (
    <group position={[x, 0, z]}>
      <Block box={[0, 0.27, 0, 0.42, 0.54, 0.4]} color="#f2efe7" roughness={0.6} />
      <Block box={[0, 0.36, 0.205, 0.36, 0.005, 0.01]} color="#c8c2b4" shadow={false} />
      <Block box={[0, 0.42, 0.212, 0.1, 0.02, 0.02]} color="#9aa0a8" metalness={0.7} roughness={0.3} shadow={false} />
      <mesh position={[0.06, 0.58, -0.02]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.06, 20]} />
        <meshStandardMaterial color="#2f4f7c" roughness={0.5} />
      </mesh>
      <mesh position={[0.06, 0.7, -0.02]}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 10]} />
        <meshStandardMaterial color="#d6d2c8" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0.06, 0.84, -0.02]}>
        <cylinderGeometry args={[0.08, 0.12, 0.13, 24, 1, true]} />
        <meshStandardMaterial color="#fbf1dc" emissive="#ffd9a0" emissiveIntensity={0.55} side={DoubleSide} roughness={0.9} />
      </mesh>
      <Block box={[-0.11, 0.565, 0.06, 0.14, 0.03, 0.2]} color="#c0392b" roughness={0.7} />
    </group>
  )
}

function Desk({ phase, onOpen }: { phase: Phase; onOpen: () => void }) {
  const t = useMemo(() => getRoomTextures(), [])
  const enabled = phase === "room"
  const [hover, setHover] = useState(false)
  const lit = hover && enabled

  useEffect(() => {
    if (!enabled) setCursor("auto")
  }, [enabled])

  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <Block box={[0, 0.74, 0, 1.36, 0.035, 0.64]} color="#f0ede6" roughness={0.45} />
      {[
        [-0.64, -0.28],
        [0.64, -0.28],
        [-0.64, 0.28],
        [0.64, 0.28],
      ].map(([lx, lz], i) => (
        <Block key={i} box={[lx, 0.36, lz, 0.04, 0.72, 0.04]} color="#2c2f36" metalness={0.6} roughness={0.35} />
      ))}
      <Block box={[0, 0.66, -0.29, 1.28, 0.1, 0.02]} color="#2c2f36" metalness={0.6} roughness={0.35} />

      <group
        position={[-0.08, 0.758, -0.12]}
        onClick={(event) => {
          event.stopPropagation()
          if (enabled && event.delta < 10) onOpen()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          if (!enabled) return
          setHover(true)
          setCursor("pointer")
        }}
        onPointerOut={() => {
          setHover(false)
          setCursor("auto")
        }}
      >
        <Block box={[0, 0.006, 0, 0.24, 0.012, 0.16]} color="#24272e" metalness={0.4} roughness={0.4} />
        <Block box={[0, 0.15, -0.02, 0.04, 0.28, 0.03]} color="#24272e" metalness={0.4} roughness={0.4} />
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.66, 0.4, 0.035]} />
          <meshStandardMaterial color="#121318" roughness={0.35} emissive={lit ? "#3d6fd1" : "#000000"} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.43, 0.019]}>
          <planeGeometry args={[0.62, 0.35]} />
          <meshStandardMaterial map={t.screen} emissiveMap={t.screen} emissive="#ffffff" emissiveIntensity={lit ? 1.2 : 0.95} roughness={0.3} />
        </mesh>
      </group>

      <group position={[-0.1, 0.758, 0.12]}>
        <Block box={[0, 0.002, 0, 0.82, 0.004, 0.32]} color="#1d2433" roughness={0.95} shadow={false} />
        <Block box={[-0.06, 0.012, 0, 0.44, 0.02, 0.14]} color="#2a2d34" roughness={0.5} />
        <Block box={[-0.06, 0.024, 0, 0.41, 0.006, 0.12]} color="#5c616b" roughness={0.6} shadow={false} />
        <mesh position={[0.27, 0.018, 0.01]} scale={[1, 0.5, 1.5]} castShadow>
          <sphereGeometry args={[0.032, 16, 12]} />
          <meshStandardMaterial color="#2a2d34" roughness={0.4} />
        </mesh>
      </group>

      <group position={[0.5, 0.758, -0.16]}>
        <Block box={[0, 0.11, 0, 0.1, 0.22, 0.1]} color="#202228" roughness={0.5} />
        <mesh position={[0, 0.13, 0.051]}>
          <circleGeometry args={[0.032, 20]} />
          <meshStandardMaterial color="#3a3d44" roughness={0.6} />
        </mesh>
      </group>
      <group position={[-0.62, 0.758, -0.16]}>
        <Block box={[0, 0.11, 0, 0.1, 0.22, 0.1]} color="#202228" roughness={0.5} />
        <mesh position={[0, 0.13, 0.051]}>
          <circleGeometry args={[0.032, 20]} />
          <meshStandardMaterial color="#3a3d44" roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[0.36, 0.81, 0.18]} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 18]} />
        <meshStandardMaterial color="#e85d3a" roughness={0.5} />
      </mesh>

      <group position={[0.46, 0, 0.02]}>
        <Block box={[0, 0.25, 0, 0.21, 0.46, 0.46]} color="#16181d" metalness={0.3} roughness={0.4} />
        <Block box={[-0.106, 0.25, 0, 0.004, 0.38, 0.38]} color="#1f2a3a" roughness={0.2} shadow={false} />
        <mesh position={[0, 0.25, 0.232]}>
          <planeGeometry args={[0.012, 0.38]} />
          <meshStandardMaterial color="#58a6ff" emissive="#3d8bff" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
        <mesh position={[0.05, 0.43, 0.232]}>
          <circleGeometry args={[0.012, 14]} />
          <meshStandardMaterial color="#9fe0ff" emissive="#7fd4ff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function DeskChair() {
  const x = 0.32
  const z = -HALF_D + 1.02
  return (
    <group position={[x, 0, z]} rotation={[0, 0.42, 0]}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Block box={[0.15, 0.07, 0, 0.3, 0.035, 0.05]} color="#1b1d22" metalness={0.4} roughness={0.4} />
            <mesh position={[0.29, 0.03, 0]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <meshStandardMaterial color="#111216" roughness={0.6} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.36, 12]} />
        <meshStandardMaterial color="#8d9198" metalness={0.8} roughness={0.25} />
      </mesh>
      <Block box={[0, 0.48, 0, 0.5, 0.08, 0.48]} color="#1d2433" roughness={0.75} />
      <Block box={[0, 0.48, 0.0, 0.38, 0.085, 0.36]} color="#2f5fa8" roughness={0.8} shadow={false} />
      <Block box={[0, 0.84, 0.24, 0.46, 0.62, 0.07]} color="#1d2433" roughness={0.75} />
      <Block box={[0, 0.86, 0.204, 0.14, 0.5, 0.006]} color="#2f5fa8" roughness={0.8} shadow={false} />
      <Block box={[0, 0.58, 0.24, 0.06, 0.14, 0.05]} color="#1b1d22" />
      {[-0.27, 0.27].map((ax) => (
        <group key={ax}>
          <Block box={[ax, 0.6, 0.02, 0.04, 0.2, 0.04]} color="#1b1d22" />
          <Block box={[ax, 0.7, 0.0, 0.07, 0.03, 0.28]} color="#1d2433" />
        </group>
      ))}
    </group>
  )
}

const HANGING = [
  { z: -0.4, color: "#eeece6", length: 0.72 },
  { z: -0.29, color: "#26334a", length: 0.86 },
  { z: -0.18, color: "#9c9d9f", length: 0.7 },
  { z: -0.06, color: "#b0875a", length: 1.02 },
  { z: 0.06, color: "#6d8fb5", length: 0.74 },
  { z: 0.17, color: "#202024", length: 0.9 },
  { z: 0.27, color: "#d9c9ae", length: 0.68 },
  { z: 0.37, color: "#5d7598", length: 0.8 },
]

const FOLDED = [
  ["#28334d", "#56729b", "#c3b59b"],
  ["#eeece6", "#8b9a7c", "#6f2534", "#9c9d9f"],
]

function Wardrobe({
  phase,
  onOpen,
  reduced,
}: {
  phase: Phase
  onOpen: () => void
  reduced: boolean
}) {
  const { width: w, depth: d, height: h, x, z } = WARDROBE
  const wood = "#b98d5d"
  const inside = "#dcc39e"
  const t = 0.022
  const enabled = phase === "room"
  const [hover, setHover] = useState(false)
  const doors = useRef<(Group | null)[]>([])
  const amount = useRef(0)
  const glow = hover && enabled ? "#5a3a16" : "#000000"

  useEffect(() => {
    if (!enabled) setCursor("auto")
  }, [enabled])

  useFrame((_, delta) => {
    const target = phase === "wardrobe" ? 1 : 0
    const speed = reduced ? 6 : target ? 1.25 : 1.6
    amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), delta * speed)
    const eased = smootherstep(amount.current)
    doors.current.forEach((door, i) => {
      if (door) door.rotation.y = (i === 0 ? -1 : 1) * eased * 1.78
    })
  })

  return (
    <group
      position={[x, 0, z]}
      onClick={(event) => {
        event.stopPropagation()
        if (enabled && event.delta < 10) onOpen()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (!enabled) return
        setHover(true)
        setCursor("pointer")
      }}
      onPointerOut={() => {
        setHover(false)
        setCursor("auto")
      }}
    >
      <Block box={[d / 2 - t / 2, h / 2 + 0.06, 0, t, h, w]} color={inside} roughness={0.7} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, h / 2 + 0.06, side * (w / 2 - t / 2)]} castShadow receiveShadow>
          <boxGeometry args={[d, h, t]} />
          <meshStandardMaterial color={wood} roughness={0.62} emissive={glow} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <Block box={[0, 0.06 + t / 2, 0, d, t, w - 2 * t]} color={inside} roughness={0.7} />
      <Block box={[0, h + 0.06 - t / 2, 0, d, t, w - 2 * t]} color={wood} roughness={0.62} />
      <Block box={[0.01, 1.92, 0, d - 0.04, 0.02, w - 2 * t]} color={inside} roughness={0.7} />
      <Block box={[-d / 2 + 0.03, 0.03 + 0.06, 0, 0.02, 0.06, w - 2 * t]} color={wood} shadow={false} />
      {[-w / 2 + 0.06, w / 2 - 0.06].map((fz) =>
        [-d / 2 + 0.05, d / 2 - 0.05].map((fx) => (
          <Block key={`${fx}-${fz}`} box={[fx, 0.03, fz, 0.06, 0.06, 0.06]} color="#7a5634" />
        )),
      )}
      <Block box={[0.02, h + 0.1, 0, d + 0.06, 0.04, w + 0.06]} color="#a47a4d" roughness={0.6} />

      <mesh position={[0.02, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, w - 2 * t, 12]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.25} />
      </mesh>
      {HANGING.map((item) => (
        <group key={item.z} position={[0.02, 1.8, item.z]}>
          <mesh position={[0, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.022, 0.003, 6, 16, Math.PI * 1.3]} />
            <meshStandardMaterial color="#8d9198" metalness={0.8} roughness={0.3} />
          </mesh>
          <Block box={[0, -0.03, 0, 0.4, 0.016, 0.012]} color="#7a5634" shadow={false} />
          <mesh position={[0, -0.04 - item.length / 2, 0]} castShadow>
            <boxGeometry args={[0.42, item.length, 0.04]} />
            <meshStandardMaterial color={item.color} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {FOLDED.map((stack, i) =>
        stack.map((color, j) => (
          <Block
            key={`${i}-${j}`}
            box={[0.02, 1.93 + 0.022 + j * 0.034, (i === 0 ? -0.24 : 0.2), 0.3, 0.032, 0.34]}
            color={color}
            roughness={0.92}
            shadow={false}
          />
        )),
      )}
      {[-0.32, -0.14].map((sz) => (
        <group key={sz} position={[-0.06, 0.08, sz]}>
          <Block box={[0, 0.04, -0.04, 0.24, 0.07, 0.08]} color="#f1f0eb" />
          <Block box={[0, 0.04, 0.05, 0.24, 0.07, 0.08]} color="#f1f0eb" />
        </group>
      ))}

      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(node) => {
            doors.current[i] = node
          }}
          position={[-d / 2 - 0.012, h / 2 + 0.06, side * (w / 2 - 0.006)]}
        >
          <group position={[0, 0, -side * (w / 4 - 0.003)]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.024, h - 0.06, w / 2 - 0.012]} />
              <meshStandardMaterial color="#c49868" roughness={0.55} emissive={glow} emissiveIntensity={0.35} />
            </mesh>
            {[0.52, 1.5].map((py) => (
              <mesh key={py} position={[-0.014, py + 0.06 - (h / 2 + 0.06), 0]}>
                <boxGeometry args={[0.006, 0.78, w / 2 - 0.14]} />
                <meshStandardMaterial color="#b38658" roughness={0.6} emissive={glow} emissiveIntensity={0.35} />
              </mesh>
            ))}
            <mesh position={[0.013, 0, 0]}>
              <boxGeometry args={[0.002, h - 0.1, w / 2 - 0.05]} />
              <meshStandardMaterial color={inside} roughness={0.7} />
            </mesh>
            <mesh position={[-0.038, 1.12 - (h / 2 + 0.06), -side * (w / 4 - 0.05)]} castShadow>
              <cylinderGeometry args={[0.009, 0.009, 0.2, 10]} />
              <meshStandardMaterial color="#3a3d44" metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        </group>
      ))}
      <Block box={[0, h + 0.2, 0.12, 0.42, 0.16, 0.5]} color="#c9a57a" roughness={0.85} />
      <Block box={[0, h + 0.33, 0.05, 0.36, 0.1, 0.42]} color="#5d7ea8" roughness={0.85} />
    </group>
  )
}

function Mirror({ lit }: { lit: boolean }) {
  const { x, z, width, height, bottom } = MIRROR
  const cy = bottom + height / 2
  const frame = "#b98d5d"
  const lamp = useRef<PointLight>(null)
  const reflector = useMemo(() => {
    const glass = new Reflector(new PlaneGeometry(width, height), {
      textureWidth: 768,
      textureHeight: 768,
      color: 0xe4e8eb,
      clipBias: 0.003,
      multisample: 0,
    })
    glass.position.set(x, cy, z)
    glass.rotation.y = -Math.PI / 2
    return glass
  }, [x, z, width, height, cy])

  useEffect(() => () => reflector.dispose(), [reflector])

  useFrame(({ camera }) => {
    reflector.getReflectionCamera(camera).layers.enable(AVATAR_LAYER)
    if (lamp.current) lamp.current.intensity = lit ? 1.4 : 0
  })

  const bar = 0.045
  return (
    <group>
      <primitive object={reflector} />
      <Block box={[x + 0.018, cy, z, 0.03, height + 0.02, width + 0.02]} color="#2a2b30" shadow={false} />
      {[
        [x + 0.008, cy, z - width / 2 - bar / 2, 0.04, height + bar * 2, bar],
        [x + 0.008, cy, z + width / 2 + bar / 2, 0.04, height + bar * 2, bar],
        [x + 0.008, bottom - bar / 2, z, 0.04, bar, width],
        [x + 0.008, bottom + height + bar / 2, z, 0.04, bar, width],
      ].map((box, i) => (
        <Block key={i} box={box as Box} color={frame} roughness={0.55} />
      ))}
      {[-1, 1].map((side) => (
        <Block
          key={side}
          box={[x - 0.06, 0.035, z + side * (width / 2 - 0.02), 0.2, 0.05, 0.05]}
          color="#7a5634"
          roughness={0.6}
        />
      ))}
      <group position={[x - 0.02, bottom + height + 0.17, z]}>
        <Block box={[0.02, 0, 0, 0.02, 0.05, 0.05]} color="#c6a15a" metalness={0.75} roughness={0.28} shadow={false} />
        <mesh position={[-0.06, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.34, 18]} />
          <meshStandardMaterial color="#c6a15a" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[-0.06, -0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, 0.3]} />
          <meshStandardMaterial color="#fff6e4" emissive="#ffe2b0" emissiveIntensity={lit ? 1.4 : 0} toneMapped={false} />
        </mesh>
        <pointLight ref={lamp} position={[-0.32, -0.25, 0]} distance={3.2} decay={2} color="#ffe6c4" intensity={0} />
      </group>
    </group>
  )
}

function Decor() {
  const t = useMemo(() => getRoomTextures(), [])
  const books = ["#c0392b", "#2f5fa8", "#e1b54a", "#3c8d5a", "#f0ede6", "#7a3f9a", "#2c2f36", "#e86a3a"]
  return (
    <group>
      <group position={[-0.78, 1.66, -HALF_D + 0.012]}>
        <Block box={[0, 0, 0, 0.56, 0.78, 0.012]} color="#f6f4ee" shadow={false} />
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[0.5, 0.72]} />
          <meshStandardMaterial map={t.poster} roughness={0.6} />
        </mesh>
      </group>

      <group position={[0.48, 1.42, -HALF_D + 0.13]}>
        <Block box={[0, 0, 0, 1.2, 0.03, 0.24]} color="#f0ede6" roughness={0.5} />
        {[-0.5, 0.5].map((bx) => (
          <Block key={bx} box={[bx, -0.06, -0.08, 0.02, 0.1, 0.06]} color="#2c2f36" metalness={0.5} shadow={false} />
        ))}
        {books.map((color, i) => {
          const height = 0.18 + ((i * 7) % 5) * 0.02
          return (
            <Block
              key={i}
              box={[-0.5 + i * 0.05, 0.015 + height / 2, 0, 0.042, height, 0.17]}
              color={color}
              roughness={0.8}
            />
          )
        })}
        <mesh position={[0.24, 0.015 + 0.09, 0]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.035, 0.18, 0.15]} />
          <meshStandardMaterial color="#3c8d5a" roughness={0.8} />
        </mesh>
        <mesh position={[0.42, 0.11, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.18, 6]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.42, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.006, 0.25]} receiveShadow>
        <planeGeometry args={[1.7, 1.25]} />
        <meshStandardMaterial map={t.rug} roughness={1} />
      </mesh>

      <mesh position={[0.55, 0.11, 0.95]} castShadow>
        <icosahedronGeometry args={[0.11, 1]} />
        <meshStandardMaterial color="#f4f4f0" roughness={0.55} flatShading />
      </mesh>

      <group position={[1.5, 0, 1.35]} rotation={[0, -0.9, 0]}>
        <Block box={[0, 0.2, 0, 0.32, 0.4, 0.16]} color="#2f5fa8" roughness={0.85} />
        <Block box={[0, 0.16, 0.09, 0.24, 0.18, 0.03]} color="#244a85" roughness={0.85} />
        <Block box={[0, 0.41, -0.02, 0.18, 0.05, 0.05]} color="#1d2433" roughness={0.85} />
      </group>

      <group position={[0, H - 0.01, 0]}>
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.24, 0.26, 0.07, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff1dc" emissiveIntensity={0.9} roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

function RoomLights({ active }: { active: boolean }) {
  const ceiling = useRef<PointLight>(null)
  const lamp = useRef<PointLight>(null)
  const screen = useRef<PointLight>(null)
  const sun = useRef<SpotLight>(null)
  const target = useMemo(() => {
    const object = new Object3D()
    object.position.set(-0.6, 0, -0.7)
    return object
  }, [])

  useFrame(() => {
    const k = active ? 1 : 0
    if (ceiling.current) ceiling.current.intensity = 3.2 * k
    if (lamp.current) lamp.current.intensity = 0.9 * k
    if (screen.current) screen.current.intensity = 0.7 * k
    if (sun.current) {
      sun.current.intensity = 42 * k
      sun.current.shadow.autoUpdate = active
      if (active) sun.current.shadow.needsUpdate = true
    }
  })

  return (
    <group>
      <primitive object={target} />
      <pointLight ref={ceiling} position={[0, H - 0.25, 0]} distance={9} decay={2} color="#ffe9cc" intensity={0} />
      <pointLight
        ref={lamp}
        position={[-HALF_W + 1.31, 0.86, -HALF_D + 0.3]}
        distance={3}
        decay={2}
        color="#ffcf8f"
        intensity={0}
      />
      <pointLight ref={screen} position={[0.4, 1.2, -HALF_D + 0.6]} distance={2.4} decay={2} color="#8fb8ff" intensity={0} />
      <spotLight
        ref={sun}
        position={[-HALF_W - 2.2, 2.9, (WINDOW.z0 + WINDOW.z1) / 2 + 0.2]}
        angle={0.5}
        penumbra={0.6}
        distance={9}
        decay={2}
        color="#fff4e0"
        intensity={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={0.5}
        shadow-camera-far={9}
        target={target}
      />
    </group>
  )
}

export function RoomDoor({
  phase,
  amountRef,
  onOpen,
}: {
  phase: Phase
  amountRef: { current: number }
  onOpen: () => void
}) {
  const leaf = useRef<Group>(null)
  const hall = useMemo(() => getTextures(), [])
  const { x, width, height, face } = ROOM_DOOR
  const x0 = x - width / 2
  const x1 = x + width / 2
  const depth = 0.85
  const back = face - 0.24 - depth

  useFrame(() => {
    if (leaf.current) leaf.current.rotation.y = -amountRef.current * 1.38
  })

  const enabled = phase === "arrival"

  return (
    <group>
      <group ref={leaf} position={[x1 - 0.01, SILL_Y + height / 2, face - 0.05]}>
        <mesh
          position={[-width / 2 + 0.01, 0, 0]}
          castShadow
          onClick={(event) => {
            event.stopPropagation()
            if (enabled) onOpen()
          }}
          onPointerOver={(event) => {
            event.stopPropagation()
            if (enabled) setCursor("pointer")
          }}
          onPointerOut={() => setCursor("auto")}
        >
          <boxGeometry args={[width - 0.02, height - 0.02, 0.05]} />
          <meshStandardMaterial color="#e4d9c4" roughness={0.55} />
        </mesh>
        {[0.46, -0.42].map((py) => (
          <mesh key={py} position={[-width / 2 + 0.01, py, 0.027]}>
            <boxGeometry args={[width - 0.2, py > 0 ? 0.8 : 0.86, 0.008]} />
            <meshStandardMaterial color="#d8ccb4" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[-width + 0.1, -0.06, 0.045]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} />
          <meshStandardMaterial color="#c6a15a" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[-width + 0.1, -0.06, 0.03]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#c6a15a" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[-width / 2 + 0.01, 0.42, 0.034]}>
          <boxGeometry args={[0.3, 0.09, 0.008]} />
          <meshStandardMaterial color="#c6a15a" metalness={0.7} roughness={0.3} />
        </mesh>
        <Suspense fallback={null}>
          <Text
            font={SERIF_FONT}
            position={[-width / 2 + 0.01, 0.42, 0.04]}
            fontSize={0.045}
            letterSpacing={0.16}
            color="#3a2718"
            anchorX="center"
            anchorY="middle"
          >
            BEDROOM
          </Text>
        </Suspense>
      </group>

      {[x0 - 0.04, x1 + 0.04].map((jx) => (
        <mesh key={jx} position={[jx, SILL_Y + (height + 0.06) / 2, face + 0.015]} castShadow>
          <boxGeometry args={[0.08, height + 0.06, 0.05]} />
          <meshStandardMaterial color="#3f2a18" roughness={0.68} />
        </mesh>
      ))}
      <mesh position={[x, SILL_Y + height + 0.06, face + 0.015]} castShadow>
        <boxGeometry args={[width + 0.24, 0.09, 0.05]} />
        <meshStandardMaterial color="#3f2a18" roughness={0.68} />
      </mesh>

      <group visible={phase === "arrival" || phase === "toRoom"}>
        <mesh position={[x, SILL_Y + height / 2 + 0.046, (face - 0.24 + back) / 2]}>
          <boxGeometry args={[width + 0.02, height + 0.08, depth]} />
          <meshStandardMaterial color="#2d4f7a" roughness={0.9} side={BackSide} />
        </mesh>
        <pointLight position={[x, SILL_Y + 1.9, back + 0.25]} intensity={0.9} distance={2.4} decay={2} color="#cfe0ff" />
      </group>
      <mesh position={[x, SILL_Y + height / 2 + 0.04, back - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width + 0.04, height + 0.1]} />
        <meshStandardMaterial map={hall.plaster} roughness={0.94} />
      </mesh>
      {[x0 - 0.02, x1 + 0.02].map((sx, i) => (
        <mesh
          key={sx}
          position={[sx, SILL_Y + height / 2 + 0.04, (face - 0.24 + back) / 2]}
          rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          <planeGeometry args={[depth, height + 0.1]} />
          <meshStandardMaterial map={hall.plaster} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[x, SILL_Y + height + 0.09, (face - 0.24 + back) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.04, depth]} />
        <meshStandardMaterial map={hall.plaster} roughness={0.94} />
      </mesh>
    </group>
  )
}