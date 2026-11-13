import { useEffect, useRef } from "react";
import type { HudState } from "../core/types";
import type { Game } from "../game";
import { BLASTERS } from "../play/lasertag";
import { Sheet } from "./Menus";

const ART = "/game-v2/kit/blasters";
/** Down the sights, each blaster's drawing: how tall it stands on the screen, and how far down it its sight is. */
const SIGHTS: Record<string, [number, number]> = { pulse: [58, 0.115], scatter: [58, 0.1], marksman: [70, 0.27] };
const TONE = ["#39ff14", "#ff5ad1"] as const;

/**
 * Laser tag through Benji's eyes: the blaster in his hands at the bottom of the view, the
 * crosshair, the marks when a beam lands, where a hit on him came from, and what is in the
 * magazine. Everything that moves is driven straight from the game every frame.
 */
export function FirstPersonView({ game, hud, touch }: { game: Game; hud: HudState; touch: boolean }) {
  const l = hud.laser!;
  const root = useRef<HTMLDivElement>(null);
  const hands = useRef<HTMLDivElement>(null);
  const hip = useRef<HTMLImageElement>(null);
  const fire = useRef<HTMLImageElement>(null);
  const ads = useRef<HTMLImageElement>(null);
  const reload = useRef<HTMLImageElement>(null);
  const cross = useRef<HTMLDivElement>(null);
  const ticks = useRef<(HTMLDivElement | null)[]>([]);
  const dot = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const arc = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const gun = BLASTERS[game.live.fp.gun]?.id ?? "pulse";
  const [tall, sight] = SIGHTS[gun]!;

  useEffect(() => {
    let raf = 0;
    const ease = (k: number) => k * k * (3 - 2 * k);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const fp = game.live.fp;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const a = ease(Math.min(1, Math.max(0, fp.ads)));
      const loading = fp.reload >= 0;
      const firing = fp.flash > 0;
      const steady = 1 - a * 0.8;
      const bx = Math.cos(fp.bob * 0.5) * 9 * fp.move * steady;
      const by = Math.abs(Math.sin(fp.bob * 0.5)) * 11 * fp.move * steady;
      if (root.current) root.current.style.opacity = fp.on ? "1" : "0";
      if (hands.current) hands.current.style.opacity = String(1 - fp.down);
      // From the hip: low on the right. It dips and tilts in a sprint, lags a turn, and kicks back when it fires.
      const hx = bx - fp.swayX * 16 - a * vw * 0.16;
      const hy = by + fp.kick * 22 + fp.sprint * vh * 0.2 + fp.swayY * 10 + a * vh * 0.1;
      const turn = fp.sprint * 16 - fp.kick * 2.5;
      const low = `translate(${hx}px, ${hy}px) rotate(${turn}deg) scale(${1 + fp.kick * 0.04})`;
      const seen = loading ? 0 : 1 - a;
      if (hip.current) {
        hip.current.style.transform = low;
        hip.current.style.opacity = String(firing ? 0 : seen);
      }
      if (fire.current) {
        fire.current.style.transform = low;
        fire.current.style.opacity = String(firing ? seen : 0);
      }
      const scoped = gun === "marksman" ? Math.min(1, Math.max(0, (fp.ads - 0.7) * 3.4)) : 0;
      if (ads.current) {
        ads.current.style.transform = `translate(calc(-50% + ${bx * 0.25 - fp.swayX * 5}px), ${fp.kick * 20 + by * 0.25}px) scale(${1 + fp.kick * 0.03})`;
        ads.current.style.opacity = String(loading ? 0 : a * (1 - scoped));
      }
      if (reload.current) {
        const dip = loading ? Math.sin(fp.reload * Math.PI) : 0;
        reload.current.style.transform = `translate(${bx}px, ${by + dip * vh * 0.1}px) rotate(${-dip * 9}deg)`;
        reload.current.style.opacity = loading ? "1" : "0";
      }
      if (scope.current) scope.current.style.opacity = String(scoped);
      if (flash.current) flash.current.style.opacity = String(firing ? a * 0.9 : 0);
      // The crosshair opens as far as the beams may stray: tight when he is still, wide on the run.
      const half = Math.tan((fp.fov * Math.PI) / 360);
      const gap = Math.min(vh * 0.2, ((vh / 2) * Math.tan(fp.gap)) / half) + 5;
      const tone = fp.target === 1 ? "#ff4fd8" : fp.target === 2 ? "#7dff5c" : "#ffffff";
      if (cross.current) cross.current.style.opacity = String(fp.down > 0 ? 0 : Math.max(0, 1 - a * 1.6));
      ticks.current.forEach((t, i) => {
        if (!t) return;
        const [dx, dy] = [[0, -1], [0, 1], [-1, 0], [1, 0]][i]!;
        t.style.transform = `translate(calc(-50% + ${dx * (gap + 5)}px), calc(-50% + ${dy * (gap + 5)}px))`;
        t.style.background = tone;
      });
      if (dot.current) {
        dot.current.style.background = tone;
        dot.current.style.opacity = String(fp.down > 0 || scoped > 0.5 ? 0 : 0.95);
      }
      if (mark.current) {
        const k = Math.max(0, fp.hit / 0.16);
        mark.current.style.opacity = String(k);
        mark.current.style.transform = `translate(-50%, -50%) rotate(45deg) scale(${1.3 - k * 0.3})`;
        mark.current.style.color = fp.hitKind === 2 ? "#ff4fd8" : fp.hitKind === 3 ? "#ffd23a" : "#ffffff";
      }
      if (arc.current) {
        arc.current.style.opacity = String(Math.min(1, fp.hurt * 1.4));
        arc.current.style.transform = `translate(-50%, -50%) rotate(${(-fp.hurtAngle * 180) / Math.PI}deg)`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, gun]);

  // A mouse: the first click takes hold of it, then it looks about, left fires and right raises the sights.
  useEffect(() => {
    if (touch) return;
    const input = game.input;
    const held = () => document.pointerLockElement === document.body;
    const move = (e: MouseEvent) => {
      if (held()) input.look(e.movementX * 0.0023, e.movementY * 0.0023);
    };
    const down = (e: MouseEvent) => {
      if (game.overlay) return;
      if (!held()) {
        document.body.requestPointerLock?.();
        return;
      }
      if (e.button === 0) input.key("action", true);
      else if (e.button === 2) input.key("aim", true);
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) input.key("action", false);
      else if (e.button === 2) input.key("aim", false);
    };
    const menu = (e: Event) => e.preventDefault();
    document.addEventListener("mousemove", move);
    document.addEventListener("mousedown", down);
    document.addEventListener("mouseup", up);
    document.addEventListener("contextmenu", menu);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("contextmenu", menu);
      input.key("action", false);
      input.key("aim", false);
      if (held()) document.exitPointerLock?.();
    };
  }, [game, touch]);
  // A menu over the top gets the pointer back.
  useEffect(() => {
    if (hud.overlay && document.pointerLockElement) document.exitPointerLock?.();
  }, [hud.overlay]);

  const img = "absolute select-none will-change-transform";
  const low = { right: "1vw", bottom: "-5vh", height: "52vh", transformOrigin: "80% 100%" } as const;
  const empty = l.ammo <= Math.max(1, Math.floor(l.mag / 5)) && !l.reloading;
  return (
    <div ref={root} data-fp className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Where a hit on him came from. */}
      <div ref={arc} className="absolute left-1/2 top-1/2 h-[62vh] w-[62vh] opacity-0">
        <div className="absolute left-1/2 top-0 h-[7vh] w-[26vh] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,60,170,0.95)_0%,rgba(255,60,170,0)_70%)]" />
      </div>

      {/* Through the scope. */}
      <div ref={scope} className="absolute inset-0 opacity-0" style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0) 0, rgba(0,0,0,0) 30vh, rgba(0,0,0,0.97) 30.6vh)" }}>
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#3aa0ff]/70 shadow-[0_0_30px_rgba(58,160,255,0.5)]" />
        <div className="absolute left-1/2 top-[20vh] h-[60vh] w-px -translate-x-1/2 bg-[#bfe0ff]/70" />
        <div className="absolute left-1/2 top-1/2 h-px w-[60vh] -translate-x-1/2 bg-[#bfe0ff]/70" />
      </div>

      {/* The blaster in his hands. */}
      <div ref={hands} className="absolute inset-0">
        <img ref={hip} data-fp-hip src={`${ART}/${gun}-hip.webp`} alt="" draggable={false} className={img} style={low} />
        <img ref={fire} src={`${ART}/${gun}-fire.webp`} alt="" draggable={false} className={img} style={{ ...low, opacity: 0 }} />
        <img ref={reload} src={`${ART}/${gun}-reload.webp`} alt="" draggable={false} className={img} style={{ ...low, opacity: 0 }} />
        <img ref={ads} data-fp-ads src={`${ART}/${gun}-ads.webp`} alt="" draggable={false} className={img} style={{ left: "50%", height: `${tall}vh`, bottom: `${50 - (1 - sight) * tall}vh`, opacity: 0, transformOrigin: "50% 100%" }} />
        <div ref={flash} className="absolute left-1/2 top-1/2 h-[16vh] w-[16vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(160,255,140,0.5) 35%, rgba(160,255,140,0) 70%)" }} />
      </div>

      {/* The crosshair and the mark a hit leaves on it. */}
      <div ref={cross} data-crosshair className="absolute left-1/2 top-1/2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            ref={(el) => {
              ticks.current[i] = el;
            }}
            className={`absolute rounded-sm shadow-[0_0_3px_rgba(0,0,0,0.9)] ${i < 2 ? "h-[10px] w-[2.5px]" : "h-[2.5px] w-[10px]"}`}
          />
        ))}
      </div>
      <div ref={dot} className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_3px_rgba(0,0,0,0.9)]" />
      <div ref={mark} className="absolute left-1/2 top-1/2 h-9 w-9 opacity-0">
        <div className="absolute left-1/2 top-0 h-[10px] w-[3px] -translate-x-1/2 rounded bg-current" />
        <div className="absolute bottom-0 left-1/2 h-[10px] w-[3px] -translate-x-1/2 rounded bg-current" />
        <div className="absolute left-0 top-1/2 h-[3px] w-[10px] -translate-y-1/2 rounded bg-current" />
        <div className="absolute right-0 top-1/2 h-[3px] w-[10px] -translate-y-1/2 rounded bg-current" />
      </div>

      {/* Who tagged whom. */}
      <div data-feed className={`absolute right-3 z-10 flex flex-col items-end gap-1 ${touch ? "top-[132px]" : "top-16 sm:top-20"}`}>
        {l.feed.map((f, i) => (
          <div key={`${f.a}${f.b}${i}`} className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide sm:text-xs" style={{ opacity: 1 - i * 0.16 }}>
            <span style={{ color: TONE[f.team] }}>{f.a}</span>
            <span className="mx-1.5 text-white/70">{f.head ? "◎" : "▸"}</span>
            <span style={{ color: TONE[f.team ? 0 : 1] }}>{f.b}</span>
          </div>
        ))}
      </div>

      {/* Vest, magazine and the run he is on. */}
      <div className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-end gap-3 ${touch ? "bottom-2" : "bottom-4"}`}>
        <div className="sr-panel px-3 py-1.5">
          <div className="text-[9px] font-black uppercase tracking-widest text-white/50">Vest</div>
          <div className="mt-1 h-2.5 w-28 overflow-hidden rounded-full border border-white/25 bg-black/70 sm:w-36">
            <div data-vest className="h-full rounded-full transition-[width] duration-150" style={{ width: `${l.vest}%`, background: l.vest <= 34 ? "#ff3b6b" : l.vest <= 67 ? "#ffd23a" : "#35e0d0" }} />
          </div>
        </div>
        <div className="sr-panel px-3 py-1 text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-white/50">{l.gun}</div>
          <div data-ammo className="sr-title text-2xl leading-none sm:text-3xl" style={{ color: l.reloading ? "#ffd23a" : empty ? "#ff3b6b" : "#fff" }}>
            {l.reloading ? "RELOADING" : `${l.ammo}`}
            {!l.reloading && <span className="ml-1 text-sm text-white/50">/ {l.mag}</span>}
          </div>
          {empty && <div className="text-[9px] font-black uppercase tracking-widest text-[#ff3b6b]">{touch ? "Reload" : "R to reload"}</div>}
        </div>
        <div className="sr-panel px-3 py-1.5">
          <div className="text-[9px] font-black uppercase tracking-widest text-white/50">Run</div>
          <div className="mt-0.5 flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ background: i < l.streak ? "#39ff14" : "rgba(255,255,255,0.14)", boxShadow: i < l.streak ? "0 0 6px #39ff14" : undefined }} />
            ))}
          </div>
          {l.reward && <div className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-[#f4d77a]">{l.reward}</div>}
        </div>
      </div>

      {/* Out of it for a moment. */}
      {l.down && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#12000c]/55">
          <div className="sr-title text-4xl text-[#ff5ad1] drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] sm:text-6xl">Tagged out</div>
          {l.by && <div className="mt-1 text-sm font-black uppercase tracking-widest text-white/80">by {l.by}</div>}
          <div className="mt-3 text-xs font-black uppercase tracking-widest text-white/60">Back in {l.back}</div>
        </div>
      )}
      {!touch && l.phase === "count" && <div className="absolute inset-x-0 bottom-28 text-center text-xs font-black uppercase tracking-widest text-white/70">Click to take aim with the mouse</div>}
    </div>
  );
}

/** The screen at the arena door: his rank, his record, the three blasters and the way in. */
export function Loadout({ game, hud, touch }: { game: Game; hud: HudState; touch: boolean }) {
  const d = hud.loadout;
  if (!d) return null;
  return (
    <Sheet title="Laser Tag" sub="Green against pink, four a side. Through your own eyes." onClose={() => game.close()} wide>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#39ff14] bg-black/60 shadow-[0_0_14px_rgba(57,255,20,0.45)]">
              <span className="sr-title text-2xl text-[#39ff14]">{d.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div data-rank className="sr-title text-2xl text-white">
                {d.rank}
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#39ff14]" style={{ width: `${Math.round(d.share * 100)}%` }} />
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/55">{d.top ? `${d.xp} XP · top rank` : `${d.xp} of ${d.next} XP to the next rank`}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {d.stats.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1 text-xs">
                <span className="text-white/55">{label}</span>
                <span className="font-black text-white">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 hidden text-[11px] leading-snug text-white/55 lg:block">Three tags in a row calls a radar sweep, five overcharges your blaster, seven blacks out every pink vest on the floor.</div>
        </div>
        <div className="grid gap-2">
          {d.guns.map((g) => (
            <button
              key={g.id}
              data-blaster={g.id}
              disabled={!!g.locked}
              onClick={() => game.pickBlaster(g.id)}
              className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${g.picked ? "border-[#39ff14] bg-[#39ff14]/10" : "border-white/10 bg-white/5 hover:bg-white/10"} ${g.locked ? "opacity-55" : ""}`}
            >
              <div className="flex h-16 w-28 shrink-0 items-end justify-center overflow-hidden rounded-lg bg-black/50">
                <img src={g.img} alt="" className="h-full object-contain object-bottom" style={{ filter: g.locked ? "grayscale(1) brightness(0.6)" : undefined }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="sr-title text-xl text-white">{g.name}</div>
                <div className="text-xs text-white/65">{g.note}</div>
                <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider" style={{ color: g.locked ? "#ffd23a" : "#7dff5c" }}>
                  {g.locked || `${g.mag} in the cell`}
                </div>
              </div>
              {g.picked && <div className="shrink-0 rounded bg-[#39ff14] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black">Carried</div>}
            </button>
          ))}
        </div>
      </div>
      {/* The arena: each layout with its floor plan. Upstairs floors are the bright panels, ramps the striped ones. */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-white/55">Arena</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {d.maps.map((m) => (
            <button
              key={m.id}
              data-arena={m.id}
              onClick={() => game.pickArena(m.id)}
              className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition ${m.picked ? "border-[#39ff14] bg-[#39ff14]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
            >
              <svg viewBox={`${-d.hall.wide / 2} ${-d.hall.deep / 2} ${d.hall.wide} ${d.hall.deep}`} className="h-[66px] w-[96px] shrink-0 rounded-md border border-white/15 bg-[#07060d]" aria-hidden>
                {m.plan.covers.map(([x0, x1, z0, z1], i) => (
                  <rect key={`c${i}`} x={x0} y={z0} width={x1! - x0!} height={z1! - z0!} fill="#4b3fa8" />
                ))}
                {m.plan.ramps.map(([x0, x1, z0, z1], i) => (
                  <rect key={`r${i}`} x={x0} y={z0} width={x1! - x0!} height={z1! - z0!} fill="#39ff14" fillOpacity={0.45} stroke="#39ff14" strokeWidth={0.18} strokeDasharray="0.5 0.4" />
                ))}
                {m.plan.decks.map(([x0, x1, z0, z1], i) => (
                  <rect key={`d${i}`} x={x0} y={z0} width={x1! - x0!} height={z1! - z0!} fill="#2ae0d0" fillOpacity={0.55} stroke="#9ff5ec" strokeWidth={0.16} />
                ))}
                {/* The two bases: green in his corner, pink in theirs. */}
                <circle cx={-14.6} cy={9.7} r={0.75} fill="#39ff14" />
                <circle cx={14.6} cy={-9.7} r={0.75} fill="#ff4fd8" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <span className="sr-title text-lg leading-tight text-white">{m.name}</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider" style={m.floors > 1 ? { background: "#2ae0d0", color: "#04201d" } : { background: "rgba(255,255,255,0.14)", color: "#fff" }}>
                    {m.floors > 1 ? "2 floors" : "1 floor"}
                  </span>
                </div>
                <div className="text-[11px] leading-snug text-white/65">{m.note}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {touch ? (
          <button data-autofire className="sr-btn sr-btn-ghost" onClick={() => game.toggleAutoFire()}>
            Auto-fire: {d.auto ? "on" : "off"}
          </button>
        ) : (
          <div className="text-[11px] text-white/55">Mouse to look · click to fire · right click to aim · R reloads · Shift sprints · E dashes</div>
        )}
        <button data-primary data-deploy className="sr-btn" onClick={() => game.deploy()}>
          Deploy
        </button>
      </div>
    </Sheet>
  );
}
