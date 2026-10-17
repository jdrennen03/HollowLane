// LAN stand-in for the claude.ai room API: same join/presence/peers/onPeers surface, carried over a WebSocket relay
// that the host's copy of the app runs (see main.js). Joiners find the host by lobby code with a UDP broadcast,
// or connect directly with CODE@address.
(() => {
  const D = window.hlDesktop; if (!D) return;
  const myPeer = Math.random().toString(36).slice(2, 12);
  const ROOM = {
    async join(name) {
      const m = /^hl-([a-z]{4})(?:@(.+))?$/i.exec(name); if (!m) throw { code: 'bad_code' };
      const code = m[1].toUpperCase(), host = !!window.__hlHost;
      let url;
      if (host) { const r = await D.hostStart(code); url = 'ws://127.0.0.1:' + r.port; showLan(code, r.ips); }
      else if (m[2]) { const a = m[2].toLowerCase(); url = 'ws://' + (a.includes(':') ? a : a + ':47615'); }
      else { const r = await D.discover(code); if (!r) throw { code: 'no host with that code on this network' }; url = 'ws://' + r.ip + ':' + r.port; }
      const ws = new WebSocket(url);
      await new Promise((res, rej) => { const t = setTimeout(() => rej({ code: 'timed out' }), 6000); ws.onopen = () => { clearTimeout(t); res(); }; ws.onerror = () => { clearTimeout(t); rej({ code: 'could not reach host' }); }; });
      const peers = new Map(); let pres = {}, leaving = false; const ls = [], errs = [];
      const me = () => ({ peer: myPeer, sameTab: true, isMe: true, kind: 'viewer', presence: pres, by: null, guest: false });
      const other = (peer, p) => ({ peer, sameTab: false, isMe: false, kind: 'viewer', presence: p, by: null, guest: false });
      peers.set(myPeer, me());
      const snap = () => Object.freeze([...peers.values()]);
      const fire = (j = [], l = [], u = []) => { const ps = snap(); for (const f of ls) try { f({ peers: ps, joined: j, left: l, updated: u }); } catch (e) { console.error(e); } };
      const tx = m => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
      ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.t === 'all') { const j = m.list.map(x => other(x.peer, x.pres)); for (const p of j) peers.set(p.peer, p); fire(j); }
        else if (m.t === 'p') { const ex = peers.has(m.peer), p = other(m.peer, m.pres); peers.set(m.peer, p); fire(ex ? [] : [p], [], ex ? [p] : []); }
        else if (m.t === 'l') { const p = peers.get(m.peer); peers.delete(m.peer); if (p) fire([], [p]); }
        else if (m.t === 'err') for (const f of errs) f({ code: m.code });
      };
      ws.onclose = () => { if (leaving) return; const gone = [...peers.values()].filter(p => !p.sameTab); for (const p of gone) peers.delete(p.peer); if (gone.length) fire([], gone); for (const f of errs) f({ code: 'lost connection to host' }); };
      tx({ t: 'hello', room: code, peer: myPeer, pres });
      return {
        name,
        async presence(patch) {
          pres = { ...pres };
          for (const k in patch) { if (patch[k] === null) delete pres[k]; else pres[k] = JSON.parse(JSON.stringify(patch[k])); }
          peers.set(myPeer, me()); tx({ t: 'pres', pres }); fire([], [], [peers.get(myPeer)]);
        },
        peers: snap,
        onPeers(fn, onErr) { ls.push(fn); if (onErr) errs.push(onErr); setTimeout(() => fn({ peers: snap(), joined: snap(), left: [], updated: [] }), 0); return () => { const i = ls.indexOf(fn); if (i >= 0) ls.splice(i, 1); }; },
        async leave() { leaving = true; try { ws.close(); } catch (e) { } if (host) { await D.hostStop(); showLan(null); } },
        connected: () => ws.readyState === 1, emit: async () => { }, on: () => () => { },
      };
    },
  };
  window.claude = { use: async n => n === 'room' ? ROOM : null };
  function showLan(code, ips) {
    let el = document.getElementById('lanNote');
    if (!code) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('p'); el.id = 'lanNote'; el.className = 'note'; const lc = document.getElementById('lobbyCode'); lc.parentNode.after(el); }
    const ip = (ips || [])[0];
    el.innerHTML = 'Friends on the same network just type <b>' + code + '</b>.' + (ip ? ' Over a VPN or port-forward they can type <b>' + code + '@' + ip + '</b>' + (ips.length > 1 ? ' (other addresses: ' + ips.slice(1).join(', ') + ')' : '') + '.' : '');
  }
  addEventListener('DOMContentLoaded', () => {
    const jc = document.getElementById('joinCode'); if (jc) { jc.maxLength = 40; jc.placeholder = 'CODE'; }
    const lb = document.querySelector('#lobby .sheet > p.note'); if (lb) lb.textContent = 'Teammates run Hollow Lane on their own computers, type the code and press Join. Up to 4 investigators. Allow the app through your firewall when asked.';
  });
})();
