import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { SAVE_KEY, SYNC_KEY, signature } from "../core/keys";
import type { AccountHud, Progress, Save } from "../core/types";
import type { Game } from "../game";
import { cloudLoad, cloudStore } from "./cloud";
import { preluded } from "./prelude";

type Lib = typeof import("@/lib/auth/client");
type Stored = { data: string; played: number; rev: number; at: string };

/** What this device last agreed with the account: whose account, which revision of it, and a mark of the progress it held. */
type Synced = { user: string; rev: number; sig: string };

/** Set once this tab has started itself again to take the account's progress: it does that once, not in a loop. */
const TOOK_KEY = "sack-v2-took";
/** Under this much play a save is a fresh start, not progress worth asking about. */
const FRESH = 90;

function progress(s: { played?: number; dollars?: number; respect?: number }): Progress {
  return { minutes: Math.round((s.played ?? 0) / 60), dollars: Math.round(s.dollars ?? 0), respect: Math.round(s.respect ?? 0) };
}

/** What the sign-in service said, in words for the player. */
function say(err: { code?: string; message?: string; status?: number } | null | undefined) {
  const code = err?.code ?? "";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "There is already an account with that email. Sign in instead.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password do not match an account.";
  if (code === "INVALID_EMAIL") return "That does not look like an email address.";
  if (code === "PASSWORD_TOO_SHORT") return "The password needs at least 8 characters.";
  if (code === "PASSWORD_TOO_LONG") return "That password is too long.";
  if (err?.status === 429) return "Too many tries. Give it a minute.";
  return err?.message || "Could not reach the sign-in service. Try again.";
}

/**
 * Signing in, and keeping progress on the account. The game still saves to the device as it
 * always did; signed in, the same save also goes to the account, so it is there on any device
 * he signs in on. Nothing is merged: where the account and the device each hold progress the
 * other has not seen, he is shown both and picks.
 */
export class Account {
  private lib: Lib | null = null;
  private status: AccountHud["status"] = "loading";
  private id = "";
  private name = "";
  private mail = "";
  private busy = false;
  private error = "";
  private note = "";
  private choice: { stored: Stored; account: Progress; device: Progress } | null = null;
  /** Progress on the device the account has not been sent yet. */
  private dirty = false;
  private clock = 0;
  private sending = false;
  private savedAt = 0;
  /** The account and the device have compared notes this session; until they have, nothing is sent. */
  private settled = false;
  private meeting = false;
  /** The page is about to start again with the account's progress: nothing more is sent from this one. */
  private leaving = false;

  private key = SAVE_KEY;

  constructor(private game: Game) {
    if (typeof window === "undefined") return;
    void this.begin();
    const flush = () => {
      if (document.visibilityState === "hidden") void this.store();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", () => void this.store());
  }

  private push() {
    this.game.push();
  }

  /** Ways to sign in other than a password: only where the service that runs them answers. */
  private get social() {
    if (!this.lib?.authEnabled || typeof location === "undefined" || !location.hostname.endsWith(".grok-sandbox.com")) return [];
    return this.lib.GROK_PROVIDERS.map((p) => ({ id: p.providerId, label: p.label }));
  }

  private async begin() {
    try {
      this.lib = await import("@/lib/auth/client");
      if (!this.lib.authEnabled) {
        this.status = "off";
        return this.push();
      }
      // Asked already, before the game started: the account's newest progress is on the device if it was wanted.
      const pre = preluded();
      if (pre) {
        this.signedIn(pre.user);
        this.settled = true;
        await this.reconcile(pre.stored, false);
        return this.push();
      }
      const res = await this.lib.authClient.getSession();
      const user = res.data?.user;
      if (!user) {
        this.status = "out";
        return this.push();
      }
      this.signedIn(user);
      let took = false;
      try {
        took = sessionStorage.getItem(TOOK_KEY) === "1";
      } catch {
        /* no session storage: assume not */
      }
      await this.meet(!took);
    } catch {
      this.status = "out";
    }
    this.push();
  }

  private signedIn(user: { id: string; name?: string | null; email?: string | null }) {
    this.status = "in";
    this.id = user.id;
    this.mail = user.email ?? "";
    this.name = user.name || this.mail.split("@")[0] || "Player";
  }

  private synced(): Synced | null {
    try {
      const v = JSON.parse(localStorage.getItem(SYNC_KEY) ?? "null") as Synced | null;
      return v && v.user === this.id ? v : null;
    } catch {
      return null;
    }
  }

  private mark(rev: number, sig: string) {
    this.savedAt = Date.now();
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify({ user: this.id, rev, sig } satisfies Synced));
    } catch {
      /* private mode */
    }
  }

  /**
   * The account and the device compare notes. Whichever side has moved since they last agreed
   * is the one that is kept; if both have, he is asked.
   */
  private async meet(mayTake = true) {
    if (this.meeting) return;
    this.meeting = true;
    this.clock = 0;
    let stored: Stored | null;
    try {
      stored = await cloudLoad();
    } catch {
      this.note = "Signed in, but your saved progress could not be reached. It will be tried again.";
      this.meeting = false;
      return;
    }
    this.meeting = false;
    this.settled = true;
    if (this.note.startsWith("Signed in, but")) this.note = "";
    await this.reconcile(stored, mayTake);
  }

  /**
   * `mayTake`: the page may start again with the account's progress. That is for the moment of
   * signing in. A page that is only starting up never does it more than once; if the account
   * has moved on yet again, this device finds out when it next saves, and he is asked then.
   */
  private async reconcile(stored: Stored | null, mayTake: boolean) {
    const local = this.game.save;
    if (!stored) {
      await this.store(true);
      if (!this.error) this.note = "This device's progress is now on your account.";
      return;
    }
    const was = this.synced();
    // Something earned here since they last agreed; on a device new to the account, any real play at all.
    const here = was ? signature(local) !== was.sig : local.played > FRESH;
    const there = was ? stored.rev !== was.rev : true;
    if (!there) {
      if (here) await this.store(true);
      else this.savedAt = Date.parse(stored.at) || Date.now();
      return;
    }
    if (!here) {
      if (mayTake) this.take(stored);
      return;
    }
    this.ask(stored);
    this.game.open("account");
  }

  /** Both sides have progress the other has not seen. Nothing more is sent until he has picked. */
  private ask(stored: Stored) {
    let theirs: Partial<Save> = {};
    try {
      theirs = JSON.parse(stored.data) as Partial<Save>;
    } catch {
      /* shown as empty */
    }
    this.choice = { stored, account: progress(theirs), device: progress(this.game.save) };
  }

  /** The account's progress replaces what is on this device. What was here is kept aside, once. */
  private take(stored: Stored) {
    try {
      const mine = localStorage.getItem(this.key);
      if (mine) localStorage.setItem(`${this.key}.before`, mine);
      localStorage.setItem(this.key, stored.data);
      this.mark(stored.rev, signature(JSON.parse(stored.data)));
    } catch {
      this.error = "This browser would not store your progress.";
      return;
    }
    // The game reads its save when it starts, so it starts again with the account's.
    this.leaving = true;
    this.game.adopted = true;
    try {
      sessionStorage.setItem(TOOK_KEY, "1");
    } catch {
      /* it still starts again; the guard is only against doing it twice */
    }
    location.reload();
  }

  /**
   * Send the device's progress to the account. It goes in on top of the revision this device
   * last saw; `over` puts it over whatever is there, once he has said that is what he wants.
   */
  private async store(force = false, over = false) {
    if (this.status !== "in" || this.sending || this.choice || this.leaving || !this.settled || (!force && !this.dirty)) return;
    const save = this.game.save;
    const sig = signature(save);
    this.dirty = false;
    // Only standing about since the last time: nothing to send, and nothing for another device to fetch.
    if (!force && sig === this.synced()?.sig) return;
    this.sending = true;
    try {
      const done = await cloudStore({ data: { data: JSON.stringify(save), base: over ? null : (this.synced()?.rev ?? null) } });
      if (done.ok) {
        this.mark(done.rev, sig);
        if (this.error.startsWith("Your progress")) this.error = "";
      } else {
        // Another device saved to the account since this one last looked.
        this.ask(done.now);
        this.game.toast("Your account has newer progress from another device. Open Account in the pause menu to pick which to keep.", 8);
      }
    } catch {
      this.dirty = true;
      this.error = "Your progress could not be sent to your account. It is still saved on this device.";
    }
    this.sending = false;
    this.clock = 0;
    this.push();
  }

  /** The game has just saved to the device. */
  touch() {
    this.dirty = true;
  }

  update(dt: number) {
    if (this.status !== "in") return;
    this.clock += dt;
    // The account could not be reached when he signed in: ask again before anything is sent.
    if (!this.settled) {
      if (!this.choice && this.clock > 30) void this.meet(false).then(() => this.push());
    } else if (this.dirty && this.clock > 25) void this.store();
  }

  private async enter(run: (lib: Lib) => Promise<{ data: unknown; error: { code?: string; message?: string; status?: number } | null }>) {
    if (!this.lib || this.busy) return;
    this.busy = true;
    this.error = "";
    this.note = "";
    this.push();
    try {
      const res = await run(this.lib);
      if (res.error) this.error = say(res.error);
      else {
        const s = await this.lib.authClient.getSession();
        const user = s.data?.user;
        if (user) {
          this.signedIn(user);
          await this.meet();
        } else this.error = "Signed in, but the session did not hold. Check that this browser allows cookies for this site.";
      }
    } catch {
      this.error = "Could not reach the sign-in service. Try again.";
    }
    this.busy = false;
    this.push();
  }

  create(name: string, email: string, password: string) {
    const who = name.trim().slice(0, 24) || email.split("@")[0] || "Player";
    return this.enter((lib) => lib.authClient.signUp.email({ name: who, email: email.trim(), password }));
  }

  signIn(email: string, password: string) {
    return this.enter((lib) => lib.authClient.signIn.email({ email: email.trim(), password }));
  }

  /** Google or X, where they are offered. The page comes back signed in. */
  async with(provider: string) {
    if (!this.lib || this.busy) return;
    this.busy = true;
    this.error = "";
    this.push();
    try {
      await this.lib.signIn(provider, { callbackURL: location.pathname + location.search });
      const s = await this.lib.authClient.getSession();
      if (s.data?.user) {
        this.signedIn(s.data.user);
        await this.meet();
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Sign-in did not finish.";
    }
    this.busy = false;
    this.push();
  }

  /** He picked which progress to keep. */
  async keep(which: "account" | "device") {
    const c = this.choice;
    if (!c) return;
    this.choice = null;
    if (which === "account") return this.take(c.stored);
    await this.store(true, true);
    this.note = "This device's progress is now on your account.";
    this.push();
  }

  /** Progress goes to the account first; then the device is signed out. It keeps its own copy. */
  async signOut() {
    if (!this.lib || this.busy) return;
    this.busy = true;
    this.push();
    this.game.persist();
    await this.store(true);
    try {
      localStorage.removeItem(SYNC_KEY);
    } catch {
      /* private mode */
    }
    await this.lib.signOut(location.pathname + location.search);
  }

  /** Send it now, from the account screen. */
  async saveNow() {
    this.game.persist();
    // Still comparing notes with the account: finish that first.
    if (!this.settled && !this.choice) await this.meet(false);
    await this.store(true);
  }

  /** The account and this device have compared notes (or nobody is signed in): for tests. */
  get ready() {
    return this.status === "out" || this.status === "off" || (this.status === "in" && (this.settled || !!this.choice));
  }

  hud(): AccountHud {
    return {
      status: this.status,
      email: emailAndPasswordEnabled,
      social: this.social,
      name: this.name,
      mail: this.mail,
      busy: this.busy,
      error: this.error,
      note: this.note,
      saved: this.savedAt ? Math.max(0, Math.round((Date.now() - this.savedAt) / 1000)) : -1,
      choice: this.choice ? { account: this.choice.account, device: this.choice.device } : null,
    };
  }
}
