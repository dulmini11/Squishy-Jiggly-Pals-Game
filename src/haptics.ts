// Phone vibration feedback. Uses the Vibration API (Android browsers);
// devices without it (iPhone Safari, desktops) simply ignore these calls.

const KEY = 'squishy-haptics'

function load(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
let lastBuzz = 0

// browsers only allow vibration after the player has touched the page once
let touched = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => (touched = true), { once: true, capture: true })
}

function buzz(pattern: number | number[], minGapMs = 40) {
  if (!haptics.enabled || !supported || !touched) return
  const now = performance.now()
  if (now - lastBuzz < minGapMs) return // don't let rapid events blur into one long buzz
  lastBuzz = now
  try {
    navigator.vibrate(pattern)
  } catch {
    /* some browsers throw when vibration is blocked */
  }
}

export const haptics = {
  enabled: load(),
  supported,

  setEnabled(v: boolean) {
    haptics.enabled = v
    try {
      localStorage.setItem(KEY, v ? 'on' : 'off')
    } catch {
      /* private mode */
    }
    if (v) buzz(20, 0)
  },

  tap: () => buzz(8, 60),
  pop: () => buzz(6, 80),
  grab: () => buzz(12),
  slice: () => buzz([18, 30, 12], 60),
  eat: () => buzz([10, 40, 10, 40, 22]),
  fling: () => buzz(28),
  shake: () => buzz([30, 40, 30, 40, 30]),
  success: () => buzz([20, 60, 20, 60, 45], 0),
  win: () => buzz([30, 70, 30, 70, 30, 70, 120], 0),
  lose: () => buzz([120, 80, 60], 0),
  tick: () => buzz(5, 0),
}
