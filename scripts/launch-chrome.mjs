// Starts the demo server, launches Chrome with a throwaway profile and loads
// dist/ through the DevTools protocol. Chrome stable no longer honours the
// --load-extension flag, so Extensions.loadUnpacked is the only scriptable way.
import "./demo-server.mjs";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = `${root}dist`;
const profile = `${root}.chrome-profile`;
const port = 9222;
const demoUrl = `http://localhost:${process.env.PORT ?? 8787}/chat.html`;
const chrome = process.env.CHROME ?? (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : "google-chrome");

mkdirSync(profile, { recursive: true });
const child = spawn(chrome, [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--enable-unsafe-extension-debugging",
  "--no-first-run",
  "--no-default-browser-check",
  demoUrl,
], { stdio: "ignore", detached: true });
child.unref();

const version = await waitFor(async () => (await fetch(`http://localhost:${port}/json/version`)).json());
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
ws.send(JSON.stringify({ id: 1, method: "Extensions.loadUnpacked", params: { path: dist } }));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== 1) return;
  if (message.error) console.error("load failed:", message.error.message);
  else console.log(`extension loaded: ${message.result.id}\nopen ${demoUrl}, click the icon, tick 啟用, press Demo`);
  ws.close();
};

async function waitFor(fn, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error("Chrome did not expose the DevTools port");
}
