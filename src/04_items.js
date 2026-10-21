// ---------------------------------------------------------------- evidence & ghost catalogue
const EV = ['emf', 'spirit', 'uv', 'laser', 'freeze', 'orbs', 'writing'];
const EV_NAME = { emf: 'EMF Level 5', spirit: 'Spirit Box', uv: 'UV Handprints', laser: 'Laser Dots', freeze: 'Freezing Temps', orbs: 'Ghost Orbs', writing: 'Ghost Writing' };
const EV_SHORT = { emf: 'EMF 5', spirit: 'Spirit', uv: 'UV', laser: 'Laser', freeze: 'Freezing', orbs: 'Orbs', writing: 'Writing' };
const EV_HINT = { emf: 'The EMF reader lights all five dots.', spirit: 'A voice answers through the static.', uv: 'Glowing prints on walls, doors or switches.', laser: 'A silhouette moves through the green grid.', freeze: 'Thermometer reads 0 °C or colder.', orbs: 'Floating lights in the camcorder\'s night vision.', writing: 'Something writes in the spirit journal.' };
// How likely evidence is to show each time the ghost has a chance to leave it, and how likely its signature behaviour is
// to fire each time it could. Evidence that is simply present or not (the laser silhouette, orbs, freezing air, the Jinn's
// drain) comes and goes in spells of a few seconds, picked from the round seed and the clock so every player sees the same.
const EV_CHANCE = 0.7, TRAIT_CHANCE = 0.4;
function spellOn(key, p, span = 6) {
  let h = (G.seed ^ Math.imul(Math.floor(G.elapsed / span) + 1, 2654435761) ^ Math.imul(key.length * 31 + key.charCodeAt(0), 40503)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h ^= h >>> 16;
  return ((h >>> 0) % 10000) / 10000 < p;
}
// seven evidences, every ghost a unique set of three, and no two evidences that point to just one ghost; each also has
// a behaviour that singles it out even with no evidence
const GHOSTS = [
  { name: 'Spirit', ev: ['emf', 'spirit', 'uv'], tell: 'The only ghost that slams doors shut with a bang (others just ease them). Waits a little longer between hunts.', huntCd: 1.3, slams: true },
  { name: 'Wraith', ev: ['emf', 'spirit', 'laser'], tell: 'Breathes. Stand close to it and you will hear slow, heavy breathing in the dark. Drifts out of its room often.', wander: 0.35, breathes: true },
  { name: 'Phantom', ev: ['spirit', 'laser', 'orbs'], tell: 'Seeing it drains far more sanity, and when it manifests the lights stay on. Almost invisible during hunts: you catch it only in brief flashes.', eventDrain: 2, flick: 0.25, keepsLights: true },
  { name: 'Poltergeist', ev: ['emf', 'uv', 'laser'], tell: 'Throws objects constantly, and is the only ghost that hurls several at once.', throwy: 3 },
  { name: 'Banshee', ev: ['freeze', 'orbs', 'writing'], tell: 'Lets out a long, mournful wail: sometimes when it manifests, sometimes out of nowhere while it roams. Fixates on one investigator for every hunt.', fixate: true, wail: true },
  { name: 'Jinn', ev: ['emf', 'freeze', 'orbs'], tell: 'Feeds on electricity: your flashlight stutters whenever it is right beside you, even when nothing is manifesting. Never touches light switches.', speedLos: 1.2, noSwitch: true, drainsFlash: true },
  { name: 'Mare', ev: ['laser', 'freeze', 'orbs'], tell: 'Hates the light. Switch on a light near it and it snaps it back off within seconds.', lightsOff: 3, mare: true },
  { name: 'Revenant', ev: ['spirit', 'laser', 'freeze'], tell: 'Crawls at a walking pace when it loses you, then sprints faster than anything else the moment it sees you.', revenant: true },
  { name: 'Shade', ev: ['emf', 'orbs', 'writing'], tell: 'Only ever manifests as a pitch-black silhouette with no features. Shy: barely acts when several investigators are near.', shy: true, shadow: true },
  { name: 'Demon', ev: ['emf', 'freeze', 'writing'], tell: 'The only ghost that will hunt while everyone\'s sanity is still high. Hunts often, with little warning.', huntChance: 1.8, huntCd: 0.6, anySanity: true },
  { name: 'Onryo', ev: ['spirit', 'freeze', 'orbs'], tell: 'Every time it manifests, the room light bursts out with a pop. Also cuts all the power before it hunts.', lightsOff: 2, preHunt: true, popLights: true },
  { name: 'Changeling', ev: ['spirit', 'uv', 'laser'], tell: 'Leaves small, child-sized handprints, and sometimes repeats your question back through the spirit box. Its hunting footsteps come twice as fast.', fastSteps: true, speed: 1.08, childPrints: true, echo: true },
  { name: 'Yurei', ev: ['uv', 'freeze', 'writing'], tell: 'Now and then every open door around it eases shut at the same moment, with no one near them.', shutsAll: true },
  { name: 'Siren', ev: ['spirit', 'uv', 'freeze'], tell: 'Calls investigators by name. If a voice whispers your name from somewhere in the house, it is this one.', calls: true },
  { name: 'Myling', ev: ['uv', 'laser', 'writing'], tell: 'Hunts in silence: its footsteps are only heard once it is a few steps away. Restless otherwise, whispering and knocking far more than others.', silentSteps: true, chatty: 3 },
  { name: 'Wendigo', ev: ['emf', 'uv', 'writing'], tell: 'Mimics you. Walk near it and you hear a second set of footsteps following a few paces behind you.', mimics: true },
  { name: 'Lantern Man', ev: ['laser', 'orbs', 'writing'], tell: 'The only ghost that switches lights on. Lamps flick on by themselves in empty rooms around it.', lightsOn: true, noSwitch: true },
];
const SB_ANSWERS = [
  { q: 'Where are you?', a: ['here', 'close', 'behind', 'next to you', 'away'] },
  { q: 'How old are you?', a: ['old', 'child', 'young', 'adult'] },
  { q: 'What do you want?', a: ['leave', 'death', 'kill', 'hurt', 'you'] },
  { q: 'Is anyone here with us?', a: ['yes', 'me', 'here', 'always'] },
  { q: 'Can you give us a sign?', a: ['no', 'watch', 'here', 'soon'] },
];

// ---------------------------------------------------------------- gear
const ITEM_TYPES = ['emf', 'spirit', 'uv', 'laser', 'thermo', 'incense', 'doll', 'camera', 'journal', 'meds'];
const MEDS_SANITY = 40;
const JOURNAL_LIFT = 2.6;   // seconds the spirit journal floats while the ghost writes
const INCENSE_BURN = 10, INCENSE_RANGE = 4.5, INCENSE_REPEL = 6;
const ITEM_NAME = { emf: 'EMF Reader', spirit: 'Spirit Box', uv: 'UV Light', laser: 'Laser Projector', thermo: 'Thermometer', incense: 'Incense Bundle', doll: 'Voodoo Doll', camera: 'Camcorder', journal: 'Spirit Journal', meds: 'Sanity Medication' };
const ITEM_ICON = {
  emf: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="4" width="14" height="24" rx="2"/><circle cx="16" cy="9" r="1.4" fill="#4dff7a" stroke="none"/><circle cx="16" cy="13" r="1.4" fill="#9dff4d" stroke="none"/><circle cx="16" cy="17" r="1.4" fill="#ffd24d" stroke="none"/><circle cx="16" cy="21" r="1.4" fill="#ff8a3c" stroke="none"/><circle cx="16" cy="25" r="1.4" fill="#ff3c3c" stroke="none"/></svg>',
  spirit: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="10" width="20" height="18" rx="2"/><path d="M20 10 L25 2"/><rect x="9" y="13" width="14" height="5" fill="#ff5a3c33"/><circle cx="16" cy="23" r="3"/></svg>',
  uv: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 13h12l6-4v14l-6-4H6z"/><path d="M27 11l3-2M27 16h3M27 21l3 2" stroke="#a07bff"/></svg>',
  laser: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="10" y="6" width="12" height="10" rx="1.5"/><path d="M16 16v5M16 21l-6 8M16 21l6 8M16 21v8"/><g fill="#4dff7a" stroke="none"><circle cx="5" cy="5" r="1"/><circle cx="27" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="27" cy="12" r="1"/></g></svg>',
  thermo: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 9h17a3 3 0 0 1 3 3v2H5z"/><path d="M14 14l-2 13h5l2-13"/><rect x="8" y="10.5" width="9" height="2.5" fill="#8fd3ff55"/></svg>',
  camera: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="11" width="18" height="11" rx="2"/><path d="M22 14l6-3v10l-6-3"/><rect x="6" y="7" width="7" height="4" rx="1"/><circle cx="8" cy="15" r="1.3" fill="#ff3c3c" stroke="none"/></svg>',
  journal: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 9c-3-2-8-2-11 0v16c3-2 8-2 11 0 3-2 8-2 11 0V9c-3-2-8-2-11 0z"/><path d="M16 9v16"/><path d="M19 14c2-1 3 1 5-1M19 18c1.5 0 3 1 5-1" stroke="#b03030" stroke-width="1.2"/></svg>',
  meds: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 6h12l1 3v17l-1 2H10l-1-2V9z"/><path d="M9 11h14M9 22h14"/><path d="M16 13.5v6M13 16.5h6" stroke="#5fd08a" stroke-width="2"/></svg>',
  doll: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="16" cy="8" r="4.5"/><path d="M16 12.5v9M7 15h18M16 21.5l-4 7M16 21.5l4 7"/><path d="M14 7l1.5 1.5M15.5 7L14 8.5" stroke-width="1"/><circle cx="18" cy="7.8" r="0.9" fill="currentColor" stroke="none"/><path d="M24 12l-6 5" stroke="#ccc" stroke-width="1.1"/><circle cx="24.5" cy="11.5" r="1.8" fill="#d02020" stroke="none"/><path d="M15 16.5l1 1 1-1-1 1.6z" fill="#d02020" stroke="none"/></svg>',
  incense: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 29l2-15h5l2 15z"/><path d="M12.5 22h8" stroke="#c9a46a"/><circle cx="16.5" cy="13" r="1.6" fill="#ff8a3c" stroke="none"/><path d="M16 10c-2-2 1-3 0-5M18 9c2-2-1-3 1-6" stroke="#b9c0c8" stroke-width="1.2"/></svg>',
};
const ITEMS = [];
const LED_COLORS = [0x40ff60, 0x9dff40, 0xffd040, 0xff8030, 0xff2a20];

function lcdTexture(w = 128, h = 64) { const [c, x] = mkCanvas(w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, x, t }; }

function buildItem(id, type) {
  const g = new THREE.Group(); const it = { id, type, obj: g, on: false, holder: -1, pos: new V3(), ry: 0, parts: {}, lcd: null, light: null, level: 0, temp: 0, dispT: 0 };
  const body = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const plastic = MATS.blackPlastic, gray = MATS.grayPlastic;
  if (type === 'emf') {
    body(new THREE.BoxGeometry(0.07, 0.028, 0.17), gray, 0, 0.014, 0);
    body(new THREE.BoxGeometry(0.06, 0.006, 0.09), plastic, 0, 0.03, -0.025);
    it.parts.leds = [];
    for (let i = 0; i < 5; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: LED_COLORS[i], emissiveIntensity: 0, roughness: 0.3 }); const l = body(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10), m, 0, 0.034, 0.012 - i * 0.017); it.parts.leds.push(m); }
    body(new THREE.BoxGeometry(0.02, 0.01, 0.02), MATS.toyRed, 0.0, 0.032, 0.06);
  } else if (type === 'spirit') {
    body(new THREE.BoxGeometry(0.09, 0.14, 0.035), gray, 0, 0.07, 0);
    it.lcd = lcdTexture(128, 48);
    const scr = body(new THREE.PlaneGeometry(0.07, 0.026), new THREE.MeshStandardMaterial({ map: it.lcd.t, emissive: 0xffffff, emissiveMap: it.lcd.t, emissiveIntensity: 0.0, color: 0x222222 }), 0, 0.11, 0.0181);
    it.parts.scr = scr.material;
    for (let i = 0; i < 4; i++) body(new THREE.BoxGeometry(0.06, 0.004, 0.002), plastic, 0, 0.035 + i * 0.012, 0.0181);
    const ant = body(new THREE.CylinderGeometry(0.003, 0.004, 0.2, 6), MATS.chrome, 0.03, 0.24, -0.005); ant.rotation.z = -0.2;
    body(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 10), MATS.chrome, -0.03, 0.142, 0);
    it.lcd.x.font = 'bold 30px monospace';
  } else if (type === 'uv') {
    const h = body(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 14), plastic, 0, 0.022, 0); h.rotation.x = Math.PI / 2;
    const hd = body(new THREE.CylinderGeometry(0.028, 0.02, 0.05, 16), plastic, 0, 0.022, -0.105); hd.rotation.x = Math.PI / 2;
    const lensM = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x8040ff, emissiveIntensity: 0 });
    const lens = body(new THREE.CircleGeometry(0.024, 18), lensM, 0, 0.022, -0.131); lens.rotation.y = Math.PI;
    it.parts.lens = lensM;
    const L = new THREE.SpotLight(0x7a40ff, 0, 7, 0.42, 0.45, 1.6); L.position.set(0, 0.022, -0.14); L.target.position.set(0, 0.02, -2); g.add(L, L.target);
    it.light = L;
  } else if (type === 'laser') {
    body(new THREE.BoxGeometry(0.09, 0.07, 0.1), gray, 0, 0.2, 0);
    const lensM = new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x40ff60, emissiveIntensity: 0 });
    const lens = body(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 14), lensM, 0, 0.2, -0.052); lens.rotation.x = Math.PI / 2;
    it.parts.lens = lensM;
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = body(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 5), MATS.tentPole, Math.cos(a) * 0.04, 0.085, Math.sin(a) * 0.04); l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); }
    const L = new THREE.SpotLight(0x50ff70, 0, 10, 0.72, 0.02, 0.6);
    L.map = TEX.laserCookie; L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.camera.near = 0.1; L.shadow.camera.far = 10; L.shadow.bias = -0.0008; L.shadow.autoUpdate = false;
    L.position.set(0, 0.2, -0.06); L.target.position.set(0, 0.32, -2); g.add(L, L.target);
    it.light = L;
  } else if (type === 'thermo') {
    // IR thermometer: the big backlit display sits on the back face, square to your eye
    body(new THREE.BoxGeometry(0.078, 0.078, 0.15), gray, 0, 0.075, 0);
    body(new THREE.BoxGeometry(0.084, 0.084, 0.03), MATS.toyYellow, 0, 0.075, -0.07);
    const hdl = body(new THREE.BoxGeometry(0.04, 0.11, 0.045), MATS.toyYellow, 0, 0.0, 0.035); hdl.rotation.x = -0.3;
    body(new THREE.BoxGeometry(0.012, 0.022, 0.02), plastic, 0, 0.025, -0.01).rotation.x = -0.3;
    body(new THREE.BoxGeometry(0.074, 0.066, 0.006), plastic, 0, 0.077, 0.076);
    it.lcd = lcdTexture(256, 224);
    const scrM = new THREE.MeshBasicMaterial({ map: it.lcd.t, toneMapped: false });
    const scr = body(new THREE.PlaneGeometry(0.066, 0.058), scrM, 0, 0.077, 0.0795); scr.castShadow = false;
    it.parts.scr = scrM;
    const lens = body(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 18), MATS.screen, 0, 0.082, -0.086); lens.rotation.x = Math.PI / 2;
    const dotM = new THREE.MeshBasicMaterial({ color: 0x330000 }); const dot = body(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 10), dotM, 0, 0.055, -0.086); dot.rotation.x = Math.PI / 2; it.parts.dot = dotM;
    it.minT = null; drawThermo(it);
  } else if (type === 'camera') {
    // a handheld night-vision camcorder with a flip-out screen
    body(new THREE.BoxGeometry(0.075, 0.085, 0.17), plastic, 0, 0.0425, 0);
    body(new THREE.BoxGeometry(0.072, 0.02, 0.1), gray, 0, 0.094, 0.01);
    const lens = body(new THREE.CylinderGeometry(0.028, 0.03, 0.05, 18), gray, 0, 0.05, -0.105); lens.rotation.x = Math.PI / 2;
    const glassM = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.05, metalness: 0.6, emissive: 0x40ff60, emissiveIntensity: 0 });
    const gl = body(new THREE.CircleGeometry(0.024, 18), glassM, 0, 0.05, -0.1305); gl.rotation.y = Math.PI; it.parts.lens = glassM;
    const irM = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 0 });
    body(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 8), irM, 0.022, 0.078, -0.087).rotation.x = Math.PI / 2; it.parts.rec = irM;
    it.lcd = lcdTexture(128, 96);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.046), new THREE.MeshBasicMaterial({ map: it.lcd.t, toneMapped: false })); scr.position.set(-0.041, 0.05, 0.005); scr.rotation.y = -Math.PI / 2 + 0.5; g.add(scr); it.parts.scr = scr;
    body(new THREE.BoxGeometry(0.004, 0.05, 0.068), plastic, -0.04, 0.05, 0.004).rotation.y = 0.5;
    body(new THREE.BoxGeometry(0.012, 0.05, 0.11), MATS.leatherDark || plastic, 0.043, 0.045, 0.0);   // hand strap
    const x = it.lcd.x; x.fillStyle = '#020402'; x.fillRect(0, 0, 128, 96); it.lcd.t.needsUpdate = true;
  } else if (type === 'journal') {
    // an open spirit journal: leather covers, a spread of ruled pages; the ghost's writing fills them
    const cover = new THREE.MeshStandardMaterial({ color: 0x3a2014, roughness: 0.75 });
    for (const sx of [-1, 1]) { const c = body(new THREE.BoxGeometry(0.165, 0.007, 0.235), cover, sx * 0.083, 0.0035, 0); c.rotation.z = sx * -0.05; }
    const paperM = new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.95 });
    const pages = []; for (const sx of [-1, 1]) { const pg = body(new THREE.BoxGeometry(0.155, 0.014, 0.222), paperM, sx * 0.079, 0.013, 0); pg.rotation.z = sx * -0.05; pages.push(pg); }
    const blank = artTex(256, 180, (x, w, h) => { x.fillStyle = '#ece6d4'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(80,100,140,0.35)'; x.lineWidth = 1; for (let y = 22; y < h; y += 13) { x.beginPath(); x.moveTo(8, y); x.lineTo(w / 2 - 8, y); x.moveTo(w / 2 + 8, y); x.lineTo(w - 8, y); x.stroke(); } x.fillStyle = 'rgba(60,40,30,0.25)'; x.fillRect(w / 2 - 1, 0, 2, h); });
    const written = artTex(256, 180, (x, w, h) => {
      x.drawImage(blank.image, 0, 0);
      x.strokeStyle = 'rgba(30,14,10,0.9)'; x.lineWidth = 2.2; x.lineCap = 'round';
      const scrawl = (x0, y0, x1, n, j) => { x.beginPath(); x.moveTo(x0, y0); for (let i = 1; i <= n; i++) x.lineTo(x0 + (x1 - x0) * i / n, y0 + (Math.random() - 0.5) * j); x.stroke(); };
      for (let r = 0; r < 6; r++) scrawl(14, 30 + r * 20, 112, 26, 9);
      x.font = 'bold 30px "Brush Script MT", cursive'; x.fillStyle = 'rgba(90,10,10,0.92)'; x.save(); x.translate(186, 88); x.rotate(-0.2); x.textAlign = 'center'; x.fillText('GET OUT', 0, 0); x.restore();
      x.strokeStyle = 'rgba(90,10,10,0.85)'; x.lineWidth = 2; x.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; x.lineTo(190 + Math.cos(a) * 26, 138 + Math.sin(a) * 26); } x.stroke(); x.beginPath(); x.arc(190, 138, 28, 0, Math.PI * 2); x.stroke();
    });
    const pageM = new THREE.MeshStandardMaterial({ map: blank, color: 0xc8c0b0, roughness: 0.95 });   // toned down so a flashlight doesn't wash the ink out
    // each half of the spread rides on its own tilted page block, so the blocks can't poke through the ink at the spine
    pages.forEach((pg, k) => {
      const geo = new THREE.PlaneGeometry(0.153, 0.22), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 2);
      const top = new THREE.Mesh(geo, pageM); top.rotation.x = -Math.PI / 2; top.position.y = 0.0074; pg.add(top);
    });
    it.parts.page = pageM; it.parts.blank = blank; it.parts.written = written;
  } else if (type === 'meds') {
    // sanity medication, sold in a beer can
    const label = artTex(256, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e4a2c'); gr.addColorStop(1, '#06301c'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = '#d8b04a'; x.fillRect(0, 14, w, 4); x.fillRect(0, h - 18, w, 4);
      x.textAlign = 'center'; x.font = 'bold 30px Impact, sans-serif'; x.fillStyle = '#f4e2a8'; x.fillText('SANITY', w * 0.3, 62); x.fillText('SANITY', w * 0.8, 62);
      x.font = 'bold 13px Georgia, serif'; x.fillStyle = '#d8b04a'; x.fillText('MEDICATION LAGER', w * 0.3, 82); x.fillText('MEDICATION LAGER', w * 0.8, 82);
      x.fillStyle = '#5fd08a'; for (const cx of [w * 0.3, w * 0.8]) { x.fillRect(cx - 4, 90, 8, 22); x.fillRect(cx - 11, 97, 22, 8); }
      x.font = '10px monospace'; x.fillStyle = '#9ab8a4'; x.fillText('12 FL OZ  ·  STEADIES NERVES', w * 0.55, h - 4);
    });
    const can = body(new THREE.CylinderGeometry(0.033, 0.033, 0.1, 22, 1, true), new THREE.MeshStandardMaterial({ map: label, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide }), 0, 0.062, 0);
    body(new THREE.CylinderGeometry(0.028, 0.033, 0.012, 22), MATS.chrome, 0, 0.118, 0); body(new THREE.CylinderGeometry(0.033, 0.027, 0.012, 22), MATS.chrome, 0, 0.006, 0);
    body(new THREE.CylinderGeometry(0.026, 0.026, 0.002, 22), MATS.chrome, 0, 0.125, 0);
    const tab = body(new THREE.BoxGeometry(0.012, 0.002, 0.02), MATS.chrome, 0, 0.127, 0.006); it.parts.tab = tab; it.parts.can = can;
  } else if (type === 'doll') {
    // a New Orleans voodoo doll: burlap over a cross of sticks, Mardi Gras sash, button and stitched eyes, moss hair, pins
    const burlap = new THREE.MeshStandardMaterial({ map: artTex(128, 128, (x, w, h) => { x.fillStyle = '#9a7a4e'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 4) { x.fillStyle = i % 8 ? 'rgba(60,40,20,0.35)' : 'rgba(230,200,150,0.25)'; x.fillRect(i, 0, 2, h); x.fillRect(0, i, w, 2); } }), roughness: 1 });
    const C = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    body(new THREE.CylinderGeometry(0.024, 0.03, 0.085, 10), burlap, 0, 0.075, 0);
    body(new THREE.SphereGeometry(0.032, 14, 10), burlap, 0, 0.152, 0).scale.set(1, 1.05, 0.85);
    for (const sx of [-1, 1]) body(new THREE.CylinderGeometry(0.01, 0.009, 0.04, 6), burlap, sx * 0.012, 0.02, 0);
    const arm = body(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 8), burlap, 0, 0.105, 0); arm.rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) { const st = body(new THREE.CylinderGeometry(0.004, 0.004, 0.022, 5), MATS.darkWood, sx * 0.064, 0.105, 0); st.rotation.z = Math.PI / 2; }
    body(new THREE.CylinderGeometry(0.032, 0.036, 0.026, 12), C(0x5a2a7a), 0, 0.05, 0);          // purple skirt
    body(new THREE.CylinderGeometry(0.027, 0.027, 0.008, 12), C(0x2a7a3a), 0, 0.068, 0);         // green sash
    body(new THREE.TorusGeometry(0.027, 0.002, 4, 16), MATS.brass, 0, 0.073, 0).rotation.x = Math.PI / 2;   // gold thread
    body(new THREE.SphereGeometry(0.009, 8, 6), C(0xb01818), 0.0, 0.098, 0.023).scale.set(1, 0.9, 0.45);   // red felt heart
    body(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 10), C(0x111111), 0.012, 0.158, 0.027).rotation.x = Math.PI / 2;   // button eye
    for (const r of [0.8, -0.8]) { const s = body(new THREE.BoxGeometry(0.013, 0.0022, 0.002), C(0x111111), -0.012, 0.158, 0.0275); s.rotation.z = r; }   // stitched X eye
    body(new THREE.BoxGeometry(0.02, 0.0018, 0.002), C(0x2a1a10), 0, 0.141, 0.0272);
    for (let i = 0; i < 4; i++) body(new THREE.BoxGeometry(0.0015, 0.006, 0.002), C(0x2a1a10), -0.0075 + i * 0.005, 0.141, 0.0274);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, m = body(new THREE.ConeGeometry(0.006, 0.05, 4), C(0x6a7258), Math.cos(a) * 0.022, 0.155, Math.sin(a) * 0.02 - 0.008); m.rotation.set(Math.PI + Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); }   // Spanish moss hair
    for (const [x, y, z, rx, rz, c] of [[0.02, 0.17, 0.0, 0.2, -0.9, 0xf0c020], [-0.022, 0.08, 0.012, -0.3, 0.8, 0x2ab04a], [0.0, 0.18, -0.02, -0.9, 0.1, 0x8a3ac0]]) {   // pins already in
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, 0, rz); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.04, 4), MATS.chrome)); const bd = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), C(c)); bd.position.y = 0.02; g.add(bd); body(new THREE.BoxGeometry(0.001, 0.001, 0.001), C(0), 0, 0, 0).add(g);
    }
    // the long red-headed pin: stuck in the arm until someone drives it into the heart
    const pin = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.07, 5), MATS.chrome); sh.position.y = 0.035; pin.add(sh);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), C(0xd01818)); bead.position.y = 0.07; pin.add(bead); g.add(pin);
    it.parts.pin = pin; it.pinK = 0; it.spent = false;
  } else if (type === 'incense') {
    // a tied bundle of dried sage; the tip smoulders once lit
    const sage = new THREE.MeshStandardMaterial({ color: 0x8a9478, roughness: 0.95 }), leaf = new THREE.MeshStandardMaterial({ color: 0x6f7b5e, roughness: 1 });
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2, r = k ? 0.014 : 0, st = body(new THREE.CylinderGeometry(0.009, 0.007, 0.2, 6), k % 2 ? leaf : sage, Math.cos(a) * r, 0.1, Math.sin(a) * r);
      st.rotation.set(Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06);
    }
    for (const y of [0.05, 0.1, 0.15]) body(new THREE.TorusGeometry(0.025, 0.0028, 5, 14), MATS.cardboard, 0, y, 0).rotation.x = Math.PI / 2;
    const emberM = new THREE.MeshStandardMaterial({ color: 0x1a1410, emissive: 0xff5a1c, emissiveIntensity: 0, roughness: 1 });
    const tip = body(new THREE.CylinderGeometry(0.028, 0.026, 0.02, 10), emberM, 0, 0.205, 0); tip.castShadow = false;
    it.parts.ember = emberM; it.parts.tip = tip; it.spent = false; it.burnEnd = 0;
  }
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.26), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.08; g.add(hit);
  it.hit = hit;
  INTERACT.push({ mesh: hit, kind: 'item', id });
  ITEMS.push(it);
  return it;
}
// hand pose per item: position relative to camera and rotation
const HAND_POSE = {
  emf: [0.16, -0.19, -0.34, 0.95, 0.15, 0],
  spirit: [0.18, -0.25, -0.36, -0.15, 0.15, 0],
  uv: [0.2, -0.22, -0.32, 0.03, 0.04, 0],
  laser: [0.2, -0.36, -0.42, 0.1, 0.25, 0],
  thermo: [0.11, -0.175, -0.27, -0.28, -0.12, 0],
  incense: [0.2, -0.26, -0.46, -1.0, 0.15, -0.25],
  doll: [0.15, -0.21, -0.36, 0.15, -0.35, 0],
  camera: [0.17, -0.2, -0.36, 0.0, 0.0, 0],
  journal: [0.13, -0.24, -0.4, 1.1, 0.0, 0],
  meds: [0.17, -0.24, -0.38, 0.1, 0, 0],
};
function buildItems(scene) {
  let id = 0;
  // two tidy rows on the tent table (offsets from the table centre; the clipboard sits at the left end, the lantern at the right)
  // the tent table, laid out in tidy rows (offsets from the table centre; the clipboard sits at the left end, the lantern
  // at the back right). Back row: detectors and the camcorders. Front row: spirit boxes, projectors, incense, medication.
  // The two journals are stacked in the back-left corner beside the clipboard.
  const layout = [['journal', -0.9, -0.24, 0], ['journal', -0.9, -0.24, 0.028],
    ['emf', -0.58, -0.18], ['emf', -0.44, -0.18], ['uv', -0.26, -0.16], ['uv', -0.12, -0.16], ['thermo', 0.06, -0.17], ['thermo', 0.22, -0.17], ['camera', 0.42, -0.17], ['camera', 0.6, -0.17],
    ['spirit', -0.52, 0.2], ['spirit', -0.38, 0.2], ['laser', -0.16, 0.18], ['laser', 0.08, 0.18], ['incense', 0.32, 0.17], ['incense', 0.43, 0.17], ['incense', 0.54, 0.17], ['incense', 0.65, 0.17],
    ['meds', 0.82, 0.1], ['meds', 0.94, 0.1], ['meds', 0.82, 0.24], ['meds', 0.94, 0.24], ['doll', 0, 0]];
  for (const [type, ox, oz, oy] of layout) {
    const it = buildItem(id++, type);
    it.off = [ox, oz, oy || 0]; it.home = new V3(); it.ry = Math.PI + (WR() - 0.5) * 0.3;
    scene.add(it.obj);
    if (it.light) proxyLight(it.light, it.obj, scene);
  }
}
// Lights must never sit under something that gets hidden (a pocketed torch, a dead teammate): three.js only counts visible
// lights, and any change in that count recompiles every shader in the scene, a freeze of up to seconds. Such lights live
// in the scene itself and follow an empty anchor in their old place; temp ones go away with their owner.
const LIGHT_PROXIES = [];
function proxyLight(L, parent, scene, temp) {
  const a = new THREE.Object3D(), b = new THREE.Object3D(); a.position.copy(L.position); b.position.copy(L.target.position);
  parent.remove(L, L.target); parent.add(a, b); scene.add(L, L.target); LIGHT_PROXIES.push({ L, a, b, temp });
}
function syncLightProxies() {
  for (let i = LIGHT_PROXIES.length - 1; i >= 0; i--) {
    const P = LIGHT_PROXIES[i]; let r = P.a; while (r.parent) r = r.parent;
    if (P.temp && !r.isScene) { P.L.parent && P.L.parent.remove(P.L, P.L.target); LIGHT_PROXIES.splice(i, 1); continue; }
    P.a.getWorldPosition(P.L.position); P.b.getWorldPosition(P.L.target.position);
  }
}
function setItemHomes() {
  const tx = TENT.x, tz = TENT.z + 0.15, top = 0.76 + terrainY(TENT.x, TENT.z);
  for (const it of ITEMS) {
    it.home.set(tx + it.off[0], top + it.off[2], tz + it.off[1]);
    if (it.type === 'doll') {   // the voodoo doll only exists at the Drennen Estate, lying on Claire's bed
      if (MAP.id === 'farm') it.home.set(MAP.mirror !== undefined ? MAP.mirror - 6.78 : 6.78, FA1 + 0.505, 1.55); else it.home.set(0, -60, 0);
      it.restTilt = true;
    }
    it.holder = -1; it.on = false; it.pos.copy(it.home); it.ry = Math.PI; placeItemInWorld(it);
  }
}
// thermometer display: big digits, lowest reading kept, unmistakable freezing state
function drawThermo(it) {
  const x = it.lcd.x, W = 256, H = 224;
  x.fillStyle = '#05080a'; x.fillRect(0, 0, W, H);
  if (!it.on) { x.fillStyle = '#0b1114'; x.fillRect(10, 10, W - 20, H - 20); it.lcd.t.needsUpdate = true; return; }
  const t = it.temp, freeze = t <= 0;
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, freeze ? '#0b2a3e' : '#0c241c'); bg.addColorStop(1, freeze ? '#061826' : '#06140f');
  x.fillStyle = bg; x.fillRect(8, 8, W - 16, H - 16);
  const ink = freeze ? '#bfe9ff' : '#d6ffe9', dim = freeze ? '#6fa9c6' : '#7fb89c';
  const mono = w => w + ' ui-monospace, "Courier New", monospace', fmt = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  x.textBaseline = 'alphabetic'; x.fillStyle = dim; x.font = mono('600 22px');
  x.textAlign = 'left'; x.fillText('°C', 22, 42);
  x.textAlign = 'right'; x.fillText('MIN ' + fmt(it.minT), W - 22, 42);
  x.textAlign = 'center'; x.fillStyle = ink; x.font = mono('bold 92px'); x.fillText(fmt(t), W / 2, 136);
  x.fillStyle = freeze ? '#7fd6ff' : dim; x.fillRect(22, 156, W - 44, 3);
  x.font = mono('600 26px'); x.fillText(freeze ? 'FREEZING' : (t < 9 ? 'COLD' : 'NORMAL'), W / 2, 196);
  it.lcd.t.needsUpdate = true;
}
// EMF readings left by the ghost
const EMF_SRC = [];
function emfAt(p) {
  let lvl = 1; const now = performance.now() / 1000;
  for (let i = EMF_SRC.length - 1; i >= 0; i--) { const s = EMF_SRC[i]; if (now - s.t > 20) { EMF_SRC.splice(i, 1); continue; } const d = Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z); if (d < 1.9) lvl = Math.max(lvl, s.l); }
  return lvl;
}
