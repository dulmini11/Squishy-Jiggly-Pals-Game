import { defineConfig } from 'vite'

// base './' so the built game works from any folder: GitHub Pages, Netlify,
// and inside the Android app (Capacitor loads it from local files).
export default defineConfig({
  base: './',
  build: {
    // Firebase is split into its own chunks that only load when stats are switched on,
    // so its size doesn't slow down the game's first load.
    chunkSizeWarningLimit: 700,
  },
})
