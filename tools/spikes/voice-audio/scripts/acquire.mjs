import { isDeepStrictEqual } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
export const wrapper = 'cb529a59a8478fe604e57986fc96afdaecfa6fb7';
export const engine = '372f7b4b76cde4ca1ec4605353dd17898a99de38';
const sha = b => createHash('sha256').update(b).digest('hex');
const cache = '.cache/provenance';
const offline = process.argv.includes('--offline');
await mkdir(cache, { recursive: true });
await mkdir('results', { recursive: true });
async function get(url, file) {
  if (offline) return readFile(cache + '/' + file);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Acquisition HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`${cache}/${file}`, bytes);
  return bytes;
}
const metadata = JSON.parse(await get('https://registry.npmjs.org/@jitsi%2frnnoise-wasm/0.2.1', 'registry.json'));
if (metadata.version !== '0.2.1' || metadata.gitHead !== wrapper) throw Error('Registry identity mismatch');
const tarball = await get(metadata.dist.tarball, 'package.tgz');
const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
const expected = 'sha512-iEj77www43pS2Yq+cfLZb+hFuI7L5ccisBzzPMcOjjLsG4/LAlkD1CY58/8gc84nHdLBGmD/OPIWGnvYnXvB0A==';
if (integrity !== expected || integrity !== metadata.dist.integrity) throw Error('Package integrity mismatch');
const sourceBase = 'https://raw.githubusercontent.com/';
const tree = JSON.parse(await get(`https://api.github.com/repos/jitsi/rnnoise-wasm/git/trees/${wrapper}`, 'wrapper-tree.json'));
if (tree.tree.find(x => x.path === 'rnnoise')?.sha !== engine) throw Error('Engine submodule mismatch');
const files = {};
for (const file of ['dist/rnnoise-sync.js', 'dist/rnnoise.js', 'dist/rnnoise.wasm', 'LICENSE', 'build.sh', 'Dockerfile']) {
  const installed = await readFile(`node_modules/@jitsi/rnnoise-wasm/${file}`);
  const packed = execFileSync('tar', ['-xOf', `${cache}/package.tgz`, `package/${file}`], { maxBuffer: 8 * 1024 ** 2 });
  const upstream = await get(`${sourceBase}jitsi/rnnoise-wasm/${wrapper}/${file}`, file.replaceAll('/', '-'));
  if (!installed.equals(packed) || !packed.equals(upstream)) throw Error(`Byte mismatch: ${file}`);
  files[file] = { bytes: installed.length, sha256: sha(installed), matchesRegistryAndPinnedGit: true };
}
for (const file of ['COPYING', 'README', 'model_version', 'download_model.sh', 'src/denoise.c', 'include/rnnoise.h']) {
  await get(`${sourceBase}xiph/rnnoise/${engine}/${file}`, `engine-${file.replaceAll('/', '-')}`);
}
const glue = await readFile(`${cache}/dist-rnnoise-sync.js`, 'utf8');
const match = glue.match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/);
if (!match) throw Error('Embedded sync WASM not found');
const wasm = Buffer.from(match[1], 'base64');
await writeFile(`${cache}/rnnoise-sync.wasm`, wasm);
const modelURL = 'https://media.xiph.org/rnnoise/models/rnnoise_data-0b50c45.tar.gz';
const model = await get(modelURL, 'model.tar.gz');
const modelHash = '4ac81c5c0884ec4bd5907026aaae16209b7b76cd9d7f71af582094a2f98f4b43';
if (sha(model) !== modelHash) throw Error('Model archive integrity mismatch');
const listing = execFileSync('tar', ['-tzf', `${cache}/model.tar.gz`], { encoding: 'utf8' }).trim().split(/\r?\n/);
const releaseURL='https://github.com/xiph/rnnoise/releases/download/v0.2/rnnoise-0.2.tar.gz';
const release=await get(releaseURL,'rnnoise-0.2.tar.gz');
if(sha(release)!=='90fce4b00b9ff24c08dbfe31b82ffd43bae383d85c5535676d28b0a2b11c0d37')throw Error('Upstream source release mismatch');
const releaseCopying=execFileSync('tar',['-xOf',`${cache}/rnnoise-0.2.tar.gz`,'rnnoise-0.2/COPYING']);
if(!releaseCopying.equals(await readFile(`${cache}/engine-COPYING`)))throw Error('Release license differs from pinned engine');
const arrays = [];
for (const file of ['src/rnnoise_data.c', 'src/rnnoise_data_little.c','rnnoise-0.2/src/rnnoise_data.c']) {
  const data = execFileSync('tar', ['-xOf', file.startsWith('rnnoise-0.2/')?`${cache}/rnnoise-0.2.tar.gz`:`${cache}/model.tar.gz`, file], { maxBuffer: 40 * 1024 ** 2 });
  await writeFile(`${cache}/${file.replaceAll('/', '-')}`, data);
  for (const m of data.toString().matchAll(/static const (float|int|opus_int8|opus_int16|opus_int32) (\w+)\[(\d+)\] = \{([\s\S]*?)\};/g)) {
    const values = m[4].split(',').map(x => x.trim()).filter(Boolean).map(Number);
    if (values.length !== +m[3] || values.some(x => !Number.isFinite(x))) throw Error(`Invalid array ${m[2]}`);
    const size = m[1] === 'opus_int8' ? 1 : m[1] === 'opus_int16' ? 2 : 4;
    const bytes = Buffer.alloc(size * values.length);
    values.forEach((v, i) => m[1] === 'float' ? bytes.writeFloatLE(v, i * size) : size === 1 ? bytes.writeInt8(v, i) : size === 2 ? bytes.writeInt16LE(v, i * size) : bytes.writeInt32LE(v, i * size));
    arrays.push({ file, name: m[2], type: m[1], count: values.length, bytes: bytes.length, sha256: sha(bytes), offsetInPublishedWasm: wasm.indexOf(bytes) });
  }
}
const releaseArrays=arrays.filter(x=>x.file==='rnnoise-0.2/src/rnnoise_data.c');
if(releaseArrays.length!==43||releaseArrays.some(x=>x.offsetInPublishedWasm<0||!arrays.some(a=>a.file==='src/rnnoise_data.c'&&a.name===x.name&&a.sha256===x.sha256)))throw Error('Compiled model not matched to licensed source release');
const engineArchive=await get(`https://codeload.github.com/xiph/rnnoise/tar.gz/${engine}`,'engine-source.tar.gz');
for (const file of ['COPYING', 'README', 'model_version', 'download_model.sh', 'src/denoise.c', 'include/rnnoise.h']) {
  const packed = execFileSync('tar', ['-xOf', cache + '/engine-source.tar.gz', 'rnnoise-' + engine + '/' + file]);
  if (!packed.equals(await readFile(cache + '/engine-' + file.replaceAll('/', '-')))) throw Error('Engine source cache mismatch: ' + file);
}
const sourceFiles=execFileSync('tar',['-tzf',`${cache}/engine-source.tar.gz`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>/\/src\/.*\.[ch]$/.test(x));
const noticeBlocks=new Map();
for(const file of sourceFiles){
  const source=execFileSync('tar',['-xOf',`${cache}/engine-source.tar.gz`,file],{maxBuffer:2*1024**2}).toString();
  for(const m of source.matchAll(/\/\*[\s\S]*?\*\//g))if(/copyright|redistribution and use|permission is hereby|SPDX-License-Identifier/i.test(m[0])){
    const names=noticeBlocks.get(m[0])??[];names.push(file.slice(file.indexOf('/src/')+1));noticeBlocks.set(m[0],names);
  }
}
const notices=`LOCAL SPIKE ONLY — no production package accepted.\n\nJitsi wrapper LICENSE (including retained MIT notice)\n\n${await readFile(`${cache}/LICENSE`,'utf8')}\n\nRNNoise root COPYING; selected weights also match all 43 arrays in the official v0.2 source release distributed with this COPYING.\n\n${releaseCopying}\n\nPinned engine file-level notices (includes BSD-2-Clause file notices):\n\n${[...noticeBlocks].map(([body,names])=>`${names.join(', ')}\n${body}`).join('\n\n')}`;
await writeFile(`${cache}/THIRD_PARTY_NOTICES.txt`,notices);
const compiled = await WebAssembly.compile(wasm);
const result = {
  origin: 'source_or_artifact_inspection', package: '@jitsi/rnnoise-wasm@0.2.1', wrapper, engine,
  integrity, tarballSha256: sha(tarball), files,
  syncWasm: { bytes: wasm.length, sha256: sha(wasm), exports: WebAssembly.Module.exports(compiled), imports: WebAssembly.Module.imports(compiled) },
  model: { id: '0b50c45', url: modelURL, bytes: model.length, sha256: sha(model), archiveEntries: listing, arrays, licensedSourceRelease:{url:releaseURL,sha256:sha(release),matchedArrays:releaseArrays.length,copyingMatchesPinnedEngine:true,rawGeneratedFilesIdentical:false,explanation:'Release contains 43 arrays; model archive additionally contains 7 DISABLE_DEBUG_FLOAT alternatives. All 43 release arrays match the archive and published WASM byte for byte.'} },
  engineSourceArchiveSha256:sha(engineArchive),noticeSha256:sha(Buffer.from(notices)),
  build: { publishedRecipe: 'Emscripten 3.1.14, unpinned image digest / apt packages', rebuilt: false, bitIdenticalRebuild: 'not_proven' },
  licensing: { wrapper: 'Apache-2.0 with retained MIT notice', engine: 'BSD-3-Clause root COPYING plus BSD-2-Clause/file notices', selectedCompiledWeights: 'All 43 arrays match the official RNNoise 0.2 source distribution with COPYING; scoped redistribution basis verified independently of Jitsi metadata', trainingCheckpoint:'Not executed or distributed; its separate scope is not asserted', trainingDataLineage:'Upstream README describes public datasets; exact training run/mix not independently reconstructed', distributionPermissionForObservedCodeAndCompiledWeights:'verified_scope_with_notices', productionDistributionAccepted: false },
  productionPackageAccepted: false
};
const canonical = JSON.parse(await readFile('results/artifact-inspection.json', 'utf8'));
if (!isDeepStrictEqual(result, canonical)) throw Error('Acquired provenance differs from the canonical pinned inspection; review before use');
await writeFile(cache + '/artifact-inspection.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ package: result.package, syncWasm: result.syncWasm, modelArrays: arrays.length, matchedArrays: arrays.filter(x => x.offsetInPublishedWasm >= 0).length, matchesByFile: Object.fromEntries([...new Set(arrays.map(x => x.file))].map(f => [f, arrays.filter(x => x.file === f && x.offsetInPublishedWasm >= 0).length])) }, null, 2));
