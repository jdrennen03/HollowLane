#!/bin/sh
# Builds the whole Unreal export kit into <outDir> and zips it: maps (export-kit.js), every model as a .glb (json2glb.py),
# the recorded sounds and music as WAV (ffmpeg), the generated sounds, the game data, and the README.
#   usage: sh tools/unreal-export/make-kit.sh <outDir>
# Needs node with playwright (set NODE_PATH to where it is installed), python3, ffmpeg and zip.
set -e
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../.." && pwd); out=${1:-unreal-kit}
mkdir -p "$out/models" "$out/sounds/recorded"
node "$here/export-kit.js" "$out"
for f in "$repo"/assets/*.json; do python3 -I "$here/json2glb.py" "$f" "$out/models/$(basename "$f" .json).glb"; done
for f in "$repo"/assets/*.mp3; do ffmpeg -loglevel error -y -i "$f" "$out/sounds/recorded/$(basename "$f" .mp3).wav"; done
cp "$here/README.md" "$out/README.md"
(cd "$(dirname "$out")" && rm -f "$(basename "$out").zip" && zip -qr "$(basename "$out").zip" "$(basename "$out")")
echo "kit: $out ($(du -sh "$out" | cut -f1)), zip: $out.zip"
