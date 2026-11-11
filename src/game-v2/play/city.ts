export type Fit = "default" | "court" | "river" | "night";

export type Spot = "wardrobe" | "bowl" | "pier" | "bait" | "meet" | "truck" | "mama" | "unc" | "nitro" | "strike";

export type City = {
  bait: number;
  fit: Fit;
  fed: boolean;
  fished: boolean;
  bowled: boolean;
  raced: boolean;
  bestBowl: number;
  bestRace: number;
  boost: number;
  fish: { phase: "wait" | "bite"; left: number; baited: boolean } | null;
  bowl: { phase: "aim" | "roll" | "show"; power: number; aim: number; left: number; pins: number } | null;
  race: { left: number; limit: number } | null;
  menu: number;
};

export type PlayEvent = {
  dialogue?: string;
  dollars?: number;
  respect?: number;
  mission?: string;
  pins?: number;
  teleport?: { x: number; z: number };
};

const FITS: Fit[] = ["default", "court", "river", "night"];
const FIT_LINE: Record<Fit, string> = {
  default: "Wardrobe — Default fit. No perk, just the block.",
  court: "Wardrobe — Court fit. Your shot pulls toward the pocket.",
  river: "Wardrobe — River fit. The bite stays longer.",
  night: "Wardrobe — Night fit. The strip gives you more time and more speed.",
};
const MENU = [
  { name: "Crown wings", cost: 8, respect: 2 },
  { name: "901 plate", cost: 12, respect: 3 },
  { name: "Soul bowl", cost: 10, respect: 2 },
];

export function freshCity(): City {
  return {
    bait: 0,
    fit: "default",
    fed: false,
    fished: false,
    bowled: false,
    raced: false,
    bestBowl: 0,
    bestRace: 0,
    boost: 0,
    fish: null,
    bowl: null,
    race: null,
    menu: 0,
  };
}

export function activityPrompt(city: City): string {
  if (city.fish?.phase === "wait") return "Line is out. Wait on the bite.";
  if (city.fish?.phase === "bite") return "BITE — E";
  if (city.bowl?.phase === "aim") return "Hold Space. A/D aim the pocket. Release to roll.";
  if (city.bowl?.phase === "roll") return "";
  if (city.bowl?.phase === "show") return "";
  if (city.race) return `Sprint east to the finish. ${city.race.left.toFixed(1)}s`;
  return "";
}

export function activityCharge(city: City): number {
  if (city.bowl?.phase === "aim") return city.bowl.power;
  if (city.fish?.phase === "bite") return Math.min(1, city.fish.left / 0.9);
  return 0;
}

export function cityMission(city: City, delivered: boolean): string | null {
  if (!delivered) return null;
  const left: string[] = [];
  if (!city.fished) left.push("fish the river");
  if (!city.bowled) left.push("roll at 901 Bowl");
  if (!city.fed) left.push("eat at the trucks");
  if (!city.raced) left.push("beat Nitro on the strip");
  if (!left.length) return "Memphis is yours. The block stays open.";
  return `Block's open. Next: ${left[0]}.`;
}

export function tickCity(city: City, dt: number, hold: boolean, steer: number): PlayEvent | null {
  if (city.boost > 0) city.boost = Math.max(0, city.boost - dt);
  if (city.fish) {
    city.fish.left -= dt;
    if (city.fish.phase === "wait" && city.fish.left <= 0) {
      const window = (city.fish.baited ? 0.95 : 0.58) + (city.fit === "river" ? 0.35 : 0);
      city.fish.phase = "bite";
      city.fish.left = window;
      return { dialogue: "River — Fish on. Hit E." };
    }
    if (city.fish.phase === "bite" && city.fish.left <= 0) {
      city.fish = null;
      return { dialogue: "River — Missed it. Drop another line." };
    }
  }
  if (city.bowl?.phase === "aim") {
    city.bowl.aim = Math.max(-1, Math.min(1, city.bowl.aim + steer * dt * 1.6));
    if (hold) city.bowl.power = Math.min(1, city.bowl.power + dt / 0.85);
    else if (city.bowl.power > 0.04) {
      city.bowl.pins = scorePins(city.bowl.power, city.bowl.aim);
      city.bowl.phase = "roll";
      city.bowl.left = 1.65;
    }
  } else if (city.bowl?.phase === "roll") {
    city.bowl.left -= dt;
    if (city.bowl.left <= 0) {
      const pins = city.bowl.pins;
      city.bowl.phase = "show";
      city.bowl.left = 1.15;
      city.bowled = true;
      city.bestBowl = Math.max(city.bestBowl, pins);
      const pay = pins * 6;
      const respect = pins >= 8 ? 8 : pins >= 5 ? 4 : 1;
      return {
        pins,
        dollars: pay,
        respect,
        dialogue: pins >= 8 ? `${pins} in the pocket. $${pay}.` : `${pins} pins. $${pay}.`,
        mission: cityMission(city, true) ?? undefined,
      };
    }
  } else if (city.bowl?.phase === "show") {
    city.bowl.left -= dt;
    if (city.bowl.left <= 0) city.bowl = null;
  }
  if (city.race) {
    city.race.left -= dt;
    if (city.race.left <= 0) {
      city.race = null;
      return { dialogue: "Nitro — Time. I still got the strip. Run it back." };
    }
  }
  return null;
}

export function crossFinish(city: City): PlayEvent | null {
  if (!city.race) return null;
  const time = city.race.limit - city.race.left;
  city.race = null;
  city.raced = true;
  city.bestRace = city.bestRace === 0 ? time : Math.min(city.bestRace, time);
  const pay = city.fit === "night" ? 140 : 110;
  return {
    dollars: pay,
    respect: 8,
    dialogue: `Nitro — ${time.toFixed(1)}s. The strip is yours. $${pay}.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

export function useSpot(city: City, spot: Spot, dollars: number): PlayEvent & { used: boolean } {
  if (spot === "pier") return cast(city);
  if (spot === "bowl") return approach(city);
  if (spot === "bait") return buyBait(city, dollars);
  if (spot === "meet") return stageRace(city);
  if (spot === "truck") return order(city, dollars);
  if (spot === "wardrobe") return cycleFit(city);
  return { used: true, dialogue: talk(spot) };
}

export function cancelApproach(city: City): PlayEvent {
  city.bowl = null;
  return { dialogue: "" };
}

export function pullEarly(city: City): PlayEvent {
  city.fish = null;
  return { dialogue: "River — Too soon. Line's back in." };
}

export function hookFish(city: City): PlayEvent {
  const baited = city.fish?.baited ?? false;
  city.fish = null;
  city.fished = true;
  const pay = (baited ? 28 : 16) + Math.floor(Math.random() * (baited ? 18 : 10)) + (city.fit === "river" ? 8 : 0);
  return {
    dollars: pay,
    respect: baited ? 3 : 2,
    dialogue: `River — In the cooler. $${pay} SackDollars.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

export function locked(city: City) {
  return Boolean(city.fish || city.bowl);
}

function cast(city: City): PlayEvent & { used: boolean } {
  if (city.fish?.phase === "bite") return { used: true, ...hookFish(city) };
  if (city.fish) return { used: true, ...pullEarly(city) };
  const baited = city.bait > 0;
  if (baited) city.bait -= 1;
  city.fish = { phase: "wait", left: 1.35 + Math.random() * 1.15, baited };
  return { used: true, dialogue: baited ? "River — Bait on. Line's out." : "River — Bare hook. It still bites, just meaner." };
}

function approach(city: City): PlayEvent & { used: boolean } {
  if (city.bowl) return { used: true, dialogue: "" };
  city.bowl = { phase: "aim", power: 0, aim: 0, left: 0, pins: 0 };
  return { used: true, teleport: { x: 92, z: -17.6 }, dialogue: "" };
}

function buyBait(city: City, dollars: number): PlayEvent & { used: boolean } {
  if (dollars < 15) return { used: true, dialogue: "Bait shop — Three for fifteen. You short." };
  city.bait += 3;
  return { used: true, dollars: -15, dialogue: `Bait shop — Three on the counter. You holding ${city.bait}.` };
}

function stageRace(city: City): PlayEvent & { used: boolean } {
  if (city.race) return { used: true, dialogue: "Nitro — You already rolled out. Finish is east." };
  const limit = city.fit === "night" ? 19 : 16;
  city.race = { left: limit, limit };
  return { used: true, teleport: { x: -54, z: -37.2 }, dialogue: "Nitro — Green light. East end of the strip. Don't lift." };
}

function order(city: City, dollars: number): PlayEvent & { used: boolean } {
  const item = MENU[city.menu] ?? MENU[0]!;
  if (dollars < item.cost) return { used: true, dialogue: `Food trucks — ${item.name} is $${item.cost}. Come back with it.` };
  city.menu = (city.menu + 1) % MENU.length;
  city.fed = true;
  city.boost = 12;
  return {
    used: true,
    dollars: -item.cost,
    respect: item.respect,
    dialogue: `Food trucks — ${item.name}. Walk it off. You got some speed.`,
    mission: cityMission(city, true) ?? undefined,
  };
}

function cycleFit(city: City): PlayEvent & { used: boolean } {
  const i = FITS.indexOf(city.fit);
  city.fit = FITS[(i + 1) % FITS.length] ?? "default";
  return { used: true, dialogue: FIT_LINE[city.fit] };
}

function talk(spot: Spot) {
  if (spot === "mama") return "Mama Dee — Plate's warm if you come by the yard. Don't stay out past the streetlights.";
  if (spot === "unc") return "Unc J — River still pays if you wait on the bite. Don't snatch the line.";
  if (spot === "nitro") return "Nitro — Strip's live tonight. Beat my time or buy the next round.";
  return "Strike — 901 Bowl don't care about your name. It cares about the pocket.";
}

function scorePins(power: number, aim: number) {
  if (Math.abs(aim) > 0.82) return power > 0.35 ? 1 : 0;
  const pocket = Math.abs(power - 0.68);
  const powerScore = Math.max(0, 1 - pocket / 0.5);
  const aimScore = Math.max(0, 1 - Math.abs(aim) / 0.85);
  return Math.round(10 * powerScore * aimScore);
}
