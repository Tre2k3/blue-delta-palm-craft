#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const staticDir = resolve(root, ".vercel/output/static");
const entry = resolve(root, ".vercel/output/functions/__server.func/index.mjs");
const host = "0.0.0.0";
const port = Number(process.env.PORT || 8080);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const nitro = await import(pathToFileURL(entry).href);
const fetchHandler = nitro.default?.fetch?.bind(nitro.default);
if (typeof fetchHandler !== "function") {
  throw new Error("Production server entry does not export fetch()");
}

function fileFromUrl(urlPath) {
  const pathname = decodeURIComponent((urlPath || "/").split("?")[0] || "/");
  const full = normalize(join(staticDir, pathname));
  if (full !== staticDir && !full.startsWith(`${staticDir}/`)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  try {
    const filePath = fileFromUrl(req.url || "/");
    if (filePath) {
      try {
        const info = await stat(filePath);
        if (info.isFile()) {
          res.statusCode = 200;
          res.setHeader("content-type", MIME[extname(filePath).toLowerCase()] || "application/octet-stream");
          createReadStream(filePath).pipe(res);
          return;
        }
      } catch {
        /* fall through to SSR */
      }
    }

    const hostHdr = req.headers.host || `127.0.0.1:${port}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) for (const item of value) headers.append(key, item);
      else headers.set(key, value);
    }
    const request = new Request(`http://${hostHdr}${req.url || "/"}`, {
      method: req.method || "GET",
      headers,
    });
    const response = await fetchHandler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end(String(err?.stack || err));
  }
});

server.listen(port, host, () => {
  console.log(`Production preview listening on http://${host}:${port}`);
});
