"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Object3D,
  type DirectionalLight,
  type PointLight,
  type Points,
  type SpotLight,
} from "three"
import {
  BACK_Z,
  CEILING_Y,
  DOOR_HALF,
  DOOR_HEIGHT,
  FRONT_Z,
  HALL_TIERS,
  INNER_X,
  ROOM_DOOR,
  SILL_Y,
} from "@/lib/scene"
import { getTextures } from "@/lib/textures"

export function Hall() {
  const textures = useMemo(() => getTextures(), [])
  const span = BACK_Z - FRONT_Z

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, (FRONT_Z - 1.2) / 2]} receiveShadow>
        <planeGeometry args={[INNER_X * 2 - 0.2, -1.2 - FRONT_Z]} />
        <meshStandardMaterial map={textures.woodFloor} roughness={0.9} metalness={0.02} />
      </mesh>

      {HALL_TIERS.map((tier) => {
        const height = tier.y - tier.prev
        const depth = tier.z1 - tier.z0
        return (
          <group key={tier.y}>
            <mesh
              position={[0, tier.prev + height / 2, (tier.z0 + tier.z1) / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[INNER_X * 2 - 0.12, height, depth]} />
              <meshStandardMaterial map={textures.woodFloor} roughness={0.88} metalness={0.02} />
            </mesh>
            <mesh position={[0, tier.y + 0.012, (tier.z0 + tier.z1) / 2]} receiveShadow>
              <boxGeometry args={[1.25, 0.02, depth - 0.08]} />
              <meshStandardMaterial color="#6e2433" roughness={0.96} />
            </mesh>
            <mesh position={[0, tier.y - height / 2, tier.z0]}>
              <boxGeometry args={[INNER_X * 2 - 0.2, height + 0.01, 0.045]} />
              <meshStandardMaterial color="#5a3a22" roughness={0.8} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0, 0.01, (-1.2 + FRONT_Z) / 2 + 0.4]} receiveShadow>
        <boxGeometry args={[1.25, 0.02, 5.2]} />
        <meshStandardMaterial color="#6e2433" roughness={0.96} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (INNER_X + 0.12), CEILING_Y / 2, (FRONT_Z + BACK_Z) / 2]}
          receiveShadow
        >
          <boxGeometry args={[0.24, CEILING_Y, span]} />
          <meshStandardMaterial map={textures.plaster} roughness={0.94} />
        </mesh>
      ))}

      <mesh position={[0, CEILING_Y / 2, FRONT_Z - 0.12]} receiveShadow>
        <boxGeometry args={[INNER_X * 2 + 0.4, CEILING_Y, 0.24]} />
        <meshStandardMaterial map={textures.plaster} roughness={0.94} />
      </mesh>

      <BackWall />

      <mesh position={[0, CEILING_Y - 0.08, (FRONT_Z + BACK_Z) / 2]} receiveShadow>
        <boxGeometry args={[INNER_X * 2, 0.16, span]} />
        <meshStandardMaterial color="#d8c4ad" roughness={0.95} />
      </mesh>

      {[-4.2, -0.6, 2.8, 5.6].map((z) => (
        <mesh key={z} position={[0, CEILING_Y - 0.28, z]} castShadow>
          <boxGeometry args={[INNER_X * 2 - 0.3, 0.2, 0.16]} />
          <meshStandardMaterial color="#5c3d24" roughness={0.72} />
        </mesh>
      ))}

      <Windows />
      <Podium />
      <Vestibule />
      <BoardFrame />
    </group>
  )
}

function BackWall() {
  const textures = useMemo(() => getTextures(), [])
  const top = SILL_Y + DOOR_HEIGHT
  const sideWidth = INNER_X - DOOR_HALF
  const sideCenter = (INNER_X + DOOR_HALF) / 2
  const upperHeight = CEILING_Y - top
  const roomX0 = ROOM_DOOR.x - ROOM_DOOR.width / 2
  const roomX1 = ROOM_DOOR.x + ROOM_DOOR.width / 2
  const roomTop = SILL_Y + ROOM_DOOR.height
  const rightPieces: [number, number, number, number][] = [
    [DOOR_HALF, roomX0, SILL_Y, CEILING_Y],
    [roomX0, roomX1, roomTop, CEILING_Y],
    [roomX1, INNER_X, SILL_Y, CEILING_Y],
  ]
  return (
    <group>
      <mesh position={[-sideCenter, (SILL_Y + CEILING_Y) / 2, BACK_Z + 0.12]} receiveShadow>
        <boxGeometry args={[sideWidth, CEILING_Y - SILL_Y, 0.24]} />
        <meshStandardMaterial map={textures.plaster} roughness={0.94} />
      </mesh>
      {rightPieces.map(([x0, x1, y0, y1]) => (
        <mesh key={`${x0}-${y0}`} position={[(x0 + x1) / 2, (y0 + y1) / 2, BACK_Z + 0.12]} receiveShadow>
          <boxGeometry args={[x1 - x0, y1 - y0, 0.24]} />
          <meshStandardMaterial map={textures.plaster} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[0, top + upperHeight / 2, BACK_Z + 0.12]} receiveShadow>
        <boxGeometry args={[DOOR_HALF * 2, upperHeight, 0.24]} />
        <meshStandardMaterial map={textures.plaster} roughness={0.94} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`jamb-${side}`}
          position={[side * (DOOR_HALF + 0.07), SILL_Y + DOOR_HEIGHT / 2, BACK_Z + 0.08]}
          castShadow
        >
          <boxGeometry args={[0.14, DOOR_HEIGHT + 0.08, 0.12]} />
          <meshStandardMaterial color="#3f2a18" roughness={0.68} />
        </mesh>
      ))}
      <mesh position={[0, SILL_Y + DOOR_HEIGHT + 0.07, BACK_Z + 0.08]} castShadow>
        <boxGeometry args={[DOOR_HALF * 2 + 0.28, 0.14, 0.12]} />
        <meshStandardMaterial color="#3f2a18" roughness={0.68} />
      </mesh>
    </group>
  )
}

function BoardFrame() {
  const textures = useMemo(() => getTextures(), [])
  const y = 2.72
  const z = -7.32
  return (
    <group position={[0, y, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[7.15, 3.42, 0.1]} />
        <meshStandardMaterial color="#4a301c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.045]} receiveShadow>
        <boxGeometry args={[6.7, 3.05, 0.04]} />
        <meshStandardMaterial map={textures.board} roughness={0.96} />
      </mesh>
      <mesh position={[0, -1.62, 0.1]} castShadow>
        <boxGeometry args={[7.15, 0.07, 0.18]} />
        <meshStandardMaterial color="#3d2916" roughness={0.65} />
      </mesh>
      <mesh position={[-2.55, -1.56, 0.16]} rotation={[0, 0, Math.PI / 2.4]}>
        <cylinderGeometry args={[0.016, 0.016, 0.14, 8]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.8} />
      </mesh>
      <mesh position={[-2.28, -1.56, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.11, 8]} />
        <meshStandardMaterial color="#f1d7a4" roughness={0.7} />
      </mesh>
      <mesh position={[2.45, -1.55, 0.16]}>
        <boxGeometry args={[0.22, 0.05, 0.08]} />
        <meshStandardMaterial color="#d7c3a4" roughness={0.85} />
      </mesh>
    </group>
  )
}

function Windows() {
  const spots = [-4.5, -1.4, 1.7]
  return (
    <group>
      {spots.map((z) =>
        [-1, 1].map((side) => (
          <group key={`${side}-${z}`} position={[side * (INNER_X - 0.04), 3.25, z]}>
            <mesh rotation={[0, Math.PI / 2, 0]} position={[side * -0.05, 0, 0]}>
              <planeGeometry args={[1.38, 1.92]} />
              <meshStandardMaterial
                color="#ffe0bf"
                emissive="#ffd2a4"
                emissiveIntensity={0.9}
                roughness={0.22}
                side={DoubleSide}
              />
            </mesh>
            {[
              [0, 1.02, 0, 0.08, 0.08, 1.54],
              [0, -1.02, 0, 0.08, 0.08, 1.54],
              [0, 0, 0.73, 0.08, 2.12, 0.08],
              [0, 0, -0.73, 0.08, 2.12, 0.08],
            ].map((bar, index) => (
              <mesh key={index} position={[bar[0], bar[1], bar[2]]}>
                <boxGeometry args={[bar[3], bar[4], bar[5]]} />
                <meshStandardMaterial color="#4a301c" roughness={0.7} />
              </mesh>
            ))}
            <mesh position={[side * -0.06, 0, 0]}>
              <boxGeometry args={[0.035, 1.92, 0.045]} />
              <meshStandardMaterial color="#3d2916" />
            </mesh>
            <mesh position={[side * -0.06, 0, 0]}>
              <boxGeometry args={[0.035, 0.045, 1.38]} />
              <meshStandardMaterial color="#3d2916" />
            </mesh>
            <mesh position={[0, 0.08, 0.88]}>
              <boxGeometry args={[0.05, 1.8, 0.12]} />
              <meshStandardMaterial color="#7c3040" roughness={0.9} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

function Podium() {
  return (
    <group position={[0, 0, -5.05]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.8, 0.72]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[2.02, 0.05, 0.84]} />
        <meshStandardMaterial color="#6b4528" roughness={0.55} />
      </mesh>
      <mesh position={[-0.55, 0.9, 0.05]} castShadow>
        <boxGeometry args={[0.34, 0.05, 0.24]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.8} />
      </mesh>
      <mesh position={[-0.38, 0.93, 0.02]} castShadow>
        <boxGeometry args={[0.28, 0.04, 0.2]} />
        <meshStandardMaterial color="#7a2433" roughness={0.75} />
      </mesh>
      <mesh position={[0.48, 0.88, 0.08]} castShadow>
        <boxGeometry args={[0.18, 0.025, 0.14]} />
        <meshStandardMaterial color="#1d3d34" roughness={0.7} />
      </mesh>
      <mesh position={[0.72, 1.02, -0.05]}>
        <cylinderGeometry args={[0.045, 0.06, 0.16, 12]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0.72, 1.16, -0.05]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#fff1d4" emissive="#ffd9a4" emissiveIntensity={0.7} />
      </mesh>
      <pointLight position={[0.72, 1.25, 0.1]} intensity={1.6} distance={4.5} color="#ffd7aa" />
    </group>
  )
}

function Vestibule() {
  const textures = useMemo(() => getTextures(), [])
  const length = 5.4
  const z0 = BACK_Z + 0.2
  const centerZ = z0 + length / 2
  const height = 3.5
  const halfW = 3.15
  return (
    <group>
      <mesh position={[0, SILL_Y - 0.06, centerZ]} receiveShadow>
        <boxGeometry args={[halfW * 2, 0.12, length]} />
        <meshStandardMaterial map={textures.stone} roughness={0.92} />
      </mesh>
      <mesh position={[0, SILL_Y + height + 0.08, centerZ]}>
        <boxGeometry args={[halfW * 2, 0.16, length]} />
        <meshStandardMaterial map={textures.plasterDark} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * halfW, SILL_Y + height / 2, centerZ]} receiveShadow>
            <boxGeometry args={[0.2, height, length]} />
            <meshStandardMaterial map={textures.plasterDark} roughness={0.94} />
          </mesh>
          <mesh position={[side * (halfW - 0.12), SILL_Y + 0.62, centerZ]}>
            <boxGeometry args={[0.06, 1.24, length - 0.2]} />
            <meshStandardMaterial color="#5a3b24" roughness={0.75} />
          </mesh>
          <mesh position={[side * (halfW - 0.18), SILL_Y + 1.72, BACK_Z + 2.15]}>
            <boxGeometry args={[0.08, 0.22, 0.16]} />
            <meshStandardMaterial color="#c6a15a" metalness={0.6} roughness={0.35} />
          </mesh>
          <pointLight
            position={[side * (halfW - 0.35), SILL_Y + 1.72, BACK_Z + 2.15]}
            intensity={2.4}
            distance={5.5}
            decay={2}
            color="#ffc48a"
          />
          <mesh position={[side * (halfW - 0.16), SILL_Y + 2.15, BACK_Z + 3.5]}>
            <boxGeometry args={[0.04, 0.7, 0.52]} />
            <meshStandardMaterial color="#3a2918" />
          </mesh>
          <mesh position={[side * (halfW - 0.2), SILL_Y + 2.15, BACK_Z + 3.5]}>
            <boxGeometry args={[0.02, 0.58, 0.4]} />
            <meshStandardMaterial color={side < 0 ? "#8d3a3a" : "#35584a"} roughness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, SILL_Y + height / 2, z0 + length]}>
        <boxGeometry args={[halfW * 2, height, 0.2]} />
        <meshStandardMaterial map={textures.plasterDark} roughness={0.95} />
      </mesh>
      <mesh position={[-1.7, SILL_Y + 0.48, BACK_Z + 4.3]} castShadow>
        <boxGeometry args={[0.7, 0.46, 0.34]} />
        <meshStandardMaterial color="#4e3422" roughness={0.7} />
      </mesh>
      <mesh position={[-1.7, SILL_Y + 0.78, BACK_Z + 4.25]}>
        <boxGeometry args={[0.22, 0.05, 0.16]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function Lights({
  seated,
  away,
  openRef,
}: {
  seated: boolean
  away: boolean
  openRef: { current: number }
}) {
  const sun = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const sunTarget = useMemo(() => {
    const target = new Object3D()
    target.position.set(0, 1.4, 0.5)
    return target
  }, [])
  const boardTarget = useMemo(() => {
    const target = new Object3D()
    target.position.set(0, 2.7, -7.3)
    return target
  }, [])
  const spot = useRef<SpotLight>(null)
  const spill = useRef<PointLight>(null)

  useFrame((_, delta) => {
    if (spot.current) {
      const goal = seated ? 46 : 16
      spot.current.intensity += (goal - spot.current.intensity) * (1 - Math.exp(-delta * 2.2))
    }
    if (spill.current) {
      spill.current.intensity = away ? 0 : 1.5 + openRef.current * 10
    }
    if (spot.current && away) spot.current.intensity = 0
    if (sun.current) sun.current.intensity = away ? 0 : 2.35
    if (fill.current) fill.current.intensity = away ? 0 : 0.45
  })

  return (
    <group>
      <hemisphereLight args={["#f4e2c8", "#4a3428", 0.46]} />
      <ambientLight intensity={0.22} />
      <primitive object={sunTarget} />
      <directionalLight
        ref={sun}
        position={[7.5, 11, 6]}
        intensity={2.35}
        color="#ffe0bc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.04}
        shadow-camera-near={2}
        shadow-camera-far={32}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        target={sunTarget}
      />
      <directionalLight ref={fill} position={[-8, 6, 2]} intensity={0.45} color="#d5e2ff" />
      <primitive object={boardTarget} />
      <spotLight
        ref={spot}
        position={[0.4, 5.5, -2.4]}
        angle={0.48}
        penumbra={0.75}
        intensity={16}
        distance={18}
        decay={2}
        color="#fff3df"
        target={boardTarget}
      />
      <pointLight
        ref={spill}
        position={[0, SILL_Y + 1.5, BACK_Z - 0.7]}
        distance={9}
        decay={2}
        color="#ffd0a4"
        intensity={1.5}
      />
      {[
        [0, 5.35, -1.6],
        [0, 5.35, 3.4],
      ].map(([x, y, z]) => (
        <group key={z} position={[x, y, z]}>
          <mesh>
            <coneGeometry args={[0.24, 0.2, 18, 1, true]} />
            <meshStandardMaterial
              color="#f3e6cf"
              emissive="#e7c48a"
              emissiveIntensity={0.4}
              side={DoubleSide}
              roughness={0.5}
            />
          </mesh>
          <pointLight position={[0, -0.18, 0]} intensity={1.8} distance={6.5} decay={2} color="#ffd7aa" />
        </group>
      ))}
    </group>
  )
}

function unit(index: number) {
  const value = Math.sin(index * 127.1) * 43758.5453
  return value - Math.floor(value)
}

export function Motes() {
  const geometry = useMemo(() => {
    const count = 36
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const a = unit(i * 3 + 1)
      const b = unit(i * 3 + 2)
      const c = unit(i * 3 + 3)
      positions[i * 3] = (a - 0.5) * 12
      positions[i * 3 + 1] = 1.2 + b * 3.4
      positions[i * 3 + 2] = -4 + c * 10
    }
    const geo = new BufferGeometry()
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3))
    return geo
  }, [])
  const ref = useRef<Points>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.06
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.22) * 0.04
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#f7ead2" size={0.028} transparent opacity={0.45} depthWrite={false} />
    </points>
  )
}
