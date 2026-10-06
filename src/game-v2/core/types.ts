export type Facing = "front" | "back" | "left" | "right";

export type Place = "street" | "home" | "hq" | "court" | "haunt";

export type Solid = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type HudState = {
  place: Place;
  dollars: number;
  respect: number;
  mission: string;
  prompt: string;
  charge: number;
  night: boolean;
  golden: boolean;
  made: number;
  taken: number;
  dialogue: string;
  carrying: boolean;
  x: number;
  z: number;
  fit: string;
  bait: number;
  boost: boolean;
  log: boolean;
  marks: { fish: boolean; bowl: boolean; food: boolean; race: boolean };
  bestBowl: number;
  bestRace: number;
};

export type V2Public = {
  x: number;
  y: number;
  z: number;
  facing: Facing;
  place: Place;
  cars: { x: number; z: number; yaw: number; speed: number }[];
  dollars: number;
  respect: number;
  mission: string;
  carrying: boolean;
  dialogue: string;
};
