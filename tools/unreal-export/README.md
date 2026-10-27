# Hollow Lane — Unreal export kit

Everything from the web/Electron game (three.js) that can be carried into Unreal Engine without rewriting it: the five
maps as glTF scenes with named markers, every model, every sound, and the game's data. Built by
`tools/unreal-export/make-kit.sh` in the game repository; rerun it after changing the game to refresh the kit.

## What is in here

| Folder | Contents |
| --- | --- |
| `maps/<id>.glb` | The map's static world: terrain, house shell (walls, floors, ceilings, roofs, stairs, trim), every piece of furniture and fixture, the street and yard, trees. Doors are separate nodes named `DOOR_<n>`, pivoted on their hinge. A `MARKERS` group holds empty nodes (see below). Grass, the sky dome and ground mist are not included (rebuild them with Unreal foliage, sky and fog). |
| `maps/<id>.json` | The same map as data, in the game's own units (metres, y up): rooms (rectangle, level, floor/wall material keys, light switch, ceiling lamp), walls with their door/window/arch openings, doors (hinge side, swing), stairs, raised slabs, the player colliders, prop spawns, equipment layout and windows. |
| `models/*.glb` | Every model the game loads: the five ghost models (`ghost-*`, rigged and animated), the player characters (`player-male/female`, rigged), the cats (`cat-model`, rigged; coats are painted at runtime so it has no textures), the horse, the gator, and the furniture/prop packs (`prop-*`). Packs hold many named parts; the game picks parts by node name. |
| `sounds/recorded/*.wav` | The recorded sound effects and title music (converted from the game's mp3s; Unreal does not import mp3). |
| `sounds/generated/*.wav` | Every sound the game synthesises in code (ghost knocks, whispers, wails and footsteps, door creaks and slams, the light switch, the bulb pop, the breaker, item beeps, the candle being blown out, the hunt loop, wind and crickets, …), rendered once to 16-bit WAV. `recorded_step_<surface>_<n>` are the ten footsteps per floor surface (wood, carpet, tile, concrete, grass) the game cuts from the footstep recording. |
| `data/` | `ghosts.json/.csv` (each ghost's three evidences, its tell, and its behaviour flags), `evidence.json`, `items.json`, `spiritBox.json` (questions and answers), `chances.json` (evidence 70%, ghost ability 40%), `ghostModels.json` (model file, height, clip setup), `maps.json` (titles and lore text). |

## Markers (in `maps/<id>.glb` → `MARKERS`)

| Name | Where |
| --- | --- |
| `ROOM_<id>` | Centre of the room, on its floor. Extras carry the display name and rectangle. |
| `ROOMCORNER_<id>_min` / `_max` | Opposite corners of the room box (the max one is 2.6 m up): use them to build trigger volumes. |
| `LAMP_<id>` | Ceiling light position. |
| `SWITCH_<id>` | Light switch position. |
| `TENT` | The equipment tent outside. |
| `ITEM_<type>_<n>` | Each piece of equipment where it rests on the tent table. |
| `PROP_<type>_<n>` | Each throwable/carryable prop (cups, books, toys, …) the ghost can move. Use the matching model or a simple mesh. |
| `PLAYER_START` | Where the player spawns. |

## Importing into Unreal (UE 5.x)

1. Models: drag a `.glb` into the Content Browser (Interchange glTF importer). Skeletal meshes come in with their
   skeleton and animations.
2. Maps: open an empty level, then **File → Import Into Level** and pick `maps/<id>.glb`. Every node becomes an actor,
   including the empty marker nodes, so the markers arrive already converted to Unreal's axes and centimetres.
3. Sounds: drag the WAV files into the Content Browser.
4. Data: `ghosts.csv` can become a Data Table (make a matching struct first); the JSON files can be read from C++ or a
   Python editor script.

### Units and axes

The glTF files and the JSON are in metres with **y up** (three.js, right-handed). The Unreal importer converts the glTF
files to centimetres and Z up by itself. The JSON files are not converted: to place anything from them, scale by 100
and apply the same axis change the importer used. The safest way to get that mapping is from the markers: compare a
marker actor's location after import with the same entry in the JSON (for example `ROOMCORNER_<id>_min` and the room's
`r[0], y, r[1]`) and fit the axis swap and signs once.

## Known gaps

- Materials export as standard PBR (base colour, normal, roughness, metalness, emissive). Effects the game adds in its
  shaders (wall grime, wet sheen, the ghost's laser-grid silhouette) are not in the files.
- Window and door glass may come in opaque. Set those materials to translucent in Unreal.
- The game's lights are not in the files. The `LAMP_*` and `SWITCH_*` markers show where room lights and switches go;
  the outdoor moonlight and porch light need to be added by hand.
- Grass is generated at runtime and is not exported. The live-oak canopies on the Myrtles are deliberately simple dark
  shapes (they read as foliage at night); in Unreal they are worth replacing with real foliage meshes.
- The ghost's voice uses the browser's text-to-speech. Unreal has nothing built in for that, so it needs a TTS plugin or
  prerecorded lines.
