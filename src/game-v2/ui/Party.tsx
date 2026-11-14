import { useEffect, useRef } from "react";
import type { Game } from "../game";

const COLORS = ["#39ff14", "#ffd23a", "#ff5ad1", "#35e0d0", "#ff8a1e", "#ffffff", "#e0b33a"];

type Piece = { x: number; y: number; vx: number; vy: number; w: number; h: number; spin: number; turn: number; flip: number; color: string; life: number };

/**
 * Confetti over the whole screen. The game bumps `live.party` when something is worth it; this
 * throws a burst for each bump and stops drawing when the last piece has fallen.
 */
export function Party({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    let raf = 0;
    let seen = game.live.party;
    let last = performance.now();
    let pieces: Piece[] = [];
    const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const throwSome = (level: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const n = still ? 0 : level >= 3 ? 190 : level === 2 ? 130 : 46;
      for (let i = 0; i < n; i++) {
        // Two cannons at the bottom corners, and a drop from the top on the big ones.
        const fromTop = level >= 2 && i % 3 === 0;
        const left = i % 2 === 0;
        const speed = (0.55 + Math.random() * 0.75) * Math.max(520, h * 1.25);
        const angle = 0.28 + Math.random() * 0.62;
        pieces.push({
          x: fromTop ? Math.random() * w : left ? -10 : w + 10,
          y: fromTop ? -20 - Math.random() * h * 0.3 : h * (0.72 + Math.random() * 0.25),
          vx: fromTop ? (Math.random() - 0.5) * 160 : (left ? 1 : -1) * Math.sin(angle) * speed,
          vy: fromTop ? 120 + Math.random() * 220 : -Math.cos(angle) * speed,
          w: 7 + Math.random() * 7,
          h: 10 + Math.random() * 10,
          spin: Math.random() * Math.PI * 2,
          turn: (Math.random() - 0.5) * 12,
          flip: Math.random() * Math.PI * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
          life: 3.2 + Math.random() * 1.8,
        });
      }
      if (pieces.length > 520) pieces = pieces.slice(-520);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (game.live.party !== seen) {
        seen = game.live.party;
        throwSome(game.live.partyLevel);
      }
      if (!pieces.length) {
        if (canvas.dataset.on === "1") {
          canvas.dataset.on = "0";
          g.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      canvas.dataset.on = "1";
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.clearRect(0, 0, w, h);
      const drag = Math.exp(-1.1 * dt);
      pieces = pieces.filter((p) => p.life > 0 && p.y < h + 40);
      for (const p of pieces) {
        p.life -= dt;
        p.vx *= drag;
        p.vy = p.vy * drag + 620 * dt;
        // Paper flutters: it slides sideways as it turns.
        p.flip += dt * 7;
        p.x += (p.vx + Math.sin(p.flip) * 46) * dt;
        p.y += p.vy * dt;
        p.spin += p.turn * dt;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.spin);
        g.globalAlpha = Math.min(1, p.life * 1.4);
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, (-p.h / 2) * Math.cos(p.flip), p.w, p.h * Math.cos(p.flip));
        g.restore();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-[70] h-full w-full" />;
}
