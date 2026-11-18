/**
 * How two devices find each other. Only the handshake passes through here: who is in a crew,
 * and the connection offers they send one another while the direct link forms. After that
 * everything a crew says goes straight from browser to browser and never touches the server.
 *
 * Where the site has a hosted database, the handshake is kept there, so any server instance can
 * answer any request; the two tables are made on first use and need no migration. Where it has
 * none (a preview, a test run) there is only one server process, and its memory does the job.
 * Nothing here needs a sign-in or anything else set up.
 *
 * The database helper is only loaded when there is a database to talk to: loading it without
 * one starts the embedded stand-in, which a built server has no use for and cannot run.
 */
import { z } from "zod";
import type { Sql } from "@/lib/db";
import type { PeerRow, RtcPollResponse, SignalRow } from "@/lib/multiplayer";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  // An offer is a few kilobytes. The cap is only there to stop abuse.
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, { message: "payload too large" }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 60;
const ROSTER_MAX = 32;
const INBOX_MAX = 200;

/** Where the handshake is kept while it is in flight. */
interface Store {
  touch(room: string, peer: string, name: string): Promise<void>;
  roster(room: string): Promise<PeerRow[]>;
  inbox(room: string, peer: string, since: number): Promise<SignalRow[]>;
  post(room: string, to: string, from: string, kind: SignalRow["kind"], payload: unknown): Promise<void>;
  leave(room: string, peer: string): Promise<void>;
  /** Nothing here is kept: whatever has gone stale is swept out. */
  prune(): Promise<void>;
}

const globalRef = globalThis as typeof globalThis & {
  __rtcSchemaPromise__?: Promise<void>;
  __rtcMemory__?: { peers: Map<string, { room: string; id: string; name: string; seen: number }>; signals: { id: number; room: string; to: string; from: string; kind: SignalRow["kind"]; payload: unknown; at: number }[]; next: number };
};

// ---------------------------------------------------------------- in the database

/** Made once per server process. A failure clears the slot so the next request tries again. */
function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_peers (
         room TEXT NOT NULL,
         peer_id TEXT NOT NULL,
         name TEXT NOT NULL DEFAULT '',
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (room, peer_id)
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_signals (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         kind TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(`CREATE INDEX IF NOT EXISTS webrtc_signals_inbox ON webrtc_signals (room, to_peer, id)`);
  })().catch((err) => {
    globalRef.__rtcSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__rtcSchemaPromise__;
}

async function database(): Promise<Store> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensureSchema(sql);
  return {
    async touch(room, peer, name) {
      await sql.query(
        `INSERT INTO webrtc_peers (room, peer_id, name, last_seen)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (room, peer_id)
         DO UPDATE SET last_seen = now(), name = EXCLUDED.name`,
        [room, peer, name],
      );
    },
    async roster(room) {
      const rows = await sql.query<{ peer_id: string; name: string }>(
        `SELECT peer_id, name FROM webrtc_peers
         WHERE room = $1 AND last_seen > now() - make_interval(secs => $2)
         ORDER BY peer_id LIMIT ${ROSTER_MAX}`,
        [room, PEER_TTL_SECONDS],
      );
      return rows.map((r) => ({ id: r.peer_id, name: r.name }));
    },
    async inbox(room, peer, since) {
      const rows = await sql.query<{ id: number; from_peer: string; kind: SignalRow["kind"]; payload: unknown }>(
        `SELECT id, from_peer, kind, payload FROM webrtc_signals
         WHERE room = $1 AND to_peer = $2 AND id > $3
         ORDER BY id LIMIT ${INBOX_MAX}`,
        [room, peer, since],
      );
      return rows.map((r) => ({ id: Number(r.id), from: r.from_peer, kind: r.kind, payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload }));
    },
    async post(room, to, from, kind, payload) {
      await sql.query(`INSERT INTO webrtc_signals (room, to_peer, from_peer, kind, payload) VALUES ($1, $2, $3, $4, $5)`, [room, to, from, kind, JSON.stringify(payload)]);
    },
    async leave(room, peer) {
      await sql.query(`DELETE FROM webrtc_peers WHERE room = $1 AND peer_id = $2`, [room, peer]);
    },
    async prune() {
      await Promise.all([
        sql.query(`DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`, [SIGNAL_TTL_SECONDS]),
        sql.query(`DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`, [PEER_TTL_SECONDS]),
      ]);
    },
  };
}

// ---------------------------------------------------------------- in memory

function memory(): Store {
  // Numbered from the clock, so a device that was polling before a restart does not skip what comes after it.
  const empty: NonNullable<typeof globalRef.__rtcMemory__> = { peers: new Map(), signals: [], next: Date.now() };
  const m = (globalRef.__rtcMemory__ ??= empty);
  const fresh = (seen: number) => Date.now() - seen < PEER_TTL_SECONDS * 1000;
  return {
    async touch(room, peer, name) {
      m.peers.set(`${room}/${peer}`, { room, id: peer, name, seen: Date.now() });
    },
    async roster(room) {
      return [...m.peers.values()]
        .filter((p) => p.room === room && fresh(p.seen))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .slice(0, ROSTER_MAX)
        .map((p) => ({ id: p.id, name: p.name }));
    },
    async inbox(room, peer, since) {
      return m.signals
        .filter((s) => s.room === room && s.to === peer && s.id > since)
        .slice(0, INBOX_MAX)
        .map((s) => ({ id: s.id, from: s.from, kind: s.kind, payload: s.payload }));
    },
    async post(room, to, from, kind, payload) {
      m.signals.push({ id: ++m.next, room, to, from, kind, payload, at: Date.now() });
      // A hard lid, whatever anyone sends.
      if (m.signals.length > 4000) m.signals.splice(0, m.signals.length - 4000);
    },
    async leave(room, peer) {
      m.peers.delete(`${room}/${peer}`);
    },
    async prune() {
      const now = Date.now();
      m.signals = m.signals.filter((s) => now - s.at < SIGNAL_TTL_SECONDS * 1000);
      for (const [key, p] of m.peers) if (!fresh(p.seen)) m.peers.delete(key);
    },
  };
}

/** The hosted database where there is one; otherwise this process's own memory. */
const hosted = typeof process !== "undefined" && !!process.env.DATABASE_URL?.trim();
const store = (): Promise<Store> => (hosted ? database() : Promise.resolve(memory()));

// ---------------------------------------------------------------- the route

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

/** GET /api/rtc?room&peer&name&since: the first one joins; every one after is a heartbeat and an inbox. */
async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({ room: ID, peer: ID, name: z.string().max(64).default(""), since: z.coerce.number().int().min(0).default(0) })
    .safeParse({ room: url.searchParams.get("room"), peer: url.searchParams.get("peer"), name: url.searchParams.get("name") ?? "", since: url.searchParams.get("since") ?? 0 });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data;

  const s = await store();
  // Joins sweep out what has gone stale, and so does one poll in fifty.
  if (since === 0 || Math.random() < 0.02) await s.prune();
  await s.touch(room, peer, name);
  const body: RtcPollResponse = { signals: await s.inbox(room, peer, since), peers: await s.roster(room) };
  return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const s = await store();
  if (msg.op === "signal") await s.post(msg.room, msg.to, msg.from, msg.kind, msg.payload);
  else await s.leave(msg.room, msg.peer);
  return json({ ok: true });
}

/** Everything /api/rtc does: GET to join and poll, POST to pass a handshake on or to leave. */
export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}
