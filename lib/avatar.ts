export type Sex = "man" | "woman"
export type Hair = "short" | "crop" | "medium" | "bob" | "long" | "bun" | "ponytail"

export type Character = {
  sex: Sex
  height: number
  skin: string
  hair: Hair
  hairColor: string
}

export type Option<T extends string> = { id: T; label: string }
export type Swatch = { color: string; label: string }

export const AVATAR_LAYER = 1

export const HEIGHT_RANGE: Record<Sex, [number, number]> = {
  man: [1.66, 1.92],
  woman: [1.56, 1.8],
}

export const SKIN: Swatch[] = [
  { color: "#f3d7c3", label: "Porcelain" },
  { color: "#e9c09f", label: "Light" },
  { color: "#d4a07a", label: "Medium" },
  { color: "#b07a54", label: "Tan" },
  { color: "#80553a", label: "Brown" },
  { color: "#553626", label: "Deep" },
]

export const HAIR: Option<Hair>[] = [
  { id: "short", label: "Short" },
  { id: "crop", label: "Crop" },
  { id: "medium", label: "Medium" },
  { id: "bob", label: "Bob" },
  { id: "long", label: "Long" },
  { id: "bun", label: "Bun" },
  { id: "ponytail", label: "Ponytail" },
]

export const HAIR_COLORS: Swatch[] = [
  { color: "#1c1612", label: "Black" },
  { color: "#3b2619", label: "Dark brown" },
  { color: "#6b4528", label: "Brown" },
  { color: "#8a3f22", label: "Auburn" },
  { color: "#c7a16a", label: "Blond" },
  { color: "#a9a49d", label: "Grey" },
]

// Everyone wears the same plain clothes; only the body is customised.
export const OUTFIT: Record<Sex, { top: string; bottom: string; shoes: string; sole: string }> = {
  man: { top: "#9c9d9f", bottom: "#28334d", shoes: "#f1f0eb", sole: "#f3f1ea" },
  woman: { top: "#eeece6", bottom: "#56729b", shoes: "#f1f0eb", sole: "#f3f1ea" },
}

const BASE: Record<Sex, Character> = {
  man: { sex: "man", height: 0.5, skin: SKIN[1].color, hair: "short", hairColor: HAIR_COLORS[1].color },
  woman: { sex: "woman", height: 0.5, skin: SKIN[1].color, hair: "long", hairColor: HAIR_COLORS[2].color },
}

export function baseCharacter(sex: Sex): Character {
  return { ...BASE[sex] }
}

export const SEX_LABEL: Record<Sex, string> = { man: "Men", woman: "Women" }

export function switchSex(character: Character, sex: Sex): Character {
  if (character.sex === sex) return character
  return { ...baseCharacter(sex), height: character.height, skin: character.skin }
}

export function heightMeters(character: Character) {
  const [low, high] = HEIGHT_RANGE[character.sex]
  return low + (high - low) * character.height
}

const STORAGE_KEY = "camilia-character"

function oneOf<T extends string>(value: unknown, options: Option<T>[], fallback: T): T {
  return options.some((option) => option.id === value) ? (value as T) : fallback
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function unit(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
}

export type Saved = { character: Character; created: boolean }

// Saves from before the creation step have no flag; they were already made.
// Fields from older versions (outfit, underwear, body sliders) are dropped.
export function loadCharacter(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (data.sex !== "man" && data.sex !== "woman") return null
    const base = BASE[data.sex]
    const character: Character = {
      sex: data.sex,
      height: unit(data.height, base.height),
      skin: color(data.skin, base.skin),
      hair: oneOf(data.hair, HAIR, base.hair),
      hairColor: color(data.hairColor, base.hairColor),
    }
    return { character, created: data.created !== false }
  } catch {
    return null
  }
}

export function saveCharacter(character: Character) {
  try {
    const { sex, height, skin, hair, hairColor } = character
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sex, height, skin, hair, hairColor, created: true }))
  } catch {
    // Storage can be blocked; the character still lasts for this visit.
  }
}
