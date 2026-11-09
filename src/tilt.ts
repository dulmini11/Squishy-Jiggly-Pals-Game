// Tilt-the-phone gravity. Reads the device orientation sensor and turns it
// into a gravity direction. iPhones ask the player for permission first.

export const tilt = {
  /** Gravity direction on screen, each from -1 to 1. Starts as straight down. */
  x: 0,
  y: 1,
  /** True once the sensor has sent real readings. */
  active: false,
}

let listening = false

type PermissionDOE = { requestPermission?: () => Promise<'granted' | 'denied'> }

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)

/** Must be called from a tap/click so iPhones can show the permission prompt. */
export async function enableTilt(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false
  const DOE = window.DeviceOrientationEvent as unknown as PermissionDOE
  try {
    if (typeof DOE.requestPermission === 'function') {
      const answer = await DOE.requestPermission()
      if (answer !== 'granted') return false
    }
  } catch {
    return false
  }
  if (!listening) {
    window.addEventListener('deviceorientation', onOrientation)
    listening = true
  }
  return true
}

function screenAngle(): number {
  const a = screen.orientation?.angle
  if (typeof a === 'number') return a
  const legacy = (window as unknown as { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return
  const rad = Math.PI / 180
  // phone held upright: beta ≈ 90 → falls down the screen; tilted sideways: gamma
  const gx = Math.sin(e.gamma * rad)
  const gy = Math.sin(e.beta * rad)
  let x = gx
  let y = gy
  switch (((screenAngle() % 360) + 360) % 360) {
    case 90:
      x = gy
      y = -gx
      break
    case 180:
      x = -gx
      y = -gy
      break
    case 270:
      x = -gy
      y = gx
      break
  }
  // smooth the sensor so the jellies don't twitch
  tilt.x += (clamp(x) - tilt.x) * 0.25
  tilt.y += (clamp(y) - tilt.y) * 0.25
  tilt.active = true
}
