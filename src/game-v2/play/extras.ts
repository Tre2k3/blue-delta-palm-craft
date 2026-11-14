import { COURT, FUN, HQ, PIER, TRUCKS } from "../world/map";
import type { Goal } from "./story";

/**
 * Today's drop: one job a day, the same for everybody on the same date. Doing it pays, and
 * doing it on days in a row pays more.
 */
export type Daily = { id: string; title: string; detail: string; goal: Goal };

export const DAILIES: Daily[] = [
  { id: "hoops15", title: "Shooter's touch", detail: "Score 15 in one shootout at the 901 Court.", goal: { kind: "hoops", n: 15 } },
  { id: "fish3", title: "Fill the cooler", detail: "Catch three fish in one trip off the pier.", goal: { kind: "fish", extra: 3 } },
  { id: "bowl110", title: "Lane four", detail: "Bowl 110 or better at 901 Bowl.", goal: { kind: "bowl", n: 110 } },
  { id: "race", title: "Chequered flag", detail: "Win the street race.", goal: { kind: "race", max: 1 } },
  { id: "tickets60", title: "Ticket run", detail: "Win 60 tickets in one Fun House visit.", goal: { kind: "tickets", n: 60 } },
  { id: "versus", title: "Run one", detail: "Win a game to 11 at the 901 Court.", goal: { kind: "versus", n: 1 } },
  { id: "laser", title: "Green team", detail: "Win a round of laser tag.", goal: { kind: "laser", n: 1 } },
  { id: "kart", title: "Top step", detail: "Win a go-kart race at the Fun House.", goal: { kind: "kart", max: 1 } },
  { id: "photo", title: "Postcard home", detail: "Take a picture in photo mode.", goal: { kind: "photo" } },
  { id: "table", title: "Table talk", detail: "Win a game at a table in Orange Mound Park.", goal: { kind: "tablewin", n: 1 } },
  { id: "putt", title: "Short game", detail: "Finish nine holes at Sack Putt in 23 strokes or fewer.", goal: { kind: "putt", max: 23 } },
  { id: "tennis", title: "Break point", detail: "Beat Coach Renee at the Park Avenue Courts.", goal: { kind: "tennis", n: 1 } },
  { id: "cornhole", title: "Bags", detail: "Beat Mr. Willie at cornhole, first to 21.", goal: { kind: "cornhole", n: 1 } },
  { id: "jook", title: "Buck jump", detail: "Take the jookin cypher inside the Beale Street arch.", goal: { kind: "jook", n: 1 } },
];

/** The date where the player is, as 2026-11-12. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The day before `key`, in the same form. */
export function dayBefore(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y!, m! - 1, d! - 1));
}

export function dailyFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DAILIES[h % DAILIES.length]!;
}

/** What the daily pays on the `streak`-th day running. */
export const dailyPay = (streak: number) => 120 + Math.min(6, Math.max(0, streak - 1)) * 30;

export function meets(goal: Goal, kind: string, n: number, extra: number) {
  return kind === goal.kind && n >= (goal.n ?? -Infinity) && n <= (goal.max ?? Infinity) && extra >= (goal.extra ?? -Infinity);
}

/** The painted card for a postcard. */
export const postcardImg = (id: string) => `/game-v2/postcards/${id}.webp`;

/** Postcards: a picture taken in photo mode within `r` of the spot collects it. */
export const POSTCARDS: { id: string; name: string; hint: string; x: number; z: number; r: number }[] = [
  { id: "bridge", name: "The M Bridge", hint: "from the pier", x: PIER.x, z: -206, r: 26 },
  { id: "pyramid", name: "The Pyramid", hint: "from the food trucks", x: TRUCKS.x, z: TRUCKS.z - 6, r: 26 },
  { id: "hq", name: "SackReligious HQ", hint: "out front of the boutique", x: HQ.doorX, z: HQ.frontZ + 6, r: 15 },
  { id: "court", name: "901 Court", hint: "on the court", x: COURT.cx, z: COURT.cz, r: 18 },
  { id: "beale", name: "Beale Street", hint: "anywhere on Beale", x: 0, z: -76, r: 34 },
  { id: "fun", name: "The Fun House", hint: "out front of it", x: FUN.doorX, z: FUN.frontZ - 7, r: 16 },
];
