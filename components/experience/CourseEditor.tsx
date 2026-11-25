"use client"

import { useEffect, useRef, useState } from "react"
import { CourseChrome, CourseStatus, courseButton } from "@/components/experience/course-chrome"
import { usePlayableCourse } from "@/components/experience/use-playable-course"
import { LOCAL_CLIP_NOTE, revokeAudio, uploadCourseAudio, saveCourseConfig } from "@/lib/course-client"
import { SNIFF_MAX, SNIFF_MIN, clampSniff, type CourseLine, type ObedienceCourse, type PraiseClip } from "@/lib/obedience-course"

export function CourseEditor({ onBack }: { onBack: () => void }) {
  const lesson = usePlayableCourse()
  const [draft, setDraft] = useState<ObedienceCourse | null>(null)
  const [sniff, setSniff] = useState("4")
  const [audio, setAudio] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null)
  const [busy, setBusy] = useState<"save" | string | null>(null)
  const extra = useRef<Record<string, string>>({})

  useEffect(() => () => revokeAudio(extra.current), [])

  const seeded = useRef(false)
  useEffect(() => {
    if (lesson.state.status !== "ready" || seeded.current) return
    seeded.current = true
    const playable = lesson.state.playable
    setDraft(playable.course)
    setSniff(String(playable.course.sniffSeconds))
    setAudio(playable.audio)
    if (playable.note) setBanner({ tone: "warn", text: playable.note })
  }, [lesson.state])

  if (lesson.state.status === "loading" || (lesson.state.status === "ready" && !draft)) {
    return (
      <div data-course-editor="loading" className="h-full">
        <CourseStatus title="Opening the editor…" />
      </div>
    )
  }

  if (lesson.state.status === "error" && !draft) {
    const fallback = lesson.state.fallback
    return (
      <div data-course-editor="error" className="h-full">
        <CourseStatus
          tone="alert"
          title="The editor could not be opened."
          detail={lesson.state.message}
          action={
            <>
              <button type="button" className={courseButton()} onClick={lesson.reload}>
                Try again
              </button>
              <button
                type="button"
                className={courseButton("ghost")}
                onClick={() => {
                  lesson.useFallback(fallback)
                }}
              >
                {fallback ? "Edit the copy on this computer" : "Start from the built-in lesson"}
              </button>
            </>
          }
        />
      </div>
    )
  }

  if (!draft) return <CourseStatus title="Opening the editor…" />

  function updateLine(id: string, patch: Partial<CourseLine>) {
    setDraft((current) =>
      current
        ? { ...current, lines: current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) }
        : current,
    )
  }

  async function chooseLineAudio(line: CourseLine, file: File | undefined) {
    if (!file) return
    setBusy(line.id)
    setBanner(null)
    const result = await uploadCourseAudio(file)
    setBusy(null)
    if (!result.ok) {
      setBanner({ tone: "error", text: result.error })
      return
    }
    const previous = extra.current[result.id]
    if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous)
    extra.current[result.id] = result.url
    setAudio((current) => ({ ...current, [result.id]: result.url }))
    updateLine(line.id, { audioId: result.id, audioName: result.name })
    if (result.local) setBanner({ tone: "warn", text: LOCAL_CLIP_NOTE })
  }

  async function choosePraise(file: File | undefined) {
    if (!file || !draft) return
    if (draft.praise.length >= 12) {
      setBanner({ tone: "error", text: "Twelve praise clips is the limit." })
      return
    }
    setBusy("praise")
    setBanner(null)
    const result = await uploadCourseAudio(file)
    setBusy(null)
    if (!result.ok) {
      setBanner({ tone: "error", text: result.error })
      return
    }
    extra.current[result.id] = result.url
    setAudio((current) => ({ ...current, [result.id]: result.url }))
    const clip: PraiseClip = { id: result.id, name: result.name }
    setDraft((current) => (current ? { ...current, praise: [...current.praise, clip] } : current))
    if (result.local) setBanner({ tone: "warn", text: LOCAL_CLIP_NOTE })
  }

  async function save() {
    if (!draft || busy) return
    const seconds = Number(sniff)
    if (!Number.isFinite(seconds) || seconds < SNIFF_MIN || seconds > SNIFF_MAX) {
      setBanner({ tone: "error", text: "Sniff time must be between 1 and 180 seconds." })
      return
    }
    if (draft.lines.length === 0 || draft.lines.some((line) => line.text.trim().length === 0)) {
      setBanner({ tone: "error", text: "Write each line before saving. The course needs at least one." })
      return
    }
    setBusy("save")
    setBanner(null)
    const next: ObedienceCourse = { ...draft, sniffSeconds: clampSniff(seconds) }
    const result = await saveCourseConfig(next)
    setBusy(null)
    if (result.ok) {
      setDraft(result.course)
      setSniff(String(result.course.sniffSeconds))
      setBanner({ tone: result.note ? "warn" : "ok", text: result.note ?? "Saved." })
      return
    }
    if (result.keptLocally) {
      setDraft(next)
      setBanner({ tone: "warn", text: result.error })
      return
    }
    setBanner({ tone: "error", text: result.error })
  }

  return (
    <CourseChrome title="Edit course" onBack={onBack}>
      <div data-course-editor="ready" className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-5 sm:px-6">
        <div>
          <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">Creator</p>
          <h2 className="mt-2 font-serif text-3xl">Obedience Training</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4a3424]">Students see the course, not this page. A line with no audio is shown as the prompt.</p>
        </div>
        {banner && (
          <p role={banner.tone === "error" ? "alert" : "status"} className={banner.tone === "error" ? "rounded-2xl bg-[#f8e4e4] px-4 py-3 text-sm text-[#7a2424]" : "rounded-2xl bg-[#f3ead7] px-4 py-3 text-sm text-[#4a3424]"}>
            {banner.text}
          </p>
        )}
        <label className="block">
          <span className="text-[10px] tracking-[0.22em] text-[#8a6238] uppercase">Sniff time in seconds</span>
          <input
            type="number"
            inputMode="decimal"
            min={SNIFF_MIN}
            max={SNIFF_MAX}
            step={0.5}
            value={sniff}
            aria-label="Sniff time in seconds"
            onChange={(event) => setSniff(event.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-[#e7d3b0] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15a] sm:w-36"
          />
        </label>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-2xl">Lines to type</h3>
            <button
              type="button"
              className={courseButton("ghost")}
              disabled={busy !== null || draft.lines.length >= 24}
              onClick={() =>
                setDraft({
                  ...draft,
                  lines: [...draft.lines, { id: crypto.randomUUID(), text: "", audioId: null, audioName: null }],
                })
              }
            >
              Add a line
            </button>
          </div>
          {draft.lines.length === 0 && <p className="text-sm text-[#4a3424]">Add the first line. The course needs at least one.</p>}
          {draft.lines.map((line, index) => {
            const url = line.audioId ? audio[line.audioId] : null
            return (
              <div key={line.id} className="rounded-3xl border border-[#e7d3b0] bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] tracking-[0.22em] text-[#8a6238] uppercase">Line {index + 1}</p>
                  <button
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    className="h-10 rounded-full px-3 text-sm text-[#8a6238] hover:bg-[#6d2c3a]/10"
                    onClick={() => setDraft({ ...draft, lines: draft.lines.filter((item) => item.id !== line.id) })}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={line.text}
                  rows={2}
                  aria-label={`Line ${index + 1}`}
                  onChange={(event) => updateLine(line.id, { text: event.target.value })}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#e7d3b0] px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15a]"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[#e7d3b0] px-3 text-sm hover:bg-[#f6f1e6]">
                    {busy === line.id ? "Saving the clip…" : line.audioName ? "Replace audio" : "Add audio"}
                    <input
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      aria-label={`Audio for line ${index + 1}`}
                      disabled={busy !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ""
                        void chooseLineAudio(line, file)
                      }}
                    />
                  </label>
                  <span className="min-w-0 text-sm text-[#4a3424]">{line.audioName ?? "No audio. The line is shown as the prompt."}</span>
                  {url && (
                    <button
                      type="button"
                      className="h-10 text-left text-sm text-[#8a6238] underline underline-offset-2"
                      onClick={() => {
                        const clip = new Audio(url)
                        void clip.play().catch(() => setBanner({ tone: "error", text: "That clip could not be played." }))
                      }}
                    >
                      Play
                    </button>
                  )}
                  {line.audioId && (
                    <button
                      type="button"
                      aria-label={`Remove audio from line ${index + 1}`}
                      className="h-10 text-left text-sm text-[#8a6238] underline underline-offset-2"
                      onClick={() => updateLine(line.id, { audioId: null, audioName: null })}
                    >
                      Remove audio
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-serif text-2xl">Praise audio</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#4a3424]">A clip plays on about one correct line in four, and only after you add one. The written praise is already in the lesson.</p>
          </div>
          {draft.praise.length === 0 && <p className="text-sm text-[#8a6238]">No praise clips yet.</p>}
          {draft.praise.map((clip) => (
            <div key={clip.id} className="flex flex-col gap-2 rounded-3xl border border-[#e7d3b0] bg-white p-3 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 truncate text-sm">{clip.name}</p>
              {audio[clip.id] && (
                <button
                  type="button"
                  className="h-10 text-left text-sm text-[#8a6238] underline underline-offset-2"
                  onClick={() => {
                    const player = new Audio(audio[clip.id])
                    void player.play().catch(() => setBanner({ tone: "error", text: "That clip could not be played." }))
                  }}
                >
                  Play
                </button>
              )}
              <button
                type="button"
                aria-label={`Remove ${clip.name}`}
                className="h-10 text-left text-sm text-[#8a6238] underline underline-offset-2"
                onClick={() => setDraft({ ...draft, praise: draft.praise.filter((item) => item.id !== clip.id) })}
              >
                Remove
              </button>
            </div>
          ))}
          <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[#e7d3b0] bg-white px-4 text-sm sm:w-fit">
            {busy === "praise" ? "Saving the clip…" : "Add a praise clip"}
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              aria-label="Add a praise clip"
              disabled={busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                void choosePraise(file)
              }}
            />
          </label>
        </section>
        <button type="button" className={courseButton()} disabled={busy !== null} onClick={() => void save()}>
          {busy === "save" ? "Saving…" : "Save course"}
        </button>
      </div>
    </CourseChrome>
  )
}
