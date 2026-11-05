// Fruit / flower designs for Squishy Jiggly Pals.
// Every design is drawn around (0,0) at a base radius of ~100 units.
import { VEGGIES } from './veggies.ts'

export type Vec = { x: number; y: number }
export type Category = 'fruit' | 'bloom' | 'citrus' | 'melon' | 'berry' | 'veggie'

export type Design = {
  id: string
  name: string
  category: Category
  /** Outline in art space, will be resampled to evenly spaced points. */
  outline: () => Vec[]
  /** Main fill art, drawn clipped to the (deformed) outline. */
  art: (ctx: CanvasRenderingContext2D) => void
  /** Optional decoration drawn outside the clip (stems, leaves). Hidden once sliced. */
  outer?: (ctx: CanvasRenderingContext2D) => void
  /** Rim color used for the outline stroke. */
  rim: string
  /** Base size multiplier. */
  size: number
  /** Splash color for juice effects. */
  juice: string
  /** Where the cute face sits (art space) and how big it is. Defaults to the shape's centre. */
  face?: { x: number; y: number; scale: number }
}

const TAU = Math.PI * 2

function circle(r: number, n = 64): Vec[] {
  const pts: Vec[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return pts
}

function disc(ctx: CanvasRenderingContext2D, r: number, fill: string | CanvasGradient) {
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.fillStyle = fill
  ctx.fill()
}

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

// Deterministic pseudo-random so art doesn't flicker frame-to-frame.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ---------- Kiwi ----------
const kiwi: Design = {
  id: 'kiwi',
  juice: '#8ccf3c',
  name: 'Kiwi',
  category: 'fruit',
  rim: '#3f7f17',
  size: 1.05,
  outline: () => circle(100),
  art: (ctx) => {
    disc(ctx, 130, '#4d8d1c')
    disc(ctx, 96, radial(ctx, 0, 0, 96, [
      [0, '#fbffe6'],
      [0.18, '#e9f7a8'],
      [0.45, '#9ad646'],
      [0.85, '#5fb42a'],
      [1, '#4f9d20'],
    ]))
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16)
      ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80)
      ctx.stroke()
    }
    const rand = rng(7)
    ctx.fillStyle = '#1d1a10'
    const rings: [number, number][] = [[42, 22], [54, 18]]
    for (const [r, n] of rings) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r * 0.03
        const rr = r + (rand() - 0.5) * 6
        ctx.save()
        ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr)
        ctx.rotate(a)
        ctx.beginPath()
        ctx.ellipse(0, 0, 6.5, 2.8, 0, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    }
  },
}

// ---------- Citrus ----------
function citrus(id: string, name: string, rind: [string, string], pith: string, flesh: [string, string], rim: string): Design {
  return {
    id,
    juice: flesh[1],
    name,
    category: 'citrus',
    rim,
    size: 1,
    outline: () => circle(100),
    art: (ctx) => {
      disc(ctx, 130, rind[1])
      disc(ctx, 100, radial(ctx, 0, 0, 100, [[0.8, rind[0]], [1, rind[1]]]))
      disc(ctx, 90, pith)
      const segs = 10
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * TAU + 0.05
        const a1 = ((i + 1) / segs) * TAU - 0.05
        ctx.beginPath()
        ctx.moveTo(Math.cos((a0 + a1) / 2) * 12, Math.sin((a0 + a1) / 2) * 12)
        ctx.arc(0, 0, 80, a0, a1)
        ctx.closePath()
        ctx.fillStyle = radial(ctx, 0, 0, 82, [[0, flesh[0]], [1, flesh[1]]])
        ctx.fill()
        // juice sacs
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 1.4
        for (let k = 1; k < 4; k++) {
          const a = a0 + ((a1 - a0) * k) / 4
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30)
          ctx.lineTo(Math.cos(a) * 70, Math.sin(a) * 70)
          ctx.stroke()
        }
      }
      disc(ctx, 10, pith)
    },
  }
}

const lemon = citrus('lemon', 'Lemon', ['#ffd83a', '#f2b705'], '#fff7cf', ['#fff3a0', '#ffd21f'], '#d99c00')
const orange = citrus('orange', 'Orange', ['#ffa23a', '#f07d0e'], '#fff0dc', ['#ffd28a', '#ff8f1f'], '#d26a05')
const lime = citrus('lime', 'Lime', ['#7fd04a', '#4c9f22'], '#f3ffe0', ['#e6ffb0', '#9fdc4c'], '#3f8a1a')

// ---------- Melons ----------
const WEDGE_R = 225
const WEDGE_APEX: Vec = { x: 0, y: -125 }
const wedge: Design = {
  id: 'wedge',
  juice: '#ff4f66',
  name: 'Watermelon',
  category: 'melon',
  rim: '#2d7a2b',
  size: 0.85,
  outline: () => {
    const pts: Vec[] = [{ ...WEDGE_APEX }]
    const a0 = (58 * Math.PI) / 180
    const a1 = (122 * Math.PI) / 180
    for (let i = 0; i <= 24; i++) {
      const a = a0 + ((a1 - a0) * i) / 24
      pts.push({ x: WEDGE_APEX.x + Math.cos(a) * WEDGE_R, y: WEDGE_APEX.y + Math.sin(a) * WEDGE_R })
    }
    return pts
  },
  art: (ctx) => {
    ctx.save()
    ctx.translate(WEDGE_APEX.x, WEDGE_APEX.y)
    disc(ctx, 260, '#2c7a2c')
    disc(ctx, 214, '#8fd162')
    disc(ctx, 205, '#effcd9')
    disc(ctx, 196, radial(ctx, 0, 0, 196, [[0, '#ff8592'], [0.6, '#ff5468'], [1, '#ff3d57']]))
    const rand = rng(3)
    ctx.fillStyle = '#231815'
    for (let i = 0; i < 9; i++) {
      const a = ((68 + rand() * 44) * Math.PI) / 180
      const r = 80 + rand() * 95
      ctx.save()
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r)
      ctx.rotate(a + Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, 3.6, 7, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
}

const melonRound: Design = {
  id: 'melonRound',
  juice: '#ff4f66',
  name: 'Melon Slice',
  category: 'melon',
  rim: '#2d7a2b',
  size: 1.05,
  outline: () => circle(100),
  art: (ctx) => {
    disc(ctx, 130, '#2c7a2c')
    disc(ctx, 93, '#8fd162')
    disc(ctx, 87, '#effcd9')
    disc(ctx, 81, radial(ctx, 0, 0, 81, [[0, '#ff8f9b'], [0.7, '#ff5468'], [1, '#ff4560']]))
    ctx.fillStyle = '#231815'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      ctx.save()
      ctx.translate(Math.cos(a) * 50, Math.sin(a) * 50)
      ctx.rotate(a + Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, 3.4, 6.5, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  },
}

// ---------- Berries ----------
function strawberryOutline(): Vec[] {
  const pts: Vec[] = []
  const n = 64
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU
    const down = (1 - Math.cos(t)) / 2 // 0 at top, 1 at bottom
    const w = 98 * (1.02 - 0.62 * Math.pow(down, 1.6))
    let y = -Math.cos(t) * 112
    if (y < 0) y *= 0.78
    pts.push({ x: Math.sin(t) * w, y: y + 10 })
  }
  return pts
}

const strawberry: Design = {
  id: 'strawberry',
  juice: '#ff3b52',
  name: 'Strawberry',
  category: 'berry',
  rim: '#c81e36',
  size: 0.95,
  outline: strawberryOutline,
  art: (ctx) => {
    ctx.fillStyle = '#ff3b52'
    ctx.fillRect(-150, -150, 300, 300)
    ctx.fillStyle = radial(ctx, 0, -5, 95, [[0, '#fff4f4'], [0.35, '#ffc2c8'], [0.75, '#ff6b7c'], [1, 'rgba(255,59,82,0)']])
    ctx.fillRect(-150, -150, 300, 300)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 8, -5 + Math.sin(a) * 8)
      ctx.lineTo(Math.cos(a) * 62, -5 + Math.sin(a) * 70)
      ctx.stroke()
    }
    // seeds just inside the edge
    const outline = strawberryOutline()
    ctx.fillStyle = '#ffe27a'
    for (let i = 0; i < outline.length; i += 2) {
      const p = outline[i]
      ctx.beginPath()
      ctx.ellipse(p.x * 0.86, (p.y - 10) * 0.86 + 10, 2.4, 3.6, Math.atan2(p.y, p.x) + Math.PI / 2, 0, TAU)
      ctx.fill()
    }
  },
  outer: (ctx) => {
    ctx.fillStyle = '#3fae3a'
    for (let i = -2; i <= 2; i++) {
      ctx.save()
      ctx.translate(0, -78)
      ctx.rotate(i * 0.42)
      ctx.beginPath()
      ctx.ellipse(0, -14, 9, 22, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#2f8a2c'
    ctx.fillRect(-4, -118, 8, 26)
  },
}

const blueberry: Design = {
  id: 'blueberry',
  juice: '#6a74e6',
  name: 'Blueberry',
  category: 'berry',
  rim: '#23266e',
  size: 0.72,
  outline: () => circle(100),
  art: (ctx) => {
    disc(ctx, 130, '#262a7a')
    disc(ctx, 100, radial(ctx, -25, -30, 120, [[0, '#9aa6ff'], [0.45, '#5560d6'], [1, '#262a7a']]))
    disc(ctx, 100, 'rgba(220,230,255,0.12)')
    ctx.save()
    ctx.translate(8, 6)
    ctx.fillStyle = '#1b1d55'
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2
      const r = i % 2 === 0 ? 26 : 11
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    disc(ctx, 8, '#3a3f9a')
    ctx.restore()
  },
}

// ---------- Blooms ----------
function budOutline(): Vec[] {
  const pts: Vec[] = []
  const n = 72
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU
    const down = (1 - Math.cos(t)) / 2 // 0 top (tip), 1 bottom
    const w = 82 * (0.18 + 0.82 * Math.pow(down, 0.55))
    let y = -Math.cos(t) * 118
    // petal notches near the tip
    if (down < 0.45) y -= Math.abs(Math.sin(t * 3)) * 10 * (0.45 - down) * 2.2
    pts.push({ x: Math.sin(t) * w, y })
  }
  return pts
}

const tulip: Design = {
  id: 'tulip',
  juice: '#ff8a62',
  name: 'Tulip Bud',
  category: 'bloom',
  rim: '#e0563a',
  size: 0.9,
  outline: budOutline,
  art: (ctx) => {
    ctx.fillStyle = radial(ctx, -20, 20, 150, [[0, '#ffc09a'], [0.5, '#ff8a62'], [1, '#f2553a']])
    ctx.fillRect(-150, -150, 300, 300)
    ctx.strokeStyle = 'rgba(200,60,40,0.35)'
    ctx.lineWidth = 3
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 105)
      ctx.quadraticCurveTo(s * 50, 10, s * 18, -110)
      ctx.stroke()
    }
  },
  outer: (ctx) => {
    ctx.strokeStyle = '#4caf3a'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 112)
    ctx.quadraticCurveTo(-6, 140, -18, 162)
    ctx.stroke()
    ctx.fillStyle = '#5cc046'
    ctx.beginPath()
    ctx.ellipse(-4, 124, 22, 9, -0.5, 0, TAU)
    ctx.fill()
  },
}

function flowerOutline(): Vec[] {
  const pts: Vec[] = []
  const n = 90
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU
    const r = 100 * (0.8 + 0.2 * Math.cos(5 * t))
    pts.push({ x: Math.cos(t - Math.PI / 2) * r, y: Math.sin(t - Math.PI / 2) * r })
  }
  return pts
}

const blossom: Design = {
  id: 'blossom',
  juice: '#ff8fbf',
  name: 'Blossom',
  category: 'bloom',
  rim: '#e0508a',
  size: 0.95,
  outline: flowerOutline,
  art: (ctx) => {
    disc(ctx, 140, radial(ctx, 0, 0, 105, [[0, '#ffe6f0'], [0.45, '#ffb0cf'], [1, '#ff5f9c']]))
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 2.2
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30)
      ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80)
      ctx.stroke()
    }
    disc(ctx, 28, radial(ctx, -6, -6, 30, [[0, '#fff3a6'], [1, '#ffc21a']]))
    ctx.fillStyle = '#e89b00'
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU
      ctx.beginPath()
      ctx.arc(Math.cos(a) * 15, Math.sin(a) * 15, 2.6, 0, TAU)
      ctx.fill()
    }
  },
}

export const FRUITS: Design[] = [kiwi, lemon, orange, lime, wedge, melonRound, strawberry, blueberry, tulip, blossom]
export const DESIGNS: Design[] = [...FRUITS, ...VEGGIES]
export const designById = (id: string) => DESIGNS.find((d) => d.id === id)!

export const CATEGORY_COLORS: Record<Category, string> = {
  fruit: '#4caf3a',
  bloom: '#e0508a',
  citrus: '#f2b705',
  melon: '#8fd162',
  berry: '#e0182f',
  veggie: '#ff8a3d',
}

export function designsFor(cat: Category): Design[] {
  if (cat === 'fruit') return FRUITS
  return DESIGNS.filter((d) => d.category === cat)
}

/** Resample a closed polygon to n points evenly spaced along its perimeter. */
export function resample(poly: Vec[], n: number): Vec[] {
  const lens: number[] = []
  let total = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const l = Math.hypot(b.x - a.x, b.y - a.y)
    lens.push(l)
    total += l
  }
  const out: Vec[] = []
  let seg = 0
  let acc = 0
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total
    while (acc + lens[seg] < target && seg < poly.length - 1) {
      acc += lens[seg]
      seg++
    }
    const a = poly[seg]
    const b = poly[(seg + 1) % poly.length]
    const t = lens[seg] > 0 ? (target - acc) / lens[seg] : 0
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}
