// Shop catalog: knife skins (the slice trail), backgrounds and hats for the jellies.

export type Knife = { id: string; name: string; price: number; minLevel?: number; colors: string[]; glow: string; sparkle?: string }
export type Background = { id: string; name: string; price: number; minLevel?: number; bg1: string; bg2: string; pattern?: string; dark?: boolean }
export type Hat = { id: string; name: string; price: number; minLevel?: number; icon: string; draw?: (ctx: CanvasRenderingContext2D, s: number) => void }

export const KNIVES: Knife[] = [
  { id: 'knife-classic', name: 'Classic', price: 0, colors: ['#ffffff'], glow: 'rgba(120,200,255,0.9)' },
  { id: 'knife-candy', name: 'Candy', price: 120, colors: ['#ff7aa8', '#ffffff'], glow: 'rgba(255,120,170,0.9)' },
  { id: 'knife-fire', name: 'Fire', price: 160, colors: ['#ffd23f', '#ff7a1a', '#ff3d3d'], glow: 'rgba(255,120,30,0.95)', sparkle: '#ffd23f' },
  { id: 'knife-ice', name: 'Ice', price: 160, colors: ['#e9fbff', '#8fe3ff'], glow: 'rgba(110,220,255,0.95)', sparkle: '#ffffff' },
  { id: 'knife-rainbow', name: 'Rainbow', price: 240, minLevel: 3, colors: ['#ff5f6d', '#ffb24a', '#ffe14a', '#5fd47a', '#4ab6ff', '#a66bff'], glow: 'rgba(255,255,255,0.9)' },
  { id: 'knife-galaxy', name: 'Galaxy', price: 350, minLevel: 6, colors: ['#c49bff', '#6a5cff', '#2a1e6b'], glow: 'rgba(150,110,255,0.95)', sparkle: '#ffffff' },
  { id: 'knife-gold', name: 'Golden', price: 600, minLevel: 10, colors: ['#fff3b0', '#ffc83d', '#e09a00'], glow: 'rgba(255,200,60,0.95)', sparkle: '#fff3b0' },
]

export const BACKGROUNDS: Background[] = [
  { id: 'bg-milk', name: 'Milk', price: 0, bg1: '#fbfbfd', bg2: '#e3e4ea' },
  { id: 'bg-mint', name: 'Mint', price: 80, bg1: '#f3fff8', bg2: '#c7eedb' },
  { id: 'bg-peach', name: 'Peach', price: 100, bg1: '#fff4ea', bg2: '#ffd3c2' },
  { id: 'bg-sky', name: 'Sky', price: 120, bg1: '#f2fbff', bg2: '#bfe6ff' },
  {
    id: 'bg-picnic',
    name: 'Picnic',
    price: 200,
    minLevel: 2,
    bg1: '#fff7f7',
    bg2: '#ffe3e3',
    pattern:
      'repeating-linear-gradient(0deg, rgba(255,90,110,0.13) 0 36px, transparent 36px 72px), repeating-linear-gradient(90deg, rgba(255,90,110,0.13) 0 36px, transparent 36px 72px)',
  },
  {
    id: 'bg-candy',
    name: 'Candy',
    price: 220,
    minLevel: 4,
    bg1: '#fff6fb',
    bg2: '#ffe0f0',
    pattern: 'repeating-linear-gradient(135deg, rgba(255,140,190,0.14) 0 22px, rgba(140,220,255,0.12) 22px 44px, transparent 44px 66px)',
  },
  { id: 'bg-night', name: 'Night', price: 260, minLevel: 5, bg1: '#34385a', bg2: '#12132a', dark: true },
  {
    id: 'bg-space',
    name: 'Space',
    price: 450,
    minLevel: 8,
    bg1: '#2b2357',
    bg2: '#0b0a1f',
    dark: true,
    pattern: 'radial-gradient(circle at 20% 30%, #fff 0 1.2px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 0 1px, transparent 2px), radial-gradient(circle at 45% 85%, #ffe9a8 0 1.4px, transparent 2px)',
  },
]

// ---------- hats (drawn on the canvas; origin = top of the jelly's head, size s ≈ head width) ----------
const TAU = Math.PI * 2

function partyHat(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(-s * 0.32, 0)
  ctx.lineTo(0, -s * 0.85)
  ctx.lineTo(s * 0.32, 0)
  ctx.closePath()
  const g = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0)
  g.addColorStop(0, '#7a8cff')
  g.addColorStop(1, '#a66bff')
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = '#ffe14a'
  ctx.lineWidth = s * 0.08
  for (const y of [-0.2, -0.45, -0.7]) {
    ctx.beginPath()
    ctx.moveTo(-s, s * y + s * 0.12)
    ctx.lineTo(s, s * y - s * 0.12)
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = '#ff5f9c'
  ctx.beginPath()
  ctx.arc(0, -s * 0.88, s * 0.1, 0, TAU)
  ctx.fill()
}

function bow(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#ff5f9c'
  for (const d of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.12)
    ctx.quadraticCurveTo(d * s * 0.5, -s * 0.55, d * s * 0.45, -s * 0.02)
    ctx.quadraticCurveTo(d * s * 0.3, s * 0.08, 0, -s * 0.12)
    ctx.fill()
  }
  ctx.fillStyle = '#ff8fbf'
  ctx.beginPath()
  ctx.arc(0, -s * 0.12, s * 0.1, 0, TAU)
  ctx.fill()
}

function chefHat(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#d9dce6'
  ctx.lineWidth = s * 0.03
  ctx.beginPath()
  ctx.roundRect(-s * 0.3, -s * 0.28, s * 0.6, s * 0.28, s * 0.05)
  ctx.fill()
  ctx.stroke()
  for (const [x, y, r] of [
    [-0.24, -0.45, 0.2],
    [0.24, -0.45, 0.2],
    [0, -0.58, 0.24],
  ]) {
    ctx.beginPath()
    ctx.arc(s * x, s * y, s * r, 0, TAU)
    ctx.fill()
    ctx.stroke()
  }
}

function crown(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(-s * 0.36, 0)
  ctx.lineTo(-s * 0.4, -s * 0.42)
  ctx.lineTo(-s * 0.18, -s * 0.22)
  ctx.lineTo(0, -s * 0.5)
  ctx.lineTo(s * 0.18, -s * 0.22)
  ctx.lineTo(s * 0.4, -s * 0.42)
  ctx.lineTo(s * 0.36, 0)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, -s * 0.5, 0, 0)
  g.addColorStop(0, '#fff3b0')
  g.addColorStop(1, '#ffb800')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = '#d99100'
  ctx.lineWidth = s * 0.03
  ctx.stroke()
  const gems: [number, string][] = [
    [-0.2, '#ff3d6e'],
    [0, '#4ab6ff'],
    [0.2, '#5fd47a'],
  ]
  for (const [x, c] of gems) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(s * x, -s * 0.1, s * 0.055, 0, TAU)
    ctx.fill()
  }
}

function flowerCrown(ctx: CanvasRenderingContext2D, s: number) {
  const cols = ['#ff8fbf', '#ffe14a', '#ffffff', '#ffb04a', '#c49bff']
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * s * 0.17
    const y = -s * 0.08 - Math.cos(((i - 2) / 2) * 1.1) * s * 0.06
    ctx.fillStyle = cols[i]
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * s * 0.055, y + Math.sin(a) * s * 0.055, s * 0.05, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = '#ffb800'
    ctx.beginPath()
    ctx.arc(x, y, s * 0.035, 0, TAU)
    ctx.fill()
  }
}

function topHat(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#2b2b33'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.03, s * 0.42, s * 0.08, 0, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(-s * 0.25, -s * 0.62, s * 0.5, s * 0.6, s * 0.05)
  ctx.fill()
  ctx.fillStyle = '#ff5f9c'
  ctx.fillRect(-s * 0.25, -s * 0.2, s * 0.5, s * 0.1)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(-s * 0.18, -s * 0.58, s * 0.06, s * 0.34)
}

function beanie(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#4ab6ff'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.12, s * 0.38, s * 0.34, 0, Math.PI, TAU)
  ctx.fill()
  ctx.fillStyle = '#2e8fd6'
  ctx.beginPath()
  ctx.roundRect(-s * 0.4, -s * 0.16, s * 0.8, s * 0.16, s * 0.06)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, -s * 0.5, s * 0.1, 0, TAU)
  ctx.fill()
}

function halo(ctx: CanvasRenderingContext2D, s: number) {
  ctx.save()
  ctx.shadowColor = 'rgba(255,220,90,0.9)'
  ctx.shadowBlur = s * 0.25
  ctx.strokeStyle = '#ffd84a'
  ctx.lineWidth = s * 0.07
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.3, s * 0.3, s * 0.09, 0, 0, TAU)
  ctx.stroke()
  ctx.restore()
}

export const HATS: Hat[] = [
  { id: 'hat-none', name: 'No hat', price: 0, icon: '🚫' },
  { id: 'hat-bow', name: 'Bow', price: 60, icon: '🎀', draw: bow },
  { id: 'hat-party', name: 'Party', price: 80, icon: '🥳', draw: partyHat },
  { id: 'hat-beanie', name: 'Beanie', price: 100, icon: '🧢', draw: beanie },
  { id: 'hat-flower', name: 'Flowers', price: 120, minLevel: 2, icon: '🌸', draw: flowerCrown },
  { id: 'hat-chef', name: 'Chef', price: 150, minLevel: 3, icon: '🧑‍🍳', draw: chefHat },
  { id: 'hat-tophat', name: 'Top hat', price: 200, minLevel: 5, icon: '🎩', draw: topHat },
  { id: 'hat-crown', name: 'Crown', price: 400, minLevel: 7, icon: '👑', draw: crown },
  { id: 'hat-halo', name: 'Halo', price: 500, minLevel: 9, icon: '😇', draw: halo },
]

export const knifeById = (id: string) => KNIVES.find((k) => k.id === id) ?? KNIVES[0]
export const bgById = (id: string) => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]
export const hatById = (id: string) => HATS.find((h) => h.id === id) ?? HATS[0]

/** Emoji used for each jelly in menus, badges and unlock popups. */
export const JELLY_EMOJI: Record<string, string> = {
  kiwi: '🥝',
  lemon: '🍋',
  orange: '🍊',
  lime: '🍈',
  wedge: '🍉',
  melonRound: '🍉',
  strawberry: '🍓',
  blueberry: '🫐',
  tulip: '🌷',
  blossom: '🌸',
  mushroom: '🍄',
  carrot: '🥕',
  tomato: '🍅',
  cucumber: '🥒',
  eggplant: '🍆',
  onion: '🧅',
  leek: '🥬',
  beetroot: '🟣',
}
