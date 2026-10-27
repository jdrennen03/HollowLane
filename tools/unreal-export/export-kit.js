// Builds the Unreal export kit from the running game: each map's static world as a .glb (with named marker empties) plus
// its layout as JSON, every procedural sound effect rendered to WAV, and the game data (ghosts, evidence, items, spirit box)
// as JSON and CSV. Models and recorded sounds are copied/converted by make-kit.sh.
//   usage: node tools/unreal-export/export-kit.js <outDir>
// Needs playwright (or playwright-core) with a Chromium (CHROMIUM env var to pick the executable), and three in
// desktop/node_modules.
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require('playwright')); } const fs = require('fs'), path = require('path'), http = require('http'), { execSync } = require('child_process');
const repo = path.resolve(__dirname, '../..'), out = path.resolve(process.argv[2] || 'unreal-kit');
const MAPS = (process.env.MAPS || 'lane,farm,bayou,barn,myrtles').split(',');
for (const d of ['maps', 'sounds/generated', 'data']) fs.mkdirSync(path.join(out, d), { recursive: true });
execSync('node build.js', { cwd: repo });
// serve test.html, the assets flat beside it, and three under /three/ (the layout the game expects)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = u === '/test.html' ? path.join(repo, 'test.html') : u.startsWith('/three/') ? path.join(repo, 'desktop/node_modules/three', u.slice(7)) : path.join(repo, 'assets', path.basename(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0);
const base = 'http://localhost:' + server.address().port;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } }); p.on('pageerror', e => console.log('PAGEERR: ' + e.message));
  const parts = {}; await p.exposeFunction('saveChunk', (name, i, n, b64) => { (parts[name] = parts[name] || [])[i] = Buffer.from(b64, 'base64'); if (parts[name].filter(Boolean).length === n) { fs.writeFileSync(path.join(out, name), Buffer.concat(parts[name])); delete parts[name]; } });
  await p.goto(base + '/test.html', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__HL, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  // helper in the page: send a binary file back to node in pieces
  await p.evaluate(() => { window.__send = async (name, u8) => { const C = 6 << 20, n = Math.ceil(u8.length / C) || 1; for (let i = 0; i < n; i++) { let s = ''; const c = u8.subarray(i * C, (i + 1) * C); for (let k = 0; k < c.length; k += 32768) s += String.fromCharCode.apply(null, c.subarray(k, k + 32768)); await window.saveChunk(name, i, n, btoa(s)); } }; });

  for (const map of MAPS) {
    await p.evaluate(m => __HL.beginGame({ map: m, gm: 0, seed: 3, ghostIdx: 0, ghostRoom: 1, roster: [{ slot: 0, nick: 'T', peer: 'solo' }], mySlot: 0, mp: false, host: true }), map);
    await p.waitForTimeout(25000);   // models stream in and the props settle
    const info = await p.evaluate(async (map) => {
      const H = __HL, T = H.THREE, G = H.G, { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      const gs = G.gs; gs.wait = gs.interactT = gs.eventT = gs.huntCheckT = 1e9;
      const root = H.WORLD.root, undo = [];
      // props become markers (they are physics objects in the game), doors get names, instanced meshes become plain meshes
      for (const pr of H.PROPO) if (pr.mesh.visible) { pr.mesh.visible = false; undo.push(() => pr.mesh.visible = true); }
      H.DOORS.forEach((D, i) => { if (D.g) D.g.name = 'DOOR_' + i; });
      const inst = []; root.traverse(o => { if (o.isInstancedMesh) inst.push(o); });
      for (const im of inst) {
        const g = new T.Group(); g.name = (im.name || 'instanced') + '_x' + im.count; g.position.copy(im.position); g.quaternion.copy(im.quaternion); g.scale.copy(im.scale);
        // per-instance tints (the cypress leaf cards) are kept by sorting the instances into a few shared tinted materials
        const m = new T.Matrix4(), c = new T.Color(), tints = new Map(), matFor = i => {
          if (!im.instanceColor) return im.material;
          im.getColorAt(i, c); const k = [c.r, c.g, c.b].map(v => Math.round(v * 6)).join(',');
          if (!tints.has(k)) { const t = im.material.clone(); t.color.multiply(new T.Color(...k.split(',').map(v => v / 6))); tints.set(k, t); }
          return tints.get(k); };
        for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); const mm = new T.Mesh(im.geometry, matFor(i)); mm.applyMatrix4(m); g.add(mm); }
        im.parent.add(g); im.visible = false; undo.push(() => { im.parent.remove(g); im.visible = true; });
      }
      // marker empties: their names say what they are; their positions come through any glTF importer in its own axes
      const MK = new T.Group(); MK.name = 'MARKERS'; root.add(MK); undo.push(() => root.remove(MK));
      const mark = (name, x, y, z, ry = 0, extras) => { const o = new T.Object3D(); o.name = name; o.position.set(x, y, z); o.rotation.y = ry; if (extras) o.userData = extras; MK.add(o); };
      const R = H.ROOMS, lv = H.MAP.levels || [0];
      R.forEach((r, i) => { const y = r.y ?? lv[r.lv || 0] ?? 0;
        mark('ROOM_' + r.id, (r.r[0] + r.r[2]) / 2, y, (r.r[1] + r.r[3]) / 2, 0, { name: r.name, rect: r.r, closet: !!r.closet, outdoor: !!r.outdoor });
        mark('ROOMCORNER_' + r.id + '_min', r.r[0], y, r.r[1]); mark('ROOMCORNER_' + r.id + '_max', r.r[2], y + 2.6, r.r[3]);
        if (r.lamp) mark('LAMP_' + r.id, r.lamp[0], y + 2.3, r.lamp[1]); if (r.sw) mark('SWITCH_' + r.id, r.sw[0], y + 1.25, r.sw[1]); });
      mark('TENT', H.TENT.x, 0, H.TENT.z);
      H.ITEMS.forEach((it, i) => { const q = it.obj.getWorldPosition(new T.Vector3()); mark('ITEM_' + it.type + '_' + i, q.x, q.y, q.z, it.ry); });
      H.PROPO.forEach((pr, i) => { const q = pr.mesh.position; mark('PROP_' + (pr.type || H.PROPS[i]?.type || 'prop') + '_' + i, q.x, q.y, q.z, pr.mesh.rotation.y); });
      const P = H.me(); mark('PLAYER_START', P.pos.x, P.pos.y, P.pos.z, P.yaw || 0);
      root.updateMatrixWorld(true);
      const glb = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true, onlyVisible: true, maxTextureSize: 2048 }));
      await window.__send('maps/' + map + '.glb', new Uint8Array(glb));
      for (const f of undo.reverse()) f();
      // layout data, in the game's own metres (three.js: y up)
      const M = H.MAP, pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
      const layout = { id: map, title: M.title, units: 'metres, y up (three.js); see README for Unreal axes', levels: M.levels, tent: H.TENT, lure: M.lure,
        rooms: R.map(r => pick(r, ['id', 'name', 'r', 'lv', 'y', 'floor', 'wall', 'sw', 'lamp', 'closet', 'parent', 'door', 'outdoor', 'noGhost', 'chandelier'])),
        walls: M.walls, doors: M.doors, stairs: M.stairs, slabs: M.slabs,
        colliders: H.COLL.map(c => pick(c, ['x0', 'z0', 'x1', 'z1', 'y0', 'y1', 'h', 'furn'])),
        props: H.PROPO.map((pr, i) => ({ type: pr.type || H.PROPS[i]?.type, pos: pr.mesh.position.toArray().map(v => +v.toFixed(3)), ry: +pr.mesh.rotation.y.toFixed(3) })),
        items: H.ITEMS.map(it => ({ type: it.type, pos: it.obj.getWorldPosition(new T.Vector3()).toArray().map(v => +v.toFixed(3)) })),
        windows: (H.WINDOWS || []).map(W => pick(W, ['alongX', 'c', 's', 'e', 'y0', 'y1', 'fy'])) };
      return { layout: JSON.stringify(layout, null, 1), inst: inst.length, kb: (glb.byteLength / 1024) | 0 };
    }, map);
    fs.writeFileSync(path.join(out, 'maps', map + '.json'), info.layout);
    console.log(map, info.kb + ' KB glb,', info.inst, 'instanced meshes expanded');
  }

  // every procedural sound effect, rendered to 16-bit WAV
  const snd = await p.evaluate(async () => {
    const H = __HL; H.initAudio(); await new Promise(r => setTimeout(r, 1500)); const B = H.AU.bufs, names = [];
    for (const [k, buf] of Object.entries(B)) {
      if (!buf || !buf.getChannelData) continue;
      // decoded copies of the recorded files ('f:<name>') are already in sounds/recorded, except the footsteps, which the game
      // cuts from one recording into ten steps per floor surface
      if (k.startsWith('f:') && !/^f:step_/.test(k)) continue;
      const fname = k.startsWith('f:') ? 'recorded_' + k.slice(2).replace(/(\d+)$/, '_$1') : k;
      const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, dv = new DataView(new ArrayBuffer(44 + n * ch * 2)), w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * ch * 2, true);
      const C = [...Array(ch).keys()].map(c => buf.getChannelData(c)); for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) dv.setInt16(44 + (i * ch + c) * 2, Math.max(-1, Math.min(1, C[c][i])) * 32767, true);
      await window.__send('sounds/generated/' + fname + '.wav', new Uint8Array(dv.buffer)); names.push(fname);
    }
    return names;
  });
  console.log(snd.length, 'generated sounds');

  // game data
  const data = await p.evaluate(() => { const H = __HL;
    return { ghosts: H.GHOSTS, evidence: H.EV.map(k => ({ key: k, name: H.EV_NAME[k], hint: H.EV_HINT[k] })), items: H.ITEM_TYPES.map(k => ({ key: k, name: H.ITEM_NAME[k] })),
      spiritBox: H.SB_ANSWERS, chances: { evidence: H.EV_CHANCE, trait: H.TRAIT_CHANCE }, ghostModels: H.GHOST_FILES,
      maps: Object.values(H.MAPS).map(m => ({ id: m.id, title: m.title, eyebrow: m.eyebrow, lede: m.lede })) }; });
  for (const [k, v] of Object.entries(data)) fs.writeFileSync(path.join(out, 'data', k + '.json'), JSON.stringify(v, null, 1));
  const keys = [...new Set(data.ghosts.flatMap(g => Object.keys(g)))], esc = v => { const s = v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(out, 'data', 'ghosts.csv'), [keys.join(','), ...data.ghosts.map(g => keys.map(k => esc(g[k])).join(','))].join('\n') + '\n');
  console.log('data:', Object.keys(data).join(', '));
  await b.close(); server.close();
})();
