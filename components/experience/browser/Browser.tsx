"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Globe, House, Lock, Plus, RotateCw, Search, X } from "lucide-react"
import { Avazon, AvazonLogo } from "@/components/experience/browser/Avazon"
import { Threadline, ThreadlineLogo } from "@/components/experience/browser/Threadline"
import { Velvet } from "@/components/experience/browser/Velvet"
import { findSite, formatUrl, parseUrl, useWeb, visibleSites, type Site, type SiteId } from "@/lib/web"
import { cn } from "@/lib/utils"

type Tab = { id: number; history: string[]; index: number }

const NEW_TAB = ""

function normalize(input: string) {
  const location = parseUrl(input)
  return location.host ? formatUrl(location) : NEW_TAB
}

const FAVICON: Record<SiteId, ReactNode> = {
  avazon: <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-[#131a2a] text-[10px] font-extrabold text-[#f39a1f]">a</span>,
  threadline: <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1f1c19] font-serif text-[10px] text-white">T</span>,
  velvet: <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-[#2a1420] font-serif text-[10px] text-[#f4e6ea]">V</span>,
}

export function Browser({ active }: { active: boolean }) {
  const web = useWeb()
  const nextId = useRef(2)
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, history: [NEW_TAB], index: 0 }])
  const [current, setCurrent] = useState(1)
  const [draft, setDraft] = useState<string | null>(null)
  const [suggest, setSuggest] = useState(false)
  const [loading, setLoading] = useState(0)
  const [reloads, setReloads] = useState(0)
  const address = useRef<HTMLInputElement>(null)
  const page = useRef<HTMLDivElement>(null)

  const tab = tabs.find((item) => item.id === current) ?? tabs[0]
  const url = tab.history[tab.index]
  const location = parseUrl(url)
  const site = url ? findSite(location.host, web) : null

  useEffect(() => {
    if (!loading) return
    const id = window.setTimeout(() => setLoading(0), 380)
    return () => window.clearTimeout(id)
  }, [loading])

  useEffect(() => {
    page.current?.scrollTo({ top: 0 })
  }, [current, url, tab.index])

  const update = (fn: (tab: Tab) => Tab) => setTabs((list) => list.map((item) => (item.id === tab.id ? fn(item) : item)))

  const navigate = (target: string) => {
    const next = normalize(target)
    setDraft(null)
    setSuggest(false)
    setLoading((value) => value + 1)
    update((item) => {
      if (item.history[item.index] === next) return item
      const history = [...item.history.slice(0, item.index + 1), next]
      return { ...item, history, index: history.length - 1 }
    })
  }

  const go = (step: number) => {
    const index = tab.index + step
    if (index < 0 || index >= tab.history.length) return
    setDraft(null)
    setLoading((value) => value + 1)
    update((item) => ({ ...item, index }))
  }

  const openTab = () => {
    const id = nextId.current++
    setTabs((list) => [...list, { id, history: [NEW_TAB], index: 0 }])
    setCurrent(id)
    setDraft(null)
    window.requestAnimationFrame(() => address.current?.focus())
  }

  const closeTab = (id: number) => {
    const index = tabs.findIndex((item) => item.id === id)
    const rest = tabs.filter((item) => item.id !== id)
    if (rest.length === 0) {
      const fresh = nextId.current++
      setTabs([{ id: fresh, history: [NEW_TAB], index: 0 }])
      setCurrent(fresh)
    } else {
      setTabs(rest)
      if (id === current) setCurrent(rest[Math.min(index, rest.length - 1)].id)
    }
    setDraft(null)
  }

  const typed = draft ?? url
  const query = (draft ?? "").trim().toLowerCase()
  const matches = query
    ? visibleSites(web).filter((item) => item.host.startsWith(parseUrl(query).host) || item.name.toLowerCase().startsWith(query))
    : []

  const submit = () => {
    const text = typed.trim()
    if (!text) return navigate(NEW_TAB)
    const { host } = parseUrl(text)
    const exact = findSite(host, web)
    if (!exact && !host.includes(".") && matches.length > 0) return navigate(matches[0].host)
    navigate(text)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#dfe3ea] text-[#1d2433]">
      <div role="tablist" aria-label="Tabs" className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto px-1.5 pt-1.5 [scrollbar-width:none]">
        {tabs.map((item) => {
          const tabUrl = item.history[item.index]
          const tabSite = tabUrl ? findSite(parseUrl(tabUrl).host, web) : null
          const selected = item.id === tab.id
          return (
            <div
              key={item.id}
              className={cn(
                "group flex h-full max-w-[200px] min-w-[96px] flex-1 items-center gap-1.5 rounded-t-[10px] pr-1 pl-2.5 text-[12px]",
                selected ? "bg-[#f7f8fa]" : "hover:bg-white/50",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setCurrent(item.id)
                  setDraft(null)
                }}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                {tabSite ? FAVICON[tabSite.id] : <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                <span className="truncate">{title(tabUrl, tabSite)}</span>
              </button>
              <button
                type="button"
                aria-label={`Close ${title(tabUrl, tabSite)} tab`}
                onClick={() => closeTab(item.id)}
                className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-black/10", !selected && "opacity-0 group-hover:opacity-100")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
        <button type="button" aria-label="New tab" onClick={openTab} className="mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-black/10">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative flex h-10 shrink-0 items-center gap-1 border-b border-black/10 bg-[#f7f8fa] px-1.5">
        <ToolButton label="Back" disabled={tab.index === 0} onClick={() => go(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Forward" disabled={tab.index >= tab.history.length - 1} onClick={() => go(1)}>
          <ArrowRight className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Reload"
          onClick={() => {
            setLoading((value) => value + 1)
            setReloads((value) => value + 1)
          }}
        >
          <RotateCw className={cn("h-4 w-4", loading > 0 && "animate-spin")} />
        </ToolButton>
        <ToolButton label="Home" onClick={() => navigate(NEW_TAB)}>
          <House className="h-4 w-4" />
        </ToolButton>
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
            address.current?.blur()
          }}
        >
          <div className="flex h-8 items-center gap-2 rounded-full bg-[#e8ebf0] px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4c8df0]">
            {site ? <Lock className="h-3.5 w-3.5 shrink-0 text-black/50" /> : <Search className="h-3.5 w-3.5 shrink-0 text-black/45" />}
            <input
              ref={address}
              value={typed}
              aria-label="Address"
              placeholder="Type a web address"
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => {
                setDraft(event.target.value)
                setSuggest(true)
              }}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => window.setTimeout(() => setSuggest(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  setDraft(null)
                  setSuggest(false)
                  event.currentTarget.blur()
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/40"
            />
          </div>
          {suggest && active && matches.length > 0 && (
            <ul role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-9 z-50 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-xl">
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => navigate(item.host)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-black/5"
                  >
                    {FAVICON[item.id]}
                    <span className="font-medium">{item.host}</span>
                    <span className="truncate text-black/50">{item.tagline}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#4c8df0] transition-transform duration-300 ease-out",
            loading ? "scale-x-75" : "scale-x-0 opacity-0",
          )}
        />
      </div>

      <div ref={page} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white [scrollbar-width:thin]">
        {!url ? (
          <NewTab onOpen={navigate} />
        ) : site ? (
          <SitePage key={`${tab.id}-${url}-${reloads}`} site={site} path={location.path} navigate={navigate} />
        ) : (
          <Unreachable host={location.host || url} onHome={() => navigate(NEW_TAB)} />
        )}
      </div>
    </div>
  )
}

function title(url: string, site: Site | null) {
  if (!url) return "New Tab"
  if (site) return site.id === "avazon" ? "avazon.com" : site.name
  return parseUrl(url).host
}

function ToolButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/8 disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function SitePage({ site, path, navigate }: { site: Site; path: string; navigate: (url: string) => void }) {
  if (site.id === "avazon") return <Avazon path={path} navigate={navigate} />
  if (site.id === "threadline") return <Threadline path={path} navigate={navigate} />
  return <Velvet />
}

function NewTab({ onOpen }: { onOpen: (url: string) => void }) {
  const web = useWeb()
  return (
    <div className="flex min-h-full flex-col items-center bg-gradient-to-b from-[#f4f6fa] to-[#e8ecf3] px-5 pt-[8%] pb-10">
      <p className="font-serif text-3xl text-[#1d2a4a]">Camilia</p>
      <p className="mt-1 text-[10px] tracking-[0.4em] text-[#a8843f]">UNIVERSITY NETWORK</p>
      <form
        className="mt-6 flex h-11 w-full max-w-[460px] items-center gap-2 rounded-full bg-white px-4 shadow-[0_2px_10px_rgba(29,42,74,0.12)] focus-within:ring-2 focus-within:ring-[#4c8df0]"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get("q")
          if (typeof value === "string" && value.trim()) onOpen(value)
        }}
      >
        <Search className="h-4 w-4 text-black/45" />
        <input name="q" aria-label="Go to a site" placeholder="Go to a site, like avazon.com" className="min-w-0 flex-1 text-[14px] outline-none placeholder:text-black/40" />
      </form>
      <div className="mt-8 grid w-full max-w-[460px] grid-cols-2 gap-3">
        {visibleSites(web).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.host)}
            aria-label={`Open ${item.host}`}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 pt-5 pb-4 shadow-[0_1px_3px_rgba(29,42,74,0.1)] transition-shadow hover:shadow-[0_6px_20px_rgba(29,42,74,0.15)]"
          >
            <span className={cn("grid h-14 w-full place-items-center rounded-xl", item.id === "avazon" ? "bg-[#131a2a]" : "bg-[#faf8f4] text-[#1f1c19]")}>
              {item.id === "avazon" ? <AvazonLogo className="h-9 w-[118px]" /> : item.id === "threadline" ? <ThreadlineLogo /> : <span className="font-serif text-xl">{item.name}</span>}
            </span>
            <span className="text-[13px] font-medium">{item.host}</span>
            <span className="-mt-1.5 text-[11px] text-black/50">{item.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Unreachable({ host, onHome }: { host: string; onHome: () => void }) {
  return (
    <div className="flex min-h-full items-start justify-center bg-white px-6 pt-[10%] pb-10">
      <div className="max-w-[440px]">
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-black/35" aria-hidden>
          <rect x="6" y="10" width="36" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M18 42 H30 M24 36 V42 M19 19 L29 27 M29 19 L19 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <h1 className="mt-5 text-[22px] font-medium text-[#1d2433]">This site can&rsquo;t be reached</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-black/65">
          Check if there is a typo in <span className="font-semibold text-black/80">{host}</span>. The Camilia network only reaches a few sites for now.
        </p>
        <p className="mt-3 font-mono text-[11px] text-black/40">ERR_NAME_NOT_RESOLVED</p>
        <button type="button" onClick={onHome} className="mt-6 h-9 rounded-full bg-[#2a5fc4] px-5 text-[13px] font-medium text-white hover:bg-[#244fa6]">
          Back to the start page
        </button>
      </div>
    </div>
  )
}
