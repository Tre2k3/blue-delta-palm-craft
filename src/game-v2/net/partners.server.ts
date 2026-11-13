/**
 * Requests from businesses, food trucks and artists who want to be in the game. Server only.
 *
 * Anyone can send one, signed in or not. Only an owner can read them: an owner is a signed-in
 * account whose email is on the list in the hosting settings (`PARTNER_OWNERS`, addresses
 * separated by commas). With no list set nobody can read them, and they are kept all the same.
 *
 * Where the site has a hosted database the requests are kept there, in a table made on first
 * use (nothing is added to `migrations/`). Where it has none (a preview, a test run) they are
 * kept in the server's memory, and the database helper is not loaded at all.
 */
import type { Sql } from "@/lib/db";

export const KINDS = ["billboard", "truck", "store", "music", "other"] as const;
export type Kind = (typeof KINDS)[number];
export type Ask = { kind: Kind; name: string; business: string; reach: string; note: string };
export type Kept = Ask & { id: number; at: string; done: boolean };

/** How many requests an hour are taken before the door shuts for a while: nobody sends that many in earnest. */
const PER_HOUR = 40;
const KEEP = 400;

const globalRef = globalThis as typeof globalThis & { __partnerSchema__?: Promise<void>; __partnerMemory__?: Kept[] };
const hosted = typeof process !== "undefined" && !!process.env.DATABASE_URL?.trim();

const text = (v: unknown, max: number) =>
  (typeof v === "string" ? v : "")
    // Anything that is not printable is dropped, and runs of space are closed up.
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** What was sent, cut down to what a request is. Throws when it is not one. */
export function checkAsk(input: unknown): Ask {
  const sent = (input ?? {}) as Record<string, unknown>;
  const kind = (KINDS as readonly string[]).includes(sent.kind as string) ? (sent.kind as Kind) : "other";
  const ask: Ask = { kind, name: text(sent.name, 60), business: text(sent.business, 80), reach: text(sent.reach, 120), note: text(sent.note, 600) };
  // A box no person sees or fills in: whatever fills it in is not a person.
  if (text(sent.website, 10)) throw new Error("Bad request");
  if (ask.name.length < 2) throw new Error("Tell us your name.");
  if (ask.reach.length < 5) throw new Error("Tell us how to reach you: a phone number, an email or an @ name.");
  return ask;
}

function ensure(sql: Sql) {
  globalRef.__partnerSchema__ ??= sql
    .query(
      `CREATE TABLE IF NOT EXISTS partner_requests (
         id BIGSERIAL PRIMARY KEY,
         kind TEXT NOT NULL,
         name TEXT NOT NULL,
         business TEXT NOT NULL DEFAULT '',
         reach TEXT NOT NULL,
         note TEXT NOT NULL DEFAULT '',
         done BOOLEAN NOT NULL DEFAULT false,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined)
    .catch((err) => {
      globalRef.__partnerSchema__ = undefined;
      throw err;
    });
  return globalRef.__partnerSchema__;
}

async function open() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensure(sql);
  return sql;
}

type Row = { id: number | string; kind: string; name: string; business: string; reach: string; note: string; done: boolean; created_at: string | Date };
const kept = (r: Row): Kept => ({ id: Number(r.id), kind: ((KINDS as readonly string[]).includes(r.kind) ? r.kind : "other") as Kind, name: r.name, business: r.business, reach: r.reach, note: r.note, done: !!r.done, at: new Date(r.created_at).toISOString() });

/** Keep a request. False when too many have come in this hour. */
export async function keepAsk(ask: Ask): Promise<boolean> {
  if (!hosted) {
    const all = (globalRef.__partnerMemory__ ??= []);
    const hour = Date.now() - 3600_000;
    if (all.filter((r) => Date.parse(r.at) > hour).length >= PER_HOUR) return false;
    all.push({ ...ask, id: (all[all.length - 1]?.id ?? 0) + 1, at: new Date().toISOString(), done: false });
    if (all.length > KEEP) all.splice(0, all.length - KEEP);
    return true;
  }
  const sql = await open();
  const recent = await sql.query<{ n: number | string }>(`SELECT count(*) AS n FROM partner_requests WHERE created_at > now() - interval '1 hour'`);
  if (Number(recent[0]?.n ?? 0) >= PER_HOUR) return false;
  await sql.query(`INSERT INTO partner_requests (kind, name, business, reach, note) VALUES ($1, $2, $3, $4, $5)`, [ask.kind, ask.name, ask.business, ask.reach, ask.note]);
  return true;
}

/** Whether this signed-in account may read the requests. Its email is looked up, never taken from the caller. */
export async function isOwner(userId: string): Promise<boolean> {
  const list = (process.env.PARTNER_OWNERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length || !userId) return false;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ email: string | null }>(`SELECT email FROM "user" WHERE id = $1`, [userId]);
    const email = (rows[0]?.email ?? "").trim().toLowerCase();
    return !!email && list.includes(email);
  } catch {
    // Nobody is an owner where the accounts cannot be read.
    return false;
  }
}

/** The requests, newest first. */
export async function readAsks(): Promise<Kept[]> {
  if (!hosted) return [...(globalRef.__partnerMemory__ ?? [])].reverse();
  const sql = await open();
  const rows = await sql.query<Row>(`SELECT id, kind, name, business, reach, note, done, created_at FROM partner_requests ORDER BY id DESC LIMIT ${KEEP}`);
  return rows.map(kept);
}

/** Tick one off, or put it back. */
export async function markAsk(id: number, done: boolean): Promise<void> {
  if (!hosted) {
    const r = (globalRef.__partnerMemory__ ?? []).find((q) => q.id === id);
    if (r) r.done = done;
    return;
  }
  const sql = await open();
  await sql.query(`UPDATE partner_requests SET done = $2 WHERE id = $1`, [id, done]);
}
