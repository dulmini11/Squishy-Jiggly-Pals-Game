// Screen shake + slow motion for big moments.
//
// Shake uses a "trauma" value from 0 to 1: big hits add trauma, it fades over
// about half a second, and the screen moves by trauma² so small bumps stay
// gentle while big ones really rattle.
//
// Slow motion lowers `timeScale`: the physics runs slower while the timer and
// buttons keep real time. The view zooms in a touch and the edges dim, then
// everything eases back to normal speed.

const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let trauma = 0
let slowTarget = 1
let slowUntil = 0
let clock = 0

export const camera = {
  /** 1 = normal speed, 0.2 = five times slower. */
  timeScale: 1,
  zoom: 1,

  /** Add screen shake. 0.2 = a bump, 0.5 = a big hit, 1 = an earthquake. */
  shake(amount: number) {
    trauma = Math.min(1, trauma + amount * (reducedMotion ? 0.3 : 1))
  },

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
    clock += realMs
    trauma = Math.max(0, trauma - (realMs / 1000) * 1.8)
    if (now >= slowUntil) slowTarget = 1
    const target = now < slowUntil ? slowTarget : 1
    // drop into slow motion fast, come back out gently
    const rate = target < camera.timeScale ? 16 : 3.5
    camera.timeScale += (target - camera.timeScale) * Math.min(1, (realMs / 1000) * rate)
    if (Math.abs(camera.timeScale - 1) < 0.002) camera.timeScale = 1
    camera.zoom = 1 + camera.slowAmount * 0.05
  },

  /** Move the drawing for shake + zoom. Wrap with ctx.save()/restore(). */
  apply(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const s = trauma * trauma
    if (s < 0.0005 && camera.zoom === 1) return
    const t = clock / 1000
    // smooth, wobbly noise from mixed sine waves (no harsh random jumps)
    const nx = Math.sin(t * 47.1) * 0.6 + Math.sin(t * 83.7 + 1.3) * 0.4
    const ny = Math.sin(t * 53.3 + 2.1) * 0.6 + Math.sin(t * 71.9 + 0.7) * 0.4
    const nr = Math.sin(t * 39.7 + 4.2)
    const max = Math.min(22, Math.min(W, H) * 0.03)
    ctx.translate(W / 2 + nx * max * s, H / 2 + ny * max * s)
    ctx.rotate(nr * 0.035 * s)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-W / 2, -H / 2)
  },

  /** Dim the edges during slow motion (drawn on top, without shake). */
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
