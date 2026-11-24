#!/usr/bin/env bash
# Create a GitHub release.
# Usage: npm run release -- <patch|minor|major|x.y.z> [--prerelease] [--draft]
# npm run release -- minor              # 0.0.0 → 0.1.0 (first release)
# npm run release -- patch              # 0.1.0 → 0.1.1
# npm run release -- 1.0.0              # set a specific version
# npm run release -- minor --prerelease # beta
# npm run release -- minor --draft      # draft, nobody else can see it

set -euo pipefail

BUMP="${1:-}"
if [[ -z "$BUMP" ]]; then
  echo "Usage: npm run release -- <patch|minor|major|x.y.z> [--prerelease] [--draft]"
  exit 1
fi
shift
GH_FLAGS=("$@")

command -v gh >/dev/null || { echo "gh CLI is required: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first"; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "master" ]] || { echo "Releases are made from master (current: $BRANCH)"; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Working tree is not clean"; exit 1; }

git pull --ff-only

echo "Checking..."
npm run lint
npm test
npm run build

# Bumps package.json, commits and creates tag vX.Y.Z
VERSION="$(npm version "$BUMP" -m "release v%s")"
echo "Version: $VERSION"

read -r -p "Push $VERSION and publish the release? [y/N] " ANSWER
if [[ "$ANSWER" != "y" ]]; then
  git tag -d "$VERSION"
  git reset --hard HEAD~1
  echo "Cancelled, version commit and tag removed"
  exit 1
fi

git push origin master
git push origin "$VERSION"

gh release create "$VERSION" --title "$VERSION" --generate-notes ${GH_FLAGS[@]+"${GH_FLAGS[@]}"}

echo "Done: $(gh release view "$VERSION" --json url -q .url)"
