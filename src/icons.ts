// Clean line icons for the tool dock and the bottom bar (24×24, drawn with currentColor).

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

export const ICONS: Record<string, string> = {
  // hand: drag & wobble
  hand: svg(`<path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5.5V4.5a1.5 1.5 0 0 1 3 0v7V6a1.5 1.5 0 0 1 3 0v6.5V9a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.8-2.4L4.6 15.4a1.5 1.5 0 0 1 2.3-1.9L8 14.8"/>`),

  // kitchen knife: swipe to slice
  knife: svg(`<path d="M3.5 20.5 13 11"/><path d="M13 11 19.6 4.4a1.4 1.4 0 0 1 2 0 6 6 0 0 1-1 7.2L15 17.2 11 13"/><path d="M5.5 18.5 3 21"/>`),

  // cleaver: tap to chop
  chop: svg(`<path d="M3 5.5h12.5a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2Z"/><path d="M16.5 8.5h3.2a1.3 1.3 0 0 1 0 2.6h-3.2"/><circle cx="6.5" cy="8.5" r="1"/><path d="M5 19h3M11 19h3"/>`),

  // magnifier plus: grow / shrink
  grow: svg(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6M10.5 7.5v6M7.5 10.5h6"/>`),

  // wobble lines: shake
  shake: svg(`<path d="M7 18c-1.5-4 0-9 5-10.5 5 1.5 6.5 6.5 5 10.5-3 1.5-7 1.5-10 0Z"/><path d="M3 9.5c-.8 1.6-.8 3.4 0 5M21 9.5c.8 1.6.8 3.4 0 5"/>`),

  // arrow down to a floor: gravity
  gravity: svg(`<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>`),

  // soft drop: soft & wobbly
  soft: svg(`<path d="M12 3.5c3.5 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-6 6-10Z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2"/>`),

  // cube: hard
  hard: svg(`<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>`),

  // circular arrow: reset
  reset: svg(`<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>`),

  // smiley: faces on/off
  faces: svg(`<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>`),

  // tag: name tags
  tags: svg(`<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9Z"/><circle cx="8" cy="8" r="1.4"/>`),

  // picture: background
  view: svg(`<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.3"/>`),
}

/** Fill every `[data-icon]` button with its icon and a short label. */
export function decorateToolbar() {
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((btn) => {
    const icon = ICONS[btn.dataset.icon!]
    if (!icon || btn.querySelector('svg')) return
    const label = btn.dataset.label ?? btn.textContent?.trim() ?? ''
    btn.innerHTML = `${icon}<span class="tool-label">${label}</span>`
    btn.setAttribute('aria-label', btn.title || label)
  })
}
