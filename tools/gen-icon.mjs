// 生成应用图标 src/common/icon.png（192×192，纯 node，无依赖）
// 设计：圆角深色底 + 青色节拍摆杆 + 配重球，一眼能看出「节拍器」
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

const S = 192;
const px = Buffer.alloc(S * S * 4);
const BG = [12, 16, 20]; // #0c1014
const CYAN = [77, 208, 225]; // #4dd0e1
const WHITE = [253, 253, 253];
const DARK = [0, 35, 42];

function set(x, y, c, a) {
  const i = (y * S + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = a == null ? 255 : a;
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// 点到线段距离
function distSeg(x, y, x0, y0, x1, y1) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const wx = x - x0;
  const wy = y - y0;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const dx = x - (x0 + t * vx);
  const dy = y - (y0 + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

const PIVOT = [96, 52]; // 支点
const WEIGHT = [138, 146]; // 配重球

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (!inRoundRect(x, y, 0, 0, S - 1, S - 1, 42)) {
      set(x, y, [0, 0, 0], 0); // 圆角外透明
      continue;
    }
    set(x, y, BG);

    // 底座刻度（三条短横线，左侧）
    for (let k = 0; k < 3; k++) {
      const ty = 132 + k * 16;
      if (inRoundRect(x, y, 34, ty, 70, ty + 5, 2)) set(x, y, CYAN);
    }

    // 摆杆
    if (distSeg(x, y, PIVOT[0], PIVOT[1], WEIGHT[0], WEIGHT[1]) <= 5) set(x, y, CYAN);

    // 配重球 + 内圈
    if (inCircle(x, y, WEIGHT[0], WEIGHT[1], 20)) {
      set(x, y, CYAN);
      if (inCircle(x, y, WEIGHT[0], WEIGHT[1], 9)) set(x, y, DARK);
    }

    // 支点
    if (inCircle(x, y, PIVOT[0], PIVOT[1], 10)) set(x, y, WHITE);
    if (inCircle(x, y, PIVOT[0], PIVOT[1], 4)) set(x, y, BG);
  }
}

/* ---------- PNG 编码 ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0; // filter: none
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'common', 'icon.png');
fs.writeFileSync(out, png);
console.log('icon written: ' + out + '  ' + png.length + 'B');