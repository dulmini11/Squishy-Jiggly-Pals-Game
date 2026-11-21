// Stats dashboard: how many of each fruit and veggie you cut (knife) and chopped,
// today, over the last 7 days, and over the last 4 weeks.
import { designById } from './art.ts'
import { ci, jellyIcon } from './cute.ts'
import { dayKey, save } from './progress.ts'

type Range = 'today' | 'week' | 'month'
let range: Range = 'week'

const $ = (id: string) => document.getElementById(id)!
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysBack(n: number): Date[] {
  const out: Date[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
  return out
}

/** Sum [cut, chop] per jelly over a list of days. */
function perJelly(days: Date[]) {
  const totals: Record<string, [number, number]> = {}
  for (const d of days) {
    const day = save.daily[dayKey(d)]
    if (!day) continue
    for (const [id, [cut, chop]] of Object.entries(day)) {
      const t = (totals[id] ??= [0, 0])
      t[0] += cut
      t[1] += chop
    }
  }
  return totals
}

function dayTotal(d: Date): [number, number] {
  const day = save.daily[dayKey(d)]
  let cut = 0
  let chop = 0
  if (day) for (const [a, b] of Object.values(day)) {
    cut += a
    chop += b
  }
  return [cut, chop]
}

/** Stacked bar with a rounded top end, 2px gap between the two parts. */
function bar(x: number, base: number, w: number, hCut: number, hChop: number, tip: string) {
  const gap = hCut > 0 && hChop > 0 ? 2 : 0
  const r = 4
  const top = (y: number, h: number, cls: string) => {
    const rr = Math.min(r, h, w / 2)
    return `<path class="${cls}" d="M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z"/>`
  }
  let out = ''
  if (hChop > 0 && hCut > 0) {
    out += `<rect class="s-cut" x="${x}" y="${base - hCut}" width="${w}" height="${hCut}"/>`
    out += top(base - hCut - gap - hChop, hChop, 's-chop')
  } else if (hCut > 0) out += top(base - hCut, hCut, 's-cut')
  else if (hChop > 0) out += top(base - hChop, hChop, 's-chop')
  // a bigger invisible hit target for the tooltip
  return `<g class="hit" data-tip="${esc(tip)}">${out}<rect x="${x - 4}" y="${base - 200}" width="${w + 8}" height="200" fill="transparent"/></g>`
}

function timeline(width: number): string {
  // 7 days → one bar per day; 4 weeks → one bar per week
  const groups: { label: string; cut: number; chop: number; tipLabel: string }[] = []
  if (range === 'week') {
    for (const d of daysBack(7)) {
      const [cut, chop] = dayTotal(d)
      const isToday = dayKey(d) === dayKey()
      groups.push({ label: isToday ? 'Today' : DAY_NAMES[d.getDay()], cut, chop, tipLabel: isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }) })
    }
  } else {
    const days = daysBack(28)
    for (let w = 0; w < 4; w++) {
      let cut = 0
      let chop = 0
      for (const d of days.slice(w * 7, w * 7 + 7)) {
        const [a, b] = dayTotal(d)
        cut += a
        chop += b
      }
      const label = w === 3 ? 'This week' : `${3 - w} wk ago`
      groups.push({ label, cut, chop, tipLabel: label })
    }
  }
  const H = 180
  const padL = 30
  const padB = 26
  const plotH = H - padB - 14
  const max = Math.max(4, ...groups.map((g) => g.cut + g.chop))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const tick = max / step > 5 ? step * 2 : max / step > 2 ? step : step / 2
  const top = Math.ceil(max / tick) * tick
  const y = (v: number) => (v / top) * plotH
  const slot = (width - padL) / groups.length
  const bw = Math.min(46, slot * 0.56)
  const base = H - padB
  let grid = ''
  for (let v = 0; v <= top; v += tick) {
    const gy = base - y(v)
    grid += `<line class="grid" x1="${padL}" x2="${width}" y1="${gy}" y2="${gy}"/><text class="tick" x="${padL - 6}" y="${gy + 4}" text-anchor="end">${v}</text>`
  }
  const best = groups.reduce((bi, g, i) => (g.cut + g.chop > groups[bi].cut + groups[bi].chop ? i : bi), 0)
  const bars = groups
    .map((g, i) => {
      const x = padL + slot * i + (slot - bw) / 2
      const total = g.cut + g.chop
      const label = total > 0 && (i === best || i === groups.length - 1) ? `<text class="val" x="${x + bw / 2}" y="${base - y(total) - 6}" text-anchor="middle">${total}</text>` : ''
      return `${bar(x, base, bw, y(g.cut), y(g.chop), `${g.tipLabel}: ${g.cut} cut · ${g.chop} chopped`)}${label}<text class="xlab${i === groups.length - 1 ? ' now' : ''}" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${g.label}</text>`
    })
    .join('')
  return `<svg class="chart" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="Cuts and chops ${range === 'week' ? 'per day, last 7 days' : 'per week, last 4 weeks'}">${grid}${bars}</svg>`
}

function jellyRows(totals: Record<string, [number, number]>): string {
  const rows = Object.entries(totals)
    .map(([id, [cut, chop]]) => ({ id, cut, chop, total: cut + chop }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
  if (!rows.length) return ''
  const max = rows[0].total
  return rows
    .map((r) => {
      const name = designById(r.id)?.name ?? r.id
      const cutPct = (r.cut / max) * 100
      const chopPct = (r.chop / max) * 100
      return `
        <div class="jrow" data-tip="${esc(`${name}: ${r.cut} cut · ${r.chop} chopped`)}">
          <span class="jname"><span class="jemoji">${jellyIcon(r.id, 28)}</span>${esc(name)}</span>
          <span class="jbar">
            ${r.cut ? `<i class="s-cut" style="width:${cutPct}%"></i>` : ''}${r.chop ? `<i class="s-chop" style="width:${chopPct}%"></i>` : ''}
          </span>
          <span class="jnums"><b>${r.total}</b><small>${ci('knife', 13)} ${r.cut} · ${ci('chop', 13)} ${r.chop}</small></span>
        </div>`
    })
    .join('')
}

export function renderStats() {
  document.querySelectorAll<HTMLButtonElement>('#stats-range [data-range]').forEach((b) => {
    b.classList.toggle('on', b.dataset.range === range)
    b.onclick = () => {
      range = b.dataset.range as Range
      renderStats()
    }
  })
  const days = range === 'today' ? daysBack(1) : range === 'week' ? daysBack(7) : daysBack(28)
  const totals = perJelly(days)
  let cut = 0
  let chop = 0
  for (const [a, b] of Object.values(totals)) {
    cut += a
    chop += b
  }
  const active = days.filter((d) => {
    const [a, b] = dayTotal(d)
    return a + b > 0
  }).length
  const top = Object.entries(totals).sort((a, b) => b[1][0] + b[1][1] - (a[1][0] + a[1][1]))[0]
  const rangeWord = range === 'today' ? 'today' : range === 'week' ? 'in 7 days' : 'in 4 weeks'

  $('stats-tiles').innerHTML = `
    <div class="tile"><span class="t-label"><i class="dot s-cut"></i>Cut with knife</span><b>${cut}</b><small>${rangeWord}</small></div>
    <div class="tile"><span class="t-label"><i class="dot s-chop"></i>Chopped</span><b>${chop}</b><small>${rangeWord}</small></div>
    <div class="tile"><span class="t-label">Favourite pal</span><b>${top ? `${jellyIcon(top[0], 30)} ${esc(designById(top[0])?.name ?? top[0])}` : '—'}</b><small>${top ? `${top[1][0] + top[1][1]} times` : 'nothing yet'}</small></div>
    <div class="tile"><span class="t-label">Days played</span><b>${active}<span class="of">/${days.length}</span></b><small>${range === 'today' ? 'today' : 'days with a cut'}</small></div>`

  const chartBox = $('stats-timeline')
  chartBox.classList.toggle('hidden', range === 'today')
  if (range !== 'today') {
    const w = Math.max(280, chartBox.clientWidth || 600)
    chartBox.innerHTML = `<h3>${range === 'week' ? 'Each day' : 'Each week'}</h3>${timeline(w - 8)}`
  }

  const list = jellyRows(totals)
  $('stats-jellies').innerHTML = list
    ? `<h3>Each fruit &amp; veggie</h3>${list}`
    : `<div class="empty"><span>${ci('knife', 44)}</span><b>No cuts ${rangeWord} yet</b><small>Grab the knife or chop a jelly — your stats will show up here.</small></div>`

  wireTooltip()
}

// ---------- hover / tap tooltip ----------
let tipWired = false
function wireTooltip() {
  if (tipWired) return
  tipWired = true
  const panel = $('dash')
  const tip = $('stats-tip')
  const show = (e: PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement | SVGElement>('[data-tip]')
    if (!el) {
      tip.classList.add('hidden')
      return
    }
    tip.textContent = el.getAttribute('data-tip')
    tip.classList.remove('hidden')
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14)
    tip.style.left = `${Math.max(8, x)}px`
    tip.style.top = `${e.clientY - tip.offsetHeight - 12}px`
  }
  panel.addEventListener('pointermove', show)
  panel.addEventListener('pointerdown', show)
  panel.addEventListener('pointerleave', () => tip.classList.add('hidden'))
}
