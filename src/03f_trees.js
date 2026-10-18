// ---------------------------------------------------------------- model trees, drawn instanced
// Maps call fir()/snag() while they build; placeTrees() then loads each pack once and draws every tree of a
// kind with one InstancedMesh per part (bark, branches), so a whole treeline costs a handful of draw calls.
const TREE_PACKS = {
  // nine firs, three of each size; near trees use LOD1, the distant treeline LOD2 (the loader turns spaces in names into _)
  fir: { url: 'prop-firs.json', kinds: { L: ['Large_tree_1', 'Large_tree_2', 'Large_tree_3'], M: ['Medium_tree_1', 'Medium_tree_2', 'Medium_tree_3'], S: ['Small_tree_1', 'Small_tree_2', 'Small_tree_3'] } },
  // seven dead, moss-stripped swamp trees, normalised to a common height
  snag: { url: 'prop-swamptrees.json', kinds: { D: ['tree1', 'tree2', 'tree3', 'tree4', 'tree5', 'tree6', 'tree7'] }, height: 9 },
};
const TREE_LIST = [];   // { pack, node, lod, x, y, z, ry, s }, reset by buildWorld
function addTree(pack, kind, lod, x, z, s, y) {
  const names = TREE_PACKS[pack].kinds[kind], node = names[(WR() * names.length) | 0];
  if (y === undefined) y = terrainY(x, z);
  TREE_LIST.push({ pack, node, lod, x: MIRROR_X !== null ? MIRROR_X - x : x, y, z, ry: WR() * 6.28, s });
}
// a fir that blocks the player (s ~1 is a 9 m tree); far ones are cheap backdrop with no collider
function fir(x, z, s, far) {
  addTree('fir', s >= 1.15 ? 'L' : s >= 0.8 ? 'M' : 'S', far ? '_LOD2' : '_LOD1', x, z, s);
  if (!far) addCollider(x - 0.3 * s, z - 0.3 * s, x + 0.3 * s, z + 0.3 * s, 6, false, terrainY(x, z) - 1);
}
function snag(x, z, s, y) {
  addTree('snag', 'D', '', x, z, s, y);
  addCollider(x - 0.35 * s, z - 0.35 * s, x + 0.35 * s, z + 0.35 * s, 6, false, (y ?? terrainY(x, z)) - 1);
}
// a ragged belt of distant firs around a box, skipping the given no-tree rectangles [x0, z0, x1, z1]
function firBelt(box, n, avoid = [], m0 = 4, m1 = 18) {
  const [x0, z0, x1, z1] = box; let k = 0;
  for (let t = 0; t < n * 20 && k < n; t++) {
    const x = x0 - m1 + WR() * (x1 - x0 + 2 * m1), z = z0 - m1 + WR() * (z1 - z0 + 2 * m1);
    const d = Math.max(x0 - x, x - x1, z0 - z, z - z1); if (d < m0) continue;
    if (avoid.some(([a, b, c, e]) => x > a && x < c && z > b && z < e)) continue;
    fir(x, z, 0.8 + WR() * 0.6, true); k++;
  }
}
const TREE_TPL = {};
// one tree out of a pack as a list of { geo, mat } with its trunk base at the origin
function treeParts(pack, P, node, lod) {
  const key = node + lod; if (P.parts[key]) return P.parts[key];
  const v = P.m.getObjectByName(node); if (!v) return null;
  let src = v; if (lod) v.traverse(o => { if (o.name && o.name.endsWith(lod) && src === v) src = o; });
  const parts = []; src.traverse(o => { if (o.isMesh) parts.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), mat: o.material, bark: /bark/i.test(o.material.name || o.name) }); });
  const all = new THREE.Box3(); for (const q of parts) { q.geo.computeBoundingBox(); all.union(q.geo.boundingBox); }
  const bark = parts.find(q => q.bark) || parts[0], c = bark.geo.boundingBox.getCenter(new V3()), h = all.max.y - all.min.y;
  const k = TREE_PACKS[pack].height ? TREE_PACKS[pack].height / h : 1;
  for (const q of parts) { q.geo.translate(-c.x, -all.min.y, -c.z); q.geo.scale(k, k, k); q.geo.computeBoundingSphere(); }
  return (P.parts[key] = parts);
}
function placeTrees(root) {
  const byPack = {}; for (const t of TREE_LIST) (byPack[t.pack] = byPack[t.pack] || []).push(t);
  for (const pack in byPack) {
    const list = byPack[pack], go = P => {
      if (!WORLD || WORLD.root !== root) return;
      const groups = {}; for (const t of list) (groups[t.node + t.lod] = groups[t.node + t.lod] || []).push(t);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), up = new V3(0, 1, 0);
      for (const key in groups) {
        const ts = groups[key], parts = treeParts(pack, P, ts[0].node, ts[0].lod); if (!parts) continue;
        for (const part of parts) {
          const im = new THREE.InstancedMesh(part.geo, P.mats.get(part.mat), ts.length);
          ts.forEach((t, i) => { q.setFromAxisAngle(up, t.ry); sc.setScalar(t.s); m4.compose(new V3(t.x, t.y - 0.05, t.z), q, sc); im.setMatrixAt(i, m4); });
          im.castShadow = ts[0].lod !== '_LOD2'; im.receiveShadow = true; im.computeBoundingSphere(); root.add(im);
        }
      }
    };
    const P = TREE_TPL[pack];
    if (P && P.m) { queueMicrotask(() => go(P)); continue; }
    if (P) { P.wait.push(go); continue; }
    const W = TREE_TPL[pack] = { wait: [go], parts: {}, mats: new Map() };
    loadModelFile(TREE_PACKS[pack].url, gl => {
      const m = gl.scene; m.updateMatrixWorld(true);
      m.traverse(o => { if (o.isMesh && !W.mats.has(o.material)) { const lm = leanMat(o.material); lm.side = THREE.DoubleSide; W.mats.set(o.material, lm); } });
      W.m = m; for (const f of W.wait) f(W); W.wait = [];
    }, e => { console.warn('trees', pack, e); delete TREE_TPL[pack]; });
  }
}
