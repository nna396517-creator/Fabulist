// Generates the extension PNG icons without native dependencies: a solid
// rounded square written straight into a minimal PNG (IHDR + IDAT + IEND).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "icons");

const FG = [124, 92, 255]; // violet, same hue family as the HUD glow
const BG = [20, 20, 28, 0]; // transparent

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function roundedSquarePng(size) {
  const radius = Math.round(size * 0.22);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const inside = insideRoundedRect(x, y, size, radius);
      const px = inside ? [FG[0], FG[1], FG[2], 255] : BG;
      raw[p++] = px[0];
      raw[p++] = px[1];
      raw[p++] = px[2];
      raw[p++] = px[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, r) {
  const nearLeft = x < r;
  const nearRight = x >= size - r;
  const nearTop = y < r;
  const nearBottom = y >= size - r;
  if (!((nearLeft || nearRight) && (nearTop || nearBottom))) return true;
  const cx = nearLeft ? r - 0.5 : size - r - 0.5;
  const cy = nearTop ? r - 0.5 : size - r - 0.5;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = join(outDir, `icon${size}.png`);
  writeFileSync(file, roundedSquarePng(size));
  console.log(`wrote ${file}`);
}
