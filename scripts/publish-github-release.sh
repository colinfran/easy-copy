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
NOTES="${RELEASE_NOTES:-Signed and notarized macOS Tauri release.}"

if ! git rev-parse --verify "$TAG" >/dev/null 2>&1; then
  echo "Creating local tag: $TAG"
  git tag "$TAG"
fi

if ! git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Pushing tag to origin: $TAG"
  git push origin "$TAG"
fi

DMG_FILES="$(find src-tauri/target/release/bundle/dmg -maxdepth 1 -type f -name "*.dmg" | sort || true)"

if [ -z "$DMG_FILES" ]; then
  echo "No DMG artifacts found. Build first with: npm run release:mac"
  exit 1
fi

ASSETS=""
for file in $DMG_FILES; do
  ASSETS="$ASSETS \"$file\""
done

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "Release $TAG exists; uploading assets with overwrite"
  eval "gh release upload \"$TAG\" $ASSETS --clobber"
else
  echo "Creating release $TAG"
  eval "gh release create \"$TAG\" $ASSETS --title \"$TITLE\" --notes \"$NOTES\""
fi

echo "GitHub release publish complete: $TAG"
