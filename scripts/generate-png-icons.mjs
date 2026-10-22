import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.alloc(4 + len);
  chunk.copy(typeAndData, 0, 4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, isMaskable = false) {
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * (isMaskable ? 0.32 : 0.38);
  const innerRadius = radius * 0.72;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background theme: Dark Slate #020617 / #0f172a
      let r = 2, g = 6, b = 23, a = 255;

      // Subtle gradient on background
      const grad = y / height;
      r = Math.round(2 + grad * 14);
      g = Math.round(6 + grad * 17);
      b = Math.round(23 + grad * 24);

      // Hexagon or outer ring glow
      if (dist < radius + 4 && dist > radius - 6) {
        // Cyan / emerald accent ring
        r = 16; g = 185; b = 129; // emerald
      } else if (dist <= radius - 6 && dist >= innerRadius) {
        // Sun amber glow
        const glowFactor = (dist - innerRadius) / (radius - innerRadius);
        r = Math.round(245 * (1 - glowFactor * 0.4));
        g = Math.round(158 * (1 - glowFactor * 0.3));
        b = 11;
      } else if (dist < innerRadius) {
        // Dark inner solar cell core with golden solar cell cross
        const inCrossX = Math.abs(dx) < width * 0.03 && Math.abs(dy) < innerRadius * 0.7;
        const inCrossY = Math.abs(dy) < height * 0.03 && Math.abs(dx) < innerRadius * 0.7;
        if (inCrossX || inCrossY) {
          r = 56; g = 189; b = 248; // light cyan grid
        } else {
          r = 15; g = 23; b = 42; // dark center
        }
      }

      // If lightning bolt area in lower half
      if (dy > innerRadius * 0.3 && dy < radius * 1.05 && Math.abs(dx) < width * 0.08) {
        r = 245; g = 158; b = 11; // amber bolt
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('Successfully generated PWA icon set in public/');
