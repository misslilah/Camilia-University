"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { COPIES, LINES, advance, handTyped, letterMarks, lineReady, loadObedience, saveObedience, type Obedience } from "@/lib/obedience"
import { sound } from "@/lib/sound"

const CATEGORIES = [
  { id: "feminization", label: "Feminization", tint: "from-[#e7a0b0] to-[#b96b80]" },
  { id: "oral", label: "Oral", tint: "from-[#f0b48a] to-[#c9845c]" },
  { id: "anal", label: "Anal", tint: "from-[#c4a0d4] to-[#8d6aa3]" },
  { id: "cumplay", label: "Cumplay", tint: "from-[#e6d3a1] to-[#b89a5a]" },
] as const

export function Courses({ name, onLeave }: { name: string; onLeave?: () => void }) {
  const who = name.trim() || "Student"
  const [progress, setProgress] = useState<Obedience>(() => loadObedience(who))
  const [open, setOpen] = useState<(typeof CATEGORIES)[number]["id"] | null>(null)

  useEffect(() => {
    setProgress(loadObedience(who))
    setOpen(null)
  }, [who])

  useEffect(() => {
    let cancel = false
    fetch("/api/academy/progress")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { obedience?: boolean } | null) => {
        if (cancel || body?.obedience !== true) return
        const done = { done: true, line: LINES.length - 1, copy: COPIES } satisfies Obedience
        saveObedience(who, done)
        setProgress(done)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [who])

  function acceptLine() {
    const next = advance(progress)
    saveObedience(who, next)
    setProgress(next)
    if (!next.done) return
    fetch("/api/academy/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obedience: true }),
    }).catch(() => {})
  }

  if (progress.done) {
    return <Catalog open={open} onOpen={setOpen} onLeave={onLeave} />
  }

  const target = LINES[progress.line] ?? LINES[0]
  return (
    <div className="flex h-full flex-col bg-[#f6f1e6] text-[#2a1c14]">
      {onLeave && <BoardBack onLeave={onLeave} />}
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-8">
        <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">Obedience</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight">A message from Camilia</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#4a3424]">
          <p>You found the desk. Stay with this page before you touch anything else.</p>
          <p>
            I am Camilia. This university does not hand you a grade and send you home the same. From today there is a record of your training: the work you finish, the work you avoid, and the student you are becoming.
          </p>
          <p>
            Dedication will be noticed. A privilege is earned, never given. If a responsibility slips, the consequence will fit what was left undone.
          </p>
          <p>
            One assignment stands between you and the rest of your studies. The lines are on the desk below. Write each of them five times, exactly as it is written. A single letter out of place will not pass.
          </p>
          <p>When the page accepts the last copy, your academic life begins.</p>
          <p className="font-serif text-lg text-[#2a1c14]">Welcome to it.</p>
        </div>

        <ol className="mt-6 space-y-2">
          {LINES.map((line, index) => {
            const active = index === progress.line
            const finished = index < progress.line
            return (
              <li
                key={line}
                className={
                  active
                    ? "rounded-2xl border border-[#6d2c3a]/30 bg-white px-3 py-2 font-serif text-lg leading-snug"
                    : "rounded-2xl px-3 py-2 font-serif text-lg leading-snug text-[#4a3424]/45"
                }
              >
                <span className="mr-2 text-xs tracking-wide text-[#8a6238]">{finished ? "Done" : active ? `${progress.copy + 1} / ${COPIES}` : "Waiting"}</span>
                {line}
              </li>
            )
          })}
        </ol>
      </div>
      <Writer key={`${progress.line}-${progress.copy}`} target={target} copy={progress.copy + 1} onAccept={acceptLine} />
    </div>
  )
}

function Writer({ target, copy, onAccept }: { target: string; copy: number; onAccept: () => void }) {
  const [value, setValue] = useState("")
  const [shake, setShake] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const marks = letterMarks(target, value)
  const wrong = marks.some((mark) => mark.wrong)

  useEffect(() => {
    field.current?.focus()
  }, [target])

  function submit() {
    if (lineReady(target, value)) {
      sound.bell()
      onAccept()
      return
    }
    setShake(false)
    requestAnimationFrame(() => setShake(true))
  }

  return (
    <div className={shake ? "writing-shake border-t border-[#e7d3b0] bg-[#fffaf1] px-4 py-3 sm:px-6" : "border-t border-[#e7d3b0] bg-[#fffaf1] px-4 py-3 sm:px-6"}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.22em] text-[#8a6238] uppercase">Write this line</p>
        <p className="text-[11px] text-[#8a6238]">
          {copy} / {COPIES}
        </p>
      </div>
      <div
        className={
          wrong
            ? "relative rounded-2xl border border-[#c13535]/50 bg-white shadow-[0_8px_24px_rgba(90,40,20,0.06)]"
            : "relative rounded-2xl border border-[#e7d3b0] bg-white shadow-[0_8px_24px_rgba(90,40,20,0.06)]"
        }
      >
        <div className="pointer-events-none min-h-16 px-3 py-2 font-sans text-sm leading-6 whitespace-pre-wrap">
          {marks.length === 0 ? (
            <span className="text-[#2a1c14]/35">Write the line, then press Enter</span>
          ) : (
            marks.map((mark, index) => (
              <span key={`${index}-${mark.char}`} className={mark.wrong ? "text-[#c13535]" : "text-[#2a1c14]"}>
                {mark.char}
              </span>
            ))
          )}
        </div>
        <textarea
          ref={field}
          value={value}
          rows={2}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Write the line by hand"
          aria-invalid={wrong}
          className="absolute inset-0 resize-none bg-transparent px-3 py-2 font-sans text-sm leading-6 text-transparent caret-[#2a1c14] outline-none"
          onCopy={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onPaste={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          onChange={(event) => {
            const next = handTyped(value, event.target.value)
            if (next === value) event.target.value = value
            setValue(next)
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            submit()
          }}
        />
      </div>
    </div>
  )
}

function BoardBack({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={onLeave}
        aria-label="Back"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6d2c3a] hover:bg-[#6d2c3a]/10"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    </div>
  )
}

function Catalog({
  open,
  onOpen,
  onLeave,
}: {
  open: (typeof CATEGORIES)[number]["id"] | null
  onOpen: (id: (typeof CATEGORIES)[number]["id"] | null) => void
  onLeave?: () => void
}) {
  const category = CATEGORIES.find((item) => item.id === open) ?? null
  if (category) {
    return (
      <div className="flex h-full flex-col bg-[#f6f1e6] text-[#2a1c14]">
        <BoardBack onLeave={() => onOpen(null)} />
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">{category.label}</p>
            <h2 className="mt-3 font-serif text-4xl">Coming soon</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#f6f1e6] text-[#2a1c14]">
      {onLeave && <BoardBack onLeave={onLeave} />}
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-8">
      <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">Courses</p>
      <h2 className="mt-2 font-serif text-3xl">Your studies</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#4a3424]">Your first assignment is on record. The rest of the university is still being prepared.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="rounded-3xl border border-[#e7d3b0] bg-white p-4 text-left shadow-[0_10px_30px_rgba(90,40,20,0.05)] hover:border-[#6d2c3a]/30"
          >
            <span className={`block h-1.5 w-12 rounded-full bg-gradient-to-r ${item.tint}`} />
            <span className="mt-3 block font-serif text-2xl">{item.label}</span>
            <span className="mt-1 block text-sm text-[#8a6238]">Coming soon</span>
          </button>
        ))}
      </div>
    </div>
    </div>
  )
}
