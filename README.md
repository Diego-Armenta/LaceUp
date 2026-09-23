# LaceUp

A local-first desktop app for marathon training. You give it your goal race and time; it builds a training plan, logs your runs, and adjusts the plan based on how your actual runs compare to what was planned — not just blindly sticking to a static schedule.
<<<<<<< HEAD

Built with [Tauri](https://tauri.app), so it runs as a real native app (small footprint, no bundled browser), not a website.

## Status

🚧 Early development — UI shell is complete and running; data persistence and the adaptive logic are not yet wired in.

- [x] Desktop app shell (Tauri + vanilla TS/HTML/CSS)
- [x] Four core screens: Dashboard, Training Plan, Log a Run, Profile
- [ ] Local database (SQLite) for runs, profile, and plan
- [ ] Forms actually save data (currently UI-only)
- [ ] Training plan generation from goal + current fitness
- [ ] Trend detection (`training-context-builder.ts`) wired to real run history
- [ ] AI-assisted next-run suggestions (`ai-suggestion-service.ts`) via the Claude API
- [ ] Secure local storage for the Anthropic API key

## Features (planned)

- **Profile** — stores your metrics (age, current weekly mileage, recent race times) and goal race (distance, date, target time)
- **Training plan** — generated from your goal and fitness, organized by phase (Base / Build / Peak & Taper)
- **Run log** — manual entry per run: distance, duration/pace, RPE (1–10), and free-text notes on how it felt
- **Adaptive suggestions** — after each run, local trend detection flags whether recent workouts of the same type are consistently falling short of plan. On demand, an AI call reads that trend alongside your notes to tell a real pattern (overreaching, unrealistic pace target) apart from noise (a couple of rough days), and suggests the next workout accordingly
- **Fully local** — no accounts, no login. Everything is stored on your machine. The only network call is the on-demand AI suggestion request

## Tech stack

- **Shell:** [Tauri](https://tauri.app) (Rust)
- **Frontend:** Vanilla TypeScript / HTML / CSS (no framework)
- **Fonts:** Barlow Condensed (headlines), IBM Plex Sans (UI text), IBM Plex Mono (numeric data — paces, splits, distances)
- **Planned:** SQLite via `@tauri-apps/plugin-sql` for local persistence; Anthropic API (`claude-sonnet-5`) for adaptive suggestions

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [Rust](https://rustup.rs)
- Platform build tools:
  - **Windows:** "Desktop development with C++" workload (Visual Studio Build Tools)
  - **macOS:** Xcode Command Line Tools
  - **Linux:** WebKitGTK dev packages — see [Tauri's prerequisites guide](https://tauri.app/start/prerequisites/)

> **Windows note:** if you hit `An Application Control policy has blocked this file (os error 4551)` during the first build, Windows Smart App Control is blocking the freshly compiled build script. Disable it under **Windows Security → App & browser control → Smart App Control**. Note this is typically one-way — re-enabling later usually requires a Windows reset.

### Install and run

```bash
npm install
npm run tauri dev
```

This opens the app in a native window with hot-reload on frontend changes. Changes to the Rust side (`src-tauri/`) require restarting the command.

### Build a release binary

```bash
npm run tauri build
```

## Project structure

```
LaceUp/
├── index.html                      # UI shell — all four screens, styles, nav logic
├── src/
│   ├── training-context-builder.ts # Builds markdown context from run history + goal;
│   │                                # local (no API) trend detection
│   └── ai-suggestion-service.ts    # Sends context to Claude API, returns next-run
│                                    # suggestion + pattern read
├── src-tauri/                      # Rust shell (Tauri-generated)
│   └── tauri.conf.json
├── package.json
└── README.md
```

## How the adaptive suggestion works

1. **Local trend detection** (`analyzeTrend`) — runs entirely on-device against your logged history. Compares the last few same-type workouts (e.g. last 3 tempo runs) on pace delta and RPE delta vs. what was planned, and flags the result as `on-track`, `watch`, or `recalibrate`. No network call, no cost.
2. **Context snapshot** (`buildContextMarkdown`) — compiles your goal, the next planned workout, the trend flags, and recent run history (including free-text "how it felt" notes) into a single markdown document.
3. **AI read** (`getNextRunSuggestion`) — on demand only (not automatic), that markdown is sent to the Claude API. The model's job is specifically to separate a *real* pattern (fatigue, an unrealistic pace target) from *noise* (a couple of rough days explained by the notes — heat, illness, poor sleep) and recommend whether the next workout should proceed as planned, be eased, or be swapped.

This keeps the app fully functional and offline for logging and plan viewing — the only time it needs a connection is when you explicitly ask for a suggestion.

## License

Personal project — license TBD.
=======

Built with [Tauri](https://tauri.app), so it runs as a real native app (small footprint, no bundled browser), not a website.

## Status

🚧 Early development — UI shell is complete and running; data persistence and the adaptive logic are not yet wired in.

- [x] Desktop app shell (Tauri + vanilla TS/HTML/CSS)
- [x] Four core screens: Dashboard, Training Plan, Log a Run, Profile
- [ ] Local database (SQLite) for runs, profile, and plan
- [ ] Forms actually save data (currently UI-only)
- [ ] Training plan generation from goal + current fitness
- [ ] Trend detection (`training-context-builder.ts`) wired to real run history
- [ ] AI-assisted next-run suggestions (`ai-suggestion-service.ts`) via the Claude API
- [ ] Secure local storage for the Anthropic API key

## Features (planned)

- **Profile** — stores your metrics (age, current weekly mileage, recent race times) and goal race (distance, date, target time)
- **Training plan** — generated from your goal and fitness, organized by phase (Base / Build / Peak & Taper)
- **Run log** — manual entry per run: distance, duration/pace, RPE (1–10), and free-text notes on how it felt
- **Adaptive suggestions** — after each run, local trend detection flags whether recent workouts of the same type are consistently falling short of plan. On demand, an AI call reads that trend alongside your notes to tell a real pattern (overreaching, unrealistic pace target) apart from noise (a couple of rough days), and suggests the next workout accordingly
- **Fully local** — no accounts, no login. Everything is stored on your machine. The only network call is the on-demand AI suggestion request

## Tech stack

- **Shell:** [Tauri](https://tauri.app) (Rust)
- **Frontend:** Vanilla TypeScript / HTML / CSS (no framework)
- **Fonts:** Barlow Condensed (headlines), IBM Plex Sans (UI text), IBM Plex Mono (numeric data — paces, splits, distances)
- **Planned:** SQLite via `@tauri-apps/plugin-sql` for local persistence; Anthropic API (`claude-sonnet-5`) for adaptive suggestions

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [Rust](https://rustup.rs)
- Platform build tools:
  - **Windows:** "Desktop development with C++" workload (Visual Studio Build Tools)
  - **macOS:** Xcode Command Line Tools
  - **Linux:** WebKitGTK dev packages — see [Tauri's prerequisites guide](https://tauri.app/start/prerequisites/)

> **Windows note:** if you hit `An Application Control policy has blocked this file (os error 4551)` during the first build, Windows Smart App Control is blocking the freshly compiled build script. Disable it under **Windows Security → App & browser control → Smart App Control**. Note this is typically one-way — re-enabling later usually requires a Windows reset.

### Install and run

```bash
npm install
npm run tauri dev
```

This opens the app in a native window with hot-reload on frontend changes. Changes to the Rust side (`src-tauri/`) require restarting the command.

### Build a release binary

```bash
npm run tauri build
```

## Project structure

```
LaceUp/
├── index.html                      # UI shell — all four screens, styles, nav logic
├── src/
│   ├── training-context-builder.ts # Builds markdown context from run history + goal;
│   │                                # local (no API) trend detection
│   └── ai-suggestion-service.ts    # Sends context to Claude API, returns next-run
│                                    # suggestion + pattern read
├── src-tauri/                      # Rust shell (Tauri-generated)
│   └── tauri.conf.json
├── package.json
└── README.md
```

## How the adaptive suggestion works

1. **Local trend detection** (`analyzeTrend`) — runs entirely on-device against your logged history. Compares the last few same-type workouts (e.g. last 3 tempo runs) on pace delta and RPE delta vs. what was planned, and flags the result as `on-track`, `watch`, or `recalibrate`. No network call, no cost.
2. **Context snapshot** (`buildContextMarkdown`) — compiles your goal, the next planned workout, the trend flags, and recent run history (including free-text "how it felt" notes) into a single markdown document.
3. **AI read** (`getNextRunSuggestion`) — on demand only (not automatic), that markdown is sent to the Claude API. The model's job is specifically to separate a *real* pattern (fatigue, an unrealistic pace target) from *noise* (a couple of rough days explained by the notes — heat, illness, poor sleep) and recommend whether the next workout should proceed as planned, be eased, or be swapped.

This keeps the app fully functional and offline for logging and plan viewing — the only time it needs a connection is when you explicitly ask for a suggestion.


>>>>>>> 84159acfbe9cc9c1a0723f1220dc093b514ebfd4
