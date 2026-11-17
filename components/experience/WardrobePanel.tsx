"use client"

import type { ReactNode } from "react"
import { ArrowLeft, RotateCcw, RotateCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  BOTTOMS,
  HAIR,
  HAIR_COLORS,
  NONE,
  SHOES,
  SKIN,
  SEX_LABEL,
  TOPS,
  UNDERWEAR,
  heightMeters,
  switchSex,
  type Character,
  type Item,
  type Option,
  type Outfit,
  type Sex,
  type Swatch,
} from "@/lib/avatar"
import { cn } from "@/lib/utils"

const chrome =
  "rounded-full border-[#f3ead7]/30 bg-[#1a120e]/55 text-[#f6f0e6] backdrop-blur-md hover:bg-[#f3ead7] hover:text-[#2a1c14]"

export function WardrobePanel({
  open,
  character,
  created,
  onChoose,
  onChange,
  onCreate,
  onDone,
  onTurn,
}: {
  open: boolean
  character: Character | null
  created: boolean
  onChoose: (sex: Sex) => void
  onChange: (update: (current: Character) => Character) => void
  onCreate: () => void
  onDone: () => void
  onTurn: (step: number) => void
}) {
  return (
    <>
      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "pointer-events-none absolute z-20 flex gap-2 transition-opacity duration-500",
          "bottom-[calc(52dvh+0.75rem)] left-1/2 -translate-x-1/2 sm:bottom-7 sm:left-16 sm:translate-x-0",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <Button variant="outline" className={cn("pointer-events-auto hidden sm:inline-flex", chrome)} onClick={onDone}>
          <ArrowLeft />
          Back to the room
        </Button>
        {character && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#f3ead7]/25 bg-[#1a120e]/55 p-1 backdrop-blur-md">
            <button
              type="button"
              aria-label="Turn left"
              onClick={() => onTurn(-0.6)}
              className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[#f3ead7] hover:text-[#2a1c14]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <span className="px-1 text-xs text-[#f6f0e6]/75">Drag to turn</span>
            <button
              type="button"
              aria-label="Turn right"
              onClick={() => onTurn(0.6)}
              className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[#f3ead7] hover:text-[#2a1c14]"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <aside
        aria-label={created ? "Wardrobe" : "Create your character"}
        aria-hidden={!open}
        inert={!open}
        data-wardrobe-panel
        className={cn(
          "absolute z-20 flex flex-col overflow-hidden border border-[#f3ead7]/15 bg-[#1a120e]/88 text-[#f6f0e6] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[transform,opacity] duration-500 ease-out",
          "inset-x-0 bottom-0 h-[52dvh] rounded-t-[28px]",
          "sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-5 sm:h-auto sm:w-[372px] sm:rounded-[28px]",
          open
            ? "translate-y-0 opacity-100 sm:translate-x-0"
            : "pointer-events-none translate-y-8 opacity-0 sm:translate-x-8 sm:translate-y-0",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-[#f3ead7]/60">{created ? "BEDROOM" : "NEW CHARACTER"}</p>
            <h2 className="font-serif text-2xl leading-tight">{created ? "Wardrobe" : "Create your character"}</h2>
          </div>
          <button
            type="button"
            aria-label="Back to the room"
            onClick={onDone}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#f3ead7]/20 transition-colors hover:bg-[#f3ead7] hover:text-[#2a1c14]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {character ? (
          created ? (
            <Dresser character={character} onChange={onChange} onDone={onDone} />
          ) : (
            <Creator character={character} onChange={onChange} onCreate={onCreate} />
          )
        ) : (
          <Chooser onChoose={onChoose} />
        )}
      </aside>
    </>
  )
}

function Chooser({ onChoose }: { onChoose: (sex: Sex) => void }) {
  const choices: Sex[] = ["man", "woman"]
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
      <div>
        <p className="font-serif text-xl">Who is in the mirror?</p>
        <p className="mt-1 text-sm text-[#f3ead7]/70">
          Pick a body, then set height, skin tone and hair.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {choices.map((sex) => (
          <button
            key={sex}
            type="button"
            onClick={() => onChoose(sex)}
            className="group flex flex-col items-center gap-3 rounded-3xl border border-[#f3ead7]/20 bg-[#f3ead7]/5 px-3 pt-4 pb-4 text-center transition-colors hover:border-[#c6a15a] hover:bg-[#f3ead7]/10 focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none"
          >
            <Silhouette sex={sex} />
            <span className="text-base font-medium">{SEX_LABEL[sex]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Silhouette({ sex }: { sex: Sex }) {
  const woman = sex === "woman"
  return (
    <svg viewBox="0 0 60 120" className="h-24 w-12 text-[#f3ead7]/80 transition-colors group-hover:text-[#c6a15a]" aria-hidden>
      <g fill="currentColor">
        <ellipse cx="30" cy="12" rx="8" ry="10" />
        {woman ? (
          <path d="M21 26 C25 24 35 24 39 26 L42 44 C40 50 38 52 39 58 L42 66 L18 66 L21 58 C22 52 20 50 18 44 Z" />
        ) : (
          <path d="M18 26 C24 23 36 23 42 26 L41 46 C39 52 39 56 39 62 L21 62 C21 56 21 52 19 46 Z" />
        )}
        <path d={woman ? "M21 64 L29 64 L28 114 L23 114 Z" : "M21 60 L29 60 L28 114 L22 114 Z"} />
        <path d={woman ? "M31 64 L39 64 L37 114 L32 114 Z" : "M31 60 L39 60 L38 114 L32 114 Z"} />
        <path d={woman ? "M20 28 L15 60 L18 61 L23 34 Z" : "M18 28 L12 62 L16 63 L22 34 Z"} />
        <path d={woman ? "M40 28 L45 60 L42 61 L37 34 Z" : "M42 28 L48 62 L44 63 L38 34 Z"} />
      </g>
    </svg>
  )
}

function BodyFields({
  character,
  onChange,
}: {
  character: Character
  onChange: (update: (current: Character) => Character) => void
}) {
  const set = <K extends keyof Character>(key: K, value: Character[K]) =>
    onChange((current) => ({ ...current, [key]: value }))
  return (
    <div className="flex flex-col gap-5">
      <Section title="Body">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f3ead7]/10 p-1">
          {(["man", "woman"] as Sex[]).map((sex) => (
            <button
              key={sex}
              type="button"
              aria-pressed={character.sex === sex}
              onClick={() => onChange((current) => switchSex(current, sex))}
              className={cn(
                "h-8 rounded-full text-sm transition-colors",
                character.sex === sex ? "bg-[#f3ead7] text-[#2a1c14]" : "text-[#f6f0e6]/80 hover:bg-white/10",
              )}
            >
              {SEX_LABEL[sex]}
            </button>
          ))}
        </div>
      </Section>
      <Range
        label="Height"
        value={character.height}
        display={`${Math.round(heightMeters(character) * 100)} cm`}
        onChange={(value) => set("height", value)}
      />
      <Section title="Skin tone">
        <Swatches options={SKIN} value={character.skin} onPick={(color) => set("skin", color)} />
      </Section>
      <Section title="Hair">
        <Chips options={HAIR} value={character.hair} onPick={(id) => set("hair", id)} />
        <Swatches options={HAIR_COLORS} value={character.hairColor} onPick={(color) => set("hairColor", color)} />
      </Section>
    </div>
  )
}

const scroller =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 [scrollbar-color:rgba(243,234,215,0.25)_transparent]"

function Creator({
  character,
  onChange,
  onCreate,
}: {
  character: Character
  onChange: (update: (current: Character) => Character) => void
  onCreate: () => void
}) {
  return (
    <>
      <div className={scroller}>
        <BodyFields character={character} onChange={onChange} />
      </div>
      <div className="flex flex-col gap-2 border-t border-[#f3ead7]/12 px-5 py-3">
        <p className="text-xs text-[#f3ead7]/60">Your character cannot be changed once created. Clothes come next.</p>
        <Button className="h-10 w-full rounded-full" onClick={onCreate}>
          Create character
        </Button>
      </div>
    </>
  )
}

function Dresser({
  character,
  onChange,
  onDone,
}: {
  character: Character
  onChange: (update: (current: Character) => Character) => void
  onDone: () => void
}) {
  const { sex, outfit } = character
  const wear = (slot: keyof Outfit) => (id: string) =>
    onChange((current) => ({ ...current, outfit: { ...current.outfit, [slot]: id } }))
  return (
    <>
      <div className={cn(scroller, "flex flex-col gap-5")}>
        <Section title="Underwear">
          <Items items={UNDERWEAR[sex]} value={outfit.underwear} onPick={wear("underwear")} />
        </Section>
        <Section title="Tops">
          <Items items={TOPS[sex]} value={outfit.top} onPick={wear("top")} none />
        </Section>
        <Section title="Pants">
          <Items items={BOTTOMS[sex]} value={outfit.bottom} onPick={wear("bottom")} none />
        </Section>
        <Section title="Shoes">
          <Items items={SHOES[sex]} value={outfit.shoes} onPick={wear("shoes")} none />
        </Section>
      </div>
      <div className="border-t border-[#f3ead7]/12 px-5 py-3">
        <Button className="h-10 w-full rounded-full" onClick={onDone}>
          Done
        </Button>
      </div>
    </>
  )
}

function Items({
  items,
  value,
  onPick,
  none = false,
}: {
  items: Item[]
  value: string
  onPick: (id: string) => void
  none?: boolean
}) {
  const options = none ? [{ id: NONE, label: "None", color: "" }, ...items] : items
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === value}
          onClick={() => onPick(item.id)}
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-2xl border px-3 text-left text-[13px] leading-tight transition-colors focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none",
            item.id === value
              ? "border-[#f3ead7] bg-[#f3ead7] text-[#2a1c14]"
              : "border-[#f3ead7]/20 text-[#f6f0e6]/85 hover:border-[#f3ead7]/45 hover:bg-white/5",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 rounded-full border",
              item.color ? "border-black/30" : "border-dashed border-current opacity-60",
            )}
            style={item.color ? { backgroundColor: item.color } : undefined}
          />
          {item.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[11px] tracking-[0.2em] text-[#f3ead7]/60 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Range({
  label,
  value,
  display,
  onChange,
}: {
  label: string
  value: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-[0.2em] text-[#f3ead7]/60 uppercase">{label}</span>
        <span className="text-xs text-[#f6f0e6]/85">{display}</span>
      </div>
      <Slider
        aria-label={label}
        min={0}
        max={1}
        step={0.01}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  )
}

function Chips<T extends string>({ options, value, onPick }: { options: Option<T>[]; value: T; onPick: (id: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onPick(option.id)}
          className={cn(
            "h-8 rounded-full border px-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-[#c6a15a] focus-visible:outline-none",
            option.id === value
              ? "border-[#f3ead7] bg-[#f3ead7] text-[#2a1c14]"
              : "border-[#f3ead7]/20 text-[#f6f0e6]/85 hover:border-[#f3ead7]/45 hover:bg-white/5",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Swatches({ options, value, onPick }: { options: Swatch[]; value: string; onPick: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.color}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={option.color === value}
          onClick={() => onPick(option.color)}
          className={cn(
            "h-7 w-7 rounded-full border border-black/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] transition-transform hover:scale-110 focus-visible:outline-none",
            option.color === value
              ? "ring-2 ring-[#f3ead7] ring-offset-2 ring-offset-[#1a120e]"
              : "focus-visible:ring-2 focus-visible:ring-[#c6a15a]",
          )}
          style={{ backgroundColor: option.color }}
        />
      ))}
    </div>
  )
}
