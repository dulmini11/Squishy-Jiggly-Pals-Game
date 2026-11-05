# Squishy Jiggly Pals

A squishy soft-body toy: drag jelly fruits to wobble them, slice them with the knife, scale and shake them.

```bash
npm install
npm run dev
```

## Features

- **Landing page** with Play Levels, Rush Mode and Free Play — the jellies hop around behind it.
- **10 levels** (First Chop → Master Chef) with fixed orders, a timer, 1–3 stars and unlocks. Progress is saved in the browser.
- **Cute veggies**: mushroom, carrot, tomato, cucumber, eggplant, onion, leek, beetroot (in `src/veggies.ts`), alongside the fruits.

- **Cute faces**: jellies blink, watch your cursor, squeeze their eyes `> <` when grabbed and look surprised when sliced or thrown.
- **Drag** to wobble, **double-tap** to eat (juicy splash), **throw fast** to fling.
- **Knife** (`K`): swipe across a jelly to slice it; juice sprays and stains the table.
- **Scale** (`S`): click to grow, Shift/right-click to shrink; the mouse wheel works anywhere.
- **Gravity** (`G`): jellies fall and pile up. **Shake** (`Space`) bounces them.
- **Challenge**: a 60-second round of random orders (slice, eat, wobble, grow, shrink, fling).
  Each order you finish adds +5s; finishing orders quickly builds a combo (up to ×5). Your best score is saved.
- Faces / Tags / View (3 themes) / sound toggles.

Add new fruits in `src/art.ts`, veggies in `src/veggies.ts`, levels in `src/levels.ts`. The round engine is `src/quest.ts`.
