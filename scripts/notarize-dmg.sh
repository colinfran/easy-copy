#!/bin/sh
set -eu

NOTARY_PROFILE="${NOTARY_PROFILE:-easycopy-notary}"
DMG_PATH="${1:-}"

if [ -z "$DMG_PATH" ]; then
  DMG_PATH="$(ls -t src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$DMG_PATH" ] || [ ! -f "$DMG_PATH" ]; then
  echo "No DMG found. Build one first with: npm run tauri:build:mac"
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun not found. Install Xcode Command Line Tools first."
  exit 1
fi

if ! command -v hdiutil >/dev/null 2>&1; then
  echo "hdiutil not found. This script requires macOS tooling."
  exit 1
fi

MOUNT_POINT="$(mktemp -d /tmp/easycopy-notary-XXXXXX)"
cleanup_mount() {
  if mount | grep -q "$MOUNT_POINT"; then
    hdiutil detach "$MOUNT_POINT" -quiet || true
  fi
  rmdir "$MOUNT_POINT" 2>/dev/null || true
}
trap cleanup_mount EXIT

hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_POINT" -nobrowse -quiet
APP_PATH="$(ls -d "$MOUNT_POINT"/*.app 2>/dev/null | head -n 1 || true)"

if [ -z "$APP_PATH" ]; then
  echo "Could not find .app inside DMG: $DMG_PATH"
  exit 1
fi

SIGN_INFO="$(codesign -dv --verbose=4 "$APP_PATH" 2>&1 || true)"

if printf '%s' "$SIGN_INFO" | grep -q 'Signature=adhoc'; then
  echo "App is ad-hoc signed. Notarization will fail."
  echo "Set a Developer ID identity and rebuild before notarizing:"
  echo "  export APPLE_SIGNING_IDENTITY=\"Developer ID Application: Your Name (TEAMID)\""
  echo "  npm run tauri:build:mac"
  exit 1
fi

if ! printf '%s' "$SIGN_INFO" | grep -q 'TeamIdentifier='; then
  echo "App does not have a valid TeamIdentifier in signature."
  echo "Rebuild with Developer ID signing before notarization."
  exit 1
fi

hdiutil detach "$MOUNT_POINT" -quiet
rmdir "$MOUNT_POINT" 2>/dev/null || true
trap - EXIT

echo "Submitting for notarization: $DMG_PATH"
SUBMIT_OUTPUT="$(xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait --output-format json)"

SUBMISSION_ID="$(printf '%s' "$SUBMIT_OUTPUT" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
STATUS="$(printf '%s' "$SUBMIT_OUTPUT" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"

if [ -z "$SUBMISSION_ID" ]; then
  echo "Unable to parse notary submission id. Raw response:"
  echo "$SUBMIT_OUTPUT"
  exit 1
fi

if [ "$STATUS" != "Accepted" ]; then
  echo "Notarization failed with status: ${STATUS:-unknown}"
  echo "Fetching detailed notary log for submission: $SUBMISSION_ID"
  xcrun notarytool log "$SUBMISSION_ID" --keychain-profile "$NOTARY_PROFILE" || true
  echo "Fix the issues reported above, then run notarization again."
  exit 1
fi

echo "Notarization accepted: $SUBMISSION_ID"

echo "Stapling notarization ticket"
xcrun stapler staple "$DMG_PATH"

echo "Validating stapled ticket"
xcrun stapler validate "$DMG_PATH"

echo "Verifying Gatekeeper assessment"
if ! spctl --assess --type open -v "$DMG_PATH"; then
  echo "Warning: Gatekeeper DMG container check failed, but notarization + stapling completed."
fi

echo "Notarization complete: $DMG_PATH"
