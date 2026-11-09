// Cute icons for menus (replacing plain emoji):
//  - jellyIcon(): a tiny portrait of a real game jelly, drawn from its art, with gloss and a face
//  - ci(): soft, glossy, hand-drawn SVG icons (shop bag, medal, chart, coin, heart, …)
import { designById, resample, type Design } from './art.ts'

// ---------------------------------------------------------------------------
// Mini jelly portraits (rendered once, cached as images)
// ---------------------------------------------------------------------------
const portraitCache = new Map<string, string>()

function drawPortrait(d: Design, px: number): string {
  const c = document.createElement('canvas')
  c.width = px
  c.height = px
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const pts = resample(d.outline(), 64)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  // leave room for stems and leaves on top
  const extraTop = d.outer ? 0.22 : 0.06
  const w = maxX - minX
  const h = (maxY - minY) * (1 + extraTop)
  const s = (px * 0.84) / Math.max(w, h)
  const cx = px / 2 - ((minX + maxX) / 2) * s
  const cy = px / 2 - ((minY + maxY) / 2) * s + (d.outer ? (maxY - minY) * s * extraTop * 0.5 : 0)
  const trace = () => {
    ctx.beginPath()
    const n = pts.length
    ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2)
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
    }
    ctx.closePath()
  }
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  // soft shadow
  ctx.save()
  trace()
  ctx.shadowColor = 'rgba(40,40,70,0.22)'
  ctx.shadowBlur = 10 / s
  ctx.shadowOffsetY = 5 / s
  ctx.fillStyle = d.rim
  ctx.fill()
  ctx.restore()
  if (d.outer) {
    ctx.save()
    d.outer(ctx)
    ctx.restore()
  }
  // the jelly's own art, clipped to its shape
  ctx.save()
  trace()
  ctx.clip()
  d.art(ctx)
  const g = ctx.createRadialGradient(minX + w * 0.32, minY + (maxY - minY) * 0.25, 4, (minX + maxX) / 2, (minY + maxY) / 2, Math.max(w, maxY - minY) * 0.7)
  g.addColorStop(0, 'rgba(255,255,255,0.4)')
  g.addColorStop(0.5, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(0,0,30,0.2)')
  ctx.fillStyle = g
  ctx.fillRect(minX - 20, minY - 20, w + 40, maxY - minY + 40)
  trace()
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(0,0,20,0.1)'
  ctx.stroke()
  ctx.restore()
  // gloss
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.ellipse(minX + w * 0.3, minY + (maxY - minY) * 0.24, w * 0.12, (maxY - minY) * 0.06, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // face
  const fx = d.face?.x ?? (minX + maxX) / 2
  const fy = d.face?.y ?? (minY + maxY) / 2
  const fu = 100 * (d.face?.scale ?? 1)
  ctx.fillStyle = '#2b1b1e'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(fx + sx * 0.22 * fu, fy, 0.075 * fu, 0.085 * fu, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(fx + sx * 0.22 * fu - 0.025 * fu, fy - 0.03 * fu, 0.028 * fu, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,110,140,0.55)'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(fx + sx * 0.38 * fu, fy + 0.12 * fu, 0.08 * fu, 0.045 * fu, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#2b1b1e'
  ctx.lineWidth = 0.04 * fu
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(fx - 0.07 * fu, fy + 0.11 * fu)
  ctx.quadraticCurveTo(fx - 0.035 * fu, fy + 0.17 * fu, fx, fy + 0.12 * fu)
  ctx.quadraticCurveTo(fx + 0.035 * fu, fy + 0.17 * fu, fx + 0.07 * fu, fy + 0.11 * fu)
  ctx.stroke()
  ctx.restore()
  return c.toDataURL('image/png')
}

/** `<img>` of a cute mini jelly (cached). */
export function jellyIcon(id: string, size = 28, cls = ''): string {
  const d = designById(id)
  if (!d) return ''
  let url = portraitCache.get(id)
  if (!url) {
    url = drawPortrait(d, 128)
    portraitCache.set(id, url)
  }
  return `<img class="jelly-ic ${cls}" src="${url}" width="${size}" height="${size}" alt="${d.name}" draggable="false">`
}

// ---------------------------------------------------------------------------
// Cute SVG icons (48×48, soft colours, glossy highlight)
// ---------------------------------------------------------------------------
const S = (body: string) => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`
const shine = (x: number, y: number, rx = 4, ry = 2.2, rot = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".75"/>`
const face = (x: number, y: number, k = 1) =>
  `<circle cx="${x - 4 * k}" cy="${y}" r="${1.5 * k}" fill="#3a2430"/><circle cx="${x + 4 * k}" cy="${y}" r="${1.5 * k}" fill="#3a2430"/><path d="M${x - 2 * k} ${y + 3 * k}q${2 * k} ${2 * k} ${4 * k} 0" fill="none" stroke="#3a2430" stroke-width="${1.4 * k}" stroke-linecap="round"/>`

const ICON: Record<string, string> = {
  shop: S(`<path d="M10 17h28l-2.5 22a4 4 0 0 1-4 3.5H16.5a4 4 0 0 1-4-3.5Z" fill="#ff8fb8" stroke="#e0508a" stroke-width="2"/>
    <path d="M17 18v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#e0508a" stroke-width="2.6" stroke-linecap="round"/>${shine(16, 23)}${face(24, 30)}`),
  badge: S(`<path d="M16 4h7l3 14h-7Z" fill="#7a8cff"/><path d="M32 4h-7l-3 14h7Z" fill="#ff7aa8"/>
    <circle cx="24" cy="30" r="13" fill="#ffd35c" stroke="#e0a000" stroke-width="2"/><circle cx="24" cy="30" r="9" fill="none" stroke="#fff3b0" stroke-width="2"/>
    <path d="m24 23.5 2 4.2 4.5.5-3.4 3 1 4.5-4.1-2.4-4.1 2.4 1-4.5-3.4-3 4.5-.5Z" fill="#fff8d6"/>${shine(18, 23)}`),
  stats: S(`<rect x="8" y="24" width="8" height="16" rx="3" fill="#7ab8ff" stroke="#4a8fd6" stroke-width="2"/>
    <rect x="20" y="12" width="8" height="28" rx="3" fill="#ffb07a" stroke="#eb6834" stroke-width="2"/>
    <rect x="32" y="18" width="8" height="22" rx="3" fill="#8fe0a8" stroke="#2fb67c" stroke-width="2"/>${shine(23, 16, 2, 1.2, 0)}<path d="M6 42h36" stroke="#c9ccd8" stroke-width="2" stroke-linecap="round"/>`),
  play: S(`<circle cx="24" cy="24" r="17" fill="#ff8fb8" stroke="#e0508a" stroke-width="2"/><path d="M20 16.5 32 24l-12 7.5Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${shine(15, 15)}`),
  rush: S(`<path d="M27 4 11 27h11l-3 17 18-24H26Z" fill="#ffd35c" stroke="#e0a000" stroke-width="2" stroke-linejoin="round"/>${shine(22, 14, 3, 1.6, -55)}${face(22, 27, 0.7)}`),
  free: S(`<path d="M10 36c-2-9 2-18 14-21 12 3 16 12 14 21-8 4-20 4-28 0Z" fill="#c9b6ff" stroke="#8a6be0" stroke-width="2"/>
    <circle cx="14" cy="17" r="4" fill="#c9b6ff" stroke="#8a6be0" stroke-width="2"/><circle cx="34" cy="17" r="4" fill="#c9b6ff" stroke="#8a6be0" stroke-width="2"/>${shine(18, 22)}${face(24, 28)}`),
  coin: S(`<circle cx="24" cy="24" r="17" fill="#ffd35c" stroke="#e0a000" stroke-width="2"/><circle cx="24" cy="24" r="11.5" fill="#ffe58a" stroke="#f0b400" stroke-width="1.6"/>
    <path d="m24 17 2 4.2 4.6.6-3.3 3.1.8 4.6-4.1-2.3-4.1 2.3.8-4.6-3.3-3.1 4.6-.6Z" fill="#f5b800"/>${shine(16, 15)}`),
  heart: S(`<path d="M24 41S7 30.5 7 18.5A8.5 8.5 0 0 1 24 13a8.5 8.5 0 0 1 17 5.5C41 30.5 24 41 24 41Z" fill="#ff5f88" stroke="#e0305f" stroke-width="2" stroke-linejoin="round"/>${shine(15, 17, 4, 2.4)}`),
  heartEmpty: S(`<path d="M24 41S7 30.5 7 18.5A8.5 8.5 0 0 1 24 13a8.5 8.5 0 0 1 17 5.5C41 30.5 24 41 24 41Z" fill="#eceaf2" stroke="#c9c6d6" stroke-width="2" stroke-linejoin="round"/>`),
  star: S(`<path d="m24 5 5.6 11.6 12.7 1.7-9.3 8.8 2.3 12.6L24 33.6l-11.3 6.1L15 27.1l-9.3-8.8 12.7-1.7Z" fill="#ffd35c" stroke="#e0a000" stroke-width="2" stroke-linejoin="round"/>${shine(18, 16, 3, 1.6)}${face(24, 25, 0.8)}`),
  knife: S(`<path d="M8 36 32 10q6-5 8 0 1 3-3 7L15 40Z" fill="#eef3f8" stroke="#8a9bb0" stroke-width="2" stroke-linejoin="round"/>
    <rect x="5" y="34" width="9" height="13" rx="4" transform="rotate(45 9.5 40.5)" fill="#ff8fb8" stroke="#e0508a" stroke-width="2"/>${shine(30, 15, 4, 1.4, -45)}`),
  frame: S(`<rect x="6" y="9" width="36" height="30" rx="6" fill="#fff" stroke="#a68bff" stroke-width="2.4"/><rect x="10" y="13" width="28" height="22" rx="3" fill="#dff4ff"/>
    <path d="m10 31 8-8 6 6 5-5 9 9v2H10Z" fill="#8fe0a8"/><circle cx="31" cy="19" r="3.4" fill="#ffd35c"/>`),
  hat: S(`<ellipse cx="24" cy="36" rx="18" ry="5" fill="#4a4a5c"/><path d="M14 35V16a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v19Z" fill="#5a5a70" stroke="#3a3a4c" stroke-width="2"/>
    <rect x="14" y="27" width="20" height="5" fill="#ff7aa8"/>${shine(19, 18, 2, 3, 0)}`),
  lock: S(`<path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#9aa3b8" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="10" y="20" width="28" height="22" rx="7" fill="#ffd35c" stroke="#e0a000" stroke-width="2"/><circle cx="24" cy="30" r="3" fill="#b07a00"/><path d="M24 31v5" stroke="#b07a00" stroke-width="2.6" stroke-linecap="round"/>${shine(16, 25)}`),
  pin: S(`<path d="M24 44s-13-13-13-24a13 13 0 0 1 26 0c0 11-13 24-13 24Z" fill="#ff5f88" stroke="#e0305f" stroke-width="2"/><circle cx="24" cy="20" r="5" fill="#fff"/>${shine(17, 13)}`),
  home: S(`<path d="M8 22 24 8l16 14v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="#8fe0a8" stroke="#2fb67c" stroke-width="2" stroke-linejoin="round"/><rect x="19" y="28" width="10" height="14" rx="3" fill="#fff"/>${shine(15, 22)}`),
  chef: S(`<rect x="13" y="28" width="22" height="10" rx="3" fill="#fff" stroke="#c9ccd8" stroke-width="2"/><circle cx="15" cy="22" r="7" fill="#fff" stroke="#c9ccd8" stroke-width="2"/><circle cx="33" cy="22" r="7" fill="#fff" stroke="#c9ccd8" stroke-width="2"/><circle cx="24" cy="17" r="9" fill="#fff" stroke="#c9ccd8" stroke-width="2"/>`),
  flame: S(`<path d="M24 44c-9 0-14-6-14-13 0-8 7-11 8-19 4 3 6 7 6 10 2-2 3-5 3-8 6 4 11 10 11 17 0 7-5 13-14 13Z" fill="#ff8a3d" stroke="#e0601a" stroke-width="2" stroke-linejoin="round"/><path d="M24 42c-4 0-6-3-6-6 0-4 4-5 5-9 4 3 7 6 7 9 0 3-2 6-6 6Z" fill="#ffd35c"/>`),
  sparkle: S(`<path d="M24 5c2 10 5 13 15 15-10 2-13 5-15 15-2-10-5-13-15-15 10-2 13-5 15-15Z" fill="#c9b6ff" stroke="#8a6be0" stroke-width="2" stroke-linejoin="round"/><path d="M38 32c.8 4 2 5 6 6-4 .8-5.2 2-6 6-.8-4-2-5.2-6-6 4-1 5.2-2 6-6Z" fill="#ffd35c"/>`),
  cup: S(`<path d="M12 14h24l-3 26a3 3 0 0 1-3 2.6H18a3 3 0 0 1-3-2.6Z" fill="#ffb07a" stroke="#eb6834" stroke-width="2"/><path d="M28 14 33 4" stroke="#7ab8ff" stroke-width="3" stroke-linecap="round"/><path d="M13 22h22" stroke="#fff" stroke-width="2" opacity=".7"/>${face(24, 31, 0.9)}`),
  mouth: S(`<circle cx="24" cy="24" r="17" fill="#ffd35c" stroke="#e0a000" stroke-width="2"/><path d="M15 26a9 9 0 0 0 18 0Z" fill="#c2185b"/><path d="M21 31a4 3 0 0 1 6 0" fill="#ff8fa8"/><circle cx="18" cy="18" r="2" fill="#3a2430"/><circle cx="30" cy="18" r="2" fill="#3a2430"/>`),
  wind: S(`<path d="M6 18h22a5 5 0 1 0-5-5M6 26h30a5 5 0 1 1-5 5M6 34h16" fill="none" stroke="#7ab8ff" stroke-width="3.2" stroke-linecap="round"/>`),
  hand: S(`<path d="M14 26V14a3 3 0 0 1 6 0v9V10a3 3 0 0 1 6 0v13V12a3 3 0 0 1 6 0v13v-7a3 3 0 0 1 6 0v12c0 8-6 14-13 14h-2c-5 0-8-2-11-6l-6-8a3 3 0 0 1 5-4z" fill="#ffd6b8" stroke="#e59a6e" stroke-width="2" stroke-linejoin="round"/>`),
  bolt: S(`<path d="M27 4 11 27h11l-3 17 18-24H26Z" fill="#7ab8ff" stroke="#4a8fd6" stroke-width="2" stroke-linejoin="round"/>${shine(22, 14, 3, 1.6, -55)}`),
  island: S(`<ellipse cx="24" cy="38" rx="18" ry="6" fill="#7fd8ff"/><ellipse cx="24" cy="35" rx="13" ry="5" fill="#ffe08a"/><path d="M24 34V18" stroke="#9a6430" stroke-width="3" stroke-linecap="round"/><path d="M24 18c-6-4-12-2-14 1 5-1 9 0 14-1Zm0 0c6-4 12-2 14 1-5-1-9 0-14-1Zm0 0c-3-6-1-10 2-12-1 4-1 8-2 12Z" fill="#5cc046"/>`),
  valley: S(`<circle cx="33" cy="15" r="6" fill="#ffd35c"/><path d="M4 40 17 20l9 12 6-7 12 15Z" fill="#7cd36a" stroke="#4caf3a" stroke-width="2" stroke-linejoin="round"/><path d="M17 20l-3 5 3-1 3 2Z" fill="#fff"/>`),
  basket: S(`<path d="M14 20a10 10 0 0 1 20 0" fill="none" stroke="#c98a4b" stroke-width="3" stroke-linecap="round"/><path d="M7 20h34l-4 19a4 4 0 0 1-4 3H15a4 4 0 0 1-4-3Z" fill="#ffc07a" stroke="#c98a4b" stroke-width="2"/>
    <path d="M10 27h28M12 34h24" stroke="#e0a060" stroke-width="2"/><path d="M7 20h34" stroke="#ff7aa8" stroke-width="4" stroke-linecap="round"/>`),
  moon: S(`<path d="M30 6a17 17 0 1 0 12 26A14 14 0 0 1 30 6Z" fill="#ffe08a" stroke="#e0a000" stroke-width="2"/>${face(22, 27, 0.8)}`),
  leaf: S(`<path d="M8 40C8 20 20 8 40 8c0 20-12 32-32 32Z" fill="#8fe0a8" stroke="#2fb67c" stroke-width="2"/><path d="M10 38 30 18" stroke="#2fb67c" stroke-width="2" stroke-linecap="round"/>`),
  ice: S(`<path d="M12 16 26 10l12 6v16l-14 6-12-6Z" fill="#cfeeff" stroke="#4a8fd6" stroke-width="2" stroke-linejoin="round"/><path d="m12 16 12 6 14-6M24 22v16" fill="none" stroke="#4a8fd6" stroke-width="2"/>${shine(17, 20, 3, 1.4)}`),
  bubbles: S(`<circle cx="20" cy="28" r="12" fill="#dff4ff" stroke="#7ab8ff" stroke-width="2"/><circle cx="34" cy="14" r="7" fill="#f0e6ff" stroke="#a68bff" stroke-width="2"/><circle cx="36" cy="34" r="4" fill="#ffe3ef" stroke="#ff7aa8" stroke-width="2"/>${shine(15, 23)}`),
  clock: S(`<circle cx="24" cy="25" r="16" fill="#fff" stroke="#7ab8ff" stroke-width="2.4"/><path d="M24 16v9l6 4" fill="none" stroke="#4a8fd6" stroke-width="2.6" stroke-linecap="round"/><path d="M18 6h12" stroke="#7ab8ff" stroke-width="3" stroke-linecap="round"/>`),
  calendar: S(`<rect x="7" y="10" width="34" height="30" rx="6" fill="#fff" stroke="#ff7aa8" stroke-width="2.4"/><path d="M7 18h34" stroke="#ff7aa8" stroke-width="2.4"/><path d="M15 6v8M33 6v8" stroke="#e0508a" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="27" r="2.4" fill="#ffb07a"/><circle cx="24" cy="27" r="2.4" fill="#7ab8ff"/><circle cx="31" cy="27" r="2.4" fill="#8fe0a8"/><circle cx="17" cy="34" r="2.4" fill="#c9b6ff"/>`),
  chop: S(`<path d="M8 9h22a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H11q-3 0-3-3Z" fill="#eef3f8" stroke="#8a9bb0" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="15" r="2.6" fill="#fff" stroke="#8a9bb0" stroke-width="1.6"/><rect x="32" y="15" width="12" height="7" rx="3" fill="#c98a4b" stroke="#9a6430" stroke-width="2"/>`),
  back: S(`<path d="M28 12 16 24l12 12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
  check: S(`<circle cx="24" cy="24" r="18" fill="#5fd47a" stroke="#26a85a" stroke-width="2"/><path d="m15 24 6 6 12-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
}

/** Inline cute icon. */
export function ci(name: string, size = 22, cls = ''): string {
  const svg = ICON[name]
  if (!svg) return ''
  return `<span class="ci ${cls}" style="width:${size}px;height:${size}px">${svg}</span>`
}

/** Fill every `[data-ci]` (svg icon) and `[data-jelly]` (jelly portraits, comma separated) placeholder. */
export function decorateCute(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-ci]').forEach((el) => {
    if (el.dataset.done) return
    el.innerHTML = ci(el.dataset.ci!, Number(el.dataset.size || 22))
    el.dataset.done = '1'
  })
  root.querySelectorAll<HTMLElement>('[data-jelly]').forEach((el) => {
    if (el.dataset.done) return
    const size = Number(el.dataset.size || 24)
    el.innerHTML = el.dataset.jelly!.split(',').map((id) => jellyIcon(id.trim(), size)).join('')
    el.dataset.done = '1'
  })
}
