import { useEffect, useRef, useState } from "react";
import type { Game } from "../game";
import { CABINETS, type Cabinet } from "../play/goods";
import { WebCabinet } from "./WebCabinet";

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

// ---------------------------------------------------------------- Sack Pinball

type Seg = { ax: number; ay: number; bx: number; by: number; kick?: number; pts?: number };

function pinball(): Mini {
  const L = 130;
  const R = 330;
  const LANE = 350;
  const BR = 6;
  const walls: Seg[] = [
    { ax: L, ay: 10, bx: L, by: 350 },
    { ax: L, ay: 10, bx: LANE, by: 10 },
    { ax: LANE, ay: 10, bx: LANE, by: 350 },
    { ax: R, ay: 74, bx: R, by: 350 },
    { ax: LANE, ay: 62, bx: 298, by: 10 },
    { ax: L, ay: 62, bx: 182, by: 10 },
    { ax: L, ay: 246, bx: 178, by: 300 },
    { ax: R, ay: 246, bx: 282, by: 300 },
    { ax: 152, ay: 214, bx: 172, by: 262, kick: 300, pts: 10 },
    { ax: 308, ay: 214, bx: 288, by: 262, kick: 300, pts: 10 },
  ];
  const bumpers = [
    { x: 196, y: 112, r: 16, lit: 0 },
    { x: 264, y: 112, r: 16, lit: 0 },
    { x: 230, y: 164, r: 16, lit: 0 },
  ];
  const drops = [202, 230, 258].map((x) => ({ x, y: 52, up: true }));
  const flip = [
    { px: 178, py: 300, dir: 1, a: 0.5, w: 0, on: false },
    { px: 282, py: 300, dir: -1, a: 0.5, w: 0, on: false },
  ];
  const FLEN = 46;
  const ball = { x: 340, y: 338, vx: 0, vy: 0, live: false };
  let balls = 3;
  let charge = 0;
  let charging = false;
  let note = "Hold Space to pull the plunger";
  let noteLeft = 4;
  const tip = (f: (typeof flip)[number]) => ({ x: f.px + Math.cos(f.a) * FLEN * f.dir, y: f.py + Math.sin(f.a) * FLEN });
  const hit = (ax: number, ay: number, bx: number, by: number, rest: number, kick: number, sx: number, sy: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy)));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    let nx = ball.x - cx;
    let ny = ball.y - cy;
    const d = Math.hypot(nx, ny);
    if (d >= BR || d === 0) return false;
    nx /= d;
    ny /= d;
    ball.x = cx + nx * BR;
    ball.y = cy + ny * BR;
    const rel = (ball.vx - sx * t) * nx + (ball.vy - sy * t) * ny;
    if (rel < 0) {
      ball.vx -= (1 + rest) * rel * nx;
      ball.vy -= (1 + rest) * rel * ny;
    }
    ball.vx += nx * kick;
    ball.vy += ny * kick;
    return true;
  };
  const m: Mini = {
    score: 0,
    over: false,
    left: -1,
    update(dt) {
      noteLeft -= dt;
      for (const b of bumpers) b.lit = Math.max(0, b.lit - dt * 4);
      for (const f of flip) {
        const want = f.on ? -0.55 : 0.5;
        const before = f.a;
        f.a += Math.max(-22 * dt, Math.min(22 * dt, want - f.a));
        f.w = (f.a - before) / Math.max(dt, 1e-4);
      }
      if (!ball.live) {
        // On the plunger.
        ball.x = 340;
        ball.y = 338 + charge * 8;
        if (charging) charge = Math.min(1, charge + dt * 1.1);
        return;
      }
      const steps = 8;
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        ball.vy += 620 * h;
        ball.x += ball.vx * h;
        ball.y += ball.vy * h;
        for (const w of walls) {
          if (hit(w.ax, w.ay, w.bx, w.by, 0.45, w.kick ?? 0, 0, 0) && w.pts) m.score += w.pts;
        }
        for (const f of flip) {
          const t = tip(f);
          // The tip of a swinging flipper is moving: that is what throws the ball.
          const sx = -Math.sin(f.a) * FLEN * f.w * f.dir;
          const sy = Math.cos(f.a) * FLEN * f.w;
          hit(f.px, f.py, t.x, t.y, 0.35, 0, sx, sy);
        }
        for (const b of bumpers) {
          const dx = ball.x - b.x;
          const dy = ball.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < b.r + BR && d > 0) {
            ball.x = b.x + (dx / d) * (b.r + BR);
            ball.y = b.y + (dy / d) * (b.r + BR);
            const sp = Math.max(330, Math.hypot(ball.vx, ball.vy) * 0.9);
            ball.vx = (dx / d) * sp;
            ball.vy = (dy / d) * sp;
            b.lit = 1;
            m.score += 100;
          }
        }
        for (const d of drops) {
          if (d.up && Math.abs(ball.x - d.x) < 12 + BR && Math.abs(ball.y - d.y) < 5 + BR) {
            d.up = false;
            ball.vy = Math.abs(ball.vy) * 0.6;
            m.score += 250;
            if (drops.every((q) => !q.up)) {
              m.score += 1000;
              note = "ALL TARGETS  +1000";
              noteLeft = 1.6;
              for (const q of drops) q.up = true;
            }
          }
        }
        // Never out through a corner, however hard it was hit.
        ball.x = Math.max(L + BR, Math.min(LANE - BR, ball.x));
        if (ball.y < 10 + BR) {
          ball.y = 10 + BR;
          ball.vy = Math.abs(ball.vy) * 0.5;
        }
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > 900) {
          ball.vx *= 900 / sp;
          ball.vy *= 900 / sp;
        }
      }
      if (ball.y > 356) {
        ball.live = false;
        ball.vx = ball.vy = 0;
        charge = 0;
        balls--;
        if (balls <= 0) m.over = true;
        else {
          note = `Ball ${4 - balls} of 3`;
          noteLeft = 1.6;
        }
      }
    },
    draw(g) {
      g.fillStyle = "#07050d";
      g.fillRect(0, 0, W, H);
      const bg = g.createLinearGradient(0, 10, 0, 350);
      bg.addColorStop(0, "#1d0f3a");
      bg.addColorStop(1, "#0d1a2e");
      g.fillStyle = bg;
      g.fillRect(L, 10, LANE - L, 340);
      text(g, "$", 230, 232, 60, "rgba(224,179,58,0.16)");
      g.strokeStyle = "#e0b33a";
      g.lineWidth = 3;
      g.lineCap = "round";
      for (const w of walls) {
        g.strokeStyle = w.kick ? "#ff5ad1" : "#e0b33a";
        g.beginPath();
        g.moveTo(w.ax, w.ay);
        g.lineTo(w.bx, w.by);
        g.stroke();
      }
      for (const b of bumpers) {
        g.fillStyle = b.lit > 0 ? "#ffffff" : "#39ff14";
        g.beginPath();
        g.arc(b.x, b.y, b.r + b.lit * 3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#0a2a12";
        g.beginPath();
        g.arc(b.x, b.y, b.r - 6, 0, Math.PI * 2);
        g.fill();
        text(g, "100", b.x, b.y, 9, "#39ff14");
      }
      for (const d of drops) {
        g.fillStyle = d.up ? "#35e0d0" : "rgba(53,224,208,0.2)";
        g.fillRect(d.x - 12, d.y - 5, 24, 10);
      }
      g.strokeStyle = "#f4f1ea";
      g.lineWidth = 9;
      for (const f of flip) {
        const t = tip(f);
        g.beginPath();
        g.moveTo(f.px, f.py);
        g.lineTo(t.x, t.y);
        g.stroke();
      }
      g.lineCap = "butt";
      // Plunger.
      g.fillStyle = "#c22a22";
      g.fillRect(334, 346 + charge * 8, 12, 14);
      g.fillStyle = "#e9edf2";
      g.beginPath();
      g.arc(ball.x, ball.y, BR, 0, Math.PI * 2);
      g.fill();
      text(g, "SACK", 66, 60, 26, "#e0b33a");
      text(g, "PINBALL", 66, 88, 20, "#39ff14");
      text(g, "A  left flipper", 66, 150, 11, "#ffffff");
      text(g, "D  right flipper", 66, 168, 11, "#ffffff");
      text(g, "Space  plunger", 66, 186, 11, "#ffffff");
      text(g, "BALLS", 414, 60, 14, "#ffffff");
      text(g, "● ".repeat(Math.max(0, balls)).trim() || "-", 414, 86, 20, "#e9edf2");
      text(g, "Bumpers 100", 414, 150, 11, "#39ff14");
      text(g, "Targets 250", 414, 168, 11, "#35e0d0");
      text(g, "All three +1000", 414, 186, 11, "#35e0d0");
      if (noteLeft > 0) text(g, note, 230, 200, 13, "#ffd23a");
    },
    key(code, down) {
      const lane = !ball.live;
      if (code === "KeyA" || code === "ArrowLeft") flip[0]!.on = down;
      if (code === "KeyD" || code === "ArrowRight") flip[1]!.on = down;
      if (code === "Space" || code === "ArrowDown") {
        if (lane) {
          if (down) charging = true;
          else if (charging) {
            charging = false;
            ball.live = true;
            ball.vx = 0;
            ball.vy = -(520 + charge * 470);
            charge = 0;
          }
        } else flip[0]!.on = flip[1]!.on = down;
      }
    },
    point(x, _y, kind) {
      if (kind === "move") return;
      const down = kind === "down";
      if (!ball.live) m.key?.("Space", down);
      else if (down) flip[x < W / 2 ? 0 : 1]!.on = true;
      else flip[0]!.on = flip[1]!.on = false;
    },
    tickets: () => Math.min(40, Math.floor(m.score / 400)),
  };
  return m;
}

// ---------------------------------------------------------------- Skee-Ball

function skeeBall(): Mini {
  // The target board, as you see it from the end of the lane.
  const holes = [
    { x: 176, y: 44, r: 11, v: 100 },
    { x: 304, y: 44, r: 11, v: 100 },
    { x: 240, y: 42, r: 13, v: 50 },
    { x: 240, y: 84, r: 17, v: 40 },
    { x: 240, y: 90, r: 30, v: 30 },
    { x: 240, y: 96, r: 44, v: 20 },
    { x: 240, y: 102, r: 58, v: 10 },
  ];
  let balls = 9;
  let aim = 0;
  let turn = 0;
  let power = 0;
  let dir = 1;
  let charging = false;
  let phase: "aim" | "roll" | "fly" | "show" = "aim";
  let t = 0;
  let from = { x: 240, y: 330 };
  let land = { x: 240, y: 100 };
  let got = 0;
  const release = () => {
    if (phase !== "aim" || !charging) return;
    charging = false;
    phase = "roll";
    t = 0;
    from = { x: 240 + aim * 74, y: 330 };
    land = { x: 240 + aim * 92 + rand(-5, 5), y: 136 - power * 112 + rand(-4, 4) };
  };
  const m: Mini = {
    score: 0,
    over: false,
    left: -1,
    update(dt) {
      if (phase === "aim") {
        aim = Math.max(-1, Math.min(1, aim + turn * dt * 1.25));
        if (charging) {
          power += dir * dt * 1.15;
          if (power >= 1) {
            power = 1;
            dir = -1;
          } else if (power <= 0) {
            power = 0;
            dir = 1;
          }
        }
        return;
      }
      t += dt;
      if (phase === "roll" && t > 0.55) {
        phase = "fly";
        t = 0;
      } else if (phase === "fly" && t > 0.5) {
        phase = "show";
        t = 0;
        got = 0;
        // Off the top of the board, or short of it, is a gutter ball.
        if (land.y > 12 && land.y < 162) {
          for (const h of holes) {
            if (Math.hypot(land.x - h.x, land.y - h.y) < h.r) {
              got = h.v;
              break;
            }
          }
        }
        m.score += got;
        balls--;
      } else if (phase === "show" && t > 0.9) {
        if (balls <= 0) m.over = true;
        phase = "aim";
        power = 0;
        dir = 1;
      }
    },
    draw(g) {
      g.fillStyle = "#120a22";
      g.fillRect(0, 0, W, H);
      // Board.
      g.fillStyle = "#2a1a4a";
      g.fillRect(140, 8, 200, 160);
      g.strokeStyle = "#ffd23a";
      g.lineWidth = 3;
      g.strokeRect(140, 8, 200, 160);
      for (const h of [...holes].reverse()) {
        g.fillStyle = h.v >= 50 ? "#0a0a12" : "rgba(10,10,18,0.55)";
        g.strokeStyle = h.v === 100 ? "#ff5ad1" : h.v === 50 ? "#39ff14" : "#f4f1ea";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      text(g, "100", 176, 44, 9, "#ff5ad1");
      text(g, "100", 304, 44, 9, "#ff5ad1");
      text(g, "50", 240, 42, 10, "#39ff14");
      text(g, "40", 240, 84, 11, "#ffffff");
      text(g, "30", 240, 111, 10, "#ffffff");
      text(g, "20", 240, 130, 10, "#ffffff");
      text(g, "10", 240, 150, 10, "#ffffff");
      // Lane, narrowing up to the ramp.
      g.fillStyle = "#b9833e";
      g.beginPath();
      g.moveTo(150, 350);
      g.lineTo(330, 350);
      g.lineTo(292, 178);
      g.lineTo(188, 178);
      g.closePath();
      g.fill();
      g.fillStyle = "#8a5a26";
      g.fillRect(188, 168, 104, 12);
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(240 + i * 36, 350);
        g.lineTo(240 + i * 20.8, 178);
        g.stroke();
      }
      // Aim line and the ball.
      let bx = 240 + aim * 74;
      let by = 330;
      let br = 13;
      if (phase === "aim") {
        g.strokeStyle = "rgba(57,255,20,0.7)";
        g.setLineDash([6, 6]);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(bx, by - 14);
        g.lineTo(240 + aim * 42, 182);
        g.stroke();
        g.setLineDash([]);
      } else if (phase === "roll") {
        const k = Math.min(1, t / 0.55);
        bx = from.x + (240 + aim * 42 - from.x) * k;
        by = 330 - k * 152;
        br = 13 - k * 6;
      } else {
        const k = phase === "fly" ? Math.min(1, t / 0.5) : 1;
        bx = 240 + aim * 42 + (land.x - (240 + aim * 42)) * k;
        by = 178 + (land.y - 178) * k - Math.sin(k * Math.PI) * 46;
        br = 7 - k * 2;
      }
      g.fillStyle = "#f4f1ea";
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#c22a22";
      g.lineWidth = 2;
      g.stroke();
      // Power bar.
      g.fillStyle = "#0a0a12";
      g.fillRect(40, 60, 22, 250);
      g.fillStyle = power > 0.7 ? "#ff5ad1" : power > 0.36 ? "#39ff14" : "#ffd23a";
      g.fillRect(43, 307 - power * 244, 16, power * 244);
      text(g, "POWER", 51, 46, 11, "#ffffff");
      text(g, "BALLS", 420, 46, 11, "#ffffff");
      text(g, String(Math.max(0, balls)), 420, 78, 34, "#ffd23a");
      text(g, "A D aim", 420, 250, 11, "#ffffff");
      text(g, "Hold Space", 420, 268, 11, "#ffffff");
      text(g, "let go to roll", 420, 286, 11, "#ffffff");
      if (phase === "show") text(g, got ? `+${got}` : "GUTTER", 240, 215, 34, got >= 50 ? "#ff5ad1" : got ? "#39ff14" : "#ff5a5a");
    },
    key(code, down) {
      if (code === "KeyA" || code === "ArrowLeft") turn = down ? -1 : turn === -1 ? 0 : turn;
      if (code === "KeyD" || code === "ArrowRight") turn = down ? 1 : turn === 1 ? 0 : turn;
      if (code === "Space" || code === "ArrowUp") {
        if (down && phase === "aim" && !charging) {
          charging = true;
          power = 0;
          dir = 1;
        } else if (!down) release();
      }
    },
    point(x, _y, kind) {
      if (phase !== "aim") return;
      if (kind !== "up") aim = Math.max(-1, Math.min(1, (x - 240) / 80));
      if (kind === "down") m.key?.("Space", true);
      if (kind === "up") release();
    },
    tickets: () => Math.min(40, Math.floor(m.score / 25)),
  };
  return m;
}

// ---------------------------------------------------------------- Spin-N-Win

function prizeWheel(): Mini {
  const wedges = [2, 5, 1, 10, 2, 3, 1, 25, 2, 5, 1, 8, 3, 2, 1, 50];
  const colors = ["#ff5ad1", "#35e0d0", "#ffd23a", "#39ff14", "#b48cff", "#ff8a1e"];
  const N = wedges.length;
  let angle = 0;
  let speed = 0.5;
  let spins = 3;
  let power = 0;
  let charging = false;
  let spinning = false;
  let won = 0;
  let show = 0;
  let total = 0;
  const m: Mini = {
    score: 0,
    over: false,
    left: -1,
    update(dt) {
      show -= dt;
      if (charging) power = (power + dt * 0.9) % 1;
      if (spinning) {
        // The pegs drag on the flapper: it slows the same way every time, so it can be learned.
        speed = Math.max(0, speed - (1.1 + speed * 0.22) * dt);
        if (speed <= 0.02) {
          spinning = false;
          const at = (((-Math.PI / 2 - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          won = wedges[Math.floor(at / ((Math.PI * 2) / N)) % N]!;
          total += won;
          m.score = total * 10;
          show = 1.6;
          spins--;
          speed = 0;
        }
      } else if (spins <= 0) {
        if (show <= 0) m.over = true;
      } else if (!charging && show <= 0) speed = 0.5;
      angle += speed * dt;
    },
    draw(g) {
      g.fillStyle = "#0d0718";
      g.fillRect(0, 0, W, H);
      const cx = 240;
      const cy = 190;
      const r = 138;
      for (let i = 0; i < N; i++) {
        const a0 = angle + (i / N) * Math.PI * 2;
        const a1 = angle + ((i + 1) / N) * Math.PI * 2;
        g.fillStyle = wedges[i] === 50 ? "#f4f1ea" : colors[i % colors.length]!;
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, r, a0, a1);
        g.closePath();
        g.fill();
        g.save();
        g.translate(cx + Math.cos((a0 + a1) / 2) * r * 0.74, cy + Math.sin((a0 + a1) / 2) * r * 0.74);
        g.rotate((a0 + a1) / 2 + Math.PI / 2);
        text(g, String(wedges[i]), 0, 0, wedges[i]! >= 25 ? 20 : 15, "#12081f");
        g.restore();
      }
      g.strokeStyle = "#ffd23a";
      g.lineWidth = 6;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#ffd23a";
      g.beginPath();
      g.arc(cx, cy, 16, 0, Math.PI * 2);
      g.fill();
      // Flapper at the top.
      g.fillStyle = "#ff3b3b";
      g.beginPath();
      g.moveTo(cx - 11, 34);
      g.lineTo(cx + 11, 34);
      g.lineTo(cx, 62);
      g.closePath();
      g.fill();
      g.fillStyle = "#0a0a12";
      g.fillRect(40, 60, 22, 250);
      g.fillStyle = "#39ff14";
      g.fillRect(43, 307 - power * 244, 16, power * 244);
      text(g, "PULL", 51, 46, 11, "#ffffff");
      text(g, "SPINS", 426, 46, 11, "#ffffff");
      text(g, String(Math.max(0, spins)), 426, 78, 34, "#ffd23a");
      text(g, "TICKETS", 426, 150, 11, "#ffffff");
      text(g, String(total), 426, 182, 34, "#39ff14");
      text(g, "Hold Space,", 426, 268, 11, "#ffffff");
      text(g, "let go to spin", 426, 286, 11, "#ffffff");
      if (show > 0) text(g, won >= 25 ? `JACKPOT  +${won}` : `+${won}`, cx, cy, 30, "#12081f");
    },
    key(code, down) {
      if (code !== "Space" && code !== "ArrowDown") return;
      if (down && !spinning && !charging && spins > 0 && show <= 0) {
        charging = true;
        power = 0;
      } else if (!down && charging) {
        charging = false;
        spinning = true;
        speed = 5 + power * 7;
      }
    },
    point(_x, _y, kind) {
      if (kind === "down") m.key?.("Space", true);
      if (kind === "up") m.key?.("Space", false);
    },
    tickets: () => Math.min(60, total),
  };
  return m;
}

const MAKERS: Record<string, () => Mini> = { catch: dropCatcher, stacker, dash, pinball, skee: skeeBall, wheel: prizeWheel };

// ---------------------------------------------------------------- cabinet

export function Arcade({ game, id }: { game: Game; id: string }) {
  const cab = CABINETS.find((c) => c.id === id) ?? CABINETS[0]!;
  // A web cabinet's screen is as big as the window allows: the game inside is 16:9.
  const web = !!cab.link;
  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-2 sm:p-3">
      <div
        className={`w-full rounded-2xl border-2 shadow-2xl ${web ? "p-2 sm:p-3" : "max-w-[760px] p-3 sm:p-5"}`}
        style={{ borderColor: cab.color, background: "linear-gradient(180deg,#14101f,#07060c)", ...(web ? { width: "min(100%, calc((100dvh - 206px) * 16 / 9))", minWidth: "min(100%, 520px)", maxWidth: 1360 } : null) }}
      >
        <div className={`flex items-center justify-between gap-3 ${web ? "mb-2" : "mb-3"}`}>
          <div className="min-w-0">
            <div className={`sr-title truncate ${web ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`} style={{ color: cab.color }}>
              {cab.name}
            </div>
            {!web && <div className="text-xs text-white/60 sm:text-sm">{cab.blurb}</div>}
          </div>
          <button className="sr-btn sr-btn-ghost shrink-0" onClick={() => game.close()}>
            Back to the floor
          </button>
        </div>
        {web ? <WebCabinet game={game} cab={cab} /> : <Playable key={cab.id} game={game} cab={cab} />}
      </div>
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
    // Gamepad: stick or d-pad for left and right, A or X for the button. Whatever is already
    // held when the game starts is ignored until it is let go.
    const readPad = () => {
      const pad = typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].find((q) => q && q.connected) : null;
      const x = pad?.axes[0] ?? 0;
      return {
        KeyA: !!pad && (x < -0.5 || !!pad.buttons[14]?.pressed),
        KeyD: !!pad && (x > 0.5 || !!pad.buttons[15]?.pressed),
        Space: !!pad && (!!pad.buttons[0]?.pressed || !!pad.buttons[2]?.pressed || !!pad.buttons[7]?.pressed),
      };
    };
    let padWas = readPad();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const padNow = readPad();
      for (const code of ["KeyA", "KeyD", "Space"] as const) if (padNow[code] !== padWas[code]) mini.key?.(code, padNow[code]);
      padWas = padNow;
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
      <div data-playing={state === "play" ? "1" : "0"} className="relative overflow-hidden rounded-xl border border-white/15 bg-black" style={{ aspectRatio: `${W} / ${H}` }}>
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
              data-primary
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
