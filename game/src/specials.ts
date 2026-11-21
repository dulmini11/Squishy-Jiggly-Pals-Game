// Special jellies that appear in levels and Rush:
//   💣 bomb   – don't cut or eat it: it explodes (−5 s, breaks your combo). Left alone it blows up by itself.
//   ⏱️ clock  – cut it for +5 seconds
//   ❄️ freeze – cut it to stop the timer for a few seconds
//   ⭐ gold   – rare treasure: bonus points and coins
import type { Design, Vec } from './art.ts'

const TAU = Math.PI * 2

function circle(r: number, n = 64): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return pts
}

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

const fill = (ctx: CanvasRenderingContext2D, f: string | CanvasGradient) => {
  ctx.fillStyle = f
  ctx.fillRect(-200, -200, 400, 400)
}

export type SpecialKind = 'bomb' | 'clock' | 'freeze' | 'gold'

const bomb: Design = {
  id: 'bomb',
  name: 'Bomb',
  category: 'special',
  special: 'bomb',
  rim: '#0f1020',
  size: 0.78,
  juice: '#ff8a3d',
  face: { x: 0, y: 12, scale: 0.85 },
  outline: () => circle(92),
  art: (ctx) => {
    fill(ctx, radial(ctx, -30, -35, 150, [[0, '#6a7196'], [0.45, '#2c3150'], [1, '#12142a']]))
    // warning stripe
    ctx.strokeStyle = 'rgba(255,200,60,0.75)'
    ctx.lineWidth = 9
    ctx.setLineDash([16, 12])
    ctx.beginPath()
    ctx.arc(0, 0, 74, 0.2, Math.PI - 0.2)
    ctx.stroke()
    ctx.setLineDash([])
  },
  outer: (ctx) => {
    // cap + curly fuse (the spark is animated in the game)
    ctx.fillStyle = '#8a92b8'
    ctx.beginPath()
    ctx.roundRect(-20, -112, 40, 26, 6)
    ctx.fill()
    ctx.strokeStyle = '#c98a4b'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -110)
    ctx.bezierCurveTo(10, -140, 40, -128, 34, -152)
    ctx.stroke()
  },
}

const clock: Design = {
  id: 'clock',
  name: 'Time Clock',
  category: 'special',
  special: 'clock',
  rim: '#2e6fc2',
  size: 0.78,
  juice: '#7ab8ff',
  face: { x: 0, y: 40, scale: 0.6 },
  outline: () => circle(92),
  art: (ctx) => {
    fill(ctx, radial(ctx, -25, -30, 140, [[0, '#cfe9ff'], [0.55, '#6fb0f5'], [1, '#2e6fc2']]))
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, -4, 64, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#7ab8ff'
    ctx.lineWidth = 5
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      const r0 = i % 3 === 0 ? 46 : 52
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r0, -4 + Math.sin(a) * r0)
      ctx.lineTo(Math.cos(a) * 58, -4 + Math.sin(a) * 58)
      ctx.stroke()
    }
    ctx.strokeStyle = '#2e6fc2'
    ctx.lineCap = 'round'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(0, -4)
    ctx.lineTo(0, -40)
    ctx.moveTo(0, -4)
    ctx.lineTo(26, 8)
    ctx.stroke()
    ctx.fillStyle = '#ff5f88'
    ctx.beginPath()
    ctx.arc(0, -4, 7, 0, TAU)
    ctx.fill()
  },
  outer: (ctx) => {
    ctx.fillStyle = '#2e6fc2'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(s * 52, -78, 18, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = '#ff5f88'
    ctx.beginPath()
    ctx.roundRect(-10, -112, 20, 20, 5)
    ctx.fill()
  },
}

function snowOutline(): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * TAU
    const r = 88 * (0.86 + 0.14 * Math.cos(6 * t))
    pts.push({ x: Math.cos(t - Math.PI / 2) * r, y: Math.sin(t - Math.PI / 2) * r })
  }
  return pts
}

const freeze: Design = {
  id: 'freeze',
  name: 'Freeze',
  category: 'special',
  special: 'freeze',
  rim: '#3a9fd6',
  size: 0.78,
  juice: '#bfe9ff',
  face: { x: 0, y: 8, scale: 0.75 },
  outline: snowOutline,
  art: (ctx) => {
    fill(ctx, radial(ctx, -20, -25, 130, [[0, '#ffffff'], [0.5, '#c8efff'], [1, '#62b8e8']]))
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU - Math.PI / 2
      const ex = Math.cos(a) * 70
      const ey = Math.sin(a) * 70
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(ex, ey)
      // little branches
      const bx = Math.cos(a) * 44
      const by = Math.sin(a) * 44
      for (const s of [-1, 1]) {
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(a + s * 0.8) * 18, by + Math.sin(a + s * 0.8) * 18)
      }
      ctx.stroke()
    }
  },
}

function starOutline(): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i < 100; i++) {
    const t = (i / 100) * TAU
    // a soft, rounded 5-point star
    const r = 96 * (0.72 + 0.28 * Math.cos(5 * t))
    pts.push({ x: Math.cos(t - Math.PI / 2) * r, y: Math.sin(t - Math.PI / 2) * r + 6 })
  }
  return pts
}

const gold: Design = {
  id: 'gold',
  name: 'Golden Star',
  category: 'special',
  special: 'gold',
  rim: '#c98a00',
  size: 0.74,
  juice: '#ffd35c',
  face: { x: 0, y: 12, scale: 0.78 },
  outline: starOutline,
  art: (ctx) => {
    fill(ctx, radial(ctx, -20, -30, 140, [[0, '#fff8d0'], [0.45, '#ffd35c'], [1, '#e09a00']]))
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (const [x, y, r] of [
      [-30, -30, 7],
      [34, -12, 5],
      [-8, 36, 4],
    ]) {
      ctx.beginPath()
      ctx.moveTo(x, y - r * 2)
      ctx.lineTo(x + r * 0.5, y - r * 0.5)
      ctx.lineTo(x + r * 2, y)
      ctx.lineTo(x + r * 0.5, y + r * 0.5)
      ctx.lineTo(x, y + r * 2)
      ctx.lineTo(x - r * 0.5, y + r * 0.5)
      ctx.lineTo(x - r * 2, y)
      ctx.lineTo(x - r * 0.5, y - r * 0.5)
      ctx.closePath()
      ctx.fill()
    }
  },
}

export const SPECIALS: Design[] = [bomb, clock, freeze, gold]
