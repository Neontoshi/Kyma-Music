#!/bin/bash
# Usage: ./bump-version.sh 0.2.0

NEW_VERSION=${1:?Usage: ./bump-version.sh 0.2.0}
OLD_VERSION=$(grep 'version' Kyma_Backend/Cargo.toml | head -1 | sed 's/.*"\(.*\)".*/\1/')

echo "Bumping $OLD_VERSION → $NEW_VERSION"

# Backend Cargo.toml
sed -i "s/version = \"$OLD_VERSION\"/version = \"$NEW_VERSION\"/" Kyma_Backend/Cargo.toml

# Backend tauri.conf.json
sed -i "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" Kyma_Backend/tauri.conf.json

# Frontend package.json
sed -i "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" Kyma_Frontend/package.json

echo "Done. Run: git add -A && git commit -m 'Bump v$NEW_VERSION' && git tag v$NEW_VERSION"
