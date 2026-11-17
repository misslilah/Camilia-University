import { BoxGeometry, BufferGeometry } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

function box(width: number, height: number, depth: number, x: number, y: number, z: number) {
  const geometry = new BoxGeometry(width, height, depth)
  geometry.translate(x, y, z)
  return geometry
}

export function createChairGeometry() {
  const parts: BufferGeometry[] = [
    box(0.045, 0.46, 0.045, -0.18, 0.23, -0.14),
    box(0.045, 0.46, 0.045, 0.18, 0.23, -0.14),
    box(0.045, 0.46, 0.045, -0.18, 0.23, 0.14),
    box(0.045, 0.46, 0.045, 0.18, 0.23, 0.14),
    box(0.46, 0.055, 0.42, 0, 0.485, 0),
    box(0.04, 0.48, 0.04, -0.18, 0.74, 0.18),
    box(0.04, 0.48, 0.04, 0.18, 0.74, 0.18),
    box(0.4, 0.34, 0.032, 0, 0.8, 0.185),
    box(0.52, 0.028, 0.15, 0, 0.71, -0.36),
    box(0.032, 0.22, 0.032, -0.2, 0.59, -0.36),
    box(0.032, 0.22, 0.032, 0.2, 0.59, -0.36),
  ]
  const merged = mergeGeometries(parts, false)
  parts.forEach((part) => part.dispose())
  if (!merged) throw new Error("The chair could not be built")
  return merged
}
