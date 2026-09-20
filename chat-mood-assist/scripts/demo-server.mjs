// Serves demo/ over http://localhost so the extension sees a normal hostname
// (file:// pages need a separate "allow access to file URLs" grant in Chrome).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../demo/", import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

const server = createServer(async (req, res) => {
  const path = normalize(new URL(req.url ?? "/", "http://x").pathname).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, path === "/" ? "chat.html" : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.log(`port ${port} already in use, reusing the server that is running there`);
});
server.listen(port, "127.0.0.1", () => {
  console.log(`demo chat: http://localhost:${port}/chat.html`);
});
