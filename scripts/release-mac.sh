#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "release:mac keychain loader is only supported on macOS."
  exit 1
fi

if ! command -v security >/dev/null 2>&1; then
  echo "security tool not found. Install Xcode Command Line Tools first."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to validate updater public key."
  exit 1
fi

ACCOUNT="${KEYCHAIN_ACCOUNT:-$USER}"
PRIV_SERVICE="easycopy.tauri.signing.private_key"
PASS_SERVICE="easycopy.tauri.signing.private_key_password"
PUB_SERVICE="easycopy.tauri.signing.public_key"

print_keychain_host_hint() {
  echo "This release flow expects Colin Franceschini's personal Mac (keys are stored in that login Keychain)."
  echo "If you are on another machine, import the same keychain items first or run release on that Mac."
}

read_keychain_secret() {
  security find-generic-password -a "$ACCOUNT" -s "$1" -w 2>/dev/null || true
}

PRIVATE_KEY="$(read_keychain_secret "$PRIV_SERVICE")"
PRIVATE_KEY_PASSWORD="$(read_keychain_secret "$PASS_SERVICE")"
PUBLIC_KEY="$(read_keychain_secret "$PUB_SERVICE")"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Missing keychain item: $PRIV_SERVICE"
  print_keychain_host_hint
  echo "Store it with:"
  echo "  security add-generic-password -a \"$ACCOUNT\" -s \"$PRIV_SERVICE\" -w \"\
\$(cat ~/.tauri/easy-copy.key)\" -U"
  exit 1
fi

if [ -z "$PRIVATE_KEY_PASSWORD" ]; then
  echo "Missing keychain item: $PASS_SERVICE"
  print_keychain_host_hint
  echo "Store it with:"
  echo "  security add-generic-password -a \"$ACCOUNT\" -s \"$PASS_SERVICE\" -w \"<password>\" -U"
  exit 1
fi

if [ -z "$PUBLIC_KEY" ]; then
  echo "Missing keychain item: $PUB_SERVICE"
  print_keychain_host_hint
  echo "Store it with:"
  echo "  security add-generic-password -a \"$ACCOUNT\" -s \"$PUB_SERVICE\" -w \"\
\$(cat ~/.tauri/easy-copy.key.pub)\" -U"
  exit 1
fi

CONFIG_PUBLIC_KEY="$(node -e 'const fs=require("node:fs"); const conf=JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json","utf8")); process.stdout.write(conf?.plugins?.updater?.pubkey ?? "");' | tr -d '\n\r')"
KEYCHAIN_PUBLIC_KEY="$(printf "%s" "$PUBLIC_KEY" | tr -d '\n\r')"

if [ -z "$CONFIG_PUBLIC_KEY" ]; then
  echo "Missing plugins.updater.pubkey in src-tauri/tauri.conf.json"
  exit 1
fi

if [ "$CONFIG_PUBLIC_KEY" != "$KEYCHAIN_PUBLIC_KEY" ]; then
  echo "Key mismatch: keychain public key does not match src-tauri/tauri.conf.json"
  print_keychain_host_hint
  echo "Update either keychain item ($PUB_SERVICE) or plugins.updater.pubkey before releasing."
  exit 1
fi

export TAURI_SIGNING_PRIVATE_KEY="$PRIVATE_KEY"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$PRIVATE_KEY_PASSWORD"

echo "Loaded updater signing keys from Keychain for account: $ACCOUNT"

if [ "${RELEASE_MAC_DRY_RUN:-0}" = "1" ]; then
  echo "Dry run enabled; skipping tauri build."
  exit 0
fi

npm run tauri:build:mac
