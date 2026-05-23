import { createHash, randomBytes } from "node:crypto";
import { connect } from "node:net";

const url = new URL(process.argv[2] ?? "ws://127.0.0.1:58266");
const host = url.hostname;
const port = Number(url.port) || 80;
const path = url.pathname || "/";

const actions = ["play", "pause", "toggle", "faster", "slower", "reset"];

const log = (...a) => console.log("[ws-smoke]", ...a);

const key = randomBytes(16).toString("base64");
const expectedAccept = createHash("sha1")
  .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
  .digest("base64");

const sock = connect({ host, port, family: 4 }, () => {
  log(`tcp open ${host}:${port}`);
  const req =
    `GET ${path} HTTP/1.1\r\n` +
    `Host: ${host}:${port}\r\n` +
    `Upgrade: websocket\r\n` +
    `Connection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${key}\r\n` +
    `Sec-WebSocket-Version: 13\r\n` +
    `\r\n`;
  sock.write(req);
});

let buf = Buffer.alloc(0);
let upgraded = false;

sock.on("data", async (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  if (!upgraded) {
    const sep = buf.indexOf("\r\n\r\n");
    if (sep === -1) return;
    const head = buf.slice(0, sep).toString();
    buf = buf.slice(sep + 4);
    log("handshake response:");
    head.split("\r\n").forEach(l => log("  " + l));
    if (!head.includes("101 ")) { log("FAIL: not 101"); sock.end(); process.exit(2); }
    if (!head.includes(expectedAccept)) { log("FAIL: bad accept"); sock.end(); process.exit(2); }
    upgraded = true;
    log("upgraded — sending frames");
    for (const action of actions) {
      const payload = JSON.stringify({ action });
      sock.write(maskedTextFrame(payload));
      log("→", payload);
      await sleep(200);
    }
    await sleep(300);
    sock.write(closeFrame());
    setTimeout(() => sock.end(), 300);
  }
});

sock.on("error", (e) => { log("ERROR", e.message); process.exit(3); });
sock.on("close", () => { log("tcp closed"); process.exit(upgraded ? 0 : 4); });

setTimeout(() => { if (!upgraded) { log("TIMEOUT waiting for upgrade"); sock.destroy(); process.exit(5); } }, 4000);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function maskedTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const mask = randomBytes(4);
  const len = payload.length;
  const header = [];
  header.push(0x81); // FIN + text
  if (len < 126) header.push(0x80 | len);
  else if (len < 65536) { header.push(0x80 | 126, (len >> 8) & 0xff, len & 0xff); }
  else throw new Error("too big");
  const head = Buffer.from(header);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([head, mask, masked]);
}

function closeFrame() {
  const mask = randomBytes(4);
  return Buffer.concat([Buffer.from([0x88, 0x80]), mask]);
}
