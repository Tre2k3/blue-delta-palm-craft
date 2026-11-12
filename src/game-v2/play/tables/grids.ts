import type { Outcome, TableGame } from "./types";

// ---------------------------------------------------------------- tic-tac-toe

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export type TicView = { cells: number[]; turn: number; line: number[] | null };

/** Three in a row. Seat 0 is X and goes first. Cells hold 0 for empty, 1 for X, 2 for O. */
export class TicTacToe implements TableGame<number, TicView> {
  private cells: number[] = Array(9).fill(0);
  private side = 0;

  constructor(private rand: () => number = Math.random) {}

  turn() {
    return this.side;
  }

  auto() {
    return false;
  }

  private line(cells = this.cells) {
    for (const l of LINES) if (cells[l[0]] && cells[l[0]] === cells[l[1]] && cells[l[0]] === cells[l[2]]) return l;
    return null;
  }

  outcome(): Outcome | null {
    const l = this.line();
    if (l) return { winner: this.cells[l[0]]! - 1, text: "Three in a row." };
    if (this.cells.every((c) => c)) return { winner: -1, text: "Cat's game: nobody takes it." };
    return null;
  }

  view(): TicView {
    const l = this.line();
    return { cells: [...this.cells], turn: this.side, line: l ? [...l] : null };
  }

  play(cell: number) {
    if (this.outcome() || !Number.isInteger(cell) || cell < 0 || cell > 8 || this.cells[cell]) return false;
    this.cells[cell] = this.side + 1;
    this.side = 1 - this.side;
    return true;
  }

  /** The best the side to move can do from here: 1 win, 0 draw, -1 loss. */
  private best(cells: number[], side: number): number {
    const l = this.line(cells);
    if (l) return cells[l[0]] === side + 1 ? 1 : -1;
    if (cells.every((c) => c)) return 0;
    let top = -2;
    for (let i = 0; i < 9; i++) {
      if (cells[i]) continue;
      cells[i] = side + 1;
      top = Math.max(top, -this.best(cells, 1 - side));
      cells[i] = 0;
      if (top === 1) break;
    }
    return top;
  }

  think(level: number) {
    const open = this.cells.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!open.length) return null;
    // An easy player looks away now and then; a sharp one hardly ever does.
    const slip = level <= 0 ? 0.5 : level === 1 ? 0.2 : 0.06;
    if (this.rand() < slip) return open[Math.floor(this.rand() * open.length)]!;
    let top = -2;
    let picks: number[] = [];
    const cells = [...this.cells];
    for (const i of open) {
      cells[i] = this.side + 1;
      const v = -this.best(cells, 1 - this.side);
      cells[i] = 0;
      if (v > top) {
        top = v;
        picks = [i];
      } else if (v === top) picks.push(i);
    }
    return picks[Math.floor(this.rand() * picks.length)]!;
  }
}

// ---------------------------------------------------------------- four in a row

const COLS = 7;
const ROWS = 6;

export type FourView = { cols: number[][]; turn: number; line: [number, number][] | null; last: [number, number] | null };

/** Four in a row on a 7 by 6 rack. Seat 0 is red and drops first. A column lists its discs from the bottom up. */
export class FourInARow implements TableGame<number, FourView> {
  private cols: number[][] = Array.from({ length: COLS }, () => []);
  private side = 0;
  private last: [number, number] | null = null;

  constructor(private rand: () => number = Math.random) {}

  turn() {
    return this.side;
  }

  auto() {
    return false;
  }

  private at(c: number, r: number) {
    return this.cols[c]?.[r] ?? 0;
  }

  private line(): [number, number][] | null {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = this.at(c, r);
        if (!v) continue;
        for (const [dc, dr] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ] as const) {
          const run: [number, number][] = [[c, r]];
          for (let k = 1; k < 4; k++) {
            if (this.at(c + dc * k, r + dr * k) !== v) break;
            run.push([c + dc * k, r + dr * k]);
          }
          if (run.length === 4) return run;
        }
      }
    }
    return null;
  }

  outcome(): Outcome | null {
    const l = this.line();
    if (l) return { winner: this.at(l[0]![0], l[0]![1]) - 1, text: "Four in a row." };
    if (this.cols.every((c) => c.length >= ROWS)) return { winner: -1, text: "The rack is full: a draw." };
    return null;
  }

  view(): FourView {
    return { cols: this.cols.map((c) => [...c]), turn: this.side, line: this.line(), last: this.last };
  }

  play(col: number) {
    if (this.outcome() || !Number.isInteger(col) || col < 0 || col >= COLS || this.cols[col]!.length >= ROWS) return false;
    this.cols[col]!.push(this.side + 1);
    this.last = [col, this.cols[col]!.length - 1];
    this.side = 1 - this.side;
    return true;
  }

  /** How good the rack looks for `side`: every run of four cells still open to somebody. */
  private score(side: number) {
    let total = 0;
    const mine = side + 1;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        for (const [dc, dr] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ] as const) {
          const ec = c + dc * 3;
          const er = r + dr * 3;
          if (ec >= COLS || er >= ROWS || er < 0) continue;
          let a = 0;
          let b = 0;
          for (let k = 0; k < 4; k++) {
            const v = this.at(c + dc * k, r + dr * k);
            if (v === mine) a++;
            else if (v) b++;
          }
          if (a && b) continue;
          total += a === 3 ? 50 : a === 2 ? 8 : a === 1 ? 1 : 0;
          total -= b === 3 ? 60 : b === 2 ? 8 : b === 1 ? 1 : 0;
        }
      }
    }
    // The middle column is worth having.
    for (const v of this.cols[3]!) total += v === mine ? 4 : -4;
    return total;
  }

  private search(depth: number, alpha: number, beta: number): number {
    const l = this.line();
    // Whoever just moved made the four, so the side to move has lost.
    if (l) return -100000 - depth;
    if (this.cols.every((c) => c.length >= ROWS)) return 0;
    if (depth === 0) return this.score(this.side);
    let top = -Infinity;
    for (const c of [3, 2, 4, 1, 5, 0, 6]) {
      if (this.cols[c]!.length >= ROWS) continue;
      this.cols[c]!.push(this.side + 1);
      this.side = 1 - this.side;
      const v = -this.search(depth - 1, -beta, -alpha);
      this.side = 1 - this.side;
      this.cols[c]!.pop();
      if (v > top) top = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return top;
  }

  think(level: number) {
    const open = [3, 2, 4, 1, 5, 0, 6].filter((c) => this.cols[c]!.length < ROWS);
    if (!open.length) return null;
    const depth = level <= 0 ? 1 : level === 1 ? 3 : 5;
    if (level <= 0 && this.rand() < 0.3) return open[Math.floor(this.rand() * open.length)]!;
    let top = -Infinity;
    let picks: number[] = [];
    for (const c of open) {
      this.cols[c]!.push(this.side + 1);
      this.side = 1 - this.side;
      const v = -this.search(depth, -Infinity, Infinity);
      this.side = 1 - this.side;
      this.cols[c]!.pop();
      if (v > top) {
        top = v;
        picks = [c];
      } else if (v === top) picks.push(c);
    }
    return picks[Math.floor(this.rand() * picks.length)]!;
  }
}
