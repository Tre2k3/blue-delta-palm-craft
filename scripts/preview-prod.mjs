#!/usr/bin/env node
import { createReadStream, existsSync } from "node:fs";
import { copyFile, stat } from "node:fs/promises";
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

// With no hosted database (CI, a local check) the server falls back to its embedded one, and
// the build leaves that library's data files behind. Put them beside it, so signing in and
// saved progress can be tested against the production build. The live site has a real database
// and never loads any of this.
if (!process.env.DATABASE_URL) {
  const libs = resolve(root, ".vercel/output/functions/__server.func/_libs");
  const dist = resolve(root, "node_modules/@electric-sql/pglite/dist");
  if (existsSync(libs) && existsSync(dist)) {
    for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
      const from = join(dist, name);
      const to = join(libs, name);
      if (existsSync(from) && !existsSync(to)) await copyFile(from, to);
    }
  }
}

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
    // A POST carries a body; pass it on as it came.
    const method = req.method || "GET";
    let body;
    if (method !== "GET" && method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length) body = Buffer.concat(chunks);
    }
    const request = new Request(`http://${hostHdr}${req.url || "/"}`, { method, headers, body });
    const response = await fetchHandler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      const name = key.toLowerCase();
      if (name === "transfer-encoding" || name === "set-cookie") return;
      res.setHeader(key, value);
    });
    // Signing in sets more than one cookie. Each is its own header; set one at a time, only the last got through.
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) res.setHeader("set-cookie", cookies);
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
