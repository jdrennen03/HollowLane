// Packages Hollow Lane into ./dist. Defaults to this computer; override with PLATFORM / ARCH env vars.
const { packager } = require('@electron/packager');
const path = require('path');
const platform = process.env.PLATFORM || process.platform, arch = process.env.ARCH || process.arch;
packager({
  dir: __dirname, out: path.join(__dirname, 'dist'), platform, arch, electronVersion: '44.7.2', name: 'Hollow Lane',
  executableName: platform === 'linux' ? 'hollow-lane' : 'Hollow Lane', appBundleId: 'com.drennen.hollowlane',
  icon: platform === 'darwin' ? path.join(__dirname, 'icon.icns') : platform === 'win32' ? path.join(__dirname, 'icon.ico') : undefined,
  overwrite: true, prune: true, asar: true,
  ignore: [/^\/dist($|\/)/, /^\/pack\.js$/, /^\/stage\.js$/, /^\/net-shim\.js$/, /^\/BUILD/i, /^\/build-/, /^\/README/, /^\/icon\.(ico|icns)$/],
}).then(out => console.log('\nDone! Your game is in: ' + out[0] + '\n')).catch(e => { console.error(e); process.exit(1); });
