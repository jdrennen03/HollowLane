// ---------------------------------------------------------------- tack that fits: built from the shape of the animal wearing it
// The imported animals have no tack attachment points, so the body is sampled instead: the visible model's vertices are
// read in the animal's own space (x across, y up, z toward the head) and sliced into cross-sections. The saddle sits in
// the dip of the back with its horn forward, on a pad that drapes over the barrel and a girth that wraps round it; the
// bridle's straps follow the outline of the face and ride on the head bone, so they move whenever the head does.
const _fv = new V3();
// the shown model's vertices in body space (a few thousand is plenty)
function stbPoints(A, M) {
  A.root.updateMatrixWorld(true);
  const inv = A.body.matrixWorld.clone().invert(), pts = [];
  M.traverse(o => {
    // every vertex (sparse samples leave holes along the spine), skipping hair cards: a mane isn't something a saddle sits on
    if (!o.isMesh || o.material.transparent || o.material.alphaTest > 0 || /hair/i.test(o.name + (o.material.name || ''))) return; const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 40000));
    if (o.isSkinnedMesh) o.skeleton.update();
    for (let i = 0; i < pos.count; i += step) { o.getVertexPosition(i, _fv); pts.push(_fv.applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); }
  });
  return pts;
}
// a slice through the points, perpendicular to `a` at `c`: the outline as a radius per angle round the slice's centre.
// u runs across the body (x), w = a × u; angle 0 is +u, a quarter turn is +w. Spikes (ears, a mane) are trimmed.
function stbSection(pts, c, a, half = 0.03, keep = null, N = 32) {
  const u = new V3(1, 0, 0).addScaledVector(a, -a.x).normalize(), w = new V3().crossVectors(a, u), sel = [], cen = new V3();
  for (const p of pts) { if (keep && !keep(p)) continue; const d = p.clone().sub(c), t = d.dot(a); if (Math.abs(t) > half) continue; sel.push(d.addScaledVector(a, -t)); }
  if (sel.length < 8) return null;
  for (const d of sel) cen.add(d); cen.divideScalar(sel.length);
  const rs = new Array(N).fill(0);
  for (const d of sel) { const e = d.clone().sub(cen), x = e.dot(u), y = e.dot(w), k = Math.floor(((Math.atan2(y, x) / (Math.PI * 2)) + 1) % 1 * N) % N; rs[k] = Math.max(rs[k], Math.hypot(x, y)); }
  const med = [...rs].filter(r => r > 0).sort((p, q) => p - q), m = med[med.length >> 1] || 0.1;
  for (let k = 0; k < N; k++) if (!rs[k] || rs[k] > m * 1.45) rs[k] = 0;
  for (let k = 0; k < N; k++) if (!rs[k]) { let a1 = 1, b1 = 1; while (!rs[(k - a1 + N) % N] && a1 < N) a1++; while (!rs[(k + b1) % N] && b1 < N) b1++; const ra = rs[(k - a1 + N) % N] || m, rb = rs[(k + b1) % N] || m; rs[k] = ra + (rb - ra) * a1 / (a1 + b1); }
  const C = c.clone().add(cen);
  return { c: C, u, w, at(th, off = 0) { const f = ((th / (Math.PI * 2)) % 1 + 1) % 1 * N, k0 = Math.floor(f) % N, k1 = (k0 + 1) % N, r = rs[k0] + (rs[k1] - rs[k0]) * (f - Math.floor(f)); return C.clone().addScaledVector(u, Math.cos(th) * (r + off)).addScaledVector(w, Math.sin(th) * (r + off)); } };
}
// a flat strap through a list of points; `side` is the direction the strap's width runs (along the limb or head it wraps)
function strapPath(g, mat, pts, side, wd = 0.03, th = 0.006, closed = false) {
  const n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = new V3().subVectors(b, a), L = d.length(); if (L < 1e-4) continue; d.divideScalar(L);
    const x = side.clone().addScaledVector(d, -side.dot(d)).normalize(), y = new V3().crossVectors(d, x);
    const m = new THREE.Mesh(new THREE.BoxGeometry(wd, th, L + 0.004), mat); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, d)); m.castShadow = true; g.add(m);
  }
}
const loopPts = (S, off, n = 32, a0 = 0, a1 = Math.PI * 2) => { const out = []; for (let i = 0; i <= n; i++) out.push(S.at(a0 + (a1 - a0) * i / n, off)); return out; };

// ---------- measuring an animal: the top line of the back, the head and its axis
function stbFit(A, M) {
  const pts = stbPoints(A, M), H = Math.max(...pts.map(p => p.y)), L = A.L, horse = A.def.kind === 'horse';
  // top line: the highest point near the spine every 4 cm along the body
  // a height map of the body seen from above (3 cm cells); the top line is its column along the spine
  const hm = new Map(), cell = 0.03, key = (i, j) => i * 100003 + j;
  for (const p of pts) { const k = key(Math.round(p.x / cell), Math.round(p.z / cell)); if (!hm.has(k) || hm.get(k) < p.y) hm.set(k, p.y); }
  const topAt = (x, z) => { const i = Math.round(x / cell), j = Math.round(z / cell); let v = hm.get(key(i, j)); if (v !== undefined) return v;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { v = hm.get(key(i + a, j + b)); if (v !== undefined) return v; } return null; };
  const backY = z => { let best = null; for (const dx of [-3, -2, -1, 0, 1, 2, 3]) for (const dz of [-1, 0, 1]) { const v = topAt(dx * cell, z + dz * cell); if (v !== null && (best === null || v > best)) best = v; } return best ?? H * 0.8; };
  // the dip of the back: the lowest top-line point in the middle of the body; the seat goes there
  let dipZ = 0, dipY = 1e9; for (let z = -0.22 * L; z <= 0.18 * L; z += 0.02) { const y = backY(z); if (y < dipY) { dipY = y; dipZ = z; } }
  // the head: the farthest-forward point at head height is the muzzle tip
  const hp = pts.filter(p => p.y > H * 0.45 && p.z > 0); let tip = hp[0]; for (const p of hp) if (p.z > tip.z) tip = p;
  const hl = L * (horse ? 0.26 : 0.27), head = pts.filter(p => p.distanceTo(tip) < hl * 1.15 && p.y > tip.y - 0.3);
  const mean = arr => arr.reduce((s, p) => s.add(p), new V3()).divideScalar(Math.max(1, arr.length));
  const Mz = mean(head.filter(p => tip.z - p.z < 0.07)), Qz = mean(head.filter(p => { const d = p.distanceTo(tip); return d > hl * 0.8 && d < hl * 1.05 && p.y > tip.y; }));
  const axis = Mz.clone().sub(Qz).normalize();   // back of the head -> muzzle
  const inHead = p => p.distanceTo(tip) < hl * 1.2;
  return { pts, H, L, backY, topAt, dipZ, dipY, tip, hl, Mz, Qz, axis, inHead, at: t => Mz.clone().addScaledVector(axis, -t) };
}
// the model currently standing in for this animal (Juniper swaps bodies), and its fit, measured once per body
function stbShown(A) { return A.home && A.homeM ? A.homeM : A.packM; }
function stbFitFor(A) {
  const M = stbShown(A); if (!M) return null;
  const key = M.uuid; if (A.fits && A.fits[key]) return A.fits[key];
  // measure the animated donkey in her standing pose, whatever clip happens to be playing
  if (A.mixer && M === A.homeM) { for (const n in A.acts) A.acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); A.mixer.setTime(0); }
  horseRest(A);
  const F = stbFit(A, M); F.bone = F.spine = null; M.traverse(o => { if (!o.isBone) return; if (!F.bone && /^Head_\d/.test(o.name)) F.bone = o; if (!F.spine && /^(Middle_01|DRoot|Spine_01)/.test(o.name)) F.spine = o; });
  (A.fits || (A.fits = {}))[key] = F; return F;
}
// where the rider sits (body space) and the withers the reins run back to
function stbSeat(A) { const F = A.fits && stbShown(A) && A.fits[stbShown(A).uuid]; return F ? { y: F.dipY + (A.saddle >= 0 ? 0.13 : 0.06), z: F.dipZ + 0.05 } : { y: A.H * A.def.seat[0], z: A.L * A.def.seat[1] }; }

// ---------- the saddle: model turned horn-forward, on a pad, with a girth
const SADDLE_LEN = 0.78, SADDLE_SEAT = 0.797;   // template length front to back; the height of its underside above the stirrups
function saddleOn(A, t) {
  const F = stbFitFor(A), g = new THREE.Group(); if (!F || !STB.saddleTpl) return g;
  const len = A.def.saddleLen || SADDLE_LEN, k = len / SADDLE_LEN, zs = F.dipZ + len * 0.12, zf = zs + len / 2, zr = zs - len / 2;
  const yb = F.backY(zs), slope = Math.atan2(F.backY(zf - 0.08) - F.backY(zr + 0.08), len - 0.16), pad = 0.025;
  const body = p => p.y > F.H * 0.33 && !(p.z > zf + 0.35);
  // pad: drapes over the barrel a little beyond the saddle on every side
  const rows = 7, cols = 22, pos = [], idx = [], padMat = MATS[t.i % 2 ? 'fabricBlue' : 'blanketRed'] || MATS.fabricBlue;
  for (let r = 0; r < rows; r++) {
    const z = zr - 0.06 + (len + 0.12) * r / (rows - 1), S = stbSection(F.pts, new V3(0, 0, z), new V3(0, 0, 1), 0.035, body);
    for (let c = 0; c < cols; c++) { const th = Math.PI / 2 + (c / (cols - 1) - 0.5) * 2 * 1.05, p = S ? S.at(th, 0.012) : new V3(Math.cos(th) * 0.3, yb - 0.3 + Math.sin(th) * 0.3, z); pos.push(p.x, p.y, p.z); }
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c; idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals();
  const pm = new THREE.Mesh(pg, padMat.clone()); pm.material.side = THREE.DoubleSide; pm.castShadow = pm.receiveShadow = true; g.add(pm);
  // the saddle itself: horn toward the head, its underside on the pad, tipped to follow the back
  const sad = STB.saddleTpl.m.clone(), sg = new THREE.Group(); sg.add(sad); sg.scale.setScalar(k);
  sg.position.set(0, 0, zs); sg.rotation.x = -slope * 0.8; g.add(sg);
  // lower it onto the pad: the lift that brings the lowest point of the skirt and seat down onto the back, and no lower
  g.updateMatrixWorld(true); let lift = -1e9; const v = new V3();
  sad.traverse(o => { if (!o.isMesh || !/skirt|seat/i.test(o.name)) return; const pp = o.geometry.attributes.position;
    for (let i = 0; i < pp.count; i += 2) { v.fromBufferAttribute(pp, i).applyMatrix4(o.matrixWorld); if (Math.abs(v.x) > 0.28) continue; const ty = F.topAt(v.x, v.z); if (ty !== null) lift = Math.max(lift, ty + pad - v.y); } });
  sg.position.y = lift > -1e8 ? lift : yb + pad - SADDLE_SEAT * k;
  // girth: a wide band right round the barrel, just behind the front legs
  const Sg = stbSection(F.pts, new V3(0, 0, zs + len * 0.18), new V3(0, 0, 1), 0.04, body);
  if (Sg) { const gm = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.85 }); strapPath(g, gm, loopPts(Sg, 0.014, 40, Math.PI / 2 + 0.9, Math.PI / 2 + 0.9 + (Math.PI * 2 - 1.8)), new V3(0, 0, 1), 0.085, 0.012);
    for (const s of [-1, 1]) { const p = Sg.at(Math.PI / 2 + s * 0.9, 0.02); const rg = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 14), MATS.chrome); rg.position.copy(p); rg.rotation.y = Math.PI / 2; g.add(rg); } }
  return g;
}

// ---------- the bridle: headstall, browband, noseband, bit and (separately, live) reins; it rides on the head bone
function bridleFit(A) {
  const F = stbFitFor(A), g = new THREE.Group(); if (!F) return g;
  const lm = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 }), bit = MATS.chrome, hl = F.hl, a = F.axis;
  const sec = t => stbSection(F.pts, F.at(t), a, 0.025, F.inHead);
  const nose = sec(hl * 0.22), crown = sec(hl * 0.86), brow = sec(hl * 0.74), mouth = sec(hl * 0.1);
  if (nose) strapPath(g, lm, loopPts(nose, 0.006), a, 0.032, 0.008, true);
  if (crown) strapPath(g, lm, loopPts(crown, 0.007), a, 0.03, 0.008, true);
  if (brow) strapPath(g, lm, loopPts(brow, 0.007, 16, 0.25, Math.PI - 0.25), a, 0.024, 0.008);
  const bits = [];
  for (const s of [1, -1]) {   // cheek pieces from the crown down to the bit rings at the corners of the mouth
    const th = s > 0 ? -0.55 : Math.PI + 0.55, b = mouth ? mouth.at(th, 0.02) : F.at(hl * 0.1), top = crown ? crown.at(s > 0 ? 0 : Math.PI, 0.007) : F.at(hl * 0.86);
    const mid = nose ? nose.at(s > 0 ? -0.15 : Math.PI + 0.15, 0.01) : b;
    strapPath(g, lm, [top, mid, b], a, 0.026, 0.008);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14), bit); r.position.copy(b); r.lookAt(b.clone().add(new V3(1, 0, 0))); g.add(r);
    const mk = new THREE.Object3D(); mk.position.copy(b); g.add(mk); bits.push(mk);
  }
  if (mouth) { const m0 = mouth.at(-0.55, 0.02), m1 = mouth.at(Math.PI + 0.55, 0.02); strapPath(g, bit, [m0, m1], a, 0.012, 0.012); }   // the mouthpiece
  g.userData.bits = bits; g.userData.bone = F.bone;
  return g;
}
// reins from the bit rings back to the withers, redrawn every frame so they stay joined whatever the head does
function stbReins(A, g) {
  const R = g.userData.reins || (g.userData.reins = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 5), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 })); m.castShadow = true; scene.add(m); return m; }));
  const seat = stbSeat(A), F = A.fits && A.fits[stbShown(A).uuid]; if (!F) return;
  g.userData.bits.forEach((mk, i) => {
    const a = mk.getWorldPosition(new V3()), b = animalLocal(A, (i ? -1 : 1) * 0.14, F.backY(seat.z + 0.42) + 0.08, seat.z + 0.42), d = b.clone().sub(a), L = d.length();
    const m = R[i]; m.visible = true; m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  });
}
function stbReinsOff(g) { if (g && g.userData.reins) for (const m of g.userData.reins) m.visible = false; }

// ---------- the wagon harness (horses only): a collar that hugs the base of the neck, hames, traces, breeching
function harnessFit(A) {
  const F = stbFitFor(A), g = new THREE.Group(); if (!F) return g;
  const lm = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.65 }), brass = MATS.brass;
  const wz = F.dipZ + 0.42, base = new V3(0, F.backY(wz) - 0.25, wz + 0.12), na = F.Qz.clone().sub(base).normalize();
  const S = stbSection(F.pts, base.clone().addScaledVector(na, 0.12), na, 0.04, p => p.y > F.H * 0.38 && p.z > F.dipZ);
  if (S) {
    const loop = loopPts(S, 0.045, 36); for (let i = 0; i < loop.length - 1; i++) { const a = loop[i], b = loop[i + 1], d = b.clone().sub(a), L = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L + 0.01, 8), lm); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.castShadow = true; g.add(m); }
    for (const s of [1, -1]) {   // brass hames up the sides of the collar, traces back along the body
      const top = S.at(s > 0 ? 0.9 : Math.PI - 0.9, 0.08), low = S.at(s > 0 ? -0.6 : Math.PI + 0.6, 0.08); strapPath(g, brass, [top, S.at(s > 0 ? 0 : Math.PI, 0.09), low], na, 0.022, 0.022);
      const tr = S.at(s > 0 ? -0.2 : Math.PI + 0.2, 0.06), end = new V3(s * 0.32, F.backY(-0.3 * F.L) - 0.45, -F.L * 0.5 - 0.5);
      strapPath(g, lm, [tr, new V3(s * 0.34, tr.y - 0.05, F.dipZ), end], new V3(0, 1, 0), 0.045, 0.012);
    }
  }
  const Sb = stbSection(F.pts, new V3(0, 0, F.dipZ), new V3(0, 0, 1), 0.035, p => p.y > F.H * 0.33);
  if (Sb) strapPath(g, lm, loopPts(Sb, 0.012, 18, 0.25, Math.PI - 0.25), new V3(0, 0, 1), 0.1, 0.02);   // back pad
  const Sr = stbSection(F.pts, new V3(0, 0, -F.L * 0.33), new V3(0, 0, 1), 0.04, p => p.y > F.H * 0.33);
  if (Sr) strapPath(g, lm, loopPts(Sr, 0.012, 20, -0.1, Math.PI + 0.1), new V3(0, 0, 1), 0.06, 0.012);   // breeching round the hindquarters
  return g;
}

// ---------- Dakota, the draft horse: dark bay with white socks and a blaze, striped hooves, a roached black mane and a short black tail
function draftDetails(A, M) {
  const F = stbFit(A, M), H = F.H;
  const coat = new THREE.Color(0x5a3420), white = new THREE.Color(0xeeeae2), black = new THREE.Color(0x141210), hoofD = new THREE.Color(0x2e2925), hoofL = new THREE.Color(0x8c7c62), nose = new THREE.Color(0x7a6660);
  A.root.updateMatrixWorld(true); const inv = A.body.matrixWorld.clone().invert(), nm = new THREE.Matrix3();
  M.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, nor = o.geometry.attributes.normal, col = new Float32Array(pos.count * 3), mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(mw);
    const p = new V3(), n = new V3(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mw); n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      c.copy(coat);
      const leg = p.y < H * 0.33 && Math.abs(p.z - F.dipZ) > 0.12;
      if (leg && p.y < H * 0.17 + 0.015 * Math.sin(p.x * 60 + p.z * 40)) c.copy(white);                                       // socks
      if (p.y < H * 0.045) c.copy(Math.sin((p.x + p.z) * 70) > 0.2 ? hoofL : hoofD);                                          // striped hooves
      const dt = p.distanceTo(F.tip);
      if (dt < F.hl * 0.95 && p.y > F.tip.y - 0.25) {   // on the head: a blaze down the front of the face, a soft grey muzzle
        const along = F.Mz.clone().sub(p).dot(F.axis), front = n.dot(new V3(0, 0.45, 0.9).normalize());
        if (Math.abs(p.x) < 0.035 + along * 0.06 && front > 0.25 && along > F.hl * 0.08 && along < F.hl * 0.85) c.copy(white);
        if (along < F.hl * 0.1) c.lerp(nose, 0.75);
      }
      if (p.z < -F.L * 0.38 && p.y > H * 0.4 && Math.abs(p.x) < 0.14) c.copy(black);                                       // what tail the model has
      if (p.z > F.dipZ + 0.3 && p.z < F.tip.z - F.hl * 0.8 && Math.abs(p.x) < 0.05 && n.y > 0.3 && p.y > F.backY(p.z) - 0.06) c.copy(black);   // crest under the mane
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.material.vertexColors = true; o.material.color.setHex(0xffffff); o.material.needsUpdate = true;
  });
  const hair = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.95 });
  // roached mane: a short clipped brush standing up along the crest (the top of the neck right at the midline), withers to poll
  const crest = [], mane = []; for (let z = F.dipZ + 0.3; z < F.tip.z - F.hl * 0.8; z += 0.03) { const y = F.topAt(0, z); if (y !== null) crest.push(new V3(0, y - 0.006, z)); }
  for (let i = 0; i < crest.length - 1; i++) { const a = crest[i], b = crest[i + 1], d = b.clone().sub(a), L = d.length(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, L + 0.012), hair);
    const up = new V3(0, d.z, -d.y).normalize(); m.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(up, 0.022); m.rotation.x = -Math.atan2(d.y, d.z); m.castShadow = true; A.body.add(m); mane.push(m); }
  // short black tail: a thick brush from the top of the rump, hanging just past the buttocks
  let root = null; for (const p of F.pts) if (p.y > H * 0.5 && Math.abs(p.x) < 0.1 && (!root || p.z < root.z)) root = p;
  if (root) {
    const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.075 * (1 - t * 0.35) + Math.sin(t * Math.PI) * 0.02, -t * 0.42)); }
    const tail = new THREE.Mesh(new THREE.LatheGeometry(prof, 10), hair); tail.position.set(0, root.y - 0.02, root.z + 0.06); tail.rotation.x = -0.35; tail.castShadow = true; A.body.add(tail);
    return { mane, tail, tailRoot: root };
  }
  return { mane, tail: null, tailRoot: null };
}

// ---------- bringing the horses to life
// Agrippa's model has a skeleton but no usable clips; Dakota's has neither, so he gets a simple one fitted to his body.
// Both walk, trot and canter procedurally: bones are turned about the horse's own axes (x across, y up, z forward).
function pbRel(b, body) {
  const rw = body.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  return { b, q0: b.quaternion.clone(), rw, rwi: rw.clone().invert(), p0: b.position.clone(), ax: 0, ay: 0, az: 0 };
}
function rigUp(pb, body) {   // one metre straight up, in the root bone's parent space
  const q = body.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(pb.b.parent.getWorldQuaternion(new THREE.Quaternion()));
  return new V3(0, 1, 0).applyQuaternion(q.invert()).divideScalar(pb.b.parent.getWorldScale(new V3()).y / body.getWorldScale(new V3()).y);
}
function rigNamed(A, M) {
  const find = re => { let r = null; M.traverse(o => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; };
  if (!find(/^Middle_01/)) return null;
  A.root.updateMatrixWorld(true); const P = b => b ? pbRel(b, A.body) : null;
  const R = { root: P(find(/^Middle_01/)), neck: [P(find(/^Neck_base/)), P(find(/^Neck_middle/))], head: P(find(/^Head_07/)),
    tail: [/^joint21_/, /^joint22_/, /^joint23_/, /^joint24_/].map(r => P(find(r))).filter(Boolean),
    legs: [[/^shoulder_left/, /^elbow_left/, /^knee_front_left/, 1, 1], [/^shoulder_right/, /^elbow_right/, /^knee_front_right/, 1, -1],
           [/^Hip_left/, /^Knee_back_left/, /^Ankle_back_left/, 0, 1], [/^hip_right/, /^knee_back_right/, /^Ankle_back_right/, 0, -1]]
      .map(([a, b, c, f, sx]) => ({ a: P(find(a)), b: P(find(b)), c: P(find(c)), front: !!f, sx })) };
  R.up = rigUp(R.root, A.body); return R;
}
// Dakota: a skeleton fitted to the static model (spine, four three-joint legs, neck, head, tail) and skin weights by position
function rigDraft(A, M, extra) {
  const F = stbFit(A, M); let src = null; M.traverse(o => { if (!src && o.isMesh) src = o; }); if (!src) return null;
  A.root.updateMatrixWorld(true);
  const geo = src.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(A.body.matrixWorld.clone().invert(), src.matrixWorld));
  let yB = 1e9; for (const q of F.pts) if (Math.abs(q.z - F.dipZ) < 0.08 && q.y > F.dipY * 0.3) yB = Math.min(yB, q.y);   // the belly
  const legs = [[1, 1], [-1, 1], [1, 0], [-1, 0]].map(([sx, f]) => ({ sx, front: !!f }));
  const legIdx = q => legs.findIndex(L => (q.x >= 0 ? 1 : -1) === L.sx && (q.z > F.dipZ) === L.front);
  const near = (L, y, h) => { const s = F.pts.filter(q => legIdx(q) === legs.indexOf(L) && Math.abs(q.y - y) < h); return s.length ? s.reduce((a, q) => a.add(q), new V3()).divideScalar(s.length) : null; };
  for (const L of legs) {
    L.top = near(L, yB - 0.08, 0.06) || new V3(L.sx * 0.2, yB, F.dipZ + (L.front ? 0.5 : -0.5));
    L.yK = yB * (L.front ? 0.5 : 0.58); L.yF = yB * 0.16;
    L.knee = near(L, L.yK, 0.03) || L.top.clone().setY(L.yK); L.fet = near(L, L.yF, 0.03) || L.knee.clone().setY(L.yF);
    L.rad = Math.max(0.06, ...F.pts.filter(q => legIdx(q) === legs.indexOf(L) && Math.abs(q.y - (yB - 0.1)) < 0.05).map(q => Math.hypot(q.x - L.top.x, q.z - L.top.z)));
  }
  const bones = [], mk = (name, w, parent) => { const b = new THREE.Bone(); b.name = name; b.userData.w = w.clone(); b.position.copy(w).sub(parent ? parent.userData.w : new V3()); if (parent) parent.add(b); bones.push(b); return b; };
  const root = mk('DRoot', new V3(0, yB + 0.12, F.dipZ), null);
  for (const L of legs) { L.ba = mk('LegUp', new V3(L.top.x, yB + 0.16, L.top.z), root); L.bb = mk('LegMid', new V3(L.knee.x, L.yK, L.knee.z), L.ba); L.bc = mk('LegLow', new V3(L.fet.x, L.yF, L.fet.z), L.bb); }
  const zN = (legs[0].top.z + legs[1].top.z) / 2 + 0.06, neck = mk('Neck_1', new V3(0, F.backY(zN) - 0.2, zN), root), head = mk('Head_1', new V3(0, F.Qz.y, F.Qz.z), neck);
  const tr = extra && extra.tailRoot, tail = tr ? mk('Tail_1', new V3(0, tr.y - 0.04, tr.z + 0.06), root) : null;
  // weights: legs blend into the body above the belly and bend at knee and fetlock; neck and head ahead of the shoulder; the tail behind the rump
  const pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), p = new V3(), B = b => bones.indexOf(b);
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i); let w = [[B(root), 1]];
    const li = legIdx(p), L = legs[li], inLeg = L && p.y < yB + 0.16 && Math.hypot(p.x - L.top.x, p.z - L.top.z) < L.rad * 1.4 + 0.05;
    const ramp = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
    if (inLeg) {
      if (p.y > yB - 0.02) { const t = ramp(yB - 0.02, yB + 0.16, p.y); w = [[B(root), t], [B(L.ba), 1 - t]]; }
      else if (p.y > L.yK + 0.05) w = [[B(L.ba), 1]];
      else if (p.y > L.yK - 0.05) { const t = ramp(L.yK - 0.05, L.yK + 0.05, p.y); w = [[B(L.ba), t], [B(L.bb), 1 - t]]; }
      else if (p.y > L.yF + 0.03) w = [[B(L.bb), 1]];
      else if (p.y > L.yF - 0.03) { const t = ramp(L.yF - 0.03, L.yF + 0.03, p.y); w = [[B(L.bb), t], [B(L.bc), 1 - t]]; }
      else w = [[B(L.bc), 1]];
    } else if (p.z > zN - 0.12 && p.y > yB + 0.02) {
      const hd = ramp(-0.08, 0.04, p.clone().sub(F.Qz).dot(F.axis)), nk = ramp(zN - 0.12, zN + 0.12, p.z);
      w = hd > 0 ? [[B(head), hd], [B(neck), 1 - hd]] : [[B(neck), nk], [B(root), 1 - nk]];
    } else if (tail && p.z < tr.z + 0.1 && p.y > yB + 0.1 && Math.abs(p.x) < 0.15) { const t = ramp(tr.z + 0.1, tr.z - 0.02, p.z); w = [[B(tail), t], [B(root), 1 - t]]; }
    w.forEach(([b, x], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = x; });
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const sm = new THREE.SkinnedMesh(geo, src.material); sm.castShadow = sm.receiveShadow = true; sm.frustumCulled = false;
  const G2 = new THREE.Group(); G2.add(sm); A.body.add(G2); A.body.remove(M); sm.add(root); A.root.updateMatrixWorld(true); sm.bind(new THREE.Skeleton(bones));
  // the mane rides on the neck, the tail on its bone
  if (extra) { for (const m of extra.mane) neck.attach(m); if (extra.tail && tail) tail.attach(extra.tail); }
  const P = b => pbRel(b, A.body);
  const R = { root: P(root), neck: [P(neck)], head: P(head), tail: tail ? [P(tail)] : [], legs: legs.map(L => ({ a: P(L.ba), b: P(L.bb), c: P(L.bc), front: L.front, sx: L.sx })) };
  R.up = rigUp(R.root, A.body);
  return { G2, R };
}
const rigBones = R => [R.root, ...R.neck, R.head, ...R.tail, ...R.legs.flatMap(L => [L.a, L.b, L.c])].filter(Boolean);
function horseRest(A) { if (!A.rig) return; for (const pb of rigBones(A.rig)) { pb.b.quaternion.copy(pb.q0); pb.b.position.copy(pb.p0); } A.root.updateMatrixWorld(true); }
// gaits: walk is four-beat, trot two-beat on the diagonals, canter three-beat; standing, a horse shifts, looks round and swishes its tail
const GAITS = [   // stride length, leg swing, knee lift, back bob, phase per leg (LF, RF, LH, RH)
  { stride: 1.7, swing: 0.3, lift: 0.7, bob: 0.015, ph: [0.25, 0.75, 0, 0.5] },
  { stride: 2.6, swing: 0.42, lift: 1.0, bob: 0.035, ph: [0, 0.5, 0.5, 0] },
  { stride: 3.4, swing: 0.55, lift: 1.1, bob: 0.05, ph: [0.62, 0.36, 0.3, 0] },
];
function horseAnimate(A, T, dt) {
  const R = A.rig; if (!R) return;
  const g = Math.abs(A.speed), gi = g > 4.2 ? 2 : g > 1.9 ? 1 : 0, G = GAITS[gi], k = clamp(dt * 5, 0, 1);
  A.mw = lerp(A.mw || 0, g > 0.15 ? 1 : 0, k); const mw = A.mw;
  A.gph = (A.gph || 0) + dt * g / G.stride * Math.sign(A.speed || 1);
  const ph = A.gph * Math.PI * 2;
  R.legs.forEach((L, i) => {
    const c = ph + G.ph[i] * Math.PI * 2, swing = Math.sin(c) * G.swing * mw, lift = Math.max(0, Math.cos(c)) * G.lift * mw;
    const shift = (1 - mw) * Math.sin(T * 0.4 + A.i * 2 + (L.front ? 0 : 1.5)) * 0.04;   // weight shifting at rest
    if (L.a) L.a.ax = -swing + shift; if (L.b) L.b.ax = L.front ? lift * 0.9 : -lift * 0.6; if (L.c) L.c.ax = L.front ? -lift * 0.35 : lift * 0.8;
    for (const pb of [L.a, L.b, L.c]) if (pb) applyPose(pb);
  });
  // the back bobs with each stride; at the canter it rocks
  if (R.root) { R.root.ax = gi === 2 ? Math.sin(ph) * 0.04 * mw : 0; R.root.b.position.copy(R.root.p0).addScaledVector(R.up, -Math.abs(Math.sin(ph * (gi === 1 ? 2 : 1))) * G.bob * mw); applyPose(R.root); }
  // head and neck: a nod with each stride; at rest, looking about and now and then dropping to graze
  A.lookT = (A.lookT || 0) + dt; const graze = (1 - mw) * smooth(0.6, 1, Math.sin(A.lookT * 0.11 + A.i * 3)) * 0.55;
  const nod = Math.sin(ph * 2) * 0.05 * mw, look = (1 - mw) * Math.sin(T * 0.23 + A.i * 1.7) * 0.25;
  R.neck.forEach((pb, i) => { if (!pb) return; pb.ax = nod * (i ? 0.6 : 1) + graze * (i ? 0.35 : 0.65); pb.ay = look * (i ? 0.5 : 0.5); applyPose(pb); });
  if (R.head) { R.head.ax = -nod * 0.5 + graze * 0.2; applyPose(R.head); }
  // tail: a lazy sway, a sharp swish now and then, carried a little higher on the move
  const swish = Math.pow(Math.max(0, Math.sin(T * 0.37 + A.i * 2.3)), 8);
  R.tail.forEach((pb, i) => { pb.ay = Math.sin(T * (1.4 + swish * 7) + i * 0.6 + A.i) * (0.08 + swish * 0.3) * (0.6 + i * 0.25); pb.ax = -0.15 * mw * (i ? 0.3 : 1); applyPose(pb); });
}
// a rope from whoever is leading an animal to its nose
function stbRope(A, show) {
  const m = A.rope || (A.rope = (() => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 5), MATS.sackCloth || new THREE.MeshStandardMaterial({ color: 0xb8a070 })); r.castShadow = true; scene.add(r); return r; })());
  m.visible = !!show; if (!show) return;
  const P = G.players[A.leader], F = A.fits && stbShown(A) && A.fits[stbShown(A).uuid]; if (!P || !F) { m.visible = false; return; }
  const fw = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), hand = A.leader === G.mySlot ? PL.cam.position.clone().add(new V3(-fw.z * 0.25, -0.55, fw.x * 0.25)).addScaledVector(fw, 0.3) : P.pos.clone().add(new V3(0, (riding(P.slot) ? 1.9 : 1.0), 0));
  const nose = F.tip.clone().addScaledVector(F.axis, -F.hl * 0.18); nose.y -= 0.06; const b = A.body.localToWorld(nose), d = b.clone().sub(hand), L = d.length();
  m.position.copy(hand).add(b).multiplyScalar(0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
}
