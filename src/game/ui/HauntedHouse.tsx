import { useState } from "react";
import { HAUNT_BODY, HAUNT_ROOMS, HW_ART, benjiStand, presentedBy } from "../halloween";

export type HauntPanel = {
  room: number;
  rooms: number;
  name: string;
  image: string;
  aspect: string;
  objective: string;
  x: number;
  y: number;
  letter: { x: number; y: number; got: boolean } | null;
  action: { x: number; y: number; label: string; done: boolean };
  doorOpen: boolean;
  scare: string | null;
  note: string | null;
  kind: string;
  letters: number;
  lettersMax: number;
  found: string[];
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
};

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
  const by = presentedBy("sponsor_hauntedhouse_01");
  const stand = benjiStand(haunt.outfit);
  const imgH = HAUNT_BODY / Math.max(0.2, stand.foot - stand.crown);
  const [mapOpen, setMapOpen] = useState(false);
  const debug =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("hauntdebug") === "1" ||
      Boolean((window as unknown as { __HAUNTED_DEBUG__?: boolean }).__HAUNTED_DEBUG__));
  const pads = room?.pads;
  const [aw, ah] = haunt.aspect.split("/").map((n) => Number(n.trim()));
  const aspect = aw && ah ? `${aw} / ${ah}` : "4 / 3";
  return (
    <div className="absolute inset-0 z-20 bg-black" style={{ containerType: "size" }}>
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${haunt.pop ? "haunt-shake" : ""}`}
        style={{
          aspectRatio: aspect,
          width: `min(100cqw, calc(100cqh * ${aw || 4} / ${ah || 3}))`,
          height: `min(100cqh, calc(100cqw * ${ah || 3} / ${aw || 4}))`,
        }}
      >
        <img src={haunt.image} alt="" className={`absolute inset-0 h-full w-full object-fill ${haunt.pop ? "haunt-dim" : "haunt-flicker"}`} />
        {haunt.letter && !haunt.letter.got && (
          <span
            className="absolute z-[2] h-3.5 w-3.5 -translate-x-1/2 -translate-y-full rounded-full border border-orange-200 bg-orange-500 shadow-[0_0_10px_#ff7a1a]"
            style={{ left: `${haunt.letter.x * 100}%`, top: `${haunt.floorY * 100}%` }}
          />
        )}
        {haunt.doorOpen && (
          <span
            className="absolute z-[2] -translate-x-1/2 -translate-y-full rounded-full border border-orange-200/80 bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange-100"
            style={{ left: `${haunt.doorX * 100}%`, top: `${haunt.floorY * 100}%` }}
          >
            Exit
          </span>
        )}
        <div
          className="pointer-events-none absolute z-[2] h-[1.6%] w-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/55 blur-[1px]"
          style={{ left: `${haunt.x * 100}%`, top: `${haunt.floorY * 100}%` }}
        />
        <img
          src={haunt.outfit}
          alt=""
          className="pointer-events-none absolute z-[3] w-auto max-w-none"
          style={{
            left: `${haunt.x * 100}%`,
            top: `${haunt.floorY * 100}%`,
            height: `${imgH * 100}%`,
            transform: `translate(-50%, ${-stand.foot * 100}%)`,
            filter: "drop-shadow(0 6px 4px rgba(0,0,0,0.45))",
          }}
        />
        {haunt.pop && (
          <img
            key={haunt.pop.image + haunt.pop.line}
            src={haunt.pop.image}
            alt=""
            className="haunt-ghost pointer-events-none absolute z-[4] w-[34%] max-w-[280px] object-cover"
            style={{ left: `${haunt.pop.x * 100}%`, top: `${haunt.pop.y * 100}%` }}
          />
        )}
        {debug && (
          <>
            <div className="absolute right-2 top-2 z-20 rounded bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300">
              {room?.id} · floorY {haunt.floorY.toFixed(2)}
              <br />
              feet {haunt.x.toFixed(2)}, {haunt.floorY.toFixed(2)} · foot {stand.foot.toFixed(2)}
              <br />
              walk {haunt.walkMinX.toFixed(2)}–{haunt.walkMaxX.toFixed(2)} · door {haunt.doorX.toFixed(2)}
              <br />
              letters {haunt.found.join(" ") || "none"}
            </div>
            <div
              className="absolute z-20 h-0.5 bg-red-500"
              style={{ left: `${haunt.walkMinX * 100}%`, width: `${(haunt.walkMaxX - haunt.walkMinX) * 100}%`, top: `${haunt.floorY * 100}%` }}
            />
            <div
              className="absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400"
              style={{ left: `${haunt.x * 100}%`, top: `${haunt.floorY * 100}%` }}
            />
          </>
        )}
        {haunt.hall && <div className="absolute inset-0 z-30 bg-black/75" />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-[68%] rounded-xl border border-orange-500/40 bg-black/60 px-3 py-2 text-white">
          <p className="text-[10px] uppercase tracking-[0.18em] text-orange-300">Haunted House · East Memphis</p>
          <p className="font-display text-xl leading-none">{haunt.name}</p>
          <p className="mt-1 text-xs text-orange-100/90">{haunt.objective}</p>
          <p className="mt-1 text-[11px] text-lime-300">
            Letters {haunt.letters}/{haunt.lettersMax}
            {by ? ` · ${by}` : ""}
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={() => setMapOpen(true)} className="min-h-11 rounded-xl border border-orange-300/50 bg-black/75 px-3 text-xs font-semibold uppercase text-orange-100">
            Map
          </button>
          <button type="button" onClick={onUse} className="min-h-11 rounded-xl bg-lime-400 px-4 font-display text-lg text-black">
            {haunt.prompt ?? "Use"}
          </button>
          <button type="button" onClick={onLeave} className="min-h-11 rounded-xl border border-white/20 bg-black/80 px-3 text-xs font-semibold uppercase text-white">
            Exit
          </button>
        </div>
      </div>
      {!haunt.pop && !haunt.hall && (haunt.note || haunt.scare) && (
        <div className="pointer-events-none absolute left-1/2 top-[18%] z-40 max-w-[80%] -translate-x-1/2 rounded-lg bg-black/55 px-3 py-1.5 text-center text-xs text-orange-100">
          {haunt.scare ?? haunt.note}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-28 z-40 flex justify-center gap-2 px-3">
        {pads && !haunt.action.done && !haunt.hall && (
          [1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => onCandle(n)} className="pointer-events-auto min-h-11 min-w-11 rounded-full border border-orange-300 bg-orange-600 px-3 font-display text-lg text-black">
              {pads === "books" ? ["I", "II", "III"][n - 1] : n}
            </button>
          ))
        )}
        {room?.kind === "shootout" && haunt.popped && !haunt.pop && (
          <button type="button" onClick={onUse} className="pointer-events-auto min-h-11 rounded-xl bg-orange-500 px-4 font-display text-2xl text-black">
            Start the 10-shot
          </button>
        )}
      </div>
      {mapOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-full w-full max-w-lg overflow-auto rounded-xl border border-orange-500/40 bg-black p-3 text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-2xl text-orange-200">House map</p>
              <button type="button" onClick={() => setMapOpen(false)} className="min-h-11 rounded-lg border border-white/20 px-3 text-xs uppercase">
                Close
              </button>
            </div>
            <img src={HW_ART.map} alt="Haunted house floor plan" className="mt-2 w-full rounded-lg object-contain" />
            <p className="mt-2 text-sm text-orange-100">
              You are in {haunt.name}. Letters {haunt.letters}/{haunt.lettersMax}
            </p>
            <ul className="mt-2 space-y-0.5 text-xs">
              {HAUNT_ROOMS.map((r) => {
                const has = !!r.letter;
                const got = has && haunt.found.includes(r.id);
                return (
                  <li key={r.id} className={r.id === room?.id ? "text-orange-200" : "text-white/75"}>
                    {r.id === room?.id ? "● " : "○ "}
                    {r.name}
                    {r.id === "cathedral" ? " · 10th letter is the 10-shot" : has ? (got ? " · letter" : " · letter hidden") : ""}
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
