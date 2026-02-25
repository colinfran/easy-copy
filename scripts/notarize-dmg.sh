#!/bin/sh
set -eu

NOTARY_PROFILE="${NOTARY_PROFILE:-easycopy-notary}"
DMG_PATH="${1:-}"

if [ -z "$DMG_PATH" ]; then
  DMG_PATH="$(ls -t dist/*.dmg 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$DMG_PATH" ] || [ ! -f "$DMG_PATH" ]; then
  echo "No DMG found. Build one first with: npm run build-mac"
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun not found. Install Xcode Command Line Tools first."
  exit 1
fi

echo "Submitting for notarization: $DMG_PATH"
xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait

echo "Stapling notarization ticket"
xcrun stapler staple "$DMG_PATH"

echo "Validating stapled ticket"
xcrun stapler validate "$DMG_PATH"

echo "Verifying Gatekeeper assessment (advisory for DMG containers)"
if ! spctl --assess --type open -v "$DMG_PATH"; then
  echo "Warning: Gatekeeper rejected the DMG container check, but notarization + stapling succeeded."
  echo "This can happen for DMG container assessments; distribution is still typically valid when stapler validate passes."
fi

echo "Notarization complete: $DMG_PATH"
