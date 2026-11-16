import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three"

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeatX = 1, repeatY = 1) {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas indisponible")
  draw(ctx, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export type HallTextures = {
  plaster: Texture
  plasterDark: Texture
  wood: Texture
  woodFloor: Texture
  board: Texture
  stone: Texture
}

let cache: HallTextures | null = null

export function getTextures(): HallTextures {
  if (cache) return cache
  cache = {
    plaster: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#e5d2bb"
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 1800; i += 1) {
        const shade = 150 + Math.random() * 50
        ctx.fillStyle = `rgba(${shade}, ${shade - 18}, ${shade - 36}, 0.13)`
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
      }
    }, 2, 2),
    plasterDark: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#c3ad93"
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 1200; i += 1) {
        ctx.fillStyle = `rgba(80, 58, 40, ${0.04 + Math.random() * 0.08})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
      }
    }, 1.5, 1),
    wood: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#7a5130"
      ctx.fillRect(0, 0, size, size)
      for (let y = 0; y < size; y += 1) {
        const wave = Math.sin(y * 0.08) * 8
        ctx.strokeStyle = `rgba(${70 + (y % 7) * 4}, ${36 + (y % 5) * 2}, 18, 0.18)`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(size * 0.3, y + wave, size * 0.7, y - wave, size, y + wave * 0.3)
        ctx.stroke()
      }
    }),
    woodFloor: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#8b5d36"
      ctx.fillRect(0, 0, size, size)
      const plank = 32
      for (let x = 0; x < size; x += plank) {
        ctx.fillStyle = x % (plank * 2) === 0 ? "rgba(70, 40, 18, 0.18)" : "rgba(255, 220, 180, 0.05)"
        ctx.fillRect(x, 0, plank - 1, size)
        for (let y = 0; y < size; y += 3) {
          ctx.strokeStyle = `rgba(50, 28, 12, ${0.05 + ((x + y) % 5) * 0.02})`
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + plank, y + Math.sin(y * 0.2) * 1.5)
          ctx.stroke()
        }
      }
    }, 5, 8),
    board: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#1b332c"
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 2200; i += 1) {
        ctx.fillStyle = `rgba(210, 220, 200, ${Math.random() * 0.035})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5)
      }
      ctx.strokeStyle = "rgba(232, 224, 206, 0.045)"
      ctx.lineWidth = 2
      for (let i = 0; i < 8; i += 1) {
        const y = 30 + i * 28
        ctx.beginPath()
        ctx.moveTo(20, y)
        ctx.lineTo(size - 30, y + Math.sin(i) * 4)
        ctx.stroke()
      }
    }),
    stone: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#b7aa9c"
      ctx.fillRect(0, 0, size, size)
      const tile = 64
      for (let y = 0; y < size; y += tile) {
        for (let x = 0; x < size; x += tile) {
          const alt = (x / tile + y / tile) % 2 === 0
          ctx.fillStyle = alt ? "rgba(255,255,255,0.06)" : "rgba(60, 44, 32, 0.08)"
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2)
        }
      }
    }, 3, 4),
  }
  return cache
}
