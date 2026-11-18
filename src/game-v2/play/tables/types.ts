/** How a table game ended. `winner` is a seat (or a team, for spades), or -1 for a draw. */
export type Outcome = { winner: number; text: string };

/**
 * A game played at a table. The rules live here and nowhere else: the screen shows `view()`
 * and sends moves to `play()`, and a computer seat sends whatever `think()` gives it.
 */
export interface TableGame<M = unknown, V = unknown> {
  /** The seat whose move it is. */
  turn(): number;
  /** True when the next step is the table's own (gathering a trick, dealing) and not anyone's choice. */
  auto(): boolean;
  outcome(): Outcome | null;
  view(): V;
  /** Makes a move for whoever's turn it is. False if it is not allowed. */
  play(move: M): boolean;
  /** The move a computer player makes now. `level` 0 is easy, 2 is sharp. */
  think(level: number): M | null;
}

/** A small repeatable dice, so a test can replay a game. */
export function dice(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shuffle<T>(list: T[], rand: () => number) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}
