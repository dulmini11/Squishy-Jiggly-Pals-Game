// Cute menus: adventure map, shop, badges, the top status bar and toasts.
import { BADGES } from './badges.ts'
import { BACKGROUNDS, HATS, JELLY_EMOJI, KNIVES, type Background, type Hat, type Knife } from './catalog.ts'
import { TRACKS, TWIST_INFO, WORLDS, isUnlocked, loadStars, type Basket } from './levels.ts'
import { MAX_HEARTS, buy, equip, nextHeartIn, owns, save, xpToNext } from './progress.ts'

const $ = (id: string) => document.getElementById(id)!
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function mmss(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Top status bar: hearts · coins · player level
// ---------------------------------------------------------------------------
export function renderStatus() {
  const el = $('status')
  const hearts = Array.from({ length: MAX_HEARTS }, (_, i) => `<i class="heart${i < save.hearts ? '' : ' empty'}">${i < save.hearts ? '❤️' : '🤍'}</i>`).join('')
  const wait = nextHeartIn()
  const pct = Math.round((save.xp / xpToNext(save.level)) * 100)
  el.innerHTML = `
    <button class="st-pill st-hearts" data-go="hearts" title="Hearts: one comes back every 20 minutes">${hearts}${wait ? `<small>${mmss(wait)}</small>` : ''}</button>
    <button class="st-pill st-coins" data-go="shop" title="Coins: tap to open the shop"><span class="coin">🪙</span><b>${save.coins}</b></button>
    <button class="st-pill st-level" data-go="badges" title="Player level"><span class="lv-badge">${save.level}</span><span class="xp"><i style="width:${pct}%"></i></span></button>`
}

// ---------------------------------------------------------------------------
// Toasts (level up, new jelly, badge earned…)
// ---------------------------------------------------------------------------
export function toast(html: string, kind: 'gold' | 'pink' | 'green' | 'blue' = 'pink', ms = 3200) {
  const box = $('toasts')
  const t = document.createElement('div')
  t.className = `toast ${kind}`
  t.innerHTML = html
  box.appendChild(t)
  setTimeout(() => t.classList.add('out'), ms)
  setTimeout(() => t.remove(), ms + 500)
}

// ---------------------------------------------------------------------------
// Adventure map
// ---------------------------------------------------------------------------
// zig-zag of the road: -1 = far left of the road's lane, 1 = far right
const SWING = [-0.75, 0.8, -0.55, 0.9, -0.85, 0.6, -0.65, 0.85]

export function renderMap(basket: Basket, onPlay: (index: number) => void) {
  const levels = TRACKS[basket]
  const world = WORLDS[basket]
  const stars = loadStars(basket)
  const map = $('map')
  const scroller = $('map-scroll')
  // the map fills the whole screen; the road swings across the middle
  const width = scroller.clientWidth || window.innerWidth
  const viewH = scroller.clientHeight || window.innerHeight
  const step = Math.max(150, Math.min(200, viewH / 3.6)) // vertical gap between islands
  const height = Math.max(levels.length * step + 260, viewH)
  const swing = Math.min(width * 0.3, 320) // how far the road swings left/right
  const cx = width / 2
  const pos = levels.map((_, i) => ({ x: cx + SWING[i % SWING.length] * swing, y: height - 160 - i * step }))
  const start = { x: cx + swing * 0.35, y: height - 34 }
  let current = levels.findIndex((_, i) => isUnlocked(i, stars) && !(stars[i] > 0))
  if (current < 0) current = -1 // everything cleared

  map.style.width = `${width}px`
  map.style.height = `${height}px`
  // the whole screen becomes this world's water
  $('levels').style.setProperty('--water1', world.water1)
  $('levels').style.setProperty('--water2', world.water2)
  $('map-title').textContent = `${world.emoji} ${world.name}`
  const got = stars.reduce((a, s) => a + (s || 0), 0)
  $('map-stars').textContent = `⭐ ${got}/${levels.length * 3}`

  // dashed path: walked parts dark, the road ahead white
  const pts = [start, ...pos]
  let paths = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const my = (a.y + b.y) / 2
    const walked = i === 0 || isUnlocked(i, stars)
    paths += `<path d="M${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}" class="${walked ? 'walked' : 'ahead'}"/>`
  }
  const cross = `<g class="start-x" transform="translate(${start.x} ${start.y})"><path d="M-12 -12 L12 12 M12 -12 L-12 12"/></g>`

  const nodes = levels
    .map((lv, i) => {
      const open = isUnlocked(i, stars)
      const st = stars[i] || 0
      const state = !open ? 'locked' : st > 0 ? 'done' : 'current'
      const place = lv.place!
      const tw = TWIST_INFO[lv.twist ?? 'none']
      const p = pos[i]
      const starRow = [1, 2, 3].map((k) => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')
      return `
        <button class="island ${state}${i === current ? ' here' : ''}" data-level="${i}" style="left:${p.x}px;top:${p.y}px;--g1:${place.bg1};--g2:${place.ground}" ${open ? '' : 'aria-disabled="true"'}>
          <span class="ripple"></span>
          <span class="land"><span class="big">${lv.emoji}</span><span class="deco">${place.decor[0] ?? ''}</span></span>
          ${tw.icon ? `<span class="twist" title="${esc(tw.tip)}">${tw.icon}</span>` : ''}
          ${state === 'done' ? '<span class="check">✔</span>' : ''}
          ${state === 'locked' ? '<span class="lock">🔒</span>' : ''}
          ${i === current ? '<span class="pin">📍</span><span class="play-tag">PLAY</span>' : ''}
          <span class="name"><b>${i + 1}.</b> ${esc(lv.name)}</span>
          <span class="stars">${starRow}</span>
          ${open ? `<span class="time">⏱ ${lv.time}s</span>` : ''}
        </button>`
    })
    .join('')

  map.innerHTML = `
    <div class="clouds"><i></i><i></i><i></i></div>
    <svg class="road" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}${cross}</svg>
    ${nodes}`

  map.querySelectorAll<HTMLButtonElement>('.island').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.level)
      if (!isUnlocked(i, loadStars(basket))) {
        btn.classList.remove('nope')
        void btn.offsetWidth
        btn.classList.add('nope')
        toast(`🔒 Finish level ${i} first`, 'blue', 1800)
        return
      }
      onPlay(i)
    }
  })

  // scroll so the current island is in view
  const focus = current >= 0 ? pos[current] : pos[pos.length - 1]
  requestAnimationFrame(() => {
    scroller.scrollTop = Math.max(0, focus.y - scroller.clientHeight * 0.55)
  })
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
type Tab = 'knife' | 'bg' | 'hat'
let shopTab: Tab = 'knife'

function hatPreview(hat: Hat): HTMLCanvasElement {
  const c = document.createElement('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  c.width = 96 * dpr
  c.height = 96 * dpr
  c.className = 'hat-canvas'
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  // a little pink jelly to model the hat
  const g = ctx.createRadialGradient(40, 50, 4, 48, 60, 34)
  g.addColorStop(0, '#ffd1e3')
  g.addColorStop(1, '#ff7aa8')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(48, 62, 30, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2b1b1e'
  for (const x of [40, 56]) {
    ctx.beginPath()
    ctx.arc(x, 62, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#2b1b1e'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(48, 67, 3, 0.2, Math.PI - 0.2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.ellipse(36, 48, 6, 3, -0.5, 0, Math.PI * 2)
  ctx.fill()
  if (hat.draw) {
    ctx.save()
    ctx.translate(48, 38)
    hat.draw(ctx, 52)
    ctx.restore()
  }
  return c
}

function itemCard(kind: Tab, item: Knife | Background | Hat, onChange: () => void): HTMLElement {
  const card = document.createElement('div')
  const has = owns(item.id)
  const slot = kind === 'knife' ? 'knife' : kind === 'bg' ? 'bg' : 'hat'
  const using = save.equipped[slot] === item.id
  const lockedBy = item.minLevel && save.level < item.minLevel ? item.minLevel : 0
  card.className = `shop-card${using ? ' using' : ''}${lockedBy && !has ? ' locked' : ''}`

  const preview = document.createElement('div')
  preview.className = `preview ${kind}`
  if (kind === 'knife') {
    const k = item as Knife
    const bar = document.createElement('i')
    bar.style.background = k.colors.length > 1 ? `linear-gradient(90deg, ${k.colors.join(', ')})` : k.colors[0]
    bar.style.boxShadow = `0 0 16px ${k.glow}, 0 0 4px ${k.glow}`
    preview.appendChild(bar)
    preview.insertAdjacentHTML('beforeend', '<span>🔪</span>')
  } else if (kind === 'bg') {
    const b = item as Background
    preview.style.background = `${b.pattern ? b.pattern + ', ' : ''}radial-gradient(120% 90% at 60% 40%, ${b.bg1}, ${b.bg2})`
    preview.insertAdjacentHTML('beforeend', `<span>${b.dark ? '🌙' : '🍓'}</span>`)
  } else {
    preview.appendChild(hatPreview(item as Hat))
  }
  card.appendChild(preview)
  card.insertAdjacentHTML('beforeend', `<b class="item-name">${esc(item.name)}</b>`)

  const btn = document.createElement('button')
  if (using) {
    btn.textContent = '✓ Using'
    btn.className = 'using'
    btn.disabled = true
  } else if (has) {
    btn.textContent = 'Use'
    btn.onclick = () => {
      equip(slot, item.id)
      onChange()
    }
  } else if (lockedBy) {
    btn.textContent = `🔒 Lv ${lockedBy}`
    btn.disabled = true
  } else {
    btn.innerHTML = `🪙 ${item.price}`
    btn.className = save.coins >= item.price ? 'buy' : 'buy poor'
    btn.onclick = () => {
      if (!buy(item.id, item.price)) {
        card.classList.remove('nope')
        void card.offsetWidth
        card.classList.add('nope')
        toast(`Not enough coins yet — 🪙 ${item.price - save.coins} more`, 'blue', 2000)
        return
      }
      equip(slot, item.id)
      toast(`🛍️ You got <b>${esc(item.name)}</b>!`, 'gold')
      onChange()
    }
  }
  card.appendChild(btn)
  return card
}

export function renderShop(onChange: () => void) {
  $('shop-coins').innerHTML = `🪙 <b>${save.coins}</b>`
  document.querySelectorAll<HTMLButtonElement>('#shop-tabs [data-tab]').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === shopTab)
    b.onclick = () => {
      shopTab = b.dataset.tab as Tab
      renderShop(onChange)
    }
  })
  const grid = $('shop-grid')
  grid.innerHTML = ''
  const list: (Knife | Background | Hat)[] = shopTab === 'knife' ? KNIVES : shopTab === 'bg' ? BACKGROUNDS : HATS
  const redraw = () => {
    onChange()
    renderShop(onChange)
  }
  for (const item of list) grid.appendChild(itemCard(shopTab, item, redraw))
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export function renderBadges() {
  const grid = $('badge-grid')
  const earned = BADGES.filter((b) => save.badges.includes(b.id)).length
  $('badge-count').textContent = `${earned}/${BADGES.length}`
  const all = Object.keys(JELLY_EMOJI)
  const jellyRow = all
    .map((id) => `<span class="jelly-chip${save.unlocked.includes(id) ? '' : ' off'}" title="${id}">${save.unlocked.includes(id) ? JELLY_EMOJI[id] : '❔'}</span>`)
    .join('')
  $('badge-jellies').innerHTML = `<div class="jelly-row-title">Your jelly pals · ${save.unlocked.length}/${all.length}</div><div class="jelly-row">${jellyRow}</div>`
  grid.innerHTML = BADGES.map((b) => {
    const done = save.badges.includes(b.id)
    const v = Math.min(b.goal, b.value())
    const pct = Math.round((v / b.goal) * 100)
    return `
      <div class="badge-card${done ? ' earned' : ''}">
        <span class="b-medal">${b.emoji}</span>
        <b>${esc(b.name)}</b>
        <small>${esc(b.desc)}</small>
        <span class="b-bar"><i style="width:${pct}%"></i></span>
        <span class="b-foot">${done ? '✔ Earned' : `${v}/${b.goal}`} · 🪙 ${b.reward}</span>
      </div>`
  }).join('')
}
