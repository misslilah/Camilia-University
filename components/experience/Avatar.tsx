"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { CanvasTexture, DoubleSide, FrontSide, MeshStandardMaterial, type Group, type Object3D } from "three"
import { AVATAR_LAYER, UNDERWEAR_COLOR, heightMeters, type Character } from "@/lib/avatar"
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

function soleColor(shoes: string) {
  const value = parseInt(shoes.slice(1), 16)
  const luma = ((value >> 16) & 255) * 0.3 + ((value >> 8) & 255) * 0.59 + (value & 255) * 0.11
  return luma < 90 ? "#2a2a2c" : "#f3f1ea"
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
  const { sex, build, shoulders, hips, hair, top, bottom, shoes, outer, underwear } = character

  const parts = useMemo(
    () => buildParts({ sex, build, shoulders, hips, hair, top, bottom, shoes, outer, underwear }),
    [sex, build, shoulders, hips, hair, top, bottom, shoes, outer, underwear],
  )

  useEffect(() => () => parts.forEach((part) => part.geometry.dispose()), [parts])

  const materials = useMemo(() => {
    // The mirror's oblique clip plane costs depth precision, so layers are
    // ordered with polygon offsets instead of relying on their few millimetres.
    const cloth = (roughness: number, layer: number, open = false) =>
      new MeshStandardMaterial({
        roughness,
        metalness: 0,
        side: open ? DoubleSide : FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -layer,
        polygonOffsetUnits: -layer * 4,
      })
    const map: Record<MaterialKey, MeshStandardMaterial> = {
      skin: new MeshStandardMaterial({ roughness: 0.52, metalness: 0, side: FrontSide }),
      hair: cloth(0.62, 2, true),
      underwear: cloth(0.8, 1),
      bottom: cloth(0.82, 2),
      shoes: cloth(0.5, 3),
      sole: cloth(0.7, 4),
      top: cloth(0.86, 4),
      trim: cloth(0.86, 5, true),
      outer: cloth(0.78, 6, true),
      button: cloth(0.35, 7),
    }
    return map
  }, [])

  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])

  useEffect(() => {
    materials.skin.color.set(character.skin)
    materials.hair.color.set(character.hairColor)
    materials.top.color.set(character.topColor)
    materials.trim.color.set(character.topColor)
    materials.bottom.color.set(character.bottomColor)
    materials.shoes.color.set(character.shoesColor)
    materials.sole.color.set(soleColor(character.shoesColor))
    materials.outer.color.set(character.outerColor)
    materials.underwear.color.set(UNDERWEAR_COLOR)
  }, [character, materials])

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
  })

  return (
    <group position={position} visible={visible}>
      <mesh ref={onAvatarLayer} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={root} scale={scale} rotation={[0, facing, 0]}>
        {parts.map((part, index) => (
          <mesh key={index} ref={onAvatarLayer} geometry={part.geometry} material={materials[part.material]} />
        ))}
      </group>
    </group>
  )
}
