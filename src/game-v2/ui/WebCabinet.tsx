import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Lock, Maximize2, Minimize2, RotateCw, TriangleAlert } from "lucide-react";
import type { Game } from "../game";
import { CABINETS, type Cabinet } from "../play/goods";

type Embed = { ok: true; kind: "embed" | "direct"; src: string; width: number; height: number } | { ok: false; reason: string };
type Phase = "home" | "loading" | "live" | "failed";

/** Asked once per cabinet per visit to the page; the server keeps its own short memory too. */
const known = new Map<string, Promise<Embed>>();

function lookUp(id: string): Promise<Embed> {
  let p = known.get(id);
  if (!p) {
    p = fetch(`/api/itch?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Embed>) : ({ ok: false, reason: "The arcade could not reach itch.io." } as Embed)))
      .catch(() => ({ ok: false, reason: "The arcade could not reach itch.io." }) as Embed);
    known.set(id, p);
    // A miss is worth asking again next time the cabinet is opened.
    void p.then((e) => {
      if (!e.ok) known.delete(id);
    });
  }
  return p;
}

/**
 * A cabinet whose screen is a web browser. The game runs from itch.io in a frame inside it:
 * tabs for the games on the floor, an address bar, reload, full screen, and a way out to a
 * real tab. While a game is running it owns the gamepad and the speakers.
 */
export function WebCabinet({ game, cab }: { game: Game; cab: Cabinet }) {
  const win = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>("home");
  const [embed, setEmbed] = useState<Embed | null>(null);
  const [load, setLoad] = useState(0);
  const [scale, setScale] = useState(1);
  const [full, setFull] = useState(false);
  const [slow, setSlow] = useState(false);
  const tabs = CABINETS.filter((c) => c.link);
  const url = new URL(cab.link!);
  const fw = embed?.ok ? embed.width : 1280;
  const fh = embed?.ok ? embed.height : 720;
  const running = (phase === "loading" || phase === "live") && !!embed?.ok;

  // A different tab is a different site: start from its front page.
  useEffect(() => {
    let alive = true;
    setPhase("home");
    setEmbed(null);
    setSlow(false);
    void lookUp(cab.id).then((e) => {
      if (alive) setEmbed(e);
    });
    return () => {
      alive = false;
    };
  }, [cab.id]);

  // Pressed start before the address came back.
  useEffect(() => {
    if (phase === "loading" && embed && !embed.ok) setPhase("failed");
  }, [phase, embed]);

  // The running game takes the pad and the sound; hand both back when it stops.
  useEffect(() => {
    if (!running) return;
    game.webPlay(true);
    return () => game.webPlay(false);
  }, [running, game]);

  // The frame is laid out at the size the game was made for and scaled to the screen.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.1, Math.min(el.clientWidth / fw, el.clientHeight / fh)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fw, fh, full]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === win.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const home = useCallback(() => {
    setPhase("home");
    setSlow(false);
  }, []);

  // Pad: the game inside has every button, so leaving is a long hold on View / Select.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let held = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      const pad = navigator.getGamepads ? [...navigator.getGamepads()].find((p) => p && p.connected) : null;
      held = pad?.buttons[8]?.pressed ? held + dt : 0;
      if (held > 0.8) home();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, home]);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [phase, load]);

  const start = () => {
    setSlow(false);
    setLoad((n) => n + 1);
    setPhase(embed && !embed.ok ? "failed" : "loading");
  };
  const retry = () => {
    known.delete(cab.id);
    setEmbed(null);
    setPhase("loading");
    setLoad((n) => n + 1);
    void lookUp(cab.id).then(setEmbed);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void win.current?.requestFullscreen?.().catch(() => undefined);
  };
  const canFull = typeof document !== "undefined" && !!document.fullscreenEnabled;

  const status =
    phase === "live"
      ? "Click the game if the keys don't answer. Esc or Back to the floor to leave."
      : phase === "loading"
        ? slow
          ? "Still loading. Big games take a moment the first time."
          : `Connecting to ${url.hostname}…`
        : phase === "failed"
          ? "The page did not load in the cabinet."
          : "Ready.";

  const tool = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/75 hover:bg-white/10 hover:text-white";

  return (
    <div ref={win} className={`flex flex-col overflow-hidden bg-[#17181c] ${full ? "h-full w-full" : "rounded-xl border border-white/15"}`}>
      {/* Tabs: one for each game on the floor that lives on the web. */}
      <div className="flex items-end gap-1 bg-[#0c0d10] px-2 pt-1.5">
        {tabs.map((t) => {
          const on = t.id === cab.id;
          return (
            <button
              key={t.id}
              onClick={() => (on ? undefined : game.swapCabinet(t.id))}
              className={`flex min-w-0 max-w-[46%] items-center gap-2 rounded-t-lg px-3 py-1.5 text-left text-xs font-bold ${on ? "bg-[#1f2126] text-white" : "bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80"}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: t.color, boxShadow: on ? `0 0 8px ${t.color}` : undefined }} />
              <span className="truncate">{t.name}</span>
            </button>
          );
        })}
      </div>
      {/* Toolbar. */}
      <div className="flex items-center gap-1.5 bg-[#1f2126] px-2 py-1.5">
        <button className={tool} title="Back to this game's front page" aria-label="Back" onClick={home} disabled={phase === "home"} style={{ opacity: phase === "home" ? 0.35 : 1 }}>
          <ArrowLeft size={16} />
        </button>
        <button className={tool} title="Reload" aria-label="Reload" onClick={() => (phase === "home" ? undefined : phase === "failed" ? retry() : (setPhase("loading"), setSlow(false), setLoad((n) => n + 1)))} disabled={phase === "home"} style={{ opacity: phase === "home" ? 0.35 : 1 }}>
          <RotateCw size={15} className={phase === "loading" ? "animate-spin" : ""} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#0c0d10] px-3 py-1.5 text-xs">
          <Lock size={12} className="shrink-0 text-[#39ff14]" />
          <span className="truncate text-white/90">
            {url.hostname}
            <span className="text-white/45">{url.pathname}</span>
          </span>
        </div>
        {canFull && (
          <button className={tool} title={full ? "Leave full screen" : "Full screen"} aria-label="Full screen" onClick={toggleFull}>
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
        <a className={tool} title="Open on itch.io in a new tab" aria-label="Open on itch.io in a new tab" href={cab.link} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} />
        </a>
      </div>
      {/* The page. */}
      <div ref={box} data-playing={running ? "1" : "0"} className={`relative overflow-hidden bg-black ${full ? "min-h-0 flex-1" : ""}`} style={full ? undefined : { aspectRatio: `${fw} / ${fh}` }}>
        {running && embed?.ok && (
          <iframe
            key={`${cab.id}:${load}`}
            ref={frame}
            src={embed.src}
            title={cab.name}
            width={fw}
            height={fh}
            scrolling="no"
            allow="autoplay; fullscreen *; gamepad *; gyroscope; accelerometer; cross-origin-isolated"
            allowFullScreen
            onLoad={() => {
              setPhase("live");
              frame.current?.focus();
            }}
            style={{ position: "absolute", left: "50%", top: "50%", width: fw, height: fh, border: 0, background: "#000", transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
          />
        )}
        {phase === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/15" style={{ borderTopColor: cab.color }} />
            <div className="text-xs font-extrabold uppercase tracking-[0.25em] text-white/75">Loading {cab.tag}</div>
          </div>
        )}
        {phase === "home" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center" style={{ background: `radial-gradient(circle at 50% 12%, ${cab.color}55, #06050b 68%)` }}>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-white/55">Now playing at the Fun House</div>
            <div className="sr-title text-3xl sm:text-5xl" style={{ color: cab.accent, textShadow: `0 0 26px ${cab.color}` }}>
              {cab.name}
            </div>
            <p className="max-w-md text-sm text-white/75">{cab.blurb}</p>
            <button data-primary className="sr-btn sr-btn-gold px-8 py-3 text-lg" onClick={start}>
              Press start
            </button>
            <div className="text-[11px] text-white/45">The full game, running from itch.io inside this cabinet. Your Memphis save stays put.</div>
          </div>
        )}
        {phase === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#101114] p-4 text-center">
            <TriangleAlert size={34} className="text-[#ffd23a]" />
            <div className="text-lg font-extrabold text-white">This page can't be shown in the cabinet</div>
            <p className="max-w-md text-sm text-white/65">{embed && !embed.ok ? embed.reason : "The game did not answer."} It still plays on itch.io.</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a data-primary className="sr-btn sr-btn-gold px-6 py-2.5" href={cab.link} target="_blank" rel="noopener noreferrer">
                Open on itch.io
              </a>
              <button className="sr-btn sr-btn-ghost px-6 py-2.5" onClick={retry}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Status bar. */}
      <div className="flex items-center justify-between gap-3 bg-[#0c0d10] px-3 py-1 text-[11px] text-white/55">
        <span className="truncate">{status}</span>
        {running && <span className="hidden shrink-0 sm:inline">Gamepad: hold View / Select to leave the game</span>}
      </div>
    </div>
  );
}
