"use client"

import { Button } from "@/components/ui/button"
import type { Phase } from "@/lib/scene"

export type ArrivalBeat = "welcome" | "crossing" | "hall" | "seated" | "corridor" | "room" | "desk"

export function arrivalBeat(phase: Phase, settled: boolean, traveling: boolean): ArrivalBeat | null {
  if (phase === "leaving" || phase === "toRoom" || phase === "fromRoom") return "corridor"
  if (traveling && phase !== "room" && phase !== "computer" && phase !== "wardrobe") return "corridor"
  if (phase === "arrival") return "welcome"
  if (phase === "opening") return "crossing"
  if (phase === "inside") return "hall"
  if (phase === "sitting") return settled ? "seated" : "crossing"
  if (phase === "room" || phase === "wardrobe") return "room"
  if (phase === "computer") return "desk"
  return null
}

const BEATS: Record<
  ArrivalBeat,
  { step: number; kicker: string; title: string; body: string; action: string | null }
> = {
  welcome: {
    step: 1,
    kicker: "First day",
    title: "You are expected",
    body: "Your name is on the list. The doors of Camilia University are open for you. Today you cross the hall, then your room.",
    action: "Push the doors",
  },
  crossing: {
    step: 1,
    kicker: "First day",
    title: "The doors open",
    body: "Step in. The hall is already lit.",
    action: null,
  },
  hall: {
    step: 2,
    kicker: "Amphitheater",
    title: "This is where it happens",
    body: "This is where the sissy will be trained. This is where she will be graded, and where she can learn.",
    action: "Take your seat",
  },
  seated: {
    step: 2,
    kicker: "Your seat",
    title: "You are enrolled",
    body: "Remember this hall. Training, grades, and lessons pass through here. Your room is across the corridor.",
    action: "Go to your room",
  },
  corridor: {
    step: 3,
    kicker: "The corridor",
    title: "Crossing over",
    body: "Your room is at the end.",
    action: null,
  },
  room: {
    step: 3,
    kicker: "The bedroom",
    title: "This room is yours",
    body: "This is where she can revise, change clothes, and have fun by herself. The wardrobe is for outfits. The computer is next.",
    action: "Open the computer",
  },
  desk: {
    step: 4,
    kicker: "The desk",
    title: "The videos are here",
    body: "This computer is also where you find the Patreon videos, according to your tier.",
    action: "Begin",
  },
}

export function Tour({ beat, onNext, onSkip }: { beat: ArrivalBeat; onNext: () => void; onSkip: () => void }) {
  const card = BEATS[beat]
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-5 sm:pb-8">
      <section className="pointer-events-auto w-full max-w-xl rounded-3xl border border-[#e7d7b8]/70 bg-[#f6efe2]/95 px-5 py-4 text-[#2a1c14] shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.22em] text-[#8a6238] uppercase">{card.kicker}</p>
          <p className="text-[11px] tracking-[0.18em] text-[#8a6238] uppercase">{card.step} / 4</p>
        </div>
        <h2 className="mt-2 font-serif text-2xl">{card.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#4a3424]">{card.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="text-xs tracking-wide text-[#8a6238] underline-offset-4 hover:underline" onClick={onSkip}>
            Skip the arrival
          </button>
          {card.action && (
            <Button className="rounded-full bg-[#6d2c3a] px-5 text-[#f6efe2] hover:bg-[#54202b]" onClick={onNext}>
              {card.action}
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
