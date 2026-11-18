export function properName(value: string | null | undefined, email = "") {
  const name = (value ?? "").trim().replace(/\s+/g, " ")
  if (name.length < 2 || name.length > 80) return ""
  if (name.includes("@")) return ""
  if (email && name.toLowerCase() === email.toLowerCase()) return ""
  return name
}
