// Builds the game pages from src/: index.html (web, CDN three.js), test.html (local debug),
// desktop/app/index.html (Electron). Usage: node build.js
const fs = require('fs'), path = require('path');
const d = __dirname, src = path.join(d, 'src');
const head = fs.readFileSync(path.join(src, '00_head.html'), 'utf8');
const js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(src, f), 'utf8') + '\n').join('');
const page = (base, dbg = '') => head + '\n' +
  `<script type="importmap">{"imports":{"three":"${base}build/three.module.js","three/addons/":"${base}examples/jsm/"}}</script>\n` +
  '<script type="module">\n' + js + dbg + '</script>\n';
const meta = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1';
fs.writeFileSync(path.join(d, 'index.html'), page('https://cdn.jsdelivr.net/npm/three@0.165.0/'));
fs.writeFileSync(path.join(d, 'test.html'), meta + ',viewport-fit=cover"></head><body>' + page('/three/', fs.readFileSync(path.join(d, 'dbg_hook.js'), 'utf8')) + '</body></html>');
const dd = path.join(d, 'desktop', 'app'); fs.mkdirSync(dd, { recursive: true });
fs.writeFileSync(path.join(dd, 'index.html'), meta + '"></head><body><script src="net-shim.js"></script>' + page('./three/') + '</body></html>');
console.log('ok', page('').length);
