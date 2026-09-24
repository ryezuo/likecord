# Voice / RNNoise Research Harness

## Status

Historical research harness retained for reproducibility in the frozen public archive. This is isolated experimental code, not production application code. The [Voice & Audio contract](../../../docs/product/voice-audio-settings.md) owns accepted behavior and historical conclusions.

Phase 2 retains one final V1 lifecycle measurement path alongside the original exploratory DSP/UI harness. It removes historical checkpoint verification, successive collector generations and raw measurement dumps. No production behavior, dependency version or archive tag changed.

## What it evaluates

- Pinned RNNoise artifact/model provenance and local packaging.
- Deterministic DSP, onset/pre-roll, digital latency, mandatory silence and signal cleanup.
- Local browser capture/playback routing and synthetic peer continuity.
- Final V1 lifecycle: reuse account AudioContext/worklet registration; create and retire processing state per active generation.
- Optional matched Native/RNNoise process-memory measurements and analysis.

The exploratory UI still compares several pre-roll values; it is not a reproduction of the production capture controller. The final adoption path uses the accepted fixed 10 ms pre-roll and 40 ms RNNoise DSP budget. Neither digital latency nor Window CPU timing establishes end-to-end or AudioWorklet callback performance.

## What production eventually uses

The frozen application independently serves committed assets under [apps/web/public/audio/voice](../../../apps/web/public/audio/voice/) and owns its integration/lifecycle code. It does not import this workspace or its dependencies at runtime.

The adopted boundary includes fixed pre-roll, V1 context/registration reuse, per-generation state retirement and capture preparation before native suppression verification. See [final preparation acceptance](../../../docs/product/voice-audio-settings.md#1912-capture-preparation-remediation-and-va3b-completion--2026-09-10) and [VA.4 acceptance](../../../docs/product/voice-audio-settings.md#2013-va4-final-integrated-acceptance-and-voice_audio_settings_01-freeze--2026-09-11). Broader Voice/Screen defects remain in [PROJECT_STATUS.md](../../../PROJECT_STATUS.md).

The local packager now writes only dist/rnnoise-package. It compares the immutable upstream glue with the committed production copy read-only. The old production manifest's commissioning recipe is historical; its former finalize command is not part of the public harness. Never use the spike to overwrite production assets.

## Requirements

- Node.js 24 (validated with 24.20.0) and npm (validated with 11.19.0).
- The isolated package-lock.json pins @jitsi/rnnoise-wasm 0.2.1 and esbuild 0.28.1. The empty pnpm-workspace.yaml keeps this package outside the root workspace.
- tar on PATH for provenance inspection; network access to npm, GitHub and Xiph for initial acquisition.
- A Web Audio/AudioWorklet/WebRTC-capable browser for optional UI work.
- Optional process-memory collection: **Windows**, PowerShell 7 (preflight validated with 7.6.5), installed Chrome and access to native process counters. Use -ChromePath for a nonstandard installation. No existing browser profile is used.

## Reproducible workflow

Run from this directory:

```sh
npm ci
npm run acquire
npm test
npm run build
npm run package:rnnoise
npm run build:lifetime
npm run test:lifetime
npm start
```

If the pinned dependencies are already installed, inspect them with npm ls --depth=0 instead of reinstalling. Acquisition verifies installed/package/upstream bytes, package integrity, pinned wrapper/engine source, embedded WASM and compiled model arrays. It uses the published WASM; it does not reproduce the upstream Emscripten compiler build. Once the complete cache exists, npm run acquire -- --offline repeats the same inspection without network access. New inspection output stays in .cache/provenance/artifact-inspection.json; the tracked snapshot is never overwritten.

Open http://127.0.0.1:4317 manually. Page load creates no audio or media capture. Controls explicitly start synthetic checks; physical microphone, screen capture and listening require their separate local controls/consents. Exported observations belong to that local run. Stop page media with Parar, then Ctrl+C or npm run stop for the dedicated server.

Tests, builds and packaging do not start long browser measurements, use a microphone, contact an application server or deploy anything.

### Optional Windows lifecycle measurement

First build the final bundle and run npm run check:memory. This checks the collector prerequisites and the current process's native counter only; it does not launch a browser or benchmark.

For a deliberate measurement on an idle host:

```powershell
npm run measure:lifetime -- -Run final-v1-native-example -ConfirmIdle
npm run measure:lifetime -- -Run final-v1-rnnoise-example -ConfirmIdle
npm run analyze:lifetime -- final-v1-native-example final-v1-rnnoise-example example-analysis
```

Use new matching labels for every pair. -ConfirmIdle records the operator's current idle-host confirmation; no historical receipt is required. Each final run includes 205 seconds of settling, 100 lifecycle cycles, at least ten minutes of processed continuity and five account lifecycles. A diagnostic-v1-native-example / diagnostic-v1-rnnoise-example pair uses 20 cycles and omits the long/account stage; it is not final acceptance. Both paths are intentionally optional and were not rerun for repository hygiene.

The collector owns ports 4320/4321 and a fresh temporary Chrome profile. It checks process birth identity before reading owned metadata or terminating processes, retains role aliases rather than raw process IDs/command lines, and verifies profile cleanup. It never tree-kills processes based solely on parent PID. A run fails on topology changes, incomplete counters or cleanup failure.

The analyzer consumes newly generated results/local-lifetime-<run>-process.json and corresponding -browser.json files, then creates results/local-lifetime-<output>.json without overwriting a run. It rejects invalid/unmatched observations and reports paired phase/cycle deltas. It does not generate a new owner acceptance, enforce the historical A2 outcome or rewrite the canonical review.

## Retained inventory and dependency graph

Paths below are relative to this directory. Every file in a row has the stated role; generated outputs are outside the tracked inventory.

| Files | Classification and direct consumers |
|---|---|
| README.md, .gitignore, package.json, package-lock.json, pnpm-workspace.yaml | RETAIN_CORE_HARNESS: navigation, output policy, commands and isolated pinned installation. |
| scripts/acquire.mjs | RETAIN_PACKAGING_PROVENANCE: acquire; reads pinned package/network or cache, writes .cache/provenance. |
| scripts/build.mjs | RETAIN_CORE_HARNESS: build; reads src, shared test fixtures, package and provenance; writes dist plus local-bundle-manifest.json. |
| scripts/serve.mjs, scripts/stop.mjs | RETAIN_CORE_HARNESS: start/stop; static allowlisted dist files and .cache/server.pid. |
| src/index.html, src/style.css, src/app.mjs | RETAIN_CORE_HARNESS: browser entry/assets bundled by build. App imports browser checks, runtime/control, listening/background/output diagnostics. |
| src/browser-checks.mjs, src/latency-checks.mjs, src/listening-checks.mjs | RETAIN_CORE_HARNESS: app checks; consume DSP/runtime and test/scenarios.mjs or test/latency-scenarios.mjs. |
| src/dsp.mjs, src/control.mjs, src/runtime.mjs, src/worklet.mjs | RETAIN_CORE_HARNESS: shared DSP, guards, local graphs and browser processor. DSP is also consumed by final adoption tooling. |
| src/action-diagnostics.mjs, src/background-probe.mjs, src/listening-diagnostics.mjs, src/output-selection.mjs | RETAIN_CORE_HARNESS: app/runtime diagnostics and their action tests; no historical JSON input. |
| test/actions.test.mjs, test/core.test.mjs, test/latency.test.mjs, test/scenarios.mjs, test/latency-scenarios.mjs | RETAIN_CORE_HARNESS: Node tests and deterministic fixtures shared with browser checks. |
| test/harness.test.mjs | RETAIN_CORE_HARNESS: consumer inventory, protected output policy and fresh paired-analysis fixtures. |
| adoption/.gitattributes | RETAIN_PACKAGING_PROVENANCE / FINAL_RNNOISE_PACKAGING: preserves exact source bytes for collector/provenance hashes across checkouts. |
| adoption/package-rnnoise.mjs | RETAIN_PACKAGING_PROVENANCE / FINAL_RNNOISE_PACKAGING: package:rnnoise; pinned inspection, installed glue, cached notices and read-only production glue → dist/rnnoise-package. No memory receipt input. |
| adoption/build-lifetime-memory.mjs | RETAIN_FINAL_MEASUREMENT / FINAL_REPRODUCIBLE_MEASUREMENT: build:lifetime; final page/worklet/CPU, installed RNNoise, inspection and read-only native capture source → dist/va3b-lifetime-memory-final and local-lifetime-build.json. |
| adoption/fixed-preroll-candidate.mjs, adoption/lifetime-engine.mjs, adoption/lifetime-processor.mjs | RETAIN_FINAL_MEASUREMENT: shared by final worklet, CPU and signal tests; depend on src/dsp.mjs. |
| adoption/lifetime-worklet.mjs, adoption/lifetime-native.mjs, adoption/lifetime-cpu.mjs | RETAIN_FINAL_MEASUREMENT: bundled final processing/control and CPU surrogate; native imports the builder's generated native-base.mjs, whose only source transformation exports its registration. |
| adoption/lifetime-memory-final-page.mjs, adoption/lifetime-memory-final-server.mjs | RETAIN_FINAL_MEASUREMENT: final browser protocol, local static bundle, transient CDP target identity and fresh browser report. |
| adoption/measure-lifetime-memory-final.ps1, adoption/controlled-memory-owned-counters.cs | RETAIN_FINAL_MEASUREMENT: sole Windows collector and birth-checked native counters; launch the final server/browser and write a fresh process report. |
| adoption/check-lifetime-signal.mjs | RETAIN_FINAL_MEASUREMENT: test:lifetime; real pinned WASM, synthetic signals, final processor and cached engine reset source → local-lifetime-signal.json. |
| adoption/analyze-lifetime-memory.mjs | RETAIN_FINAL_MEASUREMENT / FINAL_ANALYSIS: analyze:lifetime; requires one new Native/RNNoise pair, never historical raw inputs. |
| results/.gitattributes, results/artifact-inspection.json, results/va3b-lifetime-final-review.json, results/va3b-lifetime-report.txt, results/va3b-preparation-report.txt | HISTORICAL_ONLY snapshots described below. Only artifact-inspection.json supplies reusable pinned identity checks; review/report files are documentary, not command prerequisites. |

## Preserved canonical evidence

- [Artifact inspection](results/artifact-inspection.json): package, upstream commits, model arrays, hashes and licensing/provenance limits. The recorded “production not accepted” fields describe the initial inspection.
- [Final lifetime review](results/va3b-lifetime-final-review.json) and [marker report](results/va3b-lifetime-report.txt): historical V1 A2 acceptance, paired memory/CPU observations and limitations. The observed maximum was 76.8046875 MiB under the separately accepted 128 MiB ceiling; this is not a universal memory guarantee.
- [Preparation report](results/va3b-preparation-report.txt): later capture-preparation correction and scoped validation. Its remaining VA.4 markers were subsequently superseded by the owning contract.
- results/.gitattributes preserves evidence bytes. All four snapshots retain their original contents; old NEXT_ACTION, file names and hashes inside them are historical, not current commands or local-file promises.

## Generated outputs

.gitignore ignores all results/* except the five listed entries, plus node_modules, .cache and dist. Builds, acquisition, signal tests and new measurements never overwrite canonical evidence. Browser exports should also be kept as local ignored results. No global JSON/text/key/certificate ignore rule is used.

The root .dockerignore explicitly excludes this spike’s results, provenance cache, dist and node_modules subtrees from production build context. Production public RNNoise assets remain included.

## Historical investigation

The final archive retains the canonical evidence listed above and reusable tooling. Superseded raw results, receipts and generators are omitted. The [archive policy](../../../docs/operations/PUBLIC_ARCHIVE.md) describes the single-root history and cache boundary.

Superseded material includes the rejected frame-owned gate, sequential memory/v2/controlled/owned/plateau collectors, chained prepare/build generators and one-off production/preparation probes. The final V1 sources replace those generators. scripts/verify.mjs depended on old branches, commits and result snapshots and has been removed.

The investigation showed why process ownership must use birth identity rather than parent PID alone; why whole-tree RSS and WASM heap cannot be summed as independent attributed memory; and why frame-clock discontinuities must be preserved as diagnostics rather than mislabeled as proven DSP loss. Final tooling retains those corrections. Dated product-contract narratives remain historical, with consolidated navigation here instead of individual raw-dump links.

## Limitations

Host residency, browser scheduling, process topology, timer resolution and cleanup/GC affect observations. Logical resource cleanup is not proof of immediate browser memory reclamation. Synthetic continuity is not physical listening, broad browser compatibility or production Voice/Screen acceptance.

The pinned published artifact/model was inspected, not rebuilt byte-identically from Emscripten. Licensing statements retain their original bounded scope; training-data lineage was not reconstructed. Current builds and deterministic checks establish harness coherence, not renewed acceptance of historical measurements.
