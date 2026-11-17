"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { CanvasTexture, Color, DoubleSide, FrontSide, MeshStandardMaterial, type Group, type Object3D } from "three"
import { AVATAR_LAYER, BOTTOMS, SHOES, TOPS, UNDERWEAR, findItem, heightMeters, type Character } from "@/lib/avatar"
import { CANONICAL_HEIGHT, buildParts, type MaterialKey } from "@/lib/avatar-geometry"
import type { Vec3 } from "@/lib/scene"

function onAvatarLayer(object: Object3D | null) {
  object?.layers.set(AVATAR_LAYER)
}

function shadowTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
    gradient.addColorStop(0, "rgba(0,0,0,0.5)")
    gradient.addColorStop(0.55, "rgba(0,0,0,0.22)")
    gradient.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  }
  return new CanvasTexture(canvas)
}

const LIPS = new Color("#a8574f")
const BROW_SHADE = new Color("#1c1410")

// Eyes close for a few frames every few seconds, at slightly uneven intervals.
function blinkAmount(time: number) {
  const period = 4.2
  const cycle = Math.floor(time / period)
  const at = time - cycle * period - ((cycle * 1.37) % 1.6)
  if (at < 0 || at > 0.16) return 0
  return Math.sin((at / 0.16) * Math.PI)
}

export function Avatar({
  character,
  visible,
  position,
  facing,
  yawRef,
  reduced,
}: {
  character: Character
  visible: boolean
  position: Vec3
  facing: number
  yawRef: { current: number }
  reduced: boolean
}) {
  const root = useRef<Group>(null)
  const turn = useRef(0)
  const { sex, hair, outfit } = character
  const top = findItem(TOPS[sex], outfit.top)
  const bottom = findItem(BOTTOMS[sex], outfit.bottom)
  const shoes = findItem(SHOES[sex], outfit.shoes)
  const underwear = findItem(UNDERWEAR[sex], outfit.underwear)
  const topKind = top?.kind ?? null
  const bottomKind = bottom?.kind ?? null
  const shoeKind = shoes?.kind ?? null

  const parts = useMemo(
    () => buildParts({ sex, hair, top: topKind, bottom: bottomKind, shoes: shoeKind }),
    [sex, hair, topKind, bottomKind, shoeKind],
  )

  useEffect(() => () => parts.forEach((part) => part.geometry.dispose()), [parts])

  const materials = useMemo(() => {
    // The mirror's oblique clip plane costs depth precision. Covered skin is
    // not built at all; small offsets settle the layers that still touch.
    const cloth = (roughness: number, factor: number, units: number, open = false) =>
      new MeshStandardMaterial({
        roughness,
        metalness: 0,
        side: open ? DoubleSide : FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: factor,
        polygonOffsetUnits: units,
      })
    const map: Record<MaterialKey, MeshStandardMaterial> = {
      skin: new MeshStandardMaterial({ roughness: 0.52, metalness: 0, side: FrontSide }),
      hair: cloth(0.62, -2, -8, true),
      bottom: cloth(0.82, 0, -4),
      shoes: cloth(0.5, -1, -4),
      sole: cloth(0.7, -1, -8),
      underwear: cloth(0.8, -1, -4),
      top: cloth(0.86, 0, -12),
      brow: cloth(0.8, -1, -12),
      eyeWhite: cloth(0.3, -1, -8),
      iris: cloth(0.2, -1, -16),
      eyeShine: new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.6, roughness: 0.2 }),
      lips: cloth(0.45, -1, -8),
    }
    map.eyeWhite.color.set("#f2eee6")
    map.iris.color.set("#2b1d16")
    return map
  }, [])

  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])

  useEffect(() => {
    materials.skin.color.set(character.skin)
    materials.hair.color.set(character.hairColor)
    if (top) materials.top.color.set(top.color)
    if (bottom) materials.bottom.color.set(bottom.color)
    if (shoes) materials.shoes.color.set(shoes.color)
    if (shoes?.sole) materials.sole.color.set(shoes.sole)
    if (underwear) materials.underwear.color.set(underwear.color)
    materials.brow.color.set(character.hairColor).lerp(BROW_SHADE, 0.35)
    materials.lips.color.set(character.skin).lerp(LIPS, 0.55)
  }, [character, materials, top, bottom, shoes, underwear])

  const shadow = useMemo(() => shadowTexture(), [])
  useEffect(() => () => shadow.dispose(), [shadow])

  const scale = heightMeters(character) / CANONICAL_HEIGHT

  useFrame((state, delta) => {
    const group = root.current
    if (!group || !visible) return
    const time = state.clock.elapsedTime
    turn.current += (yawRef.current - turn.current) * (1 - Math.exp(-delta * 6))
    const idle = reduced ? 0 : Math.sin(time * 0.35) * 0.06
    group.rotation.y = facing + turn.current + idle
    const breath = reduced ? 0 : Math.sin(time * 1.6)
    group.scale.set(scale * (1 + breath * 0.004), scale * (1 + breath * 0.0025), scale * (1 + breath * 0.006))
    group.rotation.z = reduced ? 0 : Math.sin(time * 0.5) * 0.006
    const open = 1 - (reduced ? 0 : blinkAmount(time)) * 0.9
    for (const child of group.children) if (child.userData.blink) child.scale.y = open
  })

  return (
    <group position={position} visible={visible}>
      <mesh ref={onAvatarLayer} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={root} scale={scale} rotation={[0, facing, 0]}>
        {/* Keyed by geometry so a rebuilt outfit mounts fresh meshes: reusing one
            by index would keep the position and blink scale of whatever part it
            showed before. */}
        {parts.map((part) => (
          <mesh
            key={part.geometry.uuid}
            ref={onAvatarLayer}
            userData={{ blink: part.blink === true }}
            position={part.position}
            geometry={part.geometry}
            material={materials[part.material]}
          />
        ))}
      </group>
    </group>
  )
}
