import { shuffle, type Outcome, type TableGame } from "./types";

/** A card is its rank and its suit: "AS", "TD", "7C". */
export type Card = string;

export type SpadesMove = { type: "bid"; n: number } | { type: "card"; card: Card } | { type: "collect" } | { type: "next" };

export type SpadesView = {
  phase: "bid" | "play" | "trick" | "hand" | "over";
  turn: number;
  dealer: number;
  /** Seat 0's cards, sorted, and which of them may be played now. */
  hand: { card: Card; ok: boolean }[];
  /** How many cards each seat holds. */
  held: number[];
  /** -1 until the seat has bid. 0 is nil. */
  bids: number[];
  tricks: number[];
  /** Cards on the table for this trick, in the order they were played. */
  trick: { seat: number; card: Card }[];
  /** Who took the trick lying on the table, once all four are down. */
  taker: number;
  broken: boolean;
  scores: [number, number];
  bags: [number, number];
  target: number;
  /** After a hand: what each side made of it. */
  summary: { team: number; text: string; change: number }[] | null;
  /** What a careful player would bid on seat 0's cards. */
  hint: number;
  last: string;
};

const SUITS = ["C", "D", "H", "S"] as const;
const RANKS = "23456789TJQKA";
const rank = (c: Card) => RANKS.indexOf(c[0]!);
const suit = (c: Card) => c[1]!;
const team = (seat: number) => seat % 2;

/**
 * Spades for four. Seats 0 and 2 are partners against 1 and 3; play goes 0, 1, 2, 3. Bid the
 * tricks you will take, follow suit when you can, spades are trump and cannot be led until one
 * has been played. Making the bid pays ten a trick and one for each extra (a bag: ten bags cost
 * a hundred). Missing it costs ten a trick. Nil is a bid of none: a hundred either way.
 */
export class Spades implements TableGame<SpadesMove, SpadesView> {
  private hands: Card[][] = [[], [], [], []];
  private bids = [-1, -1, -1, -1];
  private tricks = [0, 0, 0, 0];
  private trick: { seat: number; card: Card }[] = [];
  private phase: SpadesView["phase"] = "bid";
  private side = 0;
  private dealer = 3;
  private broken = false;
  private taker = -1;
  private scores: [number, number] = [0, 0];
  private bags: [number, number] = [0, 0];
  private summary: SpadesView["summary"] = null;
  private last = "";
  /** Cards gone from play this hand, for the computer's counting. */
  private gone = new Set<Card>();
  readonly target: number;

  constructor(
    private rand: () => number = Math.random,
    private names: string[] = ["Benji", "West", "Partner", "East"],
    target = 200,
  ) {
    this.target = target;
    this.deal();
  }

  private deal() {
    const deck: Card[] = [];
    for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
    shuffle(deck, this.rand);
    this.hands = [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13).sort((a, b) => SUITS.indexOf(suit(a) as "C") * 20 + rank(a) - (SUITS.indexOf(suit(b) as "C") * 20 + rank(b))));
    this.bids = [-1, -1, -1, -1];
    this.tricks = [0, 0, 0, 0];
    this.trick = [];
    this.broken = false;
    this.taker = -1;
    this.summary = null;
    this.gone.clear();
    this.dealer = (this.dealer + 1) % 4;
    this.side = (this.dealer + 1) % 4;
    this.phase = "bid";
    this.last = `${this.names[this.dealer]} deals. ${this.names[this.side]} bids first.`;
  }

  /** Between hands, and at the end, the table waits on seat 0. */
  turn() {
    return this.phase === "hand" || this.phase === "over" ? 0 : this.side;
  }

  /** Gathering a finished trick is the table's own step. */
  auto() {
    return this.phase === "trick";
  }

  /** The cards the seat to play may put down. */
  private allowed(seat = this.side): Card[] {
    const hand = this.hands[seat]!;
    if (this.phase !== "play") return [];
    if (this.trick.length) {
      const led = suit(this.trick[0]!.card);
      const same = hand.filter((c) => suit(c) === led);
      return same.length ? same : hand;
    }
    if (this.broken) return hand;
    const plain = hand.filter((c) => suit(c) !== "S");
    return plain.length ? plain : hand;
  }

  /** Who is winning the cards on the table. */
  private winning() {
    let best = this.trick[0]!;
    for (const p of this.trick.slice(1)) {
      const a = suit(p.card);
      const b = suit(best.card);
      if (a === b ? rank(p.card) > rank(best.card) : a === "S") best = p;
    }
    return best;
  }

  outcome(): Outcome | null {
    if (this.phase !== "over") return null;
    const [a, b] = this.scores;
    if (a === b) return { winner: -1, text: `Dead level at ${a}.` };
    const w = a > b ? 0 : 1;
    return { winner: w, text: `${w === 0 ? `${this.names[0]} and ${this.names[2]}` : `${this.names[1]} and ${this.names[3]}`} take it, ${Math.max(a, b)} to ${Math.min(a, b)}.` };
  }

  view(): SpadesView {
    const ok = this.side === 0 ? new Set(this.allowed(0)) : new Set<Card>();
    return {
      phase: this.phase,
      turn: this.turn(),
      dealer: this.dealer,
      hand: this.hands[0]!.map((card) => ({ card, ok: ok.has(card) })),
      held: this.hands.map((h) => h.length),
      bids: [...this.bids],
      tricks: [...this.tricks],
      trick: this.trick.map((t) => ({ ...t })),
      taker: this.taker,
      broken: this.broken,
      scores: [...this.scores] as [number, number],
      bags: [...this.bags] as [number, number],
      target: this.target,
      summary: this.summary,
      hint: this.hint(),
      last: this.last,
    };
  }

  private scoreHand() {
    const out: NonNullable<SpadesView["summary"]> = [];
    for (const t of [0, 1] as const) {
      const seats = [t, t + 2];
      let change = 0;
      const notes: string[] = [];
      let bid = 0;
      let made = 0;
      for (const s of seats) {
        made += this.tricks[s]!;
        if (this.bids[s] === 0) {
          const kept = this.tricks[s] === 0;
          change += kept ? 100 : -100;
          notes.push(`${this.names[s]} ${kept ? "made nil" : "broke nil"}`);
        } else bid += this.bids[s]!;
      }
      if (bid > 0) {
        if (made >= bid) {
          const over = made - bid;
          change += bid * 10 + over;
          this.bags[t] += over;
          notes.push(`bid ${bid}, took ${made}${over ? `, ${over} bag${over === 1 ? "" : "s"}` : ""}`);
          if (this.bags[t] >= 10) {
            this.bags[t] -= 10;
            change -= 100;
            notes.push("ten bags: minus 100");
          }
        } else {
          change -= bid * 10;
          notes.push(`bid ${bid}, took ${made}: set`);
        }
      }
      this.scores[t] += change;
      out.push({ team: t, text: notes.join("; "), change });
    }
    this.summary = out;
    const [a, b] = this.scores;
    const done = (a >= this.target || b >= this.target || a <= -this.target || b <= -this.target) && a !== b;
    this.phase = done ? "over" : "hand";
    this.last = done ? "That is the game." : "Hand over.";
  }

  play(move: SpadesMove) {
    if (!move || this.phase === "over") return false;
    if (this.phase === "hand") {
      if (move.type !== "next") return false;
      this.deal();
      return true;
    }
    if (this.phase === "trick") {
      if (move.type !== "collect") return false;
      this.tricks[this.taker]!++;
      for (const t of this.trick) this.gone.add(t.card);
      this.trick = [];
      this.side = this.taker;
      this.taker = -1;
      if (this.hands[0]!.length === 0) this.scoreHand();
      else this.phase = "play";
      return true;
    }
    const me = this.side;
    if (this.phase === "bid") {
      if (move.type !== "bid" || !Number.isInteger(move.n) || move.n < 0 || move.n > 13) return false;
      this.bids[me] = move.n;
      this.last = `${this.names[me]} bids ${move.n === 0 ? "nil" : move.n}.`;
      this.side = (me + 1) % 4;
      if (this.bids.every((b) => b >= 0)) this.phase = "play";
      return true;
    }
    if (move.type !== "card" || !this.allowed().includes(move.card)) return false;
    const hand = this.hands[me]!;
    hand.splice(hand.indexOf(move.card), 1);
    this.trick.push({ seat: me, card: move.card });
    if (suit(move.card) === "S") this.broken = true;
    if (this.trick.length === 4) {
      this.taker = this.winning().seat;
      this.phase = "trick";
      this.last = `${this.names[this.taker]} takes it.`;
    } else this.side = (me + 1) % 4;
    return true;
  }

  /** How many tricks a hand looks good for. */
  private estimate(hand: Card[]) {
    let n = 0;
    const by = (s: string) => hand.filter((c) => suit(c) === s);
    const spades = by("S");
    const has = (c: Card) => hand.includes(c);
    if (has("AS")) n += 1;
    if (has("KS") && spades.length >= 2) n += 1;
    if (has("QS") && spades.length >= 3) n += 1;
    if (has("JS") && spades.length >= 4) n += 0.5;
    n += Math.max(0, spades.length - 4);
    for (const s of ["C", "D", "H"]) {
      const cards = by(s);
      if (cards.some((c) => c[0] === "A")) n += cards.length <= 5 ? 1 : 0.6;
      if (cards.some((c) => c[0] === "K") && cards.length >= 2 && cards.length <= 4) n += 0.65;
      if (cards.some((c) => c[0] === "Q") && cards.length === 3) n += 0.25;
      // A short suit is a place to trump.
      if (cards.length === 0 && spades.length >= 2) n += 1;
      else if (cards.length === 1 && spades.length >= 3) n += 0.5;
    }
    return n;
  }

  /** Is this the best card of its suit not yet played? */
  private boss(c: Card, hand: Card[]) {
    for (let r = rank(c) + 1; r < 13; r++) {
      const higher = RANKS[r]! + suit(c);
      if (!this.gone.has(higher) && !hand.includes(higher) && !this.trick.some((t) => t.card === higher)) return false;
    }
    return true;
  }

  private pickCard(level: number): Card {
    const me = this.side;
    const hand = this.hands[me]!;
    const ok = this.allowed();
    const low = (cards: Card[]) => cards.reduce((a, b) => (rank(b) < rank(a) ? b : a));
    const high = (cards: Card[]) => cards.reduce((a, b) => (rank(b) > rank(a) ? b : a));
    if (level <= 0 && this.rand() < 0.35) return ok[Math.floor(this.rand() * ok.length)]!;
    const nil = this.bids[me] === 0;
    if (!this.trick.length) {
      if (nil) return low(ok);
      // Cash a card nothing can beat; otherwise get off lead cheaply from the longest side suit.
      const plain = ok.filter((c) => suit(c) !== "S");
      const top = plain.filter((c) => this.boss(c, hand));
      if (top.length) return high(top);
      if (plain.length) {
        const longest = ["C", "D", "H"].map((s) => plain.filter((c) => suit(c) === s)).sort((a, b) => b.length - a.length)[0]!;
        return low(longest);
      }
      const bossSpades = ok.filter((c) => this.boss(c, hand));
      return bossSpades.length ? high(bossSpades) : low(ok);
    }
    const lead = suit(this.trick[0]!.card);
    const best = this.winning();
    const partnerHas = team(best.seat) === team(me);
    const lastToPlay = this.trick.length === 3;
    const follows = ok.every((c) => suit(c) === lead);
    const beats = (c: Card) => (suit(c) === suit(best.card) ? rank(c) > rank(best.card) : suit(c) === "S");
    if (nil) {
      // Duck under whatever is winning; with nothing under it, lose the biggest loser.
      const under = ok.filter((c) => !beats(c));
      return under.length ? high(under) : low(ok);
    }
    if (follows) {
      const winners = ok.filter(beats);
      // Partner has it and it will likely hold: stay out of the way.
      if (partnerHas && (lastToPlay || this.boss(best.card, hand) || suit(best.card) === "S")) return low(ok);
      if (!winners.length) return low(ok);
      return lastToPlay ? low(winners) : high(winners);
    }
    // Out of the suit led.
    const plain = ok.filter((c) => suit(c) !== "S");
    if (partnerHas && (lastToPlay || this.boss(best.card, hand))) return plain.length ? low(plain) : low(ok);
    const trumps = ok.filter((c) => suit(c) === "S" && beats(c));
    if (trumps.length) return low(trumps);
    return plain.length ? low(plain) : low(ok);
  }

  think(level: number): SpadesMove | null {
    if (this.phase === "over") return null;
    if (this.phase === "hand") return { type: "next" };
    if (this.phase === "trick") return { type: "collect" };
    if (this.phase === "bid") {
      const est = this.estimate(this.hands[this.side]!) + (level <= 0 ? (this.rand() - 0.5) * 2 : 0);
      return { type: "bid", n: Math.max(1, Math.min(13, Math.round(est))) };
    }
    return { type: "card", card: this.pickCard(level) };
  }

  /** What a careful player would bid on seat 0's cards: shown as a hint. */
  hint() {
    return Math.max(1, Math.min(13, Math.round(this.estimate(this.hands[0]!))));
  }
}
