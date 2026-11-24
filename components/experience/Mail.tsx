"use client"

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { campusAddress, loadRead, saveRead } from "@/lib/mail"

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

export function Mail({ name }: { name: string }) {
  const pseudo = name.trim() || "Student"
  const address = campusAddress(pseudo)
  const [openId, setOpenId] = useState<string | null>(null)
  const [read, setRead] = useState<string[]>(() => loadRead(pseudo))

  useEffect(() => {
    setRead(loadRead(pseudo))
    setOpenId(null)
  }, [pseudo])

  const open = LETTERS.find((letter) => letter.id === openId) ?? null

  function select(id: string) {
    setOpenId(id)
    setRead((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      saveRead(pseudo, next)
      return next
    })
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#f6f1e6] text-[#2a1c14]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e7d3b0] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-xl leading-none">{pseudo}</p>
          <p className="mt-1 truncate text-[12px] text-[#8a6238]">{address}</p>
        </div>
        <p className="shrink-0 text-[11px] tracking-[0.22em] text-[#8a6238] uppercase">Inbox</p>
      </div>
      <div className="flex min-h-0 flex-1">
        <ul className={open ? "hidden w-full overflow-auto @min-[640px]:block @min-[640px]:w-72 @min-[640px]:shrink-0 @min-[640px]:border-r @min-[640px]:border-[#e7d3b0]" : "w-full overflow-auto @min-[640px]:w-72 @min-[640px]:shrink-0 @min-[640px]:border-r @min-[640px]:border-[#e7d3b0]"}>
          {LETTERS.map((letter) => {
            const unread = !read.includes(letter.id)
            const current = letter.id === openId
            return (
              <li key={letter.id}>
                <button
                  type="button"
                  onClick={() => select(letter.id)}
                  aria-current={current ? "true" : undefined}
                  className={current ? "block w-full bg-white px-4 py-3 text-left" : "block w-full px-4 py-3 text-left hover:bg-white/70"}
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
              </li>
            )
          })}
        </ul>
        <article className={open ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden min-h-0 min-w-0 flex-1 flex-col @min-[640px]:flex"}>
          {open ? (
            <>
              <div className="border-b border-[#e7d3b0] px-3 py-2 @min-[640px]:hidden">
                <button type="button" onClick={() => setOpenId(null)} aria-label="Inbox" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6d2c3a] hover:bg-[#6d2c3a]/10">
                  <ArrowLeft className="h-4 w-4" />
                </button>
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
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[#8a6238]">Choose a letter.</div>
          )}
        </article>
      </div>
    </div>
  )
}
