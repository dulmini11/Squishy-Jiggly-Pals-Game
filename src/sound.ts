// Tiny synthesized sound kit — no audio files needed.
let ac: AudioContext | null = null

function ctx(): AudioContext | null {
  if (sfx.muted) return null
  if (!ac) ac = new AudioContext()
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, delay = 0) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  muted: false,
  unlock() {
    ctx()
  },
  pop() {
    tone(420 + Math.random() * 200, 980, 0.09, 'triangle', 0.12)
  },
  grab() {
    tone(260, 560, 0.1, 'sine', 0.16)
  },
  wobble() {
    const a = ctx()
    if (!a) return
    const t = a.currentTime
    const o = a.createOscillator()
    const lfo = a.createOscillator()
    const depth = a.createGain()
    const g = a.createGain()
    o.frequency.setValueAtTime(240, t)
    o.frequency.exponentialRampToValueAtTime(150, t + 0.45)
    lfo.frequency.setValueAtTime(13, t)
    depth.gain.setValueAtTime(45, t)
    depth.gain.exponentialRampToValueAtTime(1, t + 0.45)
    lfo.connect(depth).connect(o.frequency)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    o.connect(g).connect(a.destination)
    o.start(t)
    lfo.start(t)
    o.stop(t + 0.5)
    lfo.stop(t + 0.5)
  },
  slice() {
    const a = ctx()
    if (!a) return
    const t = a.currentTime
    const len = Math.floor(a.sampleRate * 0.16)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
    const src = a.createBufferSource()
    src.buffer = buf
    const hp = a.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2200
    const g = a.createGain()
    g.gain.value = 0.22
    src.connect(hp).connect(g).connect(a.destination)
    src.start(t)
    tone(900, 320, 0.14, 'sine', 0.12, 0.02)
  },
  scale(up: boolean) {
    tone(up ? 400 : 700, up ? 820 : 330, 0.12, 'triangle', 0.12)
  },
  eat() {
    const a = ctx()
    if (!a) return
    for (let k = 0; k < 3; k++) {
      const t = a.currentTime + k * 0.07
      const len = Math.floor(a.sampleRate * 0.06)
      const buf = a.createBuffer(1, len, a.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
      const src = a.createBufferSource()
      src.buffer = buf
      const lp = a.createBiquadFilter()
      lp.type = 'bandpass'
      lp.frequency.value = 900 + k * 300
      const g = a.createGain()
      g.gain.value = 0.35
      src.connect(lp).connect(g).connect(a.destination)
      src.start(t)
    }
    tone(500, 1100, 0.12, 'sine', 0.1, 0.22)
  },
  whoosh() {
    tone(900, 200, 0.25, 'sine', 0.08)
  },
  success() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.18, 'triangle', 0.12, i * 0.07))
  },
  tick() {
    tone(1200, 1150, 0.05, 'square', 0.04)
  },
  start() {
    ;[392, 523, 659].forEach((f, i) => tone(f, f, 0.14, 'triangle', 0.12, i * 0.12))
  },
  win() {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.13, i * 0.09))
    tone(1568, 1568, 0.5, 'sine', 0.08, 0.5)
  },
  over() {
    ;[659, 523, 440, 330].forEach((f, i) => tone(f, f * 0.98, 0.22, 'triangle', 0.12, i * 0.14))
  },
  shake() {
    for (let i = 0; i < 5; i++) tone(200 + Math.random() * 500, 120 + Math.random() * 300, 0.18, 'sine', 0.08, i * 0.04)
  },
}
