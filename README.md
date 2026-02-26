# EasyCopy

<img src="./src-tauri/icons/icon.svg" width="96"/>


EasyCopy is a macOS menu bar Tauri app for saving links and copying them quickly.

I came up with this idea because I was constantly having to go to my browser search bar and type in the first few characters of URLs just to trigger autocomplete so I could copy/paste a URL that I needed.

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
npm run tauri:dev
```

`npm run tauri:dev` runs the React/Tailwind frontend and launches the Tauri app shell.

## Build it yourself (macOS)

1. Install dependencies:

```bash
npm install
```

2. Build a distributable `.dmg`:

```bash
npm run tauri:build:mac
```

Output files are written to `src-tauri/target/release/bundle/`.

## Features

- macOS menu bar app named **EasyCopy**
- Copy a link with one click
- Add named links
- Edit links
- Delete links
- Reorder links with drag and drop
- Persistent storage in your local app data folder
- Quick-copy entries in the tray context menu
- Rust + Tauri backend
- React renderer
- Tailwind CSS styling
