#!/usr/bin/env node
/**
 * Deploy preflight.
 *
 * Two misconfigurations in this app fail in ways that are invisible until
 * players lose data, so they are checked here and turned into loud, early
 * failures instead.
 *
 * 1. No DATABASE_URL in a deployed environment.
 *    src/lib/db.ts falls back to PGLite, which is constructed with no data
 *    directory — it is an in-memory Postgres. On Vercel every cold start gets a
 *    fresh empty database, so accounts, saves, $ackdollars and mission progress
 *    disappear at unpredictable intervals. The build does not fail. The smoke
 *    tests do not fail. Only players notice.
 *
 * 2. DATABASE_URL set while VITE_AUTH_ENABLED is false.
 *    src/lib/auth/verify.server.ts deliberately throws on this combination
 *    rather than silently serving every request as the shared dev user against
 *    a real database. Fine as a fail-safe, but it means a half-finished env
 *    config takes the whole deployment down on first request.
 *
 * Usage:
 *   node scripts/preflight.mjs            # check current env
 *   node scripts/preflight.mjs --deployed # additionally require production config
 *
 * Exits non-zero with an explanation on any blocking problem.
 */

const deployed =
  process.argv.includes("--deployed") ||
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production";

const raw = (name) => {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

const databaseUrl = raw("DATABASE_URL");
const authFlag = raw("VITE_AUTH_ENABLED");
const authEnabled = authFlag !== "false";

const blocking = [];
const warnings = [];

if (deployed && !databaseUrl) {
  blocking.push(
    "DATABASE_URL is not set.\n" +
      "    In a deployed environment this silently falls back to in-memory PGLite.\n" +
      "    Every cold start wipes all player data. Set DATABASE_URL to a Neon\n" +
      "    connection string. No code change is needed — src/lib/db.ts switches\n" +
      "    backends on this variable alone.",
  );
}

if (databaseUrl && !authEnabled) {
  blocking.push(
    "DATABASE_URL is set but VITE_AUTH_ENABLED=false.\n" +
      "    src/lib/auth/verify.server.ts throws on this combination, so the\n" +
      "    deployment will fail on its first request. Set VITE_AUTH_ENABLED=true\n" +
      "    whenever DATABASE_URL is present.",
  );
}

if (deployed && authEnabled && !databaseUrl) {
  blocking.push(
    "Auth is enabled but there is no database to store sessions in.\n" +
      "    Set DATABASE_URL.",
  );
}

if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  blocking.push(
    "DATABASE_URL does not look like a Postgres connection string.\n" +
      `    Got: ${databaseUrl.slice(0, 24)}...`,
  );
}

if (!deployed && !databaseUrl) {
  warnings.push(
    "No DATABASE_URL — using the embedded PGLite fallback. Correct for local\n" +
      "    development and CI. Data resets whenever the process restarts.",
  );
}

if (raw("VITE_STUN_URLS") === undefined) {
  warnings.push(
    "VITE_STUN_URLS is not set. Multiplayer peer connections will rely on\n" +
      "    defaults and may fail behind symmetric NAT.",
  );
}

const label = deployed ? "deployed" : "local";
console.log(`[preflight] mode: ${label}`);
console.log(`[preflight] database: ${databaseUrl ? "neon (DATABASE_URL set)" : "pglite (in-memory)"}`);
console.log(`[preflight] auth: ${authEnabled ? "enabled" : "disabled"}`);

for (const w of warnings) console.log(`[preflight] warn: ${w}`);

if (blocking.length) {
  console.error(`\n[preflight] ${blocking.length} blocking problem(s):\n`);
  for (const b of blocking) console.error(`  - ${b}\n`);
  process.exit(1);
}

console.log("[preflight] ok");
