import { useEffect, useRef } from "react";
import type { Action } from "../core/input";
import { JOOK_LEAD } from "../core/keys";
import type { Game } from "../game";

const LANES: { a: Action; glyph: string; name: string; key: string; color: string }[] = [
  { a: "left", glyph: "←", name: "Glide", key: "A", color: "#5ac8ff" },
  { a: "down", glyph: "↓", name: "Buck", key: "S", color: "#ff5a5a" },
  { a: "up", glyph: "↑", name: "Toes", key: "W", color: "#ffd23a" },
  { a: "right", glyph: "→", name: "Glide", key: "D", color: "#39ff14" },
];
const SPIN = "#ff4fd8";
const POOL = 24;
const WORDS = ["", "DEAD ON", "CLOSE", "MISSED"];
const WORD_COLORS = ["", "#39ff14", "#ffd23a", "#ff5a5a"];

/**
 * Jookin, on the screen: four lanes the moves come down, landing on the row of buttons at the
 * bottom as the beat does, and a bar right across for a spin. The buttons are the controls on a
 * touch screen. Everything that moves is placed straight from the game's numbers each frame.
 */
export function JookLane({ game, touch, pad }: { game: Game; touch: boolean; pad: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const notes = useRef<(HTMLDivElement | null)[]>([]);
  const pads = useRef<(HTMLButtonElement | null)[]>([]);
  const line = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const l = game.live;
      const el = track.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const lane = w / 4;
      const row = pads.current[0]?.offsetHeight ?? 56;
      // A move lands when its middle is on the middle of the buttons.
      const land = h - row / 2;
      for (let i = 0; i < POOL; i++) {
        const n = notes.current[i];
        if (!n) continue;
        if (i >= l.jookN) {
          if (n.style.display !== "none") n.style.display = "none";
          continue;
        }
        const which = l.jook[i * 3]!;
        const left = l.jook[i * 3 + 1]!;
        const state = l.jook[i * 3 + 2]!;
        const y = land * (1 - left / JOOK_LEAD);
        const spin = which === 4;
        const kind = String(which);
        if (n.dataset.kind !== kind) {
          n.dataset.kind = kind;
          n.textContent = spin ? "SPIN" : LANES[which]!.glyph;
          n.style.background = spin ? SPIN : LANES[which]!.color;
          n.style.width = `${spin ? w - 8 : lane - 12}px`;
          n.style.height = spin ? "22px" : "38px";
          n.style.fontSize = spin ? "13px" : "26px";
          n.style.letterSpacing = spin ? "0.3em" : "0";
        }
        n.style.display = state === 1 ? "none" : "flex";
        n.style.opacity = state === 2 ? "0.22" : String(Math.min(1, (JOOK_LEAD - left) * 3 + 0.25));
        n.style.transform = `translate3d(${spin ? 4 : which * lane + 6}px, ${y - (spin ? 11 : 19)}px, 0)`;
      }
      // The buttons: lit by a press, and breathing with the beat so the eye has something to count by.
      const frac = l.jookBeat - Math.floor(l.jookBeat);
      const throb = Math.max(0, 1 - frac * 3.2);
      for (let i = 0; i < 4; i++) {
        const p = pads.current[i];
        if (!p) continue;
        const tap = l.jookTap[i] ?? 0;
        p.style.transform = `scale(${1 + tap * 0.14})`;
        p.style.boxShadow = tap > 0.02 ? `0 0 ${10 + tap * 22}px ${LANES[i]!.color}` : `0 0 ${throb * 9}px rgba(255,255,255,${0.35 * throb})`;
        p.style.background = tap > 0.02 ? LANES[i]!.color : "rgba(8,8,10,0.72)";
        p.style.color = tap > 0.02 ? "#06140a" : LANES[i]!.color;
      }
      if (line.current) {
        const tap = l.jookTap[4] ?? 0;
        line.current.style.opacity = String(0.35 + throb * 0.3 + tap * 0.5);
        line.current.style.background = tap > 0.05 ? SPIN : "#ffffff";
      }
      if (word.current) {
        const age = l.jookWordAge;
        const on = l.jookWord > 0 && age < 0.55;
        word.current.style.opacity = on ? String(1 - age / 0.55) : "0";
        if (on) {
          const text = WORDS[l.jookWord]!;
          if (word.current.textContent !== text) {
            word.current.textContent = text;
            word.current.style.color = WORD_COLORS[l.jookWord]!;
          }
          word.current.style.transform = `translateY(${-age * 26}px) scale(${1 + Math.max(0, 0.18 - age) * 1.4})`;
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <div data-jook className={`absolute left-1/2 z-20 w-[min(84vw,300px)] -translate-x-1/2 ${touch ? "bottom-6 [@media(max-width:620px)]:bottom-44" : "bottom-6"}`}>
      <div ref={word} className="sr-title pointer-events-none mb-1 h-7 text-center text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]" style={{ opacity: 0 }} />
      <div ref={track} className="relative h-[230px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-black/0 via-black/35 to-black/70 [@media(max-height:480px)]:h-[150px]">
        {/* Lane lines. */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-white/10" style={{ left: `${i * 25}%` }} />
        ))}
        {/* Where a move lands. */}
        <div ref={line} className="absolute inset-x-0 h-[3px] rounded-full" style={{ bottom: 27, opacity: 0.4, background: "#fff" }} />
        {Array.from({ length: POOL }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              notes.current[i] = el;
            }}
            className="absolute left-0 top-0 items-center justify-center rounded-lg font-black leading-none text-[#06140a] shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            style={{ display: "none", willChange: "transform" }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 flex">
          {LANES.map((k, i) => (
            <div key={k.a} className="flex w-1/4 justify-center">
              <button
                data-jook-pad={k.a}
                ref={(el) => {
                  pads.current[i] = el;
                }}
                className="sr-touch pointer-events-auto flex h-14 w-[86%] flex-col items-center justify-center rounded-xl border-2 border-white/35 text-2xl font-black leading-none"
                style={{ background: "rgba(8,8,10,0.72)", color: k.color }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  game.sound.unlock();
                  game.input.press(k.a);
                }}
              >
                {k.glyph}
                <span className="mt-0.5 text-[9px] uppercase tracking-widest text-white/70">{touch || pad ? k.name : `${k.key} · ${k.name}`}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/75 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
        <span style={{ color: SPIN }}>Spin</span> {touch ? "· the big button" : pad ? "· A" : "· Space"}
        <span className="mx-2 text-white/30">|</span>hit it as it lands
      </div>
    </div>
  );
}
