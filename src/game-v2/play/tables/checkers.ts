import type { Outcome, TableGame } from "./types";

/** One hop: a step to the next square, or a jump over a piece. */
export type Hop = { from: number; to: number; over?: number };

export type CheckersView = {
  /** 64 squares, row 0 at the top. 0 empty, 1 and 2 seat 0's man and king, 3 and 4 seat 1's. */
  cells: number[];
  turn: number;
  /** Every hop the side to move may make. */
  hops: Hop[];
  /** The piece that has to keep jumping, or -1. */
  chain: number;
  last: Hop | null;
  count: [number, number];
};

const owner = (v: number) => (v === 0 ? -1 : v <= 2 ? 0 : 1);
const king = (v: number) => v === 2 || v === 4;

/**
 * American checkers. Seat 0 starts at the bottom and moves up the board, and moves first.
 * A jump has to be taken, a piece that can jump again has to, and a man that reaches the
 * far row is crowned and stops there.
 */
export class Checkers implements TableGame<Hop, CheckersView> {
  private cells: number[] = Array(64).fill(0);
  private side = 0;
  private chain = -1;
  private last: Hop | null = null;
  /** Hops since the last capture or crowning: eighty with neither is a draw. */
  private quiet = 0;

  constructor(private rand: () => number = Math.random) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) continue;
        if (r < 3) this.cells[r * 8 + c] = 3;
        else if (r > 4) this.cells[r * 8 + c] = 1;
      }
    }
  }

  turn() {
    return this.side;
  }

  auto() {
    return false;
  }

  private hopsFrom(i: number, jumpsOnly: boolean, out: Hop[]) {
    const v = this.cells[i]!;
    const who = owner(v);
    const r = Math.floor(i / 8);
    const c = i % 8;
    const rows = king(v) ? [-1, 1] : who === 0 ? [-1] : [1];
    for (const dr of rows) {
      for (const dc of [-1, 1]) {
        const r1 = r + dr;
        const c1 = c + dc;
        if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
        const mid = r1 * 8 + c1;
        const at = this.cells[mid]!;
        if (at === 0) {
          if (!jumpsOnly) out.push({ from: i, to: mid });
          continue;
        }
        if (owner(at) === who) continue;
        const r2 = r + dr * 2;
        const c2 = c + dc * 2;
        if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7 || this.cells[r2 * 8 + c2] !== 0) continue;
        out.push({ from: i, to: r2 * 8 + c2, over: mid });
      }
    }
  }

  /** What the side to move may do: jumps if there are any, otherwise steps. */
  hops(): Hop[] {
    const out: Hop[] = [];
    if (this.chain >= 0) {
      this.hopsFrom(this.chain, true, out);
      return out;
    }
    for (let i = 0; i < 64; i++) if (owner(this.cells[i]!) === this.side) this.hopsFrom(i, false, out);
    const jumps = out.filter((h) => h.over !== undefined);
    return jumps.length ? jumps : out;
  }

  private count(): [number, number] {
    let a = 0;
    let b = 0;
    for (const v of this.cells) {
      if (owner(v) === 0) a++;
      else if (owner(v) === 1) b++;
    }
    return [a, b];
  }

  outcome(): Outcome | null {
    if (this.quiet >= 80) return { winner: -1, text: "Forty moves each with nothing taken: a draw." };
    if (!this.hops().length) return { winner: 1 - this.side, text: this.count()[this.side] ? "No move left on the board." : "Every piece taken." };
    return null;
  }

  view(): CheckersView {
    return { cells: [...this.cells], turn: this.side, hops: this.outcome() ? [] : this.hops(), chain: this.chain, last: this.last, count: this.count() };
  }

  /** Makes the hop and says what has to be put back to undo it. */
  private apply(h: Hop) {
    const undo = { h, piece: this.cells[h.from]!, taken: h.over === undefined ? 0 : this.cells[h.over]!, side: this.side, chain: this.chain, quiet: this.quiet, last: this.last };
    let v = undo.piece;
    this.cells[h.from] = 0;
    if (h.over !== undefined) this.cells[h.over] = 0;
    const row = Math.floor(h.to / 8);
    const crowned = !king(v) && ((this.side === 0 && row === 0) || (this.side === 1 && row === 7));
    if (crowned) v += 1;
    this.cells[h.to] = v;
    this.last = h;
    this.quiet = h.over !== undefined || crowned ? 0 : this.quiet + 1;
    this.chain = -1;
    if (h.over !== undefined && !crowned) {
      const more: Hop[] = [];
      this.hopsFrom(h.to, true, more);
      if (more.length) this.chain = h.to;
    }
    if (this.chain < 0) this.side = 1 - this.side;
    return undo;
  }

  private undo(u: ReturnType<Checkers["apply"]>) {
    this.cells[u.h.to] = 0;
    this.cells[u.h.from] = u.piece;
    if (u.h.over !== undefined) this.cells[u.h.over] = u.taken;
    this.side = u.side;
    this.chain = u.chain;
    this.quiet = u.quiet;
    this.last = u.last;
  }

  play(move: Hop) {
    if (this.outcome() || !move) return false;
    const h = this.hops().find((x) => x.from === move.from && x.to === move.to);
    if (!h) return false;
    this.apply(h);
    return true;
  }

  /** Material and how far the men have come, from the side to move's chair. */
  private score() {
    let total = 0;
    for (let i = 0; i < 64; i++) {
      const v = this.cells[i]!;
      if (!v) continue;
      const who = owner(v);
      const row = Math.floor(i / 8);
      const col = i % 8;
      let worth = king(v) ? 175 : 100 + (who === 0 ? 7 - row : row) * 4;
      // The back row guards the crown squares; the middle is worth holding.
      if (!king(v) && ((who === 0 && row === 7) || (who === 1 && row === 0))) worth += 9;
      if (col >= 2 && col <= 5 && row >= 2 && row <= 5) worth += 4;
      total += who === this.side ? worth : -worth;
    }
    return total;
  }

  private search(depth: number, alpha: number, beta: number): number {
    const hops = this.hops();
    if (!hops.length) return -100000 - depth;
    if (this.quiet >= 80) return 0;
    if (depth <= 0 && this.chain < 0) return this.score();
    let top = -Infinity;
    for (const h of hops) {
      const mover = this.side;
      const u = this.apply(h);
      // A piece that goes on jumping keeps the move, so the score is not turned round.
      const v = this.side === mover ? this.search(depth, alpha, beta) : -this.search(depth - 1, -beta, -alpha);
      this.undo(u);
      if (v > top) top = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return top;
  }

  think(level: number) {
    const hops = this.hops();
    if (!hops.length) return null;
    if (level <= 0 && this.rand() < 0.35) return hops[Math.floor(this.rand() * hops.length)]!;
    const depth = level <= 0 ? 1 : level === 1 ? 3 : 5;
    let top = -Infinity;
    let picks: Hop[] = [];
    for (const h of hops) {
      const mover = this.side;
      const u = this.apply(h);
      const v = this.side === mover ? this.search(depth, -Infinity, Infinity) : -this.search(depth, -Infinity, Infinity);
      this.undo(u);
      if (v > top + 0.5) {
        top = v;
        picks = [h];
      } else if (Math.abs(v - top) <= 0.5) picks.push(h);
    }
    return picks[Math.floor(this.rand() * picks.length)]!;
  }
}
