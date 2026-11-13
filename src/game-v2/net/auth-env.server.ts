/**
 * Server only. The sign-in service reads its signing key from the environment when it is first
 * loaded, and without one it makes a new key for every copy of the server: a player signed in
 * on one copy would be a stranger to the next. On the hosted site there is always a database,
 * and its connection string is a secret only the server holds, so a key is worked out from
 * that: the same on every copy, never stored, never sent anywhere. A key set in the hosting
 * settings (`BETTER_AUTH_SECRET`) is used instead whenever there is one.
 *
 * This has to run before `@/lib/auth/server` is first imported, which is why that module is
 * only ever reached through `import()` after a call to this.
 */
import { createHash } from "node:crypto";

export function prepareAuthEnv() {
  const env = process.env;
  const db = env.DATABASE_URL?.trim();
  if (db && !env.BETTER_AUTH_SECRET?.trim()) env.BETTER_AUTH_SECRET = createHash("sha256").update(`sackreligious-memphis/auth/v1\n${db}`).digest("hex");
}

/** How sign-in is set up here, in words that give nothing away: for a check after a release. */
export function authSetup() {
  const env = process.env;
  const db = !!env.DATABASE_URL?.trim();
  const before = !!env.BETTER_AUTH_SECRET?.trim();
  prepareAuthEnv();
  return {
    database: db ? "hosted" : "embedded",
    signingKey: before ? "ready" : db ? "ready" : "temporary",
    address: env.BETTER_AUTH_URL?.trim() ? "set" : "from the request",
  };
}
