import { useEffect, useRef, useState, type ReactNode } from "react";
import { OUTFITS, type OutfitId } from "../assets/cast";
import type { HudState } from "../core/types";
import type { Game } from "../game";
import { CATALOG, productById } from "../play/catalog";
import { FOOD, PRIZES } from "../play/goods";
import { buyReal, openStore } from "../play/store";
import { POIS } from "../world/map";
import { drawMap } from "./map";

function Sheet({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
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
      if (e.code === "Enter" || e.code === "Space") game.play(!hud.hasSave);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game, hud.hasSave]);
  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-30 flex flex-col justify-end" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.82) 100%)" }}>
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-8 sm:px-10 sm:pb-12">
        <div className="sr-rise max-w-[400px]">
          <div className="sr-script sr-neon text-4xl sm:text-5xl">$ackReligious</div>
          <div className="sr-title mt-1 text-4xl text-[#f4d77a] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-6xl">Memphis</div>
          <p className="mt-3 max-w-md text-sm font-semibold text-white/85 drop-shadow sm:text-base">
            Run the Drop Day. Hoop on the river, bowl, fish the Mississippi, race downtown, and win big at the Fun House. Every piece in the boutique is real.
          </p>
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
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/45">{hud.pad ? "Gamepad ready: press A" : "Keyboard, gamepad or touch"}</div>
        </div>
      </div>
    </div>
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
      <Row label="Graphics">
        <Seg
          value={s.quality}
          options={[
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
              ["View", "Change time of day"],
              ["Start", "Pause"],
            ] as const)
          : ([
              ["W A S D", "Move, steer"],
              ["Shift", "Run, nitro"],
              ["E", "Interact"],
              ["Space", "Shoot, cast, bowl, handbrake"],
              ["M", "Map and taxi"],
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
      drawMap(g, el.width, el.height, { cx: 0, cz: -48, scale: el.width / 330 }, { x: l.x, z: l.z, heading: l.heading, car: hud.car, target: hud.target, time: performance.now() / 1000 }, true);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, hud.car, hud.target]);
  const canRide = hud.mode === "walk" && hud.place === "street";
  return (
    <Sheet title="Memphis" sub="The green arrow is you. The white square is your coupe." onClose={() => game.close()} wide>
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
  const source = (id: OutfitId) => (PRIZES.some((p) => p.outfit === id) ? "Fun House prize" : id === "blue_901" ? "Coming soon" : "At the HQ");
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
                <div className="mt-2 rounded-lg border border-white/10 py-2 text-center text-[11px] font-black uppercase tracking-wide text-white/60">{source(id)}</div>
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
  return (
    <Sheet title={hud.foodAt === "pizza" ? "Fun House Pizza" : "Riverfront food trucks"} sub="A full stomach pays: +10% SackDollars from everything while it lasts." onClose={() => game.close()}>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((f) => (
          <button key={f.id} disabled={hud.dollars < f.cost} onClick={() => game.order(f.id)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#39ff14] disabled:opacity-40">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/40 text-2xl">{f.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-white">{f.name}</div>
              <div className="text-xs text-white/60">{f.line}</div>
              <div className="mt-0.5 text-[11px] font-bold text-[#39ff14]">Well fed for {Math.round(f.seconds / 60)} min</div>
            </div>
            <div className="text-base font-black text-[#f4d77a]">${f.cost}</div>
          </button>
        ))}
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
