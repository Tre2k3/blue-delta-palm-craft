import { useEffect, useRef, useState } from "react";
import type { Game } from "../game";
import { CABINETS, type Cabinet } from "../play/goods";

const W = 480;
const H = 360;

type Mini = {
  score: number;
  over: boolean;
  /** Seconds left, or -1 when the game is not on a clock. */
  left: number;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  key?(code: string, down: boolean): void;
  point?(x: number, y: number, kind: "down" | "move" | "up"): void;
  tickets(): number;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") {
  g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillStyle = color;
  g.fillText(s, x, y);
}

// ---------------------------------------------------------------- Drop Catcher

function dropCatcher(): Mini {
  const kinds = [
    { name: "GREEN TEE", color: "#2fb84a" },
    { name: "WHITE CAP", color: "#e9e6de" },
    { name: "GOLD CHAIN", color: "#e0b33a" },
    { name: "RED TEE", color: "#c8402c" },
  ];
  let px = W / 2;
  let move = 0;
  let want = 0;
  let wantT = 6;
  let spawn = 0.4;
  let flash = 0;
  const drops: { x: number; y: number; v: number; k: number }[] = [];
  const m: Mini = {
    score: 0,
    over: false,
    left: 35,
    update(dt) {
      m.left -= dt;
      if (m.left <= 0) {
        m.left = 0;
        m.over = true;
        return;
      }
      px = Math.max(60, Math.min(W - 60, px + move * 330 * dt));
      wantT -= dt;
      if (wantT <= 0) {
        want = (want + 1 + Math.floor(Math.random() * 3)) % 4;
        wantT = 6;
      }
      spawn -= dt;
      if (spawn <= 0) {
        const r = Math.random();
        drops.push({ x: rand(30, W - 30), y: -20, v: rand(130, 190) + (35 - m.left) * 3, k: r < 0.16 ? 4 : r < 0.5 ? want : Math.floor(Math.random() * 4) });
        spawn = rand(0.3, 0.55);
      }
      flash -= dt;
      for (const d of drops) {
        d.y += d.v * dt;
        if (d.y > H - 62 && d.y < H - 36 && Math.abs(d.x - px) < 58) {
          m.score = Math.max(0, m.score + (d.k === 4 ? -10 : d.k === want ? 10 : 2));
          if (d.k === 4) flash = 0.3;
          d.y = 999;
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i]!.y > H + 30) drops.splice(i, 1);
    },
    draw(g) {
      g.fillStyle = flash > 0 ? "#5a1414" : "#3a1410";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) g.fillRect(i * 60, j * 60, 60, 60);
      for (const d of drops) {
        if (d.k === 4) {
          g.fillStyle = "#8a4a34";
          g.fillRect(d.x - 16, d.y - 9, 32, 18);
          g.strokeStyle = "rgba(0,0,0,0.4)";
          g.lineWidth = 2;
          g.strokeRect(d.x - 16, d.y - 9, 32, 18);
        } else if (d.k === 1) {
          g.fillStyle = kinds[1]!.color;
          g.beginPath();
          g.arc(d.x, d.y, 11, Math.PI, 0);
          g.fill();
          g.fillRect(d.x - 2, d.y - 2, 20, 5);
        } else if (d.k === 2) {
          g.strokeStyle = kinds[2]!.color;
          g.lineWidth = 4;
          g.beginPath();
          g.arc(d.x, d.y - 4, 10, 0.2, Math.PI - 0.2);
          g.stroke();
          g.fillStyle = kinds[2]!.color;
          g.beginPath();
          g.arc(d.x, d.y + 8, 6, 0, Math.PI * 2);
          g.fill();
        } else {
          g.fillStyle = kinds[d.k]!.color;
          g.fillRect(d.x - 9, d.y - 10, 18, 22);
          g.fillRect(d.x - 17, d.y - 10, 34, 9);
        }
      }
      // The bag.
      g.fillStyle = "#1e7a2e";
      g.beginPath();
      g.moveTo(px - 46, H - 62);
      g.lineTo(px + 46, H - 62);
      g.lineTo(px + 56, H - 22);
      g.lineTo(px - 56, H - 22);
      g.closePath();
      g.fill();
      text(g, "$", px, H - 40, 26, "#e0b33a");
      g.fillStyle = "#0a0a0c";
      g.fillRect(W / 2 - 110, 8, 220, 34);
      text(g, `ORDER: ${kinds[want]!.name}`, W / 2, 26, 16, kinds[want]!.color);
    },
    key(code, down) {
      if (code === "KeyA" || code === "ArrowLeft") move = down ? -1 : move === -1 ? 0 : move;
      if (code === "KeyD" || code === "ArrowRight") move = down ? 1 : move === 1 ? 0 : move;
    },
    point(x, _y, kind) {
      if (kind !== "up") px = Math.max(60, Math.min(W - 60, x));
    },
    tickets: () => Math.min(25, Math.floor(m.score / 14)),
  };
  return m;
}

// ---------------------------------------------------------------- Sack Stacker

function stacker(): Mini {
  const COLS = 9;
  const ROWS = 11;
  const cell = 30;
  const ox = (W - COLS * cell) / 2;
  const oy = H - 16;
  const rows: { x: number; w: number }[] = [];
  let x = 0;
  let w = 3;
  let dir = 1;
  let acc = 0;
  let won = false;
  const m: Mini = {
    score: 0,
    over: false,
    left: -1,
    update(dt) {
      if (m.over) return;
      const step = Math.max(0.055, 0.2 - rows.length * 0.014);
      acc += dt;
      while (acc > step) {
        acc -= step;
        x += dir;
        if (x + w >= COLS) {
          x = COLS - w;
          dir = -1;
        } else if (x <= 0) {
          x = 0;
          dir = 1;
        }
      }
    },
    draw(g) {
      g.fillStyle = "#07140a";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(57,255,20,0.14)";
      for (let c = 0; c <= COLS; c++) {
        g.beginPath();
        g.moveTo(ox + c * cell, oy - ROWS * cell);
        g.lineTo(ox + c * cell, oy);
        g.stroke();
      }
      g.fillStyle = "rgba(224,179,58,0.18)";
      g.fillRect(ox, oy - ROWS * cell, COLS * cell, cell);
      text(g, "JACKPOT", W / 2, oy - ROWS * cell + cell / 2, 13, "#e0b33a");
      const bag = (cx: number, r: number) => {
        const bx = ox + cx * cell + cell / 2;
        const by = oy - r * cell - cell / 2;
        g.fillStyle = "#39c41e";
        g.beginPath();
        g.arc(bx, by + 2, 12, 0, Math.PI * 2);
        g.fill();
        g.fillRect(bx - 5, by - 13, 10, 6);
        text(g, "$", bx, by + 3, 14, "#07140a");
      };
      rows.forEach((r, i) => {
        for (let c = 0; c < r.w; c++) bag(r.x + c, i);
      });
      if (!m.over) for (let c = 0; c < w; c++) bag(x + c, rows.length);
      if (won) text(g, "VAULT FULL", W / 2, 40, 26, "#e0b33a");
    },
    key(code, down) {
      if (down && (code === "Space" || code === "Enter")) drop();
    },
    point(_x, _y, kind) {
      if (kind === "down") drop();
    },
    tickets: () => (won ? 30 : rows.length * 2),
  };
  function drop() {
    if (m.over) return;
    const below = rows[rows.length - 1];
    let nx = x;
    let nw = w;
    if (below) {
      const lo = Math.max(x, below.x);
      const hi = Math.min(x + w, below.x + below.w);
      nx = lo;
      nw = hi - lo;
    }
    if (nw <= 0) {
      m.over = true;
      return;
    }
    rows.push({ x: nx, w: nw });
    m.score = rows.length;
    w = nw;
    if (rows.length === 4 && w > 2) w = 2;
    if (rows.length === 8 && w > 1) w = 1;
    if (rows.length >= ROWS) {
      won = true;
      m.over = true;
    }
  }
  return m;
}

// ---------------------------------------------------------------- Beale Street Dash

function dash(): Mini {
  let lane = 1;
  let x = W / 2;
  let lives = 3;
  let spawn = 0.6;
  let dist = 0;
  let hurt = 0;
  let stripe = 0;
  const things: { lane: number; y: number; note: boolean }[] = [];
  const laneX = (l: number) => W / 2 + (l - 1) * 96;
  const m: Mini = {
    score: 0,
    over: false,
    left: 40,
    update(dt) {
      m.left -= dt;
      if (m.left <= 0 || lives <= 0) {
        m.left = Math.max(0, m.left);
        m.over = true;
        return;
      }
      const speed = 250 + (40 - m.left) * 9;
      dist += speed * dt;
      stripe = (stripe + speed * dt) % 60;
      m.score = Math.floor(dist / 40) + bonus;
      x += (laneX(lane) - x) * Math.min(1, dt * 14);
      spawn -= dt;
      if (spawn <= 0) {
        const l = Math.floor(Math.random() * 3);
        things.push({ lane: l, y: -40, note: Math.random() < 0.3 });
        if (Math.random() < 0.35) things.push({ lane: (l + 1 + Math.floor(Math.random() * 2)) % 3, y: -40, note: false });
        spawn = Math.max(0.34, 0.8 - (40 - m.left) * 0.011);
      }
      hurt -= dt;
      for (const t of things) {
        t.y += speed * dt;
        if (t.y > H - 96 && t.y < H - 24 && Math.abs(laneX(t.lane) - x) < 40) {
          if (t.note) bonus += 15;
          else if (hurt <= 0) {
            lives--;
            hurt = 0.9;
          }
          t.y = 999;
        }
      }
      for (let i = things.length - 1; i >= 0; i--) if (things[i]!.y > H + 50) things.splice(i, 1);
    },
    draw(g) {
      g.fillStyle = "#12121a";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#24242c";
      g.fillRect(W / 2 - 150, 0, 300, H);
      g.fillStyle = "#e8d44a";
      for (let y = -60 + stripe; y < H; y += 60) {
        g.fillRect(W / 2 - 50, y, 4, 30);
        g.fillRect(W / 2 + 46, y, 4, 30);
      }
      for (let y = -60 + stripe; y < H; y += 120) {
        g.fillStyle = y % 240 < 120 ? "#ff5ad1" : "#35e0d0";
        g.fillRect(20, y, 60, 40);
        g.fillRect(W - 80, y + 50, 60, 40);
      }
      for (const t of things) {
        const tx = laneX(t.lane);
        if (t.note) {
          text(g, "♪", tx, t.y, 34, "#ffd23a");
        } else {
          g.fillStyle = "#b3261c";
          g.fillRect(tx - 22, t.y - 34, 44, 68);
          g.fillStyle = "#1a1a22";
          g.fillRect(tx - 17, t.y - 20, 34, 16);
        }
      }
      if (hurt <= 0 || Math.floor(hurt * 12) % 2) {
        g.fillStyle = "#14a03a";
        g.fillRect(x - 22, H - 96, 44, 70);
        g.fillStyle = "#0a2a14";
        g.fillRect(x - 17, H - 82, 34, 16);
        g.fillStyle = "#e0b33a";
        g.fillRect(x - 22, H - 30, 44, 4);
      }
      text(g, "♥".repeat(Math.max(0, lives)), 16, 26, 22, "#ff5a5a", "left");
    },
    key(code, down) {
      if (!down) return;
      if (code === "KeyA" || code === "ArrowLeft") lane = Math.max(0, lane - 1);
      if (code === "KeyD" || code === "ArrowRight") lane = Math.min(2, lane + 1);
    },
    point(px, _y, kind) {
      if (kind !== "down") return;
      lane = px < W / 2 ? Math.max(0, lane - 1) : Math.min(2, lane + 1);
    },
    tickets: () => Math.min(25, Math.floor(m.score / 22)),
  };
  let bonus = 0;
  return m;
}

const MAKERS: Record<string, () => Mini> = { catch: dropCatcher, stacker, dash };

// ---------------------------------------------------------------- cabinet

export function Arcade({ game, id }: { game: Game; id: string }) {
  const cab = CABINETS.find((c) => c.id === id) ?? CABINETS[0]!;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-3">
      <div className="w-full max-w-[760px] rounded-2xl border-2 p-3 shadow-2xl sm:p-5" style={{ borderColor: cab.color, background: "linear-gradient(180deg,#14101f,#07060c)" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="sr-title text-2xl sm:text-3xl" style={{ color: cab.color }}>
              {cab.name}
            </div>
            <div className="text-xs text-white/60 sm:text-sm">{cab.blurb}</div>
          </div>
          <button className="sr-btn sr-btn-ghost shrink-0" onClick={() => game.close()}>
            Back to the floor
          </button>
        </div>
        {cab.link ? <LinkCabinet cab={cab} /> : <Playable game={game} cab={cab} />}
      </div>
    </div>
  );
}

function LinkCabinet({ cab }: { cab: Cabinet }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 p-6 text-center sm:p-10" style={{ background: `radial-gradient(circle at 50% 0%, ${cab.color}44, #05040a 70%)` }}>
      <div className="sr-title text-4xl sm:text-6xl" style={{ color: cab.accent, textShadow: `0 0 28px ${cab.color}` }}>
        {cab.tag}
      </div>
      <p className="max-w-md text-sm text-white/75">This cabinet runs the full game. It opens on itch.io in a new tab, and your Memphis save stays right here.</p>
      <a className="sr-btn sr-btn-gold px-8 py-3 text-lg" href={cab.link} target="_blank" rel="noopener noreferrer">
        Play on itch.io
      </a>
      <div className="break-all text-[11px] text-white/40">{cab.link}</div>
    </div>
  );
}

function Playable({ game, cab }: { game: Game; cab: Cabinet }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"ready" | "play" | "over">("ready");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(0);
  const [won, setWon] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (state !== "play") return;
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (!el || !g) return;
    const mini = (MAKERS[cab.id] ?? stacker)();
    let raf = 0;
    let last = performance.now();
    let shown = -1;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      mini.update(dt);
      g.setTransform(el.width / W, 0, 0, el.height / H, 0, 0);
      mini.draw(g);
      const tick = mini.score * 1000 + Math.ceil(mini.left);
      if (tick !== shown) {
        shown = tick;
        setScore(mini.score);
        setLeft(Math.ceil(mini.left));
      }
      if (mini.over) {
        cancelAnimationFrame(raf);
        setScore(mini.score);
        setWon(game.arcadeWin(mini.tickets()));
        setState("over");
      }
    };
    raf = requestAnimationFrame(loop);
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (e.code === "Escape") return;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (e.repeat) return;
      mini.key?.(e.code, down);
    };
    const kd = key(true);
    const ku = key(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H] as const;
    };
    const pd = (e: PointerEvent) => {
      e.preventDefault();
      const [x, y] = at(e);
      mini.point?.(x, y, "down");
    };
    const pm = (e: PointerEvent) => {
      const [x, y] = at(e);
      mini.point?.(x, y, "move");
    };
    const pu = (e: PointerEvent) => {
      const [x, y] = at(e);
      mini.point?.(x, y, "up");
    };
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
    };
  }, [state, run, cab.id, game]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-bold text-white">
        <span>
          SCORE <span style={{ color: cab.accent }}>{score}</span>
        </span>
        {left >= 0 && state === "play" ? <span>TIME {left}</span> : <span />}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvas} width={W * 2} height={H * 2} className="h-full w-full touch-none" />
        {state !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-4 text-center">
            {state === "over" ? (
              <>
                <div className="sr-title text-4xl text-white">GAME OVER</div>
                <div className="text-lg font-bold text-white">
                  Score {score} <span className="mx-2 text-white/30">|</span> <span className="text-[#ffd23a]">+{won} tickets</span>
                </div>
              </>
            ) : (
              <>
                <div className="sr-title text-4xl" style={{ color: cab.color }}>
                  {cab.tag}
                </div>
                <div className="max-w-sm text-sm text-white/80">{cab.how}</div>
              </>
            )}
            <button
              className="sr-btn sr-btn-green px-8 py-3 text-lg"
              onClick={() => {
                setScore(0);
                setRun((n) => n + 1);
                setState("play");
              }}
            >
              {state === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
