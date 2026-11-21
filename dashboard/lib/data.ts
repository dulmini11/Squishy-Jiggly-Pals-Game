// Loads dashboard data from Firebase, or builds realistic demo data when Firebase isn't set up yet.
import { COLLECTIONS, JELLY_NAMES, WORLD_NAMES, dayKey, isConfigured, type DayDoc, type FirebaseWebConfig, type LevelDoc, type World } from 'shared'

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}
export const demoMode = !isConfigured(firebaseConfig)

export type DayRow = { day: string; label: string; players: number; sessions: number; cuts: number; chops: number; wins: number; losses: number; rushGames: number; coins: number }
export type LevelRow = { id: string; world: World; worldName: string; index: number; name: string; plays: number; winRate: number; avgStars: number }
export type JellyRow = { id: string; name: string; cut: number; chop: number; total: number }
export type RushRow = { name: string; score: number }
export type Dashboard = {
  days: DayRow[]
  levels: LevelRow[]
  jellies: JellyRow[]
  rush: RushRow[]
  totalPlayers: number
  platforms: { web: number; android: number; ios: number }
}

function lastDays(n: number): Date[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i)))
}
const shortLabel = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

// ---------------------------------------------------------------------------
// Demo data (deterministic, so the charts look the same on every reload)
// ---------------------------------------------------------------------------
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function demoData(range: number): Dashboard {
  const rnd = seeded(42)
  const days = lastDays(range).map((d, i): DayRow => {
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const growth = 1 + i / Math.max(10, range)
    const players = Math.round((40 + rnd() * 25) * growth * (weekend ? 1.35 : 1))
    const sessions = Math.round(players * (1.6 + rnd() * 0.6))
    const cuts = Math.round(sessions * (14 + rnd() * 6))
    const chops = Math.round(cuts * (0.45 + rnd() * 0.25))
    const wins = Math.round(sessions * 0.9)
    return { day: dayKey(d), label: shortLabel(d), players, sessions, cuts, chops, wins, losses: Math.round(wins * (0.35 + rnd() * 0.2)), rushGames: Math.round(sessions * 0.4), coins: wins * 55 }
  })
  const worlds: World[] = ['veggie', 'fruit', 'both']
  const names: Record<World, string[]> = {
    veggie: ['First Chop', 'Mushroom Patch', 'Salad Bowl', 'Giant Garden', 'Veggie Rain', 'Soup Rush', 'Big Chop', 'Veggie Master'],
    fruit: ['Fruit Starter', 'Citrus Squeeze', 'Melon Party', 'Berry Blitz', 'Flower Garden', 'Fruit Rain', 'Juice Bar', 'Fruit Master'],
    both: ['Market Day', 'Picnic', 'Salad & Fruit', 'Giant Garden', 'Falling Feast', 'Smoothie & Soup', 'Big Chop', 'Master Chef'],
  }
  const levels: LevelRow[] = []
  for (const w of worlds)
    names[w].forEach((name, index) => {
      const plays = Math.round((900 / (1 + index * 0.55)) * (w === 'veggie' ? 1.2 : w === 'fruit' ? 1 : 0.7))
      const winRate = Math.max(0.28, 0.95 - index * 0.08 - rnd() * 0.08)
      levels.push({ id: `${w}_${index}`, world: w, worldName: WORLD_NAMES[w], index, name, plays, winRate, avgStars: 1.4 + winRate * 1.5 })
    })
  const jellies = Object.keys(JELLY_NAMES)
    .map((id, i) => {
      const cut = Math.round((2600 / (1 + i * 0.35)) * (0.7 + rnd() * 0.6))
      const chop = Math.round(cut * (0.35 + rnd() * 0.5))
      return { id, name: JELLY_NAMES[id], cut, chop, total: cut + chop }
    })
    .sort((a, b) => b.total - a.total)
  const rush = Array.from({ length: 10 }, (_, i) => ({
    name: ['Jiggly Kiwi 4821', 'Squishy Carrot 1290', 'Bouncy Berry 7734', 'Happy Melon 3016', 'Zippy Onion 5582', 'Sparkly Lemon 2207', 'Wobbly Tomato 9143', 'Sleepy Mushroom 6650', 'Jiggly Berry 3378', 'Happy Kiwi 8012'][i],
    score: Math.round(2400 - i * 170 - rnd() * 80),
  }))
  return { days, levels, jellies, rush, totalPlayers: 1874, platforms: { web: 1120, android: 754, ios: 0 } }
}

// ---------------------------------------------------------------------------
// Live data from Firestore (owner login required by the security rules)
// ---------------------------------------------------------------------------
export async function loadLive(range: number): Promise<Dashboard> {
  const { getApp } = await import('firebase/app')
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(getApp())
  const dates = lastDays(range)
  const since = dayKey(dates[0])

  const daySnap = await fs.getDocs(fs.query(fs.collection(db, COLLECTIONS.days), fs.where(fs.documentId(), '>=', since)))
  const byDay = new Map<string, DayDoc>()
  daySnap.forEach((d) => byDay.set(d.id, d.data() as DayDoc))

  // daily active players = number of player docs under each day
  const counts = await Promise.all(dates.map((d) => fs.getCountFromServer(fs.collection(db, COLLECTIONS.days, dayKey(d), COLLECTIONS.dayPlayers)).then((c) => c.data().count).catch(() => 0)))

  const jellyTotals: Record<string, { cut: number; chop: number }> = {}
  const days = dates.map((d, i): DayRow => {
    const doc = byDay.get(dayKey(d))
    for (const [id, c] of Object.entries(doc?.jelly ?? {})) {
      const t = (jellyTotals[id] ??= { cut: 0, chop: 0 })
      t.cut += c.cut ?? 0
      t.chop += c.chop ?? 0
    }
    return {
      day: dayKey(d),
      label: shortLabel(d),
      players: counts[i],
      sessions: doc?.sessions ?? 0,
      cuts: doc?.cuts ?? 0,
      chops: doc?.chops ?? 0,
      wins: doc?.wins ?? 0,
      losses: doc?.losses ?? 0,
      rushGames: doc?.rushGames ?? 0,
      coins: doc?.coinsEarned ?? 0,
    }
  })

  const levelSnap = await fs.getDocs(fs.collection(db, COLLECTIONS.levels))
  const levels: LevelRow[] = []
  levelSnap.forEach((d) => {
    const l = d.data() as LevelDoc
    levels.push({
      id: d.id,
      world: l.world,
      worldName: WORLD_NAMES[l.world] ?? l.world,
      index: l.index,
      name: l.name,
      plays: l.plays ?? 0,
      winRate: l.plays ? (l.wins ?? 0) / l.plays : 0,
      avgStars: l.wins ? (l.starsSum ?? 0) / l.wins : 0,
    })
  })
  levels.sort((a, b) => a.world.localeCompare(b.world) || a.index - b.index)

  const rushSnap = await fs.getDocs(fs.query(fs.collection(db, COLLECTIONS.rush), fs.orderBy('score', 'desc'), fs.limit(10)))
  const rush: RushRow[] = []
  rushSnap.forEach((d) => rush.push({ name: d.data().name, score: d.data().score }))

  const players = fs.collection(db, COLLECTIONS.players)
  const [total, web, android, ios] = await Promise.all([
    fs.getCountFromServer(players),
    fs.getCountFromServer(fs.query(players, fs.where('platform', '==', 'web'))),
    fs.getCountFromServer(fs.query(players, fs.where('platform', '==', 'android'))),
    fs.getCountFromServer(fs.query(players, fs.where('platform', '==', 'ios'))),
  ])

  const jellies = Object.entries(jellyTotals)
    .map(([id, c]) => ({ id, name: JELLY_NAMES[id] ?? id, cut: c.cut, chop: c.chop, total: c.cut + c.chop }))
    .sort((a, b) => b.total - a.total)

  return {
    days,
    levels,
    jellies,
    rush,
    totalPlayers: total.data().count,
    platforms: { web: web.data().count, android: android.data().count, ios: ios.data().count },
  }
}

export const sum = (rows: DayRow[], k: keyof Omit<DayRow, 'day' | 'label'>) => rows.reduce((a, r) => a + r[k], 0)
