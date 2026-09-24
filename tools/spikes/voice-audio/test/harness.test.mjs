import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const run = args => spawnSync(process.execPath, ['adoption/analyze-lifetime-memory.mjs', ...args], { cwd: root, encoding: 'utf8' });

test('Every package command has a retained entry and no historical verify flow', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.scripts.verify, undefined);
  for (const command of Object.values(pkg.scripts)) {
    const entry = command.match(/(?:node |File )([^ ]+\.(?:mjs|ps1))/)?.[1];
    if (entry) await access(root + '/' + entry);
  }
});

test('Canonical evidence stays allowlisted while fresh measurements are ignored', () => {
  const local = 'tools/spikes/voice-audio/results/local-lifetime-test.json';
  const kept = 'tools/spikes/voice-audio/results/va3b-lifetime-final-review.json';
  const repository = fileURLToPath(new URL('../../../../', import.meta.url));
  assert.equal(execFileSync('git', ['check-ignore', '--no-index', local], { cwd: repository, encoding: 'utf8' }).trim(), local);
  assert.equal(spawnSync('git', ['check-ignore', '--no-index', kept], { cwd: repository }).status, 1);
});

test('Analyzer rejects path traversal before reading input', () => {
  const result = run(['../native', 'final-v1-rnnoise-example', '../../summary']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /safe new output name/);
});

test('Fresh paired observations analyze successfully; topology failure is rejected', async () => {
  await mkdir(root + '/results', { recursive: true });
  const suffix = 'test' + process.pid;
  const native = 'diagnostic-v1-native-' + suffix;
  const rnnoise = 'diagnostic-v1-rnnoise-' + suffix;
  const output = suffix + '-analysis';
  const paths = [];
  function fixture(mode, level) {
    const samples = [], cycles = [];
    const sample = (phase, amount, atMs) => ({
      phase, atMs, phaseElapsedMs: 1000, fullCoverage: true, targetPresent: true, audioServiceCount: 1, processCount: 3,
      attributedPrivateWorkingSetBytes: amount * 2 ** 20, attributedPrivateCommitBytes: amount * 2 ** 20, wholeTreeRssBytes: amount * 2 ** 20,
      processes: [{ role: 'TARGET_RENDERER', privateWorkingSetBytes: amount * 2 ** 20, privateCommitBytes: amount * 2 ** 20 }], host: {}
    });
    samples.push(sample('COMMON_STABLE_BASELINE', level, 0), sample(mode + '_PRE_CYCLES', level, 2));
    for (let cycle = 1; cycle <= 20; cycle++) {
      samples.push(sample(mode + '_CYCLE_' + cycle + '_ACTIVE', level + 2, 2 + cycle * 2), sample(mode + '_CYCLE_' + cycle + '_STOPPED', level + 1, 3 + cycle * 2));
      cycles.push({ cycle, activeTransactionUpperBoundMs: 0, stopTransactionUpperBoundMs: 0, cleanup: {
        noSignalReferences: true, contextState: 'suspended', pending: 0, errors: 0,
        cleanup: { fifosZero: true, scratchZero: true, detectorReset: true, peakReset: true, temporalStateReset: true, statePointer: 0, scratchPointer: 0 },
        metrics: { liveState: false, liveScratch: false, allowed: false, silentViolations: 0,
          counters: { STATE_CREATE_TOTAL: cycle, STATE_DESTROY_TOTAL: cycle, SCRATCH_ALLOC_TOTAL: cycle, SCRATCH_FREE_TOTAL: cycle } }
      } });
    }
    samples.push(sample(mode + '_POST_CYCLES', level + 1, 50));
    return {
      raw: { completed: true, failure: null, invalidTopology: false, baselineEndMs: 1, samples, profileRemoved: true, browserStopped: true, collectorStopped: true },
      page: { mode, kind: 'diagnostic', variant: 'V1', result: 'COMPLETE', targetRendererIdentityVerified: true, pageRequests: 1,
        targetInventory: [{ pageCount: 1, localProofPageCount: 1 }, { pageCount: 1, localProofPageCount: 1 }],
        cycles, cycleCount: 20, finalOwners: { contexts: 0 }, accounts: [], primaryDisposal: { workletCounters: {} }, maximumOwners: {}, mainCounters: {} }
    };
  }
  const n = fixture('NATIVE', 10), r = fixture('RNNOISE', 60);
  try {
    for (const [name, value] of [[native, n], [rnnoise, r]]) {
      for (const [part, data] of [['process', value.raw], ['browser', value.page]]) {
        const p = root + '/results/local-lifetime-' + name + '-' + part + '.json'; paths.push(p);
        await writeFile(p, JSON.stringify(data), { flag: 'wx' });
      }
    }
    paths.push(root + '/results/local-lifetime-' + output + '.json');
    const success = run([native, rnnoise, output]);
    assert.equal(success.status, 0, success.stderr);
    const analysis = JSON.parse(await readFile(paths.at(-1)));
    assert.equal(analysis.executionValid, true);
    assert.equal(analysis.maxCycleDelta, 50);
    assert.equal(analysis.maxAdjustedCycleDelta, 0);
    assert.equal(analysis.requiresOwnerEvidenceReview, true);
    r.raw.invalidTopology = true;
    await writeFile(root + '/results/local-lifetime-' + rnnoise + '-process.json', JSON.stringify(r.raw));
    const rejected = run([native, rnnoise, output + '-invalid']);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Invalid or incomplete measurement/);
  } finally {
    for (const p of paths) await rm(p, { force: true });
  }
});
