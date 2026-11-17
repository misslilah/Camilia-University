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
  walnut: Texture
}

function walnutTexture() {
  const size = 512
  const texture = largeTexture(size, size, (ctx) => {
    ctx.fillStyle = "#5a3520"
    ctx.fillRect(0, 0, size, size)
    // Every wobble uses whole periods over the height so the texture tiles vertically.
    const wobble = (y: number, phase: number, amp: number) =>
      Math.sin((y / size) * Math.PI * 2 + phase) * amp + Math.sin((y / size) * Math.PI * 6 + phase * 2) * amp * 0.35
    for (let i = 0; i < 26; i += 1) {
      const x = Math.random() * size
      const width = 6 + Math.random() * 34
      const light = i % 2 === 0
      ctx.fillStyle = light ? `rgba(122, 78, 46, ${0.05 + Math.random() * 0.07})` : `rgba(22, 11, 5, ${0.06 + Math.random() * 0.08})`
      const phase = Math.random() * Math.PI * 2
      for (const shift of [-size, 0, size]) {
        ctx.beginPath()
        for (let y = 0; y <= size; y += 8) ctx.lineTo(x + shift + wobble(y, phase, 6), y)
        for (let y = size; y >= 0; y -= 8) ctx.lineTo(x + shift + width + wobble(y, phase + 0.4, 6), y)
        ctx.fill()
      }
    }
    for (let i = 0; i < 260; i += 1) {
      const x = Math.random() * size
      const phase = Math.random() * Math.PI * 2
      const amp = 1.5 + Math.random() * 4
      const dark = Math.random() > 0.3
      ctx.strokeStyle = dark ? `rgba(18, 9, 4, ${0.12 + Math.random() * 0.26})` : `rgba(140, 92, 56, ${0.05 + Math.random() * 0.08})`
      ctx.lineWidth = 0.5 + Math.random() * 1.1
      for (const shift of [-size, 0, size]) {
        ctx.beginPath()
        for (let y = 0; y <= size; y += 8) ctx.lineTo(x + shift + wobble(y, phase, amp), y)
        ctx.stroke()
      }
    }
    for (let i = 0; i < 3200; i += 1) {
      ctx.fillStyle = `rgba(14, 7, 3, ${0.12 + Math.random() * 0.2})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 2 + Math.random() * 4)
    }
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
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
    walnut: walnutTexture(),
  }
  return cache
}

export type RoomTextures = {
  wall: Texture
  floor: Texture
  screen: Texture
  poster: Texture
  duvet: Texture
  rug: Texture
  sky: Texture
}

let roomCache: RoomTextures | null = null

function largeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  draw(ctx)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

// The monitor shows the same desktop the DOM overlay draws up close, so the
// hand-over when the camera arrives is seamless.
function drawDesktop(ctx: CanvasRenderingContext2D) {
  const w = 1024
  const h = 578
  const bar = 40
  const sky = ctx.createRadialGradient(w / 2, h * 0.34, 10, w / 2, h * 0.38, w * 0.62)
  sky.addColorStop(0, "#1f3a70")
  sky.addColorStop(0.42, "#11234a")
  sky.addColorStop(1, "#08112a")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = "rgba(255,255,255,0.045)"
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()
  }

  const cx = w / 2
  const cy = (h - bar) * 0.34
  const shield = (scale: number, ox: number, oy: number) => {
    ctx.beginPath()
    ctx.moveTo(ox, oy - 33 * scale)
    ctx.lineTo(ox + 27 * scale, oy - 24 * scale)
    ctx.lineTo(ox + 27 * scale, oy - 2 * scale)
    ctx.bezierCurveTo(ox + 27 * scale, oy + 15 * scale, ox + 15 * scale, oy + 27 * scale, ox, oy + 33 * scale)
    ctx.bezierCurveTo(ox - 15 * scale, oy + 27 * scale, ox - 27 * scale, oy + 15 * scale, ox - 27 * scale, oy - 2 * scale)
    ctx.lineTo(ox - 27 * scale, oy - 24 * scale)
    ctx.closePath()
  }
  shield(1.05, cx, cy - 46)
  ctx.fillStyle = "rgba(15,29,61,0.65)"
  ctx.fill()
  ctx.strokeStyle = "#c6a15a"
  ctx.lineWidth = 2.4
  ctx.stroke()
  ctx.fillStyle = "#e9d3a1"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = "600 30px Georgia, serif"
  ctx.fillText("C", cx, cy - 44)
  ctx.fillStyle = "#f3ead7"
  ctx.font = "34px Georgia, serif"
  ctx.fillText("Camilia", cx, cy + 22)
  ctx.fillStyle = "#c6a15a"
  ctx.font = "9px sans-serif"
  ctx.fillText("U N I V E R S I T Y", cx, cy + 48)

  const tints = [
    ["#e8b04a", "#c98a24"],
    ["#7f5bd6", "#5435a8"],
    ["#4c8df0", "#2a5fc4"],
    ["#4ac17a", "#2b8d55"],
    ["#8b93a3", "#5d6575"],
  ]
  tints.forEach(([a, b], i) => {
    const x = 28
    const y = 20 + i * 84
    const tile = ctx.createLinearGradient(x, y, x + 41, y + 41)
    tile.addColorStop(0, a)
    tile.addColorStop(1, b)
    ctx.fillStyle = tile
    ctx.beginPath()
    ctx.roundRect(x, y, 41, 41, 12)
    ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.fillRect(x + 4, y + 50, 33, 5)
  })

  ctx.fillStyle = "rgba(10,20,40,0.88)"
  ctx.fillRect(0, h - bar, w, bar)
  ctx.fillStyle = "rgba(255,255,255,0.1)"
  ctx.fillRect(0, h - bar, w, 1)
  shield(0.36, 22, h - bar / 2)
  ctx.strokeStyle = "#c6a15a"
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.fillStyle = "rgba(255,255,255,0.7)"
  ctx.fillRect(w - 118, h - bar / 2 - 5, 12, 10)
  ctx.fillRect(w - 98, h - bar / 2 - 5, 12, 10)
  ctx.fillRect(w - 76, h - bar / 2 - 6, 34, 6)
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.fillRect(w - 76, h - bar / 2 + 3, 30, 4)
}

export function getRoomTextures(): RoomTextures {
  if (roomCache) return roomCache
  roomCache = {
    wall: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#4d7db4"
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 1400; i += 1) {
        const light = Math.random() > 0.5
        ctx.fillStyle = light ? "rgba(255,255,255,0.035)" : "rgba(10,30,70,0.05)"
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
      }
    }, 2, 1),
    floor: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#c59a6a"
      ctx.fillRect(0, 0, size, size)
      const plank = 32
      for (let x = 0; x < size; x += plank) {
        const tone = (x / plank) % 3
        ctx.fillStyle = tone === 0 ? "rgba(120,72,34,0.12)" : tone === 1 ? "rgba(255,230,190,0.08)" : "rgba(90,55,25,0.06)"
        ctx.fillRect(x, 0, plank - 1, size)
        ctx.fillStyle = "rgba(70,40,20,0.35)"
        ctx.fillRect(x + plank - 1, 0, 1, size)
        const seam = ((x * 37) % size) | 0
        ctx.fillRect(x, seam, plank, 1)
        for (let y = 0; y < size; y += 4) {
          ctx.strokeStyle = `rgba(110,66,30,${0.04 + ((x + y) % 7) * 0.012})`
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + plank, y + Math.sin(y * 0.15 + x) * 1.4)
          ctx.stroke()
        }
      }
    }, 4, 4),
    screen: largeTexture(1024, 578, drawDesktop),
    poster: largeTexture(256, 360, (ctx) => {
      ctx.fillStyle = "#0e1630"
      ctx.fillRect(0, 0, 256, 360)
      for (let i = 0; i < 120; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`
        ctx.fillRect(Math.random() * 256, Math.random() * 260, 1.6, 1.6)
      }
      const planet = ctx.createRadialGradient(110, 130, 10, 128, 150, 80)
      planet.addColorStop(0, "#ffb36b")
      planet.addColorStop(1, "#b2452f")
      ctx.fillStyle = planet
      ctx.beginPath()
      ctx.arc(128, 150, 66, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(255,226,180,0.85)"
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.ellipse(128, 152, 112, 24, -0.25, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = "#f4efe4"
      ctx.font = "bold 40px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("EXPLORE", 128, 300)
      ctx.font = "15px sans-serif"
      ctx.fillStyle = "rgba(244,239,228,0.7)"
      ctx.fillText("MISSION 07 · SATURN", 128, 330)
    }),
    duvet: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#24406b"
      ctx.fillRect(0, 0, size, size)
      for (let x = 0; x < size; x += 64) {
        ctx.fillStyle = "rgba(240,240,235,0.85)"
        ctx.fillRect(x + 40, 0, 7, size)
        ctx.fillStyle = "rgba(230,120,60,0.7)"
        ctx.fillRect(x + 52, 0, 3, size)
      }
    }, 2, 1),
    rug: canvasTexture((ctx, size) => {
      ctx.fillStyle = "#d9d2c2"
      ctx.fillRect(0, 0, size, size)
      ctx.strokeStyle = "#2f4f7c"
      ctx.lineWidth = 14
      ctx.strokeRect(18, 18, size - 36, size - 36)
      ctx.strokeStyle = "#c46a3c"
      ctx.lineWidth = 5
      ctx.strokeRect(40, 40, size - 80, size - 80)
      for (let i = 0; i < 2400; i += 1) {
        ctx.fillStyle = `rgba(80,70,60,${Math.random() * 0.06})`
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
      }
    }),
    sky: largeTexture(256, 256, (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, 256)
      sky.addColorStop(0, "#9cc9f2")
      sky.addColorStop(0.7, "#dcecf8")
      sky.addColorStop(1, "#f3e8d0")
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, 256, 256)
      ctx.fillStyle = "#6f9a6a"
      ctx.beginPath()
      ctx.moveTo(0, 210)
      ctx.quadraticCurveTo(80, 180, 150, 205)
      ctx.quadraticCurveTo(210, 222, 256, 196)
      ctx.lineTo(256, 256)
      ctx.lineTo(0, 256)
      ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ;[[60, 60, 26], [92, 54, 20], [180, 90, 22], [205, 84, 16]].forEach(([x, y, r]) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })
    }),
  }
  return roomCache
}
