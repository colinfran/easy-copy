# EasyCopy

<img src="./src/assets/AppIcon.png"/>


EasyCopy is a macOS menu bar Electron app for saving links and copying them quickly.

I came up with this idea because I was constantly having to go to my browser search bar and type in the first few characters of URLs just to trigger autocomplete so I could copy/paste a url that I needed.

## Download and install (recommended)

Download the latest `.dmg` from GitHub Releases and install EasyCopy:

https://github.com/colinfran/easy-copy/releases

## Run locally (development)

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

`npm start` builds Electron TypeScript (`main` + `preload`) and the React/Tailwind renderer before launching Electron.

## Build it yourself (macOS)

1. Install dependencies:

```bash
npm install
```

2. Build a distributable `.dmg` and `.zip`:

```bash
npm run build-mac
```

Output files are written to `dist/`.

## Features

- macOS menu bar app named **EasyCopy**
- Copy a link with one click
- Add named links
- Delete links
- Persistent storage in your local Electron user data folder
- Quick-copy entries in the tray context menu
- TypeScript-based Electron code (`main` + `preload`)
- React renderer
- Tailwind CSS styling
