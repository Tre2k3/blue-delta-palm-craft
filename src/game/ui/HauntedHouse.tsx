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
  step: number;
};

const TINT = {
  warm: "sepia(0.22) saturate(0.9) contrast(1.05)",
  hex: "sepia(0.16) saturate(0.8) hue-rotate(4deg) contrast(1.04)",
  cool: "sepia(0.08) saturate(0.82) hue-rotate(8deg) contrast(1.04)",
};
const GRADE = {
  warm: "#c45a22",
  hex: "#8a3a55",
  cool: "#3a5878",
};

function closeTo(x: number, y: number, tx: number, ty: number) {
  const dx = (x - tx) / 0.075;
  const dy = (y - ty) / 0.09;
  return dx * dx + dy * dy < 1;
}

function Flame({ x, y }: { x: number; y: number }) {
  return (
    <span className="pointer-events-none absolute z-[6] flex -translate-x-1/2 flex-col items-center" style={{ left: `${x * 100}%`, top: `${(y - 0.22) * 100}%` }}>
      <span className="h-14 w-5 rounded-t-full bg-gradient-to-t from-orange-700 via-amber-300 to-yellow-50 shadow-[0_0_26px_12px_rgba(255,150,20,0.9)]" />
      <span className="-mt-1 h-7 w-2.5 rounded-b bg-stone-900" />
    </span>
  );
}

function RoomReaction({
  id,
  done,
  step,
  seq,
  pads,
  hot,
}: {
  id?: string;
  done: boolean;
  step: number;
  seq: number[];
  pads: { x: number; y: number }[];
  hot: { x: number; y: number };
}) {
  if (!id) return null;
  const lit = new Set(done ? seq : seq.slice(0, step));
  if (id === "seance") {
    return (
      <>
        {pads.map((pad, i) => (lit.has(i + 1) ? <Flame key={i} x={pad.x} y={pad.y} /> : null))}
      </>
    );
  }
  if (id === "library" && (done || step > 0)) {
    const colors = ["bg-red-800", "bg-amber-900", "bg-stone-800"];
    return (
      <>
        {pads.map((pad, i) => (
          <span
            key={pad.x}
            className={`pointer-events-none absolute z-[6] w-[2.2%] rounded-sm border border-amber-100/80 shadow-lg ${colors[i % colors.length]}`}
            style={{
              left: `${pad.x * 100}%`,
              top: `${(pad.y - 0.2) * 100}%`,
              height: lit.has(i + 1) ? "6%" : "14%",
              transform: lit.has(i + 1) ? "translate(-50%, -10px) rotate(-16deg)" : "translate(-50%, 0)",
            }}
          />
        ))}
        {done && (
          <span
            className="pointer-events-none absolute z-[5] bg-black/75 shadow-[inset_0_0_18px_#000]"
            style={{ left: `${pads[1] ? pads[1].x * 100 : 46}%`, top: `${((pads[1]?.y ?? 0.86) - 0.2) * 100}%`, width: "4%", height: "14%", transform: "translate(-50%, 0)" }}
          />
        )}
      </>
    );
  }
  if (!done) return null;
  const at = { left: `${hot.x * 100}%`, top: `${(hot.y - 0.22) * 100}%` };
  if (id === "portraits") {
    return (
      <span
        className="pointer-events-none absolute z-[6] -translate-x-1/2 border-[3px] border-amber-100 shadow-[0_0_28px_8px_rgba(255,160,40,0.85)]"
        style={{ ...at, width: "12%", height: "26%" }}
      />
    );
  }
  if (id === "toys") {
    return (
      <span
        className="pointer-events-none absolute z-[6] origin-bottom -translate-x-1/2 -rotate-[28deg] rounded-t-md border-2 border-amber-100 bg-amber-800/90 shadow-[0_-10px_16px_rgba(0,0,0,0.55)]"
        style={{ left: `${hot.x * 100}%`, top: `${(hot.y - 0.1) * 100}%`, width: "16%", height: "7%" }}
      />
    );
  }
  if (id === "banquet") {
    return (
      <span className="pointer-events-none absolute z-[6] -translate-x-1/2" style={at}>
        <span className="block h-4 w-16 rounded-full border-2 border-amber-50 bg-stone-100/95 shadow-lg" />
        <span className="mx-auto -mt-8 block h-8 w-2.5 rounded-t-full bg-gradient-to-t from-orange-600 to-yellow-100 shadow-[0_0_16px_6px_#ffb020]" />
      </span>
    );
  }
  if (id === "kitchen") {
    return (
      <span
        className="pointer-events-none absolute z-[6] h-16 w-2 origin-bottom -translate-x-1/2 -rotate-[70deg] rounded-full bg-zinc-100 shadow-[0_0_12px_#fff]"
        style={{ left: `${hot.x * 100}%`, top: `${(hot.y - 0.16) * 100}%` }}
      />
    );
  }
  if (id === "boiler") {
    return (
      <span
        className="pointer-events-none absolute z-[6] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[80deg] rounded-full border-[6px] border-lime-300 shadow-[0_0_18px_#b6ff4a]"
        style={{ left: `${hot.x * 100}%`, top: `${(hot.y - 0.16) * 100}%` }}
      >
        <span className="absolute left-1/2 top-0 h-1/2 w-1.5 -translate-x-1/2 bg-lime-100" />
      </span>
    );
  }
  if (id === "attic") {
    return (
      <span
        className="pointer-events-none absolute z-[6] origin-bottom -translate-x-1/2 -rotate-[24deg] rounded-t border-2 border-amber-100 bg-amber-200/80"
        style={{ left: `${hot.x * 100}%`, top: `${(hot.y - 0.08) * 100}%`, width: "18%", height: "6%" }}
      />
    );
  }
  return null;
}

export function HauntedHouse({
  haunt,
  onUse,
  onLeave,
  onCandle: _onCandle,
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
  const [fly, setFly] = useState<string | null>(null);
  const lettersRef = useRef(haunt.letters);
  const coarse = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760);
  const debug =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("hauntdebug") === "lines" ||
      Boolean((window as unknown as { __HAUNTED_DEBUG__?: boolean }).__HAUNTED_DEBUG__));

  useEffect(() => {
    setIntroOn(true);
    const t = window.setTimeout(() => setIntroOn(false), 700);
    return () => window.clearTimeout(t);
  }, [haunt.room]);

  useEffect(() => {
    if (haunt.letters > lettersRef.current) {
      const glyph = "SACKRELIGS"[(haunt.letters - 1) % 10] ?? "S";
      setFly(glyph);
    }
    lettersRef.current = haunt.letters;
    const t = window.setTimeout(() => setFly(null), 900);
    return () => window.clearTimeout(t);
  }, [haunt.letters]);

  useEffect(() => {
    const here = HAUNT_ROOMS[haunt.room];
    if (!here) return;
    const next = here.exits
      .map((exit) => HAUNT_ROOMS.find((r) => r.id === exit.dest)?.image)
      .filter((src): src is string => !!src);
    for (const src of [here.image, ...next]) {
      const img = new Image();
      img.src = src;
    }
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
  const scale = 0.88 + 0.12 * depth;
  const nearHot = !haunt.hotspot.done && closeTo(haunt.x, haunt.y, haunt.hotspot.x, haunt.hotspot.y);
  const dock = coarse ? "16.75rem" : "4.25rem";
  const flyX = haunt.letter ? Math.min(88, Math.max(12, ((haunt.letter.x - cam) / Math.max(0.2, vis)) * 100)) : 50;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-black">
    <div ref={vpRef} className={`absolute inset-x-0 top-0 overflow-hidden ${haunt.pop ? "haunt-shake" : ""}`} style={{ bottom: dock, containerType: "size" }}>
      <div
        ref={worldRef}
        className="absolute bottom-0 left-0"
        style={{
          width: `max(${100 / haunt.view}cqw, calc(100cqh * ${aw} / ${ah}))`,
          aspectRatio: `${aw} / ${ah}`,
          transform: `translateX(${-cam * 100}%)`,
        }}
      >
        <img src={haunt.image} alt="" className={`absolute inset-0 h-full w-full ${haunt.pop ? "haunt-dim" : "haunt-candle"}`} />
        <div className="haunt-shade pointer-events-none absolute inset-y-0 left-0 z-[1] w-[46%]" />
        <div className="haunt-fog pointer-events-none absolute inset-x-[-8%] bottom-0 z-[1] h-[42%]" />
        {haunt.steam && (
          <div
            className="haunt-steam pointer-events-none absolute z-[2] h-[18%] w-[16%] -translate-x-1/2 rounded-full bg-white/25 blur-md"
            style={{ left: `${haunt.hotspot.x * 100}%`, top: `${(haunt.hotspot.y - 0.08) * 100}%` }}
          />
        )}
        {haunt.letter && !haunt.letter.got && (
          <span
            className="absolute z-[2] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/70 blur-[0.5px] shadow-[0_0_14px_5px_rgba(255,150,50,0.55)]"
            style={{ left: `${haunt.letter.x * 100}%`, top: `${haunt.letter.y * 100}%` }}
          />
        )}
        {haunt.exits.map((exit) => {
          const near = closeTo(haunt.x, haunt.y, exit.x, exit.y);
          if (!exit.open || !near) return null;
          return (
            <span
              key={`${exit.label}-${exit.x}`}
              className="absolute z-[2] -translate-x-1/2 rounded-full blur-md"
              style={{
                left: `${exit.x * 100}%`,
                top: `${(exit.y - 0.08) * 100}%`,
                width: "6%",
                height: "12%",
                background: "radial-gradient(ellipse, rgba(255,190,110,0.28), transparent 70%)",
              }}
            />
          );
        })}
        {room?.padPoints.map((pad, i) => {
          if (haunt.hotspot.done) return null;
          const next = room.seq[haunt.step] === i + 1;
          const near = closeTo(haunt.x, haunt.y, pad.x, pad.y);
          return (
            <span
              key={`pad-${i}`}
              className={`absolute z-[4] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-[11px] text-black ${next || near ? "h-7 w-7 border-2 border-amber-50 bg-amber-300/90 shadow-[0_0_12px_#ffb020]" : "h-4 w-4 border border-white/40 bg-black/40"}`}
              style={{ left: `${pad.x * 100}%`, top: `${pad.y * 100}%` }}
            >
              {next ? i + 1 : ""}
            </span>
          );
        })}
        {nearHot && (
          <span
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 blur-md"
            style={{
              left: `${haunt.hotspot.x * 100}%`,
              top: `${haunt.hotspot.y * 100}%`,
              width: "14%",
              height: "5%",
              background: "radial-gradient(ellipse, rgba(255,160,60,0.18), transparent 72%)",
            }}
          />
        )}
        <RoomReaction
          id={room?.id}
          done={haunt.hotspot.done}
          step={haunt.step}
          seq={room?.seq ?? []}
          pads={room?.padPoints ?? []}
          hot={haunt.hotspot}
        />
        <div
          className="pointer-events-none absolute z-[2]"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.y * 100}%`,
            width: `${18 * scale}%`,
            height: `${4.6 * scale}%`,
            transform: "translate(-50%, -30%)",
            background: "radial-gradient(ellipse at center, rgba(8,4,2,0.82) 0%, rgba(36,14,4,0.38) 46%, transparent 74%)",
            filter: "blur(1.5px)",
          }}
        />
        <img
          src={haunt.outfit}
          alt=""
          aria-hidden
          className="pointer-events-none absolute z-[3] w-auto max-w-none"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.y * 100}%`,
            height: `${46 * scale}cqh`,
            transform: `translate(-50%, ${-stand.foot * 100}%)`,
            filter: "blur(10px) sepia(1) saturate(4) brightness(0.9)",
            opacity: 0.22,
            mixBlendMode: "screen",
          }}
        />
        <div
          className="pointer-events-none absolute z-[4]"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.y * 100}%`,
            height: `${46 * scale}cqh`,
            transform: `translate(-50%, ${-stand.foot * 100}%)`,
            filter: "drop-shadow(0 16px 8px rgba(8,3,0,0.75))",
          }}
        >
          <img
            src={haunt.outfit}
            alt=""
            className="block h-full w-auto max-w-none"
            style={{ filter: TINT[haunt.tint] }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: GRADE[haunt.tint],
              mixBlendMode: "multiply",
              opacity: 0.48,
              WebkitMaskImage: `url(${haunt.outfit})`,
              maskImage: `url(${haunt.outfit})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
          />
        </div>
        {haunt.lurk && !haunt.pop && (
          <img
            src={haunt.lurk.image}
            alt=""
            className="haunt-lurk pointer-events-none absolute z-[3] w-[24%] max-w-[300px] object-cover"
            style={{
              left: `${haunt.lurk.x * 100}%`,
              top: `${Math.max(0.1, haunt.lurk.y - 0.52) * 100}%`,
            }}
          />
        )}
        <img
          src={haunt.image}
          alt=""
          className={`pointer-events-none absolute inset-0 z-[5] h-full w-full ${haunt.pop ? "haunt-dim" : "haunt-candle"}`}
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 92%, #000 98%, #000 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, transparent 92%, #000 98%, #000 100%)",
          }}
        />
        {(haunt.prompt || haunt.note) && !haunt.hall && (
          <button
            type="button"
            onClick={haunt.prompt ? onUse : undefined}
            className="pointer-events-auto absolute z-[8] min-h-11 -translate-x-1/2 rounded-full border border-orange-200/80 bg-black/80 px-3 text-sm font-semibold text-orange-50"
            style={{ left: `${haunt.x * 100}%`, top: `calc(${haunt.y * 100}% - ${52 * scale}cqh)` }}
          >
            {haunt.note && <span className="block text-[10px] uppercase tracking-wide text-orange-200">{haunt.note}</span>}
            {haunt.prompt ? (coarse ? haunt.prompt : `E  ${haunt.prompt}`) : null}
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
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,4,14,0.78) 0%, rgba(28,2,8,0.5) 26%, rgba(36,10,4,0.16) 58%, rgba(0,0,0,0.02) 76%, rgba(0,0,0,0.45) 100%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          background: "radial-gradient(ellipse at 50% 78%, rgba(255,120,40,0.16), transparent 42%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[7]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, transparent 6%, rgba(18,0,0,0.42) 50%, rgba(0,0,0,0.9) 100%)",
        }}
      />
      <div className="haunt-grain pointer-events-none absolute inset-0 z-[7]" />
      {haunt.pop && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[8]"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 36%, rgba(0,0,0,0.34) 68%, transparent 88%)",
            }}
          />
          <div className="haunt-flash pointer-events-none absolute inset-0 z-[8]" />
          <div
            key={haunt.pop.image}
            className="haunt-ghost pointer-events-none absolute left-1/2 top-0 z-[9] w-[min(38vw,380px)]"
          >
            <img src={haunt.pop.image} alt="" className="w-full object-cover" />
          </div>
        </>
      )}
      {haunt.hall && <div className="absolute inset-0 z-30 bg-black/80" />}
      {introOn && !haunt.hall && (
        <div className="absolute left-1/2 top-[12%] z-30 -translate-x-1/2 text-center text-white">
          <p className="font-display text-2xl tracking-wide text-orange-100">{haunt.name}</p>
        </div>
      )}
    </div>
      <div
        className="pointer-events-none absolute inset-x-0 z-40 flex items-start justify-center px-3"
        style={{ bottom: coarse ? "12.6rem" : 0, height: coarse ? "3.6rem" : dock }}
      >
        <div className="pointer-events-none flex w-[min(22rem,78vw)] items-center gap-2 rounded-full border border-orange-400/35 bg-black/80 px-3 py-1 text-white shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-orange-300">{haunt.name}</p>
            <p className="truncate text-xs leading-snug text-orange-50">{haunt.objective}</p>
          </div>
          <p className="shrink-0 text-right text-[10px] font-semibold leading-tight text-lime-300">
            LETTERS
            <br />
            {haunt.letters}/{haunt.lettersMax}
          </p>
          <button type="button" onClick={() => setMapOpen(true)} className="pointer-events-auto min-h-11 rounded-full px-2 text-[11px] font-semibold uppercase text-orange-100">
            Map
          </button>
          <button type="button" onClick={onLeave} className="pointer-events-auto min-h-11 rounded-full px-2 text-[11px] font-semibold uppercase text-white/80">
            Leave
          </button>
        </div>
      </div>
      {fly && (
        <span
          className="haunt-letter-fly pointer-events-none absolute z-50 font-display text-3xl text-orange-200 drop-shadow-[0_0_12px_#ff7a1a]"
          style={{ left: `${flyX}%`, top: "58%" }}
        >
          {fly}
          <span className="ml-2 text-sm text-lime-300">+$15</span>
        </span>
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
