"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { CourseChrome, CourseStatus, courseButton } from "@/components/experience/course-chrome"
import { usePlayableCourse } from "@/components/experience/use-playable-course"
import type { PlayableCourse } from "@/lib/course-client"
import { handTyped, letterMarks, lineReady } from "@/lib/obedience"
import { floatingPraise, praiseClip, sniffBeats, sniffProgress, type SniffPhase } from "@/lib/obedience-course"
import { sound } from "@/lib/sound"

function subscribeReduced(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  media.addEventListener("change", listener)
  return () => media.removeEventListener("change", listener)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )
}

function secondsLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function ObedienceTraining({ onBack }: { onBack: () => void }) {
  const lesson = usePlayableCourse()
  if (lesson.state.status === "loading") {
    return (
      <div data-obedience-training="loading" className="h-full">
        <CourseStatus title="Opening the course…" />
      </div>
    )
  }
  if (lesson.state.status === "error") {
    const fallback = lesson.state.fallback
    return (
      <div data-obedience-training="error" className="h-full">
        <CourseStatus
          tone="alert"
          title="The course could not be opened."
          detail={lesson.state.message}
          action={
            <>
              <button type="button" className={courseButton()} onClick={lesson.reload}>
                Try again
              </button>
              <button type="button" className={courseButton("ghost")} onClick={() => lesson.useFallback(fallback)}>
                {fallback ? "Use the copy on this computer" : "Use the built-in lesson"}
              </button>
            </>
          }
        />
      </div>
    )
  }
  return <Session playable={lesson.state.playable} onBack={onBack} />
}

function Session({ playable, onBack }: { playable: PlayableCourse; onBack: () => void }) {
  const reduced = useReducedMotion()
  const [started, setStarted] = useState(false)
  const [phase, setPhase] = useState<SniffPhase | null>(null)
  const [progress, setProgress] = useState(0)
  const course = playable.course
  const seconds = course.sniffSeconds

  useEffect(() => {
    if (!started) return
    const beats = sniffBeats(seconds, reduced)
    let index = 0
    let timer = 0
    let cancelled = false
    const go = () => {
      if (cancelled) return
      const beat = beats[index]
      if (!beat) return
      setPhase(beat.phase)
      if (beat.phase === "write") return
      timer = window.setTimeout(() => {
        index += 1
        go()
      }, beat.ms)
    }
    go()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [reduced, seconds, started])

  useEffect(() => {
    if (phase !== "praise") return
    sound.bell()
  }, [phase])

  useEffect(() => {
    if (phase !== "sniff") return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      setProgress(sniffProgress(now - start, seconds))
      if (now - start < seconds * 1000) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [phase, seconds])

  if (!started) {
    return (
      <CourseChrome title="Obedience Training" onBack={onBack}>
        <div className="grid h-full place-items-center px-6 py-8 text-center">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">Course</p>
            <h2 className="mt-2 font-serif text-4xl">Obedience Training</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#4a3424]">Stay with the lesson. Then write each line exactly.</p>
            <p className="mt-2 text-sm text-[#8a6238]">
              {course.lines.length} {course.lines.length === 1 ? "line" : "lines"}
            </p>
            {playable.note && <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#8a6238]">{playable.note}</p>}
            <button type="button" className={`${courseButton()} mt-6`} onClick={() => setStarted(true)}>
              Begin
            </button>
          </div>
        </div>
      </CourseChrome>
    )
  }

  if (!phase) return <div className="h-full bg-[#140e0c]" data-obedience-training="sniff" />
  if (phase === "uncap" || phase === "approach" || phase === "sniff" || phase === "praise") {
    return <Cinema phase={phase} seconds={seconds} progress={progress} reduced={reduced} onBack={onBack} />
  }

  return <WriterScreen playable={playable} dizzy={phase === "dizzy"} onBack={onBack} />
}

function Cinema({
  phase,
  seconds,
  progress,
  reduced,
  onBack,
}: {
  phase: SniffPhase
  seconds: number
  progress: number
  reduced: boolean
  onBack: () => void
}) {
  const label = secondsLabel(seconds)
  return (
    <div className="relative h-full" data-obedience-training="sniff">
      <div className="sniff-stage absolute inset-0" data-phase={phase} data-reduced={reduced ? "true" : "false"} data-sniff-seconds={label}>
        <div className="sniff-desk" />
        <div className="sniff-rig">
          <div className="sniff-bottle" aria-hidden>
            <div className="sniff-body">
              <span className="sniff-label">
                <span className="sniff-point" />
                <b>IRON</b>
                <b>FIST</b>
                <span className="sniff-rule" />
                <small>LEATHER CLEANER</small>
                <em className="sniff-mix">
                  AMYL NITRITE
                  <br />
                  MIXTURE
                </em>
                <span className="sniff-volume">30 ml – 1 fl oz</span>
              </span>
            </div>
            <div className="sniff-neck" />
            <div className="sniff-mouth" />
            <div className="sniff-cap" />
          </div>
        </div>
        {phase === "sniff" && (
          <div className="sniff-readout">
            <p className={reduced ? "sniff-word" : "sniff-word sniff-pulse"}>SNIFF</p>
            <div
              className="h-2 w-[min(280px,72%)] overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-label={`Sniff, ${label} seconds`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="h-full rounded-full bg-[#e7c27a]" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-sm tracking-wide text-[#f6f0e6]/75">{label}s</p>
          </div>
        )}
        {phase === "praise" && (
          <p className="good-girl-flash" role="status">
            GOOD GIRL
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute top-2 left-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f6f0e6] hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

function WriterScreen({ playable, dizzy, onBack }: { playable: PlayableCourse; dizzy: boolean; onBack: () => void }) {
  const course = playable.course
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [shimmer, setShimmer] = useState(0)
  const [hold, setHold] = useState(false)
  const holdTimer = useRef(0)
  const line = course.lines[index] ?? course.lines[0]
  const praiseUrls = course.praise.flatMap((clip) => {
    const url = playable.audio[clip.id]
    return url ? [url] : []
  })

  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  function accept() {
    sound.bell()
    setShimmer((value) => value + 1)
    const cue = praiseClip(index, praiseUrls.length)
    if (cue != null) {
      const clip = new Audio(praiseUrls[cue])
      void clip.play().catch(() => {})
      setHold(true)
      window.clearTimeout(holdTimer.current)
      holdTimer.current = window.setTimeout(() => setHold(false), 1400)
    }
    if (index + 1 >= course.lines.length) {
      setFinished(true)
      return
    }
    setIndex((value) => value + 1)
  }

  if (finished || !line) {
    return (
      <CourseChrome title="Obedience Training" onBack={onBack}>
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <p className="font-serif text-5xl tracking-wide text-[#6d2c3a]">GOOD GIRL</p>
            <p className="mt-3 text-sm text-[#4a3424]">The page accepts these lines.</p>
            <button type="button" className={`${courseButton()} mt-6`} onClick={onBack}>
              Back to courses
            </button>
          </div>
        </div>
      </CourseChrome>
    )
  }

  return (
    <>
      <VisionWash pulse={shimmer} />
      <div className="relative flex h-full min-h-0 flex-col bg-[#f6f1e6] text-[#2a1c14]" inert={dizzy}>
        <div className="flex shrink-0 items-center gap-2 border-b border-[#e7d3b0] px-3 py-2">
          <button type="button" onClick={onBack} aria-label="Back" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d2c3a] hover:bg-[#6d2c3a]/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="truncate font-serif text-lg">Obedience Training</p>
          <span className="ml-auto text-[11px] text-[#8a6238]">
            {index + 1} / {course.lines.length}
          </span>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto px-4 py-4 text-center">
          <Prompt line={line.text} url={line.audioId ? playable.audio[line.audioId] ?? null : null} hold={hold || dizzy} active={!dizzy} />
        </div>
        <div className="flex shrink-0 flex-wrap justify-center gap-x-3 gap-y-1 px-4 pb-2">
          {floatingPraise(index).map((phrase, phraseIndex) => (
            <span
              key={phrase}
              className="praise-float pointer-events-none max-w-[9rem] text-center font-serif text-[11px] leading-tight tracking-wide text-[#6d2c3a] sm:text-xs"
              style={{ animationDelay: `${phraseIndex * 180}ms` }}
            >
              {phrase}
            </span>
          ))}
        </div>
        <LineWriter key={line.id} target={line.text} ready={!dizzy} onAccept={accept} />
      </div>
    </>
  )
}

function VisionWash({ pulse }: { pulse: number }) {
  useEffect(() => {
    document.documentElement.dataset.visionBlur = "on"
    return () => {
      delete document.documentElement.dataset.visionBlur
    }
  }, [])
  if (typeof document === "undefined") return null
  return createPortal(
    <div className="vision-wash" data-obedience-vision="" aria-hidden>
      {pulse > 0 ? <div key={pulse} className="vision-pulse" data-obedience-vision-pulse="" /> : null}
    </div>,
    document.body,
  )
}

function Prompt({ line, url, hold, active }: { line: string; url: string | null; hold: boolean; active: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [missed, setMissed] = useState(false)

  useEffect(() => {
    setMissed(false)
  }, [line, url])

  useEffect(() => {
    if (!active || hold || !url) return
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onerror = () => setMissed(true)
    void audio.play().catch(() => setMissed(true))
    return () => {
      audio.pause()
      audio.onerror = null
      if (audioRef.current === audio) audioRef.current = null
    }
  }, [active, hold, line, url])

  function replay() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => setMissed(true))
  }

  if (!url || missed) {
    return <p className="max-w-md font-serif text-2xl leading-snug sm:text-3xl">{line}</p>
  }

  return (
    <div>
      <p className="font-serif text-2xl">Listen, then write what you hear.</p>
      <button type="button" className={`${courseButton("ghost")} mt-3`} onClick={replay}>
        Play the line again
      </button>
    </div>
  )
}

function LineWriter({ target, ready, onAccept }: { target: string; ready: boolean; onAccept: () => void }) {
  const [value, setValue] = useState("")
  const field = useRef<HTMLTextAreaElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef({ value, target, onAccept })
  latest.current = { value, target, onAccept }
  const marks = letterMarks(target, value)
  const wrong = marks.some((mark) => mark.wrong)

  useEffect(() => {
    if (!ready) return
    field.current?.focus()
  }, [ready, target])

  useEffect(() => {
    const node = field.current
    if (!node) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return
      event.preventDefault()
      const current = latest.current
      if (lineReady(current.target, current.value)) {
        current.onAccept()
        return
      }
      const wrap = box.current
      if (!wrap) return
      wrap.classList.remove("writing-shake")
      void wrap.offsetWidth
      wrap.classList.add("writing-shake")
    }
    node.addEventListener("keydown", onKey)
    return () => node.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div ref={box} className="shrink-0 border-t border-[#e7d3b0] bg-[#fffaf1] px-4 py-3 sm:px-6">
      <p className="mb-2 text-[10px] tracking-[0.22em] text-[#8a6238] uppercase">Write this line</p>
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
        />
      </div>
    </div>
  )
}
