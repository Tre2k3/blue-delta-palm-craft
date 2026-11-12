import { shuffle, type Outcome, type TableGame } from "./types";

export type Tile = [number, number];

export type DominoMove = { type: "play"; tile: number; end: "L" | "R" } | { type: "draw" } | { type: "pass" } | { type: "next" };

export type DominoView = {
  /** The line on the table, left to right, each tile turned the way it lies. */
  chain: Tile[];
  /** Seat 0's tiles, and for each the ends it can go on. */
  hand: { tile: Tile; ends: ("L" | "R")[] }[];
  theirs: number;
  boneyard: number;
  turn: number;
  scores: [number, number];
  target: number;
  canDraw: boolean;
  canPass: boolean;
  /** Set between rounds: what happened, and who it paid. */
  round: { text: string; winner: number; points: number; shown: Tile[] } | null;
  last: string;
};

const pips = (hand: Tile[]) => hand.reduce((n, t) => n + t[0] + t[1], 0);

/**
 * Draw dominoes for two with a double-six set, first to 50. Seven tiles each. Match an end or
 * draw from the boneyard until you can; with the boneyard empty you pass. Going out pays what
 * the other hand is holding. If the line is blocked, the lighter hand takes the difference.
 */
export class Dominoes implements TableGame<DominoMove, DominoView> {
  private hands: [Tile[], Tile[]] = [[], []];
  private bone: Tile[] = [];
  private chain: Tile[] = [];
  private side = 0;
  private scores: [number, number] = [0, 0];
  private passes = 0;
  private round: DominoView["round"] = null;
  private last = "";
  readonly target = 50;

  constructor(
    private rand: () => number = Math.random,
    private names: [string, string] = ["Benji", "The other hand"],
  ) {
    this.deal(-1);
  }

  private deal(leader: number) {
    const all: Tile[] = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
    shuffle(all, this.rand);
    this.hands = [all.slice(0, 7), all.slice(7, 14)];
    this.bone = all.slice(14);
    this.chain = [];
    this.passes = 0;
    this.round = null;
    if (leader >= 0) {
      this.side = leader;
      this.last = `${this.names[leader]} leads.`;
      return;
    }
    // First round: the heaviest double leads, and it is put down for whoever holds it.
    let best = -1;
    let who = 0;
    let at = 0;
    for (const s of [0, 1]) {
      this.hands[s]!.forEach((t, i) => {
        const v = t[0] === t[1] ? 100 + t[0] : t[0] + t[1];
        if (v > best) {
          best = v;
          who = s;
          at = i;
        }
      });
    }
    const [t] = this.hands[who]!.splice(at, 1);
    this.chain = [t!];
    this.side = 1 - who;
    this.last = `${this.names[who]} leads with the ${t![0]}-${t![1]}.`;
  }

  /** Between rounds the table waits on seat 0 to deal the next one. */
  turn() {
    return this.round ? 0 : this.side;
  }

  auto() {
    return false;
  }

  private ends(): [number, number] | null {
    if (!this.chain.length) return null;
    return [this.chain[0]![0], this.chain[this.chain.length - 1]![1]];
  }

  /** The ends a tile can be laid on. */
  private fits(t: Tile): ("L" | "R")[] {
    const e = this.ends();
    if (!e) return ["R"];
    const out: ("L" | "R")[] = [];
    if (t[0] === e[0] || t[1] === e[0]) out.push("L");
    if ((t[0] === e[1] || t[1] === e[1]) && !(e[0] === e[1] && out.length)) out.push("R");
    return out;
  }

  private canPlay(side = this.side) {
    return this.hands[side]!.some((t) => this.fits(t).length > 0);
  }

  outcome(): Outcome | null {
    for (const s of [0, 1] as const) if (this.scores[s] >= this.target) return { winner: s, text: `${this.names[s]} reaches ${this.target}.` };
    return null;
  }

  view(): DominoView {
    const mine = this.side === 0 && !this.round;
    return {
      chain: this.chain.map((t) => [t[0], t[1]] as Tile),
      hand: this.hands[0].map((t) => ({ tile: [t[0], t[1]] as Tile, ends: mine ? this.fits(t) : [] })),
      theirs: this.hands[1].length,
      boneyard: this.bone.length,
      turn: this.side,
      scores: [...this.scores] as [number, number],
      target: this.target,
      canDraw: mine && !this.canPlay() && this.bone.length > 0,
      canPass: mine && !this.canPlay() && this.bone.length === 0,
      round: this.round,
      last: this.last,
    };
  }

  private endRound(winner: number, points: number, text: string) {
    if (winner >= 0) this.scores[winner as 0 | 1] += points;
    this.round = { text, winner, points, shown: this.hands[1].map((t) => [t[0], t[1]] as Tile) };
    this.last = text;
  }

  play(move: DominoMove) {
    if (!move || this.outcome()) return false;
    if (this.round) {
      if (move.type !== "next") return false;
      this.deal(this.round.winner >= 0 ? this.round.winner : 1 - this.side);
      return true;
    }
    const me = this.side;
    const hand = this.hands[me]!;
    const name = this.names[me]!;
    if (move.type === "draw") {
      if (this.canPlay() || !this.bone.length) return false;
      hand.push(this.bone.pop()!);
      this.last = `${name} draws.`;
      return true;
    }
    if (move.type === "pass") {
      if (this.canPlay() || this.bone.length) return false;
      this.passes++;
      this.last = `${name} knocks.`;
      this.side = 1 - me;
      if (this.passes >= 2) {
        // Blocked: the lighter hand takes the difference.
        const a = pips(this.hands[0]);
        const b = pips(this.hands[1]);
        if (a === b) this.endRound(-1, 0, `Blocked, ${a} each. Nobody scores.`);
        else this.endRound(a < b ? 0 : 1, Math.abs(a - b), `Blocked. ${this.names[a < b ? 0 : 1]} is lighter, ${Math.min(a, b)} to ${Math.max(a, b)}: ${Math.abs(a - b)} points.`);
      }
      return true;
    }
    if (move.type !== "play") return false;
    const t = hand[move.tile];
    if (!t || !this.fits(t).includes(move.end)) return false;
    hand.splice(move.tile, 1);
    const e = this.ends();
    if (!e) this.chain.push(t);
    else if (move.end === "L") this.chain.unshift(t[1] === e[0] ? t : [t[1], t[0]]);
    else this.chain.push(t[0] === e[1] ? t : [t[1], t[0]]);
    this.passes = 0;
    this.last = `${name} plays the ${t[0]}-${t[1]}.`;
    if (!hand.length) {
      const points = pips(this.hands[1 - me]!);
      this.endRound(me, points, `${name} is out. ${points} points from the other hand.`);
      return true;
    }
    this.side = 1 - me;
    return true;
  }

  think(level: number): DominoMove | null {
    if (this.outcome()) return null;
    if (this.round) return { type: "next" };
    const hand = this.hands[this.side]!;
    const options: { tile: number; end: "L" | "R"; worth: number }[] = [];
    hand.forEach((t, i) => {
      for (const end of this.fits(t)) {
        const e = this.ends();
        // What the open end would show after this tile goes down.
        const shows = !e ? t[1] : end === "L" ? (t[1] === e[0] ? t[0] : t[1]) : t[0] === e[1] ? t[1] : t[0];
        const follow = hand.filter((o, j) => j !== i && (o[0] === shows || o[1] === shows)).length;
        // Shed the heavy tiles and the doubles, and leave an end the rest of the hand can use.
        options.push({ tile: i, end, worth: t[0] + t[1] + (t[0] === t[1] ? 4 : 0) + follow * 3 });
      }
    });
    if (!options.length) return this.bone.length ? { type: "draw" } : { type: "pass" };
    if (level <= 0 && this.rand() < 0.5) {
      const o = options[Math.floor(this.rand() * options.length)]!;
      return { type: "play", tile: o.tile, end: o.end };
    }
    options.sort((a, b) => b.worth - a.worth);
    const pick = level >= 2 || this.rand() < 0.75 ? options[0]! : options[Math.floor(this.rand() * options.length)]!;
    return { type: "play", tile: pick.tile, end: pick.end };
  }
}
