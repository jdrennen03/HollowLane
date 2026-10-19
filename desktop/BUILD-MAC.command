#!/bin/bash
cd "$(dirname "$0")"
if ! command -v npm >/dev/null; then echo "Node.js is not installed. Get the LTS version from https://nodejs.org and run this again."; read -n1; exit 1; fi
echo "Downloading build tools (first time only, about 150 MB)..."
npm install --no-audit --no-fund && npm run build || { read -n1; exit 1; }
open dist/"Hollow lane (Claires version!)"-darwin-*/
echo "Drag Hollow lane (Claires version!).app into Applications, then open it."
