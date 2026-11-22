"use client"

import { useState, useSyncExternalStore } from "react"
import { entitledTo } from "@/lib/patreon-access"
import { renameMedia, useLibrary, type LibraryItem } from "@/lib/patreon"
import { previewTierId, setPreviewTier, subscribePreview } from "@/lib/tier-view"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function FileName({ item }: { item: LibraryItem }) {
  const [draft, setDraft] = useState(item.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const next = draft.trim().replace(/\s+/g, " ")
  const dirty = next.length > 0 && next !== item.name

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError("")
    const message = await renameMedia(item.id, next)
    setSaving(false)
    if (message) setError(message)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      className="flex min-w-0 flex-1 flex-col gap-1"
    >
      <div className="flex min-w-0 items-center gap-2">
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError("")
          }}
          aria-label={`Name for ${item.name}`}
          maxLength={120}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#e6d9c6] bg-[#f6f1e8] px-3 text-sm text-[#1d2a4a] outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15a]"
        />
        <button
          type="submit"
          disabled={!dirty || saving}
          className="h-9 shrink-0 rounded-full bg-[#1d2a4a] px-3 text-[12px] font-semibold text-[#f6f1e8] disabled:opacity-40"
        >
          {saving ? "Saving" : "Rename"}
        </button>
      </div>
      {error && <p className="text-xs text-[#8d2b2b]">{error}</p>}
    </form>
  )
}

export function AdminDesk() {
  const library = useLibrary()
  const files = library.items.filter((item) => !item.sample)
  const videos = files.filter((item) => item.kind === "video")
  const audios = files.filter((item) => item.kind === "audio")
  const tiers = library.tiers ?? []
  const previewId = useSyncExternalStore(subscribePreview, previewTierId, () => null)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f1e8] text-[#1c2433]">
      <div className="shrink-0 border-b border-[#e6d9c6] px-6 py-5">
        <p className="text-[11px] tracking-[0.42em] text-[#8a7044]">REGISTRAR</p>
        <h2 className="mt-1 font-serif text-3xl leading-none text-[#1d2a4a]">Admin</h2>
        <p className="mt-2 max-w-xl text-sm text-[#1d2433]/70">
          This desk is on your computer only. Students do not see the icon, in the start menu or on the desktop.
        </p>
      </div>
      {!library.ready ? (
        <p className="px-6 py-10 text-sm text-[#1d2433]/60">Opening the registrar…</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-[#1d2433]/75">
            Signed in as <span className="font-medium text-[#1d2a4a]">{library.name?.trim() || "the creator"}</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Video", String(videos.length)],
              ["Audio", String(audios.length)],
              ["Tiers", String(tiers.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#e6d9c6] bg-white px-4 py-3">
                <p className="text-[11px] tracking-[0.18em] text-[#8a7044]">{label.toUpperCase()}</p>
                <p className="mt-1 font-serif text-3xl text-[#1d2a4a]">{value}</p>
              </div>
            ))}
          </div>
          <section className="mt-6">
            <h3 className="font-serif text-xl text-[#1d2a4a]">Tiers</h3>
            <p className="mt-1 text-sm text-[#1d2433]/65">Choose a tier, then open Patreon. The library shows what that tier can play.</p>
            {tiers.length === 0 ? (
              <p className="mt-2 text-sm text-[#1d2433]/65">No tiers have been loaded from the campaign yet.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  aria-pressed={previewId == null}
                  onClick={() => setPreviewTier(null)}
                  className={`h-9 rounded-xl px-4 text-left text-sm font-medium ${previewId == null ? "bg-[#1d2a4a] text-[#f6f1e8]" : "bg-white text-[#1d2a4a]"}`}
                >
                  Creator view
                </button>
                <ul className="flex flex-col gap-2">
                  {tiers.map((tier) => {
                    const playable = files.filter((item) => entitledTo(item, [tier])).length
                    const current = previewId === tier.id
                    return (
                      <li key={tier.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{tier.title}</p>
                          <p className="text-xs text-[#1d2433]/55">
                            {tier.amountCents == null ? "Amount not set" : `${(tier.amountCents / 100).toFixed(2)}`} · {playable} of {files.length} play
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-pressed={current}
                          onClick={() => setPreviewTier(tier.id)}
                          className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold ${current ? "bg-[#1d2a4a] text-[#f6f1e8]" : "bg-[#f6f1e8] text-[#1d2a4a]"}`}
                        >
                          {current ? "Viewing" : "View"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
          <section className="mt-6 pb-2">
            <h3 className="font-serif text-xl text-[#1d2a4a]">Library</h3>
            {files.length === 0 ? (
              <p className="mt-2 text-sm text-[#1d2433]/65">No files yet. Add them from the Patreon app.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {files.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white px-4 py-3">
                    <FileName key={item.name} item={item} />
                    <p className="mt-1.5 text-xs text-[#1d2433]/55">
                      {item.kind === "audio" ? "Audio" : "Video"} · {item.tierTitle} · {formatSize(item.size)} · {formatDate(item.addedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
