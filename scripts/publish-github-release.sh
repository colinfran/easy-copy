#!/bin/sh
set -eu

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Authenticate GitHub CLI first: gh auth login"
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
TAG="${RELEASE_TAG:-v$VERSION}"
TITLE="${RELEASE_TITLE:-EasyCopy v$VERSION}"

if [ -n "${RELEASE_NOTES:-}" ]; then
  NOTES="$RELEASE_NOTES"
else
  PREVIOUS_TAG="$(node -e '
const { execSync } = require("node:child_process");

const currentTag = process.argv[1];
const parse = (tag) => {
  const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};
const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

const currentVersion = parse(currentTag);
if (!currentVersion) process.exit(0);

const tags = execSync("git tag --list", { encoding: "utf8" })
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const previous = tags
  .map((tag) => ({ tag, version: parse(tag) }))
  .filter((item) => item.version && item.tag !== currentTag && cmp(item.version, currentVersion) < 0)
  .sort((a, b) => cmp(b.version, a.version))[0];

if (previous) process.stdout.write(previous.tag);
' "$TAG")"

  if [ -n "$PREVIOUS_TAG" ]; then
    CHANGE_LINES="$(git log --no-merges --pretty='- %s (%h)' "$PREVIOUS_TAG..HEAD" | head -n 30 || true)"
  else
    CHANGE_LINES="$(git log --no-merges --pretty='- %s (%h)' -n 30 || true)"
  fi

  if [ -z "$CHANGE_LINES" ]; then
    NOTES="No code changes detected in git history for this release."
  elif [ -n "$PREVIOUS_TAG" ]; then
    NOTES="What's changed since $PREVIOUS_TAG:

$CHANGE_LINES"
  else
    NOTES="What's changed:

$CHANGE_LINES"
  fi
fi

if ! git rev-parse --verify "$TAG" >/dev/null 2>&1; then
  echo "Creating local tag: $TAG"
  git tag "$TAG"
fi

if ! git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Pushing tag to origin: $TAG"
  git push origin "$TAG"
fi

DMG_FILES="$(find src-tauri/target/release/bundle/dmg -maxdepth 1 -type f -name "*.dmg" | sort || true)"
UPDATER_BUNDLE="$(find src-tauri/target/release/bundle/macos -maxdepth 1 -type f -name "*.app.tar.gz" | sort | head -n 1 || true)"
UPDATER_SIG="${UPDATER_BUNDLE}.sig"
LATEST_JSON="src-tauri/target/release/bundle/macos/latest.json"
ARCH="$(uname -m)"

case "$ARCH" in
  arm64)
    PLATFORM_KEY="darwin-aarch64"
    ;;
  x86_64)
    PLATFORM_KEY="darwin-x86_64"
    ;;
  *)
    echo "Unsupported architecture for updater manifest: $ARCH"
    exit 1
    ;;
esac

if [ -z "$DMG_FILES" ]; then
  echo "No DMG artifacts found. Build first with: npm run release:mac"
  exit 1
fi

if [ -z "$UPDATER_BUNDLE" ] || [ ! -f "$UPDATER_SIG" ]; then
  echo "No updater artifacts found. Ensure src-tauri/tauri.conf.json has bundle.createUpdaterArtifacts=true and build with: npm run release:mac"
  exit 1
fi

UPDATER_URL="https://github.com/colinfran/easy-copy/releases/download/$TAG/$(basename "$UPDATER_BUNDLE")"

node -e '
const fs = require("node:fs");
const path = process.argv[1];
const version = process.argv[2];
const key = process.argv[3];
const url = process.argv[4];
const notes = process.argv[5];
const sigPath = process.argv[6];
const signature = fs.readFileSync(sigPath, "utf8").trim();

const payload = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    [key]: {
      url,
      signature,
    },
  },
};

fs.writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
' "$LATEST_JSON" "$VERSION" "$PLATFORM_KEY" "$UPDATER_URL" "$NOTES" "$UPDATER_SIG"

ASSETS=""
for file in $DMG_FILES; do
  ASSETS="$ASSETS \"$file\""
done
ASSETS="$ASSETS \"$UPDATER_BUNDLE\" \"$UPDATER_SIG\" \"$LATEST_JSON\""

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "Release $TAG exists; uploading assets with overwrite"
  eval "gh release upload \"$TAG\" $ASSETS --clobber"
else
  echo "Creating release $TAG"
  eval "gh release create \"$TAG\" $ASSETS --title \"$TITLE\" --notes \"$NOTES\""
fi

echo "GitHub release publish complete: $TAG"
