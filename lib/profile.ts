export const SKILLS = [
  { id: "feminization", label: "Feminization", color: "#e7a0b0" },
  { id: "oral", label: "Oral", color: "#f0b48a" },
  { id: "anal", label: "Anal", color: "#c4a0d4" },
  { id: "cumplay", label: "Cumplay", color: "#e6d3a1" },
  { id: "humiliation", label: "Humiliation", color: "#d36b6b" },
] as const

export type SkillId = (typeof SKILLS)[number]["id"]
export type SkillXp = Record<SkillId, number>

const RANKS = ["Untrained", "Novice", "Practiced", "Devoted", "Adept", "Renowned"] as const
const LEVELS = ["Initiate", "Novice", "Student", "Apprentice", "Adept", "Devotee", "Prodigy", "Luminary"] as const

export function blankSkills(): SkillXp {
  return { feminization: 0, oral: 0, anal: 0, cumplay: 0, humiliation: 0 }
}

export function rankNeed(rank: number) {
  return 40 + Math.max(0, rank) * 30
}

export function describeRank(xp: number) {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0
  let rank = 0
  let spent = 0
  while (rank < RANKS.length - 1) {
    const need = rankNeed(rank)
    if (safe < spent + need) return { rank, title: RANKS[rank], into: safe - spent, need, xp: safe }
    spent += need
    rank += 1
  }
  const need = rankNeed(rank)
  return { rank, title: RANKS[rank], into: Math.min(need, safe - spent), need, xp: safe }
}

export function levelNeed(level: number) {
  return 100 + Math.max(0, level - 1) * 50
}

export function describeLevel(total: number) {
  const safe = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  let level = 1
  let spent = 0
  while (level < 99) {
    const need = levelNeed(level)
    if (safe < spent + need) {
      return { level, title: LEVELS[Math.min(level - 1, LEVELS.length - 1)], into: safe - spent, need, total: safe }
    }
    spent += need
    level += 1
  }
  return { level, title: LEVELS[LEVELS.length - 1], into: 0, need: 1, total: safe }
}

export function totalXp(skills: SkillXp) {
  return SKILLS.reduce((sum, skill) => sum + skills[skill.id], 0)
}

function sanitize(value: unknown) {
  const skills = blankSkills()
  if (!value || typeof value !== "object") return skills
  const row = value as Record<string, unknown>
  for (const skill of SKILLS) {
    const xp = row[skill.id]
    skills[skill.id] = typeof xp === "number" && Number.isFinite(xp) && xp > 0 ? Math.min(1_000_000, Math.floor(xp)) : 0
  }
  return skills
}

export function loadSkills(name: string): SkillXp {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("camilia-profile") || "") as { name?: unknown; skills?: unknown }
    if (parsed?.name !== name) return blankSkills()
    return sanitize(parsed.skills)
  } catch {
    return blankSkills()
  }
}

export function saveSkills(name: string, skills: SkillXp) {
  try {
    window.localStorage.setItem("camilia-profile", JSON.stringify({ name, skills: sanitize(skills) }))
  } catch {
    // The badge still shows for this visit when storage is blocked.
  }
}
