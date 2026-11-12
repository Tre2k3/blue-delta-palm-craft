import type { TableHud, TableId } from "../../core/types";
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

/**
 * Whoever is sat at a park table: which game, who has which seat, when the regular moves,
 * and what a win pays. The rules themselves are the game's own.
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

  constructor(private g: Game) {}

  /** Benji sits down: the screen asks how he wants to play. */
  sit(id: TableId) {
    this.id = id;
    this.game = null;
    this.stage = "pick";
    this.result = null;
    this.g.open("table");
  }

  start(level: number, two = false) {
    if (!this.id) return;
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
    if (!game || this.stage !== "play" || this.mine()) return;
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
    };
  }
}
