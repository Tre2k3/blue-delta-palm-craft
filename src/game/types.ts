export type Dir = "up" | "down" | "left" | "right";

export type GameMode = "world" | "basketball" | "shop" | "dialogue" | "menu";

export type LocationId =
  | "apartment"
  | "store"
  | "court"
  | "neighborhood"
  | "downtown"
  | "culture"
  | "dropvan";

export type ApparelId =
  | "starter_tee"
  | "classic_green"
  | "moneybag_hoodie"
  | "fresh_jersey"
  | "white_cap"
  | "gold_chain"
  | "black_hoodie"
  | "green_sweats";

export interface ApparelItem {
  id: ApparelId;
  name: string;
  price: number;
  category: "top" | "bottom" | "hat" | "chain" | "set";
  color: string;
  description: string;
}

export interface MissionStep {
  id: string;
  label: string;
  description: string;
  target?: LocationId;
  kind: "goto" | "talk" | "pickup" | "deliver" | "basketball" | "return";
  reward: number;
  done: boolean;
}

export interface Mission {
  id: string;
  title: string;
  steps: MissionStep[];
  activeStep: number;
  complete: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  dialogue: string[];
  missionTalk?: string;
  isKBlanco?: boolean;
}

export interface WorldPoi {
  id: LocationId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label: string;
}

export interface SaveData {
  version: 1;
  sackdollars: number;
  respect: number;
  owned: ApparelId[];
  equipped: ApparelId | null;
  missionProgress: Record<string, boolean>;
  missionActiveStep: number;
  missionComplete: boolean;
  basketballHighScore: number;
  tutorialDone: boolean;
}

export interface HudSnapshot {
  mode: GameMode;
  sackdollars: number;
  respect: number;
  missionTitle: string;
  missionStep: string;
  missionProgress: string;
  interactHint: string | null;
  locationName: string;
  dialogue: { speaker: string; text: string; choices?: string[] } | null;
  shopOpen: boolean;
  toast: string | null;
  equipped: ApparelId | null;
  owned: ApparelId[];
  basketball: {
    score: number;
    timeLeft: number;
    shots: number;
    active: boolean;
  } | null;
  paused: boolean;
  started: boolean;
  missionComplete: boolean;
}
