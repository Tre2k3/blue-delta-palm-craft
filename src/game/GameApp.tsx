import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "./engine";
import { APPAREL } from "./data";
import type { ApparelId, HudSnapshot } from "./types";

const emptyHud: HudSnapshot = {
  mode: "menu",
  sackdollars: 0,
  respect: 0,
  missionTitle: "",
  missionStep: "",
  missionProgress: "0/0",
  interactHint: null,
  locationName: "Memphis",
  dialogue: null,
  shopOpen: false,
  toast: null,
  equipped: null,
  owned: [],
  basketball: null,
  paused: false,
  started: false,
  missionComplete: false,
};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(emptyHud);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
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
        await eng.init();
        if (cancelled) {
          eng.destroy();
          return;
        }
        eng.startLoop();
        setReady(true);
        setHud(eng.getHud());
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

  const onStart = useCallback(() => {
    engineRef.current?.start();
    setHud((h) => ({ ...h, started: true }));
  }, []);

  const onBuy = useCallback((id: ApparelId) => {
    engineRef.current?.buyItem(id);
  }, []);

  const closeShop = useCallback(() => {
    engineRef.current?.closeShop();
  }, []);

  const advanceDialogue = useCallback(() => {
    engineRef.current?.advanceDialogue();
  }, []);

  // Mobile stick
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
      eng.touch.mx = (dx / len) * s;
      eng.touch.my = (dy / len) * s;
    }
    e.preventDefault();
  };
  const onStickEnd = (e: React.TouchEvent) => {
    const eng = engineRef.current;
    if (!eng) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === stickRef.current.id) {
        eng.touch.mx = 0;
        eng.touch.my = 0;
        stickRef.current.id = null;
      }
    }
  };

  const onInteractTouch = () => {
    engineRef.current?.tryInteract();
  };

  const onShootStart = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.touch.shoot = true;
    eng.beginCharge();
  };
  const onShootEnd = () => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.touch.shoot = false;
    eng.releaseShot();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-fg select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ imageRendering: "auto" }}
      />

      {/* Start screen */}
      {!hud.started && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg/95 px-5">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <img
              src="/game/store-welcome.jpg"
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/40" />
          </div>
          <div className="relative z-10 flex max-w-md flex-col items-center text-center">
            <img
              src="/game/benji-front-norm.png"
              alt="Benji"
              className="mb-4 h-40 w-auto drop-shadow-2xl"
              crossOrigin="anonymous"
            />
            <p className="font-display text-primary text-xl tracking-[0.2em]">SACKRELIGIOUS</p>
            <h1 className="font-display mt-1 text-5xl leading-none text-fg sm:text-6xl">
              MEMPHIS
            </h1>
            <p className="mt-1 font-display text-3xl text-muted">OPEN WORLD</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Play as Benji. Run Drop Day missions across Memphis, ball up at the 901 Court, earn
              $ackdollars, and re-up the fit at HQ.
            </p>
            <button
              type="button"
              onClick={onStart}
              disabled={!ready}
              className="mt-8 min-h-12 rounded-xl bg-primary px-10 py-3 font-display text-2xl tracking-wide text-primary-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {ready ? "ENTER MEMPHIS" : "LOADING…"}
            </button>
            {bootError && <p className="mt-3 text-sm text-danger">{bootError}</p>}
            <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-2 text-left text-xs text-muted">
              <div className="rounded-lg border border-border bg-surface/80 p-3">
                <p className="font-medium text-fg">Move</p>
                <p className="mt-1">WASD / stick</p>
              </div>
              <div className="rounded-lg border border-border bg-surface/80 p-3">
                <p className="font-medium text-fg">Interact</p>
                <p className="mt-1">E / Space / button</p>
              </div>
              <div className="rounded-lg border border-border bg-surface/80 p-3">
                <p className="font-medium text-fg">Run</p>
                <p className="mt-1">Hold Shift</p>
              </div>
              <div className="rounded-lg border border-border bg-surface/80 p-3">
                <p className="font-medium text-fg">Shop</p>
                <p className="mt-1">E at HQ</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      {hud.started && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm">
                <img src="/game/sack-icon.png" alt="" className="h-7 w-7" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">$ackdollars</p>
                  <p className="tabular font-display text-2xl leading-none text-primary">
                    ${hud.sackdollars}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted">Respect</p>
                <p className="tabular font-display text-xl leading-none text-fg">{hud.respect}</p>
              </div>
            </div>

            <div className="max-w-[14rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs">
              <p className="text-[10px] uppercase tracking-wider text-primary">{hud.missionTitle}</p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-fg">{hud.missionStep}</p>
              <p className="mt-1 text-xs text-muted tabular">{hud.missionProgress}</p>
            </div>
          </div>

          <div className="pointer-events-none absolute left-3 top-[9.5rem] z-20 sm:top-[10.5rem]">
            <div className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted backdrop-blur-sm">
              {hud.locationName}
            </div>
          </div>

          {hud.interactHint && hud.mode === "world" && (
            <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2">
              <div className="rounded-full border border-primary/40 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary font-display text-sm text-primary-fg">
                  E
                </span>
                {hud.interactHint}
              </div>
            </div>
          )}

          {hud.toast && (
            <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2">
              <div className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl">
                {hud.toast}
              </div>
            </div>
          )}

          {hud.basketball && (
            <div className="pointer-events-none absolute right-3 top-28 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm">
              <p className="font-display text-lg text-primary">901 COURT</p>
              <p className="tabular text-2xl font-semibold text-fg">{hud.basketball.score} pts</p>
              <p className="text-xs text-muted">
                {hud.basketball.timeLeft}s · {hud.basketball.shots} shots · need 8
              </p>
              <button
                type="button"
                className="pointer-events-auto mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted"
                onClick={() => engineRef.current?.exitBasketball()}
              >
                Leave court
              </button>
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
                className="w-full max-w-xl rounded-2xl border border-border bg-panel p-4 text-left shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  {hud.dialogue.speaker === "K Blanco" && (
                    <img
                      src="/game/k-blanco-portrait.png"
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {hud.dialogue.speaker}
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-fg">{hud.dialogue.text}</p>
                    <p className="mt-3 text-xs text-muted">Tap to continue</p>
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
                    <p className="tabular font-display text-2xl text-fg">${hud.sackdollars}</p>
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

          {/* Mission complete banner */}
          {hud.missionComplete && hud.mode === "world" && (
            <div className="pointer-events-none absolute left-1/2 top-1/3 z-20 -translate-x-1/2">
              <div className="rounded-2xl border border-primary/40 bg-panel px-6 py-4 text-center shadow-2xl backdrop-blur-md">
                <p className="font-display text-3xl text-primary">DROP DAY COMPLETE</p>
                <p className="mt-1 text-sm text-muted">Keep ballin' · keep building the brand</p>
              </div>
            </div>
          )}

          {/* Mobile controls */}
          <div className="absolute inset-x-0 bottom-0 z-25 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
            <div
              className="relative h-28 w-28 touch-none rounded-full border border-border bg-panel/80 backdrop-blur-sm"
              onTouchStart={onStickStart}
              onTouchMove={onStickMove}
              onTouchEnd={onStickEnd}
              onTouchCancel={onStickEnd}
            >
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/20" />
              <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted">
                MOVE
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {hud.mode === "basketball" ? (
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-fg shadow-lg active:scale-95"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onShootStart();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onShootEnd();
                  }}
                  onMouseDown={onShootStart}
                  onMouseUp={onShootEnd}
                  onMouseLeave={onShootEnd}
                >
                  SHOOT
                </button>
              ) : (
                <button
                  type="button"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-fg shadow-lg active:scale-95"
                  onClick={onInteractTouch}
                >
                  E
                </button>
              )}
            </div>
          </div>

          {/* Desktop help */}
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block">
            WASD move · E interact · Shift run · Esc pause
          </div>

          {hud.paused && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <p className="font-display text-4xl text-fg">PAUSED</p>
                <p className="mt-2 text-sm text-muted">Press Esc to resume</p>
                <button
                  type="button"
                  className="mt-6 min-h-11 rounded-xl bg-primary px-8 font-display text-xl text-primary-fg"
                  onClick={() => {
                    if (engineRef.current) engineRef.current.paused = false;
                    setHud((h) => ({ ...h, paused: false }));
                  }}
                >
                  RESUME
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
