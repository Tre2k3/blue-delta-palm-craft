import { useEffect, useState, type ReactNode } from "react";
import type { HudState, TableHud } from "../core/types";
import type { Game } from "../game";
import type { CheckersView } from "../play/tables/checkers";
import type { ChessView } from "../play/tables/chess";
import type { DominoView, Tile } from "../play/tables/dominoes";
import type { FourView, TicView } from "../play/tables/grids";
import type { SpadesView } from "../play/tables/spades";
import { SIDES } from "../play/tables";
import { Sheet } from "./Menus";

type Send = (move: unknown) => void;

/** The table Benji is sat at: how to play it, then the game itself. */
export function TableScreen({ game, hud }: { game: Game; hud: HudState }) {
  const t = hud.table;
  if (!t) return null;
  const send: Send = (m) => game.board.move(m);
  // The card and tile games need the full width of the sheet.
  const wide = t.id === "spades" || t.id === "dominoes";
  const on = t.online;
  const sub = t.stage === "pick" ? t.line : on ? (t.stage === "wait" ? `Asking ${on.name} for a game.` : `Against ${on.name}, each on your own device  ·  You are ${SIDES[t.id]?.[on.seat] ?? "up"}${on.seat === 0 ? " and move first" : ""}`) : t.two ? "Two players, one device. Pass it across after each move." : `Against ${t.id === "spades" ? `${t.rivals[1]} and ${t.rivals[2]}, with ${t.rivals[0]}` : t.rivals[0]}  ·  ${t.levels[t.level]!.name}`;
  return (
    <Sheet title={t.name} sub={sub} onClose={() => game.close()} wide={wide}>
      {t.stage === "pick" ? (
        <Pick game={game} t={t} />
      ) : t.stage === "wait" ? (
        <div data-waiting className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#39ff14]" />
          <div className="sr-title text-2xl text-white">Waiting for {on?.name}</div>
          <div className="max-w-[360px] text-sm text-white/65">They have half a minute to sit down. You get the first move.</div>
          <button className="sr-btn sr-btn-ghost px-5 py-2" onClick={() => game.board.sit(t.id)}>
            Never mind
          </button>
        </div>
      ) : (
        <div className={`flex flex-col items-center gap-3 ${wide ? "" : "[@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-start [@media(max-height:520px)]:justify-center"}`}>
          <div className={`flex flex-col items-center gap-3 ${wide ? "w-full" : "[@media(max-height:520px)]:w-[42%]"}`}>
            <Status t={t} spare={wide} />
          {t.stage === "done" && t.result && (
              <div className="sr-pop w-full max-w-[520px] rounded-xl border border-white/15 bg-black/60 p-4 text-center">
                <div className="sr-title text-2xl" style={{ color: t.result.won === true ? "#39ff14" : t.result.won === false ? "#ff6b6b" : "#f4d77a" }}>
                  {on ? (t.result.won === true ? "You win" : t.result.won === false ? `${on.name} wins` : on.gone ? "Game off" : "A draw") : t.two ? "Game over" : t.result.won === true ? "You win" : t.result.won === false ? `${t.id === "spades" ? "They take it" : `${t.rivals[0]} wins`}` : "A draw"}
                </div>
                <div className="mt-1 text-sm text-white/75">{t.result.text}</div>
                {t.result.pay > 0 && <div className="mt-1 text-sm font-extrabold text-[#39ff14]">+${t.result.pay}</div>}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {on ? (
                    !on.gone && (
                      <button data-primary data-rematch disabled={on.again} className={`sr-btn px-5 py-2 disabled:opacity-60 ${on.theirs ? "sr-btn-gold" : "sr-btn-green"}`} onClick={() => game.board.again()}>
                        {on.again ? `Waiting for ${on.name}…` : on.theirs ? `${on.name} wants a rematch: play` : "Rematch"}
                      </button>
                    )
                  ) : (
                    <button data-primary className="sr-btn sr-btn-green px-5 py-2" onClick={() => game.board.start(t.level, t.two)}>
                      Play again
                    </button>
                  )}
                  <button className="sr-btn sr-btn-ghost px-4 py-2" onClick={() => game.board.sit(t.id)}>
                    Change the game
                  </button>
                  <button className="sr-btn sr-btn-ghost px-4 py-2" onClick={() => game.close()}>
                    Get up
                  </button>
                </div>
              </div>
            )}
          </div>
          {t.id === "chess" && <ChessBoard v={t.view as ChessView} mine={t.mine} send={send} flip={on?.seat === 1} />}
          {t.id === "checkers" && <CheckersBoard v={t.view as CheckersView} mine={t.mine} send={send} flip={on?.seat === 1} />}
          {t.id === "connect4" && <FourBoard v={t.view as FourView} mine={t.mine} send={send} />}
          {t.id === "tictactoe" && <TicBoard v={t.view as TicView} mine={t.mine} send={send} />}
          {t.id === "dominoes" && <DominoTable v={t.view as DominoView} mine={t.mine} send={send} rival={t.rivals[0]!} />}
          {t.id === "spades" && <SpadesTable v={t.view as SpadesView} mine={t.mine} send={send} names={["You", t.rivals[1]!, t.rivals[0]!, t.rivals[2]!]} />}
        </div>
      )}
    </Sheet>
  );
}

function Pick({ game, t }: { game: Game; t: TableHud }) {
  const colors = ["#35e0d0", "#f4d77a", "#ff8a1e"];
  return (
    <div className="grid gap-3">
      <ul className="grid gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
        {t.how.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-[#39ff14]">•</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-2">
        {t.levels.map((l, i) => (
          <button key={l.name} data-primary={i === 1 ? true : undefined} data-level={i} onClick={() => game.board.start(i)} className="flex items-center gap-3 rounded-xl border bg-white/5 p-3 text-left transition hover:bg-white/10" style={{ borderColor: `${colors[i]}55` }}>
            <div className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
            <div className="min-w-0 flex-1">
              <div className="sr-title text-xl" style={{ color: colors[i] }}>
                {l.name}
              </div>
              <div className="text-xs text-white/70">{i === 0 ? "Takes it easy and misses things." : i === 1 ? "A fair game." : "Sees what you are up to. Pays the most."}</div>
            </div>
            <div className="shrink-0 text-xs font-extrabold text-[#f4d77a]">Win: ${l.pay}</div>
          </button>
        ))}
        {t.canTwo && (
          <button data-two onClick={() => game.board.start(1, true)} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-left transition hover:bg-white/10">
            <div className="h-10 w-1.5 shrink-0 rounded-full bg-white/60" />
            <div className="min-w-0 flex-1">
              <div className="sr-title text-xl text-white">Two players</div>
              <div className="text-xs text-white/70">You and a friend on this device, taking turns.</div>
            </div>
            <div className="shrink-0 text-xs font-extrabold text-white/60">Bragging rights</div>
          </button>
        )}
      </div>
      {t.canTwo && (
        <div data-online className="rounded-xl border border-[#39ff14]/30 bg-[#39ff14]/5 p-3">
          <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#39ff14]">Play a friend, each on your own device</div>
          {t.friends.length ? (
            <div className="flex flex-wrap gap-2">
              {t.friends.map((f) => (
                <button key={f.id} data-friend={f.name} className="sr-btn sr-btn-green px-4 py-2" onClick={() => game.board.invite(f.id)}>
                  Ask {f.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1 text-xs text-white/70">{t.crewed ? "Nobody else is in your crew yet. Send them your code." : "Start a crew, send a friend the four letters, and ask them for a game from here."}</div>
              <button data-crew-open className="sr-btn sr-btn-ghost shrink-0 px-4 py-2" onClick={() => game.open("online")}>
                {t.crewed ? "Your crew" : "Play with friends"}
              </button>
            </div>
          )}
        </div>
      )}
      {t.wins > 0 && <div className="text-center text-xs text-white/50">You have won here {t.wins} time{t.wins === 1 ? "" : "s"}.</div>}
    </div>
  );
}

/** Whose move it is. `spare` drops it on a short screen, where the table itself shows whose turn it is. */
function Status({ t, spare }: { t: TableHud; spare?: boolean }) {
  if (t.stage === "done") return null;
  let text: string;
  if (t.id === "spades") {
    const v = t.view as SpadesView;
    const who = ["You", t.rivals[1]!, t.rivals[0]!, t.rivals[2]!][v.turn]!;
    text = v.phase === "hand" ? "Hand over" : v.phase === "trick" ? v.last : v.phase === "bid" ? (t.mine ? "Your bid" : `${who} is bidding`) : t.mine ? "Your card" : `${who} to play`;
  } else if (t.online) text = t.mine ? "Your move" : `${t.online.name} to move`;
  else if (t.two) text = `Player ${t.turn + 1} to move`;
  else if (t.id === "dominoes" && (t.view as DominoView).round) text = "Round over";
  else text = t.mine ? "Your move" : `${t.rivals[0]} is thinking`;
  if (t.id === "chess" && (t.view as ChessView).check) text += "  ·  Check";
  return (
    <div data-status className={`rounded-full border border-white/10 px-4 py-1 text-center text-xs font-extrabold uppercase tracking-widest ${spare ? "[@media(max-height:520px)]:hidden" : ""}`} style={{ background: t.mine ? "#39ff1422" : "#ffffff10", color: t.mine ? "#39ff14" : "#ffffffaa" }}>
      {text}
    </div>
  );
}

/** As wide as the sheet allows; on a phone held sideways, as tall as what is left under the title. */
const FIT = "w-[min(100%,62vh)] shrink-0 [@media(max-height:520px)]:w-[calc(100vh_-_140px)]";
/** Shown only where there is height to spare. */
const ROOMY = "[@media(max-height:520px)]:hidden";

/** A square board that fits the sheet whatever the screen. */
function Square({ children, cells }: { children: ReactNode; cells: number }) {
  return (
    <div className={`grid overflow-hidden rounded-lg border-4 border-[#2a1c12] shadow-2xl ${FIT}`} style={{ aspectRatio: "1", gridTemplateColumns: `repeat(${cells}, 1fr)`, gridTemplateRows: `repeat(${cells}, 1fr)`, containerType: "inline-size" }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- chess

const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

/** The squares in the order they are drawn: turned round for whoever has the far side. */
const order = (flip: boolean | undefined) => Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));

function ChessBoard({ v, mine, send, flip }: { v: ChessView; mine: boolean; send: Send; flip?: boolean }) {
  const [sel, setSel] = useState(-1);
  useEffect(() => setSel(-1), [v.turn]);
  const targets = sel >= 0 ? v.moves.filter((m) => m.from === sel).map((m) => m.to) : [];
  const tap = (i: number) => {
    if (!mine) return;
    if (sel >= 0 && targets.includes(i)) {
      send({ from: sel, to: i });
      setSel(-1);
    } else setSel(v.moves.some((m) => m.from === i) ? i : -1);
  };
  const king = v.check ? v.cells.indexOf(v.turn === 0 ? "K" : "k") : -1;
  const lost = (list: string[], light: boolean) => (
    <div className={`flex h-6 flex-wrap items-center gap-0.5 text-lg leading-none ${ROOMY}`} style={{ color: light ? "#f7f3e8" : "#15120f", textShadow: light ? "0 1px 2px #000" : "0 0 2px #fff" }}>
      {list.map((p, i) => (
        <span key={i}>{GLYPH[p.toLowerCase()]}</span>
      ))}
    </div>
  );
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className={`w-full max-w-[62vh] ${ROOMY}`}>{flip ? lost(v.taken[0], false) : lost(v.taken[1], true)}</div>
      <Square cells={8}>
        {order(flip).map((i) => {
          const p = v.cells[i]!;
          const dark = ((i >> 3) + (i & 7)) % 2 === 1;
          const isLast = v.last && (v.last.from === i || v.last.to === i);
          const light = p !== "" && p === p.toUpperCase();
          return (
            <button key={i} data-sq={i} onClick={() => tap(i)} className="relative flex items-center justify-center" style={{ background: i === king ? "#c8342c" : sel === i ? "#6fae4a" : isLast ? (dark ? "#9a8a3c" : "#d8cf7a") : dark ? "#7a5a3c" : "#e8dcc0" }}>
              {p !== "" && (
                <span className="leading-none" style={{ fontSize: "9.2cqw", color: light ? "#fbf7ec" : "#17130f", textShadow: light ? "0 0 2px #000, 0 1px 2px #000, 0 0 1px #000" : "0 0 2px #ffffff88" }}>
                  {GLYPH[p.toLowerCase()]}
                </span>
              )}
              {targets.includes(i) && <span className="absolute rounded-full" style={p === "" ? { width: "30%", height: "30%", background: "#1c8a2c99" } : { inset: "6%", border: "3px solid #1c8a2ccc" }} />}
            </button>
          );
        })}
      </Square>
      <div className={`w-full max-w-[62vh] ${ROOMY}`}>{flip ? lost(v.taken[1], true) : lost(v.taken[0], false)}</div>
    </div>
  );
}

// ---------------------------------------------------------------- checkers

function CheckersBoard({ v, mine, send, flip }: { v: CheckersView; mine: boolean; send: Send; flip?: boolean }) {
  const [picked, setPicked] = useState(-1);
  useEffect(() => setPicked(-1), [v.turn]);
  const sel = v.chain >= 0 ? v.chain : picked;
  const targets = sel >= 0 ? v.hops.filter((h) => h.from === sel).map((h) => h.to) : [];
  const tap = (i: number) => {
    if (!mine) return;
    if (sel >= 0 && targets.includes(i)) {
      send({ from: sel, to: i });
      setPicked(-1);
    } else setPicked(v.hops.some((h) => h.from === i) ? i : -1);
  };
  const movable = new Set(v.hops.map((h) => h.from));
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className={`text-xs font-bold text-white/60 ${ROOMY}`}>
        Red {v.count[0]} · Black {v.count[1]}
      </div>
      <Square cells={8}>
        {order(flip).map((i) => {
          const p = v.cells[i]!;
          const dark = ((i >> 3) + (i & 7)) % 2 === 1;
          const isLast = v.last && (v.last.from === i || v.last.to === i);
          const red = p === 1 || p === 2;
          return (
            <button key={i} data-sq={i} onClick={() => tap(i)} className="relative flex items-center justify-center" style={{ background: sel === i ? "#3f7a34" : isLast && dark ? "#4a4630" : dark ? "#26221f" : "#b8322a" }}>
              {p !== 0 && (
                <span className="flex items-center justify-center rounded-full" style={{ width: "78%", height: "78%", background: red ? "radial-gradient(circle at 35% 30%, #ff7a6a, #c22a20 62%, #8a1a12)" : "radial-gradient(circle at 35% 30%, #5a5a60, #1c1c20 62%, #050506)", boxShadow: `0 2px 0 ${red ? "#6a120c" : "#000"}, 0 0 0 2px ${mine && movable.has(i) ? "#ffe9a0" : "#00000055"}`, fontSize: "5.4cqw", color: "#f4d77a" }}>
                  {(p === 2 || p === 4) && "♛"}
                </span>
              )}
              {targets.includes(i) && <span className="absolute rounded-full" style={{ width: "32%", height: "32%", background: "#39ff14aa" }} />}
            </button>
          );
        })}
      </Square>
      {v.chain >= 0 && mine && <div className="text-xs font-bold text-[#f4d77a]">Keep jumping with the same piece.</div>}
    </div>
  );
}

// ---------------------------------------------------------------- four in a row

function FourBoard({ v, mine, send }: { v: FourView; mine: boolean; send: Send }) {
  const win = new Set((v.line ?? []).map(([c, r]) => `${c}:${r}`));
  return (
    <div className="grid w-[min(100%,70vh)] shrink-0 gap-1 rounded-2xl border-4 border-[#12307e] bg-[#1f4fc4] p-2 shadow-2xl [@media(max-height:520px)]:w-[calc((100vh_-_150px)*1.12)]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
      {v.cols.map((col, c) => (
        <button key={c} data-col={c} disabled={!mine || col.length >= 6} onClick={() => send(c)} className="group grid gap-1 rounded-lg p-0.5 transition enabled:hover:bg-white/15">
          {[5, 4, 3, 2, 1, 0].map((r) => {
            const d = col[r] ?? 0;
            const fresh = v.last && v.last[0] === c && v.last[1] === r;
            return <span key={r} className={`block w-full rounded-full ${fresh ? "sr-pop" : ""}`} style={{ aspectRatio: "1", background: d === 1 ? "radial-gradient(circle at 35% 30%, #ff8a7a, #e2382c 60%, #9a1c14)" : d === 2 ? "radial-gradient(circle at 35% 30%, #fff0a0, #f6cf3a 60%, #b88a10)" : "#0d1d4a", boxShadow: win.has(`${c}:${r}`) ? "0 0 0 3px #fff, 0 0 14px #fff" : "inset 0 3px 6px #00000066" }} />;
          })}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- tic-tac-toe

function TicBoard({ v, mine, send }: { v: TicView; mine: boolean; send: Send }) {
  return (
    <div className="grid w-[min(100%,52vh)] shrink-0 gap-2 [@media(max-height:520px)]:w-[calc(100vh_-_150px)]" style={{ aspectRatio: "1", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", containerType: "inline-size" }}>
      {v.cells.map((c, i) => (
        <button key={i} data-cell={i} disabled={!mine || c !== 0} onClick={() => send(i)} className="flex items-center justify-center rounded-xl border border-white/10 font-black leading-none transition enabled:hover:bg-white/15" style={{ background: v.line?.includes(i) ? "#39ff1433" : "#ffffff0d", fontSize: "22cqw", color: c === 1 ? "#5ac8ff" : "#ff6b6b" }}>
          {c === 1 ? "X" : c === 2 ? "O" : ""}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- dominoes

const PIPS: Record<number, number[]> = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Half({ n }: { n: number }) {
  return (
    <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[12%]">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {PIPS[n]!.includes(i) && <span className="block h-[70%] w-[70%] rounded-full bg-[#15120f]" />}
        </span>
      ))}
    </span>
  );
}

/** One domino. `up` stands it on end, the way a double lies across the line. */
function Bone({ tile, up, size, glow }: { tile: Tile; up?: boolean; size: number; glow?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-md border border-[#15120f] bg-[#f6f1e4] ${up ? "flex-col" : ""}`} style={{ width: up ? size : size * 2, height: up ? size * 2 : size, boxShadow: glow ? "0 0 0 2px #39ff14, 0 0 12px #39ff14aa" : "0 2px 0 #00000066" }}>
      <span style={{ width: size, height: size }}>
        <Half n={tile[0]} />
      </span>
      <span className={up ? "h-px w-full bg-[#15120f]" : "h-full w-px bg-[#15120f]"} />
      <span style={{ width: size, height: size }}>
        <Half n={tile[1]} />
      </span>
    </span>
  );
}

function DominoTable({ v, mine, send, rival }: { v: DominoView; mine: boolean; send: Send; rival: string }) {
  const [sel, setSel] = useState(-1);
  useEffect(() => setSel(-1), [v.turn, v.hand.length, v.chain.length]);
  const tap = (i: number) => {
    const ends = v.hand[i]!.ends;
    if (!mine || !ends.length) return;
    if (ends.length === 1) send({ type: "play", tile: i, end: ends[0] });
    else setSel(sel === i ? -1 : i);
  };
  const left = v.chain[0]?.[0];
  const right = v.chain[v.chain.length - 1]?.[1];
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white/70">
        <span>
          You <span className="text-[#39ff14]">{v.scores[0]}</span> · {rival} <span className="text-[#ff8a8a]">{v.scores[1]}</span> · to {v.target}
        </span>
        <span>
          {rival} holds {v.theirs} · Boneyard {v.boneyard}
        </span>
      </div>
      <div className={`flex items-center justify-center gap-1 ${v.round ? "" : ROOMY}`}>
        <span className="mr-2 text-xs text-white/50">{rival}</span>
        {(v.round ? v.round.shown : Array.from({ length: v.theirs }, () => null)).map((t, i) => (t ? <Bone key={i} tile={t} up size={22} /> : <span key={i} className="inline-block h-11 w-[22px] rounded-md border border-[#15120f] bg-[#2a2622] shadow" />))}
      </div>
      <div className="flex min-h-[150px] flex-wrap content-center items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#234a66] p-3 [@media(max-height:520px)]:min-h-[86px] [@media(max-height:520px)]:p-2">
        {v.chain.map((t, i) => (
          <Bone key={`${i}-${t[0]}${t[1]}`} tile={t} up={t[0] === t[1]} size={30} glow={mine && (i === 0 || i === v.chain.length - 1)} />
        ))}
        {!v.chain.length && <span className="text-sm text-white/60">Lead with any tile.</span>}
      </div>
      <div className="text-center text-xs text-white/60">{v.last}</div>
      {v.round ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-bold text-[#f4d77a]">{v.round.text}</div>
          {v.scores[0] < v.target && v.scores[1] < v.target && (
            <button data-primary data-next className="sr-btn sr-btn-green px-5 py-2" onClick={() => send({ type: "next" })}>
              Next round
            </button>
          )}
        </div>
      ) : (
        <>
          {sel >= 0 && (
            <div className="flex justify-center gap-2">
              <button data-end="L" className="sr-btn sr-btn-gold px-4 py-2" onClick={() => send({ type: "play", tile: sel, end: "L" })}>
                Left end ({left})
              </button>
              <button data-end="R" className="sr-btn sr-btn-gold px-4 py-2" onClick={() => send({ type: "play", tile: sel, end: "R" })}>
                Right end ({right})
              </button>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {v.canDraw && (
              <button data-primary data-draw className="sr-btn sr-btn-green px-5 py-2" onClick={() => send({ type: "draw" })}>
                Draw a tile
              </button>
            )}
            {v.canPass && (
              <button data-primary data-pass className="sr-btn sr-btn-green px-5 py-2" onClick={() => send({ type: "pass" })}>
                Knock (pass)
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-center gap-2">
            {v.hand.map((h, i) => (
              <button key={`${h.tile[0]}${h.tile[1]}`} data-tile={i} disabled={!mine || !h.ends.length} onClick={() => tap(i)} className="rounded-lg p-0.5 transition enabled:hover:-translate-y-1 disabled:opacity-45" style={{ outline: sel === i ? "2px solid #f4d77a" : undefined }}>
                <Bone tile={h.tile} up size={34} glow={mine && h.ends.length > 0} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- spades

const SUIT: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const FACE = (c: string) => (c[0] === "T" ? "10" : c[0]!);

function PlayingCard({ card, width, dim, lift }: { card: string; width: string; dim?: boolean; lift?: boolean }) {
  const red = card[1] === "H" || card[1] === "D";
  return (
    <span className="relative inline-block rounded-md border border-black/40 bg-[#fbf8f0] shadow-md transition" style={{ width, aspectRatio: "5 / 7", opacity: dim ? 0.45 : 1, transform: lift ? "translateY(-8px)" : undefined, color: red ? "#c8201c" : "#15120f", containerType: "inline-size" }}>
      <span className="absolute left-[8%] top-[3%] font-black leading-none" style={{ fontSize: "34cqw" }}>
        {FACE(card)}
      </span>
      <span className="absolute left-[8%] top-[36%] leading-none" style={{ fontSize: "30cqw" }}>
        {SUIT[card[1]!]}
      </span>
      <span className="absolute bottom-[4%] right-[8%] leading-none" style={{ fontSize: "52cqw" }}>
        {SUIT[card[1]!]}
      </span>
    </span>
  );
}

function SpadesTable({ v, mine, send, names }: { v: SpadesView; mine: boolean; send: Send; names: string[] }) {
  // Where each seat sits round the felt, and where its card lands in the middle.
  const seatAt = ["bottom-1 left-[30%] -translate-x-1/2", "left-2 top-1/2 -translate-y-1/2", "top-1 left-[30%] -translate-x-1/2", "right-2 top-1/2 -translate-y-1/2"];
  const cardAt = [
    { left: "50%", top: "62%" },
    { left: "36%", top: "50%" },
    { left: "50%", top: "38%" },
    { left: "64%", top: "50%" },
  ];
  const bid = (s: number) => (v.bids[s]! < 0 ? "…" : v.bids[s] === 0 ? "nil" : String(v.bids[s]));
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white/75">
        <span>
          You & {names[2]} <span className="text-[#39ff14]">{v.scores[0]}</span> <span className="text-white/45">({v.bags[0]} bags)</span>
        </span>
        <span className="text-white/45">to {v.target}</span>
        <span>
          {names[1]} & {names[3]} <span className="text-[#ff8a8a]">{v.scores[1]}</span> <span className="text-white/45">({v.bags[1]} bags)</span>
        </span>
      </div>
      <div className="relative mx-auto w-full overflow-hidden rounded-[28px] border-4 border-[#3a281a] bg-[radial-gradient(circle_at_50%_40%,#22703f,#12452a)]" style={{ maxWidth: 760, height: "min(37vh, 330px)" }}>
        {[0, 1, 2, 3].map((s) => (
          <div key={s} data-seat={s} className={`absolute ${seatAt[s]} rounded-lg px-2 py-1 text-center text-[11px] leading-tight`} style={{ background: v.turn === s && v.phase !== "hand" && v.phase !== "over" && v.phase !== "trick" ? "#39ff1433" : "#00000055", border: `1px solid ${s % 2 === 0 ? "#39ff1466" : "#ff8a8a66"}` }}>
            <div className="font-extrabold text-white">
              {names[s]}
              {v.dealer === s && <span className="ml-1 text-white/45">(D)</span>}
            </div>
            <div className="text-white/70">
              bid {bid(s)} · took {v.tricks[s]}
            </div>
          </div>
        ))}
        {v.trick.map((t) => (
          <span key={t.card} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ ...cardAt[t.seat]!, filter: v.phase === "trick" && v.taker === t.seat ? "drop-shadow(0 0 10px #f4d77a)" : undefined }}>
            <PlayingCard card={t.card} width="min(12vw, 58px, 10.5vh)" />
          </span>
        ))}
        {!v.broken && v.phase === "play" && <div className="absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-wider text-white/45">Spades not broken</div>}
      </div>
      <div className={`text-center text-xs text-white/60 ${ROOMY}`}>{v.last}</div>
      {v.phase === "bid" && mine && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-white/60">
            How many tricks will you take? A careful bid on these cards: <span className="font-extrabold text-[#f4d77a]">{v.hint}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {Array.from({ length: 14 }, (_, n) => (
              <button key={n} data-bid={n} data-primary={n === v.hint ? true : undefined} className={`sr-btn px-3 py-1.5 ${n === v.hint ? "sr-btn-green" : "sr-btn-ghost"}`} onClick={() => send({ type: "bid", n })}>
                {n === 0 ? "Nil" : n}
              </button>
            ))}
          </div>
        </div>
      )}
      {(v.phase === "hand" || v.phase === "over") && v.summary && (
        <div className="flex flex-col items-center gap-1 text-sm">
          {v.summary.map((s) => (
            <div key={s.team} className="text-white/80">
              <span className="font-extrabold" style={{ color: s.team === 0 ? "#39ff14" : "#ff8a8a" }}>
                {s.team === 0 ? `You & ${names[2]}` : `${names[1]} & ${names[3]}`}
              </span>
              : {s.text} <span className="font-extrabold">{s.change >= 0 ? `+${s.change}` : s.change}</span>
            </div>
          ))}
          {v.phase === "hand" && (
            <button data-primary data-next className="sr-btn sr-btn-green mt-1 px-5 py-2" onClick={() => send({ type: "next" })}>
              Deal the next hand
            </button>
          )}
        </div>
      )}
      <div className="flex justify-center pb-1">
        {v.hand.map((h) => (
          <button key={h.card} data-card={h.card} disabled={!mine || !h.ok} onClick={() => send({ type: "card", card: h.card })} className="-ml-[1.5%] transition first:ml-0 enabled:hover:-translate-y-2" style={{ width: "min(8.6%, 64px)" }}>
            <PlayingCard card={h.card} width="100%" dim={v.phase === "play" && mine && !h.ok} lift={mine && h.ok} />
          </button>
        ))}
      </div>
    </div>
  );
}
