import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const run = process.argv[2];
if (!/^(diagnostic|final)-(v1)-(native|rnnoise)(?:-[a-z0-9]+)?$/.test(run)) throw Error('Invalid observation');
const [kind, variant, modeName] = run.split('-');
const mode = modeName.toUpperCase();
const configuration = { run, kind, variant:variant.toUpperCase(), mode, cycles:kind === 'final' ? 100 : 20 };
const order = 'NATIVE_FIRST';
const files = new Set(['lifetime-memory.html', 'lifetime-memory-page.js', 'lifetime-native.js', 'lifetime-worklet.js', 'lifetime-cpu.js']);
let phase = null, held = null, done = false, targetPid = null, firstTargetPid = null, pageRequests = 0;
const targetInventory = [];
let socket, sequence = 0, pending = new Map(), tracedPids = new Set(), traceComplete;
async function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 5000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
}
async function identifyBegin() {
  const version = await (await fetch('http://127.0.0.1:4321/json/version')).json();
  const url = new URL(version.webSocketDebuggerUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '4321') throw Error('Nonlocal debug target');
  socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(Error('CDP connection failed')); });
  socket.onmessage = ({ data }) => {
    const event = JSON.parse(data);
    if (event.id && pending.has(event.id)) { const request = pending.get(event.id); clearTimeout(request.timer); pending.delete(event.id); event.error ? request.reject(Error(event.error.message)) : request.resolve(event.result); }
    // No trace storage: retain only the PID for our exact synthetic user-timing mark.
    if (event.method === 'Tracing.dataCollected') for (const entry of event.params.value) if (entry.name === 'VA3B_MEMORY_TARGET') tracedPids.add(entry.pid);
    if (event.method === 'Tracing.tracingComplete') traceComplete?.(event.params);
  };
  tracedPids = new Set();
  await command('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: 1024, includedCategories: ['blink.user_timing'], excludedCategories: ['*'], enableSampling: false, enableSystrace: false } });
}
async function identifyEnd() {
  const complete = new Promise(resolve => { traceComplete = resolve; });
  await command('Tracing.end'); const end = await complete;
  if (end.dataLossOccurred || tracedPids.size !== 1) throw Error('Target PID not uniquely identified');
  const pid = [...tracedPids][0];
  const processes = await command('SystemInfo.getProcessInfo');
  if (!processes.processInfo.some(process => process.id === pid && process.type === 'renderer')) throw Error('Target mark did not map to renderer');
  const targets = await command('Target.getTargets');
  targetInventory.push({ pageCount: targets.targetInfos.filter(target => target.type === 'page').length,
    localProofPageCount: targets.targetInfos.filter(target => target.type === 'page' && target.url === 'http://127.0.0.1:4320/').length });
  if (targetInventory.at(-1).localProofPageCount !== 1) throw Error('Local proof target is not unique');
  targetPid = pid; firstTargetPid ??= pid;
  socket.close(); socket = null;
}
async function body(req) { let value = ''; for await (const chunk of req) { value += chunk; if (value.length > 1000000) throw Error('Body too large'); } return JSON.parse(value); }
const server = http.createServer(async (req, res) => {
  res.setHeader('X-VA3B-Proof', 'lifetime-memory'); res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.url === '/configuration') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(configuration)); return; }
    if (req.method === 'GET' && req.url === '/status') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ phase, done, targetPid, targetRendererStable: targetPid === firstTargetPid && targetPid !== null, pageRequests })); return; }
    if (req.method === 'POST' && req.url === '/identify-begin') { await identifyBegin(); res.end('ok'); return; }
    if (req.method === 'POST' && req.url === '/identify-end') { await identifyEnd(); res.end('ok'); return; }
    if (req.method === 'POST' && req.url === '/phase') {
      const value = await body(req);
      if (!/^(COMMON_SETTLING|COMMON_STABLE_BASELINE|(?:NATIVE|RNNOISE)_(?:ACCOUNT_[1-5]|ACCOUNT_POST|CPU|ASSET_LOAD|READY|LONG_(?:[0-9]|[12][0-9])|STOP|POST_LONG|PRE_CYCLES|CYCLE_(?:[1-9]|[1-9][0-9]|100)_(?:ACTIVE|STOPPED)|POST_CYCLES))$/.test(value.name) || held || !Number.isFinite(value.seconds) || value.seconds < 0 || value.seconds > 205) throw Error('Invalid phase');
      phase = { name: value.name, seconds: value.seconds, started: Date.now() }; res.end('ok'); return;
    }
    if (req.method === 'GET' && req.url === '/hold') { if (!phase || held) throw Error('Invalid hold'); held = res; return; }
    if (req.method === 'POST' && req.url === '/advance') { if (held) { held.end('ok'); held = null; phase = null; } res.end('ok'); return; }
    if (req.method === 'POST' && req.url === '/report') {
      const report = await body(req); report.targetRendererIdentityVerified = targetPid === firstTargetPid && targetPid !== null; report.pageRequests = pageRequests; report.targetInventory = targetInventory;
      await writeFile(`results/local-lifetime-${run}-browser.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); done = true; phase = null; res.end('ok'); return;
    }
    const file = req.url === '/' ? 'lifetime-memory.html' : req.url.slice(1);
    if (req.method !== 'GET' || !files.has(file)) { res.writeHead(404); res.end(); return; }
    if (file === 'lifetime-memory.html') pageRequests++;
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
    res.end(await readFile(`dist/va3b-lifetime-memory-final/${file}`));
  } catch (error) { res.writeHead(400); res.end(error.message); }
});
server.listen(4320, '127.0.0.1', () => console.log('Final V1 lifetime collector ready'));
