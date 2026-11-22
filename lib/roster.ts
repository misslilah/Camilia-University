export type RosterLink = {
  academyUserId: string
  tierTitle: string | null
  patronStatus: string | null
  isAdmin: boolean
  updatedAt: string
}

export type RosterUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type RosterStudent = {
  id: string
  name: string
  email: string
  joinedAt: string
  tier: string
}

export function tierLine(link: RosterLink | undefined) {
  if (!link) return "Patreon not connected"
  if (link.isAdmin) return "Creator"
  const title = link.tierTitle?.trim() ?? ""
  if (link.patronStatus === "active_patron" && title) return title
  if (link.patronStatus === "active_patron") return "Active member"
  return "Connected, no paid tier"
}

export function joinRoster(users: RosterUser[], links: RosterLink[]): RosterStudent[] {
  const byUser = new Map<string, RosterLink>()
  const ordered = [...links].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  for (const link of ordered) {
    if (!link.academyUserId || byUser.has(link.academyUserId)) continue
    byUser.set(link.academyUserId, link)
  }
  return users
    .map((user) => ({
      id: user.id,
      name: user.name.trim() || "Student",
      email: user.email,
      joinedAt: user.createdAt,
      tier: tierLine(byUser.get(user.id)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email))
}
