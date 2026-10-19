HOLLOW LANE (CLAIRES VERSION!) - desktop build kit

This folder turns the game into a normal app on your computer (Windows .exe, Mac .app or Linux).
It is small because the app engine (Electron) gets downloaded during the build.

1. Install Node.js (the "LTS" version) from https://nodejs.org - one-time, just click through the installer.
2. Build:
     Windows: double-click BUILD-WINDOWS.bat
     Mac:     right-click BUILD-MAC.command > Open (Mac asks once because it was downloaded)
     Linux:   ./build-linux.sh
   It takes a minute or two. When done, a folder opens with the game:
     Windows: "Hollow lane (Claires version!).exe"  (you can copy that whole folder anywhere or to a USB stick)
     Mac:     "Hollow lane (Claires version!).app"  (drag to Applications)
3. To give the game to friends, zip the finished folder in dist\ and send it -
   they don't need Node.js, they just run it. (Windows may show "Windows protected your PC":
   More info > Run anyway. On a Mac they may need System Settings > Privacy & Security > Open Anyway.)

CONTROLS
  WASD move, mouse look, Shift sprint, C crouch, E interact, F flashlight,
  R use held item, T talk to spirit box, Q / 1-3 / scroll to switch items,
  G drop, J journal, Esc pause.
  Loose objects (mugs, books, horse figures...): E to carry one in your free hand,
  G to drop it, left click to throw it.  F11 (or Alt+Enter) toggles fullscreen.

HOME BASE: THE STABLES
  Every round starts in the barn at Whitlock Stables. To start the investigation, ride out
  down the drive past the sign.
  Ride:  take a bridle from the tack room (E), put it on Agrippa or Dakota (E on the horse),
         then E on the horse to climb on. No bridle, no riding. The saddle is optional.
         W walk, Shift canter, mouse or A/D to steer, E to get down.
  Wagon: take the harness and put it on any animal (a horse or Juniper the donkey), lead the
         animal to the wagon (E on it), E on the wagon to hitch, E again to drive.
         Teammates press E on the wagon to climb in the back.
  Lead:  E on Juniper (or any animal you're not riding) to lead it on a rope.
  G takes tack off an animal, hangs carried tack back up, or unhitches the wagon.
  Animals you ride, lead or hitch when the team leaves come along to the haunted place.

SCOUT THE DOG
  Scout comes with you everywhere. Press V for his commands, then:
  1 Sit, 2 Stay, 3 Follow, 4 Heel, 5 Fetch (what you're looking at, or the last thing you threw).
  E to pet him. He growls and barks when the ghost is close.

NEW GEAR
  Camcorder - switch it on (R) to look through night vision. Some ghosts show as floating
              orbs in their room, visible only on the camcorder.
  Spirit journal - set it down (G) near where you think the ghost is; some ghosts write in it.
  Sanity medication - the beer cans on the tent table. Drink one (R) for +40% sanity.

INCENSE
  Four incense bundles sit on the tent table. Carry one in an inventory slot and press R to
  light it (burns ~10 seconds). If the ghost gets close to the smoke during a hunt it shrieks
  and flees for a few seconds - use that time to run or hide.

TEAM PLAY (up to 4)
  Everyone runs the app. One player presses Host and reads out the 4-letter code.
  Friends on the same Wi-Fi / network type the code and press Join.
  Allow the app through the firewall when asked.
  Over the internet: use Tailscale, ZeroTier or Hamachi (or forward TCP port 47615 on the
  host's router), then join with CODE@host-address, e.g.  ABCD@100.64.0.12
