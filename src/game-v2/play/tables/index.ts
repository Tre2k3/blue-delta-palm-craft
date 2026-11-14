import type { TableHud, TableId, TableInvite } from "../../core/types";
import type { Game } from "../../game";
import { Checkers } from "./checkers";
import { Chess } from "./chess";
import { Dominoes } from "./dominoes";
import { FourInARow, TicTacToe } from "./grids";
import { Spades } from "./spades";
import type { Outcome, TableGame } from "./types";

type Info = {
  name: string;
  /** Who Benji plays. For spades: his partner first, then the two across. */
  rivals: string[];
  /** SackDollars and Respect for beating the regular at the middle level. */
  pay: number;
  respect: number;
  /** Can two people share one device? Only games with nothing hidden. */
  two: boolean;
  /** Seconds the regular takes over a move. */
  pace: number;
  line: string;
  how: string[];
};

export const TABLES: Record<TableId, Info> = {
  chess: {
    name: "Chess",
    rivals: ["Mr. Earl"],
    pay: 60,
    respect: 4,
    two: true,
    pace: 0.9,
    line: "Mr. Earl has held this table since before you were born.",
    how: ["You have white, at the bottom, and move first.", "Tap a piece, then a lit square.", "A pawn that reaches the far row becomes a queen."],
  },
  checkers: {
    name: "Checkers",
    rivals: ["Miss Loretta"],
    pay: 40,
    respect: 3,
    two: true,
    pace: 0.7,
    line: "Miss Loretta does not give back a jump.",
    how: ["You have red, at the bottom, and move first.", "If you can jump you must, and a piece that can jump again keeps going.", "Reach the far row to be crowned: a king moves both ways."],
  },
  connect4: {
    name: "Four in a Row",
    rivals: ["Lil Dre"],
    pay: 25,
    respect: 2,
    two: true,
    pace: 0.6,
    line: "Lil Dre plays fast and talks faster.",
    how: ["You are red and drop first.", "Tap a column to drop a disc.", "Four in a line wins: across, up or on a slant."],
  },
  tictactoe: {
    name: "Tic-Tac-Toe",
    rivals: ["Nia"],
    pay: 10,
    respect: 1,
    two: true,
    pace: 0.55,
    line: "Nia will play you all afternoon.",
    how: ["You are X and go first.", "Three in a row wins."],
  },
  dominoes: {
    name: "Dominoes",
    rivals: ["Big Mike"],
    pay: 45,
    respect: 3,
    two: false,
    pace: 0.8,
    line: "Big Mike slams every tile like it owes him money.",
    how: ["Match either end of the line. Tap a tile; if it fits both ends, pick one.", "Nothing fits? Draw until something does. With the boneyard empty, knock.", "Go out and you score what he is holding. First to 50."],
  },
  spades: {
    name: "Spades",
    rivals: ["Tasha", "Pops", "Cousin Ray"],
    pay: 80,
    respect: 5,
    two: false,
    pace: 0.75,
    line: "Tasha needs a partner. Pops and Cousin Ray have not lost all week.",
    how: ["Bid how many tricks you will take. You and Tasha add your bids together.", "Follow the suit led if you can. Spades beat everything, and cannot be led until one has been played.", "Make the bid: ten a trick. Miss it: lose ten a trick. First side to 200."],
  },
};

export const LEVELS = [
  { name: "Easy", pay: 0.6 },
  { name: "Regular", pay: 1 },
  { name: "Sharp", pay: 1.6 },
] as const;

function make(id: TableId, rand: () => number): TableGame {
  const t = TABLES[id];
  if (id === "chess") return new Chess(rand);
  if (id === "checkers") return new Checkers(rand);
  if (id === "connect4") return new FourInARow(rand);
  if (id === "tictactoe") return new TicTacToe(rand);
  if (id === "dominoes") return new Dominoes(rand, ["Benji", t.rivals[0]!]);
  return new Spades(rand, ["Benji", t.rivals[1]!, t.rivals[0]!, t.rivals[2]!]);
}

/** What each side is called, first to move first. */
export const SIDES: Partial<Record<TableId, [string, string]>> = { chess: ["white", "black"], checkers: ["red", "black"], connect4: ["red", "yellow"], tictactoe: ["X", "O"] };

/** A game against a friend on another device. `seat` is the side this device plays; `n` names the game, `moves` counts them. */
type Net = { peer: string; name: string; seat: number; n: number; moves: number; gone: boolean; again: boolean; theirs: boolean };

/** How long a friend's ask stays up before it is taken as a no. */
const ASK_SECONDS = 30;

/**
 * Whoever is sat at a park table: which game, who has which seat, when the regular moves,
 * and what a win pays. The rules themselves are the game's own.
 *
 * Against a friend in the crew, both devices run the same rules and pass each move across;
 * a move the rules do not allow is not played, wherever it came from.
 */
export class TableGames {
  id: TableId | null = null;
  game: TableGame | null = null;
  private stage: TableHud["stage"] = "pick";
  private level = 1;
  private two = false;
  private wait = 0;
  private result: TableHud["result"] = null;
  /** Set by a test to replay the same deal. */
  rand: () => number = Math.random;
  private net: Net | null = null;
  /** A friend asking for a game, until it is answered or runs out. */
  private asked: { from: string; name: string; id: TableId; n: number; left: number } | null = null;
  /** When each friend was last told no, in the game's own seconds: asking again straight away is not heard. */
  private passed = new Map<string, number>();

  constructor(private g: Game) {}

  // ---------------------------------------------------------------- against a friend

  private tell(msg: Record<string, unknown>, to = this.net?.peer) {
    if (to) this.g.crew.table(to, msg);
  }

  /** Ask a friend in the crew for a game. He gets the first move. */
  invite(peer: string, id: TableId | null = this.id) {
    if (!id || !TABLES[id].two || !this.g.crew.linked().some((f) => f.id === peer)) return false;
    if (this.net) this.tell({ t: "leave", n: this.net.n });
    this.id = id;
    this.game = null;
    this.result = null;
    this.stage = "wait";
    this.net = { peer, name: this.g.crew.nameOf(peer), seat: 0, n: Math.floor(Math.random() * 1e9), moves: 0, gone: false, again: false, theirs: false };
    this.tell({ t: "invite", g: id, n: this.net.n });
    if (this.g.overlay !== "table") this.g.open("table");
    else this.g.push();
    return true;
  }

  /** Say yes to the friend who asked. They move first. */
  accept() {
    const a = this.asked;
    if (!a) return false;
    this.asked = null;
    if (this.g.activity || !this.g.crew.linked().some((f) => f.id === a.from)) {
      this.g.crew.table(a.from, { t: "busy", n: a.n });
      this.g.push();
      return false;
    }
    if (this.g.overlay) this.g.close();
    this.id = a.id;
    this.net = { peer: a.from, name: a.name, seat: 1, n: a.n, moves: 0, gone: false, again: false, theirs: false };
    this.tell({ t: "accept", n: a.n });
    this.deal();
    this.g.open("table");
    return true;
  }

  decline() {
    const a = this.asked;
    if (!a) return;
    this.asked = null;
    this.passed.set(a.from, this.g.time);
    this.g.crew.table(a.from, { t: "decline", n: a.n });
    this.g.push();
  }

  /** Both of them want another: the same two, the other one moves first. */
  again() {
    const net = this.net;
    if (!net || net.gone || this.stage !== "done" || net.again) return;
    net.again = true;
    this.tell({ t: "again", n: net.n });
    if (net.theirs) this.rematch();
    else this.g.push();
  }

  private rematch() {
    const net = this.net!;
    net.seat = 1 - net.seat;
    net.n += 1;
    net.moves = 0;
    net.again = net.theirs = false;
    this.deal();
  }

  private deal() {
    this.game = make(this.id!, this.rand);
    this.stage = "play";
    this.result = null;
    this.two = false;
    this.g.sound.ui();
    this.g.push();
  }

  /** The friend across the table is no longer there. */
  private walkover(text: string) {
    const net = this.net;
    if (!net || net.gone) return;
    net.gone = true;
    net.again = net.theirs = false;
    if (this.stage === "wait") {
      this.net = null;
      this.stage = "pick";
      this.g.toast(text, 3);
    } else if (this.stage === "play") {
      this.stage = "done";
      this.result = { text, won: null, pay: 0 };
    }
    this.g.push();
  }

  /** A friend has dropped off the line. */
  gone(id: string) {
    if (this.asked?.from === id) {
      this.asked = null;
      this.g.push();
    }
    if (this.net?.peer === id) this.walkover(`${this.net.name} dropped off the line.`);
  }

  /** Something from a friend's table. Nothing in it is taken on trust. */
  onNet(from: string, msg: Record<string, unknown>) {
    const g = this.g;
    const n = typeof msg.n === "number" ? msg.n : -1;
    const net = this.net?.peer === from ? this.net : null;
    switch (msg.t) {
      case "invite": {
        const id = msg.g as TableId;
        if (!TABLES[id]?.two) return;
        // Sat at a table already, in the middle of something, or already being asked: not now.
        if (g.time - (this.passed.get(from) ?? -99) < 6) return g.crew.table(from, { t: "decline", n });
        if (g.activity || g.mode === "title" || this.net || this.asked || g.overlay === "table" || g.overlay === "arcade" || g.overlay === "video" || g.overlay === "results") return g.crew.table(from, { t: "busy", n });
        this.asked = { from, name: g.crew.nameOf(from), id, n, left: ASK_SECONDS };
        g.sound.cash();
        g.buzz([20, 40, 20]);
        g.push();
        return;
      }
      case "accept":
        if (net && this.stage === "wait" && n === net.n) this.deal();
        return;
      case "decline":
      case "busy":
        if (net && this.stage === "wait" && n === net.n) {
          this.net = null;
          this.stage = "pick";
          g.toast(msg.t === "busy" ? `${net.name} is in the middle of something.` : `${net.name} passed this time.`, 3);
          g.push();
        }
        return;
      case "move": {
        const game = this.game;
        if (!net || !game || this.stage !== "play" || n !== net.n || msg.i !== net.moves || game.turn() === net.seat) return;
        if (!game.play(msg.m)) return this.walkover("The two boards stopped agreeing, so the game is off.");
        net.moves++;
        this.after(false);
        return;
      }
      case "again":
        if (!net || net.gone || this.stage !== "done" || n !== net.n) return;
        net.theirs = true;
        if (net.again) this.rematch();
        else {
          g.sound.ui();
          g.push();
        }
        return;
      case "leave":
        if (this.asked?.from === from && this.asked.n === n) {
          this.asked = null;
          g.push();
        }
        if (net && (n === net.n || n === net.n - 1)) this.walkover(`${net.name} got up from the table.`);
        return;
    }
  }

  /** Every frame, table on screen or not: an ask nobody answers goes away by itself. */
  idle(dt: number) {
    const a = this.asked;
    if (!a) return;
    const was = Math.ceil(a.left);
    a.left -= dt;
    if (a.left <= 0) this.decline();
    else if (Math.ceil(a.left) !== was) this.g.push();
  }

  /** The ask on screen, if there is one. */
  inviteHud(): TableInvite | null {
    const a = this.asked;
    return a ? { from: a.from, name: a.name, id: a.id, game: TABLES[a.id].name, left: Math.ceil(a.left) } : null;
  }

  // ---------------------------------------------------------------- at the table

  /** Benji sits down: the screen asks how he wants to play. */
  sit(id: TableId) {
    if (this.net) {
      this.tell({ t: "leave", n: this.net.n });
      this.net = null;
    }
    this.id = id;
    this.game = null;
    this.stage = "pick";
    this.result = null;
    this.g.open("table");
  }

  start(level: number, two = false) {
    if (!this.id) return;
    if (this.net) {
      this.tell({ t: "leave", n: this.net.n });
      this.net = null;
    }
    this.level = Math.max(0, Math.min(2, Math.round(level)));
    this.two = two && TABLES[this.id].two;
    this.game = make(this.id, this.rand);
    this.stage = "play";
    this.result = null;
    this.wait = TABLES[this.id].pace;
    this.g.sound.ui();
    this.g.push();
  }

  /** Is the next move a person's? */
  private mine() {
    const game = this.game;
    if (!game || this.stage !== "play" || game.auto()) return false;
    if (this.net) return !this.net.gone && game.turn() === this.net.seat;
    return this.two ? true : game.turn() === 0;
  }

  /** A move from the screen. */
  move(m: unknown) {
    const game = this.game;
    if (!game || !this.mine()) return false;
    if (!game.play(m)) {
      this.g.sound.bad();
      return false;
    }
    if (this.net) this.tell({ t: "move", n: this.net.n, i: this.net.moves++, m });
    this.after(true);
    return true;
  }

  private after(person: boolean) {
    const game = this.game!;
    const id = this.id!;
    if (person) this.g.sound.step();
    else this.g.sound.ui();
    const o = game.outcome();
    if (o) this.finish(o);
    else this.wait = game.auto() ? 1.15 : TABLES[id].pace * (0.75 + this.rand() * 0.6);
    this.g.push();
  }

  private finish(o: Outcome) {
    const id = this.id!;
    const t = TABLES[id];
    this.stage = "done";
    const net = this.net;
    if (net) {
      // Against a friend there is no purse to farm: a little for the winner, and the count of who has won.
      const won = o.winner === net.seat;
      const drawn = o.winner < 0;
      let pay = 0;
      if (won) {
        pay = this.g.earn(Math.round(t.pay * 0.5), 1, { quiet: true }).dollars;
        this.g.save.best.crew_wins = (this.g.save.best.crew_wins ?? 0) + 1;
        this.g.sound.fanfare();
        this.g.buzz([30, 40, 80]);
      } else if (drawn) this.g.sound.ui();
      else this.g.sound.bad();
      this.g.emit("tableplayed", 1, 0);
      this.result = { text: o.text, won: drawn ? null : won, pay };
      this.g.persist();
      return;
    }
    if (this.two) {
      const who = o.winner < 0 ? "" : o.winner === 0 ? "Player one takes it. " : "Player two takes it. ";
      this.result = { text: who + o.text, won: null, pay: 0 };
      this.g.sound.fanfare();
      return;
    }
    const won = o.winner === 0;
    const drawn = o.winner < 0;
    let pay = 0;
    if (won) {
      const paid = this.g.earn(Math.round(t.pay * LEVELS[this.level]!.pay), this.level === 0 ? Math.max(1, t.respect - 1) : t.respect + (this.level === 2 ? 2 : 0), { quiet: true });
      pay = paid.dollars;
      this.g.save.best[`table_${id}`] = (this.g.save.best[`table_${id}`] ?? 0) + 1;
      this.g.emit("tablewin", 1, this.level);
      this.g.sound.fanfare();
      this.g.buzz([30, 40, 80]);
    } else if (drawn) {
      pay = this.g.earn(Math.round(t.pay * 0.25), 0, { quiet: true }).dollars;
      this.g.sound.ui();
    } else this.g.sound.bad();
    this.g.emit("tableplayed", 1, 0);
    this.result = { text: o.text, won: drawn ? null : won, pay };
    this.g.persist();
  }

  /** Called every frame while the table is on screen, in real seconds. */
  update(dt: number) {
    const game = this.game;
    if (!game || this.stage !== "play" || this.net || this.mine()) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    const m = game.think(this.level);
    if (m === null || !game.play(m)) {
      // A seat with nothing to play should never happen; do not leave the table hanging on it.
      this.wait = 1;
      return;
    }
    this.after(false);
  }

  leave() {
    if (this.net && !this.net.gone) this.tell({ t: "leave", n: this.net.n });
    this.net = null;
    this.id = null;
    this.game = null;
    this.stage = "pick";
    this.result = null;
  }

  hud(): TableHud | null {
    const id = this.id;
    if (!id) return null;
    const t = TABLES[id];
    const game = this.game;
    return {
      id,
      name: t.name,
      rivals: t.rivals,
      line: t.line,
      how: t.how,
      stage: this.stage,
      level: this.level,
      levels: LEVELS.map((l) => ({ name: l.name, pay: Math.round(t.pay * l.pay) })),
      two: this.two,
      canTwo: t.two,
      mine: this.mine(),
      turn: game ? game.turn() : 0,
      view: game ? game.view() : null,
      result: this.result,
      wins: this.g.save.best[`table_${id}`] ?? 0,
      friends: t.two ? this.g.crew.linked() : [],
      crewed: this.g.crew.code !== null,
      online: this.net ? { name: this.net.name, seat: this.net.seat, gone: this.net.gone, again: this.net.again, theirs: this.net.theirs } : null,
    };
  }
}
