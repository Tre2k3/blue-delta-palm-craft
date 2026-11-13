import * as THREE from "three";
import { Card } from "./actors/card";
import { StageBand } from "./actors/stageband";
import { Troupe, type Act, type Stop, type Talker } from "./actors/crowd";
import { People } from "./actors/people";
import { Traffic } from "./actors/traffic";
import { CarModel, Driver, STREET, type DriveTune } from "./actors/vehicle";
import { Fireworks } from "./gfx/fx";
import { Rain } from "./gfx/rain";
import { BALLERS, BAND, CAST, COACH, PEDS, OUTFITS, BENJI_HEIGHT, SITTERS, TAGGERS, type CastId, type OutfitId, VENDORS } from "./assets/cast";
import { Sound } from "./core/audio";
import { SONGS, TUNES } from "./core/band";
import { Input, type Nav } from "./core/input";
import type { AlbumHud, HoopsKind, Dialogue, HudState, Live, Mode, Overlay, Place, Results, Reveal, Save, Solid } from "./core/types";
import { clamp, damp, dampAngle, wrapAngle } from "./core/util";
import { makeStage, pickQuality, qualityIsChosen, type Quality, type Stage } from "./gfx/render";
import { Lite } from "./gfx/lite";
import { Sacks } from "./play/sacks";
import { PHASES, Sky, type Phase } from "./gfx/sky";
import { Bowling } from "./play/bowling";
import { CATALOG, COLLECTION_BONUS, productById } from "./play/catalog";
import { Cornhole } from "./play/cornhole";
import { FISH, Fishing } from "./play/fishing";
import { Putt } from "./play/putt";
import { BOARD, BoatRide } from "./play/boat";
import { Slide, Swing } from "./play/playground";
import { Tennis } from "./play/tennis";
import { BallPit, Bounce, KartRace } from "./play/fun";
import { BLASTERS, LaserTag, RANKS as TAG_RANKS } from "./play/lasertag";
import { CABINETS, FOOD, FOOD_TRUCKS, PRIZES, type TruckId } from "./play/goods";
import { Hoops } from "./play/hoops";
import { PinballTable, PrizeWheel, SkeeLane } from "./play/floor";
import { POSTCARDS, dailyFor, dailyPay, dayBefore, dayKey, meets, postcardImg } from "./play/extras";
import { TableGames } from "./play/tables";
import { Crew } from "./net/crew";
import { ALL_LINES, castLine, chat, nameOf } from "./play/chatter";
import { RIDES, rideById } from "./play/garage";
import { AirHockey, BagToss, BottleBash, ClownToss } from "./play/midway";
import { PopShot, Whack } from "./play/machines";
import { StreetRace } from "./play/race";
import { BOUNTIES, CHAPTERS, RANKS, RANK_PAY, STORE_REWARD, STORY, chapterOf, rankBadge, rankOf } from "./play/story";
import { buildCity, type City } from "./world/city";
import { buildSkyShow, type SkyShow } from "./world/skyshow";
import { pushCircle, pushOut, sight } from "./world/collide";
import { buildClubRoom, type ClubRoom } from "./world/club";
import { buildFunRoom, buildLaserRoom, type FunRoom, type LaserRoom } from "./world/funhouse";
import { CORNHOLE, HOLES, PUTT_PAR, PUTT_STAND, TENNIS_GATE } from "./world/rec-map";
import { BEALE_STAGE, BOWL, FUN, HQ, MEMPHIAN, PARK, PARK_TABLES, POIS, RACE_MEET, RIVER_Z, ROAD_HALF, ROOM, SLIDE, STREETS_X, STREETS_Z, SWING, TRUCKS, WALK, districtAt, nearestStreet } from "./world/map";
import { LANE, buildBowlRoom, buildHomeRoom, buildHqRoom, type BowlRoom, type HomeRoom, type HqRoom, type Room } from "./world/rooms";

const SAVE_KEY = "sack-v2-save-4";

export type Spot = {
  place: Place;
  x: number;
  z: number;
  r: number;
  label: () => string;
  act: () => void;
  when?: () => boolean;
};

/** A thing that takes over the controls and the camera until it ends. */
export interface Activity {
  hints: [string, string][];
  update(dt: number): void;
  hud(h: HudState): void;
  /** Player backed out. */
  quit(): void;
  /** A click or tap on the scene, in normalised device coordinates. */
  tap?(nx: number, ny: number): void;
}

type Npc = { id: CastId; card: Card; place: Place; x: number; z: number; home: number };

/** Longest stretch of game time played in one go. */
const STEP = 1 / 30;

/** Graphics from richest to lightest. The frame rate walks down this list, resolution before effects. */
const RUNGS: { quality: Quality; scale: number }[] = [
  { quality: "high", scale: 1 },
  { quality: "medium", scale: 1 },
  { quality: "medium", scale: 0.8 },
  { quality: "low", scale: 1 },
  { quality: "low", scale: 0.8 },
  { quality: "low", scale: 0.66 },
  { quality: "low", scale: 0.55 },
];
const RUNG_KEY = "sack-v2-auto-2";

function loadRung() {
  try {
    const v = JSON.parse(localStorage.getItem(RUNG_KEY) ?? "null") as { rung?: number; tooSlow?: number } | null;
    if (v && Number.isInteger(v.rung) && v.rung! >= 0 && v.rung! < RUNGS.length) return { rung: v.rung!, tooSlow: Number.isInteger(v.tooSlow) ? v.tooSlow! : -1 };
  } catch {
    /* private mode */
  }
  return { rung: 1, tooSlow: -1 };
}

function saveRung(rung: number, tooSlow: number) {
  try {
    localStorage.setItem(RUNG_KEY, JSON.stringify({ rung, tooSlow }));
  } catch {
    /* private mode */
  }
}

const START = { x: -13.4, z: -160.5, heading: 0 };
const CAR_START = { x: 8, z: -151.6, heading: Math.PI / 2 };

function freshSave(): Save {
  return {
    v: 4,
    dollars: 120,
    respect: 0,
    tickets: 0,
    owned: ["sr-starter-tee"],
    outfits: ["starter"],
    wearing: "starter",
    step: 0,
    flags: {},
    best: {},
    bait: 5,
    cooler: [],
    x: START.x,
    z: START.z,
    heading: START.heading,
    car: { ...CAR_START },
    ride: "coupe",
    rides: ["coupe"],
    daily: { day: "", done: false, streak: 0, last: "" },
    bounty: 0,
    played: 0,
    count: 0,
  };
}

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    if (s.v !== 4 || typeof s.dollars !== "number") return null;
    const out = { ...freshSave(), ...s };
    // The FRESH jersey in the store is the black 38127: anyone who already bought it has it.
    if (out.owned.includes("sr-fresh-jersey") && !out.outfits.includes("fresh_black")) out.outfits.push("fresh_black");
    out.outfits = out.outfits.filter((o) => o in OUTFITS);
    if (!(out.wearing in OUTFITS)) out.wearing = "starter";
    out.rides = out.rides.filter((id) => RIDES.some((r) => r.id === id));
    if (!out.rides.includes("coupe")) out.rides.unshift("coupe");
    if (!out.rides.includes(out.ride)) out.ride = "coupe";
    return out;
  } catch {
    return null;
  }
}

/** What the announcer calls out, by what comes up on screen. The first that fits wins. */
const CALLS: [RegExp, string][] = [
  [/ON FIRE/, "call-on-fire"],
  [/^STRIKE!/, "call-strike"],
  [/^SPARE!/, "call-spare"],
  [/^Gutter ball/, "call-gutter"],
  [/^PERFECT (RELEASE|BOOST|LAUNCH)/, "call-perfect"],
  [/^SWISH/, "call-swish"],
  [/^(BUCKET|OFF THE GLASS)/, "call-bucket"],
  [/^GO!$/, "call-go"],
  [/^FISH ON/, "call-fish-on"],
  [/New record/, "call-new-record"],
  [/(BASE IS DOWN|TOOK THEIR BASE)/, "call-base-down"],
  [/^(TAGGED|VEST DOWN)/, "call-tagged"],
  [/^YOU LEAD/, "call-you-lead"],
];

const TINT: Record<Phase, THREE.Color> = {
  golden: new THREE.Color(1, 0.84, 0.7),
  night: new THREE.Color(0.56, 0.6, 0.78),
  day: new THREE.Color(1, 1, 1),
};
const INDOOR_TINT = new THREE.Color(0.96, 0.94, 0.9);
const _v = new THREE.Vector3();
const _look = new THREE.Vector3();

export class Game {
  readonly input = new Input();
  readonly sound = new Sound();
  readonly city: City;
  readonly scene: THREE.Scene;
  readonly stage: Stage;
  readonly camera: THREE.PerspectiveCamera;
  readonly sky: Sky;
  readonly rooms: { hq: HqRoom; home: HomeRoom; bowl: BowlRoom; fun: FunRoom; laser: LaserRoom; club: ClubRoom };
  readonly live: Live = { fp: { on: false, gun: 0, ads: 0, bob: 0, move: 0, kick: 0, flash: 0, reload: -1, sprint: 0, gap: 0, target: 0, hit: 0, hitKind: 0, hurt: 0, hurtAngle: 0, swayX: 0, swayY: 0, down: 0, fov: 72 }, meter: 0, sweetLo: 0, sweetHi: 0, aim: 0, tension: 0, speed: 0, drift: 0, nitro: 0, fade: 1, radar: new Array<number>(48).fill(0), radarN: 0, cue: 999, turn: -1, markX: 0.5, markY: 0.5, markOn: false, markDist: 0, x: 0, z: 0, heading: 0, camYaw: 0, party: 0, partyLevel: 0 };
  readonly benji: Card;
  car: CarModel;
  readonly driver = new Driver();
  readonly traffic: Traffic;
  readonly people: People;
  readonly tint = new THREE.Color(1, 1, 1);

  save: Save;
  hasSave: boolean;
  mode: Mode = "title";
  overlay: Overlay = null;
  place: Place = "street";
  room: Room | null = null;
  activity: Activity | null = null;
  /** The art tables, where tools and tests can read them. */
  readonly tables = { OUTFITS, PEDS, BALLERS, CAST, VENDORS, STORY, CHAPTERS, RIDES, POSTCARDS, POIS, HOLES, PUTT_PAR, CHATTER: ALL_LINES, TAGGERS, COACH, BAND, BLASTERS, TAG_RANKS, TUNES, SONGS, BEALE_STAGE, MEMPHIAN };
  pos = { x: START.x, z: START.z };
  vel = { x: 0, z: 0 };
  heading = 0;
  camYaw = Math.PI;
  time = 0;
  /** Tickets won since walking into the Fun House. */
  visitTickets = 0;
  fishTrip = 0;
  shopFocus: string | null = null;
  cabinet: string | null = null;
  foodAt: TruckId | "pizza" = "catch";
  /** The video on the big screen at Veli's Wings. Made the first time Benji gets near the lot. */
  private veli: { video: HTMLVideoElement; tex: THREE.VideoTexture } | null = null;
  private veliVol = 0;
  /** The band on the stage in Handy Park and the one inside the Memphian, the crowd in front of the first, and which song the second is on. */
  private bealeBand!: StageBand;
  private clubBand!: StageBand;
  private gig!: Troupe;
  private song = 0;
  private tipped = -999;
  results: Results | null = null;
  /** The HUD's handler for pad presses while a menu is up. */
  onNav: ((n: Nav) => void) | null = null;

  private spots: Spot[] = [];
  private carSpot: Spot | null = null;
  private npcs: Npc[] = [];
  private beam: THREE.Mesh;
  private raf = 0;
  private last = 0;
  private dead = false;
  private hudClock = 0;
  private saveClock = 0;
  private stepClock = 0;
  private boom = 6.2;
  private fadeTo = 0;
  private afterFade: (() => void) | null = null;
  private dialogue: (Dialogue & { left: number; voice: string })[] = [];
  private toastText = "";
  private toastLeft = 0;
  private revealNow: Reveal | null = null;
  private revealLeft = 0;
  /** Seconds his fist stays up after something worth it. */
  private fistLeft = 0;
  /** Photo mode: he holds the pose until the lens is put away. */
  private posing = false;
  private fedUntil = 0;
  private lookIdle = 9;
  private onAgain: (() => void) | null = null;
  private onResultsClose: (() => void) | null = null;
  private prompt = "";
  private drivePrompt = "";
  /** People with nothing to say who make a room feel used: shoppers, bowlers, kids at the cabinets. */
  /** Everyone indoors, by room, and the people on the street who have somewhere to be. */
  private troupes: Partial<Record<Exclude<Place, "street">, Troupe>> = {};
  private street!: Troupe;
  /** Balls other people have sent down their lanes at the bowl. */
  private laneBalls: { mesh: THREE.Mesh; z: number; end: number; live: boolean }[] = [];
  private rolling = { x: 0, z: 0, vx: 0, vz: 0, speed: 0 };
  private nearSpot: Spot | null = null;
  /** How many times each person on the street has been spoken to, so they say something new. */
  private talks = new Map<string, number>();
  private camPos = new THREE.Vector3();
  private titleSpin = 0;
  /** The opening shot: seconds in, the path of the lens and the path of what it looks at. */
  private intro: { t: number; path: THREE.CatmullRomCurve3; aim: THREE.CatmullRomCurve3; card: number } | null = null;
  private cinema: { title: string; sub: string } | null = null;
  /** Real seconds of slow motion left, and how slow. */
  private slowLeft = 0;
  private slowDeep = 1;
  private partyAt = -10;
  private lastCall = "";
  /** A rank just earned, held a beat so it lands after whatever paid for it. */
  private rankUp: { name: string; left: number } | null = null;
  /** Photo mode: which way the lens sits from Benji, how high, how far. */
  private photo = { yaw: 0, pitch: 0.14, dist: 5.2 };
  private fireworks = new Fireworks();
  private rain = new Rain(RIVER_Z);
  /** How hard it is raining now and is going to, how wet the ground is, and when the sky next turns. */
  private weather = { rain: 0, want: 0, wet: 0, next: 210 + Math.random() * 150, left: 0, pinned: false, flash: 0, thunder: 9 };
  /** Phones buzz on hits and wins unless this is off. */
  buzzOn = true;
  private skip = 0;
  private padWas = false;
  /** A game is running inside a cabinet's browser. */
  private webOn = false;
  private lite = new Lite();
  /** Coins all over town. */
  private coins!: Sacks;
  private coinRun = 0;
  private coinRunLeft = 0;
  /** Graphics follow the frame rate unless the player picked a level. */
  private auto = true;
  private rung = 1;
  /** Deepest rung that proved too slow here: never climb back to it. */
  private tooSlow = -1;
  private gClock = 0;
  private gFrames = 0;
  private gHold = 3;
  private gSlow = 0;
  private gFast = 0;
  private gBefore = 0;
  private gStuck = 0;
  private gLocked = false;
  /** Frame rate before the last climb, and how many seconds are left to match it. */
  private gProbe = 0;
  private gProbeLeft = 0;
  private gRate = 60;
  private hoops: Hoops;
  private bowling: Bowling;
  private fishing: Fishing;
  /** The blimp and the searchlights. */
  readonly skyShow: SkyShow;
  private cornhole: Cornhole;
  private putt: Putt;
  private tennis: Tennis;
  /** The playground in the park, and the speedboat at the pier. */
  private swings: Swing;
  private slide: Slide;
  private boat: BoatRide;
  private race: StreetRace;
  private kart: KartRace;
  private laser: LaserTag;
  private bounce: Bounce;
  private pit: BallPit;
  private whack: Whack;
  /** The game tables in the park. */
  readonly board: TableGames;
  /** Friends on other devices, walking round the same city. */
  readonly crew: Crew;
  private popshot: PopShot;
  private pinball: PinballTable;
  private skee: SkeeLane;
  private wheel: PrizeWheel;
  private hockey: AirHockey;
  private bottles: BottleBash;
  private clowns: ClownToss;
  private bags: BagToss;
  /** Nothing happens on its own: no daily drop, no fireworks at nightfall, no rainbow. For tests, with `?calm=1`. */
  calm = typeof location !== "undefined" && new URLSearchParams(location.search).get("calm") === "1";
  /** The slide he is in: points so far, and how long since the tyres last let go. */
  private drift = { pts: 0, hold: 0 };
  /** Fireworks over the river on the first night of a session and every night after: seconds left, and the next shell. */
  private nightShow = { left: 0, next: 0, was: "" };
  /** A rainbow after daytime rain: seconds left, and the arc itself. */
  private rainbow = { left: 0, span: 80, heavy: false, mesh: null as THREE.Mesh | null };
  /** How the car he is in handles on the street. */
  private tune: DriveTune = { ...STREET };

  constructor(
    canvas: HTMLCanvasElement,
    private onHud: (h: HudState) => void,
  ) {
    const saved = loadSave();
    this.hasSave = !!saved;
    this.save = saved ?? freshSave();
    this.city = buildCity();
    this.skyShow = buildSkyShow();
    this.city.exterior.add(this.skyShow.group);
    this.scene = this.city.scene;
    this.auto = !qualityIsChosen();
    this.stage = makeStage(canvas, this.scene, pickQuality());
    this.camera = this.stage.camera;
    this.sky = new Sky(this.scene, this.stage.renderer);
    if (this.auto) {
      const r = loadRung();
      this.rung = r.rung;
      this.tooSlow = r.tooSlow;
      this.stage.setQuality(RUNGS[this.rung]!.quality);
      this.stage.setScale(RUNGS[this.rung]!.scale);
    }
    this.fitQuality();
    this.rooms = { hq: buildHqRoom(), home: buildHomeRoom(), bowl: buildBowlRoom(), fun: buildFunRoom(), laser: buildLaserRoom(), club: buildClubRoom() };
    for (const r of Object.values(this.rooms)) this.scene.add(r.group);

    this.benji = new Card(OUTFITS[this.save.wearing]?.art ?? OUTFITS.starter.art, BENJI_HEIGHT);
    this.scene.add(this.benji.group);
    this.car = this.buildCar(this.save.ride);
    this.traffic = new Traffic(this.stage.quality === "high" ? 14 : this.stage.quality === "medium" ? 10 : 6);
    this.city.exterior.add(this.traffic.group);
    this.coins = new Sacks(this.save.flags);
    this.city.exterior.add(this.coins.mesh);
    this.people = new People(this.stage.quality === "low" ? 22 : 34, this.stage.quality !== "low");
    this.city.exterior.add(this.people.group);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 70, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    );
    this.beam.position.y = 35;
    this.beam.renderOrder = 4;
    this.city.exterior.add(this.beam);
    this.city.exterior.add(this.fireworks.points);
    this.scene.add(this.rain.group);
    this.fireworks.onBurst = () => this.sound.boom();
    try {
      this.buzzOn = localStorage.getItem("sack-v2-buzz") !== "0";
    } catch {
      // Private windows have no storage: the default stands.
    }

    this.hoops = new Hoops(this);
    this.bowling = new Bowling(this);
    this.fishing = new Fishing(this);
    this.cornhole = new Cornhole(this);
    this.putt = new Putt(this);
    this.tennis = new Tennis(this);
    this.swings = new Swing(this);
    this.slide = new Slide(this);
    this.boat = new BoatRide(this);
    this.race = new StreetRace(this);
    this.kart = new KartRace(this);
    this.laser = new LaserTag(this);
    this.bounce = new Bounce(this);
    this.pit = new BallPit(this);
    this.whack = new Whack(this);
    this.board = new TableGames(this);
    this.crew = new Crew(this);
    this.crew.onTable = (from, msg) => this.board.onNet(from, msg);
    this.crew.onGone = (id) => this.board.gone(id);
    this.popshot = new PopShot(this);
    this.pinball = new PinballTable(this);
    this.skee = new SkeeLane(this);
    this.wheel = new PrizeWheel(this);
    this.hockey = new AirHockey(this);
    this.bottles = new BottleBash(this);
    this.clowns = new ClownToss(this);
    this.bags = new BagToss(this);

    this.cast();
    this.wire();
    this.pos.x = START.x;
    this.pos.z = START.z;
    this.heading = START.heading;
    this.driver.reset(this.save.car.x, this.save.car.z, this.save.car.heading);
    this.placeCar();
    this.benji.place(this.pos.x, this.pos.z);
    this.benji.heading = this.heading;
    (window as unknown as { __GAME__?: Game }).__GAME__ = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- setup

  private cast() {
    const a = this.city.anchors;
    const put = (id: CastId, place: Place, x: number, z: number, heading: number, rise = 0) => {
      const c = CAST[id];
      const card = new Card(c.art, c.height);
      card.lift = rise;
      card.place(x, z);
      card.heading = heading;
      (place === "street" ? this.city.exterior : this.rooms[place].group).add(card.group);
      this.npcs.push({ id, card, place, x, z, home: heading });
    };
    put("kBlanco", "hq", this.rooms.hq.kSpot.x, this.rooms.hq.kSpot.z, this.rooms.hq.kSpot.heading, this.rooms.hq.kSpot.lift);
    put("courtOg", "street", a.ogStand.x, a.ogStand.z, 0);
    put("uncJ", "street", a.uncStand.x, a.uncStand.z, a.uncStand.heading);
    put("mamaDee", "street", a.trucks.windows.catch.x - 2.6, a.trucks.windows.catch.z + 0.6, Math.PI);
    put("nitro", "street", RACE_MEET.x, RACE_MEET.z, 0);
    put("strike", "bowl", this.rooms.bowl.strikeSpot.x, this.rooms.bowl.strikeSpot.z, this.rooms.bowl.strikeSpot.heading);
    this.populate();
  }

  /**
   * Everyone else. Nobody is parked: each person has a round of things to do, and the few who
   * stay put are working (a cook at a window) or playing (a kid on a trampoline).
   */
  private populate() {
    let k = 0;
    const who = () => PEDS[(k++ * 5 + 2) % PEDS.length]!;
    const at = (x: number, z: number, fx: number, fz: number, act: Act, more: Partial<Stop> = {}): Stop => ({ x, z, fx, fz, act, ...more });
    const hand = (name: string): { art: { front: string }; height: number } => ({ art: { front: `/game/people/${name}.webp` }, height: 1.76 });
    const few = this.stage.quality === "low";

    // ---- Fun House: play, eat, watch, queue for laser tag and the karts.
    const fun = this.rooms.fun;
    const F = ROOM.fun;
    const ft = (this.troupes.fun = new Troupe(fun.group, fun.solids, fun.floorY + 0.03, 11));
    const funStops: Stop[] = [];
    for (const c of fun.cabinets) {
      const cab = CABINETS.find((q) => q.id === c.id);
      if (cab && !cab.machine) funStops.push(at(c.x + 0.62, c.z + 0.3, c.x + 0.3, c.z - 2, "play"));
    }
    funStops.push(
      at(fun.pinball.x + 1.5, fun.pinball.stand.z + 0.1, fun.pinball.x + 1.5, fun.pinball.z + 2, "play"),
      at(fun.skee.x + 1.25, fun.skee.stand.z, fun.skee.x + 1.25, fun.skee.zRamp, "play"),
      at(fun.wheel.x - 2.3, fun.wheel.z + 3.3, fun.wheel.x, fun.wheel.z, "cheer"),
      at(fun.wheel.x + 2.7, fun.wheel.z + 3.6, fun.wheel.x, fun.wheel.z, "cheer"),
      at(fun.hockey.x + 1.5, fun.hockey.z + 0.3, fun.hockey.x, fun.hockey.z, "cheer"),
      at(fun.midway.bottles.stand.x - 0.95, fun.midway.bottles.stand.z + 0.5, fun.midway.bottles.x, fun.midway.bottles.z, "cheer"),
      at(fun.midway.bags.stand.x + 0.9, fun.midway.bags.stand.z + 0.7, fun.midway.clowns.x, fun.midway.clowns.z, "watch"),
      at(fun.pizza.x - 0.3, fun.pizza.z + 1.2, fun.pizza.x + 3, fun.pizza.z + 1.2, "watch", { stay: [3, 6] }),
      at(fun.prizes.x - 0.3, fun.prizes.z - 1.5, fun.prizes.x + 3, fun.prizes.z - 1.5, "watch"),
      at(fun.pitEdge.x + 1.7, fun.pitEdge.z + 1.3, (fun.pit.minX + fun.pit.maxX) / 2, (fun.pit.minZ + fun.pit.maxZ) / 2, "cheer"),
      at(fun.trampEdge.x + 0.7, fun.trampEdge.z - 2.1, fun.tramp.x, fun.tramp.z, "cheer"),
      at(fun.trampEdge.x + 0.9, fun.trampEdge.z + 2.2, fun.tramp.x, fun.tramp.z, "watch"),
      at(fun.laserDoor.x + 1, fun.laserDoor.z - 0.5, fun.laserDoor.x, fun.laserDoor.z - 3, "inside", { stay: [14, 24] }),
      at(fun.kartDoor.x + 1.2, fun.kartDoor.z + 0.4, fun.kartDoor.x, fun.kartDoor.z + 3, "inside", { stay: [14, 24] }),
      at(fun.exit.x - 1.3, fun.exit.z + 0.1, fun.exit.x, fun.exit.z + 3, "inside", { stay: [6, 12] }),
    );
    for (const [tx, tz] of [
      [7.5, -3.6],
      [11, 0.4],
      [7.5, 3.6],
    ] as const) {
      funStops.push(at(F.x + tx + 0.25, F.z + tz + 1.3, F.x + tx, F.z + tz, "eat"), at(F.x + tx - 0.25, F.z + tz - 1.3, F.x + tx, F.z + tz, "eat"));
    }
    ft.stops(funStops);
    for (let i = 0; i < (few ? 7 : 11); i++) {
      const w = who();
      ft.roam(w.art, w.height, funStops);
    }
    // Two kids on the small trampolines, one up to the waist in the ball pit, and the staff.
    // PEDS 2, 5 and 7 are the youngest three: they get the trampolines and the pit.
    for (const [bx, bz, h, kid] of [
      [-17.9, 1.2, 1.5, 2],
      [-11.2, 10.2, 1.42, 7],
    ] as const) {
      ft.post(PEDS[kid]!.art, h, at(F.x + bx, F.z + bz, F.x, F.z + 2, "bounce", { lift: 0.42 }));
    }
    const wader = PEDS[5]!;
    ft.post(wader.art, 1.5, at(fun.pit.minX + 2.6, fun.pit.minZ + 2.4, fun.pit.maxX, fun.pit.maxZ, "wade", { lift: -0.42 }));
    const cook = PEDS[6]!;
    ft.post(cook.art, cook.height, at(F.x + 18.5, F.z - 5.1, F.x + 14, F.z - 5.1, "serve"));
    // Whoever has the far end of the air hockey table, and the man who runs the midway.
    const puck = PEDS[4]!;
    ft.post(puck.art, puck.height, at(fun.hockey.far.x, fun.hockey.far.z, fun.hockey.x, fun.hockey.z, "play"));
    const barker = PEDS[0]!;
    ft.post(barker.art, barker.height, at(fun.midway.keeper.x, fun.midway.keeper.z, fun.midway.keeper.x - 2, fun.midway.keeper.z + 3, "serve"));
    const clerk = PEDS[1]!;
    ft.post(clerk.art, clerk.height, at(F.x + 18.85, F.z + 8, F.x + 14, F.z + 8, "serve"));

    // ---- HQ: shoppers work their way round the displays, try things on, come and go.
    const hq = this.rooms.hq;
    const H = ROOM.hq;
    const ht = (this.troupes.hq = new Troupe(hq.group, hq.solids, hq.floorY + 0.03, 5));
    const hqStops: Stop[] = hq.stands.map((st, i) => at(st.x + (i % 2 ? 0.75 : -0.75), st.z, st.x + (st.x - H.x) * 2, st.z + (st.z - H.z) * 2, "watch", { stay: [5, 11] }));
    hqStops.push(
      at(hq.counter.x - 1.9, hq.counter.z + 0.3, hq.kSpot.x, hq.kSpot.z, "watch"),
      at(hq.fitting.x + 1.3, hq.fitting.z - 0.5, hq.fitting.x, hq.fitting.z + 2, "inside", { stay: [8, 14] }),
      at(hq.exit.x + 1.4, hq.exit.z - 0.2, hq.exit.x, hq.exit.z + 3, "inside", { stay: [6, 12] }),
    );
    ht.stops(hqStops);
    const shopper = hand("fan");
    ht.roam(shopper.art, 1.7, hqStops);
    for (let i = 0; i < 3; i++) {
      const w = who();
      ht.roam(w.art, w.height, hqStops);
    }

    // ---- 901 Bowl: two lanes in play beside yours, people behind the seats, a line at the desk.
    const bowl = this.rooms.bowl;
    const B = ROOM.bowl;
    const bt = (this.troupes.bowl = new Troupe(bowl.group, bowl.solids, bowl.floorY + 0.03, 9));
    const pitch = LANE.width + LANE.gutter * 2 + 0.5;
    const ballGeo = new THREE.SphereGeometry(0.109, 16, 12);
    for (const [lane, color] of [
      [-1, 0xa3261c],
      [2, 0x1f4a8a],
    ] as const) {
      const lx = B.x + lane * pitch;
      const mesh = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.3 }));
      mesh.visible = false;
      mesh.position.set(lx, 0.19, B.z);
      bowl.group.add(mesh);
      const ball = { mesh, z: 0, end: B.z + LANE.pinZ, live: false };
      this.laneBalls.push(ball);
      const w = who();
      bt.roam(
        w.art,
        w.height,
        [
          at(lx + 0.45, B.z + 3.5, lx, B.z - 10, "watch", { stay: [4, 9] }),
          at(lx, B.z + 0.75, lx, B.z - 10, "throw", {
            on: () => {
              ball.live = true;
              ball.z = B.z - 0.2;
              if (this.place === "bowl") this.sound.roll();
            },
          }),
        ],
        true,
      );
    }
    const bowlStops: Stop[] = [-5.4, -2.6, 2.6].map((sx) => at(B.x + sx, B.z + 7.4, B.x + sx, B.z - 8, "cheer"));
    bowlStops.push(at(bowl.desk.x - 1.5, bowl.desk.z + 0.2, bowl.strikeSpot.x, bowl.strikeSpot.z, "watch"), at(bowl.exit.x - 1.4, bowl.exit.z - 0.1, bowl.exit.x, bowl.exit.z + 3, "inside", { stay: [6, 12] }));
    bt.stops(bowlStops);
    for (let i = 0; i < 3; i++) {
      const w = who();
      bt.roam(w.art, w.height, bowlStops);
    }

    // ---- The street: the truck lot, the plaza, the river rail, the doors on Lamar and Union.
    const st = (this.street = new Troupe(this.city.exterior, this.city.solids, null, 23));
    const lot: Stop[] = [];
    const offs = { catch: -13, velis: -1, brothers: 13 } as const;
    for (const id of ["catch", "velis", "brothers"] as const) {
      const wx = TRUCKS.x + offs[id] + 1.2;
      lot.push(at(wx - 1.2, TRUCKS.z - 3.5, wx, TRUCKS.z, "watch", { stay: [4, 8] }), at(wx + 1.1, TRUCKS.z - 3.8, wx, TRUCKS.z, "watch", { stay: [4, 8] }));
      // Whoever runs the truck is in the window: Veli's, the two brothers, the Catch.
      // The crew stand on the truck floor, high enough that the order they hold out clears the counter.
      const crew: [{ art: { front: string }; height: number }, number, number][] =
        id === "velis"
          ? [[VENDORS.veli, 0, 1.1]]
          : id === "brothers"
            ? [
                [VENDORS.brotherRed, -0.78, 1.1],
                [VENDORS.brotherBlue, 0.78, 1.1],
              ]
            : [[VENDORS.catch, 0, 1.02]];
      for (const [v, dx, floor] of crew) st.post(v.art, v.height, at(wx + dx, TRUCKS.z - 1.5, wx + dx, TRUCKS.z - 8, "serve", { lift: floor }), id);
    }
    for (const tx of [-14, -4, 6, 16]) lot.push(at(TRUCKS.x + tx - 1.75, TRUCKS.z - 9.5, TRUCKS.x + tx, TRUCKS.z - 9.5, "eat"), at(TRUCKS.x + tx + 1.75, TRUCKS.z - 9.5, TRUCKS.x + tx, TRUCKS.z - 9.5, "eat"));
    for (const [vx, vz] of [
      [4, -5.6],
      [5.8, -6.8],
      [7.4, -5.5],
    ] as const)
      lot.push(at(TRUCKS.x + vx, TRUCKS.z + vz, TRUCKS.x + 5.6, TRUCKS.z, "dance"));
    st.stops(lot);
    for (let i = 0; i < (few ? 6 : 10); i++) {
      const w = who();
      st.roam(w.art, w.height, lot);
    }
    const plaza: Stop[] = [
      [-24, -168.5],
      [-16.5, -167],
      [-11, -169.5],
      [-28, -165],
      [-3, -166],
      [8, -168],
    ].map(([px, pz]) => at(px!, pz!, HQ.doorX, HQ.frontZ, "watch"));
    plaza.push(at(HQ.doorX + 1.1, HQ.frontZ + 1.1, HQ.doorX, HQ.frontZ - 3, "inside", { stay: [10, 20] }), at(HQ.doorX - 1.2, HQ.frontZ + 1.2, HQ.doorX, HQ.frontZ - 3, "inside", { stay: [10, 20] }));
    st.stops(plaza);
    for (let i = 0; i < (few ? 3 : 5); i++) {
      const w = who();
      st.roam(w.art, w.height, plaza);
    }
    const rail: Stop[] = [];
    for (let x = -66; x <= 46; x += 14) rail.push(at(x, RIVER_Z + 2.4, x, RIVER_Z - 30, "watch", { stay: [5, 11] }));
    st.stops(rail);
    for (let i = 0; i < (few ? 2 : 4); i++) {
      const w = who();
      st.roam(w.art, w.height, rail);
    }
    // Beale Street: every block has its regulars, working along the storefronts and dancing outside the clubs.
    const beale = STREETS_Z[1];
    for (let bx = 0; bx < 4; bx++) {
      for (const side of [-1, 1]) {
        const x0 = STREETS_X[bx]! + ROAD_HALF + WALK + 3;
        const x1 = STREETS_X[bx + 1]! - ROAD_HALF - WALK - 3;
        const z = beale + side * (ROAD_HALF + 1.7);
        const block: Stop[] = [0.1, 0.36, 0.64, 0.9].map((t, i) => {
          const x = x0 + (x1 - x0) * t;
          // Odd stops look across the street, even ones at the windows behind them.
          return at(x, z, x + (i % 2 ? 1.5 : -1.5), i % 2 ? beale : z + side * 8, (i + bx) % 3 === 1 ? "dance" : "watch", { stay: [4, 10] });
        });
        st.stops(block);
        for (let i = 0; i < (few ? 1 : 2); i++) {
          const w = who();
          st.roam(w.art, w.height, block);
        }
      }
    }
    for (const d of [
      { x: FUN.doorX, z: FUN.frontZ, out: -1, spots: [-6, -4.4, -2.6, 3, 4.6, 6.4] },
      { x: BOWL.doorX, z: BOWL.frontZ, out: 1, spots: [-4.5, -2.8, 3.4, 5] },
    ]) {
      const door: Stop[] = d.spots.map((dx) => at(d.x + dx, d.z + d.out * 2.3, d.x, d.z, "watch"));
      door.push(at(d.x + 0.9, d.z + d.out * 0.9, d.x, d.z - d.out * 3, "inside", { stay: [12, 22] }), at(d.x - 0.9, d.z + d.out * 0.9, d.x, d.z - d.out * 3, "inside", { stay: [12, 22] }));
      st.stops(door);
      for (let i = 0; i < 3; i++) {
        const w = who();
        st.roam(w.art, w.height, door);
      }
    }

    // ---- Live music. The band on the stage in Handy Park, and the people who came out for it.
    const S = BEALE_STAGE;
    this.bealeBand = new StageBand(this.city.exterior, S.x, S.z - 0.5, Math.PI, S.top + 0.03, S.w - 4.2, S.d - 2.2, 1.16);
    const gig = (this.gig = new Troupe(this.city.exterior, this.city.solids, null, 37));
    const lip = S.z - S.d / 2;
    const pit: Stop[] = [
      ...[-5, -2.6, -0.4, 2, 4.4].map((dx, i) => at(S.x + dx, lip - 2.4 - (i % 2) * 1.3, S.x + dx * 0.4, S.z, "dance", { stay: [20, 44] })),
      ...[-6.5, -3.4, 0.8, 3.6, 6.8].map((dx, i) => at(S.x + dx, lip - 5.6 - (i % 2) * 1.1, S.x, S.z, i % 2 ? "cheer" : "watch", { stay: [16, 34] })),
      ...[-8, -1.5, 5.5].map((dx) => at(S.x + dx, lip - 9, S.x, S.z, "watch", { stay: [10, 22] })),
    ];
    gig.stops(pit);
    for (let i = 0; i < (few ? 5 : 9); i++) {
      const w = who();
      gig.roam(w.art, w.height, pit);
    }

    // ---- The Memphian: the house band, somebody at every table, a bar and a floor that never empties.
    const club = this.rooms.club;
    this.clubBand = new StageBand(club.group, club.stage.x, club.stage.z, club.stage.heading, club.stage.top, club.stage.w, club.stage.d, 1.06);
    const ct = (this.troupes.club = new Troupe(club.group, club.solids, club.floorY + 0.03, 41));
    let chair = 0;
    for (const t of club.tables) {
      for (const seat of few ? t.seats.slice(0, 1) : t.seats) {
        // Sat at the table, turned to the stage.
        const w = SITTERS[(chair++ * 3 + 1) % SITTERS.length]!;
        ct.post(w.art, w.height, at(seat.x, seat.z, seat.x, club.stage.z, "play"));
      }
    }
    const keep = PEDS[9 % PEDS.length]!;
    ct.post(keep.art, keep.height, at(club.barkeep.x, club.barkeep.z, club.bar.x, club.bar.z, "serve"));
    const dance = club.floor;
    const house: Stop[] = [
      ...[-2.9, -1.1, 0.8, 2.8].map((dx, i) => at(dance.x + dx, dance.z - 0.9 + (i % 2) * 1.5, club.stage.x, club.stage.z, "dance", { stay: [12, 26] })),
      ...[-2, 1.9].map((dx) => at(dance.x + dx, dance.z + 1.7, club.stage.x, club.stage.z, "dance", { stay: [10, 20] })),
      ...club.rail.map((r, i) => at(r.x, r.z, i < club.rail.length - 2 ? club.barkeep.x : club.stage.x, i < club.rail.length - 2 ? r.z : club.stage.z, i < club.rail.length - 2 ? "watch" : "cheer", { stay: [8, 18] })),
      at(club.exit.x + 1.5, club.exit.z - 0.4, club.exit.x, club.exit.z + 3, "inside", { stay: [8, 16] }),
    ];
    ct.stops(house);
    for (let i = 0; i < (few ? 4 : 7); i++) {
      const w = who();
      ct.roam(w.art, w.height, house);
    }

    // ---- The park. A regular at every table, people watching the games, walking the paths and sat by the fountain.
    let seat = 0;
    const sitter = () => SITTERS[(seat++ * 3 + 6) % SITTERS.length]!;
    for (const t of PARK_TABLES) {
      const w = sitter();
      // Sat on a stool at the table: the stool is in the drawing of them.
      st.post(w.art, w.height, at(t.x, t.z - 1.02, t.x, t.z, "play"));
      if (t.seats === 4) {
        for (const dx of [-1.02, 1.02]) {
          const o = sitter();
          st.post(o.art, o.height, at(t.x + dx, t.z, t.x, t.z, "play"));
        }
      }
    }
    const park: Stop[] = [
      ...PARK_TABLES.map((t, i) => at(t.x + (i % 2 ? 1.5 : -1.5), t.z + 0.4, t.x, t.z, "watch", { stay: [6, 14] })),
      at(PARK.cx - 4.6, PARK.cz + 4.6, PARK.cx, PARK.cz, "watch", { stay: [5, 12] }),
      at(PARK.cx + 4.8, PARK.cz - 4.4, PARK.cx, PARK.cz, "watch", { stay: [5, 12] }),
      at(PARK.cx, PARK.minZ + 4, PARK.cx, PARK.cz, "watch", { stay: [3, 6] }),
      at(PARK.cx, PARK.maxZ - 4, PARK.cx, PARK.cz, "watch", { stay: [3, 6] }),
      at(PARK.minX + 4, PARK.cz, PARK.cx, PARK.cz, "watch", { stay: [3, 6] }),
      at(PARK.maxX - 4, PARK.cz, PARK.cx, PARK.cz, "watch", { stay: [3, 6] }),
      at(-104.5, 76.2, -108, 71.5, "dance", { stay: [6, 12] }),
      at(-108.5, 92.4, -112, 96, "cheer", { stay: [5, 10] }),
      at(-87.6, 92, -86, 93.5, "eat", { stay: [8, 16] }),
    ];
    st.stops(park);
    for (let i = 0; i < (few ? 4 : 8); i++) {
      const w = who();
      st.roam(w.art, w.height, park);
    }
  }

  /** Everyone near a point jumps for a moment: the crowd outside, or whoever is in the room. */
  cheer(x: number, z: number, r: number, seconds = 1.3) {
    if (this.place === "street") {
      this.people.cheer(x, z, r, seconds);
      this.street.cheer(x, z, r, seconds);
    } else this.troupes[this.place]?.cheer(x, z, r, seconds);
  }

  private spot(place: Place, x: number, z: number, r: number, label: string | (() => string), act: () => void, when?: () => boolean) {
    const s: Spot = { place, x, z, r, label: typeof label === "string" ? () => label : label, act, when };
    this.spots.push(s);
    return s;
  }

  private wire() {
    const a = this.city.anchors;
    const { hq, home, bowl, fun } = this.rooms;

    // Doors.
    this.spot("street", a.hqDoor.x, a.hqDoor.z, 2.2, "Enter SackReligious HQ", () => this.enter("hq"));
    this.spot("hq", hq.exit.x, hq.exit.z, 1.5, "Step outside", () => this.leave(a.hqDoor.x, a.hqDoor.z + 1.2, 0));
    this.spot("street", a.homeDoor.x, a.homeDoor.z, 1.9, "Go inside", () => this.enter("home"));
    this.spot("home", home.exit.x, home.exit.z, 1.3, "Head out", () => this.leave(a.homeWalk.x, a.homeWalk.z, Math.PI));
    this.spot("street", a.bowlDoor.x, a.bowlDoor.z, 2.2, "Enter 901 Bowl", () => this.enter("bowl"));
    this.spot("bowl", bowl.exit.x, bowl.exit.z, 1.5, "Step outside", () => this.leave(a.bowlDoor.x, a.bowlDoor.z + 1.4, 0));
    this.spot("street", FUN.doorX, FUN.frontZ - 1.3, 2.4, "Enter the Fun House", () => {
      this.visitTickets = 0;
      this.enter("fun");
    });
    this.spot("fun", fun.exit.x, fun.exit.z, 1.6, "Step outside", () => this.leave(FUN.doorX, FUN.frontZ - 2.6, Math.PI));

    // Live music: the old picture house on Union, and the stage in Handy Park.
    const club = this.rooms.club;
    this.spot("street", MEMPHIAN.x, MEMPHIAN.z + 1.3, 2.4, "Enter The Memphian", () => this.enter("club"));
    this.spot("club", club.exit.x, club.exit.z, 1.5, "Step outside", () => this.leave(MEMPHIAN.x, MEMPHIAN.z + 2.4, 0));
    this.spot("club", club.request.x, club.request.z, 1.8, "Request a song · $5", () => this.requestSong());
    this.spot("club", club.bar.x, club.bar.z, 1.5, "Sweet tea at the bar · $4", () => this.barTea());
    this.spot("street", BEALE_STAGE.x, BEALE_STAGE.z - BEALE_STAGE.d / 2 - 1.3, 2, "Tip the band · $5", () => this.tipBand());

    // The coupe.
    this.carSpot = this.spot(
      "street",
      0,
      0,
      3.1,
      () => `Drive the ${rideById(this.save.ride).name}`,
      () => this.drive(),
      () => this.mode === "walk",
    );

    // HQ.
    this.spot(
      "hq",
      hq.counter.x,
      hq.counter.z,
      2.3,
      () => (this.stepId() === "meet" ? "Talk to K Blanco" : "Shop the line with K Blanco"),
      () => this.talkK(),
    );
    for (const s of hq.stands) {
      const p = productById(s.productId);
      if (!p) continue;
      this.spot("hq", s.x, s.z, 1.7, `Look at the ${p.name}`, () => this.openShop(p.id));
    }
    this.spot("hq", hq.fitting.x, hq.fitting.z, 1.6, "Fitting room", () => this.open("wardrobe"));

    // Home.
    this.spot("home", home.wardrobe.x, home.wardrobe.z, 1.5, "Open the closet", () => this.open("wardrobe"));
    this.spot("home", home.bed.x, home.bed.z, 1.6, "Rest a while", () => {
      this.transition(() => {
        this.sky.next();
        this.sky.setPhase(this.sky.phase, true);
        this.toast(this.sky.phase === "night" ? "You slept till dark." : this.sky.phase === "day" ? "Good morning, Memphis." : "Sun's going down.");
      });
    });

    // Court.
    this.spot(
      "street",
      a.ogSpot.x,
      a.ogSpot.z + 1.5,
      2.4,
      () => (this.save.flags.carrying ? "Hand Court OG the drop" : "Play ball: shootout, a game to 11, or practice"),
      () => {
        if (this.save.flags.carrying) {
          this.save.flags.carrying = false;
          this.say("Court OG", "That's the new drop? Lil' man came through. Now let me see that jumper.", null, "og-new-drop");
          this.emit("delivered");
          return;
        }
        this.open("court");
      },
    );

    // River.
    this.spot(
      "street",
      a.baitCounter.x,
      a.baitCounter.z,
      2.2,
      () => {
        const n = this.save.cooler.length;
        if (n) return `Sell ${n} fish for $${this.save.cooler.reduce((s, f) => s + f.pay, 0)}`;
        return "Buy 5 bait ($10)";
      },
      () => this.baitShop(),
    );
    a.castSpots.forEach((c) =>
      this.spot("street", c.x, c.z, 1.5, "Cast a line", () => {
        if (this.save.bait <= 0) {
          this.say("Unc J", "No bait, no fish. The shack's right there, nephew.", null, "unc-no-bait");
          this.sound.bad();
          return;
        }
        this.begin(this.fishing, "fish");
        this.fishing.start(c);
      }),
    );

    // Food, bowling, the strip.
    for (const truck of FOOD_TRUCKS) {
      const w = a.trucks.windows[truck.id];
      this.spot("street", w.x, w.z, 2.4, `Order at ${truck.name}`, () => {
        this.foodAt = truck.id;
        this.open("food");
      });
    }
    this.spot("street", a.trucks.screen.x, a.trucks.screen.z, 2.6, "Watch the video: Yung Veli, Go Girl", () => this.open("video"));
    // Pay at the desk or just step up to the lane: either starts a game.
    for (const [bx, bz, r] of [
      [bowl.desk.x, bowl.desk.z, 2.2],
      [bowl.lane.x, bowl.lane.z + 2.7, 2.1],
    ] as const) {
      this.spot("bowl", bx, bz, r, "Bowl a game ($5)", () => {
        if (!this.spend(5)) return;
        this.begin(this.bowling, "bowl");
        this.bowling.start();
      });
    }
    this.spot("street", RACE_MEET.x, RACE_MEET.z + 1.6, 2.6, "Race Nitro: 3 laps of downtown", () => {
      this.begin(this.race, "race");
      this.race.start();
    });

    // Fun House.
    for (const c of fun.cabinets) {
      const cab = CABINETS.find((k) => k.id === c.id);
      if (!cab) continue;
      this.spot("fun", c.x, c.z, 1.25, cab.link ? `${cab.name}: play it for real` : `Play ${cab.name}`, () => {
        if (cab.id === "whack") {
          this.begin(this.whack, "whack");
          this.whack.start();
        } else if (cab.id === "hoopfever") {
          this.begin(this.popshot, "hoops");
          this.popshot.start();
        } else {
          this.cabinet = cab.id;
          this.open("arcade");
        }
      });
    }
    this.spot("fun", fun.pinball.stand.x, fun.pinball.stand.z, 1.3, "Play Sack Pinball", () => {
      this.begin(this.pinball, "whack");
      this.pinball.start();
    });
    this.spot("fun", fun.skee.stand.x, fun.skee.stand.z, 1.3, "Roll Skee-Ball", () => {
      this.begin(this.skee, "whack");
      this.skee.start();
    });
    this.spot("fun", fun.wheel.stand.x, fun.wheel.stand.z, 1.6, "Pull the Spin-N-Win lever", () => {
      this.begin(this.wheel, "whack");
      this.wheel.start();
    });
    this.spot("fun", fun.hockey.stand.x, fun.hockey.stand.z, 1.2, "Play air hockey", () => {
      this.begin(this.hockey, "whack");
      this.hockey.start();
    });
    for (const [stall, label] of [
      [this.bottles, "Throw at the bottles"],
      [this.clowns, "Feed the clowns"],
      [this.bags, "Toss the bean bags"],
    ] as const) {
      const st = stall === this.bottles ? fun.midway.bottles.stand : stall === this.clowns ? fun.midway.clowns.stand : fun.midway.bags.stand;
      this.spot("fun", st.x, st.z, 0.95, label, () => {
        this.begin(stall, "whack");
        stall.start();
      });
    }
    this.spot("fun", fun.pizza.x, fun.pizza.z, 2, "Order pizza", () => {
      this.foodAt = "pizza";
      this.open("food");
    });
    this.spot("fun", fun.prizes.x, fun.prizes.z, 2, "Prize counter", () => this.open("prizes"));
    this.spot("fun", fun.pitEdge.x, fun.pitEdge.z, 1.8, "Jump in the ball pit", () => {
      this.begin(this.pit, "pit");
      this.pit.start();
    });
    this.spot("fun", fun.trampEdge.x, fun.trampEdge.z, 1.8, "Get on the trampoline", () => {
      this.begin(this.bounce, "bounce");
      this.bounce.start();
    });
    // The arena door: his rank, his record and the choice of blaster, then in.
    this.spot("fun", fun.laserDoor.x, fun.laserDoor.z, 1.8, "Laser tag: green against pink", () => this.open("loadout"));
    // The park: walk up to the open seat at any table.
    for (const t of PARK_TABLES) this.spot("street", t.x, t.z + 1.2, 1.25, `Sit down: ${t.name}`, () => this.board.sit(t.id));
    // The rec grounds on Park Avenue.
    this.spot("street", PUTT_STAND.x, PUTT_STAND.z, 2, "Putt-putt: nine holes", () => {
      this.transition(() => {
        this.begin(this.putt, "whack");
        this.putt.start();
      });
    });
    this.spot("street", TENNIS_GATE.x, TENNIS_GATE.z, 2, "Tennis: first to three games", () => {
      this.transition(() => {
        this.begin(this.tennis, "whack");
        this.tennis.start();
      });
    });
    // Cornhole can be started from anywhere on its lawn: by the sign and Mr. Willie, down the lane, or at the far board.
    for (const [cx, cz, cr] of [
      [CORNHOLE.x - 0.4, CORNHOLE.nearZ + 1.6, 2.6],
      [CORNHOLE.x, (CORNHOLE.nearZ + CORNHOLE.farZ) / 2, 2.5],
      [CORNHOLE.x, CORNHOLE.farZ - 0.8, 2.3],
    ] as const)
      this.spot("street", cx, cz, cr, "Cornhole: first to 21", () => {
        this.transition(() => {
          this.begin(this.cornhole, "whack");
          this.cornhole.start();
        });
      });
    // The playground: the swing he can ride, and the slide.
    this.spot("street", SWING.x, SWING.z, 1.15, "Get on the swing", () => {
      this.begin(this.swings, "whack");
      this.swings.start();
    });
    this.spot("street", SLIDE.x, SLIDE.z - 1.7, 1.2, "Go down the slide", () => {
      this.begin(this.slide, "whack");
      this.slide.start();
    });
    // The speedboat tied up at the pier.
    this.spot("street", BOARD.x, BOARD.z, 1.5, "Take the boat out", () => {
      this.transition(() => {
        this.begin(this.boat, "kart");
        this.boat.start();
      });
    });

    this.spot("fun", fun.kartDoor.x, fun.kartDoor.z, 1.8, "Go-karts: 5 laps", () => {
      this.transition(() => {
        this.setPlace("street");
        this.begin(this.kart, "kart");
        this.kart.start();
      });
    });
  }

  // ---------------------------------------------------------------- flow

  /** Title screen button. */
  play(fresh: boolean) {
    this.sound.unlock();
    if (fresh) {
      this.save = freshSave();
      this.hasSave = false;
      this.coins.reset(this.save.flags);
      this.benji.setArt(OUTFITS.starter.art);
      this.driver.reset(CAR_START.x, CAR_START.z, CAR_START.heading);
      this.car = this.buildCar(this.save.ride);
      this.placeCar();
    }
    const s = this.save;
    this.rollDaily();
    const resume = !fresh && this.hasSave && s.step > 0;
    this.pos.x = resume ? s.x : START.x;
    this.pos.z = resume ? s.z : START.z;
    this.heading = resume ? s.heading : START.heading;
    this.camYaw = resume ? s.heading : Math.PI;
    this.mode = "walk";
    this.setPlace("street");
    this.snapCamera();
    this.sound.ui();
    if (!resume) this.startIntro();
    // A link from a friend, or a crew a refresh cut off: straight back in.
    this.crew.resume();
    this.push();
  }

  /**
   * The opening: the lens comes in low over the river, through the M bridge, swings past the
   * Pyramid and round the boutique, and lands behind Benji where the day is played from.
   */
  private startIntro() {
    if (typeof location !== "undefined" && new URLSearchParams(location.search).get("intro") === "0") return this.endIntro();
    const end = this.camera.position.clone();
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    const eye = new THREE.Vector3(this.pos.x + fx * 1.5, this.benji.group.position.y + 1.5, this.pos.z + fz * 1.5);
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.intro = {
      t: 0,
      path: new THREE.CatmullRomCurve3([V(-275, 17, -240), V(-196, 21, -238), V(-122, 26, -226), V(-76, 15, -178), V(-45, 10, -158), V(-28, 4.4, -147), end], false, "centripetal"),
      aim: new THREE.CatmullRomCurve3([V(-100, 24, -262), V(0, 26, -300), V(132, 30, -394), V(-18, 8, -180), V(-17, 6, -174), V(this.pos.x, 2, this.pos.z - 0.5), eye], false, "centripetal"),
      card: -1,
    };
    this.cinema = { title: "", sub: "" };
    this.input.locked = true;
    this.runIntro(0);
  }

  private runIntro(dt: number) {
    const it = this.intro;
    if (!it) return;
    const T = 11.5;
    it.t += dt;
    const input = this.input;
    if (it.t >= T || (it.t > 0.6 && (input.hitRaw("interact") || input.hitRaw("action") || input.hitRaw("pause") || input.hitRaw("back")))) return this.endIntro();
    const u = clamp(it.t / T, 0, 1);
    // Away gently, and slower still into the landing.
    const e = u * u * (3 - 2 * u);
    it.path.getPoint(e, this.camera.position);
    it.aim.getPoint(e, _look);
    this.camera.lookAt(_look);
    const fov = 40 + 6 * e;
    if (Math.abs(this.camera.fov - fov) > 0.02) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const card = it.t > 0.8 && it.t < 4.3 ? 0 : it.t > 5 && it.t < 9.8 ? 1 : -1;
    if (card !== it.card) {
      it.card = card;
      if (card === 0) this.sound.voice("call-welcome");
      this.cinema = card === 0 ? { title: "MEMPHIS", sub: "TENNESSEE · THE 901" } : card === 1 ? { title: "SACKRELIGIOUS", sub: "DROP DAY" } : { title: "", sub: "" };
      this.push();
    }
  }

  /** Any button or a tap lands the lens straight away. */
  skipIntro() {
    if (this.intro) this.endIntro();
  }

  private endIntro() {
    this.intro = null;
    this.cinema = null;
    this.input.locked = false;
    this.input.clear();
    this.camera.fov = 46;
    this.camera.updateProjectionMatrix();
    this.snapCamera();
    this.say("K Blanco", "Benji! It's Drop Day. Come inside, I got something for you.", CAST.kBlanco.portrait, "k-drop-day");
    this.push();
  }

  /**
   * Something worth a roar: 1 a strike or a big fish, 2 a win, 3 a win the whole river hears.
   * The picture slows for a beat, paper flies, and outdoors the big ones light the sky.
   */
  moment(level: 1 | 2 | 3) {
    this.slowLeft = level === 1 ? 0.5 : level === 2 ? 0.9 : 1.15;
    this.slowDeep = level === 1 ? 0.45 : 0.3;
    this.party(level);
    this.sound.cheer();
    // On his own feet with nothing else in his hands, the fist goes up.
    if (!this.activity && this.mode === "walk") this.fistLeft = level === 1 ? 1.5 : 2.4;
    if (level >= 2) {
      this.sound.fanfare();
      this.crew.celebrate(level);
    }
    this.buzz(level === 1 ? 45 : [45, 60, 140]);
    if (level === 3 && !this.room) {
      this.camera.getWorldDirection(_v);
      this.fireworks.show(this.camera.position, _v, this.stage.quality === "low" ? 4 : 7);
    }
  }

  /** The picture slows for `seconds` and nothing else happens: a shot that could win it, in the air. */
  hold(seconds: number, depth: number) {
    if (this.slowLeft > seconds) return;
    this.slowLeft = seconds;
    this.slowDeep = depth;
  }

  /** Photo mode: the day stops and the lens comes round in front of him. */
  openPhoto() {
    this.photo.yaw = this.camYaw + Math.PI + 0.55;
    this.photo.pitch = 0.14;
    this.photo.dist = this.room ? 3.6 : this.mode === "drive" ? 7.5 : 5.2;
    this.open("photo");
  }

  /** Photo mode: fist up for the picture, or back down. */
  photoPose() {
    if (!this.benji.has("cheer")) return;
    this.posing = !this.posing;
    this.sound.ui();
    this.push();
  }

  photoOrbit(dx: number, dy: number) {
    this.photo.yaw -= dx;
    this.photo.pitch = clamp(this.photo.pitch + dy, -0.1, 1.25);
  }

  photoZoom(d: number) {
    this.photo.dist = clamp(this.photo.dist + d, 1.6, this.room ? 7 : 18);
  }

  private photoCamera() {
    const ph = this.photo;
    const car = this.mode === "drive";
    const tx = car ? this.driver.x : this.pos.x;
    const tz = car ? this.driver.z : this.pos.z;
    const room = this.room;
    const y0 = (room ? room.floorY : this.benji.group.position.y) + (car ? 0.8 : 1.0);
    const flat = Math.cos(ph.pitch);
    const fx = Math.sin(ph.yaw) * flat;
    const fz = Math.cos(ph.yaw) * flat;
    // This side of any wall, and inside the room when there is one.
    const d = ph.dist * clamp(sight(tx, tz, tx + fx * ph.dist, tz + fz * ph.dist, this.solids, 0.35), 0.25, 1);
    let x = tx + fx * d;
    let z = tz + fz * d;
    if (room) {
      x = clamp(x, room.bounds.minX + 0.4, room.bounds.maxX - 0.4);
      z = clamp(z, room.bounds.minZ + 0.4, room.bounds.maxZ - 0.4);
    }
    this.camera.position.set(x, y0 + 0.2 + Math.sin(ph.pitch) * d, z);
    _look.set(tx, y0, tz);
    this.camera.lookAt(_look);
    if (this.camera.fov !== 42) {
      this.camera.fov = 42;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Draws the scene as the lens has it now and hands the canvas back, to be copied at once. */
  shoot() {
    this.stage.render();
    return this.stage.renderer.domElement;
  }

  /** A picture was taken in photo mode. */
  photoTaken() {
    this.emit("photo");
    if (this.room) return;
    const flags = this.save.flags;
    const card = POSTCARDS.find((c) => !flags[`card_${c.id}`] && Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < c.r);
    if (!card) return;
    flags[`card_${card.id}`] = true;
    const got = POSTCARDS.filter((c) => flags[`card_${c.id}`]).length;
    if (got === POSTCARDS.length) {
      const paid = this.earn(300, 20, { quiet: true });
      this.moment(3);
      this.reveal({ img: postcardImg(card.id), kicker: `All ${got} postcards`, title: card.name, sub: `Memphis is yours.  +$${paid.dollars}`, round: false }, 7);
    } else {
      const paid = this.earn(40, 4, { quiet: true });
      this.sound.cash();
      this.reveal({ img: postcardImg(card.id), kicker: `Postcard ${got} of ${POSTCARDS.length}`, title: card.name, sub: `+$${paid.dollars}  ·  it is in your album`, round: false }, 5.5);
    }
    this.persist();
    this.push();
  }

  /** Confetti, and nothing else. */
  party(level: 1 | 2 | 3) {
    this.partyAt = this.time;
    this.live.partyLevel = level;
    this.live.party += 1;
  }

  /** A buzz in the hand, on phones that have one. */
  buzz(pattern: number | number[]) {
    if (!this.buzzOn || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers refuse until the page has been touched.
    }
  }

  setBuzz(on: boolean) {
    this.buzzOn = on;
    try {
      localStorage.setItem("sack-v2-buzz", on ? "1" : "0");
    } catch {
      // Not saved; it still holds for this visit.
    }
    if (on) this.buzz(40);
    this.push();
  }

  begin(activity: Activity, mode: Mode) {
    this.activity = activity;
    this.mode = mode;
    this.vel.x = 0;
    this.vel.z = 0;
    this.benji.speed = 0;
    this.push();
  }

  /** Take a blaster off the rack at the arena door. */
  pickBlaster(id: string) {
    if (this.laser.choose(id)) this.sound.ui();
    else this.sound.bad();
    this.persist();
    this.push();
  }

  /** Whether the blaster fires by itself on a touch screen. */
  toggleAutoFire() {
    this.laser.toggleAuto();
    this.sound.ui();
    this.persist();
    this.push();
  }

  /** Through the arena door and into a match. */
  deploy() {
    if (this.overlay === "loadout") this.close();
    this.transition(() => {
      this.setPlace("laser");
      this.begin(this.laser, "laser");
      this.laser.start();
    });
  }

  /** Activity is over: hand the controls back. */
  end(mode: Mode = "walk") {
    this.activity = null;
    this.mode = mode;
    this.live.meter = 0;
    this.live.tension = 0;
    this.live.cue = 999;
    this.live.turn = -1;
    this.benji.pose = null;
    this.benji.lift = 0;
    this.benji.tilt = 0;
    this.benji.visible = mode !== "drive";
    this.stage.setPunch(0);
    this.sound.duck(false);
    this.snapCamera();
    this.persist();
    this.push();
  }

  showResults(r: Results, again: (() => void) | null, close: () => void) {
    this.results = r;
    this.onAgain = again;
    this.onResultsClose = close;
    this.overlay = "results";
    this.input.locked = true;
    // A win or a record comes up under confetti, unless the moment itself just threw some.
    if ((r.win || r.record) && this.time - this.partyAt > 2.5) {
      this.party(2);
      this.buzz([45, 60, 140]);
    }
    if (r.win) this.sound.voice("call-win");
    else if (r.record) this.sound.voice("call-new-record");
    this.push();
    if (this.input.pad) setTimeout(() => this.onNav?.("init"), 60);
  }

  resultsAgain() {
    const f = this.onAgain;
    this.overlay = null;
    this.results = null;
    this.input.locked = false;
    this.input.clear();
    this.sound.ui();
    f?.();
    this.push();
  }

  open(o: Overlay) {
    this.overlay = o;
    this.input.locked = o !== null;
    this.input.clear();
    this.sound.ui();
    this.sound.duck(o === "arcade");
    this.sound.hush(o === "video");
    this.push();
    if (this.input.pad) setTimeout(() => this.onNav?.("init"), 60);
  }

  /**
   * Somebody in the crew has just won something in their Memphis. This one hears about it:
   * a call-out, the people round them jump if they are in sight, and the biggest wins put
   * a few shells up over this river too.
   */
  crewWin(name: string, level: 2 | 3, near: { x: number; z: number } | null) {
    this.toast(level === 3 ? `${name} just won big` : `${name} just got a win`, 3.2);
    this.sound.cheer();
    if (near) this.cheer(near.x, near.z, 14, 1.6);
    if (level === 3 && !this.room && this.mode !== "title") {
      this.camera.getWorldDirection(_v);
      this.fireworks.show(this.camera.position, _v, this.stage.quality === "low" ? 2 : 3);
    }
  }

  /** Whoever is close enough to speak to: on the street, or in the room he is in. */
  private someone(): Talker | null {
    const { x, z } = this.pos;
    const r = 1.9;
    // One of the named cast, standing where no errand of theirs is in reach.
    for (const n of this.npcs) if (n.place === this.place && Math.hypot(n.x - x, n.z - z) < 2.2) return { key: n.id, card: n.card, x: n.x, z: n.z, doing: "cast" };
    if (this.place !== "street") return this.troupes[this.place]?.nearest(x, z, r, `${this.place}-`) ?? null;
    const a = this.people.nearest(x, z, r);
    const b = this.street.nearest(x, z, r, "t");
    if (a && b) return Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b;
    return a ?? b;
  }

  /** They stop, turn to him and say their piece: something new each time he asks. */
  private talkTo(who: Talker, name: string) {
    const turn = this.talks.get(who.key) ?? 0;
    this.talks.set(who.key, turn + 1);
    if (who.doing === "cast") {
      const c = CAST[who.key as CastId];
      this.dialogue.length = 0;
      this.say(c.name, castLine(who.key, turn), c.portrait ?? who.card.face);
      this.sound.ui();
      return;
    }
    const rank = rankOf(this.save.respect);
    const text = chat(
      who.key,
      {
        doing: who.doing,
        district: districtAt(this.pos.x, this.pos.z),
        place: this.place,
        phase: this.sky.phase,
        rain: this.weather.want > 0,
        rank: rank.name,
        rankIndex: rank.index,
        fit: OUTFITS[this.save.wearing].name.split(" · ")[0]!,
        ride: rideById(this.save.ride).name,
      },
      turn,
    );
    if (who.key[0] === "w" || who.key[0] === "s") this.people.hail(who.key, 5);
    else if (who.key[0] === "t") this.street.hail(who.key, "t", 5);
    else if (this.place !== "street") this.troupes[this.place]?.hail(who.key, `${this.place}-`, 5);
    this.dialogue.length = 0;
    this.say(name, text, who.card.face);
    this.sound.ui();
  }

  /** His fist in the air for a moment, if he is standing about on foot. */
  fistUp(seconds: number) {
    if (!this.activity && this.mode === "walk") this.fistLeft = Math.max(this.fistLeft, seconds);
  }

  /** Court OG's table: which game to run. */
  playBall(kind: HoopsKind) {
    this.close();
    this.transition(() => {
      this.begin(this.hoops, "hoops");
      this.hoops.start(kind);
    });
  }

  /** A game inside a cabinet's browser takes the pad and the speakers, and gives them back. */
  webPlay(on: boolean) {
    this.webOn = on;
    this.input.padOff = on;
    this.sound.hush(on);
  }

  /** Another tab in the cabinet's browser. */
  swapCabinet(id: string) {
    if (this.overlay !== "arcade" || !CABINETS.some((c) => c.id === id && c.link)) return;
    this.cabinet = id;
    this.sound.ui();
    this.push();
  }

  close() {
    const was = this.overlay;
    this.webPlay(false);
    this.overlay = null;
    this.input.locked = false;
    this.input.clear();
    this.sound.duck(false);
    if (was === "photo") {
      this.posing = false;
      this.camera.fov = this.room ? 52 : 46;
      this.camera.updateProjectionMatrix();
      this.snapCamera();
    }
    if (was === "table") this.board.leave();
    if (was === "results") {
      const f = this.onResultsClose;
      this.results = null;
      this.onAgain = null;
      this.onResultsClose = null;
      f?.();
    }
    this.cabinet = null;
    this.push();
  }

  private openShop(focus: string | null) {
    this.shopFocus = focus;
    this.open("shop");
  }

  /** Fade to black, run `swap`, fade back. */
  transition(swap: () => void) {
    if (this.afterFade) return;
    this.fadeTo = 1;
    this.afterFade = swap;
    this.sound.door();
  }

  enter(place: Exclude<Place, "street" | "laser">) {
    this.transition(() => {
      this.setPlace(place);
      const r = this.rooms[place];
      this.pos.x = r.spawn.x;
      this.pos.z = r.spawn.z;
      this.heading = r.spawn.heading;
      this.camYaw = r.spawn.heading;
      this.vel.x = this.vel.z = 0;
      this.snapCamera();
      if (place === "hq") this.emit("entered_hq");
      if (place === "fun" && !this.save.flags.seenFun) {
        this.save.flags.seenFun = true;
        this.toast("Win tickets at any game, then cash them at the prize counter.", 5);
      }
    });
  }

  leave(x: number, z: number, heading: number) {
    this.transition(() => {
      this.setPlace("street");
      this.pos.x = x;
      this.pos.z = z;
      this.heading = heading;
      this.camYaw = heading;
      this.vel.x = this.vel.z = 0;
      this.snapCamera();
    });
  }

  setPlace(place: Place) {
    for (const r of Object.values(this.rooms)) r.group.visible = false;
    this.place = place;
    this.room = place === "street" ? null : this.rooms[place];
    if (this.room) this.room.group.visible = true;
    const out = !this.room;
    this.city.exterior.visible = out;
    this.sky.sun.visible = out;
    this.sky.dome.visible = out;
    this.push();
  }

  /** Put Benji somewhere in the current place. */
  warp(x: number, z: number, heading: number) {
    this.pos.x = x;
    this.pos.z = z;
    this.heading = heading;
    this.camYaw = heading;
    this.vel.x = this.vel.z = 0;
    this.benji.place(x, z);
    this.benji.heading = heading;
    this.snapCamera();
  }

  get solids(): Solid[] {
    return this.room ? this.room.solids : this.city.solids;
  }

  get floorY(): number | null {
    return this.room ? this.room.floorY + 0.03 : null;
  }

  // ---------------------------------------------------------------- economy and story

  stepId() {
    return STORY[this.save.step]?.id ?? "";
  }

  wearing(id: OutfitId) {
    return this.save.wearing === id;
  }

  /** Pay out with every bonus applied. Returns what was actually paid. */
  earn(dollars: number, respect: number, opts: { quiet?: boolean; race?: boolean } = {}) {
    const was = rankOf(this.save.respect);
    let d = dollars * (1 + (this.save.owned.length - 1) * COLLECTION_BONUS) * (1 + was.index * RANK_PAY);
    if (this.time < this.fedUntil) d *= 1.1;
    if (opts.race && this.wearing("tour_black")) d *= 1.1;
    let r = respect;
    if (this.wearing("tour_white")) r *= 1.1;
    const dd = Math.round(d);
    const rr = Math.round(r);
    this.save.dollars += dd;
    this.save.respect += rr;
    if (dd > 0 && !opts.quiet) this.sound.cash();
    // A new name in the city's mouth.
    const now = rankOf(this.save.respect);
    if (now.index > was.index) {
      this.rankUp = { name: now.name, left: 0.9 };
    }
    return { dollars: dd, respect: rr };
  }

  spend(cost: number) {
    if (this.save.dollars < cost) {
      this.toast(`You need $${cost}. Hoops, fish and races all pay.`);
      this.sound.bad();
      return false;
    }
    this.save.dollars -= cost;
    if (cost > 0) this.sound.cash();
    this.push();
    return true;
  }

  winTickets(n: number) {
    const won = Math.round(n * (this.wearing("doll") ? 1.25 : 1));
    this.save.tickets += won;
    this.visitTickets += won;
    this.emit("tickets", this.visitTickets);
    return won;
  }

  /** A new day brings a new drop; a day missed ends the run. */
  private rollDaily() {
    const d = this.save.daily;
    const today = dayKey();
    if (d.day !== today) {
      d.day = today;
      d.done = false;
    }
    if (d.last !== today && d.last !== dayBefore(today)) d.streak = 0;
    return dailyFor(today);
  }

  private checkDaily(kind: string, n: number, extra: number) {
    const d = this.save.daily;
    const job = this.rollDaily();
    if (this.calm || d.done || !meets(job.goal, kind, n, extra)) return;
    d.done = true;
    d.streak += 1;
    d.last = d.day;
    const got = this.earn(dailyPay(d.streak), 6, { quiet: true });
    this.moment(2);
    this.toast(`Today's drop done: ${job.title}  +$${got.dollars}${d.streak > 1 ? `  ·  ${d.streak} days running` : ""}`, 5);
    this.persist();
  }

  /** Something happened. Moves the story and the bounty board along. */
  emit(kind: string, n = 0, extra = 0) {
    this.checkDaily(kind, n, extra);
    const step = STORY[this.save.step];
    const want = step?.done;
    const hit =
      (want === "entered_hq" && kind === "entered_hq") ||
      (want === "met_k" && kind === "met_k") ||
      (want === "delivered" && kind === "delivered") ||
      (want === "hoops_10" && kind === "hoops" && n >= 10) ||
      (want === "fish_1" && kind === "fish") ||
      (want === "ate" && kind === "ate") ||
      (want === "bowled" && kind === "bowl") ||
      (want === "raced" && kind === "race" && n === 1) ||
      (want === "fun_tickets" && kind === "tickets" && n >= 40) ||
      (want === "bought" && kind === "bought") ||
      (want === "wore" && kind === "wore");
    // After the Drop Day a step names what has to happen, how big, and how many times.
    const goal = step?.goal;
    let met = false;
    if (goal && kind === goal.kind && n >= (goal.n ?? -Infinity) && n <= (goal.max ?? Infinity) && extra >= (goal.extra ?? -Infinity)) {
      this.save.count += 1;
      met = this.save.count >= (goal.times ?? 1);
    }
    // Nothing left on the streets to pick up: the errand is done.
    if (goal?.kind === "coin" && kind === "coin" && this.coins.left === 0) met = true;
    if (step && (hit || met)) {
      const got = this.earn(step.pay, step.respect, { quiet: true });
      const from = chapterOf(this.save.step);
      this.save.step++;
      this.save.count = 0;
      this.sound.cheer();
      const next = STORY[this.save.step];
      const to = chapterOf(this.save.step);
      this.toast(`${step.title}: done${got.dollars ? `  +$${got.dollars}` : ""}  +${got.respect} Respect`, 4);
      if (!next) {
        this.moment(3);
        this.say("K Blanco", "Look at you. Drop Day was the audition. This city has your name on it now.", CAST.kBlanco.portrait, "k-finale");
        this.say("K Blanco", STORE_REWARD.code ? `One more thing. ${STORE_REWARD.note || "Take this to the real store."}  Code: ${STORE_REWARD.code}` : "The board is yours from here. There is always work in Memphis.", CAST.kBlanco.portrait, STORE_REWARD.code ? "" : "k-board-is-yours");
      } else {
        if (to && from && to.name !== from.name) {
          // A chapter closed.
          this.moment(3);
          this.say("K Blanco", from.name === "THE DROP DAY" ? "You ran the whole Drop Day. Now the city knows your face. Keep your phone on." : "Half of Memphis is wearing the brand because of you. The other half is about to.", CAST.kBlanco.portrait, from.name === "THE DROP DAY" ? "k-chapter-one" : "k-chapter-two");
        }
        if (next.who && next.line) this.say(next.who, next.line, next.who === "K Blanco" ? CAST.kBlanco.portrait : null, `step-${next.id}`);
        if (next.done === "bought" && this.save.owned.length > 1) this.emit("bought");
        else if (next.done === "wore" && this.save.wearing !== "starter") this.emit("wore");
      }
      this.persist();
    } else if (!step) {
      const b = BOUNTIES[this.save.bounty % BOUNTIES.length]!;
      const done =
        (b.id === "hoops_20" && kind === "hoops" && n >= 20) ||
        (b.id === "hoops_fire" && kind === "hoops" && extra >= 5) ||
        (b.id === "fish_big" && kind === "fish" && n >= 8) ||
        (b.id === "fish_5" && kind === "fish" && extra >= 5) ||
        (b.id === "bowl_120" && kind === "bowl" && n >= 120) ||
        (b.id === "strike_3" && kind === "bowl" && extra >= 3) ||
        (b.id === "race_win" && kind === "race" && n === 1) ||
        (b.id === "tickets_80" && kind === "tickets" && n >= 80);
      if (done) {
        const got = this.earn(b.pay, b.respect, { quiet: true });
        this.save.bounty++;
        this.sound.cheer();
        this.toast(`Bounty paid: ${b.title}  +$${got.dollars}  +${got.respect} Respect`, 4);
        this.persist();
      }
    }
    this.push();
  }

  private talkK() {
    if (this.stepId() === "crown") {
      if (this.wearing("sackrow_11")) return this.emit("crown");
      this.say("K Blanco", "Where is the eleven? The fitting room is right there. I'll wait.", CAST.kBlanco.portrait, "k-where-is-the-eleven");
      return;
    }
    if (this.stepId() === "meet") {
      this.save.flags.carrying = true;
      this.say("K Blanco", "Fresh off the press. Run this box to Court OG at the 901 Court, east on the river.", CAST.kBlanco.portrait, "k-fresh-off-the-press");
      this.say("K Blanco", "And Benji, everything on these walls is real. Pick a piece, wear it out.", CAST.kBlanco.portrait, "k-on-these-walls");
      this.emit("met_k");
      return;
    }
    this.openShop(null);
  }

  private baitShop() {
    const s = this.save;
    if (s.cooler.length) {
      const total = s.cooler.reduce((sum, f) => sum + f.pay, 0);
      const got = this.earn(total, Math.min(6, s.cooler.length));
      this.toast(`Sold ${s.cooler.length} fish  +$${got.dollars}`);
      s.cooler = [];
      this.persist();
      this.push();
      return;
    }
    if (!this.spend(10)) return;
    s.bait += 5;
    this.toast("5 bait. Go get 'em.");
    this.push();
  }

  // ---------------------------------------------------------------- UI calls

  buy(id: string) {
    const p = productById(id);
    if (!p || this.save.owned.includes(id)) return;
    if (!this.spend(p.cost)) return;
    this.save.owned.push(id);
    if (p.wear && !this.save.outfits.includes(p.wear)) this.save.outfits.push(p.wear);
    this.toast(p.wear ? `${p.name} is yours. Put it on in the fitting room.` : `${p.name} is yours. Every piece raises your payouts.`, 4);
    this.emit("bought");
    this.persist();
    this.push();
  }

  /** A fit earned by doing something, not bought. */
  award(id: OutfitId) {
    if (this.save.outfits.includes(id)) return false;
    this.save.outfits.push(id);
    this.toast(`${OUTFITS[id].name} unlocked. It's in your closet at the HQ.`, 5);
    this.sound.cash();
    this.persist();
    this.push();
    return true;
  }

  wear(id: OutfitId) {
    if (!this.save.outfits.includes(id)) return;
    this.save.wearing = id;
    this.benji.setArt(OUTFITS[id].art);
    this.sound.ui();
    if (id !== "starter") this.emit("wore");
    this.persist();
    this.push();
  }

  order(id: string) {
    const f = FOOD.find((x) => x.id === id);
    if (!f) return;
    let plate = f.name;
    if (f.fish) {
      // The house truck cooks what you caught: the best fish in the cooler goes on the grill.
      const cooler = this.save.cooler;
      if (!cooler.length) {
        this.sound.bad();
        this.toast("Nothing in the cooler. Catch something off the pier and bring it back.", 4);
        return;
      }
      if (!this.spend(f.cost)) return;
      const best = cooler.reduce((a, b) => (b.pay > a.pay ? b : a));
      cooler.splice(cooler.indexOf(best), 1);
      plate = `Blackened ${best.name}`;
    } else if (!this.spend(f.cost)) return;
    this.fedUntil = this.time + f.seconds;
    // Whoever is in the window hands it over.
    if (this.place === "street") this.street.serveAt(this.pos.x, this.pos.z);
    else this.troupes[this.place]?.serveAt(this.pos.x, this.pos.z);
    if (f.respect) this.earn(0, f.respect, { quiet: true });
    this.toast(`${plate}. ${f.line}`, 4);
    this.emit("ate");
    this.close();
  }

  /** Coins: bank the ones Benji runs or drives through. A quick string of them pays a little more each. */
  private updateCoins(dt: number, paused: boolean) {
    if (this.room || this.mode === "title") return;
    const riding = this.mode === "drive" || this.mode === "race";
    const free = !paused && (this.mode === "walk" || riding);
    const got = this.coins.update(this.time, riding ? this.driver.x : this.pos.x, riding ? this.driver.z : this.pos.z, free ? (riding ? 2.6 : 1.35) : 0, this.save.flags);
    this.coinRunLeft -= dt;
    if (this.coinRunLeft <= 0) this.coinRun = 0;
    if (!got) return;
    for (let i = 0; i < got; i++) {
      this.coinRun++;
      this.earn((5 + Math.min(10, this.coinRun - 1)) * (this.wearing("fresh_blue") ? 2 : 1), 0, { quiet: true });
      if (STORY[this.save.step]?.goal?.kind === "coin") this.emit("coin", 1);
    }
    this.coinRunLeft = 4;
    this.sound.cash();
    const have = this.coins.total - this.coins.left;
    if (have >= 100) this.award("fresh_blue");
    if (this.coins.left === 0) {
      // Every coin in Memphis: a real payout, and they all come back.
      const bonus = this.earn(500, 25);
      this.coins.reset(this.save.flags);
      this.toast(`Every coin in Memphis. +$${bonus.dollars} and they're back out.`, 5);
    } else if (have % 25 === 0) {
      const bonus = this.earn(60, 3, { quiet: true });
      this.toast(`${have} coins banked  +$${bonus.dollars} bonus  ·  ${this.coins.left} still out there`, 3.5);
    } else this.toast(this.coinRun > 1 ? `Coin x${this.coinRun}  +$${5 + Math.min(10, this.coinRun - 1)}   ${have}/${this.coins.total}` : `Coin  +$5   ${have}/${this.coins.total}`, 1.6);
  }

  /**
   * Veli's screen. The video runs whenever Benji is on the lot and its sound comes up as he
   * walks toward it, with the city's own music stepping back so the track is the one you hear.
   */
  private updateVeli(dt: number) {
    const scr = this.city.anchors.trucks.screen;
    const out = !this.room && this.mode !== "title";
    const px = this.mode === "drive" || this.mode === "race" ? this.driver.x : this.pos.x;
    const pz = this.mode === "drive" || this.mode === "race" ? this.driver.z : this.pos.z;
    const d = out ? Math.hypot(px - scr.x, pz - scr.z) : 999;
    if (!this.veli && d < 80 && typeof document !== "undefined") {
      const video = document.createElement("video");
      video.src = FOOD_TRUCKS.find((t) => t.video)!.video!.src;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("playsinline", "true");
      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.veli = { video, tex };
      video.addEventListener("playing", () => {
        if (scr.mat.map !== tex) {
          scr.mat.map = tex;
          scr.mat.needsUpdate = true;
        }
      });
    }
    const v = this.veli;
    if (!v) return;
    // Watching it full size, in a menu, or far away: the screen on the lot rests.
    const on = d < 70 && this.overlay !== "video";
    let want = 0;
    if (on) {
      if (v.video.paused) void v.video.play().catch(() => undefined);
      want = this.sound.musicOn && this.overlay === null ? clamp(1 - (d - 5) / 30, 0, 1) : 0;
    } else if (!v.video.paused) v.video.pause();
    this.veliVol += clamp(want - this.veliVol, -dt * 1.6, dt * 1.2);
    v.video.muted = this.veliVol < 0.01;
    v.video.volume = clamp(this.veliVol * 0.9, 0, 1);
    this.sound.bed(1 - this.veliVol);
    // Benji and whoever is standing around catch the beat.
    this.benji.groove = this.veliVol > 0.25 ? v.video.currentTime : -1;
    for (const n of this.npcs) if (n.id === "mamaDee") n.card.groove = this.veliVol > 0.25 ? v.video.currentTime + 0.3 : -1;
  }

  redeem(id: string) {
    const p = PRIZES.find((x) => x.id === id);
    if (!p) return;
    if (p.outfit && this.save.outfits.includes(p.outfit)) return;
    if (this.save.tickets < p.tickets) {
      this.sound.bad();
      this.toast(`${p.tickets - this.save.tickets} more tickets for the ${p.name}.`);
      return;
    }
    this.save.tickets -= p.tickets;
    if (p.outfit) this.save.outfits.push(p.outfit);
    if (p.bait) this.save.bait += p.bait;
    if (p.dollars) this.save.dollars += p.dollars;
    this.sound.cash();
    this.toast(p.outfit ? `${p.name} unlocked. It's in your closet.` : `${p.name} claimed.`, 4);
    this.persist();
    this.push();
  }

  /** A cabinet game ended with this many tickets. */
  arcadeWin(tickets: number) {
    if (tickets <= 0) return 0;
    const won = this.winTickets(tickets);
    this.sound.cash();
    this.persist();
    this.push();
    return won;
  }

  taxi(poiId: string) {
    const p = POIS.find((x) => x.id === poiId);
    if (!p || this.mode !== "walk" || this.place !== "street") return;
    if (!this.spend(10)) return;
    this.close();
    this.transition(() => {
      this.pos.x = p.arrive?.x ?? p.x;
      this.pos.z = p.arrive?.z ?? p.z + (p.id === "fun" ? -1.5 : 2);
      if (p.arrive) {
        this.heading = p.arrive.heading;
        this.camYaw = p.arrive.heading;
      }
      pushOut(this.pos, 0.5, this.city.solids);
      this.vel.x = this.vel.z = 0;
      this.snapCamera();
    });
  }

  /** The pause menu's graphics switch. "auto" hands the choice back to the frame rate. */
  setQuality(q: Quality | "auto") {
    this.auto = q === "auto";
    try {
      if (q === "auto") localStorage.removeItem("sack-v2-quality");
      else localStorage.setItem("sack-v2-quality", q);
    } catch {
      /* private mode */
    }
    if (q === "auto") {
      this.gLocked = false;
      this.gSlow = this.gFast = this.gStuck = 0;
      this.gHold = 2;
      this.setRung(this.rung);
    } else {
      this.stage.setScale(1);
      this.stage.setQuality(q);
      this.fitQuality();
    }
    this.push();
  }

  /** Everything outside the renderer that depends on the graphics level. */
  private fitQuality() {
    const q = this.stage.quality;
    this.sky.reflect = q !== "low";
    if (this.lite.on !== (q === "low")) this.lite.apply(this.scene, q === "low");
    const size = q === "high" ? 2048 : 1024;
    const shadow = this.sky.sun.shadow;
    if (shadow.mapSize.x !== size) {
      shadow.mapSize.set(size, size);
      shadow.map?.dispose();
      shadow.map = null;
    }
    // Shadows and reflections are compiled into every surface: have them rebuilt.
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      for (const one of Array.isArray(m) ? m : [m]) one.needsUpdate = true;
    });
  }

  private setRung(i: number) {
    this.rung = clamp(i, 0, RUNGS.length - 1);
    const r = RUNGS[this.rung]!;
    const changed = r.quality !== this.stage.quality;
    this.stage.setQuality(r.quality);
    this.stage.setScale(r.scale);
    if (changed) this.fitQuality();
    saveRung(this.rung, this.tooSlow);
    this.push();
  }

  /**
   * Watches the frame rate a second at a time. Two slow seconds in a row drop one rung
   * (resolution first, then effects); a long smooth run tries one rung up, once. If dropping
   * does not make it any faster the screen is what sets the pace, so it climbs back and stops.
   */
  private govern(real: number) {
    if (!this.auto || this.gLocked) return;
    // A tab coming back, a level loading, a menu or a fade tell nothing about the device.
    const steady = real < 1.5 && this.live.fade < 0.05 && this.overlay === null;
    if (!steady) {
      this.gClock = this.gFrames = 0;
      this.gHold = Math.max(this.gHold, 1);
      return;
    }
    if (this.gHold > 0) {
      this.gHold -= real;
      return;
    }
    this.gClock += real;
    this.gFrames++;
    if (this.gClock < 1) return;
    const fps = this.gFrames / this.gClock;
    this.gClock = this.gFrames = 0;

    if (this.gBefore > 0) {
      // First full second after a drop: did it buy anything?
      this.gStuck = fps > 24 && fps < this.gBefore * 1.12 ? this.gStuck + 1 : 0;
      this.gBefore = 0;
      if (this.gStuck >= 2) {
        this.gLocked = true;
        this.tooSlow = -1;
        this.setRung(this.rung - 2);
        return;
      }
    }
    if (this.gProbeLeft > 0) {
      // Just climbed a rung: it has to hold the pace it had before, or it goes straight back.
      this.gProbeLeft--;
      if (fps < this.gProbe * 0.9) {
        this.gProbeLeft = 0;
        this.tooSlow = Math.max(this.tooSlow, this.rung);
        this.gHold = 1.2;
        this.gSlow = this.gFast = 0;
        this.setRung(this.rung + 1);
        return;
      }
    }
    this.gRate += (fps - this.gRate) * 0.3;
    if (fps < 42) {
      this.gSlow++;
      this.gFast = 0;
    } else if (fps > 56) {
      this.gFast++;
      this.gSlow = 0;
    } else this.gSlow = this.gFast = 0;

    if (this.gSlow >= 2 && this.rung < RUNGS.length - 1) {
      this.tooSlow = Math.max(this.tooSlow, this.rung);
      this.gBefore = fps;
      this.gSlow = 0;
      this.gHold = 1.2;
      // Far off the pace: take two steps at once.
      this.setRung(this.rung + (fps < 22 ? 2 : 1));
    } else if (this.gFast >= 10 && this.rung - 1 > this.tooSlow) {
      this.gFast = 0;
      this.gHold = 2;
      this.gProbe = this.gRate;
      this.gProbeLeft = 4;
      this.setRung(this.rung - 1);
    }
  }

  /** Rain on, rain off, or back to whatever the sky decides. */
  setRain(on: boolean | "auto") {
    const w = this.weather;
    w.pinned = on !== "auto";
    if (on === true) w.want = 1;
    else if (on === false) w.want = 0;
    this.push();
  }

  /** Asked for in photo mode: it rains, or stops, as if the sky had decided to. */
  orderRain(on: boolean) {
    const w = this.weather;
    if (w.pinned) return this.setRain(on);
    w.want = on ? 1 : 0;
    w.left = 80;
    w.next = 300;
    this.push();
  }

  /** Fireworks over the river when night falls, and a rainbow when daytime rain clears. */
  private runSkyShows(dt: number, paused: boolean) {
    const ns = this.nightShow;
    const phase = this.sky.phase;
    const about = !this.calm && !this.room && !this.intro && (this.mode === "walk" || this.mode === "drive");
    if (phase !== ns.was) {
      if (phase === "night" && ns.was !== "" && about && this.weather.rain < 0.2) {
        ns.left = 15;
        ns.next = 1.5;
        this.toast("Fireworks over the river tonight.", 4);
      }
      ns.was = phase;
    }
    if (ns.left > 0 && !paused) {
      ns.left -= dt;
      ns.next -= dt;
      if (ns.next <= 0 && !this.room) {
        ns.next = 0.9 + Math.random() * 0.7;
        // Out over the water, wherever on the bank he is standing.
        _v.set(-70 + Math.random() * 190 - this.camera.position.x, 0, -300 - this.camera.position.z).normalize();
        this.fireworks.show(this.camera.position, _v, this.stage.quality === "low" ? 1 : 2);
      }
    }
    // The rainbow: only after real rain, only by day, and gone in a minute or so.
    const rb = this.rainbow;
    const w = this.weather;
    if (w.rain > 0.5) rb.heavy = true;
    else if (rb.heavy && w.rain < 0.1) {
      rb.heavy = false;
      if (phase !== "night" && !this.room && !this.calm) {
        rb.left = rb.span;
        this.toast("Rainbow over the river.", 4);
      }
    }
    if (rb.left > 0 || rb.mesh?.visible) {
      rb.left = Math.max(0, rb.left - dt);
      if (!rb.mesh) {
        // A flat arc standing over the far bank, red on the outside.
        const inner = 150;
        const outer = 172;
        const geo = new THREE.RingGeometry(inner, outer, 72, 1, 0, Math.PI);
        const pos = geo.attributes.position!;
        const uv = geo.attributes.uv!;
        for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner));
        const bands = document.createElement("canvas");
        bands.width = 4;
        bands.height = 64;
        const c = bands.getContext("2d")!;
        const grad = c.createLinearGradient(0, 64, 0, 0);
        const cols = ["rgba(150,60,220,0)", "rgba(150,60,220,1)", "rgba(60,90,255,1)", "rgba(40,200,120,1)", "rgba(250,230,60,1)", "rgba(255,140,40,1)", "rgba(255,50,50,1)", "rgba(255,50,50,0)"];
        cols.forEach((col, i) => grad.addColorStop(i / (cols.length - 1), col));
        c.fillStyle = grad;
        c.fillRect(0, 0, 4, 64);
        const map = new THREE.CanvasTexture(bands);
        map.colorSpace = THREE.SRGBColorSpace;
        rb.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
        rb.mesh.position.set(30, -12, -430);
        rb.mesh.renderOrder = -5;
        this.city.exterior.add(rb.mesh);
      }
      const k = Math.min(1, rb.left / 8, (rb.span - rb.left) / 6);
      const mat = rb.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, k) * 0.42 * (1 - this.sky.look.lights * 0.8) * (1 - w.rain);
      rb.mesh.visible = mat.opacity > 0.004;
    }
  }

  /** The weather has its own clock: a shower now and then, and streets that stay wet after it. */
  private runWeather(dt: number, paused: boolean) {
    const w = this.weather;
    if (!w.pinned && !paused && this.mode !== "title" && !this.intro) {
      if (w.want > 0) {
        w.left -= dt;
        if (w.left <= 0) {
          w.want = 0;
          w.next = 260 + Math.random() * 240;
        }
      } else {
        w.next -= dt;
        if (w.next <= 0) {
          w.want = 0.6 + Math.random() * 0.4;
          w.left = 70 + Math.random() * 50;
          if (!this.room && !this.activity) this.toast("Rain coming in off the river.", 3.5);
        }
      }
    }
    w.rain += clamp(w.want - w.rain, -dt / 9, dt / 6);
    w.wet += clamp((w.rain > 0.06 ? 1 : 0) - w.wet, -dt / 80, dt / 9);
    w.flash = Math.max(0, w.flash - dt * 2.4);
    if (w.rain > 0.55 && !paused) {
      w.thunder -= dt;
      if (w.thunder <= 0) {
        w.thunder = 24 + Math.random() * 30;
        w.flash = 1;
        this.sound.thunder();
      }
    }
  }

  setPhase(p: Phase | "auto") {
    if (p === "auto") this.sky.auto = true;
    else {
      this.sky.auto = false;
      this.sky.setPhase(p);
    }
    this.push();
  }

  setMusic(on: boolean) {
    this.sound.setMusic(on);
    this.push();
  }

  setSfx(on: boolean) {
    this.sound.setSfx(on);
    this.push();
  }

  /** Stuck somewhere: back to the plaza. */
  unstick() {
    if (this.activity) this.activity.quit();
    if (this.mode === "drive") this.exitCar(true);
    this.close();
    this.transition(() => {
      this.setPlace("street");
      this.warp(START.x, START.z, Math.PI);
    });
  }

  /** Pointer went down on the scene. */
  tap(nx: number, ny: number) {
    if (this.intro) {
      if (this.intro.t > 0.6) this.endIntro();
      return;
    }
    if (!this.overlay) this.activity?.tap?.(nx, ny);
  }

  /** The song the house band at the Memphian is on. */
  get clubSong() {
    return SONGS[this.song % SONGS.length]!;
  }

  /** Beats into a tune: the band's own count while that is the tune sounding, the clock's if not (sound off, or not yet begun). */
  private beatOf(id: string) {
    const b = this.sound.beat(id);
    return b >= 0 ? b : (this.time * (TUNES[id]?.bpm ?? 100)) / 60;
  }

  /** Whose turn it is to take the tune: the band knows while it is sounding; without it they go round, twelve bars each. */
  private leadOf(id: string, beat: number) {
    if (this.sound.beat(id) >= 0) return this.sound.soloist;
    const leads = TUNES[id]?.leads ?? ["none"];
    return leads[Math.floor(beat / 48) % leads.length]!;
  }

  /** Five in the jar and the band plays the next one on its list. */
  requestSong() {
    if (!this.spend(5)) return;
    this.song = (this.song + 1) % SONGS.length;
    this.troupes.club?.cheer(this.pos.x, this.pos.z, 14, 1.6);
    this.sound.cheer();
    this.earn(0, 1, { quiet: true });
    this.toast(`Five in the jar. The band counts off "${this.clubSong.name}".`, 4.5);
    this.push();
  }

  barTea() {
    if (!this.spend(4)) return;
    this.fedUntil = Math.max(this.fedUntil, this.time + 150);
    this.troupes.club?.serveAt(this.pos.x, this.pos.z);
    this.toast("Sweet tea, extra lemon, slid the length of the bar.", 4);
    this.push();
  }

  tipBand() {
    if (!this.spend(5)) return;
    this.gig.cheer(BEALE_STAGE.x, BEALE_STAGE.z - 8, 16, 1.6);
    this.sound.cheer();
    // The first tip of the set gets him pointed out from the stage.
    const first = this.time - this.tipped > 240;
    this.tipped = this.time;
    if (first) this.earn(0, 2, { quiet: true });
    this.toast(first ? "The singer points Benji out to the whole square: \"That's SackReligious right there!\"" : "The guitar man tips his hat.", 4.5);
    this.push();
  }

  /** How far he is from the stage in Handy Park. */
  private toStage() {
    return Math.hypot(this.pos.x - BEALE_STAGE.x, this.pos.z - BEALE_STAGE.z);
  }

  /** The music for where he is, most wanted first: whichever of these has been recorded plays. */
  private tracks(): string[] {
    const city = this.sky.phase === "night" ? ["city-night", "city-day"] : ["city-day", "city-night"];
    if (this.mode === "title" || this.intro) return ["title", ...city];
    if (this.mode === "race") return ["race", "radio", ...city];
    if (this.mode === "hoops") return ["court", ...city];
    if (this.mode === "bowl" || this.place === "bowl") return ["bowl", ...city];
    if (this.place === "fun" || this.place === "laser") return ["funhouse", ...city];
    if (this.place === "hq") return ["hq", ...city];
    if (this.place === "club") return [this.clubSong.id, "club", ...city];
    if (this.mode === "fish") return ["river", ...city];
    if (this.mode === "drive") return ["radio", ...city];
    // On Beale, and anywhere the band in Handy Park can be heard.
    if (!this.room && (districtAt(this.pos.x, this.pos.z) === "Beale Street" || this.toStage() < 52)) return ["beale", ...city];
    return city;
  }

  private nextLine() {
    this.dialogue.shift();
    const d = this.dialogue[0];
    if (d?.voice) this.sound.voice(d.voice);
    this.push();
  }

  /** A line of dialogue. `voice` is the id of its recording, which plays as the line comes up. */
  say(who: string, text: string, portrait: string | null = null, voice = "") {
    this.dialogue.push({ who, text, portrait, left: 2.6 + text.length * 0.05, voice });
    if (this.dialogue.length === 1 && voice) this.sound.voice(voice);
    this.push();
  }

  toast(text: string, seconds = 3) {
    this.toastText = text;
    this.toastLeft = seconds;
    this.push();
  }

  /** Holds a picture up over everything for a few seconds. */
  reveal(r: Reveal, seconds = 5) {
    this.revealNow = r;
    this.revealLeft = seconds;
    this.push();
  }

  /** The album: postcards, the fish book and the names he has earned. */
  openAlbum() {
    this.open("album");
  }

  private albumHud(): AlbumHud {
    const s = this.save;
    const rung = rankOf(s.respect).index;
    return {
      postcards: POSTCARDS.map((c) => ({ id: c.id, name: c.name, hint: c.hint, img: postcardImg(c.id), got: !!s.flags[`card_${c.id}`] })),
      fish: FISH.map((f) => ({ ...f, best: s.best[`fish_${f.id}`] ?? 0 })),
      ranks: RANKS.map((r, i) => ({ name: r.name, at: r.at, badge: rankBadge(i), got: i <= rung })),
    };
  }

  persist() {
    const s = this.save;
    if (this.mode === "walk" && this.place === "street") {
      s.x = this.pos.x;
      s.z = this.pos.z;
      s.heading = this.heading;
    }
    if (this.mode === "walk" || this.mode === "drive") s.car = { x: this.driver.x, z: this.driver.z, heading: this.driver.heading };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      this.hasSave = true;
    } catch {
      /* private mode */
    }
  }

  // ---------------------------------------------------------------- driving

  /** Builds the car he drives and stands it where the last one was. */
  private buildCar(id: string) {
    const ride = rideById(id);
    const old = this.car as CarModel | undefined;
    const car = new CarModel(ride.kind, ride.paint, ride.wrap);
    this.city.exterior.add(car.group);
    if (old) {
      car.group.position.copy(old.group.position);
      car.group.rotation.copy(old.group.rotation);
      this.city.exterior.remove(old.group);
    }
    if (this.lite.on) this.lite.apply(car.group, true);
    this.tune = { top: STREET.top * ride.top, accel: STREET.accel * ride.accel, boostTop: STREET.boostTop * ride.top, grip: STREET.grip * ride.grip };
    return car;
  }

  /** The garage: every ride, which are his, and which he is in. */
  openGarage() {
    if (this.mode !== "walk" && this.mode !== "drive") return;
    this.open("garage");
  }

  /** Take a ride he owns, or pay for one he does not and take it. */
  pickRide(id: string) {
    const ride = rideById(id);
    const s = this.save;
    if (!s.rides.includes(ride.id)) {
      if (!this.spend(ride.price)) return;
      s.rides.push(ride.id);
      this.toast(`${ride.name}: yours. It is parked where the last one was.`, 4);
    }
    if (s.ride !== ride.id) {
      s.ride = ride.id;
      this.car = this.buildCar(ride.id);
      this.sound.door();
    }
    this.persist();
    this.push();
  }

  private placeCar() {
    this.car.place(this.driver.x, this.driver.y, this.driver.z, this.driver.heading);
  }

  drive() {
    this.mode = "drive";
    this.benji.visible = false;
    this.camYaw = this.driver.heading;
    this.sound.door();
    this.push();
  }

  exitCar(force = false) {
    this.drift.pts = 0;
    this.live.drift = 0;
    if (!force && this.driver.speed > 3) {
      this.toast("Stop the car first.");
      return;
    }
    const d = this.driver;
    d.vx = d.vz = 0;
    // Driver's side first, then the other, then behind.
    const lx = Math.cos(d.heading);
    const lz = -Math.sin(d.heading);
    const tries = [
      [lx * 2, lz * 2],
      [-lx * 2, -lz * 2],
      [-Math.sin(d.heading) * 3.4, -Math.cos(d.heading) * 3.4],
    ] as const;
    let out = { x: d.x + tries[0][0], z: d.z + tries[0][1] };
    for (const [ox, oz] of tries) {
      const p = { x: d.x + ox, z: d.z + oz };
      if (!pushOut({ ...p }, 0.4, this.city.solids)) {
        out = p;
        break;
      }
    }
    this.pos.x = out.x;
    this.pos.z = out.z;
    this.heading = d.heading;
    this.benji.visible = true;
    this.mode = "walk";
    this.sound.setEngine(false);
    this.sound.door();
    this.persist();
    this.push();
  }

  private updateDrive(dt: number) {
    const m = this.input.move();
    const gas = this.input.throttle();
    const d = this.driver;
    d.step(dt, { throttle: gas, steer: m.x, handbrake: this.input.down("action"), boost: false, slide: true }, this.tune, this.city.carSolids);
    for (const c of this.traffic.list()) {
      const hit = d.bump(c.x, c.z, c.radius);
      if (hit > 2.5) {
        this.sound.crash(Math.min(1, hit / 14));
        this.input.rumble(Math.min(1, hit / 10), 160);
      }
    }
    if (d.hit > 3) {
      this.sound.crash(Math.min(1, d.hit / 16));
      this.input.rumble(Math.min(1, d.hit / 12), 180);
    }
    if (d.slip > 5 && d.speed > 8) this.sound.skid(Math.min(1, d.slip / 12));
    // A long slide is worth something, as long as it does not end in a wall.
    const dr = this.drift;
    if (d.hit > 3) {
      if (dr.pts > 40) this.toast("Drift lost: you hit something.", 1.6);
      dr.pts = 0;
    } else if (d.slip > 3 && d.speed > 8) {
      dr.pts += d.slip * d.speed * dt * 1.2;
      dr.hold = 0.8;
    } else if (dr.pts > 0) {
      dr.hold -= dt;
      if (dr.hold <= 0) {
        if (dr.pts >= 60) {
          const pts = Math.round(dr.pts);
          const best = this.save.best.drift ?? 0;
          if (pts > best) this.save.best.drift = pts;
          const paid = this.earn(Math.min(40, Math.round(pts / 25)), pts >= 400 ? 1 : 0, { quiet: true });
          this.sound.cash();
          this.buzz(25);
          this.toast(`DRIFT ${pts}${pts > best && best > 0 ? "  ·  your longest" : ""}  +$${paid.dollars}`, 2.4);
        }
        dr.pts = 0;
      }
    }
    this.live.drift = dr.pts >= 20 ? dr.pts : 0;
    this.car.place(d.x, d.y, d.z, d.heading);
    this.car.roll(d.forward * dt, d.steer * 0.5);
    this.car.lean(-d.steer * Math.min(1, d.speed / 20) * 0.05, 0);
    this.car.lamps(this.sky.look.lights > 0.4 ? 3 : 0.2, gas < 0 && d.forward > 1 ? 3 : 0.5);
    this.sound.setEngine(true, d.speed / this.tune.top);
    if (this.input.hit("horn")) {
      this.sound.horn();
      // Everybody in earshot jumps.
      this.cheer(this.driver.x, this.driver.z, 11, 0.7);
    }
    this.pos.x = d.x;
    this.pos.z = d.z;
    this.heading = d.heading;
    this.live.speed = d.speed * 2.237;
    // Pull up by Nitro on the strip and the race starts from the driver's seat.
    const raceNear = Math.hypot(d.x - RACE_MEET.x, d.z - RACE_MEET.z) < 18 && d.speed < 15;
    const label = raceNear ? "Race Nitro: 3 laps of downtown" : "";
    if (label !== this.drivePrompt) {
      this.drivePrompt = label;
      this.push();
    }
    if (this.input.hit("interact")) {
      if (raceNear) {
        this.drivePrompt = "";
        this.begin(this.race, "race");
        this.race.start();
        return;
      }
      this.exitCar();
    }
    this.chaseCar(dt, d, 8.4, 3.1);
  }

  /** Chase camera behind a car. Shared with the races. */
  chaseCar(dt: number, d: Driver, back: number, up: number, snap = false, solids: Solid[] = this.city.carSolids) {
    this.camYaw = snap ? d.heading : dampAngle(this.camYaw, d.heading, damp(4.2, dt));
    this.camYaw = wrapAngle(this.camYaw - this.input.takeLook() * 0.6);
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    const dist = back + d.speed * 0.045;
    let t = sight(d.x, d.z, d.x - fx * dist, d.z - fz * dist, solids, 0.5);
    t = Math.max(0.4, t);
    _v.set(d.x - fx * dist * t, d.y + up + (1 - t) * 2.2, d.z - fz * dist * t);
    if (snap) this.camera.position.copy(_v);
    else this.camera.position.lerp(_v, damp(9, dt));
    _look.set(d.x + fx * 4, d.y + 1.1, d.z + fz * 4);
    this.camera.lookAt(_look);
    const fov = 46 + Math.min(16, d.speed * 0.36);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * damp(4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------- walking

  private updateWalk(dt: number) {
    const m = this.input.move();
    const talking = this.fadeTo > 0;
    const run = this.input.down("run");
    const top = (run ? 8.4 : 4.8) * (this.wearing("blue_901") ? 1.15 : 1);
    const look = this.input.takeLook();
    if (look !== 0) {
      this.camYaw = wrapAngle(this.camYaw - look);
      this.lookIdle = 0;
    } else this.lookIdle += dt;
    // A and D swing the camera as well as strafing, so holding one walks an arc that way.
    if (!talking && m.y > -0.3 && Math.abs(m.x) > 0.1) this.camYaw = wrapAngle(this.camYaw - m.x * 1.55 * dt);
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    const wx = talking ? 0 : (fx * m.y - fz * m.x) * top;
    const wz = talking ? 0 : (fz * m.y + fx * m.x) * top;
    const k = damp(12, dt);
    this.vel.x += (wx - this.vel.x) * k;
    this.vel.z += (wz - this.vel.z) * k;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    pushOut(this.pos, 0.36, this.solids);
    if (!this.room) {
      const d = this.driver;
      const hx = Math.sin(d.heading);
      const hz = Math.cos(d.heading);
      pushCircle(this.pos, 0.36, d.x + hx * 1.1, d.z + hz * 1.1, 1.05);
      pushCircle(this.pos, 0.36, d.x - hx * 1.1, d.z - hz * 1.1, 1.05);
      for (const c of this.traffic.list()) pushCircle(this.pos, 0.36, c.x, c.z, 1.5);
    }
    for (const n of this.npcs) if (n.place === this.place) pushCircle(this.pos, 0.36, n.x, n.z, 0.4);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > 0.4) this.heading = dampAngle(this.heading, Math.atan2(this.vel.x, this.vel.z), damp(14, dt));
    this.benji.speed = speed;
    if (speed > 1) {
      this.stepClock += (speed * dt) / 0.82;
      if (this.stepClock >= 1) {
        this.stepClock -= 1;
        this.sound.step();
      }
    }
    this.live.speed = 0;

    // What is in reach.
    let best: Spot | null = null;
    let bestD = 1e9;
    for (const s of this.spots) {
      if (s.place !== this.place) continue;
      if (s.when && !s.when()) continue;
      const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z);
      if (d < s.r && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    this.nearSpot = best;
    // No door or counter in reach: is there somebody to speak to?
    const who = best ? null : this.someone();
    const name = !who ? "" : who.doing === "cast" ? CAST[who.key as CastId].name : nameOf(who.key, who.card.face.includes("female"));
    const label = best ? best.label() : who ? `Talk to ${name}` : "";
    if (label !== this.prompt) {
      this.prompt = label;
      this.push();
    }
    if (this.input.hit("interact")) {
      // A door or a counter in reach wins over skipping a line of talk.
      if (best && !this.afterFade) {
        this.dialogue.length = 0;
        best.act();
      } else if (who && !this.afterFade && (!this.dialogue.length || this.dialogue[0]!.who === name)) this.talkTo(who, name);
      else if (this.dialogue.length) this.nextLine();
    }
    this.chase(dt);
  }

  /** Third-person camera on foot. Shortens its boom rather than look through a wall. */
  chase(dt: number, snap = false) {
    const room = this.room;
    const want = room ? room.boom : 6.4;
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    const tx = this.pos.x;
    const tz = this.pos.z;
    let t = sight(tx, tz, tx - fx * want, tz - fz * want, this.solids, 0.35);
    if (room) {
      // Keep the lens inside the room.
      const b = room.bounds;
      const cx = tx - fx * want;
      const cz = tz - fz * want;
      if (fx !== 0) t = Math.min(t, cx < b.minX + 0.4 ? (tx - b.minX - 0.4) / (fx * want) : cx > b.maxX - 0.4 ? (tx - b.maxX + 0.4) / (fx * want) : 1);
      if (fz !== 0) t = Math.min(t, cz < b.minZ + 0.4 ? (tz - b.minZ - 0.4) / (fz * want) : cz > b.maxZ - 0.4 ? (tz - b.maxZ + 0.4) / (fz * want) : 1);
    }
    const goal = want * clamp(t, 0.3, 1);
    this.boom = snap || goal < this.boom ? goal : this.boom + (goal - this.boom) * damp(3, dt);
    // Squeezed against a wall: go up and look down instead of sitting in his hair.
    const near = 1 - this.boom / want;
    const y0 = (room ? room.floorY : this.benji.group.position.y) + 1.25;
    _v.set(tx - fx * this.boom, y0 + (room ? 0.95 : 1.25) + near * (room ? 1.3 : 1.7), tz - fz * this.boom);
    if (snap) this.camera.position.copy(_v);
    else this.camera.position.lerp(_v, damp(14, dt));
    // Indoors the lens looks more level, so the walls are in the picture and not just the floor.
    _look.set(tx + fx * 1.5, y0 + (room ? 0.5 : 0.25), tz + fz * 1.5);
    this.camera.lookAt(_look);
    const fov = room ? 52 : 46;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * damp(5, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  snapCamera() {
    this.benji.place(this.pos.x, this.pos.z);
    this.benji.heading = this.heading;
    this.benji.update(0, this.camera.position, this.tint, this.floorY);
    if (this.mode === "drive") this.chaseCar(0, this.driver, 8.4, 3.1, true);
    else if (!this.activity) this.chase(0, true);
  }

  // ---------------------------------------------------------------- frame

  private loop = (now: number) => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const real = Math.max(0.001, (now - this.last) / 1000);
    this.last = now;
    this.govern(real);
    // The game always runs at its true speed. A slow frame is played as several short steps
    // and only the last is drawn, so a weak machine gets a choppier picture, never slow motion.
    const span = Math.min(0.5, real);
    // A big moment plays slow for a beat, then eases back up to speed.
    let k = 1;
    if (this.slowLeft > 0) {
      k = this.slowLeft > 0.3 ? this.slowDeep : 1 + (this.slowDeep - 1) * (this.slowLeft / 0.3);
      this.slowLeft -= real;
    }
    const steps = Math.ceil(span / STEP);
    for (let i = 1; i <= steps; i++) this.tick((span * k) / steps, i === steps);
  };

  private tick(dt: number, draw = true) {
    const input = this.input;
    input.driving = this.mode === "drive" || this.mode === "race" || this.mode === "kart";
    input.fps = this.mode === "laser";
    input.actionOnA = !!this.activity && !input.driving && !input.fps;
    input.begin();
    this.stage.resize();
    this.time += dt;

    // A pad drives the menus through the HUD: d-pad to move, A to press.
    const nav = input.takeNav();
    if (this.mode === "title" || this.overlay) {
      for (const n of nav) this.onNav?.(n);
      if (this.mode === "title" && input.pad && input.hitRaw("pause")) this.onNav?.("accept");
    }
    if (input.pad !== this.padWas) {
      this.padWas = input.pad;
      this.push();
    }

    // Keys that work everywhere.
    if (this.mode !== "title" && !this.intro) {
      if (input.hitRaw("pause")) {
        if (this.overlay) this.close();
        else this.open("pause");
      } else if (input.hitRaw("map") && (this.overlay === null || this.overlay === "map")) {
        if (this.overlay) this.close();
        else if (this.mode === "walk" || this.mode === "drive") this.open("map");
      } else if (input.hitRaw("back") && this.overlay) this.close();
      if (input.hit("time") && !this.room) {
        this.sky.auto = false;
        this.sky.setPhase(PHASES[(PHASES.indexOf(this.sky.phase) + 1) % PHASES.length]!);
        this.push();
      }
    }

    // The regulars at a park table take their turns while the rest of the city waits.
    if (this.overlay === "table") this.board.update(dt);
    this.board.idle(dt);

    const paused = this.overlay !== null;
    if (this.fadeTo === 1 && this.live.fade >= 1 && this.afterFade) {
      const f = this.afterFade;
      this.afterFade = null;
      f();
      this.fadeTo = 0;
    }
    this.live.fade += clamp(this.fadeTo - this.live.fade, -dt * 3.2, dt * 4.5);

    this.fireworks.update(dt);
    this.runWeather(dt, paused && this.overlay !== "photo");
    this.runSkyShows(dt, paused);
    if (this.rankUp && !this.overlay) {
      this.rankUp.left -= dt;
      if (this.rankUp.left <= 0) {
        const name = this.rankUp.name;
        this.rankUp = null;
        this.moment(2);
        this.sound.voice("call-rank-up");
        this.reveal({ img: rankBadge(RANKS.findIndex((r) => r.name === name)), kicker: "New name in Memphis", title: name, sub: "Every job pays more.", round: true }, 5.5);
      }
    }
    if (this.overlay === "photo") this.photoCamera();
    if (this.mode === "title") this.titleCamera(dt);
    else if (this.intro) this.runIntro(dt);
    else if (!paused) {
      if (this.activity) {
        this.activity.update(dt);
        if (input.hit("back") && this.activity) this.activity.quit();
      } else if (this.mode === "drive") this.updateDrive(dt);
      else this.updateWalk(dt);
      this.save.played += dt;
    }

    // People.
    const cam = this.camera.position;
    const out = !this.room;
    const target = out ? TINT[this.sky.phase] : INDOOR_TINT;
    this.tint.lerp(target, damp(2, dt));
    // His fist: held for the camera, or up for a moment after a win while he is standing about.
    if (this.fistLeft > 0) this.fistLeft -= dt;
    if (!this.activity) {
      const fist = this.overlay === "photo" ? this.posing : this.fistLeft > 0 && this.mode === "walk" && this.benji.speed < 0.6;
      if (fist) this.benji.pose = "cheer";
      else if (this.benji.pose === "cheer") this.benji.pose = null;
    }
    this.benji.place(this.pos.x, this.pos.z);
    this.benji.heading = this.heading;
    this.benji.update(paused ? 0 : dt, cam, this.tint, this.floorY);
    const speaker = this.dialogue[0]?.who;
    // The regulars on the rec grounds, and the paddle wheel on the sixth, whether or not anyone is playing.
    if (!this.room) {
      if (this.activity !== this.cornhole) this.cornhole.idle(dt);
      if (this.activity !== this.tennis) this.tennis.idle(dt);
      if (this.activity !== this.putt) this.putt.idle(paused ? 0 : dt);
      if (this.activity !== this.swings) this.swings.idle(paused ? 0 : dt);
      if (this.activity !== this.boat) this.boat.idle(paused ? 0 : dt);
    }
    for (const n of this.npcs) {
      if (n.place !== this.place) continue;
      const d = Math.hypot(this.pos.x - n.x, this.pos.z - n.z);
      const want = d < 7 ? Math.atan2(this.pos.x - n.x, this.pos.z - n.z) : n.home;
      // Whoever has the floor is drawn mid-sentence.
      n.card.pose = speaker === CAST[n.id].name ? "talk" : null;
      n.card.heading = dampAngle(n.card.heading, want, damp(5, dt));
      n.card.update(dt, cam, this.tint, n.place === "street" ? null : this.rooms[n.place].floorY + 0.03);
    }
    // Friends keep moving whatever is open on this screen.
    this.crew.update(dt);

    // Benji only counts as someone to walk round and talk to while he is on foot.
    const afoot = this.mode === "walk" ? this.pos : null;
    if (this.place !== "street") {
      // In the Memphian everybody moves to the band, and the stage lights go with it.
      const live = this.place === "club";
      const cb = live ? this.beatOf(this.clubSong.id) : -1;
      this.troupes[this.place]?.update(dt, cam, this.tint, afoot, this.time, live ? cb / 1.58 : -1);
      if (live) {
        this.clubBand.update(dt, cam, this.tint, cb, this.leadOf(this.clubSong.id, cb));
        this.rooms.club.pulse(cb);
      }
      if (this.place === "bowl") {
        for (const b of this.laneBalls) {
          if (!b.live) continue;
          b.z -= 7.6 * dt;
          b.mesh.visible = true;
          b.mesh.position.z = b.z;
          b.mesh.rotation.x -= dt * 30;
          if (b.z < b.end) {
            b.live = false;
            b.mesh.visible = false;
            this.sound.pins(5 + Math.floor(Math.random() * 6));
          }
        }
      }
    }

    // The city.
    const look = this.sky.look;
    const wx = this.weather;
    this.sky.rain = out ? wx.rain : 0;
    this.sky.flash = out ? wx.flash : 0;
    _v.set(this.pos.x, 0, this.pos.z);
    this.sky.update(paused ? dt * 0.2 : dt, _v, this.camera);
    this.rain.update(dt, this.camera, out ? wx.rain : 0, this.stage.quality === "high" ? 1 : this.stage.quality === "medium" ? 0.65 : 0.36, look.lights, this.stage.renderer.domElement.width, this.stage.renderer.domElement.height);
    this.sound.setRain(this.mode === "title" ? 0 : wx.rain, !out);
    if (out) {
      this.city.update(dt, this.time);
      this.skyShow.update(paused ? 0 : dt, this.time, look.lights);
      if (!paused) {
        const blockers = this.mode === "walk" ? [{ x: this.pos.x, z: this.pos.z, radius: 0.5, speed: 0 }] : [];
        blockers.push({ x: this.driver.x, z: this.driver.z, radius: 1.4, speed: this.driver.speed });
        this.traffic.update(dt, this.city.signals, blockers, cam);
        this.traffic.setLights(look.lights > 0.4 ? 3 : 0.2);
        const beat = this.veliVol > 0.25 && this.veli ? this.veli.video.currentTime : -1;
        // Whatever Benji is driving, people get out of its way.
        const wheels = this.mode === "drive" || this.mode === "race" ? this.rolling : null;
        if (wheels) {
          wheels.x = this.driver.x;
          wheels.z = this.driver.z;
          wheels.vx = this.driver.vx;
          wheels.vz = this.driver.vz;
          wheels.speed = this.driver.speed;
        }
        this.people.update(dt, cam, this.tint, this.pos, beat, this.city.anchors.trucks.screen.x, this.city.anchors.trucks.screen.z, wheels);
        // The song only reaches the lot, so only the lot moves to it.
        const reach = this.stage.quality === "low" ? 115 : 150;
        this.street.update(dt, cam, this.tint, afoot, this.time, Math.hypot(this.pos.x - TRUCKS.x, this.pos.z - TRUCKS.z) < 40 ? beat : -1, reach, wheels);
        // The band in Handy Park, and everyone who came out for it.
        const gb = this.beatOf("beale");
        this.bealeBand.update(dt, cam, this.tint, gb, this.leadOf("beale", gb), Math.abs(cam.x - BEALE_STAGE.x) + Math.abs(cam.z - BEALE_STAGE.z) < reach);
        this.gig.update(dt, cam, this.tint, afoot, this.time, gb / 1.58, reach, wheels);
      }
      this.city.glow.apply(look.lights, look.roadRough * (1 - 0.66 * wx.wet), wx.wet);
      this.city.glow.tick(this.time, look.lights);
      this.city.bridge.update(dt, look.lights);
      this.city.water.bridge.copy(this.city.bridge.glow);
      this.city.water.strip.set(this.city.bridge.strip);
      this.city.water.rain = wx.rain;
      this.city.water.update(dt, look);
      if (this.mode !== "drive" && this.mode !== "race") this.car.lamps(0.1, 0.3);
      this.stage.renderer.toneMappingExposure = look.exposure;
      this.stage.setBloom(look.bloom + wx.wet * 0.1);
    } else {
      const r = this.room!;
      this.sky.hemi.color.setHex(r.ambient.sky);
      this.sky.hemi.groundColor.setHex(r.ambient.ground);
      this.sky.hemi.intensity = r.ambient.power;
      const fog = this.scene.fog as THREE.Fog;
      fog.color.setHex(0x050507);
      fog.near = 60;
      fog.far = 220;
      this.stage.renderer.toneMappingExposure = 1;
      this.stage.setBloom(0.34);
    }

    if (this.carSpot) {
      this.carSpot.x = this.driver.x;
      this.carSpot.z = this.driver.z;
    }

    this.updateVeli(dt);
    // Stood in front of a band it is louder, and Benji cannot keep still.
    const heard = this.tracks()[0]!;
    const near = this.place === "club" ? 1 : heard === "beale" ? clamp(1 - (this.toStage() - 12) / 40, 0, 1) : 0;
    this.sound.live(near);
    if (near > 0.55 && this.mode === "walk") this.benji.groove = this.beatOf(heard) / 1.58;
    else if (this.veliVol <= 0.25) this.benji.groove = -1;
    this.updateCoins(dt, paused);
    this.mark();

    // Talk and toasts run on the clock even in menus.
    if (this.dialogue.length) {
      const d = this.dialogue[0]!;
      d.left -= dt;
      if (d.left <= 0) this.nextLine();
    }
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) {
        this.toastText = "";
        this.push();
      }
    }
    if (this.revealLeft > 0) {
      this.revealLeft -= dt;
      if (this.revealLeft <= 0) {
        this.revealNow = null;
        this.push();
      }
    }

    this.live.x = this.pos.x;
    this.live.z = this.pos.z;
    this.live.heading = this.heading;
    this.live.camYaw = this.camYaw;
    // A cabinet game covers the screen: draw the room behind it only now and then.
    if (draw) this.skip = this.overlay === "arcade" ? (this.skip + 1) % 12 : 0;
    if (this.skip === 0 && draw && !this.webOn) {
      this.lite.sync(this.sky.look.hemiSky, this.room ? 0.06 : 0.3 * this.sky.look.hemiPower + 0.05);
      this.stage.render();
    }

    this.hudClock -= dt;
    if (this.hudClock <= 0) this.push();
    this.saveClock += dt;
    if (this.saveClock > 6 && !this.activity && this.mode !== "title") {
      this.saveClock = 0;
      this.persist();
    }
  }

  private titleCamera(dt: number) {
    this.titleSpin += dt;
    const sway = Math.sin(this.titleSpin * 0.22);
    this.camera.position.set(-11.9 + sway * 0.5, 1.12 + Math.sin(this.titleSpin * 0.31) * 0.06, -156.6);
    _look.set(-19.2 + sway * 0.3, 3.5, HQ.frontZ);
    this.camera.lookAt(_look);
    if (this.camera.fov !== 50) {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    }
  }

  target() {
    const step = STORY[this.save.step];
    const poi = step ? step.poi : BOUNTIES[this.save.bounty % BOUNTIES.length]!.poi;
    return POIS.find((p) => p.id === poi) ?? null;
  }

  private mark() {
    const t = this.target();
    const show = !!t && !this.room && (this.mode === "walk" || this.mode === "drive");
    this.beam.visible = show;
    if (!show || !t) {
      this.live.markOn = false;
      return;
    }
    const dist = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
    this.beam.position.x = t.x;
    this.beam.position.z = t.z;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = (0.05 + 0.13 * clamp(dist / 80, 0, 1) + Math.sin(this.time * 3) * 0.02) * clamp((dist - 10) / 14, 0, 1);
    _v.set(t.x, 3.4, t.z).project(this.camera);
    let x = _v.x;
    let y = _v.y;
    if (_v.z > 1) {
      // Behind the lens: flip and pin it to the edge.
      x = -x;
      y = -1;
    }
    const m = Math.max(Math.abs(x), Math.abs(y));
    if (m > 0.9 || _v.z > 1) {
      const s = 0.9 / Math.max(m, 1e-4);
      x *= s;
      y *= s;
    }
    this.live.markX = (x + 1) / 2;
    this.live.markY = (1 - y) / 2;
    this.live.markOn = dist > 7;
    this.live.markDist = dist;
  }

  push() {
    this.hudClock = 0.1;
    const s = this.save;
    const step = STORY[s.step];
    const bounty = BOUNTIES[s.bounty % BOUNTIES.length]!;
    const chapter = chapterOf(s.step);
    const today = dailyFor(s.daily.day || dayKey());
    const nextCard = POSTCARDS.find((c) => !s.flags[`card_${c.id}`]);
    const t = this.target();
    const d = this.dialogue[0];
    const hints: [string, string][] =
      this.activity?.hints ??
      (this.mode === "drive"
        ? [
            ["W S", "Gas, brake"],
            ["A D", "Steer"],
            ["Space", "Handbrake"],
            ["H", "Horn"],
            ["E", "Get out"],
          ]
        : [
            ["W A S D", "Move"],
            ["Shift", "Run"],
            ["E", "Interact"],
            ["M", "Map"],
            ["N", "Time of day"],
          ]);
    const h: HudState = {
      mode: this.mode,
      overlay: this.overlay,
      place: this.place,
      dollars: s.dollars,
      respect: s.respect,
      tickets: s.tickets,
      district: this.room ? { hq: "SackReligious HQ", home: "Home", bowl: "901 Bowl", fun: "The Fun House", laser: "Laser Arena", club: "The Memphian" }[this.room.id as Exclude<Place, "street">] : districtAt(this.pos.x, this.pos.z),
      street: this.room ? "" : nearestStreet(this.pos.x, this.pos.z),
      phase: this.sky.phase,
      rain: this.weather.want > 0,
      ride: s.ride,
      rides: s.rides,
      daily: { title: today.title, detail: today.detail, done: s.daily.done, streak: s.daily.streak, pay: dailyPay(s.daily.streak + (s.daily.done ? 0 : 1)) },
      table: this.overlay === "table" ? this.board.hud() : null,
      crew: this.crew.hud(),
      invite: this.board.inviteHud(),
      postcards: { got: POSTCARDS.filter((c) => s.flags[`card_${c.id}`]).length, total: POSTCARDS.length, next: nextCard ? `${nextCard.name}, ${nextCard.hint}` : "" },
      rank: rankOf(s.respect),
      mission: step
        ? { chapter: chapter?.name ?? "", index: chapter?.index ?? 1, total: chapter?.total ?? 1, title: step.title, detail: step.goal?.times ? `${step.detail}  ${Math.min(s.count, step.goal.times)}/${step.goal.times}` : step.detail }
        : { chapter: "BOUNTY BOARD", index: (s.bounty % BOUNTIES.length) + 1, total: BOUNTIES.length, title: bounty.title, detail: `${bounty.detail}  $${bounty.pay}` },
      prompt: this.overlay ? "" : this.mode === "walk" ? this.prompt : this.mode === "drive" ? this.drivePrompt : "",
      hints,
      dialogue: d ? { who: d.who, text: d.text, portrait: d.portrait } : null,
      toast: this.toastText,
      reveal: this.revealNow,
      pose: { can: this.benji.has("cheer"), on: this.posing },
      album: this.overlay === "album" ? this.albumHud() : null,
      buff: this.time < this.fedUntil ? `Well fed  +10% pay  ${Math.ceil((this.fedUntil - this.time) / 60)}m` : "",
      wearing: s.wearing,
      outfits: [...s.outfits],
      owned: [...s.owned],
      bait: s.bait,
      cooler: [...s.cooler],
      best: { ...s.best },
      target: t ? { id: t.id, x: t.x, z: t.z } : null,
      car: { x: this.driver.x, z: this.driver.z },
      hoops: null,
      bowl: null,
      fish: null,
      race: null,
      laser: null,
      loadout: this.overlay === "loadout" ? this.laser.loadout() : null,
      bounce: null,
      pit: null,
      whack: null,
      machine: null,
      driving: this.mode === "drive",
      results: this.results,
      shopFocus: this.shopFocus,
      cabinet: this.cabinet,
      foodAt: this.foodAt,
      settings: { quality: this.stage.quality, auto: this.auto, music: this.sound.musicOn, sfx: this.sound.sfxOn, clock: this.sky.auto, buzz: this.buzzOn },
      cinema: this.cinema,
      hasSave: this.hasSave && s.step > 0,
      storyDone: !step,
      touch: this.input.touch,
      pad: this.input.pad,
    };
    this.activity?.hud(h);
    // The announcer reads the big calls out as they come up.
    const call = h.hoops?.call || h.bowl?.call || h.fish?.call || h.race?.call || h.laser?.call || h.machine?.call || "";
    if (call !== this.lastCall) {
      this.lastCall = call;
      const hit = call ? CALLS.find(([re]) => re.test(call)) : undefined;
      if (hit) this.sound.voice(hit[1]);
    }
    this.sound.setTrack(this.tracks());
    this.onHud(h);
  }

  /** Reach of the catalogue for the shop screen. */
  catalog() {
    return CATALOG;
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    if (this.veli) {
      this.veli.video.pause();
      this.veli.video.removeAttribute("src");
      this.veli.video.load();
      this.veli.tex.dispose();
      this.veli = null;
    }
    this.persist();
    this.crew.shutdown();
    this.input.dispose();
    this.sound.dispose();
    this.stage.dispose();
  }
}
