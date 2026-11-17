export const FADE_ID = "camilia-fade"

let last = -1

export function setFade(value: number) {
  const rounded = Math.round(value * 1000) / 1000
  if (rounded === last) return
  last = rounded
  const element = document.getElementById(FADE_ID)
  if (element) element.style.opacity = String(rounded)
}
