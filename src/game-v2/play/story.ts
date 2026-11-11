/**
 * The Drop Day, start to finish. Each step names the thing in the world that ends it;
 * the game calls `advance(event)` when that thing happens. Nothing here is on a timer.
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

export type Step = {
  id: string;
  title: string;
  detail: string;
  /** Point of interest the marker and the map point at. */
  poi: string;
  done: StoryEvent;
  pay: number;
  respect: number;
};

export const CHAPTER = "THE DROP DAY";

export const STORY: Step[] = [
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
];

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
