#!/bin/sh
cd "$(dirname "$0")"
command -v npm >/dev/null || { echo "Install Node.js 22.12+ (https://nodejs.org) first."; exit 1; }
npm install --no-audit --no-fund && npm run build && echo "Run: ./dist/Hollow lane (Claires version!)-linux-x64/hollow-lane"
