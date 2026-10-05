import type { PointerEvent } from "react";
import type { HudState } from "../core/types";

export function Hud({ state, night, action }: { state: HudState; night: () => void; action: (code: string) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 text-[#f4efe4]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="absolute left-3 top-3 flex max-w-[11.5rem] flex-wrap gap-2 sm:max-w-none">
        <Chip label="SACK" value={`$${state.dollars}`} />
        <Chip label="RESPECT" value={String(state.respect)} />
        <Chip label={placeName(state.place)} value={state.night ? "NIGHT" : "DAY"} />
        {state.carrying && <Chip label="DROP" value="ON" />}
      </div>
      <div className="absolute right-3 top-3 w-24 rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] p-2 sm:top-4 sm:w-36">
        <div className="text-[10px] tracking-[0.18em] text-[#e0b33a]">MEMPHIS</div>
        <Mini state={state} />
      </div>
      <div className="absolute left-3 right-[7.5rem] top-[7.15rem] rounded-md bg-[#0d0d0dcc] px-3 py-2 text-center text-sm sm:left-1/2 sm:right-auto sm:top-4 sm:max-w-[70vw] sm:-translate-x-1/2">
        {state.mission}
      </div>
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
        WASD move · E interact · Space shoot · N night
      </div>
    </div>
  );
}

function placeName(place: HudState["place"]) {
  if (place === "home") return "BENJI HOME";
  if (place === "hq") return "HQ";
  if (place === "court") return "901 COURT";
  return "THE BLOCK";
}

function Dialogue({ line }: { line: string }) {
  const [name, text] = line.includes(" — ") ? line.split(" — ") : ["", line];
  const portrait = name.startsWith("Court") ? "/game/people/court-og.webp" : "/game/people/k-blanco-hq-cutout.png";
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
  const x = state.place === "home" ? 22 : state.place === "hq" ? 62 : Math.max(8, Math.min(92, ((state.x + 60) / 150) * 100));
  const y = state.place === "home" || state.place === "hq" ? 46 : Math.max(8, Math.min(62, 40 - state.z * 1.15));
  return (
    <svg viewBox="0 0 100 70" className="mt-1 h-16 w-full">
      <rect width="100" height="70" fill="#1a1c1b" />
      <rect x="8" y="30" width="84" height="8" fill="#3a3f44" />
      <rect x="42" y="8" width="8" height="54" fill="#3a3f44" />
      <rect x="62" y="14" width="16" height="12" fill="#e0b33a" />
      <rect x="78" y="18" width="12" height="10" fill="#1d4e8f" />
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
