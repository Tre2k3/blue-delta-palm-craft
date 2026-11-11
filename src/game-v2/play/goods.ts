import type { OutfitId } from "../assets/cast";

/** Cabinets on the Fun House floor. `link` cabinets open the real game on itch.io. */
/** `machine` cabinets are not screens: they are built on the floor and played in the room. */
export type Cabinet = { id: string; name: string; tag: string; color: string; accent: string; link?: string; machine?: boolean; blurb: string; how: string };

export const CABINETS: Cabinet[] = [
  { id: "whack", name: "Whack-A-Mole", tag: "WHACK", color: "#ff5ad1", accent: "#ffd23a", machine: true, blurb: "Grab the hammer. Thirty seconds of moles.", how: "Move the hammer with W A S D and swing with Space, or tap a mole." },
  { id: "hoopfever", name: "Hoop Fever", tag: "HOOPS", color: "#ff8a1e", accent: "#39ff14", machine: true, blurb: "The rim slides. Your arm doesn't get tired.", how: "Hold Space, let go in the green." },
  { id: "catch", name: "Drop Catcher", tag: "DROP", color: "#ff3b3b", accent: "#ffd23a", blurb: "The new drop is falling off the truck. Bag what the order says, dodge the bricks.", how: "A and D or drag to slide the bag." },
  { id: "stacker", name: "Sack Stacker", tag: "STACK", color: "#39ff14", accent: "#e0b33a", blurb: "Stack the moneybags to the top of the vault.", how: "Space or tap to drop the row." },
  { id: "dash", name: "Beale Street Dash", tag: "DASH", color: "#35e0d0", accent: "#ff5ad1", blurb: "Three lanes, no brakes, all the way down Beale.", how: "A and D or tap a side to change lanes." },
  {
    id: "martin",
    name: "Martin: No Filter Fighters",
    tag: "MARTIN",
    color: "#b48cff",
    accent: "#ffd23a",
    link: "https://trey2k23.itch.io/martin-no-filter-fighters-unofficial-fan-game",
    blurb: "The fan-made fighter. Full game, free on itch.io.",
    how: "Opens the real game in a new tab.",
  },
  {
    id: "durag",
    name: "DuRag Man: Time Rift",
    tag: "DURAG MAN",
    color: "#5ac8ff",
    accent: "#ff8a1e",
    link: "https://trey2k23.itch.io/durag-man-time-rift",
    blurb: "DuRag Man fights through time. Full game, free on itch.io.",
    how: "Opens the real game in a new tab.",
  },
];

export type Food = { id: string; at: "trucks" | "pizza"; name: string; cost: number; seconds: number; line: string; emoji: string };

export const FOOD: Food[] = [
  { id: "wings", at: "trucks", name: "Hot Wings", cost: 12, seconds: 240, line: "Lemon pepper, all flats.", emoji: "🍗" },
  { id: "soul", at: "trucks", name: "Soul Bowl", cost: 14, seconds: 300, line: "Greens, yams, mac. Mama Dee approves.", emoji: "🍲" },
  { id: "tamales", at: "trucks", name: "Delta Tamales", cost: 9, seconds: 180, line: "Three to a plate, still steaming.", emoji: "🫔" },
  { id: "tea", at: "trucks", name: "Sweet Tea", cost: 4, seconds: 90, line: "Sweet enough to stand a spoon in.", emoji: "🥤" },
  { id: "slice", at: "pizza", name: "Pepperoni Slice", cost: 6, seconds: 150, line: "Folded, like you're supposed to.", emoji: "🍕" },
  { id: "pie", at: "pizza", name: "Whole Pie", cost: 18, seconds: 360, line: "The whole table eats.", emoji: "🍕" },
  { id: "nachos", at: "pizza", name: "Loaded Nachos", cost: 8, seconds: 180, line: "Extra cheese, no napkins.", emoji: "🧀" },
  { id: "slush", at: "pizza", name: "Blue Slush", cost: 4, seconds: 90, line: "Brain freeze included.", emoji: "🧊" },
];

export type Prize = { id: string; name: string; tickets: number; blurb: string; outfit?: OutfitId; bait?: number; dollars?: number; emoji: string };

export const PRIZES: Prize[] = [
  { id: "bait", name: "Tackle Pack", tickets: 20, blurb: "Five bait for the pier.", bait: 5, emoji: "🪱" },
  { id: "cash50", name: "Cash Voucher", tickets: 60, blurb: "$50 SackDollars.", dollars: 50, emoji: "💵" },
  { id: "doll", name: "Fun House Overalls", tickets: 150, blurb: "Wear it: +25% tickets from every game.", outfit: "doll", emoji: "🎪" },
  { id: "cash200", name: "Big Voucher", tickets: 200, blurb: "$200 SackDollars.", dollars: 200, emoji: "💰" },
  { id: "claw", name: "Striped Sweater", tickets: 220, blurb: "Wear it: your bowling ball hooks harder.", outfit: "claw", emoji: "🧶" },
  { id: "nightmare", name: "Sackrow After Dark Tee", tickets: 300, blurb: "Wear it: longer bite window on the river.", outfit: "nightmare", emoji: "🌙" },
];
