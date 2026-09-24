// Isolated reproducible packaging. Never writes to the application.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = JSON.parse(await readFile('results/artifact-inspection.json'));
const glue = await readFile('node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js');
const notices = await readFile('.cache/provenance/THIRD_PARTY_NOTICES.txt');
if (sha(glue) !== evidence.files['dist/rnnoise-sync.js'].sha256 || sha(notices) !== evidence.noticeSha256) throw Error('Pinned artifact/notices changed; run acquire');
const dir = 'dist/rnnoise-package';
await mkdir(dir, { recursive: true });
const files = {};
for (const [name, bytes] of Object.entries({ 'rnnoise-sync.js': glue, 'THIRD_PARTY_NOTICES.txt': notices })) {
  await writeFile(dir + '/' + name, bytes);
  files[name] = { bytes: bytes.length, sha256: sha(bytes) };
}
const embedded = glue.toString().match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/);
if (!embedded || sha(Buffer.from(embedded[1], 'base64')) !== evidence.syncWasm.sha256) throw Error('Embedded WASM mismatch');
const manifest = {
  version: 1, package: evidence.package, wrapperCommit: evidence.wrapper, engineCommit: evidence.engine,
  modelId: evidence.model.id, embeddedWasmSha256: evidence.syncWasm.sha256,
  packageTarballSha256: evidence.tarballSha256, files,
  scope: 'Research packaging only; exact upstream glue/notices. No production files are generated, finalized or overwritten.',
  rebuild: 'Uses the verified published WASM; bit-identical Emscripten recompilation is not established.'
};
await writeFile(dir + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
// Compare only immutable upstream glue, not a historical production manifest or release checkpoint.
const productionGlue = await readFile('../../../apps/web/public/audio/voice/rnnoise-jitsi-0.2.1-v1/rnnoise-sync.js');
if (!glue.equals(productionGlue)) throw Error('Production upstream glue differs; review its provenance separately');
for (const [name, entry] of Object.entries(files)) {
  if (sha(await readFile(dir + '/' + name)) !== entry.sha256) throw Error('Package verification failed');
}
console.log(JSON.stringify({ result: 'PASS', output: dir, upstreamGlueMatchesProduction: true, applicationWritten: false }));
