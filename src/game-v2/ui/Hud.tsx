import type { PointerEvent } from "react";
import type { HudState } from "../core/types";
import { characters } from "../assets/characters";

export function Hud({ state, night, action }: { state: HudState; night: () => void; action: (code: string) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 text-[#f4efe4]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="absolute left-3 top-3 flex max-w-[11.5rem] flex-wrap gap-2 sm:max-w-none">
        <Chip label="SACK" value={`$${state.dollars}`} />
        <Chip label="RESPECT" value={String(state.respect)} />
        <Chip label={placeName(state.place)} value={state.night ? "NIGHT" : state.golden ? "GOLDEN" : "DAY"} />
        {state.carrying && <Chip label="DROP" value="ON" />}
        {state.boost && <Chip label="FED" value="GO" />}
        {state.fit !== "default" && <Chip label="FIT" value={state.fit.toUpperCase()} />}
      </div>
      <div className="absolute right-3 top-3 w-24 rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] p-2 sm:top-4 sm:w-36">
        <div className="text-[10px] tracking-[0.18em] text-[#e0b33a]">MEMPHIS</div>
        <Mini state={state} />
      </div>
      <div className="absolute left-3 right-[7.5rem] top-[7.15rem] rounded-md bg-[#0d0d0dcc] px-3 py-2 text-center text-sm sm:left-1/2 sm:right-auto sm:top-4 sm:max-w-[70vw] sm:-translate-x-1/2">
        {state.mission}
      </div>
      <div className="absolute left-3 top-[10.6rem] flex gap-1 text-[10px] tracking-[0.14em] sm:left-1/2 sm:top-14 sm:-translate-x-1/2">
        <Mark on={state.marks.fish} label="FISH" />
        <Mark on={state.marks.bowl} label="BOWL" />
        <Mark on={state.marks.food} label="EAT" />
        <Mark on={state.marks.race} label="RUN" />
      </div>
      {state.log && <Log state={state} />}
      {state.dialogue && <Dialogue line={state.dialogue} />}
      {state.charge > 0 && (
        <div className="absolute bottom-28 left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded bg-[#0d0d0d] sm:bottom-24">
          <div className="h-full bg-[#e0b33a]" style={{ width: `${state.charge * 100}%` }} />
        </div>
      )}
      {state.prompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-[#e0b33a] bg-[#0d0d0df2] px-4 py-2 text-sm sm:bottom-8">
          {state.prompt}
        </div>
      )}
      {state.place === "court" && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 text-xs tracking-widest text-[#e0b33a] sm:bottom-20">
          {state.made} MADE / {state.taken} TAKEN
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-4 left-4 h-28 w-28 sm:hidden">
        <Stick />
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2 sm:hidden">
        <Round label="N" onPointerDown={night} />
        <Round label="E" onPointerDown={() => action("KeyE")} />
        <Round label="SHOT" onPointerDown={() => action("SpaceDown")} onPointerUp={() => action("SpaceUp")} />
      </div>
      <div className="absolute bottom-3 right-4 hidden text-[11px] tracking-wide text-[#f4efe4aa] sm:block">
        Arrows or WASD · E interact · Space shoot · Shift run · N night · M card
      </div>
    </div>
  );
}

function placeName(place: HudState["place"]) {
  if (place === "home") return "BENJI HOME";
  if (place === "hq") return "HQ";
  if (place === "court") return "901 COURT";
  if (place === "haunt") return "HAUNTED";
  return "THE BLOCK";
}

function Mark({ on, label }: { on: boolean; label: string }) {
  return (
    <div className={`rounded px-2 py-1 ${on ? "bg-[#e0b33a] text-[#0d0d0d]" : "bg-[#0d0d0dcc] text-[#f4efe488]"}`}>{label}</div>
  );
}

function Log({ state }: { state: HudState }) {
  return (
    <div className="absolute left-3 top-[12.4rem] w-56 rounded-md border border-[#e0b33a] bg-[#0d0d0df2] p-3 text-sm sm:left-4 sm:top-28">
      <div className="text-[10px] tracking-[0.18em] text-[#e0b33a]">BLOCK CARD</div>
      <div className="mt-2">Fit {state.fit}</div>
      <div>Bait {state.bait}</div>
      <div>Best bowl {state.bestBowl}</div>
      <div>Best run {state.bestRace ? `${state.bestRace.toFixed(1)}s` : "—"}</div>
      <div className="mt-2 text-xs text-[#f4efe4aa]">Court fit pockets shots. River fit holds the bite. Night fit owns the strip.</div>
    </div>
  );
}

function Dialogue({ line }: { line: string }) {
  const [name, text] = line.includes(" — ") ? line.split(" — ") : ["", line];
  const portrait = name.startsWith("Court")
    ? characters.courtOg.views.front.src
    : name.startsWith("K")
      ? characters.kBlanco.portrait
      : name.startsWith("Mama")
        ? characters.mamaDee.views.front.src
        : name.startsWith("Unc")
          ? characters.uncJ.views.front.src
          : name.startsWith("Nitro") || name.startsWith("Night")
            ? characters.nitro.views.front.src
            : name.startsWith("Strike") || name.startsWith("901")
              ? characters.strike.views.front.src
              : characters.benji.views.front.src;
  return (
    <div className="absolute bottom-40 left-1/2 flex w-[min(94vw,520px)] -translate-x-1/2 items-center gap-3 rounded-md border border-[#e0b33a] bg-[#0d0d0df2] px-3 py-3 sm:bottom-20">
      <img src={portrait} alt="" className="h-16 w-12 shrink-0 object-contain object-bottom" />
      <div>
        {name && <div className="text-[11px] tracking-[0.18em] text-[#e0b33a]">{name.toUpperCase()}</div>}
        <div className="text-sm leading-snug">{text}</div>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] px-3 py-2">
      <div className="text-[10px] tracking-[0.16em] text-[#e0b33a]">{label}</div>
      <div className="text-lg leading-none">{value}</div>
    </div>
  );
}

function Mini({ state }: { state: HudState }) {
  const x = state.place === "home" ? 28 : state.place === "hq" ? 55 : state.place === "haunt" ? 18 : Math.max(4, Math.min(96, ((state.x + 80) / 190) * 100));
  const y = state.place === "home" || state.place === "hq" || state.place === "haunt" ? 34 : Math.max(4, Math.min(66, ((30 - state.z) / 130) * 70));
  return (
    <svg viewBox="0 0 100 70" className="mt-1 h-16 w-full">
      <rect width="100" height="70" fill="#1a1c1b" />
      <rect x="6" y="18" width="78" height="5" fill="#3a3f44" />
      <rect x="32" y="18" width="4" height="40" fill="#3a3f44" />
      <rect x="52" y="22" width="10" height="8" fill="#e0b33a" />
      <rect x="70" y="28" width="8" height="6" fill="#1d4e8f" />
      <rect x="78" y="30" width="10" height="7" fill="#ff4fd8" />
      <rect x="58" y="8" width="14" height="8" fill="#ffb45a" />
      <rect x="14" y="36" width="12" height="6" fill="#ff4d4d" />
      <rect x="4" y="58" width="70" height="6" fill="#1c4d6e" />
      <circle cx={x} cy={y} r="3" fill="#39ff14" />
    </svg>
  );
}

function Round({ label, onPointerDown, onPointerUp }: { label: string; onPointerDown: () => void; onPointerUp?: () => void }) {
  return (
    <button
      type="button"
      className="h-14 w-14 rounded-full border border-[#e0b33a] bg-[#0d0d0de6] text-xs font-semibold"
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown();
      }}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {label}
    </button>
  );
}

function Stick() {
  return (
    <div
      className="relative h-full w-full rounded-full border border-[#e0b33a88] bg-[#0d0d0d99]"
      onPointerDown={(e) => moveStick(e)}
      onPointerMove={(e) => {
        if (e.buttons) moveStick(e);
      }}
      onPointerUp={releaseStick}
      onPointerCancel={releaseStick}
    >
      <div id="sack-v2-knob" className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0b33a]" />
    </div>
  );
}

function moveStick(e: PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height * 2 - 1);
  const input = (window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }).__SACK_V2_INPUT__;
  input?.setStick(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
}

function releaseStick() {
  (window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }).__SACK_V2_INPUT__?.setStick(0, 0);
}
