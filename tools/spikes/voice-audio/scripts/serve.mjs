import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const files = new Set(['index.html', 'app.js', 'worklet.js', 'style.css', 'rnnoise-sync.wasm', 'artifact-inspection.json', 'JITSI-LICENSE.txt', 'RNNOISE-COPYING.txt','THIRD_PARTY_NOTICES.txt', 'bundle-manifest.json']);
const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', wasm: 'application/wasm', json: 'application/json', txt: 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Voice-Spike-Pid',String(process.pid));
  const path = req.url === '/' ? 'index.html' : req.url?.slice(1);
  // No uploads, signaling endpoints, device logs or filesystem browsing.
  if (req.method !== 'GET' || !files.has(path)) { res.writeHead(404); res.end(); return; }
  try {
    const content = await readFile(`dist/${path}`);
    res.writeHead(200, { 'Content-Type': types[path.split('.').at(-1)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
    res.end(content);
  } catch { res.writeHead(503); res.end('Run npm run acquire and npm run build first.'); }
});
await mkdir('.cache',{recursive:true});
server.listen(4317, '127.0.0.1', async () => {await writeFile('.cache/server.pid',String(process.pid));console.log('Voice audio spike: http://127.0.0.1:4317 — Ctrl+C or npm run stop to stop server; Parar releases page media.');});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
