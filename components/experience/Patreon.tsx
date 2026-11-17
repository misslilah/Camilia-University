"use client"

import { useState } from "react"
import { Trash2, Upload } from "lucide-react"
import { clearLibraryError, deleteMedia, uploadFiles, useLibrary, type MediaKind } from "@/lib/patreon"
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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

const EMPTY: Record<MediaKind, string> = {
  audio: "No audio is in the library yet. Upload a file to keep it in this browser.",
  video: "No video is in the library yet. Upload a file to keep it in this browser.",
}

export function Patreon() {
  const library = useLibrary()
  const [tab, setTab] = useState<MediaKind>("audio")
  const [busy, setBusy] = useState(false)
  const listed = library.items.filter((item) => item.kind === tab)

  const choose = (next: MediaKind) => {
    if (next === tab) return
    clearLibraryError()
    setTab(next)
  }

  const onFiles = async (files: File[]) => {
    if (!library.ready || files.length === 0) return
    setBusy(true)
    try {
      await uploadFiles(tab, files)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f5f0] text-[#1d2433]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
        <div role="tablist" aria-label="Patreon library" className="flex items-center gap-1">
          {(["audio", "video"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={tab === kind}
              onClick={() => choose(kind)}
              className={cn(
                "h-8 rounded-lg px-3 text-[13px] font-medium capitalize focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none",
                tab === kind ? "bg-[#1d2a4a] text-white" : "text-[#1d2433]/70 hover:bg-black/5",
              )}
            >
              {kind === "audio" ? "Audio" : "Video"}
            </button>
          ))}
        </div>
        <label
          className={cn(
            "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#1d2a4a] px-3 text-[13px] font-medium text-white hover:bg-[#2a3d68]",
            (!library.ready || busy) && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Saving…" : tab === "audio" ? "Upload audio" : "Upload video"}
          <input
            key={tab}
            type="file"
            accept={tab === "audio" ? "audio/*" : "video/*"}
            multiple
            disabled={!library.ready || busy}
            className="sr-only"
            onChange={(event) => {
              const input = event.currentTarget
              const files = input.files ? [...input.files] : []
              input.value = ""
              void onFiles(files)
            }}
          />
        </label>
      </div>

      {library.error && (
        <p role="alert" className="mx-4 mt-3 rounded-lg bg-[#fde8e8] px-3 py-2 text-sm text-[#8d2b2b]">
          {library.error}
        </p>
      )}

      <div role="tabpanel" aria-label={tab === "audio" ? "Audio" : "Video"} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!library.ready ? (
          <p className="px-2 py-8 text-center text-sm text-[#1d2433]/60">Opening the library…</p>
        ) : listed.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm leading-relaxed text-[#1d2433]/65">{busy ? "Saving the file." : EMPTY[tab]}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {listed.map((item) => (
              <li key={item.id} className="rounded-xl border border-black/10 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={item.name}>
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#1d2433]/60">
                      {item.duration != null && <span>{formatDuration(item.duration)} · </span>}
                      <span>{formatSize(item.size)}</span>
                      <span> · {formatDate(item.addedAt)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => void deleteMedia(item.id)}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] text-[#8d2b2b] hover:bg-[#fde8e8] focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
                {item.kind === "audio" ? (
                  <audio controls preload="metadata" src={item.url} aria-label={item.name} className="mt-2 h-9 w-full" />
                ) : (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={item.url}
                    aria-label={item.name}
                    className="mt-2 max-h-48 w-full rounded-lg bg-black"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
