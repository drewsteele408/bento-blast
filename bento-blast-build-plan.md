# Bento Blast — Build Plan

Oct 13, 2026 · companion to [bento-blast-spec-doc.md](bento-blast-spec-doc.md)

This plan turns the spec's milestones (M0–M6) into phases of small, PR-sized steps. Each phase ends with a "done when" check that you can verify on the phone or in Jest. Every step is one Git branch → one pull request into `main`.

## Git workflow: Drew commits, Claude never does

All Git history is written by hand. Claude Code edits files and runs checks. It **never** runs `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, `git reset`, `git stash` or `gh pr create`/`merge`, and it never switches or creates branches. This holds even when a step below says "commit" or "branch": those are your actions.

At the end of each step, Claude:

1. Runs `npm test`, `npm run typecheck` and `npm run lint` and reports the results.
2. Lists the files it changed, so you can review the diff (`git status`, `git diff`).
3. Suggests a branch name and a commit message you can copy, then stops.

You then:

1. Create the branch, e.g. `git switch -c feat/engine-pieces`. Do this _before_ asking Claude to start the step, so the work lands on the right branch.
2. Review the diff, then `git add` and `git commit`.
3. `git push` and open the pull request on GitHub.

This is enforced in three places: a rule in [AGENTS.md](AGENTS.md), deny rules for `git commit`, `git push` and `gh pr create`/`merge` in [.claude/settings.json](.claude/settings.json), and Claude's memory.

**Before every commit:** `npm test`, `npm run typecheck`, `npm run lint`.

**Rule:** when a step touches an Expo / React Native API, check the SDK 57 docs (`https://docs.expo.dev/versions/v57.0.0/`) first. APIs change between SDKs and between Reanimated 3 → 4.

---

## Phase overview

| Phase | Milestone                      | Branches (PRs) | Needs phone? | Needs a dev-client rebuild? |
| ----- | ------------------------------ | -------------- | ------------ | --------------------------- |
| 0     | M0 · Finish setup + dev client | 1              | Yes          | **Yes (one build)**         |
| 1     | M1 · Game engine with tests    | 5              | No           | No                          |
| 2     | M2 · Board and tray on screen  | 4              | Yes          | No                          |
| 3     | M3 · Drag and drop             | 4              | Yes          | No                          |
| 4     | M4 · Full game loop (MVP)      | 4              | Yes          | No                          |
| 5     | M5 · Polish                    | 5              | Yes          | Only if a new native lib    |
| 6     | M6 · Extras (pick any)         | per extra      | Varies       | Varies                      |

**Rebuild budget.** The free plan allows 15 iOS builds a month. Every native library the MVP and Polish phases need (gesture handler, Reanimated, MMKV, haptics, audio) is already in `package.json`, and `app.json` already has the audio permission. So **one dev-client build at the end of Phase 0 should last through Phase 5**. Don't add native libraries mid-phase without a reason. If you have to add one, batch it with any other native changes into a single rebuild.

---

## Phase 0 — Finish setup and install the dev client (M0)

Most of M0 is already done: the project, Git, ESLint/Prettier, Jest, EAS link and the empty route files.

**Branch `chore/dev-client`** (you create it)

1. **You** commit the pending `app.json` change (`ITSAppUsesNonExemptEncryption`, `MODIFY_AUDIO_SETTINGS`).
2. Run `npx expo-doctor` and fix anything it reports.
3. Add a `GestureHandlerRootView` around the root `Stack` in [src/app/\_layout.tsx](src/app/_layout.tsx). Gesture Handler needs it, and adding it now keeps Phase 3 free of layout changes. Set portrait-only orientation in `app.json` if it isn't already.
4. `npx eas-cli@latest device:create` → register the iPhone (needs the Apple Developer account).
5. `npx eas-cli@latest build --profile development --platform ios` → install from the link → turn on Developer Mode.
6. Change the Home text, and check that Fast Refresh shows it on the phone.

**Done when:** an edited screen updates live on the iPhone.

---

## Phase 1 — Game engine with tests (M1)

Pure TypeScript in `src/engine/`, with no React imports. Write each test first (TDD), then the code. No phone needed: the whole phase runs in `npm run test:watch`.

### 1.1 `feat/engine-types-rng`: types, constants, seeded RNG

- `types.ts`: copy the spec's draft types. `BOARD_SIZE = 8`, `Board` as a flat `ColorId[]` of length 64, plus helpers `idx(row, col)` and `emptyBoard()`.
- `rng.ts`: a small seeded PRNG (for example, mulberry32) written as a **pure function**: `next(state) → { value, state }`. Don't use a closure that mutates.
- ⚠️ **Spec gap:** `GameState.rngSeed` has to hold the **current** RNG state and move forward after each deal, not just keep the starting seed. Otherwise a resumed game deals different pieces than it would have. Store both `seed` (starting value, for daily challenges later) and `rngState` (current).
- Tests: the same seed gives the same sequence, values fall in `[0, 1)`, and the input state is never changed.

### 1.2 `feat/engine-pieces`: shape catalog

- `pieces.ts`: the catalog. Pieces can't be rotated, so **each orientation is its own shape**. That's about 30–40 shapes:
  - `S1`; lines `I2`–`I5` in both directions (`-h`/`-v`); squares `SQ2`, `SQ3`
  - 3-cell corners (4 orientations); `L4`/`J4` (8 orientations together); `T4` (4); `S4`/`Z4` (2 each)
  - Optional: 5-cell big L (4 orientations), 2×3 rectangles (2)
- Each shape has normalized `cells`, plus `width`, `height` and `weight`.
- Add a `getShape(id)` lookup.
- Tests: every shape is normalized (minimum row and col are 0), `width`/`height` match the cells, there are no duplicate cells or IDs, and every weight is above 0.

### 1.3 `feat/engine-placement-clearing`: board rules

- `placement.ts`: `canPlace(board, shape, row, col)`, plus a pure `applyPiece` that returns a new board.
- `clearing.ts`: `findFullLines(board) → { rows, cols }` (found in one pass), and `clearLines(board, rows, cols)`.
- Tests:
  - placement off every edge, overlapping a filled cell, and fitting exactly into a corner
  - one row, one column, a row **and** a column at the same time (the shared cell is cleared once), several rows plus several columns
  - inputs are never changed (freeze them in tests with `Object.freeze`)

### 1.4 `feat/engine-scoring`: points

- `scoring.ts`: `scoreMove({ blocks, lines, combo, boardCleared })`.
  - `blocks` + `10 × lines²` × `(1 + combo × 0.5)` + `300` if the board is cleared.
- ⚠️ **Decide before coding:** is the first clear in a streak combo 0 (×1.0) or combo 1 (×1.5)? Suggestion: the first clear is combo 0, the second clear in a row is combo 1, and so on. Write the answer in the decision log.
- ⚠️ **Decide:** are the +1-per-block points multiplied by combo? Suggestion: no. Only the clear score is multiplied, which matches the spec's wording.
- Write table-driven tests that cover each rule in the spec, using hard-coded expected numbers.

### 1.5 `feat/engine-game`: dealer and game loop

- `dealer.ts`: `dealTray(rngState) → { tray, rngState }`. Each piece is a weighted random shape plus a random color.
- `game.ts`:
  - `createGame(seed?)`: empty board, first deal, then a game-over check (a fresh board always has a move, but run the check anyway).
  - `hasAnyValidMove(board, tray)`
  - `placePiece(state, trayIndex, row, col) → { state, events }`. The order is fixed: **validate → place → find lines → clear → score / update combo → board-clear bonus → deal if the tray is empty → game-over check.** An invalid move (wrong index, empty slot, doesn't fit, game already over) returns the state unchanged and no events. It does not throw.
- Emit `GameEvent`s in that same order. ⚠️ **Spec gap:** add the **colors** of the cleared cells to the `cleared` event, or keep `prevBoard`, so the Phase 5 clear animation can still draw the cells after the engine has already emptied them.
- Tests: a full scripted game with a fixed seed, a re-deal after the third placement, game over after placement, game over right after a deal, the combo resetting after a move with no clear, and the board-clear bonus.

**Done when:** Jest tests cover every rule in the spec's "Game rules" section and pass. Delete `sanity.test.ts`.

---

## Phase 2 — Board and tray on screen (M2)

### 2.1 `feat/theme`: colors and sizes

- `src/theme/colors.ts`: a palette indexed by `ColorId` (index 0 = empty cell), plus background, text and grid-line colors.
- `src/theme/sizes.ts`: board padding, the tray scale (0.6) and the drag offset (1.5 cells).
- Keep the visuals basic for now (see the decision log).

### 2.2 `feat/store`: reducer and provider

- `src/store/gameReducer.ts`: actions `newGame`, `placePiece`, `restore`. The reducer calls the engine and keeps `{ game, lastEvents }` so that effects can react to what just happened.
- `src/store/GameProvider.tsx`: `useReducer` plus Context, and hooks `useGame()` / `useGameDispatch()`. Splitting into two contexts means components that only dispatch don't re-render on every state change.
- Reducer tests: each action updates state and sets the right `lastEvents`, and invalid moves change nothing.

### 2.3 `feat/board-ui`: Board, Cell, ScoreBar

- `Cell.tsx` wrapped in `React.memo`, so only cells whose color changed re-render.
- `Board.tsx`: a square of `screen width − padding`, with cell size = width / 8. Render 64 cells with flex-wrap or 8 rows.
- `ScoreBar.tsx`: score, best (0 for now) and combo.
- Wire it into [src/app/game.tsx](src/app/game.tsx) inside `GameProvider`. Add a temporary Home button that opens `/game`.

### 2.4 `feat/tray-tap-to-place`: tray and debug input

- `PieceTray.tsx`: three slots that render pieces at 60% scale, with empty slots for pieces already placed.
- A debug mode: tap a tray piece to select it, then tap a board cell to dispatch `placePiece` with that cell as the top-left. Keep it behind a `__DEV__` flag; it's useful for testing later.
- One RNTL smoke test: the game screen renders 64 cells and 3 tray slots.

**Done when:** a dealt game shows on the phone, and taps place pieces, clear lines and update the score.

---

## Phase 3 — Drag and drop (M3)

This is the hardest phase. Build it in layers and test the feel on the phone after each one. Before starting, read the Gesture Handler and **Reanimated 4** docs. Reanimated 4 moved worklet utilities into `react-native-worklets`, so check the current way to call JS from the UI thread.

### 3.1 `feat/board-layout`: coordinate mapping

- `src/hooks/useBoardLayout.ts`: measure the board's position on screen (window coordinates) with `onLayout` / `measure`, and store `{ x, y, cellSize }` in shared values.
- Write a pure helper `screenToCell(pieceX, pieceY, layout) → { row, col }` using rounding, and unit-test it in Jest. Make it a worklet so it can run on the UI thread.

### 3.2 `feat/draggable-piece`: picking up and following the finger

- `DraggablePiece.tsx`: a pan gesture on each tray slot.
- **Render the dragged piece in an absolutely positioned overlay at the game-screen root**, not inside the tray. That keeps it from being clipped and makes the coordinate math match window coordinates.
- On start, animate the scale from 0.6 → 1.0. Offset the piece upward by about 1.5 cells. The position lives in shared values only, with no React state per frame.

### 3.3 `feat/ghost-preview`: hover feedback

- On the UI thread, compute the hovered `(row, col)`. Send it to React **only when it changes**.
- React side: run `canPlace`. If it's true, `Board` draws a ghost of the piece and highlights the rows and columns that would clear. To find those, apply the piece to a copy of the board and call `findFullLines`; it's cheap.

### 3.4 `feat/drop-snapback`: releasing the piece

- On release, a valid cell dispatches `placePiece`. An invalid cell springs the piece back to its tray slot with `withSpring`, then resets it.
- Edge cases: a second finger starting another drag while one is active (allow only one drag), tapping without moving, and dragging a piece that was just placed.
- Remove or hide the tap-to-place debug path.

**Done when:** dragging feels smooth on the iPhone, with no stutter, the ghost tracks the finger accurately, and snap-back works. Do a profiling pass with the React DevTools profiler to confirm that only changed cells re-render.

---

## Phase 4 — Full game loop, the MVP (M4)

### 4.1 `feat/storage-service`: persistence

- `src/services/storage.ts`: a thin wrapper around `react-native-mmkv` (check the v4 docs; its API differs from v2/v3). Functions: `getBestScore`/`setBestScore`, `loadGame`/`saveGame`/`clearGame`, `getSettings`/`setSettings`.
- Save `currentGame` as `{ version: 1, state }`. On load, a version mismatch or bad JSON is **discarded**, not thrown.
- Test with a Jest mock of the storage module. Check the MMKV docs for its official mock.

### 4.2 `feat/persist-game`: wiring

- An effect in `GameProvider`: after each move, save the game. On game over, clear the save and update the best score if it was beaten.
- On mount, offer to `restore` the saved game.
- Keep the best score in store state (it isn't part of the engine), so `ScoreBar` can show it.

### 4.3 `feat/game-over`: modal and restart

- `GameOverModal.tsx`: final score, best score, a "New best!" badge, and Restart / Home buttons.
- A pause button on the game screen, with Resume / Restart / Home.
- RNTL test: the modal appears when `isOver` and Restart dispatches `newGame`.

### 4.4 `feat/home-screen`: Home

- [src/app/index.tsx](src/app/index.tsx): title, **Continue** (only shown if a saved game exists), **Play** (new game; confirm if it would overwrite a save), best score, and Settings.
- Decide the provider placement: put `GameProvider` in `_layout.tsx` so Home can read the saved game state too.

**Done when:** you can play a full game, kill the app mid-game, reopen it, hit Continue, and get the exact same board, tray and score. The next deal should also match, which confirms the RNG-state fix from 1.1. Best score survives restarts.

🎉 **MVP complete.** A good point for you to tag `v0.1.0` and share a build with a friend (an EAS `preview` build).

---

## Phase 5 — Polish (M5)

Every effect reacts to `lastEvents` from the store. The engine stays untouched.

### 5.1 `feat/settings`: Settings screen and service

- [src/app/settings.tsx](src/app/settings.tsx): sound toggle, haptics toggle, reset best score (with a confirm step), and the app version (`expo-constants`).
- Settings live in a small context, or in the existing provider, and are saved through `storage.ts`.

### 5.2 `feat/haptics`

- `src/services/haptics.ts`: `place()` light, `clear()` medium, `gameOver()` notification. Every function checks the setting first.

### 5.3 `feat/audio`

- `src/services/audio.ts` with `expo-audio`: preload place, clear, combo and game-over sounds. Every function checks the setting first.
- Put the sounds in `assets/sounds/`. Use royalty-free or self-made sounds only, and record where each one came from in a short `assets/sounds/CREDITS.md`.
- Check the SDK 57 `expo-audio` docs for preloading and for playing the same sound twice in quick succession.

### 5.4 `feat/clear-animation`

- Cleared cells pop or fade out over about 250 ms. Draw them from the `cleared` event's colors (or `prevBoard`) in an overlay above the board, which by then is already cleared.
- Placed cells get a small "settle" scale bump.
- Lock input during the animation, or make sure a new drag can't target cells that are still animating.

### 5.5 `feat/score-popups-combo`

- A floating "+90" popup near the cleared lines, and a "Combo ×3" banner.
- A board-clear celebration.
- If Views stop keeping up with many animated cells, this is the point to look at `@shopify/react-native-skia`. That's a native library (one rebuild), so log the decision.

**Done when:** you want to keep playing. Do a real-device pass for animation jank with Reanimated running at 60/120 fps.

---

## Phase 6 — Extras (pick any, in any order)

| Extra                  | Notes                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions CI      | **Do this one first.** Run `npm ci`, test, typecheck and lint on every push and PR. It's cheap and protects everything else. |
| Fair-deal rule         | Re-roll a deal until at least one piece fits. Easy in the engine, with tests.                                                |
| Daily seeded challenge | Seed = date (`YYYYMMDD`). Phase 1 already makes this nearly free.                                                            |
| Stats screen           | Games played, total lines, best combo. Saved on game over.                                                                   |
| Themes                 | Swap palettes in `theme/colors.ts` and add a picker in Settings.                                                             |
| Undo power-up          | Keep the previous `GameState` in the store. The engine is pure, so undo means restoring that state.                          |
| App Store prep         | Final name, icon, splash screen, `production` build, TestFlight with `eas submit`, privacy details.                          |
| Leaderboards           | Needs a backend or Game Center. That's a bigger scope change, so revisit the "out of scope" list first.                      |

---

## Decisions to make along the way

Add each one to the spec's decision log when you make it.

| When             | Decision                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Before 1.1       | Store both the starting seed and the current RNG state in `GameState` (recommended: yes)       |
| Before 1.4       | Does the first clear in a streak count as combo 0 or 1? Are block points multiplied?           |
| Before 1.5       | Add cleared-cell colors to the `cleared` event (recommended), or keep `prevBoard` in the store |
| Before 4.4       | `GameProvider` at the root layout or only on the game screen (recommended: root)               |
| Before 5.5       | Stay with Views, or move the board to Skia                                                     |
| Before App Store | Final name and visual style (still an open question in the spec)                               |
