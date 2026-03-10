#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "$CURRENT_BRANCH" ]; then
  echo "Release commit requires a checked out branch."
  exit 1
fi

ALLOWED_CHANGES="package.json package-lock.json npm-shrinkwrap.json src-tauri/tauri.conf.json"
CHANGED_PATHS="$(git status --porcelain | awk '{print $2}')"

for path in $CHANGED_PATHS; do
  case " $ALLOWED_CHANGES " in
    *" $path "*)
      ;;
    *)
      echo "Refusing to auto-commit because unrelated changes are present: $path"
      echo "Commit or stash unrelated files, then run release:all again."
      exit 1
      ;;
  esac
done

git add package.json src-tauri/tauri.conf.json

if [ -f package-lock.json ]; then
  git add package-lock.json
fi

if [ -f npm-shrinkwrap.json ]; then
  git add npm-shrinkwrap.json
fi

if git diff --cached --quiet; then
  echo "No version file changes to commit."
  exit 0
fi

VERSION="$(node -p "require('./package.json').version")"
git commit -m "chore(release): v$VERSION"
git push origin "$CURRENT_BRANCH"

echo "Pushed release version commit for v$VERSION on branch $CURRENT_BRANCH"
