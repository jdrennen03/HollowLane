// ---------------------------------------------------------------- map: 13 Hollow Lane (single storey ranch)
MAPS.lane = {
  id: 'lane', title: '13 Hollow Lane', eyebrow: 'The house at', lede: 'The Hartley family left in 1987 and never came back for their things. Something stayed. Set up at the tent, gather evidence, name the ghost, and get out before it hunts you.',
  levels: [FY], extBase: [0], extTop: [CEIL], siding: 'siding', skirt: 'brick', shutter: 'darkHouse', crooked: true,
  tent: { x: 3.5, z: -8.6 }, lure: 0, moonTarget: [9, 0, 4], grassBox: [-5.8, -14.4, 26, 19.8],
  road: { park: [2, -21.2, Math.PI / 2], exit: [[-40, -26.3, -30, -15.7], [50, -26.3, 60, -15.7]] },   // the wagon waits on the street; ride off down it either way
  yardName: p => p.z > 14 ? 'Back yard' : 'Front yard',
  street: [19.6, 5.0, -16.0], porch: [10.35, FY + 1.82, -0.35],
  slabs: [{ x0: -0.1, z0: -0.1, x1: 20.1, z1: 14.1, y: FY }, { x0: 7, z0: -2.2, x1: 12, z1: 0, y: FY }, { x0: 8.5, z0: -2.55, x1: 10.5, z1: -2.2, y: 0.27 }, { x0: 8.5, z0: -2.9, x1: 10.5, z1: -2.55, y: 0.13 }],
  stairs: [],
  navBox: [-0.2, -0.2, 20.5, 14.5],
  rooms: [
    { id: 'living', name: 'Living Room', r: [0, 0, 8, 6], floor: 'woodF', wall: 'wpGreen', sw: [7.94, 4.0, -1, 0], lamp: [4, 3] },
    { id: 'foyer', name: 'Foyer', r: [8, 0, 11, 6], floor: 'marbleF', wall: 'wpBeige', sw: [8.06, 0.8, 1, 0], lamp: [9.5, 3.2], noGhost: true },
    { id: 'dining', name: 'Dining Room', r: [11, 0, 20, 6], floor: 'woodF', wall: 'wpRed', sw: [11.06, 3.5, 1, 0], lamp: [15.5, 3], chandelier: true },
    { id: 'hall', name: 'Hallway', r: [0, 6, 14, 8], floor: 'woodF', wall: 'wpBeige', sw: [11.5, 6.06, 0, 1], lamp: [7, 7], noGhost: true },
    { id: 'master', name: 'Master Bedroom', r: [0, 8, 6, 14], floor: 'carpetRose', wall: 'wpRose', sw: [5.5, 8.06, 0, 1], lamp: [3.2, 10.8] },
    { id: 'bath', name: 'Bathroom', r: [6, 8, 9, 14], floor: 'bathF', wall: 'bathTileW', sw: [8.3, 8.06, 0, 1], lamp: [7.5, 11] },
    { id: 'kid', name: "Child's Bedroom", r: [9, 8, 14, 14], floor: 'carpetBlue', wall: 'wpBlue', sw: [11.9, 8.06, 0, 1], lamp: [11.2, 10.8] },
    { id: 'kitchen', name: 'Kitchen', r: [14, 6, 20, 11], floor: 'checkerF', wall: 'plasterY', sw: [14.06, 8.4, 1, 0], lamp: [17, 8.5] },
    { id: 'laundry', name: 'Laundry Room', r: [14, 11, 20, 14], floor: 'concreteF', wall: 'plasterG', sw: [16.6, 11.06, 0, 1], lamp: [17, 12.5] },
    // closets (hiding spots) — temperature and darkness follow the parent room
    { id: 'mcloset', name: 'Master Closet', r: [0, 12.6, 2, 14], floor: 'woodF', wall: 'plasterG', closet: true, parent: 4, door: 7 },
    { id: 'kcloset', name: "Child's Closet", r: [12.4, 12.6, 14, 14], floor: 'woodF', wall: 'plasterG', closet: true, parent: 6, door: 8 },
  ],
  walls: [
    { z: 0, a: -0.1, b: 20.1, t: 0.2, ext: true, open: [{ s: 5.0, e: 6.6, win: 1 }, { s: 9.0, e: 10.0, door: 0 }, { s: 12.6, e: 14.0, win: 1 }, { s: 17.2, e: 18.6, win: 1 }] },
    { z: 14, a: -0.1, b: 20.1, t: 0.2, ext: true, open: [{ s: 4.4, e: 5.6, win: 1 }, { s: 7.3, e: 8.2, win: 1, sill: 1.4 }, { s: 10.6, e: 11.8, win: 1 }, { s: 16.4, e: 17.4, win: 1, sill: 1.3 }] },
    { x: 0, a: 0.1, b: 13.9, t: 0.2, ext: true, open: [{ s: 1.6, e: 3.0, win: 1 }, { s: 10.4, e: 11.6, win: 1 }] },
    { x: 20, a: 0.1, b: 13.9, t: 0.2, ext: true, open: [{ s: 2.4, e: 3.8, win: 1 }, { s: 8.0, e: 9.4, win: 1, sill: 1.1 }] },
    { z: 6, a: 0.1, b: 14, t: 0.12, open: [{ s: 3.5, e: 4.4, door: 1 }, { s: 8.3, e: 10.7, arch: 1 }] },
    { z: 6, a: 14, b: 19.9, t: 0.12, open: [{ s: 15, e: 16.4, arch: 1 }] },
    { x: 8, a: 0.1, b: 6, t: 0.12, open: [{ s: 1.5, e: 3.5, arch: 1 }] },
    { x: 11, a: 0.1, b: 6, t: 0.12, open: [{ s: 2.0, e: 3.0, door: 2 }] },
    { z: 8, a: 0.1, b: 14, t: 0.12, open: [{ s: 4.2, e: 5.1, door: 3 }, { s: 7.0, e: 7.9, door: 4 }, { s: 10.5, e: 11.4, door: 5 }] },
    { x: 6, a: 8, b: 13.9, t: 0.12 },
    { x: 9, a: 8, b: 13.9, t: 0.12 },
    { x: 14, a: 6, b: 13.9, t: 0.12, open: [{ s: 6.2, e: 7.8, arch: 1 }] },
    { z: 11, a: 14, b: 19.9, t: 0.12, open: [{ s: 15, e: 16, door: 6 }] },
    { z: 12.6, a: 0.1, b: 2.05, t: 0.1, open: [{ s: 0.3, e: 1.2, door: 7 }] },
    { x: 2, a: 12.6, b: 13.9, t: 0.1 },
    { z: 12.6, a: 12.35, b: 13.9, t: 0.1, open: [{ s: 12.8, e: 13.7, door: 8 }] },
    { x: 12.4, a: 12.6, b: 13.9, t: 0.1 },
  ],
  doors: [
    { z: 0, s: 9.0, e: 10.0, hinge: 's', into: 1, front: true },
    { z: 6, s: 3.5, e: 4.4, hinge: 's', into: 1 },
    { x: 11, s: 2.0, e: 3.0, hinge: 's', into: 1 },
    { z: 8, s: 4.2, e: 5.1, hinge: 's', into: 1 },
    { z: 8, s: 7.0, e: 7.9, hinge: 'e', into: 1 },
    { z: 8, s: 10.5, e: 11.4, hinge: 's', into: 1 },
    { z: 11, s: 15, e: 16, hinge: 's', into: 1 },
    { z: 12.6, s: 0.3, e: 1.2, hinge: 's', into: -1, closet: 9 },
    { z: 12.6, s: 12.8, e: 13.7, hinge: 'e', into: -1, closet: 10 },
  ],
  grassOK(x, z) {
    if (x > -0.4 && x < 20.4 && z > -2.5 && z < 14.4) return false;
    if (x > 8.7 && x < 10.3 && z < -2.8) return false; if (x > 13.8 && x < 17.2 && z < 0) return false;
    if (x > 14 && x < 17.3 && z > -9.2 && z < -3.8) return false;
    return x > -5.8 && x < 25.8 && z > -14.4 && z < 19.8;
  },
  outsideStep(p) { return Math.abs(p.z) < 3 || (p.x > 8.8 && p.x < 10.2) ? 'step_concrete' : 'step_grass'; },
  menuCam(T, cam) { const a = T * 0.04; cam.position.set(9.5 + Math.sin(a) * 19, 3.0 + Math.sin(T * 0.1) * 0.4, -9 + Math.cos(a) * 8 - 8); cam.lookAt(10, 2.2, 6); },
  build(gb, root) {
    gb.mm('brick', -0.1, 0, -0.1, 20.1, FY - 0.06, 14.1);
    buildRoof(gb); buildPorch(gb); buildFurniture(gb, root); buildExterior(gb, root); buildMusicBox(gb, root);
  },
};
