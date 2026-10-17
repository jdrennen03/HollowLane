// ---------------------------------------------------------------- extra throwables: Claire's horses, Jim's games and drafting kit
// a small standing horse figurine, built from simple shapes; sits with its hooves at y = 0 before centring
function horseFigGeo(s = 1, gallop = false) {
  const parts = [];
  const add = (g, x, y, z, rz = 0) => { if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(g); };
  add(new THREE.CapsuleGeometry(0.036, 0.1, 4, 10).rotateZ(Math.PI / 2), 0, 0.118, 0);
  add(new THREE.BoxGeometry(0.04, 0.095, 0.042), 0.074, 0.165, 0, -0.6);
  add(new THREE.BoxGeometry(0.068, 0.03, 0.034), 0.118, 0.198, 0, -0.75);
  add(new THREE.BoxGeometry(0.03, 0.06, 0.012), 0.062, 0.18, 0, -0.6);                       // mane
  for (const z of [-0.012, 0.012]) add(new THREE.ConeGeometry(0.008, 0.022, 5), 0.097, 0.232, z);
  const legs = gallop ? [[0.06, -0.016, 0.7], [0.05, 0.016, 0.35], [-0.06, -0.016, -0.6], [-0.05, 0.016, -0.25]] : [[0.055, -0.018, 0], [0.055, 0.018, 0.05], [-0.055, -0.018, 0], [-0.055, 0.018, -0.05]];
  for (const [x, z, r] of legs) add(new THREE.CylinderGeometry(0.009, 0.008, 0.085, 6), x + Math.sin(r) * 0.03, 0.042 + (gallop ? 0.012 : 0), z, r);
  add(new THREE.CylinderGeometry(0.005, 0.012, 0.075, 6), -0.098, 0.095, 0, 0.55);
  const g = mergeGeos(parts); g.scale(s, s, s); g.translate(0, -0.12 * s, 0);
  return g;
}
const horseProp = (mat, s = 1, gallop) => () => ({ geo: horseFigGeo(s, gallop ?? Math.random() < 0.35), mat, hh: 0.12 * s, r: 0.1 * s });
Object.assign(PROP_DEF, {
  horseBay: horseProp('horseBay'), horseBlack: horseProp('horseBlack'), horseWhite: horseProp('horseWhite'),
  horsePalo: horseProp('horsePalo'), horseGray: horseProp('horseGray'), horseBig: horseProp('horseBay', 1.8, false), horsePlush: horseProp('plush', 1.6, false),
  trophy: () => { const p = []; for (let i = 0; i <= 10; i++) { const t = i / 10; p.push(new THREE.Vector2(t < 0.25 ? 0.05 - t * 0.1 : t < 0.5 ? 0.012 : 0.012 + (t - 0.5) * 0.12, t * 0.2)); } const g = new THREE.LatheGeometry(p, 14); g.translate(0, -0.1, 0); return { geo: g, mat: 'brass', hh: 0.1, r: 0.06 }; },
  brush: () => ({ geo: new THREE.BoxGeometry(0.16, 0.04, 0.06), mat: 'lightWood', hh: 0.02, r: 0.08 }),
  horseshoe: () => ({ geo: new THREE.TorusGeometry(0.055, 0.01, 6, 14, Math.PI * 1.35).rotateX(Math.PI / 2), mat: 'metal', hh: 0.01, r: 0.06 }),
  controller: () => { const b = new THREE.BoxGeometry(0.11, 0.025, 0.06); const l = new THREE.CylinderGeometry(0.022, 0.018, 0.025, 10); l.translate(-0.05, 0, 0.025); const r = l.clone(); r.translate(0.1, 0, 0); return { geo: mergeGeos([b, l, r]), mat: pick(['blackPlastic', 'grayPlastic', 'consolePurple']), hh: 0.0125, r: 0.07 }; },
  gamecase: () => ({ geo: new THREE.BoxGeometry(0.135, 0.017, 0.19), mat: pick(['toyRed', 'toyBlue', 'toyGreen', 'toyYellow', 'consolePurple', 'blackPlastic']), hh: 0.0085, r: 0.1 }),
  cart: () => ({ geo: new THREE.BoxGeometry(0.1, 0.02, 0.085), mat: 'grayPlastic', hh: 0.01, r: 0.06 }),
  handheld: () => ({ geo: new THREE.BoxGeometry(0.09, 0.028, 0.15), mat: pick(['grayPlastic', 'toyGreen']), hh: 0.014, r: 0.08 }),
  pencilcup: () => { const c = new THREE.CylinderGeometry(0.035, 0.032, 0.1, 12); const ps = [c]; for (let i = 0; i < 6; i++) { const q = new THREE.CylinderGeometry(0.004, 0.004, 0.17, 5); q.rotateZ((i - 2.5) * 0.08); q.translate((i - 2.5) * 0.009, 0.05, (i % 2 - 0.5) * 0.02); ps.push(q); } const g = mergeGeos(ps); return { geo: g, mat: 'ceramicBlue', hh: 0.05, r: 0.05 }; },
  triangle: () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.2, 0); sh.lineTo(0, 0.12); sh.closePath(); const h = new THREE.Path(); h.moveTo(0.03, 0.025); h.lineTo(0.12, 0.025); h.lineTo(0.03, 0.08); h.closePath(); sh.holes.push(h); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(-0.07, 0, 0.04); return { geo: g, mat: 'acrylic', hh: 0.0015, r: 0.1 }; },
  ruler: () => ({ geo: new THREE.BoxGeometry(0.3, 0.005, 0.035), mat: 'lightWood', hh: 0.0025, r: 0.15 }),
  // barn kit
  bucket: () => { const b = new THREE.CylinderGeometry(0.15, 0.12, 0.27, 16, 1, true), bot = new THREE.CircleGeometry(0.12, 16); bot.rotateX(Math.PI / 2); bot.translate(0, -0.135, 0); const h = new THREE.TorusGeometry(0.15, 0.006, 4, 16, Math.PI); h.translate(0, 0.135, 0); const g = mergeGeos([b, bot, h]); return { geo: g, mat: pick(['toyBlue', 'toyRed', 'toyYellow', 'galv', 'toyGreen']), hh: 0.135, r: 0.16 }; },
  curry: () => { const g = new THREE.CylinderGeometry(0.06, 0.06, 0.035, 14); g.scale(1.4, 1, 1); return { geo: g, mat: pick(['rubberBlack', 'toyRed', 'ribbonPurple']), hh: 0.0175, r: 0.08 }; },
  scoop: () => { const c = new THREE.CylinderGeometry(0.075, 0.075, 0.2, 14, 1, true); c.rotateZ(Math.PI / 2); const h = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6); h.rotateZ(Math.PI / 2); h.translate(0.16, 0, 0); return { geo: mergeGeos([c, h]), mat: 'galv', hh: 0.075, r: 0.14 }; },
  hoofpick: () => { const a = new THREE.BoxGeometry(0.11, 0.018, 0.022), b = new THREE.BoxGeometry(0.012, 0.012, 0.05); b.translate(0.06, 0, 0.02); return { geo: mergeGeos([a, b]), mat: 'toyRed', hh: 0.009, r: 0.06 }; },
  sketchbook: () => ({ geo: new THREE.BoxGeometry(0.22, 0.02, 0.3), mat: pick(['bookB', 'blackPlastic']), hh: 0.01, r: 0.15 }),
});
