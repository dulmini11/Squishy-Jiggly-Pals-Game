import { CATEGORY_COLORS, designById, designsFor, resample, type Category, type Design, type Vec } from './art.ts'
import { sfx } from './sound.ts'
import { fx } from './fx.ts'
import { createQuest, type RoundResult } from './quest.ts'
import { BASKETS, TRACKS, TWIST_INFO, type Place, type Twist, loadBasket, loadStars, saveBasket, saveStars, type Basket } from './levels.ts'
import { haptics } from './haptics.ts'
import { camera } from './camera.ts'
import { BACKGROUNDS, JELLY_EMOJI, bgById, hatById, knifeById } from './catalog.ts'
import { BADGES } from './badges.ts'
import { mmss, renderBadges, renderMap, renderShop, renderStatus, toast } from './menus.ts'
import {
  MAX_HEARTS,
  UNLOCK_AT,
  addCoins,
  addXp,
  best,
  bump,
  earnBadge,
  equip,
  isUnlockedJelly,
  loseHeart,
  nextHeartIn,
  onProgress,
  recordSlice,
  refillHearts,
  refreshHearts,
  save,
  spendCoins,
  unlockJelly,
} from './progress.ts'
import './jelly.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Body = {
  design: Design
  n: number
  rx: number[] // rest shape (art space)
  ry: number[]
  rcx: number // rest centroid
  rcy: number
  px: number[]
  py: number[]
  vx: number[]
  vy: number[]
  ox: number[] // previous positions
  oy: number[]
  s: number // current scale (animated)
  sVel: number
  k: number // user scale multiplier
  whole: boolean
  cx: number
  cy: number
  m: [number, number, number, number] // fitted deformation for drawing (m11, m12, m21, m22)
  radius: number
  hits: Hit[]
  blink: number // frames until next blink
  blinkT: number // frames left in current blink
  surprise: number // frames of surprised face
}

type Hit = { edge: number; t: number }
type Mode = 'play' | 'knife' | 'scale'

const QUALITY_POINTS = 44
const STIFF = { hard: 0.24, soft: 0.06 }
const DAMP = { hard: 0.86, soft: 0.955 }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const canvas = document.getElementById('stage') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
let W = 0
let H = 0
let DPR = 1
let U = 1 // global size unit

let bodies: Body[] = []
let mode: Mode = 'play'
let soft = true
let showTags = false
let showFaces = true
let gravity = false
/** The current level's special rule (none in Free Play / Rush). */
let twist: Twist = 'none'
let lastTap: { body: Body; t: number } | null = null
const isDark = () => document.body.dataset.theme === 'night'
const stats = { wobbles: 0, slices: 0, eaten: 0 }

const pointer = { x: 0, y: 0, down: false, id: -1 }
let grab: { body: Body; w: number[]; ox: number[]; oy: number[] } | null = null
let trail: { x: number; y: number; t: number }[] = []

// ---------------------------------------------------------------------------
// Body creation
// ---------------------------------------------------------------------------
function baseScale(d: Design) {
  return d.size * U
}

function makeBody(design: Design, rest: Vec[], x: number, y: number, angle: number, startScale: number, k = 1): Body {
  const n = rest.length
  const rx = rest.map((p) => p.x)
  const ry = rest.map((p) => p.y)
  const rcx = rx.reduce((a, b) => a + b, 0) / n
  const rcy = ry.reduce((a, b) => a + b, 0) / n
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const px: number[] = []
  const py: number[] = []
  for (let i = 0; i < n; i++) {
    const qx = (rx[i] - rcx) * startScale
    const qy = (ry[i] - rcy) * startScale
    px.push(x + c * qx - s * qy)
    py.push(y + s * qx + c * qy)
  }
  return {
    design,
    n,
    rx,
    ry,
    rcx,
    rcy,
    px,
    py,
    vx: new Array(n).fill(0),
    vy: new Array(n).fill(0),
    ox: px.slice(),
    oy: py.slice(),
    s: startScale,
    sVel: 0,
    k,
    whole: true,
    cx: x,
    cy: y,
    m: [c, -s, s, c],
    radius: 100 * startScale,
    hits: [],
    blink: 60 + Math.random() * 240,
    blinkT: 0,
    surprise: 0,
  }
}

function restRadius(d: Design) {
  const pts = d.outline()
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p.x
    cy += p.y
  }
  cx /= pts.length
  cy /= pts.length
  let r = 0
  for (const p of pts) r = Math.max(r, Math.hypot(p.x - cx, p.y - cy))
  return r
}

function findSpot(r: number): Vec {
  const margin = r + 10
  let best: Vec = { x: W / 2, y: H / 2 }
  let bestScore = -Infinity
  for (let tries = 0; tries < 40; tries++) {
    const x = margin + Math.random() * Math.max(1, W - margin * 2)
    const y = margin + 70 + Math.random() * Math.max(1, H - margin * 2 - 150)
    let minGap = Infinity
    for (const b of bodies) minGap = Math.min(minGap, Math.hypot(b.cx - x, b.cy - y) - b.radius - r)
    if (minGap > 0) return { x, y }
    if (minGap > bestScore) {
      bestScore = minGap
      best = { x, y }
    }
  }
  return best
}

function spawn(design: Design, at?: Vec) {
  const r = restRadius(design) * baseScale(design)
  const p = at ?? findSpot(r)
  const rest = resample(design.outline(), QUALITY_POINTS)
  const b = makeBody(design, rest, p.x, p.y, (Math.random() - 0.5) * 1.4, 0.02)
  bodies.push(b)
  if (bodies.length > 60) bodies.shift()
  sfx.pop()
  updateStats()
}

let basket: Basket = loadBasket()
const levels = () => TRACKS[basket]
let sceneToken = 0

function resetScene(pool?: string[]) {
  bodies = []
  grab = null
  const token = ++sceneToken
  const count = W < 700 ? 7 : 11
  const order: string[] = []
  for (let i = 0; i < count; i++) {
    const unlockedScene = BASKETS[basket].scene.filter((id) => isUnlockedJelly(id))
    const src = pool ?? (unlockedScene.length ? unlockedScene : myDesigns().map((d) => d.id))
    order.push(src[i % src.length])
  }
  order.forEach((id, i) => {
    setTimeout(() => {
      if (token === sceneToken) spawn(designById(id))
    }, i * 70)
  })
  stats.wobbles = 0
  stats.slices = 0
  stats.eaten = 0
  fx.clear()
  updateStats()
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function shapeMatch(b: Body, alpha: number, writeFit: boolean) {
  const n = b.n
  let cx = 0
  let cy = 0
  for (let i = 0; i < n; i++) {
    cx += b.px[i]
    cy += b.py[i]
  }
  cx /= n
  cy /= n
  const s = b.s
  let num = 0
  let den = 0
  let a11 = 0, a12 = 0, a21 = 0, a22 = 0
  let q11 = 0, q12 = 0, q22 = 0
  for (let i = 0; i < n; i++) {
    const qx = (b.rx[i] - b.rcx) * s
    const qy = (b.ry[i] - b.rcy) * s
    const dx = b.px[i] - cx
    const dy = b.py[i] - cy
    num += qx * dy - qy * dx
    den += qx * dx + qy * dy
    if (writeFit) {
      a11 += dx * qx
      a12 += dx * qy
      a21 += dy * qx
      a22 += dy * qy
      q11 += qx * qx
      q12 += qx * qy
      q22 += qy * qy
    }
  }
  const th = Math.atan2(num, den)
  const c = Math.cos(th)
  const sn = Math.sin(th)
  if (alpha > 0) {
    for (let i = 0; i < n; i++) {
      const qx = (b.rx[i] - b.rcx) * s
      const qy = (b.ry[i] - b.rcy) * s
      const gx = cx + c * qx - sn * qy
      const gy = cy + sn * qx + c * qy
      b.px[i] += (gx - b.px[i]) * alpha
      b.py[i] += (gy - b.py[i]) * alpha
    }
  }
  if (writeFit) {
    b.cx = cx
    b.cy = cy
    // A = Apq * inverse(Aqq)
    const det = q11 * q22 - q12 * q12
    let m: [number, number, number, number] = [c, -sn, sn, c]
    if (Math.abs(det) > 1e-6) {
      const i11 = q22 / det
      const i12 = -q12 / det
      const i22 = q11 / det
      const m11 = a11 * i11 + a12 * i12
      const m12 = a11 * i12 + a12 * i22
      const m21 = a21 * i11 + a22 * i12
      const m22 = a21 * i12 + a22 * i22
      const d = m11 * m22 - m12 * m21
      if (d > 0.35 && d < 3) {
        const f = 0.85
        m = [c + (m11 - c) * f, -sn + (m12 + sn) * f, sn + (m21 - sn) * f, c + (m22 - c) * f]
      }
    }
    b.m = m
    let r = 0
    for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(b.px[i] - cx, b.py[i] - cy))
    b.radius = r
  }
}

function pointInPoly(b: Body, x: number, y: number) {
  let inside = false
  for (let i = 0, j = b.n - 1; i < b.n; j = i++) {
    const xi = b.px[i], yi = b.py[i], xj = b.px[j], yj = b.py[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function collide(a: Body, b: Body) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  if (dx * dx + dy * dy > (a.radius + b.radius) ** 2) return
  let inside = 0
  for (let i = 0; i < a.n; i++) {
    const x = a.px[i]
    const y = a.py[i]
    if (Math.abs(x - b.cx) > b.radius || Math.abs(y - b.cy) > b.radius) continue
    if (!pointInPoly(b, x, y)) continue
    inside++
    // nearest edge of b
    let best = Infinity, bj = 0, bt = 0, bx = 0, by = 0
    for (let j = 0; j < b.n; j++) {
      const k = (j + 1) % b.n
      const ex = b.px[k] - b.px[j]
      const ey = b.py[k] - b.py[j]
      const l2 = ex * ex + ey * ey || 1
      let t = ((x - b.px[j]) * ex + (y - b.py[j]) * ey) / l2
      t = Math.max(0, Math.min(1, t))
      const qx = b.px[j] + ex * t
      const qy = b.py[j] + ey * t
      const d = (qx - x) ** 2 + (qy - y) ** 2
      if (d < best) {
        best = d
        bj = j
        bt = t
        bx = qx
        by = qy
      }
    }
    const mx = (bx - x) * 0.5
    const my = (by - y) * 0.5
    a.px[i] += mx
    a.py[i] += my
    const bk = (bj + 1) % b.n
    b.px[bj] -= mx * (1 - bt)
    b.py[bj] -= my * (1 - bt)
    b.px[bk] -= mx * bt
    b.py[bk] -= my * bt
  }
  if (inside > 0) {
    // whole-body separation so deep overlaps can't get stuck
    const d = Math.hypot(dx, dy) || 1
    const push = Math.min(3, inside * 0.25)
    const sx = (dx / d) * push * 0.5
    const sy = (dy / d) * push * 0.5
    for (let i = 0; i < a.n; i++) {
      a.px[i] -= sx
      a.py[i] -= sy
    }
    for (let i = 0; i < b.n; i++) {
      b.px[i] += sx
      b.py[i] += sy
    }
  }
}

function step() {
  const alpha = soft ? STIFF.soft : STIFF.hard
  // ice levels are slippery: jellies keep sliding for longer
  const damp = twist === 'ice' ? 0.992 : soft ? DAMP.soft : DAMP.hard
  // Gravity button pulls down; level twists add their own push
  let gx = 0
  let gy = gravity ? 0.45 * U : 0
  if (twist === 'bubbles') gy = -0.2 * U // everything floats up
  if (twist === 'wind') gx = Math.sin(performance.now() / 1500) * 0.26 * U // a breeze that swings left and right
  for (const b of bodies) {
    // scale spring (pop-in & scale tool)
    const target = baseScale(b.design) * b.k
    const prevS = b.s
    b.sVel += (target - b.s) * 0.1
    b.sVel *= 0.8
    b.s += b.sVel
    // grow/shrink the body together with its picture so faces & leaves never drift away
    const ratio = b.s / prevS
    if (Math.abs(ratio - 1) > 1e-4) {
      for (let i = 0; i < b.n; i++) {
        b.px[i] = b.cx + (b.px[i] - b.cx) * ratio
        b.py[i] = b.cy + (b.py[i] - b.cy) * ratio
        b.vx[i] *= ratio
        b.vy[i] *= ratio
      }
    }
    for (let i = 0; i < b.n; i++) {
      b.ox[i] = b.px[i]
      b.oy[i] = b.py[i]
      b.px[i] += b.vx[i] * damp + gx
      b.py[i] += b.vy[i] * damp + gy
    }
  }

  for (let iter = 0; iter < 2; iter++) {
    for (const b of bodies) shapeMatch(b, alpha, true)
    if (grab) {
      const g = grab
      for (let i = 0; i < g.body.n; i++) {
        const w = g.w[i] * 0.4
        if (w < 0.002) continue
        g.body.px[i] += (pointer.x + g.ox[i] - g.body.px[i]) * w
        g.body.py[i] += (pointer.y + g.oy[i] - g.body.py[i]) * w
      }
    }
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        collide(bodies[i], bodies[j])
        collide(bodies[j], bodies[i])
      }
    const m = 3
    const sliding = gravity || twist === 'wind'
    const floor = gravity ? floorY : H - m
    for (const b of bodies)
      for (let i = 0; i < b.n; i++) {
        if (b.px[i] < m) {
          b.px[i] = m
          if (sliding) b.py[i] += (b.oy[i] - b.py[i]) * 0.3 // wall friction
        } else if (b.px[i] > W - m) {
          b.px[i] = W - m
          if (sliding) b.py[i] += (b.oy[i] - b.py[i]) * 0.3
        }
        if (b.py[i] < m) b.py[i] = m
        else if (b.py[i] > floor) {
          b.py[i] = floor
          b.px[i] += (b.ox[i] - b.px[i]) * 0.3 // floor friction
        }
      }
  }

  for (const b of bodies) {
    for (let i = 0; i < b.n; i++) {
      b.vx[i] = b.px[i] - b.ox[i]
      b.vy[i] = b.py[i] - b.oy[i]
    }
    shapeMatch(b, 0, true)
    if (b.blinkT > 0) b.blinkT--
    else if (--b.blink <= 0) {
      b.blinkT = 9
      b.blink = 90 + Math.random() * 260
    }
    if (b.surprise > 0) b.surprise--
  }
  fx.update()
}

// ---------------------------------------------------------------------------
// Slicing
// ---------------------------------------------------------------------------
function segIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const rX = bx - ax, rY = by - ay, sX = dx - cx, sY = dy - cy
  const den = rX * sY - rY * sX
  if (Math.abs(den) < 1e-9) return null
  const u = ((cx - ax) * sY - (cy - ay) * sX) / den
  const t = ((cx - ax) * rY - (cy - ay) * rX) / den
  if (u < 0 || u > 1 || t < 0 || t > 1) return null
  return { u, t }
}

function knifeSegment(x0: number, y0: number, x1: number, y1: number) {
  for (const b of bodies.slice()) {
    const found: { u: number; hit: Hit }[] = []
    for (let i = 0; i < b.n; i++) {
      const j = (i + 1) % b.n
      const r = segIntersect(x0, y0, x1, y1, b.px[i], b.py[i], b.px[j], b.py[j])
      if (r) found.push({ u: r.u, hit: { edge: i, t: r.t } })
    }
    found.sort((a, c) => a.u - c.u)
    for (const f of found) {
      if (b.hits.length && b.hits[b.hits.length - 1].edge === f.hit.edge) continue
      b.hits.push(f.hit)
      if (b.hits.length >= 2) {
        const [h1, h2] = b.hits
        b.hits = []
        if (slice(b, h1, h2, x1 - x0, y1 - y0)) break
      }
    }
  }
}

type PRec = { x: number; y: number; vx: number; vy: number; rx: number; ry: number }

function slice(b: Body, h1: Hit, h2: Hit, dirX: number, dirY: number): boolean {
  if (h1.edge === h2.edge) return false
  const [a, c] = h1.edge < h2.edge ? [h1, h2] : [h2, h1]
  const n = b.n
  const rec = (i: number): PRec => ({ x: b.px[i], y: b.py[i], vx: b.vx[i], vy: b.vy[i], rx: b.rx[i], ry: b.ry[i] })
  const lerp = (p: PRec, q: PRec, t: number): PRec => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
    vx: p.vx + (q.vx - p.vx) * t,
    vy: p.vy + (q.vy - p.vy) * t,
    rx: p.rx + (q.rx - p.rx) * t,
    ry: p.ry + (q.ry - p.ry) * t,
  })
  const hp = (h: Hit) => lerp(rec(h.edge), rec((h.edge + 1) % n), h.t)
  const A0 = hp(a)
  const C0 = hp(c)

  const polyA: PRec[] = [A0]
  for (let i = a.edge + 1; i <= c.edge; i++) polyA.push(rec(i))
  polyA.push(C0)
  const polyB: PRec[] = [C0]
  for (let j = c.edge + 1; j <= a.edge + n; j++) polyB.push(rec(j % n))
  polyB.push(A0)

  // subdivide the new cut face so it can wobble too
  let perim = 0
  for (let i = 0; i < n; i++) perim += Math.hypot(b.px[(i + 1) % n] - b.px[i], b.py[(i + 1) % n] - b.py[i])
  const spacing = perim / n
  const cutLen = Math.hypot(C0.x - A0.x, C0.y - A0.y)
  const extra = Math.max(0, Math.round(cutLen / spacing) - 1)
  for (let k = 1; k <= extra; k++) {
    polyA.push(lerp(C0, A0, k / (extra + 1)))
    polyB.push(lerp(A0, C0, k / (extra + 1)))
  }

  const area = (poly: PRec[]) => {
    let s = 0
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length]
      s += p.x * q.y - q.x * p.y
    }
    return Math.abs(s / 2)
  }
  const minArea = 260 * U * U
  if (polyA.length < 6 || polyB.length < 6 || area(polyA) < minArea || area(polyB) < minArea) return false

  // normal to the cut, used to push the halves apart
  const len = Math.hypot(dirX, dirY) || 1
  const nx = -dirY / len
  const ny = dirX / len
  const midX = (A0.x + C0.x) / 2
  const midY = (A0.y + C0.y) / 2

  const pieces = [polyA, polyB].map((poly) => {
    const piece = makeBody(b.design, poly.map((p) => ({ x: p.rx, y: p.ry })), 0, 0, 0, b.s, b.k)
    piece.sVel = 0
    let gx = 0, gy = 0
    poly.forEach((p) => {
      gx += p.x
      gy += p.y
    })
    gx /= poly.length
    gy /= poly.length
    const side = Math.sign((gx - midX) * nx + (gy - midY) * ny) || 1
    poly.forEach((p, i) => {
      piece.px[i] = p.x
      piece.py[i] = p.y
      piece.vx[i] = p.vx + nx * side * 2.6
      piece.vy[i] = p.vy + ny * side * 2.6
    })
    piece.whole = false
    shapeMatch(piece, 0, true)
    return piece
  })

  const idx = bodies.indexOf(b)
  bodies.splice(idx, 1, ...pieces)
  if (grab?.body === b) grab = null
  for (const p of pieces) p.surprise = 50
  fx.juice(midX, midY, b.design.juice, 22, Math.max(0.6, U), nx * 0.5, ny * 0.5)
  stats.slices++
  updateStats()
  sfx.slice()
  quest.event('slice', b)
  recordSlice(b.design.id)
  gainXp(1)
  if (mode === 'knife' && pointer.down) {
    strokeCuts++
    if (strokeCuts >= 2) multiCut(strokeCuts, midX, midY)
  }
  return true
}

// ---------------------------------------------------------------------------
// Multi-cuts: slice 2+ jellies in ONE swipe for slow motion + bonus points
// ---------------------------------------------------------------------------
let strokeCuts = 0
const CUT_COLORS = ['#ff3d8b', '#ff8a3d', '#7a46e0', '#1fae6a']

function multiCut(n: number, x: number, y: number) {
  best('bestCut', n)
  addCoins(5 * (n - 1))
  fx.popup(x, y - 10, `+🪙 ${5 * (n - 1)}`, '#e0a000', 18)
  const word = n === 2 ? 'DOUBLE CUT!' : n === 3 ? 'TRIPLE CUT!' : `MEGA CUT ×${n}!`
  const bonus = 50 * (n - 1)
  const scored = quest.bonus(bonus)
  fx.popup(x, y - 50, scored ? `${word} +${bonus}` : word, CUT_COLORS[Math.min(n, 5) - 2], 26 + Math.min(n, 6) * 4)
  camera.slowmo(n >= 3 ? 0.18 : 0.3, 350 + 150 * Math.min(n, 5))
  sfx.slowmo()
}

// ---------------------------------------------------------------------------
// Eating
// ---------------------------------------------------------------------------
function eat(b: Body) {
  const idx = bodies.indexOf(b)
  if (idx < 0) return
  bodies.splice(idx, 1)
  if (grab?.body === b) grab = null
  fx.juice(b.cx, b.cy, b.design.juice, 30, Math.max(0.7, b.radius / 90))
  if (!quest.active) fx.popup(b.cx, b.cy - 20, pick1(['yum!', 'nom!', 'tasty!', 'mmm!']), b.design.juice, 26)
  stats.eaten++
  updateStats()
  sfx.eat()
  quest.event('eat', b)
  bump('eaten')
  gainXp(2)
}

function pick1<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function tracePath(b: Body) {
  const n = b.n
  ctx.beginPath()
  const mx = (b.px[n - 1] + b.px[0]) / 2
  const my = (b.py[n - 1] + b.py[0]) / 2
  ctx.moveTo(mx, my)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    ctx.quadraticCurveTo(b.px[i], b.py[i], (b.px[i] + b.px[j]) / 2, (b.py[i] + b.py[j]) / 2)
  }
  ctx.closePath()
}

function artTransform(b: Body) {
  ctx.translate(b.cx, b.cy)
  ctx.transform(b.m[0], b.m[2], b.m[1], b.m[3], 0, 0)
  ctx.scale(b.s, b.s)
  ctx.translate(-b.rcx, -b.rcy)
}

function drawBody(b: Body, night: boolean) {
  const r = b.radius
  if (r < 2) return

  // drop shadow
  ctx.save()
  tracePath(b)
  ctx.shadowColor = night ? 'rgba(0,0,0,0.55)' : 'rgba(40,40,70,0.22)'
  ctx.shadowBlur = 34 * U
  ctx.shadowOffsetY = 18 * U
  ctx.shadowOffsetX = 4 * U
  ctx.fillStyle = b.design.rim
  ctx.fill()
  ctx.restore()

  // stems / leaves behind the gloss
  if (b.whole && b.design.outer) {
    ctx.save()
    artTransform(b)
    b.design.outer(ctx)
    ctx.restore()
  }

  // art clipped to the wobbling outline
  ctx.save()
  tracePath(b)
  ctx.clip()
  ctx.save()
  artTransform(b)
  b.design.art(ctx)
  ctx.restore()

  // volume shading
  const g = ctx.createRadialGradient(b.cx - r * 0.35, b.cy - r * 0.45, r * 0.05, b.cx, b.cy, r * 1.25)
  g.addColorStop(0, 'rgba(255,255,255,0.32)')
  g.addColorStop(0.45, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(0,0,30,0.22)')
  ctx.fillStyle = g
  ctx.fillRect(b.cx - r * 1.3, b.cy - r * 1.3, r * 2.6, r * 2.6)

  // soft inner edge
  tracePath(b)
  ctx.lineWidth = Math.max(4, r * 0.12)
  ctx.strokeStyle = 'rgba(0,0,20,0.10)'
  ctx.stroke()
  ctx.lineWidth = Math.max(2, r * 0.05)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.stroke()
  ctx.restore()

  // glossy highlight following the top-left of the shape
  const lx = -0.55, ly = -0.83
  const score: number[] = []
  for (let i = 0; i < b.n; i++) {
    const dx = b.px[i] - b.cx
    const dy = b.py[i] - b.cy
    const l = Math.hypot(dx, dy) || 1
    score.push((dx * lx + dy * ly) / l)
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(3, r * 0.085)
  const inset = 0.8
  for (let i = 0; i < b.n; i++) {
    const j = (i + 1) % b.n
    const sc = Math.min(score[i], score[j])
    if (sc < 0.5) continue
    ctx.globalAlpha = Math.min(0.85, (sc - 0.5) * 2.4)
    ctx.beginPath()
    ctx.moveTo(b.cx + (b.px[i] - b.cx) * inset, b.cy + (b.py[i] - b.cy) * inset)
    ctx.lineTo(b.cx + (b.px[j] - b.cx) * inset, b.cy + (b.py[j] - b.cy) * inset)
    ctx.stroke()
  }
  // little glint
  let bi = 0
  for (let i = 1; i < b.n; i++) if (score[i] > score[bi]) bi = i
  ctx.globalAlpha = 0.9
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(b.cx + (b.px[bi] - b.cx) * 0.55 + r * 0.12, b.cy + (b.py[bi] - b.cy) * 0.55, Math.max(2, r * 0.045), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (showFaces && b.whole) drawFace(b)
  if (b.whole) drawHat(b)
  if (showTags) drawTag(b)
}

/** The hat you picked in the shop sits on top of every whole jelly. */
function drawHat(b: Body) {
  const hat = hatById(save.equipped.hat)
  if (!hat.draw) return
  // the top of the jelly's own shape (in art space), above its face
  let top = Infinity
  for (let i = 0; i < b.n; i++) top = Math.min(top, b.ry[i])
  const fx0 = b.design.face?.x ?? b.rcx
  const size = 100 * b.s * (b.design.face?.scale ?? 1) * 0.62
  ctx.save()
  ctx.translate(b.cx, b.cy)
  ctx.transform(b.m[0], b.m[2], b.m[1], b.m[3], 0, 0)
  ctx.translate((fx0 - b.rcx) * b.s, (top - b.rcy) * b.s + size * 0.18)
  ctx.rotate(-0.12)
  hat.draw(ctx, size)
  ctx.restore()
}

function bodySpeed(b: Body) {
  let s = 0
  for (let i = 0; i < b.n; i++) s += Math.hypot(b.vx[i], b.vy[i])
  return s / b.n
}

function drawFace(b: Body) {
  const face = b.design.face
  const fu = 100 * b.s * (face?.scale ?? 1)
  const [m11, m12, m21, m22] = b.m
  const grabbed = grab?.body === b
  const surprised = !grabbed && (b.surprise > 0 || bodySpeed(b) > 7)

  // eyes follow the pointer: convert the world direction into face space
  const det = m11 * m22 - m12 * m21 || 1
  const wx = pointer.x - b.cx
  const wy = pointer.y - b.cy
  let lx = (m22 * wx - m12 * wy) / det
  let ly = (-m21 * wx + m11 * wy) / det
  const ll = Math.hypot(lx, ly) || 1
  const look = Math.min(1, ll / 300) * 0.028 * fu
  lx = (lx / ll) * look
  ly = (ly / ll) * look

  ctx.save()
  ctx.translate(b.cx, b.cy)
  ctx.transform(m11, m21, m12, m22, 0, 0)
  if (face) ctx.translate((face.x - b.rcx) * b.s, (face.y - b.rcy) * b.s)
  const ink = '#2b1b1e'
  const ex = 0.22 * fu
  const ey = 0
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = Math.max(1.5, 0.035 * fu)

  if (grabbed) {
    // squeezed  > <
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sx * ex - sx * 0.06 * fu, ey - 0.055 * fu)
      ctx.lineTo(sx * ex + sx * 0.04 * fu, ey)
      ctx.lineTo(sx * ex - sx * 0.06 * fu, ey + 0.055 * fu)
      ctx.stroke()
    }
  } else {
    const open = b.blinkT > 0 ? 0.12 : 1
    const er = (surprised ? 0.085 : 0.068) * fu
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sx * ex + lx, ey + ly, er * 0.85, er * open, 0, 0, Math.PI * 2)
      ctx.fill()
      if (open > 0.5) {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(sx * ex + lx - er * 0.3, ey + ly - er * 0.35, er * 0.32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = ink
      }
    }
  }

  // cheeks
  ctx.fillStyle = 'rgba(255,110,140,0.45)'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sx * 0.36 * fu, ey + 0.12 * fu, 0.07 * fu, 0.04 * fu, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // mouth
  ctx.fillStyle = ink
  const my = ey + 0.12 * fu
  if (grabbed || surprised) {
    ctx.beginPath()
    ctx.ellipse(0, my + 0.01 * fu, 0.045 * fu, (grabbed ? 0.06 : 0.05) * fu, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff7a8a'
    ctx.beginPath()
    ctx.ellipse(0, my + 0.035 * fu, 0.028 * fu, 0.018 * fu, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // cute "w" smile
    ctx.beginPath()
    ctx.moveTo(-0.07 * fu, my - 0.01 * fu)
    ctx.quadraticCurveTo(-0.035 * fu, my + 0.05 * fu, 0, my)
    ctx.quadraticCurveTo(0.035 * fu, my + 0.05 * fu, 0.07 * fu, my - 0.01 * fu)
    ctx.stroke()
  }
  ctx.restore()
}

function drawTag(b: Body) {
  let maxY = -Infinity
  for (let i = 0; i < b.n; i++) maxY = Math.max(maxY, b.py[i])
  const label = b.whole ? b.design.name : `${b.design.name} bit`
  ctx.save()
  ctx.font = `600 ${Math.round(12 * Math.max(0.9, U))}px ui-rounded, "Segoe UI", system-ui, sans-serif`
  const w = ctx.measureText(label).width + 26
  const h = 24
  const x = b.cx - w / 2
  const y = Math.min(maxY + 10, H - h - 4)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 12)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = CATEGORY_COLORS[b.design.category]
  ctx.beginPath()
  ctx.arc(x + 12, y + h / 2, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#222'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 20, y + h / 2 + 1)
  ctx.restore()
}

function drawTrail() {
  const now = performance.now()
  trail = trail.filter((p) => now - p.t < 180)
  if (trail.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const knife = knifeById(save.equipped.knife)
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i]
    const life = 1 - (now - b.t) / 180
    ctx.globalAlpha = life
    ctx.strokeStyle = knife.colors[i % knife.colors.length]
    ctx.shadowColor = knife.glow
    ctx.shadowBlur = 14
    ctx.lineWidth = 2 + life * 8
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    if (knife.sparkle && i % 3 === 0) {
      ctx.fillStyle = knife.sparkle
      ctx.beginPath()
      ctx.arc(b.x + Math.sin(b.t) * 8, b.y + Math.cos(b.t) * 8, 1.5 + life * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let last = performance.now()
let acc = 0
function frame(now: number) {
  const realMs = Math.min(50, now - last)
  quest.update(realMs / 1000) // the round timer always runs in real time
  camera.update(realMs, now)
  acc += realMs * camera.timeScale // physics slows down during slow motion
  last = now
  let steps = 0
  while (acc >= 1000 / 60 && steps < 3) {
    step()
    acc -= 1000 / 60
    steps++
  }
  if (steps === 3) acc = 0
  if (screen === 'home') homeHop(now)

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  ctx.clearRect(0, 0, W, H)
  const night = isDark()
  drawDecor(realMs)
  ctx.save()
  camera.apply(ctx, W, H) // slow-motion zoom
  fx.drawBelow(ctx)
  for (const b of bodies) drawBody(b, night)
  fx.drawAbove(ctx)
  ctx.restore()
  camera.overlay(ctx, W, H, night)
  drawNight()
  drawTrail()
  requestAnimationFrame(frame)
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1)
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = Math.round(W * DPR)
  canvas.height = Math.round(H * DPR)
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  U = Math.max(0.5, Math.min(1.25, Math.min(W, H * 1.4) / 1100))
  measureFloor()
}

/** With gravity on, jellies rest just above the bottom toolbar (whatever its height on this screen). */
let floorY = 0
function measureFloor() {
  const bar = document.querySelector<HTMLElement>('.toolbar')
  const top = bar?.getBoundingClientRect().top ?? 0
  floorY = top > H * 0.5 && top < H ? top - 6 : H - 3
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function pick(x: number, y: number): Body | null {
  for (let i = bodies.length - 1; i >= 0; i--) if (pointInPoly(bodies[i], x, y)) return bodies[i]
  return null
}

function scaleBody(b: Body, up: boolean) {
  b.k = Math.max(0.45, Math.min(2, b.k * (up ? 1.22 : 1 / 1.22)))
  b.sVel += up ? 0.04 * U : -0.03 * U
  sfx.scale(up)
  if (up && b.k >= 1.7) quest.event('grow', b)
  if (!up && b.k <= 0.62) quest.event('shrink', b)
}

function capture(id: number) {
  try {
    canvas.setPointerCapture(id)
  } catch {
    /* pointer already gone */
  }
}

// ---------- two-finger pinch to grow / shrink a jelly ----------
const fingers = new Map<number, { x: number; y: number }>()
let pinch: { body: Body; startDist: number; startK: number; step: number; grew: boolean; shrank: boolean } | null = null

function fingerDistance() {
  const [a, b] = [...fingers.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function startPinch(): boolean {
  if (fingers.size !== 2 || mode === 'knife') return false
  const [a, b] = [...fingers.values()]
  const body = grab?.body ?? pick(a.x, a.y) ?? pick(b.x, b.y) ?? pick((a.x + b.x) / 2, (a.y + b.y) / 2)
  if (!body) return false
  grab = null
  canvas.classList.remove('grabbing')
  pinch = { body, startDist: Math.max(20, fingerDistance()), startK: body.k, step: Math.round(body.k * 5), grew: false, shrank: false }
  body.surprise = 20
  haptics.grab()
  return true
}

function movePinch() {
  if (!pinch || fingers.size < 2 || !bodies.includes(pinch.body)) return
  const b = pinch.body
  const k = Math.max(0.45, Math.min(2, (pinch.startK * fingerDistance()) / pinch.startDist))
  const up = k > b.k
  b.k = k
  // a little click + buzz each time the size passes a step
  const step = Math.round(k * 5)
  if (step !== pinch.step) {
    pinch.step = step
    sfx.scale(up)
  }
  if (k >= 1.7 && !pinch.grew) {
    pinch.grew = true
    quest.event('grow', b)
  }
  if (k <= 0.62 && !pinch.shrank) {
    pinch.shrank = true
    quest.event('shrink', b)
  }
}

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock()
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (fingers.size >= 2) {
    capture(e.pointerId)
    startPinch()
    return
  }
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.down = true
  pointer.id = e.pointerId
  capture(e.pointerId)

  if (mode === 'knife') {
    trail = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
    for (const b of bodies) b.hits = []
    strokeCuts = 0 // a new swipe starts a new multi-cut count
    return
  }
  const b = pick(e.clientX, e.clientY)
  if (!b) return
  if (mode === 'scale') {
    scaleBody(b, !(e.shiftKey || e.button === 2))
    return
  }
  // double-tap to eat
  const now = performance.now()
  if (lastTap && lastTap.body === b && now - lastTap.t < 330) {
    lastTap = null
    eat(b)
    return
  }
  lastTap = { body: b, t: now }
  // play: grab with falloff so the jelly stretches
  bodies.splice(bodies.indexOf(b), 1)
  bodies.push(b)
  const sigma = Math.max(30, b.radius * 0.6)
  const w: number[] = []
  const ox: number[] = []
  const oy: number[] = []
  for (let i = 0; i < b.n; i++) {
    const d = Math.hypot(b.px[i] - e.clientX, b.py[i] - e.clientY)
    w.push(Math.exp(-(d * d) / (2 * sigma * sigma)))
    ox.push(b.px[i] - e.clientX)
    oy.push(b.py[i] - e.clientY)
  }
  grab = { body: b, w, ox, oy }
  canvas.classList.add('grabbing')
  stats.wobbles++
  updateStats()
  sfx.grab()
  bump('wobbles')
  quest.event('wobble', b)
})

canvas.addEventListener('pointermove', (e) => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pinch) {
    movePinch()
    return
  }
  if (e.pointerId !== pointer.id && pointer.down) return
  const px = pointer.x, py = pointer.y
  pointer.x = e.clientX
  pointer.y = e.clientY
  if (mode === 'knife' && pointer.down) {
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    knifeSegment(px, py, e.clientX, e.clientY)
  }
  if (!pointer.down && mode === 'play') canvas.classList.toggle('can-grab', !!pick(e.clientX, e.clientY))
})

function endPointer(e: PointerEvent) {
  fingers.delete(e.pointerId)
  if (pinch) {
    // lifting either finger ends the pinch; the jelly wobbles at its new size
    if (fingers.size < 2) {
      pinch.body.sVel += 0.02 * U
      pinch = null
      pointer.down = false
      grab = null
    }
    return
  }
  if (e.pointerId !== pointer.id) return
  pointer.down = false
  if (grab) {
    const b = grab.body
    if (bodySpeed(b) > 9) {
      sfx.whoosh()
      bump('flings')
      b.surprise = 60
      if (!quest.active) fx.popup(b.cx, b.cy - 30, 'whoosh!', b.design.juice, 22)
      quest.event('fling', b)
    } else sfx.wobble()
  }
  grab = null
  canvas.classList.remove('grabbing')
  for (const b of bodies) b.hits = []
}
canvas.addEventListener('pointerup', endPointer)
canvas.addEventListener('pointercancel', endPointer)
canvas.addEventListener('contextmenu', (e) => e.preventDefault())
canvas.addEventListener(
  'wheel',
  (e) => {
    const b = pick(e.clientX, e.clientY)
    if (!b) return
    e.preventDefault()
    scaleBody(b, e.deltaY < 0)
  },
  { passive: false },
)

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const hint = document.getElementById('hint')!
const statEl = document.getElementById('stats')!

const HINTS: Record<Mode, string> = {
  play: 'PLAY · Drag to wobble · Double-tap to eat · Throw it fast!',
  knife: 'KNIFE · Swipe across a jelly to slice it',
  scale: 'SCALE · Click to grow · Shift / right-click to shrink',
}

function updateStats() {
  statEl.innerHTML = `<b>${bodies.length}</b> jellies · <b>${stats.wobbles}</b> wobbles · <b>${stats.slices}</b> slices · <b>${stats.eaten}</b> eaten`
}

function setMode(m: Mode) {
  mode = m
  document.body.dataset.mode = m
  hint.textContent = HINTS[m]
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => btn.classList.toggle('on', btn.dataset.mode === m))
  canvas.classList.remove('can-grab')
}

function setSoft(v: boolean) {
  soft = v
  document.getElementById('btn-hard')!.classList.toggle('on', !v)
  document.getElementById('btn-soft')!.classList.toggle('on', v)
}

function shake() {
  for (const b of bodies) {
    const ax = (Math.random() - 0.5) * 22
    const ay = gravity ? -10 - Math.random() * 16 : (Math.random() - 0.5) * 22
    for (let i = 0; i < b.n; i++) {
      b.vx[i] += ax + (Math.random() - 0.5) * 6
      b.vy[i] += ay + (Math.random() - 0.5) * 6
    }
  }
  sfx.shake()
}

document.getElementById('btn-hard')!.onclick = () => setSoft(false)
document.getElementById('btn-soft')!.onclick = () => setSoft(true)
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
  btn.onclick = () => setMode(mode === btn.dataset.mode ? 'play' : (btn.dataset.mode as Mode))
})
document.getElementById('btn-shake')!.onclick = () => {
  sfx.unlock()
  shake()
}
document.getElementById('btn-reset')!.onclick = () => {
  sfx.unlock()
  if (quest.isLevel && currentLevel !== null) startLevel(currentLevel)
  else {
    quest.abort()
    resetScene()
  }
}
function setGravity(v: boolean) {
  gravity = v
  document.getElementById('btn-gravity')!.classList.toggle('on', v)
  measureFloor()
}
document.getElementById('btn-gravity')!.onclick = () => {
  setGravity(!gravity)
  sfx.scale(!gravity)
}
document.getElementById('btn-faces')!.onclick = (e) => {
  showFaces = !showFaces
  ;(e.currentTarget as HTMLElement).classList.toggle('on', showFaces)
}

// ---------------------------------------------------------------------------
// Challenge mode
// ---------------------------------------------------------------------------
const quest = createQuest({
  bodies: () => bodies,
  spawn: (d) => spawn(d),
  popup: (x, y, text, color, size) => fx.popup(x, y, text, color, size),
  sound: { success: sfx.success, tick: sfx.tick, over: sfx.over, start: sfx.start, win: sfx.win },
  finish: showResult,
  onOrder: (combo) => {
    if (combo >= 3) camera.slowmo(0.4, 400)
    bump('orders')
    best('bestCombo', combo)
    gainXp(8)
  },
})

// ---------------------------------------------------------------------------
// Screens: home (landing) · levels (adventure map) · shop · badges · game
// ---------------------------------------------------------------------------
type Screen = 'home' | 'levels' | 'shop' | 'badges' | 'game'
let screen: Screen = 'home'
let currentLevel: number | null = null
let lastHop = 0
let screenBefore: Screen = 'home' // where Shop / Badges go back to

function showScreen(s: Screen) {
  if ((s === 'shop' || s === 'badges') && screen !== 'shop' && screen !== 'badges') screenBefore = screen
  screen = s
  document.body.dataset.screen = s
  requestAnimationFrame(measureFloor)
  for (const id of ['home', 'levels', 'shop', 'badges']) document.getElementById(id)!.classList.toggle('hidden', s !== id)
  hideModal()
  if (s !== 'game') {
    twist = 'none'
    decor = []
    applyBackground()
  }
  if (s === 'home') refreshHome()
  if (s === 'levels') renderMap(basket, startLevel)
  if (s === 'shop') renderShop(onShopChange)
  if (s === 'badges') renderBadges()
  renderStatus()
}

function goHome() {
  quest.abort()
  currentLevel = null
  setGravity(false)
  setMode('play')
  resetScene()
  showScreen('home')
}

function startFree() {
  sfx.unlock()
  quest.abort()
  currentLevel = null
  setGravity(false)
  showScreen('game')
}

function startRush() {
  sfx.unlock()
  currentLevel = null
  setGravity(false)
  setMode('play')
  resetScene()
  showScreen('game')
  quest.start()
}

function startLevel(i: number) {
  sfx.unlock()
  refreshHearts()
  if (save.hearts <= 0) {
    showNoHearts(() => startLevel(i))
    return
  }
  const lv = levels()[i]
  currentLevel = i
  setGravity(!!lv.gravity)
  setMode('play')
  showScreen('game')
  // this level's own place, twist and decorations
  twist = lv.twist ?? 'none'
  applyBackground(lv.place, twist === 'night')
  makeDecor(lv.place?.decor ?? [])
  resetScene(lv.pool)
  quest.start(lv, i)
  // meeting a new jelly on the map unlocks it
  for (const id of new Set(lv.pool)) if (unlockJelly(id)) toast(`🎉 New friend: <b>${JELLY_EMOJI[id] ?? ''} ${designById(id).name}</b>!`, 'green')
  const tw = TWIST_INFO[twist]
  if (tw.icon) setTimeout(() => toast(`${tw.icon} <b>${tw.label}!</b> ${tw.tip}`, 'blue', 3600), 400)
  refreshBasket()
}

/** The landing page jellies hop around now and then so the scene feels alive. */
function homeHop(now: number) {
  if (now - lastHop < 1300 || !bodies.length) return
  lastHop = now
  const b = bodies[Math.floor(Math.random() * bodies.length)]
  const vx = (Math.random() - 0.5) * 8
  const vy = -4 - Math.random() * 5
  for (let i = 0; i < b.n; i++) {
    b.vx[i] += vx
    b.vy[i] += vy
  }
  b.surprise = 25
}

function refreshHome() {
  const stars = loadStars(basket)
  const got = stars.reduce((a, b) => a + (b || 0), 0)
  document.getElementById('h-progress')!.textContent = `⭐ ${got} / ${levels().length * 3} stars`
  const best = quest.bestScore()
  document.getElementById('h-best')!.textContent = best ? `best ${best}` : ''
}

// ---------- backgrounds: the one you equipped, or a level's own place ----------
function applyBackground(place?: Place, dark = false) {
  const b = bgById(save.equipped.bg)
  const st = document.body.style
  if (place) {
    st.setProperty('--bg1', place.bg1)
    st.setProperty('--bg2', place.bg2)
    st.setProperty('--pattern', 'linear-gradient(transparent, transparent)')
    document.body.dataset.theme = dark ? 'night' : 'milk'
  } else {
    st.setProperty('--bg1', b.bg1)
    st.setProperty('--bg2', b.bg2)
    st.setProperty('--pattern', b.pattern ?? 'linear-gradient(transparent, transparent)')
    document.body.dataset.theme = b.dark ? 'night' : 'milk'
  }
}

// ---------- floating decorations for each level's place ----------
type Decor = { x: number; y: number; vy: number; phase: number; size: number; emoji: string }
let decor: Decor[] = []
function makeDecor(emojis: string[]) {
  decor = []
  if (!emojis.length) return
  for (let i = 0; i < 12; i++)
    decor.push({ x: Math.random() * W, y: Math.random() * H, vy: 0.15 + Math.random() * 0.35, phase: Math.random() * 6, size: 18 + Math.random() * 22, emoji: emojis[i % emojis.length] })
}
function drawDecor(dt: number) {
  if (!decor.length) return
  ctx.save()
  ctx.globalAlpha = isDark() ? 0.5 : 0.32
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const t = performance.now() / 1000
  for (const d of decor) {
    d.y -= d.vy * dt * 0.06
    if (d.y < -40) {
      d.y = H + 40
      d.x = Math.random() * W
    }
    ctx.font = `${d.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
    ctx.fillText(d.emoji, d.x + Math.sin(t + d.phase) * 14, d.y)
  }
  ctx.restore()
}

// ---------- night twist: it's dark, only the spot around your finger is lit ----------
function drawNight() {
  if (twist !== 'night' || screen !== 'game') return
  const r = Math.max(130, Math.min(W, H) * 0.24)
  const g = ctx.createRadialGradient(pointer.x, pointer.y, r * 0.15, pointer.x, pointer.y, r)
  g.addColorStop(0, 'rgba(8,6,24,0)')
  g.addColorStop(0.7, 'rgba(8,6,24,0.45)')
  g.addColorStop(1, 'rgba(8,6,24,0.88)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// ---------- hearts ----------
function showNoHearts(retry: () => void) {
  const wait = nextHeartIn()
  showModal({
    emoji: '💔',
    emojiClass: 'broken',
    title: 'Out of hearts!',
    lines: [`A new heart grows back in <b>${mmss(wait)}</b>.`, 'Rush and Free Play are always free to play.'],
    buttons: [
      {
        label: `Refill ❤️ for 🪙 ${REFILL_PRICE}`,
        primary: save.coins >= REFILL_PRICE,
        onClick: () => {
          if (spendCoins(REFILL_PRICE)) {
            refillHearts()
            toast('❤️❤️❤️ Hearts refilled!', 'pink')
            retry()
          } else {
            toast(`Not enough coins — 🪙 ${REFILL_PRICE - save.coins} more`, 'blue')
            showScreen('levels')
          }
        },
      },
      { label: 'Map', onClick: () => showScreen('levels') },
    ],
  })
}
const REFILL_PRICE = 150

// ---------- rewards: XP, level-ups, badges ----------
function gainXp(n: number) {
  for (const up of addXp(n)) {
    sfx.win()
    toast(`⭐ <b>Level ${up.level}!</b> You're getting jiggly good!`, 'gold', 3600)
    for (const id of up.newJellies) toast(`🎉 New friend unlocked: <b>${JELLY_EMOJI[id] ?? ''} ${designById(id).name}</b>`, 'green', 4200)
    refreshBasket()
  }
}

function checkBadges() {
  for (const b of BADGES) {
    if (save.badges.includes(b.id) || b.value() < b.goal) continue
    if (earnBadge(b.id)) {
      addCoins(b.reward)
      toast(`🏅 Badge: <b>${b.emoji} ${b.name}</b> · +🪙 ${b.reward}`, 'gold', 4000)
    }
  }
}

// ---------- result popup ----------
type ModalButton = { label: string; primary?: boolean; onClick: () => void }

function showModal(o: { emoji: string; emojiClass?: string; title: string; big?: string; stars?: number; hearts?: { left: number; broke: boolean }; lines: string[]; buttons: ModalButton[] }) {
  const m = document.getElementById('modal')!
  const em = document.getElementById('m-emoji')!
  em.textContent = o.emoji
  em.className = `emoji ${o.emojiClass ?? ''}`
  const hearts = document.getElementById('m-hearts')!
  hearts.innerHTML = o.hearts
    ? Array.from({ length: MAX_HEARTS }, (_, i) => {
        const lost = o.hearts!.broke && i === o.hearts!.left
        return `<i class="${lost ? 'breaking' : i < o.hearts!.left ? '' : 'gone'}">${i < o.hearts!.left ? '❤️' : lost ? '💔' : '🤍'}</i>`
      }).join('')
    : ''
  document.getElementById('m-title')!.textContent = o.title
  const big = document.getElementById('m-big')!
  big.textContent = o.big ?? ''
  big.classList.toggle('hidden', !o.big)
  const starsEl = document.getElementById('m-stars')!
  starsEl.classList.toggle('hidden', o.stars === undefined)
  starsEl.innerHTML = [1, 2, 3].map((k) => `<i class="${o.stars !== undefined && k <= o.stars ? 'on' : ''}" style="animation-delay:${200 + k * 180}ms">★</i>`).join('')
  document.getElementById('m-lines')!.innerHTML = o.lines.map((l) => `<p>${l}</p>`).join('')
  const row = document.getElementById('m-row')!
  row.innerHTML = ''
  for (const b of o.buttons) {
    const el = document.createElement('button')
    el.textContent = b.label
    if (b.primary) el.className = 'on'
    el.onclick = () => {
      hideModal()
      b.onClick()
    }
    row.appendChild(el)
  }
  m.classList.remove('hidden')
}

function hideModal() {
  document.getElementById('modal')!.classList.add('hidden')
}

const rewardLine = (coins: number, xp: number) => `<span class="reward">🪙 +${coins}</span><span class="reward xp">✨ +${xp} XP</span>`

function showResult(r: RoundResult) {
  if (r.mode === 'rush') {
    const coins = Math.floor(r.score / 40)
    const xp = Math.floor(r.score / 15)
    bump('rushGames')
    best('bestRush', r.score)
    addCoins(coins)
    showModal({
      emoji: '⚡🍓🥕',
      title: "Time's up!",
      big: String(r.score),
      lines: [rewardLine(coins, xp), `${r.done} order${r.done === 1 ? '' : 's'} served`, r.newBest ? '<b>🏆 New best score!</b>' : `<b>Best: ${r.best}</b>`],
      buttons: [
        { label: 'Play again', primary: true, onClick: startRush },
        { label: 'Home', onClick: goHome },
      ],
    })
    gainXp(xp)
    checkBadges()
    return
  }
  if (r.won) {
    const before = loadStars(basket)[r.index] || 0
    const firstClear = before === 0
    const coins = 20 + 15 * r.stars + (firstClear ? 30 : 0) + Math.max(0, r.stars - before) * 10
    const xp = 40 + 20 * r.stars + (firstClear ? 40 : 0)
    camera.slowmo(0.25, 900)
    saveStars(basket, r.index, r.stars)
    bump('levelsWon')
    addCoins(coins)
    const hasNext = r.index + 1 < levels().length
    for (let i = 0; i < 4; i++) setTimeout(() => fx.juice(W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.3), pick1(['#ff5f9c', '#ffd35c', '#7bd88f', '#6a74e6', '#ff8a3d']), 30, 1.2), i * 160)
    showModal({
      emoji: r.level.emoji,
      title: hasNext ? 'Level complete!' : 'World complete! 👑',
      stars: r.stars,
      big: String(r.score),
      lines: [rewardLine(coins, xp), `${r.index + 1}. ${r.level.name}${firstClear ? ' · first clear bonus!' : ''}`],
      buttons: [
        ...(hasNext ? [{ label: 'Next level ▶', primary: true, onClick: () => startLevel(r.index + 1) }] : []),
        { label: 'Retry', primary: !hasNext, onClick: () => startLevel(r.index) },
        { label: 'Map', onClick: () => showScreen('levels') },
      ],
    })
    gainXp(xp)
    checkBadges()
  } else {
    // failing a level breaks a heart
    loseHeart()
    const left = save.hearts
    const wait = nextHeartIn()
    showModal({
      emoji: '⏰',
      title: 'Out of time!',
      hearts: { left, broke: true },
      lines: [
        `You served ${r.done} of ${r.total} orders.`,
        left > 0 ? `${left} heart${left === 1 ? '' : 's'} left · next heart in ${mmss(wait)}` : `No hearts left · next heart in <b>${mmss(wait)}</b>`,
      ],
      buttons: [
        { label: left > 0 ? 'Try again' : `Refill 🪙 ${REFILL_PRICE}`, primary: true, onClick: () => startLevel(r.index) },
        { label: 'Map', onClick: () => showScreen('levels') },
      ],
    })
    gainXp(10)
    checkBadges()
  }
  renderStatus()
}

function onShopChange() {
  applyBackground()
  renderStatus()
  checkBadges()
}

document.getElementById('h-levels')!.onclick = () => {
  sfx.unlock()
  showScreen('levels')
}
document.getElementById('h-rush')!.onclick = startRush
document.getElementById('h-free')!.onclick = startFree
document.getElementById('h-shop')!.onclick = () => showScreen('shop')
document.getElementById('h-badges')!.onclick = () => showScreen('badges')
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((b) => (b.onclick = () => showScreen(screenBefore === 'game' ? 'home' : screenBefore)))
document.getElementById('lv-back')!.onclick = () => showScreen('home')
document.getElementById('btn-home')!.onclick = goHome
document.getElementById('btn-quest')!.onclick = startRush
document.getElementById('q-quit')!.onclick = () => {
  if (quest.isLevel) {
    quest.abort()
    showScreen('levels')
  } else quest.end()
}
// top bar pills: hearts → map, coins → shop, level → badges
document.getElementById('status')!.onclick = (e) => {
  const go = (e.target as HTMLElement).closest<HTMLElement>('[data-go]')?.dataset.go
  if (screen === 'game' && quest.active) return // don't leave a round by accident
  if (go === 'shop') showScreen('shop')
  if (go === 'badges') showScreen('badges')
  if (go === 'hearts') {
    refreshHearts()
    toast(save.hearts >= MAX_HEARTS ? '❤️ Your hearts are full!' : `❤️ Next heart in ${mmss(nextHeartIn())}`, 'pink', 2200)
  }
}
document.getElementById('btn-tags')!.onclick = (e) => {
  showTags = !showTags
  ;(e.currentTarget as HTMLElement).classList.toggle('on', showTags)
}
// View cycles through the backgrounds you own
document.getElementById('btn-view')!.onclick = () => {
  const mine = BACKGROUNDS.filter((b) => save.owned.includes(b.id))
  const i = mine.findIndex((b) => b.id === save.equipped.bg)
  equip('bg', mine[(i + 1) % mine.length].id)
  if (!(quest.isLevel && currentLevel !== null)) applyBackground()
  toast(`🖼️ ${bgById(save.equipped.bg).name}`, 'blue', 1200)
}
// vibration on/off (only shown on touch devices)
const hapticsBtn = document.getElementById('btn-haptics')!
const showHaptics = () => {
  hapticsBtn.classList.toggle('off', !haptics.enabled)
  hapticsBtn.title = haptics.enabled ? 'Vibration on' : 'Vibration off'
}
hapticsBtn.onclick = () => {
  haptics.setEnabled(!haptics.enabled)
  showHaptics()
}
showHaptics()
if (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('is-touch')

const soundBtn = document.getElementById('btn-sound')!
soundBtn.onclick = () => {
  sfx.unlock()
  sfx.muted = !sfx.muted
  soundBtn.textContent = sfx.muted ? '🔇' : '🔊'
}

// ---------------------------------------------------------------------------
// Basket: fruits / veggies / both (only jellies you have unlocked appear)
// ---------------------------------------------------------------------------
const CHIPS: Record<Basket, string[]> = {
  fruit: ['fruit', 'bloom', 'citrus', 'melon', 'berry'],
  veggie: ['mushroom', 'carrot', 'tomato', 'onion', 'leek', 'beetroot', 'cucumber', 'eggplant'],
  both: ['fruit', 'veggie', 'bloom', 'citrus', 'melon', 'berry'],
}
const CHIP_NAMES: Record<string, string> = { fruit: 'Fruit', veggie: 'Veggie', bloom: 'Bloom', citrus: 'Citrus', melon: 'Melon', berry: 'Berry' }

/** Designs from this basket that the player has unlocked. */
function myDesigns(b: Basket = basket) {
  return BASKETS[b].designs.filter((d) => isUnlockedJelly(d.id))
}

function renderChips() {
  const nav = document.querySelector<HTMLElement>('.chips')!
  nav.innerHTML = ''
  const allowed = new Set(myDesigns().map((d) => d.id))
  for (const key of CHIPS[basket]) {
    const isCat = key in CHIP_NAMES
    const list = isCat ? designsFor(key as Category).filter((d) => allowed.has(d.id)) : allowed.has(key) ? [designById(key)] : []
    const color = isCat ? CATEGORY_COLORS[key as Category] : designById(key).juice
    const btn = document.createElement('button')
    const label = isCat ? CHIP_NAMES[key] : designById(key).name
    if (!list.length) {
      const lv = isCat ? Math.min(...designsFor(key as Category).map((d) => UNLOCK_AT[d.id] ?? 1)) : (UNLOCK_AT[key] ?? 1)
      btn.innerHTML = `🔒 ${label} <small>Lv ${lv}</small>`
      btn.className = 'locked'
      btn.onclick = () => toast(`🔒 ${label} unlocks at player level ${lv}`, 'blue', 1800)
    } else {
      btn.innerHTML = `<i style="background:${color}"></i>${label}`
      btn.onclick = () => {
        sfx.unlock()
        spawn(list[Math.floor(Math.random() * list.length)])
      }
    }
    nav.appendChild(btn)
  }
}

/** Re-apply the basket after something unlocked (chips + Rush orders update). */
function refreshBasket() {
  quest.setBasket(myDesigns(), basket)
  renderChips()
}

function setBasket(b: Basket, fromUser = true) {
  const changed = b !== basket
  basket = b
  saveBasket(b)
  refreshBasket()
  document.querySelectorAll<HTMLButtonElement>('[data-basket]').forEach((el) => el.classList.toggle('on', el.dataset.basket === b))
  document.body.dataset.basket = b
  if (screen === 'home') refreshHome()
  if (screen === 'levels') renderMap(basket, startLevel)
  if (fromUser && changed) {
    sfx.unlock()
    sfx.pop()
    if (screen === 'home') resetScene()
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-basket]').forEach((el) => {
  el.onclick = () => setBasket(el.dataset.basket as Basket)
})

window.addEventListener('keydown', (e) => {
  if (screen !== 'game') return
  if (e.key === 'k') setMode(mode === 'knife' ? 'play' : 'knife')
  if (e.key === 's') setMode(mode === 'scale' ? 'play' : 'scale')
  if (e.key === ' ') {
    e.preventDefault()
    shake()
  }
  if (e.key === 'Escape') setMode('play')
  if (e.key === 'g') document.getElementById('btn-gravity')!.click()
})

// dev-only helper for testing (not included in the built game)
if (import.meta.env.DEV) {
  ;(window as unknown as { __jelly: unknown }).__jelly = {
    centers: () => bodies.map((b) => ({ id: b.design.id, x: Math.round(b.cx), y: Math.round(b.cy) })),
    step: (n: number) => {
      for (let i = 0; i < n; i++) step()
    },
    save,
    finish: (won: boolean) => quest.end(won),
  }
}

// keep the hearts timer, coin pills and badges fresh
onProgress(() => renderStatus())
setInterval(() => {
  refreshHearts()
  renderStatus()
  if (screen === 'game') checkBadges()
}, 1000)

window.addEventListener('resize', () => {
  resize()
  if (screen === 'levels') renderMap(basket, startLevel)
})
resize()
setMode('play')
setSoft(true)
refreshHearts()
setBasket(basket, false)
applyBackground()
resetScene()
showScreen('home')
requestAnimationFrame(frame)
