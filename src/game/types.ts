import type { DropRunHud, RunGrade } from "./dropRun";

export type Dir = "up" | "down" | "left" | "right";

export type GameMode =
  | "world"
  | "basketball"
  | "shop"
  | "dialogue"
  | "menu"
  | "interior";

export type CameraView = "first" | "third";
export type InputDevice = "keyboard" | "gamepad" | "touch";

export type PauseTab = "resume" | "map" | "missions" | "wardrobe" | "trophies" | "settings";

export type LocationId =
  | "apartment"
  | "store"
  | "court"
  | "neighborhood"
  | "downtown"
  | "culture"
  | "dropvan"
  | "pyramid"
  | "beale"
  | "river";

export type ApparelId =
  | "starter_tee"
  | "classic_green"
  | "moneybag_hoodie"
  | "fresh_jersey"
  | "white_cap"
  | "gold_chain"
  | "black_hoodie"
  | "green_sweats";

export type TrophyId =
  | "first_steps"
  | "family"
  | "baller"
  | "drop_day"
  | "fresh_fit"
  | "deep_pockets"
  | "court_king"
  | "city_legend"
  | "night_owl"
  | "full_closet";

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
  chapter: string;
  steps: MissionStep[];
  activeStep: number;
  complete: boolean;
}

export interface SideMission {
  id: string;
  title: string;
  description: string;
  reward: number;
  done: boolean;
  kind: "score" | "own" | "talk" | "visit";
  target?: LocationId;
  need?: number;
}

export interface TrophyDef {
  id: TrophyId;
  name: string;
  description: string;
  rank: "bronze" | "silver" | "gold" | "platinum";
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
  wander?: boolean;
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
  district: string;
}

export interface CinematicState {
  kind: "briefing" | "complete" | "enter" | "trophy";
  title: string;
  subtitle: string;
  t: number;
  duration: number;
}

export interface SaveData {
  version: 2;
  sackdollars: number;
  respect: number;
  owned: ApparelId[];
  equipped: ApparelId | null;
  missionProgress: Record<string, boolean>;
  missionActiveStep: number;
  missionComplete: boolean;
  basketballHighScore: number;
  tutorialDone: boolean;
  trophies: TrophyId[];
  sideProgress: Record<string, boolean>;
  worldHour: number;
  settings: GameSettings;
  dropRunIndex?: number;
  dropRun?: Partial<{
    active: boolean;
    time: number;
    deliveries: number;
    combo: number;
    bestCombo: number;
    mistakes: number;
    ballMakes: number;
    ballPerfects: number;
    ballScore: number;
    points: number;
    grade: RunGrade | null;
  }>;
  bestRunScore?: number;
  bestGrade?: RunGrade | null;
}

export interface GameSettings {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  rumble: boolean;
  cameraView: CameraView;
}

export interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  scale: number;
}

export interface HudSnapshot {
  mode: GameMode;
  sackdollars: number;
  respect: number;
  missionTitle: string;
  missionStep: string;
  missionProgress: string;
  missionChapter: string;
  interactHint: string | null;
  locationName: string;
  district: string;
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
    combo: number;
    power: number;
    charging: boolean;
    best: number;
    target: number;
    perfects: number;
    zone: string;
  } | null;
  paused: boolean;
  started: boolean;
  missionComplete: boolean;
  cinematic: CinematicState | null;
  letterbox: number;
  worldHour: number;
  inputDevice: InputDevice;
  promptButton: string;
  trophies: TrophyId[];
  trophyPopup: { name: string; rank: string; t: number } | null;
  pauseTab: PauseTab;
  settings: GameSettings;
  sideMissions: { id: string; title: string; description: string; done: boolean; reward: number }[];
  highScore: number;
  hasSave: boolean;
  cameraView: CameraView;
  steps: { id: string; label: string; done: boolean; description: string }[];
  dropRun: DropRunHud;
  uiPulse: number;
  bestGrade: RunGrade | null;
  bestRunScore: number;
}

export type GameTestState = {
  sackdollars: number;
  step: string;
  mode: GameMode;
  score: number;
  missionComplete: boolean;
  facing: Dir;
  px: number;
  py: number;
  vx: number;
  vy: number;
  air: number;
  loco: string;
};

export type GameTestApi = {
  teleport: (loc: string) => void;
  getState: () => GameTestState;
  setBallScore: (n: number) => void;
  advanceDialogue: () => void;
  interact: () => void;
  resetSave: () => void;
};

export type ControlsTestApi = {
  getYaw: () => number;
  getSpeed: () => number;
  getFacing: () => Dir;
  setKeys: (codes: string[]) => void;
};

declare global {
  interface Window {
    __gameTest?: GameTestApi;
    __controlsTest?: ControlsTestApi;
  }
}
