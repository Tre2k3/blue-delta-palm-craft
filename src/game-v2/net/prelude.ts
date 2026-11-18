import { SAVE_KEY, SYNC_KEY, signature } from "../core/keys";

type Stored = { data: string; played: number; rev: number; at: string };
type Synced = { user: string; rev: number; sig: string };
export type Prelude = { user: { id: string; name?: string | null; email?: string | null }; stored: Stored | null };

let found: Prelude | null = null;

/** What was learned before the game started, if the device is tied to an account and it answered in time. */
export const preluded = () => found;

async function look() {
  let was: Synced | null = null;
  try {
    was = JSON.parse(localStorage.getItem(SYNC_KEY) ?? "null") as Synced | null;
  } catch {
    return;
  }
  // A device that has never signed in asks nobody anything.
  if (!was?.user) return;
  const lib = await import("@/lib/auth/client");
  if (!lib.authEnabled) return;
  const session = await lib.authClient.getSession();
  const user = session.data?.user;
  if (!user || user.id !== was.user) return;
  const { cloudLoad } = await import("./cloud");
  const stored = await cloudLoad();
  if (stored && stored.rev !== was.rev) {
    const mine = localStorage.getItem(SAVE_KEY);
    let here = "";
    let theirs = "";
    try {
      here = signature(JSON.parse(mine ?? "null"));
      theirs = signature(JSON.parse(stored.data));
    } catch {
      /* nothing readable here: the account's is the only one */
    }
    // Another device has saved since, and nothing has been earned on this one in the meantime: take it.
    if (theirs && (!here || here === was.sig)) {
      if (mine) localStorage.setItem(`${SAVE_KEY}.before`, mine);
      localStorage.setItem(SAVE_KEY, stored.data);
      localStorage.setItem(SYNC_KEY, JSON.stringify({ user: user.id, rev: stored.rev, sig: theirs } satisfies Synced));
    }
  }
  found = { user, stored };
}

/**
 * Before the game starts, on a device that has been signed in before: ask the account for its
 * progress, and if another device has moved it on while this one sat still, put that on the
 * device. The game reads its save as it starts, so this is the one moment it can be swapped
 * with nothing to redo. It waits a few seconds at most; without an answer the game starts
 * with what the device has.
 */
export function prelude(wait = 4000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return Promise.race([look().catch(() => undefined), new Promise<void>((r) => setTimeout(r, wait))]);
}
