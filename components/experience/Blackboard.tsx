"use client"

import { useEffect, useRef, useState } from "react"
import { Text } from "@react-three/drei"
import { setCursor } from "@/lib/cursor"
import { BOARD, CHAPTERS, CHALK_FONT, SERIF_FONT, type Chapter } from "@/lib/scene"

const SILL_TEXT_Y = 1.52 + 2.56 + 0.32

export function Signage() {
  return (
    <group>
      <Text
        font={SERIF_FONT}
        position={[0, 5.15, -7.3]}
        fontSize={0.38}
        color="#3f2a18"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.16}
      >
        CAMILIA UNIVERSITY
      </Text>
      <mesh position={[0, 5.72, -7.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 40]} />
        <meshStandardMaterial color="#6e2433" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 5.72, -7.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.02, 10, 40]} />
        <meshStandardMaterial color="#c6a15a" metalness={0.65} roughness={0.3} />
      </mesh>
      <Text
        font={SERIF_FONT}
        position={[0, 5.72, -7.27]}
        fontSize={0.16}
        color="#f3ead7"
        anchorX="center"
        anchorY="middle"
      >
        C
      </Text>
      <Text
        font={SERIF_FONT}
        position={[0, SILL_TEXT_Y, 8.46]}
        fontSize={0.16}
        color="#3a2718"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
        maxWidth={2.35}
        textAlign="center"
      >
        {"CAMILIA\nAMPHITHEATER"}
      </Text>
    </group>
  )
}

export function Blackboard({
  showMenu,
  chapterId,
  onSelect,
  onBack,
}: {
  showMenu: boolean
  chapterId: string | null
  onSelect: (id: string) => void
  onBack: () => void
}) {
  const menu = useApproach(showMenu ? 1 : 0)
  const chapter = CHAPTERS.find((item) => item.id === chapterId) ?? null
  const interactive = menu > 0.8

  return (
    <group position={[0, BOARD.centerY, BOARD.surfaceZ + 0.04]}>
      <group visible={menu < 0.98}>
        <Welcome opacity={1 - menu} />
      </group>
      <group visible={menu > 0.02 && !chapter}>
        <Menu opacity={menu} enabled={interactive && !chapter} onSelect={onSelect} />
      </group>
      {chapter && menu > 0.5 && (
        <ChapterPage chapter={chapter} enabled={interactive} onBack={onBack} />
      )}
    </group>
  )
}

function Welcome({ opacity }: { opacity: number }) {
  return (
    <group>
      <Text
        font={CHALK_FONT}
        position={[0, 0.42, 0]}
        fontSize={0.58}
        color="#f4efe4"
        fillOpacity={opacity}
        anchorX="center"
        anchorY="middle"
      >
        Camilia
      </Text>
      <Text
        font={CHALK_FONT}
        position={[0, -0.12, 0]}
        fontSize={0.24}
        color="#f4efe4"
        fillOpacity={opacity * 0.85}
        anchorX="center"
      >
        Amphitheater I
      </Text>
      <Text
        font={CHALK_FONT}
        position={[0, -0.72, 0]}
        fontSize={0.28}
        maxWidth={4.8}
        textAlign="center"
        color="#f4efe4"
        fillOpacity={opacity * 0.9}
        anchorX="center"
        lineHeight={1.25}
      >
        {"Take a seat.\nThe menu will be written here."}
      </Text>
    </group>
  )
}

function Menu({
  opacity,
  enabled,
  onSelect,
}: {
  opacity: number
  enabled: boolean
  onSelect: (id: string) => void
}) {
  return (
    <group>
      <Text
        font={CHALK_FONT}
        position={[0, 1.18, 0]}
        fontSize={0.15}
        color="#f4efe4"
        fillOpacity={opacity * 0.7}
        anchorX="center"
        letterSpacing={0.14}
      >
        AMPHITHEATER I
      </Text>
      <Text
        font={CHALK_FONT}
        position={[0, 0.86, 0]}
        fontSize={0.26}
        color="#f6f1e6"
        fillOpacity={opacity}
        anchorX="center"
      >
        What would you like to open?
      </Text>
      {CHAPTERS.map((chapter, index) => (
        <ChalkLine
          key={chapter.id}
          text={`${chapter.numeral}    ${chapter.title}`}
          position={[-1.15, 0.46 - index * 0.32, 0]}
          width={3.3}
          fontSize={0.28}
          opacity={opacity}
          enabled={enabled}
          onSelect={() => onSelect(chapter.id)}
        />
      ))}
    </group>
  )
}

function ChapterPage({
  chapter,
  enabled,
  onBack,
}: {
  chapter: Chapter
  enabled: boolean
  onBack: () => void
}) {
  return (
    <group>
      {chapter.id !== "cours" && (
        <ChalkLine
          text="←   Back to the board"
          position={[-2.15, 1.12, 0]}
          width={2.4}
          fontSize={0.22}
          opacity={1}
          enabled={enabled}
          onSelect={onBack}
        />
      )}
      <Text
        font={CHALK_FONT}
        position={[0, 0.62, 0]}
        fontSize={0.38}
        color="#f6f1e6"
        anchorX="center"
        anchorY="middle"
      >
        {chapter.title}
      </Text>
      {chapter.id !== "cours" && (
        <Text
          font={CHALK_FONT}
          position={[0, 0.02, 0]}
          fontSize={0.34}
          maxWidth={4.6}
          color="#f4efe4"
          anchorX="center"
          anchorY="middle"
          lineHeight={1.28}
          textAlign="center"
        >
          {chapter.body}
        </Text>
      )}
    </group>
  )
}

function ChalkLine({
  text,
  position,
  width,
  fontSize,
  opacity,
  enabled,
  onSelect,
}: {
  text: string
  position: [number, number, number]
  width: number
  fontSize: number
  opacity: number
  enabled: boolean
  onSelect: () => void
}) {
  const [hot, setHot] = useState(false)
  return (
    <group position={position}>
      <Text
        font={CHALK_FONT}
        fontSize={fontSize}
        color={hot ? "#f0d08a" : "#f6f1e6"}
        fillOpacity={opacity}
        anchorX="left"
        anchorY="middle"
      >
        {text}
      </Text>
      {enabled && (
        <mesh
          position={[width / 2, 0, 0.03]}
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
          onPointerOver={(event) => {
            event.stopPropagation()
            setHot(true)
            setCursor("pointer")
          }}
          onPointerOut={() => {
            setHot(false)
            setCursor("auto")
          }}
        >
          <planeGeometry args={[width, Math.min(0.3, fontSize * 1.15)]} />
          <meshBasicMaterial color="#f4efe4" transparent opacity={hot ? 0.1 : 0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function useApproach(target: number) {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    const from = current.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 420)
      const eased = t * t * (3 - 2 * t)
      const next = from + (target - from) * eased
      current.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}
