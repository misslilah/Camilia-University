export type Vec3 = [number, number, number]

export type Phase =
  | "arrival"
  | "opening"
  | "inside"
  | "sitting"
  | "leaving"
  | "toRoom"
  | "room"
  | "cupboard"
  | "wardrobe"
  | "computer"
  | "fromRoom"

export type Chapter = {
  id: string
  numeral: string
  title: string
  body: string
}

export type Seat = {
  id: string
  row: number
  n: number
  label: string
  position: Vec3
  yaw: number
  sit: Vec3
  look: Vec3
}

export const BOARD_Z = -7.28
export const BOARD_SURFACE_Z = -7.26
export const FRONT_Z = -7.42
export const BACK_Z = 8.3
export const INNER_X = 8.2
export const CEILING_Y = 6.45
export const SILL_Y = 1.52
export const DOOR_HEIGHT = 2.56
export const DOOR_HALF = 1.16

export const BOARD = {
  width: 6.7,
  height: 3.05,
  centerY: 2.72,
  surfaceZ: BOARD_SURFACE_Z,
}

export const OUTSIDE = {
  position: [0, SILL_Y + 1.58, BACK_Z + 4.9] as Vec3,
  look: [0, SILL_Y + 1.18, BACK_Z - 0.4] as Vec3,
  fov: 44,
}

// The bedroom door sits in the facade, right of the double doors.
export const ROOM_DOOR = {
  x: 2.06,
  width: 0.84,
  height: 2.12,
  face: BACK_Z + 0.24,
}

// The bedroom is built away from the hall; a fade to black covers the jump.
export const ROOM_ORIGIN: Vec3 = [40, 0, 0]

export const ROOM = {
  width: 4.4,
  depth: 4,
  height: 2.7,
}

export const ROOM_APPROACH = {
  position: [ROOM_DOOR.x - 0.04, SILL_Y + 1.58, BACK_Z + 1.15] as Vec3,
  look: [ROOM_DOOR.x + 0.04, SILL_Y + 1.32, BACK_Z - 1.4] as Vec3,
}

export const ROOM_VIEW = {
  position: [ROOM_ORIGIN[0] + 0.3, 1.56, ROOM_ORIGIN[2] + 1.62] as Vec3,
  look: [ROOM_ORIGIN[0] - 0.2, 1.02, ROOM_ORIGIN[2] - 2] as Vec3,
  fov: 60,
}

export function inRoom(phase: Phase) {
  return phase === "room" || phase === "cupboard" || phase === "wardrobe" || phase === "computer" || phase === "fromRoom"
}

// Bedroom-local origin of the nightstand. The open tray sits 0.34 ahead of it
// (the drawer slides 0.32, and its floor is centered 0.02 in front).
export const NIGHTSTAND_AT = {
  x: -ROOM.width / 2 + 1.25,
  z: -ROOM.depth / 2 + 0.26,
}

const CUPBOARD_CENTER: Vec3 = [
  ROOM_ORIGIN[0] + NIGHTSTAND_AT.x,
  0.33,
  ROOM_ORIGIN[2] + NIGHTSTAND_AT.z + 0.34,
]

export const CUPBOARD_WATCH = {
  position: [CUPBOARD_CENTER[0] + 0.12, 1.08, CUPBOARD_CENTER[2] + 1.42] as Vec3,
  look: [CUPBOARD_CENTER[0], 0.46, CUPBOARD_CENTER[2] - 0.04] as Vec3,
  fov: 46,
}

export const CUPBOARD_ZOOM = {
  position: [CUPBOARD_CENTER[0] + 0.01, 0.7, CUPBOARD_CENTER[2] + 0.58] as Vec3,
  look: [CUPBOARD_CENTER[0], 0.4, CUPBOARD_CENTER[2]] as Vec3,
  fov: 32,
}

export const CUPBOARD_ABOVE = {
  position: [CUPBOARD_CENTER[0], CUPBOARD_CENTER[1] + 0.78, CUPBOARD_CENTER[2] + 0.08] as Vec3,
  look: [CUPBOARD_CENTER[0], CUPBOARD_CENTER[1], CUPBOARD_CENTER[2]] as Vec3,
  fov: 28,
}

// Bedroom-local placement of the desk; the monitor screen sits on it.
export const DESK = { x: 0.48, z: -ROOM.depth / 2 + 0.34 }

export const SCREEN = {
  center: [ROOM_ORIGIN[0] + DESK.x - 0.08, 0.758 + 0.43, ROOM_ORIGIN[2] + DESK.z - 0.12 + 0.019] as Vec3,
  width: 0.62,
  height: 0.35,
}

export const COMPUTER_FOV = 38

export function computerDuration(reduced: boolean) {
  return reduced ? 0.3 : 1.25
}

// Bedroom-local placements for the wardrobe corner.
export const WARDROBE = {
  x: ROOM.width / 2 - 0.31,
  z: -0.95,
  width: 1.12,
  depth: 0.6,
  height: 2.06,
}

export const MIRROR = {
  x: ROOM.width / 2 - 0.075,
  z: 0.32,
  width: 0.58,
  height: 1.7,
  bottom: 0.12,
}

export const AVATAR_SPOT: Vec3 = [ROOM_ORIGIN[0] + 1.2, 0, ROOM_ORIGIN[2] + MIRROR.z]

// The wardrobe panel covers part of the screen, so the camera keeps the
// mirror square-on and a lens shift moves it into the free area.
export const WARDROBE_VIEW = {
  wide: {
    position: [ROOM_ORIGIN[0] - 0.3, 1.36, ROOM_ORIGIN[2] + MIRROR.z] as Vec3,
    look: [ROOM_ORIGIN[0] + MIRROR.x, 1.0, ROOM_ORIGIN[2] + MIRROR.z] as Vec3,
    fov: 50,
  },
  narrow: {
    position: [ROOM_ORIGIN[0] - 1.9, 1.2, ROOM_ORIGIN[2] + MIRROR.z] as Vec3,
    look: [ROOM_ORIGIN[0] + MIRROR.x, 0.96, ROOM_ORIGIN[2] + MIRROR.z] as Vec3,
    fov: 58,
  },
}

export const PANEL_BREAKPOINT = 640
export const PANEL_WIDTH = 392
export const SHEET_HEIGHT = 0.52

export function wardrobeDuration(reduced: boolean) {
  return reduced ? 0.3 : 1.35
}

export function leaveDuration(reduced: boolean) {
  return reduced ? 0.3 : 0.75
}

export function toRoomDuration(reduced: boolean) {
  return reduced ? 0.6 : 2
}

export function roomDoorDuration(reduced: boolean) {
  return reduced ? 0.2 : 0.95
}

export function fromRoomDuration(reduced: boolean) {
  return reduced ? 0.3 : 0.75
}

export const INSIDE = {
  position: [0, SILL_Y + 1.66, BACK_Z - 1.28] as Vec3,
  look: [0, 2.05, -2.4] as Vec3,
  fov: 44,
}

export const SIT_FOV = 37

export const CHALK_FONT = "/fonts/Caveat-Medium.ttf"
export const SERIF_FONT = "/fonts/CormorantGaramond-SemiBold.ttf"

const TIERS: { y: number; z0: number; z1: number; prev: number }[] = [
  { y: 0.38, z0: -1.2, z1: 0.7, prev: 0 },
  { y: 0.76, z0: 0.7, z1: 2.6, prev: 0.38 },
  { y: 1.14, z0: 2.6, z1: 4.5, prev: 0.76 },
  { y: 1.52, z0: 4.5, z1: BACK_Z, prev: 1.14 },
]

const ROW_SPEC: { z: number; y: number; perSide: number; span: number }[] = [
  { z: -2.25, y: 0, perSide: 4, span: 3.2 },
  { z: -0.25, y: 0.38, perSide: 4, span: 3.75 },
  { z: 1.65, y: 0.76, perSide: 5, span: 4.4 },
  { z: 3.55, y: 1.14, perSide: 5, span: 5.05 },
  { z: 5.65, y: 1.52, perSide: 6, span: 5.7 },
]

export const HALL_TIERS = TIERS

function yawTowardBoard(x: number, z: number) {
  return Math.atan2(x, z - BOARD_Z)
}

function sitPose(x: number, y: number, z: number, yaw: number): { sit: Vec3; look: Vec3 } {
  const forwardZ = 0.03
  const wx = forwardZ * Math.sin(yaw)
  const wz = forwardZ * Math.cos(yaw)
  return {
    sit: [x + wx, y + 1.15, z + wz],
    look: [0, BOARD.centerY - 0.05, BOARD.surfaceZ],
  }
}

const LETTERS = ["A", "B", "C", "D", "E"]

function buildSeats(): Seat[] {
  const seats: Seat[] = []
  ROW_SPEC.forEach((row, r) => {
    const xs: number[] = []
    for (let i = 0; i < row.perSide; i++) {
      const t = (i + 0.5) / row.perSide
      const dist = 0.74 + t * row.span
      xs.push(-dist)
    }
    xs.reverse()
    for (let i = 0; i < row.perSide; i++) {
      const t = (i + 0.5) / row.perSide
      xs.push(0.74 + t * row.span)
    }
    xs.forEach((x, i) => {
      const z = row.z + x * x * 0.0065
      const yaw = yawTowardBoard(x, z)
      const pose = sitPose(x, row.y, z, yaw)
      const n = i + 1
      seats.push({
        id: `${LETTERS[r]}${n}`,
        row: r,
        n,
        label: `Row ${LETTERS[r]} · seat ${n}`,
        position: [x, row.y, z],
        yaw,
        sit: pose.sit,
        look: pose.look,
      })
    })
  })
  return seats
}

export const SEATS: Seat[] = buildSeats()

export function seatById(id: string | null): Seat | null {
  if (!id) return null
  return SEATS.find((seat) => seat.id === id) ?? null
}

export function neighbor(id: string | null, dir: "left" | "right" | "up" | "down"): string {
  if (!id) {
    const row = SEATS.filter((seat) => seat.row === 2)
    return row[Math.floor(row.length / 2)]?.id ?? SEATS[0].id
  }
  const seat = seatById(id)
  if (!seat) return id
  const rowSeats = SEATS.filter((item) => item.row === seat.row)
  const index = rowSeats.findIndex((item) => item.id === id)
  if (dir === "left") return rowSeats[Math.max(0, index - 1)].id
  if (dir === "right") return rowSeats[Math.min(rowSeats.length - 1, index + 1)].id
  const nextRow = seat.row + (dir === "up" ? -1 : 1)
  const candidates = SEATS.filter((item) => item.row === nextRow)
  if (!candidates.length) return id
  return candidates.reduce((best, item) =>
    Math.abs(item.position[0] - seat.position[0]) < Math.abs(best.position[0] - seat.position[0])
      ? item
      : best,
  ).id
}

export const CHAPTERS: Chapter[] = [
  {
    id: "cours",
    numeral: "01",
    title: "Courses",
    body: "Coming soon",
  },
  {
    id: "examinations",
    numeral: "02",
    title: "Examinations",
    body: "Coming soon",
  },
  {
    id: "records",
    numeral: "03",
    title: "Academic Records",
    body: "Coming soon",
  },
  {
    id: "materials",
    numeral: "04",
    title: "Study Materials",
    body: "Coming soon",
  },
]

const ENTER_KEYS: { t: number; position: Vec3; look: Vec3 }[] = [
  { t: 0, position: OUTSIDE.position, look: OUTSIDE.look },
  { t: 0.18, position: [0, 3.1, 11.35], look: [0, 2.62, 5.2] },
  { t: 0.4, position: [0, 3.08, 9.25], look: [0, 2.32, -0.2] },
  { t: 0.64, position: [0, 3.14, 7.72], look: [0, 2.12, -2.6] },
  { t: 0.84, position: [0.05, 3.18, 7.2], look: [0, 2.06, -2.5] },
  { t: 1, position: INSIDE.position, look: INSIDE.look },
]

export function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export function sampleEnter(amount: number, outP: { set: (x: number, y: number, z: number) => void }, outL: { set: (x: number, y: number, z: number) => void }) {
  const t = smootherstep(amount)
  let index = 0
  while (index < ENTER_KEYS.length - 2 && ENTER_KEYS[index + 1].t < t) index += 1
  const a = ENTER_KEYS[index]
  const b = ENTER_KEYS[index + 1]
  const span = b.t - a.t || 1
  const local = (t - a.t) / span
  outP.set(
    a.position[0] + (b.position[0] - a.position[0]) * local,
    a.position[1] + (b.position[1] - a.position[1]) * local,
    a.position[2] + (b.position[2] - a.position[2]) * local,
  )
  outL.set(
    a.look[0] + (b.look[0] - a.look[0]) * local,
    a.look[1] + (b.look[1] - a.look[1]) * local,
    a.look[2] + (b.look[2] - a.look[2]) * local,
  )
}

export function doorDuration(reduced: boolean) {
  return reduced ? 0.28 : 1.5
}

export function sitDuration(reduced: boolean) {
  return reduced ? 0.4 : 1.85
}

export function riseDuration(reduced: boolean) {
  return reduced ? 0.4 : 1.3
}

export function doorAmount(phase: Phase, openingElapsed: number, reduced: boolean) {
  if (phase === "arrival" || phase === "toRoom" || inRoom(phase)) return 0
  if (phase !== "opening") return 1
  const duration = doorDuration(reduced)
  const t = Math.min(1, Math.max(0, openingElapsed / duration))
  return smootherstep(t)
}

export function enterDuration(reduced: boolean) {
  return reduced ? 0.7 : 4.8
}

export function leatherTint(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 33 + id.charCodeAt(i)) >>> 0
  const palette = ["#742433", "#68202e", "#812a3a", "#6c2834"]
  return palette[hash % palette.length]
}
