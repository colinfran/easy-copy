#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "macOS signing preflight is only supported on macOS."
  exit 1
fi

if ! command -v security >/dev/null 2>&1; then
  echo "security tool not found. Install Xcode Command Line Tools first."
  exit 1
fi

AVAILABLE_IDENTITIES="$(security find-identity -v -p codesigning 2>/dev/null || true)"

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "APPLE_SIGNING_IDENTITY is not set."
  echo "Set it before release, for example:"
  echo "  export APPLE_SIGNING_IDENTITY=\"Developer ID Application: Your Name (TEAMID)\""
  echo ""
  echo "Available signing identities:"
  printf '%s\n' "$AVAILABLE_IDENTITIES"
  exit 1
fi

if ! printf '%s\n' "$AVAILABLE_IDENTITIES" | grep -Fq "\"$APPLE_SIGNING_IDENTITY\""; then
  echo "Configured APPLE_SIGNING_IDENTITY was not found in your keychain:"
  echo "  $APPLE_SIGNING_IDENTITY"
  echo ""
  echo "Available signing identities:"
  printf '%s\n' "$AVAILABLE_IDENTITIES"
  exit 1
fi

HAS_APPLE_ID_FLOW="false"
HAS_API_KEY_FLOW="false"

if [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_PASSWORD:-}" ] && [ -n "${APPLE_TEAM_ID:-}" ]; then
  HAS_APPLE_ID_FLOW="true"
fi

if [ -n "${APPLE_API_KEY:-}" ] && [ -n "${APPLE_API_ISSUER:-}" ] && [ -n "${APPLE_API_KEY_PATH:-}" ]; then
  HAS_API_KEY_FLOW="true"
fi

if [ "$HAS_APPLE_ID_FLOW" != "true" ] && [ "$HAS_API_KEY_FLOW" != "true" ]; then
  echo "Tauri built-in notarization credentials are not fully configured."
  echo "Set one of the following credential groups before running release:all:"
  echo ""
  echo "Option A (Apple ID flow):"
  echo "  export APPLE_ID=\"your-apple-id@example.com\""
  echo "  export APPLE_PASSWORD=\"app-specific-password\""
  echo "  export APPLE_TEAM_ID=\"TEAMID\""
  echo ""
  echo "Option B (App Store Connect API key flow):"
  echo "  export APPLE_API_KEY=\"KEYID\""
  echo "  export APPLE_API_ISSUER=\"ISSUER-UUID\""
  echo "  export APPLE_API_KEY_PATH=\"/absolute/path/AuthKey_KEYID.p8\""
  exit 1
fi

echo "Signing preflight passed."
echo "Using APPLE_SIGNING_IDENTITY: $APPLE_SIGNING_IDENTITY"
echo "Tauri notarization credentials preflight passed."
