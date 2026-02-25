# EasyCopy

  <img src="./src/assets/icon.svg" style="height: 100px; width: 100px;" />


EasyCopy is a macOS menu bar Electron app for saving links and copying them quickly.

I came up with this idea because I was constantly having to go to my browser search bar and type in the first few characters of URLs just to trigger autocomplete so I could copy/paste a url that I needed.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm start
   ```

`npm start` builds Electron TypeScript (`main` + `preload`) and the React/Tailwind renderer before launching Electron.

## Lint

```bash
npm run lint
```

Auto-fix:

```bash
npm run lint:fix
```

## Build macOS app

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build an unpacked `.app` only:

   ```bash
   npm run build-mac-app
   ```

   Output app path:
   `dist/mac/EasyCopy.app`

3. Build distributables (`.dmg` and `.zip`):

   ```bash
   npm run build-mac
   ```

   Output files are written in `dist/`.

Notes:
- Builds are unsigned by default unless your machine has Apple signing identities configured.
- Unsigned builds can show a Gatekeeper warning on first open.

## Features

- macOS menu bar app named **EasyCopy**
- Add named links
- Copy a link with one click
- Delete links
- Persistent storage in your local Electron user data folder
- Quick-copy entries in the tray context menu
- TypeScript-based Electron code (`main` + `preload`)
- React renderer
- Tailwind CSS styling
