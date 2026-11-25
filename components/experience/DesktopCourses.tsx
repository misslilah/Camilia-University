"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { CourseEditor } from "@/components/experience/CourseEditor"
import { CourseStatus } from "@/components/experience/course-chrome"
import { ObedienceTraining } from "@/components/experience/ObedienceTraining"
import { COPIES, LINES, loadObedience, saveObedience } from "@/lib/obedience"
import { obedienceTrainingOffered } from "@/lib/obedience-course"
import { usePatreonAdmin } from "@/lib/patreon"

function subscribeObedience(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== "camilia-obedience") return
    listener()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener("camilia-mail", listener)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("camilia-mail", listener)
  }
}

function useObedienceDone(name: string) {
  const who = name.trim() || "Student"
  const done = useSyncExternalStore(
    subscribeObedience,
    () => loadObedience(who).done,
    () => false,
  )
  useEffect(() => {
    let cancel = false
    fetch("/api/academy/progress")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { obedience?: boolean } | null) => {
        if (cancel || body?.obedience !== true || loadObedience(who).done) return
        saveObedience(who, { done: true, line: LINES.length - 1, copy: COPIES })
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [who])
  return done
}

export function DesktopCourses({ name }: { name: string }) {
  const done = useObedienceDone(name)
  const admin = usePatreonAdmin()
  const [checked, setChecked] = useState(false)
  const [view, setView] = useState<"list" | "train" | "edit">("list")
  const offered = obedienceTrainingOffered(done)

  useEffect(() => {
    setChecked(true)
  }, [])

  useEffect(() => {
    if (!offered || (!admin && view === "edit")) setView("list")
  }, [admin, offered, view])

  if (!checked) return <CourseStatus title="Opening courses…" />

  if (!offered) {
    return (
      <div data-obedience-training="locked" className="h-full">
        <CourseStatus
          title="Nothing is waiting on this desk."
          detail="Finish the first lesson in the amphitheater. This page stays quiet until that work is accepted."
        />
      </div>
    )
  }

  if (view === "edit" && admin) return <CourseEditor onBack={() => setView("list")} />
  if (view === "train") return <ObedienceTraining onBack={() => setView("list")} />

  return (
    <div data-obedience-training="ready" className="h-full overflow-auto bg-[#f6f1e6] px-5 py-5 text-[#2a1c14] sm:px-8">
      <p className="text-[10px] tracking-[0.32em] text-[#8a6238] uppercase">Courses</p>
      <h2 className="mt-2 font-serif text-3xl">Your studies</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#4a3424]">The first course is open.</p>
      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => setView("train")}
          className="rounded-3xl border border-[#e7d3b0] bg-white p-4 text-left shadow-[0_10px_30px_rgba(90,40,20,0.05)] hover:border-[#6d2c3a]/30"
        >
          <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-[#e7a0b0] to-[#b96b80]" />
          <span className="mt-3 block font-serif text-2xl">Obedience Training</span>
          <span className="mt-1 block text-sm text-[#8a6238]">Write each line exactly.</span>
        </button>
      </div>
      {admin && (
        <button type="button" onClick={() => setView("edit")} className="mt-4 text-sm text-[#8a6238] underline underline-offset-2">
          Edit course
        </button>
      )}
    </div>
  )
}
