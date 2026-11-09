// Badges: goals with a progress bar and a coin reward when earned.
import { TRACKS, loadStars, type Basket } from './levels.ts'
import { STARTER_JELLIES, UNLOCK_AT, save } from './progress.ts'

export type Badge = {
  id: string
  name: string
  emoji: string
  desc: string
  goal: number
  reward: number
  /** Current progress toward `goal`. */
  value: () => number
}

const totalStars = () => (['fruit', 'veggie', 'both'] as Basket[]).reduce((sum, b) => sum + loadStars(b).reduce((a, s) => a + (s || 0), 0), 0)

/** Levels in a world finished with 3 stars. */
const perfectLevels = (b: Basket) => loadStars(b).filter((s) => s === 3).length

const allJellies = STARTER_JELLIES.length + Object.keys(UNLOCK_AT).length

export const BADGES: Badge[] = [
  { id: 'first-chop', name: 'First Chop', emoji: '🔪', desc: 'Slice your first jelly', goal: 1, reward: 20, value: () => save.stats.slices },
  { id: 'carrot-100', name: 'Carrot Chopper', emoji: '🥕', desc: 'Slice 100 carrots', goal: 100, reward: 150, value: () => save.stats.slicedBy.carrot || 0 },
  { id: 'strawberry-50', name: 'Berry Lover', emoji: '🍓', desc: 'Slice 50 strawberries', goal: 50, reward: 120, value: () => save.stats.slicedBy.strawberry || 0 },
  { id: 'mushroom-50', name: 'Mushroom Hunter', emoji: '🍄', desc: 'Slice 50 mushrooms', goal: 50, reward: 120, value: () => save.stats.slicedBy.mushroom || 0 },
  { id: 'slices-500', name: 'Juice Master', emoji: '🧃', desc: 'Slice 500 jellies', goal: 500, reward: 250, value: () => save.stats.slices },
  { id: 'eat-50', name: 'Hungry Pal', emoji: '😋', desc: 'Eat 50 jellies', goal: 50, reward: 120, value: () => save.stats.eaten },
  { id: 'wobble-200', name: 'Jiggle Fan', emoji: '🫳', desc: 'Wobble jellies 200 times', goal: 200, reward: 100, value: () => save.stats.wobbles },
  { id: 'fling-25', name: 'Fast Thrower', emoji: '💨', desc: 'Fling 25 jellies', goal: 25, reward: 100, value: () => save.stats.flings },
  { id: 'cut-3', name: 'Triple Cut', emoji: '✨', desc: 'Cut 3 jellies in one swipe', goal: 3, reward: 100, value: () => save.stats.bestCut },
  { id: 'cut-5', name: 'Mega Slicer', emoji: '⚡', desc: 'Cut 5 jellies in one swipe', goal: 5, reward: 250, value: () => save.stats.bestCut },
  { id: 'combo-5', name: 'Combo King', emoji: '🔥', desc: 'Reach a ×5 combo', goal: 5, reward: 150, value: () => save.stats.bestCombo },
  { id: 'orders-100', name: 'Busy Chef', emoji: '🧑‍🍳', desc: 'Serve 100 orders', goal: 100, reward: 200, value: () => save.stats.orders },
  { id: 'rush-1500', name: 'Rush Hero', emoji: '⚡', desc: 'Score 1,500 in Rush mode', goal: 1500, reward: 200, value: () => save.stats.bestRush },
  { id: 'stars-30', name: 'Star Collector', emoji: '⭐', desc: 'Collect 30 stars', goal: 30, reward: 200, value: totalStars },
  { id: 'perfect-fruit', name: 'Perfect Fruits', emoji: '🏝️', desc: '3 stars on every Fruit Island level', goal: TRACKS.fruit.length, reward: 300, value: () => perfectLevels('fruit') },
  { id: 'perfect-veggie', name: 'Perfect Veggies', emoji: '🌄', desc: '3 stars on every Veggie Valley level', goal: TRACKS.veggie.length, reward: 300, value: () => perfectLevels('veggie') },
  { id: 'perfect-both', name: 'Perfect Picnic', emoji: '🧺', desc: '3 stars on every Picnic Park level', goal: TRACKS.both.length, reward: 300, value: () => perfectLevels('both') },
  { id: 'level-5', name: 'Rising Star', emoji: '🌟', desc: 'Reach player level 5', goal: 5, reward: 100, value: () => save.level },
  { id: 'level-10', name: 'Jelly Pro', emoji: '🏅', desc: 'Reach player level 10', goal: 10, reward: 250, value: () => save.level },
  { id: 'all-jellies', name: 'Full Basket', emoji: '🧺', desc: 'Unlock every fruit and veggie', goal: allJellies, reward: 300, value: () => save.unlocked.length },
  { id: 'shopper-5', name: 'Shopaholic', emoji: '🛍️', desc: 'Buy 5 things in the shop', goal: 5, reward: 100, value: () => save.stats.bought },
]
