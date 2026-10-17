// ---------------------------------------------------------------- carrying loose objects: anything the ghost can throw, you can pick up too
// One object rides in your free hand (left side of the view) alongside your gear. E picks up, G drops, left click throws.
const PROP_NAME = {
  mug: 'Mug', cup: 'Cup', book: 'Book', remote: 'Remote', plate: 'Plate', vase: 'Vase', bowl: 'Bowl', candle: 'Candle', bottle: 'Bottle', pot: 'Pot', kettle: 'Kettle',
  ball: 'Ball', block: 'Toy block', teddy: 'Teddy bear', truck: 'Toy truck', phone: 'Telephone', clock: 'Clock', jbox: 'Jewelry box', soap: 'Soap dispenser', basket: 'Basket',
  horseBig: 'Horse statue', horsePlush: 'Plush horse', trophy: 'Trophy', brush: 'Grooming brush', horseshoe: 'Horseshoe', controller: 'Controller', gamecase: 'Video game',
  cart: 'Game cartridge', handheld: 'Handheld console', pencilcup: 'Pencil cup', triangle: 'Drafting triangle', ruler: 'Ruler', sketchbook: 'Sketchbook',
};
function propName(p) { const t = PROPS[p.i].type; return PROP_NAME[t] || (/^horse/.test(t) ? 'Horse figurine' : t.charAt(0).toUpperCase() + t.slice(1)); }
function carried() { return PL.carry >= 0 ? PROPO[PL.carry] : null; }
function pickProp(i) {
  const p = PROPO[i]; if (!p || p.holder >= 0) return;
  if (PL.carry >= 0) dropProp(false);
  request('ppick', i);   // the host applies this at once; a client marks it locally until the host confirms
  PL.carry = i; p.holder = G.mySlot; p.pendT = performance.now(); p.net = null; p.mesh.castShadow = false; sfx('pickup', 0.5);
}
const _cf = new V3(), _cp = new V3();
function dropProp(throwIt) {
  const p = carried(); if (!p) return;
  PL.carry = -1; p.mesh.castShadow = true;
  const P = me(), m = p.mesh; _cp.copy(m.position);
  if (!sightClear(P.pos.x, P.pos.z, _cp.x, _cp.z, P.pos.y, P.pos.y)) _cp.set(P.pos.x, P.pos.y + 1.0, P.pos.z);
  PL.cam.getWorldDirection(_cf);
  const v = throwIt ? _cf.clone().multiplyScalar(6.5).add(new V3(0, 1.4, 0)) : new V3(_cf.x * 0.7, 0.5, _cf.z * 0.7);
  request('pdrop', p.i, r2(_cp.x), r2(_cp.y), r2(_cp.z), r2(v.x), r2(v.y), r2(v.z), throwIt ? 1 : 0);
  p.holder = -1; p.pendT = performance.now();
  if (throwIt) sfx('click', 0.4, 0.6);
}
// host: authoritative pick-up, drop and throw
function hostPropPick(i, slot) {
  const p = PROPO[i], P = G.players[slot]; if (!p || !P || !P.alive || p.holder >= 0) return;
  p.holder = slot; p.sleep = true; p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); p.settle = 0;
}
function hostPropDrop(i, slot, x, y, z, vx, vy, vz, th) {
  const p = PROPO[i]; if (!p || p.holder !== slot) return;
  p.holder = -1; p.mesh.position.set(x, y, z); p.vel.set(vx, vy, vz); p.sleep = false; p.settle = 0;
  if (th) { p.ang.set(rr(-8, 8), rr(-8, 8), rr(-8, 8)); p.yaw = Math.random() * Math.PI * 2; } else { p.ang.set(0, 0, 0); p.yaw = G.players[slot].yaw ?? p.yaw; }
}
// host: carry other investigators' objects along with them so everyone sees it
function hostCarryTick() {
  const now = performance.now() / 1000;
  for (const p of PROPO) {
    if (p.holder < 0) continue;
    const P = G.players[p.holder];
    if (!P || !P.alive) { p.holder = -1; p.sleep = false; p.settle = 0; p.vel.set(0, 0, 0); continue; }
    if (p.holder !== G.mySlot) {
      const yaw = P.tyaw ?? P.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      p.mesh.position.set(P.pos.x + fx * 0.42 - fz * 0.22, P.pos.y + 1.05, P.pos.z + fz * 0.42 + fx * 0.22); p.mesh.rotation.set(0, yaw, 0);
    }
    p.moved = now;
  }
}
// everyone: your own carried object follows your view
function updateCarry() {
  const p = carried(); if (!p) return;
  if (!me()?.alive || (p.holder !== G.mySlot && performance.now() - (p.pendT || 0) > 1500)) { PL.carry = -1; p.mesh.castShadow = true; return; }
  PL.cam.updateMatrixWorld();
  p.mesh.position.set(-0.46, -0.33, -(0.45 + p.r)).applyMatrix4(PL.cam.matrixWorld);   // low and left, at the edge of the flashlight beam
  p.mesh.quaternion.copy(PL.cam.quaternion);
}
