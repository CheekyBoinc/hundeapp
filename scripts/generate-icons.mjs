import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, rgba, height = width) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function roundedRectInside(x, y, size, r) {
  const min = r;
  const max = size - r;
  const cx = Math.min(Math.max(x, min), max);
  const cy = Math.min(Math.max(y, min), max);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

const ORANGE = [234, 124, 58];
const CREAM = [255, 250, 244];
const PAGE = [250, 247, 242]; // Hintergrund der App (#faf7f2)

const TOES = [
  [0.3, 0.34, 0.085],
  [0.44, 0.235, 0.095],
  [0.56, 0.235, 0.095],
  [0.7, 0.34, 0.085]
];
const MAIN_PAD = [0.5, 0.66, 0.21, 0.155];

// Liegt der Punkt (fx, fy) in Bruchteilen von 0..1 in der Pfote? `scale`
// verkleinert die Pfote zur Mitte hin (für adaptive Android-Icons).
function inPaw(fx, fy, scale = 1) {
  const sx = 0.5 + (fx - 0.5) / scale;
  const sy = 0.5 + (fy - 0.5) / scale;
  if (inEllipse(sx, sy, MAIN_PAD[0], MAIN_PAD[1], MAIN_PAD[2], MAIN_PAD[3])) return true;
  for (const [cx, cy, cr] of TOES) {
    const dx = sx - cx;
    const dy = sy - cy;
    if (dx * dx + dy * dy <= cr * cr) return true;
  }
  return false;
}

function render(width, pixel, height = width) {
  const px = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const c = pixel(x + 0.5, y + 0.5);
      if (!c) continue; // transparent
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

// Klassisches App-Icon: abgerundetes Quadrat mit Pfote.
function drawIcon(size) {
  const r = size * 0.22;
  return render(size, (fx, fy) => {
    if (!roundedRectInside(fx, fy, size, r)) return null;
    return inPaw(fx / size, fy / size) ? CREAM : ORANGE;
  });
}

// Adaptive Icon (Android): Vordergrund nur Pfote auf transparent, verkleinert
// in die sichere Zone; Hintergrund einfarbig.
function drawForeground(size) {
  return render(size, (fx, fy) => (inPaw(fx / size, fy / size, 0.62) ? CREAM : null));
}

function drawSolid(size, color) {
  return render(size, () => color);
}

// Splash: App-Hintergrundfarbe mit dem Icon in der Mitte.
function drawSplash(size, background) {
  const icon = size * 0.22;
  const off = (size - icon) / 2;
  const r = icon * 0.22;
  return render(size, (fx, fy) => {
    const lx = fx - off;
    const ly = fy - off;
    if (lx < 0 || ly < 0 || lx >= icon || ly >= icon) return background;
    if (!roundedRectInside(lx, ly, icon, r)) return background;
    return inPaw(lx / icon, ly / icon) ? CREAM : ORANGE;
  });
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), encodePng(size, drawIcon(size)));
}
writeFileSync(join(outDir, 'apple-touch-icon.png'), encodePng(180, drawIcon(180)));
console.log('Icons generiert in', outDir);

// Quellbilder für @capacitor/assets (npx capacitor-assets generate)
const assetsDir = join(__dirname, '..', 'assets');
mkdirSync(assetsDir, { recursive: true });
writeFileSync(join(assetsDir, 'icon-only.png'), encodePng(1024, drawIcon(1024)));
writeFileSync(join(assetsDir, 'icon-foreground.png'), encodePng(1024, drawForeground(1024)));
writeFileSync(join(assetsDir, 'icon-background.png'), encodePng(1024, drawSolid(1024, ORANGE)));
writeFileSync(join(assetsDir, 'splash.png'), encodePng(2732, drawSplash(2732, PAGE)));
writeFileSync(join(assetsDir, 'splash-dark.png'), encodePng(2732, drawSplash(2732, [28, 25, 23])));
console.log('Capacitor-Quellbilder generiert in', assetsDir);

// Play-Store-Grafiken: Icon 512x512 ohne transparente Ecken (Google rundet
// selbst) und Feature-Grafik 1024x500 (Pflicht im Store-Eintrag).
const storeDir = join(__dirname, '..', 'store');
mkdirSync(storeDir, { recursive: true });
writeFileSync(
  join(storeDir, 'icon-512.png'),
  encodePng(
    512,
    render(512, (fx, fy) => (inPaw(fx / 512, fy / 512) ? CREAM : ORANGE))
  )
);
function drawFeature(w, h) {
  // Orange Fläche, große Pfote leicht links, rechts Platz für Text im Store.
  const paw = h * 0.78;
  const ox = w * 0.14;
  const oy = (h - paw) / 2;
  return render(
    w,
    (fx, fy) => {
      const lx = (fx - ox) / paw;
      const ly = (fy - oy) / paw;
      if (lx >= 0 && lx < 1 && ly >= 0 && ly < 1 && inPaw(lx, ly)) return CREAM;
      return ORANGE;
    },
    h
  );
}
writeFileSync(join(storeDir, 'feature-graphic.png'), encodePng(1024, drawFeature(1024, 500), 500));
console.log('Store-Grafiken generiert in', storeDir);
