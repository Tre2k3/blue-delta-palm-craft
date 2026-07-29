import type { ApparelItem, Mission, NpcDef, WorldPoi } from "./types";

/** World size in tiles (each tile = 48px) */
export const TILE = 48;
export const WORLD_W = 60;
export const WORLD_H = 45;
export const WORLD_PX_W = WORLD_W * TILE;
export const WORLD_PX_H = WORLD_H * TILE;

export const PLAYER_SPEED = 165;
export const PLAYER_RUN = 250;

export const APPAREL: ApparelItem[] = [
  {
    id: "starter_tee",
    name: "Starter Green Tee",
    price: 0,
    category: "top",
    color: "#1db954",
    description: "What Benji woke up in. In the sack we trust.",
  },
  {
    id: "classic_green",
    name: "Classic $ack Tee",
    price: 40,
    category: "top",
    color: "#16a34a",
    description: "The drop that put the city on notice.",
  },
  {
    id: "moneybag_hoodie",
    name: "Moneybag Hoodie",
    price: 90,
    category: "top",
    color: "#15803d",
    description: "Heavyweight fleece. Moneybag logo front and center.",
  },
  {
    id: "black_hoodie",
    name: "Midnight Hoodie",
    price: 85,
    category: "top",
    color: "#171717",
    description: "Black on black. Silent flex.",
  },
  {
    id: "fresh_jersey",
    name: "FRESH 38127 Jersey",
    price: 120,
    category: "top",
    color: "#0f766e",
    description: "Memphis zip. K Blanco co-sign energy.",
  },
  {
    id: "white_cap",
    name: "White Snapback",
    price: 35,
    category: "hat",
    color: "#f5f5f5",
    description: "SackReligious script. Keep it tilted.",
  },
  {
    id: "gold_chain",
    name: "Moneybag Chain",
    price: 150,
    category: "chain",
    color: "#d4af37",
    description: "Gold rope + pendant. Respect required.",
  },
  {
    id: "green_sweats",
    name: "Green Sweat Set",
    price: 110,
    category: "set",
    color: "#22c55e",
    description: "Full fit. Court to culture spot ready.",
  },
];

export const POIS: WorldPoi[] = [
  {
    id: "apartment",
    name: "Benji's Apartment",
    x: 4 * TILE,
    y: 6 * TILE,
    w: 4 * TILE,
    h: 4 * TILE,
    color: "#3f3f46",
    label: "HOME",
  },
  {
    id: "store",
    name: "SackReligious HQ",
    x: 26 * TILE,
    y: 8 * TILE,
    w: 6 * TILE,
    h: 5 * TILE,
    color: "#14532d",
    label: "HQ",
  },
  {
    id: "court",
    name: "901 Court",
    x: 10 * TILE,
    y: 28 * TILE,
    w: 8 * TILE,
    h: 7 * TILE,
    color: "#7c2d12",
    label: "BALL",
  },
  {
    id: "neighborhood",
    name: "The Neighborhood",
    x: 42 * TILE,
    y: 10 * TILE,
    w: 5 * TILE,
    h: 4 * TILE,
    color: "#1e3a5f",
    label: "HOOD",
  },
  {
    id: "downtown",
    name: "Downtown Memphis",
    x: 44 * TILE,
    y: 28 * TILE,
    w: 5 * TILE,
    h: 4 * TILE,
    color: "#312e81",
    label: "DT",
  },
  {
    id: "culture",
    name: "The Culture Spot",
    x: 22 * TILE,
    y: 34 * TILE,
    w: 5 * TILE,
    h: 4 * TILE,
    color: "#4a044e",
    label: "CULTURE",
  },
  {
    id: "dropvan",
    name: "Drop Van",
    x: 36 * TILE,
    y: 20 * TILE,
    w: 3 * TILE,
    h: 2.5 * TILE,
    color: "#292524",
    label: "VAN",
  },
];

export function createDropDayMission(): Mission {
  return {
    id: "drop_day",
    title: "The Drop Day",
    activeStep: 0,
    complete: false,
    steps: [
      {
        id: "wake",
        label: "Leave the apartment",
        description: "Drop Day is live. Step into Memphis.",
        target: "apartment",
        kind: "goto",
        reward: 10,
        done: false,
      },
      {
        id: "link_k",
        label: "Link up with K Blanco",
        description: "Hit SackReligious HQ and talk to K.",
        target: "store",
        kind: "talk",
        reward: 25,
        done: false,
      },
      {
        id: "pickup",
        label: "Pick up the drop",
        description: "Secure the new drop at the van.",
        target: "dropvan",
        kind: "pickup",
        reward: 40,
        done: false,
      },
      {
        id: "hood",
        label: "Move product — Neighborhood",
        description: "Connect with the real ones in the hood.",
        target: "neighborhood",
        kind: "deliver",
        reward: 50,
        done: false,
      },
      {
        id: "dt",
        label: "Move product — Downtown",
        description: "Downtown vibes. More supporters.",
        target: "downtown",
        kind: "deliver",
        reward: 50,
        done: false,
      },
      {
        id: "culture",
        label: "Move product — Culture Spot",
        description: "Last stop. The brand grows.",
        target: "culture",
        kind: "deliver",
        reward: 60,
        done: false,
      },
      {
        id: "ball",
        label: "Ball up for respect",
        description: "Hit the 901 Court. Score 8 points.",
        target: "court",
        kind: "basketball",
        reward: 45,
        done: false,
      },
      {
        id: "return",
        label: "Return to HQ",
        description: "Mission complete. Report back to K Blanco.",
        target: "store",
        kind: "return",
        reward: 100,
        done: false,
      },
    ],
  };
}

export const NPCS: NpcDef[] = [
  {
    id: "k_blanco",
    name: "K Blanco",
    x: 28.5 * TILE,
    y: 10.5 * TILE,
    color: "#f5d0a9",
    dialogue: [
      "Welcome to the family. Glad you made it.",
      "In the sack, we trust. You ready for Drop Day?",
      "Shop the wall, move the product, grow the brand.",
    ],
    missionTalk: "Benji. Lock in. Grab the drop from the van, hit three spots, then bounce back.",
    isKBlanco: true,
  },
  {
    id: "supporter_1",
    name: "Local Supporter",
    x: 44 * TILE,
    y: 12 * TILE,
    color: "#a3a3a3",
    dialogue: [
      "You Benji? Heard SackReligious got that new drop.",
      "This city rocking with the brand heavy.",
    ],
  },
  {
    id: "downtown_fan",
    name: "901 Fan",
    x: 46 * TILE,
    y: 30 * TILE,
    color: "#e5e5e5",
    dialogue: ["Fresh fits only. Respect the movement.", "You got that energy, Benji."],
  },
  {
    id: "culture_host",
    name: "Culture Host",
    x: 24 * TILE,
    y: 36 * TILE,
    color: "#c4b5fd",
    dialogue: ["Culture spot is lit tonight.", "Drop sold through. Brand growing."],
  },
  {
    id: "court_coach",
    name: "Court OG",
    x: 12 * TILE,
    y: 30 * TILE,
    color: "#fdba74",
    dialogue: [
      "Court's open. Put up points, earn $ackdollars.",
      "Timing is everything. Let it fly at the peak.",
    ],
  },
  {
    id: "street_npc",
    name: "Memphis Local",
    x: 18 * TILE,
    y: 18 * TILE,
    color: "#86efac",
    dialogue: ["Man, this city rockin' with the brand heavy.", "Pyramid looks different on Drop Day."],
  },
];

export const SAVE_KEY = "sackreligious-memphis-v1";
