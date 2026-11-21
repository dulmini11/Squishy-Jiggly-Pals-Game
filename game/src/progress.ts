// The player's saved progress: coins, XP + player level, hearts, stats,
// unlocked jellies and shop items. Everything lives in one localStorage entry.

export const MAX_HEARTS = 3
export const HEART_REFILL_MS = 20 * 60 * 1000 // one heart comes back every 20 minutes
export const MAX_PLAYER_LEVEL = 20

/** Jellies the player starts with; the rest unlock by levelling up (or meeting them on the map). */
export const STARTER_JELLIES = ['carrot', 'mushroom', 'tomato', 'kiwi', 'lemon', 'strawberry']

/** Which player level unlocks each other jelly. */
export const UNLOCK_AT: Record<string, number> = {
  orange: 2,
  cucumber: 2,
  wedge: 3,
  onion: 3,
  blueberry: 4,
  eggplant: 5,
  lime: 5,
  leek: 6,
  melonRound: 7,
  tulip: 8,
  beetroot: 9,
  blossom: 10,
}

export type Stats = {
  slices: number
  eaten: number
  wobbles: number
  flings: number
  orders: number
  levelsWon: number
  rushGames: number
  bestRush: number
  bestCombo: number
  bestCut: number // most jellies cut in one swipe
  bought: number
  coinsEarned: number
  slicedBy: Record<string, number> // per jelly id
}

export type Save = {
  coins: number
  xp: number // xp inside the current player level
  level: number
  hearts: number
  heartClock: number // when the next heart started refilling
  stats: Stats
  unlocked: string[] // jelly ids
  owned: string[] // shop item ids
  equipped: { knife: string; bg: string; hat: string }
  badges: string[] // earned badge ids
  /** Per day ("YYYY-MM-DD", local time) → per jelly → [knife cuts, chops]. Kept for 35 days. */
  daily: Record<string, Record<string, [number, number]>>
}

const KEY = 'squishy-save-v1'

const fresh = (): Save => ({
  coins: 50,
  xp: 0,
  level: 1,
  hearts: MAX_HEARTS,
  heartClock: Date.now(),
  stats: {
    slices: 0,
    eaten: 0,
    wobbles: 0,
    flings: 0,
    orders: 0,
    levelsWon: 0,
    rushGames: 0,
    bestRush: 0,
    bestCombo: 0,
    bestCut: 0,
    bought: 0,
    coinsEarned: 0,
    slicedBy: {},
  },
  unlocked: [...STARTER_JELLIES],
  owned: ['knife-classic', 'bg-milk', 'hat-none'],
  equipped: { knife: 'knife-classic', bg: 'bg-milk', hat: 'hat-none' },
  badges: [],
  daily: {},
})

function load(): Save {
  const base = fresh()
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return base
    return {
      ...base,
      ...raw,
      stats: { ...base.stats, ...(raw.stats || {}), slicedBy: { ...(raw.stats?.slicedBy || {}) } },
      equipped: { ...base.equipped, ...(raw.equipped || {}) },
      unlocked: Array.from(new Set([...base.unlocked, ...(raw.unlocked || [])])),
      owned: Array.from(new Set([...base.owned, ...(raw.owned || [])])),
      badges: Array.isArray(raw.badges) ? raw.badges : [],
      daily: raw.daily && typeof raw.daily === 'object' ? raw.daily : {},
    }
  } catch {
    return base
  }
}

export const save: Save = load()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    /* private mode: progress lasts until the tab closes */
  }
}

// ---------- listeners (the UI redraws its coin / heart / level pills) ----------
type Listener = () => void
const listeners: Listener[] = []
export function onProgress(fn: Listener) {
  listeners.push(fn)
}
function changed() {
  persist()
  for (const fn of listeners) fn()
}

// ---------- coins ----------
export function addCoins(n: number) {
  if (n <= 0) return
  save.coins += n
  save.stats.coinsEarned += n
  changed()
}

export function spendCoins(n: number): boolean {
  if (save.coins < n) return false
  save.coins -= n
  changed()
  return true
}

// ---------- XP + player level ----------
export const xpToNext = (level: number) => 80 + (level - 1) * 45

export type LevelUp = { level: number; newJellies: string[] }

/** Adds XP. Returns every level-up that happened (usually none or one). */
export function addXp(n: number): LevelUp[] {
  const ups: LevelUp[] = []
  if (n <= 0 || save.level >= MAX_PLAYER_LEVEL) return ups
  save.xp += n
  while (save.level < MAX_PLAYER_LEVEL && save.xp >= xpToNext(save.level)) {
    save.xp -= xpToNext(save.level)
    save.level++
    const newJellies = Object.entries(UNLOCK_AT)
      .filter(([id, lv]) => lv === save.level && !save.unlocked.includes(id))
      .map(([id]) => id)
    save.unlocked.push(...newJellies)
    ups.push({ level: save.level, newJellies })
  }
  if (save.level >= MAX_PLAYER_LEVEL) save.xp = 0
  changed()
  return ups
}

/** Meeting a jelly on the map unlocks it early. Returns true if it was new. */
export function unlockJelly(id: string): boolean {
  if (save.unlocked.includes(id)) return false
  save.unlocked.push(id)
  changed()
  return true
}

export const isUnlockedJelly = (id: string) => save.unlocked.includes(id)

// ---------- hearts ----------
/** Adds back any hearts that have refilled while the game was closed. */
export function refreshHearts() {
  if (save.hearts >= MAX_HEARTS) {
    save.heartClock = Date.now()
    return
  }
  const gained = Math.floor((Date.now() - save.heartClock) / HEART_REFILL_MS)
  if (gained > 0) {
    save.hearts = Math.min(MAX_HEARTS, save.hearts + gained)
    save.heartClock += gained * HEART_REFILL_MS
    if (save.hearts >= MAX_HEARTS) save.heartClock = Date.now()
    changed()
  }
}

/** Milliseconds until the next heart, or 0 when full. */
export function nextHeartIn(): number {
  if (save.hearts >= MAX_HEARTS) return 0
  return Math.max(0, HEART_REFILL_MS - (Date.now() - save.heartClock))
}

export function loseHeart() {
  refreshHearts()
  if (save.hearts <= 0) return
  if (save.hearts === MAX_HEARTS) save.heartClock = Date.now() // the refill timer starts now
  save.hearts--
  changed()
}

export function refillHearts() {
  save.hearts = MAX_HEARTS
  save.heartClock = Date.now()
  changed()
}

// ---------- stats ----------
export function bump(stat: Exclude<keyof Stats, 'slicedBy'>, by = 1) {
  save.stats[stat] += by
  changed()
}

export function best(stat: 'bestRush' | 'bestCombo' | 'bestCut', value: number) {
  if (value > save.stats[stat]) {
    save.stats[stat] = value
    changed()
  }
}

/** Local calendar day, e.g. "2026-11-09". */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const KEEP_DAYS = 35

export function recordSlice(jellyId: string, tool: 'cut' | 'chop' = 'cut') {
  save.stats.slices++
  save.stats.slicedBy[jellyId] = (save.stats.slicedBy[jellyId] || 0) + 1
  const today = dayKey()
  const day = (save.daily[today] ??= {})
  const counts = (day[jellyId] ??= [0, 0])
  counts[tool === 'chop' ? 1 : 0]++
  // forget days older than 5 weeks so the save stays small
  const keys = Object.keys(save.daily)
  if (keys.length > KEEP_DAYS) for (const k of keys.sort().slice(0, keys.length - KEEP_DAYS)) delete save.daily[k]
  changed()
}

// ---------- shop ----------
export const owns = (id: string) => save.owned.includes(id)

export function buy(id: string, price: number): boolean {
  if (owns(id)) return true
  if (!spendCoins(price)) return false
  save.owned.push(id)
  save.stats.bought++
  changed()
  return true
}

export function equip(slot: keyof Save['equipped'], id: string) {
  if (!owns(id)) return
  save.equipped[slot] = id
  changed()
}

// ---------- badges ----------
export function earnBadge(id: string): boolean {
  if (save.badges.includes(id)) return false
  save.badges.push(id)
  changed()
  return true
}
