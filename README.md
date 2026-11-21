# Squishy Jiggly Pals

A cute soft-body game: slice, chop, squish and snack jelly fruits and veggies.
This repo holds four separate parts that share one data model.

| Folder | What it is | Tech |
| --- | --- | --- |
| `game/` | The game (web, and the inside of the phone app) | TypeScript + HTML Canvas + Vite |
| `dashboard/` | Owner dashboard: players, levels, jellies, Rush scores | Next.js + React + Recharts |
| `shared/` | Data model used by both, plus Firebase security rules | TypeScript, Firestore rules |
| `mobile/` | Android app that wraps the game | Capacitor |

```
game ──writes stats──▶ Firebase (Firestore) ◀──reads── dashboard
  │
  └─ built into ──▶ mobile (Android app)
```

## Quick start

Run these **inside this folder** (`fruit game`), not in another project:

```bash
npm install            # installs all four parts at once
npm run dev:game       # game on http://localhost:5173
npm run dev:dashboard  # dashboard on http://localhost:3100
```

Without Firebase the game runs normally and sends nothing, and the dashboard shows **demo data**.

## 1. Connect Firebase (shared data)

1. Go to <https://console.firebase.google.com>, click **Add project**, give it a name (Google Analytics is optional).
2. **Build → Firestore Database → Create database** (production mode, pick a region near you).
3. **Build → Authentication → Get started**, then enable:
   - **Anonymous** (players are signed in automatically, no login screen)
   - **Email/Password** (for you, the owner, to open the dashboard)
4. In **Authentication → Users → Add user**, create your owner login (email + password).
5. Open `shared/firebase/firestore.rules`, replace `owner@example.com` with that email, then in **Firestore → Rules** paste the file and **Publish**.
6. **Project settings → Your apps → Web (`</>`)**, register an app, and copy the config values.
7. Copy `game/.env.example` to `game/.env.local` and `dashboard/.env.example` to `dashboard/.env.local`, and paste the four values into both.
8. Restart `npm run dev:game` and `npm run dev:dashboard`. Play a level, then sign in to the dashboard.

What the game stores (all anonymous):

| Collection | One document per | Used for |
| --- | --- | --- |
| `days/{date}` | day | sessions, cuts, chops, eats, wins, losses, Rush games, cuts per jelly |
| `days/{date}/players/{id}` | player per day | daily players |
| `players/{id}` | player | total players, platform (web / Android), level, coins |
| `levels/{world}_{n}` | level | plays, wins, losses, average stars |
| `rush/{id}` | player | public Rush leaderboard |

## 2. Dashboard

```bash
npm run dev:dashboard     # local
npm run build:dashboard   # production build
```

Deploy for free on **Vercel**: import the repo, set **Root Directory** to `dashboard`, and add the four
`NEXT_PUBLIC_FIREBASE_*` values as environment variables.

## 3. Android app

You need **Android Studio** (it includes the Android SDK and the right Java) and several GB of free disk space.

```bash
npm run mobile:sync   # builds the game and copies it into the Android project
npm run mobile:open   # opens the project in Android Studio
```

In Android Studio press **Run ▶** for a phone or emulator, or **Build → Generate Signed App Bundle / APK** for the Play Store.
Run `npm run mobile:sync` again after every game change. The app name and id are in `mobile/capacitor.config.json`.

## 4. The game on the web

```bash
npm run build:game   # output in game/dist (works from any folder: GitHub Pages, Netlify, Vercel)
```

## Where things live in the game

- Fruits: `game/src/art.ts` · Veggies: `game/src/veggies.ts` · Special jellies: `game/src/specials.ts`
- Levels, missions and level rules: `game/src/levels.ts` · Round engine and timer: `game/src/quest.ts`
- Shop items: `game/src/catalog.ts` · Badges: `game/src/badges.ts` · Save data: `game/src/progress.ts`
- Stats sent to Firebase: `game/src/telemetry.ts`
