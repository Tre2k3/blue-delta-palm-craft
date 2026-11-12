/**
 * The story, start to finish, in three chapters. Each step names the thing in the world that
 * ends it; the game calls `emit(event)` when that thing happens. Nothing here is on a timer.
 */
export type StoryEvent =
  | "entered_hq"
  | "met_k"
  | "delivered"
  | "hoops_10"
  | "fish_1"
  | "ate"
  | "bowled"
  | "raced"
  | "fun_tickets"
  | "bought"
  | "wore";

/**
 * What ends a step after the Drop Day: something that happens (`kind`), how big it has to be
 * (`n` at least, or at most `max`; `extra` at least), and how many times.
 */
export type Goal = { kind: string; n?: number; max?: number; extra?: number; times?: number };

export type Step = {
  id: string;
  title: string;
  detail: string;
  /** Point of interest the marker and the map point at. */
  poi: string;
  /** One of the Drop Day's own events. */
  done?: StoryEvent;
  goal?: Goal;
  pay: number;
  respect: number;
  /** Who sends Benji on it, and what they say when it comes up. */
  who?: string;
  line?: string;
};

export type Chapter = { name: string; steps: Step[] };

export const CHAPTERS: Chapter[] = [
  {
    name: "THE DROP DAY",
    steps: [
      { id: "hq", title: "Step into the boutique", detail: "It's Drop Day. SackReligious HQ is right behind you.", poi: "hq", done: "entered_hq", pay: 0, respect: 2 },
      { id: "meet", title: "Secure the new drop", detail: "Talk to K Blanco at the counter.", poi: "hq", done: "met_k", pay: 0, respect: 3 },
      { id: "deliver", title: "Run the drop", detail: "Take the package to Court OG at the 901 Court.", poi: "court", done: "delivered", pay: 80, respect: 10 },
      { id: "hoops", title: "Earn the court", detail: "Score 10 in a shootout. OG is watching.", poi: "court", done: "hoops_10", pay: 60, respect: 8 },
      { id: "fish", title: "Unc J's line", detail: "Catch one off the pier. Bait is at the shack.", poi: "pier", done: "fish_1", pay: 40, respect: 5 },
      { id: "eat", title: "Mama Dee said eat", detail: "Order a plate at the food trucks.", poi: "trucks", done: "ate", pay: 20, respect: 3 },
      { id: "bowl", title: "Strike's lanes", detail: "Bowl a game at 901 Bowl.", poi: "bowl", done: "bowled", pay: 60, respect: 6 },
      { id: "race", title: "The strip", detail: "Meet Nitro on Riverside Drive and beat him over three laps.", poi: "race", done: "raced", pay: 150, respect: 12 },
      { id: "fun", title: "The Fun House", detail: "Win 40 tickets at the Fun House on Lamar.", poi: "fun", done: "fun_tickets", pay: 50, respect: 5 },
      { id: "buy", title: "Wear the brand", detail: "Buy a piece at HQ.", poi: "hq", done: "bought", pay: 0, respect: 6 },
      { id: "fit", title: "Step out in it", detail: "Put the new piece on in the fitting room.", poi: "hq", done: "wore", pay: 100, respect: 15 },
    ],
  },
  {
    // The city has seen him once. Now it starts asking for him by name.
    name: "THE COME-UP",
    steps: [
      { id: "tez", title: "Who's the kid?", detail: "Win a game to 11 at the 901 Court.", poi: "court", goal: { kind: "versus", n: 1 }, pay: 100, respect: 10, who: "Court OG", line: "Shootouts are cute. Lil Tez keeps asking who the kid in the green tee is. Go answer him." },
      { id: "catering", title: "Mama Dee's order", detail: "Catch three fish in one trip off the pier.", poi: "pier", goal: { kind: "fish", extra: 3 }, pay: 90, respect: 8, who: "Mama Dee", line: "Baby, I got forty plates to fry and not one fish. Three off Unc J's pier, and don't bring me no minnows." },
      { id: "change", title: "Change for the pop-up", detail: "Pick up 30 coins around town.", poi: "hq", goal: { kind: "coin", times: 30 }, pay: 60, respect: 6, who: "K Blanco", line: "Pop-up on Beale tonight and the register is empty. Bring me thirty coins off these streets." },
      { id: "league", title: "League night", detail: "Bowl 100 or better at 901 Bowl.", poi: "bowl", goal: { kind: "bowl", n: 100 }, pay: 110, respect: 9, who: "Strike", line: "League night. Bowl a hundred and the shoes are on the house. Under that, you're mopping lane four." },
      { id: "karts", title: "A different animal", detail: "Win a kart race at the Fun House.", poi: "fun", goal: { kind: "kart", max: 1 }, pay: 100, respect: 9, who: "Nitro", line: "You beat me in a car. Cute. Karts are a different animal. Win one at the Fun House, then talk to me." },
      { id: "green", title: "Green team", detail: "Win a round of laser tag at the Fun House.", poi: "fun", goal: { kind: "laser", n: 1 }, pay: 100, respect: 9, who: "Nitro", line: "Pink has been running that laser arena all month. Put the green vest on and fix it." },
      { id: "billboard", title: "Billboard", detail: "Take a picture in photo mode. It's in the pause menu.", poi: "hq", goal: { kind: "photo" }, pay: 50, respect: 8, who: "K Blanco", line: "I need a picture for the page. You, the fit, the city behind you. Make it look like a billboard." },
      { id: "dmac", title: "He don't miss", detail: "Beat D-Mac in a game to 11.", poi: "court", goal: { kind: "versus", n: 1, extra: 1 }, pay: 140, respect: 12, who: "Court OG", line: "D-Mac says he don't miss from the corner. I say everybody misses. Go find out." },
    ],
  },
  {
    name: "RUN THE CITY",
    steps: [
      { id: "rico", title: "Corner pocket", detail: "Beat Rico in a game to 11.", poi: "court", goal: { kind: "versus", n: 1, extra: 2 }, pay: 170, respect: 14, who: "Court OG", line: "Rico calls his shots before he takes them. Make him call a miss." },
      { id: "flathead", title: "The one under the bridge", detail: "Land a fish over 10 lb. Cast long.", poi: "pier", goal: { kind: "fish", n: 10 }, pay: 140, respect: 12, who: "Unc J", line: "There's a flathead under that bridge been breaking my line for twenty years. Cast long, nephew." },
      { id: "double", title: "Back to back", detail: "Roll two strikes in one game.", poi: "bowl", goal: { kind: "bowl", extra: 2 }, pay: 140, respect: 11, who: "Strike", line: "One strike is luck. Two is a bowler. Show me two." },
      { id: "counter", title: "Clean out the counter", detail: "Win 100 tickets in one Fun House visit.", poi: "fun", goal: { kind: "tickets", n: 100 }, pay: 130, respect: 10, who: "Mama Dee", line: "My grandbaby wants that big prize at the Fun House. A hundred tickets, and you eat free at my truck for life." },
      { id: "rematch", title: "Double or nothing", detail: "Beat Nitro on the strip again.", poi: "race", goal: { kind: "race", max: 1 }, pay: 220, respect: 15, who: "Nitro", line: "Double or nothing. Same strip, three laps. Bring the car with your little logo on it." },
      { id: "ace", title: "They call him Ace", detail: "Beat Ace in a game to 11. Nobody has.", poi: "court", goal: { kind: "versus", n: 1, extra: 3 }, pay: 250, respect: 20, who: "Court OG", line: "Ace has not lost on this court since before you were born. You ready, or you just dressed like it?" },
      { id: "crown", title: "The crown", detail: "Put on the Sackrow #11 and see K Blanco at HQ.", poi: "hq", goal: { kind: "crown" }, pay: 300, respect: 30, who: "K Blanco", line: "Come see me, and wear the Sackrow eleven. You earned that one." },
    ],
  },
];

export const STORY: Step[] = CHAPTERS.flatMap((c) => c.steps);

/** The chapter a step is in: its name, the step's place in it, how many steps it has, and whether it opens the chapter. */
export function chapterOf(step: number) {
  let first = 0;
  for (const c of CHAPTERS) {
    if (step < first + c.steps.length) return { name: c.name, index: step - first + 1, total: c.steps.length, opens: step === first };
    first += c.steps.length;
  }
  return null;
}

/** What Memphis calls him, by Respect. Every rung up pays a little more on every job. */
export const RANKS = [
  { at: 0, name: "New in town" },
  { at: 20, name: "Known on the riverfront" },
  { at: 50, name: "Beale Street regular" },
  { at: 90, name: "Court certified" },
  { at: 140, name: "Downtown name" },
  { at: 200, name: "901 famous" },
  { at: 280, name: "Sack royalty" },
] as const;
/** Extra SackDollars per rung. */
export const RANK_PAY = 0.04;

export function rankOf(respect: number) {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (respect >= RANKS[i]!.at) index = i;
  return { index, name: RANKS[index]!.name, next: RANKS[index + 1]?.at ?? null };
}

/**
 * A reward at the real store for finishing the story. Left empty, nothing is shown: fill in a
 * code that works at the checkout and it comes up on the last card.
 */
export const STORE_REWARD = { code: "", note: "" };

export type Bounty = { id: string; title: string; detail: string; poi: string; pay: number; respect: number };

/** After the story: one job on the board at a time, forever. */
export const BOUNTIES: Bounty[] = [
  { id: "hoops_20", title: "Heat check", detail: "Score 20 in one shootout.", poi: "court", pay: 120, respect: 8 },
  { id: "fish_big", title: "Big water", detail: "Land a fish over 8 lb.", poi: "pier", pay: 110, respect: 7 },
  { id: "bowl_120", title: "Pocket change", detail: "Bowl 120 or better.", poi: "bowl", pay: 130, respect: 8 },
  { id: "race_win", title: "Run it back", detail: "Win another race on the strip.", poi: "race", pay: 150, respect: 9 },
  { id: "tickets_80", title: "Ticket run", detail: "Win 80 tickets in one Fun House visit.", poi: "fun", pay: 100, respect: 6 },
  { id: "hoops_fire", title: "On fire", detail: "Hit five in a row at the 901.", poi: "court", pay: 90, respect: 7 },
  { id: "strike_3", title: "Turkey", detail: "Three strikes in one game.", poi: "bowl", pay: 140, respect: 9 },
  { id: "fish_5", title: "Fill the cooler", detail: "Catch five fish in one trip.", poi: "pier", pay: 100, respect: 6 },
];
