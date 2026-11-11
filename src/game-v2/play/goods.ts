import type { OutfitId } from "../assets/cast";

/** Cabinets on the Fun House floor. `link` cabinets run the real game from itch.io in a browser on their screen. */
/** `machine` cabinets are not screens: they are built on the floor and played in the room. */
export type Cabinet = { id: string; name: string; tag: string; color: string; accent: string; link?: string; machine?: boolean; blurb: string; how: string };

export const CABINETS: Cabinet[] = [
  { id: "whack", name: "Whack-A-Mole", tag: "WHACK", color: "#ff5ad1", accent: "#ffd23a", machine: true, blurb: "Grab the hammer. Thirty seconds of moles.", how: "Move the hammer with W A S D and swing with Space, or tap a mole." },
  { id: "hoopfever", name: "Hoop Fever", tag: "HOOPS", color: "#ff8a1e", accent: "#39ff14", machine: true, blurb: "The rim slides. Your arm doesn't get tired.", how: "Hold Space, let go in the green." },
  { id: "catch", name: "Drop Catcher", tag: "DROP", color: "#ff3b3b", accent: "#ffd23a", blurb: "The new drop is falling off the truck. Bag what the order says, dodge the bricks.", how: "A and D or drag to slide the bag." },
  { id: "stacker", name: "Sack Stacker", tag: "STACK", color: "#39ff14", accent: "#e0b33a", blurb: "Stack the moneybags to the top of the vault.", how: "Space or tap to drop the row." },
  { id: "dash", name: "Beale Street Dash", tag: "DASH", color: "#35e0d0", accent: "#ff5ad1", blurb: "Three lanes, no brakes, all the way down Beale.", how: "A and D or tap a side to change lanes." },
  { id: "pinball", name: "Sack Pinball", tag: "PINBALL", color: "#e0b33a", accent: "#39ff14", blurb: "Three balls, two flippers, three bumpers. Drop all the targets for the big one.", how: "A and D are the flippers. Hold Space to pull the plunger, let go to launch." },
  { id: "skee", name: "Skee-Ball", tag: "SKEE-BALL", color: "#ff8a1e", accent: "#ffd23a", blurb: "Nine balls up the lane. The hundreds are in the corners.", how: "A and D to aim. Hold Space for power and let go to roll." },
  { id: "wheel", name: "Spin-N-Win", tag: "SPIN-N-WIN", color: "#ff3b3b", accent: "#ffd23a", blurb: "Three pulls on the big wheel. It stops where it stops: learn the pull.", how: "Hold Space to pull, let go to spin. The number under the flapper is your tickets." },
  {
    id: "martin",
    name: "Martin: No Filter Fighters",
    tag: "MARTIN",
    color: "#b48cff",
    accent: "#ffd23a",
    link: "https://trey2k23.itch.io/martin-no-filter-fighters-unofficial-fan-game",
    blurb: "The fan-made fighter. The full game, right here in the cabinet.",
    how: "Plays right here, in the cabinet's browser.",
  },
  {
    id: "durag",
    name: "DuRag Man: Time Rift",
    tag: "DURAG MAN",
    color: "#5ac8ff",
    accent: "#ff8a1e",
    link: "https://trey2k23.itch.io/durag-man-time-rift",
    blurb: "DuRag Man fights through time. The full game, right here in the cabinet.",
    how: "Plays right here, in the cabinet's browser.",
  },
];

export type TruckId = "catch" | "velis" | "brothers";

/**
 * The trucks on the riverfront lot. Two are real Memphis businesses that sponsor the game and
 * one is the house truck: names, art, menus and handles are theirs and are shown as given.
 */
export type Truck = { id: TruckId; name: string; tag: string; blurb: string; color: string; body: number; trim: number; logo: string; social: string; video?: { src: string; artist: string; title: string } };

export const FOOD_TRUCKS: Truck[] = [
  {
    id: "catch",
    name: "901 Catch Kitchen",
    tag: "CATCH KITCHEN",
    blurb: "They grill what you pulled out of the Mississippi. Walk up, open the window, hand over the cooler.",
    color: "#1db954",
    body: 0x0f2a1c,
    trim: 0xd4af37,
    logo: "/game/food/901-catch.png",
    social: "House truck · grill the Mississippi catch",
  },
  {
    id: "velis",
    name: "Veli's Wings",
    tag: "VELI'S WINGS",
    blurb: "Gold-rim plate. Lemon pepper or extra hot. Don't play about the sauce.",
    color: "#d4af37",
    body: 0x14110b,
    trim: 0xd4af37,
    logo: "/game/food/velis-wings.webp",
    social: "@yungveli",
    video: { src: "/game/food/yung-veli.mp4", artist: "Yung Veli", title: "Go Girl" },
  },
  {
    id: "brothers",
    name: "Brothers Wingz N Things",
    tag: "WINGZ N THINGS",
    blurb: "Two kings, one window. Wingz, burger, fries. Crown included.",
    color: "#e11d48",
    body: 0xf2efe9,
    trim: 0xe11d48,
    logo: "/game/food/brothers-wingz.webp",
    social: "@brotherswingznthings",
  },
];

export type Food = { id: string; at: TruckId | "pizza"; name: string; cost: number; seconds: number; line: string; emoji: string; respect?: number; /** Cooks a fish out of the cooler. */ fish?: boolean };

export const FOOD: Food[] = [
  { id: "catch_plate", at: "catch", name: "901 Plate", cost: 12, seconds: 240, line: "Greens, mac, hot sauce. Ready now.", emoji: "🍽️", respect: 1 },
  { id: "catch_grill", at: "catch", name: "Grill the Catch", cost: 8, seconds: 420, line: "Cook fee. They plate whatever is in your cooler.", emoji: "🐟", respect: 3, fish: true },
  { id: "velis_lemon", at: "velis", name: "Lemon Pepper 8", cost: 14, seconds: 270, line: "Dry rub, extra lemon. Memphis classic.", emoji: "🍋", respect: 2 },
  { id: "velis_hot", at: "velis", name: "Veli Hot 10", cost: 16, seconds: 300, line: "Sauce all the way down the fingers.", emoji: "🌶️", respect: 2 },
  { id: "velis_combo", at: "velis", name: "Gold Plate Combo", cost: 18, seconds: 360, line: "Wings + fries. Feeds the block.", emoji: "🍗", respect: 3 },
  { id: "bro_wingz", at: "brothers", name: "Crown Wingz", cost: 13, seconds: 270, line: "8 piece, ranch on the side.", emoji: "👑", respect: 2 },
  { id: "bro_burger", at: "brothers", name: "King Burger", cost: 11, seconds: 240, line: "Smash patty, pickles, that sauce.", emoji: "🍔", respect: 1 },
  { id: "bro_combo", at: "brothers", name: "Wingz N Things Combo", cost: 20, seconds: 390, line: "Wings, fries, burger. Don't share.", emoji: "🍟", respect: 3 },
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
