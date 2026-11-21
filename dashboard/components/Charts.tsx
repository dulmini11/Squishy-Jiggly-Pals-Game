'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayRow, JellyRow } from '@/lib/data'

/** Chart colours come from the CSS tokens, so light/dark mode both work. */
export function useColors() {
  const read = () => {
    if (typeof window === 'undefined') return { s1: '#2a78d6', s2: '#eb6834', grid: '#ececf2', ink2: '#52514e', muted: '#8a8a96' }
    const cs = getComputedStyle(document.documentElement)
    const v = (n: string) => cs.getPropertyValue(n).trim()
    return { s1: v('--series-1'), s2: v('--series-2'), grid: v('--grid'), ink2: v('--ink-2'), muted: v('--muted') }
  }
  const [c, setC] = useState(read)
  useEffect(() => {
    setC(read())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setC(read())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return c
}

const fmt = (n: number) => n.toLocaleString()
const short = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))

function Tip({ active, payload, label, names }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; names?: Record<string, string> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      <b>{label}</b>
      {payload.map((p) => (
        <div key={p.name}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />
          {names?.[p.name] ?? p.name}: <b style={{ display: 'inline' }}>{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

function Legend2({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <div className="legend">
      <span>
        <i style={{ background: c.s1 }} />
        Knife cuts
      </span>
      <span>
        <i style={{ background: c.s2 }} />
        Chops
      </span>
    </div>
  )
}

/** Daily active players: one series, so the title names it and there is no legend. */
export function PlayersChart({ days }: { days: DayRow[] }) {
  const c = useColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={{ stroke: c.grid }} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<Tip names={{ players: 'Players' }} />} cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} />
        <Line type="monotone" dataKey="players" stroke={c.s1} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Knife cuts vs chops per day, stacked. */
export function CutsChart({ days }: { days: DayRow[] }) {
  const c = useColors()
  return (
    <>
      <Legend2 c={c} />
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -10 }} barCategoryGap="28%">
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={{ stroke: c.grid }} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} tickFormatter={short} />
          <Tooltip content={<Tip names={{ cuts: 'Knife cuts', chops: 'Chops' }} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
          <Bar dataKey="cuts" stackId="a" fill={c.s1} />
          <Bar dataKey="chops" stackId="a" fill={c.s2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}

/** Most-cut fruits & veggies, knife + chop stacked sideways. */
export function JelliesChart({ jellies }: { jellies: JellyRow[] }) {
  const c = useColors()
  const top = jellies.slice(0, 10)
  return (
    <>
      <Legend2 c={c} />
      <ResponsiveContainer width="100%" height={Math.max(160, top.length * 30 + 20)}>
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap="26%">
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} tickFormatter={short} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: c.ink2 }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip names={{ cut: 'Knife cuts', chop: 'Chops' }} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
          <Bar dataKey="cut" stackId="j" fill={c.s1} />
          <Bar dataKey="chop" stackId="j" fill={c.s2} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
