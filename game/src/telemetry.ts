// Sends anonymous play stats to Firebase so the owner dashboard can show them.
//
// - Nothing is sent until VITE_FIREBASE_* is set in game/.env.local ("demo mode").
// - Players are signed in anonymously in the background: no login screen, no personal data.
// - Counts are collected in memory and sent in small batches (every 20 s, at the end of a
//   round and when the app goes to the background), so the game stays smooth and cheap to run.
import { COLLECTIONS, dayKey, isConfigured, levelId, palName, type FirebaseWebConfig, type Platform, type World } from 'shared'
import { save } from './progress.ts'

const config: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

export const telemetryEnabled = isConfigured(config)

type LevelResult = { world: World; index: number; name: string; won: boolean; stars: number; secondsLeft: number }

// ---------- what we collect between flushes ----------
let pending = {
  sessions: 0,
  cuts: 0,
  chops: 0,
  eats: 0,
  wins: 0,
  losses: 0,
  rushGames: 0,
  rushScoreSum: 0,
  jelly: {} as Record<string, { cut: number; chop: number }>,
  levels: [] as LevelResult[],
  bestRush: 0,
}
let coinsFlushed = save.stats.coinsEarned
let dirty = false

const platform = (): Platform => {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const p = cap?.getPlatform?.()
  return p === 'android' ? 'android' : p === 'ios' ? 'ios' : 'web'
}

export const telemetry = {
  session() {
    pending.sessions++
    dirty = true
  },
  cut(jellyId: string, tool: 'cut' | 'chop') {
    if (tool === 'chop') pending.chops++
    else pending.cuts++
    const j = (pending.jelly[jellyId] ??= { cut: 0, chop: 0 })
    j[tool]++
    dirty = true
  },
  eat() {
    pending.eats++
    dirty = true
  },
  level(r: LevelResult) {
    if (r.won) pending.wins++
    else pending.losses++
    pending.levels.push(r)
    dirty = true
    void flush()
  },
  rush(score: number) {
    pending.rushGames++
    pending.rushScoreSum += score
    pending.bestRush = Math.max(pending.bestRush, score)
    dirty = true
    void flush()
  },
}

// ---------- Firebase (loaded only when configured) ----------
type Fb = {
  uid: string
  db: import('firebase/firestore').Firestore
  fs: typeof import('firebase/firestore')
}
let fbPromise: Promise<Fb | null> | null = null

function connect(): Promise<Fb | null> {
  if (!telemetryEnabled) return Promise.resolve(null)
  fbPromise ??= (async () => {
    try {
      const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
      const app = initializeApp(config)
      const a = auth.getAuth(app)
      const cred = await auth.signInAnonymously(a)
      return { uid: cred.user.uid, db: fs.getFirestore(app), fs }
    } catch (err) {
      console.warn('[stats] Firebase is not reachable, stats stay on this device for now.', err)
      fbPromise = null
      return null
    }
  })()
  return fbPromise
}

let flushing = false
async function flush() {
  if (!dirty || flushing) return
  const fb = await connect()
  if (!fb) return
  flushing = true
  // take what we have; new events during the upload go into the next batch
  const batchData = pending
  const coinsDelta = Math.max(0, save.stats.coinsEarned - coinsFlushed)
  pending = { sessions: 0, cuts: 0, chops: 0, eats: 0, wins: 0, losses: 0, rushGames: 0, rushScoreSum: 0, jelly: {}, levels: [], bestRush: 0 }
  dirty = false
  const { db, fs, uid } = fb
  const inc = fs.increment
  const now = fs.serverTimestamp()
  const day = dayKey()
  const name = palName(uid)
  try {
    const wb = fs.writeBatch(db)
    const jelly: Record<string, Record<string, unknown>> = {}
    for (const [id, c] of Object.entries(batchData.jelly)) jelly[id] = { cut: inc(c.cut), chop: inc(c.chop) }
    wb.set(
      fs.doc(db, COLLECTIONS.days, day),
      {
        sessions: inc(batchData.sessions),
        cuts: inc(batchData.cuts),
        chops: inc(batchData.chops),
        eats: inc(batchData.eats),
        wins: inc(batchData.wins),
        losses: inc(batchData.losses),
        rushGames: inc(batchData.rushGames),
        rushScoreSum: inc(batchData.rushScoreSum),
        coinsEarned: inc(coinsDelta),
        jelly,
        updatedAt: now,
      },
      { merge: true },
    )
    wb.set(fs.doc(db, COLLECTIONS.days, day, COLLECTIONS.dayPlayers, uid), { lastSeen: now, platform: platform() }, { merge: true })
    wb.set(
      fs.doc(db, COLLECTIONS.players, uid),
      {
        name,
        platform: platform(),
        lastSeen: now,
        level: save.level,
        coins: save.coins,
        cuts: inc(batchData.cuts),
        chops: inc(batchData.chops),
        levelsWon: inc(batchData.wins),
        bestRush: save.stats.bestRush,
      },
      { merge: true },
    )
    for (const r of batchData.levels) {
      wb.set(
        fs.doc(db, COLLECTIONS.levels, levelId(r.world, r.index)),
        {
          world: r.world,
          index: r.index,
          name: r.name,
          plays: inc(1),
          wins: inc(r.won ? 1 : 0),
          losses: inc(r.won ? 0 : 1),
          starsSum: inc(r.won ? r.stars : 0),
          secondsLeftSum: inc(r.won ? Math.round(r.secondsLeft) : 0),
        },
        { merge: true },
      )
    }
    if (batchData.bestRush > 0 && batchData.bestRush >= save.stats.bestRush) {
      wb.set(fs.doc(db, COLLECTIONS.rush, uid), { name, score: Math.round(batchData.bestRush), at: now })
    }
    await wb.commit()
    coinsFlushed += coinsDelta
  } catch (err) {
    console.warn('[stats] upload failed, will retry later', err)
    mergeBack(batchData)
  } finally {
    flushing = false
  }
}

/** Put a failed batch back so nothing is lost. */
function mergeBack(b: typeof pending) {
  pending.sessions += b.sessions
  pending.cuts += b.cuts
  pending.chops += b.chops
  pending.eats += b.eats
  pending.wins += b.wins
  pending.losses += b.losses
  pending.rushGames += b.rushGames
  pending.rushScoreSum += b.rushScoreSum
  pending.bestRush = Math.max(pending.bestRush, b.bestRush)
  pending.levels.push(...b.levels)
  for (const [id, c] of Object.entries(b.jelly)) {
    const j = (pending.jelly[id] ??= { cut: 0, chop: 0 })
    j.cut += c.cut
    j.chop += c.chop
  }
  dirty = true
}

if (telemetryEnabled) {
  setInterval(() => void flush(), 20_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
}
