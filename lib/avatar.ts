export type Sex = "man" | "woman"
export type Hair = "short" | "crop" | "medium" | "bob" | "long" | "bun" | "ponytail"
export type Top = "tee" | "longsleeve" | "knit" | "shirt" | "tank"
export type Bottom = "jeans" | "chinos" | "wide" | "shorts" | "skirt"
export type Shoes = "sneakers" | "loafers" | "boots"
export type Outer = "none" | "jacket" | "cardigan" | "coat"

export type Character = {
  sex: Sex
  height: number
  build: number
  shoulders: number
  hips: number
  skin: string
  hair: Hair
  hairColor: string
  top: Top
  topColor: string
  bottom: Bottom
  bottomColor: string
  shoes: Shoes
  shoesColor: string
  outer: Outer
  outerColor: string
  underwear: boolean
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

export const TOPS: Option<Top>[] = [
  { id: "tee", label: "T-shirt" },
  { id: "longsleeve", label: "Long sleeve" },
  { id: "knit", label: "Knit sweater" },
  { id: "shirt", label: "Shirt" },
  { id: "tank", label: "Tank top" },
]

export const BOTTOMS: Option<Bottom>[] = [
  { id: "jeans", label: "Straight jeans" },
  { id: "chinos", label: "Chinos" },
  { id: "wide", label: "Wide trousers" },
  { id: "shorts", label: "Shorts" },
  { id: "skirt", label: "Midi skirt" },
]

export const SHOES: Option<Shoes>[] = [
  { id: "sneakers", label: "Sneakers" },
  { id: "loafers", label: "Loafers" },
  { id: "boots", label: "Boots" },
]

export const OUTERS: Option<Outer>[] = [
  { id: "none", label: "None" },
  { id: "jacket", label: "Jacket" },
  { id: "cardigan", label: "Cardigan" },
  { id: "coat", label: "Long coat" },
]

export const TOP_COLORS: Swatch[] = [
  { color: "#eeece6", label: "White" },
  { color: "#9c9d9f", label: "Heather grey" },
  { color: "#202024", label: "Black" },
  { color: "#26334a", label: "Navy" },
  { color: "#8b9a7c", label: "Sage" },
  { color: "#d9c9ae", label: "Oatmeal" },
  { color: "#6f2534", label: "Burgundy" },
  { color: "#6d8fb5", label: "Sky blue" },
]

export const BOTTOM_COLORS: Swatch[] = [
  { color: "#28334d", label: "Dark indigo" },
  { color: "#56729b", label: "Mid blue" },
  { color: "#1e1f23", label: "Black" },
  { color: "#c3b59b", label: "Stone" },
  { color: "#5f6247", label: "Olive" },
  { color: "#77787d", label: "Grey" },
]

export const SHOE_COLORS: Swatch[] = [
  { color: "#f1f0eb", label: "White" },
  { color: "#1d1d20", label: "Black" },
  { color: "#9c6d45", label: "Tan" },
  { color: "#2a3550", label: "Navy" },
]

export const OUTER_COLORS: Swatch[] = [
  { color: "#b0875a", label: "Camel" },
  { color: "#1f2024", label: "Black" },
  { color: "#27324a", label: "Navy" },
  { color: "#5c6146", label: "Olive" },
  { color: "#5d7598", label: "Denim" },
  { color: "#e4dac6", label: "Cream" },
]

export const UNDERWEAR_COLOR = "#45474e"

const BASE: Record<Sex, Character> = {
  man: {
    sex: "man",
    height: 0.5,
    build: 0.25,
    shoulders: 0.5,
    hips: 0.5,
    skin: SKIN[1].color,
    hair: "short",
    hairColor: HAIR_COLORS[1].color,
    top: "tee",
    topColor: TOP_COLORS[1].color,
    bottom: "jeans",
    bottomColor: BOTTOM_COLORS[0].color,
    shoes: "sneakers",
    shoesColor: SHOE_COLORS[0].color,
    outer: "none",
    outerColor: OUTER_COLORS[0].color,
    underwear: false,
  },
  woman: {
    sex: "woman",
    height: 0.5,
    build: 0.25,
    shoulders: 0.5,
    hips: 0.5,
    skin: SKIN[1].color,
    hair: "long",
    hairColor: HAIR_COLORS[2].color,
    top: "tee",
    topColor: TOP_COLORS[0].color,
    bottom: "jeans",
    bottomColor: BOTTOM_COLORS[1].color,
    shoes: "sneakers",
    shoesColor: SHOE_COLORS[0].color,
    outer: "none",
    outerColor: OUTER_COLORS[0].color,
    underwear: false,
  },
}

export function baseCharacter(sex: Sex): Character {
  return { ...BASE[sex] }
}

export function baseOutfit(character: Character): Character {
  const base = BASE[character.sex]
  return {
    ...character,
    top: base.top,
    topColor: base.topColor,
    bottom: base.bottom,
    bottomColor: base.bottomColor,
    shoes: base.shoes,
    shoesColor: base.shoesColor,
    outer: base.outer,
    outerColor: base.outerColor,
    underwear: false,
  }
}

export function switchSex(character: Character, sex: Sex): Character {
  if (character.sex === sex) return character
  return {
    ...baseCharacter(sex),
    height: character.height,
    build: character.build,
    shoulders: character.shoulders,
    hips: character.hips,
    skin: character.skin,
    underwear: character.underwear,
  }
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

export function loadCharacter(): Character | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (data.sex !== "man" && data.sex !== "woman") return null
    const base = BASE[data.sex]
    return {
      sex: data.sex,
      height: unit(data.height, base.height),
      build: unit(data.build, base.build),
      shoulders: unit(data.shoulders, base.shoulders),
      hips: unit(data.hips, base.hips),
      skin: color(data.skin, base.skin),
      hair: oneOf(data.hair, HAIR, base.hair),
      hairColor: color(data.hairColor, base.hairColor),
      top: oneOf(data.top, TOPS, base.top),
      topColor: color(data.topColor, base.topColor),
      bottom: oneOf(data.bottom, BOTTOMS, base.bottom),
      bottomColor: color(data.bottomColor, base.bottomColor),
      shoes: oneOf(data.shoes, SHOES, base.shoes),
      shoesColor: color(data.shoesColor, base.shoesColor),
      outer: oneOf(data.outer, OUTERS, base.outer),
      outerColor: color(data.outerColor, base.outerColor),
      underwear: data.underwear === true,
    }
  } catch {
    return null
  }
}

export function saveCharacter(character: Character) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(character))
  } catch {
    // Storage can be blocked; the character still lasts for this visit.
  }
}
