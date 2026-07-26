// Generates the PWA icon set as plain PNGs using only Node's built-in zlib —
// no image/canvas dependency. Draws a simple on-brand monogram ("A" on the
// action/primary ink-blue token from STAGE_1B_DESIGN_SYSTEM.md §4) so the app
// has real, valid icon assets rather than placeholders that would fail PWA
// installability checks. Re-run with `node scripts/generate-icons.mjs` if the
// brand mark ever changes.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const INK_BLUE = [0x2b, 0x4c, 0x7e]; // action/primary (light theme)
const WHITE = [0xfa, 0xfa, 0xf7]; // text/inverse

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Point-in-triangle test (barycentric sign method). */
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Renders the "A" monogram into an RGBA buffer.
 * `safeRatio` shrinks the glyph for maskable icons (Android adaptive-icon
 * safe zone is ~66% of the canvas; we use 60% to stay safely inside it).
 */
function renderIcon(size, { maskable = false } = {}) {
  const data = Buffer.alloc(size * size * 4);
  const safeRatio = maskable ? 0.55 : 0.7;
  const glyphHeight = size * safeRatio;
  const glyphWidth = glyphHeight * 0.82;
  const top = (size - glyphHeight) / 2;
  const bottom = top + glyphHeight;
  const cx = size / 2;
  const strokeWidth = glyphWidth * 0.2;
  const crossbarY = top + glyphHeight * 0.62;
  const crossbarHeight = glyphHeight * 0.14;

  // Outer triangle (the "A" silhouette) and inner triangle subtracted to
  // form two legs + apex, then a crossbar rectangle unions the legs.
  const apexX = cx;
  const apexY = top;
  const leftX = cx - glyphWidth / 2;
  const rightX = cx + glyphWidth / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let isGlyph = false;

      if (y >= top && y <= bottom) {
        const outer = inTriangle(x, y, apexX, apexY, leftX, bottom, rightX, bottom);
        if (outer) {
          // shrink inward by strokeWidth to hollow out the triangle
          const innerLeftX = cx - (glyphWidth / 2 - strokeWidth * 1.4);
          const innerRightX = cx + (glyphWidth / 2 - strokeWidth * 1.4);
          const innerTopY = top + strokeWidth * 1.1;
          const inner = inTriangle(
            x,
            y,
            apexX,
            innerTopY,
            innerLeftX,
            bottom + strokeWidth,
            innerRightX,
            bottom + strokeWidth,
          );
          isGlyph = !inner;
        }
        if (y >= crossbarY && y <= crossbarY + crossbarHeight) {
          const barLeft = cx - glyphWidth / 2 + strokeWidth * 0.5;
          const barRight = cx + glyphWidth / 2 - strokeWidth * 0.5;
          if (x >= barLeft && x <= barRight && outer) isGlyph = true;
        }
      }

      const [r, g, b] = isGlyph ? WHITE : INK_BLUE;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return data;
}

function encodePNG(size, rgba) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idatData = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { name: "icon-16.png", size: 16 },
  { name: "icon-32.png", size: 32 },
  { name: "icon-180.png", size: 180 }, // apple-touch-icon
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
];

for (const t of targets) {
  const rgba = renderIcon(t.size, { maskable: t.maskable });
  const png = encodePNG(t.size, rgba);
  writeFileSync(join(outDir, t.name), png);
  console.log(`wrote ${t.name} (${png.length} bytes)`);
}
