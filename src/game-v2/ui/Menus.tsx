import { useEffect, useRef, useState, type ReactNode } from "react";
import { OUTFITS, type OutfitId } from "../assets/cast";
import type { HudState, TableId } from "../core/types";
import type { Game } from "../game";
import { REACTIONS } from "../net/crew";
import { TABLES } from "../play/tables";
import { CATALOG, productById } from "../play/catalog";
import { RIDES } from "../play/garage";
import { FOOD, FOOD_TRUCKS, PRIZES } from "../play/goods";
import { buyReal, openStore } from "../play/store";
import { POIS } from "../world/map";
import { drawMap } from "./map";

export function Sheet({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-2 sm:p-5">
      <div className={`sr-panel sr-pop flex max-h-full w-full flex-col ${wide ? "max-w-[1080px]" : "max-w-[620px]"}`}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <div className="sr-title text-2xl text-white sm:text-3xl">{title}</div>
            {sub && <div className="mt-1 text-xs text-white/60 sm:text-sm">{sub}</div>}
          </div>
          <button className="sr-btn sr-btn-ghost shrink-0 !px-3 !py-2" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        <div data-menu-body className="sr-scroll min-h-0 flex-1 p-3 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- title

export function Title({ game, hud }: { game: Game; hud: HudState }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // Not while a screen is open over the title: Enter there belongs to its form.
      if (hud.overlay) return;
      if (e.code === "Enter" || e.code === "Space") game.play(!hud.hasSave);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game, hud.hasSave, hud.overlay]);
  const acct = hud.account;
  const canSignIn = acct.status === "in" || (acct.status === "out" && (acct.email || acct.social.length > 0));
  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-30 flex flex-col justify-end" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.82) 100%)" }}>
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-8 sm:px-10 sm:pb-12">
        <div className="sr-rise max-w-[400px]">
          <div className="sr-script sr-neon text-4xl sm:text-5xl">$ackReligious</div>
          <div className="sr-title mt-1 text-4xl text-[#f4d77a] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-6xl">Memphis</div>
          <p className="mt-3 max-w-md text-sm font-semibold text-white/85 drop-shadow sm:text-base">
            Run the Drop Day. Hoop on the river, bowl, fish the Mississippi, race downtown, and win big at the Fun House. Every piece in the boutique is real.
          </p>
          {hud.crew.waiting && (
            <div data-crew-waiting className="sr-pop mt-4 inline-flex items-center gap-2.5 rounded-xl border border-[#39ff14]/50 bg-black/70 px-3.5 py-2 text-sm font-extrabold text-white">
              <span className="sr-pulse h-2.5 w-2.5 rounded-full bg-[#39ff14]" />
              Your crew is waiting
              <span className="sr-title text-lg tracking-[0.2em] text-[#39ff14]">{hud.crew.waiting}</span>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {hud.hasSave && (
              <button data-primary className="sr-btn sr-btn-green px-8 py-3 text-lg" onClick={() => game.play(false)}>
                Continue
              </button>
            )}
            <button data-primary={hud.hasSave ? undefined : true} className={`sr-btn px-8 py-3 text-lg ${hud.hasSave ? "sr-btn-ghost" : "sr-btn-green"}`} onClick={() => game.play(true)}>
              {hud.hasSave ? "New game" : "Play"}
            </button>
            <button
              className="sr-btn sr-btn-gold px-6 py-3"
              onClick={() => {
                game.persist();
                openStore();
              }}
            >
              Shop the real store
            </button>
            {canSignIn && (
              <button data-account-open className="sr-btn sr-btn-ghost px-6 py-3" onClick={() => game.open("account")}>
                {acct.status === "in" ? `Signed in: ${acct.name}` : "Sign in"}
              </button>
            )}
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/45">{hud.pad ? "Gamepad ready: press A" : "Keyboard, gamepad or touch"}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- album

function Shelf({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-1">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-white/10 pb-1.5">
        <div className="sr-title text-xl text-[#f4d77a]">{title}</div>
        <div className="text-[11px] font-semibold text-white/55">{note}</div>
      </div>
      {children}
    </div>
  );
}

/** Everything collected: the postcards, the fish book and the names Memphis has given him. */
export function Album({ game, hud }: { game: Game; hud: HudState }) {
  const a = hud.album;
  if (!a) return null;
  const cards = a.postcards.filter((c) => c.got).length;
  const kinds = a.fish.filter((f) => f.best > 0).length;
  const names = a.ranks.filter((r) => r.got).length;
  return (
    <Sheet title="Album" sub="Postcards, the fish book and your names in Memphis." onClose={() => game.open("pause")} wide>
      <Shelf title="Postcards" note={`${cards} of ${a.postcards.length}  ·  take a picture in photo mode at each spot`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {a.postcards.map((c) => (
            <div key={c.id} data-card={c.id} data-got={c.got ? "1" : "0"}>
              <div className={`relative aspect-[3/2] overflow-hidden rounded-md border-4 ${c.got ? "border-white shadow-lg" : "border-white/15"}`}>
                <img src={c.img} alt="" draggable={false} loading="lazy" className={`h-full w-full object-cover ${c.got ? "" : "scale-110 opacity-30 blur-[7px] grayscale"}`} />
                {!c.got && <div className="sr-title absolute inset-0 flex items-center justify-center text-4xl text-white/70">?</div>}
              </div>
              <div className="mt-1.5 text-sm font-extrabold text-white">{c.name}</div>
              <div className="text-[11px] text-white/55">{c.got ? "Collected" : `Photo mode, ${c.hint}`}</div>
            </div>
          ))}
        </div>
      </Shelf>
      <Shelf title="Fish book" note={`${kinds} of ${a.fish.length}  ·  the heaviest you have landed of each`}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {a.fish.map((f) => (
            <div key={f.id} data-fish={f.id} data-got={f.best > 0 ? "1" : "0"} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-center">
              <div className="flex h-20 items-center justify-center">
                <img src={f.img} alt="" draggable={false} loading="lazy" className={`max-h-full max-w-full object-contain ${f.best > 0 ? "drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" : "opacity-45 brightness-0"}`} />
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-widest" style={{ color: f.best > 0 ? f.color : "rgba(255,255,255,0.4)" }}>
                {f.rarity}
              </div>
              <div className="text-sm font-extrabold text-white">{f.best > 0 ? f.name : "???"}</div>
              <div className="text-[11px] text-white/55">{f.best > 0 ? `Best ${f.best} lb` : "Not landed yet"}</div>
            </div>
          ))}
        </div>
      </Shelf>
      <Shelf title="Your name in Memphis" note={`${names} of ${a.ranks.length}  ·  every name makes every job pay more`}>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {a.ranks.map((r) => (
            <div key={r.name} data-rank={r.at} data-got={r.got ? "1" : "0"} className="text-center">
              <img src={r.badge} alt="" draggable={false} loading="lazy" className={`mx-auto h-16 w-16 sm:h-20 sm:w-20 ${r.got ? "drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" : "opacity-30 grayscale"}`} />
              <div className={`mt-1 text-[11px] font-extrabold leading-tight ${r.got ? "text-white" : "text-white/45"}`}>{r.name}</div>
              <div className="text-[10px] text-white/45">{r.got ? "Earned" : `${r.at} Respect`}</div>
            </div>
          ))}
        </div>
      </Shelf>
    </Sheet>
  );
}

// ---------------------------------------------------------------- pause

function Seg<T extends string>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/15">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onPick(v)} className={`px-3 py-2 text-xs font-extrabold uppercase tracking-wide ${v === value ? "bg-[#39ff14] text-[#06140a]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 py-3">
      <div className="text-sm font-bold text-white/85">{label}</div>
      {children}
    </div>
  );
}

export function Pause({ game, hud }: { game: Game; hud: HudState }) {
  const s = hud.settings;
  return (
    <Sheet title="Paused" sub="Your day is saved as you go." onClose={() => game.close()}>
      <button data-primary className="sr-btn sr-btn-green mb-3 w-full py-3 text-lg" onClick={() => game.close()}>
        Back to Memphis
      </button>
      {(hud.mode === "walk" || hud.mode === "drive") && (
        <button className="sr-btn sr-btn-ghost mb-3 w-full py-2.5" onClick={() => game.openPhoto()}>
          Photo mode
        </button>
      )}
      {(hud.mode === "walk" || hud.mode === "drive") && hud.place === "street" && (
        <button className="sr-btn sr-btn-ghost mb-3 w-full py-2.5" onClick={() => game.openGarage()}>
          Garage: pick your ride
        </button>
      )}
      {hud.mode !== "title" && (
        <button data-crew-open className="sr-btn sr-btn-ghost mb-3 w-full py-2.5" onClick={() => game.open("online")}>
          {hud.crew.code ? `Your crew  ·  ${hud.crew.code}` : "Play with friends"}
        </button>
      )}
      {(hud.account.status === "in" || (hud.account.status === "out" && (hud.account.email || hud.account.social.length > 0))) && (
        <button data-account-open className="sr-btn sr-btn-ghost mb-3 w-full py-2.5" onClick={() => game.open("account")}>
          {hud.account.status === "in" ? `Account  ·  ${hud.account.name}` : "Sign in to keep your progress on any device"}
        </button>
      )}
      <Row label="Today's drop">
        <div className="text-right">
          <div className="text-sm font-extrabold" style={{ color: hud.daily.done ? "#39ff14" : "#f4d77a" }}>
            {hud.daily.title}
            {hud.daily.done ? "  ·  done" : `  ·  $${hud.daily.pay}`}
          </div>
          <div className="text-[11px] text-white/55">
            {hud.daily.done ? "A new one tomorrow." : hud.daily.detail}
            {hud.daily.streak > 0 ? `  ·  ${hud.daily.streak} ${hud.daily.streak === 1 ? "day" : "days"} running` : ""}
          </div>
        </div>
      </Row>
      <Row label="Postcards">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-extrabold text-[#f4d77a]">
              {hud.postcards.got} of {hud.postcards.total}
            </div>
            <div className="text-[11px] text-white/55">{hud.postcards.next ? `Photo mode. Next: ${hud.postcards.next}.` : "The whole set."}</div>
          </div>
          <button data-album className="sr-btn sr-btn-gold shrink-0 px-3 py-2 text-xs" onClick={() => game.openAlbum()}>
            Album
          </button>
        </div>
      </Row>
      <Row label="Your name in Memphis">
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-sm font-extrabold text-[#f4d77a]">{hud.rank.name}</div>
            <div className="text-[11px] text-white/55">{hud.rank.next === null ? "Top of the city." : `${hud.respect} Respect · next name at ${hud.rank.next}`}{hud.rank.index > 0 ? `  ·  jobs pay +${hud.rank.index * 4}%` : ""}</div>
          </div>
          <img src={hud.rank.badge} alt="" draggable={false} className="h-11 w-11 shrink-0" />
        </div>
      </Row>
      <Row label="Graphics">
        <Seg
          value={s.auto ? "auto" : s.quality}
          options={[
            ["auto", "Auto"],
            ["low", "Fast"],
            ["medium", "Balanced"],
            ["high", "Best"],
          ]}
          onPick={(q) => game.setQuality(q)}
        />
      </Row>
      <Row label="Time of day">
        <Seg
          value={s.clock ? "auto" : hud.phase}
          options={[
            ["auto", "Cycle"],
            ["golden", "Sunset"],
            ["night", "Night"],
            ["day", "Day"],
          ]}
          onPick={(p) => game.setPhase(p)}
        />
      </Row>
      <Row label="Music">
        <Seg
          value={s.music ? "on" : "off"}
          options={[
            ["on", "On"],
            ["off", "Off"],
          ]}
          onPick={(v) => game.setMusic(v === "on")}
        />
      </Row>
      <Row label="Sound">
        <Seg
          value={s.sfx ? "on" : "off"}
          options={[
            ["on", "On"],
            ["off", "Off"],
          ]}
          onPick={(v) => game.setSfx(v === "on")}
        />
      </Row>
      {hud.touch && (
        <Row label="Vibration">
          <Seg
            value={s.buzz ? "on" : "off"}
            options={[
              ["on", "On"],
              ["off", "Off"],
            ]}
            onPick={(v) => game.setBuzz(v === "on")}
          />
        </Row>
      )}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-white/70">
        {(hud.pad
          ? ([
              ["L stick", "Move, steer, aim"],
              ["R stick", "Look around"],
              ["A", "Interact, and the action in any game"],
              ["X  RT", "Shoot, cast, swing, handbrake"],
              ["RT  LT", "Gas and brake in a car"],
              ["RB", "Run, nitro"],
              ["B", "Leave an activity, close a menu"],
              ["Y", "Map and taxi"],
              ["View", "Change the camera view: standard, close, wide"],
              ["R3", "Change time of day"],
              ["Start", "Pause"],
            ] as const)
          : ([
              ["W A S D", "Move, steer"],
              ["Shift", "Run, nitro"],
              ["E", "Interact"],
              ["Space", "Shoot, cast, bowl, handbrake"],
              ["M", "Map and taxi"],
              ["C", "Change the camera view"],
              ["N", "Change time of day"],
              ["Q", "Leave an activity"],
              ["Esc", "Pause"],
            ] as const)
        ).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="sr-key">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="sr-btn sr-btn-ghost" onClick={() => game.unstick()}>
          I'm stuck: back to the plaza
        </button>
        <button
          className="sr-btn sr-btn-gold"
          onClick={() => {
            game.persist();
            openStore();
          }}
        >
          Shop the real store
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- crew

const LINK_TONE = { connected: "#39ff14", connecting: "#f4d77a", failed: "#ff6b6b" } as const;
const CREW_GAMES: TableId[] = ["chess", "checkers", "connect4", "tictactoe"];

/** Playing with friends: start a crew or join one, see who is in it and where, and ask them for a game. */
export function CrewScreen({ game, hud }: { game: Game; hud: HudState }) {
  const c = hud.crew;
  const [name, setName] = useState(c.name);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState("");
  useEffect(() => setName(c.name), [c.name]);
  const saveName = () => game.crew.rename(name);
  const share = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    const text = `Come play SackReligious Memphis with me. Crew code ${c.code}.`;
    // A phone hands the link to whatever it shares with; anything else puts it on the clipboard.
    if (hud.touch && navigator.share) void navigator.share({ title: "SackReligious Memphis", text, url: c.invite }).catch(() => {});
    else void navigator.clipboard?.writeText(c.invite).then(done, () => {});
  };
  const nameRow = (
    <Row label="Your name">
      <input
        data-crew-name
        value={name}
        maxLength={14}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onKeyUp={(e) => e.stopPropagation()}
        className="w-40 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-right text-sm font-extrabold text-white outline-none focus:border-[#39ff14]"
      />
    </Row>
  );
  if (!c.code)
    return (
      <Sheet title="Play with friends" sub="Start a crew, send your friends the four letters, and they show up in your Memphis." onClose={() => game.close()}>
        {nameRow}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#39ff14]/35 bg-[#39ff14]/5 p-4">
            <div className="sr-title text-xl text-[#39ff14]">Start a crew</div>
            <div className="mt-1 text-xs text-white/70">You get a code to hand out. Up to {c.max} of you.</div>
            <button data-primary data-crew-host className="sr-btn sr-btn-green mt-3 w-full py-2.5" onClick={() => game.crew.host()}>
              Start a crew
            </button>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="sr-title text-xl text-white">Join a crew</div>
            <div className="mt-1 text-xs text-white/70">Type the four letters a friend sent you.</div>
            <div className="mt-3 flex gap-2">
              <input
                data-crew-code
                value={code}
                maxLength={4}
                placeholder="ABCD"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") game.crew.join(code);
                }}
                onKeyUp={(e) => e.stopPropagation()}
                className="sr-title w-full min-w-0 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-center text-2xl tracking-[0.35em] text-white outline-none placeholder:text-white/20 focus:border-[#39ff14]"
              />
              <button data-crew-join disabled={code.length !== 4} className="sr-btn sr-btn-gold shrink-0 px-4 disabled:opacity-40" onClick={() => game.crew.join(code)}>
                Join
              </button>
            </div>
          </div>
        </div>
        {c.error && <div className="mt-3 text-center text-sm font-bold text-[#ff8a8a]">{c.error}</div>}
        <ul className="mt-4 grid gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75">
          {[
            "Everybody keeps their own game: their money, their story, their fits and their rides.",
            "You see each other walk, drive and play, in whatever you are wearing and driving.",
            "Sit down to chess, checkers, four in a row or tic-tac-toe against each other, each on your own device.",
            "Your devices talk straight to each other, so only share a code with people you know.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-[#39ff14]">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Sheet>
    );
  const linked = c.friends.filter((f) => f.link === "connected").length;
  return (
    <Sheet title="Your crew" sub={linked ? `${linked + 1} of you in Memphis right now.` : c.ready ? "The line is open. Send the code or the link to a friend." : "Opening the crew line…"} onClose={() => game.close()}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#39ff14]/35 bg-[#39ff14]/5 p-3 sm:p-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#39ff14]">Crew code</div>
          <div data-crew-shown className="mt-1 flex gap-1.5">
            {c.code.split("").map((ch, i) => (
              <span key={i} className="sr-title flex h-12 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/60 text-3xl text-white sm:h-14 sm:w-12 sm:text-4xl">
                {ch}
              </span>
            ))}
          </div>
        </div>
        <button data-primary data-crew-share className="sr-btn sr-btn-green px-4 py-2.5" onClick={share}>
          {copied ? "Link copied" : hud.touch ? "Send the link" : "Copy the link"}
        </button>
      </div>
      {c.error && <div className="mt-3 text-center text-sm font-bold text-[#ff8a8a]">{c.error}</div>}
      <div className="mt-4 grid gap-2">
        {c.friends.length === 0 && <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-white/60">Nobody else here yet. Anyone who opens the link or types the code lands in your Memphis.</div>}
        {c.friends.map((f) => (
          <div key={f.id} data-crew-friend={f.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.link === "connecting" ? "sr-pulse" : ""}`} style={{ background: LINK_TONE[f.link], boxShadow: `0 0 8px ${LINK_TONE[f.link]}` }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-white">{f.name}</div>
                <div className="truncate text-[11px] text-white/55">
                  {f.link === "connected" ? [f.doing, f.where].filter(Boolean).join("  ·  ") || "Getting their bearings" : f.link === "connecting" ? "Linking up…" : "Could not link directly. One of you may be on a network that blocks it: try other Wi-Fi, or mobile data."}
                </div>
              </div>
              {f.link === "connected" && f.rtt !== null && <span className="shrink-0 text-[11px] font-bold text-white/45">{Math.round(f.rtt)} ms</span>}
              {f.link === "connected" && (
                <button data-crew-ask={f.name} className={`sr-btn shrink-0 px-3 py-2 text-xs ${asking === f.id ? "sr-btn-gold" : "sr-btn-ghost"}`} onClick={() => setAsking(asking === f.id ? "" : f.id)}>
                  Play
                </button>
              )}
            </div>
            {asking === f.id && f.link === "connected" && (
              <div className="mt-2.5 flex flex-wrap gap-2 border-t border-white/10 pt-2.5">
                {CREW_GAMES.map((id) => (
                  <button key={id} data-crew-game={id} className="sr-btn sr-btn-green px-3 py-2 text-xs" onClick={() => game.board.invite(f.id, id)}>
                    {TABLES[id].name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {linked > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-white/50">Throw one up over your head</div>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((e) => (
              <button key={e} data-react={e} className="sr-btn sr-btn-ghost !px-4 !py-2 text-xl" onClick={() => game.crew.react(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">{nameRow}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="max-w-[340px] text-[11px] text-white/45">Your devices talk straight to each other. Only share the code with people you know.</div>
        <button data-crew-leave className="sr-btn sr-btn-ghost" onClick={() => game.crew.leave()}>
          Leave the crew
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- map

export function MapScreen({ game, hud }: { game: Game; hud: HudState }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      const g = el?.getContext("2d");
      if (!el || !g) return;
      const l = game.live;
      drawMap(g, el.width, el.height, { cx: 0, cz: -48, scale: el.width / 330 }, { x: l.x, z: l.z, heading: l.heading, car: hud.car, target: hud.target, time: performance.now() / 1000, friends: game.crew.hud().friends }, true);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, hud.car, hud.target]);
  const canRide = hud.mode === "walk" && hud.place === "street";
  return (
    <Sheet title="Memphis" sub="The green arrow is you. The white square is your car. The red dashes are the street race: meet Nitro at the red dot to run it." onClose={() => game.close()} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <canvas ref={ref} width={660} height={780} className="w-full rounded-xl border border-white/10" style={{ aspectRatio: "660 / 780", maxHeight: "70vh", objectFit: "contain" }} />
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-white/50">Call a ride · $10</div>
          {POIS.map((p) => (
            <button key={p.id} disabled={!canRide || hud.dollars < 10} onClick={() => game.taxi(p.id)} className="sr-btn sr-btn-ghost !justify-between !normal-case">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              {hud.target?.id === p.id && <span className="text-[10px] font-black uppercase text-[#39ff14]">Objective</span>}
            </button>
          ))}
          {!canRide && <div className="text-xs text-white/50">Rides pick up on the street, on foot.</div>}
          <div className="mt-1 rounded-xl border border-[#ff4646]/40 bg-[#ff4646]/10 p-3 text-xs text-white/80">
            <div className="mb-1 font-extrabold uppercase tracking-widest text-[#ff8a8a]">Street race</div>
            Nitro waits by the red dot on Riverside Drive, a block west of the boutique. Walk up to him to race three laps of the red circuit round downtown.
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- shop

export function Shop({ game, hud }: { game: Game; hud: HudState }) {
  const [sel, setSel] = useState(hud.shopFocus ?? CATALOG[1]!.id);
  const p = productById(sel) ?? CATALOG[1]!;
  const [size, setSize] = useState(p.sizes.includes("M") ? "M" : p.sizes[0]!);
  const [note, setNote] = useState("");
  useEffect(() => {
    setSize(p.sizes.includes("M") ? "M" : p.sizes[0]!);
    setNote("");
  }, [p]);
  const owned = hud.owned.includes(p.id);
  const wearing = p.wear && hud.wearing === p.wear;
  return (
    <Sheet title="SackReligious Klothing" sub="Buy a piece for Benji with SackDollars, or get the real one shipped to you." onClose={() => game.close()} wide>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {CATALOG.map((c) => {
            const has = hud.owned.includes(c.id);
            return (
              <button key={c.id} onClick={() => setSel(c.id)} className={`group relative overflow-hidden rounded-xl border text-left transition ${c.id === p.id ? "border-[#39ff14] bg-[#39ff14]/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                <div className="aspect-square w-full bg-[#101214]">
                  <img src={c.image} alt={c.name} className="h-full w-full object-contain p-2" loading="lazy" draggable={false} />
                </div>
                <div className="p-2">
                  <div className="truncate text-xs font-extrabold text-white">{c.name}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] font-bold">
                    <span className={has ? "text-[#39ff14]" : "text-[#f4d77a]"}>{has ? "OWNED" : c.cost === 0 ? "FREE" : `$${c.cost}`}</span>
                    <span className="text-white/45">${c.usd} real</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#101214]">
            <img src={p.image} alt={p.name} className="h-full w-full object-contain p-3" draggable={false} />
          </div>
          <div className="sr-title mt-3 text-2xl text-white">{p.name}</div>
          <p className="mt-1 text-sm text-white/70">{p.blurb}</p>
          {p.wear && <p className="mt-2 text-xs font-bold text-[#39ff14]">Benji can wear it: {OUTFITS[p.wear].perk}</p>}
          {!p.wear && <p className="mt-2 text-xs font-bold text-[#f4d77a]">Collector's piece: every one you own adds 2% to your payouts.</p>}

          <div className="mt-4 rounded-lg border border-white/10 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/50">In the game</div>
            {owned ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="sr-chip !text-[#39ff14]">Owned</span>
                {p.wear && (
                  <button className="sr-btn sr-btn-green flex-1" disabled={!!wearing} onClick={() => game.wear(p.wear as OutfitId)}>
                    {wearing ? "Wearing it" : "Put it on"}
                  </button>
                )}
              </div>
            ) : (
              <button className="sr-btn sr-btn-green mt-2 w-full" disabled={hud.dollars < p.cost} onClick={() => game.buy(p.id)}>
                {hud.dollars < p.cost ? `Need $${p.cost - hud.dollars} more` : `Buy for $${p.cost} SackDollars`}
              </button>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-[#e0b33a]/40 bg-[#e0b33a]/5 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#f4d77a]">The real thing · ${p.usd}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-10 rounded-md border px-2 py-1.5 text-xs font-black ${s === size ? "border-[#e0b33a] bg-[#e0b33a] text-black" : "border-white/20 text-white/80 hover:border-white/50"}`}>
                  {s}
                </button>
              ))}
            </div>
            <button
              className="sr-btn sr-btn-gold mt-3 w-full"
              onClick={() => {
                const how = buyReal(p, size);
                setNote(how === "cart" ? "Added to your Kart." : "Opened on 10letters.store in a new tab.");
              }}
            >
              Buy it for real
            </button>
            {note && <div className="mt-2 text-center text-xs font-bold text-[#f4d77a]">{note}</div>}
          </div>
          <button
            className="mt-3 w-full text-center text-xs font-bold text-white/55 underline underline-offset-4 hover:text-white"
            onClick={() => {
              game.persist();
              openStore();
            }}
          >
            See the whole store at 10letters.store
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- wardrobe

export function Wardrobe({ game, hud }: { game: Game; hud: HudState }) {
  const ids = Object.keys(OUTFITS) as OutfitId[];
  return (
    <Sheet title="Benji's fits" sub="What you wear changes how the day plays." onClose={() => game.close()} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ids.map((id) => {
          const o = OUTFITS[id];
          const has = hud.outfits.includes(id);
          const on = hud.wearing === id;
          return (
            <div key={id} className={`flex flex-col rounded-xl border p-3 ${on ? "border-[#39ff14] bg-[#39ff14]/10" : "border-white/10 bg-white/5"} ${has ? "" : "opacity-55"}`}>
              <div className="flex h-44 items-end justify-center rounded-lg bg-gradient-to-b from-[#1a1c20] to-[#0c0d0f]">
                <img src={o.art.front} alt={o.name} className="h-40 object-contain" style={has ? undefined : { filter: "brightness(0.25)" }} draggable={false} />
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">{o.name}</div>
              <div className="mt-0.5 flex-1 text-xs text-white/65">{o.perk}</div>
              {has ? (
                <button className="sr-btn sr-btn-green mt-2" disabled={on} onClick={() => game.wear(id)}>
                  {on ? "Wearing" : "Wear"}
                </button>
              ) : (
                <div className="mt-2 rounded-lg border border-white/10 py-2 text-center text-[11px] font-black uppercase tracking-wide text-white/60">{o.from}</div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- prizes and food

export function Prizes({ game, hud }: { game: Game; hud: HudState }) {
  return (
    <Sheet title="Prize counter" sub={`You have ${hud.tickets} tickets. Every game on the floor pays out.`} onClose={() => game.close()}>
      <div className="grid gap-2">
        {PRIZES.map((p) => {
          const has = !!p.outfit && hud.outfits.includes(p.outfit);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/40 text-2xl">{p.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-white">{p.name}</div>
                <div className="text-xs text-white/60">{p.blurb}</div>
              </div>
              <button className="sr-btn sr-btn-gold shrink-0" disabled={has || hud.tickets < p.tickets} onClick={() => game.redeem(p.id)}>
                {has ? "Yours" : `${p.tickets} tickets`}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

export function FoodMenu({ game, hud }: { game: Game; hud: HudState }) {
  const list = FOOD.filter((f) => f.at === hud.foodAt);
  const truck = FOOD_TRUCKS.find((t) => t.id === hud.foodAt) ?? null;
  return (
    <Sheet title={truck ? truck.name : "Fun House Pizza"} sub="A full stomach pays: +10% SackDollars from everything while it lasts." onClose={() => game.close()}>
      {truck?.scene && <img src={truck.scene} alt={`${truck.name} at the window`} className="mb-3 max-h-48 w-full rounded-xl border border-white/10 object-cover object-[50%_35%] sm:max-h-56" draggable={false} />}
      {truck && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: `${truck.color}66`, background: `linear-gradient(90deg, ${truck.color}22, transparent)` }}>
          <img src={truck.logo} alt={truck.name} className="h-16 w-24 shrink-0 rounded-lg bg-black/40 object-contain" />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/85">{truck.blurb}</div>
            <div className="mt-1 text-xs font-extrabold" style={{ color: truck.color }}>
              {truck.social}
            </div>
          </div>
          {truck.video && (
            <button className="sr-btn sr-btn-gold shrink-0 px-4 py-2 text-xs" onClick={() => game.open("video")}>
              Watch the video
            </button>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((f) => {
          const noFish = !!f.fish && hud.cooler.length === 0;
          return (
            <button key={f.id} disabled={hud.dollars < f.cost || noFish} onClick={() => game.order(f.id)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#39ff14]/60 disabled:opacity-40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/40 text-2xl">{f.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-white">{f.name}</div>
                <div className="text-xs text-white/60">{noFish ? "Bring a fish from the pier and they'll cook it." : f.line}</div>
                <div className="mt-0.5 text-[11px] font-bold text-[#39ff14]">
                  Well fed for {Math.round(f.seconds / 60)} min{f.respect ? ` · +${f.respect} respect` : ""}
                </div>
              </div>
              <div className="text-base font-black text-[#f4d77a]">${f.cost}</div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Court OG's table: three ways to play. */
export function CourtMenu({ game }: { game: Game }) {
  const games: { kind: "shootout" | "versus" | "practice"; name: string; line: string; pay: string; color: string }[] = [
    { kind: "versus", name: "Run one", line: "A game to 11 against whoever's on the court. Shot for shot from the same spot. Beat one and the next steps up.", pay: "Win: $80 and up", color: "#ff8a1e" },
    { kind: "shootout", name: "60-second shootout", line: "Score as much as you can before the buzzer. Hot spots pay an extra point.", pay: "$4 a point", color: "#39ff14" },
    { kind: "practice", name: "Practice", line: "No clock, no score to beat. Find your release and stay as long as you like.", pay: "Free", color: "#35e0d0" },
  ];
  return (
    <Sheet title="901 Court" sub="Court OG's got next. What are we running?" onClose={() => game.close()}>
      <div className="grid gap-2">
        {games.map((g, i) => (
          <button key={g.kind} data-primary={i === 0 ? true : undefined} onClick={() => game.playBall(g.kind)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10" style={{ borderColor: `${g.color}55` }}>
            <div className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: g.color }} />
            <div className="min-w-0 flex-1">
              <div className="sr-title text-xl" style={{ color: g.color }}>
                {g.name}
              </div>
              <div className="text-xs text-white/70">{g.line}</div>
            </div>
            <div className="shrink-0 text-xs font-extrabold text-[#f4d77a]">{g.pay}</div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** A bar for one of a ride's numbers, against the coupe's. */
function Stat({ label, k }: { label: string; k: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55">
      <span className="w-9">{label}</span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full bg-[#39ff14]" style={{ width: `${Math.max(8, Math.min(100, (k - 0.7) * 200))}%` }} />
      </span>
    </div>
  );
}

/** The garage: what Benji drives. */
export function Garage({ game, hud }: { game: Game; hud: HudState }) {
  return (
    <Sheet title="Garage" sub="Every one wears the brand. In the street race they all run the same engine." onClose={() => game.close()} wide>
      <div className="grid gap-2 sm:grid-cols-2">
        {RIDES.map((r) => {
          const owned = hud.rides.includes(r.id);
          const on = hud.ride === r.id;
          return (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: on ? "#39ff14" : "rgba(255,255,255,0.1)", background: on ? "rgba(57,255,20,0.08)" : "rgba(255,255,255,0.04)" }}>
              <div className="flex items-start gap-3">
                <img src={`/game/wraps/${r.wrap}/side.webp`} alt="" className="h-12 w-24 shrink-0 rounded-md bg-black/40 object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="sr-title text-xl leading-none">{r.name}</div>
                  <div className="mt-1 text-xs text-white/65">{r.line}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid gap-1">
                  <Stat label="Top" k={r.top} />
                  <Stat label="Pull" k={r.accel} />
                  <Stat label="Grip" k={r.grip} />
                </div>
                {on ? (
                  <span className="rounded-full bg-[#39ff14] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-black">Driving it</span>
                ) : (
                  <button data-primary={owned ? true : undefined} className={`sr-btn px-4 py-2 ${owned ? "sr-btn-green" : "sr-btn-gold"}`} onClick={() => game.pickRide(r.id)}>
                    {owned ? "Drive this" : `Buy · $${r.price}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs text-white/55">You have ${hud.dollars}.</div>
    </Sheet>
  );
}

/** The music video from Veli's truck, full size. */
export function VideoScreen({ game }: { game: Game }) {
  const v = FOOD_TRUCKS.find((t) => t.video);
  if (!v?.video) return null;
  return (
    <Sheet title={`${v.video.artist} · ${v.video.title}`} sub={`Playing at ${v.name} on the riverfront. ${v.social}`} onClose={() => game.close()} wide>
      <video src={v.video.src} controls autoPlay loop playsInline className="mx-auto block max-h-[68vh] w-full rounded-xl bg-black" />
      <div className="mt-3 flex justify-center">
        <button data-primary className="sr-btn sr-btn-green px-8 py-3" onClick={() => game.close()}>
          Back to the trucks
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- results

export function ResultsCard({ game, hud }: { game: Game; hud: HudState }) {
  const r = hud.results;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Enter" || e.code === "KeyE") game.close();
      if (e.code === "KeyR" && r?.again) game.resultsAgain();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game, r?.again]);
  if (!r) return null;
  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-3">
      <div className="sr-panel sr-pop w-full max-w-md p-5 text-center sm:p-7">
        {r.record && <div className="sr-chip sr-pulse mb-3 !border-[#e0b33a] !text-[#f4d77a]">New record</div>}
        <div className="sr-title text-4xl text-white sm:text-5xl">{r.title}</div>
        <div className="mt-2 text-sm text-white/70">{r.sub}</div>
        <div className="mt-4 grid gap-1.5">
          {r.rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2 text-sm">
              <span className="font-bold text-white/60">{k}</span>
              <span className="font-black text-white">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {r.pay > 0 && <span className="sr-chip !text-[#39ff14]">+${r.pay}</span>}
          {r.respect > 0 && <span className="sr-chip !text-[#f4d77a]">+{r.respect} Respect</span>}
          {r.tickets > 0 && <span className="sr-chip !text-[#ffd23a]">+{r.tickets} tickets</span>}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {r.again && (
            <button className="sr-btn sr-btn-ghost flex-1 py-3" onClick={() => game.resultsAgain()}>
              {r.again} {!hud.pad && <span className="sr-key ml-1">R</span>}
            </button>
          )}
          <button data-primary className="sr-btn sr-btn-green flex-1 py-3" onClick={() => game.close()}>
            Continue <span className="sr-key ml-1">{hud.pad ? "A" : "E"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
