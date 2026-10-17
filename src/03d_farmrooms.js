// ---------------------------------------------------------------- Drennen Estate upstairs: Claire's room (horses) and Jim's room (games + drafting)
// Painted textures for posters, signs and screens, drawn once on canvases.
function artTex(w, h, draw) { const [c, x] = mkCanvas(w, h); draw(x, w, h); return canvasTex(c, true, false); }
function drawHorseSil(x, cx, cy, s, col, gallop = true) {
  x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.ellipse(cx, cy, s, 0.42 * s, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(cx + 0.55 * s, cy - 0.25 * s); x.lineTo(cx + 1.2 * s, cy - 1.05 * s); x.lineTo(cx + 1.5 * s, cy - 0.95 * s); x.lineTo(cx + 1.0 * s, cy + 0.12 * s); x.fill();
  x.beginPath(); x.moveTo(cx + 1.15 * s, cy - 1.12 * s); x.lineTo(cx + 1.95 * s, cy - 0.66 * s); x.lineTo(cx + 1.86 * s, cy - 0.44 * s); x.lineTo(cx + 1.32 * s, cy - 0.72 * s); x.fill();
  x.beginPath(); x.moveTo(cx + 1.2 * s, cy - 1.1 * s); x.lineTo(cx + 1.22 * s, cy - 1.38 * s); x.lineTo(cx + 1.36 * s, cy - 1.12 * s); x.fill();
  x.lineWidth = 0.16 * s;
  const leg = pts => { x.beginPath(); x.moveTo(cx + pts[0] * s, cy + pts[1] * s); for (let i = 2; i < pts.length; i += 2) x.lineTo(cx + pts[i] * s, cy + pts[i + 1] * s); x.stroke(); };
  if (gallop) { leg([0.7, 0.25, 1.3, 0.7, 1.62, 0.55]); leg([0.55, 0.3, 0.9, 0.9, 1.15, 1.05]); leg([-0.7, 0.2, -1.3, 0.65, -1.75, 0.8]); leg([-0.55, 0.3, -0.9, 0.85, -1.1, 1.2]); }
  else { leg([0.7, 0.2, 0.75, 0.75, 0.75, 1.25]); leg([0.5, 0.25, 0.52, 0.8, 0.55, 1.25]); leg([-0.7, 0.2, -0.78, 0.75, -0.72, 1.25]); leg([-0.5, 0.25, -0.5, 0.8, -0.52, 1.25]); }
  x.lineWidth = 0.17 * s; x.beginPath(); x.moveTo(cx - 0.92 * s, cy - 0.15 * s); x.quadraticCurveTo(cx - 1.35 * s, cy - 0.25 * s, cx - 1.7 * s, cy + (gallop ? 0.0 : 0.6) * s); x.stroke();
  x.lineWidth = 0.1 * s; x.beginPath(); x.moveTo(cx + 0.65 * s, cy - 0.35 * s); x.lineTo(cx + 1.15 * s, cy - 1.0 * s); x.stroke();   // mane
}
function pixelSprite(x, rows, px, ox, oy, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k === '.') continue; x.fillStyle = pal[k]; x.fillRect(ox + i * px, oy + j * px, px, px); } }); }
const SPR_HERO = ['..rrrr..', '.rrrrrrr', '.bbsbs..', 'bsbsssss', 'bssbssss', '..ssss..', '.rrbrr..', 'rrrbbrrr', 'ssbybbss', '..bbbb..', '.bb..bb.', 'nn....nn'];
const SPR_ALIEN = ['..g.....g..', '...g...g...', '..ggggggg..', '.gg.ggg.gg.', 'ggggggggggg', 'g.ggggggg.g', 'g.g.....g.g', '...gg.gg...'];
const SPR_SHIP = ['.....w.....', '....www....', '....www....', '.w.wwwww.w.', 'wwwwwwwwwww', 'www.www.www', 'w.........w'];
const SPR_KNIGHT = ['...hhhh...', '..hhhhhh..', '..hvvvvh..', '..hhhhhh..', '.aaaaaaaa.', 'saaaaaaaas', 's.aaaaaa.s', 's.aaaaaa.s', '..aa..aa..', '..aa..aa..', '.bbb..bbb.'];
const ROOM_ART = {};
function roomArt() {
  if (ROOM_ART.ok) return ROOM_ART;
  ROOM_ART.ok = true;
  ROOM_ART.wild = artTex(512, 360, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a1d4a'); g.addColorStop(0.45, '#d8603a'); g.addColorStop(0.7, '#f2b25a'); g.addColorStop(1, '#f2c27a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffe2a0'; x.beginPath(); x.arc(w * 0.68, h * 0.62, 60, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a1410'; x.beginPath(); x.moveTo(0, h * 0.78); x.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.55, h * 0.76); x.quadraticCurveTo(w * 0.8, h * 0.84, w, h * 0.74); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    drawHorseSil(x, 140, 236, 34, '#1a0c08'); drawHorseSil(x, 270, 226, 40, '#1a0c08'); drawHorseSil(x, 395, 244, 30, '#1a0c08');
    x.fillStyle = '#fff4dc'; x.font = 'bold 54px Georgia, serif'; x.textAlign = 'center'; x.fillText('WILD & FREE', w / 2, 70);
  });
  ROOM_ART.love = artTex(300, 400, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7ab4e8'); g.addColorStop(0.6, '#cfe6f6'); g.addColorStop(0.61, '#6aa04a'); g.addColorStop(1, '#3f7a2e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#f4f0e6'; x.lineWidth = 5; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(i * 60, 300); x.lineTo(i * 60, 330); x.stroke(); } x.beginPath(); x.moveTo(0, 306); x.lineTo(w, 306); x.stroke();
    drawHorseSil(x, 135, 250, 42, '#f2ede2', false);
    x.fillStyle = '#8a2a6a'; x.font = 'bold 46px Georgia, serif'; x.textAlign = 'center'; x.fillText('I ♥ HORSES', w / 2, 70);
  });
  ROOM_ART.cal = artTex(256, 360, (x, w, h) => {
    x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, w, 168);
    drawHorseSil(x, 116, 92, 30, '#2a1a10', true);
    x.fillStyle = '#2a2a2a'; x.font = 'bold 24px Georgia, serif'; x.textAlign = 'center'; x.fillText('OCTOBER 2009', w / 2, 198);
    x.font = '14px monospace'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const d = r * 7 + c - 3; if (d >= 1 && d <= 31) { x.fillText(String(d), 22 + c * 35, 228 + r * 26); if (d === 17) { x.strokeStyle = '#b02020'; x.lineWidth = 2; x.beginPath(); x.arc(22 + c * 35, 223 + r * 26, 12, 0, Math.PI * 2); x.stroke(); } } }
  });
  ROOM_ART.claire = artTex(512, 140, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9a6a3a'); g.addColorStop(1, '#6a4422'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(40,20,8,0.35)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(0, 10 + i * 9); x.bezierCurveTo(w * 0.3, i * 9, w * 0.6, 20 + i * 9, w, 8 + i * 9); x.stroke(); }
    x.fillStyle = '#f6e8c8'; x.font = 'bold 82px Georgia, serif'; x.textAlign = 'center'; x.fillText('CLAIRE', w / 2, 100);
    x.strokeStyle = '#f6e8c8'; x.lineWidth = 9; for (const cx of [48, w - 48]) { x.beginPath(); x.arc(cx, 72, 26, Math.PI * 0.85, Math.PI * 2.15); x.stroke(); }
  });
  ROOM_ART.tv = artTex(320, 240, (x, w, h) => {
    x.fillStyle = '#5c94fc'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; for (const [cx, cy] of [[60, 50], [220, 36]]) { x.beginPath(); x.ellipse(cx, cy, 30, 12, 0, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 20; i++) { x.fillStyle = i % 2 ? '#c84c0c' : '#b0400a'; x.fillRect(i * 16, 200, 16, 40); } x.fillStyle = '#000'; for (let i = 0; i < 20; i++) x.fillRect(i * 16, 200, 1, 40);
    x.fillStyle = '#c84c0c'; for (let i = 0; i < 4; i++) x.fillRect(150 + i * 16, 130, 15, 15); x.fillStyle = '#f8b800'; x.fillRect(182, 98, 15, 15);
    pixelSprite(x, SPR_HERO, 3, 60, 164, { r: '#d82800', b: '#704000', s: '#fca044', y: '#f8d800', n: '#704000' });
    x.fillStyle = '#fff'; x.font = 'bold 14px monospace'; x.textAlign = 'left'; x.fillText('JIM  004750   x07   WORLD 3-2', 10, 18);
    x.font = 'bold 20px monospace'; x.textAlign = 'center'; x.fillText('PAUSED', w / 2, 80);
  });
  ROOM_ART.arcade = artTex(256, 320, (x, w, h) => {
    x.fillStyle = '#05050c'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = 0; i < 60; i++) x.fillRect((i * 97) % w, (i * 53) % h, 1, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) pixelSprite(x, SPR_ALIEN, 2, 18 + c * 38, 40 + r * 26, { g: ['#e83a8a', '#3ae8d8', '#e8d83a', '#7ae83a'][r] });
    pixelSprite(x, SPR_SHIP, 3, 112, 270, { w: '#5af05a' });
    x.fillStyle = '#ff4040'; x.font = 'bold 16px monospace'; x.textAlign = 'center'; x.fillText('INSERT COIN', w / 2, 240); x.fillStyle = '#fff'; x.fillText('HI 98200', w / 2, 20);
  });
  ROOM_ART.marquee = artTex(320, 90, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#2a0a4a'); g.addColorStop(0.5, '#6a1a8a'); g.addColorStop(1, '#2a0a4a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.font = 'bold 30px Impact, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffd040'; x.strokeStyle = '#ff3a20'; x.lineWidth = 3; x.strokeText('GALAXY BLASTER', w / 2, 56); x.fillText('GALAXY BLASTER', w / 2, 56);
  });
  ROOM_ART.knight = artTex(300, 420, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#101838'); g.addColorStop(1, '#3a1a4a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2a2a48'; for (let i = 0; i < 6; i++) x.fillRect(20 + i * 46, 300 - (i % 3) * 40, 34, 200);
    pixelSprite(x, SPR_KNIGHT, 16, 70, 120, { h: '#b8b8c8', v: '#202030', a: '#3a6ad8', s: '#d8d8e8', b: '#5a3a1a' });
    x.fillStyle = '#ffd040'; x.font = 'bold 32px Impact, sans-serif'; x.textAlign = 'center'; x.fillText('PIXEL KNIGHT II', w / 2, 66); x.fillStyle = '#fff'; x.font = '16px monospace'; x.fillText('THE DARK TOWER', w / 2, 92);
  });
  ROOM_ART.blocks = artTex(300, 420, (x, w, h) => {
    x.fillStyle = '#121212'; x.fillRect(0, 0, w, h);
    const cols = ['#e83a3a', '#3ae86a', '#3a8ae8', '#e8d83a', '#d83ae8', '#3ae8e8', '#e8903a'];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 10; c++) { if ((r * 7 + c * 3) % 11 < 2 && r < 3) continue; x.fillStyle = cols[(r * 3 + c * 5) % 7]; x.fillRect(25 + c * 25, 190 + r * 25, 23, 23); }
    x.fillStyle = cols[2]; for (const [c, r] of [[4, -3], [5, -3], [6, -3], [5, -4]]) x.fillRect(25 + c * 25, 190 + r * 25, 23, 23);
    x.fillStyle = '#fff'; x.font = 'bold 38px Impact, sans-serif'; x.textAlign = 'center'; x.fillText('BLOCK DROP', w / 2, 70);
  });
  ROOM_ART.keepout = artTex(400, 160, (x, w, h) => {
    x.fillStyle = '#f0c818'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; for (let i = -4; i < 30; i++) { x.beginPath(); x.moveTo(i * 30, 0); x.lineTo(i * 30 + 15, 0); x.lineTo(i * 30 - 25, h); x.lineTo(i * 30 - 40, h); x.fill(); }
    x.fillStyle = '#f0c818'; x.fillRect(16, 16, w - 32, h - 32); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 52px Impact, sans-serif'; x.fillText("JIM'S ROOM", w / 2, 76); x.font = 'bold 34px Impact, sans-serif'; x.fillStyle = '#b01010'; x.fillText('KEEP OUT', w / 2, 120);
  });
  ROOM_ART.blueprint = artTex(512, 360, (x, w, h) => {
    x.fillStyle = '#1c4a8a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; for (let i = 0; i < w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.strokeStyle = '#eef4ff'; x.lineWidth = 4; x.strokeRect(40, 40, 330, 240); x.lineWidth = 2.5;
    for (const [a, b, c, d] of [[160, 40, 160, 160], [40, 160, 250, 160], [250, 40, 250, 280], [250, 200, 370, 200]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
    x.lineWidth = 1.5; for (const [cx, cy, r, a0] of [[160, 120, 30, Math.PI / 2], [210, 160, 30, Math.PI], [250, 240, 28, -Math.PI / 2]]) { x.beginPath(); x.arc(cx, cy, r, a0, a0 + Math.PI / 2); x.stroke(); }
    x.fillStyle = '#eef4ff'; x.font = '11px monospace'; x.fillText('LIVING', 70, 220); x.fillText('KITCHEN', 175, 100); x.fillText('ENTRY', 290, 130); x.fillText('DINING', 290, 245);
    x.strokeRect(390, 250, 105, 92); x.font = 'bold 11px monospace'; x.fillText('DRENNEN RES.', 396, 270); x.font = '10px monospace'; x.fillText('DRAWN: J. DRENNEN', 396, 290); x.fillText('SCALE 1/4"=1\'', 396, 306); x.fillText('SHEET A-1', 396, 322);
    x.strokeStyle = '#eef4ff'; x.beginPath(); x.moveTo(40, 300); x.lineTo(370, 300); x.stroke(); x.fillText("47'-6\"", 190, 316);
  });
  ROOM_ART.sketchA = artTex(256, 320, (x, w, h) => {
    x.fillStyle = '#f2eee4'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,40,48,0.75)'; x.lineWidth = 1.4;
    const L = (a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
    L(20, 180, 236, 160); L(20, 180, 128, 120); L(236, 160, 128, 120);   // perspective guides
    L(60, 260, 60, 175); L(60, 175, 128, 140); L(128, 140, 200, 165); L(200, 165, 200, 255); L(60, 260, 128, 290); L(128, 290, 200, 255); L(128, 290, 128, 205); L(60, 175, 128, 205); L(128, 205, 200, 165);
    L(60, 175, 95, 110); L(95, 110, 160, 85); L(160, 85, 200, 165); L(95, 110, 128, 140);
    for (let i = 0; i < 4; i++) L(140 + i * 14, 215 - i * 5, 140 + i * 14, 250 - i * 5);
    x.fillStyle = '#333'; x.font = 'italic 14px Georgia, serif'; x.fillText('barn - 2pt persp.', 18, 30);
  });
  ROOM_ART.sketchB = artTex(256, 320, (x, w, h) => {
    x.fillStyle = '#f2eee4'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,40,48,0.8)'; x.lineWidth = 1.6;
    x.beginPath(); x.arc(128, 80, 34, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(94, 84); x.lineTo(162, 84); x.stroke();
    x.strokeRect(98, 118, 60, 80); x.beginPath(); x.moveTo(98, 130); x.lineTo(60, 190); x.moveTo(158, 130); x.lineTo(204, 110); x.lineTo(214, 40); x.moveTo(110, 198); x.lineTo(100, 280); x.moveTo(146, 198); x.lineTo(158, 280); x.stroke();
    x.fillStyle = '#333'; x.font = 'italic 14px Georgia, serif'; x.fillText('Sir Pix - concept', 18, 300);
  });
  return ROOM_ART;
}
// a flat picture hung on a wall: ry turns the plane so it faces into the room
function wallArt(root, x, y, z, ry, tex, w, h, frame = 'darkWood', glow = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? tex : null, emissiveIntensity: glow });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.z = 0.006; p.receiveShadow = true; g.add(p);
  if (frame) for (const [fx, fy, fw, fh] of [[0, h / 2 + 0.012, w + 0.05, 0.025], [0, -h / 2 - 0.012, w + 0.05, 0.025], [-w / 2 - 0.012, 0, 0.025, h], [w / 2 + 0.012, 0, 0.025, h]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.02), MATS[frame]); b.position.set(fx, fy, 0.005); g.add(b); }
  root.add(g); return g;
}
// a glowing screen or label set into a piece of furniture (local coords of fur frame f with rotation fry)
function furArt(root, f, fry, lx, ly, lz, w, h, tex, glow = 0, rx = 0) {
  const [x, z] = f.pt(lx, lz);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? tex : null, emissiveIntensity: glow });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, FA1 + ly, z); p.rotation.set(rx, fry + Math.PI, 0, 'YXZ'); root.add(p); return p;
}
function rosette(gb, x, y, z, mat) {   // a show ribbon pinned to a wall that faces -z
  gb.add(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 18), mat4(x, y, z - 0.008, 0, Math.PI / 2), mat, false);
  gb.add(new THREE.CylinderGeometry(0.035, 0.035, 0.016, 14), mat4(x, y, z - 0.014, 0, Math.PI / 2), 'paper', false);
  for (const a of [-0.18, 0.18]) gb.box(mat, x + a * 0.15, y - 0.12, z - 0.006, 0.035, 0.15, 0.004, 0, 0, a);
}

function buildClaireRoom(gb, root) {
  const Y = FA1, F = (x, z, ry = 0) => fur(gb, x, z, ry, Y), A = roomArt();
  // bed under the window, horse-print quilt, plush horse on the pillow and a hat on the bedpost
  { const f = F(6.62, 1.15, 0); bed(f, 0.95, 1.95, 'beddingHorse', 'lightWood'); f.solid(-0.5, -1.0, 0.5, 1.0, 0.6);
    f.cyl('hatTan', 0.505, 0.83, 0.995, 0.19, 0.19, 0.015, 18); f.cyl('hatTan', 0.505, 0.9, 0.995, 0.085, 0.1, 0.13, 14); f.cyl('leatherDark', 0.505, 0.86, 0.995, 0.102, 0.102, 0.025, 14); }
  prop('horsePlush', 6.62, Y + 0.57, 0.55, 0.4);
  // nightstand with a lamp and a white horse
  { const f = F(6.38, 2.5, -Math.PI / 2); nightstand(f); tableLamp(f, 0.12, 0.585, 0.05); f.solid(-0.27, -0.23, 0.27, 0.23, 0.6); }
  prop('horseWhite', 6.36, Y + 0.585, 2.36, 1.2);
  // saddle on its wooden stand by the front wall
  { const f = F(7.95, 0.52, 0);
    for (const a of [-0.26, 0.26]) for (const b of [-1, 1]) f.box('lightWood', a, 0.4, b * 0.1, 0.05, 0.84, 0.05, 0, b * 0.22);
    f.box('lightWood', 0, 0.82, 0, 0.72, 0.08, 0.1); f.box('lightWood', 0, 0.3, 0, 0.5, 0.04, 0.04);
    f.box('blanketRed', 0, 0.875, 0, 0.62, 0.02, 0.24); for (const b of [-1, 1]) f.box('blanketRed', 0, 0.74, b * 0.15, 0.62, 0.3, 0.015, 0, b * 0.35);
    f.sphere('leather', 0, 0.9, 0, 0.2, 1.45, 0.34, 0.85);
    f.box('leather', 0.17, 0.96, 0, 0.1, 0.09, 0.24, 0, 0, -0.3); f.box('leather', -0.23, 0.97, 0, 0.06, 0.13, 0.3, 0, 0, 0.45);   // pommel and cantle
    f.cyl('leatherDark', 0.2, 1.03, 0, 0.022, 0.026, 0.1, 10); f.cyl('leatherDark', 0.2, 1.085, 0, 0.045, 0.045, 0.018, 12);         // horn
    for (const b of [-1, 1]) { f.box('leather', 0.0, 0.68, b * 0.19, 0.24, 0.4, 0.02, 0, b * 0.22); f.box('leatherDark', 0.0, 0.62, b * 0.215, 0.05, 0.42, 0.012, 0, b * 0.18);
      const [x, z] = f.pt(0, b * 0.24); gb.add(new THREE.TorusGeometry(0.055, 0.012, 6, 14), mat4(x, Y + 0.42, z, 0), 'lightWood', false); }
    f.solid(-0.38, -0.3, 0.38, 0.3, 1.1); }
  // hobby horse in the corner and riding boots by the bed
  { const f = F(9.18, 0.24, 0); f.cyl('lightWood', 0, 0.48, 0, 0.014, 0.014, 0.98, 6, 0, 0.12); f.box('horseGray', -0.06, 0.98, 0, 0.09, 0.2, 0.06, 0, 0, 0.3); f.box('horseGray', -0.12, 1.02, 0, 0.16, 0.07, 0.055, 0, 0, -0.6); f.box('ribbonPurple', -0.03, 1.02, 0, 0.03, 0.18, 0.062, 0, 0, 0.3); }
  for (const [x, z, r] of [[7.36, 2.42, 0.2], [7.5, 2.48, -0.1]]) { const f = F(x, z, r); f.box('leather', 0, 0.035, -0.04, 0.09, 0.07, 0.25); f.cyl('leather', 0, 0.24, 0.05, 0.055, 0.05, 0.36, 10); }
  // display shelf of horse figurines on the side wall
  { const f = F(9.18, 3.78, Math.PI / 2);
    f.box('whitePaint', 0, 0.95, 0.14, 1.1, 1.9, 0.02); for (const a of [-0.54, 0.54]) f.box('whitePaint', a, 0.95, 0, 0.03, 1.9, 0.3);
    const kinds = ['horseBay', 'horseBlack', 'horseWhite', 'horsePalo', 'horseGray'];
    let k = 0;
    for (let i = 0; i < 5; i++) {
      const y = 0.04 + i * 0.44; f.box('whitePaint', 0, y, 0, 1.08, 0.03, 0.3);
      if (i === 0) continue;
      for (const lx of [-0.34, 0, 0.34]) { const [x, z] = f.pt(lx + (k % 2 ? 0.03 : -0.03), -0.02); prop(kinds[k % 5], x, Y + y + 0.015, z, Math.PI / 2 + (k % 3 - 1) * 0.5); k++; }
    }
    f.solid(-0.56, -0.16, 0.56, 0.16, 2); }
  // dresser crowded with ribbons, a trophy and more horses
  { const f = F(8.35, 4.72, 0); dresser(f); f.solid(-0.7, -0.25, 0.7, 0.25, 1); }
  prop('horseBig', 7.92, Y + 0.925, 4.74, 0.3); prop('trophy', 8.3, Y + 0.925, 4.8); prop('horseBlack', 8.62, Y + 0.925, 4.62, 2.6); prop('horsePalo', 8.0, Y + 0.925, 4.55, -0.4); prop('brush', 8.86, Y + 0.925, 4.78, 0.3); prop('horseshoe', 8.62, Y + 0.925, 4.84, 0.8);
  [['ribbonBlue', 7.85], ['ribbonRed', 8.15], ['ribbonYellow', 8.45], ['ribbonPurple', 8.75]].forEach(([m, x]) => rosette(gb, x, Y + 1.5, 4.94, m));
  wallArt(root, 8.3, Y + 1.98, 4.94, Math.PI, A.claire, 0.9, 0.25, null);
  // posters, a calendar left on October 2009, a lucky horseshoe over the door and a bridle on its hook
  wallArt(root, 7.95, Y + 1.7, 0.1, 0, A.wild, 1.0, 0.7, 'whitePaint');
  wallArt(root, 6.11, Y + 1.55, 2.6, Math.PI / 2, A.love, 0.5, 0.67, null);
  wallArt(root, 7.46, Y + 1.5, 4.4, Math.PI / 2, A.cal, 0.34, 0.48, null);
  gb.add(new THREE.TorusGeometry(0.075, 0.014, 6, 16, Math.PI * 1.25), mat4(9.32, Y + 2.28, 2.45, Math.PI / 2, 0, -Math.PI * 1.125), 'metal', false);
  gb.cyl('brass', 9.0, Y + 1.5, 0.12, 0.008, 0.008, 0.06, 6, 0, Math.PI / 2);
  gb.add(new THREE.TorusGeometry(0.11, 0.008, 5, 18), mat4(9.0, Y + 1.38, 0.13, 0), 'leatherDark', false);
  gb.add(new THREE.TorusGeometry(0.2, 0.007, 5, 22, Math.PI), mat4(9.0, Y + 1.28, 0.125, 0, 0, Math.PI), 'leatherDark', false);
  gb.cyl('metal', 9.0, Y + 1.27, 0.14, 0.006, 0.006, 0.09, 6, 0, 0, Math.PI / 2);
  rug(gb, 7.9, 2.4, 1.8, 1.4, 0.3, Y);
  prop('horseBay', 7.6, Y, 2.0, 1.0); prop('horseGray', 8.25, Y, 1.75, -0.7);
}

function buildJimRoom(gb, root) {
  const Y = FA1, F = (x, z, ry = 0) => fur(gb, x, z, ry, Y), A = roomArt();
  { const f = F(14.85, 2.5, -Math.PI / 2); bed(f, 1.4, 2.0, 'beddingGame', 'darkWood'); f.solid(-0.75, -1.03, 0.75, 1.03, 0.7); }
  prop('sketchbook', 14.5, Y + 0.5, 2.3, 0.4); prop('handheld', 15.0, Y + 0.5, 2.85, -0.6);
  // drafting table against the front wall: tilted board with a blueprint, parallel rule, triangle and a clamp lamp
  { const ry = Math.PI, f = F(14.3, 0.52, ry), T = -0.4, n = [0, Math.cos(T), Math.sin(T)];
    for (const a of [-0.46, 0.46]) for (const b of [-0.27, 0.27]) f.box('metal', a, 0.43 + (b > 0 ? 0.07 : 0), b, 0.035, 0.86 + (b > 0 ? 0.14 : 0), 0.035);
    f.box('metal', 0, 0.2, 0, 0.9, 0.03, 0.03); for (const a of [-0.46, 0.46]) f.box('metal', a, 0.2, 0, 0.03, 0.03, 0.54);
    f.box('lightWood', 0, 0.97, 0, 1.05, 0.03, 0.72, 0, T);
    const on = (d, lift) => [0.97 + Math.sin(-T) * d + n[1] * lift, Math.cos(T) * d + n[2] * lift];
    { const [y, z] = on(0.04, 0.017), [wx, wz] = f.pt(0, z); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.56), new THREE.MeshStandardMaterial({ map: A.blueprint, roughness: 0.8 })); m.position.set(wx, Y + y, wz); m.rotation.set(T - Math.PI / 2, ry, Math.PI, 'YXZ'); m.receiveShadow = true; root.add(m); }
    { const [y, z] = on(-0.22, 0.03); f.box('metal', 0, y, z, 1.0, 0.012, 0.035, 0, T); }
    { const [y, z] = on(-0.08, 0.022); const [x, wz] = f.pt(0.22, z); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.26, 0); sh.lineTo(0, 0.16); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false }); g.rotateX(-Math.PI / 2); gb.add(g, mat4(x, Y + y, wz, ry, T), 'acrylic', false); }
    f.cyl('metal', -0.5, 1.2, 0.3, 0.012, 0.012, 0.5, 6); f.box('metal', -0.38, 1.44, 0.18, 0.03, 0.03, 0.4, 0.8, 0.3); f.cyl('toyGreen', -0.24, 1.36, 0.02, 0.04, 0.09, 0.12, 12, 0.5);
    f.solid(-0.53, -0.36, 0.53, 0.36, 1.1); }
  // stool
  { const f = F(14.3, 1.02, 0); f.cyl('blackPlastic', 0, 0.66, 0, 0.18, 0.17, 0.05, 16); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; f.box('metal', Math.cos(a) * 0.1, 0.32, Math.sin(a) * 0.1, 0.025, 0.66, 0.025, 0, Math.sin(a) * 0.2, -Math.cos(a) * 0.2); } f.cyl('metal', 0, 0.25, 0, 0.13, 0.13, 0.015, 14); f.solid(-0.15, -0.15, 0.15, 0.15, 0.7); }
  // rolling supply cart with pencils, rulers and triangles
  { const f = F(15.45, 0.44, Math.PI); f.box('toyRed', 0, 0.34, 0, 0.5, 0.58, 0.4); f.box('metal', 0, 0.645, 0, 0.52, 0.02, 0.42); for (let i = 0; i < 3; i++) f.box('metal', 0, 0.16 + i * 0.18, -0.205, 0.4, 0.012, 0.01); for (const a of [-0.2, 0.2]) for (const b of [-0.15, 0.15]) f.cyl('blackPlastic', a, 0.025, b, 0.025, 0.025, 0.03, 8, Math.PI / 2); f.solid(-0.26, -0.21, 0.26, 0.21, 0.7); }
  prop('pencilcup', 15.32, Y + 0.655, 0.36); prop('triangle', 15.55, Y + 0.655, 0.5, 0.3); prop('ruler', 15.45, Y + 0.67, 0.6, 0.1); prop('triangle', 15.5, Y + 0.67, 0.3, 1.9);
  wallArt(root, 13.85, Y + 1.7, 0.1, 0, A.sketchA, 0.3, 0.38, null); wallArt(root, 14.3, Y + 1.78, 0.1, 0.05, A.blueprint, 0.5, 0.35, null); wallArt(root, 14.78, Y + 1.66, 0.1, -0.04, A.sketchB, 0.3, 0.38, null);
  // gaming desk: an old TV paused mid-level, two consoles, controllers and stacks of games
  { const ry = 0, f = F(13.55, 4.68, ry);
    f.box('darkWood', 0, 0.73, 0, 1.4, 0.04, 0.56); for (const a of [-0.67, 0.67]) f.box('darkWood', a, 0.36, 0, 0.04, 0.72, 0.52); f.box('darkWood', 0, 0.36, 0.25, 1.3, 0.6, 0.02);
    f.box('grayPlastic', -0.4, 0.97, 0.04, 0.5, 0.44, 0.44); f.box('blackPlastic', -0.4, 0.97, -0.18, 0.46, 0.4, 0.01);
    furArt(root, f, ry, -0.4, 0.98, -0.186, 0.38, 0.29, A.tv, 0.9);
    f.box('blackPlastic', 0.33, 0.785, 0.02, 0.3, 0.07, 0.22); f.box('screen', 0.33, 0.785, -0.091, 0.12, 0.01, 0.002); f.box('consolePurple', 0.58, 0.81, 0.08, 0.16, 0.12, 0.16);
    f.solid(-0.7, -0.28, 0.7, 0.28, 1.2); }
  prop('controller', 13.55, Y + 0.75, 4.49, 0.2); prop('controller', 13.92, Y + 0.75, 4.47, -0.4);
  prop('gamecase', 13.55, Y + 0.75, 4.76); prop('gamecase', 13.55, Y + 0.767, 4.76, 0.1); prop('gamecase', 13.55, Y + 0.784, 4.76, -0.08); prop('cart', 14.14, Y + 0.75, 4.48, 0.5); prop('cart', 13.12, Y + 0.75, 4.45, -0.3);
  // gaming chair facing the TV
  { const f = F(13.55, 4.1, Math.PI);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; f.box('blackPlastic', Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15, 0.3, 0.03, 0.05, -a); }
    f.cyl('metal', 0, 0.25, 0, 0.025, 0.025, 0.4, 8); f.box('blackPlastic', 0, 0.47, 0, 0.5, 0.08, 0.48); f.box('chairRed', 0, 0.52, 0, 0.42, 0.03, 0.4);
    f.box('blackPlastic', 0, 0.92, 0.23, 0.48, 0.8, 0.08, 0, 0.1); f.box('chairRed', 0, 0.92, 0.185, 0.18, 0.66, 0.01, 0, 0.1); for (const a of [-0.27, 0.27]) f.box('blackPlastic', a, 0.64, 0.02, 0.05, 0.03, 0.32);
    f.solid(-0.28, -0.28, 0.28, 0.28, 1.2); }
  // a controller and a couple of games left on the floor
  prop('controller', 13.45, Y, 2.3, 2.1); prop('gamecase', 13.05, Y, 1.85, 0.6); prop('gamecase', 13.2, Y, 3.0, -0.4);
  // shelf of games on the side wall
  { const f = F(12.63, 3.0, -Math.PI / 2), cols = ['toyRed', 'toyBlue', 'toyYellow', 'toyGreen', 'consolePurple', 'blackPlastic', 'grayPlastic'];
    f.box('darkWood', 0, 0.8, 0.14, 1.0, 1.6, 0.02); for (const a of [-0.49, 0.49]) f.box('darkWood', a, 0.8, 0, 0.03, 1.6, 0.3);
    for (let i = 0; i < 4; i++) {
      const y = 0.04 + i * 0.4; f.box('darkWood', 0, y, 0, 0.98, 0.03, 0.3);
      let x = -0.45; while (x < 0.4) { const w = 0.018 + (WR() < 0.3 ? 0.02 : 0); if (WR() < 0.1) { x += 0.07; continue; } f.box(cols[(WR() * cols.length) | 0], x + w / 2, y + 0.015 + 0.095, -0.02, w, 0.19, 0.135); x += w + 0.003; }
    }
    f.box('darkWood', 0, 1.62, 0, 1.04, 0.04, 0.34); f.solid(-0.5, -0.16, 0.5, 0.16, 1.7);
    const [x, z] = f.pt(-0.25, 0); prop('handheld', x, Y + 1.64, z, 0.4); const [x2, z2] = f.pt(0.2, 0); prop('cart', x2, Y + 1.64, z2, 1.2); }
  // arcade cabinet in the corner, still running its attract screen
  { const ry = Math.PI / 2, f = F(15.55, 4.5, ry);
    f.box('blackPlastic', 0, 0.88, 0.05, 0.62, 1.76, 0.6); for (const a of [-0.315, 0.315]) f.box('consolePurple', a, 0.9, 0.0, 0.012, 1.8, 0.72);
    f.box('blackPlastic', 0, 0.98, -0.32, 0.6, 0.06, 0.26, 0, -0.25);
    f.cyl('blackPlastic', -0.12, 1.06, -0.36, 0.008, 0.008, 0.08, 6); f.sphere('toyRed', -0.12, 1.1, -0.36, 0.022); for (const [a, m] of [[0.05, 'toyRed'], [0.12, 'toyBlue'], [0.19, 'toyYellow']]) f.cyl(m, a, 1.03, -0.34, 0.016, 0.016, 0.02, 10);
    furArt(root, f, ry, 0, 1.38, -0.255, 0.46, 0.5, A.arcade, 1.0, -0.12); furArt(root, f, ry, 0, 1.68, -0.257, 0.58, 0.16, A.marquee, 1.2);
    f.solid(-0.33, -0.45, 0.33, 0.36, 1.8);
    // easter egg: a VHS tape left on top of the cabinet
    const [ex, ez] = f.pt(0.06, -0.1), tape = new THREE.Group(); tape.position.set(ex, Y + 1.775, ez); tape.rotation.y = ry + 0.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.025, 0.105), MATS.blackPlastic); body.castShadow = true; tape.add(body);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.07), new THREE.MeshStandardMaterial({ map: artTex(256, 120, (x, w, h) => { x.fillStyle = '#efe9d6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c02020'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#1a1a1a'; x.font = 'bold 30px "Comic Sans MS", cursive'; x.textAlign = 'center'; x.fillText('DO NOT PLAY', w / 2, 52); x.font = '20px "Comic Sans MS", cursive'; x.fillText('- J', w / 2 + 70, 92); }), roughness: 0.8 }));
    lab.rotation.x = -Math.PI / 2; lab.position.y = 0.0131; tape.add(lab);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.26), PROP_HIT_MAT); tape.add(hit); root.add(tape);
    INTERACT.push({ mesh: hit, kind: 'egg', id: 0}); }
  wallArt(root, 13.15, Y + 1.78, 4.94, Math.PI, A.knight, 0.45, 0.63, null); wallArt(root, 13.95, Y + 1.78, 4.94, Math.PI, A.blocks, 0.45, 0.63, null);
  wallArt(root, 15.89, Y + 1.6, 1.0, -Math.PI / 2, A.knight, 0.42, 0.59, 'blackPlastic');
  wallArt(root, 12.47, Y + 1.98, 3.0, Math.PI / 2, A.keepout, 0.6, 0.24, null);
}
