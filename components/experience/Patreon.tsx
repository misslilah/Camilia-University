"use client"

import { useState } from "react"
import { Trash2, Upload } from "lucide-react"
import { clearLibraryError, deleteMedia, disconnectPatreon, uploadFiles, useLibrary, type MediaKind } from "@/lib/patreon"
import { tierOptionLabel } from "@/lib/patreon-access"
import { cn } from "@/lib/utils"

export function PatreonMark({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="15"
        fontWeight="700"
      >
        P
      </text>
    </svg>
  )
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes)
  const ss = String(secs).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function emptyCopy(admin: boolean, tab: MediaKind, busy: boolean) {
  if (busy) return "Saving the file."
  if (admin) {
    return tab === "audio"
      ? "No audio is in the library yet. Upload a file and assign a tier."
      : "No video is in the library yet. Upload a file and assign a tier."
  }
  return "Nothing to play in this tab yet."
}

export function Patreon() {
  const library = useLibrary()
  const [tab, setTab] = useState<MediaKind>("video")
  const [busy, setBusy] = useState(false)
  const [tierId, setTierId] = useState("")
  const listed = library.items.filter((item) => item.kind === tab)
  const knownTiers = library.tiers ?? []
  const selectedTier = knownTiers.find((tier) => tier.id === tierId) ?? null

  const choose = (next: MediaKind) => {
    if (next === tab) return
    clearLibraryError()
    setTab(next)
  }

  const onFiles = async (files: File[]) => {
    if (!library.ready || files.length === 0) return
    setBusy(true)
    try {
      await uploadFiles(tab, files, tierId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#ee4f96] text-[#5c2144]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[28px] leading-none font-bold tracking-tight text-white">Patreon</p>
          {!library.ready ? null : !library.configured ? (
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled
                aria-describedby="patreon-unconfigured"
                className="inline-flex h-8 cursor-not-allowed items-center rounded-full bg-white/75 px-4 text-[13px] font-semibold text-[#7a2450]"
              >
                Connect with Patreon
              </button>
              <p id="patreon-unconfigured" className="text-[12px] font-medium text-white">
                Patreon is not configured yet.
              </p>
            </div>
          ) : library.connected ? (
            <div className="flex flex-wrap items-center gap-2">
              {library.admin && <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#c2185b]">Creator</span>}
              {library.tierTitle && (
                <span className="rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold text-[#7a2450]">Tier: {library.tierTitle}</span>
              )}
              <button
                type="button"
                onClick={() => void disconnectPatreon()}
                className="text-[12px] font-semibold text-white underline decoration-white/70 underline-offset-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/patreon/login"
              className="inline-flex h-8 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#c2185b] hover:bg-[#fff4f8] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Connect with Patreon
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Patreon library" className="flex items-center gap-2">
            {(["video", "audio"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                onClick={() => choose(kind)}
                className={cn(
                  "h-8 rounded-full px-4 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                  tab === kind ? "bg-white text-[#c2185b]" : "bg-white/75 text-[#7a2450] hover:bg-white",
                )}
              >
                {kind === "audio" ? "Audio" : "Video"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {library.admin && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 pb-3">
          {knownTiers.length > 0 ? (
            <>
              <select
                aria-label="Tier that can play this file"
                value={selectedTier ? selectedTier.id : ""}
                onChange={(event) => setTierId(event.target.value)}
                className="h-8 max-w-full rounded-full bg-white px-3 text-[13px] font-semibold text-[#5c2144] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <option value="">Choose a tier</option>
                {knownTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tierOptionLabel(tier)}
                  </option>
                ))}
              </select>
              <label
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[#c72d6e] px-4 text-[13px] font-semibold text-white hover:bg-[#b02562]",
                  (!library.ready || busy || !selectedTier) && "pointer-events-none opacity-60",
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                {library.progress ?? (busy ? "Saving…" : tab === "audio" ? "Upload audio" : "Upload video")}
                <input
                  key={tab}
                  type="file"
                  accept={tab === "audio" ? "audio/*" : "video/*"}
                  multiple
                  disabled={!library.ready || busy || !selectedTier}
                  className="sr-only"
                  onChange={(event) => {
                    const input = event.currentTarget
                    const files = input.files ? [...input.files] : []
                    input.value = ""
                    void onFiles(files)
                  }}
                />
              </label>
              <span className="text-[12px] font-medium text-white/90">2 GB max. This tier and any higher tier can play it.</span>
            </>
          ) : (
            <p className="text-[12px] font-medium text-white">
              {library.tiers
                ? "This campaign has no tiers yet. Add one on Patreon, then connect again."
                : "Disconnect, then connect again to load your tiers."}
            </p>
          )}
        </div>
      )}

      {library.error && (
        <p role="alert" className="mx-5 mb-3 rounded-[16px] bg-[#fff0f5] px-4 py-2 text-sm text-[#8d2b2b]">
          {library.error}
        </p>
      )}
      {library.notice && (
        <p role="status" className="mx-5 mb-3 rounded-[16px] bg-white/85 px-4 py-2 text-sm text-[#5c2144]">
          {library.notice}
        </p>
      )}

      <div role="tabpanel" aria-label={tab === "audio" ? "Audio" : "Video"} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="rounded-[22px] bg-[#ffc6df] p-3 shadow-[0_10px_28px_rgba(170,40,90,0.16)]">
          {!library.ready ? (
            <p className="px-3 py-8 text-center text-sm text-[#5c2144]/70">Opening the library…</p>
          ) : listed.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm leading-relaxed text-[#5c2144]/80">{emptyCopy(library.admin, tab, busy)}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {listed.map((item) => (
                <li key={item.id} className="rounded-[16px] bg-[#fff4f8] px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[15px] font-semibold text-[#5a1840]" title={item.name}>
                          {item.name}
                        </p>
                        {item.duration != null && <span className="shrink-0 text-sm text-[#8a3a60]">{formatDuration(item.duration)}</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-[#8a3a60]">
                        <span className="font-semibold text-[#7a2450]">{item.tierTitle}</span>
                        {item.sample && <span> · Sample</span>}
                        <span> · {formatSize(item.size)}</span>
                        <span> · {formatDate(item.addedAt)}</span>
                      </p>
                    </div>
                    {library.admin && !item.sample && (
                      <button
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => void deleteMedia(item.id)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold text-[#c2185b] hover:bg-[#ffe0ec] focus-visible:ring-2 focus-visible:ring-[#c2185b] focus-visible:outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  {item.locked ? (
                    <p className="mt-2 text-sm text-[#8a3a60]">
                      {item.sample
                        ? "Locked sample. A subscriber who is not entitled to this tier sees the row this way."
                        : `Locked. Your membership does not include the ${item.tierTitle} tier.`}
                    </p>
                  ) : item.url && item.kind === "audio" ? (
                    <audio controls preload="metadata" src={item.url} aria-label={item.name} className="mt-2 h-9 w-full rounded-[10px]" />
                  ) : item.url ? (
                    <div className="mt-2 overflow-hidden rounded-[10px] bg-black">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={item.url}
                        aria-label={item.name}
                        className="max-h-40 w-full bg-black object-contain"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#8a3a60]">Sample. Nothing plays until the creator uploads a real file.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
