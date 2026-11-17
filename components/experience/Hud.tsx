"use client"

import { ArrowLeft, ArrowRight, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CHAPTERS, type Phase, type Seat } from "@/lib/scene"
import { cn } from "@/lib/utils"

export function Hud({
  phase,
  seat,
  hovered,
  chapterId,
  onOpen,
  onSkip,
  onStand,
  onRoom,
  onLeaveRoom,
  onLeaveHall,
  onSelect,
  onBack,
  muted,
  onToggleSound,
}: {
  phase: Phase
  seat: Seat | null
  hovered: string | null
  chapterId: string | null
  onOpen: () => void
  onSkip: () => void
  onStand: () => void
  onRoom: () => void
  onLeaveRoom: () => void
  onLeaveHall: () => void
  onSelect: (id: string) => void
  onBack: () => void
  muted: boolean
  onToggleSound: () => void
}) {
  const chapter = CHAPTERS.find((item) => item.id === chapterId) ?? null
  const hint =
    phase === "inside"
      ? hovered
        ? seatLabel(hovered)
        : "Choose a chair"
      : null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-[#f6f0e6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(16,10,8,0.42)_100%)]" />

      <button
        type="button"
        aria-pressed={muted}
        aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        onClick={onToggleSound}
        className="pointer-events-auto absolute top-5 right-5 grid h-10 w-10 place-items-center rounded-full border border-[#f3ead7]/25 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md transition-colors hover:bg-[#f3ead7] hover:text-[#2a1c14] sm:top-7 sm:right-7"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <div
        aria-hidden={phase !== "arrival"}
        inert={phase !== "arrival"}
        className={cn(
          "absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-8 text-center transition-opacity duration-700 sm:pt-12",
          phase === "arrival" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p className="text-[11px] tracking-[0.48em] text-[#f3ead7]/75">UNIVERSITY</p>
        <h1 className="mt-3 font-serif text-5xl leading-none font-medium tracking-tight sm:text-7xl">
          Camilia
        </h1>
        <p className="mt-3 font-serif text-lg text-[#f3ead7]/80 sm:text-2xl">University</p>
      </div>

      <div
        aria-hidden={phase !== "arrival"}
        inert={phase !== "arrival"}
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-8 transition-opacity duration-700 sm:pb-12",
          phase === "arrival" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p className="max-w-sm text-sm text-[#f6f0e6]/80">
          Push the doors, enter the hall, then take a seat.
        </p>
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="h-12 rounded-full bg-[#f3ead7] px-8 text-[15px] tracking-wide text-[#2a1c14] shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:bg-[#fff8ee]"
            onClick={onOpen}
          >
            Open the doors
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Button variant="ghost" className="text-[#f3ead7]/75 hover:bg-white/10 hover:text-[#f6f0e6]" onClick={onSkip}>
              Enter directly
            </Button>
            <span aria-hidden className="text-[#f3ead7]/30">
              ·
            </span>
            <Button variant="ghost" className="text-[#f3ead7]/75 hover:bg-white/10 hover:text-[#f6f0e6]" onClick={onRoom}>
              Bedroom
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>

      <div
        aria-hidden={phase !== "room"}
        inert={phase !== "room"}
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 pr-4 pb-5 pl-16 transition-opacity duration-500 sm:pr-7 sm:pb-7",
          phase === "room" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Button
          variant="outline"
          className="pointer-events-auto rounded-full border-[#f3ead7]/30 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md hover:bg-[#f3ead7] hover:text-[#2a1c14]"
          onClick={onLeaveRoom}
        >
          <ArrowLeft />
          Back to the hallway
        </Button>
        <p className="hidden rounded-full bg-[#1a120e]/45 px-3 py-2 text-xs tracking-wide text-[#f6f0e6]/85 backdrop-blur-md sm:block">
          Move the mouse to look around · Click the wardrobe or the computer
        </p>
        <p className="rounded-full bg-[#1a120e]/45 px-3 py-2 text-xs tracking-wide text-[#f6f0e6]/85 backdrop-blur-md sm:hidden">
          Drag to look · Tap the wardrobe or the computer
        </p>
      </div>

      <div
        className={cn(
          "absolute top-5 left-5 transition-opacity duration-700 sm:top-7 sm:left-7",
          phase === "arrival" ? "opacity-0" : "opacity-100",
        )}
      >
        <p className="font-serif text-xl tracking-wide sm:text-2xl">Camilia</p>
        <p className="text-[10px] tracking-[0.32em] text-[#f3ead7]/60">UNIVERSITY</p>
      </div>

      {hint && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-6 sm:bottom-8">
          <div className="rounded-full border border-[#f3ead7]/20 bg-[#1a120e]/55 px-5 py-2 text-sm backdrop-blur-md">
            {hint}
            {phase === "inside" && !hovered && (
              <span className="mt-0.5 block text-center text-[11px] text-[#f3ead7]/60">
                Click a seat, or use the arrow keys
              </span>
            )}
          </div>
        </div>
      )}

      <div
        aria-hidden={phase !== "inside"}
        inert={phase !== "inside"}
        className={cn(
          "absolute top-20 left-5 transition-opacity duration-500 sm:top-auto sm:bottom-8 sm:left-16",
          phase === "inside" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Button
          variant="outline"
          className="pointer-events-auto rounded-full border-[#f3ead7]/30 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md hover:bg-[#f3ead7] hover:text-[#2a1c14]"
          onClick={onLeaveHall}
        >
          <ArrowLeft />
          Back to the hallway
        </Button>
      </div>

      {phase === "sitting" && (
        <div className="absolute inset-x-0 bottom-5 flex items-end justify-between gap-3 pr-4 pl-16 sm:bottom-7 sm:pr-7">
          <Button
            variant="outline"
            className="pointer-events-auto rounded-full border-[#f3ead7]/30 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md hover:bg-[#f3ead7] hover:text-[#2a1c14]"
            onClick={onStand}
          >
            Stand up
          </Button>
          <p className="rounded-full bg-[#1a120e]/45 px-3 py-2 text-xs tracking-wide backdrop-blur-md">
            {seat?.label}
          </p>
        </div>
      )}

      <div className="pointer-events-auto sr-only">
        {phase === "sitting" &&
          (chapter ? (
            <button type="button" onClick={onBack}>
              Back to the board
            </button>
          ) : (
            CHAPTERS.map((item, index) => (
              <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
                {index + 1}. {item.title}
              </button>
            ))
          ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "arrival" && "You are at the doors of Camilia University."}
        {phase === "opening" && "The doors are opening."}
        {phase === "inside" && "Choose a chair in the hall. Press Escape to go back to the hallway."}
        {phase === "leaving" && "You walk back out to the hallway."}
        {phase === "toRoom" && "You open the bedroom door."}
        {phase === "room" &&
          "You are in the bedroom: blue walls, a bed under the window, a desk with a computer, a wardrobe and a standing mirror. Click the wardrobe to get dressed, or the computer to use it. Press Escape to go back to the hallway."}
        {phase === "computer" &&
          "You sit at the desk in front of the computer desktop. Open the start menu or the desktop icons. Press Escape to go back to the room."}
        {phase === "wardrobe" &&
          "The wardrobe is open and your character stands in the mirror. Use the panel to create your character, then to choose underwear, tops, pants and shoes. Press Escape to go back to the room."}
        {phase === "sitting" &&
          (chapter
            ? `${chapter.title}. ${chapter.body}`
            : `${seat?.label ?? "You are seated"}. The menu is on the board.`)}
      </p>
    </div>
  )
}

function seatLabel(id: string) {
  const row = id.slice(0, 1)
  const n = id.slice(1)
  return `Row ${row} · seat ${n}`
}
