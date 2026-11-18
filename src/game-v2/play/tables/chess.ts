import type { Outcome, TableGame } from "./types";

export type ChessMove = { from: number; to: number; promo?: "q" | "r" | "b" | "n" };

export type ChessView = {
  /** 64 squares, a8 first. White is upper case, black lower, empty is "". */
  cells: string[];
  turn: number;
  check: boolean;
  moves: ChessMove[];
  last: ChessMove | null;
  /** Pieces each seat has taken. */
  taken: [string[], string[]];
};

type Undo = { m: ChessMove; piece: string; taken: string; takenAt: number; rights: number; ep: number; half: number; rookFrom: number; rookTo: number };

const START = ["r", "n", "b", "q", "k", "b", "n", "r"];
const WORTH: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const KNIGHT = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
] as const;
const DIAG = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;
const LINE = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
const ALL = [...DIAG, ...LINE];

const white = (p: string) => p !== "" && p === p.toUpperCase();
const sideOf = (p: string) => (p === "" ? -1 : white(p) ? 0 : 1);

/**
 * Chess, all of it: castling, taking in passing, promotion, check, mate, stalemate, and the
 * draws by repetition, fifty moves and bare kings. Seat 0 has white, at the bottom of the board.
 */
export class Chess implements TableGame<ChessMove, ChessView> {
  private b: string[] = Array(64).fill("");
  private side = 0;
  /** Castling still allowed: 1 white king side, 2 white queen side, 4 black king side, 8 black queen side. */
  private rights = 15;
  private ep = -1;
  private half = 0;
  private last: ChessMove | null = null;
  private seen = new Map<string, number>();
  private taken: [string[], string[]] = [[], []];

  constructor(private rand: () => number = Math.random) {
    for (let c = 0; c < 8; c++) {
      this.b[c] = START[c]!;
      this.b[8 + c] = "p";
      this.b[48 + c] = "P";
      this.b[56 + c] = START[c]!.toUpperCase();
    }
    this.note();
  }

  turn() {
    return this.side;
  }

  auto() {
    return false;
  }

  private key() {
    return `${this.b.map((p) => p || ".").join("")}${this.side}${this.rights}${this.ep}`;
  }

  private note() {
    const k = this.key();
    this.seen.set(k, (this.seen.get(k) ?? 0) + 1);
  }

  /** Is the square attacked by `by`? */
  private attacked(sq: number, by: number) {
    const r = sq >> 3;
    const c = sq & 7;
    const b = this.b;
    const mine = (p: string, kind: string) => p !== "" && p.toLowerCase() === kind && sideOf(p) === by;
    // A white pawn attacks up the board, so it sits a row below the square it attacks.
    const pr = r + (by === 0 ? 1 : -1);
    if (pr >= 0 && pr < 8) {
      if (c > 0 && mine(b[pr * 8 + c - 1]!, "p")) return true;
      if (c < 7 && mine(b[pr * 8 + c + 1]!, "p")) return true;
    }
    for (const [dr, dc] of KNIGHT) {
      const r1 = r + dr;
      const c1 = c + dc;
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8 && mine(b[r1 * 8 + c1]!, "n")) return true;
    }
    for (const [dr, dc] of ALL) {
      const r1 = r + dr;
      const c1 = c + dc;
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8 && mine(b[r1 * 8 + c1]!, "k")) return true;
    }
    for (const [dirs, kind] of [
      [DIAG, "b"],
      [LINE, "r"],
    ] as const) {
      for (const [dr, dc] of dirs) {
        let r1 = r + dr;
        let c1 = c + dc;
        while (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) {
          const p = b[r1 * 8 + c1]!;
          if (p !== "") {
            if (mine(p, kind) || mine(p, "q")) return true;
            break;
          }
          r1 += dr;
          c1 += dc;
        }
      }
    }
    return false;
  }

  private kingOf(side: number) {
    return this.b.indexOf(side === 0 ? "K" : "k");
  }

  inCheck(side = this.side) {
    return this.attacked(this.kingOf(side), 1 - side);
  }

  /** Every move the pieces can make, without asking whether it leaves the king in check. */
  private pseudo(capturesOnly = false) {
    const out: ChessMove[] = [];
    const b = this.b;
    const me = this.side;
    for (let i = 0; i < 64; i++) {
      const p = b[i]!;
      if (sideOf(p) !== me) continue;
      const r = i >> 3;
      const c = i & 7;
      const kind = p.toLowerCase();
      if (kind === "p") {
        const dir = me === 0 ? -1 : 1;
        const r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        const promote = r1 === 0 || r1 === 7;
        const add = (to: number) => {
          if (promote) for (const promo of ["q", "n", "r", "b"] as const) out.push({ from: i, to, promo });
          else out.push({ from: i, to });
        };
        if (!capturesOnly && b[r1 * 8 + c] === "") {
          add(r1 * 8 + c);
          const home = me === 0 ? 6 : 1;
          if (r === home && b[(r + dir * 2) * 8 + c] === "") out.push({ from: i, to: (r + dir * 2) * 8 + c });
        } else if (capturesOnly && promote && b[r1 * 8 + c] === "") add(r1 * 8 + c);
        for (const dc of [-1, 1]) {
          const c1 = c + dc;
          if (c1 < 0 || c1 > 7) continue;
          const to = r1 * 8 + c1;
          if ((b[to] !== "" && sideOf(b[to]!) !== me) || to === this.ep) add(to);
        }
        continue;
      }
      const step = kind === "n" ? KNIGHT : kind === "k" ? ALL : null;
      if (step) {
        for (const [dr, dc] of step) {
          const r1 = r + dr;
          const c1 = c + dc;
          if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
          const t = b[r1 * 8 + c1]!;
          if (t === "" ? !capturesOnly : sideOf(t) !== me) out.push({ from: i, to: r1 * 8 + c1 });
        }
      } else {
        const dirs = kind === "b" ? DIAG : kind === "r" ? LINE : ALL;
        for (const [dr, dc] of dirs) {
          let r1 = r + dr;
          let c1 = c + dc;
          while (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) {
            const t = b[r1 * 8 + c1]!;
            if (t === "") {
              if (!capturesOnly) out.push({ from: i, to: r1 * 8 + c1 });
            } else {
              if (sideOf(t) !== me) out.push({ from: i, to: r1 * 8 + c1 });
              break;
            }
            r1 += dr;
            c1 += dc;
          }
        }
      }
      if (kind === "k" && !capturesOnly) {
        // Castling: the squares between are empty, and the king does not start on, cross or land on an attacked square.
        const row = me === 0 ? 56 : 0;
        const ks = me === 0 ? 1 : 4;
        const qs = me === 0 ? 2 : 8;
        if (i === row + 4 && !this.attacked(i, 1 - me)) {
          if (this.rights & ks && b[row + 5] === "" && b[row + 6] === "" && b[row + 7] === (me === 0 ? "R" : "r") && !this.attacked(row + 5, 1 - me) && !this.attacked(row + 6, 1 - me)) out.push({ from: i, to: row + 6 });
          if (this.rights & qs && b[row + 3] === "" && b[row + 2] === "" && b[row + 1] === "" && b[row] === (me === 0 ? "R" : "r") && !this.attacked(row + 3, 1 - me) && !this.attacked(row + 2, 1 - me)) out.push({ from: i, to: row + 2 });
        }
      }
    }
    return out;
  }

  private make(m: ChessMove): Undo {
    const b = this.b;
    const piece = b[m.from]!;
    const kind = piece.toLowerCase();
    const me = this.side;
    let takenAt = m.to;
    if (kind === "p" && m.to === this.ep) takenAt = m.to + (me === 0 ? 8 : -8);
    const u: Undo = { m, piece, taken: b[takenAt]!, takenAt, rights: this.rights, ep: this.ep, half: this.half, rookFrom: -1, rookTo: -1 };
    b[takenAt] = "";
    b[m.from] = "";
    b[m.to] = m.promo ? (me === 0 ? m.promo.toUpperCase() : m.promo) : piece;
    if (kind === "k" && Math.abs(m.to - m.from) === 2) {
      u.rookFrom = m.to > m.from ? m.to + 1 : m.to - 2;
      u.rookTo = m.to > m.from ? m.to - 1 : m.to + 1;
      b[u.rookTo] = b[u.rookFrom]!;
      b[u.rookFrom] = "";
    }
    this.ep = kind === "p" && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
    // A king or rook that moves, or a rook taken at home, ends that side's castling there.
    if (kind === "k") this.rights &= me === 0 ? ~3 : ~12;
    for (const sq of [m.from, m.to]) {
      if (sq === 63) this.rights &= ~1;
      else if (sq === 56) this.rights &= ~2;
      else if (sq === 7) this.rights &= ~4;
      else if (sq === 0) this.rights &= ~8;
    }
    this.half = kind === "p" || u.taken !== "" ? 0 : this.half + 1;
    this.side = 1 - me;
    return u;
  }

  private unmake(u: Undo) {
    const b = this.b;
    this.side = 1 - this.side;
    b[u.m.from] = u.piece;
    b[u.m.to] = "";
    b[u.takenAt] = u.taken;
    if (u.rookFrom >= 0) {
      b[u.rookFrom] = b[u.rookTo]!;
      b[u.rookTo] = "";
    }
    this.rights = u.rights;
    this.ep = u.ep;
    this.half = u.half;
  }

  private legal(capturesOnly = false) {
    const me = this.side;
    return this.pseudo(capturesOnly).filter((m) => {
      const u = this.make(m);
      const ok = !this.attacked(this.kingOf(me), 1 - me);
      this.unmake(u);
      return ok;
    });
  }

  /** Legal moves for the side to move. For the screen, promotions are folded to the queen. */
  moves() {
    return this.legal();
  }

  private bare() {
    const left = this.b.filter((p) => p !== "" && p.toLowerCase() !== "k").map((p) => p.toLowerCase());
    return left.length === 0 || (left.length === 1 && (left[0] === "n" || left[0] === "b"));
  }

  outcome(): Outcome | null {
    if (!this.legal().length) return this.inCheck() ? { winner: 1 - this.side, text: "Checkmate." } : { winner: -1, text: "Stalemate: a draw." };
    if (this.bare()) return { winner: -1, text: "Not enough left to mate with: a draw." };
    if (this.half >= 100) return { winner: -1, text: "Fifty moves with nothing taken and no pawn moved: a draw." };
    if ((this.seen.get(this.key()) ?? 0) >= 3) return { winner: -1, text: "The same position three times: a draw." };
    return null;
  }

  view(): ChessView {
    const over = this.outcome();
    return { cells: [...this.b], turn: this.side, check: this.inCheck(), moves: over ? [] : this.legal(), last: this.last, taken: [[...this.taken[0]], [...this.taken[1]]] };
  }

  play(move: ChessMove) {
    if (!move || this.outcome()) return false;
    const want = move.promo ?? "q";
    const m = this.legal().find((x) => x.from === move.from && x.to === move.to && (!x.promo || x.promo === want));
    if (!m) return false;
    const mover = this.side;
    const u = this.make(m);
    if (u.taken) this.taken[mover].push(u.taken);
    this.last = m;
    this.note();
    return true;
  }

  /** Material and where it stands, from the side to move's chair. */
  private score() {
    let total = 0;
    let queens = 0;
    for (const p of this.b) if (p.toLowerCase() === "q") queens++;
    for (let i = 0; i < 64; i++) {
      const p = this.b[i]!;
      if (p === "") continue;
      const who = sideOf(p);
      const kind = p.toLowerCase();
      const r = i >> 3;
      const c = i & 7;
      // How far up the board, from the piece's own side, and how near the middle.
      const up = who === 0 ? 7 - r : r;
      const mid = 3.5 - Math.max(Math.abs(c - 3.5), Math.abs(r - 3.5));
      let v = WORTH[kind]!;
      if (kind === "p") v += up * 6 + (c === 3 || c === 4 ? (up >= 3 ? 14 : 4) : 0);
      else if (kind === "n") v += mid * 9;
      else if (kind === "b") v += mid * 5;
      else if (kind === "r") v += up === 6 ? 16 : 0;
      else if (kind === "q") v += mid * 2;
      else if (kind === "k") v += queens ? -mid * 10 + (up === 0 ? 8 : 0) : mid * 8;
      total += who === this.side ? v : -v;
    }
    return total;
  }

  /** Takes first, the biggest prize with the smallest piece. */
  private order(moves: ChessMove[]) {
    const b = this.b;
    const rank = (m: ChessMove) => (b[m.to] !== "" ? WORTH[b[m.to]!.toLowerCase()]! * 10 - WORTH[b[m.from]!.toLowerCase()]! : 0) + (m.promo === "q" ? 800 : 0);
    return moves.sort((x, y) => rank(y) - rank(x));
  }

  /** Plays the takes out before judging, so a piece left hanging is seen. */
  private quiet(alpha: number, beta: number, depth: number): number {
    const stand = this.score();
    if (depth === 0) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    for (const m of this.order(this.legal(true))) {
      const u = this.make(m);
      const v = -this.quiet(-beta, -alpha, depth - 1);
      this.unmake(u);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  private search(depth: number, alpha: number, beta: number): number {
    const moves = this.legal();
    if (!moves.length) return this.inCheck() ? -100000 - depth : 0;
    if (this.half >= 100 || this.bare()) return 0;
    if (depth === 0) return this.quiet(alpha, beta, 4);
    let top = -Infinity;
    for (const m of this.order(moves)) {
      const u = this.make(m);
      const v = -this.search(depth - 1, -beta, -alpha);
      this.unmake(u);
      if (v > top) top = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return top;
  }

  think(level: number) {
    const moves = this.legal().filter((m) => !m.promo || m.promo === "q");
    if (!moves.length) return null;
    if (level <= 0 && this.rand() < 0.3) return moves[Math.floor(this.rand() * moves.length)]!;
    const depth = level <= 0 ? 0 : level === 1 ? 1 : 2;
    let top = -Infinity;
    let picks: ChessMove[] = [];
    for (const m of this.order(moves)) {
      const u = this.make(m);
      let v = -this.search(depth, -Infinity, Infinity);
      // Walking back into a position already seen twice is a draw, whatever the board says.
      if ((this.seen.get(this.key()) ?? 0) >= 2) v = 0;
      this.unmake(u);
      if (v > top + 6) {
        top = v;
        picks = [m];
      } else if (v >= top - 6) {
        picks.push(m);
        if (v > top) top = v;
      }
    }
    return picks[Math.floor(this.rand() * picks.length)]!;
  }
}
