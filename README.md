# Bento Blast

A Block Blast–style puzzle game for iOS and Android, built with Expo SDK 57 and React Native. It runs on a physical phone through a custom development build (`expo-dev-client`), not Expo Go.

## Daily loop

1. Start the dev server on the PC:

   ```bash
   npx expo start
   ```

2. Open the **Bento Blast** dev client on the phone and pick the PC's server. The phone and PC must be on the same Wi-Fi, and Windows Firewall must allow Node.js on private networks. If the phone can't connect, use `npx expo start --tunnel`.
3. Edit code. Fast Refresh shows the change on the phone.

Only rebuild the dev client when native code changes (adding a native library, or changing `app.json` plugins or permissions):

```bash
npx eas-cli@latest build --profile development --platform ios
```

## Before each commit

```bash
npm test
npm run typecheck
npm run lint
```

## Other commands

| Command | What it does |
| --- | --- |
| `npm run test:watch` | Re-run tests as files change |
| `npm run format` | Format every file with Prettier |
| `npx expo install <package>` | Add a package at an SDK-compatible version |
| `npx expo install --fix` | Fix package versions after an SDK upgrade |
| `npx expo-doctor` | Check dependencies and config |
| `npx eas-cli@latest device:create` | Register a new iPhone for dev builds |

## Project layout

- `src/app/` – Expo Router screens (Home, Game, Settings)
- `src/engine/` – pure TypeScript game logic, with tests in `__tests__/`
- `src/store/` – `useReducer` + Context game store
- `src/components/`, `src/hooks/` – UI
- `src/services/` – storage, haptics and audio wrappers
- `src/theme/` – colors and sizes
- `assets/sounds/` – sound effects

`ios/` and `android/` are generated at build time. Don't create or edit them; configure native behavior in `app.json`.
