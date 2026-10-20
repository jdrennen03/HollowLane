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
    if (!o.isMesh || !o.visible || o.material.transparent || o.material.alphaTest > 0 || /hair/i.test(o.name + (o.material.name || ''))) return; const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 40000));
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
function stbShown(A) { return A.packSk || (A.home && A.homeM) ? A.homeM : A.packM; }
// fits are measured per body: with the skinned pack, the animated donkey wears either her own coat or the pack
function stbFitKey(A) { const M = stbShown(A); return M ? M.uuid + (A.packSk && !A.home ? ':pack' : '') : ''; }
function stbFitFor(A) {
  const M = stbShown(A); if (!M) return null;
  const key = stbFitKey(A); if (A.fits && A.fits[key]) return A.fits[key];
  // measure the animated donkey in her standing pose, whatever clip happens to be playing
  if (A.mixer && M === A.homeM) { for (const n in A.acts) A.acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); A.mixer.setTime(0); }
  horseRest(A);
  const F = stbFit(A, M); F.bone = F.spine = null; M.traverse(o => { if (!o.isBone) return; if (!F.bone && /^Head_\d/.test(o.name)) F.bone = o; if (!F.spine && /^(Middle_01|DRoot|Spine_01)/.test(o.name)) F.spine = o; });
  (A.fits || (A.fits = {}))[key] = F; return F;
}
// where the rider sits (body space) and the withers the reins run back to
function stbSeat(A) { const F = A.fits && stbShown(A) && A.fits[stbFitKey(A)]; return F ? { y: F.dipY + (A.saddle >= 0 ? 0.13 : 0.06), z: F.dipZ + 0.05 } : { y: A.H * A.def.seat[0], z: A.L * A.def.seat[1] }; }

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
  // the collar sits at the base of the neck, resting on the shoulders and across the chest in front of the forelegs
  let yB = 1e9; for (const q of F.pts) if (Math.abs(q.z - F.dipZ) < 0.08 && q.y > F.dipY * 0.3) yB = Math.min(yB, q.y);
  const fl = F.pts.filter(q => q.z > F.dipZ && q.y < yB - 0.05 && q.y > yB - 0.2), frontZ = fl.length ? fl.reduce((s2, q) => s2 + q.z, 0) / fl.length : F.dipZ + 0.5;
  const na = new V3(0, 0.62, 1).normalize(), base = new V3(0, (F.backY(frontZ + 0.1) + yB) / 2 + 0.06, frontZ + 0.24);
  const S = stbSection(F.pts, base, na, 0.04, p => p.y > yB - 0.02 && p.z > frontZ - 0.15 && p.distanceTo(F.tip) > F.hl * 0.9);
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
    legs: [[/^shoulder_left/, /^elbow_left/, /^knee_front_left/, /^ankle_front_left/, 1, 1], [/^shoulder_right/, /^elbow_right/, /^knee_front_right/, /^ankle_front_right/, 1, -1],
           [/^Hip_left/, /^Knee_back_left/, /^Ankle_back_left/, /^foot_up_left/, 0, 1], [/^hip_right/, /^knee_back_right/, /^Ankle_back_right/, /^foot_up_right/, 0, -1]]
      .map(([a, st, k, f, fr, sx]) => ({ a: P(find(a)), st: P(find(st)), k: P(find(k)), f: P(find(f)), front: !!fr, sx })) };
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
  legs.forEach((L, i) => { L.ba = mk('LegUp' + i, new V3(L.top.x, yB + 0.16, L.top.z), root); L.bb = mk('LegMid' + i, new V3(L.knee.x, L.yK, L.knee.z), L.ba); L.bc = mk('LegLow' + i, new V3(L.fet.x, L.yF, L.fet.z), L.bb); });
  const zN = (legs[0].top.z + legs[1].top.z) / 2 + 0.06, nY0 = F.backY(zN) - 0.2, neck = mk('Neck_1', new V3(0, nY0, zN), root), head = mk('Head_1', new V3(0, F.Qz.y, F.Qz.z), neck);
  const neckY = z => nY0 - 0.06 + Math.max(0, z - zN) * 0.75;   // underside of the neck: a line rising forward from the base of the neck
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
    } else if (p.z > zN - 0.14 && p.y > neckY(p.z) - 0.08) {   // the neck rises from the withers; the chest below it belongs to the body
      const hd = ramp(-0.08, 0.04, p.clone().sub(F.Qz).dot(F.axis)), nk = ramp(zN - 0.14, zN + 0.12, p.z) * ramp(neckY(p.z) - 0.08, neckY(p.z) + 0.08, p.y);
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
  const R = { root: P(root), neck: [P(neck)], head: P(head), tail: tail ? [P(tail)] : [], legs: legs.map(L => ({ a: P(L.ba), st: null, k: P(L.bb), f: P(L.bc), front: L.front, sx: L.sx })) };
  R.up = rigUp(R.root, A.body);
  return { G2, R };
}
const rigBones = R => [R.root, ...R.neck, R.head, ...R.tail, ...R.legs.flatMap(L => [L.a, L.st, L.k, L.f])].filter(Boolean);
function horseRest(A) { if (!A.rig) return; for (const pb of rigBones(A.rig)) { pb.b.quaternion.copy(pb.q0); pb.b.position.copy(pb.p0); } A.root.updateMatrixWorld(true); }
// gaits: walk is four-beat, trot two-beat on the diagonals, canter three-beat. The gait blends with the (smoothed) speed,
// so there is no snap from one to the next. Joints: a swings the leg from shoulder or hip; st is the elbow or stifle; k the
// knee (front) or hock (hind), the main fold; f the fetlock. Standing, a horse shifts its weight, looks round, grazes and swishes.
const GAITS = [
  { stride: 1.55, swing: 0.24, st: 0.22, k: 0.75, f: 0.45, bob: 0.012, ph: [0.25, 0.75, 0, 0.5] },
  { stride: 2.4, swing: 0.32, st: 0.3, k: 1.0, f: 0.55, bob: 0.028, ph: [0, 0.5, 0.5, 0] },
  { stride: 3.2, swing: 0.42, st: 0.35, k: 1.05, f: 0.6, bob: 0.04, ph: [0.62, 0.36, 0.3, 0] },
];
const ease = x => x * x * (3 - 2 * x);
// ---------- real horse motion: the ghost horse's recorded idle, walk, trot and gallop, carried over joint by joint
// A hidden copy of the ghost horse plays the clips; every frame each of its joints' turn away from its standing pose is
// applied, in the horse's own space, to the matching bone of Agrippa (her own skeleton) or Dakota (the one fitted to him).
const MOCAP = { root: null, model: null, clips: null, rest: null, H: 1, loading: false, wait: [] };
const MOCAP_CLIPS = { idle: [0, 96], walk: [109.9, 157.9], trot: [189.9, 205.9], gallop: [165.9, 181.9] };   // frames at 24 fps (the walk is a rein-back, played reversed)
const MOCAP_PACE = { walk: 1.6, trot: 3.4, gallop: 6.5 };   // the ground speed each clip looks right at
function mocapLoad(cb) {
  if (MOCAP.root) return cb(); MOCAP.wait.push(cb); if (MOCAP.loading) return; MOCAP.loading = true;
  loadModelFile('ghost-horse.json', gl => {
    const root = new THREE.Group(), model = gl.scene; root.add(model);
    const clip = gl.animations[0]; MOCAP.clips = {};
    for (const n in MOCAP_CLIPS) MOCAP.clips[n] = THREE.AnimationUtils.subclip(clip, n, MOCAP_CLIPS[n][0], MOCAP_CLIPS[n][1], 24);
    // standing reference: the first idle frame, every joint's rotation in the horse's own space
    const mx = new THREE.AnimationMixer(model), a = mx.clipAction(MOCAP.clips.idle); a.play(); mx.setTime(0); root.updateMatrixWorld(true);
    MOCAP.rest = {}; MOCAP.bones = {}; model.traverse(o => { if (o.isBone) { MOCAP.bones[o.name] = o; MOCAP.rest[o.name] = o.getWorldQuaternion(new THREE.Quaternion()); } });
    const pel = Object.values(MOCAP.bones).find(b => /Pelvis/.test(b.name)); MOCAP.pelvis = pel; MOCAP.pelY0 = pel.getWorldPosition(new V3()).y;
    MOCAP.H = new THREE.Box3().setFromObject(model, true).getSize(new V3()).y;
    a.stop(); mx.uncacheRoot(model);
    Object.assign(MOCAP, { root, model }); for (const f of MOCAP.wait) f(); MOCAP.wait = [];
  }, e => { console.warn('horse motion', e); MOCAP.loading = false; });
}
// which ghost-horse joint drives which bone (in parent-before-child order)
const MOCAP_MAP = {
  agrippa: [['Pelvis', /^Middle_01/], ['Spine_', /^back_up_02/], ['Spine1', /^shoulder_03/], ['Neck_', /^Neck_base/], ['Neck1', /^Neck_middle/], ['Head_', /^Head_07/],
    ['L_UpperArm', /^shoulder_left/], ['L_Forearm', /^elbow_left/], ['L_Hand', /^knee_front_left/], ['L_Finger0_', /^ankle_front_left/],
    ['R_UpperArm', /^shoulder_right/], ['R_Forearm', /^elbow_right/], ['R_Hand', /^knee_front_right/], ['R_Finger0_', /^ankle_front_right/],
    ['L_Thigh', /^Hip_left/], ['L_Calf', /^Knee_back_left/], ['L_HorseLink', /^Ankle_back_left/], ['L_Foot', /^foot_up_left/],
    ['R_Thigh', /^hip_right/], ['R_Calf', /^knee_back_right/], ['R_HorseLink', /^Ankle_back_right/], ['R_Foot', /^foot_up_right/],
    ['Tail_', /^joint21_/], ['Tail1', /^joint22_/], ['Tail2', /^joint23_/], ['Tail3', /^joint24_/]],
  draft: [['Pelvis', 'DRoot'], ['Neck_', 'Neck_1'], ['Head_', 'Head_1'], ['Tail_', 'Tail_1'],
    ['L_Forearm', 'LegUp0'], ['L_Hand', 'LegMid0'], ['L_Finger0_', 'LegLow0'], ['R_Forearm', 'LegUp1'], ['R_Hand', 'LegMid1'], ['R_Finger0_', 'LegLow1'],
    ['L_Calf', 'LegUp2'], ['L_HorseLink', 'LegMid2'], ['L_Foot', 'LegLow2'], ['R_Calf', 'LegUp3'], ['R_HorseLink', 'LegMid3'], ['R_Foot', 'LegLow3']],
};
function mocapBind(A) {
  mocapLoad(() => {
    const M = stbShown(A); if (!M || !A.rig) return; horseRest(A);
    const find = k => { let r = null; M.traverse(o => { if (!r && o.isBone && (typeof k === 'string' ? o.name === k : k.test(o.name))) r = o; }); return r; };
    const src = n => Object.values(MOCAP.bones).find(b => b.name.replace(/\s/g, '_').includes('Bip01_' + n) || b.name.includes(n));
    const bq = A.body.getWorldQuaternion(new THREE.Quaternion()).invert(), map = [];
    for (const [sn, tk] of MOCAP_MAP[A.def.draft ? 'draft' : 'agrippa']) {
      const t = find(tk), s = src(sn); if (!t || !s) continue;
      map.push({ t, s, s0i: MOCAP.rest[s.name].clone().invert(), t0: bq.clone().multiply(t.getWorldQuaternion(new THREE.Quaternion())) });
    }
    const mixer = new THREE.AnimationMixer(MOCAP.model), acts = {};
    for (const n in MOCAP.clips) { acts[n] = mixer.clipAction(MOCAP.clips[n]); acts[n].play(); acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); acts[n].time = Math.random() * MOCAP.clips[n].duration; }
    A.moc = { mixer, acts, map, w: { idle: 1, walk: 0, trot: 0, gallop: 0 } };
  });
}
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function mocapAnimate(A, dt) {
  const C = A.moc, v = A.as = lerp(A.as || 0, Math.abs(A.speed), clamp(dt * 2.5, 0, 1));
  const tw = { idle: 1 - smooth(0.08, 0.5, v), walk: 0, trot: 0, gallop: smooth(4.0, 5.0, v) };
  const mov = 1 - tw.idle - tw.gallop; tw.trot = Math.max(0, mov * smooth(2.0, 2.8, v)); tw.walk = Math.max(0, mov - tw.trot);
  for (const n in C.acts) {
    const a = C.acts[n]; C.w[n] = lerp(C.w[n], tw[n], clamp(dt * 4, 0, 1)); a.setEffectiveWeight(C.w[n]);
    a.timeScale = n === 'idle' ? 1 : (n === 'walk' ? -1 : 1) * clamp(Math.max(v, 0.6) / MOCAP_PACE[n], 0.55, 1.5);
  }
  C.mixer.update(dt); MOCAP.root.updateMatrixWorld(true);
  const bw = A.body.getWorldQuaternion(_q3);
  for (const m of C.map) {
    const d = m.s.getWorldQuaternion(_q1).multiply(m.s0i);             // the joint's turn away from standing, in horse space
    const want = _q2.copy(bw).multiply(d).multiply(m.t0);              // the target bone's world rotation
    m.t.quaternion.copy(m.t.parent.getWorldQuaternion(_q1).invert().multiply(want));
  }
  // the back rises and falls with the gait, scaled to this horse
  const R = A.rig; if (R && R.root) { const dy = (MOCAP.pelvis.getWorldPosition(_fv).y - MOCAP.pelY0) / MOCAP.H * A.H; R.root.b.position.copy(R.root.p0).addScaledVector(R.up, clamp(dy, -0.1, 0.06)); }
}
function horseAnimate(A, T, dt) {
  const R = A.rig; if (!R) return;
  if (A.moc) return mocapAnimate(A, dt);
  if (!A.mocReq) { A.mocReq = true; mocapBind(A); }
  A.as = lerp(A.as || 0, Math.abs(A.speed), clamp(dt * 2.5, 0, 1)); const v = A.as;   // smoothed: no flicker from jittery speeds
  const w2 = smooth(4.0, 4.8, v), w0 = 1 - smooth(1.9, 2.5, v), w1 = Math.max(0, 1 - w0 - w2), W = [w0, w1, w2], mw = smooth(0.05, 0.45, v);
  const stride = GAITS.reduce((s, G, i) => s + G.stride * W[i], 0);
  A.gph = (A.gph || 0) + dt * v / stride; const ph = A.gph * Math.PI * 2;
  R.legs.forEach((L, i) => {
    let a = 0, st = 0, k = 0, f = 0;
    GAITS.forEach((G, gi) => {
      if (W[gi] < 1e-3) return; const c = ph + G.ph[i] * Math.PI * 2, sw = Math.sin(c), lift = ease(Math.max(0, Math.cos(c))), w = W[gi] * mw;
      a += -sw * G.swing * w; st += lift * G.st * w; k += lift * G.k * w; f += lift * G.f * w;
    });
    const shift = (1 - mw) * Math.sin(T * 0.35 + A.i * 2 + (L.front ? 0 : 1.5)) * 0.03;   // weight shifting at rest
    if (L.a) { L.a.ax = a + shift; applyPose(L.a); }
    if (L.front) { if (L.st) { L.st.ax = -st * 0.5; applyPose(L.st); } if (L.k) { L.k.ax = k; applyPose(L.k); } if (L.f) { L.f.ax = -f * 0.6; applyPose(L.f); } }
    else { if (L.st) { L.st.ax = -st; applyPose(L.st); } if (L.k) { L.k.ax = -k * 0.6; applyPose(L.k); } if (L.f) { L.f.ax = f; applyPose(L.f); } }
  });
  // the back: bobs twice a stride at the trot, rocks at the canter
  if (R.root) { const bob = Math.abs(Math.sin(ph * 2)) * GAITS[1].bob * w1 * mw + Math.abs(Math.sin(ph)) * GAITS[0].bob * w0 * mw + Math.abs(Math.sin(ph)) * GAITS[2].bob * w2 * mw;
    R.root.ax = Math.sin(ph) * 0.035 * w2 * mw; R.root.b.position.copy(R.root.p0).addScaledVector(R.up, -bob); applyPose(R.root); }
  // head and neck: a nod with each step at the walk, a rocking swing at the canter, still at the trot; at rest, looking about and grazing now and then
  A.lookT = (A.lookT || 0) + dt; const graze = (1 - mw) * smooth(0.65, 1, Math.sin(A.lookT * 0.09 + A.i * 3)) * 1.0;
  const nod = Math.sin(ph * 2 + 0.6) * 0.045 * w0 * mw + Math.sin(ph + 0.8) * 0.07 * w2 * mw, look = (1 - mw) * Math.sin(T * 0.19 + A.i * 1.7) * 0.22;
  const nn = R.neck.length;   // the drop to graze is shared out down the neck
  R.neck.forEach((pb, i) => { if (!pb) return; pb.ax = nod * (i ? 0.6 : 1) + graze * (nn > 1 ? (i ? 0.45 : 0.6) : 0.95); pb.ay = look * 0.5; applyPose(pb); });
  if (R.head) { R.head.ax = -nod * 0.4 + graze * 0.2; applyPose(R.head); }
  // tail: a lazy sway, a sharp swish now and then, carried a little higher on the move
  const swish = Math.pow(Math.max(0, Math.sin(T * 0.31 + A.i * 2.3)), 10);
  R.tail.forEach((pb, i) => { pb.ay = Math.sin(T * (1.1 + swish * 6) + i * 0.6 + A.i) * (0.06 + swish * 0.28) * (0.6 + i * 0.25); pb.ax = -0.12 * mw * (i ? 0.3 : 1); applyPose(pb); });
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

// ---------- Juniper's pack donkey on the animated donkey's skeleton
// The pack donkey is one static mesh with no bones. It's laid over the animated donkey (same length, feet and middle lined
// up), and every vertex takes its bone weights from the nearest points of her body, then is un-posed into her bind pose.
// The result is a skinned mesh driven by her own clips (idle, grazing, walk, trot, run), swapped in for her coat on a job.
function packSkin(A) {
  if (A.packSk || !A.homeM || !A.packM || !A.mixer) return;
  let sk = null; const homeBody = [];
  A.homeM.traverse(o => { if (o.isSkinnedMesh) { homeBody.push(o); if (!sk && !/hair/i.test(o.name)) sk = o; } });
  if (!sk) return;
  for (const n in A.acts) A.acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); A.mixer.setTime(0);
  const hv = A.homeM.visible, pv = A.packM.visible; A.homeM.visible = A.packM.visible = true;
  A.root.updateMatrixWorld(true); sk.skeleton.update();
  const toBody = A.body.matrixWorld.clone().invert(), v = new V3();
  // her body, posed, in body space, with its weights
  const hp = sk.geometry.attributes.position, hi = sk.geometry.attributes.skinIndex, hw = sk.geometry.attributes.skinWeight, HN = hp.count;
  const HP = new Float32Array(HN * 3), hb = new THREE.Box3();
  for (let i = 0; i < HN; i++) { sk.getVertexPosition(i, v); v.applyMatrix4(sk.matrixWorld).applyMatrix4(toBody); HP.set([v.x, v.y, v.z], i * 3); hb.expandByPoint(v); }
  // the pack donkey in body space, and how to line it up with her
  const parts = []; const pb = new THREE.Box3();
  A.packM.traverse(o => { if (!o.isMesh) return; const m = o.matrixWorld.clone().premultiply(toBody), p = o.geometry.attributes.position; parts.push({ o, m }); for (let i = 0; i < p.count; i++) pb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m)); });
  const s = (hb.max.z - hb.min.z) / (pb.max.z - pb.min.z), hc = hb.getCenter(new V3()), pc = pb.getCenter(new V3());
  const align = new THREE.Matrix4().makeTranslation(hc.x, hb.min.y, hc.z).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-pc.x, -pb.min.y, -pc.z));
  // a grid over her vertices for the nearest-point search
  const CS = 0.06, grid = new Map(), key = (x, y, z) => x + ',' + y + ',' + z, cell = q => Math.floor(q / CS);
  for (let i = 0; i < HN; i++) { const k = key(cell(HP[i * 3]), cell(HP[i * 3 + 1]), cell(HP[i * 3 + 2])); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
  const near = (x, y, z, K) => {
    const cx = cell(x), cy = cell(y), cz = cell(z), out = [];
    for (let r = 1; r < 12 && out.length < K; r++) {
      out.length = 0;
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) { const L = grid.get(key(cx + a, cy + b, cz + c)); if (L) for (const i of L) out.push([i, (HP[i * 3] - x) ** 2 + (HP[i * 3 + 1] - y) ** 2 + (HP[i * 3 + 2] - z) ** 2]); }
    }
    return out.sort((p, q) => p[1] - q[1]).slice(0, K);
  };
  // skinning matrices in her mesh space, to undo the idle pose
  const bones = sk.skeleton.bones, BM = bones.map((b, j) => sk.bindMatrixInverse.clone().multiply(b.matrixWorld).multiply(sk.skeleton.boneInverses[j]).multiply(sk.bindMatrix));
  const toSk = sk.matrixWorld.clone().invert().multiply(A.body.matrixWorld), nrm = new THREE.Matrix3(), acc = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const out = [];
  for (const { o, m } of parts) {
    const g = o.geometry.clone(), p = g.attributes.position, n = g.attributes.normal, N = p.count, SI = new Uint16Array(N * 4), SW = new Float32Array(N * 4);
    const full = toSk.clone().multiply(align).multiply(m);
    for (let i = 0; i < N; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m).applyMatrix4(align);
      const w = {}; for (const [j, d2] of near(v.x, v.y, v.z, 6)) { const f = 1 / (Math.sqrt(d2) + 0.01); for (let c = 0; c < 4; c++) { const bw = hw.getComponent(j, c); if (bw > 0) { const bi = hi.getComponent(j, c); w[bi] = (w[bi] || 0) + bw * f; } } }
      const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((t, e) => t + e[1], 0) || 1;
      acc.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      top.forEach(([bi, x], c) => { SI[i * 4 + c] = +bi; SW[i * 4 + c] = x / tot; const e = BM[+bi].elements, ae = acc.elements; for (let q = 0; q < 16; q++) ae[q] += e[q] * x / tot; });
      if (!top.length) { SW[i * 4] = 1; acc.identity(); }
      tmp.copy(acc).invert();   // posed = acc · bind, so bind = acc⁻¹ · posed
      v.fromBufferAttribute(p, i).applyMatrix4(full).applyMatrix4(tmp); p.setXYZ(i, v.x, v.y, v.z);
      if (n) { nrm.getNormalMatrix(tmp.clone().multiply(full)); v.fromBufferAttribute(n, i).applyMatrix3(nrm).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
    g.computeBoundingBox(); g.computeBoundingSphere();
    const sm = new THREE.SkinnedMesh(g, o.material); sm.name = 'pack'; sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
    sm.position.copy(sk.position); sm.quaternion.copy(sk.quaternion); sm.scale.copy(sk.scale);
    sk.parent.add(sm); sm.updateMatrixWorld(true); sm.bind(sk.skeleton, sk.bindMatrix); out.push(sm);
  }
  A.homeM.visible = hv; A.packM.visible = pv;
  A.packSk = out; A.homeBody = homeBody; A.packH = (pb.max.y - pb.min.y) * s;
  A.home = null; stbLook(A);
}
