<div align="center">

# Dhikrullah

### ذِكْرُ الله

**Your daily dhikr companion — remember Allah, beautifully.**

[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-A78BFA.svg)](LICENSE)

</div>

---

Dhikrullah is a calm, offline-first mobile app for building a daily habit of
*dhikr* — the remembrance of Allah. It pairs an authentic, scholar-reviewed
collection of adhkar with prayer-time awareness, gentle haptics, audio
recitations and a deeply themeable interface, so the right adhkar are always
one tap away at the right moment of the day.

> *"Should I not inform you of the best of your deeds? … Dhikrullah — the remembrance of Allah."*
> — The Prophet Muhammad ﷺ (Tirmidhi 3377)

## ✨ Features

- **🕌 Prayer-time aware** — Adhkar organised across the day (Fajr, morning,
  Dhuhr, Asr, evening, Maghrib, Isha, Witr, waking up, before bed and all-day),
  with windows computed from your location using the [`adhan`](https://github.com/batoulapps/adhan-js)
  library and your chosen calculation method (incl. Hanafi Asr).
- **📿 Beautiful tasbih counter** — A mihrab-shaped counter with progress rings,
  per-dhikr targets, swipeable cards, and satisfying haptic feedback on every
  count and completion.
- **🔊 Audio recitations** — Listen to each dhikr, bundled for fully offline use.
- **🎨 80 hand-crafted themes** — A rich palette library with light/dark variants,
  adjustable Arabic & English fonts, and per-script text sizing.
- **🔔 Smart reminders** — Per-category notifications timed to prayer windows,
  with adjustable offsets and selectable notification sounds.
- **📊 Stats & streaks** — Track time spent in dhikr and your daily progress.
- **🎓 Interactive tutorial** — A guided, sandboxed walkthrough of the counter.
- **📴 Offline-first** — Content ships in the app; an on-device SQLite database
  (via Drizzle ORM) stores your counts, preferences and stats. No account needed.

## 📱 Screenshots

> _Add screenshots here._

| Home | Counter | Themes | Settings |
| :--: | :-----: | :----: | :------: |
| _coming soon_ | _coming soon_ | _coming soon_ | _coming soon_ |

## 🛠 Tech Stack

- **[Expo](https://expo.dev) (SDK 54)** + **[Expo Router](https://docs.expo.dev/router/introduction/)** — app framework & file-based navigation
- **[React Native](https://reactnative.dev) 0.81** + **React 19** + **TypeScript**
- **[Drizzle ORM](https://orm.drizzle.team)** over **expo-sqlite** — local persistence
- **[react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)** & **gesture-handler** — animations & gestures
- **[adhan](https://github.com/batoulapps/adhan-js)** — prayer-time calculation
- **expo-audio**, **expo-notifications**, **expo-location**, **react-native-svg**

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- The [Expo Go](https://expo.dev/go) app on your device, or an iOS Simulator / Android Emulator

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start
```

Then scan the QR code with Expo Go, or press `i` / `a` to open an iOS Simulator
or Android Emulator. Native folders (`ios/`, `android/`) are generated on demand
via [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/) —
run `npx expo prebuild` if you need them locally.

## 📁 Project Structure

```
app/              Expo Router screens (splash, onboarding, tabs, counter)
components/       Reusable UI (counter tile, theme swatches, modals, …)
context/          React Context providers (Theme, Prefs, Counter, Favourites)
constants/        Theme palettes & static content
db/               Drizzle schema, queries, audio map & JSON seed data
lib/              Prayer times, notifications, fonts, haptics, utilities
hooks/            Custom hooks (counter, quotes)
assets/           Fonts, icons, audio & notification sounds
scripts/          Content build tooling
```

## 🧩 Scripts

| Command | Description |
| ------- | ----------- |
| `npx expo start` | Start the Metro dev server |
| `npm run ios` / `npm run android` | Build & run on a native device/simulator |
| `npx tsc --noEmit` | Type-check the project |
| `npm run db:generate` | Generate Drizzle migrations |

## 🤝 Contributing

Contributions, bug reports and ideas are welcome! Please open an issue to
discuss substantial changes first. Keep PRs focused and run `npx tsc --noEmit`
before submitting.

## 📜 License

Released under the [MIT License](LICENSE).

<div align="center">

*Made with care, for the remembrance of Allah.*

</div>
