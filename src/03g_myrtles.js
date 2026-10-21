// ---------------------------------------------------------------- map: The Myrtles (St. Francisville, Louisiana)
// After the real house: a long, raised one-and-a-half-storey house built in 1796 and widened in 1834. A gallery runs the
// whole front behind a cast-iron railing of grape clusters, under a broad entablature. The double front doors have
// sidelights and a transom of hand-painted glass in a French-cross pattern. Inside, a wide entry hall runs front to
// back, with a chandelier, faux-bois woodwork, the staircase where William Winter is said to have died on the 17th step,
// and the mirror outside the dining room. To the right are the original house's twin parlours with marble mantels, the
// dining room and the game room; to the left the music room, the French room and the only downstairs bedroom.
// Upstairs, under the dormered roof, the Judge Clarke Woodruff suite is reached only by the main stairs; the other four
// bedrooms share a sitting room and are reached by a stair from the back loggia. Behind the house: a brick courtyard,
// live oaks hung with moss, and a pond with a gazebo on its island.
const MY0 = 1.0, MY1 = 3.8;                   // floor heights: the raised main floor, the half storey under the roof
const MYR = { S: 0.933, R: MY1 + 5.6, W: 28, D: 12 };   // roof pitch (rise per metre), ridge height, house width, depth
const myRoofY = z => z < MYR.D / 2 ? MY1 + z * MYR.S : MY1 + (MYR.D - z) * MYR.S;   // underside of the main roof over z
const POND = { x: 42, z: 25, r: 8, isl: 2.6 };
MAPS.myrtles = {
  id: 'myrtles', title: 'The Myrtles', eyebrow: 'St. Francisville, Louisiana',
  lede: 'Built in 1796 and called one of the most haunted houses in America. In 1871 William Winter was shot on the gallery and climbed as far as the seventeenth step before he died. The handprints in the hall mirror come back however often it is cleaned. Set up at the tent, find out what still walks these halls, and get out before it hunts you.',
  levels: [MY0, MY1], extBase: [0, MY1], extTop: [MY1, MY1 + 2.75], siding: 'sidingWhite', skirt: 'brick', shutter: 'shutterGreen', crooked: false,
  trimColor: 0xeeece4, noShutters: wd => wd.fy > 2 || !!wd.o.lite,
  tempBase: 13.5, outsideTemp: 11,
  tent: { x: 5, z: -13 }, lure: 2, moonTarget: [14, 0, 6], grassBox: [-30, -36, 62, 46],
  street: [17.2, 3.6, -9.0], porch: [12.5, MY0 + 2.35, -0.25],
  navBox: [-0.6, -3.5, 29.7, 14.6],
  terrain(x, z) {
    const d = Math.hypot(x - POND.x, z - POND.z); if (d > POND.r + 0.6) return 0;
    return -1.1 * smooth(POND.r + 0.6, POND.r - 2, d) + 1.25 * smooth(POND.isl + 0.6, POND.isl - 0.2, d);
  },
  // the ghost may also cross the gallery, the back loggia and the outside stair up to the back bedrooms
  navWalk(l, x, z) {
    if (l === 0) return (x > -0.4 && x < 28.4 && z > -3.3 && z < 0) || (x > 10 && x < 29.6 && z > 12 && z < 14.4) || (x > 28.15 && x < 29.45 && z > 7.8 && z < 12.2);
    return x > 27.7 && x < 29.5 && z > 6.0 && z < 7.8;
  },
  yardName: p => Math.hypot(p.x - POND.x, p.z - POND.z) < POND.r + 2 ? 'Pond' : p.y > 0.5 && p.z < 0.2 && p.z > -3.4 ? 'Front gallery' : p.y > 0.5 && p.z > 11.9 ? 'Back loggia' : p.z > 14.4 && p.x > 8 && p.x < 30 ? 'Brick courtyard' : p.z < -3.3 ? 'Front lawn' : 'Grounds',
  outsideStep(p) {
    if (p.y > 0.5 || (p.x > 33.6 && p.x < 40 && Math.abs(p.z - POND.z) < 0.8)) return p.z > 11.9 && p.x < 28.1 ? 'step_concrete' : 'step_wood';
    return (p.z > 14.4 && p.z < 22 && p.x > 8 && p.x < 30) || (p.x > 11.6 && p.x < 13.4 && p.z < -4.8) ? 'step_concrete' : 'step_grass';
  },
  menuCam(T, cam) { const a = -0.35 + Math.sin(T * 0.03) * 0.75; cam.position.set(14 + Math.sin(a) * 26, 4.2 + Math.sin(T * 0.1) * 0.35, 4 - Math.cos(a) * 26); cam.lookAt(14, 3.4, 4); },
  grassOK(x, z) {
    if (x > -1.2 && x < 30.2 && z > -5.2 && z < 16.2) return false;            // house, gallery, loggia, steps
    if (x > 8 && x < 30 && z > 14 && z < 22.4) return false;                    // brick courtyard
    if (x > 11.4 && x < 13.6 && z < -4.6) return false;                         // front walk
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.4 && Math.hypot(x - POND.x, z - POND.z) > POND.isl) return false;
    if (x > -15.6 && x < -8.4 && z > -10.6 && z < -3.4) return false;          // general store
    return true;
  },
  rooms: [
    // ---- main floor
    { id: 'french', name: 'French Room', r: [0, 0, 5, 6], floor: 'woodF', wall: 'wpRose', sw: [4.94, 1.9, -1, 0], lamp: [2.5, 3] },
    { id: 'music', name: 'Music Room', r: [5, 0, 10, 6], floor: 'woodF', wall: 'wpGreen', sw: [9.94, 2.6, -1, 0], lamp: [7.5, 3] },
    { id: 'hall', name: 'Entry Hall', r: [10, 0, 15, 12], floor: 'woodF', wall: 'wpBeige', sw: [14.94, 2.9, -1, 0], lamp: [12.9, 5.8], chandelier: true, noGhost: true },
    { id: 'ladies', name: "Ladies' Parlor", r: [15, 0, 21.5, 6], floor: 'woodF', wall: 'wpGold', sw: [15.06, 5.3, 1, 0], lamp: [18.25, 3], chandelier: true },
    { id: 'gents', name: "Gentlemen's Parlor", r: [21.5, 0, 28, 6], floor: 'woodF', wall: 'wpRed', sw: [21.56, 5.3, 1, 0], lamp: [24.75, 3], chandelier: true },
    { id: 'dining', name: 'Dining Room', r: [15, 6, 21.5, 12], floor: 'woodF', wall: 'wpSage', sw: [15.06, 6.7, 1, 0], lamp: [18.25, 9], chandelier: true },
    { id: 'game', name: 'Game Room', r: [21.5, 6, 28, 12], floor: 'woodF', wall: 'wpGreen', sw: [21.56, 7.2, 1, 0], lamp: [24.75, 9] },
    { id: 'bed1', name: 'Downstairs Bedroom', r: [0, 6, 6.5, 12], floor: 'woodF', wall: 'wpRose', sw: [3.3, 6.06, 0, 1], lamp: [3.25, 9] },
    { id: 'bath1', name: 'Downstairs Bath', r: [6.5, 6, 10, 12], floor: 'bathF', wall: 'bathTileW', sw: [9.94, 9.8, -1, 0], lamp: [8.25, 9] },
    // ---- upstairs
    { id: 'landing', name: 'Upstairs Landing', r: [10, 3, 15, 9], lv: 1, floor: 'woodF', wall: 'wpBeige', sw: [14.94, 5.15, -1, 0], lamp: [12.9, 6], noGhost: true },
    { id: 'wsit', name: 'Woodruff Sitting Room', r: [5, 3, 10, 9], lv: 1, floor: 'woodF', wall: 'wpGold', sw: [9.94, 4.4, -1, 0], lamp: [7.5, 6] },
    { id: 'wbed', name: 'Judge Woodruff Bedroom', r: [0.3, 3, 5, 6.6], lv: 1, floor: 'woodF', wall: 'wpRose', sw: [4.94, 3.5, -1, 0], lamp: [2.65, 4.6] },
    { id: 'wbath', name: 'Woodruff Bath', r: [0.3, 6.6, 5, 9], lv: 1, floor: 'bathF', wall: 'bathTileW', sw: [3.4, 6.66, 0, 1], lamp: [2.65, 7.8] },
    { id: 'winter', name: 'William Winter Room', r: [15, 3, 19.2, 6], lv: 1, floor: 'woodF', wall: 'wpSage', sw: [19.14, 3.5, -1, 0], lamp: [17.1, 4.5] },
    { id: 'leake', name: 'John Leake Room', r: [15, 6, 19.2, 9], lv: 1, floor: 'woodF', wall: 'wpBlue', sw: [19.14, 8.5, -1, 0], lamp: [17.1, 7.4] },
    { id: 'sit', name: 'Upstairs Sitting Room', r: [19.2, 3, 23.6, 9], lv: 1, floor: 'woodF', wall: 'wpBeige', sw: [19.26, 5.6, 1, 0], lamp: [21.4, 6] },
    { id: 'fannie', name: 'Fannie Williams Room', r: [23.6, 3, 27.75, 6], lv: 1, floor: 'woodF', wall: 'wpRose', sw: [23.66, 3.5, 1, 0], lamp: [25.7, 4.5] },
    { id: 'ruffin', name: 'Ruffin Stirling Room', r: [23.6, 6, 27.75, 9], lv: 1, floor: 'woodF', wall: 'wpRed', sw: [23.66, 8.5, 1, 0], lamp: [25.7, 7.8] },
    // ---- closets (hiding spots)
    { id: 'c1', name: 'Bedroom Closet', r: [0, 6, 1.6, 7.6], floor: 'woodF', wall: 'plasterG', closet: true, parent: 7, door: 11 },
    { id: 'c2', name: 'Woodruff Wardrobe Closet', r: [0.3, 5.3, 1.7, 6.6], lv: 1, floor: 'woodF', wall: 'plasterG', closet: true, parent: 11, door: 20 },
    { id: 'c3', name: 'John Leake Closet', r: [15, 7.8, 16.4, 9], lv: 1, floor: 'woodF', wall: 'plasterG', closet: true, parent: 14, door: 21 },
  ],
  walls: [
    // ---- main floor, exterior (tall windows almost to the floor, as on the gallery)
    { z: 0, a: -0.1, b: 28.1, t: 0.2, ext: true, open: [{ s: 1.0, e: 2.0, win: 1, sill: 0.25, top: 2.45 }, { s: 3.0, e: 4.0, win: 1, sill: 0.25, top: 2.45 }, { s: 6.0, e: 7.0, win: 1, sill: 0.25, top: 2.45 }, { s: 8.2, e: 9.2, win: 1, sill: 0.25, top: 2.45 },
      { s: 11.35, e: 11.75, win: 1, sill: 0.3, top: 2.1, lite: 1 }, { s: 11.8, e: 13.2, door: 0 }, { s: 13.25, e: 13.65, win: 1, sill: 0.3, top: 2.1, lite: 1 },
      { s: 16.2, e: 17.2, win: 1, sill: 0.25, top: 2.45 }, { s: 19.3, e: 20.3, win: 1, sill: 0.25, top: 2.45 }, { s: 22.7, e: 23.7, win: 1, sill: 0.25, top: 2.45 }, { s: 25.8, e: 26.8, win: 1, sill: 0.25, top: 2.45 }] },
    { z: 12, a: -0.1, b: 28.1, t: 0.2, ext: true, open: [{ s: 0.9, e: 1.8, win: 1 }, { s: 4.7, e: 5.6, win: 1 }, { s: 8.6, e: 9.4, win: 1, sill: 1.4 }, { s: 11.8, e: 13.2, door: 1 },
      { s: 16.5, e: 17.5, win: 1, sill: 0.4, top: 2.4 }, { s: 19.0, e: 20.0, win: 1, sill: 0.4, top: 2.4 }, { s: 23.0, e: 24.0, win: 1 }, { s: 25.8, e: 26.8, win: 1 }] },
    { x: 0, a: 0.1, b: 11.9, t: 0.2, ext: true, open: [{ s: 2.4, e: 3.6, win: 1, sill: 0.4, top: 2.4 }, { s: 8.6, e: 9.6, win: 1 }] },
    { x: 28, a: 0.1, b: 11.9, t: 0.2, ext: true, open: [{ s: 0.6, e: 1.5, win: 1 }, { s: 4.5, e: 5.4, win: 1 }, { s: 6.6, e: 7.5, win: 1 }] },
    // ---- main floor, interior
    { x: 5, a: 0.1, b: 6, t: 0.14, open: [{ s: 2.4, e: 3.3, door: 2 }] },
    { x: 10, a: 0.1, b: 11.9, t: 0.14, open: [{ s: 1.2, e: 2.1, door: 3 }, { s: 10.3, e: 11.2, door: 4 }] },
    { x: 15, a: 0.1, b: 11.9, t: 0.14, open: [{ s: 3.3, e: 4.9, arch: 1 }, { s: 7.4, e: 8.3, door: 5 }] },
    { x: 21.5, a: 0.1, b: 6, t: 0.14, open: [{ s: 1.4, e: 4.6, arch: 1 }] },
    { x: 21.5, a: 6, b: 11.9, t: 0.14, open: [{ s: 8.6, e: 9.5, door: 6 }] },
    { z: 6, a: 0.1, b: 10, t: 0.14, open: [{ s: 2.0, e: 2.9, door: 7 }] },
    { z: 6, a: 15, b: 27.9, t: 0.14, open: [{ s: 17.2, e: 18.1, door: 8 }, { s: 24.2, e: 25.1, door: 9 }] },
    { x: 6.5, a: 6, b: 11.9, t: 0.12, open: [{ s: 7.0, e: 7.9, door: 10 }] },
    { z: 7.6, a: 0.1, b: 1.65, t: 0.1 },
    { x: 1.6, a: 6.07, b: 7.6, t: 0.1, open: [{ s: 6.4, e: 7.3, door: 11 }] },
    // ---- upstairs: the front and back walls stand where the roof leaves full head height; the dormers open out of them
    { z: 3, lv: 1, a: 0.2, b: 27.85, t: 0.2, ext: true, open: [{ s: 2.0, e: 3.2, win: 1 }, { s: 6.8, e: 8.2, win: 1 }, { s: 16.5, e: 17.7, win: 1 }, { s: 20.7, e: 22.1, win: 1 }, { s: 25.1, e: 26.3, win: 1 }] },
    { z: 9, lv: 1, a: 0.2, b: 27.85, t: 0.2, ext: true, open: [{ s: 2.1, e: 3.1, win: 1, sill: 1.2 }, { s: 6.9, e: 8.1, win: 1 }, { s: 16.5, e: 17.7, win: 1 }, { s: 20.8, e: 22.0, win: 1 }, { s: 25.1, e: 26.3, win: 1 }] },
    { x: 0.3, lv: 1, a: 3.1, b: 8.9, t: 0.12 },
    { x: 27.75, lv: 1, a: 3.1, b: 8.9, t: 0.12, open: [{ s: 6.2, e: 7.1, door: 12 }] },
    { x: 5, lv: 1, a: 3.1, b: 8.9, t: 0.12, open: [{ s: 4.0, e: 4.9, door: 13 }] },
    { z: 6.6, lv: 1, a: 0.3, b: 5, t: 0.12, open: [{ s: 2.0, e: 2.9, door: 14 }] },
    { x: 10, lv: 1, a: 3.1, b: 8.9, t: 0.12, open: [{ s: 3.1, e: 3.95, door: 15 }] },   // at the top of the stairs, beside the stairwell
    { x: 15, lv: 1, a: 3.1, b: 8.9, t: 0.14, open: [{ s: 4.0, e: 4.9, door: 22 }] },   // landing into the back bedrooms
    { x: 19.2, lv: 1, a: 3.1, b: 8.9, t: 0.12, open: [{ s: 4.0, e: 4.9, door: 16 }, { s: 7.1, e: 8.0, door: 17 }] },
    { x: 23.6, lv: 1, a: 3.1, b: 8.9, t: 0.12, open: [{ s: 4.0, e: 4.9, door: 18 }, { s: 6.2, e: 7.1, door: 19 }] },
    { z: 6, lv: 1, a: 15, b: 19.2, t: 0.12 },
    { z: 6, lv: 1, a: 23.6, b: 27.7, t: 0.12 },
    { z: 5.3, lv: 1, a: 0.36, b: 1.75, t: 0.1, open: [{ s: 0.45, e: 1.35, door: 20 }] },
    { x: 1.7, lv: 1, a: 5.3, b: 6.54, t: 0.1 },
    { z: 7.8, lv: 1, a: 15.07, b: 16.45, t: 0.1, open: [{ s: 15.2, e: 16.1, door: 21 }] },
    { x: 16.4, lv: 1, a: 7.8, b: 8.9, t: 0.1 },
  ],
  doors: [
    { z: 0, s: 11.8, e: 13.2, hinge: 's', into: 1, front: true, glassDoor: true },
    { z: 12, s: 11.8, e: 13.2, hinge: 's', into: -1, ext: true },
    { x: 5, s: 2.4, e: 3.3, hinge: 's', into: 1 },
    { x: 10, s: 1.2, e: 2.1, hinge: 's', into: 1 },
    { x: 10, s: 10.3, e: 11.2, hinge: 'e', into: -1 },
    { x: 15, s: 7.4, e: 8.3, hinge: 's', into: 1 },
    { x: 21.5, s: 8.6, e: 9.5, hinge: 's', into: 1 },
    { z: 6, s: 2.0, e: 2.9, hinge: 's', into: 1 },
    { z: 6, s: 17.2, e: 18.1, hinge: 's', into: 1 },
    { z: 6, s: 24.2, e: 25.1, hinge: 'e', into: 1 },
    { x: 6.5, s: 7.0, e: 7.9, hinge: 's', into: 1 },
    { x: 1.6, s: 6.4, e: 7.3, hinge: 's', into: 1, closet: 18 },
    { x: 27.75, s: 6.2, e: 7.1, hinge: 's', into: -1, ext: true, lv: 1 },
    { x: 5, s: 4.0, e: 4.9, hinge: 's', into: -1, lv: 1 },
    { z: 6.6, s: 2.0, e: 2.9, hinge: 's', into: 1, lv: 1 },
    { x: 10, s: 3.1, e: 3.95, hinge: 'e', into: -1, lv: 1 },
    { x: 19.2, s: 4.0, e: 4.9, hinge: 's', into: -1, lv: 1 },
    { x: 19.2, s: 7.1, e: 8.0, hinge: 'e', into: -1, lv: 1 },
    { x: 23.6, s: 4.0, e: 4.9, hinge: 's', into: 1, lv: 1 },
    { x: 23.6, s: 6.2, e: 7.1, hinge: 'e', into: 1, lv: 1 },
    { z: 5.3, s: 0.45, e: 1.35, hinge: 's', into: -1, closet: 19, lv: 1 },
    { z: 7.8, s: 15.2, e: 16.1, hinge: 's', into: -1, closet: 20, lv: 1 },
    { x: 15, s: 4.0, e: 4.9, hinge: 'e', into: 1, lv: 1 },
  ],
  stairs: [
    { x0: 10.15, z0: 4.0, x1: 11.35, z1: 9.2, axis: 'z', lo: 0, hi: 1, flip: true },     // the main staircase, seventeen steps, rising toward the front door
    { x0: 28.2, z0: 7.8, x1: 29.4, z1: 12.2, axis: 'z', lo: 0, hi: 1, flip: true },      // the back stair, up from the loggia to the back bedrooms
  ],
  slabs: [
    { x0: -0.4, z0: -3.3, x1: 28.4, z1: 0, y: MY0 },                                       // the front gallery
    { x0: 11.4, z0: -4.9, x1: 13.6, z1: -3.3, ramp: true, axis: 'z', ya: 0, yb: MY0 },      // gallery steps
    { x0: 10, z0: 12, x1: 29.6, z1: 14.4, y: MY0 },                                         // the back loggia
    { x0: 11.6, z0: 14.4, x1: 13.4, z1: 15.9, ramp: true, axis: 'z', ya: MY0, yb: 0 },      // loggia steps down to the courtyard
    { x0: 27.7, z0: 6.0, x1: 29.5, z1: 7.8, y: MY1 },                                       // landing at the top of the back stair
    { x0: POND.x - 8.3, z0: POND.z - 0.7, x1: POND.x - POND.isl + 0.4, z1: POND.z + 0.7, y: 0.28 },   // footbridge to the island
    { x0: POND.x - 1.9, z0: POND.z - 1.9, x1: POND.x + 1.9, z1: POND.z + 1.9, y: 0.42 },     // gazebo floor
  ],
  build(gb, root) { buildMyrtles(gb, root); },
};

// ---------------------------------------------------------------- helpers for this map
// geometry that needs its own material and no shadow (lace ironwork, moss, painted glass): planes merged per material
function flatBatch() {
  const B = { p: [], u: [], n: [] };
  B.quad = (cx, cy, cz, w, h, ry, u0 = 0, u1 = 1, v0 = 0, v1 = 1) => {
    const c = Math.cos(ry), s = Math.sin(ry), ax = c * w / 2, az = -s * w / 2;
    const P = [[cx - ax, cy - h / 2, cz - az], [cx + ax, cy - h / 2, cz + az], [cx + ax, cy + h / 2, cz + az], [cx - ax, cy + h / 2, cz - az]], U = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    for (const i of [0, 1, 2, 0, 2, 3]) { B.p.push(...P[i]); B.u.push(...U[i]); B.n.push(s, 0, c); }
  };
  B.mesh = mat => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = true; return m; };
  return B;
}
const MYRT_MAT = {};
function myrtMats() {
  if (MYRT_MAT.lace) return MYRT_MAT;
  const alpha = (w, h, draw, color = 0xffffff) => { const [c, x] = mkCanvas(w, h); draw(x, w, h); const t = canvasTex(c, true, false); t.anisotropy = 4; return new THREE.MeshStandardMaterial({ map: t, color, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.2 }); };
  // the gallery railing: rails, scrolling vines and grape clusters, white cast iron
  MYRT_MAT.lace = alpha(512, 192, (x, w, h) => {
    x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round';
    x.lineWidth = 10; x.beginPath(); x.moveTo(0, 6); x.lineTo(w, 6); x.moveTo(0, h - 6); x.lineTo(w, h - 6); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.moveTo(0, 22); x.lineTo(w, 22); x.moveTo(0, h - 22); x.lineTo(w, h - 22); x.stroke();
    for (let i = 0; i < 4; i++) {
      const cx = 64 + i * 128;
      x.lineWidth = 6; x.beginPath(); x.moveTo(cx - 64, h - 22); x.bezierCurveTo(cx - 40, 30, cx + 40, 30, cx + 64, h - 22); x.stroke();
      x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 64, 22); x.bezierCurveTo(cx - 30, h - 40, cx + 30, h - 40, cx + 64, 22); x.stroke();
      for (const sd of [-1, 1]) { x.beginPath(); x.arc(cx + sd * 30, 70, 16, 0, Math.PI * 1.6); x.stroke(); }
      // a bunch of grapes and two leaves
      for (let r = 0; r < 4; r++) for (let k = 0; k <= 3 - r; k++) { x.beginPath(); x.arc(cx - (3 - r) * 7 + k * 14, 96 + r * 13, 7.5, 0, Math.PI * 2); x.fill(); }
      for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(cx + sd * 22, 84, 14, 8, sd * 0.6, 0, Math.PI * 2); x.fill(); }
    }
  }, 0xf1efe8);
  // the frieze of pierced ironwork under the entablature
  MYRT_MAT.frieze = alpha(512, 96, (x, w, h) => {
    x.strokeStyle = '#fff'; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 5); x.lineTo(w, 5); x.stroke(); x.lineWidth = 4; x.beginPath(); x.moveTo(0, 18); x.lineTo(w, 18); x.stroke();
    x.lineWidth = 5; for (let i = 0; i < 8; i++) { const cx = 32 + i * 64; x.beginPath(); x.arc(cx, 18, 30, 0, Math.PI); x.stroke(); x.beginPath(); x.arc(cx, 40, 9, 0, Math.PI * 2); x.stroke(); }
  }, 0xf1efe8);
  // Spanish moss hanging from the oaks
  MYRT_MAT.moss = alpha(64, 256, (x, w, h) => {
    for (let i = 0; i < 46; i++) { const x0 = Math.random() * w, len = h * (0.35 + Math.random() * 0.65); x.strokeStyle = `rgba(${105 + Math.random() * 25 | 0},${112 + Math.random() * 25 | 0},${98 + Math.random() * 20 | 0},1)`; x.lineWidth = 0.8 + Math.random() * 1.4; x.beginPath(); x.moveTo(x0, 0); let px = x0; for (let y = 0; y < len; y += 8) { px += (Math.random() - 0.5) * 5; x.lineTo(px, y); } x.stroke(); }
  }, 0x8a8f80);
  // old silvered glass: a dim grey sheen rather than a black hole in the wall
  MYRT_MAT.mirror = new THREE.MeshStandardMaterial({ color: 0x8e948f, metalness: 0.55, roughness: 0.18, emissive: 0x1a1c1a });
  MYRT_MAT.moss.side = THREE.DoubleSide; MYRT_MAT.moss.roughness = 0.95; MYRT_MAT.moss.metalness = 0;
  // the front door's painted glass: a French cross in each pane
  { const [c, x] = mkCanvas(128, 256); x.fillStyle = '#6b1d1a'; x.fillRect(0, 0, 128, 256);
    for (let j = 0; j < 4; j++) { const y0 = j * 64; x.fillStyle = j % 2 ? '#2f4f6f' : '#c9a54a'; x.fillRect(6, y0 + 6, 116, 52); x.fillStyle = '#e9e2c8'; x.fillRect(58, y0 + 10, 12, 44); x.fillRect(26, y0 + 26, 76, 12); x.fillStyle = '#8a2420'; x.beginPath(); x.arc(64, y0 + 32, 7, 0, 7); x.fill(); }
    MYRT_MAT.stained = new THREE.MeshStandardMaterial({ map: canvasTex(c, true, false), emissive: 0xffffff, emissiveMap: canvasTex(c, true, false), emissiveIntensity: 0.05, roughness: 0.2, side: THREE.DoubleSide }); }
  MYRT_MAT.sign = (() => { const [c, x] = mkCanvas(512, 96); x.fillStyle = '#e8e1cc'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#2a2420'; x.font = 'bold 52px Georgia, serif'; x.textAlign = 'center'; x.fillText("GENERAL'S STORE", 256, 66); return new THREE.MeshStandardMaterial({ map: canvasTex(c, true, false), roughness: 0.8 }); })();
  return MYRT_MAT;
}
// white marble mantel with a dark firebox; f faces into the room (local -z), its back against the wall
function myMantel(f, mat = 'marbleW') {
  for (const sx of [-1, 1]) { f.box(mat, sx * 0.66, 0.56, 0, 0.2, 1.12, 0.24); f.box(mat, sx * 0.66, 0.05, -0.02, 0.26, 0.1, 0.3); }
  f.box(mat, 0, 1.2, 0, 1.56, 0.2, 0.24); f.box(mat, 0, 1.33, -0.03, 1.86, 0.06, 0.34); f.box(mat, 0, 1.12, -0.13, 0.36, 0.14, 0.02);
  f.box('railBlack', 0, 0.55, 0.06, 1.12, 1.04, 0.14); f.box('brick', 0, 0.02, -0.1, 1.12, 0.04, 0.3);
  f.box('marbleW', 0, 0.015, -0.42, 1.9, 0.03, 0.5);
  for (const sx of [-0.25, 0, 0.25]) f.cyl('bark', sx, 0.14, 0.0, 0.06, 0.06, 0.6, 7, 0, Math.PI / 2 - 0.2);
  f.solid(-0.93, -0.25, 0.93, 0.15, 1.3);
}
// a gilded mirror on a wall: (x, z) on the wall face, ry turns it to face into the room
function myMirror(gb, root, x, y, z, ry, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), myrtMats().mirror); m.position.set(x + Math.sin(ry) * 0.03, y, z + Math.cos(ry) * 0.03); m.rotation.y = ry; root.add(m);
  const f = fur(gb, x, z, ry, 0), t = 0.09;
  f.box('brass', 0, y + h / 2 + t / 2, 0.015, w + 2 * t, t, 0.05); f.box('brass', 0, y - h / 2 - t / 2, 0.015, w + 2 * t, t, 0.05);
  for (const sx of [-1, 1]) f.box('brass', sx * (w / 2 + t / 2), y, 0.015, t, h, 0.05);
  f.box('brass', 0, y + h / 2 + t + 0.08, 0.02, w * 0.5, 0.16, 0.04);
  return m;
}
// a four-poster: the La Parisienne bed, headboard at local +z (against the wall); its quilt drapes to the floor at the sides
function fourPoster(gb, root, f, len = 2.1, wid = 1.7) {
  furModel(f, 'prop-fourposter.json', 'Collada_visual_scene_group', { height: 2.05, turn: Math.PI / 2 });
  f.solid(-0.8, -1.05, 0.8, 1.05, 0.7);
}
// a tall armoire, doors on local -z
function armoire(f) {
  f.box('darkWood', 0, 1.1, 0, 1.2, 2.2, 0.6); f.box('darkWood', 0, 2.25, 0, 1.32, 0.12, 0.66);
  for (const sx of [-0.3, 0.3]) { f.box('doorWood', sx, 1.15, -0.305, 0.56, 1.8, 0.02); f.box('brass', sx * 0.15, 1.15, -0.32, 0.03, 0.12, 0.02); }
  f.solid(-0.62, -0.32, 0.62, 0.32, 2.3);
}
// a square grand piano, keyboard on local -z
function grandPiano(f) {
  f.box('darkWood', 0, 0.82, 0.15, 1.5, 0.32, 1.7); f.box('darkWood', 0, 1.0, 0.25, 1.48, 0.03, 1.5, 0, -0.55);
  f.box('enamel', 0, 0.84, -0.75, 1.3, 0.04, 0.16); f.box('railBlack', 0, 0.865, -0.72, 1.3, 0.012, 0.1);
  for (const [a, b] of [[-0.62, -0.6], [0.62, -0.6], [0, 0.85]]) f.cyl('darkWood', a, 0.33, b, 0.05, 0.04, 0.66, 8);
  f.box('darkWood', 0, 1.02, -0.6, 0.6, 0.3, 0.02, 0, 0.2);
  f.solid(-0.76, -0.82, 0.76, 1.0, 1.1);
}
function harp(f) {
  f.box('brass', 0, 0.06, 0, 0.36, 0.12, 0.4); f.box('brass', 0, 0.9, -0.15, 0.06, 1.7, 0.06); f.box('lightWood', 0, 0.9, 0.12, 0.08, 1.62, 0.1, 0, -0.2);
  f.box('brass', 0, 1.72, 0, 0.06, 0.08, 0.42, 0, 0.3);
  for (let i = 0; i < 12; i++) f.box('wax', 0, 0.95 - i * 0.02, -0.12 + i * 0.022, 0.004, 1.3 - i * 0.07, 0.004);
  f.solid(-0.2, -0.25, 0.2, 0.25, 1.8);
}
function dressingScreen(f) {
  for (let i = -1; i <= 1; i++) { const a = i * 0.5; f.box('darkWood', i * 0.48, 0.92, Math.abs(i) * 0.1, 0.5, 1.7, 0.03, a); f.box('fabricRose', i * 0.48, 0.95, Math.abs(i) * 0.1 - 0.02, 0.42, 1.4, 0.01, a); }
  f.solid(-0.75, -0.15, 0.75, 0.2, 1.8);
}
function grandfatherClock(f) {
  f.box('darkWood', 0, 1.0, 0, 0.5, 2.0, 0.32); f.box('darkWood', 0, 2.05, 0, 0.56, 0.12, 0.36);
  f.cyl('porcelain', 0, 1.65, -0.165, 0.17, 0.17, 0.01, 20, Math.PI / 2); f.box('glass', 0, 0.9, -0.165, 0.32, 0.9, 0.01); f.cyl('brass', 0, 0.75, -0.12, 0.08, 0.08, 0.01, 16, Math.PI / 2);
  f.solid(-0.25, -0.16, 0.25, 0.16, 2.1);
}
function hutch(f) {
  f.box('darkWood', 0, 0.45, 0, 1.4, 0.9, 0.48); f.box('darkWood', 0, 1.45, 0.06, 1.36, 1.1, 0.36); f.box('glass', 0, 1.45, -0.125, 1.2, 0.96, 0.01);
  for (let i = 0; i < 5; i++) f.cyl('porcelain', -0.5 + i * 0.25, 1.32, 0.12, 0.1, 0.1, 0.012, 16, Math.PI / 2 - 0.25);
  f.solid(-0.7, -0.25, 0.7, 0.25, 2);
}
function sideboard(f) {
  f.box('darkWood', 0, 0.45, 0, 1.8, 0.86, 0.5); f.box('darkWood', 0, 0.9, 0, 1.86, 0.04, 0.54);
  for (const a of [-0.6, 0, 0.6]) { f.box('doorWood', a, 0.45, -0.255, 0.52, 0.66, 0.01); f.box('brass', a, 0.6, -0.27, 0.08, 0.015, 0.01); }
  f.solid(-0.93, -0.27, 0.93, 0.27, 0.92);
}
// a spreading live oak: a short heavy trunk, long low limbs, dark canopy and moss hanging in curtains
function liveOak(gb, moss, x, z, s, seed) {
  const r = mulberry32(seed), y0 = terrainY(x, z);
  gb.cyl('bark', x, y0 + 1.4 * s, z, 0.45 * s, 0.7 * s, 2.8 * s, 12);
  const n = 6 + (r() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.6, L = (4.5 + r() * 3.5) * s, lift = 0.18 + r() * 0.3, ex = Math.cos(a), ez = Math.sin(a);
    const mx = x + ex * L / 2, mz = z + ez * L / 2, my = y0 + 2.6 * s + Math.sin(lift) * L / 2;
    gb.add(new THREE.CylinderGeometry(0.12 * s, 0.3 * s, L, 8), new THREE.Matrix4().compose(new V3(mx, my, mz), new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(ex * Math.cos(lift), Math.sin(lift), ez * Math.cos(lift)).normalize()), new V3(1, 1, 1)), 'bark', false);
    const tx = x + ex * L, tz = z + ez * L, ty = y0 + 2.6 * s + Math.sin(lift) * L;
    for (let k = 0; k < 3; k++) {
      const t = 0.45 + k * 0.28, cx = x + ex * L * t + (r() - 0.5) * 1.2, cz = z + ez * L * t + (r() - 0.5) * 1.2, cy = y0 + 2.6 * s + Math.sin(lift) * L * t + 1.2 * s;
      gb.sphere('oakLeaf', cx, cy, cz, (1.6 + r()) * s, 1.25, 0.55, 1.25, 10);
      for (let m = 0; m < 3; m++) { const mxx = cx + (r() - 0.5) * 2.4 * s, mzz = cz + (r() - 0.5) * 2.4 * s, h = (1.2 + r() * 1.6) * s, rot = r() * Math.PI; moss.quad(mxx, cy - 0.6 * s - h / 2, mzz, 0.7 * s, h, rot); moss.quad(mxx, cy - 0.6 * s - h / 2, mzz, 0.7 * s, h, rot + Math.PI / 2); }
    }
    gb.sphere('oakLeaf', tx, ty + 0.9 * s, tz, 1.5 * s, 1.3, 0.55, 1.3, 10);
  }
  gb.sphere('oakLeaf', x, y0 + 5.2 * s, z, 2.6 * s, 1.4, 0.6, 1.4, 12);
  addCollider(x - 0.6 * s, z - 0.6 * s, x + 0.6 * s, z + 0.6 * s, 6, false, y0 - 1);
}
// a pedimented dormer standing out of the roof in front of an upstairs window (side -1 = front slope, +1 = back)
function myDormer(gb, flat, cx, w, side, big) {
  const zWall = side < 0 ? 3 : 9, zFace = side < 0 ? 0.62 : MYR.D - 0.62, W = w + (big ? 0.7 : 0.45), top = MY1 + 2.45, low = MY1 + 0.5;
  const zi = Math.min(zWall, zFace), za = Math.max(zWall, zFace);
  for (const sx of [-1, 1]) gb.mm('sidingWhite', cx + sx * W / 2 - 0.06, low, zi, cx + sx * W / 2 + 0.06, top, za);
  // face: siding round the window, the glass, trim, and for the big ones Doric pilasters
  const zf = zFace, fz0 = zf - 0.06, fz1 = zf + 0.06;
  gb.mm('sidingWhite', cx - W / 2, low, fz0, cx + W / 2, MY1 + 0.9, fz1); gb.mm('sidingWhite', cx - W / 2, MY1 + 2.1, fz0, cx + W / 2, top, fz1);
  for (const sx of [-1, 1]) gb.mm('sidingWhite', sx < 0 ? cx - W / 2 : cx + w / 2, MY1 + 0.9, fz0, sx < 0 ? cx - w / 2 : cx + W / 2, MY1 + 2.1, fz1);
  gb.mm('glass', cx - w / 2, MY1 + 0.9, zf - 0.01, cx + w / 2, MY1 + 2.1, zf + 0.01);
  const o = side * 0.075;
  for (const [a0, a1, y0, y1] of [[cx - w / 2 - 0.06, cx - w / 2, MY1 + 0.85, MY1 + 2.15], [cx + w / 2, cx + w / 2 + 0.06, MY1 + 0.85, MY1 + 2.15], [cx - w / 2 - 0.06, cx + w / 2 + 0.06, MY1 + 2.1, MY1 + 2.16], [cx - w / 2 - 0.1, cx + w / 2 + 0.1, MY1 + 0.84, MY1 + 0.9], [cx - 0.02, cx + 0.02, MY1 + 0.9, MY1 + 2.1]])
    gb.mm('trimWhite', a0, y0, Math.min(zf + o, zf + o * 0.2), a1, y1, Math.max(zf + o, zf + o * 0.2));
  if (big) for (const sx of [-1, 1]) gb.mm('trimWhite', cx + sx * (W / 2 - 0.05) - 0.07, low, Math.min(zf + o * 1.3, zf), cx + sx * (W / 2 - 0.05) + 0.07, top, Math.max(zf + o * 1.3, zf));
  // little gable roof, ridge running back into the main roof, and the pediment
  const half = W / 2 + 0.12, rise = half * 0.9, ang = Math.atan2(rise, half), Lr = half / Math.cos(ang) + 0.05, len = za - zi + 0.3;
  for (const sx of [-1, 1]) gb.box('shinglesDark', cx + sx * half / 2, top + rise / 2 + 0.05, (zi + za) / 2 + side * 0.15, Lr, 0.08, len, 0, 0, -sx * ang);
  const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(0, rise * 0.96); sh.closePath();
  gb.add(new THREE.ShapeGeometry(sh), mat4(cx, top, zf + side * 0.065, side < 0 ? Math.PI : 0), 'trimWhite', false);
  gb.mm('trimWhite', cx - W / 2 - 0.08, top - 0.08, Math.min(zf + side * 0.1, zf), cx + W / 2 + 0.08, top + 0.02, Math.max(zf + side * 0.1, zf));
  // the tunnel's ceiling, seen from inside through the upstairs window
  gb.mm('sidingWhite', cx - W / 2, top - 0.02, zi, cx + W / 2, top + 0.02, za);
}
// a gable end: the triangle above the eave, optionally with a door-sized hole (z0, z1, y0, y1)
function myGable(gb, x, hole) {
  const sh = new THREE.Shape(); sh.moveTo(-0.05, MY1); sh.lineTo(MYR.D + 0.05, MY1); sh.lineTo(MYR.D / 2, MYR.R - 0.04); sh.closePath();
  if (hole) { const p = new THREE.Path(); p.moveTo(hole[0], hole[2]); p.lineTo(hole[1], hole[2]); p.lineTo(hole[1], hole[3]); p.lineTo(hole[0], hole[3]); p.closePath(); sh.holes.push(p); }
  gb.add(new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), mat4(x + 0.1, 0, 0, -Math.PI / 2), 'sidingWhite', true);
}

function buildMyrtles(gb, root) {
  const M = myrtMats(), F0 = (x, z, ry = 0) => fur(gb, x, z, ry, MY0), F1 = (x, z, ry = 0) => fur(gb, x, z, ry, MY1);
  const lace = flatBatch(), frieze = flatBatch(), moss = flatBatch();
  // ---------- ground, pond bed, raised foundation
  { const g = new THREE.PlaneGeometry(240, 240, 200, 200); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 14, z = p.getZ(i) + 4; p.setY(i, terrainY(x, z)); }
    g.computeVertexNormals(); gb.add(g, mat4(14, 0, 4), 'grassBase', true); }
  gb.mm('brick', -0.1, 0, -0.1, 28.1, MY0 - 0.06, 12.1);
  // ---------- roof: main slopes, the gallery's shallower roof, ridge, gable ends with the back-stair door
  { const a = Math.atan(MYR.S), L = (MYR.D / 2) / Math.cos(a) + 0.06, x0 = -0.45, x1 = 28.45, mid = (x0 + x1) / 2, len = x1 - x0;
    gb.box('shinglesDark', mid, (MY1 + MYR.R) / 2 + 0.07, MYR.D / 4, len, 0.1, L, 0, -a);
    const bl = (MYR.D / 2 + 0.45) / Math.cos(a); gb.box('shinglesDark', mid, (MYR.R + MY1 - 0.45 * MYR.S) / 2 + 0.07, MYR.D * 0.75 + 0.22, len, 0.1, bl, 0, a);
    gb.box('shinglesDark', mid, MYR.R + 0.12, MYR.D / 2, len, 0.06, 0.3);
    const ga = Math.atan2(0.35, 3.45), gl = 3.45 / Math.cos(ga) + 0.04;
    gb.box('shinglesDark', mid, MY1 - 0.175 + 0.05, -1.72, len, 0.1, gl, 0, -ga);
    gb.mm('trimWhite', x0, MY1 - 0.5, MYR.D + 0.4, x1, MY1 - 0.36, MYR.D + 0.46);
    myGable(gb, 0); myGable(gb, 28, [6.2, 7.1, MY1, MY1 + 2.1]);
    for (const x of [-0.12, 28.12]) gb.mm('trimWhite', x - 0.08, MY1 - 0.15, -0.05, x + 0.08, MY1 + 0.05, MYR.D + 0.05);
    // chimneys
    for (const [cx, cz] of [[19.6, 6.0], [27.4, 3.0], [5.0, 7.5], [2.6, 5.4]]) { const base = myRoofY(cz) - 0.3; gb.mm('brick', cx - 0.42, base, cz - 0.42, cx + 0.42, MYR.R + 1.0, cz + 0.42); gb.mm('brick', cx - 0.5, MYR.R + 0.9, cz - 0.5, cx + 0.5, MYR.R + 1.05, cz + 0.5); }
  }
  for (const [cx, w, big] of [[2.6, 1.2, 0], [7.5, 1.4, 1], [17.1, 1.2, 0], [21.4, 1.4, 1], [25.7, 1.2, 0]]) myDormer(gb, null, cx, w, -1, big);
  for (const [cx, w] of [[2.6, 1.0], [7.5, 1.2], [17.1, 1.2], [21.4, 1.2], [25.7, 1.2]]) myDormer(gb, null, cx, w, 1, true);
  // ---------- the front gallery: floor, brick piers, steps, slender columns, grape-cluster railing, frieze, entablature, haint-blue ceiling
  gb.mm('deckGray', -0.4, MY0 - 0.12, -3.3, 28.4, MY0, 0);
  gb.mm('trimWhite', -0.42, MY0 - 0.3, -3.34, 28.42, MY0 - 0.1, -3.28);
  for (let x = -0.3; x <= 28.4; x += 2.85) gb.mm('brick', x - 0.2, 0, -3.25, x + 0.2, MY0 - 0.12, -2.85);
  gb.mm('railBlack', -0.38, 0.05, -3.2, 28.38, MY0 - 0.32, -3.19);
  addCollider(-0.5, -3.4, 11.4, -3.2, MY0 + 1, false, 0); addCollider(13.6, -3.4, 28.5, -3.2, MY0 + 1, false, 0);
  addCollider(-0.55, -3.4, -0.35, 0, MY0 + 1, false, 0); addCollider(28.35, -3.4, 28.55, 0, MY0 + 1, false, 0);
  for (let i = 0; i < 5; i++) { const z0 = -3.3 - (i + 1) * 0.32, y = MY0 - (i + 1) * 0.2; gb.mm('brick', 11.4, 0, z0, 13.6, y + 0.02, z0 + 0.34); }
  for (const sx of [11.3, 13.7]) gb.mm('brick', sx - 0.12, 0, -4.95, sx + 0.12, MY0 + 0.1, -3.3);
  gb.mm('hauntBlue', -0.4, MY1 - 0.42, -3.3, 28.4, MY1 - 0.4, 0);
  gb.mm('trimWhite', -0.45, MY1 - 0.95, -3.45, 28.45, MY1 - 0.42, -3.25);
  gb.mm('trimWhite', -0.5, MY1 - 0.42, -3.52, 28.5, MY1 - 0.32, -3.22);
  const posts = []; for (let i = 0; i <= 10; i++) posts.push(-0.25 + i * 2.85);
  for (const px of posts) { gb.mm('trimWhite', px - 0.065, MY0, -3.3, px + 0.065, MY1 - 0.95, -3.17); gb.mm('trimWhite', px - 0.1, MY0, -3.33, px + 0.1, MY0 + 0.12, -3.14); gb.mm('trimWhite', px - 0.1, MY1 - 1.05, -3.33, px + 0.1, MY1 - 0.95, -3.14); addCollider(px - 0.09, -3.33, px + 0.09, -3.14, 3, false, MY0); }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] + 0.065, b = posts[i + 1] - 0.065, m = (a + b) / 2, w = b - a;
    frieze.quad(m, MY1 - 1.12, -3.24, w, 0.34, 0);
    if (a > 11 && b < 14) continue;   // the gap for the steps
    lace.quad(m, MY0 + 0.5, -3.24, w, 0.9, 0);
    gb.mm('trimWhite', a, MY0 + 0.93, -3.29, b, MY0 + 1.0, -3.17);
  }
  addCollider(-0.4, -3.32, 11.0, -3.14, 1.0, false, MY0); addCollider(14.0, -3.32, 28.4, -3.14, 1.0, false, MY0);
  for (const sx of [-0.33, 28.33]) { lace.quad(sx, MY0 + 0.5, -1.65, 3.2, 0.9, Math.PI / 2); gb.mm('trimWhite', sx - 0.06, MY0 + 0.93, -3.3, sx + 0.06, MY0 + 1.0, 0); }
  // rocking chairs and ferns along the gallery
  for (const [rx, rot] of [[3.5, 0.3], [5.2, -0.2], [19.8, 0.2], [21.6, -0.3]]) { const f = F0(rx, -1.6, Math.PI + rot); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  for (const px of [10.6, 14.4]) urn(F0(px, -2.9));
  // the front door's painted-glass sidelights and transom, and a lantern beside it
  { const st = flatBatch(); for (const zz of [-0.115, 0.115]) { for (const sx of [11.55, 13.45]) st.quad(sx, MY0 + 1.2, zz, 0.38, 1.78, 0); st.quad(12.5, MY0 + 2.3, zz, 1.5, 0.36, 0, 0, 1, 0.4, 0.6); } root.add(st.mesh(M.stained)); }
  gb.box('brass', 14.0, MY0 + 2.2, -0.14, 0.16, 0.26, 0.12);
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 0 })); b.position.set(14.0, MY0 + 2.15, -0.24); root.add(b); WORLD_EXTRA.porchBulb = b; }
  // ---------- back loggia: brick floor, posts, shed roof, steps; the outside stair up to the back bedrooms
  gb.mm('brick', 10, 0, 12.1, 29.6, MY0, 14.4);
  { const sl = Math.atan2(0.5, 2.4); gb.box('shinglesDark', 19.8, MY1 - 0.45, 13.3, 19.8, 0.1, 2.6, 0, sl); gb.mm('trimWhite', 10, MY1 - 0.95, 14.32, 29.6, MY1 - 0.6, 14.44); gb.mm('hauntBlue', 10, MY1 - 0.65, 12.1, 29.6, MY1 - 0.62, 14.35); }
  for (const px of [10.1, 13.8, 17.6, 21.4, 25.2, 29.5]) { gb.mm('trimWhite', px - 0.09, MY0, 14.24, px + 0.09, MY1 - 0.95, 14.42); addCollider(px - 0.1, 14.22, px + 0.1, 14.44, 3, false, MY0); }
  for (let i = 0; i < 5; i++) { const z0 = 14.4 + i * 0.3, y = MY0 - (i + 1) * 0.2; gb.mm('brick', 11.6, 0, z0, 13.4, y + 0.02, z0 + 0.32); }
  addCollider(9.9, 12, 10.05, 14.45, MY0 + 1, false, 0); addCollider(10, 14.42, 11.6, 14.6, MY0 + 1, false, 0); addCollider(13.4, 14.42, 29.7, 14.6, MY0 + 1, false, 0); addCollider(29.55, 12, 29.75, 14.6, MY0 + 1, false, 0);
  { const n = 17, run = 4.4 / n, rise = (MY1 - MY0) / n;
    for (let i = 0; i < n; i++) { const z = 12.2 - (i + 1) * run, y = MY0 + (i + 1) * rise; gb.mm('deckGray', 28.2, y - 0.05, z, 29.4, y, z + run + 0.02); }
    gb.mm('deckGray', 27.7, MY1 - 0.12, 6.0, 29.5, MY1, 7.8);
    for (const sx of [28.2, 29.4]) { gb.box('trimWhite', sx, (MY0 + MY1) / 2 - 0.2, 10.0, 0.06, 0.3, 4.9, 0, Math.atan2(MY1 - MY0, 4.4)); gb.box('trimWhite', sx, (MY0 + MY1) / 2 + 0.8, 10.0, 0.06, 0.06, 4.9, 0, Math.atan2(MY1 - MY0, 4.4)); }
    addCollider(29.4, 7.8, 29.55, 12.2, MY1 + 1.2, false, 0); addCollider(28.05, 9.1, 28.2, 12.2, MY1 + 1.2, false, MY0);
    railRun(gb, 29.45, 6.0, 29.45, 7.8, MY1, 0.95, true); railRun(gb, 27.75, 5.95, 29.45, 5.95, MY1, 0.95, false);
    for (const [px, pz] of [[29.45, 6.0], [29.45, 7.8], [28.2, 7.8]]) gb.mm('trimWhite', px - 0.08, 0, pz - 0.08, px + 0.08, MY1 - 0.12, pz + 0.08);
    { const sl = Math.atan2(0.3, 1.9); gb.box('shinglesDark', 28.6, MY1 + 2.6, 6.9, 2.0, 0.08, 2.1, 0, 0, -sl); }
  }
  // ---------- staircase in the entry hall: seventeen steps, faux-bois stringer, a turned newel and a slim balustrade
  { const n = 17, run = 5.2 / n, rise = (MY1 - MY0) / n;
    for (let i = 0; i < n; i++) { const z = 9.2 - (i + 1) * run, y = MY0 + (i + 1) * rise; gb.mm('darkWood', 10.15, y - 0.04, z, 11.35, y, z + run + 0.03); gb.mm('trimWhite', 10.15, y - rise, z + run - 0.02, 11.35, y - 0.04, z + run); }
    const ang = Math.atan2(MY1 - MY0, 5.2);
    gb.box('doorWood', 11.38, (MY0 + MY1) / 2 - 0.2, 6.6, 0.07, 0.42, 5.9, 0, ang);
    gb.box('darkWood', 11.36, (MY0 + MY1) / 2 + 0.75, 6.6, 0.07, 0.07, 5.9, 0, ang);
    for (let i = 1; i < 34; i++) { const z = 9.2 - i * 5.2 / 34, y = MY0 + (9.2 - z) / 5.2 * (MY1 - MY0); gb.mm('trimWhite', 11.35, y, z - 0.012, 11.38, y + 0.85, z + 0.012); }
    gb.cyl('darkWood', 11.32, MY0 + 0.6, 9.3, 0.07, 0.09, 1.2, 10); gb.sphere('darkWood', 11.32, MY0 + 1.25, 9.3, 0.09);
    addCollider(11.33, 4.0, 11.42, 9.2, MY1 + 0.6, false, MY0 + 0.5);
    railRun(gb, 11.42, 4.0, 11.42, 8.95, MY1);
  }
  // ---------- ENTRY HALL
  const mirror = myMirror(gb, root, 14.92, MY0 + 1.65, 10.4, -Math.PI / 2, 1.0, 1.9);
  { const sm = flatBatch(); for (const [dz, dy, s] of [[-0.2, 0.3, 0.16], [0.18, 0.05, 0.13], [0.05, -0.35, 0.15], [-0.25, -0.2, 0.1]]) sm.quad(14.885, MY0 + 1.65 + dy, 10.4 + dz, s, s * 1.2, -Math.PI / 2);
    const [c, x] = mkCanvas(64, 76); x.fillStyle = 'rgba(200,200,190,0.55)'; x.beginPath(); x.ellipse(32, 46, 14, 18, 0, 0, 7); x.fill(); for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(14 + k * 9, 20 - (k === 2 ? 6 : 0), 4, 13, (k - 2) * 0.2, 0, 7); x.fill(); }
    root.add(sm.mesh(new THREE.MeshStandardMaterial({ map: canvasTex(c, true, false), transparent: true, depthWrite: false, roughness: 0.3 }))); }
  WORLD_EXTRA.myrtlesMirror = mirror;
  placeModel(root, { url: 'prop-sidetable.json', x: 14.78, z: 10.4, y: MY0, ry: -Math.PI / 2, len: 1.1, axis: 'x', cols: 'box' });
  { const f = F0(14.84, 6.0, -Math.PI / 2); grandfatherClock(f); }
  // a pair of armchairs facing into the hall across a little oval table, a bentwood chair in each back corner
  for (const z of [1.0, 2.45]) { const f = F0(14.6, z, Math.PI / 2); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(14.62, 1.72); ovalTable(f, 0.55); f.solid(-0.2, -0.2, 0.2, 0.2, 0.55); }
  { const f = F0(14.65, 11.55, -Math.PI / 2); bentChair(f); f.solid(-0.22, -0.22, 0.22, 0.22, 0.5); }
  { const f = F0(10.32, 11.6, Math.PI / 2); bentChair(f); f.solid(-0.22, -0.22, 0.22, 0.22, 0.5); }
  // the painted antique dresser on the left wall between the music-room door and the stair, a portrait above it
  { const f = F0(10.07, 3.05, -Math.PI / 2); furModel(f, 'prop-antdresser.json', 'Sketchfab_model', { height: 0.85, back: true }); f.solid(-0.82, -0.5, 0.82, 0, 0.85); }
  prop('candle', 10.3, MY0 + 0.85, 2.45); prop('jbox', 10.32, MY0 + 0.85, 2.85, 1.57); prop('book', 10.3, MY0 + 0.85, 3.3, 0.3); prop('vase', 10.3, MY0 + 0.85, 3.65);
  gb.mm('runner', 11.8, MY0 + 0.002, 0.4, 13.8, MY0 + 0.012, 11.6);
  urn(F0(10.42, 0.42)); urn(F0(11.05, 11.62));
  for (const [x, z, r] of [[10.07, 0.55, -Math.PI / 2], [14.93, 2.4, Math.PI / 2], [14.93, 9.2, Math.PI / 2]]) sconce(F0(x, z, r), 1.7);
  picFrame(root, 'x', 10.08, 3.05, MY0 + 1.65, 1, 'p40', 0, 0.6); picFrame(root, 'x', 14.92, 1.72, MY0 + 1.75, -1, 'p12', 0, 0.55);
  prop('candle', 14.75, MY0 + 0.8, 10.2); prop('vase', 14.75, MY0 + 0.8, 10.65);
  // ---------- FRENCH ROOM (Mrs. Stirling's day room)
  { const f = F0(4.0, 5.89, 0); myMantel(f); } myMirror(gb, root, 4.0, MY0 + 2.05, 5.92, Math.PI, 0.9, 0.75);
  { const f = F0(0.5, 4.35, -Math.PI / 2); vicSofa(f, 1.7); f.solid(-0.85, -0.45, 0.85, 0.45, 1); }
  { const f = F0(2.75, 4.35, Math.PI / 2); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(1.6, 4.35); ovalTable(f); f.solid(-0.38, -0.38, 0.38, 0.38, 0.45); }
  { const f = F0(1.0, 1.1, 0.5); dressingScreen(f); }
  { const f = F0(4.55, 0.12, Math.PI); furModel(f, PACK.tl, 'TinyLiving_TinyDeskForTinyLiving_37', { height: 1.0, back: true }); f.solid(-0.45, -0.85, 0.45, 0, 0.8); const c = F0(4.55, 1.2, Math.PI); bentChair(c); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); }
  rug(gb, 1.9, 4.25, 2.8, 2.0, 0, MY0);
  picFrame(root, 'x', 0.115, 1.2, MY0 + 1.7, 1, 'p22', 0, 0.6);
  prop('book', 1.5, MY0 + 0.45, 4.3, 0.4); prop('candle', 1.75, MY0 + 0.45, 4.5); prop('jbox', 4.3, MY0 + 0.75, 0.4);
  // ---------- MUSIC ROOM
  { const f = F0(7.4, 3.4, 0.25); grandPianoModel(f); }
  { const f = F0(5.11, 4.6, -Math.PI / 2); myMantel(f); } myMirror(gb, root, 5.08, MY0 + 2.05, 4.6, Math.PI / 2, 0.8, 0.7);
  rug(gb, 7.5, 3.0, 3.4, 2.6, 0, MY0);
  picFrame(root, 'z', 7.5, 5.92, MY0 + 1.9, -1, 'p30', 0, 0.55);
  // with the floor clear but for the piano, a painting or a pair of sconces on every wall to steer by in the dark
  for (const [x, z, r] of [[6.4, 5.93, 0], [8.6, 5.93, 0], [9.93, 3.6, Math.PI / 2], [5.07, 1.2, -Math.PI / 2]]) sconce(F0(x, z, r), 1.7);
  picFrame(root, 'x', 9.92, 4.6, MY0 + 1.75, -1, 'p17', 0, 0.6); picFrame(root, 'x', 9.92, 0.75, MY0 + 1.75, -1, 'p25', 0, 0.45);
  picFrame(root, 'z', 7.6, 0.115, MY0 + 1.8, 1, 'p47', 0, 0.5); picFrame(root, 'x', 5.08, 1.85, MY0 + 1.75, 1, 'p16', 0, 0.45);
  prop('book', 7.0, MY0 + 1.02, 3.0, 0.2);
  // ---------- LADIES' PARLOR
  { const f = F0(19.6, 5.89, 0); myMantel(f); } myMirror(gb, root, 19.6, MY0 + 2.1, 5.92, Math.PI, 1.1, 0.95);
  { const f = F0(19.0, 2.4, Math.PI); vicSofa(f, 2.0); f.solid(-1.0, -0.45, 1.0, 0.45, 1); }
  { const f = F0(17.4, 4.3, -Math.PI / 2); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(20.7, 4.0, Math.PI / 2 + 0.2); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(19.0, 3.65); ovalTable(f); f.solid(-0.38, -0.38, 0.38, 0.38, 0.45); }
  { const f = F0(15.55, 0.55); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); vicLamp(f, 0.0, 0.57, 0.0); }
  rug(gb, 18.6, 3.2, 3.6, 2.8, 0, MY0);
  picFrame(root, 'x', 15.08, 1.8, MY0 + 1.8, 1, 'p5', 0, 0.75); picFrame(root, 'x', 21.42, 5.3, MY0 + 1.8, -1, 'p44', 0, 0.42);
  prop('cup', 18.85, MY0 + 0.45, 3.6); prop('book', 19.15, MY0 + 0.45, 3.75, 0.9); prop('candle', 19.1, MY0 + 1.36, 5.78); prop('candle', 20.1, MY0 + 1.36, 5.78); prop('clock', 19.6, MY0 + 1.36, 5.75, Math.PI);
  // ---------- GENTLEMEN'S PARLOR
  { const f = F0(27.89, 3.0, Math.PI / 2); myMantel(f); } myMirror(gb, root, 27.92, MY0 + 2.1, 3.0, -Math.PI / 2, 1.0, 0.9);
  { const f = F0(24.6, 3.0, -Math.PI / 2); vicSofa(f, 2.0); f.solid(-1.0, -0.45, 1.0, 0.45, 1); }
  { const f = F0(26.4, 1.2, Math.PI); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(26.4, 4.75, 0); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F0(25.9, 3.0); ovalTable(f); f.solid(-0.38, -0.38, 0.38, 0.38, 0.45); }
  { const f = F0(22.6, 5.62, 0); bookshelf(f); f.solid(-0.5, -0.2, 0.5, 0.2, 2); }
  rug(gb, 25.6, 3.0, 3.2, 3.0, 0, MY0);
  picFrame(root, 'z', 24.75, 0.115, MY0 + 1.8, 1, 'p18', 0, 0.75);
  prop('bottle', 25.75, MY0 + 0.45, 2.85); prop('cup', 26.05, MY0 + 0.45, 3.15); prop('candle', 27.75, MY0 + 1.36, 2.4);
  // ---------- DINING ROOM: table and chairs, the hutch, a sideboard and the punkah fan over the table
  placeModel(root, { url: 'prop-dining.json', x: 18.25, z: 9.0, y: MY0, scale: 1.15, cols: 'parts' });
  { const pz = 8.15; gb.mm('doorWood', 17.25, MY0 + 2.05, pz - 0.02, 19.25, MY0 + 2.45, pz + 0.02); gb.mm('brass', 17.25, MY0 + 2.45, pz - 0.03, 19.25, MY0 + 2.48, pz + 0.03); for (const px of [17.6, 18.9]) gb.cyl('brass', px, MY0 + 2.58, pz, 0.006, 0.006, 0.24, 4); }   // the punkah, clear of the chandelier
  { const f = F0(18.25, 11.9, 0); chinaCabinet(f); f.solid(-0.75, -0.45, 0.75, 0, 2.1); }
  { const f = F0(15.08, 10.6, -Math.PI / 2); longCabinet(f, 1.9); f.solid(-0.95, -0.3, 0.95, 0, 1.6); }
  picFrame(root, 'x', 21.42, 7.4, MY0 + 1.8, -1, 'p50', 0, 0.6); picFrame(root, 'x', 15.08, 10.6, MY0 + 2.2, 1, 'p27', 0, 0.5);
  for (const [px, pz] of [[17.7, 8.75], [18.8, 9.25], [18.25, 8.7], [17.6, 9.3]]) prop('plate', px, MY0 + 0.9, pz);
  prop('candle', 18.25, MY0 + 0.9, 9.0); prop('cup', 18.55, MY0 + 0.9, 8.75); prop('vase', 15.32, MY0 + 0.92, 10.2); prop('candle', 15.32, MY0 + 0.92, 11.1);
  // ---------- GAME ROOM: a card table with four chairs, a fireplace, books
  { const f = F0(24.75, 9.0, Math.PI / 2); ovalDining(f); f.solid(-0.42, -0.8, 0.42, 0.8, 0.8);
    for (const [a, b, r] of [[0, -1.15, 0], [0, 1.15, Math.PI], [-0.75, 0, Math.PI / 2], [0.75, 0, -Math.PI / 2]]) { const [cx, cz] = f.pt(a, b); const c = F0(cx, cz, r); bentChair(c); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); } }
  { const f = F0(27.89, 10.2, Math.PI / 2); myMantel(f); }
  { const f = F0(22.0, 11.62, 0); bookshelf(f); f.solid(-0.5, -0.2, 0.5, 0.2, 2); }
  { const f = F0(26.9, 6.7, Math.PI * 0.8); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  picFrame(root, 'z', 22.9, 6.08, MY0 + 1.8, 1, 'p57', 0, 0.55);
  prop('book', 24.5, MY0 + 0.77, 8.9, 0.3); prop('cup', 25.1, MY0 + 0.77, 9.2); prop('candle', 24.8, MY0 + 0.77, 9.05);
  // ---------- DOWNSTAIRS BEDROOM
  { const f = F0(3.25, 10.9, 0); fourPoster(gb, root, f); }
  for (const nx of [1.95, 4.55]) { const f = F0(nx, 11.6); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  { const f = F0(1.95, 11.6); vicLamp(f, 0, 0.57, 0); }
  { const f = F0(6.1, 10.7, Math.PI / 2); dresser(f); f.solid(-0.38, -0.3, 0.38, 0.3, 1.1); }
  { const f = F0(4.6, 6.11, Math.PI); myMantel(f); }
  { const f = F0(0.36, 9.1, -Math.PI / 2); armoire(f); }
  rug(gb, 3.25, 9.0, 3.0, 2.2, 0, MY0);
  picFrame(root, 'z', 3.25, 11.92, MY0 + 2.3, -1, 'p9', 0, 0.45);
  prop('candle', 4.55, MY0 + 0.58, 11.55); prop('book', 6.1, MY0 + 1.1, 10.5, 0.5);
  // ---------- DOWNSTAIRS BATH
  tubAt(gb, 8.25, 11.55, Math.PI / 2, MY0); toiletAt(gb, 9.62, 6.6, -Math.PI / 2, MY0); vanityAt(gb, root, 7.7, 6.35, 0, MY0);
  prop('soap', 7.55, MY0 + VANITY_SHELF, 6.4);
  // ---------- UPSTAIRS LANDING (the main stair's top)
  { const f = F1(14.62, 7.2, -Math.PI / 2); vicSofa(f, 1.6); f.solid(-0.8, -0.4, 0.8, 0.4, 1); }
  { const f = F1(14.6, 3.5); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); vicLamp(f, 0, 0.57, 0); }
  gb.mm('runner', 11.7, MY1 + 0.003, 3.3, 13.9, MY1 + 0.012, 8.7);
  picFrame(root, 'z', 12.9, 3.12, MY1 + 1.6, 1, 'p61', 0, 0.55); picFrame(root, 'x', 14.92, 5.6, MY1 + 1.7, -1, 'p53', 0, 0.5);
  // ---------- WOODRUFF SUITE: sitting room, bedroom with its four-poster, bath
  { const f = F1(7.5, 8.62, 0); vicSofa(f, 1.9); f.solid(-0.95, -0.45, 0.95, 0.45, 1); }
  { const f = F1(7.5, 7.0); ovalTable(f); f.solid(-0.38, -0.38, 0.38, 0.38, 0.45); }
  { const f = F1(6.2, 5.6, -Math.PI * 0.8); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F1(8.9, 5.6, Math.PI * 0.8); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F1(5.11, 7.6, -Math.PI / 2); myMantel(f); }
  { const f = F1(9.62, 8.2, Math.PI / 2); bookshelf(f); f.solid(-0.5, -0.2, 0.5, 0.2, 2); }
  rug(gb, 7.5, 6.6, 3.2, 2.4, 0, MY1);
  prop('book', 7.3, MY1 + 0.45, 6.9, 1.1); prop('cup', 7.7, MY1 + 0.45, 7.1);
  { const f = F1(1.45, 4.3, -Math.PI / 2); fourPoster(gb, root, f, 2.0, 1.55); }
  { const f = F1(1.0, 3.35); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); vicLamp(f, 0, 0.57, 0); }
  { const f = F1(4.6, 5.9, Math.PI / 2); dresser(f); f.solid(-0.38, -0.3, 0.38, 0.3, 1.1); }
  prop('teddy', 1.9, MY1 + 0.62, 4.1, 0.4); prop('candle', 1.0, MY1 + 0.58, 3.4);
  tubAt(gb, 2.6, 8.55, Math.PI / 2, MY1); toiletAt(gb, 4.62, 7.3, -Math.PI / 2, MY1); vanityAt(gb, root, 1.1, 6.95, 0, MY1);
  // ---------- BACK BEDROOMS AND THEIR SITTING ROOM
  { const f = F1(17.0, 4.93, 0); fourPoster(gb, root, f, 2.0, 1.55); }
  { const f = F1(15.9, 5.6, 0); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  { const f = F1(18.4, 5.62, 0); dresser(f); f.solid(-0.38, -0.3, 0.38, 0.3, 1.1); }
  prop('candle', 15.9, MY1 + 0.58, 5.6); prop('book', 18.4, MY1 + 1.1, 5.55, 0.3);
  { const f = F1(16.08, 6.85, -Math.PI / 2); fourPoster(gb, root, f, 2.0, 1.5); }
  { const f = F1(18.85, 8.62); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  prop('clock', 18.85, MY1 + 0.58, 8.62, 1.6);
  { const f = F1(21.4, 8.62, 0); vicSofa(f, 2.0); f.solid(-1.0, -0.45, 1.0, 0.45, 1); }
  { const f = F1(21.4, 7.1); ovalTable(f); f.solid(-0.38, -0.38, 0.38, 0.38, 0.45); }
  { const f = F1(20.0, 5.3, -Math.PI * 0.75); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F1(22.8, 5.3, Math.PI * 0.75); vicArmchair(f); f.solid(-0.4, -0.4, 0.4, 0.4, 1); }
  { const f = F1(21.4, 3.12, Math.PI); furModel(f, PACK.tl, 'TinyLiving_TinyConsole_44', { height: 0.76, back: true, turn: 0 }); }
  rug(gb, 21.4, 6.4, 3.0, 2.6, 0, MY1);
  prop('cup', 21.2, MY1 + 0.45, 7.0); prop('book', 21.65, MY1 + 0.45, 7.25, 0.6);
  { const f = F1(26.75, 4.5, Math.PI / 2); fourPoster(gb, root, f, 2.0, 1.5); }
  { const f = F1(27.35, 3.35); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); vicLamp(f, 0, 0.57, 0); }
  { const f = F1(24.2, 5.62, 0); dresser(f); f.solid(-0.38, -0.3, 0.38, 0.3, 1.1); }
  prop('jbox', 24.2, MY1 + 1.1, 5.55); prop('candle', 27.35, MY1 + 0.58, 3.5);
  { const f = F1(25.6, 8.0, 0); singleBed(f); f.solid(-0.45, -1.0, 0.45, 1.0, 0.6); }
  { const f = F1(24.3, 8.5); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  prop('book', 24.3, MY1 + 0.58, 8.5, 1.2);
  // ---------- grounds: brick courtyard, the general's store, gas lamp, live oaks, the pond and its gazebo, a pine treeline
  gb.mm('brick', 8, 0, 14.4, 30, 0.03, 22.4);
  gb.mm('brick', 11.4, 0, -40, 13.6, 0.03, -4.9);
  { // the General's Store: Bradford's first home on the land
    const x0 = -15, x1 = -9, z0 = -10, z1 = -4;
    gb.mm('brick', x0, 0, z0, x1, 0.45, z1); gb.mm('sidingWhite', x0 + 0.05, 0.45, z0 + 0.05, x1 - 0.05, 3.1, z1 - 0.05);
    gableRoof(gb, { axis: 'x', c: (z0 + z1) / 2, w: z1 - z0, a0: x0 - 0.3, a1: x1 + 0.3, eave: 3.1, rise: 1.8, over: 0.35, gables: [x0, x1], wallMat: 'sidingWhite' });
    gb.mm('deckGray', x0, 0.35, z0 - 1.6, x1, 0.45, z0);
    for (const px of [x0 + 0.1, x0 + 2, x0 + 4, x1 - 0.1]) gb.mm('trimWhite', px - 0.06, 0.45, z0 - 1.55, px + 0.06, 2.7, z0 - 1.43);
    gb.box('shinglesDark', (x0 + x1) / 2, 2.82, z0 - 0.8, x1 - x0 + 0.2, 0.08, 1.8, 0, Math.atan2(0.25, 1.6));
    gb.mm('doorWood', -12.5, 0.45, z0 - 0.07, -11.5, 2.5, z0 - 0.04);
    for (const wx of [-14.3, -10.0]) { gb.mm('glass', wx, 1.1, z0 - 0.06, wx + 0.9, 2.3, z0 - 0.04); for (const sx of [-0.4, 1.0]) gb.mm('shutterGreen', wx + sx, 1.05, z0 - 0.08, wx + sx + 0.38, 2.35, z0 - 0.05); }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), M.sign); sg.position.set(-12, 3.05, z0 - 0.08); sg.rotation.y = Math.PI; root.add(sg);
    addCollider(x0 - 0.05, z0 - 1.65, x1 + 0.05, z1 + 0.05, 4);
  }
  // gas lamp by the front walk
  gb.cyl('railBlack', 17.2, 1.6, -9.0, 0.06, 0.09, 3.2, 8); gb.box('railBlack', 17.2, 3.35, -9.0, 0.36, 0.06, 0.36); gb.box('glass', 17.2, 3.55, -9.0, 0.3, 0.38, 0.3); gb.box('railBlack', 17.2, 3.8, -9.0, 0.4, 0.08, 0.4);
  { const lh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 3 })); lh.position.set(17.2, 3.55, -9.0); root.add(lh); WORLD_EXTRA.streetBulb = lh; }
  addCollider(17.05, -9.15, 17.35, -8.85, 3.6);
  // live oaks: an avenue down the walk, more about the grounds
  [[5.5, -11, 1.25], [20.5, -11.5, 1.2], [6.5, -27, 1.3], [19.5, -26, 1.25], [-8, 6, 1.35], [36, 6, 1.3], [33, -14, 1.2], [-6, 22, 1.25], [24, 30, 1.35], [52, 14, 1.2], [-18, -22, 1.3], [48, 36, 1.1]]
    .forEach(([x, z, s], i) => liveOak(gb, moss, x, z, s, 101 + i * 7));
  // the pond: water, a ring that keeps you out, a footbridge to the island and the white gazebo
  { const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), MATS.swampWater || MATS.glass); w.rotation.x = -Math.PI / 2; w.position.set(POND.x, -0.28, POND.z); root.add(w);
    gb.cyl('dirt', POND.x, 0.06, POND.z, POND.isl, POND.isl + 0.3, 0.3, 24);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.18) continue; const x = POND.x + Math.cos(a) * (POND.r + 0.1), z = POND.z + Math.sin(a) * (POND.r + 0.1); addCollider(x - 0.95, z - 0.95, x + 0.95, z + 0.95, 1.2, false, -1); }
    const bx0 = POND.x - 8.3, bx1 = POND.x - POND.isl + 0.4;
    gb.mm('deckGray', bx0, 0.16, POND.z - 0.7, bx1, 0.28, POND.z + 0.7);
    for (const sz of [-0.68, 0.68]) { railRun(gb, bx0 + 0.6, POND.z + sz, bx1, POND.z + sz, 0.28, 0.9, true); }
    for (let x = bx0; x < bx1; x += 1.4) for (const sz of [-0.6, 0.6]) gb.mm('darkWood', x - 0.07, -1.1, POND.z + sz - 0.07, x + 0.07, 0.16, POND.z + sz + 0.07);
    const gx = POND.x, gz = POND.z;
    gb.cyl('trimWhite', gx, 0.36, gz, 1.95, 1.95, 0.12, 8);
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2, px = gx + Math.cos(a) * 1.8, pz = gz + Math.sin(a) * 1.8; gb.cyl('trimWhite', px, 1.75, pz, 0.06, 0.07, 2.7, 8); if (Math.abs(Math.cos(a) + 1) > 0.25) { addCollider(px - 0.12, pz - 0.12, px + 0.12, pz + 0.12, 3, false, 0.4); const b = (i + 1.5) / 8 * Math.PI * 2, qx = gx + Math.cos(b) * 1.8, qz = gz + Math.sin(b) * 1.8; gb.box('trimWhite', (px + qx) / 2, 1.2, (pz + qz) / 2, Math.hypot(qx - px, qz - pz), 0.06, 0.05, -Math.atan2(qz - pz, qx - px)); } }
    gb.add(new THREE.ConeGeometry(2.35, 1.5, 8, 1), mat4(gx, 3.85, gz, Math.PI / 8), 'shinglesDark', false); gb.cyl('trimWhite', gx, 3.1, gz, 2.3, 2.3, 0.16, 8);
    gb.sphere('trimWhite', gx, 4.65, gz, 0.12);
  }
  for (const [x, z, s] of [[-22, -30, 1.3], [44, -30, 1.2], [-26, 10, 1.3], [58, 0, 1.2], [-24, 36, 1.2], [56, 42, 1.3], [12, 44, 1.2], [30, 46, 1.3]]) fir(x, z, s, true);
  firBelt([-30, -36, 62, 46], 70, [[8, -60, 18, -30]], 4, 16);
  // invisible property bounds
  addCollider(-30.5, -36.5, -30, 46.5, 12, false, -6); addCollider(62, -36.5, 62.5, 46.5, 12, false, -6); addCollider(-30.5, -36.5, 62.5, -36, 12, false, -6); addCollider(-30.5, 46, 62.5, 46.5, 12, false, -6);
  root.add(lace.mesh(M.lace)); root.add(frieze.mesh(M.frieze)); root.add(moss.mesh(M.moss));
}
