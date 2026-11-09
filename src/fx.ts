// Juice particles, splat stains and floating score popups.

type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; max: number }
type Splat = { x: number; y: number; color: string; life: number; blobs: { dx: number; dy: number; r: number }[] }
type Popup = { x: number; y: number; text: string; color: string; life: number; size: number }

const particles: Particle[] = []
const splats: Splat[] = []
const popups: Popup[] = []
/** Smaller words on phones. */
const POPUP_SCALE = typeof window !== 'undefined' && window.innerWidth < 560 ? 0.85 : 1

export const fx = {
  juice(x: number, y: number, color: string, amount: number, scale: number, dirX = 0, dirY = 0) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = (1.5 + Math.random() * 6) * scale
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp + dirX * 3,
        vy: Math.sin(a) * sp + dirY * 3 - 2 * scale,
        r: (2 + Math.random() * 5) * scale,
        color,
        life: 0,
        max: 40 + Math.random() * 30,
      })
    }
    const blobs: Splat['blobs'] = []
    const n = 6 + Math.floor(Math.random() * 6)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const d = Math.random() * 50 * scale
      blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: (6 + Math.random() * 22) * scale })
    }
    splats.push({ x, y, color, life: 0, blobs })
    if (splats.length > 40) splats.shift()
  },

  popup(x: number, y: number, text: string, color = '#ff4f88', size = 16) {
    // keep floating words small so they never cover the jellies
    popups.push({ x, y, text, color, life: 0, size: Math.min(size, 20) * POPUP_SCALE })
  },

  clear() {
    particles.length = 0
    splats.length = 0
    popups.length = 0
  },

  update() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.vy += 0.25
      p.vx *= 0.97
      p.vy *= 0.97
      p.x += p.vx
      p.y += p.vy
      if (++p.life > p.max) particles.splice(i, 1)
    }
    for (let i = splats.length - 1; i >= 0; i--) if (++splats[i].life > 420) splats.splice(i, 1)
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i]
      p.y -= 0.9
      if (++p.life > 70) popups.splice(i, 1)
    }
  },

  /** Stains on the "table", drawn under the jellies. */
  drawBelow(ctx: CanvasRenderingContext2D) {
    for (const s of splats) {
      const t = s.life / 420
      ctx.globalAlpha = Math.min(1, s.life / 6) * (1 - t) * 0.35
      ctx.fillStyle = s.color
      for (const b of s.blobs) {
        ctx.beginPath()
        ctx.arc(s.x + b.dx, s.y + b.dy, b.r * (0.6 + Math.min(1, s.life / 10) * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  },

  /** Flying droplets and text, drawn above the jellies. */
  drawAbove(ctx: CanvasRenderingContext2D) {
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const p of popups) {
      const t = p.life / 70
      const pop = t < 0.12 ? 0.75 + (t / 0.12) * 0.3 : 1.05 - Math.min(0.05, (t - 0.12) * 0.2)
      ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
      ctx.font = `800 ${Math.round(p.size * pop)}px ui-rounded, "Segoe UI", system-ui, sans-serif`
      ctx.lineWidth = 3.5
      ctx.strokeStyle = '#fff'
      ctx.lineJoin = 'round'
      ctx.strokeText(p.text, p.x, p.y)
      ctx.fillStyle = p.color
      ctx.fillText(p.text, p.x, p.y)
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'start'
  },
}
