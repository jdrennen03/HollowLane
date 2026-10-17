// Copies the game into desktop/app (run after ../build.js). three.js comes from node_modules (npm install).
const fs = require('fs'), path = require('path');
const D = __dirname, H = path.join(D, '..'), app = path.join(D, 'app');
const T = [path.join(D, 'node_modules', 'three'), path.join(H, 'three')].find(p => fs.existsSync(path.join(p, 'build')));
if (!T) { console.error('three.js not found - run npm install in desktop/ first'); process.exit(1); }
const cp = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };
fs.rmSync(path.join(app, 'three'), { recursive: true, force: true });
cp(path.join(T, 'build/three.module.min.js'), path.join(app, 'three/build/three.module.js'));
for (const f of ['utils/SkeletonUtils.js', 'loaders/GLTFLoader.js', 'postprocessing/GTAOPass.js', 'shaders/GTAOShader.js', 'shaders/PoissonDenoiseShader.js', 'math/SimplexNoise.js', 'postprocessing/EffectComposer.js', 'postprocessing/MaskPass.js', 'postprocessing/OutputPass.js', 'postprocessing/Pass.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js', 'shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'shaders/OutputShader.js', 'utils/BufferGeometryUtils.js'])
  cp(path.join(T, 'examples/jsm', f), path.join(app, 'three/examples/jsm', f));
for (const f of fs.readdirSync(path.join(H, 'assets'))) cp(path.join(H, 'assets', f), path.join(app, f));
cp(path.join(D, 'net-shim.js'), path.join(app, 'net-shim.js'));
console.log('staged', app);
