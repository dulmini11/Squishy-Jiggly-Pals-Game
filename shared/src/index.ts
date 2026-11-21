// Shared data model for Squishy Jiggly Pals.
// The game writes these documents to Firebase (Firestore); the dashboard reads them.
// Keep this file free of browser- or Node-only code so both apps can import it.

export const COLLECTIONS = {
  /** One document per calendar day: totals for everyone. */
  days: 'days',
  /** Sub-collection days/{day}/players/{uid}: who played that day (for daily active players). */
  dayPlayers: 'players',
  /** One document per player (anonymous id). */
  players: 'players',
  /** One document per level: plays, wins, losses, stars. */
  levels: 'levels',
  /** Best Rush score per player (public leaderboard). */
  rush: 'rush',
} as const

export type Platform = 'web' | 'android' | 'ios'
export type World = 'fruit' | 'veggie' | 'both'

/** Per-jelly counts inside a day. */
export type JellyCounts = { cut: number; chop: number }

/** days/{YYYY-MM-DD} */
export type DayDoc = {
  sessions: number // game opened
  cuts: number // knife cuts
  chops: number // chops
  eats: number
  wins: number // levels won
  losses: number // levels lost
  rushGames: number
  rushScoreSum: number
  coinsEarned: number
  jelly: Record<string, JellyCounts>
  updatedAt?: unknown
}

/** players/{uid} */
export type PlayerDoc = {
  name: string
  platform: Platform
  firstSeen: unknown
  lastSeen: unknown
  level: number // player level (XP)
  coins: number
  cuts: number
  chops: number
  levelsWon: number
  bestRush: number
}

/** levels/{world}_{index} */
export type LevelDoc = {
  world: World
  index: number // 0-based
  name: string
  plays: number
  wins: number
  losses: number
  starsSum: number // sum of stars on wins → average = starsSum / wins
  secondsLeftSum: number // on wins
}

/** rush/{uid} */
export type RushDoc = { name: string; score: number; at: unknown }

/** "2026-11-16" in the player's local time. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const levelId = (world: World, index: number) => `${world}_${index}`

/** A friendly public name made from an anonymous id, e.g. "Jiggly Kiwi 4821". */
export function palName(uid: string) {
  const a = ['Jiggly', 'Squishy', 'Wobbly', 'Bouncy', 'Sparkly', 'Happy', 'Sleepy', 'Zippy']
  const b = ['Kiwi', 'Carrot', 'Berry', 'Mushroom', 'Lemon', 'Tomato', 'Melon', 'Onion']
  let h = 0
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `${a[h % a.length]} ${b[(h >> 3) % b.length]} ${1000 + (h % 9000)}`
}

/** Display names for jelly ids (dashboard labels). */
export const JELLY_NAMES: Record<string, string> = {
  kiwi: 'Kiwi',
  lemon: 'Lemon',
  orange: 'Orange',
  lime: 'Lime',
  wedge: 'Watermelon',
  melonRound: 'Melon Slice',
  strawberry: 'Strawberry',
  blueberry: 'Blueberry',
  tulip: 'Tulip Bud',
  blossom: 'Blossom',
  mushroom: 'Mushroom',
  carrot: 'Carrot',
  tomato: 'Tomato',
  cucumber: 'Cucumber',
  eggplant: 'Eggplant',
  onion: 'Onion',
  leek: 'Leek',
  beetroot: 'Beetroot',
}

export const WORLD_NAMES: Record<World, string> = { fruit: 'Fruit Island', veggie: 'Veggie Valley', both: 'Picnic Park' }

/** Firebase web config, read from env vars by each app (VITE_… in the game, NEXT_PUBLIC_… in the dashboard). */
export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

export const isConfigured = (c: Partial<FirebaseWebConfig>) => Boolean(c.apiKey && c.projectId && c.appId)
