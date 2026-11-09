// Phone motion: the jellies move with the phone.
//
// - Tilt (orientation sensor): tilt the phone and the jellies slide that way.
//   `rx / ry` is the tilt compared with how the player normally holds the phone,
//   so just holding it doesn't make everything slide. With Gravity on, `x / y`
//   is the real "down" direction instead.
// - Movement (motion sensor): move or shake the phone quickly and the jellies
//   slosh the other way, like jelly in a box.
//
// iPhones ask the player for permission the first time (from a tap).

export const tilt = {
  /** Real gravity direction on screen (-1..1). Straight down until the sensor speaks. */
  x: 0,
  y: 1,
  /** Tilt compared with the player's usual grip (-1..1): slides the jellies. */
  rx: 0,
  ry: 0,
  /** True once the orientation sensor has sent real readings. */
  active: false,
  /** Push from moving the phone, collected until the physics uses it. */
  pushX: 0,
  pushY: 0,
}

let listening = false
let baseX = 0
let baseY = 0
let haveBase = false

type PermissionEvent = { requestPermission?: () => Promise<'granted' | 'denied'> }

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)

async function ask(ev: unknown): Promise<boolean> {
  const e = ev as PermissionEvent | undefined
  if (!e || typeof e.requestPermission !== 'function') return true // Android & others: no prompt needed
  try {
    return (await e.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/** Must be called from a tap so iPhones can show their permission prompt. */
export async function enableTilt(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false
  // ask for both at once: the tap that allows a permission prompt only lasts a moment
  const [okOrientation, okMotion] = await Promise.all([
    ask(window.DeviceOrientationEvent),
    'DeviceMotionEvent' in window ? ask(window.DeviceMotionEvent) : Promise.resolve(false),
  ])
  // Always listen: some browsers answer "denied" but still send readings,
  // and when sensors are truly blocked these listeners simply never fire.
  if (!listening) {
    window.addEventListener('deviceorientation', onOrientation)
    window.addEventListener('devicemotion', onMotion)
    listening = true
  }
  return okOrientation || okMotion
}

/** Forget the "usual grip" so the current position becomes level again. */
export function recenterTilt() {
  haveBase = false
}

function screenAngle(): number {
  const a = screen.orientation?.angle
  if (typeof a === 'number') return ((a % 360) + 360) % 360
  const legacy = (window as unknown as { orientation?: number }).orientation
  return typeof legacy === 'number' ? ((legacy % 360) + 360) % 360 : 0
}

/** Turn phone-frame (x right, y down) values into what the screen shows after rotation. */
function toScreen(x: number, y: number): [number, number] {
  switch (screenAngle()) {
    case 90:
      return [y, -x]
    case 180:
      return [-x, -y]
    case 270:
      return [-y, x]
    default:
      return [x, y]
  }
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return
  const rad = Math.PI / 180
  const [x, y] = toScreen(Math.sin(e.gamma * rad), Math.sin(e.beta * rad))

  // real gravity direction (used when the Gravity button is on)
  tilt.x += (clamp(x) - tilt.x) * 0.25
  tilt.y += (clamp(y) - tilt.y) * 0.25

  // tilt compared with the usual grip; the grip slowly adapts if the player changes posture
  if (!haveBase) {
    baseX = x
    baseY = y
    haveBase = true
  } else {
    baseX += (x - baseX) * 0.004
    baseY += (y - baseY) * 0.004
  }
  const dead = 0.04 // ignore tiny hand wobble
  const dx = x - baseX
  const dy = y - baseY
  const rx = Math.abs(dx) < dead ? 0 : clamp((dx - Math.sign(dx) * dead) * 2.2)
  const ry = Math.abs(dy) < dead ? 0 : clamp((dy - Math.sign(dy) * dead) * 2.2)
  tilt.rx += (rx - tilt.rx) * 0.3
  tilt.ry += (ry - tilt.ry) * 0.3
  tilt.active = true
}

function onMotion(e: DeviceMotionEvent) {
  const a = e.acceleration // without gravity: only real hand movement
  if (!a || a.x == null || a.y == null) return
  // device axes: x right, y up → screen axes: x right, y down
  const [sx, sy] = toScreen(a.x, -a.y)
  const strength = Math.hypot(sx, sy)
  if (strength < 1.2) return // ignore small jitters (m/s²)
  // the jellies lag behind the phone, so they are pushed the opposite way
  const k = 0.35
  tilt.pushX = Math.max(-14, Math.min(14, tilt.pushX - sx * k))
  tilt.pushY = Math.max(-14, Math.min(14, tilt.pushY - sy * k))
}

/** Take the collected movement push (and clear it). */
export function takePush(): [number, number] {
  const p: [number, number] = [tilt.pushX, tilt.pushY]
  tilt.pushX = 0
  tilt.pushY = 0
  return p
}
