import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapIcon, Target, Shirt, Trophy, Settings, Play, Volume2 } from "lucide-react";
import { GameEngine } from "./engine";
import { CityMap } from "./CityMap";
import { TouchControls } from "./TouchControls";
import { UpgradeHUD } from "./UpgradeHUD";
import { APPAREL, ART_REV, BRAND, DEFAULT_SETTINGS, TROPHIES, TIPS } from "./data";
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
  settings: { ...DEFAULT_SETTINGS },
  sideMissions: [],
  highScore: 0,
  hasSave: false,
  cameraView: "third",
  steps: [],
  position: { x: 288, y: 558, yaw: 0 },
  objective: null,
  waypoint: null,
  visited: [],
  driving: false,
  speed: 0,
  vehicleAvailable: false,
  saveStatus: "new",
  courtResult: null,
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
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const modal = document.querySelector<HTMLElement>('[aria-modal="true"]');
    if (!modal) {
      if (hud.started && !hud.dialogue) canvasRef.current?.focus({ preventScroll: true });
      return;
    }
    const elements = () => [
      ...modal.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]'),
    ];
    elements()[0]?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.code === "Escape" && (titleSettings || confirmReset)) {
        event.preventDefault();
        setTitleSettings(false);
        setConfirmReset(false);
      }
      if (event.key !== "Tab") return;
      const focusable = elements(),
        first = focusable[0],
        last = focusable.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [titleSettings, confirmReset, hud.paused, hud.shopOpen, hud.started, hud.dialogue]);

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
      if (
        titleSettings ||
        confirmReset ||
        e.repeat ||
        (e.target instanceof HTMLElement && e.target.matches("button,input,select"))
      )
        return;
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
  }, [hud.started, ready, titlePhase, boot, titleSettings, confirmReset]);

  const onBuy = useCallback((id: ApparelId) => {
    engineRef.current?.buyItem(id);
  }, []);

  const closeShop = useCallback(() => {
    engineRef.current?.closeShop();
  }, []);

  const advanceDialogue = useCallback(() => {
    engineRef.current?.advanceDialogue();
  }, []);

  const lb = Math.max(0, Math.min(1, hud.letterbox));
  const bar = Math.round(52 * lb);

  return (
    <div
      key={ART_REV}
      className="game-shell relative h-full w-full overflow-hidden bg-bg text-fg select-none"
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Memphis game world. WASD to move, E to interact, M for map."
        className="absolute inset-0 h-full w-full touch-none"
        style={{ imageRendering: "auto" }}
        onClick={() => {
          if (
            hud.started &&
            !hud.paused &&
            !hud.cinematic &&
            (hud.mode === "world" || hud.mode === "basketball") &&
            !window.matchMedia("(pointer:coarse)").matches
          ) {
            try {
              canvasRef.current
                ?.requestPointerLock?.()
                ?.catch(() =>
                  engineRef.current?.showToast("Hold right mouse to look, or use Q/R."),
                );
            } catch {
              /* optional */
            }
          }
        }}
      />

      {/* Letterbox */}
      {bar > 0 && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-black"
            style={{ height: bar }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-black"
            style={{ height: bar }}
          />
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

          <div className="title-layout relative z-10 flex h-full flex-col justify-between px-6 py-10 sm:px-12">
            <div>
              <p className="font-display text-primary text-xl tracking-[0.22em]">{BRAND.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.42em] text-gold">{BRAND.line}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-muted">
                A Memphis Open World
              </p>
            </div>

            <div className="max-w-lg">
              <h1 className="font-display text-6xl leading-[0.85] text-fg sm:text-8xl">
                {BRAND.city.toUpperCase()}
              </h1>
              <p className="mt-2 font-display text-3xl text-primary sm:text-4xl">{BRAND.zip}</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Play as Benji. Run Drop Day, ball the 901 Court, earn {BRAND.currency}, and re-up
                the fit.
              </p>

              {!ready && (
                <div className="mt-8 max-w-xs">
                  <p className="text-sm tracking-widest text-muted">LOADING MEMPHIS</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(loadPct * 100)}%` }}
                    />
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
                      onClick={() => setConfirmReset(true)}
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

      {titleSettings && ready && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Game settings">
          <div className="settings-dialog">
            <PauseSettings
              settings={hud.settings}
              onChange={(p) => engineRef.current?.applySettings(p)}
            />
            <button className="primary-button mt-5 w-full" onClick={() => setTitleSettings(false)}>
              Done
            </button>
          </div>
        </div>
      )}
      {confirmReset && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label="Start a new game"
        >
          <div className="settings-dialog">
            <h2 className="font-display text-3xl">START FRESH?</h2>
            <p className="mt-3 text-sm text-muted">
              This replaces your saved progress, money, clothing and records.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                autoFocus
                className="secondary-button flex-1"
                onClick={() => setConfirmReset(false)}
              >
                Keep my save
              </button>
              <button
                className="primary-button flex-1"
                onClick={() => {
                  setConfirmReset(false);
                  boot(true);
                }}
              >
                Start new game
              </button>
            </div>
          </div>
        </div>
      )}
      {hud.started && (
        <>
          {/* Top HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm">
                <img src="/game/sack-icon.png" alt="" className="h-7 w-7" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">$ackdollars</p>
                  <p className="tabular font-display text-2xl leading-none text-gold">
                    ${hud.sackdollars}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Respect</p>
                  <p className="tabular font-display text-xl leading-none text-gold">
                    {hud.respect}
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">901</p>
                  <p className="tabular text-xs font-medium text-fg">{formatHour(hud.worldHour)}</p>
                </div>
              </div>
            </div>

            {!hud.basketball && (
              <div className="max-w-[15rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  {hud.missionChapter}
                </p>
                <p className="font-display text-lg leading-none text-gold">{hud.missionTitle}</p>
                <p className="mt-1 text-sm font-medium leading-snug text-fg">{hud.missionStep}</p>
                <p className="mt-1 text-xs text-muted tabular">{hud.missionProgress} objectives</p>
                <div className="mission-meter">
                  <span
                    style={{
                      width: `${(Number(hud.missionProgress.split("/")[0]) / Math.max(1, Number(hud.missionProgress.split("/")[1]))) * 100}%`,
                    }}
                  />
                </div>
                {hud.objective && (
                  <p className="mt-2 text-xs text-primary">
                    {hud.waypoint ? "WAYPOINT" : "DESTINATION"} · {hud.objective.distance}m
                  </p>
                )}
              </div>
            )}
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
              <div className="flex items-center gap-2 rounded-full border border-primary/35 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1.5 font-display text-sm text-primary-fg">
                  {hud.promptButton}
                </span>
                {hud.interactHint}
              </div>
            </div>
          )}

          {hud.toast && !hud.cinematic && (
            <div
              role="status"
              aria-live="polite"
              className="game-toast pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
            >
              <div className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl">
                {hud.toast}
              </div>
            </div>
          )}

          {/* Trophy pop */}
          {hud.trophyPopup && (
            <div
              className={`pointer-events-none absolute z-40 ${hud.basketball ? "left-3 top-[13.5rem]" : "right-3 top-28 sm:top-32"}`}
            >
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
            <div className="basketball-panel pointer-events-none absolute right-3 top-3 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm">
              <p className="font-display text-lg text-primary">901 COURT</p>
              <p className="tabular text-3xl font-semibold leading-none text-fg">
                {hud.basketball.score}
              </p>
              <p className="mt-1 text-xs text-muted">
                {hud.basketball.timeLeft}s · {hud.basketball.shots} shots · need 8
              </p>
              <p className="mt-2 text-xs text-primary">
                {hud.basketball.held
                  ? "Hold Space / SHOOT, release in green"
                  : "Rebound returning…"}
              </p>
              <div className="shot-meter">
                <span className="green-window" />
                <span className="shot-cursor" style={{ left: `${hud.basketball.power * 100}%` }} />
              </div>
              <button
                className="secondary-button pointer-events-auto mt-2 w-full"
                onClick={() => {
                  const e = engineRef.current;
                  if (e) {
                    const h = e.hoop();
                    e.yaw = Math.atan2(e.px - h.x, e.py - h.y);
                    e.canvas.focus();
                  }
                }}
              >
                Face hoop
              </button>
              {hud.basketball.combo > 1 && (
                <p className="mt-1 font-display text-xl text-primary">
                  x{hud.basketball.combo} STREAK
                </p>
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

          {engineRef.current && !hud.paused && <UpgradeHUD engine={engineRef.current} hud={hud} />}

          {/* Cinematic card */}
          {hud.cinematic && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-start p-8 sm:p-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
                  {hud.cinematic.subtitle}
                </p>
                <h2 className="font-display mt-1 text-5xl text-fg sm:text-6xl">
                  {hud.cinematic.title}
                </h2>
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
            <div
              role="dialog"
              aria-modal="true"
              aria-label="HQ apparel shop"
              className="absolute inset-0 z-40 flex items-end justify-center bg-bg/70 p-3 backdrop-blur-sm sm:items-center"
            >
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
                              {item.category === "hat"
                                ? "CAP"
                                : item.category === "chain"
                                  ? "$"
                                  : "SR"}
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
                            disabled={eq || (!owned && hud.sackdollars < item.price)}
                            className={`disabled:opacity-45 disabled:cursor-not-allowed min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
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

          {engineRef.current &&
            !hud.paused &&
            !hud.cinematic &&
            (hud.mode === "world" || hud.mode === "basketball") && (
              <TouchControls engine={engineRef.current} hud={hud} />
            )}

          <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block">
            {hud.driving
              ? "W/S drive · A/D steer · Space brake · G exit"
              : "WASD move · Shift sprint · Q/R look · E interact · M map"}
          </div>

          {/* Pause */}
          {hud.paused && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pause menu"
              className="absolute inset-0 z-50 flex items-stretch bg-bg/80 backdrop-blur-md"
            >
              <img
                src="/game/memphis-dusk.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25"
                crossOrigin="anonymous"
              />
              <div className="pause-layout relative flex w-full max-w-5xl mx-auto">
                <nav className="pause-nav flex w-44 shrink-0 flex-col gap-1 border-r border-border p-4 sm:w-56">
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
                  {hud.pauseTab === "map" && (
                    <CityMap hud={hud} onWaypoint={(id) => engineRef.current?.setWaypoint(id)} />
                  )}
                  {hud.pauseTab === "missions" && (
                    <PauseMissions
                      chapter={hud.missionChapter}
                      title={hud.missionTitle}
                      steps={hud.steps}
                      sides={hud.sideMissions}
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
                        {hud.locationName} · {formatHour(hud.worldHour)} · High score{" "}
                        {hud.highScore}
                      </p>
                      <p className="mt-4 text-xs text-muted">
                        {hud.saveStatus === "unavailable"
                          ? "Saving unavailable in this browser"
                          : hud.saveStatus === "saved"
                            ? "Progress saved on this device"
                            : "Progress saves as you play"}
                      </p>
                      <div className="mt-6 grid max-w-sm gap-3">
                        <button
                          className="primary-button"
                          onClick={() => engineRef.current?.resume()}
                        >
                          Resume game
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => engineRef.current?.recoverPlayer()}
                        >
                          Return to apartment
                        </button>
                      </div>
                      <div className="controls-guide mt-6">
                        <p className="eyebrow">CONTROLS</p>
                        <p>WASD / arrows — move · Shift — sprint</p>
                        <p>E — interact · Q/R or right-drag — look</p>
                        <p>M — map · V — camera · Esc — pause</p>
                        <p>G — enter / exit van · Space — brake or shoot</p>
                      </div>
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

function PauseMissions({
  chapter,
  title,
  steps,
  sides,
}: {
  chapter: string;
  title: string;
  steps: HudSnapshot["steps"];
  sides: HudSnapshot["sideMissions"];
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-primary">{chapter}</p>
      <p className="font-display text-3xl text-fg">{title}</p>
      <ul className="mt-4 space-y-2">
        {steps.map((s, index) => (
          <li
            key={s.id}
            className={`rounded-lg border px-3 py-2 ${
              s.done
                ? "border-border bg-surface-2 text-muted"
                : "border-primary/30 bg-surface text-fg"
            }`}
          >
            <p className="text-sm font-medium">
              {s.done ? "✓ " : index === steps.findIndex((step) => !step.done) ? "→ " : ""}
              {s.label}
            </p>
            <p className="text-xs text-muted">{s.description}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">Side jobs</p>
      <ul className="mt-2 space-y-2">
        {sides.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
          >
            <div>
              <p className={`text-sm font-medium ${s.done ? "text-muted" : "text-fg"}`}>
                {s.title}
              </p>
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
        <label className="block text-sm text-muted">
          Graphics quality
          <select
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 p-3 text-fg"
            value={settings.quality}
            onChange={(e) => onChange({ quality: e.target.value as "low" | "high" })}
          >
            <option value="high">High · shadows and sharper detail</option>
            <option value="low">Performance · lighter on your device</option>
          </select>
        </label>
        <label className="block text-sm text-muted">
          Look sensitivity · {settings.sensitivity.toFixed(2)}×
          <input
            aria-label="Look sensitivity"
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={settings.sensitivity}
            onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
            className="mt-2 w-full accent-primary"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-3 text-sm">
          Always show touch controls
          <input
            type="checkbox"
            checked={settings.showTouch}
            onChange={(e) => onChange({ showTouch: e.target.checked })}
          />
        </label>
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
