export type DesktopAppId = "files" | "courses" | "browser" | "notes" | "trash" | "patreon" | "profile" | "mail" | "admin"

export type Cell = { col: number; row: number }

export type MonitorIcon = {
  id: DesktopAppId
  name: string
  from: string
  to: string
  mark: string
  col: number
  row: number
  badge: number
}

export const MONITOR_APPS: { id: DesktopAppId; name: string; from: string; to: string; mark: string }[] = [
  { id: "files", name: "My Files", from: "#e8b04a", to: "#c98a24", mark: "F" },
  { id: "courses", name: "Courses", from: "#7f5bd6", to: "#5435a8", mark: "C" },
  { id: "browser", name: "Browser", from: "#4c8df0", to: "#2a5fc4", mark: "B" },
  { id: "notes", name: "Notes", from: "#4ac17a", to: "#2b8d55", mark: "N" },
  { id: "trash", name: "Trash", from: "#8b93a3", to: "#5d6575", mark: "T" },
  { id: "patreon", name: "Patreon", from: "#ff8f6b", to: "#e25b32", mark: "P" },
  { id: "profile", name: "Profil", from: "#8d3d4e", to: "#5c2433", mark: "R" },
  { id: "mail", name: "Mail", from: "#c45b6a", to: "#8d3044", mark: "M" },
  { id: "admin", name: "Admin", from: "#c6a15a", to: "#8a6428", mark: "A" },
]

export const INITIAL_CELLS: Record<DesktopAppId, Cell> = {
  files: { col: 0, row: 0 },
  courses: { col: 0, row: 1 },
  browser: { col: 0, row: 2 },
  notes: { col: 0, row: 3 },
  trash: { col: 0, row: 4 },
  patreon: { col: 1, row: 0 },
  profile: { col: 1, row: 1 },
  mail: { col: 1, row: 3 },
  admin: { col: 1, row: 2 },
}

const KEY = "camilia-desktop-cells"
const listeners = new Set<() => void>()
let cells: Record<DesktopAppId, Cell> | null = null

export function monitorIcons(input: {
  cells: Record<DesktopAppId, Cell>
  admin: boolean
  badges?: Partial<Record<DesktopAppId, number>>
}): MonitorIcon[] {
  return MONITOR_APPS.filter((app) => input.admin || app.id !== "admin").map((app) => ({
    ...app,
    col: input.cells[app.id]?.col ?? INITIAL_CELLS[app.id].col,
    row: input.cells[app.id]?.row ?? INITIAL_CELLS[app.id].row,
    badge: Math.max(0, input.badges?.[app.id] ?? 0),
  }))
}

export function getCells() {
  if (!cells) cells = readCells()
  return cells
}

export function getServerCells() {
  return INITIAL_CELLS
}

export function saveCells(next: Record<DesktopAppId, Cell>) {
  cells = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // The room still shows this visit's arrangement when storage is blocked.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeCells(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readCells(): Record<DesktopAppId, Cell> {
  const next = { ...INITIAL_CELLS }
  if (typeof window === "undefined") return next
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "") as Record<string, { col?: unknown; row?: unknown }>
    for (const app of MONITOR_APPS) {
      const cell = parsed?.[app.id]
      if (!cell || !Number.isInteger(cell.col) || !Number.isInteger(cell.row)) continue
      if ((cell.col as number) < 0 || (cell.row as number) < 0 || (cell.col as number) > 11 || (cell.row as number) > 11) continue
      next[app.id] = { col: cell.col as number, row: cell.row as number }
    }
  } catch {
    return { ...INITIAL_CELLS }
  }
  return next
}
