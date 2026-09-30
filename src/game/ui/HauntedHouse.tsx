import { HAUNT_ROOMS, presentedBy } from "../halloween";

export type HauntPanel = {
  room: number;
  rooms: number;
  name: string;
  image: string;
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
  outfit: string;
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
  return (
    <div className="absolute inset-0 z-20">
      <img src={haunt.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/45" />
      {haunt.letter && !haunt.letter.got && (
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300 bg-orange-500 shadow-[0_0_12px_#ff7a1a]"
          style={{ left: `${haunt.letter.x * 100}%`, top: `${haunt.letter.y * 100}%` }}
        />
      )}
      {!haunt.action.done && (
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-300 bg-lime-400/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-black"
          style={{ left: `${haunt.action.x * 100}%`, top: `${haunt.action.y * 100}%` }}
        >
          {haunt.action.label}
        </span>
      )}
      {haunt.doorOpen && (
        <span className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 rounded-full border border-orange-200 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-wider text-orange-200">
          Door · walk up and press E
        </span>
      )}
      <img
        src={haunt.outfit}
        alt=""
        className="pointer-events-none absolute w-[18%] max-w-[140px] -translate-x-1/2 -translate-y-[92%] drop-shadow-[0_10px_12px_rgba(0,0,0,0.65)]"
        style={{ left: `${haunt.x * 100}%`, top: `${haunt.y * 100}%` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-[70%] rounded-xl border border-orange-500/50 bg-black/75 px-3 py-2 text-white">
          <p className="text-[10px] uppercase tracking-[0.22em] text-orange-300">10 Letters After Dark</p>
          <p className="font-display text-xl leading-none text-white">{haunt.name}</p>
          <p className="mt-1 text-xs text-orange-100/90">{haunt.objective}</p>
          <p className="mt-1 text-[11px] text-lime-300">
            Letters {haunt.letters}/{haunt.lettersMax}
            {by ? ` · ${by}` : ""}
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={onUse} className="min-h-11 rounded-xl bg-lime-400 px-4 font-display text-lg text-black">
            Use
          </button>
          <button type="button" onClick={onLeave} className="min-h-11 rounded-xl border border-white/20 bg-black/80 px-3 text-xs font-semibold uppercase text-white">
            Exit
          </button>
        </div>
      </div>
      {(haunt.note || haunt.scare) && (
        <div className="pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 rounded-xl border border-lime-400/40 bg-black/75 px-4 py-2 text-center text-sm text-lime-200">
          {haunt.scare ?? haunt.note}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-28 flex justify-center gap-2 px-3">
        {room?.kind === "order" && !haunt.action.done && (
          [1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => onCandle(n)} className="pointer-events-auto min-h-11 min-w-11 rounded-full border border-orange-300 bg-orange-600 px-3 font-display text-lg text-black">
              {n}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
