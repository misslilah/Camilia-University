import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three"
import type { Character, Sex } from "@/lib/avatar"

export type MaterialKey = "skin" | "hair" | "top" | "bottom" | "shoes" | "sole" | "outer" | "underwear" | "button"
export type Part = { geometry: BufferGeometry; material: MaterialKey }
export type Shape = Pick<Character, "sex" | "build" | "shoulders" | "hips" | "hair" | "top" | "bottom" | "shoes" | "outer" | "underwear">

// The body is modelled at this height, then scaled to the chosen one.
export const CANONICAL_HEIGHT = 1.78

type Frame = { c: Vector3; x: Vector3; z: Vector3 }
type Arc = (ring: number) => [number, number]
type Displace = (p: Vector3, theta: number) => void

const TAU = Math.PI * 2
const FRONT = new Vector3(0, 0, 1)

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function gauss(x: number) {
  return Math.exp(-x * x)
}

// Monotone cubic interpolation, so profiles never bulge between keys.
function curve(points: [number, number][]) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const n = xs.length
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i += 1) slopes.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  m[0] = slopes[0]
  m[n - 1] = slopes[n - 2]
  for (let i = 1; i < n - 1; i += 1) {
    m[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slopes[i]
    const b = m[i + 1] / slopes[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      m[i] = k * a * slopes[i]
      m[i + 1] = k * b * slopes[i]
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let k = 0
    while (k < n - 2 && x > xs[k + 1]) k += 1
    const h = xs[k + 1] - xs[k]
    const t = (x - xs[k]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[k] +
      (t3 - 2 * t2 + t) * h * m[k] +
      (-2 * t3 + 3 * t2) * ys[k + 1] +
      (t3 - t2) * h * m[k + 1]
    )
  }
}

function tube(
  frames: Frame[],
  segs: number,
  opts: { arc?: Arc; capStart?: boolean; capEnd?: boolean; displace?: Displace } = {},
) {
  const full = !opts.arc
  const cols = full ? segs : segs + 1
  const positions: number[] = []
  const p = new Vector3()
  frames.forEach((frame, i) => {
    const [a0, a1] = opts.arc ? opts.arc(i) : [0, TAU]
    for (let j = 0; j < cols; j += 1) {
      const theta = a0 + ((a1 - a0) * j) / segs
      p.copy(frame.c).addScaledVector(frame.x, Math.sin(theta)).addScaledVector(frame.z, Math.cos(theta))
      opts.displace?.(p, theta)
      positions.push(p.x, p.y, p.z)
    }
  })
  const along = frames[1].c.clone().sub(frames[0].c)
  const flip = new Vector3().crossVectors(frames[0].x, frames[0].z).dot(along) > 0
  const index: number[] = []
  const tri = (a: number, b: number, c: number) => (flip ? index.push(a, c, b) : index.push(a, b, c))
  for (let i = 0; i < frames.length - 1; i += 1) {
    for (let j = 0; j < segs; j += 1) {
      const jn = full ? (j + 1) % segs : j + 1
      const a = i * cols + j
      const b = i * cols + jn
      const c = (i + 1) * cols + j
      const d = (i + 1) * cols + jn
      tri(a, b, c)
      tri(b, d, c)
    }
  }
  const cap = (ring: number, start: boolean) => {
    const center = new Vector3()
    for (let j = 0; j < segs; j += 1) {
      const o = (ring * cols + j) * 3
      center.x += positions[o]
      center.y += positions[o + 1]
      center.z += positions[o + 2]
    }
    center.divideScalar(segs)
    const ci = positions.length / 3
    positions.push(center.x, center.y, center.z)
    for (let j = 0; j < segs; j += 1) {
      const a = ring * cols + j
      const b = ring * cols + ((j + 1) % segs)
      if (start) tri(ci, b, a)
      else tri(ci, a, b)
    }
  }
  if (full && opts.capStart) cap(0, true)
  if (full && opts.capEnd) cap(frames.length - 1, false)
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

function ellipsoid(center: Vector3, radii: Vector3, opts: { dir?: Vector3; theta?: number; tilt?: number } = {}) {
  const geometry = new SphereGeometry(1, 36, 24, 0, TAU, 0, opts.theta ?? Math.PI)
  if (opts.tilt) geometry.rotateX(opts.tilt)
  const q = new Quaternion()
  if (opts.dir) q.setFromUnitVectors(new Vector3(0, -1, 0), opts.dir.clone().normalize())
  geometry.applyMatrix4(new Matrix4().compose(center, q, radii))
  return geometry
}

function ring(center: Vector3, radius: number, thickness: number, scaleZ = 1) {
  const geometry = new TorusGeometry(radius, thickness, 10, 40)
  geometry.rotateX(Math.PI / 2)
  geometry.scale(1, 1, scaleZ)
  geometry.translate(center.x, center.y, center.z)
  return geometry
}

type Limb = (t: number, off: number) => Frame

function limb(points: Vector3[], radius: (t: number) => number, ref: Vector3, ratio = 1): Limb {
  const lengths = [0]
  for (let i = 1; i < points.length; i += 1) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]))
  const total = lengths[lengths.length - 1]
  const at = (t: number) => {
    const d = Math.min(1, Math.max(0, t)) * total
    let k = 0
    while (k < points.length - 2 && d > lengths[k + 1]) k += 1
    const local = (d - lengths[k]) / (lengths[k + 1] - lengths[k])
    return points[k].clone().lerp(points[k + 1], local)
  }
  return (t, off) => {
    const c = at(t)
    const tangent = at(t + 0.03).sub(at(t - 0.03)).normalize()
    const x = new Vector3().crossVectors(tangent, ref).normalize()
    const z = new Vector3().crossVectors(x, tangent).normalize()
    const r = radius(t)
    return { c, x: x.multiplyScalar(r + off), z: z.multiplyScalar(r * ratio + off) }
  }
}

function sample(limbFn: Limb, t0: number, t1: number, off: number | ((t: number) => number), rings = 28) {
  const frames: Frame[] = []
  for (let i = 0; i < rings; i += 1) {
    const t = t0 + ((t1 - t0) * i) / (rings - 1)
    frames.push(limbFn(t, typeof off === "number" ? off : off(t)))
  }
  return frames
}

type Key = [y: number, rx: number, rz: number, cz: number]

const TORSO: Record<Sex, Key[]> = {
  man: [
    [0.79, 0.03, 0.028, 0],
    [0.82, 0.112, 0.07, -0.008],
    [0.88, 0.152, 0.09, -0.012],
    [0.94, 0.16, 0.1, -0.01],
    [1.02, 0.147, 0.097, 0],
    [1.08, 0.141, 0.095, 0.004],
    [1.18, 0.151, 0.101, 0.008],
    [1.28, 0.164, 0.107, 0.01],
    [1.36, 0.171, 0.101, 0.004],
    [1.42, 0.168, 0.09, -0.004],
    [1.455, 0.148, 0.078, -0.008],
    [1.485, 0.092, 0.06, -0.008],
    [1.505, 0.058, 0.051, -0.006],
    [1.52, 0.046, 0.046, -0.005],
  ],
  woman: [
    [0.78, 0.03, 0.028, 0],
    [0.81, 0.12, 0.072, -0.012],
    [0.87, 0.168, 0.098, -0.018],
    [0.93, 0.175, 0.108, -0.014],
    [1.0, 0.145, 0.096, -0.004],
    [1.06, 0.123, 0.084, 0],
    [1.14, 0.129, 0.088, 0.004],
    [1.24, 0.141, 0.093, 0.006],
    [1.32, 0.147, 0.089, 0.004],
    [1.385, 0.146, 0.08, -0.004],
    [1.415, 0.128, 0.07, -0.008],
    [1.445, 0.08, 0.054, -0.008],
    [1.465, 0.049, 0.044, -0.006],
    [1.48, 0.04, 0.04, -0.005],
  ],
}

const LAYOUT = {
  man: {
    bottom: 0.79,
    neck: 1.505,
    neckR: 0.05,
    waist: 1.03,
    hipX: 0.088,
    hipY: 0.93,
    kneeY: 0.5,
    shoulderX: 0.182,
    shoulderY: 1.415,
    elbowY: 1.125,
    wristY: 0.87,
    head: new Vector3(0, 1.672, 0.008),
    headR: new Vector3(0.086, 0.11, 0.1),
    jaw: new Vector3(0, 1.605, 0.022),
    jawR: new Vector3(0.066, 0.058, 0.078),
    leg: [
      [0, 0.086],
      [0.12, 0.079],
      [0.3, 0.066],
      [0.47, 0.049],
      [0.52, 0.047],
      [0.6, 0.051],
      [0.68, 0.05],
      [0.86, 0.035],
      [1, 0.03],
    ] as [number, number][],
    arm: [
      [0, 0.047],
      [0.12, 0.045],
      [0.46, 0.036],
      [0.53, 0.034],
      [0.62, 0.035],
      [0.95, 0.026],
      [1, 0.025],
    ] as [number, number][],
    foot: 1,
  },
  woman: {
    bottom: 0.78,
    neck: 1.465,
    neckR: 0.043,
    waist: 1.02,
    hipX: 0.09,
    hipY: 0.9,
    kneeY: 0.49,
    shoulderX: 0.162,
    shoulderY: 1.378,
    elbowY: 1.1,
    wristY: 0.86,
    head: new Vector3(0, 1.648, 0.008),
    headR: new Vector3(0.082, 0.106, 0.096),
    jaw: new Vector3(0, 1.585, 0.02),
    jawR: new Vector3(0.06, 0.054, 0.074),
    leg: [
      [0, 0.092],
      [0.12, 0.083],
      [0.3, 0.066],
      [0.47, 0.046],
      [0.52, 0.044],
      [0.6, 0.048],
      [0.68, 0.047],
      [0.86, 0.032],
      [1, 0.028],
    ] as [number, number][],
    arm: [
      [0, 0.041],
      [0.12, 0.039],
      [0.46, 0.031],
      [0.53, 0.029],
      [0.62, 0.03],
      [0.95, 0.022],
      [1, 0.021],
    ] as [number, number][],
    foot: 0.92,
  },
}

type Model = ReturnType<typeof model>

function model(c: Shape) {
  const L = LAYOUT[c.sex]
  const keys = TORSO[c.sex]
  const w = 0.9 + 0.3 * c.build
  const limbW = 0.88 + 0.36 * c.build
  const s = 0.9 + 0.2 * c.shoulders
  const h = 0.9 + 0.2 * c.hips
  const rxCurve = curve(keys.map((k) => [k[0], k[1]]))
  const rzCurve = curve(keys.map((k) => [k[0], k[2]]))
  const czCurve = curve(keys.map((k) => [k[0], k[3]]))
  const top = keys[keys.length - 1][0]
  const hipWeight = (y: number) => 1 - smoothstep(0.97, 1.08, y)
  const shoulderWeight = (y: number) => smoothstep(1.16, 1.38, y)

  const torso = (y: number, off: number): Frame => {
    const mx = w * (1 + (s - 1) * shoulderWeight(y) + (h - 1) * hipWeight(y))
    const mz = w * (1 + (h - 1) * 0.5 * hipWeight(y))
    return {
      c: new Vector3(0, y, czCurve(y)),
      x: new Vector3(rxCurve(y) * mx + off, 0, 0),
      z: new Vector3(0, 0, rzCurve(y) * mz + off),
    }
  }

  const bust = c.sex === "woman" ? 0.03 * (0.85 + 0.3 * c.build) : 0
  const bustY = 1.235
  const bustX = 0.07 * w
  const glute = c.sex === "woman" ? 0.022 : 0.014
  const displace: Displace = (p, theta) => {
    const front = smoothstep(0.15, 0.85, Math.cos(theta))
    const back = smoothstep(0.15, 0.85, -Math.cos(theta))
    if (bust && front > 0) {
      const dy = p.y - bustY
      const gy = gauss(dy / (dy < 0 ? 0.042 : 0.065))
      const gx = gauss((p.x - bustX) / 0.048) + gauss((p.x + bustX) / 0.048)
      p.z += bust * gy * Math.min(1, gx) * front
    }
    if (back > 0) {
      const gy = gauss((p.y - (L.hipY - 0.05)) / 0.065)
      const gx = gauss((p.x - 0.07) / 0.065) + gauss((p.x + 0.07) / 0.065)
      p.z -= glute * gy * Math.min(1, gx) * back
    }
  }

  const torsoPoint = (y: number, theta: number, off: number) => {
    const f = torso(y, off)
    const p = f.c.clone().addScaledVector(f.x, Math.sin(theta)).addScaledVector(f.z, Math.cos(theta))
    displace(p, theta)
    return p
  }

  const hipX = L.hipX * h * (0.75 + 0.25 * w)
  const legCurve = curve(L.leg)
  const legs = [-1, 1].map((side) =>
    limb(
      [
        new Vector3(side * hipX, L.hipY, 0.002),
        new Vector3(side * (hipX - (c.sex === "woman" ? 0.012 : 0.004)), L.kneeY, 0.008),
        new Vector3(side * (hipX - 0.004), 0.07, -0.012),
      ],
      (t) => legCurve(t) * limbW,
      FRONT,
    ),
  )

  const shoulderX = L.shoulderX * s * (0.8 + 0.2 * w)
  const armCurve = curve(L.arm)
  const armPoints = [-1, 1].map((side) => [
    new Vector3(side * shoulderX, L.shoulderY, -0.01),
    new Vector3(side * (shoulderX + 0.04), L.elbowY, -0.03),
    new Vector3(side * (shoulderX + 0.058), L.wristY, 0.002),
  ])
  const arms = armPoints.map((points) => limb(points, (t) => armCurve(t) * limbW, FRONT))

  const fl = L.foot
  const footY = curve([
    [0, 0.046],
    [0.3, 0.045],
    [0.7, 0.03],
    [1, 0.022],
  ])
  const footW = curve([
    [0, 0.026],
    [0.12, 0.035],
    [0.55, 0.042],
    [0.85, 0.041],
    [1, 0.018],
  ])
  const footH = curve([
    [0, 0.028],
    [0.12, 0.04],
    [0.4, 0.042],
    [0.75, 0.025],
    [1, 0.012],
  ])
  const feet = [-1, 1].map((side) => {
    const x = side * (hipX - 0.002)
    return (t: number, off: number, flat = 0): Frame => ({
      c: new Vector3(x, footY(t) * (1 - flat) + flat * 0.014, (-0.062 + 0.235 * t) * fl),
      x: new Vector3(-(footW(t) * fl + off), 0, 0),
      z: new Vector3(0, flat ? 0.014 : footH(t) + off, 0),
    })
  })

  return { L, w, limbW, torso, top, displace, torsoPoint, legs, arms, armPoints, feet, sex: c.sex }
}

function torsoShell(m: Model, y0: number, y1: number, off: number, opts: { rings?: number; arc?: Arc; capStart?: boolean; capEnd?: boolean } = {}) {
  const rings = opts.rings ?? Math.max(6, Math.round((y1 - y0) / 0.018))
  const frames: Frame[] = []
  for (let i = 0; i < rings; i += 1) frames.push(m.torso(y0 + ((y1 - y0) * i) / (rings - 1), off))
  return tube(frames, 40, { arc: opts.arc, capStart: opts.capStart, capEnd: opts.capEnd, displace: m.displace })
}

function footShell(m: Model, side: number, off: number, flat = 0) {
  const frames: Frame[] = []
  for (let i = 0; i < 18; i += 1) frames.push(m.feet[side](i / 17, off, flat))
  return tube(frames, 22, {
    capStart: true,
    capEnd: true,
    displace: flat ? undefined : (p) => {
      if (off > 0) p.y = Math.max(p.y, 0.022)
    },
  })
}

function body(m: Model, parts: Part[]) {
  const L = m.L
  parts.push({
    geometry: torsoShell(m, L.bottom, m.top, 0, { rings: 56, capStart: true, capEnd: true }),
    material: "skin",
  })
  for (const leg of m.legs) {
    parts.push({ geometry: tube(sample(leg, 0, 1, 0, 40), 26, { capStart: true, capEnd: true }), material: "skin" })
  }
  m.arms.forEach((arm, i) => {
    parts.push({ geometry: tube(sample(arm, 0, 1, 0, 34), 22, { capStart: true, capEnd: true }), material: "skin" })
    const [shoulder, elbow, wrist] = m.armPoints[i]
    const dir = wrist.clone().sub(elbow).normalize()
    parts.push({
      geometry: ellipsoid(wrist.clone().addScaledVector(dir, 0.06), new Vector3(0.021, 0.07, 0.04).multiplyScalar(m.limbW * (m.sex === "woman" ? 0.92 : 1)), { dir }),
      material: "skin",
    })
    parts.push({ geometry: shoulderCap(m, i, 0), material: "skin" })
  })
  const neckR = L.neckR * (0.85 + 0.15 * m.w)
  const neck = limb([new Vector3(0, L.neck - 0.06, -0.012), new Vector3(0, L.neck + 0.12, 0.0)], () => neckR, FRONT)
  parts.push({ geometry: tube(sample(neck, 0, 1, 0, 8), 24), material: "skin" })
  parts.push({ geometry: ellipsoid(L.head, L.headR), material: "skin" })
  parts.push({ geometry: ellipsoid(L.jaw, L.jawR), material: "skin" })
  parts.push({
    geometry: ellipsoid(L.head.clone().add(new Vector3(0, -0.022, L.headR.z * 0.93)), new Vector3(0.01, 0.022, 0.016), {
      dir: new Vector3(0, -1, 0.35),
    }),
    material: "skin",
  })
  for (const side of [-1, 1]) {
    parts.push({
      geometry: ellipsoid(L.head.clone().add(new Vector3(side * L.headR.x * 0.98, -0.012, -0.004)), new Vector3(0.011, 0.028, 0.019)),
      material: "skin",
    })
  }
  for (let side = 0; side < 2; side += 1) {
    parts.push({ geometry: footShell(m, side, 0), material: "skin" })
  }
}

function hair(m: Model, c: Shape, parts: Part[]) {
  const { head, headR } = m.L
  const cap = (scale: number, theta: number, tilt: number, lift = 0) =>
    ellipsoid(head.clone().add(new Vector3(0, 0.004 + lift, -0.006)), headR.clone().multiplyScalar(scale), { theta, tilt })
  const curtain = (y0: number, y1: number, r0: number, r1: number, gap0: number, gap1: number, back = 0) => {
    const frames: Frame[] = []
    const rings = 16
    for (let i = 0; i < rings; i += 1) {
      const t = i / (rings - 1)
      const y = y0 + (y1 - y0) * t
      const r = r0 + (r1 - r0) * smoothstep(0, 1, t)
      frames.push({
        c: new Vector3(0, y, head.z - 0.008 - back * t),
        x: new Vector3(headR.x * r, 0, 0),
        z: new Vector3(0, 0, headR.z * r),
      })
    }
    return tube(frames, 36, {
      arc: (i) => {
        const gap = gap0 + (gap1 - gap0) * (i / (rings - 1))
        return [gap, TAU - gap]
      },
    })
  }
  const add = (geometry: BufferGeometry) => parts.push({ geometry, material: "hair" })
  switch (c.hair) {
    case "crop":
      add(cap(1.035, 1.72, -0.5))
      break
    case "short":
      add(cap(1.07, 1.74, -0.52))
      add(cap(1.1, 1.05, -0.12, 0.006))
      break
    case "medium":
      add(cap(1.12, 1.86, -0.42, 0.004))
      add(curtain(head.y + 0.02, head.y - 0.075, 1.1, 1.16, 1.05, 1.2))
      break
    case "bob":
      add(cap(1.1, 1.8, -0.42, 0.004))
      add(curtain(head.y + 0.03, head.y - 0.105, 1.1, 1.22, 0.92, 1.0))
      break
    case "long":
      add(cap(1.09, 1.8, -0.42, 0.004))
      add(curtain(head.y + 0.03, head.y - 0.31, 1.09, 1.42, 0.95, 1.12, 0.02))
      break
    case "bun":
      add(cap(1.05, 1.76, -0.5))
      add(ellipsoid(head.clone().add(new Vector3(0, 0.082, -0.082)), new Vector3(0.05, 0.046, 0.05)))
      break
    case "ponytail": {
      add(cap(1.05, 1.76, -0.5))
      add(ellipsoid(head.clone().add(new Vector3(0, 0.05, -0.1)), new Vector3(0.026, 0.026, 0.026)))
      const tail = limb(
        [
          head.clone().add(new Vector3(0, 0.05, -0.11)),
          head.clone().add(new Vector3(0, -0.04, -0.135)),
          head.clone().add(new Vector3(0, -0.24, -0.12)),
        ],
        curve([
          [0, 0.026],
          [0.25, 0.034],
          [1, 0.008],
        ]),
        new Vector3(1, 0, 0),
        0.8,
      )
      add(tube(sample(tail, 0, 1, 0, 20), 16, { capStart: true, capEnd: true }))
      break
    }
  }
}

function sleeve(m: Model, side: number, t1: number, off: number, flare = 0) {
  return tube(sample(m.arms[side], 0, t1, (t) => off + flare * smoothstep(0.1, t1, t), 24), 22)
}

function shoulderCap(m: Model, side: number, off: number) {
  const shoulder = m.armPoints[side][0]
  const r = 0.047 * m.limbW * (m.sex === "woman" ? 0.88 : 1)
  return ellipsoid(
    shoulder.clone().add(new Vector3(-Math.sign(shoulder.x) * 0.012, -0.008, -0.004)),
    new Vector3(r * 1.05 + off, r + off, r * 1.08 + off),
  )
}

function top(m: Model, c: Shape, parts: Part[]) {
  const L = m.L
  const neckR = L.neckR * (0.85 + 0.15 * m.w)
  const add = (geometry: BufferGeometry, material: MaterialKey = "top") => parts.push({ geometry, material })
  const neckTop = L.neck - 0.004
  if (c.top === "tank") {
    add(torsoShell(m, 0.92, L.shoulderY + 0.012, 0.012))
    for (const side of [-1, 1]) {
      const x = side * (L.shoulderX * 0.62)
      const strap = limb(
        [
          m.torsoPoint(L.shoulderY - 0.005, Math.asin(Math.min(0.95, Math.abs(x) / m.torso(L.shoulderY, 0).x.x)) * side, 0.012),
          new Vector3(x * 1.05, L.neck - 0.02, -0.01),
          m.torsoPoint(L.shoulderY - 0.005, Math.PI - Math.asin(Math.min(0.95, Math.abs(x) / m.torso(L.shoulderY, 0).x.x)) * side, 0.012),
        ],
        () => 0.008,
        new Vector3(1, 0, 0),
      )
      add(tube(sample(strap, 0, 1, 0, 14), 10))
    }
    return
  }
  const knit = c.top === "knit"
  const shirt = c.top === "shirt"
  const off = knit ? 0.022 : shirt ? 0.017 : 0.016
  const hem = shirt ? 0.88 : knit ? 0.91 : 0.92
  add(torsoShell(m, hem, neckTop, off))
  const t1 = c.top === "tee" ? 0.36 : 0.95
  for (let side = 0; side < 2; side += 1) {
    add(sleeve(m, side, t1, off - 0.004, c.top === "tee" ? 0.006 : shirt ? 0.003 : 0))
    add(shoulderCap(m, side, off - 0.006))
  }
  if (knit) {
    add(torsoShell(m, hem - 0.004, hem + 0.05, off + 0.006, { rings: 6 }))
    add(ring(new Vector3(0, neckTop - 0.004, m.torso(neckTop, 0).c.z), neckR + 0.02, 0.012, 0.92))
  } else if (shirt) {
    const collar: Frame[] = []
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5
      const r = neckR + 0.012 + t * 0.012
      collar.push({
        c: new Vector3(0, neckTop - 0.012 + t * 0.05, -0.008),
        x: new Vector3(r, 0, 0),
        z: new Vector3(0, 0, r * 0.98),
      })
    }
    add(tube(collar, 32, { arc: () => [0.42, TAU - 0.42] }))
    for (let y = 1.0; y < neckTop - 0.06; y += 0.085) {
      add(ellipsoid(m.torsoPoint(y, 0, off + 0.004), new Vector3(0.0065, 0.0065, 0.003)), "button")
    }
    const placket: Frame[] = []
    for (let i = 0; i < 24; i += 1) {
      const y = hem + ((neckTop - 0.03 - hem) * i) / 23
      const p = m.torsoPoint(y, 0, off + 0.001)
      placket.push({ c: p, x: new Vector3(0.012, 0, 0), z: new Vector3(0, 0, 0.0015) })
    }
    add(tube(placket, 8))
  } else {
    add(ring(new Vector3(0, neckTop - 0.002, m.torso(neckTop, 0).c.z), neckR + 0.014, 0.007, 0.92))
  }
}

function bottom(m: Model, c: Shape, parts: Part[]) {
  const L = m.L
  const add = (geometry: BufferGeometry) => parts.push({ geometry, material: "bottom" })
  const off = 0.01
  add(torsoShell(m, L.bottom, L.waist, off, { capStart: true }))
  add(torsoShell(m, L.waist - 0.035, L.waist + 0.002, off + 0.003, { rings: 5 }))
  if (c.bottom === "skirt") {
    const frames: Frame[] = []
    const start = m.torso(0.9, off)
    const hemY = 0.4
    for (let i = 0; i < 18; i += 1) {
      const t = i / 17
      const y = 0.9 - (0.9 - hemY) * t
      const k = 1 + 0.32 * t
      frames.push({
        c: new Vector3(0, y, start.c.z - 0.01 * t),
        x: new Vector3(start.x.x * k, 0, 0),
        z: new Vector3(0, 0, start.z.z * (1 + 0.42 * t)),
      })
    }
    parts.push({ geometry: torsoShell(m, 0.9, L.waist, off + 0.003), material: "bottom" })
    add(tube(frames, 44))
    return
  }
  const t1 = c.bottom === "shorts" ? 0.4 : 0.975
  const min =
    c.bottom === "jeans"
      ? (t: number) => (m.sex === "woman" ? 0.058 : 0.062) * smoothstep(0.2, 0.42, t)
      : c.bottom === "chinos"
        ? (t: number) => (0.06 - 0.008 * t) * smoothstep(0.2, 0.42, t)
        : c.bottom === "wide"
          ? (t: number) => (0.075 + 0.05 * t) * smoothstep(0.05, 0.3, t)
          : (t: number) => 0.088 + 0.01 * t
  for (const leg of m.legs) {
    const frames = sample(leg, 0, t1, off, 34).map((frame, i) => {
      const t = (t1 * i) / 33
      const base = frame.x.length()
      const r = Math.max(base, min(t) * (m.sex === "woman" ? 0.96 : 1))
      return { c: frame.c, x: frame.x.setLength(r), z: frame.z.setLength(r) }
    })
    add(tube(frames, 26))
  }
}

function shoes(m: Model, c: Shape, parts: Part[]) {
  const boots = c.shoes === "boots"
  const loafers = c.shoes === "loafers"
  for (let side = 0; side < 2; side += 1) {
    parts.push({ geometry: footShell(m, side, loafers ? 0.008 : 0.012), material: "shoes" })
    parts.push({ geometry: footShell(m, side, loafers ? 0.011 : 0.017, 1), material: "sole" })
    if (boots) {
      parts.push({ geometry: tube(sample(m.legs[side], 0.8, 1, 0.014, 10), 22), material: "shoes" })
    }
    if (loafers) {
      const f = m.feet[side](0.55, 0.009)
      parts.push({
        geometry: ellipsoid(f.c.clone().add(new Vector3(0, f.z.y * 0.92, 0)), new Vector3(Math.abs(f.x.x) * 0.7, 0.004, 0.012)),
        material: "sole",
      })
    }
  }
}

function outer(m: Model, c: Shape, parts: Part[]) {
  if (c.outer === "none") return
  const L = m.L
  const add = (geometry: BufferGeometry) => parts.push({ geometry, material: "outer" })
  const neckTop = L.neck + 0.006
  const neckR = L.neckR * (0.85 + 0.15 * m.w)
  const off = c.outer === "coat" ? 0.046 : c.outer === "jacket" ? 0.04 : 0.034
  const hem = c.outer === "cardigan" ? 0.87 : c.outer === "jacket" ? 0.88 : 0.92
  const gap = (y: number) =>
    c.outer === "cardigan" ? 0.16 + 0.42 * smoothstep(1.08, 1.42, y) : 0.22 + 0.32 * smoothstep(1.18, 1.44, y)
  const rings = 40
  const ys: number[] = []
  for (let i = 0; i < rings; i += 1) ys.push(hem + ((neckTop - hem) * i) / (rings - 1))
  const frames = ys.map((y) => m.torso(y, off))
  if (c.outer === "coat") {
    const start = m.torso(0.92, off)
    const lower: Frame[] = []
    const lowerYs: number[] = []
    for (let i = 0; i < 16; i += 1) {
      const t = i / 15
      const y = 0.5 + (0.92 - 0.5) * t
      lowerYs.push(y)
      const k = 1 + 0.2 * (1 - t)
      lower.push({
        c: new Vector3(0, y, start.c.z - 0.012 * (1 - t)),
        x: new Vector3(start.x.x * k, 0, 0),
        z: new Vector3(0, 0, start.z.z * (1 + 0.3 * (1 - t))),
      })
    }
    const all = [...lower.slice(0, -1), ...frames]
    const allYs = [...lowerYs.slice(0, -1), ...ys]
    add(tube(all, 44, { arc: (i) => [gap(allYs[i]), TAU - gap(allYs[i])], displace: m.displace }))
  } else {
    add(tube(frames, 44, { arc: (i) => [gap(ys[i]), TAU - gap(ys[i])], displace: m.displace }))
  }
  for (let side = 0; side < 2; side += 1) {
    add(sleeve(m, side, 0.94, off - 0.004, 0.006))
    add(shoulderCap(m, side, off - 0.002))
  }
  if (c.outer !== "cardigan") {
    const collar: Frame[] = []
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5
      const r = neckR + 0.03 + t * 0.022
      collar.push({ c: new Vector3(0, neckTop - 0.02 + t * 0.05, -0.012), x: new Vector3(r, 0, 0), z: new Vector3(0, 0, r) })
    }
    add(tube(collar, 32, { arc: () => [0.62, TAU - 0.62] }))
  }
}

function underwear(m: Model, parts: Part[]) {
  const L = m.L
  const add = (geometry: BufferGeometry) => parts.push({ geometry, material: "underwear" })
  const top = m.sex === "woman" ? 0.93 : 0.95
  add(torsoShell(m, L.bottom, top, 0.005, { capStart: true }))
  add(torsoShell(m, top - 0.022, top + 0.002, 0.008, { rings: 4 }))
  const t1 = m.sex === "woman" ? 0.05 : 0.15
  for (const leg of m.legs) add(tube(sample(leg, 0, t1, 0.005, 8), 26))
  if (m.sex === "woman") {
    add(torsoShell(m, 1.16, 1.305, 0.005, { rings: 18 }))
    for (const side of [-1, 1]) {
      const x = side * 0.07 * m.w
      const strap = limb(
        [
          m.torsoPoint(1.3, Math.asin(Math.abs(x) / m.torso(1.3, 0).x.x) * side, 0.006),
          new Vector3(side * 0.088 * m.w, L.shoulderY + 0.035, -0.004),
          m.torsoPoint(1.3, Math.PI - Math.asin(Math.abs(x) / m.torso(1.3, 0).x.x) * side, 0.006),
        ],
        () => 0.005,
        new Vector3(1, 0, 0),
      )
      add(tube(sample(strap, 0, 1, 0, 16), 8))
    }
  }
}

export function buildParts(c: Shape): Part[] {
  const m = model(c)
  const parts: Part[] = []
  body(m, parts)
  hair(m, c, parts)
  if (c.underwear) {
    underwear(m, parts)
    return parts
  }
  bottom(m, c, parts)
  top(m, c, parts)
  shoes(m, c, parts)
  outer(m, c, parts)
  return parts
}

