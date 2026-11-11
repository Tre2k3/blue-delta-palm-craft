import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Action, Nav } from "../core/input";
import type { HudState, Live } from "../core/types";
import { formatClock } from "../core/util";
import type { Game } from "../game";
import { Arcade } from "./Arcade";
import { FoodMenu, MapScreen, Pause, Prizes, ResultsCard, Shop, Title, Wardrobe } from "./Menus";
import { drawMap } from "./map";
import "./ui.css";

function useLive(game: Game, fn: (l: Live) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ref.current(game.live);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);
}

const PHASE_LABEL = { golden: "Sunset", night: "Night", day: "Day" } as const;

/** Keyboard hint to gamepad hint. An empty string hides the line on a pad. */
function padKey(key: string, driving: boolean, activity: boolean) {
  const table: Record<string, string> = {
    "W A S D": "L stick",
    "A D": "L stick",
    "W S": "RT  LT",
    Shift: "RB",
    E: "A",
    M: "Y",
    N: "View",
    Q: "B",
    H: "L3",
    Esc: "Start",
    Space: driving ? "X" : activity ? "A" : "X",
    "Hold Space": "Hold A",
    Release: "Release",
    "1 - 9": "",
  };
  return table[key] ?? key;
}

/**
 * Move the pad's highlight round whatever menu is on top. Buttons are found by where they sit
 * on screen, so every sheet works without listing its own order.
 */
function padNav(dir: Nav) {
  const roots = document.querySelectorAll<HTMLElement>("[data-menu]");
  const root = roots[roots.length - 1];
  if (!root || root.querySelector('[data-playing="1"]')) return;
  const items = [...root.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const cur = items.find((el) => el.dataset.padfocus === "1") ?? null;
  const first = () => root.querySelector<HTMLElement>("[data-primary]:not(:disabled)") ?? root.querySelector<HTMLElement>("[data-menu-body] button:not(:disabled)") ?? items[0]!;
  const focus = (el: HTMLElement) => {
    for (const i of document.querySelectorAll<HTMLElement>('[data-padfocus="1"]')) delete i.dataset.padfocus;
    el.dataset.padfocus = "1";
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  if (dir === "accept") {
    (cur ?? first()).click();
    return;
  }
  if (dir === "back") return;
  if (!cur || dir === "init") {
    if (!cur) focus(first());
    return;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - ax;
    const dy = r.top + r.height / 2 - ay;
    const along = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    if (along < 6) continue;
    const score = along + across * 2.4;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) focus(best);
}

export function Hud({ game, hud }: { game: Game; hud: HudState }) {
  const fade = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const markText = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const sweet = useRef<HTMLDivElement>(null);
  const aim = useRef<HTMLDivElement>(null);
  const tension = useRef<HTMLDivElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const nitro = useRef<HTMLDivElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);
  const touch = coarse || hud.touch;
  const hudRef = useRef(hud);
  hudRef.current = hud;
  useEffect(() => {
    game.onNav = padNav;
    return () => {
      game.onNav = null;
    };
  }, [game]);

  useLive(game, (l) => {
    if (fade.current) fade.current.style.opacity = String(l.fade);
    if (mark.current) {
      mark.current.style.display = l.markOn ? "flex" : "none";
      mark.current.style.left = `${l.markX * 100}%`;
      mark.current.style.top = `${l.markY * 100}%`;
      if (markText.current) markText.current.textContent = `${Math.round(l.markDist)} m`;
    }
    if (meter.current) meter.current.style.width = `${Math.min(1, l.meter) * 100}%`;
    if (sweet.current) {
      sweet.current.style.left = `${l.sweetLo * 100}%`;
      sweet.current.style.width = `${(l.sweetHi - l.sweetLo) * 100}%`;
    }
    if (aim.current) aim.current.style.left = `${50 + l.aim * 46}%`;
    if (tension.current) {
      tension.current.style.width = `${Math.min(1, l.tension) * 100}%`;
      tension.current.style.background = l.tension > 0.8 ? "#ff3b3b" : l.tension > 0.55 ? "#ffd23a" : "#39ff14";
    }
    if (speed.current) speed.current.textContent = String(Math.round(l.speed));
    if (nitro.current) nitro.current.style.width = `${l.nitro * 100}%`;
    const el = mini.current;
    const g = el?.getContext("2d");
    const h = hudRef.current;
    if (el && g) drawMap(g, el.width, el.height, { cx: l.x, cz: l.z, scale: 0.62 }, { x: l.x, z: l.z, heading: l.heading, car: h.car, target: h.target, time: performance.now() / 1000 }, false);
  });

  // Drag anywhere on the scene to look around.
  const drag = useRef<{ id: number; x: number } | null>(null);
  const title = hud.mode === "title";
  const playing = !title && !hud.overlay;
  const activity = hud.hoops || hud.bowl || hud.fish || hud.race || hud.laser || hud.bounce || hud.pit || hud.whack;
  const showMeter = !!hud.hoops || hud.bowl?.phase === "power" || hud.fish?.phase === "charge" || !!hud.bounce;
  const call = hud.hoops?.call || hud.bowl?.call || hud.fish?.call || hud.race?.call || hud.laser?.call || hud.bounce?.call || hud.pit?.call || hud.whack?.call || "";
  const count = hud.race?.phase === "count" ? hud.race.count : hud.laser?.phase === "count" ? hud.laser.count : 0;
  const outdoors = hud.place === "street";

  return (
    <div className="sr-root pointer-events-none absolute inset-0 overflow-hidden" data-pad={hud.pad ? "1" : "0"}>
      <div
        className="sr-touch pointer-events-auto absolute inset-0"
        onPointerDown={(e) => {
          game.sound.unlock();
          game.tap((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2);
          drag.current = { id: e.pointerId, x: e.clientX };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          game.input.look((e.clientX - d.x) * 0.0055);
          d.x = e.clientX;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />

      {playing && (
        <>
          {/* Objective marker in the world. */}
          <div ref={mark} className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="h-4 w-4 rotate-45 border-2 border-[#06140a] bg-[#39ff14] shadow-[0_0_14px_rgba(57,255,20,0.9)]" />
            <span ref={markText} className="mt-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-white" />
          </div>

          {/* Money and name. */}
          <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="sr-chip">
                <span className="text-[#39ff14]">$</span>
                {hud.dollars.toLocaleString()}
              </span>
              <span className="sr-chip">
                <span className="text-[#f4d77a]">★</span>
                {hud.respect}
                <span className="hidden text-[10px] font-bold text-white/50 sm:inline">RESPECT</span>
              </span>
              {(hud.tickets > 0 || hud.place === "fun") && (
                <span className="sr-chip">
                  <span className="text-[#ffd23a]">🎟</span>
                  {hud.tickets}
                </span>
              )}
            </div>
            {hud.buff && <span className="sr-chip !py-1 !text-[11px] !text-[#39ff14]">{hud.buff}</span>}
            {touch && outdoors && !activity && <canvas ref={mini} width={150} height={150} className="mt-1 h-[104px] w-[104px] rounded-xl border border-white/20 opacity-90" />}
          </div>

          {/* Where you are. */}
          <div className="absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 sm:top-4 md:block">
            {!activity && (
              <span className="sr-chip whitespace-nowrap">
                <span className="text-[#39ff14]">◆</span>
                {hud.district.toUpperCase()}
                {hud.street && <span className="hidden text-white/55 sm:inline">· {hud.street}</span>}
                {outdoors && <span className="hidden text-[10px] text-[#f4d77a] md:inline">{PHASE_LABEL[hud.phase]}</span>}
              </span>
            )}
          </div>

          {/* Mission. */}
          {hud.mission && !activity && (
            <div className="sr-panel absolute right-3 top-3 z-20 w-[min(46vw,300px)] p-3 sm:right-4 sm:top-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#39ff14]">
                <span>{hud.mission.chapter}</span>
                <span className="text-white/45">
                  {hud.mission.index}/{hud.mission.total}
                </span>
              </div>
              <div className="sr-title mt-1 text-lg text-white sm:text-xl">{hud.mission.title}</div>
              <div className="mt-1 text-[11px] leading-snug text-white/70 sm:text-xs">{hud.mission.detail}</div>
            </div>
          )}

          {activity && <ActivityBar hud={hud} />}

          {/* Corner map. */}
          {!touch && outdoors && !hud.hoops && !hud.fish && (
            <div className="absolute bottom-4 left-4 z-20">
              <canvas ref={mini} width={190} height={190} className="h-[168px] w-[168px] rounded-2xl border-2 border-white/20 shadow-xl" />
              <div className="mt-1 text-center text-[10px] font-bold text-white/50">
                <span className="sr-key mr-1">{hud.pad ? "Y" : "M"}</span>Map
              </div>
            </div>
          )}

          {/* Toast, talk, prompt. */}
          <div className="absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-2 px-3 sm:top-20">
            {hud.toast && (
              <div key={hud.toast} className="sr-panel sr-rise max-w-[92vw] px-4 py-2 text-center text-sm font-extrabold text-[#f4d77a]">
                {hud.toast}
              </div>
            )}
          </div>
          {call && (
            <div key={call} className="sr-pop absolute inset-x-0 top-[26%] z-20 px-4 text-center">
              <span className="sr-title text-3xl text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] sm:text-5xl">{call}</span>
            </div>
          )}
          {count > 0 && (
            <div key={count} className="sr-pop absolute inset-0 z-20 flex items-center justify-center">
              <span className="sr-title sr-neon text-[120px] sm:text-[180px]">{count}</span>
            </div>
          )}
          {hud.race?.wrongWay && <div className="sr-title sr-pulse absolute inset-x-0 top-[40%] z-20 text-center text-4xl text-[#ff3b3b] drop-shadow-lg">Wrong way</div>}
          {hud.laser?.hit && <div className="absolute inset-0 z-10 bg-[#ff2aa0]/25" />}

          <div className={`absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-3 ${touch ? "bottom-40" : "bottom-6"}`}>
            {hud.dialogue && (
              <div className="sr-panel sr-rise flex max-w-[min(92vw,640px)] items-center gap-3 p-3">
                {hud.dialogue.portrait && <img src={hud.dialogue.portrait} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-white/15 object-cover object-top" draggable={false} />}
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-[#39ff14]">{hud.dialogue.who}</div>
                  <div className="text-sm font-semibold leading-snug text-white">{hud.dialogue.text}</div>
                </div>
              </div>
            )}
            {hud.prompt && (
              <button className="sr-panel sr-rise pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold text-white" onClick={() => game.input.press("interact")}>
                <span className="sr-key">{hud.pad ? "A" : "E"}</span>
                {hud.prompt}
              </button>
            )}
            {showMeter && (
              <div className="w-[min(86vw,430px)]">
                <div className="mb-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  {hud.hoops ? (
                    <>
                      Hold <span className="sr-key">{hud.pad ? "A" : "Space"}</span> / Shoot
                    </>
                  ) : hud.bowl ? (
                    "Power"
                  ) : hud.fish ? (
                    "Cast"
                  ) : (
                    "Landing"
                  )}
                </div>
                <div className="relative h-5 overflow-hidden rounded-full border-2 border-white/40 bg-black/75">
                  <div ref={sweet} className="absolute inset-y-0 bg-[#39ff14]/70" />
                  <div ref={meter} className="absolute inset-y-0 left-0 border-r-4 border-white bg-white/25" />
                </div>
              </div>
            )}
            {hud.bowl && <Scorecard hud={hud} />}
            {(hud.bowl?.phase === "aim" || hud.bowl?.phase === "power") && (
              <div className="relative h-3 w-64 rounded-full border border-white/25 bg-black/70">
                <div className="absolute left-1/2 top-0 h-full w-[18%] -translate-x-1/2 rounded-full bg-[#39ff14]/40" />
                <div ref={aim} className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded bg-white shadow" />
              </div>
            )}
            {hud.fish?.phase === "reel" && (
              <div className="w-72 max-w-[80vw]">
                <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-widest text-white/70">
                  <span>Line tension</span>
                  <span>{hud.fish.distance} m out</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full border border-white/25 bg-black/70">
                  <div ref={tension} className="h-full rounded-full" />
                </div>
              </div>
            )}
            {hud.fish?.fish && (
              <div className="sr-panel sr-pop px-5 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: hud.fish.fish.color }}>
                  {hud.fish.fish.rarity}
                </div>
                <div className="sr-title text-2xl text-white">{hud.fish.fish.name}</div>
                <div className="text-sm font-bold text-white/80">
                  {hud.fish.fish.lb} lb <span className="mx-1 text-white/30">|</span> <span className="text-[#39ff14]">${hud.fish.fish.pay}</span>
                </div>
              </div>
            )}
          </div>

          {/* Speed. */}
          {(hud.driving || hud.race) && (
            <div className={`absolute z-20 text-right ${touch ? "left-1/2 top-[84px] -translate-x-1/2" : "bottom-24 right-5"}`}>
              <div className="sr-title text-5xl text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] sm:text-6xl">
                <span ref={speed}>0</span>
                <span className="ml-1 text-lg text-white/60">MPH</span>
              </div>
              {hud.race && !hud.race.kart && (
                <div className="ml-auto mt-1 w-40">
                  <div className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-[#5ac8ff]">Nitro</div>
                  <div className="h-2.5 overflow-hidden rounded-full border border-white/25 bg-black/70">
                    <div ref={nitro} className="h-full bg-gradient-to-r from-[#2a8cff] to-[#9fe0ff]" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keys. */}
          {!touch && (
            <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1">
              {hud.hints.map(([k, v]) => {
                const label = hud.pad ? padKey(k, hud.driving || !!hud.race, !!activity) : k;
                if (!label) return null;
                return (
                  <div key={k + v} className="flex items-center gap-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-bold text-white/85">
                    <span>{v}</span>
                    <span className="sr-key">{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {touch && <Touch game={game} hud={hud} />}
          {touch && (
            <div className={`pointer-events-auto absolute right-3 z-20 flex gap-1.5 ${activity ? "top-[84px]" : "top-[128px]"}`}>
              {!activity && <IconBtn label="Map" onClick={() => game.open("map")} />}
              <IconBtn label="Pause" onClick={() => game.open("pause")} />
            </div>
          )}
        </>
      )}

      {title && <Title game={game} hud={hud} />}
      {hud.overlay === "pause" && <Pause game={game} hud={hud} />}
      {hud.overlay === "map" && <MapScreen game={game} hud={hud} />}
      {hud.overlay === "shop" && <Shop game={game} hud={hud} />}
      {hud.overlay === "wardrobe" && <Wardrobe game={game} hud={hud} />}
      {hud.overlay === "prizes" && <Prizes game={game} hud={hud} />}
      {hud.overlay === "food" && <FoodMenu game={game} hud={hud} />}
      {hud.overlay === "arcade" && hud.cabinet && <Arcade game={game} id={hud.cabinet} />}
      {hud.overlay === "results" && <ResultsCard game={game} hud={hud} />}

      <div ref={fade} className="pointer-events-none absolute inset-0 z-50 bg-black" style={{ opacity: 1 }} />
    </div>
  );
}

function IconBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="sr-chip !px-3 !py-2 !text-[11px] uppercase" onClick={onClick}>
      {label}
    </button>
  );
}

function Stat({ label, children, tone }: { label: string; children: ReactNode; tone?: string }) {
  return (
    <div className="px-3 text-center sm:px-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/50 sm:text-[10px]">{label}</div>
      <div className="sr-title text-2xl sm:text-3xl" style={{ color: tone ?? "#fff" }}>
        {children}
      </div>
    </div>
  );
}

function ActivityBar({ hud }: { hud: HudState }) {
  const h = hud.hoops;
  const b = hud.bowl;
  const f = hud.fish;
  const r = hud.race;
  const l = hud.laser;
  const t = hud.bounce;
  const p = hud.pit;
  return (
    <div className="sr-panel absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center divide-x divide-white/10 py-2 sm:top-4">
      {h && (
        <>
          <Stat label="Score" tone={h.fire ? "#ff8a1e" : "#39ff14"}>
            {h.score}
          </Stat>
          <Stat label="Time" tone={h.left <= 10 ? "#ff5a5a" : undefined}>
            {h.left}
          </Stat>
          <Stat label="Made">
            {h.made}/{h.shots}
          </Stat>
          <Stat label="Range" tone="#f4d77a">
            <span className="text-base sm:text-lg">{h.range}</span>
          </Stat>
        </>
      )}
      {b && (
        <>
          <Stat label="Frame">{b.frame}</Stat>
          <Stat label="Ball">{Math.min(3, b.ball)}</Stat>
          <Stat label="Score" tone="#39ff14">
            {b.total}
          </Stat>
          <Stat label="Best">{b.best || "--"}</Stat>
        </>
      )}
      {f && (
        <>
          <Stat label="Bait">{f.bait}</Stat>
          <Stat label="Cooler" tone="#39ff14">
            {f.cooler}
          </Stat>
          <Stat label="Worth" tone="#f4d77a">
            ${f.value}
          </Stat>
        </>
      )}
      {r && (
        <>
          <Stat label="Place" tone={r.place === 1 ? "#39ff14" : "#fff"}>
            {r.place}
            <span className="text-sm text-white/50">/{r.racers}</span>
          </Stat>
          <Stat label="Lap">
            {r.lap}
            <span className="text-sm text-white/50">/{r.laps}</span>
          </Stat>
          <Stat label="Time">{formatClock(r.time)}</Stat>
          <Stat label="Record" tone="#f4d77a">
            {r.best ? formatClock(r.best) : "--"}
          </Stat>
        </>
      )}
      {l && (
        <>
          <Stat label="Score" tone="#39ff14">
            {l.score}
          </Stat>
          <Stat label="Time" tone={l.left <= 10 ? "#ff5a5a" : undefined}>
            {l.left}
          </Stat>
          <Stat label="Tags">{l.tags}</Stat>
        </>
      )}
      {t && (
        <>
          <Stat label="Score" tone="#39ff14">
            {t.score}
          </Stat>
          <Stat label="Time" tone={t.left <= 5 ? "#ff5a5a" : undefined}>
            {t.left}
          </Stat>
          <Stat label="Combo" tone="#f4d77a">
            x{Math.max(1, t.combo)}
          </Stat>
        </>
      )}
      {hud.whack && (
        <>
          <Stat label="Score" tone="#39ff14">
            {hud.whack.score}
          </Stat>
          <Stat label="Time" tone={hud.whack.left <= 5 ? "#ff5a5a" : undefined}>
            {hud.whack.left}
          </Stat>
          <Stat label="Moles">{hud.whack.hits}</Stat>
        </>
      )}
      {p && (
        <>
          <Stat label="Gold" tone="#f4d77a">
            {p.found}/{p.total}
          </Stat>
          <Stat label="Time" tone={p.left <= 5 ? "#ff5a5a" : undefined}>
            {p.left}
          </Stat>
        </>
      )}
    </div>
  );
}

function Scorecard({ hud }: { hud: HudState }) {
  const b = hud.bowl!;
  return (
    <div className="sr-panel flex max-w-[96vw] overflow-hidden text-center">
      {Array.from({ length: 10 }, (_, i) => {
        const marks = b.marks[i] ?? [];
        const live = i === b.frame - 1;
        return (
          <div key={i} className={`w-9 border-r border-white/10 last:border-r-0 sm:w-12 ${live ? "bg-[#39ff14]/15" : ""}`}>
            <div className="border-b border-white/10 text-[9px] font-black text-white/45">{i + 1}</div>
            <div className="h-5 text-xs font-black tracking-wide text-[#f4d77a]">{marks.join(" ")}</div>
            <div className="h-6 text-sm font-black text-white">{b.totals[i] ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function Touch({ game, hud }: { game: Game; hud: HudState }) {
  const pad = useRef<HTMLDivElement>(null);
  const nub = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const set = (e: React.PointerEvent) => {
    const el = pad.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    game.input.setStick(x, -y);
    if (nub.current) nub.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const end = () => {
    id.current = null;
    game.input.setStick(0, 0);
    if (nub.current) nub.current.style.transform = "translate(0px, 0px)";
  };
  const act = hud.hoops ? "Shoot" : hud.fish ? "Reel" : hud.bowl ? "Go" : hud.race ? "Drift" : hud.driving ? "Brake" : hud.laser ? "Fire" : hud.bounce ? "Jump" : hud.whack ? "Whack" : "Act";
  const run = hud.race && !hud.race.kart ? "Nitro" : "Run";
  const activity = hud.mode !== "walk" && hud.mode !== "drive";
  const Hold = ({ a, label, big }: { a: Action; label: string; big?: boolean }) => (
    <button
      className={`sr-touch flex items-center justify-center rounded-full border-2 border-white/40 bg-black/55 font-black uppercase text-white active:bg-[#39ff14]/50 ${big ? "h-20 w-20 text-sm" : "h-14 w-14 text-[11px]"}`}
      onPointerDown={(e) => {
        e.preventDefault();
        game.sound.unlock();
        game.input.hold(a, true);
      }}
      onPointerUp={() => game.input.hold(a, false)}
      onPointerCancel={() => game.input.hold(a, false)}
      onPointerLeave={() => game.input.hold(a, false)}
    >
      {label}
    </button>
  );
  return (
    <>
      <div
        ref={pad}
        className="sr-touch pointer-events-auto absolute bottom-6 left-5 z-30 flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/30 bg-black/35"
        onPointerDown={(e) => {
          game.sound.unlock();
          id.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e);
        }}
        onPointerMove={(e) => {
          if (id.current === e.pointerId) set(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div ref={nub} className="h-14 w-14 rounded-full border border-white/50 bg-white/30" />
      </div>
      <div className="pointer-events-auto absolute bottom-6 right-4 z-30 flex items-end gap-2">
        <div className="flex flex-col gap-2">
          {activity && <Hold a="back" label="Quit" />}
          <Hold a="run" label={run} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Hold a="interact" label="E" />
          <Hold a="action" label={act} big />
        </div>
      </div>
    </>
  );
}
