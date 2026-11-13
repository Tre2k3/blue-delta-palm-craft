import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { HudState, Progress } from "../core/types";
import type { Game } from "../game";
import { Sheet } from "./Menus";

const quiet = { onKeyDown: (e: KeyboardEvent) => e.stopPropagation(), onKeyUp: (e: KeyboardEvent) => e.stopPropagation() };
const field = "w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#39ff14]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/55">{label}</div>
      {children}
    </label>
  );
}

const time = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

function Pile({ id, title, p, onPick, busy }: { id: string; title: string; p: Progress; onPick: () => void; busy: boolean }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/5 p-4">
      <div className="sr-title text-xl text-white">{title}</div>
      <div className="mt-2 text-sm font-bold text-white/80">{time(p.minutes)} played</div>
      <div className="text-sm font-bold text-[#f4d77a]">${p.dollars.toLocaleString()}</div>
      <div className="text-sm font-bold text-[#39ff14]">{p.respect.toLocaleString()} Respect</div>
      <button data-account-keep={id} disabled={busy} className="sr-btn sr-btn-green mt-3 w-full py-2.5 disabled:opacity-40" onClick={onPick}>
        Keep this one
      </button>
    </div>
  );
}

/** Signing in, and what his account holds. */
export function AccountScreen({ game, hud }: { game: Game; hud: HudState }) {
  const a = hud.account;
  const acct = game.account;
  const [mode, setMode] = useState<"in" | "new">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [local, setLocal] = useState("");
  const close = () => game.close();

  if (a.choice)
    return (
      <Sheet title="Which progress do you keep?" sub="Your account and this device each have progress the other has not seen. Pick one; the other is replaced." onClose={close}>
        <div data-account-choice className="grid gap-3 sm:grid-cols-2">
          <Pile id="account" title="On your account" p={a.choice.account} busy={a.busy} onPick={() => void acct.keep("account")} />
          <Pile id="device" title="On this device" p={a.choice.device} busy={a.busy} onPick={() => void acct.keep("device")} />
        </div>
      </Sheet>
    );

  if (a.status === "in")
    return (
      <Sheet title="Your account" sub="Your progress is kept on your account as you play, and is there on any device you sign in on." onClose={close}>
        <div data-account-in className="rounded-xl border border-[#39ff14]/40 bg-[#39ff14]/8 p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#39ff14]">Signed in</div>
          <div data-account-name className="sr-title mt-1 text-2xl text-white">{a.name}</div>
          <div className="text-xs font-semibold text-white/60">{a.mail}</div>
          <div data-account-saved className="mt-3 text-sm font-bold text-white/85">
            {a.saved < 0 ? "Progress not sent to your account yet." : a.saved < 5 ? "Progress saved to your account just now." : `Progress saved to your account ${a.saved < 90 ? `${a.saved}s` : `${Math.round(a.saved / 60)}m`} ago.`}
          </div>
        </div>
        {a.note && <div className="mt-3 text-sm font-bold text-[#39ff14]">{a.note}</div>}
        {a.error && <div data-account-error className="mt-3 text-sm font-bold text-[#ff6b6b]">{a.error}</div>}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button data-primary data-account-save disabled={a.busy} className="sr-btn sr-btn-green px-5 py-2.5 disabled:opacity-40" onClick={() => void acct.saveNow()}>
            Save now
          </button>
          <button data-account-out disabled={a.busy} className="sr-btn sr-btn-ghost px-5 py-2.5 disabled:opacity-40" onClick={() => void acct.signOut()}>
            Sign out
          </button>
        </div>
        <div className="mt-3 text-xs text-white/45">Signing out leaves this device's copy of your progress where it is.</div>
      </Sheet>
    );

  if (a.status === "loading")
    return (
      <Sheet title="Your account" onClose={close}>
        <div className="py-6 text-center text-sm font-bold text-white/70">Checking who is signed in…</div>
      </Sheet>
    );

  if (a.status === "off" || (!a.email && !a.social.length))
    return (
      <Sheet title="Your account" onClose={close}>
        <div data-account-off className="py-4 text-sm font-semibold text-white/75">Accounts are not switched on here yet. Your progress is saved on this device.</div>
      </Sheet>
    );

  const submit = () => {
    setLocal("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setLocal("Put in your email address.");
    if (password.length < 8) return setLocal("The password needs at least 8 characters.");
    if (mode === "new") void acct.create(name, email, password);
    else void acct.signIn(email, password);
  };
  const shown = local || a.error;

  return (
    <Sheet title={mode === "new" ? "Create your account" : "Sign in"} sub="Your money, fits, rides, story and laser tag rank are kept on your account, so they are there on any phone or computer." onClose={close}>
      {a.email && (
        <form
          data-account-form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {(["in", "new"] as const).map((m) => (
              <button key={m} type="button" data-account-mode={m} className={`sr-btn py-2 text-sm ${mode === m ? "sr-btn-gold" : "sr-btn-ghost"}`} onClick={() => setMode(m)}>
                {m === "in" ? "I have an account" : "New account"}
              </button>
            ))}
          </div>
          {mode === "new" && (
            <Field label="Name">
              <input data-account-field="name" {...quiet} className={field} value={name} maxLength={24} autoComplete="nickname" placeholder="What Memphis calls you" onChange={(e) => setName(e.target.value)} />
            </Field>
          )}
          <Field label="Email">
            <input data-account-field="email" {...quiet} className={field} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input data-account-field="password" {...quiet} className={field} type="password" autoComplete={mode === "new" ? "new-password" : "current-password"} value={password} maxLength={128} placeholder={mode === "new" ? "At least 8 characters" : ""} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {shown && <div data-account-error className="text-sm font-bold text-[#ff6b6b]">{shown}</div>}
          <button data-primary data-account-submit type="submit" disabled={a.busy} className="sr-btn sr-btn-green py-3 text-base disabled:opacity-40">
            {a.busy ? "One moment…" : mode === "new" ? "Create account" : "Sign in"}
          </button>
          {mode === "new" && <div className="text-xs text-white/45">Keep the password somewhere safe: it cannot be reset by email yet.</div>}
        </form>
      )}
      {a.social.length > 0 && (
        <div className="mt-4 grid gap-2">
          {a.social.map((p) => (
            <button key={p.id} data-account-with={p.id} disabled={a.busy} className="sr-btn sr-btn-ghost py-2.5 disabled:opacity-40" onClick={() => void acct.with(p.id)}>
              Continue with {p.label}
            </button>
          ))}
          {!a.email && a.error && <div className="text-sm font-bold text-[#ff6b6b]">{a.error}</div>}
        </div>
      )}
    </Sheet>
  );
}
