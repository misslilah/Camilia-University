"use client"

import { useLibrary } from "@/lib/patreon"

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

export function AdminDesk() {
  const library = useLibrary()
  const files = library.items.filter((item) => !item.sample)
  const videos = files.filter((item) => item.kind === "video")
  const audios = files.filter((item) => item.kind === "audio")
  const tiers = library.tiers ?? []

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
            {tiers.length === 0 ? (
              <p className="mt-2 text-sm text-[#1d2433]/65">No tiers have been loaded from the campaign yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {tiers.map((tier) => (
                  <li key={tier.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-sm">
                    <span className="font-medium">{tier.title}</span>
                    <span className="text-[#1d2433]/55">{tier.amountCents == null ? "—" : `${(tier.amountCents / 100).toFixed(2)}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="mt-6 pb-2">
            <h3 className="font-serif text-xl text-[#1d2a4a]">Library</h3>
            {files.length === 0 ? (
              <p className="mt-2 text-sm text-[#1d2433]/65">No files yet. Add them from the Patreon app.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {files.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white px-4 py-2.5">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[#1d2433]/55">
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
