#!/usr/bin/env node
/**
 * Repair already-cut people plates in public/game/people without redrawing them.
 *
 *   node scripts/repair-people-plates.mjs            # repair + write .webp and .png
 *   node scripts/repair-people-plates.mjs --dry      # report only
 *
 * close:   an old dark-flood key cut jagged notches into black trousers. Morphologically close the
 *          alpha mask over the legs (radius 16px, so the real gap between the legs survives) and fill
 *          the closed pixels with the neighbouring trouser colour.
 * islands: keep only the figure — drop detached crop marks, labels and dots.
 * backdrop: clear large near-white, unsaturated patches below the face (studio backdrop left in
 *          enclosed gaps such as arm-on-hip). Small highlights and gold jewellery are untouched.
 * top=f:   clear rows above fraction f of the height (crop bars touching the hair).
 *
 * An entry may read from another plate (`from`) and write a new one, leaving the source untouched.
 *
 * Runs in headless Chromium so it needs no native image libs.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const DIR = "public/game/people";
const PLATES = {
  dj: { ops: ["close"] },
  "court-og": { ops: ["close"] },
  // The k-blanco-front plate lost her whole top to a dark flood. walker-05 is a clean full-body K.
  "k-blanco-desk": { from: "walker-05", ops: ["islands", "backdrop", "top=0.038"] },
};
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const dry = process.argv.includes("--dry");

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

for (const [name, { from, ops }] of Object.entries(PLATES)) {
  if (only && !only.includes(name)) continue;
  const src = await readFile(join(DIR, `${from ?? name}.webp`));
  const result = await page.evaluate(
    async ({ b64, ops }) => {
      const img = new Image();
      img.src = `data:image/webp;base64,${b64}`;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const report = [];

      for (const op of ops) {
        const data = g.getImageData(0, 0, w, h);
        const d = data.data;

        if (op === "islands") {
          const label = new Int32Array(w * h).fill(-1);
          const sizes = [];
          const stack = [];
          for (let s0 = 0; s0 < w * h; s0++) {
            if (label[s0] !== -1 || d[s0 * 4 + 3] < 40) continue;
            const id = sizes.length;
            let n = 0;
            label[s0] = id;
            stack.push(s0);
            while (stack.length) {
              const i = stack.pop();
              n++;
              const x = i % w;
              const y = (i - x) / w;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                  const j = ny * w + nx;
                  if (label[j] !== -1 || d[j * 4 + 3] < 40) continue;
                  label[j] = id;
                  stack.push(j);
                }
              }
            }
            sizes.push(n);
          }
          const biggest = Math.max(...sizes);
          let cleared = 0;
          for (let i = 0; i < w * h; i++) {
            if (d[i * 4 + 3] === 0) continue;
            if (label[i] >= 0 && sizes[label[i]] >= biggest * 0.02) continue;
            d[i * 4 + 3] = 0;
            cleared++;
          }
          g.putImageData(data, 0, 0);
          report.push(`islands: kept ${sizes.filter((n) => n >= biggest * 0.02).length}/${sizes.length}, cleared ${cleared}px`);
        }

        if (op.startsWith("top=")) {
          const rows = Math.floor(h * Number(op.slice(4)));
          for (let i = 0; i < rows * w; i++) d[i * 4 + 3] = 0;
          g.putImageData(data, 0, 0);
          report.push(`top: cleared ${rows} rows`);
        }

        if (op === "backdrop") {
          const y0 = Math.floor(h * 0.28);
          const white = (i) => {
            const o = i * 4;
            const mn = Math.min(d[o], d[o + 1], d[o + 2]);
            return d[o + 3] >= 40 && mn >= 205 && Math.max(d[o], d[o + 1], d[o + 2]) - mn <= 28;
          };
          const seen = new Uint8Array(w * h);
          let cleared = 0;
          for (let s0 = y0 * w; s0 < w * h; s0++) {
            if (seen[s0] || !white(s0)) continue;
            const region = [s0];
            seen[s0] = 1;
            for (let k = 0; k < region.length; k++) {
              const i = region[k];
              const x = i % w;
              for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
                if (j < y0 * w || j >= w * h || seen[j] || !white(j)) continue;
                seen[j] = 1;
                region.push(j);
              }
            }
            if (region.length < 150) continue;
            for (const i of region) d[i * 4 + 3] = 0;
            cleared += region.length;
          }
          g.putImageData(data, 0, 0);
          report.push(`backdrop: cleared ${cleared}px`);
        }

        if (op === "close") {
          // Morphological close of the alpha mask over the legs, filled with nearby trouser colour.
          const R = 16;
          const y0 = Math.floor(h * 0.42);
          const y1 = Math.floor(h * 0.9);
          const solid = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
          const dil = new Uint8Array(w * h);
          for (let y = y0 - R; y < y1 + R; y++) {
            for (let x = 0; x < w; x++) {
              let hit = 0;
              for (let dy = -R; dy <= R && !hit; dy++) {
                for (let dx = -R; dx <= R; dx++) {
                  if (dx * dx + dy * dy > R * R) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                  if (solid[ny * w + nx]) { hit = 1; break; }
                }
              }
              if (y >= 0 && y < h) dil[y * w + x] = hit;
            }
          }
          let filled = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = 0; x < w; x++) {
              const i = y * w + x;
              if (solid[i]) continue;
              let keep = 1;
              for (let dy = -R; dy <= R && keep; dy++) {
                for (let dx = -R; dx <= R; dx++) {
                  if (dx * dx + dy * dy > R * R) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= w || ny >= h || !dil[ny * w + nx]) { keep = 0; break; }
                }
              }
              if (!keep) continue;
              let r = 0, gg = 0, b = 0, n = 0;
              for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                  const o = (ny * w + nx) * 4;
                  if (!solid[ny * w + nx]) continue;
                  r += d[o]; gg += d[o + 1]; b += d[o + 2]; n++;
                }
              }
              if (!n) continue;
              const o = i * 4;
              d[o] = r / n; d[o + 1] = gg / n; d[o + 2] = b / n; d[o + 3] = 255;
              filled++;
            }
          }
          g.putImageData(data, 0, 0);
          report.push(`close: filled ${filled}px`);
        }
      }
      return {
        report,
        webp: c.toDataURL("image/webp", 0.95).split(",")[1],
        png: c.toDataURL("image/png").split(",")[1],
      };
    },
    { b64: src.toString("base64"), ops },
  );
  console.log(`${name}: ${result.report.join(" | ")}`);
  if (!dry) {
    await writeFile(join(DIR, `${name}.webp`), Buffer.from(result.webp, "base64"));
    await writeFile(join(DIR, `${name}.png`), Buffer.from(result.png, "base64"));
  }
}

await browser.close();
