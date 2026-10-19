# Hollow lane (Claires version!)

First-person co-op ghost hunting for 1–4 players, built with three.js. Investigate a house, a farm, a bayou or
the Whitlock Stables, gather evidence, and name the ghost before it takes you.

Every round starts at home base, the Whitlock Stables. Tack up in the tack room and ride out down the drive to
start the investigation:

- **Ride**: put a bridle on Agrippa or Dakota (the saddle is optional), then press E on the horse. You can't ride
  without a bridle. W to walk on, Shift to canter, steer with the mouse or A/D, E to get down.
- **Wagon**: put the harness on any animal (either horse, or Juniper the donkey), lead it to the covered wagon
  (E on the animal), press E on the wagon to hitch it, then E again to drive. Teammates can climb in the back.
- **Bring the donkey**: press E on Juniper to lead her on a rope. Anything you ride, lead or hitch when the team
  leaves comes along and waits by the base at the haunted location.
- G takes tack off an animal, hangs carried tack back up, or unhitches the wagon.

## Download

Grab the latest build from the [Releases](../../releases) page:

| System | File |
| --- | --- |
| Windows | `HollowLane-Windows-x64.zip` – unzip, run `Hollow lane (Claires version!).exe` |
| Mac (M1/M2/M3…) | `HollowLane-Mac-AppleSilicon.zip` |
| Mac (Intel) | `HollowLane-Mac-Intel.zip` |
| Linux | `HollowLane-Linux-x64.zip` – run `hollow-lane` |

The apps are unsigned. Windows: "Windows protected your PC" → More info → Run anyway.
Mac: if it says the app is damaged, run `xattr -cr "/Applications/Hollow lane (Claires version!).app"` once in Terminal.

## Making a release

Builds run on GitHub Actions (`.github/workflows/build.yml`). To publish a new version, open the
**Actions** tab → **Build desktop apps** → **Run workflow**, type a version such as `v1.0.1`, and run it.
About 10 minutes later the Release appears with all four downloads. (Pushing a git tag `v1.0.1` does
the same.) Leave the version blank for a test build – the zips then appear under that run's Artifacts.

## Project layout

```
src/        game source – 00_head.html plus numbered .js files, concatenated in name order
assets/     models (glTF as .json) and textures
build.js    node build.js → index.html (web), test.html (local debug), desktop/app/index.html
desktop/    Electron wrapper: LAN multiplayer relay (main.js), net shim, packaging scripts
```

Files in `src/` load in name order, so anything used at startup must sort before `11_main.js`.

## Building locally

Needs Node.js 22+.

```sh
cd desktop
npm install
npm start          # run the desktop app from source
npm run build      # package for this computer into desktop/dist
```

Or double-click `desktop/BUILD-WINDOWS.bat` / `desktop/BUILD-MAC.command`, or run `desktop/build-linux.sh`.

For the browser version, run `node build.js` and serve the folder with `index.html` next to the
contents of `assets/` (the Pages workflow does exactly this).

## Multiplayer

One player hosts and shares the 4-letter code; friends on the same network join with it. Over the
internet use Tailscale/ZeroTier/Hamachi or forward TCP 47615, then join with `CODE@host-address`.
See `desktop/README.txt` for controls and gear.
