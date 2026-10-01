import { useEffect, useRef, useState } from "react";
import { HAUNT_ROOMS, HW_ART, benjiStand } from "../halloween";

export type HauntPanel = {
  room: number;
  rooms: number;
  name: string;
  image: string;
  aspect: string;
  objective: string;
  x: number;
  y: number;
  farY: number;
  nearY: number;
  view: number;
  tint: "warm" | "hex" | "cool";
  letter: { x: number; y: number; got: boolean } | null;
  hotspot: { x: number; y: number; label: string; done: boolean };
  exits: { x: number; y: number; label: string; back: boolean; open: boolean }[];
  decoys: { x: number; y: number }[];
  action: { x: number; y: number; label: string; done: boolean };
  doorOpen: boolean;
  scare: string | null;
  note: string | null;
  kind: string;
  letters: number;
  lettersMax: number;
  found: string[];
  visited: string[];
  outfit: string;
  popped: boolean;
  hall: boolean;
  floorY: number;
  walkMinX: number;
  walkMaxX: number;
  doorX: number;
  prompt: string | null;
  pop: { image: string; line: string; x: number; y: number } | null;
  lurk: { image: string; x: number; y: number } | null;
  steam: boolean;
};

const TINT = {
  warm: "saturate(1.12) sepia(0.15)",
  hex: "saturate(1.08) hue-rotate(14deg) brightness(0.96)",
  cool: "saturate(0.88) hue-rotate(16deg) brightness(1.05)",
};

function closeTo(x: number, y: number, tx: number, ty: number) {
  const dx = (x - tx) / 0.075;
  const dy = (y - ty) / 0.09;
  return dx * dx + dy * dy < 1;
}

export function HauntedHouse({
  haunt,
  onUse,
  onLeave,
  onCandle,
}: {
  haunt: HauntPanel;
  onUse: () => void;
  onLeave: () => void;
  onCandle: (n: number) => void;
}) {
  const room = HAUNT_ROOMS[haunt.room];
  const stand = benjiStand(haunt.outfit);
  const [aw, ah] = haunt.aspect.split("/").map((n) => Number(n.trim()) || 1);
  const vpRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const camRef = useRef(0);
  const [vis, setVis] = useState(haunt.view);
  const [cam, setCam] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [introOn, setIntroOn] = useState(true);
  const debug =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("hauntdebug") === "1" ||
      Boolean((window as unknown as { __HAUNTED_DEBUG__?: boolean }).__HAUNTED_DEBUG__));

  useEffect(() => {
    setIntroOn(true);
    const t = window.setTimeout(() => setIntroOn(false), 1300);
    return () => window.clearTimeout(t);
  }, [haunt.room]);

  useEffect(() => {
    const vp = vpRef.current;
    const world = worldRef.current;
    if (!vp || !world) return;
    const measure = () => {
      if (world.clientWidth > 0) setVis(vp.clientWidth / world.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(world);
    return () => ro.disconnect();
  }, [haunt.image, haunt.aspect, haunt.view]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const span = Math.max(0.02, 1 - vis);
      const target = Math.min(span, Math.max(0, haunt.x - vis / 2));
      camRef.current += (target - camRef.current) * 0.16;
      setCam(camRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [haunt.x, vis]);

  const depth = Math.min(1, Math.max(0, (haunt.y - haunt.farY) / Math.max(0.04, haunt.nearY - haunt.farY)));
  const scale = 0.84 + 0.16 * depth;
  const nearHot = !haunt.hotspot.done && closeTo(haunt.x, haunt.y, haunt.hotspot.x, haunt.hotspot.y);
  const pads = room?.pads;

  return (
    <div ref={vpRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-black" style={{ containerType: "size" }}>
      <div
        ref={worldRef}
        className="absolute bottom-0 left-0"
        style={{
          width: `max(${100 / haunt.view}cqw, calc(100cqh * ${aw} / ${ah}))`,
          aspectRatio: `${aw} / ${ah}`,
          transform: `translateX(${-cam * 100}%)`,
        }}
      >
        <img src={haunt.image} alt="" className={`absolute inset-0 h-full w-full ${haunt.pop ? "haunt-dim" : ""}`} />
        <div className="haunt-fog pointer-events-none absolute inset-x-[-8%] bottom-0 z-[1] h-[28%]" />
        {haunt.steam && (
          <div
            className="haunt-steam pointer-events-none absolute z-[2] h-[18%] w-[16%] -translate-x-1/2 rounded-full bg-white/25 blur-md"
            style={{ left: `${haunt.hotspot.x * 100}%`, top: `${(haunt.hotspot.y - 0.08) * 100}%` }}
          />
        )}
        {haunt.letter && !haunt.letter.got && (
          <span
            className="absolute z-[6] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-100 bg-orange-500 shadow-[0_0_16px_#ff7a1a]"
            style={{ left: `${haunt.letter.x * 100}%`, top: `${haunt.letter.y * 100}%` }}
          />
        )}
        {haunt.exits.map((exit) =>
          exit.open ? (
            <span
              key={`${exit.label}-${exit.x}`}
              className={`absolute z-[4] w-[7%] -translate-x-1/2 rounded-full bg-orange-400/70 blur-[2px] ${closeTo(haunt.x, haunt.y, exit.x, exit.y) ? "h-[22%] opacity-80" : "h-[8%] opacity-40"}`}
              style={{ left: `${exit.x * 100}%`, top: `${(exit.y - 0.12) * 100}%` }}
            />
          ) : null,
        )}
        {nearHot && (
          <span
            className="absolute z-[4] h-[14%] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/80 bg-orange-500/15 shadow-[0_0_18px_rgba(255,122,26,0.45)]"
            style={{ left: `${haunt.hotspot.x * 100}%`, top: `${haunt.hotspot.y * 100}%` }}
          />
        )}
        <div
          className="pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 blur-[2px]"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.y * 100}%`,
            width: `${9 * scale}%`,
            height: `${2.2 * scale}%`,
            opacity: 0.22 + depth * 0.12,
          }}
        />
        <img
          src={haunt.outfit}
          alt=""
          className="pointer-events-none absolute z-[3] w-auto max-w-none"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.y * 100}%`,
            height: `${46 * scale}cqh`,
            transform: `translate(-50%, ${-stand.foot * 100}%)`,
            filter: `${TINT[haunt.tint]} drop-shadow(0 8px 6px rgba(0,0,0,0.45))`,
          }}
        />
        {haunt.pop && (
          <img
            key={haunt.pop.image + haunt.pop.line}
            src={haunt.pop.image}
            alt=""
            className="haunt-ghost pointer-events-none absolute z-[4] w-[18%] max-w-[220px] object-cover"
            style={{ left: `${haunt.pop.x * 100}%`, top: `${haunt.pop.y * 100}%` }}
          />
        )}
        <img
          src={haunt.image}
          alt=""
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 78%, #000 90%, #000 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, transparent 78%, #000 90%, #000 100%)",
          }}
        />
        {(haunt.prompt || haunt.note) && !haunt.hall && (
          <button
            type="button"
            onClick={haunt.prompt ? onUse : undefined}
            className="pointer-events-auto absolute z-[8] min-h-11 -translate-x-1/2 rounded-full border border-orange-200/80 bg-black/80 px-3 text-sm font-semibold text-orange-50"
            style={{ left: `${haunt.x * 100}%`, top: `calc(${haunt.y * 100}% - ${52 * scale}cqh)` }}
          >
            {haunt.prompt ? haunt.prompt : haunt.note}
          </button>
        )}
        {debug && (
          <>
            <div className="absolute left-2 top-2 z-20 rounded bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300">
              {room?.id} x {haunt.x.toFixed(2)} y {haunt.y.toFixed(2)} scale {scale.toFixed(2)}
              <br />
              cam {cam.toFixed(2)} vis {vis.toFixed(2)} band {haunt.farY.toFixed(2)}–{haunt.nearY.toFixed(2)}
              <br />
              letters {haunt.found.join(" ") || "none"}
            </div>
            <div className="absolute z-20 h-px bg-red-500/80" style={{ top: `${haunt.farY * 100}%`, left: "8%", right: "8%" }} />
            <div className="absolute z-20 h-px bg-red-500" style={{ top: `${haunt.nearY * 100}%`, left: "8%", right: "8%" }} />
            <div className="absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400" style={{ left: `${haunt.x * 100}%`, top: `${haunt.y * 100}%` }} />
          </>
        )}
      </div>
      {haunt.hall && <div className="absolute inset-0 z-30 bg-black/80" />}
      {introOn && !haunt.hall && (
        <div className="absolute left-1/2 top-[42%] z-30 -translate-x-1/2 text-center text-white">
          <p className="font-display text-4xl tracking-wide text-orange-100">{haunt.name}</p>
          <p className="mt-1 text-sm text-orange-200">
            {haunt.letters} / {haunt.lettersMax} letters
          </p>
        </div>
      )}
      <div className="absolute left-1/2 top-[11.4rem] z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-orange-400/35 bg-black/70 px-3 py-1.5 text-white shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-orange-300">{haunt.name}</p>
            <p className="truncate text-xs text-orange-50">{haunt.objective}</p>
          </div>
          <p className="shrink-0 text-[11px] font-semibold text-lime-300">
            {haunt.letters}/{haunt.lettersMax}
          </p>
          <button type="button" onClick={() => setMapOpen(true)} className="min-h-11 rounded-full px-2 text-[11px] font-semibold uppercase text-orange-100">
            Map
          </button>
          <button type="button" onClick={onLeave} className="min-h-11 rounded-full px-2 text-[11px] font-semibold uppercase text-white/80">
            Leave
          </button>
        </div>
      </div>
      {pads && !haunt.hotspot.done && nearHot && !haunt.hall && (
        <div className="absolute inset-x-0 bottom-28 z-40 flex justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => onCandle(n)} className="pointer-events-auto min-h-11 min-w-11 rounded-full border border-orange-200 bg-orange-500 px-3 font-display text-lg text-black">
              {pads === "books" ? ["I", "II", "III"][n - 1] : n}
            </button>
          ))}
        </div>
      )}
      {mapOpen && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-full w-full max-w-lg overflow-auto rounded-xl border border-orange-500/40 bg-black p-3 text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-2xl text-orange-200">House map</p>
              <button type="button" onClick={() => setMapOpen(false)} className="min-h-11 rounded-lg border border-white/20 px-3 text-xs uppercase">
                Close
              </button>
            </div>
            <img src={HW_ART.map} alt="Haunted house floor plan" className="mt-2 w-full rounded-lg object-contain" />
            <p className="mt-2 text-sm text-orange-100">
              {haunt.name} · {haunt.letters}/{haunt.lettersMax} letters
            </p>
            <ul className="mt-2 space-y-0.5 text-xs">
              {HAUNT_ROOMS.map((r) => {
                const here = r.id === room?.id;
                const seen = haunt.visited.includes(r.id) || here;
                const has = !!r.letter || r.id === "cathedral";
                const got = r.letter ? haunt.found.includes(r.id) : r.id === "cathedral" && haunt.found.includes("cathedral");
                return (
                  <li key={r.id} className={here ? "text-orange-200" : seen ? "text-white/80" : "text-white/35"}>
                    {here ? "● " : seen ? "✓ " : "○ "}
                    {seen || here ? r.name : "???"}
                    {has && seen ? (got ? " · letter" : " · letter hidden") : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
