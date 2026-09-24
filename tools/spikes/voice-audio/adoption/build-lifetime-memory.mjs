import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inspection = JSON.parse(await readFile('results/artifact-inspection.json'));
const glue = await readFile('node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js');
if (sha(glue) !== inspection.files['dist/rnnoise-sync.js'].sha256) throw Error('Pinned artifact changed; run acquire');
const dir = 'dist/va3b-lifetime-memory-final';
await mkdir(dir, { recursive: true });
await mkdir('results', { recursive: true });
const native = (await readFile('../../../apps/web/public/audio/capture.v1.js', 'utf8')).replace(/\r\n/g, '\n');
const registration = 'registerProcessor("likecord-capture-v1", LikecordCaptureV1);';
if (native.split(registration).length !== 2) throw Error('Native registration changed; review the read-only adapter');
await writeFile(dir + '/native-base.mjs', native.replace(registration, 'export { LikecordCaptureV1 };'));
const entries = {
  'lifetime-memory-final-page': 'lifetime-memory-page',
  'lifetime-native': 'lifetime-native', 'lifetime-worklet': 'lifetime-worklet', 'lifetime-cpu': 'lifetime-cpu'
};
const inputs = new Set();
for (const [entry, out] of Object.entries(entries)) {
  const result = await build({
    entryPoints: ['adoption/' + entry + '.mjs'], outfile: dir + '/' + out + '.js',
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    external: ['/lifetime-cpu.js'], sourcemap: false, minify: false, metafile: true
  });
  for (const input of Object.keys(result.metafile.inputs)) inputs.add(input);
}
await writeFile(dir + '/lifetime-memory.html', '<!doctype html><meta charset="utf-8"><title>Voice lifetime research</title><script type="module" src="/lifetime-memory-page.js"></script>');
const files = {};
for (const name of ['lifetime-memory.html', 'lifetime-memory-page.js', 'lifetime-native.js', 'lifetime-worklet.js', 'lifetime-cpu.js']) {
  const bytes = await readFile(dir + '/' + name); files[name] = { bytes: bytes.length, sha256: sha(bytes) };
}
const manifest = {
  id: 'voice-lifetime-v1', variant: 'V1', files, inputs: [...inputs].sort(),
  glueSha256: sha(glue), nativeSourceSha256: sha(native),
  nativeSource: 'read-only copy of apps/web/public/audio/capture.v1.js with registration exported locally',
  gatePrerollMs: 10, rnnoiseDspBudgetMs: 40,
  scope: 'Synthetic final lifecycle method; no microphone, speakers, production server or historical receipts. Measurements are optional and environment-dependent.'
};
await writeFile(dir + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('results/local-lifetime-build.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', files: Object.keys(files), inputCount: inputs.size }));
