import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { HudState } from "../core/types";
import type { Game } from "../game";
import { mailtoFor, sendOn, type Sent } from "../net/partner-mail";
import { PARTNER_EMAIL, SPOT_KINDS, partnerInbox, partnerMark, partnerSend, type Received, type SpotKind } from "../net/partners";
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

const nameOf = (k: SpotKind) => SPOT_KINDS.find((q) => q.id === k)?.name ?? "Something else";

function when(at: string) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** What has come in, for whoever owns the game. */
function Inbox({ asks, onMark, busy }: { asks: Received[]; onMark: (id: number, done: boolean) => void; busy: boolean }) {
  if (!asks.length) return <div data-partners-empty className="py-6 text-center text-sm font-bold text-white/65">Nothing has come in yet.</div>;
  return (
    <div data-partners-inbox className="grid gap-2.5">
      {asks.map((a) => (
        <div key={a.id} data-partners-ask={a.id} className={`rounded-xl border p-3.5 ${a.done ? "border-white/8 bg-white/3 opacity-60" : "border-[#39ff14]/35 bg-[#39ff14]/6"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <div className="sr-title text-xl text-white">{a.business || a.name}</div>
            <div className="text-[11px] font-semibold text-white/50">{when(a.at)}</div>
          </div>
          <div className="mt-0.5 text-[11px] font-black uppercase tracking-widest text-[#f4d77a]">
            {nameOf(a.kind)}
            {a.business ? `  ·  ${a.name}` : ""}
          </div>
          <div className="mt-2 select-text break-words text-sm font-extrabold text-[#39ff14]">{a.reach}</div>
          {a.note && <div className="mt-1.5 select-text whitespace-pre-wrap break-words text-sm font-semibold text-white/80">{a.note}</div>}
          <button disabled={busy} className="sr-btn sr-btn-ghost mt-3 !px-3 !py-1.5 text-xs disabled:opacity-40" onClick={() => onMark(a.id, !a.done)}>
            {a.done ? "Put back" : "Mark as handled"}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * "Get in the game": where a business, a food truck or an artist sees what can be put in the
 * city and asks for it. The request is kept on the server and emailed to whoever sells the
 * spots; where the email does not go, the sender is handed the same request written out as an
 * email of their own to send. An owner can also read the requests on this screen, signed in.
 */
export function PartnersScreen({ game, hud }: { game: Game; hud: HudState }) {
  const [kind, setKind] = useState<SpotKind>(game.partnerKind);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [reach, setReach] = useState("");
  const [note, setNote] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  // What the server kept, and whether it reached the inbox.
  const [kept, setKept] = useState<Sent | null>(null);
  const [mailed, setMailed] = useState(false);
  const [error, setError] = useState("");
  const [owner, setOwner] = useState(false);
  const [asks, setAsks] = useState<Received[]>([]);
  const [tab, setTab] = useState<"ask" | "inbox">("ask");
  const [busy, setBusy] = useState(false);
  const close = () => game.close();
  const signedIn = hud.account.status === "in";

  // Whoever owns the game sees what has come in. Everyone else is never told there is such a list.
  useEffect(() => {
    if (!signedIn) {
      setOwner(false);
      return;
    }
    let dead = false;
    partnerInbox()
      .then((r) => {
        if (dead) return;
        setOwner(r.owner);
        setAsks(r.asks);
      })
      .catch(() => {
        if (!dead) setOwner(false);
      });
    return () => {
      dead = true;
    };
  }, [signedIn]);

  const submit = async () => {
    setError("");
    if (name.trim().length < 2) return setError("Put in your name.");
    if (reach.trim().length < 5) return setError("Put in how to reach you: a phone number, an email or an @ name.");
    setState("sending");
    try {
      const r = await partnerSend({ data: { kind, name, business, reach, note, website: trap } });
      if (r.ok) {
        // Kept. Now on to the inbox: a request that does not get there is offered as an email to send.
        const went = await sendOn(r.relay, r.ask);
        setKept(r.ask);
        setMailed(went);
        setState("sent");
        game.sound.ui();
      } else {
        setState("form");
        setError(r.why || "That could not be sent. Try again.");
      }
    } catch {
      setState("form");
      setError("That could not be sent. Check your connection and try again.");
    }
  };

  const mark = async (id: number, done: boolean) => {
    setBusy(true);
    try {
      const r = await partnerMark({ data: { id, done } });
      if (r.ok) setAsks((all) => all.map((a) => (a.id === id ? { ...a, done } : a)));
    } catch {
      /* left as it was */
    }
    setBusy(false);
  };

  const waiting = asks.filter((a) => !a.done).length;
  // The same request as an email from the sender's own mail app: whatever is filled in so far, or what was kept.
  const mailto = mailtoFor(kept ?? { kind, name, business, reach, note });

  return (
    <Sheet title="Get in the game" sub="Put your business, your food truck or your music in SackReligious · Memphis 901. Spots are open now." onClose={close} wide>
      {owner && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button data-partners-tab="ask" className={`sr-btn py-2 text-sm ${tab === "ask" ? "sr-btn-gold" : "sr-btn-ghost"}`} onClick={() => setTab("ask")}>
            The asking screen
          </button>
          <button data-partners-tab="inbox" className={`sr-btn py-2 text-sm ${tab === "inbox" ? "sr-btn-gold" : "sr-btn-ghost"}`} onClick={() => setTab("inbox")}>
            Requests{waiting ? `  ·  ${waiting} new` : ""}
          </button>
        </div>
      )}
      {owner && tab === "inbox" ? (
        <Inbox asks={asks} onMark={(id, done) => void mark(id, done)} busy={busy} />
      ) : state === "sent" ? (
        mailed ? (
          <div data-partners-sent="mailed" className="py-8 text-center">
            <div className="sr-title text-4xl text-[#39ff14]">Request sent</div>
            <div className="mx-auto mt-2 max-w-md text-sm font-semibold text-white/80">It is in our inbox. Somebody from the game will reach out to you at {reach.trim()} about what is open and what it costs.</div>
            <div className="mx-auto mt-3 max-w-md text-sm font-semibold text-white/65">
              You can also write to{" "}
              <a data-partners-mail href={mailto} className="select-text font-extrabold text-[#39ff14] underline">
                {PARTNER_EMAIL}
              </a>
            </div>
            <button data-primary className="sr-btn sr-btn-green mt-6 px-8 py-3" onClick={close}>
              Back to Memphis
            </button>
          </div>
        ) : (
          <div data-partners-sent="kept" className="py-3 text-center">
            <div className="sr-title text-3xl text-[#f4d77a]">One more step</div>
            <div className="mx-auto mt-1.5 max-w-md text-sm font-semibold text-white/80">Your request is written out and ready. Send it to our inbox from your own email and somebody from the game will reach out to you at {reach.trim()}.</div>
            {/* Side by side, so the whole of it is on a phone held sideways without scrolling. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <a data-primary data-partners-mail href={mailto} className="sr-btn sr-btn-green px-7 py-3">
                Email it to us
              </a>
              <button data-partners-back className="sr-btn sr-btn-ghost px-6 py-3" onClick={close}>
                Back to Memphis
              </button>
            </div>
            <div className="mx-auto mt-3 max-w-md select-text text-sm font-semibold text-white/65">
              It goes to <span className="font-extrabold text-[#39ff14]">{PARTNER_EMAIL}</span>
            </div>
          </div>
        )
      ) : (
        <div className="grid gap-5 md:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/55">What do you want in the game?</div>
            <div data-partners-kinds className="grid gap-2">
              {SPOT_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  data-partners-kind={k.id}
                  aria-pressed={kind === k.id}
                  className={`rounded-xl border px-3.5 py-2.5 text-left transition ${kind === k.id ? "border-[#39ff14] bg-[#39ff14]/12" : "border-white/12 bg-white/5 hover:border-white/30"}`}
                  onClick={() => setKind(k.id)}
                >
                  <div className={`sr-title text-xl ${kind === k.id ? "text-[#39ff14]" : "text-white"}`}>{k.name}</div>
                  <div className="text-xs font-semibold text-white/65">{k.line}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs font-semibold text-white/50">The game is free to play on phones, tablets and computers at play.10letters.store. Three signs in the city show spots that are open: at the end of the food truck row, on the plaza, and by the Beale stage.</div>
          </div>
          <form
            data-partners-form
            className="grid content-start gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Field label="Your name">
              <input data-partners-field="name" {...quiet} className={field} value={name} maxLength={60} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Business or artist name">
              <input data-partners-field="business" {...quiet} className={field} value={business} maxLength={80} autoComplete="organization" placeholder="If you have one" onChange={(e) => setBusiness(e.target.value)} />
            </Field>
            <Field label="How to reach you">
              <input data-partners-field="reach" {...quiet} className={field} value={reach} maxLength={120} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Phone, email or @ name" onChange={(e) => setReach(e.target.value)} />
            </Field>
            <Field label="Anything else">
              <textarea data-partners-field="note" {...quiet} className={`${field} min-h-[84px] resize-none`} value={note} maxLength={600} placeholder="What you have in mind" onChange={(e) => setNote(e.target.value)} />
            </Field>
            {/* Not for people: left empty by anyone using the screen. */}
            <input tabIndex={-1} aria-hidden autoComplete="off" className="hidden" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} />
            {error && (
              <div data-partners-error className="text-sm font-bold text-[#ff6b6b]">
                {error}
              </div>
            )}
            <button data-primary data-partners-send type="submit" disabled={state === "sending"} className="sr-btn sr-btn-green py-3 text-base disabled:opacity-40">
              {state === "sending" ? "Sending…" : "Send the request"}
            </button>
            <div className="text-sm font-semibold text-white/75">
              Or email{" "}
              <a data-partners-mail href={mailto} className="select-text font-extrabold text-[#39ff14] underline">
                {PARTNER_EMAIL}
              </a>
            </div>
            <div className="text-xs text-white/45">What you put here is emailed to us and only used to get back to you about your request.</div>
          </form>
        </div>
      )}
    </Sheet>
  );
}
