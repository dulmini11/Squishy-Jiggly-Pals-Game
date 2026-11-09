// Level definitions (one track per basket) + saved star progress.
import { DESIGNS, FRUITS, type Design } from './art.ts'
import { VEGGIES } from './veggies.ts'

export type TaskKind = 'slice' | 'eat' | 'wobble' | 'grow' | 'shrink' | 'fling'
export type TaskSpec = { kind: TaskKind; ids: string[]; label: string; n: number }
export type Basket = 'fruit' | 'veggie' | 'both'

/** A level's special rule. */
export type Twist = 'none' | 'night' | 'wind' | 'ice' | 'bubbles'

export type Level = {
  name: string
  emoji: string
  time: number // seconds
  pool: string[] // design ids that appear on the table
  gravity?: boolean
  tasks: TaskSpec[]
  /** Filled in below: the level's place, look and twist. */
  twist?: Twist
  place?: Place
}

/** How a level looks while you play it: its own colours and floating decorations. */
export type Place = { bg1: string; bg2: string; decor: string[]; ground: string }

export const TWIST_INFO: Record<Twist, { icon: string; label: string; tip: string }> = {
  none: { icon: '', label: '', tip: '' },
  night: { icon: '🌙', label: 'Night', tip: 'It is dark! Only the spot around your finger is lit.' },
  wind: { icon: '🍃', label: 'Windy', tip: 'A breeze pushes the jellies left and right.' },
  ice: { icon: '🧊', label: 'Icy', tip: 'Slippery! Jellies keep sliding.' },
  bubbles: { icon: '🫧', label: 'Floaty', tip: 'The jellies float up like bubbles.' },
}

export const WORLDS: Record<Basket, { name: string; emoji: string; water1: string; water2: string }> = {
  fruit: { name: 'Fruit Island', emoji: '🏝️', water1: '#8fe6ff', water2: '#3fb8e6' },
  veggie: { name: 'Veggie Valley', emoji: '🌄', water1: '#b9f0b4', water2: '#5cc08a' },
  both: { name: 'Picnic Park', emoji: '🧺', water1: '#ffd6e6', water2: '#ff9cc0' },
}

const t = (kind: TaskKind, ids: string | string[], label: string, n = 1): TaskSpec => ({
  kind,
  ids: Array.isArray(ids) ? ids : [ids],
  label,
  n,
})

const VEG = VEGGIES.map((d) => d.id)
const FRUIT = FRUITS.map((d) => d.id)
const ALL = DESIGNS.map((d) => d.id)
const CITRUS = ['lemon', 'orange', 'lime']
const MELON = ['wedge', 'melonRound']

export const BASKETS: Record<Basket, { label: string; emoji: string; designs: Design[]; scene: string[] }> = {
  fruit: {
    label: 'Fruits',
    emoji: '🍓',
    designs: FRUITS,
    scene: ['kiwi', 'strawberry', 'lemon', 'wedge', 'tulip', 'orange', 'blueberry', 'blossom', 'melonRound', 'lime', 'strawberry'],
  },
  veggie: {
    label: 'Veggies',
    emoji: '🥕',
    designs: VEGGIES,
    scene: ['mushroom', 'carrot', 'beetroot', 'onion', 'leek', 'tomato', 'eggplant', 'cucumber', 'mushroom', 'beetroot', 'onion'],
  },
  both: {
    label: 'Both',
    emoji: '🥗',
    designs: DESIGNS,
    scene: ['mushroom', 'kiwi', 'carrot', 'strawberry', 'beetroot', 'wedge', 'onion', 'lemon', 'leek', 'blossom', 'tomato'],
  },
}

export const TRACKS: Record<Basket, Level[]> = {
  veggie: [
    { name: 'First Chop', emoji: '🥕', time: 60, pool: ['carrot', 'mushroom', 'tomato'], tasks: [t('slice', 'carrot', 'a Carrot'), t('slice', 'mushroom', 'a Mushroom'), t('slice', 'tomato', 'a Tomato')] },
    { name: 'Mushroom Patch', emoji: '🍄', time: 60, pool: ['mushroom', 'onion', 'mushroom'], tasks: [t('slice', 'mushroom', 'Mushrooms', 3), t('wobble', 'onion', 'the Onion', 3), t('eat', 'mushroom', 'a Mushroom')] },
    {
      name: 'Salad Bowl',
      emoji: '🥗',
      time: 60,
      pool: ['cucumber', 'tomato', 'beetroot', 'carrot'],
      tasks: [t('slice', 'cucumber', 'Cucumbers', 2), t('slice', 'tomato', 'Tomatoes', 2), t('eat', 'beetroot', 'a Beetroot'), t('slice', 'carrot', 'Carrots', 2)],
    },
    {
      name: 'Giant Garden',
      emoji: '🍆',
      time: 55,
      pool: ['eggplant', 'tomato', 'carrot', 'mushroom'],
      tasks: [t('grow', 'eggplant', 'an Eggplant'), t('shrink', 'carrot', 'a Carrot'), t('grow', 'mushroom', 'a Mushroom'), t('slice', 'tomato', 'Tomatoes', 2)],
    },
    {
      name: 'Veggie Rain',
      emoji: '🌧️',
      time: 55,
      gravity: true,
      pool: ['carrot', 'tomato', 'cucumber', 'leek'],
      tasks: [t('slice', VEG, 'Veggies', 4), t('fling', 'leek', 'a Leek'), t('eat', 'cucumber', 'a Cucumber')],
    },
    {
      name: 'Soup Rush',
      emoji: '🍲',
      time: 50,
      pool: ['carrot', 'mushroom', 'onion', 'leek', 'eggplant'],
      tasks: [t('slice', 'carrot', 'Carrots', 3), t('slice', 'leek', 'Leeks', 2), t('slice', 'mushroom', 'Mushrooms', 2), t('eat', 'onion', 'Onions', 2)],
    },
    { name: 'Big Chop', emoji: '🔪', time: 50, pool: VEG, tasks: [t('slice', VEG, 'any Veggie', 12)] },
    {
      name: 'Veggie Master',
      emoji: '👑',
      time: 65,
      gravity: true,
      pool: VEG,
      tasks: [
        t('slice', VEG, 'Veggies', 6),
        t('grow', 'tomato', 'a Tomato'),
        t('fling', 'carrot', 'a Carrot'),
        t('eat', 'mushroom', 'Mushrooms', 2),
        t('shrink', 'eggplant', 'an Eggplant'),
        t('wobble', 'beetroot', 'the Beetroot', 4),
      ],
    },
  ],

  fruit: [
    { name: 'Fruit Starter', emoji: '🥝', time: 60, pool: ['kiwi', 'lemon', 'strawberry'], tasks: [t('slice', 'kiwi', 'a Kiwi'), t('slice', 'lemon', 'a Lemon'), t('slice', 'strawberry', 'a Strawberry')] },
    { name: 'Citrus Squeeze', emoji: '🍋', time: 60, pool: CITRUS, tasks: [t('slice', CITRUS, 'Citrus', 3), t('eat', 'orange', 'an Orange'), t('wobble', 'lime', 'the Lime', 3)] },
    { name: 'Melon Party', emoji: '🍉', time: 60, pool: ['wedge', 'melonRound', 'kiwi'], tasks: [t('slice', MELON, 'Melons', 3), t('eat', 'kiwi', 'a Kiwi'), t('fling', 'melonRound', 'a Melon Slice')] },
    {
      name: 'Berry Blitz',
      emoji: '🍓',
      time: 55,
      pool: ['strawberry', 'blueberry', 'blossom', 'tulip'],
      tasks: [t('slice', 'strawberry', 'Strawberries', 3), t('eat', 'blueberry', 'Blueberries', 2), t('fling', 'blossom', 'a Blossom'), t('wobble', 'tulip', 'the Tulip', 4)],
    },
    {
      name: 'Flower Garden',
      emoji: '🌷',
      time: 55,
      pool: ['tulip', 'blossom', 'strawberry'],
      tasks: [t('grow', 'blossom', 'a Blossom'), t('shrink', 'tulip', 'a Tulip'), t('slice', 'blossom', 'Blossoms', 2), t('eat', 'strawberry', 'a Strawberry')],
    },
    {
      name: 'Fruit Rain',
      emoji: '🌧️',
      time: 55,
      gravity: true,
      pool: ['kiwi', 'orange', 'wedge', 'strawberry', 'lemon'],
      tasks: [t('slice', FRUIT, 'Fruits', 5), t('fling', 'kiwi', 'a Kiwi'), t('eat', 'lemon', 'a Lemon')],
    },
    { name: 'Juice Bar', emoji: '🧃', time: 50, pool: FRUIT, tasks: [t('slice', FRUIT, 'any Fruit', 12)] },
    {
      name: 'Fruit Master',
      emoji: '👑',
      time: 65,
      gravity: true,
      pool: FRUIT,
      tasks: [
        t('slice', CITRUS, 'Citrus', 3),
        t('slice', MELON, 'Melons', 2),
        t('grow', 'kiwi', 'a Kiwi'),
        t('fling', 'strawberry', 'a Strawberry'),
        t('eat', 'blueberry', 'Blueberries', 2),
        t('shrink', 'lemon', 'a Lemon'),
      ],
    },
  ],

  both: [
    { name: 'Market Day', emoji: '🧺', time: 60, pool: ['carrot', 'kiwi', 'tomato', 'lemon'], tasks: [t('slice', 'carrot', 'a Carrot'), t('slice', 'kiwi', 'a Kiwi'), t('slice', 'tomato', 'a Tomato'), t('eat', 'lemon', 'a Lemon')] },
    {
      name: 'Picnic',
      emoji: '🧃',
      time: 60,
      pool: ['strawberry', 'cucumber', 'wedge', 'mushroom'],
      tasks: [t('slice', 'strawberry', 'Strawberries', 2), t('slice', 'cucumber', 'Cucumbers', 2), t('eat', 'mushroom', 'a Mushroom'), t('wobble', 'wedge', 'the Watermelon', 3)],
    },
    {
      name: 'Salad & Fruit',
      emoji: '🥗',
      time: 60,
      pool: ['cucumber', 'tomato', 'orange', 'blueberry', 'beetroot'],
      tasks: [t('slice', ['cucumber', 'tomato'], 'Salad veggies', 3), t('slice', ['orange', 'blueberry'], 'Fruits', 2), t('eat', 'beetroot', 'a Beetroot')],
    },
    {
      name: 'Giant Garden',
      emoji: '🍆',
      time: 55,
      pool: ['eggplant', 'melonRound', 'carrot', 'lemon'],
      tasks: [t('grow', 'eggplant', 'an Eggplant'), t('shrink', 'lemon', 'a Lemon'), t('grow', 'melonRound', 'a Melon Slice'), t('slice', 'carrot', 'Carrots', 2)],
    },
    {
      name: 'Falling Feast',
      emoji: '🌧️',
      time: 55,
      gravity: true,
      pool: ['carrot', 'tomato', 'cucumber', 'lemon', 'kiwi'],
      tasks: [t('slice', ['carrot', 'tomato', 'cucumber'], 'Veggies', 4), t('fling', 'kiwi', 'a Kiwi'), t('eat', 'lemon', 'a Lemon')],
    },
    {
      name: 'Smoothie & Soup',
      emoji: '🍲',
      time: 55,
      pool: ['carrot', 'mushroom', 'strawberry', 'orange', 'onion'],
      tasks: [
        t('slice', 'carrot', 'Carrots', 2),
        t('slice', 'strawberry', 'Strawberries', 2),
        t('slice', 'mushroom', 'Mushrooms', 2),
        t('eat', 'orange', 'an Orange'),
        t('eat', 'onion', 'an Onion'),
      ],
    },
    { name: 'Big Chop', emoji: '🔪', time: 55, pool: ALL, tasks: [t('slice', VEG, 'Veggies', 6), t('slice', FRUIT, 'Fruits', 6)] },
    {
      name: 'Master Chef',
      emoji: '👑',
      time: 70,
      gravity: true,
      pool: ALL,
      tasks: [
        t('slice', VEG, 'Veggies', 5),
        t('slice', FRUIT, 'Fruits', 4),
        t('grow', 'tomato', 'a Tomato'),
        t('fling', 'carrot', 'a Carrot'),
        t('eat', 'mushroom', 'Mushrooms', 2),
        t('shrink', 'eggplant', 'an Eggplant'),
      ],
    },
  ],
}

// ---------- each level's own place + twist ----------
const P = (bg1: string, bg2: string, ground: string, ...decor: string[]): Place => ({ bg1, bg2, ground, decor })

const EXTRAS: Record<Basket, [Twist, Place][]> = {
  veggie: [
    ['none', P('#f4fff0', '#cdeec0', '#7cc768', '🌱', '🦋')],
    ['night', P('#2d2b4a', '#141325', '#4a3f6b', '✨', '🌙')],
    ['none', P('#fffaf0', '#e8f5d0', '#9ad46e', '🥗', '🌿')],
    ['none', P('#f6fff2', '#d7f0c4', '#6fbf5a', '🌻', '🐝')],
    ['none', P('#eef5ff', '#c9dcf2', '#8aa9c9', '💧', '☁️')],
    ['bubbles', P('#fff6ea', '#ffd9b0', '#e79a5a', '🫧', '🍲')],
    ['wind', P('#fff9ef', '#f0e1c4', '#c9a26b', '🍃', '🔪')],
    ['ice', P('#f2fbff', '#cfeeff', '#8fd3f2', '❄️', '👑')],
  ],
  fruit: [
    ['none', P('#f3fffb', '#c9f2e4', '#5fcfa8', '🌴', '🐚')],
    ['none', P('#fffde8', '#fff0a8', '#f2c94c', '🍋', '☀️')],
    ['wind', P('#f0fbff', '#bfe9ff', '#f3d39a', '🌊', '⛱️')],
    ['night', P('#2c2346', '#120f24', '#5a3f7a', '✨', '🫐')],
    ['bubbles', P('#fff3f8', '#ffd0e4', '#ff9cc0', '🌸', '🦋')],
    ['none', P('#eef5ff', '#c9dcf2', '#8aa9c9', '💧', '🌈')],
    ['ice', P('#f2fbff', '#d3f1ff', '#9ad8f2', '🧊', '🥤')],
    ['wind', P('#fff8ee', '#ffe2c2', '#ffb36b', '🍹', '👑')],
  ],
  both: [
    ['none', P('#fff8f0', '#ffe2cc', '#f0a868', '🧺', '🌼')],
    ['wind', P('#f5fff2', '#d6f5c9', '#86d06a', '🪁', '🍃')],
    ['night', P('#2b2a48', '#121224', '#46406e', '✨', '🏮')],
    ['none', P('#f6fff2', '#d7f0c4', '#6fbf5a', '🌻', '🐞')],
    ['none', P('#eef5ff', '#c9dcf2', '#8aa9c9', '💧', '☁️')],
    ['bubbles', P('#fff6ea', '#ffd9b0', '#e79a5a', '🫧', '🥤')],
    ['ice', P('#f2fbff', '#cfeeff', '#8fd3f2', '❄️', '🔪')],
    ['wind', P('#fff3f8', '#ffd6e6', '#ff9cc0', '🎉', '👑')],
  ],
}

for (const b of Object.keys(TRACKS) as Basket[]) {
  TRACKS[b].forEach((lv, i) => {
    const [twist, place] = EXTRAS[b][i] ?? ['none', P('#fbfbfd', '#e3e4ea', '#cfd2dc')]
    lv.twist = twist
    lv.place = place
  })
}

export function taskText(s: TaskSpec): string {
  const times = s.n > 1 ? ` ×${s.n}` : ''
  switch (s.kind) {
    case 'slice':
      return `🔪 Slice ${s.label}${times}`
    case 'eat':
      return `😋 Eat ${s.label}${times}  (double-tap)`
    case 'wobble':
      return `🫳 Wobble ${s.label}${times}`
    case 'grow':
      return `🔍 Make ${s.label} GIANT`
    case 'shrink':
      return `🤏 Shrink ${s.label} tiny`
    case 'fling':
      return `💨 Fling ${s.label} fast!`
  }
}

export function starsFor(level: Level, timeLeft: number) {
  const f = timeLeft / level.time
  return f >= 0.45 ? 3 : f >= 0.2 ? 2 : 1
}

// ---------- saved choices & progress ----------
const BASKET_KEY = 'jelly-orchard-basket'
const starsKey = (b: Basket) => `jelly-orchard-levels-${b}`

export function loadBasket(): Basket {
  const v = localStorage.getItem(BASKET_KEY)
  return v === 'fruit' || v === 'veggie' || v === 'both' ? v : 'both'
}

export function saveBasket(b: Basket) {
  localStorage.setItem(BASKET_KEY, b)
}

export function loadStars(b: Basket): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(starsKey(b)) || '[]')
    return Array.isArray(v) ? v.map((n) => Number(n) || 0) : []
  } catch {
    return []
  }
}

export function saveStars(b: Basket, index: number, stars: number) {
  const all = loadStars(b)
  all[index] = Math.max(all[index] || 0, stars)
  for (let i = 0; i < all.length; i++) all[i] = all[i] || 0
  localStorage.setItem(starsKey(b), JSON.stringify(all))
}

export function isUnlocked(index: number, stars: number[]) {
  return index === 0 || (stars[index - 1] || 0) > 0
}
