import { useEffect, useRef, useState, useCallback } from "react";
import {
  Map as MapIcon,
  Target,
  Shirt,
  Trophy,
  Settings,
  Play,
  Volume2,
  SwitchCamera,
} from "lucide-react";
import { GameEngine } from "./engine";
import { APPAREL, ART_REV, BRAND, POIS, TROPHIES, TIPS } from "./data";
import { formatRunClock } from "./dropRun";
import type { ApparelId, HudSnapshot, PauseTab } from "./types";

const emptyHud: HudSnapshot = {
  mode: "menu",
  sackdollars: 0,
  respect: 0,
  missionTitle: "",
  missionStep: "",
  missionProgress: "0/0",
  missionChapter: "CHAPTER 01",
  interactHint: null,
  locationName: "Memphis",
  district: "901",
  dialogue: null,
  shopOpen: false,
  toast: null,
  equipped: null,
  owned: [],
  basketball: null,
  paused: false,
  started: false,
  missionComplete: false,
  cinematic: null,
  letterbox: 0,
  worldHour: 16,
  inputDevice: "keyboard",
  promptButton: "E",
  trophies: [],
  trophyPopup: null,
  pauseTab: "resume",
  settings: { master: 0.85, music: 0.42, sfx: 0.7, shake: true, rumble: true, cameraView: "third" },
  sideMissions: [],
  highScore: 0,
  hasSave: false,
  cameraView: "third",
  steps: [],
  dropRun: {
    run: 1,
    time: 0,
    combo: 0,
    bestCombo: 0,
    points: 0,
    courtTarget: 8,
    grade: null,
    recap: false,
    deliveries: 0,
    ballMakes: 0,
    ballPerfects: 0,
    ballScore: 0,
    payout: 0,
    respectEarned: 0,
    par: 240,
    active: false,
  },
  uiPulse: 0,
  bestGrade: null,
  bestRunScore: 0,
};

function formatHour(h: number) {
  const hr = Math.floor(h);
  const m = Math.floor((h - hr) * 60);
  const ap = hr >= 12 ? "PM" : "AM";
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ap}`;
}

const TABS: { id: PauseTab; label: string; icon: typeof Play }[] = [
  { id: "resume", label: "Resume", icon: Play },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "missions", label: "Missions", icon: Target },
  { id: "wardrobe", label: "Wardrobe", icon: Shirt },
  { id: "trophies", label: "Trophies", icon: Trophy },
  { id: "settings", label: "Settings", icon: Settings },
];

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(emptyHud);
  const [ready, setReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  const [titlePhase, setTitlePhase] = useState<"press" | "choose">("press");
  const [titleSettings, setTitleSettings] = useState(false);
  const [tip, setTip] = useState(TIPS[0]!);
  const stickRef = useRef<{ id: number | null; ox: number; oy: number }>({
    id: null,
    ox: 0,
    oy: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let eng: GameEngine;
    let cancelled = false;
    (async () => {
      try {
        eng = new GameEngine(canvas);
        engineRef.current = eng;
        eng.onHud = (h) => setHud({ ...h });
        eng.onLoad = (p) => setLoadPct(p);
        await eng.init();
        if (cancelled) {
          eng.destroy();
          return;
        }
        eng.startLoop();
        setReady(true);
        setHud(eng.getHud());
        setTip(TIPS[Math.floor(Math.random() * TIPS.length)]!);
      } catch (e) {
        setBootError(e instanceof Error ? e.message : "Failed to start");
      }
    })();
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const boot = useCallback((fresh: boolean) => {
    engineRef.current?.start(fresh);
    setHud((h) => ({ ...h, started: true }));
  }, []);

  useEffect(() => {
    if (hud.started || !ready) return;
    const go = (e: KeyboardEvent) => {
      if (e.code === "Tab" || e.code.startsWith("F")) return;
      if (titlePhase === "press") {
        setTitlePhase("choose");
        return;
      }
      if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") {
        boot(false);
      }
    };
    window.addEventListener("keydown", go);
    return () => window.removeEventListener("keydown", go);
  }, [hud.started, ready, titlePhase, boot]);

  const onBuy = useCallback((id: ApparelId) => {
    engineRef.current?.buyItem(id);
  }, []);

  const closeShop = useCallback(() => {
    engineRef.current?.closeShop();
  }, []);

  const advanceDialogue = useCallback(() => {
    engineRef.current?.advanceDialogue();
  }, []);

  const onStickStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    stickRef.current = {
      id: t.identifier,
      ox: rect.left + rect.width / 2,
      oy: rect.top + rect.height / 2,
    };
    e.preventDefault();
  };
  const onStickMove = (e: React.TouchEvent) => {
    const eng = engineRef.current;
    if (!eng) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== stickRef.current.id) continue;
      const dx = t.clientX - stickRef.current.ox;
      const dy = t.clientY - stickRef.current.oy;
      const max = 48;
      const len = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, len / max);
      eng.input.touch.mx = (dx / len) * s;
      eng.input.touch.my = (dy / len) * s;
    }
    e.preventDefault();
  };
  const onStickEnd = (e: React.TouchEvent) => {
    const eng = engineRef.current;
    if (!eng) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === stickRef.current.id) {
        eng.input.touch.mx = 0;
        eng.input.touch.my = 0;
        stickRef.current.id = null;
      }
    }
  };

  const lb = Math.max(0, Math.min(1, hud.letterbox));
  const bar = Math.round(52 * lb);

  return (
    <div key={ART_REV} className="relative h-full w-full overflow-hidden bg-bg text-fg select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ imageRendering: "auto" }}
        onClick={() => {
          if (hud.started && !hud.paused) canvasRef.current?.requestPointerLock?.();
        }}
      />

      {/* Letterbox */}
      {bar > 0 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-black" style={{ height: bar }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-black" style={{ height: bar }} />
        </>
      )}

      {/* Title */}
      {!hud.started && (
        <div
          className="absolute inset-0 z-40 flex flex-col"
          onPointerDown={() => {
            if (titlePhase === "press" && ready) setTitlePhase("choose");
          }}
        >
          <img
            src="/game/opening-title.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "68% 46%" }}
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/35" />
          <div className="absolute top-0 inset-x-0 h-8 bg-black" />
          <div className="absolute bottom-0 inset-x-0 h-8 bg-black" />

          <div className="relative z-10 flex h-full flex-col justify-between px-6 py-10 sm:px-12">
            <div>
              <p className="font-display text-primary text-xl tracking-[0.22em]">{BRAND.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.42em] text-gold">{BRAND.line}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-muted">A Memphis Open World</p>
            </div>

            <div className="max-w-lg">
              <h1 className="font-display text-6xl leading-[0.85] text-fg sm:text-8xl">{BRAND.city.toUpperCase()}</h1>
              <p className="mt-2 font-display text-3xl text-primary sm:text-4xl">{BRAND.zip}</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Play as Benji. Run Drop Day, ball the 901 Court, earn {BRAND.currency}, and re-up the fit.
              </p>

              {!ready && (
                <div className="mt-8 max-w-xs">
                  <p className="text-sm tracking-widest text-muted">LOADING MEMPHIS</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(loadPct * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-subtle">{Math.round(loadPct * 100)}%</p>
                </div>
              )}
              {ready && (
                <div className="mt-8 flex flex-col gap-2 max-w-xs">
                  <button
                    type="button"
                    onClick={() => boot(false)}
                    className="min-h-12 rounded-lg bg-primary px-6 font-display text-2xl text-primary-fg transition hover:brightness-110 active:scale-[0.98]"
                  >
                    ENTER MEMPHIS
                  </button>
                  {hud.hasSave && (
                    <button
                      type="button"
                      onClick={() => boot(false)}
                      className="min-h-11 rounded-lg border border-gold/50 bg-surface/70 px-6 font-display text-xl text-gold hover:bg-surface-2"
                    >
                      CONTINUE
                    </button>
                  )}
                  {hud.hasSave && (
                    <button
                      type="button"
                      onClick={() => boot(true)}
                      className="min-h-12 rounded-lg border border-border bg-surface/80 px-6 font-display text-2xl text-fg hover:bg-surface-2"
                    >
                      NEW GAME
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTitleSettings((v) => !v)}
                    className="min-h-10 rounded-lg border border-border/70 px-6 text-sm uppercase tracking-wider text-muted hover:text-fg"
                  >
                    Settings
                  </button>
                </div>
              )}
              {bootError && <p className="mt-3 text-sm text-danger">{bootError}</p>}
              {titleSettings && ready && (
                <div className="mt-4 max-w-xs rounded-xl border border-border bg-panel p-3">
                  <PauseSettings
                    settings={hud.settings}
                    onChange={(s) => engineRef.current?.applySettings(s)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-sm text-[11px] leading-relaxed text-subtle">{tip}</p>
              <div className="hidden text-[11px] text-subtle sm:block">
                WASD move · {hud.promptButton} talk · Shift run · Esc pause · Pad supported
              </div>
            </div>
          </div>
        </div>
      )}

      {hud.started && (
        <>
          {/* Top HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm"
                style={{ transform: hud.uiPulse > 0.15 ? `scale(${1 + hud.uiPulse * 0.06})` : undefined }}
              >
                <img src="/game/sack-icon.png" alt="" className="h-7 w-7" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">$ackdollars</p>
                  <p className="tabular font-display text-2xl leading-none text-gold">${hud.sackdollars}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Respect</p>
                  <p className="tabular font-display text-xl leading-none text-gold">{hud.respect}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">901</p>
                  <p className="tabular text-xs font-medium text-fg">{formatHour(hud.worldHour)}</p>
                </div>
              </div>
            </div>

            <div className="max-w-[15rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">{hud.missionChapter}</p>
              <p className="font-display text-lg leading-none text-gold">{hud.missionTitle}</p>
              <p className="mt-1 text-sm font-medium leading-snug text-fg">{hud.missionStep}</p>
              <p className="mt-1 text-xs text-muted tabular">{hud.missionProgress}</p>
              {(hud.dropRun.active || hud.dropRun.points > 0) && !hud.missionComplete && (
                <p className="mt-1 text-[11px] tabular text-primary">
                  RUN {hud.dropRun.run} · {formatRunClock(hud.dropRun.time)} · {hud.dropRun.points}
                  {hud.dropRun.combo > 1 ? ` · x${hud.dropRun.combo}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute left-3 top-[9.6rem] z-20 sm:top-[10.6rem]">
            <div className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted backdrop-blur-sm">
              <span className="text-fg">{hud.locationName}</span>
              <span className="mx-1.5 text-subtle">/</span>
              {hud.district}
            </div>
          </div>

          {hud.interactHint && hud.mode === "world" && !hud.cinematic && (
            <div className="pointer-events-none absolute left-1/2 top-[44%] z-20 -translate-x-1/2">
              <div
                className="flex items-center gap-2 rounded-full border border-primary/35 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm"
                style={{ transform: hud.uiPulse > 0.1 ? `scale(${1 + hud.uiPulse * 0.08})` : undefined }}
              >
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1.5 font-display text-sm text-primary-fg">
                  {hud.promptButton}
                </span>
                {hud.interactHint}
              </div>
            </div>
          )}

          {hud.toast && !hud.cinematic && (
            <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2">
              <div className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl">
                {hud.toast}
              </div>
            </div>
          )}

          {/* Trophy pop */}
          {hud.trophyPopup && (
            <div className={`pointer-events-none absolute z-40 ${hud.basketball ? "left-3 top-[13.5rem]" : "right-3 top-28 sm:top-32"}`}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 shadow-2xl backdrop-blur-md">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Trophy unlocked</p>
                  <p className="text-sm font-medium text-fg">{hud.trophyPopup.name}</p>
                  <p className="text-[10px] capitalize text-primary">{hud.trophyPopup.rank}</p>
                </div>
              </div>
            </div>
          )}

          {hud.basketball && (
            <div className="pointer-events-none absolute right-3 top-28 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm">
              <p className="font-display text-lg text-primary">901 COURT</p>
              <p className="tabular text-3xl font-semibold leading-none text-fg">{hud.basketball.score}</p>
              <p className="mt-1 text-xs text-muted">
                {hud.basketball.timeLeft}s · {hud.basketball.shots} shots · need {hud.basketball.target}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gold">
                {hud.basketball.zone} · {hud.basketball.perfects} perfect
              </p>
              {hud.basketball.combo > 1 && (
                <p className="mt-1 font-display text-xl text-primary">x{hud.basketball.combo} STREAK</p>
              )}
              <button
                type="button"
                className="pointer-events-auto mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted"
                onClick={() => engineRef.current?.exitBasketball()}
              >
                Leave court
              </button>
            </div>
          )}

          {hud.started && !hud.paused && (
            <button
              type="button"
              className="absolute left-3 bottom-24 z-20 flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-xs text-fg backdrop-blur-sm sm:bottom-3"
              onClick={() => engineRef.current?.toggleView()}
            >
              <SwitchCamera className="h-4 w-4 text-gold" />
              {hud.cameraView === "first" ? "First person" : "Third person"}
            </button>
          )}

          {/* Cinematic card */}
          {hud.cinematic && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-start p-8 sm:p-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary">{hud.cinematic.subtitle}</p>
                <h2 className="font-display mt-1 text-5xl text-fg sm:text-6xl">{hud.cinematic.title}</h2>
              </div>
            </div>
          )}

          {/* Dialogue */}
          {hud.dialogue && (
            <div
              className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              role="dialog"
            >
              <button
                type="button"
                onClick={advanceDialogue}
                className="w-full max-w-2xl rounded-2xl border border-border bg-panel p-4 text-left shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  {hud.dialogue.speaker === "K Blanco" && (
                    <img
                      src="/game/k-blanco-portrait.png"
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {hud.dialogue.speaker}
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-fg">{hud.dialogue.text}</p>
                    <p className="mt-3 text-xs text-muted">{hud.promptButton} continue</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Shop */}
          {hud.shopOpen && (
            <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 p-3 backdrop-blur-sm sm:items-center">
              <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
                <div className="relative h-28 shrink-0 overflow-hidden sm:h-36">
                  <img
                    src="/game/featured-products.png"
                    alt=""
                    className="h-full w-full object-cover object-center"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl text-primary">HQ SHOP</p>
                      <p className="text-xs text-muted">In the $ack, we trust</p>
                    </div>
                    <p className="tabular font-display text-2xl text-gold">${hud.sackdollars}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid gap-2">
                    {APPAREL.map((item) => {
                      const owned = hud.owned.includes(item.id);
                      const eq = hud.equipped === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3"
                        >
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: item.color }}
                          >
                            <span className="font-display text-lg text-white/90">
                              {item.category === "hat" ? "CAP" : item.category === "chain" ? "$" : "SR"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-fg">{item.name}</p>
                            <p className="truncate text-xs text-muted">{item.description}</p>
                          </div>
                          <button
                            type="button"
                            data-testid={`buy-${item.id}`}
                            onClick={() => onBuy(item.id)}
                            className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
                              eq
                                ? "bg-primary/20 text-primary"
                                : owned
                                  ? "border border-border bg-surface text-fg"
                                  : "bg-primary text-primary-fg"
                            }`}
                          >
                            {eq ? "On" : owned ? "Equip" : `$${item.price}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-border p-3">
                  <button
                    type="button"
                    onClick={closeShop}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-2 font-medium text-fg"
                  >
                    Back to streets
                  </button>
                </div>
              </div>
            </div>
          )}

          {hud.dropRun.recap && !hud.cinematic && !hud.shopOpen && (
            <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/65 p-3 backdrop-blur-sm sm:items-center">
              <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Drop Day · Run {hud.dropRun.run}</p>
                <p className="font-display mt-1 text-6xl leading-none text-gold">{hud.dropRun.grade ?? "D"}</p>
                <p className="mt-1 text-sm text-muted">Play better, earn more, look fresher.</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Time</dt>
                    <dd className="tabular font-medium text-fg">{formatRunClock(hud.dropRun.time)}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Score</dt>
                    <dd className="tabular font-medium text-fg">{hud.dropRun.points}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Deliveries</dt>
                    <dd className="tabular font-medium text-fg">{hud.dropRun.deliveries}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Best combo</dt>
                    <dd className="tabular font-medium text-fg">{hud.dropRun.bestCombo}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Court</dt>
                    <dd className="tabular font-medium text-fg">
                      {hud.dropRun.ballScore} · {hud.dropRun.ballPerfects} perfect
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Payout</dt>
                    <dd className="tabular font-medium text-gold">
                      +${hud.dropRun.payout} · +{hud.dropRun.respectEarned} respect
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.replayDrop()}
                    className="min-h-11 rounded-xl bg-primary font-display text-2xl text-primary-fg"
                  >
                    RUN IT BACK
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.dismissRecap()}
                    className="min-h-11 rounded-xl border border-border bg-surface-2 font-medium text-fg"
                  >
                    Keep roaming
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile controls */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
            <div
              className="relative h-28 w-28 touch-none rounded-full border border-border bg-panel/80 backdrop-blur-sm"
              onTouchStart={onStickStart}
              onTouchMove={onStickMove}
              onTouchEnd={onStickEnd}
              onTouchCancel={onStickEnd}
            >
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/20" />
              <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted">MOVE</span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.input.touch.lookX = -1;
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.input.touch.lookX = 0;
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.input.touch.lookX = 1;
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.input.touch.lookX = 0;
                  }}
                >
                  →
                </button>
              </div>
              {hud.mode === "basketball" ? (
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-fg shadow-lg active:scale-95"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const eng = engineRef.current;
                    if (!eng) return;
                    eng.input.touch.shoot = true;
                    eng.beginCharge();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    const eng = engineRef.current;
                    if (!eng) return;
                    eng.input.touch.shoot = false;
                    eng.releaseShot();
                  }}
                >
                  SHOOT
                </button>
              ) : (
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-fg shadow-lg active:scale-95"
                  onClick={() => engineRef.current?.tryInteract()}
                >
                  {hud.promptButton}
                </button>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block">
            WASD · Q/R look · V camera · {hud.promptButton} · Space
          </div>

          {/* Pause */}
          {hud.paused && (
            <div className="absolute inset-0 z-50 flex items-stretch bg-bg/80 backdrop-blur-md">
              <img
                src="/game/memphis-dusk.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25"
                crossOrigin="anonymous"
              />
              <div className="relative flex w-full max-w-5xl mx-auto">
                <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-border p-4 sm:w-56">
                  <p className="mb-3 font-display text-2xl text-primary">PAUSED</p>
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const on = hud.pauseTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (t.id === "resume") engineRef.current?.resume();
                          else engineRef.current?.setPauseTab(t.id);
                        }}
                        className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${
                          on ? "bg-primary text-primary-fg" : "text-fg hover:bg-surface-2"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </nav>
                <div className="min-w-0 flex-1 overflow-y-auto p-5">
                  {hud.pauseTab === "map" && <PauseMap district={hud.locationName} />}
                  {hud.pauseTab === "missions" && (
                    <PauseMissions
                      chapter={hud.missionChapter}
                      title={hud.missionTitle}
                      steps={hud.steps}
                      sides={hud.sideMissions}
                      dropRun={hud.dropRun}
                      bestGrade={hud.bestGrade}
                      onReplay={() => engineRef.current?.replayDrop()}
                    />
                  )}
                  {hud.pauseTab === "wardrobe" && (
                    <PauseWardrobe owned={hud.owned} equipped={hud.equipped} onEquip={onBuy} />
                  )}
                  {hud.pauseTab === "trophies" && <PauseTrophies unlocked={hud.trophies} />}
                  {hud.pauseTab === "settings" && (
                    <PauseSettings
                      settings={hud.settings}
                      onChange={(p) => engineRef.current?.applySettings(p)}
                    />
                  )}
                  {hud.pauseTab === "resume" && (
                    <div className="flex h-full flex-col justify-center">
                      <p className="font-display text-5xl text-fg">MEMPHIS</p>
                      <p className="mt-2 text-sm text-muted">
                        {hud.locationName} · {formatHour(hud.worldHour)} · High score {hud.highScore}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PauseMap({ district }: { district: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted">City map · {district}</p>
      <p className="font-display text-3xl text-fg">MEMPHIS 901</p>
      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-2">
        {POIS.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${(p.x / (64 * 48)) * 100}%`, top: `${(p.y / (48 * 48)) * 100}%` }}
          >
            <div className="mx-auto h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="mt-0.5 text-[9px] uppercase tracking-wide text-fg">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PauseMissions({
  chapter,
  title,
  steps,
  sides,
  dropRun,
  bestGrade,
  onReplay,
}: {
  chapter: string;
  title: string;
  steps: HudSnapshot["steps"];
  sides: HudSnapshot["sideMissions"];
  dropRun: HudSnapshot["dropRun"];
  bestGrade: HudSnapshot["bestGrade"];
  onReplay: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-primary">{chapter}</p>
      <p className="font-display text-3xl text-fg">{title}</p>
      <p className="mt-1 text-xs text-muted">
        Run {dropRun.run} · best grade {bestGrade ?? "—"} · {dropRun.points} pts
      </p>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className={`rounded-lg border px-3 py-2 ${
              s.done ? "border-border bg-surface-2 text-muted" : "border-primary/30 bg-surface text-fg"
            }`}
          >
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-muted">{s.description}</p>
          </li>
        ))}
      </ul>
      {steps.every((s) => s.done) && (
        <button
          type="button"
          onClick={onReplay}
          className="mt-4 min-h-11 w-full rounded-xl bg-primary font-display text-xl text-primary-fg"
        >
          RUN IT BACK
        </button>
      )}
      <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">Side jobs</p>
      <ul className="mt-2 space-y-2">
        {sides.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <div>
              <p className={`text-sm font-medium ${s.done ? "text-muted" : "text-fg"}`}>{s.title}</p>
              <p className="text-xs text-muted">{s.description}</p>
            </div>
            <p className="tabular text-xs text-primary">{s.done ? "DONE" : `$${s.reward}`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PauseWardrobe({
  owned,
  equipped,
  onEquip,
}: {
  owned: ApparelId[];
  equipped: ApparelId | null;
  onEquip: (id: ApparelId) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted">Locker</p>
      <p className="font-display text-3xl text-fg">WARDROBE</p>
      <div className="mt-4 grid gap-2">
        {APPAREL.filter((a) => owned.includes(a.id)).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onEquip(a.id)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left ${
              equipped === a.id ? "border-primary bg-primary/10" : "border-border bg-surface-2"
            }`}
          >
            <span className="text-sm font-medium text-fg">{a.name}</span>
            <span className="text-xs text-muted">{equipped === a.id ? "Equipped" : "Equip"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PauseTrophies({ unlocked }: { unlocked: string[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted">
        {unlocked.length}/{TROPHIES.length} unlocked
      </p>
      <p className="font-display text-3xl text-fg">TROPHIES</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {TROPHIES.map((t) => {
          const on = unlocked.includes(t.id);
          return (
            <li
              key={t.id}
              className={`rounded-lg border px-3 py-2 ${on ? "border-primary/40 bg-surface" : "border-border bg-surface-2 opacity-60"}`}
            >
              <p className="text-sm font-medium text-fg">{t.name}</p>
              <p className="text-xs text-muted">{t.description}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-primary">{t.rank}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PauseSettings({
  settings,
  onChange,
}: {
  settings: HudSnapshot["settings"];
  onChange: (p: Partial<HudSnapshot["settings"]>) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted">Audio and feel</p>
      <p className="font-display text-3xl text-fg">SETTINGS</p>
      <div className="mt-5 max-w-md space-y-5">
        {(
          [
            ["master", "Master"],
            ["music", "Music"],
            ["sfx", "Effects"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
              <Volume2 className="h-3.5 w-3.5" />
              {label}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings[key]}
              onChange={(e) => onChange({ [key]: Number(e.target.value) })}
              className="mt-2 w-full accent-primary"
            />
          </label>
        ))}
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          Camera shake
          <input
            type="checkbox"
            checked={settings.shake}
            onChange={(e) => onChange({ shake: e.target.checked })}
            className="accent-primary"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          Controller rumble
          <input
            type="checkbox"
            checked={settings.rumble}
            onChange={(e) => onChange({ rumble: e.target.checked })}
            className="accent-primary"
          />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          Camera
          <div className="flex gap-1">
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${settings.cameraView === "third" ? "bg-primary text-primary-fg" : "text-muted"}`}
              onClick={() => onChange({ cameraView: "third" })}
            >
              Third
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${settings.cameraView === "first" ? "bg-primary text-primary-fg" : "text-muted"}`}
              onClick={() => onChange({ cameraView: "first" })}
            >
              First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
