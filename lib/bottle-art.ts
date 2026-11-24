import { CanvasTexture, SRGBColorSpace, type Texture } from "three"

export type BottleArt = {
  label: Texture
  card: Texture
  metal: Texture
}

let cached: BottleArt | null = null
let pending: Promise<BottleArt> | null = null

function triangle(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.moveTo(cx, y + h)
  ctx.lineTo(cx - w / 2, y)
  ctx.lineTo(cx + w / 2, y)
  ctx.closePath()
  ctx.fill()
}

function drawGothic(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, maxWidth: number, stretchY: number) {
  ctx.save()
  ctx.font = `900 ${size}px GrenzeGotisch, "Times New Roman", serif`
  const width = ctx.measureText(text).width || 1
  const sx = Math.min(1.35, maxWidth / width)
  ctx.translate(cx, cy)
  ctx.scale(sx, stretchY)
  ctx.fillStyle = "#111111"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function drawTracked(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, maxWidth: number, tracking = 0.22) {
  ctx.save()
  ctx.font = `500 ${size}px BottleSans, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#161616"
  let spacing = size * tracking
  ctx.letterSpacing = `${spacing}px`
  let width = ctx.measureText(text).width
  if (width > maxWidth && width > 0) {
    spacing = Math.max(0.4, spacing * (maxWidth / width) * 0.94)
    ctx.letterSpacing = `${spacing}px`
    width = ctx.measureText(text).width
  }
  if (width > maxWidth && width > 0) {
    ctx.translate(cx, cy)
    ctx.scale(maxWidth / width, 1)
    ctx.fillText(text, 0, 0)
  } else {
    ctx.fillText(text, cx, cy)
  }
  ctx.restore()
}

function drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#f4f4f2"
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#111111"
  triangle(ctx, x + w / 2, y + h * 0.04, w * 0.36, h * 0.072)
  drawGothic(ctx, "IRON", x + w / 2, y + h * 0.28, h * 0.19, w * 0.88, 1.16)
  drawGothic(ctx, "FIST", x + w / 2, y + h * 0.48, h * 0.21, w * 0.92, 1.18)
  drawTracked(ctx, "LEATHER CLEANER", x + w / 2, y + h * 0.655, Math.max(11, h * 0.04), w * 0.86)
  ctx.fillStyle = "#111111"
  triangle(ctx, x + w / 2, y + h * 0.74, w * 0.08, h * 0.03)
  drawTracked(ctx, "30 ml - 1 fl oz", x + w / 2, y + h * 0.85, Math.max(11, h * 0.038), w * 0.78, 0.02)
}

function roundBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function paintCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  const bw = w * 0.72
  const bx = (w - bw) / 2
  const capH = h * 0.145
  const capY = h * 0.025
  const bodyY = capY + capH - h * 0.012
  const bodyH = h - bodyY - h * 0.03
  const metal = ctx.createLinearGradient(bx, 0, bx + bw, 0)
  metal.addColorStop(0, "#8e949b")
  metal.addColorStop(0.12, "#f7f8f8")
  metal.addColorStop(0.28, "#c5cbcf")
  metal.addColorStop(0.46, "#f4f6f7")
  metal.addColorStop(0.62, "#d5dadd")
  metal.addColorStop(0.82, "#f8f9f9")
  metal.addColorStop(1, "#7e868e")
  ctx.fillStyle = metal
  roundBox(ctx, bx, bodyY, bw, bodyH, w * 0.035)
  ctx.fillStyle = "#101010"
  roundBox(ctx, bx + bw * 0.04, capY, bw * 0.92, capH, w * 0.02)
  ctx.strokeStyle = "#3a3a3a"
  ctx.lineWidth = Math.max(2, w * 0.008)
  const ribs = 15
  for (let i = 0; i < ribs; i += 1) {
    const x = bx + bw * 0.1 + (i * bw * 0.8) / (ribs - 1)
    ctx.beginPath()
    ctx.moveTo(x, capY + capH * 0.12)
    ctx.lineTo(x, capY + capH * 0.88)
    ctx.stroke()
  }
  ctx.fillStyle = "#1a1a1a"
  roundBox(ctx, bx + bw * 0.08, capY + capH * 0.08, bw * 0.84, capH * 0.1, 2)
  const lx = bx + bw * 0.1
  const ly = bodyY + bodyH * 0.045
  const lw = bw * 0.8
  const lh = bodyH * 0.9
  drawLabel(ctx, lx, ly, lw, lh)
}

function paintMetal(ctx: CanvasRenderingContext2D, size: number) {
  const fade = ctx.createLinearGradient(0, 0, 0, size)
  fade.addColorStop(0, "#f5f7f8")
  fade.addColorStop(0.18, "#c9ced3")
  fade.addColorStop(0.5, "#eef1f3")
  fade.addColorStop(0.82, "#d5d9dd")
  fade.addColorStop(1, "#b4bac0")
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, size, size)
  for (let y = 0; y < size; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? "rgba(255,255,255,0.16)" : "rgba(40,46,52,0.05)"
    ctx.fillRect(0, y, size, 1)
  }
}

function textureOf(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

async function loadFonts() {
  const gothic = new FontFace("GrenzeGotisch", "url(/fonts/GrenzeGotisch.ttf)", { weight: "100 900", style: "normal" })
  const sans = new FontFace("BottleSans", "url(/fonts/Outfit-Medium.ttf)", { weight: "500", style: "normal" })
  const [loadedGothic, loadedSans] = await Promise.all([gothic.load(), sans.load()])
  document.fonts.add(loadedGothic)
  document.fonts.add(loadedSans)
  await Promise.all([document.fonts.load("900 180px GrenzeGotisch"), document.fonts.load("500 28px BottleSans")])
}

function paintArt(): BottleArt {
  const labelCanvas = document.createElement("canvas")
  labelCanvas.width = 640
  labelCanvas.height = 980
  const labelCtx = labelCanvas.getContext("2d")
  if (!labelCtx) throw new Error("Canvas indisponible")
  drawLabel(labelCtx, 0, 0, labelCanvas.width, labelCanvas.height)

  const cardCanvas = document.createElement("canvas")
  cardCanvas.width = 640
  cardCanvas.height = 1740
  const cardCtx = cardCanvas.getContext("2d")
  if (!cardCtx) throw new Error("Canvas indisponible")
  paintCard(cardCtx, cardCanvas.width, cardCanvas.height)

  const metalCanvas = document.createElement("canvas")
  metalCanvas.width = 256
  metalCanvas.height = 256
  const metalCtx = metalCanvas.getContext("2d")
  if (!metalCtx) throw new Error("Canvas indisponible")
  paintMetal(metalCtx, 256)

  return {
    label: textureOf(labelCanvas),
    card: textureOf(cardCanvas),
    metal: textureOf(metalCanvas),
  }
}

export function loadBottleArt() {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = loadFonts()
      .catch(() => undefined)
      .then(() => {
        const art = paintArt()
        cached = art
        return art
      })
  }
  return pending
}
