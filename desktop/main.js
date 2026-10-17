// Desktop shell for Hollow Lane: serves the game from app/ over an app:// scheme, and hosts LAN team play
// (a small WebSocket relay that mirrors the claude.ai room presence API, plus UDP lobby-code discovery).
const { app, BrowserWindow, protocol, ipcMain, Menu } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), dgram = require('dgram');
const { WebSocketServer } = require('ws');

const ROOT = path.join(__dirname, 'app');
const WS_PORT = 47615, UDP_PORT = 47616;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

// ---------------------------------------------------------------- relay server (runs on the host's machine)
let wss = null, wsPort = 0, hostCode = null, udp = null;
const rooms = new Map();   // code -> Map(peer -> { ws, pres })
function startRelay() {
  if (wss) return Promise.resolve(wsPort);
  return new Promise((resolve, reject) => {
    const tryPort = p => {
      const s = new WebSocketServer({ port: p, maxPayload: 1 << 20 });
      s.once('error', e => { if (e.code === 'EADDRINUSE' && p < WS_PORT + 10) tryPort(p + 1); else reject(e); });
      s.once('listening', () => { wss = s; wsPort = p; s.on('connection', onConn); resolve(p); });
    };
    tryPort(WS_PORT);
  });
}
function send(ws, m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
function onConn(ws) {
  let room = null, peer = null;
  ws.on('message', buf => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if (m.t === 'hello' && !room) {
      room = String(m.room).slice(0, 8); peer = String(m.peer).slice(0, 24);
      if (!rooms.has(room)) rooms.set(room, new Map());
      const R = rooms.get(room);
      if (R.size >= 8) { send(ws, { t: 'err', code: 'lobby_full' }); ws.close(); return; }
      R.set(peer, { ws, pres: m.pres || {} });
      send(ws, { t: 'all', list: [...R].filter(([p]) => p !== peer).map(([p, v]) => ({ peer: p, pres: v.pres })) });
      for (const [p, v] of R) if (p !== peer) send(v.ws, { t: 'p', peer, pres: m.pres || {} });
    } else if (m.t === 'pres' && room) {
      const R = rooms.get(room), me = R && R.get(peer); if (!me) return;
      me.pres = m.pres; for (const [p, v] of R) if (p !== peer) send(v.ws, { t: 'p', peer, pres: m.pres });
    }
  });
  ws.on('close', () => {
    const R = room && rooms.get(room); if (!R) return;
    R.delete(peer); for (const v of R.values()) send(v.ws, { t: 'l', peer });
    if (!R.size) rooms.delete(room);
  });
}
function stopRelay() {
  hostCode = null;
  if (udp) { try { udp.close(); } catch (e) { } udp = null; }
  if (wss) { for (const c of wss.clients) c.terminate(); wss.close(); wss = null; rooms.clear(); }
}
// answers "who is hosting CODE?" broadcasts from other machines on the network
function startBeacon() {
  if (udp) return;
  udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  udp.on('message', (msg, r) => { const s = String(msg); if (hostCode && s === 'HLQ:' + hostCode) udp.send('HLA:' + hostCode + ':' + wsPort, r.port, r.address); });
  udp.on('error', () => { });
  udp.bind(UDP_PORT);
}
function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a);
  return out;
}
function broadcastAddrs() {
  const out = new Set(['255.255.255.255', '127.0.0.1']);
  for (const a of lanIPs()) {
    const ip = a.address.split('.').map(Number), nm = a.netmask.split('.').map(Number);
    out.add(ip.map((b, i) => (b & nm[i]) | (~nm[i] & 255)).join('.'));
  }
  return [...out];
}
function discover(code) {
  return new Promise(resolve => {
    const s = dgram.createSocket('udp4'); let done = false;
    const finish = v => { if (done) return; done = true; clearInterval(iv); clearTimeout(to); try { s.close(); } catch (e) { } resolve(v); };
    s.on('message', (msg, r) => { const m = /^HLA:([A-Z]{4}):(\d+)$/.exec(String(msg)); if (m && m[1] === code) finish({ ip: r.address === '127.0.0.1' || lanIPs().some(a => a.address === r.address) ? '127.0.0.1' : r.address, port: +m[2] }); });
    s.on('error', () => finish(null));
    const ping = () => { for (const a of broadcastAddrs()) s.send('HLQ:' + code, UDP_PORT, a, () => { }); };
    let iv = null; const to = setTimeout(() => finish(null), 2500);
    s.bind(() => { try { s.setBroadcast(true); } catch (e) { } ping(); iv = setInterval(ping, 500); });
  });
}
ipcMain.handle('hl-host-start', async (e, code) => { const port = await startRelay(); hostCode = String(code).toUpperCase(); startBeacon(); return { port, ips: lanIPs().map(a => a.address) }; });
ipcMain.handle('hl-host-stop', () => { stopRelay(); return true; });
ipcMain.handle('hl-discover', (e, code) => discover(String(code).toUpperCase()));

// ---------------------------------------------------------------- window
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600, backgroundColor: '#050506', title: 'Hollow Lane', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.key === 'Enter' && i.alt)) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadURL('app://game/index.html');
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'windowMenu' }]) : null);
  protocol.handle('app', req => {
    const u = new URL(req.url); let p = decodeURIComponent(u.pathname); if (p === '/' || !p) p = '/index.html';
    const f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT + path.sep)) return new Response('forbidden', { status: 403 });
    try { return new Response(fs.readFileSync(f), { headers: { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' } }); }
    catch (e) { return new Response('not found', { status: 404 }); }
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { stopRelay(); app.quit(); });
