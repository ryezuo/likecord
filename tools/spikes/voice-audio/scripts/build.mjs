import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const inspection = JSON.parse(await readFile('results/artifact-inspection.json', 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
const glue = await readFile('node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js');
if (hash(glue) !== inspection.files['dist/rnnoise-sync.js'].sha256) throw Error('Run acquire: artifact changed');
await mkdir('dist', { recursive: true });
await mkdir('results', { recursive: true });
const result = await build({ entryPoints: ['src/app.mjs', 'src/worklet.mjs'], bundle: true, format: 'esm', platform: 'browser', outdir: 'dist', outExtension: { '.js': '.js' }, sourcemap: false, minify: false, metafile: true, target: 'es2022' });
if (Object.keys(result.metafile.inputs).some(p => p.includes('apps/') || p.includes('packages/'))) throw Error('Production import escaped isolation');
// Keep the identified static bytes stable across Git's Windows CRLF checkout.
for (const file of ['index.html', 'style.css']) await writeFile(`dist/${file}`, (await readFile(`src/${file}`, 'utf8')).replace(/\r\n/g, '\n'));
if (hash(await readFile('.cache/provenance/rnnoise-sync.wasm')) !== inspection.syncWasm.sha256 || hash(await readFile('.cache/provenance/THIRD_PARTY_NOTICES.txt')) !== inspection.noticeSha256) throw Error('Provenance cache mismatch; run acquire');
await copyFile('.cache/provenance/rnnoise-sync.wasm', 'dist/rnnoise-sync.wasm');
await copyFile('node_modules/@jitsi/rnnoise-wasm/LICENSE', 'dist/JITSI-LICENSE.txt');
await copyFile('.cache/provenance/engine-COPYING', 'dist/RNNOISE-COPYING.txt');
await copyFile('.cache/provenance/THIRD_PARTY_NOTICES.txt','dist/THIRD_PARTY_NOTICES.txt');
await copyFile('results/artifact-inspection.json', 'dist/artifact-inspection.json');
const manifest = {};
for (const file of ['app.js', 'worklet.js', 'rnnoise-sync.wasm', 'index.html', 'style.css']) { const bytes = await readFile(`dist/${file}`); manifest[file] = { bytes: bytes.length, sha256: hash(bytes) }; }
const identity = { id: 'voice-research-harness', bundleId: hash(JSON.stringify(manifest)), esbuild: '0.28.1', inputCount: Object.keys(result.metafile.inputs).length, productionPackagingProven: false, files: manifest };
await writeFile('results/local-bundle-manifest.json', JSON.stringify(identity, null, 2) + '\n');
await writeFile('dist/bundle-manifest.json', JSON.stringify(identity, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
