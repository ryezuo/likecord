import childProcess = require("node:child_process");
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { normalizeAnimatedAvatar } from "./avatar-animation";
import { gifFixture } from "./avatar-animation.fixtures";

// eslint-disable-next-line @typescript-eslint/no-var-requires -- exercise the actual worker wire protocol
const { Reader, send } = require("./avatar-animation-protocol.cjs");
describe("AV2.2 bounded binary transport", () => {
  it("handles fragmented messages and rejects truncation, magic/version, oversized declarations and trailing bytes", async () => {
    const chunks: Buffer[] = [];
    const { Writable } = await import("node:stream");
    const stream = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    await send(stream, { kind: "result" }, Buffer.from("main"), Buffer.from("poster"));
    const wire = Buffer.concat(chunks), good = new Reader();
    for (const byte of wire) good.push(Buffer.from([byte]));
    expect(good.end()).toMatchObject({ meta: { kind: "result" }, main: Buffer.from("main"), poster: Buffer.from("poster") });
    good.clear(); expect(good.parts).toBeNull(); expect(good.header).toBeNull();
    for (let size = 0; size < wire.length; size++) {
      const reader = new Reader(); reader.push(wire.subarray(0, size)); expect(() => reader.end()).toThrow(); reader.clear();
    }
    for (const [offset, value] of [[8, 8193], [12, 2097153], [16, 524289]]) {
      const bytes = Buffer.from(wire.subarray(0, 20)); bytes.writeUInt32BE(value, offset);
      expect(() => new Reader().push(bytes)).toThrow("bounds");
    }
    for (const offset of [0, 4]) { const bad = Buffer.from(wire); bad[offset]++; expect(() => new Reader().push(bad)).toThrow(); }
    expect(() => new Reader().push(Buffer.concat([wire, Buffer.from("x")]))).toThrow("Trailing");
  });
});

describe("AV2.2 real process supervision failures", () => {
  jest.setTimeout(20_000);
  let worker: string;
  const input = gifFixture();
  beforeEach(async () => { worker = path.join(os.tmpdir(), `avatar-worker-${process.pid}-${Date.now()}.cjs`); });
  afterEach(async () => { jest.restoreAllMocks(); await fs.unlink(worker).catch(() => {}); });
  const execute = (code: string, budgetMs = 3000) => fs.writeFile(worker, code).then(() => normalizeAnimatedAvatar(input, "image/gif", null, { workerPath: worker, budgetMs }));
  it.each([
    'process.stdin.resume();process.stdin.on("end",()=>process.stdout.end("wrong framing"));',
    'process.stdin.resume();process.stdin.on("end",()=>{let h=Buffer.alloc(20);Buffer.from("AVA2\\x01\\x00\\x00\\x00","binary").copy(h);h.writeUInt32BE(8193,8);process.stdout.end(h);});',
    'process.stdin.resume();process.stdin.on("end",()=>process.exit(1));',
    'process.stdin.resume();process.stderr.write(Buffer.alloc(8193));setInterval(()=>{},100);',
  ])("rejects malformed/oversized/failed worker and closes handles", async (code) => {
    const spawn = jest.spyOn(childProcess, "spawn");
    await expect(execute(code)).rejects.toMatchObject({ status: 422 });
    const child = spawn.mock.results[0].value as childProcess.ChildProcessWithoutNullStreams;
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    expect(child.stdin.destroyed && child.stdout.destroyed && child.stderr.destroyed).toBe(true);
    const settings = spawn.mock.calls[0][2]!;
    expect(settings.env).toEqual(expect.objectContaining({ LANG: "C.UTF-8", UV_THREADPOOL_SIZE: "4" }));
    expect(Object.keys(settings.env!)).not.toEqual(expect.arrayContaining(["DATABASE_URL", "REDIS_URL", "NODE_OPTIONS"]));
    await expect(normalizeAnimatedAvatar(input, "image/gif", null)).resolves.toHaveProperty("main");
  });
  it("ignores late output, escalates a resistant worker, confirms exit before releasing admission", async () => {
    const spawn = jest.spyOn(childProcess, "spawn");
    const pending = execute('process.stdin.resume();process.on("SIGTERM",()=>process.stdout.write("late result"));setInterval(()=>{},100);', 600);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(normalizeAnimatedAvatar(input, "image/gif", null)).rejects.toMatchObject({ response: { error: { code: "AVATAR_BUSY" } } });
    await expect(pending).rejects.toMatchObject({ response: { error: { code: "AVATAR_PROCESSING_TIMEOUT" } } });
    const child = spawn.mock.results[0].value as childProcess.ChildProcess;
    expect(child.signalCode).toBe(process.platform === "win32" ? "SIGTERM" : "SIGKILL");
    expect(() => process.kill(child.pid!, 0)).toThrow();
    await expect(normalizeAnimatedAvatar(input, "image/gif", null)).resolves.toHaveProperty("poster");
  });
});
