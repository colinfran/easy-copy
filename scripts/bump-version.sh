#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

BUMP_OR_VERSION="${RELEASE_VERSION:-${RELEASE_BUMP:-patch}}"

if ! npm version "$BUMP_OR_VERSION" --no-git-tag-version >/dev/null; then
  echo "Failed to bump version. Use RELEASE_BUMP=patch|minor|major or RELEASE_VERSION=x.y.z"
  exit 1
fi

NEW_VERSION="$(node -p "require('./package.json').version")"

node -e '
const fs = require("node:fs");
const path = "src-tauri/tauri.conf.json";
const version = process.argv[1];
const config = JSON.parse(fs.readFileSync(path, "utf8"));
config.version = version;
fs.writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
' "$NEW_VERSION"

echo "Version bumped to $NEW_VERSION in package.json and src-tauri/tauri.conf.json"
