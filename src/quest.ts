// Round engine: runs either a Level (fixed list of orders, stars) or Rush (endless random orders).
import { CATEGORY_COLORS, DESIGNS, designById, designsFor, type Category, type Design } from './art.ts'
import { starsFor, taskText, type Level, type TaskKind, type TaskSpec } from './levels.ts'

export type QBody = { design: Design; whole: boolean; k: number; cx: number; cy: number }
export type QEvent = TaskKind

export type RoundResult =
  | { mode: 'rush'; score: number; done: number; best: number; newBest: boolean }
  | { mode: 'level'; level: Level; index: number; won: boolean; stars: number; score: number; done: number; total: number }

export type QuestApi = {
  bodies: () => QBody[]
  spawn: (d: Design) => void
  popup: (x: number, y: number, text: string, color: string, size?: number) => void
  sound: { success: () => void; tick: () => void; over: () => void; start: () => void; win: () => void }
  finish: (r: RoundResult) => void
  /** Called when an order is served, for screen effects. */
  onOrder?: (combo: number, b: QBody) => void
}

type Task = { spec: TaskSpec; got: number; color: string }

const RUSH_TIME = 60
const BEST_KEY = 'jelly-orchard-best'
const CAT_LABEL: Record<Category, string> = { fruit: 'Fruit', bloom: 'Bloom', citrus: 'Citrus', melon: 'Melon', berry: 'Berry', veggie: 'Veggie' }

const $ = (id: string) => document.getElementById(id)!
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
function plural(word: string) {
  if (/(Citrus)$/.test(word)) return word
  if (/o$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

export function createQuest(api: QuestApi) {
  let active = false
  let level: Level | null = null
  let levelIndex = 0
  let queue: TaskSpec[] = []
  let total = 0
  let maxTime = RUSH_TIME
  let time = 0
  let score = 0
  let combo = 1
  let done = 0
  let lastDone = 0
  let clock = 0
  let lastTick = 0
  let lastEnsure = 0
  let task: Task | null = null
  let bestKey = BEST_KEY
  let best = Number(localStorage.getItem(bestKey) || 0)
  let rushPool: Design[] = DESIGNS

  const hud = $('quest')

  function pool(): Design[] {
    return level ? level.pool.map(designById) : rushPool
  }

  function randomSpec(): TaskSpec {
    const allowed = new Set(rushPool.map((x) => x.id))
    const present = api.bodies().filter((b) => b.whole && allowed.has(b.design.id)).map((b) => b.design)
    const d = present.length ? pick(present) : pick(rushPool)
    const roll = Math.random()
    if (roll < 0.32) {
      const n = randInt(1, 3)
      if (Math.random() < 0.5) return { kind: 'slice', ids: [d.id], label: n > 1 ? plural(d.name) : `a ${d.name}`, n }
      const cats = [...new Set(rushPool.map((x) => x.category))]
      const c = pick<Category>(cats)
      const ids = designsFor(c).filter((x) => allowed.has(x.id)).map((x) => x.id)
      return { kind: 'slice', ids, label: n > 1 ? plural(CAT_LABEL[c]) : CAT_LABEL[c], n }
    }
    if (roll < 0.5) return { kind: 'eat', ids: [d.id], label: `a ${d.name}`, n: 1 }
    if (roll < 0.68) return { kind: 'wobble', ids: [d.id], label: `the ${d.name}`, n: randInt(3, 5) }
    if (roll < 0.8) return { kind: 'grow', ids: [d.id], label: `a ${d.name}`, n: 1 }
    if (roll < 0.9) return { kind: 'shrink', ids: [d.id], label: `a ${d.name}`, n: 1 }
    return { kind: 'fling', ids: [d.id], label: `a ${d.name}`, n: 1 }
  }

  function hasTarget(spec: TaskSpec) {
    const wholeOnly = spec.kind !== 'eat'
    return api.bodies().some((b) => (b.whole || !wholeOnly) && spec.ids.includes(b.design.id))
  }

  function nextTask() {
    const spec = level ? queue.shift() : randomSpec()
    if (!spec) return
    const first = designById(spec.ids[0])
    task = { spec, got: 0, color: CATEGORY_COLORS[first.category] }
    if (!hasTarget(spec)) api.spawn(designById(pick(spec.ids)))
    renderTask(true)
  }

  function renderTask(fresh = false) {
    if (!task) return
    $('q-dot').style.background = task.color
    $('q-text').textContent = taskText(task.spec)
    $('q-prog').textContent = task.spec.n > 1 ? `${task.got}/${task.spec.n}` : ''
    $('q-step').textContent = level ? `${done + 1}/${total}` : ''
    if (fresh) {
      const card = $('q-task')
      card.classList.remove('pop')
      void card.offsetWidth
      card.classList.add('pop')
    }
  }

  function renderHud() {
    $('q-time').textContent = String(Math.ceil(time))
    $('q-score').textContent = String(score)
    $('q-bar').style.width = `${Math.min(100, (time / maxTime) * 100)}%`
    hud.classList.toggle('hurry', time <= 10)
    $('q-combo').textContent = combo > 1 ? `COMBO ×${combo}` : ''
  }

  function start(lv?: Level, index = 0) {
    level = lv ?? null
    levelIndex = index
    queue = level ? level.tasks.slice() : []
    total = queue.length
    maxTime = level ? level.time : RUSH_TIME
    active = true
    time = maxTime
    score = 0
    combo = 1
    done = 0
    clock = 0
    lastDone = 0
    lastTick = 0
    lastEnsure = 0
    task = null
    $('q-level').textContent = level ? `${level.emoji} Lv ${index + 1} · ${level.name}` : '⚡ Rush'
    $('q-text').textContent = 'Get ready…'
    $('q-prog').textContent = ''
    $('q-step').textContent = ''
    hud.classList.remove('hidden')
    document.body.classList.add('questing')
    api.sound.start()
    setTimeout(() => {
      if (active) nextTask()
    }, 900)
    renderHud()
  }

  /** Stop without showing a result. */
  function abort() {
    active = false
    task = null
    hud.classList.add('hidden')
    document.body.classList.remove('questing')
  }

  function finishRound(won: boolean) {
    const lv = level
    abort()
    if (lv) {
      const stars = won ? starsFor(lv, time) : 0
      if (won) api.sound.win()
      else api.sound.over()
      api.finish({ mode: 'level', level: lv, index: levelIndex, won, stars, score, done, total })
      return
    }
    const newBest = score > best
    if (newBest) {
      best = score
      localStorage.setItem(bestKey, String(best))
    }
    api.sound.over()
    api.finish({ mode: 'rush', score, done, best, newBest })
  }

  function addScore(points: number, b: QBody, text: string, color: string, size = 22) {
    score += points
    api.popup(b.cx, b.cy - 30, text, color, size)
    renderHud()
  }

  return {
    get active() {
      return active
    },
    get isLevel() {
      return active && !!level
    },
    start,
    abort,
    /** Choose which designs Rush uses and where its best score is stored. */
    setBasket(designs: Design[], key: string) {
      rushPool = designs
      bestKey = `${BEST_KEY}-${key}`
      best = Number(localStorage.getItem(bestKey) || 0)
    },
    end: () => {
      if (active) finishRound(false)
    },
    bestScore: () => best,

    /** Extra points (e.g. multi-cuts). Returns false when no round is running. */
    bonus(points: number) {
      if (!active) return false
      score += points
      renderHud()
      return true
    },

    update(dt: number) {
      if (!active) return
      time -= dt
      clock += dt
      if (time <= 5 && time > 0 && Math.ceil(time) !== lastTick) {
        lastTick = Math.ceil(time)
        api.sound.tick()
      }
      if (api.bodies().filter((b) => b.whole).length < 5 && Math.random() < 0.02) api.spawn(pick(pool()))
      if (task && clock - lastEnsure > 2.5) {
        lastEnsure = clock
        if (!hasTarget(task.spec)) api.spawn(designById(pick(task.spec.ids)))
      }
      if (time <= 0) {
        time = 0
        renderHud()
        finishRound(false)
        return
      }
      renderHud()
    },

    event(kind: QEvent, b: QBody) {
      if (!active) return
      if (kind === 'slice') addScore(10, b, '+10', b.design.juice, 18)
      if (kind === 'eat') addScore(20, b, '+20 yum!', b.design.juice, 20)
      if (!task || task.spec.kind !== kind || !task.spec.ids.includes(b.design.id)) return
      task.got++
      renderTask()
      if (task.got < task.spec.n) return
      // order complete!
      combo = clock - lastDone < 10 && done > 0 ? Math.min(5, combo + 1) : 1
      lastDone = clock
      done++
      const pts = 100 * combo
      if (!level) time = Math.min(99, time + 5)
      addScore(pts, b, combo > 1 ? `+${pts}  COMBO ×${combo}` : `+${pts}  Nice!`, '#ff3d8b', 30)
      api.sound.success()
      api.onOrder?.(combo, b)
      task = null
      $('q-text').textContent = '✓ Order served!'
      $('q-prog').textContent = level ? '' : '+5s'
      if (level && queue.length === 0) {
        setTimeout(() => {
          if (active) finishRound(true)
        }, 700)
        return
      }
      setTimeout(() => {
        if (active) nextTask()
      }, 600)
    },
  }
}
