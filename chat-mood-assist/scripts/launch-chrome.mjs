// Starts the demo server, launches Chrome with a throwaway profile and loads
// dist/ through the DevTools protocol. Chrome stable no longer honours the
// --load-extension flag, so Extensions.loadUnpacked is the only scriptable way.
import "./demo-server.mjs";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = `${root}dist`;
const profile = `${root}.chrome-profile`;
const demoUrl = `http://localhost:${process.env.PORT ?? 8787}/chat.html`;
const chrome = process.env.CHROME ?? (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : "google-chrome");

mkdirSync(profile, { recursive: true });
const portFile = `${profile}/DevToolsActivePort`;
const readPort = () => Number(readFileSync(portFile, "utf8").split("\n")[0]);
const alive = async (p) => (await fetch(`http://localhost:${p}/json/version`)).json();

// Reuse a Chrome that is already running on this profile, otherwise start one.
let port;
try { port = readPort(); await alive(port); console.log("reusing the running Chrome"); } catch { port = undefined; }
if (port === undefined) {
  rmSync(portFile, { force: true });
  const child = spawn(chrome, [
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0", // Chrome picks a free port and writes it to DevToolsActivePort
    "--enable-unsafe-extension-debugging",
    "--no-first-run",
    "--no-default-browser-check",
    demoUrl,
  ], { stdio: "ignore", detached: true });
  child.unref();
  port = await waitFor("Chrome to start", readPort, 240);
}
const version = await waitFor("the DevTools port to answer", () => alive(port));
const extensionId = (await cdp(version.webSocketDebuggerUrl, "Extensions.loadUnpacked", { path: dist })).id;
console.log(`extension loaded: ${extensionId}`);

// Drive the same steps a person would do in the popup: enable localhost,
// reload the demo page so the content script starts, then start the demo loop.
const worker = await waitFor("the extension service worker", async () => {
  const targets = await (await fetch(`http://localhost:${port}/json`)).json();
  const sw = targets.find((t) => t.type === "service_worker" && t.url.includes(extensionId));
  if (!sw) throw new Error("service worker not up yet");
  return sw;
});
const inWorker = (expression) =>
  cdp(worker.webSocketDebuggerUrl, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
await inWorker(`chrome.storage.sync.set({ enabledSites: ["localhost"] })`);
await inWorker(`chrome.tabs.query({ url: "${demoUrl.replace("chat.html", "*")}" }).then((tabs) => chrome.tabs.reload(tabs[0].id))`);
await waitFor("the content script on the demo page", async () => {
  const state = await inWorker(`chrome.tabs.query({ url: "${demoUrl.replace("chat.html", "*")}" }).then((tabs) => chrome.tabs.sendMessage(tabs[0].id, { type: "get-state" }))`);
  if (!state.result?.value?.active) throw new Error("content script not active yet");
});
await inWorker(`chrome.tabs.query({ url: "${demoUrl.replace("chat.html", "*")}" }).then((tabs) => chrome.tabs.sendMessage(tabs[0].id, { type: "demo", loop: true }))`);
console.log("demo running: the HUD loops through 4 emotions every 2 s. Ctrl+C stops the demo server.");

async function cdp(url, method, params) {
  const ws = new WebSocket(url);
  await new Promise((resolve) => (ws.onopen = resolve));
  const result = await new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    };
    ws.send(JSON.stringify({ id: 1, method, params }));
  });
  ws.close();
  return result;
}

async function waitFor(what, fn, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error(`timed out waiting for ${what}`);
}
