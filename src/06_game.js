// ---------------------------------------------------------------- game state
const SLOT_COLORS = ['#d9d2bf', '#7fb8ff', '#ff9f6b', '#9be37a'];
const G = {
  state: 'menu', mp: false, isHost: true, mySlot: 0, players: [], seed: 1, ghostIdx: 0, ghost: GHOSTS[0], ghostRoom: 0,
  elapsed: 0, lights: [], frontLocked: false,
  gs: null, gh: null, huntFx: 0, eventFx: 0, stats: { deaths: 0 }, ended: false, journal: { ev: {}, pick: -1 },
  evSeq: 0, lastSb: 0,
};
function makePlayer(slot, nick) {
  return { slot, nick, ch: 'f', pos: new V3(TENT.x - 0.6 + slot * 0.4, 0, TENT.z + 1.0), yaw: 0, pitch: 0, sanity: 100, alive: true, flash: true, held: -1, room: -1, inside: false, hidden: false, avatar: null, tpos: new V3(), tyaw: 0, moving: 0, lastReqSeq: 0 };
}
// difficulty: rookie (all evidence, hunts can't kill), pro (all evidence, hunts kill), nightmare (one evidence hidden)
const MODES = { rookie: 'Rookie', pro: 'Pro', nightmare: 'Nightmare' };
const MODE_NOTE = { rookie: 'Hunts happen, but a caught investigator is only shaken, not killed.', pro: 'All three evidences. A hunting ghost kills whoever it catches.', nightmare: 'The ghost hides one of its three evidences. Learn its behaviour. Hunts kill.' };
function startRound({ seed, ghostIdx, ghostRoom, roster, mode }) {
  G.mode = MODES[mode] ? mode : 'pro';
  // the round's ghost is a copy, so Nightmare can hold one evidence back; allEv keeps the full set for the reveal
  const base = GHOSTS[ghostIdx]; G.ghost = { ...base, allEv: base.ev }; G.hiddenEv = null;
  if (G.mode === 'nightmare') { const h = Math.abs(seed | 0) % 3; G.hiddenEv = base.ev[h]; G.ghost.ev = base.ev.filter((_, i) => i !== h); }
  G.seed = seed; G.ghostIdx = ghostIdx; G.ghostRoom = ghostRoom;
  G.elapsed = 0; G.ended = false; G.eggOn = false; G.gatorBait = false; G.frontLocked = false; G.stats = { deaths: 0 }; G.journal = { ev: {}, pick: -1 };
  G.lights = new Array(NROOM).fill(false);
  G.players = roster.map(r => makePlayer(r.slot, r.nick));
  if (G.players[0]) G.players[0].nick = 'Claire';   // the host plays Claire
  for (const p of G.players) { p.peer = roster[p.slot].peer; p.ch = roster[p.slot].ch || 'f'; loadPlayerModel(p.ch); }
  initTemps(seed);
  // reset world
  for (const it of ITEMS) { it.on = false; it.spent = false; it.burnEnd = 0; it.calmed = false; it.writeT = 0; it.holder = -1; it.pos.copy(it.home); it.ry = Math.PI; placeItemInWorld(it); }
  for (const p of PROPO) { const P = PROPS[p.i]; p.mesh.position.set(P.x, P.y + p.hh, P.z); p.mesh.rotation.set(0, P.ry, 0); p.sleep = true; p.yaw = P.ry; p.holder = -1; p.net = null; p.mesh.castShadow = true; }
  PL.carry = -1; stopEggs(); resetCats();
  for (const m of PRINTS) m.parent && m.parent.remove(m); PRINTS.length = 0; EMF_SRC.length = 0;
  for (const D of DOORS) { D.locked = false; }
  const [gx, gz, gl] = randomPointInRoom(ghostRoom), gy = MAP.levels[gl];
  G.gs = { x: gx, z: gz, y: gy, l: gl, yaw: 0, mode: 0, vis: 0, path: [], speed: 0.8, wait: 2, interactT: 6, eventT: rr(40, 70), huntCheckT: 15, huntT: 0, cooldown: 0, target: -1, lastSeen: null, evKind: 0, evT: 0, fixate: -1, repath: 0, phase: 0, moving: 0, breathT: 3, mareOff: null };
  G.ghostView = { x: gx, z: gz, y: gy, yaw: 0, mode: 0, vis: 0 };
  G.huntFx = 0; G.eventFx = 0;
  buildAvatars();
  hudBuildInventory();
}
function me() { return G.players[G.mySlot]; }
function alivePlayers() { return G.players.filter(p => p.alive); }

// ---------------------------------------------------------------- authoritative actions (host)
function hostEvent(ev) { applyEvent(ev); if (G.mp) Net.pushEvent(ev); }
function hostToggleLight(ri, slot, force) {
  const on = force !== undefined ? force : !G.lights[ri];
  if (on && !G.lights[ri] && G.lights.filter(Boolean).length >= 4) { hostEvent(['msg', slot, 'The fuse box can only handle four lights at once.']); return; }
  G.lights[ri] = on;
  const gs = G.gs;
  if (on && slot >= 0 && G.ghost.mare && gs && gs.mode === 0 && (logicalRoom(gs.x, gs.z, gs.y) === ri || Math.hypot(ROOMS[ri].lamp[0] - gs.x, ROOMS[ri].lamp[1] - gs.z) < 7) && Math.random() < 0.8) gs.mareOff = [ri, G.elapsed + rr(1.5, 4)];
}
function hostDoor(di, slot) {
  const D = DOORS[di]; if (!D) return;
  if (D.locked) { hostEvent(['snd', 'locked', D.hinge.x, D.y + 1, D.hinge.y, 0.7]); hostEvent(['msg', slot, 'The door won\'t budge.']); return; }
  D.target = D.target > 0.5 ? 0 : (D.closet ? 1.5 : 1.45); D.speed = 3.2;
}
function hostPickup(id, slot) {
  const it = ITEMS[id], P = G.players[slot]; if (!it || it.holder >= 0 || !P || !P.alive) return;
  const count = ITEMS.filter(x => x.holder === slot).length; if (count >= 3) { hostEvent(['msg', slot, 'Your hands are full. Drop something first (G).']); return; }
  it.holder = slot; hostEvent(['pick', slot, id]);
}
function hostDrop(id, slot, x, y, z, ry) { const it = ITEMS[id]; if (!it || it.holder !== slot) return; it.holder = -1; it.pos.set(x, y, z); it.ry = ry; }
function hostItemOn(id, on) {
  const it = ITEMS[id]; if (!it) return;
  if (it.type === 'incense') { if (on && !it.spent && !it.burnEnd) { it.on = true; it.burnEnd = G.elapsed + INCENSE_BURN; } return; }   // once lit it burns down
  if (it.type === 'meds') { if (on && !it.spent) { it.spent = true; it.on = false; } return; }
  if (it.type === 'journal') return;
  if (it.type === 'doll') { if (on && !it.spent) { it.spent = true; it.on = false; dollHunt(it); } return; }
  it.on = !!on;
}
// burning incense: drives a hunting ghost off, cuts a manifestation short, and calms a roaming ghost for a minute
function hostIncense() {
  const gs = G.gs;
  for (const it of ITEMS) {
    if (it.type !== 'incense' || !it.on) continue;
    if (G.elapsed > it.burnEnd) { it.on = false; it.spent = true; if (it.holder >= 0) hostEvent(['msg', it.holder, 'The incense has burned out.']); if (it.holder === G.mySlot) hudInventory(); continue; }
    const P = it.holder >= 0 ? G.players[it.holder] : null, p = P ? P.pos : it.pos;
    if (Math.abs(p.y - gs.y) > 1.8 || Math.hypot(p.x - gs.x, p.z - gs.z) > INCENSE_RANGE) continue;
    if (gs.mode === 2 && gs.huntT >= 2.5 && !(gs.repelT > 0)) repelGhost(p);
    else if (gs.mode === 1) gs.evT = Math.min(gs.evT, 0.01);
    else if (gs.mode === 0 && !it.calmed) { it.calmed = true; gs.cooldown = Math.max(gs.cooldown, 60); }
  }
}
function repelGhost(p) {
  const gs = G.gs; gs.repelT = INCENSE_REPEL; gs.target = -1; gs.lastSeen = null; gs.path = [];
  // flee toward whichever room point lies farthest from the smoke
  let best = null, bd = -1;
  for (let k = 0; k < 14; k++) { const ri = (Math.random() * NROOM) | 0; if (ROOMS[ri].closet || ROOMS[ri].noGhost) continue; const q = randomPointInRoom(ri), d = Math.hypot(q[0] - p.x, q[1] - p.z) + (q[2] === gs.l ? 0 : 3); if (d > bd) { bd = d; best = q; } }
  if (best) gs.path = findPath(gs.x, gs.z, gs.l, best[0], best[1], best[2]);
  hostEvent(['snd', 'recoil', r2(gs.x), r2(gs.y + 1.5), r2(gs.z), 1]);
  hostEvent(['repel']);
}
function hostAsk(slot, q, x, y, z) {
  const gs = G.gs, d = Math.abs(y - gs.y) > 1.6 ? 99 : Math.hypot(x - gs.x, z - gs.z), ri = logicalRoom(x, z, y);
  const dark = ri >= 0 && !G.lights[ri];
  const near = d < 6.5 || ri === G.ghostRoom;
  let text = '';
  if (G.ghost.ev.includes('spirit') && near && dark && gs.mode !== 2 && Math.random() < 0.6) text = pick(SB_ANSWERS[q].a);
  if (text && G.ghost.echo && Math.random() < 0.4) text = SB_ANSWERS[q].q.replace('?', '').toLowerCase() + '…';   // the Changeling parrots you
  else if (text && Math.random() < 0.15) text = 'looking for Claire';   // something in the static is still searching for her
  hostEvent(['sb', slot, text, r2(x), r2(z)]);
}
function hostRequest(slot, r) {
  const t = r[1];
  if (t === 'light') hostToggleLight(r[2], slot);
  else if (t === 'door') hostDoor(r[2], slot);
  else if (t === 'pick') hostPickup(r[2], slot);
  else if (t === 'drop') hostDrop(r[2], slot, r[3], r[4], r[5], r[6]);
  else if (t === 'on') hostItemOn(r[2], r[3]);
  else if (t === 'ask') hostAsk(slot, r[2], r[3], r[4], r[5]);
  else if (t === 'guess') hostEvent(['end', r[2], slot]);
  else if (t === 'ppick') hostPropPick(r[2], slot);
  else if (t === 'pet') hostPet(r[2], slot);
  else if (t === 'pdrop') hostPropDrop(r[2], slot, r[3], r[4], r[5], r[6], r[7], r[8], r[9]);
  else if (t === 'egg' && MAP.id === 'farm' && !G.eggOn) { G.eggOn = true; hostEvent(['egg', (Math.random() * 1e9) | 0]); }
  else if (t === 'egg' && MAP.id === 'barn' && !G.eggOn) { G.eggOn = true; hostEvent(['horse', r2(G.elapsed)]); }
  else if (t === 'egg' && MAP.id === 'bayou' && r[2] === 2 && !G.gatorBait) { G.gatorBait = true; hostEvent(['gbait']); hostEvent(['snd', 'splash', 0, 0, -28.5, 0.9]); }
  else if (t === 'egg' && MAP.id === 'bayou' && r[2] === 3) { hostEvent(['snd', 'bell', -3.0, 1.6, -26.1, 1]); if (G.gatorBait && !G.eggOn) { G.eggOn = true; hostEvent(['gator']); } }
  else if (t === 'calm' && HORSE.state === 'buck' && HORSE.calmT === null) { const P = G.players[slot]; if (P && HORSE.root && Math.hypot(P.pos.x - HORSE.root.position.x, P.pos.z - HORSE.root.position.z) < 4.5) hostEvent(['hcalm', r2(G.elapsed + 0.3), (Math.random() * 1e9) | 0]); }
}
// the nearest solid thing (at least knee high) the ghost could lay a hand on, with the face toward it, for when no wall is close
function touchSolid(x, z, FL) {
  let best = null;
  for (const c of COLL) {
    const h = c.y1 - Math.max(c.y0, FL); if (h < 0.55 || c.y0 > FL + 1.2 || c.y1 - c.y0 > 8) continue;
    const px = clamp(x, c.x0, c.x1), pz = clamp(z, c.z0, c.z1), d = Math.hypot(px - x, pz - z); if (d > 3.2 || (best && d >= best.d)) continue;
    // which face: the side the ghost is on
    const dl = x - c.x0, dr = c.x1 - x, dn = z - c.z0, df = c.z1 - z, out = [[-dl, -1, 0], [-dr, 1, 0], [-dn, 0, -1], [-df, 0, 1]].sort((a, b) => b[0] - a[0])[0];
    const nx = out[1], nz = out[2], fx = nx ? (nx < 0 ? c.x0 : c.x1) : clamp(x, c.x0 + 0.08, c.x1 - 0.08), fz = nz ? (nz < 0 ? c.z0 : c.z1) : clamp(z, c.z0 + 0.08, c.z1 - 0.08);
    const top = Math.min(c.y1 - 0.08, FL + 1.6);
    best = { x: fx + nx * 0.035, z: fz + nz * 0.035,   // colliders sit a little inside the stone; keep the print on its face
             nx, nz, d, y0: Math.max(FL + 0.3, Math.min(top - 0.15, FL + 0.8)), y1: top };
  }
  return best;
}
// local wrapper: host applies at once, clients send a request
function request(...args) { if (G.isHost) hostRequest(G.mySlot, [0, ...args]); else Net.request(args); }

// ---------------------------------------------------------------- events (everyone)
function applyEvent(ev) {
  const t = ev[0], now = performance.now() / 1000;
  if (t === 'emf') EMF_SRC.push({ x: ev[1], y: ev[2], z: ev[3], l: ev[4], t: now });
  else if (t === 'pr') addPrint(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6], ev[7], ev[8], ev[9]);
  else if (t === 'snd') sfxAt(ev[1], new V3(ev[2], ev[3], ev[4]), ev[5]);
  else if (t === 'msg') { if (ev[1] === G.mySlot || ev[1] < 0) sub(ev[2], 'sys'); }
  else if (t === 'pick') { if (ev[1] === G.mySlot) { hudBuildInventory(); sfx('pickup', 0.6); } }
  else if (t === 'sb') onSpiritAnswer(ev[1], ev[2], ev[3], ev[4]);
  else if (t === 'ge') onGhostEventStart(ev[1], ev[2]);
  else if (t === 'hunt') onHunt(ev[1]);
  else if (t === 'kill') onKill(ev[1]);
  else if (t === 'caught') onCaught(ev[1]);
  else if (t === 'end') onRoundEnd(ev[1], ev[2]);
  else if (t === 'repel') onRepel();
  else if (t === 'egg') startGiant(ev[1]);
  else if (t === 'horse') { G.eggOn = true; startGhostHorse(ev[1]); }
  else if (t === 'gbait') G.gatorBait = true;
  else if (t === 'jw') { const J = ITEMS[ev[1]]; if (J) { J.spent = true; J.writeT = JOURNAL_LIFT; } }
  else if (t === 'gator') startGator();
  else if (t === 'hcalm') calmGhostHorse(ev[1], ev[2]);
  else if (t === 'throw') { const p = PROPO[ev[1]]; if (p && !G.isHost) { p.sleep = false; p.settle = 0; } }
}

// ---------------------------------------------------------------- ghost brain (host only)
function ghostActivity() {
  const ps = alivePlayers(); const avg = ps.length ? ps.reduce((a, p) => a + p.sanity, 0) / ps.length : 100;
  let a = 1 + (100 - avg) / 70;
  if (G.ghost.shy) { const near = ps.filter(p => Math.hypot(p.pos.x - G.gs.x, p.pos.z - G.gs.z) < 6).length; if (near > 1) a *= 0.3; }
  return a;
}
function emfLevel(base) { return (G.ghost.ev.includes('emf') && Math.random() < 0.32) ? 5 : base; }
function ghostThink(dt) {
  const gs = G.gs, gh = G.ghost;
  hostIncense(); hostCarryTick();
  gs.cooldown -= dt;
  if (gs.mode === 0) {
    // ----- wander
    if (gs.path.length === 0) {
      gs.wait -= dt;
      if (gs.wait <= 0) {
        const wander = gh.wander || 0.12;
        let ri = G.ghostRoom;
        if (Math.random() < wander) { const choices = [...Array(NROOM).keys()].filter(i => !ROOMS[i].noGhost); ri = pick(choices); }
        const [x, z, l] = randomPointInRoom(ri);
        gs.path = findPath(gs.x, gs.z, gs.l, x, z, l); gs.speed = 0.75; gs.wait = rr(1.5, 6);
      }
    }
    // ----- signature behaviours
    if (gh.breathes) { gs.breathT -= dt; if (gs.breathT <= 0) { gs.breathT = rr(3.5, 6.5); if (alivePlayers().some(p => p.inside && Math.abs(p.pos.y - gs.y) < 1.4 && Math.hypot(p.pos.x - gs.x, p.pos.z - gs.z) < 2.6)) hostEvent(['snd', 'gbreath', r2(gs.x), r2(gs.y + 1.5), r2(gs.z), 0.9]); } }
    if (gs.mareOff && G.elapsed > gs.mareOff[1]) {
      const ri = gs.mareOff[0]; gs.mareOff = null;
      if (G.lights[ri]) { hostToggleLight(ri, -1, false); const [x, z] = ROOMS[ri].sw, sy = ROOMS[ri].y + 1.25; hostEvent(['snd', 'switch', x, sy, z, 0.8]); hostEvent(['emf', x, sy, z, emfLevel(2)]); }
    }
    // ----- interactions
    gs.interactT -= dt * ghostActivity();
    if (gs.interactT <= 0) { ghostInteract(); gs.interactT = rr(5, 11); }
    // ----- ghost events
    gs.eventT -= dt * (0.6 + ghostActivity() * 0.4);
    if (gs.eventT <= 0) { gs.eventT = rr(55, 100); tryGhostEvent(); }
    // ----- hunts
    gs.huntCheckT -= dt;
    if (gs.huntCheckT <= 0) {
      gs.huntCheckT = 10;
      if (G.elapsed > 50 && gs.cooldown <= 0) {
        const el = alivePlayers().filter(p => p.inside && p.sanity < (gh.anySanity ? 101 : 50));
        if (el.length) {
          const avg = el.reduce((a, p) => a + p.sanity, 0) / el.length;
          const chance = 0.25 * Math.max(0.3, 1 + (50 - avg) / 40) * (gh.huntChance || 1);
          if (Math.random() < chance) startHunt();
        }
      }
    }
  } else if (gs.mode === 1) {
    gs.evT -= dt;
    if (gs.evKind === 1) { // brief chase
      const P = G.players[gs.target];
      if (P && P.alive && P.inside) { gs.repath -= dt; if (gs.repath <= 0) { gs.repath = 0.4; gs.path = findPath(gs.x, gs.z, gs.l, P.pos.x, P.pos.z, levelOf(P.pos.y)); } gs.speed = 2.0; if (Math.hypot(P.pos.x - gs.x, P.pos.z - gs.z) < 0.7 && Math.abs(P.pos.y - gs.y) < 1) { gs.evT = 0; hostEvent(['snd', 'lunge', gs.x, gs.y + 1.5, gs.z, 1]); } }
    }
    if (gs.evT <= 0) { gs.mode = 0; gs.vis = 0; gs.path = []; gs.wait = 2; hostEvent(['snd', 'vanish', gs.x, gs.y + 1.2, gs.z, 0.8]); }
  } else if (gs.mode === 2) huntThink(dt);
  // ----- movement along path
  gs.moving = 0;
  if (gs.path.length && !(gs.mode === 2 && gs.huntT < 2.5)) {
    const [tx, tz, tl] = gs.path[0]; const dx = tx - gs.x, dz = tz - gs.z, d = Math.hypot(dx, dz);
    const step = gs.speed * dt;
    if (d <= step) { gs.x = tx; gs.z = tz; if (tl !== undefined) gs.l = tl; gs.path.shift(); }
    else { gs.x += dx / d * step; gs.z += dz / d * step; gs.yaw = gs.yaw + angDiff(gs.yaw, Math.atan2(-dx, -dz)) * clamp(dt * 6, 0, 1); }
    gs.moving = gs.speed;
    gs.y = groundY(gs.x, gs.z, gs.y); gs.l = levelOf(gs.y);
    // brushing past doors makes them drift
    if (gs.mode === 0 && Math.random() < dt * 0.4) for (const D of DOORS) { const c = doorCenter(D); if (Math.hypot(c.x - gs.x, c.z - gs.z) < 1.0 && Math.abs(D.y - gs.y) < 1 && !D.locked) { D.target = clamp(D.angle + rr(-0.4, 0.4), 0, 1.5); D.speed = 0.5; } }
  }
}
function ghostInteract() {
  const gs = G.gs, gh = G.ghost, hasUV = gh.ev.includes('uv');
  const opts = [];
  const nearDoors = DOORS.filter(D => !D.locked && !D.ext && Math.abs(D.y - gs.y) < 1 && Math.hypot(doorCenter(D).x - gs.x, doorCenter(D).z - gs.z) < 3.5);
  const nearProps = PROPO.filter(p => p.holder < 0 && Math.abs(p.mesh.position.y - gs.y) < 1.6 && Math.hypot(p.mesh.position.x - gs.x, p.mesh.position.z - gs.z) < 3.2);
  const ri = logicalRoom(gs.x, gs.z, gs.y), FL = MAP.levels[gs.l];
  const journals = ITEMS.filter(it => it.type === 'journal' && it.holder < 0 && !it.spent && Math.abs(it.pos.y - gs.y) < 1.6 && Math.hypot(it.pos.x - gs.x, it.pos.z - gs.z) < 4.5);
  if (journals.length && gh.ev.includes('writing')) opts.push(['write', 4]);
  if (nearDoors.length) opts.push(['door', 3]);
  if (nearProps.length) opts.push(['throw', 2.5 * (gh.throwy || 1)]);
  opts.push(['touch', 2.5]);
  if (ri >= 0 && G.lights[ri] && !gh.noSwitch) opts.push(['switch', 1.5 * (gh.lightsOff || 1)]);
  opts.push(['emf', 1]); opts.push(['sound', 1]);
  let tot = opts.reduce((a, o) => a + o[1], 0), r = Math.random() * tot, choice = opts[0][0];
  for (const o of opts) { r -= o[1]; if (r <= 0) { choice = o[0]; break; } }
  if (choice === 'write') {   // ghost writing: the journal's pages fill with scrawl
    const J = pick(journals); J.spent = true;
    hostEvent(['snd', 'scribble', r2(J.pos.x), r2(J.pos.y + 0.1), r2(J.pos.z), 0.7]); hostEvent(['jw', J.id]);
  } else if (choice === 'door') {
    const D = pick(nearDoors); const slam = gh.slams && Math.random() < 0.6;
    D.target = slam ? (D.angle > 0.5 ? 0 : 1.45) : clamp(D.angle + (D.angle > 0.7 ? -1 : 1) * rr(0.4, 1.0), 0, 1.5); D.speed = slam ? 7 : 0.7;
    const c = doorCenter(D); hostEvent(['emf', r2(c.x), r2(c.y), r2(c.z), emfLevel(3)]);
    if (hasUV && Math.random() < 0.65) hostEvent(['pr', r2(rr(0.25, D.w - 0.12)), r2(rr(0.9, 1.5)), 0, 0, 0, r2(rr(-0.4, 0.4)), D.i, Math.random() < 0.5 ? 1 : -1, gh.childPrints ? 0.55 : false]);
  } else if (choice === 'throw') {
    const n = gh.throwy && Math.random() < 0.5 ? Math.min(3, nearProps.length) : 1;
    for (let k = 0; k < n; k++) {
      const p = nearProps.splice((Math.random() * nearProps.length) | 0, 1)[0]; if (!p) break;
      let dx = p.mesh.position.x - gs.x, dz = p.mesh.position.z - gs.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const a = rr(-0.8, 0.8), c = Math.cos(a), s = Math.sin(a);
      throwProp(p, dx * c - dz * s, dx * s + dz * c, rr(2.2, 4.5));
      hostEvent(['throw', p.i]);
      hostEvent(['emf', r2(p.mesh.position.x), r2(p.mesh.position.y), r2(p.mesh.position.z), emfLevel(3)]);
    }
  } else if (choice === 'touch') {
    let best = null;
    for (let k = 0; k < 8; k++) { const a = Math.random() * Math.PI * 2, h = rayWall(gs.x, gs.z, Math.cos(a), Math.sin(a), 2.4, FL); if (h && (!best || h.d < best.d)) best = h; }
    if (!best) best = touchSolid(gs.x, gs.z, FL);   // out in the open (the bayou graveyard): a headstone, a crypt, a post
    if (best) {
      const y = best.y0 !== undefined ? rr(best.y0, best.y1) : rr(FL + 0.85, FL + 1.7);
      hostEvent(['emf', r2(best.x), r2(y), r2(best.z), emfLevel(2)]);
      hostEvent(['snd', 'knock', r2(best.x), r2(y), r2(best.z), 0.5]);
      if (hasUV && Math.random() < 0.75) hostEvent(['pr', r2(best.x), r2(y), r2(best.z), best.nx, best.nz, r2(rr(-0.5, 0.5)), -1, 1, gh.childPrints ? 0.55 : false]);
    }
  } else if (choice === 'switch') {
    hostToggleLight(ri, -1, false);
    const [x, z, nx, nz] = ROOMS[ri].sw, sy = ROOMS[ri].y + 1.25;
    hostEvent(['snd', 'switch', x, sy, z, 0.8]);
    hostEvent(['emf', x, sy, z, emfLevel(2)]);
    if (hasUV && Math.random() < 0.6) hostEvent(['pr', r2(x + nz * 0.02), sy, r2(z + nx * 0.02), nx, nz, 0, -1, 1, true]);
  } else if (choice === 'emf') {
    hostEvent(['emf', r2(gs.x), r2(FL + 1.0), r2(gs.z), emfLevel(2)]);
  } else {
    hostEvent(['snd', pick(['whisper', 'creak', 'knock', 'step']), r2(gs.x), r2(FL + 1.2), r2(gs.z), 0.6]);
  }
}
function tryGhostEvent() {
  const gs = G.gs;
  const cands = alivePlayers().filter(p => p.inside && !p.hidden && Math.abs(p.pos.y - gs.y) < 1.6 && Math.hypot(p.pos.x - gs.x, p.pos.z - gs.z) < 10);
  if (!cands.length) return;
  const P = pick(cands);
  // materialise near the investigator, inside line of sight
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * Math.PI * 2, d = rr(2.5, 5.5), x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d;
    const pl = levelOf(P.pos.y), py = MAP.levels[pl];
    const [i, j] = navCell(x, z); if (navBlocked(i, j, pl) || !insideHouse(x, z, py)) continue;
    if (!sightClear(x, z, P.pos.x, P.pos.z, py, P.pos.y)) continue;
    gs.x = x; gs.z = z; gs.y = py; gs.l = pl; gs.yaw = Math.atan2(-(P.pos.x - x), -(P.pos.z - z));
    gs.mode = 1; gs.vis = 1; gs.target = P.slot; gs.evKind = Math.random() < 0.45 ? 1 : 0; gs.evT = gs.evKind ? 3.4 : 2.6; gs.path = []; gs.repath = 0;
    hostEvent(['ge', gs.evKind, P.slot]);
    if (G.ghost.wail) hostEvent(['snd', 'wail', r2(x), r2(py + 1.6), r2(z), 1]);
    hostEvent(['emf', r2(x), r2(py + 1), r2(z), emfLevel(4)]);
    const ri = logicalRoom(x, z, py), g = G.ghost;
    if (g.popLights) {   // Onryo: the bulb bursts wherever it shows itself, and where its witness stands
      for (const r of new Set([ri, logicalRoom(P.pos.x, P.pos.z, P.pos.y)])) {
        if (r < 0 || !G.lights[r]) continue;
        hostToggleLight(r, -1, false); const L = ROOMS[r].lamp; hostEvent(['snd', 'bulbPop', r2(L[0]), r2(ROOMS[r].y + 2.3), r2(L[1]), 1]);
      }
    } else if (ri >= 0 && G.lights[ri] && !g.keepsLights && Math.random() < 0.5) hostToggleLight(ri, -1, false);
    return;
  }
}
// the voodoo doll: drive the pin in and the ghost hunts at once, whatever its sanity checks or cooldown say
function dollHunt(it) {
  const gs = G.gs; if (!gs || gs.mode === 2 || gs.mode === 3) return;
  if (gs.mode === 1) { gs.mode = 0; gs.vis = 0; }
  const P = G.players[it.holder] || me();
  hostEvent(['snd', 'doll', r2(P.pos.x), r2(P.pos.y + 1.4), r2(P.pos.z), 1]);
  hostEvent(['msg', -1, (it.holder >= 0 ? G.players[it.holder].nick : 'Someone') + ' drove the pin into the voodoo doll.']);
  startHunt();
}
function startHunt() {
  const gs = G.gs;
  if (G.ghost.preHunt) { for (let i = 0; i < NROOM; i++) G.lights[i] = false; hostEvent(['snd', 'breaker', r2(gs.x), r2(gs.y + 2), r2(gs.z), 1]); }
  gs.mode = 2; gs.vis = 1; gs.huntT = 0; gs.repelT = 0; gs.huntDur = rr(28, 33); gs.path = []; gs.lastSeen = null; gs.target = -1;
  if (G.ghost.fixate) { const c = alivePlayers().filter(p => p.inside); gs.fixate = c.length ? pick(c).slot : -1; }
  for (const fd of DOORS) if (fd.ext) { fd.target = 0; fd.speed = 6; fd.locked = true; } G.frontLocked = true;
  hostEvent(['hunt', 1]);
}
function endHunt() {
  const gs = G.gs; gs.mode = 0; gs.vis = 0; gs.path = []; gs.wait = 3; gs.cooldown = 28 * (G.ghost.huntCd || 1); gs.eventT = Math.max(gs.eventT, 20);
  for (const fd of DOORS) if (fd.ext) fd.locked = false; G.frontLocked = false;
  hostEvent(['hunt', 0]);
}
function huntThink(dt) {
  const gs = G.gs, gh = G.ghost; gs.huntT += dt;
  if (gs.huntT > gs.huntDur) { endHunt(); return; }
  if (gs.huntT < 2.5) return; // manifesting
  if (gs.repelT > 0) { gs.repelT -= dt; gs.speed = 2.4; return; }   // fleeing the incense: no chasing, no killing
  // who can it see?
  let best = null, bd = 1e9;
  for (const P of alivePlayers()) {
    if (!P.inside || P.hidden) continue;
    if (gs.fixate >= 0 && P.slot !== gs.fixate && G.players[gs.fixate]?.alive) continue;
    const d = Math.hypot(P.pos.x - gs.x, P.pos.z - gs.z);
    if (d < 16 && sightClear(gs.x, gs.z, P.pos.x, P.pos.z, gs.y, P.pos.y) && d < bd) { bd = d; best = P; }
  }
  const dyn = new Set(); for (const di in NAV.closet) if (DOORS[di].angle < 0.3) for (const k of NAV.closet[di]) dyn.add(k);
  let base = 1.65 * (gh.speed || 1);
  if (best) {
    gs.lastSeen = [best.pos.x, best.pos.z, levelOf(best.pos.y)]; gs.target = best.slot;
    gs.repath -= dt; if (gs.repath <= 0 || !gs.path.length) { gs.repath = 0.35; gs.path = findPath(gs.x, gs.z, gs.l, best.pos.x, best.pos.z, levelOf(best.pos.y), dyn); }
    gs.speed = gh.revenant ? 3.0 : (gh.speedLos && bd > 3 ? base * 1.3 : base * (1 + Math.min(gs.huntT, 20) * 0.012));
  } else {
    gs.speed = gh.revenant ? 1.0 : base * 0.9;
    if (!gs.path.length) {
      if (gs.lastSeen) { gs.path = findPath(gs.x, gs.z, gs.l, gs.lastSeen[0], gs.lastSeen[1], gs.lastSeen[2], dyn); gs.lastSeen = null; }
      else { const here = logicalRoom(gs.x, gs.z, gs.y); const ri = Math.random() < 0.5 ? (here >= 0 ? here : G.ghostRoom) : pick([...Array(NROOM).keys()]); const [x, z, l] = randomPointInRoom(ri); gs.path = findPath(gs.x, gs.z, gs.l, x, z, l, dyn); }
    }
  }
  // touch = death
  for (const P of alivePlayers()) {
    if (P.hidden || !P.inside) continue;
    if (Math.hypot(P.pos.x - gs.x, P.pos.z - gs.z) < 0.62 && Math.abs(P.pos.y - gs.y) < 1) { if (G.mode === 'rookie') { hostEvent(['caught', P.slot]); endHunt(); } else killPlayer(P.slot); return; }
  }
}
function killPlayer(slot) {
  const P = G.players[slot]; if (!P || !P.alive) return;
  hostEvent(['kill', slot]);
  const gs = G.gs; gs.mode = 3; gs.vis = 1; gs.path = []; gs.deathT = 3.2; gs.victim = slot;
  setTimeout(() => {
    if (G.state !== 'play') return;
    if (gs.mode === 3) { endHunt(); }
    if (!alivePlayers().length) hostEvent(['end', -1, -1]);
  }, 3300);
}

// ---------------------------------------------------------------- local reactions
function onSpiritAnswer(slot, text, x, z) {
  const mine = slot === G.mySlot, P = me();
  const near = P && Math.hypot(P.pos.x - x, P.pos.z - z) < 7;
  if (!mine && !near) return;
  if (text) {
    setTimeout(() => { sub('“' + text + '”', 'ghost'); ghostVoice(text); }, 700 + Math.random() * 600);
    if (mine) G.journal.heard = true;
  } else if (mine) setTimeout(() => sub('Only static answers.', 'sys'), 1200);
}
function onGhostEventStart(kind, slot) {
  G.eventFx = 1; G.evWatch = { t: 0, seen: false };
  sfxAt('manifest', new V3(G.ghostView.x, G.ghostView.y + 1.4, G.ghostView.z), 0.9);   // a recorded horror hit, where it stands
}
function onRepel() {
  G.repelFx = 1;
  const P = me(); if (P && P.alive && Math.hypot(P.pos.x - G.ghostView.x, P.pos.z - G.ghostView.z) < 14) sub('The ghost shrieks and recoils from the smoke!', 'sys');
}
function onHunt(on) {
  G.huntOn = !!on;
  if (on) { sfx('huntStart', 0.8); sfx('huntHit', 0.75); sub('The lights are failing. Hide.', 'sys'); }
  else { sfx('huntEnd', 0.7); }
}
function onCaught(slot) {
  const P = G.players[slot]; if (!P) return;
  sfxAt('scream', P.pos.clone().setY(P.pos.y + 1.5), slot === G.mySlot ? 0.6 : 0.8);
  if (slot === G.mySlot) { P.sanity = clamp(P.sanity - 25, 0, 100); POST.scare = 1; sfx('caught', 1); sub('It caught you, and let you go. Your sanity took the blow.', 'sys'); }
  else sub(P.nick + ' was caught, but the ghost let them go.', 'sys');
}
function onKill(slot) {
  const P = G.players[slot]; if (!P) return; P.alive = false; G.stats.deaths++;
  if (P.avatar) P.avatar.visible = false;
  for (const it of ITEMS) if (it.holder === slot) { it.holder = -1; it.on = false; it.pos.set(P.pos.x, groundY(P.pos.x, P.pos.z, P.pos.y), P.pos.z); placeItemInWorld(it); }
  if (slot === G.mySlot) beginDeath();
  else { sfxAt('scream', P.pos.clone().setY(P.pos.y + 1.5), 1); sub(P.nick + ' was taken.', 'sys'); }
  hudTeam();
}
