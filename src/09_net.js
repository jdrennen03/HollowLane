// ---------------------------------------------------------------- team play over the artifact "room"
const Net = {
  room: null, lobby: null, code: '', isHost: false, nick: '', unsub: [], reqSeq: 0, reqs: [], evSeq: 0, evs: [], lastEv: 0,
  sendT: 0, gameId: null, roster: null, hostPeer: null, inGame: false,
  async init() {
    try { this.room = (window.claude && window.claude.use) ? await window.claude.use('room') : null; } catch (e) { this.room = null; }
    return !!this.room;
  },
  myPeer() { const me2 = this.lobby && this.lobby.peers().find(p => p.sameTab); return me2 ? me2.peer : null; },
  async open(code, host, nick) {
    this.code = code; this.isHost = host; this.nick = nick; this.inGame = false; this.gameId = null; $('lobbySet').dataset.built = '';
    window.__hlHost = host; this.lobby = await this.room.join('hl-' + code.toLowerCase());
    this.unsub.push(this.lobby.onPeers(ch => this.onPeers(ch), e => this.onError(e)));
    await this.lobby.presence({ n: nick, h: host ? 1 : 0, ch: CURCHAR, st: 'lobby', start: null, m: host ? CURMAP : null, md: host ? CURMODE : null });
  },
  announce() { if (this.lobby && this.isHost) this.lobby.presence({ m: CURMAP, md: CURMODE }).catch(() => { }); },
  // the round is over (or abandoned): drop the game state from presence but stay in the lobby
  async toLobby() {
    if (!this.lobby) return;
    this.inGame = false; this.lastSeenGame = this.gameId; this.reqs = []; this.evs = [];
    await this.lobby.presence({ st: 'lobby', start: null, ev: null, w: null, g: null, k: null, rq: null, p: null, m: this.isHost ? CURMAP : null, md: this.isHost ? CURMODE : null }).catch(() => { });
  },
  async leave() { for (const u of this.unsub) try { u(); } catch (e) { } this.unsub = []; if (this.lobby) try { await this.lobby.leave(); } catch (e) { } this.lobby = null; this.inGame = false; },
  onError(e) { UI.lobbyNote('Connection problem: ' + (e && e.code || 'unknown') + '.'); },
  lobbyPeers() { return this.lobby ? this.lobby.peers().filter(p => p.presence && p.presence.n) : []; },
  hostStart() {
    const ps = this.lobbyPeers().filter(p => p.kind === 'viewer');
    const mine = ps.find(p => p.sameTab); const others = ps.filter(p => !p.sameTab).sort((a, b) => a.peer < b.peer ? -1 : 1).slice(0, 3);
    const ro = [mine, ...others].map((p, i) => [p.peer, String(p.presence.n).slice(0, 14) || ('Investigator ' + (i + 1)), p.presence.ch === 'm' ? 'm' : 'f']);
    const seed = (Math.random() * 1e9) | 0, gi = (Math.random() * GHOSTS.length) | 0, gr = pickGhostRoom();
    this.gameId = 'g' + seed;
    this.evSeq = 0; this.evs = []; this.reqs = []; this.reqSeq = 0;
    const gm = (Math.random() * GHOST_FILES.length) | 0;
    const start = { id: this.gameId, seed, gi, gr, ro, map: CURMAP, gm, mode: CURMODE };
    this.lobby.presence({ st: 'game', start, ev: [], w: null, g: null, rq: [] });
    this.roster = ro; this.hostPeer = mine.peer; this.inGame = true;
    beginGame({ map: CURMAP, mode: CURMODE, gm, seed, ghostIdx: gi, ghostRoom: gr, roster: ro.map((r, i) => ({ slot: i, peer: r[0], nick: r[1], ch: r[2] })), mySlot: 0, mp: true, host: true });
  },
  onPeers(ch) {
    const peers = ch.peers;
    if (!this.inGame) {
      UI.renderLobby(peers.filter(p => p.presence && p.presence.n));
      if (!this.isHost) {
        const h = peers.find(p => p.presence && p.presence.h === 1 && !p.sameTab);
        if (h && h.presence.st === 'game' && h.presence.start && h.presence.start.id !== this.lastSeenGame) {
          const s = h.presence.start; this.lastSeenGame = s.id;
          const mp = this.myPeer(); const slot = s.ro.findIndex(r => r[0] === mp);
          if (slot < 0) { UI.lobbyNote('That investigation started without you. The lobby was full.'); return; }
          this.roster = s.ro; this.hostPeer = h.peer; this.gameId = s.id; this.inGame = true; this.lastEv = 0; this.reqs = []; this.reqSeq = 0;
          beginGame({ map: s.map || 'lane', mode: s.mode || 'pro', gm: s.gm ?? 0, seed: s.seed, ghostIdx: s.gi, ghostRoom: s.gr, roster: s.ro.map((r, i) => ({ slot: i, peer: r[0], nick: r[1], ch: r[2] })), mySlot: slot, mp: true, host: false });
        }
      }
      return;
    }
    // ---- in game
    const roster = this.roster || [];
    if (!this.isHost) {   // the host went back to the lobby, or already started the next round
      const h = peers.find(p => p.peer === this.hostPeer), hp = h && h.presence;
      if (hp && hp.st === 'lobby' && G.state === 'play') { sub('The host ended the investigation.', 'sys'); setTimeout(() => backToLobby(), 1500); this.inGame = false; return; }
      if (hp && hp.st === 'game' && hp.start && hp.start.id !== this.gameId) { this.inGame = false; this.onPeers(ch); return; }
    }
    for (const left of ch.left) {
      const slot = roster.findIndex(r => r[0] === left.peer);
      if (left.peer === this.hostPeer && !this.isHost) { sub('The host left. The investigation is over.', 'sys'); setTimeout(() => quitToMenu(), 2500); return; }
      if (slot >= 0 && G.players[slot] && G.players[slot].alive) { G.players[slot].alive = false; G.players[slot].gone = true; if (G.players[slot].avatar) G.players[slot].avatar.visible = false; for (const it of ITEMS) if (it.holder === slot) it.holder = -1; sub(G.players[slot].nick + ' left the investigation.', 'sys'); hudTeam(); if (this.isHost && !alivePlayers().length) hostEvent(['end', -1, -1]); }
    }
    for (const p of peers) {
      if (p.sameTab || !p.presence) continue;
      const pr = p.presence; const slot = roster.findIndex(r => r[0] === p.peer); if (slot < 0) continue;
      const P = G.players[slot]; if (!P) continue;
      if (pr.p) { P.tpos.set(pr.p[0], pr.p[1], pr.p[2]); P.yaw = pr.p[3]; P.pitch = pr.p[4]; }
      P.mountYaw = pr.mt ?? null;
      if (pr.s !== undefined) P.sanity = pr.s; P.flash = !!pr.f; P.held = pr.hd ?? -1; P.moving = pr.m || 0; P.crouch = !!pr.c;
      P.inside = insideHouse(P.tpos.x, P.tpos.z, P.tpos.y); P.room = logicalRoom(P.tpos.x, P.tpos.z, P.tpos.y);
      const ri = roomIdxAt(P.tpos.x, P.tpos.z, P.tpos.y); P.hidden = ri >= 0 && !!ROOMS[ri].closet && DOORS[ROOMS[ri].door].angle < 0.15;
      if (this.isHost && pr.rq) { for (const r of pr.rq) if (r[0] > (P.lastReqSeq || 0)) { P.lastReqSeq = r[0]; hostRequest(slot, r); } }
      if (!this.isHost && p.peer === this.hostPeer) this.applyHost(pr);
    }
  },
  applyHost(pr) {
    if (pr.start && pr.start.id !== this.gameId) return;
    if (pr.ev) for (const e of pr.ev) if (e[0] > this.lastEv) { this.lastEv = e[0]; applyEvent(e.slice(1)); }
    const w = pr.w; const now = performance.now();
    if (w) {
      for (let i = 0; i < NROOM; i++) G.lights[i] = !!(w.L & (1 << i));
      w.D.forEach((a, i) => { if (DOORS[i]) DOORS[i].net = a / 100; });
      DOORS[0].locked = !!w.lk; G.frontLocked = !!w.lk; G.elapsed = w.t;
      w.I.forEach((s, i) => {
        const it = ITEMS[i]; if (!it) return;
        if (it.pendT && now - it.pendT < 1200) return;
        const wasMine = it.holder === G.mySlot;
        it.holder = s[0];
        if (s[0] < 0) { if (it.pos.x !== s[1] || it.pos.y !== s[2] || it.pos.z !== s[3] || it.ry !== s[4]) { it.pos.set(s[1], s[2], s[3]); it.ry = s[4]; if (it.where === 'world') { it.obj.position.copy(it.pos); it.obj.rotation.set(0, it.ry, 0); } } }
        if (s[0] !== G.mySlot) it.on = !!s[5];
        if (!!s[6] !== !!it.spent) { it.spent = !!s[6]; if (it.spent) it.on = false; if (it.holder === G.mySlot) hudInventory(); }
        if (wasMine !== (it.holder === G.mySlot)) hudBuildInventory();
      });
      if (w.P) for (const q of w.P) { const p = PROPO[q[0]]; if (!p) continue; p.sleep = true; if (!(p.pendT && now - p.pendT < 1200)) p.holder = q[8] ?? -1; if (p.holder === G.mySlot && PL.carry === p.i) continue; p.net = q; }
    }
    if (pr.k) pr.k.forEach((q, i) => { if (CATS[i]) CATS[i].net = q; });
    if (pr.g) { const g = pr.g, v = G.ghostView; v.tx = g[0]; v.tz = g[1]; v.tyaw = g[2]; v.mode = g[3]; v.vis = g[4]; v.moving = g[5]; v.huntT = g[6]; v.ty = g[7] ?? v.y; }
  },
  request(args) { this.reqs.push([++this.reqSeq, ...args]); if (this.reqs.length > 10) this.reqs.shift(); if (args[0] === 'pick' || args[0] === 'drop') { const it = ITEMS[args[1]]; if (it) it.pendT = performance.now(); } this.flush(true); },
  pushEvent(ev) { this.evs.push([++this.evSeq, ...ev]); if (this.evs.length > 18) this.evs.shift(); this.flush(true); },
  flush(force) {
    if (!this.lobby || !this.inGame) return;
    const now = performance.now(); if (!force && now - this.sendT < 66) return; this.sendT = now;
    const P = me(); if (!P) return;
    const cam = PL.cam;
    const out = { p: [r2(P.pos.x), r2(P.pos.y), r2(P.pos.z), r2(P.yaw), r2(P.pitch)], s: Math.round(P.sanity), f: P.flash ? 1 : 0, hd: P.held, m: r2(P.moving || 0), c: P.crouch ? 1 : 0, rq: this.reqs, mt: riding(G.mySlot) ? r2(riding(G.mySlot).yaw) : onWagon(G.mySlot) === 'drive' ? r2(STB.wagon.yaw) : null };
    if (this.isHost) {
      const tnow = performance.now() / 1000;
      const moving = PROPO.filter(p => tnow - p.moved < 1.5).sort((a, b) => (b.holder >= 0) - (a.holder >= 0)).slice(0, 8).map(p => { const m = p.mesh; return [p.i, r2(m.position.x), r2(m.position.y), r2(m.position.z), r2(m.quaternion.x), r2(m.quaternion.y), r2(m.quaternion.z), r2(m.quaternion.w), p.holder]; });
      let L = 0; G.lights.forEach((on, i) => { if (on) L |= (1 << i); });
      out.w = { L, D: DOORS.map(d => Math.round(d.angle * 100)), lk: G.frontLocked ? 1 : 0, t: r2(G.elapsed), I: ITEMS.map(it => [it.holder, r2(it.pos.x), r2(it.pos.y), r2(it.pos.z), r2(it.ry), it.on ? 1 : 0, it.spent ? 1 : 0]), P: moving };
      if (CATS.length) out.k = CATS.map(c => [r2(c.x), r2(c.y), r2(c.z), r2(c.yaw), c.state === 'walk' ? 0 : c.pose, r2(c.state === 'walk' ? c.speed : 0), c.wary ? 1 : 0]);
      const gs = G.gs; out.g = [r2(gs.x), r2(gs.z), r2(gs.yaw), gs.mode, gs.vis, r2(gs.moving), r2(gs.huntT || 0), r2(gs.y)];
      let evs = this.evs.slice();
      while (evs.length && JSON.stringify({ ...out, ev: evs }).length > 3900) evs.shift();
      out.ev = evs;
    }
    this.lobby.presence(out).catch(() => { });
  },
};
function pickGhostRoom() { const c = ROOMS.map((r, i) => i).filter(i => i < NROOM && !ROOMS[i].noGhost); return pick(c); }
function randCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[(Math.random() * A.length) | 0]; return s; }
