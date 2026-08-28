export type CourtDifficulty = "rookie" | "901" | "sackrow";
export type CourtChallenge = "pickup" | "timed" | "threes" | "horse";

export type BoardRow = {
  score: number;
  mode: CourtChallenge;
  difficulty: CourtDifficulty;
  combo: number;
  at: number;
};

export const DIFFICULTY: Record<CourtDifficulty, {
  label: string;
  time: number;
  window: number;
  heat: number;
  scramble: number;
  target: number;
}> = {
  rookie: { label: "Rookie", time: 62, window: 1.2, heat: 0.62, scramble: 0.7, target: 8 },
  "901": { label: "901", time: 50, window: 1, heat: 1, scramble: 1, target: 12 },
  sackrow: { label: "Sackrow", time: 40, window: 0.76, heat: 1.38, scramble: 1.28, target: 16 },
};

export const HORSE_CALLS = ["PAINT", "MID", "CORNER", "THREE", "LOGO"] as const;
const BOARD_KEY = "sack-court-board-v1";
const LETTERS = "HORSE";

export function cycleDifficulty(current: CourtDifficulty): CourtDifficulty {
  return current === "rookie" ? "901" : current === "901" ? "sackrow" : "rookie";
}

export function horseDisplay(misses: number) {
  return LETTERS.split("").map((ch, i) => (i < misses ? ch : "·")).join(" ");
}

export function loadBoard(): BoardRow[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BoardRow[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushBoard(row: BoardRow) {
  const next = [row, ...loadBoard()].sort((a, b) => b.score - a.score).slice(0, 8);
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

const OG_MAKE = [
  "That's the window.",
  "Keep that form.",
  "Yes sir. Again.",
  "Don't fade now.",
];
const OG_PERFECT = [
  "GREEN. That's how you eat.",
  "Net don't lie.",
  "That's a grown-man shot.",
];
const OG_STREAK = [
  "Don't get cute. Stay in rhythm.",
  "They feelin' you now.",
  "Sackrow heat. Keep cookin'.",
];
const OG_MISS = [
  "Rebound. Don't watch it.",
  "Go get that.",
  "Off. Chase it.",
];
const OG_RIM = [
  "Iron. Off the glass, go.",
  "Too strong. Get the board.",
];
const OG_AIR = [
  "That ain't it, nephew.",
  "Short. Legs under it.",
];
const OG_THREE = ["From downtown. Crowd felt that.", "That's a 901 three."];
const OG_LOGO = ["FROM THE LOGO. Sit down."];
const OG_HORSE_MAKE = ["That's the call. Next spot."];
const OG_HORSE_MISS = ["Letter. Don't fold."];

function pick(list: string[], n: number) {
  return list[Math.abs(n) % list.length]!;
}

export function ogLine(kind: "make" | "perfect" | "streak" | "miss" | "rim" | "air" | "three" | "logo" | "horseMake" | "horseMiss", seed: number) {
  if (kind === "perfect") return pick(OG_PERFECT, seed);
  if (kind === "streak") return pick(OG_STREAK, seed);
  if (kind === "three") return pick(OG_THREE, seed);
  if (kind === "logo") return pick(OG_LOGO, seed);
  if (kind === "rim") return pick(OG_RIM, seed);
  if (kind === "air") return pick(OG_AIR, seed);
  if (kind === "horseMake") return pick(OG_HORSE_MAKE, seed);
  if (kind === "horseMiss") return pick(OG_HORSE_MISS, seed);
  if (kind === "miss") return pick(OG_MISS, seed);
  return pick(OG_MAKE, seed);
}

export function celebrate(label: string, perfect: boolean, combo: number) {
  if (label === "LOGO") return "FROM THE LOGO";
  if (label === "THREE" || label === "CORNER") return perfect ? "FROM DOWNTOWN" : "THREE";
  if (label === "LAYUP" && perfect) return "AND ONE";
  if (combo >= 5) return "CAN'T BE STOPPED";
  if (combo >= 3) return "ON FIRE";
  return perfect ? "PERFECT" : null;
}
