"use client"

import { Button } from "@/components/ui/button"
import type { Phase } from "@/lib/scene"

export type ArrivalBeat = "welcome" | "crossing" | "hall" | "seated" | "corridor" | "room" | "desk"

export function arrivalBeat(phase: Phase, settled: boolean, traveling: boolean): ArrivalBeat | null {
  if (phase === "leaving" || phase === "toRoom" || phase === "fromRoom") return "corridor"
  if (traveling && phase !== "room" && phase !== "cupboard" && phase !== "computer" && phase !== "wardrobe") return "corridor"
  if (phase === "arrival") return "welcome"
  if (phase === "opening") return "crossing"
  if (phase === "inside") return "hall"
  if (phase === "sitting") return settled ? "seated" : "crossing"
  if (phase === "room" || phase === "wardrobe" || phase === "cupboard") return "room"
  if (phase === "computer") return "desk"
  return null
}

const BEATS: Record<
  ArrivalBeat,
  { step: number; kicker: string; title: string; body: string; action: string | null }
> = {
  welcome: {
    step: 1,
    kicker: "The threshold",
    title: "Your name is already written",
    body: "You stop before the doors. Beside them, a list in a careful hand already carries your name, as if the university had been waiting all day. Behind the wood, the hall is lit. One seat is empty.",
    action: "Push the doors",
  },
  crossing: {
    step: 1,
    kicker: "The threshold",
    title: "The doors give way",
    body: "The hinges answer, and warm light runs across the threshold. The rows face a dark board. Walk in. The room has been waiting with the lights on.",
    action: null,
  },
  hall: {
    step: 2,
    kicker: "The amphitheater",
    title: "Every chair faces the board",
    body: "This is the amphitheater. It is here that the sissy will be trained. It is here that she will be graded, and here that she will learn. The board is blank tonight. The seat in the middle was left for you.",
    action: "Take your seat",
  },
  seated: {
    step: 2,
    kicker: "Your place",
    title: "The hall is yours from here",
    body: "Leather under you, the board straight ahead. Hold this place in mind. Training, grades, and lessons will all pass through it. Across the corridor, a quieter door already has your name on it.",
    action: "Cross to your room",
  },
  corridor: {
    step: 3,
    kicker: "Between rooms",
    title: "The corridor takes you",
    body: "The hall dims behind you. At the end of the passage, your door. It opens onto a room that has been ready since before you arrived.",
    action: null,
  },
  room: {
    step: 3,
    kicker: "Your room",
    title: "The day stays outside",
    body: "The door shuts. This room is yours. Here, she can revise. Here, she can change clothes. Here, she can have fun by herself. The wardrobe keeps the outfits. On the desk, the computer is still dark.",
    action: "Wake the computer",
  },
  desk: {
    step: 4,
    kicker: "The desk",
    title: "The screen wakes for you",
    body: "The desktop hums, and one icon is already glowing. The Patreon videos live here, the ones your tier can open. Nothing else in the university will show them to you. When you are ready, the term begins.",
    action: "Begin the term",
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
