/**
 * Where a signed-in player's progress is kept: one row a player, the whole save as text.
 * Server only. The table is made on first use, as the crew line's are; nothing is added to
 * `migrations/`.
 */
import type { Sql } from "@/lib/db";

const globalRef = globalThis as typeof globalThis & { __gameSavesSchema__?: Promise<void> };

function ensure(sql: Sql) {
  globalRef.__gameSavesSchema__ ??= sql
    .query(
      `CREATE TABLE IF NOT EXISTS game_saves (
         user_id TEXT PRIMARY KEY,
         data TEXT NOT NULL,
         played DOUBLE PRECISION NOT NULL DEFAULT 0,
         rev INTEGER NOT NULL DEFAULT 1,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined)
    .catch((err) => {
      globalRef.__gameSavesSchema__ = undefined;
      throw err;
    });
  return globalRef.__gameSavesSchema__;
}

async function open() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensure(sql);
  return sql;
}

/** A save as it is kept: the save itself, how long it has been played, which writing of it this is, and when. */
export type Stored = { data: string; played: number; rev: number; at: string };
/** What came of a write: it went in as a new revision, or the account had moved on and this is what it holds. */
export type Wrote = { ok: true; rev: number; at: string } | { ok: false; now: Stored };

type Row = { data: string; played: number; rev: number; updated_at: string | Date };
const stamp = (v: unknown) => new Date(v as string | Date).toISOString();
const stored = (r: Row): Stored => ({ data: r.data, played: Number(r.played) || 0, rev: Number(r.rev) || 1, at: stamp(r.updated_at) });

export async function readSave(userId: string): Promise<Stored | null> {
  const sql = await open();
  const rows = await sql.query<Row>(`SELECT data, played, rev, updated_at FROM game_saves WHERE user_id = $1`, [userId]);
  return rows[0] ? stored(rows[0]) : null;
}

/**
 * `base` is the revision the device last agreed with. The write only goes in on top of that
 * one, so a device that has not seen what another device saved cannot wipe it out. `null`
 * writes over whatever is there: the player has looked at both and picked this one.
 */
export async function writeSave(userId: string, data: string, played: number, base: number | null): Promise<Wrote> {
  const sql = await open();
  type Done = { rev: number; updated_at: string | Date };
  const done = (r: Done): Wrote => ({ ok: true, rev: Number(r.rev), at: stamp(r.updated_at) });
  if (base === null) {
    const rows = await sql.query<Done>(
      `INSERT INTO game_saves (user_id, data, played, rev, updated_at) VALUES ($1, $2, $3, 1, now())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, played = EXCLUDED.played, rev = game_saves.rev + 1, updated_at = now()
       RETURNING rev, updated_at`,
      [userId, data, played],
    );
    return done(rows[0]!);
  }
  const moved = await sql.query<Done>(`UPDATE game_saves SET data = $2, played = $3, rev = rev + 1, updated_at = now() WHERE user_id = $1 AND rev = $4 RETURNING rev, updated_at`, [userId, data, played, base]);
  if (moved[0]) return done(moved[0]);
  // Not that revision any more, or nothing there at all.
  const first = await sql.query<Done>(`INSERT INTO game_saves (user_id, data, played, rev, updated_at) VALUES ($1, $2, $3, 1, now()) ON CONFLICT (user_id) DO NOTHING RETURNING rev, updated_at`, [userId, data, played]);
  if (first[0]) return done(first[0]);
  const now = await readSave(userId);
  return now ? { ok: false, now } : writeSave(userId, data, played, null);
}
