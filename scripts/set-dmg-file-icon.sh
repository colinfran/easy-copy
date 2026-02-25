#!/bin/sh
set -eu

ICON_PATH="${1:-build/icon.icns}"
DMG_PATH="${2:-}"

if [ -z "$DMG_PATH" ]; then
  DMG_PATH="$(ls -t dist/*.dmg 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$DMG_PATH" ] || [ ! -f "$DMG_PATH" ]; then
  echo "No DMG found to set icon on."
  exit 0
fi

if [ ! -f "$ICON_PATH" ]; then
  echo "Icon file not found: $ICON_PATH"
  exit 1
fi

if ! command -v SetFile >/dev/null 2>&1 || ! command -v Rez >/dev/null 2>&1 || ! command -v DeRez >/dev/null 2>&1; then
  echo "Skipping DMG file icon step: SetFile/Rez/DeRez not found (install Xcode Command Line Tools)."
  exit 0
fi

TMP_RSRC="$(mktemp /tmp/dmg-icon-XXXXXX.rsrc)"

sips -i "$ICON_PATH" >/dev/null
DeRez -only icns "$ICON_PATH" > "$TMP_RSRC"
Rez -append "$TMP_RSRC" -o "$DMG_PATH"
SetFile -a C "$DMG_PATH"

rm -f "$TMP_RSRC"
echo "Applied custom icon to $DMG_PATH"
