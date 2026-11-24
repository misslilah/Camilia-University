"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type PointerEvent as ReactPointerEvent } from "react"
import {
  ArrowLeft,
  Award,
  Folder,
  Globe,
  GraduationCap,
  LogOut,
  Mail,
  Maximize2,
  Minimize2,
  Minus,
  NotebookPen,
  Power,
  Shield,
  Trash2,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react"
import { AdminDesk } from "@/components/experience/Admin"
import { Browser } from "@/components/experience/browser/Browser"
import { Patreon, PatreonMark } from "@/components/experience/Patreon"
import { Mail as Mailbox } from "@/components/experience/Mail"
import { Profile } from "@/components/experience/Profile"
import { reloadLibrary, useLibrary, usePatreonAdmin } from "@/lib/patreon"
import { loadNotices, noticeUpdate, saveNotices, type NoticePost } from "@/lib/patreon-notices"
import { Button } from "@/components/ui/button"
import { PANEL_BREAKPOINT } from "@/lib/scene"
import { useScreenRect, type ScreenRect } from "@/lib/screen-rect"
import { sound } from "@/lib/sound"
import { cn } from "@/lib/utils"

type AppId = "files" | "courses" | "browser" | "notes" | "trash" | "patreon" | "profile" | "mail" | "admin"
type AppIcon = LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>

const APPS: { id: AppId; name: string; icon: AppIcon; tint: string }[] = [
  { id: "files", name: "My Files", icon: Folder, tint: "from-[#e8b04a] to-[#c98a24]" },
  { id: "courses", name: "Courses", icon: GraduationCap, tint: "from-[#7f5bd6] to-[#5435a8]" },
  { id: "browser", name: "Browser", icon: Globe, tint: "from-[#4c8df0] to-[#2a5fc4]" },
  { id: "notes", name: "Notes", icon: NotebookPen, tint: "from-[#4ac17a] to-[#2b8d55]" },
  { id: "trash", name: "Trash", icon: Trash2, tint: "from-[#8b93a3] to-[#5d6575]" },
  { id: "patreon", name: "Patreon", icon: PatreonMark, tint: "from-[#ff8f6b] to-[#e25b32]" },
  { id: "profile", name: "Profil", icon: Award, tint: "from-[#8d3d4e] to-[#5c2433]" },
  { id: "mail", name: "Mail", icon: Mail, tint: "from-[#c45b6a] to-[#8d3044]" },
  { id: "admin", name: "Admin", icon: Shield, tint: "from-[#c6a15a] to-[#8a6428]" },
]

const INITIAL_CELLS: Record<AppId, Cell> = {
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

const app = (id: AppId) => APPS.find((item) => item.id === id) ?? APPS[0]

function isWorkspace(id: AppId) {
  return id === "browser" || id === "patreon" || id === "admin" || id === "profile" || id === "mail"
}

const TASKBAR = 48
const CELL = { w: 92, h: 98, pad: 14 }
const DOUBLE_TAP_MS = 400

type Cell = { col: number; row: number }
type Win = { app: AppId; x: number; y: number; w: number; h: number; z: number; minimized: boolean; maximized: boolean }

const narrowQuery = `(max-width: ${PANEL_BREAKPOINT - 1}px)`

function subscribeNarrow(listener: () => void) {
  const media = window.matchMedia(narrowQuery)
  media.addEventListener("change", listener)
  return () => media.removeEventListener("change", listener)
}

export function useNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  )
}

function useClock(active: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export function ComputerDesktop({
  open,
  onLeave,
  guided = false,
  name = "",
}: {
  open: boolean
  onLeave: () => void
  guided?: boolean
  name?: string
}) {
  const live = useScreenRect()
  const [last, setLast] = useState<ScreenRect | null>(null)
  if (live && live !== last) setLast(live)
  const rect = live ?? last
  const narrow = useNarrow()
  const visible = open && live !== null

  // The desktop is laid out at a comfortable size and scaled down onto small
  // screens; on phones it fills the page instead.
  const scale = narrow || !rect ? 1 : Math.min(1, rect.width / 1000)

  return (
    <>
      <div
        aria-hidden={!visible || guided}
        inert={!visible || guided}
        className={cn(
          "pointer-events-none absolute bottom-7 left-16 z-20 hidden transition-opacity duration-300 sm:block",
          visible && !guided ? "opacity-100" : "opacity-0",
        )}
      >
        <Button
          variant="outline"
          className="pointer-events-auto rounded-full border-[#f3ead7]/30 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md hover:bg-[#f3ead7] hover:text-[#2a1c14]"
          onClick={onLeave}
        >
          <ArrowLeft />
          Back to the room
        </Button>
      </div>
      <div
        role="application"
        aria-label="Computer desktop"
        aria-hidden={!visible}
        inert={!visible}
        data-computer
        className={cn(
          "absolute z-20 overflow-hidden transition-opacity ease-out select-none",
          narrow ? "inset-0" : "rounded-[3px]",
          visible ? "opacity-100 duration-500" : "pointer-events-none opacity-0 duration-200",
        )}
        style={narrow || !rect ? undefined : { left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      >
        {rect && (
          <div
            className="origin-top-left"
            style={
              narrow
                ? { width: "100%", height: "100%" }
                : { width: rect.width / scale, height: rect.height / scale, transform: `scale(${scale})` }
            }
          >
            <Desktop active={visible} scale={scale} onLeave={onLeave} guided={guided} name={name} />
          </div>
        )}
      </div>
    </>
  )
}

function Desktop({
  active,
  scale,
  onLeave,
  guided,
  name,
}: {
  active: boolean
  scale: number
  onLeave: () => void
  guided: boolean
  name: string
}) {
  const area = useRef<HTMLDivElement>(null)
  const [cells, setCells] = useState<Record<AppId, Cell>>(INITIAL_CELLS)
  const [selected, setSelected] = useState<AppId | null>(null)
  const [windows, setWindows] = useState<Win[]>([])
  const [menu, setMenu] = useState(false)
  const [drag, setDrag] = useState<{ app: AppId; x: number; y: number } | null>(null)
  const press = useRef<{ app: AppId; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null)
  const lastTap = useRef<{ app: AppId; at: number } | null>(null)
  const top = useRef(1)
  const now = useClock(active)
  const menuOpen = menu && active
  const library = useLibrary()
  const apps = library.admin ? APPS : APPS.filter((item) => item.id !== "admin")
  const [badge, setBadge] = useState(false)
  const [toasts, setToasts] = useState<NoticePost[]>([])
  const noticed = useRef<{ who: string; memory: ReturnType<typeof loadNotices> } | null>(null)
  const patreonOpen = windows.some((win) => win.app === "patreon" && !win.minimized)

  useEffect(() => {
    if (library.admin) return
    setWindows((list) => list.filter((win) => win.app !== "admin"))
    setSelected((id) => (id === "admin" ? null : id))
  }, [library.admin])

  const size = () => {
    const el = area.current
    return { w: el ? el.clientWidth : 800, h: el ? el.clientHeight : 500 }
  }

  const focused = windows.filter((win) => !win.minimized).sort((a, b) => b.z - a.z)[0]?.app ?? null

  const raise = (id: AppId) => {
    if (id === "patreon") setToasts([])
    top.current += 1
    const z = top.current
    setWindows((list) => list.map((win) => (win.app === id ? { ...win, z, minimized: false } : win)))
  }

  const openApp = (id: AppId) => {
    if (id === "patreon") setToasts([])
    setMenu(false)
    setSelected(id)
    sound.click()
    top.current += 1
    const z = top.current
    setWindows((list) => {
      if (list.some((win) => win.app === id)) {
        return list.map((win) => (win.app === id ? { ...win, z, minimized: false } : win))
      }
      const { w, h } = size()
      const n = list.length
      if (isWorkspace(id)) {
        const preferred = id === "browser" ? { w: 980, h: 660 } : id === "profile" ? { w: 460, h: 700 } : id === "mail" ? { w: 860, h: 560 } : { w: 760, h: 620 }
        const width = Math.min(preferred.w, w - 40)
        const height = Math.min(preferred.h, h - 32)
        const x = Math.max(12, (w - width) / 2 + n * 18)
        const y = Math.max(8, (h - height) / 2 + n * 14)
        return [...list, { app: id, x, y, w: width, h: height, z, minimized: false, maximized: w < 640 }]
      }
      const width = Math.min(420, w - 24)
      const x = Math.max(12, Math.min(w - width - 12, (w - width) / 2 + (n - 1) * 28))
      const y = Math.max(12, Math.min(h - 240, h * 0.16 + n * 26))
      return [...list, { app: id, x, y, w: width, h: 0, z, minimized: false, maximized: false }]
    })
  }

  const minimize = (id: AppId) => setWindows((list) => list.map((win) => (win.app === id ? { ...win, minimized: true } : win)))
  const close = (id: AppId) => setWindows((list) => list.filter((win) => win.app !== id))

  useEffect(() => {
    if (!active) return
    void reloadLibrary()
    const id = window.setInterval(() => void reloadLibrary(), 20_000)
    return () => window.clearInterval(id)
  }, [active])

  useEffect(() => {
    if (!active || guided || !library.ready || !library.connected) return
    const who = library.name?.trim() || "member"
    if (!noticed.current || noticed.current.who !== who) noticed.current = { who, memory: loadNotices(who) }
    const posts = library.items
      .filter((item) => !item.sample && (item.kind === "audio" || item.kind === "video"))
      .map((item) => ({ id: item.id, kind: item.kind, name: item.name }))
    const next = noticeUpdate(noticed.current.memory, posts, patreonOpen)
    noticed.current = { who, memory: next.memory }
    saveNotices(who, next.memory)
    setBadge(next.badge)
    if (next.fresh.length === 0) return
    setToasts((list) => {
      const shown = new Set(list.map((item) => item.id))
      const added = next.fresh.filter((item) => !shown.has(item.id))
      return added.length ? [...added, ...list].slice(0, 3) : list
    })
  }, [active, guided, library.connected, library.items, library.name, library.ready, patreonOpen])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) =>
      window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== toast.id)), 8000),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts])

  const iconDown = (id: AppId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    setMenu(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    const cell = cells[id]
    press.current = {
      app: id,
      x: event.clientX,
      y: event.clientY,
      dx: CELL.pad + cell.col * CELL.w,
      dy: CELL.pad + cell.row * CELL.h,
      moved: false,
    }
  }

  const iconMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p) return
    const dx = (event.clientX - p.x) / scale
    const dy = (event.clientY - p.y) / scale
    if (!p.moved && Math.hypot(dx, dy) < 5) return
    p.moved = true
    setDrag({ app: p.app, x: p.dx + dx, y: p.dy + dy })
  }

  const iconUp = (id: AppId, at: number) => {
    const p = press.current
    press.current = null
    if (p?.moved && drag) {
      const { w, h } = size()
      const cols = Math.max(1, Math.floor((w - CELL.pad) / CELL.w))
      const rows = Math.max(1, Math.floor((h - CELL.pad) / CELL.h))
      const col = Math.max(0, Math.min(cols - 1, Math.round((drag.x - CELL.pad) / CELL.w)))
      const row = Math.max(0, Math.min(rows - 1, Math.round((drag.y - CELL.pad) / CELL.h)))
      setCells((current) => {
        const from = current[id]
        const next = { ...current, [id]: { col, row } }
        const other = apps.find((item) => item.id !== id && current[item.id].col === col && current[item.id].row === row)
        if (other) next[other.id] = from
        return next
      })
      setDrag(null)
      setSelected(id)
      return
    }
    setDrag(null)
    if (lastTap.current?.app === id && at - lastTap.current.at < DOUBLE_TAP_MS) {
      lastTap.current = null
      openApp(id)
      return
    }
    lastTap.current = { app: id, at }
    setSelected(id)
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#08112a] font-sans text-[#eef2fb]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          event.preventDefault()
          setMenu(false)
        }
      }}
    >
      <Wallpaper />
      <div
        ref={area}
        className="relative min-h-0 flex-1"
        onPointerDown={() => {
          setSelected(null)
          setMenu(false)
        }}
      >
        {apps.map((item) => {
          const cell = cells[item.id]
          const dragging = drag?.app === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.id === "patreon" && badge ? "Patreon, 1 new" : item.name}
              aria-pressed={selected === item.id}
              onPointerDown={(event) => iconDown(item.id, event)}
              onPointerMove={iconMove}
              onPointerUp={(event) => iconUp(item.id, event.timeStamp)}
              onPointerCancel={() => {
                press.current = null
                setDrag(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  openApp(item.id)
                } else if (event.key === " ") {
                  event.preventDefault()
                  setSelected(item.id)
                }
              }}
              className={cn(
                "absolute flex w-[84px] touch-none flex-col items-center gap-1.5 rounded-xl px-1 pt-2 pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15a]",
                selected === item.id ? "bg-white/18 ring-1 ring-white/35" : "hover:bg-white/10",
                guided && item.id === "patreon" && "bg-[#ff8f6b]/20 ring-2 ring-[#ffb089] shadow-[0_0_28px_rgba(255,143,107,0.7)]",
                dragging ? "z-30 cursor-grabbing opacity-90" : "transition-[left,top] duration-200",
              )}
              style={{
                left: dragging ? drag.x : CELL.pad + cell.col * CELL.w,
                top: dragging ? drag.y : CELL.pad + cell.row * CELL.h,
              }}
            >
              <span className="relative">
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-[14px] bg-gradient-to-br shadow-[0_6px_16px_rgba(0,0,0,0.35)]",
                    item.tint,
                  )}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                </span>
                {item.id === "patreon" && badge && (
                  <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e23b3b] px-1 text-[11px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                    1
                  </span>
                )}
              </span>
              <span className="text-center text-[12px] leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{item.name}</span>
            </button>
          )
        })}

        {windows.map((win) => (
          <AppWindow
            key={win.app}
            win={win}
            focused={focused === win.app}
            scale={scale}
            bounds={size}
            onFocus={() => raise(win.app)}
            onChange={(patch) => setWindows((list) => list.map((item) => (item.app === win.app ? { ...item, ...patch } : item)))}
            onMinimize={() => minimize(win.app)}
            onClose={() => close(win.app)}
            name={name}
          />
        ))}

        {menuOpen && <StartMenu apps={apps} onOpen={openApp} onLeave={onLeave} guided={guided} />}
        {toasts.length > 0 && (
          <div className="pointer-events-none absolute right-3 bottom-3 z-40 flex w-[min(280px,calc(100%-24px))] flex-col gap-2">
            {toasts.map((toast) => (
              <button
                key={toast.id}
                type="button"
                onClick={() => {
                  setToasts([])
                  openApp("patreon")
                }}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#14213f]/92 px-3 py-2.5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md hover:bg-[#1b2d56]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff8f6b] to-[#e25b32]">
                  <PatreonMark className="h-5 w-5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-white">{toast.kind === "audio" ? "New audio" : "New video"}</span>
                  <span className="block truncate text-[12px] text-white/70">{toast.name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Taskbar
        now={now}
        windows={windows}
        focused={focused}
        menuOpen={menuOpen}
        onStart={() => setMenu((value) => !value)}
        onTask={(id) => {
          setMenu(false)
          const win = windows.find((item) => item.app === id)
          if (win && focused === id && !win.minimized) minimize(id)
          else raise(id)
        }}
        onLeave={onLeave}
        guided={guided}
      />
    </div>
  )
}

function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <path
        d="M32 3 L59 12 V34 C59 51 47 63 32 69 C17 63 5 51 5 34 V12 Z"
        fill="rgba(15,29,61,0.65)"
        stroke="#c6a15a"
        strokeWidth="2.4"
      />
      <path d="M32 10 L52 17 V34 C52 47 43 56 32 61 C21 56 12 47 12 34 V17 Z" fill="none" stroke="#c6a15a" strokeOpacity="0.45" strokeWidth="1" />
      <text x="32" y="45" textAnchor="middle" fontFamily="var(--font-cormorant), serif" fontSize="30" fontWeight="600" fill="#e9d3a1">
        C
      </text>
    </svg>
  )
}

function Wallpaper() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#1f3a70_0%,#11234a_42%,#08112a_100%)]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute inset-x-0 top-[34%] flex -translate-y-1/2 flex-col items-center gap-3">
        <Crest className="h-20 w-[72px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
        <div className="text-center">
          <p className="font-serif text-4xl tracking-wide text-[#f3ead7]">Camilia</p>
          <p className="mt-1 text-[10px] tracking-[0.42em] text-[#c6a15a]">UNIVERSITY</p>
        </div>
      </div>
    </div>
  )
}

const MIN_WINDOW = { w: 360, h: 280 }

function AppWindow({
  win,
  focused,
  scale,
  bounds,
  onFocus,
  onChange,
  onMinimize,
  onClose,
  name,
}: {
  win: Win
  focused: boolean
  scale: number
  bounds: () => { w: number; h: number }
  onFocus: () => void
  onChange: (patch: Partial<Win>) => void
  onMinimize: () => void
  onClose: () => void
  name: string
}) {
  const grab = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null)
  const stretch = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const patreonAdmin = usePatreonAdmin()
  const meta = app(win.app)
  const Icon = meta.icon
  const workspace = isWorkspace(win.app)
  const patreon = win.app === "patreon"
  const area = bounds()
  const width = workspace ? Math.min(win.w, area.w) : Math.min(420, area.w - 24)
  const height = workspace ? Math.min(win.h, area.h) : undefined
  const maximized = workspace && win.maximized
  const toggleMaximize = () => workspace && onChange({ maximized: !win.maximized })

  return (
    <section
      role="dialog"
      aria-label={meta.name}
      hidden={win.minimized}
      onPointerDown={(event) => {
        event.stopPropagation()
        onFocus()
      }}
      className={cn(
        "absolute flex flex-col overflow-hidden border text-[#1d2433] shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        patreon ? "bg-[#ee4f96]" : "bg-[#f7f5f0]",
        maximized ? "rounded-none border-transparent" : "rounded-xl",
        !maximized &&
          (focused ? (patreon ? "border-[#ffc2dc]" : "border-white/60") : patreon ? "border-[#ffc2dc]/70 opacity-95" : "border-white/25 opacity-95"),
      )}
      style={
        maximized
          ? { left: 0, top: 0, width: "100%", height: "100%", zIndex: win.z }
          : { left: win.x, top: win.y, width, height, zIndex: win.z }
      }
    >
      <header
        className={cn(
          "flex h-10 shrink-0 touch-none items-center gap-2 pr-1.5 pl-3",
          !maximized && "cursor-grab active:cursor-grabbing",
          patreon
            ? focused
              ? "bg-[#c72d6e] text-white"
              : "bg-[#b02562] text-white/90"
            : focused
              ? "bg-[#1d2a4a] text-white"
              : "bg-[#3a4560] text-white/80",
        )}
        onDoubleClick={toggleMaximize}
        onPointerDown={(event) => {
          if (event.button !== 0 || maximized) return
          event.currentTarget.setPointerCapture(event.pointerId)
          grab.current = { x: event.clientX, y: event.clientY, wx: win.x, wy: win.y }
        }}
        onPointerMove={(event) => {
          const g = grab.current
          if (!g) return
          const box = bounds()
          const x = g.wx + (event.clientX - g.x) / scale
          const y = g.wy + (event.clientY - g.y) / scale
          onChange({ x: Math.max(-width + 80, Math.min(box.w - 80, x)), y: Math.max(0, Math.min(box.h - 40, y)) })
        }}
        onPointerUp={() => {
          grab.current = null
        }}
        onPointerCancel={() => {
          grab.current = null
        }}
      >
        <Icon className="h-4 w-4 opacity-80" />
        <span className="truncate text-[13px] font-medium">{meta.name}</span>
        {win.app === "patreon" && patreonAdmin && (
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/80">Admin</span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          aria-label={`Minimize ${meta.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onMinimize}
          className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15"
        >
          <Minus className="h-4 w-4" />
        </button>
        {workspace && (
          <button
            type="button"
            aria-label={maximized ? `Restore ${meta.name}` : `Maximize ${meta.name}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleMaximize}
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15"
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          aria-label={`Close ${meta.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#e85d5d]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      {workspace ? (
        <div className="min-h-0 flex-1">
          {win.app === "browser" ? (
            <Browser active={focused && !win.minimized} />
          ) : win.app === "admin" ? (
            <AdminDesk />
          ) : win.app === "profile" ? (
            <Profile name={name} />
          ) : win.app === "mail" ? (
            <Mailbox name={name} />
          ) : (
            <Patreon />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-8 text-center">
          <span className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br shadow-md", meta.tint)}>
            <Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
          </span>
          <p className="font-serif text-2xl">{meta.name} is coming soon</p>
          <p className="max-w-[300px] text-sm text-[#1d2433]/65">
            This app is not available yet. It will open here in a future update of the Camilia desktop.
          </p>
        </div>
      )}
      {workspace && !maximized && (
        <div
          aria-hidden
          className="absolute right-0 bottom-0 z-10 h-4 w-4 cursor-nwse-resize touch-none"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.stopPropagation()
            onFocus()
            event.currentTarget.setPointerCapture(event.pointerId)
            stretch.current = { x: event.clientX, y: event.clientY, w: width, h: height ?? MIN_WINDOW.h }
          }}
          onPointerMove={(event) => {
            const s = stretch.current
            if (!s) return
            const box = bounds()
            onChange({
              w: Math.max(MIN_WINDOW.w, Math.min(box.w - win.x, s.w + (event.clientX - s.x) / scale)),
              h: Math.max(MIN_WINDOW.h, Math.min(box.h - win.y, s.h + (event.clientY - s.y) / scale)),
            })
          }}
          onPointerUp={() => {
            stretch.current = null
          }}
          onPointerCancel={() => {
            stretch.current = null
          }}
        >
          <svg viewBox="0 0 16 16" className={cn("h-4 w-4", patreon ? "text-[#c72d6e]/80" : "text-black/35")}>
            <path d="M14 6 L6 14 M14 10 L10 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </section>
  )
}

function StartMenu({
  apps,
  onOpen,
  onLeave,
  guided,
}: {
  apps: { id: AppId; name: string; icon: AppIcon; tint: string }[]
  onOpen: (id: AppId) => void
  onLeave: () => void
  guided: boolean
}) {
  return (
    <div
      role="menu"
      aria-label="Start"
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-2 left-2 z-[999] w-[260px] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1830]/92 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#c6a15a] font-serif text-lg text-[#14213f]">S</span>
        <div>
          <p className="text-sm font-medium">Student</p>
          <p className="text-[11px] text-white/55">Camilia University</p>
        </div>
      </div>
      <div className="flex flex-col p-1.5">
        {apps.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => onOpen(item.id)}
              className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-left text-[13px] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            >
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br", item.tint)}>
                <Icon className="h-4 w-4 text-white" />
              </span>
              {item.name}
            </button>
          )
        })}
      </div>
      {!guided && (
        <div className="border-t border-white/10 p-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={onLeave}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
              <Power className="h-4 w-4" />
            </span>
            Shut down
          </button>
        </div>
      )}
    </div>
  )
}

function Taskbar({
  now,
  windows,
  focused,
  menuOpen,
  onStart,
  onTask,
  onLeave,
  guided,
}: {
  now: Date
  windows: Win[]
  focused: AppId | null
  menuOpen: boolean
  onStart: () => void
  onTask: (id: AppId) => void
  onLeave: () => void
  guided: boolean
}) {
  return (
    <div
      className="relative z-[1000] flex shrink-0 items-center gap-1.5 border-t border-white/10 bg-[#0a1428]/82 px-2 backdrop-blur-xl"
      style={{ height: TASKBAR }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Start"
        aria-expanded={menuOpen}
        onClick={onStart}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none",
          menuOpen && "bg-white/15",
        )}
      >
        <Crest className="h-6 w-6" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {windows.map((win) => {
          const meta = app(win.app)
          const Icon = meta.icon
          const current = focused === win.app && !win.minimized
          return (
            <button
              key={win.app}
              type="button"
              aria-label={meta.name}
              aria-pressed={current}
              onClick={() => onTask(win.app)}
              className={cn(
                "relative flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-[12px] transition-colors hover:bg-white/12",
                current ? "bg-white/15" : "text-white/75",
              )}
            >
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br", meta.tint)}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="hidden truncate sm:inline">{meta.name}</span>
              <span
                className={cn(
                  "absolute bottom-0.5 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[#c6a15a]",
                  current ? "w-4" : "w-1.5 opacity-70",
                )}
              />
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2.5 pr-1 text-white/80">
        <Wifi className="h-4 w-4" aria-label="Connected" />
        <Volume2 className="h-4 w-4" aria-label="Volume" />
        <div className="text-right leading-tight tabular-nums">
          <p className="text-[12px]">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-[10px] text-white/55">
            {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
        {!guided && (
          <button
            type="button"
            aria-label="Back to the room"
            onClick={onLeave}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
