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

export type PauseTab = "resume" | "map" | "missions" | "wardrobe" | "trophies" | "kollab" | "settings";

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
  | "river"
  | "foodtruck"
  | "velis"
  | "brothers"
  | "alley"
  | "strip"
  | "welcome"
  | "listenpost"
  | "billboard"
  | "lanes"
  | "rcmworx";

export type ApparelId =
  | "starter_tee"
  | "classic_green"
  | "moneybag_hoodie"
  | "fresh_jersey"
  | "white_cap"
  | "gold_chain"
  | "black_hoodie"
  | "green_sweats"
  | "gold_drop"
  | "night_run"
  | "kollab_jersey"
  | "tour_black"
  | "tour_white"
  | "tour_red"
  | "jersey_white_224"
  | "jersey_blue_fresh"
  | "jersey_black_fresh"
  | "black_sackrow_11"
  | "blue_901_day";

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
  | "full_closet"
  | "irl_family"
  | "sackrow_s"
  | "drop_live"
  | "after_hours"
  | "strip_king"
  | "river_rat"
  | "block_eats"
  | "lane_king"
  | "always_ready";

export interface ApparelItem {
  id: ApparelId;
  name: string;
  price: number;
  category: "top" | "bottom" | "hat" | "chain" | "set";
  color: string;
  description: string;
  productId?: string;
  respectRequired?: number;
  irlOnly?: boolean;
  dropLiveRequired?: boolean;
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
  kind: "briefing" | "complete" | "enter" | "trophy" | "droplive" | "afterhours";
  title: string;
  subtitle: string;
  t: number;
  duration: number;
}

export interface SaveData {
  version: 3;
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
  dropLive?: boolean;
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
  verifiedOrders?: string[];
  unlocks?: string[];
  vanSkin?: "chrome" | "gold" | null;
  afterHoursProgress?: Record<string, boolean>;
  courtVenue?: string;
  bowlingHighScore?: number;
  rcmRuns?: number;
}

export interface GameSettings {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  rumble: boolean;
  cameraView: CameraView;
  sensitivity: number;
  quality: "high" | "medium" | "low";
  reduceMotion: boolean;
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

export type FishingPhase = "idle" | "cast" | "wait" | "nibble" | "strike" | "reel" | "catch" | "fail";

export interface FishingHud {
  active: boolean;
  phase: FishingPhase;
  power: number;
  tension: number;
  progress: number;
  prompt: string;
  fishName: string | null;
  weight: string | null;
  payout: number;
  caught: number;
  legendary: boolean;
}

export interface PlaytestHud {
  fps: number;
  dtMs: number;
  px: number;
  py: number;
  tileX: number;
  tileY: number;
  yaw: number;
  facing: string;
  loco: string;
  air: number;
  nearPoi: string | null;
  hint: string | null;
  equipped: string | null;
  vehicle: string | null;
  indoor: boolean;
  hour: number;
  artRev: number;
  quality: string;
  noclip: boolean;
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
  hintWalk?: boolean;
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
    difficulty?: string;
    challenge?: string;
    ogLine?: string | null;
    horse?: string | null;
    call?: string | null;
    board?: { score: number; label: string }[];
    venue?: string;
  } | null;
  courtMenu?: {
    difficulty: string;
    unlocked: boolean;
    venue: string;
    challenge: string;
    venues: { id: string; name: string; tag: string; thumb: string }[];
  } | null;
  canShoot?: boolean;
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
  buildVersion: string;
  dropLive: boolean;
  driving: boolean;
  jooking?: boolean;
  nextUnlock?: { label: string; at: number } | null;
  vanSkin?: string | null;
  race?: import("./race").RaceHud | null;
  raceMenu?: boolean;
  fishing?: FishingHud | null;
  bowling?: import("./bowling").BowlHud | null;
  food?: import("./foodTrucks").FoodHud | null;
  coolerCount?: number;
  fed?: boolean;
  sponsor?: import("./sponsors").SponsorHud | null;
  sponsorOpen?: boolean;
  rcm?: import("./rcmWorx").RcmHud | null;
  playtest?: PlaytestHud | null;
  playtestOpen?: boolean;
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
  equipped?: ApparelId | null;
  respect?: number;
  owned?: ApparelId[];
  saveVersion?: number;
  dropLive?: boolean;
  driving?: boolean;
  vehicleKind?: "van" | "car" | "sprinter" | "escalade" | null;
  raceActive?: boolean;
  racePhase?: string;
  raceLap?: number;
  racePlace?: number;
  raceTime?: number;
  rivalX?: number;
  rivalY?: number;
  interactHint?: string | null;
  nearPoi?: LocationId | null;
  raceCue?: string | null;
};

export type GameTestApi = {
  teleport: (loc: string) => void;
  getState: () => GameTestState;
  setBallScore: (n: number) => void;
  advanceDialogue: () => void;
  interact: () => void;
  resetSave: () => void;
  buyItem?: (id: string) => void;
  openShop?: () => void;
  wearProduct?: (id: string) => void;
  enterCourt?: () => void;
  beginCharge?: () => void;
  releaseShot?: () => void;
  enterHQ?: () => void;
  enterHQShop?: () => void;
  startRace?: (skipCountdown?: boolean) => void;
  leaveRace?: () => void;
  completeRace?: (win?: boolean) => void;
  startFishing?: () => void;
  openCourtMenu?: () => void;
  setCourtVenue?: (id: string) => void;
  enterLanes?: () => void;
  startBowl?: () => void;
  leaveBowl?: () => void;
  enterRcm?: () => void;
  bookRcm?: (vehicle: string, dest: string, chauffeur?: boolean) => void;
};

export type ControlsTestApi = {
  getYaw: () => number;
  getSpeed: () => number;
  getFacing: () => Dir;
  setKeys: (codes: string[]) => void;
  tapArrow: (dir: "left" | "right" | "up") => void;
};

declare global {
  interface Window {
    __gameTest?: GameTestApi;
    __controlsTest?: ControlsTestApi;
    __SACK_COMMERCE__?: {
      catalog: () => { id: string; slug: string; name: string }[];
      loaded: () => boolean;
      lastIntent: () => { kind: "view" | "buy"; productId: string; size?: string; at: number } | null;
      buyIrl: (id: string, size?: string) => void;
      viewProduct: (id: string) => void;
      addToCart?: (id: string, size: string, qty?: number) => void;
      snapshot?: () => unknown;
      player?: () => unknown;
      lastRunId?: () => string | null;
      requestCatalog?: () => void;
      gameId?: string;
      build?: string;
    };
    __SACK_ANALYTICS__?: {
      events: () => { name: string; payload: Record<string, unknown>; at: number }[];
      track: (name: string, payload?: Record<string, unknown>) => void;
    };
    __SACK_BUILD__?: { version: string; title: string };
  }
}
