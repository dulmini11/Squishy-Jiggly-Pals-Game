// Copies the built game (game/dist) into mobile/www, which Capacitor packs into the Android app.
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const from = join(here, '..', 'game', 'dist')
const to = join(here, 'www')

if (!existsSync(from)) {
  console.error('game/dist not found — run "npm run build -w game" first.')
  process.exit(1)
}
rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
console.log('Copied game/dist → mobile/www')
