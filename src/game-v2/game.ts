import * as THREE from "three";
import { Card } from "./actors/card";
import { People } from "./actors/people";
import { Traffic } from "./actors/traffic";
import { CarModel, Driver, STREET } from "./actors/vehicle";
import { CAST, OUTFITS, BENJI_HEIGHT, type CastId, type OutfitId } from "./assets/cast";
import { Sound } from "./core/audio";
import { Input, type Nav } from "./core/input";
import type { Dialogue, HudState, Live, Mode, Overlay, Place, Results, Save, Solid } from "./core/types";
import { clamp, damp, dampAngle, wrapAngle } from "./core/util";
import { makeStage, pickQuality, qualityIsChosen, type Quality, type Stage } from "./gfx/render";
import { PHASES, Sky, type Phase } from "./gfx/sky";
import { Bowling } from "./play/bowling";
import { CATALOG, COLLECTION_BONUS, productById } from "./play/catalog";
import { Fishing } from "./play/fishing";
import { BallPit, Bounce, KartRace, LaserTag } from "./play/fun";
import { CABINETS, FOOD, PRIZES } from "./play/goods";
import { Hoops } from "./play/hoops";
import { PopShot, Whack } from "./play/machines";
import { StreetRace } from "./play/race";
import { BOUNTIES, CHAPTER, STORY } from "./play/story";
import { buildCity, type City } from "./world/city";
import { pushCircle, pushOut, sight } from "./world/collide";
import { buildFunRoom, buildLaserRoom, type FunRoom, type LaserRoom } from "./world/funhouse";
import { FUN, HQ, POIS, RACE_MEET, districtAt, nearestStreet } from "./world/map";
import { buildBowlRoom, buildHomeRoom, buildHqRoom, type BowlRoom, type HomeRoom, type HqRoom, type Room } from "./world/rooms";

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

type Npc = { id: CastId; card: Card; place: Place; x: number; z: number; home: number; rise: number };

/** Longest stretch of game time played in one go. */
const STEP = 1 / 30;

/** Graphics from richest to lightest. The frame rate walks down this list, resolution before effects. */
const RUNGS: { quality: Quality; scale: number }[] = [
  { quality: "high", scale: 1 },
  { quality: "medium", scale: 1 },
  { quality: "medium", scale: 0.8 },
  { quality: "low", scale: 1 },
  { quality: "low", scale: 0.78 },
  { quality: "low", scale: 0.62 },
  { quality: "low", scale: 0.5 },
];
const RUNG_KEY = "sack-v2-auto";

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
    bounty: 0,
    played: 0,
  };
}

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    if (s.v !== 4 || typeof s.dollars !== "number") return null;
    return { ...freshSave(), ...s };
  } catch {
    return null;
  }
}

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
  readonly rooms: { hq: HqRoom; home: HomeRoom; bowl: BowlRoom; fun: FunRoom; laser: LaserRoom };
  readonly live: Live = { meter: 0, sweetLo: 0, sweetHi: 0, aim: 0, tension: 0, speed: 0, nitro: 0, fade: 1, markX: 0.5, markY: 0.5, markOn: false, markDist: 0, x: 0, z: 0, heading: 0, camYaw: 0 };
  readonly benji: Card;
  readonly car: CarModel;
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
  foodAt: "trucks" | "pizza" = "trucks";
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
  private dialogue: (Dialogue & { left: number })[] = [];
  private toastText = "";
  private toastLeft = 0;
  private fedUntil = 0;
  private lookIdle = 9;
  private onAgain: (() => void) | null = null;
  private onResultsClose: (() => void) | null = null;
  private prompt = "";
  private nearSpot: Spot | null = null;
  private camPos = new THREE.Vector3();
  private titleSpin = 0;
  private skip = 0;
  private padWas = false;
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
  private race: StreetRace;
  private kart: KartRace;
  private laser: LaserTag;
  private bounce: Bounce;
  private pit: BallPit;
  private whack: Whack;
  private popshot: PopShot;

  constructor(
    canvas: HTMLCanvasElement,
    private onHud: (h: HudState) => void,
  ) {
    const saved = loadSave();
    this.hasSave = !!saved;
    this.save = saved ?? freshSave();
    this.city = buildCity();
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
    this.rooms = { hq: buildHqRoom(), home: buildHomeRoom(), bowl: buildBowlRoom(), fun: buildFunRoom(), laser: buildLaserRoom() };
    for (const r of Object.values(this.rooms)) this.scene.add(r.group);

    this.benji = new Card(OUTFITS[this.save.wearing]?.art ?? OUTFITS.starter.art, BENJI_HEIGHT);
    this.scene.add(this.benji.group);
    this.car = new CarModel("coupe", 0x14592f);
    this.city.exterior.add(this.car.group);
    this.traffic = new Traffic(this.stage.quality === "high" ? 14 : this.stage.quality === "medium" ? 10 : 6);
    this.city.exterior.add(this.traffic.group);
    this.people = new People(this.stage.quality === "low" ? 12 : 22);
    this.city.exterior.add(this.people.group);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 70, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    );
    this.beam.position.y = 35;
    this.beam.renderOrder = 4;
    this.city.exterior.add(this.beam);

    this.hoops = new Hoops(this);
    this.bowling = new Bowling(this);
    this.fishing = new Fishing(this);
    this.race = new StreetRace(this);
    this.kart = new KartRace(this);
    this.laser = new LaserTag(this);
    this.bounce = new Bounce(this);
    this.pit = new BallPit(this);
    this.whack = new Whack(this);
    this.popshot = new PopShot(this);

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
      card.place(x, z);
      card.heading = heading;
      (place === "street" ? this.city.exterior : this.rooms[place].group).add(card.group);
      this.npcs.push({ id, card, place, x, z, home: heading, rise });
    };
    put("kBlanco", "hq", this.rooms.hq.kSpot.x, this.rooms.hq.kSpot.z, this.rooms.hq.kSpot.heading, this.rooms.hq.kSpot.lift);
    put("courtOg", "street", a.ogSpot.x, a.ogSpot.z, 0);
    put("uncJ", "street", a.baitCounter.x + 2.4, a.baitCounter.z + 1.2, -Math.PI / 2);
    put("mamaDee", "street", a.truckCounter.x + 2.2, a.truckCounter.z - 0.4, Math.PI);
    put("nitro", "street", RACE_MEET.x, RACE_MEET.z, 0);
    put("strike", "bowl", this.rooms.bowl.strikeSpot.x, this.rooms.bowl.strikeSpot.z, this.rooms.bowl.strikeSpot.heading);
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

    // The coupe.
    this.carSpot = this.spot(
      "street",
      0,
      0,
      3.1,
      "Drive the coupe",
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
      () => (this.save.flags.carrying ? "Hand Court OG the drop" : "Run a 60-second shootout"),
      () => {
        if (this.save.flags.carrying) {
          this.save.flags.carrying = false;
          this.say("Court OG", "That's the new drop? Lil' man came through. Now let me see that jumper.");
          this.emit("delivered");
          return;
        }
        this.begin(this.hoops, "hoops");
        this.hoops.start();
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
          this.say("Unc J", "No bait, no fish. The shack's right there, nephew.");
          this.sound.bad();
          return;
        }
        this.begin(this.fishing, "fish");
        this.fishing.start(c);
      }),
    );

    // Food, bowling, the strip.
    this.spot("street", a.truckCounter.x, a.truckCounter.z, 2.6, "Order a plate", () => {
      this.foodAt = "trucks";
      this.open("food");
    });
    this.spot("bowl", bowl.desk.x, bowl.desk.z, 2.2, "Bowl a game ($5)", () => {
      if (!this.spend(5)) return;
      this.begin(this.bowling, "bowl");
      this.bowling.start();
    });
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
    this.spot("fun", fun.laserDoor.x, fun.laserDoor.z, 1.8, "Laser tag: 90 seconds", () => {
      this.transition(() => {
        this.setPlace("laser");
        this.begin(this.laser, "laser");
        this.laser.start();
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
      this.benji.setArt(OUTFITS.starter.art);
      this.driver.reset(CAR_START.x, CAR_START.z, CAR_START.heading);
      this.placeCar();
    }
    const s = this.save;
    const resume = !fresh && this.hasSave && s.step > 0;
    this.pos.x = resume ? s.x : START.x;
    this.pos.z = resume ? s.z : START.z;
    this.heading = resume ? s.heading : START.heading;
    this.camYaw = resume ? s.heading : Math.PI;
    this.mode = "walk";
    this.setPlace("street");
    this.snapCamera();
    this.sound.ui();
    if (!resume) this.say("K Blanco", "Benji! It's Drop Day. Come inside, I got something for you.", CAST.kBlanco.portrait);
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

  /** Activity is over: hand the controls back. */
  end(mode: Mode = "walk") {
    this.activity = null;
    this.mode = mode;
    this.live.meter = 0;
    this.live.tension = 0;
    this.benji.pose = null;
    this.benji.lift = 0;
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
    this.push();
    if (this.input.pad) setTimeout(() => this.onNav?.("init"), 60);
  }

  close() {
    const was = this.overlay;
    this.overlay = null;
    this.input.locked = false;
    this.input.clear();
    this.sound.duck(false);
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
    let d = dollars * (1 + (this.save.owned.length - 1) * COLLECTION_BONUS);
    if (this.time < this.fedUntil) d *= 1.1;
    if (opts.race && this.wearing("tour_black")) d *= 1.1;
    let r = respect;
    if (this.wearing("tour_white")) r *= 1.1;
    const dd = Math.round(d);
    const rr = Math.round(r);
    this.save.dollars += dd;
    this.save.respect += rr;
    if (dd > 0 && !opts.quiet) this.sound.cash();
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

  /** Something happened. Moves the story and the bounty board along. */
  emit(kind: string, n = 0, extra = 0) {
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
    if (step && hit) {
      const got = this.earn(step.pay, step.respect, { quiet: true });
      this.save.step++;
      this.sound.cheer();
      const next = STORY[this.save.step];
      this.toast(`${step.title}: done${got.dollars ? `  +$${got.dollars}` : ""}  +${got.respect} Respect`, 4);
      if (!next) {
        this.say("K Blanco", "You ran the whole Drop Day. The city's yours now. Check the board for more work.", CAST.kBlanco.portrait);
      } else if (next.done === "bought" && this.save.owned.length > 1) this.emit("bought");
      else if (next.done === "wore" && this.save.wearing !== "starter") this.emit("wore");
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
    if (this.stepId() === "meet") {
      this.save.flags.carrying = true;
      this.say("K Blanco", "Fresh off the press. Run this box to Court OG at the 901 Court, east on the river.", CAST.kBlanco.portrait);
      this.say("K Blanco", "And Benji, everything on these walls is real. Pick a piece, wear it out.", CAST.kBlanco.portrait);
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
    if (!f || !this.spend(f.cost)) return;
    this.fedUntil = this.time + f.seconds;
    this.toast(`${f.name}. ${f.line}`, 4);
    this.emit("ate");
    this.close();
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
      this.pos.x = p.x;
      this.pos.z = p.z + (p.id === "fun" ? -1.5 : 2);
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
    if (!this.overlay) this.activity?.tap?.(nx, ny);
  }

  say(who: string, text: string, portrait: string | null = null) {
    this.dialogue.push({ who, text, portrait, left: 2.6 + text.length * 0.05 });
    this.push();
  }

  toast(text: string, seconds = 3) {
    this.toastText = text;
    this.toastLeft = seconds;
    this.push();
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
    d.step(dt, { throttle: gas, steer: m.x, handbrake: this.input.down("action"), boost: false }, STREET, this.city.carSolids);
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
    this.car.place(d.x, d.y, d.z, d.heading);
    this.car.roll(d.forward * dt, d.steer * 0.5);
    this.car.lean(-d.steer * Math.min(1, d.speed / 20) * 0.05, 0);
    this.car.lamps(this.sky.look.lights > 0.4 ? 3 : 0.2, gas < 0 && d.forward > 1 ? 3 : 0.5);
    this.sound.setEngine(true, d.speed / STREET.top);
    if (this.input.hit("horn")) this.sound.horn();
    this.pos.x = d.x;
    this.pos.z = d.z;
    this.heading = d.heading;
    this.live.speed = d.speed * 2.237;
    if (this.input.hit("interact")) this.exitCar();
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
    const label = best ? best.label() : "";
    if (label !== this.prompt) {
      this.prompt = label;
      this.push();
    }
    if (this.input.hit("interact")) {
      // A door or a counter in reach wins over skipping a line of talk.
      if (best && !this.afterFade) {
        this.dialogue.length = 0;
        best.act();
      } else if (this.dialogue.length) {
        this.dialogue.shift();
        this.push();
      }
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
    const steps = Math.ceil(span / STEP);
    for (let i = 1; i <= steps; i++) this.tick(span / steps, i === steps);
  };

  private tick(dt: number, draw = true) {
    const input = this.input;
    input.driving = this.mode === "drive" || this.mode === "race" || this.mode === "kart";
    input.actionOnA = !!this.activity && !input.driving;
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
    if (this.mode !== "title") {
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

    const paused = this.overlay !== null;
    if (this.fadeTo === 1 && this.live.fade >= 1 && this.afterFade) {
      const f = this.afterFade;
      this.afterFade = null;
      f();
      this.fadeTo = 0;
    }
    this.live.fade += clamp(this.fadeTo - this.live.fade, -dt * 3.2, dt * 4.5);

    if (this.mode === "title") this.titleCamera(dt);
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
    this.benji.place(this.pos.x, this.pos.z);
    this.benji.heading = this.heading;
    this.benji.update(paused ? 0 : dt, cam, this.tint, this.floorY);
    for (const n of this.npcs) {
      if (n.place !== this.place) continue;
      const d = Math.hypot(this.pos.x - n.x, this.pos.z - n.z);
      const want = d < 7 ? Math.atan2(this.pos.x - n.x, this.pos.z - n.z) : n.home;
      n.card.heading = dampAngle(n.card.heading, want, damp(5, dt));
      n.card.update(dt, cam, this.tint, n.place === "street" ? null : this.rooms[n.place].floorY + 0.03 + n.rise);
    }

    // The city.
    const look = this.sky.look;
    _v.set(this.pos.x, 0, this.pos.z);
    this.sky.update(paused ? dt * 0.2 : dt, _v, this.camera);
    if (out) {
      this.city.update(dt, this.time);
      if (!paused) {
        const blockers = this.mode === "walk" ? [{ x: this.pos.x, z: this.pos.z, radius: 0.5, speed: 0 }] : [];
        blockers.push({ x: this.driver.x, z: this.driver.z, radius: 1.4, speed: this.driver.speed });
        this.traffic.update(dt, this.city.signals, blockers, cam);
        this.traffic.setLights(look.lights > 0.4 ? 3 : 0.2);
        this.people.update(dt, cam, this.tint, this.pos);
      }
      this.city.glow.apply(look.lights, look.roadRough);
      this.city.water.update(dt, look);
      if (this.mode !== "drive" && this.mode !== "race") this.car.lamps(0.1, 0.3);
      this.stage.renderer.toneMappingExposure = look.exposure;
      this.stage.setBloom(look.bloom);
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

    this.mark();

    // Talk and toasts run on the clock even in menus.
    if (this.dialogue.length) {
      const d = this.dialogue[0]!;
      d.left -= dt;
      if (d.left <= 0) {
        this.dialogue.shift();
        this.push();
      }
    }
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) {
        this.toastText = "";
        this.push();
      }
    }

    this.live.x = this.pos.x;
    this.live.z = this.pos.z;
    this.live.heading = this.heading;
    this.live.camYaw = this.camYaw;
    // A cabinet game covers the screen: draw the room behind it only now and then.
    if (draw) this.skip = this.overlay === "arcade" ? (this.skip + 1) % 12 : 0;
    if (this.skip === 0 && draw) this.stage.render();

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
      district: this.room ? { hq: "SackReligious HQ", home: "Home", bowl: "901 Bowl", fun: "The Fun House", laser: "Laser Arena" }[this.room.id as Exclude<Place, "street">] : districtAt(this.pos.x, this.pos.z),
      street: this.room ? "" : nearestStreet(this.pos.x, this.pos.z),
      phase: this.sky.phase,
      mission: step
        ? { chapter: CHAPTER, index: s.step + 1, total: STORY.length, title: step.title, detail: step.detail }
        : { chapter: "BOUNTY BOARD", index: (s.bounty % BOUNTIES.length) + 1, total: BOUNTIES.length, title: bounty.title, detail: `${bounty.detail}  $${bounty.pay}` },
      prompt: this.mode === "walk" && !this.overlay ? this.prompt : "",
      hints,
      dialogue: d ? { who: d.who, text: d.text, portrait: d.portrait } : null,
      toast: this.toastText,
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
      bounce: null,
      pit: null,
      whack: null,
      driving: this.mode === "drive",
      results: this.results,
      shopFocus: this.shopFocus,
      cabinet: this.cabinet,
      foodAt: this.foodAt,
      settings: { quality: this.stage.quality, auto: this.auto, music: this.sound.musicOn, sfx: this.sound.sfxOn, clock: this.sky.auto },
      hasSave: this.hasSave && s.step > 0,
      storyDone: !step,
      touch: this.input.touch,
      pad: this.input.pad,
    };
    this.activity?.hud(h);
    this.onHud(h);
  }

  /** Reach of the catalogue for the shop screen. */
  catalog() {
    return CATALOG;
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.persist();
    this.input.dispose();
    this.sound.dispose();
    this.stage.dispose();
  }
}
