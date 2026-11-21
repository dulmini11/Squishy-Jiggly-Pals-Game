// Slow motion for big moments (multi-cuts, big combos, level wins).
//
// Slow motion lowers `timeScale`: the physics runs slower while the timer and
// buttons keep real time. The view zooms in a touch and the edges dim, then
// everything eases back to normal speed. (No screen shake: the screen stays still.)

const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let slowTarget = 1
let slowUntil = 0

export const camera = {
  /** 1 = normal speed, 0.2 = five times slower. */
  timeScale: 1,
  zoom: 1,

  /** Slow time to `scale` (e.g. 0.3) for `ms` milliseconds, then ease back. */
  slowmo(scale: number, ms: number) {
    if (reducedMotion) return
    slowTarget = Math.min(slowTarget, scale)
    slowUntil = Math.max(slowUntil, performance.now() + ms)
  },

  get slowAmount() {
    return Math.max(0, Math.min(1, (1 - camera.timeScale) / 0.7))
  },

  /** Call once per frame with real (not slowed) time. */
  update(realMs: number, now: number) {
    if (now >= slowUntil) slowTarget = 1
    const target = now < slowUntil ? slowTarget : 1
    // drop into slow motion fast, come back out gently
    const rate = target < camera.timeScale ? 16 : 3.5
    camera.timeScale += (target - camera.timeScale) * Math.min(1, (realMs / 1000) * rate)
    if (Math.abs(camera.timeScale - 1) < 0.002) camera.timeScale = 1
    camera.zoom = 1 + camera.slowAmount * 0.05
  },

  /** Slow-motion zoom toward the centre. Wrap with ctx.save()/restore(). */
  apply(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (camera.zoom === 1) return
    ctx.translate(W / 2, H / 2)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-W / 2, -H / 2)
  },

  /** Dim the edges during slow motion. */
  overlay(ctx: CanvasRenderingContext2D, W: number, H: number, night: boolean) {
    const k = camera.slowAmount
    if (k < 0.01) return
    const r = Math.hypot(W, H) / 2
    const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, night ? `rgba(0,0,10,${0.55 * k})` : `rgba(60,30,90,${0.28 * k})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  },
}
