# Bento Blast Puzzle Game — Technical Specification

Oct 8, 2026 · @Drew

## Overview

We are building a Block Blast–style puzzle game for iOS/Android in React Native, tested on a real phone through an Expo custom development client (not Expo Go). The project has two equal goals: ship a game that is fun to play, and learn professional mobile-development skills along the way.

**Working name:** Bento Blast

### Learning goals

- TypeScript and clean separation between game logic and UI
- React Native fundamentals: layout, gestures, animation, performance
- Expo tooling: config, native modules, development builds, EAS
- Automated testing of pure game logic
- Git workflow: branches, small commits, pull requests

## Scope

| Phase            | Includes                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| MVP              | 8×8 board, 3-piece tray, drag-and-drop placement, row/column clears, score, best score, game over, restart |
| Polish           | Clear animations, combo effects, haptics, sound, settings screen                                           |
| Later (optional) | Themes, daily challenge with seeded pieces, stats screen, undo power-up, leaderboards, store release       |

**Out of scope for now:** monetization, ads, accounts, multiplayer.

## Game rules and mechanics

The player drags pieces from a tray of three onto an 8×8 grid; full rows and columns clear, and the game ends when none of the remaining pieces fits anywhere.

1. **Board.** 8×8 grid. Each cell is empty or filled with a color.
2. **Tray.** Three pieces are dealt at once. The player may place them in any order. A new set of three is dealt only after all three are placed.
3. **Pieces.** Fixed polyomino shapes (single block, 2–5 lines, 2×2 and 3×3 squares, L/J, T, S/Z, corners). Pieces cannot be rotated.
4. **Placement.** A piece fits if every one of its cells lands inside the board on an empty cell. Release over an invalid spot returns the piece to the tray.
5. **Clearing.** After each placement, every full row and every full column is found at the same time, then all of them clear together. A cell shared by a cleared row and column counts once.
6. **Scoring** (first draft, tunable).
   - +1 point per block placed
   - Line clear: 10 × lines × lines (1 line = 10, 2 = 40, 3 = 90 …) to reward multi-line clears
   - Combo: consecutive placements that each clear at least one line raise a combo counter; the clear score is multiplied by (1 + combo × 0.5). A placement that clears nothing resets it.
   - Board clear (every cell empty): +300 bonus
7. **Game over.** Checked after each placement and after each new deal: if no remaining tray piece fits anywhere on the board, the game ends.
8. **Best score.** Saved on the device and shown on the game screen and game-over screen.

**Piece generation.** MVP uses weighted random selection from the shape catalog, with no guarantee that any dealt piece fits. Later we could add a "fair deal" rule that guarantees at least one dealt piece fits, and a seeded random generator so a game can be replayed or shared as a daily challenge.

## Tech stack

We target the newest Expo SDK, SDK 57 (released June 30, 2026), with a custom development build via `expo-dev-client` instead of Expo Go, so we can use any native library and stay on current SDKs. Versions get pinned when the project is created; we upgrade one SDK at a time with `npx expo install --fix`.

| Area             | Choice                                                                    | Why                                                                         |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Framework        | React Native 0.86 (the version bundled with SDK 57)                       | Required; New Architecture is the default                                   |
| Platform tooling | Expo SDK 57 + `expo-dev-client`                                           | Custom dev client on the phone, fast refresh, no Expo Go limits             |
| Language         | TypeScript (strict mode)                                                  | Catches bugs early; good habit to learn                                     |
| Navigation       | Expo Router (file-based)                                                  | Standard in Expo; simple Home / Game / Settings screens                     |
| Gestures         | `react-native-gesture-handler`                                            | Smooth drag-and-drop on the UI thread                                       |
| Animation        | `react-native-reanimated`                                                 | 60–120 fps piece dragging, snapping, clear effects                          |
| Rendering        | React Native Views for MVP; `@shopify/react-native-skia` considered later | Views are easier to learn; Skia if we need particles or many animated cells |
| State            | React `useReducer` + Context                                              | Built into React, no extra library; a reducer that wraps the game engine    |
| Storage          | `react-native-mmkv` (alternative: `expo-sqlite/kv-store`)                 | Fast synchronous save of best score, settings, in-progress game             |
| Haptics          | `expo-haptics`                                                            | Feedback on place, clear, game over                                         |
| Audio            | `expo-audio`                                                              | Short sound effects                                                         |
| Builds           | EAS Build (cloud), `development` profile in `eas.json`                    | Builds the iOS dev client without a Mac; install it on the iPhone from the link |
| Testing          | Jest (`jest-expo`) + React Native Testing Library                         | Unit-test the engine, smoke-test components                                 |
| Code quality     | ESLint + Prettier, `tsc --noEmit`                                         | Consistent style, type checks before commits                                |

> **Rule of thumb:** add a library only when a milestone needs it, and record the decision in the log at the end of this doc.

## Dev environment and dev client workflow

Development happens on a Windows 11 PC; the game runs on a physical phone inside our own development build, which loads JavaScript from the PC over Wi-Fi.

### What runs where

- **PC:** VS Code, Node.js LTS, Git, the Metro bundler (`npx expo start`).
- **Phone:** the custom dev client app (our game's native shell). It connects to Metro, and code changes appear instantly with Fast Refresh.
- **Rebuild** the dev client only when native code changes (adding a native library, changing `app.json` plugins or permissions). Pure JavaScript/TypeScript changes never need a rebuild.

### Android phone (optional, not our test phone; simplest on Windows, free)

1. Install Android Studio (SDK + platform tools) and JDK 17.
2. Turn on Developer Options and USB debugging on the phone.
3. `npx expo run:android` builds and installs the dev client locally, or `npx eas-cli@latest build --profile development --platform android` builds it in the cloud and gives a download link.

### iPhone, our test phone (needs EAS, since Xcode does not run on Windows)

1. Paid Apple Developer account ($99/year) to install builds on a personal device.
2. `npx eas-cli@latest device:create` registers the iPhone.
3. `npx eas-cli@latest build --profile development --platform ios` builds the dev client in the cloud; install it from the link.
4. Turn on Developer Mode on the iPhone.

**Daily loop:** `npx expo start` → open the dev client on the phone → pick the PC's server → edit code → see it update.

**Project location:** `C:\Users\Drew\Documents\bento-blast`, with its own Git repository, outside the home-directory repo.

## Core architecture

The game logic is a pure TypeScript engine with no React or React Native imports; the UI only reads state and sends player actions. This keeps the rules testable on the PC without a phone and lets the UI change freely.

### Layers

1. **Engine** (`src/engine`) — pure functions: board, pieces, placement, line clears, scoring, dealing, game-over check. Input state + action → new state + events. No side effects.
2. **Store** (`src/store`) — a `useReducer` reducer, shared through React Context, holding the current `GameState`. Dispatched actions run the engine inside the reducer, which returns the new state; a provider effect then saves it and passes engine events (lines cleared, game over) on to effects.
3. **UI** (`src/components`, `src/app`) — screens and components. Reads from the store, converts finger positions to grid cells, calls store actions.
4. **Services** (`src/services`) — thin wrappers around device features: storage, haptics, audio. The store and UI call these; the engine never does.

Actions flow down from the UI to the engine; new state and events flow back up, and the store triggers device effects.

### Folder structure (proposed)

```text
bento-blast/
├── src/
│   ├── app/                  Expo Router screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx         Home
│   │   ├── game.tsx          Game screen
│   │   └── settings.tsx
│   ├── engine/               Pure game logic (no React)
│   │   ├── board.ts
│   │   ├── pieces.ts         Shape catalog
│   │   ├── placement.ts
│   │   ├── clearing.ts
│   │   ├── scoring.ts
│   │   ├── dealer.ts         Piece generation + RNG
│   │   ├── game.ts           createGame, placePiece, isGameOver
│   │   ├── types.ts
│   │   └── __tests__/
│   ├── store/
│   │   ├── gameReducer.ts    Actions + reducer (calls the engine)
│   │   └── GameProvider.tsx  useReducer + Context, persistence effects
│   ├── components/
│   │   ├── Board.tsx
│   │   ├── Cell.tsx
│   │   ├── PieceTray.tsx
│   │   ├── DraggablePiece.tsx
│   │   ├── ScoreBar.tsx
│   │   └── GameOverModal.tsx
│   ├── hooks/
│   │   └── useBoardLayout.ts Measures board, maps screen x/y → row/col
│   ├── services/
│   │   ├── storage.ts
│   │   ├── haptics.ts
│   │   └── audio.ts
│   └── theme/
│       ├── colors.ts
│       └── sizes.ts
├── assets/                   Sounds, fonts, icons
├── app.json
└── eas.json
```

**Data flow for one move:** finger drag → `DraggablePiece` computes the hovered cell → `Board` shows a ghost preview → release → `dispatch({ type: 'placePiece', pieceIndex, row, col })` → engine returns new state + events → reducer returns the new state and a provider effect persists it → UI re-renders, events trigger animations, haptics and sound.

## Data models and engine API

All game state is plain, serializable data, so a game can be saved to storage and restored exactly. These are draft types; field names will change as we build.

```ts
// src/engine/types.ts (draft)
export const BOARD_SIZE = 8;

export type ColorId = number; // 0 = empty, 1..N = palette index
export type Board = ColorId[]; // length 64, index = row * 8 + col

export type Cell = { row: number; col: number };

export type ShapeId = string; // e.g. 'I3-h', 'L4', 'SQ3'
export type Shape = {
  id: ShapeId;
  cells: Cell[]; // offsets from the top-left, normalized
  width: number;
  height: number;
  weight: number; // relative chance of being dealt
};

export type Piece = { shapeId: ShapeId; color: ColorId };
export type Tray = (Piece | null)[]; // length 3; null = already placed

export type GameState = {
  board: Board;
  tray: Tray;
  score: number;
  combo: number;
  isOver: boolean;
  rngSeed: number; // for reproducible deals
  moves: number;
};

export type GameEvent =
  | { type: 'placed'; cells: Cell[] }
  | { type: 'cleared'; rows: number[]; cols: number[]; points: number; combo: number }
  | { type: 'boardCleared' }
  | { type: 'dealt' }
  | { type: 'gameOver'; finalScore: number };
```

### Engine functions

| Function                                 | Purpose                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `createGame(seed?)`                      | Empty board, first deal, score 0                                             |
| `canPlace(board, shape, row, col)`       | True if every cell is on the board and empty                                 |
| `placePiece(state, trayIndex, row, col)` | Returns `{ state, events }`; places, clears, scores, deals, checks game over |
| `findFullLines(board)`                   | Full row and column indexes, found together                                  |
| `clearLines(board, rows, cols)`          | New board with those lines emptied                                           |
| `scoreMove(blocks, lines, combo)`        | Points for one move (rules section)                                          |
| `dealTray(rng)`                          | Three new pieces                                                             |
| `hasAnyValidMove(board, tray)`           | Scans all positions for each remaining piece; false = game over              |

**Rules for the engine:** functions never mutate their inputs, never read the clock or `Math.random` directly (randomness comes from a seeded RNG passed in), and never import React. A full game-over scan is at most 3 pieces × 64 positions, so performance is not a concern.

## UI, screens and input

The app has three screens, and the hardest UI problem is drag-and-drop that feels as smooth as the original game.

### Screens

| Screen   | Contents                                                                               |
| -------- | -------------------------------------------------------------------------------------- |
| Home     | Title, Play / Continue button, best score, Settings button                             |
| Game     | Score bar (score, best, combo), 8×8 board, 3-piece tray, pause button, game-over modal |
| Settings | Sound on/off, haptics on/off, reset best score, version                                |

**Layout.** Portrait only. The board is a square sized to the screen width minus padding; cell size = board width / 8. Tray pieces display at about 60% scale and grow to full board scale when picked up.

### Drag-and-drop design

1. A pan gesture (`react-native-gesture-handler`) starts on a tray piece.
2. The piece scales to board size and follows the finger with an upward offset (about 1.5 cells) so the finger does not hide it. Position lives in Reanimated shared values, so movement runs on the UI thread.
3. `useBoardLayout` converts the piece's top-left screen position to the nearest (row, col) by rounding.
4. If `canPlace` is true, the board shows a ghost preview of the piece and highlights rows/columns that would clear.
5. On release: valid → call `placePiece`; invalid → the piece springs back to its tray slot.
6. Clearing: cleared cells fade or pop out (~250 ms) before the board updates; a score popup floats up.

**Performance notes:** only the hovered-cell value crosses from the UI thread to React (when it changes), not every finger movement. Cells are memoized so a move re-renders only what changed.

## Persistence, audio, haptics and settings

Everything is stored locally on the device; there is no backend.

| Key             | Value                                       | Saved when                             |
| --------------- | ------------------------------------------- | -------------------------------------- |
| `bestScore`     | number                                      | Score exceeds it                       |
| `currentGame`   | `GameState` as JSON, with a `version` field | After every move; cleared on game over |
| `settings`      | `{ sound: boolean, haptics: boolean }`      | On change                              |
| `stats` (later) | games played, total lines, best combo       | On game over                           |

The `version` field lets us migrate or discard old saved games if the `GameState` shape changes.

**Haptics:** light tap on place, medium on line clear, heavy/notification on game over. All calls go through `services/haptics.ts`, which checks the setting.

**Audio:** short preloaded effects (place, clear, combo, game over) through `services/audio.ts`, which checks the setting. Sound files live in `assets/sounds`; use royalty-free or self-made sounds only.

## Testing and quality

The engine gets thorough unit tests from day one; UI is tested by hand on the phone plus a few component smoke tests.

| Level                 | Tool                         | What it covers                                                                                                               |
| --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Engine unit tests     | Jest                         | Placement edge cases, simultaneous row + column clears, scoring and combos, game-over detection, seeded deals are repeatable |
| Reducer tests         | Jest                         | Actions update state and emit the right events                                                                               |
| Component tests       | React Native Testing Library | Screens render; buttons and modals work                                                                                      |
| Manual device testing | Dev client on the phone      | Drag feel, animation smoothness, haptics, sound                                                                              |

### Habits to practice

- Write the engine test first, then the code (test-driven development).
- Run `npm test`, `npx tsc --noEmit` and `npm run lint` before each commit.
- One feature per Git branch, merged into `main` through a pull request.
- Later: a GitHub Actions workflow that runs tests and type checks on every push.

## Milestones

Seven milestones; the game is playable end to end after M4.

Each milestone ends with a "done when" check. No dates; work at your own pace.

| Milestone                           | Scope                                                                                                  | Done when                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **M0** · Project setup and dev client | Create Expo SDK 57 TypeScript project, Git repo, ESLint/Prettier; build and install the dev client     | An edited screen updates live on your phone                |
| **M1** · Game engine with tests       | Types, shape catalog, placement, line clears, scoring, dealing, game-over check                        | Jest tests cover every rule in this spec and pass          |
| **M2** · Board and tray on screen     | `useReducer` + Context store, `Board`, `Cell`, `PieceTray`, `ScoreBar`; tap-to-place for debugging                    | A dealt game shows on the phone and taps place pieces      |
| **M3** · Drag and drop                | Gesture Handler + Reanimated, finger offset, ghost preview, line highlight, snap back                  | Dragging feels smooth on the device                        |
| **M4** · Full game loop (MVP)         | Game-over modal, restart, best score and in-progress game saved, Home screen                           | You can play a full game, close the app, and resume        |
| **M5** · Polish                       | Clear and combo animations, score popups, haptics, sound, Settings screen                              | It feels good enough that you want to keep playing         |
| **M6** · Extras (pick any)            | Themes, daily seeded challenge, stats screen, GitHub Actions CI, app store preparation                 | You decide                                                 |

We build in seven milestones, engine first, so the game is playable end to end after M4; no coding starts until this spec is agreed.

Each milestone is one or more Git branches; add a decision-log entry whenever a milestone changes the stack.

## Open questions and decision log

### Open questions

- [x] Which phone do you test on: iPhone. (It needs a paid Apple Developer account, $99/year, and EAS cloud builds.)
- [x] Use a free Expo account with EAS Build, or only local Android builds? Free Expo account with EAS Build (free plan: up to 15 iOS builds a month).
- [x] Keep the scoring formula above, or match Block Blast's scoring more closely? Keep it as is for now, while we test the app.
- [x] "Fair deal" (always at least one piece fits) in MVP, or pure random? Pure random for the MVP, with no guarantee that a piece fits.
- [x] Board size fixed at 8×8, or configurable for other modes later? Fixed at 8×8 for now.
- [ ] Final game name and visual style (colors, block look). Basic colors and block visuals for now; Drew will revisit the look once a prototype works. Name still open.
- [x] Zustand vs. React's built-in `useReducer` for state — `useReducer` teaches more fundamentals, Zustand is less boilerplate. Decision: `useReducer` for now.

### Decision log (newest first)

| Date        | Decision                                                                      | Reason                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oct 8, 2026 | State with React's built-in `useReducer` (plus Context), not Zustand, for now | Teaches React fundamentals; no extra library. Zustand stays an option later.                                                                                  |
| Oct 8, 2026 | Basic colors and block visuals until a prototype works                        | Get the game playable first; Drew updates the look afterwards                                                                                                 |
| Oct 8, 2026 | Board size fixed at 8×8 for now                                               | Drew's call; other sizes can come later                                                                                                                       |
| Oct 8, 2026 | MVP deals pieces at random, with no "fair deal" guarantee                     | Drew's call for the MVP                                                                                                                                       |
| Oct 8, 2026 | Keep the current scoring formula for now                                      | Good enough for testing the app; revisit later                                                                                                                |
| Oct 8, 2026 | Test on an iPhone, built with EAS Build on a free Expo account                | Drew's phone is an iPhone; Xcode does not run on Windows; the free plan allows up to 15 iOS builds a month. Still needs the $99/year Apple Developer account. |
| Oct 8, 2026 | Pure TypeScript engine separate from UI                                       | Testable without a device; easier to learn and refactor                                                                                                       |
| Oct 8, 2026 | Expo SDK 57 with `expo-dev-client`, no Expo Go                                | Newest SDK, any native library, real-device testing                                                                                                           |
| Oct 8, 2026 | React Native + TypeScript                                                     | Project goal; type safety                                                                                                                                     |
