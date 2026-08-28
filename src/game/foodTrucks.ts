import type { FishId } from "./fishing";
import type { LocationId } from "./types";
import { ART_REV } from "./data";

export type FoodTruckId = Extract<LocationId, "foodtruck" | "velis" | "brothers">;

export type CoolerFish = {
  id: FishId;
  name: string;
  weightLb: number;
  legendary?: boolean;
};

export type FoodItem = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  respect: number;
  fish?: boolean;
};

export type FoodTruckDef = {
  id: FoodTruckId;
  name: string;
  tag: string;
  blurb: string;
  accent: string;
  accentHex: number;
  logo: string;
  items: FoodItem[];
  social?: string;
  contact?: string;
};

export const FOOD_TRUCKS: FoodTruckDef[] = [
  {
    id: "foodtruck",
    name: "901 Catch Kitchen",
    tag: "CATCH KITCHEN",
    blurb: "They grill what you pulled out of the Mississippi. Walk up, open the window, hand over the cooler.",
    accent: "#1db954",
    accentHex: 0x1db954,
    logo: `/game/food/901-catch.png?v=${ART_REV}`,
    social: "House truck · grill the Mississippi catch",
    items: [
      { id: "plate", name: "901 Plate", blurb: "Greens, mac, hot sauce. Ready now.", price: 12, respect: 1 },
      { id: "grill", name: "Grill the Catch", blurb: "Cook fee. They plate whatever is in your cooler.", price: 8, respect: 3, fish: true },
    ],
  },
  {
    id: "velis",
    name: "Veli's Wings",
    tag: "VELI'S WINGS",
    blurb: "Gold-rim plate. Lemon pepper or extra hot. Don't play about the sauce.",
    accent: "#d4af37",
    accentHex: 0xd4af37,
    logo: `/game/food/velis-wings.png?v=${ART_REV}`,
    social: "@yungveli · Deluxe sponsor this cycle",
    contact: "IG / streaming on the board",
    items: [
      { id: "lemon", name: "Lemon Pepper 8", blurb: "Dry rub, extra lemon. Memphis classic.", price: 14, respect: 2 },
      { id: "hot", name: "Veli Hot 10", blurb: "Sauce all the way down the fingers.", price: 16, respect: 2 },
      { id: "combo", name: "Gold Plate Combo", blurb: "Wings + fries. Feeds the block.", price: 18, respect: 3 },
    ],
  },
  {
    id: "brothers",
    name: "Brothers Wingz N Things",
    tag: "WINGZ N THINGS",
    blurb: "Two kings, one window. Wingz, burger, fries. Crown included.",
    accent: "#e11d48",
    accentHex: 0xe11d48,
    logo: `/game/food/brothers-wingz.png?v=${ART_REV}`,
    social: "@brotherswingznthings · Standard sponsor this cycle",
    contact: "Menu + socials at the window",
    items: [
      { id: "wingz", name: "Crown Wingz", blurb: "8 piece, ranch on the side.", price: 13, respect: 2 },
      { id: "burger", name: "King Burger", blurb: "Smash patty, pickles, that sauce.", price: 11, respect: 1 },
      { id: "combo", name: "Wingz N Things Combo", blurb: "Wings, fries, burger. Don't share.", price: 20, respect: 3 },
    ],
  },
];

export const FOOD_TRUCK_IDS = FOOD_TRUCKS.map((t) => t.id);

export function foodTruckById(id: string | null | undefined) {
  return FOOD_TRUCKS.find((t) => t.id === id) ?? null;
}

export function isFoodTruck(id: string | null | undefined): id is FoodTruckId {
  return id === "foodtruck" || id === "velis" || id === "brothers";
}

export function mealName(item: FoodItem, fish: CoolerFish | null) {
  if (item.fish && fish) return `Blackened ${fish.name}`;
  return item.name;
}

export type FoodHud = {
  truckId: FoodTruckId;
  name: string;
  tag: string;
  blurb: string;
  accent: string;
  logo: string;
  cooler: number;
  catchName: string | null;
  catchWeight: string | null;
  social: string | null;
  contact: string | null;
  items: {
    id: string;
    name: string;
    blurb: string;
    price: number;
    locked: string | null;
  }[];
};

export function foodHud(truck: FoodTruckDef, cooler: CoolerFish[], cash: number): FoodHud {
  const top = cooler[0] ?? null;
  return {
    truckId: truck.id,
    name: truck.name,
    tag: truck.tag,
    blurb: truck.blurb,
    accent: truck.accent,
    logo: truck.logo,
    cooler: cooler.length,
    catchName: top?.name ?? null,
    catchWeight: top ? `${top.weightLb} lb` : null,
    social: truck.social ?? null,
    contact: truck.contact ?? null,
    items: truck.items.map((item) => {
      let locked: string | null = null;
      if (item.fish && !top) locked = "Catch a fish at the river first";
      else if (cash < item.price) locked = `Need $${item.price}`;
      return {
        id: item.id,
        name: item.fish && top ? `Grill ${top.name}` : item.name,
        blurb: item.fish && top ? `${top.weightLb} lb · they blacken it and plate it` : item.blurb,
        price: item.price,
        locked,
      };
    }),
  };
}
