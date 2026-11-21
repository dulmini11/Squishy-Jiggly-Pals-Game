// Cute vegetable designs. Same conventions as art.ts: drawn around (0,0) at ~100 units.
import type { Design, Vec } from './art.ts'

const TAU = Math.PI * 2

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

function fillAll(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient) {
  ctx.fillStyle = fill
  ctx.fillRect(-200, -200, 400, 400)
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, len: number, w: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(w, -len * 0.5, 0, -len)
  ctx.quadraticCurveTo(-w, -len * 0.5, 0, 0)
  ctx.fill()
  ctx.restore()
}

// ---------- Mushroom ----------
function mushroomOutline(): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI
    pts.push({ x: Math.cos(a) * 112, y: -15 + Math.sin(a) * 88 })
  }
  pts.push(
    { x: 100, y: -2 }, { x: 72, y: 8 }, { x: 44, y: 10 },
    { x: 42, y: 40 }, { x: 46, y: 75 }, { x: 36, y: 98 }, { x: 0, y: 106 }, { x: -36, y: 98 }, { x: -46, y: 75 }, { x: -42, y: 40 },
    { x: -44, y: 10 }, { x: -72, y: 8 }, { x: -100, y: -2 },
  )
  return pts
}

const mushroom: Design = {
  id: 'mushroom',
  name: 'Mushroom',
  category: 'veggie',
  rim: '#c9303f',
  size: 0.9,
  juice: '#f7d9b8',
  face: { x: 0, y: 55, scale: 0.62 },
  outline: mushroomOutline,
  art: (ctx) => {
    fillAll(ctx, radial(ctx, 0, 60, 90, [[0, '#fffaf0'], [1, '#f1dcc0']]))
    // cap
    ctx.beginPath()
    ctx.ellipse(0, -15, 125, 100, 0, Math.PI, TAU)
    ctx.lineTo(125, 4)
    ctx.quadraticCurveTo(0, 22, -125, 4)
    ctx.closePath()
    ctx.fillStyle = radial(ctx, -30, -70, 170, [[0, '#ff8a8f'], [0.5, '#ff4f5e'], [1, '#d92f42']])
    ctx.fill()
    // gills band
    ctx.fillStyle = '#f3dcc2'
    ctx.beginPath()
    ctx.ellipse(0, 6, 98, 8, 0, 0, TAU)
    ctx.fill()
    // spots
    ctx.fillStyle = '#fffaf2'
    const spots: [number, number, number][] = [[-55, -50, 15], [10, -78, 13], [62, -42, 17], [-10, -30, 10], [-85, -18, 8], [88, -12, 7], [35, -82, 7]]
    for (const [x, y, r] of spots) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
    }
  },
}

// ---------- Carrot ----------
function carrotOutline(): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    pts.push({ x: Math.cos(a) * 44, y: -100 + Math.sin(a) * 22 })
  }
  for (let i = 1; i <= 16; i++) {
    const u = i / 16
    pts.push({ x: 44 * Math.pow(1 - u, 0.85) + 3 * u, y: -100 + u * 235 })
  }
  for (let i = 15; i >= 1; i--) {
    const u = i / 16
    pts.push({ x: -(44 * Math.pow(1 - u, 0.85)) + 3 * u, y: -100 + u * 235 })
  }
  return pts
}

const carrot: Design = {
  id: 'carrot',
  name: 'Carrot',
  category: 'veggie',
  rim: '#e0610c',
  size: 0.85,
  juice: '#ff9a3c',
  face: { x: 0, y: -55, scale: 0.72 },
  outline: carrotOutline,
  art: (ctx) => {
    const g = ctx.createLinearGradient(-50, 0, 50, 0)
    g.addColorStop(0, '#ff8a24')
    g.addColorStop(0.45, '#ffb15a')
    g.addColorStop(1, '#f06a10')
    fillAll(ctx, g)
    ctx.strokeStyle = 'rgba(200,80,10,0.5)'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    const ridges: [number, number, number][] = [[-30, -20, 22], [8, 5, 24], [-18, 40, 18], [6, 70, 14], [-8, 100, 9], [14, -45, 16]]
    for (const [x, y, w] of ridges) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + w / 2, y + 4, x + w, y)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    leaf(ctx, 0, -116, -0.55, 62, 15, '#46b53a')
    leaf(ctx, 0, -116, 0.5, 58, 15, '#46b53a')
    leaf(ctx, 0, -118, 0, 75, 16, '#5ccc45')
  },
}

// ---------- Tomato ----------
const tomato: Design = {
  id: 'tomato',
  name: 'Tomato',
  category: 'veggie',
  rim: '#c9221f',
  size: 0.92,
  juice: '#ff4a3d',
  face: { x: 0, y: 12, scale: 0.95 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU
      const dent = 1 - 0.06 * Math.max(0, -Math.sin(a)) ** 8
      pts.push({ x: Math.cos(a) * 108 * dent, y: Math.sin(a) * 92 * dent })
    }
    return pts
  },
  art: (ctx) => {
    fillAll(ctx, radial(ctx, -30, -30, 150, [[0, '#ff8f7a'], [0.5, '#ff4b3e'], [1, '#d81f1c']]))
    ctx.strokeStyle = 'rgba(170,20,20,0.18)'
    ctx.lineWidth = 6
    for (const x of [-50, 50]) {
      ctx.beginPath()
      ctx.moveTo(x * 0.3, -88)
      ctx.quadraticCurveTo(x * 1.4, 0, x * 0.4, 88)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    ctx.fillStyle = '#3fa83a'
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * TAU
      ctx.save()
      ctx.translate(0, -84)
      ctx.rotate(a + Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, -16, 7, 18, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#2f8a2c'
    ctx.beginPath()
    ctx.roundRect(-4, -112, 8, 26, 4)
    ctx.fill()
  },
}

// ---------- Cucumber slice ----------
const cucumber: Design = {
  id: 'cucumber',
  name: 'Cucumber',
  category: 'veggie',
  rim: '#2a6e2c',
  size: 0.88,
  juice: '#a6e07a',
  face: { x: 0, y: 4, scale: 0.9 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU
      pts.push({ x: Math.cos(a) * 100, y: Math.sin(a) * 100 })
    }
    return pts
  },
  art: (ctx) => {
    fillAll(ctx, '#2f7d32')
    ctx.fillStyle = '#7cc650'
    ctx.beginPath()
    ctx.arc(0, 0, 92, 0, TAU)
    ctx.fill()
    ctx.fillStyle = radial(ctx, 0, 0, 86, [[0, '#f4ffe6'], [0.6, '#d6f5b0'], [1, '#b3e486']])
    ctx.beginPath()
    ctx.arc(0, 0, 86, 0, TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(150,200,110,0.35)'
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * TAU
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * 32, Math.sin(a) * 32, 26, 16, a, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#fffdf0'
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * 32 + Math.cos(a + Math.PI / 2) * s * 9, Math.sin(a) * 32 + Math.sin(a + Math.PI / 2) * s * 9, 6, 3.4, a, 0, TAU)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(150,200,110,0.35)'
    }
  },
}

// ---------- Eggplant ----------
const eggplant: Design = {
  id: 'eggplant',
  name: 'Eggplant',
  category: 'veggie',
  rim: '#4a2390',
  size: 0.88,
  juice: '#b48cff',
  face: { x: 0, y: 40, scale: 0.85 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * TAU
      const down = (1 - Math.cos(t)) / 2
      const w = 88 * (0.36 + 0.64 * Math.pow(down, 0.75))
      const y = -Math.cos(t) * 122 + 8
      pts.push({ x: Math.sin(t) * w + (1 - down) * 10, y })
    }
    return pts
  },
  art: (ctx) => {
    fillAll(ctx, radial(ctx, -30, 10, 170, [[0, '#b892ff'], [0.45, '#7a46e0'], [1, '#43208f']]))
  },
  outer: (ctx) => {
    ctx.fillStyle = '#4caf3a'
    for (const r of [-0.9, -0.3, 0.3, 0.9]) {
      ctx.save()
      ctx.translate(10, -105)
      ctx.rotate(r)
      ctx.beginPath()
      ctx.ellipse(0, 14, 12, 22, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#3c8f2e'
    ctx.beginPath()
    ctx.roundRect(4, -140, 12, 36, 6)
    ctx.fill()
  },
}

// ---------- Onion ----------
const onion: Design = {
  id: 'onion',
  name: 'Onion',
  category: 'veggie',
  rim: '#8a2f86',
  size: 0.9,
  juice: '#eab6e6',
  face: { x: 0, y: 30, scale: 0.88 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * TAU
      const down = (1 - Math.cos(t)) / 2 // 0 = top tip, 1 = bottom
      const w = 100 * (0.1 + 0.9 * Math.pow(down, 0.42)) * (1 - 0.12 * Math.pow(down, 6))
      const y = down < 0.5 ? -Math.cos(t) * 118 : -Math.cos(t) * 92
      pts.push({ x: Math.sin(t) * w, y: y + 12 })
    }
    return pts
  },
  art: (ctx) => {
    fillAll(ctx, radial(ctx, -25, 10, 150, [[0, '#f6c7f0'], [0.45, '#d47ccd'], [1, '#8e358a']]))
    ctx.strokeStyle = 'rgba(255,230,250,0.45)'
    ctx.lineWidth = 3
    for (const x of [-70, -38, 0, 38, 70]) {
      ctx.beginPath()
      ctx.moveTo(x * 0.1, -100)
      ctx.quadraticCurveTo(x * 1.25, 10, x * 0.55, 100)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    // tiny sprout on top
    ctx.strokeStyle = '#5cbf45'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -100)
    ctx.quadraticCurveTo(-4, -125, -14, -138)
    ctx.moveTo(0, -102)
    ctx.quadraticCurveTo(8, -122, 16, -130)
    ctx.stroke()
    // little roots
    ctx.strokeStyle = '#d9c39a'
    ctx.lineWidth = 3
    for (const x of [-12, -4, 4, 12]) {
      ctx.beginPath()
      ctx.moveTo(x * 0.6, 102)
      ctx.quadraticCurveTo(x, 112, x * 1.5, 120)
      ctx.stroke()
    }
  },
}

// ---------- Leek ----------
const leek: Design = {
  id: 'leek',
  name: 'Leek',
  category: 'veggie',
  rim: '#3f8a2c',
  size: 0.85,
  juice: '#c8ec8f',
  face: { x: 0, y: 70, scale: 0.6 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI
      pts.push({ x: Math.cos(a) * 38, y: 105 + Math.sin(a) * 30 })
    }
    pts.push(
      { x: -38, y: 40 }, { x: -39, y: -20 }, { x: -43, y: -70 }, { x: -54, y: -125 }, { x: -50, y: -152 },
      { x: -30, y: -128 }, { x: -12, y: -100 }, { x: 0, y: -160 }, { x: 12, y: -100 },
      { x: 30, y: -130 }, { x: 52, y: -152 }, { x: 54, y: -122 }, { x: 43, y: -70 }, { x: 39, y: -20 }, { x: 38, y: 40 },
    )
    return pts
  },
  art: (ctx) => {
    const g = ctx.createLinearGradient(0, 140, 0, -160)
    g.addColorStop(0, '#fdfff4')
    g.addColorStop(0.3, '#f0fad6')
    g.addColorStop(0.5, '#b8e47c')
    g.addColorStop(0.72, '#5cb840')
    g.addColorStop(1, '#2f8226')
    fillAll(ctx, g)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2.5
    for (const x of [-20, 0, 20]) {
      ctx.beginPath()
      ctx.moveTo(x, 120)
      ctx.lineTo(x * 1.2, -110)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    ctx.strokeStyle = '#e5d6b0'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (const x of [-16, -8, 0, 8, 16]) {
      ctx.beginPath()
      ctx.moveTo(x * 0.7, 132)
      ctx.quadraticCurveTo(x, 142, x * 1.4, 152)
      ctx.stroke()
    }
  },
}

// ---------- Beetroot ----------
const beetroot: Design = {
  id: 'beetroot',
  name: 'Beetroot',
  category: 'veggie',
  rim: '#7a0d3f',
  size: 0.88,
  juice: '#d81b66',
  face: { x: 0, y: -5, scale: 0.95 },
  outline: () => {
    const pts: Vec[] = []
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * TAU
      const down = (1 - Math.cos(t)) / 2 // 0 = top, 1 = tail tip
      const w = 98 * (1 - 0.92 * Math.pow(down, 3.2))
      const y = down < 0.5 ? -Math.cos(t) * 86 : -Math.cos(t) * 140
      pts.push({ x: Math.sin(t) * w, y: y - 8 })
    }
    return pts
  },
  art: (ctx) => {
    fillAll(ctx, radial(ctx, -25, -30, 160, [[0, '#ff7fae'], [0.4, '#d42a6c'], [1, '#6e0b38']]))
    ctx.strokeStyle = 'rgba(255,190,220,0.22)'
    ctx.lineWidth = 4
    for (const r of [28, 52, 76]) {
      ctx.beginPath()
      ctx.ellipse(0, -5, r, r * 0.9, 0, 0, TAU)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    const stems: [number, number][] = [[-30, -150], [0, -165], [30, -148]]
    ctx.lineCap = 'round'
    for (const [x, y] of stems) {
      ctx.strokeStyle = '#c2185b'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(0, -88)
      ctx.quadraticCurveTo(x * 0.3, (y - 88) / 2, x, y + 20)
      ctx.stroke()
      ctx.save()
      ctx.translate(x, y + 18)
      ctx.rotate(x / 60)
      ctx.fillStyle = '#4caf3a'
      ctx.beginPath()
      ctx.ellipse(0, -10, 13, 22, 0, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = '#c2185b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 8)
      ctx.lineTo(0, -26)
      ctx.stroke()
      ctx.restore()
    }
  },
}

export const VEGGIES: Design[] = [mushroom, carrot, tomato, cucumber, eggplant, onion, leek, beetroot]
