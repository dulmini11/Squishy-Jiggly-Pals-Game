'use client'
import { useEffect, useMemo, useState } from 'react'
import { CutsChart, JelliesChart, PlayersChart } from '@/components/Charts'
import { demoData, demoMode, loadLive, sum, type Dashboard } from '@/lib/data'

type Range = 7 | 30

export default function Page() {
  const [range, setRange] = useState<Range>(7)
  const [user, setUser] = useState<string | null | undefined>(demoMode ? 'demo' : undefined)
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  // owner sign-in state (only when Firebase is configured)
  useEffect(() => {
    if (demoMode) return
    let stop: (() => void) | undefined
    void import('@/lib/firebase').then(async (m) => {
      stop = await m.watchUser((email) => setUser(email))
    })
    return () => stop?.()
  }, [])

  useEffect(() => {
    if (!user) return
    setError('')
    if (demoMode) {
      setData(demoData(range))
      return
    }
    setData(null)
    loadLive(range)
      .then(setData)
      .catch((e: { code?: string; message?: string }) =>
        setError(
          e.code === 'permission-denied'
            ? `This account (${user}) isn't the owner. Add its email to isAdmin() in shared/firebase/firestore.rules and publish the rules.`
            : `Could not load data: ${e.message ?? e}`,
        ),
      )
  }, [user, range])

  if (user === undefined) return <div className="wrap">Loading…</div>
  if (user === null) return <Login />

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="brand-dot">SJ</div>
          <div>
            <h1>Squishy Jiggly Pals</h1>
            <small>Owner dashboard</small>
          </div>
        </div>
        <div className="seg" role="group" aria-label="Time range">
          <button className={range === 7 ? 'on' : ''} onClick={() => setRange(7)}>
            7 days
          </button>
          <button className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>
            30 days
          </button>
        </div>
        {!demoMode && (
          <button className="pill" onClick={() => void import('@/lib/firebase').then((m) => m.signOut())}>
            Sign out
          </button>
        )}
      </header>

      {demoMode && (
        <div className="demo">
          <b>Demo data.</b> Connect Firebase in <code>dashboard/.env.local</code> to see real players (see the README).
        </div>
      )}
      {error && <div className="demo">{error}</div>}
      {!data && !error && <p>Loading data…</p>}
      {data && <Body data={data} range={range} />}
    </div>
  )
}

function Body({ data, range }: { data: Dashboard; range: Range }) {
  const d = data.days
  const today = d[d.length - 1]
  const yesterday = d[d.length - 2]
  const cuts = sum(d, 'cuts')
  const chops = sum(d, 'chops')
  const wins = sum(d, 'wins')
  const losses = sum(d, 'losses')
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0
  const androidShare = data.totalPlayers ? Math.round((data.platforms.android / data.totalPlayers) * 100) : 0
  const diff = today && yesterday ? today.players - yesterday.players : 0
  const levels = useMemo(() => [...data.levels].sort((a, b) => a.world.localeCompare(b.world) || a.index - b.index), [data.levels])
  const hardest = useMemo(() => [...data.levels].filter((l) => l.plays >= 5).sort((a, b) => a.winRate - b.winRate)[0], [data.levels])

  return (
    <>
      <section className="tiles">
        <Tile label="Players today" value={today?.players ?? 0} sub={`${diff >= 0 ? '+' : ''}${diff} vs yesterday`} />
        <Tile label="Total players" value={data.totalPlayers} sub="all time" />
        <Tile label="Sessions" value={sum(d, 'sessions')} sub={`last ${range} days`} />
        <Tile label="Cuts + chops" value={cuts + chops} sub={`${cuts + chops ? Math.round((chops / (cuts + chops)) * 100) : 0}% chops`} />
        <Tile label="Level win rate" value={`${winRate}%`} sub={`${wins.toLocaleString()} wins`} />
        <Tile label="On Android" value={`${androidShare}%`} sub={`${data.platforms.android.toLocaleString()} players`} />
      </section>

      <section className="grid2">
        <div className="card">
          <h2>Daily players</h2>
          <p className="hint">Different players who opened the game each day</p>
          <PlayersChart days={d} />
        </div>
        <div className="card">
          <h2>Cuts and chops per day</h2>
          <p className="hint">How players use the knife vs the chop tool</p>
          <CutsChart days={d} />
        </div>
      </section>

      <section className="grid2">
        <div className="card">
          <h2>Level difficulty</h2>
          <p className="hint">
            Win rate per level{hardest ? ` · hardest: ${hardest.name} (${hardest.worldName}) at ${Math.round(hardest.winRate * 100)}%` : ''}. Orange = under 50%.
          </p>
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th className="num">Plays</th>
                <th>Win rate</th>
                <th className="num">Avg ★</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.index + 1}. {l.name}
                    <div className="world">{l.worldName}</div>
                  </td>
                  <td className="num">{l.plays.toLocaleString()}</td>
                  <td>
                    <div className="bar-cell">
                      <i className={l.winRate < 0.5 ? 'hard' : ''} style={{ width: `${Math.max(3, l.winRate * 100)}px` }} />
                      {Math.round(l.winRate * 100)}%
                    </div>
                  </td>
                  <td className="num">{l.avgStars.toFixed(1)}</td>
                </tr>
              ))}
              {!levels.length && (
                <tr>
                  <td colSpan={4}>No level plays yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card">
            <h2>Most-cut fruits &amp; veggies</h2>
            <p className="hint">Last {range} days, top 10</p>
            {data.jellies.length ? <JelliesChart jellies={data.jellies} /> : <p>No cuts yet.</p>}
          </div>
          <div className="card">
            <h2>Rush leaderboard</h2>
            <p className="hint">Best score per player, all time</p>
            <table>
              <tbody>
                {data.rush.map((r, i) => (
                  <tr key={r.name + i}>
                    <td className="rank">{i + 1}</td>
                    <td>{r.name}</td>
                    <td className="num">
                      <b>{r.score.toLocaleString()}</b>
                    </td>
                  </tr>
                ))}
                {!data.rush.length && (
                  <tr>
                    <td>No Rush games yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="login"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setErr('')
        try {
          const m = await import('@/lib/firebase')
          await m.signIn(email, password)
        } catch {
          setErr('Wrong email or password.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <h1>Owner sign in</h1>
      <p>Squishy Jiggly Pals dashboard</p>
      <input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <div className="error">{err}</div>}
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
