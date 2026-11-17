export type Sex = "man" | "woman"
export type Hair = "short" | "crop" | "medium" | "bob" | "long" | "bun" | "ponytail"

export type TopKind = "tee" | "longsleeve" | "knit"
export type BottomKind = "jeans" | "chinos" | "shorts" | "skirt"
export type ShoeKind = "sneakers" | "boots"

// Underwear is always worn; the other slots can be left empty.
export type Outfit = { underwear: string; top: string; bottom: string; shoes: string }

export type Character = {
  sex: Sex
  height: number
  skin: string
  hair: Hair
  hairColor: string
  outfit: Outfit
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

export type Item<K extends string = string> = { id: string; label: string; kind: K; color: string; sole?: string }

export const NONE = "none"

export const UNDERWEAR: Record<Sex, Item<"set">[]> = {
  man: [
    { id: "boxers-charcoal", label: "Charcoal boxer briefs", kind: "set", color: "#45474e" },
    { id: "boxers-navy", label: "Navy boxer briefs", kind: "set", color: "#27324a" },
    { id: "boxers-white", label: "White boxer briefs", kind: "set", color: "#e9e7e1" },
  ],
  woman: [
    { id: "set-charcoal", label: "Charcoal set", kind: "set", color: "#45474e" },
    { id: "set-rose", label: "Rose set", kind: "set", color: "#c4908c" },
    { id: "set-white", label: "White set", kind: "set", color: "#e9e7e1" },
  ],
}

const TOP_ITEMS: Item<TopKind>[] = [
  { id: "tee-grey", label: "Grey T-shirt", kind: "tee", color: "#9c9d9f" },
  { id: "tee-white", label: "White T-shirt", kind: "tee", color: "#eeece6" },
  { id: "tee-black", label: "Black T-shirt", kind: "tee", color: "#202024" },
  { id: "longsleeve-navy", label: "Navy long sleeve", kind: "longsleeve", color: "#26334a" },
  { id: "knit-oatmeal", label: "Oatmeal sweater", kind: "knit", color: "#d9c9ae" },
]

const BOTTOM_ITEMS: Item<BottomKind>[] = [
  { id: "jeans-dark", label: "Dark jeans", kind: "jeans", color: "#28334d" },
  { id: "jeans-blue", label: "Blue jeans", kind: "jeans", color: "#56729b" },
  { id: "chinos-stone", label: "Stone chinos", kind: "chinos", color: "#c3b59b" },
  { id: "chinos-black", label: "Black trousers", kind: "chinos", color: "#1e1f23" },
  { id: "shorts-navy", label: "Navy shorts", kind: "shorts", color: "#2a3550" },
]

export const TOPS: Record<Sex, Item<TopKind>[]> = { man: TOP_ITEMS, woman: TOP_ITEMS }

export const BOTTOMS: Record<Sex, Item<BottomKind>[]> = {
  man: BOTTOM_ITEMS,
  woman: [...BOTTOM_ITEMS, { id: "skirt-black", label: "Black midi skirt", kind: "skirt", color: "#1e1f23" }],
}

const SHOE_ITEMS: Item<ShoeKind>[] = [
  { id: "sneakers-white", label: "White sneakers", kind: "sneakers", color: "#f1f0eb", sole: "#f3f1ea" },
  { id: "sneakers-black", label: "Black sneakers", kind: "sneakers", color: "#1d1d20", sole: "#f3f1ea" },
  { id: "boots-tan", label: "Tan boots", kind: "boots", color: "#9c6d45", sole: "#2a2a2c" },
]

export const SHOES: Record<Sex, Item<ShoeKind>[]> = { man: SHOE_ITEMS, woman: SHOE_ITEMS }

export function findItem<K extends string>(items: Item<K>[], id: string): Item<K> | null {
  return items.find((item) => item.id === id) ?? null
}

const DEFAULT_OUTFIT: Record<Sex, Outfit> = {
  man: { underwear: "boxers-charcoal", top: "tee-grey", bottom: "jeans-dark", shoes: "sneakers-white" },
  woman: { underwear: "set-charcoal", top: "tee-white", bottom: "jeans-blue", shoes: "sneakers-white" },
}

const BASE: Record<Sex, Omit<Character, "outfit">> = {
  man: { sex: "man", height: 0.5, skin: SKIN[1].color, hair: "short", hairColor: HAIR_COLORS[1].color },
  woman: { sex: "woman", height: 0.5, skin: SKIN[1].color, hair: "long", hairColor: HAIR_COLORS[2].color },
}

export function baseCharacter(sex: Sex): Character {
  return { ...BASE[sex], outfit: { ...DEFAULT_OUTFIT[sex] } }
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
// Fields from older versions (flat outfit, underwear flag, body sliders) are
// dropped; an unknown or missing outfit falls back to the default clothes.
export function loadCharacter(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (data.sex !== "man" && data.sex !== "woman") return null
    const sex = data.sex
    const base = BASE[sex]
    const fallback = DEFAULT_OUTFIT[sex]
    const saved = (typeof data.outfit === "object" && data.outfit ? data.outfit : {}) as Record<string, unknown>
    const pick = (items: Item[], value: unknown, empty: boolean, def: string) =>
      (empty && value === NONE) || items.some((item) => item.id === value) ? (value as string) : def
    const character: Character = {
      sex,
      height: unit(data.height, base.height),
      skin: color(data.skin, base.skin),
      hair: oneOf(data.hair, HAIR, base.hair),
      hairColor: color(data.hairColor, base.hairColor),
      outfit: {
        underwear: pick(UNDERWEAR[sex], saved.underwear, false, fallback.underwear),
        top: pick(TOPS[sex], saved.top, true, fallback.top),
        bottom: pick(BOTTOMS[sex], saved.bottom, true, fallback.bottom),
        shoes: pick(SHOES[sex], saved.shoes, true, fallback.shoes),
      },
    }
    return { character, created: data.created !== false }
  } catch {
    return null
  }
}

export function saveCharacter(character: Character) {
  try {
    const { sex, height, skin, hair, hairColor, outfit } = character
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sex, height, skin, hair, hairColor, outfit, created: true }),
    )
  } catch {
    // Storage can be blocked; the character still lasts for this visit.
  }
}
