#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const dir = process.argv[2] || "artifacts";
const MIN_BYTES = 8_000;
const MIN_EDGE = 64;
const MIN_MEAN = 8;
const MIN_P95 = 18;
const MIN_VARIANCE = 40;
const MIN_STDDEV = 6.2;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const rowOff = y * stride;
    for (let x = 0; x < stride; x++) {
      const val = raw[src++];
      const left = x >= bpp ? out[rowOff + x - bpp] : 0;
      const up = y > 0 ? out[rowOff - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[rowOff - stride + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + left) & 255;
      else if (filter === 2) recon = (val + up) & 255;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 255;
      else if (filter === 4) recon = (val + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      out[rowOff + x] = recon;
    }
  }
  return out;
}

function parsePng(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error("not a PNG");
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!bpp) throw new Error(`unsupported PNG color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idats));
  return { width, height, bpp, pixels: unfilter(raw, width, height, bpp) };
}

function analyze(pixels, width, height, bpp) {
  const count = width * height;
  let sum = 0;
  let sumSq = 0;
  let dark = 0;
  const hist = new Uint32Array(256);
  for (let i = 0; i < count; i++) {
    const o = i * bpp;
    const r = pixels[o];
    const g = bpp === 1 ? r : pixels[o + 1];
    const b = bpp === 1 ? r : pixels[o + 2];
    const y = (r * 299 + g * 587 + b * 114) / 1000;
    const yi = Math.max(0, Math.min(255, Math.round(y)));
    hist[yi] += 1;
    sum += y;
    sumSq += y * y;
    if (y < 10) dark += 1;
  }
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const stddev = Math.sqrt(variance);
  let acc = 0;
  let p95 = 0;
  const need = count * 0.95;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= need) {
      p95 = i;
      break;
    }
  }
  return { mean, variance, stddev, p95, darkRatio: dark / count, count };
}

const files = (await readdir(dir)).filter((name) => name.toLowerCase().endsWith(".png")).sort();
if (!files.length) {
  console.error(`FAIL: no PNG files in ${dir}`);
  process.exit(1);
}

const failures = [];
for (const name of files) {
  const path = join(dir, name);
  const info = await stat(path);
  try {
    if (info.size < MIN_BYTES) {
      throw new Error(`file too small (${info.size} bytes) — likely a placeholder or black frame`);
    }
    const png = parsePng(await readFile(path));
    if (png.width < MIN_EDGE || png.height < MIN_EDGE) {
      throw new Error(`tiny frame ${png.width}x${png.height}`);
    }
    const stats = analyze(png.pixels, png.width, png.height, png.bpp);
    const black = stats.mean < MIN_MEAN && stats.p95 < MIN_P95;
    const flat = stats.variance < MIN_VARIANCE || stats.stddev < MIN_STDDEV;
    if (black) throw new Error(`black frame mean=${stats.mean.toFixed(1)} p95=${stats.p95}`);
    if (flat) throw new Error(`low variance ${stats.variance.toFixed(1)} stddev=${stats.stddev.toFixed(1)}`);
    console.log(
      `PASS: ${name} ${png.width}x${png.height} mean=${stats.mean.toFixed(1)} std=${stats.stddev.toFixed(1)} p95=${stats.p95}`,
    );
  } catch (err) {
    const message = `${name}: ${err?.message || err}`;
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
}

if (failures.length) {
  console.error(`\nFrame QA failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`\nFrame QA passed (${files.length} images).`);
