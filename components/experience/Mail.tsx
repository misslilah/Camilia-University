"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ArrowLeft, Trash2, Undo2 } from "lucide-react"
import { campusAddress, lettersIn, loadGone, loadRead, loadTrash, saveGone, saveRead, saveTrash, type MailFolder } from "@/lib/mail"
import { cn } from "@/lib/utils"

type Letter = {
  id: string
  from: string
  fromAddress: string
  subject: string
  when: string
  paragraphs: (name: string, address: string) => string[]
}

const LETTERS: Letter[] = [
  {
    id: "desk",
    from: "Camilia",
    fromAddress: "camilia@university.mail",
    subject: "This address is yours",
    when: "This morning",
    paragraphs: (name, address) => [
      `${name},`,
      `The university has opened a desk for you. Anything I need you to read will arrive at ${address}.`,
      "Keep it. No one else writes from this name.",
      "Camilia",
    ],
  },
  {
    id: "registrar",
    from: "Registrar",
    fromAddress: "registrar@university.mail",
    subject: "Enrollment",
    when: "This morning",
    paragraphs: (name, address) => [
      `${name} is enrolled.`,
      `Your campus address is ${address}. The amphitheater, the bedroom and this desk all know it.`,
      "The registrar",
    ],
  },
  {
    id: "board",
    from: "Amphitheater I",
    fromAddress: "amphitheater@university.mail",
    subject: "The board is open",
    when: "Yesterday",
    paragraphs: (name) => [
      `${name},`,
      "Take a seat in the hall and open Courses. The first page is already on the desk.",
      "Amphitheater I",
    ],
  },
]

const IDS = LETTERS.map((letter) => letter.id)

export function Mail({ name }: { name: string }) {
  const pseudo = name.trim() || "Student"
  const address = campusAddress(pseudo)
  const [folder, setFolder] = useState<MailFolder>("inbox")
  const [openId, setOpenId] = useState<string | null>(null)
  const [read, setRead] = useState<string[]>(() => loadRead(pseudo))
  const [trashed, setTrashed] = useState<string[]>(() => loadTrash(pseudo))
  const [gone, setGone] = useState<string[]>(() => loadGone(pseudo))

  useEffect(() => {
    setRead(loadRead(pseudo))
    setTrashed(loadTrash(pseudo))
    setGone(loadGone(pseudo))
    setFolder("inbox")
    setOpenId(null)
  }, [pseudo])

  const shown = lettersIn(IDS, trashed, gone, folder)
    .map((id) => LETTERS.find((letter) => letter.id === id))
    .filter((letter): letter is Letter => Boolean(letter))
  const open = shown.find((letter) => letter.id === openId) ?? null

  function show(next: MailFolder) {
    setFolder(next)
    setOpenId(null)
  }

  function select(id: string) {
    setOpenId(id)
    setRead((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      saveRead(pseudo, next)
      return next
    })
  }

  function discard(id: string) {
    setTrashed((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      saveTrash(pseudo, next)
      return next
    })
    setOpenId(null)
  }

  function restore(id: string) {
    setTrashed((current) => {
      const next = current.filter((item) => item !== id)
      saveTrash(pseudo, next)
      return next
    })
    setOpenId(null)
  }

  function purge(id: string) {
    setGone((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      saveGone(pseudo, next)
      return next
    })
    setTrashed((current) => {
      const next = current.filter((item) => item !== id)
      saveTrash(pseudo, next)
      return next
    })
    setOpenId(null)
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#f6f1e6] text-[#2a1c14]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e7d3b0] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-xl leading-none">{pseudo}</p>
          <p className="mt-1 truncate text-[12px] text-[#8a6238]">{address}</p>
        </div>
        <div className="flex shrink-0 rounded-full bg-[#efe4d2] p-0.5">
          <FolderTab current={folder === "inbox"} onClick={() => show("inbox")}>
            Inbox
          </FolderTab>
          <FolderTab current={folder === "trash"} onClick={() => show("trash")}>
            <Trash2 className="h-3.5 w-3.5" />
            Trash
          </FolderTab>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <ul className={listClass(Boolean(open))}>
          {shown.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[#8a6238]">{folder === "trash" ? "Trash is empty." : "The inbox is empty."}</li>
          ) : (
            shown.map((letter) => {
              const unread = folder === "inbox" && !read.includes(letter.id)
              const current = letter.id === openId
              return (
                <li key={letter.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => select(letter.id)}
                    aria-current={current ? "true" : undefined}
                    className={current ? "block min-w-0 flex-1 bg-white px-4 py-3 text-left" : "block min-w-0 flex-1 px-4 py-3 text-left hover:bg-white/70"}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={unread ? "truncate text-sm font-semibold" : "truncate text-sm"}>{letter.from}</span>
                      <span className="shrink-0 text-[11px] text-[#8a6238]">{letter.when}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8d3044]" />}
                      <span className={unread ? "truncate text-sm" : "truncate text-sm text-[#4a3424]/80"}>{letter.subject}</span>
                    </span>
                  </button>
                  {folder === "inbox" && (
                    <button
                      type="button"
                      aria-label={`Delete ${letter.subject}`}
                      onClick={() => discard(letter.id)}
                      className="grid w-10 shrink-0 place-items-center text-[#8a6238] hover:bg-[#8d3044]/10 hover:text-[#8d3044]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })
          )}
        </ul>
        <article className={open ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden min-h-0 min-w-0 flex-1 flex-col @min-[640px]:flex"}>
          {open ? (
            <>
              <div className="flex items-center justify-between border-b border-[#e7d3b0] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  aria-label={folder === "trash" ? "Trash" : "Inbox"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6d2c3a] hover:bg-[#6d2c3a]/10 @min-[640px]:invisible"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  {folder === "trash" ? (
                    <>
                      <button type="button" aria-label="Put back in the inbox" onClick={() => restore(open.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs text-[#6d2c3a] hover:bg-[#6d2c3a]/10">
                        <Undo2 className="h-3.5 w-3.5" />
                        Put back
                      </button>
                      <button type="button" aria-label="Delete forever" onClick={() => purge(open.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs text-[#8d3044] hover:bg-[#8d3044]/10">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button type="button" aria-label="Move to trash" onClick={() => discard(open.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs text-[#8d3044] hover:bg-[#8d3044]/10">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-7">
                <p className="text-[11px] tracking-[0.22em] text-[#8a6238] uppercase">{open.when}</p>
                <h2 className="mt-2 font-serif text-3xl leading-tight">{open.subject}</h2>
                <p className="mt-3 text-sm">
                  {open.from} <span className="text-[#8a6238]">&lt;{open.fromAddress}&gt;</span>
                </p>
                <p className="mt-1 text-sm text-[#8a6238]">To {address}</p>
                <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#4a3424]">
                  {open.paragraphs(pseudo, address).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[#8a6238]">
              {shown.length === 0 ? (folder === "trash" ? "Trash is empty." : "The inbox is empty.") : "Choose a letter."}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

function FolderTab({ current, onClick, children }: { current: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={current}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] tracking-wide",
        current ? "bg-white text-[#2a1c14] shadow-sm" : "text-[#8a6238] hover:text-[#2a1c14]",
      )}
    >
      {children}
    </button>
  )
}

function listClass(open: boolean) {
  const wide = "@min-[640px]:block @min-[640px]:w-72 @min-[640px]:shrink-0 @min-[640px]:border-r @min-[640px]:border-[#e7d3b0]"
  return open ? `hidden w-full overflow-auto ${wide}` : `w-full overflow-auto ${wide}`
}
