import {
  APPAREL,
  ART_REV,
  DEFAULT_SETTINGS,
  NPCS,
  PAL,
  POIS,
  SAVE_KEY,
  SAVE_KEY_LEGACY,
  SAVE_KEY_LEGACY_V1,
  SAVE_VERSION,
  STREETS,
  TILE,
  TROPHIES,
  WORLD_PX_H,
  WORLD_PX_W,
  DROP_LIVE_LINES,
  AFTER_HOURS_LINES,
  createDropDayMission,
  createAfterHoursMission,
  createSideMissions,
} from "./data";
import { audio } from "./audio";
import { cleanSprite } from "./chroma";
import { InputManager } from "./input";
import type { World3D } from "./world3d";
import { CharacterController } from "./characterController";
import { loseWebGL, replaceCanvas } from "./webgl";
import { JUICE, emitBurst, stepParticles, type ScreenParticle } from "./juice";
import { DAY_START_HOUR, HOURS_PER_SECOND, nightAmount } from "./dayCycle";
import { spawnCityPeds, tickCityPed, PED_JOB_CHAT, boostDropLive, type PedActor } from "./cityLife";
import { dueMilestones, nextMilestone, type VerifiedReward } from "./progression";
import { sponsorHud } from "./sponsors";
import {
  DIFFICULTY,
  HORSE_CALLS,
  cycleDifficulty,
  horseDisplay,
  loadBoard,
  ogLine,
  pushBoard,
  type BoardRow,
  type CourtChallenge,
  type CourtDifficulty,
} from "./courtPlay";
import { dressBenji } from "./outfitCompositor";
import { lookFor, stampFor, overlayKey } from "./outfitLook";
import {
  aheadDistance,
  approachingCross,
  carBlocked,
  circleHitsRect,
  cityBlockBuildings,
  clippedTrafficLanes,
  destinationLane,
  inCourtPx,
  inDeepWater,
  isRoadPoint,
  laneVelocity,
  nearestAsphalt,
  onRiverfront,
  oppositeLaneId,
  poiColliders,
  riverHole,
  sidewalkRects,
  signalState,
  STOP_LINE,
  type Lane,
  type Rect,
} from "./worldTopology";
import {
  beginFishing,
  cancelFishing,
  fishingHud,
  idleFishing,
  tickFishing,
  type FishingState,
} from "./fishing";
import {
  FOOD_TRUCKS,
  foodHud,
  foodTruckById,
  isFoodTruck,
  mealName,
  type CoolerFish,
  type FoodTruckId,
} from "./foodTrucks";
import {
  createRun,
  finalizeRun,
  goodWindow,
  gradeRank,
  noteMistake,
  perfectWindow,
  scoreDelivery,
  scoreMake,
  scoreMiss,
  shotZone,
  tierFor,
  toHud,
  type DropRunState,
  type RunGrade,
} from "./dropRun";
import {
  beginRace,
  idleRace,
  playerWrongWay,
  progressOf,
  settleRace,
  tickAutoDrive,
  tickRaceCues,
  tickRival,
  armNextSegment,
  toRaceHud,
  RACE_CHECKPOINTS,
  type ArrowDir,
  type RaceState,
} from "./race";
import type {
  ApparelId,
  CinematicState,
  Dir,
  Floater,
  GameMode,
  GameSettings,
  HudSnapshot,
  LocationId,
  Mission,
  NpcDef,
  PauseTab,
  SideMission,
  TrophyId,
  WorldPoi,
} from "./types";
import { analytics } from "./analytics";
import { commerce } from "./commerce";
import { GAME_BUILD_VERSION } from "./config";

type ImgMap = Record<string, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${src}`));
		img.src = `${src}?v=${ART_REV}`;
	});
}
function clamp(v: number, a: number, b: number) {
	return Math.max(a, Math.min(b, v));
}
function dist(ax: number, ay: number, bx: number, by: number) {
	return Math.hypot(ax - bx, ay - by);
}
function insidePoi(x: number, y: number, p: WorldPoi, pad = 8) {
	return x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(x, y, w, h, r);
		return;
	}
	ctx.rect(x, y, w, h);
}
const PED_CHAT = [
	"You Benji? SackReligious got the city on lock.",
	"That hoodie hitting. Drop Day energy.",
	"Court down the block if you wanna hoop.",
	"In the $ack, we trust. Don't forget it.",
	"K Blanco inside HQ. Don't keep her waiting.",
	"901 all day. Keep it moving.",
	"Drop van's around the corner if you rolling product.",
	"Beale got the cypher tonight. Pull up.",
];
const PED_NAMES = ["Uncle Tone", "Keisha", "Lil Sack", "Ms. Pat", "Dre", "Big Ralph", "Nia", "Cam"];
function pedSpeaker(p: PedActor) {
	if (p.job === "photo") return p.skin % 2 === 0 ? "Flash" : "Block Photog";
	if (p.job === "fan") return p.skin % 2 === 0 ? "Drop Family" : "Gold Fit";
	if (p.job === "shopper") return "HQ Shopper";
	if (p.job === "spectator") return "Court Watcher";
	if (p.job === "waiter") return "On the Corner";
	if (p.job === "alight") return "Just Parked";
	if (p.job === "pair") return p.skin % 2 === 0 ? "Block Pair" : "Beale Pair";
	return PED_NAMES[p.skin % PED_NAMES.length] ?? "Local";
}
type PedLive = PedActor;
export class GameEngine {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	images: ImgMap = {};
	input = new InputManager();
	started = false;
	paused = false;
	userPaused = false;
	parentPaused = false;
	hiddenPaused = false;
	courtStartedAt = 0;
	mode: GameMode = "world";
	toast: string | null = null;
	toastT = 0;
	pauseTab: PauseTab = "resume";
	px = 288;
	py = 528;
	vx = 0;
	vy = 0;
	dir: Dir = "down";
	facing: Dir = "down";
	moving = false;
	animT = 0;
	bob = 0;
	camX = 0;
	camY = 0;
	lookX = 0;
	lookY = 0;
	yaw = 0;
	pitch = 0;
	trauma = 0;
	hitstop = 0;
	sackdollars = 25;
	respect = 0;
	owned: ApparelId[] = ["starter_tee"];
	equipped: ApparelId | null = "starter_tee";
	mission: Mission = createDropDayMission();
	afterHours: Mission = createAfterHoursMission();
	missionComplete = false;
	side: SideMission[] = createSideMissions();
	trophies: TrophyId[] = [];
	trophyPopup: { name: string; rank: string; t: number } | null = null;
	talked = new Set<string>();
	dialogue: HudSnapshot["dialogue"] = null;
	dialogueNpcId: string | null = null;
	dialogueLines: string[] = [];
	dialogueIndex = 0;
	ball = {
		active: false,
		score: 0,
		timeLeft: 50,
		shots: 0,
		power: 0,
		charging: false,
		ballX: 0,
		ballY: 0,
		ballZ: 36,
		ballVx: 0,
		ballVy: 0,
		ballVz: 0,
		inFlight: false,
		held: true,
		made: false,
		flash: 0,
		targetScore: 8,
		missionCredited: false,
		combo: 0,
		best: 0,
		shotDist: 0,
		grade: "" as "" | "PERFECT" | "GOOD" | "LATE",
		heat: 0,
		returnIn: 0,
		spotLabel: "MID",
		spotPts: 2,
		hoopId: 0,
		releaseT: 0,
		pending: null as null | { vx: number; vy: number; vz: number },
		scrambleT: 0,
	};
	courtHinted = false;
	highScore = 0;
	courtDifficulty: CourtDifficulty = "901";
	courtChallenge: CourtChallenge = "timed";
	courtMenu = false;
	ogBark: string | null = null;
	ogBarkT = 0;
	crowdPulse = 0;
	horseMisses = 0;
	horseIndex = 0;
	threesMade = 0;
	courtBoard: BoardRow[] = [];
	walls: { x: number; y: number; w: number; h: number }[] = [];
	trees: { x: number; y: number }[] = [];
	cars: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		w: number;
		color: string;
		laneId: string;
		skin: number;
		braking: boolean;
		yaw: number;
		turnT: number;
		turnTo: string | null;
		turnX: number;
		turnY: number;
	}[] = [];
	peds: PedLive[] = [];
	npcLive: { id: string; x: number; y: number; ox: number; oy: number; t: number }[] = [];
	poiBoxes: Rect[] = [];
	laneMap = new Map<string, Lane>();
	walks: Rect[] = [];
	shopOpen = false;
	foodMenu: FoodTruckId | null = null;
	foodApproach: FoodTruckId | null = null;
	foodServe: { truckId: FoodTruckId; t: number; duration: number; item: string } | null = null;
	sponsorOpen = false;
	cooler: CoolerFish[] = [];
	fedT = 0;
	eaten = new Set<string>();
	cinematic: CinematicState | null = null;
	letterbox = 0;
	worldHour = DAY_START_HOUR;
	settings: GameSettings = { ...DEFAULT_SETTINGS };
	interactHint: string | null = null;
	hintWalk = false;
	nearPoi: LocationId | null = null;
	nearNpc: string | null = null;
	nearPed = -1;
	nearCar = -1;
	vehicle: { kind: "van" | "car"; carIndex: number } | null = null;
	race: RaceState = idleRace();
	raceMenu = false;
	rivalCarIndex = -1;
	playerRaceCarIndex = -1;
	lastInteract = 0;
	particles: ScreenParticle[] = [];
	floaters: Floater[] = [];
	running = false;
	raf = 0;
	lastT = 0;
	onHud: ((h: HudSnapshot) => void) | null = null;
	onLoad: ((p: number) => void) | null = null;
	hudAcc = 0;
	clock = 0;
	mapCanvas: HTMLCanvasElement | null = null;
	leftSpawn = false;
	hasSave = false;
	world3d: World3D | null = null;
	overlay: HTMLCanvasElement | null = null;
	mover = new CharacterController();
	lastDt = 1 / 60;
	runIndex = 1;
	run: DropRunState = createRun(1);
	bestRunScore = 0;
	bestGrade: RunGrade | null = null;
	dropLive = false;
	dropLiveSeq = 0;
	verifiedOrders: string[] = [];
	unlocks = new Set<string>();
	vanSkin: "chrome" | "gold" | null = null;
	celebrate = 0;
	uiPulse = 0;
	punch = 0;
	hoopPulse = 0;
	plantSign = 0;
	fish: FishingState = idleFishing();
	lastDeliveryAt = 0;
	jooking = false;
	jookT = 0;
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const overlay = document.createElement("canvas");
		overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
		canvas.parentElement?.appendChild(overlay);
		this.overlay = overlay;
		this.ctx = overlay.getContext("2d")!;
		this.buildWorld();
	}
	async init() {
		await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
		await Promise.all(Object.entries({
			front: "/game/benji-front-norm.png",
			back: "/game/benji-back-norm.png",
			left: "/game/benji-left-norm.png",
			right: "/game/benji-right-norm.png",
			frontHi: "/game/benji-front.png",
			backHi: "/game/benji-back.png",
			leftHi: "/game/benji-left.png",
			rightHi: "/game/benji-right.png",
			threeQ: "/game/benji-three-quarter.png",
			icon: "/game/sack-icon.png",
			k: "/game/k-blanco-portrait.png",
			featured: "/game/featured-products.png",
			"walk-front-1": "/game/benji/walk-front-1.png",
			"walk-front-2": "/game/benji/walk-front-2.png",
			"walk-front-3": "/game/benji/walk-front-3.png",
			"walk-front-4": "/game/benji/walk-front-4.png",
			"walk-back-1": "/game/benji/walk-back-1.png",
			"walk-back-2": "/game/benji/walk-back-2.png",
			"walk-back-3": "/game/benji/walk-back-3.png",
			"walk-back-4": "/game/benji/walk-back-4.png",
			"walk-left-1": "/game/benji/walk-left-1.png",
			"walk-left-2": "/game/benji/walk-left-2.png",
			"walk-left-3": "/game/benji/walk-left-3.png",
			"walk-left-4": "/game/benji/walk-left-4.png",
			"walk-right-1": "/game/benji/walk-right-1.png",
			"walk-right-2": "/game/benji/walk-right-2.png",
			"walk-right-3": "/game/benji/walk-right-3.png",
			"walk-right-4": "/game/benji/walk-right-4.png",
			"jump-1": "/game/benji/jump-1.png",
			"jump-2": "/game/benji/jump-2.png",
			"jump-3": "/game/benji/jump-3.png",
			"jump-4": "/game/benji/jump-4.png",
			"dribble-1": "/game/benji/dribble-1.png",
			"dribble-2": "/game/benji/dribble-2.png",
			"dribble-3": "/game/benji/dribble-3.png",
			"dribble-4": "/game/benji/dribble-4.png",
			"gather-1": "/game/benji/gather-1.png",
			"gather-2": "/game/benji/gather-2.png",
			"release-1": "/game/benji/release-1.png",
			"release-2": "/game/benji/release-2.png",
			"rebound-1": "/game/benji/rebound-1.png",
			"rebound-2": "/game/benji/rebound-2.png",
			"celebrate-1": "/game/benji/celebrate-1.png",
			"celebrate-2": "/game/benji/celebrate-2.png",
			"talk-1": "/game/benji/talk-1.png",
			"interact-1": "/game/benji/interact-1.png",
			"phone-1": "/game/benji/phone-1.png",
			"overlay-tour-black-front": "/game/apparel/overlays/tour-black-front.png",
			"overlay-tour-black-back": "/game/apparel/overlays/tour-black-back.png",
			"overlay-tour-black-left": "/game/apparel/overlays/tour-black-left.png",
			"overlay-tour-black-right": "/game/apparel/overlays/tour-black-right.png",
			"overlay-tour-white-front": "/game/apparel/overlays/tour-white-front.png",
			"overlay-tour-white-back": "/game/apparel/overlays/tour-white-back.png",
			"overlay-tour-white-left": "/game/apparel/overlays/tour-white-left.png",
			"overlay-tour-white-right": "/game/apparel/overlays/tour-white-right.png",
			"overlay-tour-red-front": "/game/apparel/overlays/tour-red-front.png",
			"overlay-tour-red-back": "/game/apparel/overlays/tour-red-back.png",
			"overlay-tour-red-left": "/game/apparel/overlays/tour-red-left.png",
			"overlay-tour-red-right": "/game/apparel/overlays/tour-red-right.png",
			"tour-black-front": "/game/apparel/stamps/tour-black-print.png",
			"tour-black-back": "/game/apparel/stamps/tour-black-tour.png",
			"tour-white-front": "/game/apparel/stamps/tour-white-print.png",
			"tour-white-back": "/game/apparel/stamps/tour-white-tour.png",
			"tour-red-front": "/game/apparel/stamps/tour-red-print.png",
			"tour-red-back": "/game/apparel/stamps/tour-red-tour.png",
		}).map(async ([k, src]) => {
			try {
				this.images[k] = await loadImage(src);
			} catch { /* missing optional sprite */ }
		}));
		this.loadSave();
		this.paintMap();
		await this.bootWorld3D();
		this.input.bind();
		this.wireQa();
		this.applyQuality();
		this.grantTourTees();
		this.emitHud();
	}
	private async bootWorld3D() {
		const { World3D } = await import("./world3d");
		const attach = async (canvas: HTMLCanvasElement) => {
			const world = new World3D(canvas);
			this.canvas = world.renderer.domElement;
			world.overlay.remove();
			world.overlay = this.overlay!;
			this.ctx = world.overlay.getContext("2d")!;
			await world.loadTextures((d, t) => this.onLoad?.(d / t));
			world.buildCity(this.walls, this.trees);
			this.world3d = world;
		};
		try {
			await attach(this.canvas);
			return;
		} catch (err) {
			console.warn("[sack] WebGL boot failed, retrying with a fresh canvas", err);
		}
		try {
			this.world3d?.dispose();
		} catch {
			/* first attempt never stuck */
		}
		this.world3d = null;
		loseWebGL(this.canvas);
		const fresh = replaceCanvas(this.canvas);
		this.canvas = fresh;
		await attach(fresh);
	}
	buildWorld() {
		this.walls.push({
			x: 0,
			y: 0,
			w: WORLD_PX_W,
			h: 48 * .55
		}, {
			x: 0,
			y: WORLD_PX_H - 48 * .55,
			w: WORLD_PX_W,
			h: 48 * .55
		}, {
			x: 0,
			y: 0,
			w: 48 * .55,
			h: WORLD_PX_H
		}, {
			x: WORLD_PX_W - 48 * .55,
			y: 0,
			w: 48 * .55,
			h: WORLD_PX_H
		});
		this.walls.push(...cityBlockBuildings());
		const riverY = riverHole().y;
		for (let i = 0; i < 48; i++) {
			let x = (3 + i * 17 % 58) * 48;
			let y = (3 + i * 29 % 38) * 48;
			if (y > riverY - 80) y = riverY - 90 - (i % 5) * 18;
			if (inCourtPx(x, y) || inDeepWater(x, y) || isRoadPoint(x, y)) {
				x += 70;
				y += 54;
			}
			if (y < riverY - 36 && x > 48 && x < WORLD_PX_W - 48) this.trees.push({ x, y });
		}
		this.poiBoxes = poiColliders();
		this.walks = sidewalkRects();
		const carColors = [
			"#cfc8bf",
			"#1e293b",
			"#7f1d1d",
			"#3f3f46",
			"#f4f1ea",
			"#1e3a5f",
			"#b45309",
			"#44403c",
		];
		const lanes = clippedTrafficLanes();
		this.laneMap = new Map(lanes.map((l) => [l.id, l]));
		let ci = 0;
		for (const lane of lanes) {
			const count = lane.axis === "x" ? 4 : 3;
			for (let i = 0; i < count; i++) {
				const t = (i + 0.22) / count;
				const along = lane.min + (lane.max - lane.min) * t;
				const x = lane.axis === "x" ? along : lane.fixed;
				const y = lane.axis === "y" ? along : lane.fixed;
				if (inCourtPx(x, y) || inDeepWater(x, y, 22) || carBlocked(x, y, 20)) continue;
				let blocked = false;
				for (const box of this.poiBoxes) {
					if (circleHitsRect(x, y, 22, box)) {
						blocked = true;
						break;
					}
				}
				if (!blocked) {
					for (const w of this.walls) {
						if (circleHitsRect(x, y, 20, w)) {
							blocked = true;
							break;
						}
					}
				}
				if (blocked) continue;
				const vel = laneVelocity(lane);
				this.cars.push({
					x,
					y,
					vx: vel.vx,
					vy: vel.vy,
					w: 36 + ci % 3 * 6,
					color: carColors[ci % carColors.length]!,
					laneId: lane.id,
					skin: ci % 8,
					braking: false,
					yaw: Math.atan2(-vel.vy, vel.vx),
					turnT: 0,
					turnTo: null,
					turnX: 0,
					turnY: 0,
				});
				ci++;
			}
		}
		const strips = this.walks.filter((w) => w.w > 80 || w.h > 80);
		this.peds = spawnCityPeds(strips.length ? strips : this.walks);
		this.npcLive = NPCS.map((n) => ({
			id: n.id,
			x: n.x,
			y: n.y,
			ox: n.x,
			oy: n.y,
			t: Math.random() * 10
		}));
	}
	paintMap() {
		const c = document.createElement("canvas");
		c.width = WORLD_PX_W;
		c.height = WORLD_PX_H;
		const g = c.getContext("2d")!;
		g.fillStyle = "#2c332e";
		g.fillRect(0, 0, c.width, c.height);
		for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
			const px = x * 48;
			const py = y * 48;
			if (Math.abs(y - 20) <= 1 || Math.abs(y - 6) <= 0 || Math.abs(y - 34) <= 0 || Math.abs(x - 16) <= 1 || Math.abs(x - 34) <= 1 || Math.abs(x - 50) <= 0) {
				g.fillStyle = "#353b38";
				g.fillRect(px, py, 48, 48);
				g.strokeStyle = "rgba(250,204,21,0.28)";
				g.lineWidth = 2;
				g.setLineDash([10, 12]);
				g.beginPath();
				if (Math.abs(y - 20) <= 1 || y === 6 || y === 34) {
					g.moveTo(px, py + 48 / 2);
					g.lineTo(px + 48, py + 48 / 2);
				} else {
					g.moveTo(px + 48 / 2, py);
					g.lineTo(px + 48 / 2, py + 48);
				}
				g.stroke();
				g.setLineDash([]);
			} else {
				g.fillStyle = (x + y) % 7 === 0 ? "#3a423c" : (x + y) % 2 === 0 ? "#4a524c" : "#454d47";
				g.fillRect(px, py, 48, 48);
			}
		}
		g.fillStyle = "#5a625c";
		g.fillRect(0, 902, WORLD_PX_W, 8);
		g.fillRect(0, 1058, WORLD_PX_W, 8);
		g.fillStyle = "#2f4a36";
		for (let i = 0; i < 36; i++) {
			g.beginPath();
			g.ellipse(i * 173 % WORLD_PX_W, i * 241 % WORLD_PX_H, 36 + i % 5 * 12, 24 + i % 4 * 10, 0, 0, Math.PI * 2);
			g.fill();
		}
		for (const w of this.walls) {
			if (w.w >= 3070 || w.h >= 2302) continue;
			const grad = g.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
			const brick = (Math.floor(w.x / 48) + Math.floor(w.y / 48)) % 3;
			grad.addColorStop(0, brick === 0 ? "#2a201c" : brick === 1 ? "#1c2420" : "#1a1f24");
			grad.addColorStop(1, "#121614");
			g.fillStyle = grad;
			g.fillRect(w.x, w.y, w.w, w.h);
			g.strokeStyle = "#0a0c0b";
			g.lineWidth = 2;
			g.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
			g.fillStyle = "rgba(253, 224, 71, 0.1)";
			for (let wy = w.y + 14; wy < w.y + w.h - 14; wy += 20) for (let wx = w.x + 12; wx < w.x + w.w - 12; wx += 18) g.fillRect(wx, wy, 9, 11);
		}
		for (const p of POIS) if (p.id === "court") {
			g.fillStyle = "#c2410c";
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "#9a3412";
			g.fillRect(p.x + 10, p.y + 10, p.w - 20, p.h - 20);
			g.strokeStyle = "#fff";
			g.lineWidth = 3;
			g.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
			g.strokeRect(p.x + p.w / 2 - 42, p.y + 8, 84, 72);
			g.beginPath();
			g.arc(p.x + p.w / 2, p.y + 80, 42, 0, Math.PI);
			g.stroke();
			g.fillStyle = "#f97316";
			g.fillRect(p.x + p.w / 2 - 24, p.y + 4, 48, 7);
			g.strokeStyle = "#ef4444";
			g.lineWidth = 3;
			g.beginPath();
			g.arc(p.x + p.w / 2, p.y + 22, 13, 0, Math.PI * 2);
			g.stroke();
			g.fillStyle = "rgba(255,255,255,0.3)";
			g.font = "bold 13px sans-serif";
			g.fillText("901 COURT", p.x + 22, p.y + p.h - 14);
		} else if (p.id === "dropvan") {
			g.fillStyle = "#1c1917";
			g.fillRect(p.x, p.y + 10, p.w, p.h - 10);
			g.fillStyle = "#292524";
			g.fillRect(p.x + 8, p.y, p.w - 16, 18);
			g.fillStyle = "#1db954";
			g.font = "bold 12px sans-serif";
			g.fillText("DROP VAN", p.x + 10, p.y + p.h / 2);
		} else if (p.id === "pyramid") {
			g.fillStyle = "#1c1917";
			g.beginPath();
			g.moveTo(p.x + p.w / 2, p.y);
			g.lineTo(p.x + p.w, p.y + p.h);
			g.lineTo(p.x, p.y + p.h);
			g.closePath();
			g.fill();
			g.fillStyle = "#292524";
			g.beginPath();
			g.moveTo(p.x + p.w / 2, p.y + 18);
			g.lineTo(p.x + p.w - 16, p.y + p.h);
			g.lineTo(p.x + 16, p.y + p.h);
			g.closePath();
			g.fill();
			g.fillStyle = "#1db954";
			g.font = "bold 12px sans-serif";
			g.fillText("PYRAMID", p.x + 18, p.y + p.h - 10);
		} else if (p.id === "river") {
			const river = g.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
			river.addColorStop(0, "#245a7a");
			river.addColorStop(0.35, "#163e58");
			river.addColorStop(1, "#0b1c2b");
			g.fillStyle = river;
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "#6b5340";
			g.fillRect(p.x, p.y - 18, p.w, 22);
			g.fillStyle = "rgba(190,220,235,0.18)";
			for (let i = 0; i < 28; i++) g.fillRect(p.x + 24 + i * 110, p.y + 28 + i % 4 * 18, 54, 3);
		} else if (p.id === "beale") {
			g.fillStyle = "#14532d";
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "#1db954";
			for (let i = 0; i < 5; i++) g.fillRect(p.x + 16 + i * 70, p.y + 8, 36, 8);
			g.fillStyle = "#f2f5f3";
			g.font = "bold 14px sans-serif";
			g.fillText("BEALE STREET", p.x + 24, p.y + p.h / 2 + 4);
		} else {
			g.fillStyle = p.color;
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "rgba(0,0,0,0.28)";
			g.fillRect(p.x, p.y + p.h - 20, p.w, 20);
			g.fillStyle = "#0a0c0b";
			g.fillRect(p.x + p.w / 2 - 14, p.y + p.h - 36, 28, 36);
			g.fillStyle = "#1db954";
			g.font = "bold 13px sans-serif";
			g.fillText(p.label, p.x + 10, p.y + 22);
			if (p.id === "store") {
				g.fillStyle = "#f2f5f3";
				g.font = "bold 15px sans-serif";
				g.fillText("$ACKRELIGIOUS", p.x + 16, p.y + 48);
				g.fillStyle = "#1db954";
				g.font = "11px sans-serif";
				g.fillText("IN THE $ACK, WE TRUST", p.x + 16, p.y + 66);
			}
		}
		const store = POIS.find((p) => p.id === "store");
		if (store) {
			g.globalAlpha = .16;
			g.fillStyle = "#1db954";
			g.beginPath();
			g.arc(store.x + store.w / 2, store.y + store.h + 50, 40, 0, Math.PI * 2);
			g.fill();
			g.globalAlpha = 1;
		}
		for (const t of this.trees) {
			g.fillStyle = "#1a2e1f";
			g.beginPath();
			g.arc(t.x, t.y, 16, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = "#2d5a3a";
			g.beginPath();
			g.arc(t.x - 4, t.y - 4, 12, 0, Math.PI * 2);
			g.fill();
		}
		const riverEdge = g.createLinearGradient(0, riverHole().y - 24, 0, WORLD_PX_H);
		riverEdge.addColorStop(0, "rgba(30, 64, 100, 0)");
		riverEdge.addColorStop(1, "rgba(20, 50, 90, 0.35)");
		g.fillStyle = riverEdge;
		g.fillRect(0, riverHole().y - 24, WORLD_PX_W, WORLD_PX_H - riverHole().y + 24);
		g.fillStyle = "#0d1210";
		for (let i = 0; i < 22; i++) g.fillRect(90 + i * 130, 28, 44 + i % 3 * 18, 36 + i * 37 % 72);
		g.fillStyle = "rgba(242,245,243,0.22)";
		g.font = "bold 11px sans-serif";
		for (const s of STREETS) if (s.axis === "y") g.fillText(s.name, 80, s.tile * 48 - 8);
		else g.fillText(s.name, s.tile * 48 + 8, 70);
		this.mapCanvas = c;
	}
	wireQa() {
		if (typeof window === "undefined") return;
		window.__controlsTest = {
			getYaw: () => this.yaw,
			getSpeed: () => this.mover.speed,
			getFacing: () => this.facing,
			setKeys: (codes: string[]) => {
				this.input.keys.clear();
				for (const c of codes) this.input.keys.add(c);
			},
			tapArrow: (dir: "left" | "right" | "up") => {
				this.input.queueArrow(dir);
			},
		};
		window.__gameTest = {
			teleport: (loc: string) => {
				if (this.mode === "basketball") this.exitBasketball();
				if (this.mode === "shop") this.closeShop();
				if (this.mode === "dialogue") {
					this.mode = "world";
					this.dialogue = null;
				}
				this.exitVehicle();
				this.cinematic = null;
				const p = POIS.find((x) => x.id === loc);
				if (!p) return;
				this.px = p.x + p.w / 2;
				this.py = p.id === "river" ? p.y - 28 : p.y + p.h + 24;
				this.leftSpawn = true;
				this.updateProximity();
				this.emitHud();
			},
			enterHQ: () => {
				if (this.mode === "basketball") this.exitBasketball();
				if (this.mode === "shop") this.closeShop();
				this.mode = "world";
				this.dialogue = null;
				this.exitVehicle();
				this.cinematic = null;
				const hq = POIS.find((p) => p.id === "store")!;
				this.px = hq.x + hq.w / 2;
				this.py = hq.y + hq.h * 0.62;
				this.yaw = 0;
				this.leftSpawn = true;
				this.updateProximity();
				this.emitHud();
			},
			getState: () => ({
				sackdollars: this.sackdollars,
				step: this.mission.steps[this.mission.activeStep]?.id ?? "done",
				mode: this.mode,
				score: this.ball.score,
				missionComplete: this.missionComplete,
				facing: this.facing,
				px: this.px,
				py: this.py,
				vx: this.vx,
				vy: this.vy,
				air: this.mover.air,
				loco: this.mover.state,
				equipped: this.equipped,
				respect: this.respect,
				owned: [...this.owned],
				saveVersion: SAVE_VERSION,
				dropLive: this.dropLive,
				driving: !!this.vehicle,
				vehicleKind: this.vehicle?.kind ?? null,
				raceActive: this.race.active,
				racePhase: this.race.phase,
				raceLap: this.race.player.lap,
				racePlace: this.race.place,
				raceTime: this.race.time,
				rivalX: this.race.rival.x,
				rivalY: this.race.rival.y,
				interactHint: this.interactHint,
				nearPoi: this.nearPoi,
				raceCue: this.race.cue?.dir ?? null,
				raceCueStatus: this.race.cue?.status ?? null,
				raceCruise: this.race.cruise,
				raceBoost: this.race.boostT > 0,
				raceSlow: this.race.slowT > 0,
			}),
			setBallScore: (n: number) => {
				this.ball.score = n;
				this.tryCreditBasketball();
				this.emitHud();
			},
			advanceDialogue: () => this.advanceDialogue(),
			interact: () => {
				this.lastInteract = 0;
				this.tryInteract();
			},
			resetSave: () => this.resetProgress(),
			buyItem: (id: string) => this.buyItem(id as ApparelId),
			openShop: () => this.openShop(),
			wearProduct: (id: string) => this.wearProduct(id as ApparelId),
			startRace: (skip = true) => this.startRace(skip),
			leaveRace: () => this.leaveRace(),
			completeRace: (win = true) => this.debugCompleteRace(win),
			startFishing: () => this.startFishing(),
		};
	}
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.input.unbind();
		this.world3d?.dispose();
		this.world3d = null;
		loseWebGL(this.canvas);
		this.overlay?.remove();
		this.overlay = null;
	}
	setPauseReason(source: "user" | "parent" | "hidden", on: boolean) {
		if (source === "user") this.userPaused = on;
		else if (source === "parent") this.parentPaused = on;
		else this.hiddenPaused = on;
		const next = this.userPaused || this.parentPaused || this.hiddenPaused;
		if (next === this.paused) return;
		this.paused = next;
		if (this.paused) this.pauseTab = "resume";
		this.emitHud();
	}
	start(fresh = false) {
		audio.unlock();
		audio.confirm();
		if (fresh) this.resetProgress(false);
		this.started = true;
		this.userPaused = false;
		this.setPauseReason("user", false);
		this.cinematic = {
			kind: "briefing",
			title: "THE DROP DAY",
			subtitle: this.missionComplete ? "MEMPHIS  ·  FREE ROAM" : "CHAPTER 01  ·  MEMPHIS 901",
			t: 0,
			duration: 3.4
		};
		this.letterbox = 1;
		analytics.track(fresh || !this.hasSave ? "new_game" : "game_started", {
			chapter: this.mission.chapter,
			mission: this.mission.id,
		});
		const first = this.mission.steps.find((s) => !s.done);
		if (first) analytics.track("mission_started", { stepId: first.id, label: first.label });
		this.emitHud();
	}
	resetProgress(emit = true) {
		try {
			localStorage.removeItem(SAVE_KEY);
			localStorage.removeItem(SAVE_KEY_LEGACY);
			localStorage.removeItem(SAVE_KEY_LEGACY_V1);
		} catch { /* storage */ }
		this.mission = createDropDayMission();
		this.afterHours = createAfterHoursMission();
		this.side = createSideMissions();
		this.missionComplete = false;
		this.sackdollars = 25;
		this.respect = 0;
		this.owned = ["starter_tee"];
		this.grantTourTees();
		this.equipped = "starter_tee";
		this.trophies = [];
		this.talked.clear();
		this.px = 288;
		this.py = 528;
		this.leftSpawn = false;
		this.mover.reset(0);
		this.vx = 0;
		this.vy = 0;
		this.mode = "world";
		this.shopOpen = false;
		this.foodMenu = null;
		this.foodApproach = null;
		this.foodServe = null;
		this.sponsorOpen = false;
		this.cooler = [];
		this.fedT = 0;
		this.eaten = new Set();
		this.dialogue = null;
		this.ball.missionCredited = false;
		this.ball.best = 0;
		this.ball.targetScore = 8;
		this.worldHour = DAY_START_HOUR;
		this.hasSave = false;
		this.runIndex = 1;
		this.run = createRun(1);
		this.bestRunScore = 0;
		this.bestGrade = null;
		this.dropLive = false;
		this.dropLiveSeq = 0;
		this.verifiedOrders = [];
		this.unlocks = new Set();
		this.vanSkin = null;
		this.celebrate = 0;
		audio.dropLive = false;
		this.uiPulse = 0;
		this.punch = 0;
		this.vehicle = null;
		this.race = idleRace();
		this.raceMenu = false;
		this.rivalCarIndex = -1;
		this.playerRaceCarIndex = -1;
		this.hoopPulse = 0;
		this.lastDeliveryAt = 0;
		if (emit) this.emitHud();
	}
	showToast(msg: string, t = 3.1) {
		this.toast = msg;
		this.toastT = t;
	}
	float(text: string, color: string, x = this.px, y = this.py - 50) {
		this.floaters.push({
			x,
			y,
			vy: -42,
			life: 1.2,
			text,
			color,
			scale: 1.35
		});
	}
	addTrauma(v: number) {
		if (!this.settings.shake || this.settings.reduceMotion) return;
		this.trauma = clamp(this.trauma + v, 0, 1);
	}
	addPunch(v: number) {
		this.punch = Math.min(1, this.punch + v);
	}
	currentTier() {
		return tierFor(this.runIndex);
	}
	activeQuest() {
		return this.mission.complete ? this.afterHours : this.mission;
	}
	loadSave() {
		try {
			let raw = localStorage.getItem(SAVE_KEY);
			if (!raw) raw = localStorage.getItem(SAVE_KEY_LEGACY);
			if (!raw) raw = localStorage.getItem(SAVE_KEY_LEGACY_V1);
			this.hasSave = !!raw;
			if (!raw) return;
			const data = JSON.parse(raw);
			this.sackdollars = data.sackdollars ?? 25;
			this.respect = data.respect ?? 0;
			this.owned = data.owned?.length ? data.owned : ["starter_tee"];
			this.grantTourTees();
			this.equipped = data.equipped;
			this.mission.complete = data.missionComplete ?? false;
			this.missionComplete = this.mission.complete;
			this.dropLive = !!data.dropLive || this.missionComplete;
			this.verifiedOrders = Array.isArray(data.verifiedOrders) ? data.verifiedOrders : [];
			this.unlocks = new Set(Array.isArray(data.unlocks) ? data.unlocks : []);
			this.vanSkin = data.vanSkin === "chrome" || data.vanSkin === "gold" ? data.vanSkin : null;
			if (this.dropLive) {
				audio.dropLive = true;
				this.seedDropLiveCity();
			}
			for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
			const firstUndone = this.mission.steps.findIndex((s) => !s.done);
			this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
			this.trophies = data.trophies ?? [];
			this.highScore = data.basketballHighScore ?? 0;
			this.courtBoard = loadBoard();
			const hour = data.worldHour ?? DAY_START_HOUR;
			this.worldHour = hour >= 16 && hour < 17.5 ? DAY_START_HOUR : hour;
			if (data.settings) this.settings = {
				...DEFAULT_SETTINGS,
				...data.settings
			};
			if (data.sideProgress) for (const s of this.side) s.done = !!data.sideProgress[s.id];
			if (Array.isArray(data.cooler)) this.cooler = data.cooler.filter((f: CoolerFish) => f && f.name && f.weightLb).slice(0, 8);
			if (Array.isArray(data.eaten)) this.eaten = new Set(data.eaten.filter((id: string) => isFoodTruck(id)));
			if (data.afterHoursProgress) {
				this.afterHours = createAfterHoursMission();
				for (const s of this.afterHours.steps) s.done = !!data.afterHoursProgress[s.id];
				const undone = this.afterHours.steps.findIndex((s) => !s.done);
				this.afterHours.complete = undone === -1;
				this.afterHours.activeStep = undone === -1 ? this.afterHours.steps.length : undone;
			}
			this.runIndex = Math.max(1, data.dropRunIndex ?? 1);
			const tier = this.currentTier();
			if (this.missionComplete) {
				this.run = createRun(this.runIndex);
			} else {
				this.mission = createDropDayMission({ order: tier.deliveryOrder, courtTarget: tier.courtTarget });
				for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
				const firstUndone = this.mission.steps.findIndex((s) => !s.done);
				this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
				this.run = createRun(this.runIndex);
				if (data.dropRun) {
					this.run.active = !!data.dropRun.active;
					this.run.time = data.dropRun.time ?? 0;
					this.run.deliveries = data.dropRun.deliveries ?? 0;
					this.run.combo = data.dropRun.combo ?? 0;
					this.run.bestCombo = data.dropRun.bestCombo ?? 0;
					this.run.mistakes = data.dropRun.mistakes ?? 0;
					this.run.ballMakes = data.dropRun.ballMakes ?? 0;
					this.run.ballPerfects = data.dropRun.ballPerfects ?? 0;
					this.run.ballScore = data.dropRun.ballScore ?? 0;
					this.run.points = data.dropRun.points ?? 0;
					this.run.grade = data.dropRun.grade ?? null;
				} else if (this.mission.steps.find((s) => s.id === "pickup")?.done) {
					this.run.active = true;
				}
			}
			this.ball.targetScore = tier.courtTarget;
			this.bestRunScore = data.bestRunScore ?? 0;
			this.bestGrade = data.bestGrade ?? null;
			this.repairMission();
			if (!localStorage.getItem(SAVE_KEY)) {
				data.version = SAVE_VERSION;
				localStorage.setItem(SAVE_KEY, JSON.stringify(data));
			}
		} catch { /* storage */ }
	}
	save() {
		const progress: Record<string, boolean> = {};
		for (const s of this.mission.steps) progress[s.id] = s.done;
		const sideProgress: Record<string, boolean> = {};
		for (const s of this.side) sideProgress[s.id] = s.done;
		const afterHoursProgress: Record<string, boolean> = {};
		for (const s of this.afterHours.steps) afterHoursProgress[s.id] = s.done;
		const data = {
			version: SAVE_VERSION,
			sackdollars: this.sackdollars,
			respect: this.respect,
			owned: this.owned,
			equipped: this.equipped,
			missionProgress: progress,
			missionActiveStep: this.mission.activeStep,
			missionComplete: this.mission.complete,
			basketballHighScore: this.highScore,
			tutorialDone: true,
			trophies: this.trophies,
			sideProgress,
			worldHour: this.worldHour,
			settings: this.settings,
			dropLive: this.dropLive,
			dropRunIndex: this.runIndex,
			dropRun: {
				active: this.run.active,
				time: this.run.time,
				deliveries: this.run.deliveries,
				combo: this.run.combo,
				bestCombo: this.run.bestCombo,
				mistakes: this.run.mistakes,
				ballMakes: this.run.ballMakes,
				ballPerfects: this.run.ballPerfects,
				ballScore: this.run.ballScore,
				points: this.run.points,
				grade: this.run.grade,
			},
			verifiedOrders: this.verifiedOrders,
			unlocks: [...this.unlocks],
			vanSkin: this.vanSkin,
			bestRunScore: this.bestRunScore,
			bestGrade: this.bestGrade,
			afterHoursProgress,
			cooler: this.cooler.slice(0, 8),
			eaten: [...this.eaten],
		};
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
			this.hasSave = true;
		} catch { /* storage */ }
	}
	applySettings(next: Partial<GameSettings>) {
		this.settings = {
			...this.settings,
			...next
		};
		audio.setVolumes(this.settings);
		this.applyQuality();
		this.save();
		this.emitHud();
	}
	applyQuality() {
		const dpr = Math.min(window.devicePixelRatio || 1, this.settings.quality === "low" ? 1 : this.settings.quality === "medium" ? 1.35 : 1.75);
		this.world3d?.renderer.setPixelRatio(dpr);
		if (this.world3d) {
			this.world3d.renderer.shadowMap.enabled = this.settings.quality !== "low";
		}
	}
	returnToTitle() {
		this.userPaused = false;
		this.setPauseReason("user", false);
		this.started = false;
		this.mode = "world";
		this.shopOpen = false;
		this.dialogue = null;
		this.cinematic = null;
		audio.ui();
		this.emitHud();
	}
	restartMission() {
		this.resetProgress(false);
		this.start(true);
	}
	setPauseTab(tab: PauseTab) {
		this.pauseTab = tab;
		audio.ui();
		this.emitHud();
	}
	resume() {
		this.setPauseReason("user", false);
		audio.ui();
	}
	startLoop() {
		this.running = true;
		this.lastT = performance.now();
		const frame = (t: number) => {
			if (!this.running) return;
			let dt = (t - this.lastT) / 1e3;
			this.lastT = t;
			dt = Math.min(dt, .1);
			this.update(dt);
			this.draw();
			this.hudAcc += dt;
			if (this.hudAcc > .08) {
				this.hudAcc = 0;
				this.emitHud();
			}
			this.raf = requestAnimationFrame(frame);
		};
		this.raf = requestAnimationFrame(frame);
	}
	update(dt: number) {
		this.lastDt = dt;
		this.clock += dt;
		const act = this.input.poll();
		audio.tick(dt, this.started && !this.paused, nightAmount(this.worldHour));
		if (this.started && act.pausePressed && !this.cinematic) {
			if (this.mode === "shop") this.closeShop();
			else if (this.foodMenu) this.closeFood();
			else if (this.sponsorOpen) this.closeSponsor();
			else if (this.courtMenu) this.closeCourtMenu();
			else if (this.mode === "dialogue") this.advanceDialogue();
			else if (this.mode === "basketball" && act.backPressed) this.exitBasketball();
			else {
				this.setPauseReason("user", !this.userPaused);
				audio.ui();
			}
		}
		if (this.hitstop > 0) {
			this.hitstop -= dt;
			this.trauma = Math.max(0, this.trauma - dt * 1.6);
			this.punch = Math.max(0, this.punch - dt * 2.4);
			this.hoopPulse = Math.max(0, this.hoopPulse - dt * 4);
			return;
		}
		if (this.toastT > 0) {
			this.toastT -= dt;
			if (this.toastT <= 0) this.toast = null;
		}
		if (this.trophyPopup) {
			this.trophyPopup.t -= dt;
			if (this.trophyPopup.t <= 0) this.trophyPopup = null;
		}
		this.trauma = Math.max(0, this.trauma - dt * 1.7);
		this.uiPulse = Math.max(0, this.uiPulse - dt * 2.6);
		this.punch = Math.max(0, this.punch - dt * 3.1);
		this.hoopPulse = Math.max(0, this.hoopPulse - dt * 3.4);
		this.letterbox += ((this.cinematic ? 1 : 0) - this.letterbox) * (1 - Math.exp(-8 * dt));
		this.celebrate = Math.max(0, this.celebrate - dt * 0.18);
		if (this.dropLiveSeq > 0) {
			this.dropLiveSeq -= dt;
			this.crowdPulse = Math.max(this.crowdPulse, 0.7);
		}
		stepParticles(this.particles, dt);
		for (let i = this.floaters.length - 1; i >= 0; i--) {
			const f = this.floaters[i];
			if (!f) continue;
			f.y += f.vy * dt;
			f.life -= dt;
			f.scale += (1 - f.scale) * (1 - Math.exp(-10 * dt));
			if (f.life <= 0) this.floaters.splice(i, 1);
		}
		if (this.run.active) this.run.time += dt;
		if (this.cinematic) {
			this.cinematic.t += dt;
			if (this.cinematic.t >= this.cinematic.duration) {
				const kind = this.cinematic.kind;
				this.cinematic = null;
				if (kind === "briefing") {
					const wake = this.mission.steps.find((s) => s.id === "wake");
					if (wake && !wake.done) this.showToast("You're home. Walk south through the door.");
					else this.showToast(this.runIndex > 1 ? `Run ${this.runIndex}. Link with K Blanco at HQ.` : "Drop Day is live. Find K Blanco at HQ.");
				}
				if (kind === "droplive") {
					this.openDialogue("k_blanco");
				}
				if (kind === "afterhours") {
					this.showToast("After Hours locked. Side jobs still print Respect.");
				}
				this.emitHud();
			}
		}
		if (!this.started || this.paused) return;
		if (act.viewPressed) this.toggleView();
		const lookMul = this.settings.sensitivity || 1;
		if (Math.abs(act.lookX) <= 1.25) this.yaw -= act.lookX * 2.2 * dt * lookMul;
		else this.yaw -= act.lookX * 0.032 * lookMul;
		if (Math.abs(act.lookY) <= 1.25) this.pitch -= act.lookY * 1.7 * dt * lookMul;
		else this.pitch -= act.lookY * 0.028 * lookMul;
		this.pitch = clamp(this.pitch, -1.15, 1.15);
		this.worldHour = (this.worldHour + dt * HOURS_PER_SECOND) % 24;
		if (this.worldHour >= 20 && this.worldHour < 20.1) this.unlockTrophy("night_owl");
		this.updateTraffic(dt);
		this.updatePeds(dt);
		if (this.mode === "dialogue") {
			if (act.interactPressed || act.shootPressed) this.advanceDialogue();
			return;
		}
		if (this.foodMenu) {
			if (act.backPressed) this.closeFood();
			return;
		}
		if (this.sponsorOpen) {
			if (act.backPressed) this.closeSponsor();
			return;
		}
		if (this.mode === "shop" || this.mode === "menu") return;
		if (this.fish.active) {
			this.updateFishing(dt, act.shoot, act.shootPressed, act.shootReleased);
			this.updatePlayer(dt, 0, 0, false, false, false);
			this.updateProximity();
			if (act.backPressed || act.pausePressed) this.stopFishing();
			return;
		}
		const hoopin = this.canShoot();
		if (hoopin) {
			if (act.shootPressed) this.beginCharge();
			if (act.shootReleased) this.releaseShot();
		}
		if (this.mode === "basketball") {
			if (act.backPressed) this.exitBasketball();
			this.updatePlayer(dt, act.mx, act.my, act.run, false, false);
			if (this.ball.charging) this.squareToHoop(dt);
			this.updateBasketball(dt);
			return;
		}
		if (this.cinematic) return;
		if (this.race.active && this.race.phase === "countdown") {
			this.updateRace(dt, act.arrowTap);
			this.updateProximity();
			this.syncRivalCar();
			if (act.backPressed) this.leaveRace();
			return;
		}
		if (this.race.phase === "finish" && this.race.recap) {
			this.syncRivalCar();
			return;
		}
		if (this.race.active && this.race.phase === "green") {
			this.updateRace(dt, act.arrowTap);
			this.updateProximity();
			this.syncRivalCar();
			if (act.backPressed) this.leaveRace();
			return;
		}
		this.fedT = Math.max(0, this.fedT - dt);
		if (this.foodServe) {
			const prev = this.foodServe.t;
			this.foodServe.t -= dt;
			if (prev > 0.95 && this.foodServe.t <= 0.95) {
				this.float("ORDER UP", PAL.gold);
				audio.cash();
			}
			if (this.foodServe.t <= 0) {
				this.showToast(`Got it · ${this.foodServe.item}`);
				this.foodServe = null;
			}
		}
		this.mover.walkSpeed = this.fedT > 0 ? 188 : 168;
		this.mover.runSpeed = this.fedT > 0 ? 292 : 268;
		this.updatePlayer(dt, act.mx, act.my, act.run, hoopin ? false : act.jumpPressed, hoopin ? false : act.jump);
		this.updateProximity();
		this.checkMissionAuto();
		this.checkSideVisits();
		this.updateJookin(dt, act.jook, act.jookPressed);
		if (hoopin) {
			if (this.ball.charging) this.squareToHoop(dt);
			this.updateBasketball(dt);
		} else if (this.ball.inFlight) {
			this.updateBasketball(dt);
		} else {
			this.ball.charging = false;
			this.ball.active = false;
		}
		if (act.interactPressed) this.tryInteract();
		if (this.vehicle && act.backPressed) {
			if (this.race.active && this.race.phase !== "finish") this.leaveRace();
			else this.exitVehicle();
		}
	}
	updateTraffic(dt: number) {
		const racing = this.race.active && (this.race.phase === "countdown" || this.race.phase === "green" || this.race.phase === "finish");
		for (let i = 0; i < this.cars.length; i++) {
			const c = this.cars[i]!;
			if (this.vehicle?.kind === "car" && this.vehicle.carIndex === i) {
				c.x = this.px;
				c.y = this.py;
				c.vx = this.vx;
				c.vy = this.vy;
				c.braking = false;
				c.yaw = this.yaw + Math.PI / 2;
				continue;
			}
			if (c.laneId === "RIVAL" || c.laneId === "RACER") continue;
			if (racing) {
				c.vx = 0;
				c.vy = 0;
				c.braking = true;
				if (carBlocked(c.x, c.y, 18)) {
					const safe = nearestAsphalt(c.x, c.y);
					c.x = safe.x;
					c.y = safe.y;
					if (safe.laneId) c.laneId = safe.laneId;
				}
				continue;
			}
			if (c.turnTo && c.turnT < 1) {
				c.turnT = Math.min(1, c.turnT + dt / 0.95);
				const s = c.turnT * c.turnT * (3 - 2 * c.turnT);
				const dest = this.laneMap.get(c.turnTo);
				if (dest) {
					const x1 = dest.axis === "x" ? c.turnX : dest.fixed;
					const y1 = dest.axis === "y" ? c.turnY : dest.fixed;
					c.x += (x1 - c.x) * (0.18 + s * 0.55);
					c.y += (y1 - c.y) * (0.18 + s * 0.55);
					const vel = laneVelocity(dest, 0.7);
					c.vx += (vel.vx - c.vx) * 0.2;
					c.vy += (vel.vy - c.vy) * 0.2;
					c.yaw = Math.atan2(-c.vy, c.vx);
					c.braking = false;
					if (c.turnT >= 1) {
						c.laneId = dest.id;
						if (dest.axis === "x") c.y = dest.fixed;
						else c.x = dest.fixed;
						c.turnTo = null;
					}
				} else {
					c.turnTo = null;
					c.turnT = 0;
				}
				continue;
			}
			const lane = this.laneMap.get(c.laneId);
			if (!lane) continue;
			if (lane.axis === "x") c.y += (lane.fixed - c.y) * (1 - Math.exp(-8 * dt));
			else c.x += (lane.fixed - c.x) * (1 - Math.exp(-8 * dt));
			let scale = 1;
			for (const o of this.cars) {
				if (o === c || o.laneId === "RIVAL" || o.laneId === "RACER") continue;
				const d = aheadDistance(c, o);
				if (d < 92) scale = Math.min(scale, Math.max(0, (d - 40) / 52));
			}
			const pd = aheadDistance(c, { x: this.px, y: this.py });
			if (pd < 86) scale = Math.min(scale, Math.max(0, (pd - 34) / 52));
			const along = lane.axis === "x" ? c.x : c.y;
			const approach = approachingCross(lane, along);
			if (approach) {
				const light = signalState(this.clock, lane.axis, approach.ix, approach.iy);
				const toLine = approach.delta - STOP_LINE;
				if ((light === "red" || light === "yellow") && toLine > -18 && approach.delta > 0) {
					if (toLine < 10) scale = 0;
					else if (toLine < 56) scale = Math.min(scale, Math.max(0.05, (toLine - 8) / 70));
				}
				if (light === "green" && approach.delta < 22 && approach.delta > -8 && !c.turnTo) {
					let blocked = false;
					for (const o of this.cars) {
						if (o === c) continue;
						if (Math.hypot(o.x - approach.ix, o.y - approach.iy) < 58) {
							blocked = true;
							break;
						}
					}
					const roll = Math.abs(Math.sin(i * 12.9898 + approach.center * 0.017 + this.clock * 0.02));
					const turn = !blocked && roll < 0.18 ? "left" : !blocked && roll < 0.32 ? "right" : null;
					if (turn) {
						const dest = destinationLane(lane, approach.center, turn);
						if (dest && !inCourtPx(dest.axis === "x" ? approach.center : dest.fixed, dest.axis === "y" ? approach.center : dest.fixed)) {
							c.turnTo = dest.id;
							c.turnT = 0;
							c.turnX = dest.axis === "x" ? approach.center + dest.dir * 46 : dest.fixed;
							c.turnY = dest.axis === "y" ? approach.center + dest.dir * 46 : dest.fixed;
						}
					}
				}
			}
			const spd = Math.hypot(c.vx, c.vy);
			if (spd > 1) {
				const nx = c.x + (c.vx / spd) * 52;
				const ny = c.y + (c.vy / spd) * 52;
				if (carBlocked(nx, ny, 18) || inDeepWater(nx, ny, 18) || inCourtPx(nx, ny)) {
					scale = 0;
					const oppId = oppositeLaneId(c.laneId);
					const opp = oppId ? [...this.laneMap.values()].find((l) => l.id === oppId || l.id.startsWith(`${oppId}~`) || l.id.split("~")[0] === oppId) : null;
					if (opp && !carBlocked(opp.axis === "x" ? c.x : opp.fixed, opp.axis === "y" ? c.y : opp.fixed, 16)) {
						c.laneId = opp.id;
						if (opp.axis === "x") c.y = opp.fixed;
						else c.x = opp.fixed;
						const vel = laneVelocity(opp, 0.6);
						c.vx = vel.vx;
						c.vy = vel.vy;
						scale = 0.6;
					}
				}
			}
			const desired = laneVelocity(lane, scale);
			c.vx += (desired.vx - c.vx) * (1 - Math.exp(-6 * dt));
			c.vy += (desired.vy - c.vy) * (1 - Math.exp(-6 * dt));
			c.braking = scale < 0.55 || Math.hypot(desired.vx, desired.vy) + 8 < spd;
			c.yaw = Math.atan2(-c.vy, c.vx);
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			if (carBlocked(c.x, c.y, 16) || inCourtPx(c.x, c.y)) {
				const safe = nearestAsphalt(c.x, c.y);
				c.x = safe.x;
				c.y = safe.y;
				if (safe.laneId) c.laneId = safe.laneId;
				c.vx *= 0.2;
				c.vy *= 0.2;
			} else {
				if (lane.axis === "x") {
					if (c.x > lane.max - 10 || c.x < lane.min + 10) {
						const oppId = oppositeLaneId(c.laneId);
						const opp = oppId ? [...this.laneMap.values()].find((l) => l.id.split("~")[0] === oppId) : null;
						if (opp) {
							c.laneId = opp.id;
							c.y = opp.fixed;
							const vel = laneVelocity(opp);
							c.vx = vel.vx;
							c.vy = vel.vy;
						} else {
							c.x = Math.min(lane.max - 12, Math.max(lane.min + 12, c.x));
							c.vx *= -1;
						}
					}
				} else if (c.y > lane.max - 10 || c.y < lane.min + 10) {
					const oppId = oppositeLaneId(c.laneId);
					const opp = oppId ? [...this.laneMap.values()].find((l) => l.id.split("~")[0] === oppId) : null;
					if (opp) {
						c.laneId = opp.id;
						c.x = opp.fixed;
						const vel = laneVelocity(opp);
						c.vx = vel.vx;
						c.vy = vel.vy;
					} else {
						c.y = Math.min(lane.max - 12, Math.max(lane.min + 12, c.y));
						c.vy *= -1;
					}
				}
			}
		}
		for (let i = 0; i < this.cars.length; i++) {
			const a = this.cars[i]!;
			if (a.laneId === "RIVAL" || a.laneId === "RACER") continue;
			for (let j = i + 1; j < this.cars.length; j++) {
				const b = this.cars[j]!;
				if (b.laneId === "RIVAL" || b.laneId === "RACER") continue;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const d = Math.hypot(dx, dy);
				if (d < 38 && d > 0.1) {
					const push = (38 - d) * 0.5;
					const nx = dx / d;
					const ny = dy / d;
					a.x -= nx * push;
					a.y -= ny * push;
					b.x += nx * push;
					b.y += ny * push;
					a.vx *= 0.85;
					a.vy *= 0.85;
					b.vx *= 0.85;
					b.vy *= 0.85;
				}
			}
		}
		this.clampCarsToAsphalt();
	}
	clampCarsToAsphalt() {
		for (const c of this.cars) {
			if (c.laneId === "RIVAL" || c.laneId === "RACER") {
				if (inCourtPx(c.x, c.y) || carBlocked(c.x, c.y, 14)) {
					const safe = nearestAsphalt(c.x, c.y);
					c.x = safe.x;
					c.y = safe.y;
				}
				continue;
			}
			if (inCourtPx(c.x, c.y) || carBlocked(c.x, c.y, 16)) {
				const safe = nearestAsphalt(c.x, c.y);
				c.x = safe.x;
				c.y = safe.y;
				if (safe.laneId) c.laneId = safe.laneId;
			}
		}
	}
	updatePeds(dt: number) {
		const talkingPed = this.dialogue && String(this.dialogueNpcId ?? "").startsWith("ped-")
			? Number(String(this.dialogueNpcId).slice(4))
			: -1;
		const vanPoi = POIS.find((p) => p.id === "dropvan");
		const vanX = this.vehicle?.kind === "van" ? this.px : vanPoi ? vanPoi.x + vanPoi.w / 2 : 0;
		const vanY = this.vehicle?.kind === "van" ? this.py : vanPoi ? vanPoi.y + vanPoi.h / 2 : 0;
		const ctx = {
			dt,
			hour: this.worldHour,
			clock: this.clock,
			collides: (x: number, y: number, r: number) => this.collides(x, y, r),
			vanX,
			vanY,
			vanHot: this.vehicle?.kind === "van",
			basketball: this.mode === "basketball" || this.onCourt(),
			crowdPulse: this.crowdPulse,
			dropLive: this.dropLive,
			px: this.px,
			py: this.py,
			walks: this.walks,
		};
		for (let i = 0; i < this.peds.length; i++) {
			const p = this.peds[i]!;
			if (i === talkingPed) {
				if (p.svx == null) {
					p.svx = p.vx;
					p.svy = p.vy;
				}
				p.vx = 0;
				p.vy = 0;
				p.freeze = 5;
				continue;
			}
			tickCityPed(p, i, this.peds, ctx);
		}
		for (const n of this.npcLive) {
			if (!NPCS.find((x) => x.id === n.id)?.wander) continue;
			n.t += dt;
			const nx = n.ox + Math.sin(n.t * .35) * 36;
			const ny = n.oy + Math.cos(n.t * .28) * 22;
			if (!this.collides(nx, ny, 16) && !inCourtPx(nx, ny)) {
				n.x = nx;
				n.y = ny;
			}
		}
	}
	toggleView() {
		this.settings.cameraView = this.settings.cameraView === "first" ? "third" : "first";
		this.showToast(this.settings.cameraView === "first" ? "First person" : "Third person", 1.4);
		audio.ui();
		this.save();
		this.emitHud();
	}
	fwd() {
		return { x: -Math.sin(this.yaw), y: -Math.cos(this.yaw) };
	}
	right() {
		return { x: Math.cos(this.yaw), y: -Math.sin(this.yaw) };
	}
	applyYawToFacing() {
		this.facingFromAngle(this.yaw);
	}
	facingFromAngle(angle: number) {
		const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
		if (a >= Math.PI * 1.75 || a < Math.PI * 0.25) this.facing = "up";
		else if (a < Math.PI * 0.75) this.facing = "right";
		else if (a < Math.PI * 1.25) this.facing = "down";
		else this.facing = "left";
		this.dir = this.facing;
	}
	updatePlayer(dt: number, mx: number, my: number, runHeld: boolean, jumpPressed = false, jumpHeld = false) {
		const f = this.fwd();
		const r = this.right();
		const driving = !!this.vehicle;
		if (driving) {
			this.yaw -= mx * 2.35 * dt;
			this.applyYawToFacing();
			const face = this.fwd();
			const throttle = -my;
			const racing = this.race.active && this.race.phase === "green";
			const spd = (racing ? (runHeld ? 760 : 560) : (runHeld ? 680 : 500)) * throttle;
			this.vx = face.x * spd;
			this.vy = face.y * spd;
			this.moving = Math.abs(throttle) > 0.08;
			if (this.moving) this.leftSpawn = true;
			this.mover.vx = this.vx;
			this.mover.vy = this.vy;
			this.mover.speed = Math.hypot(this.vx, this.vy);
			this.mover.heading = this.yaw;
			this.mover.state = this.moving ? "run" : "idle";
			this.mover.air = 0;
			this.mover.vz = 0;
			this.animT += dt * (this.moving ? 9 : 2);
			this.bob = this.moving ? Math.sin(this.animT * 2) * 1.4 : 0;
		} else {
		const len = Math.hypot(mx, my);
		let wishX = 0;
		let wishY = 0;
		if (len > 0.01) {
			mx /= len;
			my /= len;
			wishX = mx * r.x + -my * f.x;
			wishY = mx * r.y + -my * f.y;
			this.leftSpawn = true;
		}
		const wasAir = this.mover.air > 0.08;
		this.mover.update(dt, wishX, wishY, runHeld, jumpPressed, jumpHeld);
		this.vx = this.mover.vx;
		this.vy = this.mover.vy;
		this.moving = this.mover.speed > 12;
		this.facing = this.mover.facing();
		this.dir = this.facing;
		this.animT = this.mover.animT;
		this.bob = this.moving ? Math.sin(this.animT * 2) * 3.2 : Math.sin(this.animT) * 0.6;
		if (this.mover.jumped) {
			audio.jump();
			this.addTrauma(JUICE.trauma.jump);
		}
		if (this.mover.landed || (wasAir && this.mover.grounded)) {
			audio.land();
			this.addTrauma(JUICE.trauma.land);
			this.punch = Math.max(this.punch, 0.2);
		}
		const plant = Math.sin(this.mover.animT);
		if (this.moving && this.mover.grounded && plant > 0 && this.plantSign <= 0) {
			audio.foot(this.clock, this.mover.state === "run");
		}
		this.plantSign = plant;
		}
		const rad = driving ? 26 : 14;
		let nx = this.px + this.vx * dt;
		let ny = this.py + this.vy * dt;
		if (this.mode === "basketball") {
			const court = POIS.find((p) => p.id === "court")!;
			nx = clamp(nx, court.x + 18, court.x + court.w - 18);
			ny = clamp(ny, court.y + 36, court.y + court.h - 16);
		} else {
			nx = clamp(nx, 62, WORLD_PX_W - 48 - rad);
			ny = clamp(ny, 62, WORLD_PX_H - 48 - rad);
		}
		if (!this.collides(nx, this.py, rad)) this.px = nx;
		else {
			this.mover.vx = 0;
			if (driving) this.vx = 0;
		}
		if (!this.collides(this.px, ny, rad)) this.py = ny;
		else {
			this.mover.vy = 0;
			if (driving) this.vy = 0;
		}
	}
	collides(x: number, y: number, r: number) {
		const indoor = POIS.some((p) => (p.id === "store" || p.id === "apartment") && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
		for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
		for (const box of this.poiBoxes) if (circleHitsRect(x, y, r, box)) return true;
		if (!this.vehicle) {
			const van = POIS.find((p) => p.id === "dropvan");
			if (van && circleHitsRect(x, y, r, { x: van.x + 8, y: van.y + 10, w: van.w - 16, h: van.h - 16 })) return true;
		}
		if (this.vehicle && (carBlocked(x, y, r + 10) || inCourtPx(x, y))) return true;
		if (!indoor) {
			if (!this.vehicle) {
				for (const t of this.trees) {
					if (dist(x, y, t.x, t.y) < r + 18) return true;
				}
			}
		}
		if (!indoor && this.mode !== "basketball" && this.mover.air < 0.55 && !this.vehicle) {
			for (const c of this.cars) {
				if (circleHitsRect(x, y, r, { x: c.x - c.w * 0.5, y: c.y - 11, w: c.w, h: 22 })) return true;
			}
		}
		return false;
	}
	npcPos(id: string) {
		return this.npcLive.find((n) => n.id === id) ?? {
			x: 0,
			y: 0,
			id
		};
	}
	updateProximity() {
		this.nearPoi = null;
		this.nearNpc = null;
		this.nearPed = -1;
		this.nearCar = -1;
		this.interactHint = null;
		this.hintWalk = false;
		let bestPoi = 9999;
		for (const p of POIS) {
			if (p.id === "river") continue;
			const d = dist(this.px, this.py, p.x + p.w / 2, p.y + p.h / 2);
			if (d < Math.max(p.w, p.h) * .55 + 44 && d < bestPoi) {
				bestPoi = d;
				this.nearPoi = p.id;
			}
		}
		if (onRiverfront(this.px, this.py)) this.nearPoi = "river";
		if (this.foodApproach && this.foodApproach !== this.nearPoi) this.foodApproach = null;
		let best = 92;
		const store = POIS.find((p) => p.id === "store");
		for (const n of this.npcLive) {
			if (n.id === "k_blanco" && store && !insidePoi(this.px, this.py, store, 8)) continue;
			const d = dist(this.px, this.py, n.x, n.y);
			if (d < best) {
				best = d;
				this.nearNpc = n.id;
			}
		}
		if (!this.nearNpc) {
			let bestPed = 56;
			for (let i = 0; i < this.peds.length; i++) {
				const p = this.peds[i]!;
				if (p.inside) continue;
				const d = dist(this.px, this.py, p.x, p.y);
				if (d < bestPed) {
					bestPed = d;
					this.nearPed = i;
				}
			}
		}
		if (!this.vehicle) {
			let bestCar = 48;
			for (let i = 0; i < this.cars.length; i++) {
				const c = this.cars[i]!;
				const d = dist(this.px, this.py, c.x, c.y);
				if (d < bestCar && c.laneId !== "RIVAL" && c.laneId !== "RACER") {
					bestCar = d;
					this.nearCar = i;
				}
			}
		}
		const tap = this.input.device === "touch";
		if (this.vehicle) {
			if (this.race.active && this.race.phase === "green") {
				const next = RACE_CHECKPOINTS[this.race.player.next]!;
				this.interactHint = `${this.race.place === 1 ? "1ST" : "2ND"} · ${next.name}`;
				return;
			}
			if (this.race.active && this.race.phase === "countdown") {
				this.interactHint = "Wait for green";
				return;
			}
			if (this.nearPoi && this.nearPoi !== "dropvan") {
				this.interactHint = `Pull up · ${POIS.find((x) => x.id === this.nearPoi)?.name ?? "spot"}`;
			} else this.interactHint = tap ? "PARK · stick to drive" : "E park it · WASD drive";
			return;
		}
		if (this.nearNpc) {
			const name = NPCS.find((x) => x.id === this.nearNpc)?.name ?? "local";
			this.interactHint = `Talk to ${name}`;
		} else if (this.nearPoi === "store") {
			const store = POIS.find((p) => p.id === "store")!;
			const inside = insidePoi(this.px, this.py, store, 0);
			this.interactHint = inside
				? (tap ? "SHOP the wall" : "Shop apparel")
				: (tap ? "Walk in · HQ" : "Walk through HQ doors");
			this.hintWalk = !inside;
		} else if (this.nearPoi === "apartment") {
			const apt = POIS.find((p) => p.id === "apartment")!;
			const inside = this.px >= apt.x && this.px <= apt.x + apt.w && this.py >= apt.y && this.py <= apt.y + apt.h;
			if (inside) {
				const wake = this.mission.steps.find((s) => s.id === "wake");
				if (wake && !wake.done) {
					this.interactHint = "Walk south · leave home";
					this.hintWalk = true;
				}
			} else {
				const atDoor =
					this.py > apt.y + apt.h - 8 &&
					this.py < apt.y + apt.h + 64 &&
					this.px > apt.x + 20 &&
					this.px < apt.x + apt.w - 20;
				if (atDoor) {
					this.interactHint = tap ? "Walk in · home" : "Walk inside";
					this.hintWalk = true;
				}
			}
		} else if (this.nearPoi === "court") this.interactHint = this.missionComplete ? (tap ? "TAP · timed / HORSE / 3s" : "E · timed, HORSE, 3-point") : (tap ? "Hold SHOOT · TAP timed run" : "Hold Space · 4 hoops · E timed run");
		else if (this.nearPoi === "river") this.interactHint = tap ? "TAP · fish the Mississippi" : "E · fish the Mississippi";
		else if (this.nearPoi === "strip") this.interactHint = tap ? "TAP · race Cam" : "E · 901 Strip race vs Cam";
		else if (isFoodTruck(this.nearPoi)) {
			const truck = foodTruckById(this.nearPoi)!;
			if (this.foodApproach === truck.id) {
				this.interactHint = tap ? "TAP · order" : "E · order";
			} else if (truck.id === "foodtruck" && this.cooler.length) {
				const fish = this.cooler[0]!;
				this.interactHint = tap ? `TAP · walk up · grill ${fish.name}` : `E · walk up · grill ${fish.name}`;
			} else {
				this.interactHint = tap ? `TAP · walk up · ${truck.tag}` : `E · walk up · ${truck.name}`;
			}
		}
		else if (this.nearPoi === "alley") this.interactHint = this.unlocks.has("gold_alley") ? "Gold Alley" : "Gold Alley · 25 Respect";
		else if (this.nearPoi === "welcome") this.interactHint = tap ? "TAP · Welkome packages" : "E · Welkome packages · 30 days";
		else if (this.nearPoi === "listenpost") this.interactHint = tap ? "TAP · open artist slot" : "E · artist listening post · OPEN";
		else if (this.nearPoi === "billboard") this.interactHint = tap ? "TAP · premium billboard" : "E · premium $250 billboard · OPEN";
		else if (this.nearPoi === "beale" || this.nearPoi === "culture") this.interactHint = this.jooking ? (tap ? "JOOK to stop" : "E / J stop jookin") : (tap ? "JOOK to dance" : "J or E · jook");
		else if (this.jooking) this.interactHint = tap ? "JOOK to stop" : "Jookin · J / JOOK to stop";
		if (!this.interactHint) {
			if (this.nearPoi === "dropvan") this.interactHint = "Hop in the drop van";
			else if (this.nearPed >= 0) this.interactHint = "Talk";
			else if (this.nearCar >= 0) this.interactHint = "Hop in the whip";
			else if (this.nearPoi && this.nearPoi !== "apartment") this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi)?.name ?? this.nearPoi}`;
		}
	}
	nearJook() {
		const beale = POIS.find((p) => p.id === "beale");
		const culture = POIS.find((p) => p.id === "culture");
		const on = (p: { x: number; y: number; w: number; h: number } | undefined, pad = 36) =>
			!!p && this.px >= p.x - pad && this.px <= p.x + p.w + pad && this.py >= p.y - pad && this.py <= p.y + p.h + pad;
		return on(beale) || on(culture);
	}
	toggleJook() {
		if (this.vehicle || this.mode === "basketball" || this.mode === "shop" || this.mode === "dialogue") return;
		this.jooking = !this.jooking;
		if (this.jooking) {
			this.showToast("Jookin · Memphis feet");
			audio.ui();
		} else {
			if (this.jookT > 1.2) {
				this.showToast("Cypher closed · Respect up");
				this.save();
			}
			this.jookT = 0;
		}
		this.emitHud();
	}
	startJook() {
		if (!this.jooking) this.toggleJook();
	}
	updateJookin(dt: number, _held: boolean, pressed = false) {
		if (this.vehicle || this.mode === "basketball" || this.mode === "shop" || this.mode === "dialogue" || this.cinematic) {
			this.jooking = false;
			this.jookT = 0;
			return;
		}
		if (pressed) this.toggleJook();
		if (!this.jooking) return;
		this.jookT += dt;
		this.mover.heading += dt * 5.4;
		this.facing = this.mover.facing();
		this.dir = this.facing;
		this.mover.animT += dt * 12;
		this.mover.lean = Math.sin(this.clock * 13) * 0.42;
		this.bob = 5 + Math.abs(Math.sin(this.clock * 16)) * 8;
		const floorBonus = this.nearJook();
		if (Math.floor(this.jookT * 2) !== Math.floor((this.jookT - dt) * 2)) {
			this.respect += floorBonus ? 2 : 1;
			this.sackdollars += floorBonus ? 2 : 1;
			this.float(floorBonus ? "JOOK +2" : "JOOK +1", PAL.gold);
		}
		if (this.jookT > 8) this.unlockTrophy("city_legend");
	}
	buyFood() {
		if (!isFoodTruck(this.nearPoi)) return;
		if (this.foodApproach === this.nearPoi) this.openFood(this.nearPoi);
		else this.approachFoodTruck(this.nearPoi);
	}
	approachFoodTruck(id: FoodTruckId) {
		const poi = POIS.find((p) => p.id === id);
		const truck = foodTruckById(id);
		if (!poi || !truck) return;
		this.px = poi.x + poi.w / 2;
		this.py = poi.y - 18;
		this.yaw = Math.PI;
		this.mover.reset(this.yaw);
		this.applyYawToFacing();
		this.foodApproach = id;
		this.showToast("At the window · E to order");
		audio.confirm();
		this.emitHud();
	}
	openFood(id: FoodTruckId) {
		const truck = foodTruckById(id);
		if (!truck) return;
		this.foodMenu = id;
		audio.confirm();
		this.showToast(truck.tag, 1.2);
		this.emitHud();
	}
	closeFood() {
		if (!this.foodMenu) return;
		this.foodMenu = null;
		audio.ui();
		this.emitHud();
	}
	openSponsor() {
		this.sponsorOpen = true;
		audio.confirm();
		this.showToast("Welkome · 2 + 2 slots · 30 days", 1.4);
		this.emitHud();
	}
	closeSponsor() {
		if (!this.sponsorOpen) return;
		this.sponsorOpen = false;
		audio.ui();
		this.emitHud();
	}
	orderFood(itemId: string) {
		const truck = foodTruckById(this.foodMenu);
		if (!truck) return;
		const item = truck.items.find((it) => it.id === itemId);
		if (!item) return;
		if (item.fish && !this.cooler.length) {
			this.showToast("Catch a fish at the river, then bring it here");
			audio.ui();
			return;
		}
		if (this.sackdollars < item.price) {
			this.showToast(`Need $${item.price}`);
			audio.ui();
			return;
		}
		this.sackdollars -= item.price;
		const fish = item.fish ? this.cooler.shift() ?? null : null;
		const name = mealName(item, fish);
		this.respect += item.respect + (fish?.legendary ? 2 : 0);
		this.fedT = Math.max(this.fedT, fish ? 34 : 22);
		this.eaten.add(truck.id);
		if (fish) this.completeSide("catch_grill");
		if (truck.id === "velis") this.completeSide("velis_plate");
		if (truck.id === "brothers") this.completeSide("brothers_crown");
		if (this.eaten.size >= 3) this.unlockTrophy("block_eats");
		this.foodMenu = null;
		const extra = fish ? ` · ${fish.weightLb} lb` : "";
		if (fish) this.sackdollars += Math.round(8 + fish.weightLb * 3);
		this.foodServe = { truckId: truck.id, t: 2.2, duration: 2.2, item: name + extra };
		this.showToast("Order up · at the window");
		audio.confirm();
		this.save();
		this.emitHud();
	}
	startFishing() {
		if (this.vehicle || this.mode === "basketball" || this.mode === "shop" || this.mode === "dialogue") return;
		this.jooking = false;
		this.fish = beginFishing(this.fish, this.px, this.py);
		this.showToast("Mississippi · hold to cast, set the hook, reel the green");
		audio.interact();
		this.emitHud();
	}
	stopFishing() {
		this.fish = cancelFishing(this.fish);
		this.emitHud();
	}
	updateFishing(dt: number, hold: boolean, pressed: boolean, released: boolean) {
		const tap = this.input.device === "touch";
		const { next, event } = tickFishing(this.fish, dt, hold, pressed, released, this.clock, this.px);
		const prevPhase = this.fish.phase;
		this.fish = next;
		if (event === "splash") audio.splash();
		if (event === "nibble") audio.nibble();
		if (event === "strike") audio.interact();
		if (event === "snap" || event === "fail") audio.groan();
		if (event === "catch" && next.fish) {
			this.sackdollars += next.payout;
			this.respect += next.fish.respect;
			this.cooler.unshift({
				id: next.fish.id,
				name: next.fish.name,
				weightLb: next.weightLb,
				legendary: next.legendary,
			});
			if (this.cooler.length > 8) this.cooler.length = 8;
			audio.catchFish();
			audio.cash();
			this.unlockTrophy("river_rat");
			this.completeSide("river_catch");
			this.showToast(
				next.legendary
					? `${next.fish.name} · ${next.weightLb} lb · in the cooler`
					: `${next.fish.name} · ${next.weightLb} lb · take it to Catch Kitchen`,
			);
			this.save();
		}
		if (prevPhase !== next.phase || event) this.emitHud();
		this.interactHint = fishingHud(this.fish, tap).prompt;
	}
	tryInteract() {
		if (!this.started || this.paused || this.cinematic) return;
		if (this.fish.active) {
			if (this.fish.phase === "catch" || this.fish.phase === "fail") this.fish = { ...this.fish, window: 0 };
			else this.stopFishing();
			this.emitHud();
			return;
		}
		if (this.mode === "dialogue") {
			this.advanceDialogue();
			return;
		}
		const now = performance.now();
		if (now - this.lastInteract < 140) return;
		this.lastInteract = now;
		this.mover.triggerInteract();
		audio.interact();
		this.uiPulse = 1;
		this.addTrauma(JUICE.trauma.interact);
		if (this.mode === "shop") return;
		if (this.vehicle) {
			if (this.race.active && this.race.phase !== "finish") {
				this.showToast("Finish the lap or Leave race");
				return;
			}
			if (this.nearPoi && this.nearPoi !== "dropvan") {
				const step = this.activeQuest().steps[this.activeQuest().activeStep];
				if (step && !step.done && step.target === this.nearPoi && (step.kind === "deliver" || step.kind === "goto")) {
					this.tryMissionAction(this.nearPoi);
					return;
				}
			}
			this.exitVehicle();
			return;
		}
		if (this.mode === "basketball") {
			return;
		}
		if (this.nearPoi === "apartment") {
			const apt = POIS.find((p) => p.id === "apartment");
			if (apt && this.px >= apt.x && this.px <= apt.x + apt.w && this.py >= apt.y && this.py <= apt.y + apt.h) {
				const step = this.activeQuest().steps[this.activeQuest().activeStep];
				if (step?.id === "wake" && !step.done) this.showToast("Walk south through the doorway.", 2.2);
				return;
			}
		}
		if (this.nearPoi) {
			const step = this.activeQuest().steps[this.activeQuest().activeStep];
			if (step && !step.done && step.target === this.nearPoi && (step.kind === "deliver" || step.kind === "pickup" || step.kind === "goto")) {
				this.tryMissionAction(this.nearPoi);
				if (this.nearPoi === "dropvan") this.enterVehicle("van");
				return;
			}
		}
		if (this.nearNpc) {
			this.openDialogue(this.nearNpc);
			return;
		}
		if (this.nearPoi === "strip") {
			this.raceMenu = true;
			this.emitHud();
			return;
		}
		if (this.nearPoi === "river" || onRiverfront(this.px, this.py)) {
			this.startFishing();
			return;
		}
		if (this.nearPoi === "court") {
			if (this.missionComplete) {
				this.courtMenu = true;
				this.emitHud();
				return;
			}
			this.startCourt("timed");
			return;
		}
		if (this.nearPoi === "store") {
			const step = this.mission.steps[this.mission.activeStep];
			if (step && (step.kind === "talk" || step.kind === "return") && !step.done) {
				this.openDialogue("k_blanco");
				return;
			}
			this.openShop();
			return;
		}
		if (isFoodTruck(this.nearPoi)) {
			if (this.foodApproach === this.nearPoi) this.openFood(this.nearPoi);
			else this.approachFoodTruck(this.nearPoi);
			return;
		}
		if (this.nearPoi === "welcome" || this.nearPoi === "listenpost" || this.nearPoi === "billboard") {
			this.openSponsor();
			if (this.nearPoi === "welcome") this.completeSide("welkome_board");
			return;
		}
		if (this.nearPoi === "alley") {
			if (!this.unlocks.has("gold_alley")) {
				this.showToast("Gold Alley opens at 25 Respect");
				return;
			}
			this.completeSide("gold_alley");
			this.showToast("Gold Alley · after-hours drop");
			return;
		}
		if (this.nearPoi === "beale" || this.nearPoi === "culture") {
			if (this.nearPed >= 0) {
				this.openPedTalk(this.nearPed);
				return;
			}
			this.toggleJook();
			return;
		}
		if (this.nearPoi === "dropvan") {
			this.tryMissionAction("dropvan");
			this.enterVehicle("van");
			return;
		}
		if (this.nearPed >= 0) {
			this.openPedTalk(this.nearPed);
			return;
		}
		if (this.nearCar >= 0) {
			this.enterVehicle("car", this.nearCar);
			return;
		}
		if (this.nearPoi) this.tryMissionAction(this.nearPoi);
	}
	openDialogue(npcId: string) {
		const n = NPCS.find((x) => x.id === npcId);
		if (!n) return;
		audio.talk();
		this.talked.add(npcId);
		this.checkSideTalk();
		this.dialogueNpcId = npcId;
		this.dialogueIndex = 0;
		const step = this.activeQuest().steps[this.activeQuest().activeStep];
		if (n.isKBlanco && step && step.kind === "talk" && !step.done && step.id === "link_k") this.dialogueLines = [n.missionTalk ?? "Tonight is Drop Day.", "Grab the van, hit three spots, then come back to me."];
		else if (n.isKBlanco && step && step.kind === "return" && !step.done && step.id === "return") this.dialogueLines = ["You moved the city, Benji. That's Respect. The drop is live.", "Shop the wall anytime. Wear it like you earned it."];
		else if (n.isKBlanco && step && step.kind === "return" && !step.done && step.id === "afterparty") this.dialogueLines = [...AFTER_HOURS_LINES];
		else if (n.isKBlanco && this.afterHours.complete) this.dialogueLines = ["Night's yours. Side jobs still print Respect. Don't disappear."];
		else if (n.isKBlanco && this.dropLive && this.missionComplete) this.dialogueLines = [...DROP_LIVE_LINES];
		else this.dialogueLines = [...n.dialogue];
		this.dialogue = {
			speaker: n.name,
			text: this.dialogueLines[0] ?? "..."
		};
		this.mode = "dialogue";
		this.emitHud();
	}
	advanceDialogue() {
		if (!this.dialogue) return;
		audio.talk();
		this.dialogueIndex++;
		if (this.dialogueIndex >= this.dialogueLines.length) {
			if (NPCS.find((x) => x.id === this.dialogueNpcId)?.isKBlanco) {
				const step = this.activeQuest().steps[this.activeQuest().activeStep];
				if (step && step.kind === "talk" && !step.done) this.completeStep(step.id);
				if (step && step.kind === "return" && !step.done) this.completeStep(step.id);
			}
			if (this.dialogueNpcId === "supporter_1") this.tryMissionAction("neighborhood");
			if (this.dialogueNpcId === "downtown_fan") this.tryMissionAction("downtown");
			if (this.dialogueNpcId === "culture_host") this.tryMissionAction("culture");
			if (this.dialogueNpcId === "photog" && this.dropLive) {
				this.completeSide("photo_op");
				this.completeStep("flash");
			}
			if (this.dialogueNpcId === "cam") this.raceMenu = true;
			this.mode = "world";
			this.dialogue = null;
			this.dialogueNpcId = null;
			this.dialogueLines = [];
			this.emitHud();
			return;
		}
		this.dialogue = {
			speaker: this.dialogue.speaker,
			text: this.dialogueLines[this.dialogueIndex]
		};
		this.emitHud();
	}
	tryMissionAction(loc: LocationId) {
		const quest = this.activeQuest();
		const step = quest.steps[quest.activeStep];
		if (!step || step.done) {
			return;
		}
		if (step.target && step.target !== loc) {
			if ((step.kind === "deliver" || step.kind === "pickup") && this.run.active) {
				const scored = loc === "store" || loc === "court" || loc === "dropvan" || loc === "neighborhood" || loc === "downtown" || loc === "culture";
				if (scored) noteMistake(this.run);
			}
			this.showToast(`Objective: ${step.label}`);
			return;
		}
		if (step.kind === "pickup" && loc === "dropvan") {
			this.completeStep(step.id);
			this.burst(this.px, this.py, "#1db954");
			this.showToast("Drop secured. Hit the next stop.");
			return;
		}
		if (step.kind === "deliver" && step.target === loc) {
			this.completeStep(step.id);
			this.burst(this.px, this.py, "#d4af37");
			this.showToast(`Moved product at ${POIS.find((p) => p.id === loc)?.name ?? loc}`);
			return;
		}
		if (step.kind === "goto") this.completeStep(step.id);
	}
	checkMissionAuto() {
		const quest = this.activeQuest();
		const step = quest.steps[quest.activeStep];
		if (!step || step.done) return;
		if (step.id === "wake" && this.leftSpawn) {
			const apt = POIS.find((p) => p.id === "apartment");
			if (apt && !insidePoi(this.px, this.py, apt, 50)) {
				this.completeStep("wake");
				this.showToast("Memphis is open. Head to SackReligious HQ.");
			}
		}
		if (this.mission.complete && this.nearPoi === "alley" && this.unlocks.has("gold_alley")) {
			this.completeStep("alleywalk");
			this.completeSide("gold_alley");
		}
	}
	checkSideVisits() {
		for (const s of this.side) {
			if (s.done || s.kind !== "visit" || !s.target) continue;
			if (s.id === "gold_alley" && !this.unlocks.has("gold_alley")) continue;
			if (s.id === "night_van") continue;
			if (this.nearPoi === s.target) this.completeSide(s.id);
		}
	}
	checkSideTalk() {
		const s = this.side.find((x) => x.id === "city_tour");
		if (s && !s.done && this.talked.size >= (s.need ?? 6)) this.completeSide("city_tour");
	}
	checkSideOwn() {
		const s = this.side.find((x) => x.id === "full_fit");
		if (s && !s.done && this.owned.length >= (s.need ?? 4)) this.completeSide("full_fit");
		if (this.owned.filter((id) => !APPAREL.find((a) => a.id === id)?.irlOnly).length >= APPAREL.filter((a) => !a.irlOnly).length) this.unlockTrophy("full_closet");
	}
	completeSide(id: string) {
		const s = this.side.find((x) => x.id === id);
		if (!s || s.done) return;
		s.done = true;
		this.sackdollars += s.reward;
		this.respect += 4;
		this.float(`+$${s.reward}`, "#1db954");
		this.showToast(`SIDE MISSION · ${s.title}`);
		this.applyRespectUnlocks();
		audio.mission();
		this.save();
	}
	completeStep(id: string) {
		const ch2 = this.afterHours.steps.find((s) => s.id === id);
		if (ch2 && this.mission.complete) {
			this.completeAfterHours(id);
			return;
		}
		const step = this.mission.steps.find((s) => s.id === id);
		if (!step || step.done) return;
		step.done = true;
		this.sackdollars += step.reward;
		this.respect += Math.ceil(step.reward / 10);
		this.burst(this.px, this.py - 20, "#1db954");
		this.float(`+$${step.reward}`, "#1db954");
		this.addTrauma(step.kind === "deliver" ? JUICE.trauma.deliver : step.kind === "pickup" ? JUICE.trauma.pickup : JUICE.trauma.cash);
		if (this.settings.rumble) this.input.rumble(90, .25, .4);
		this.uiPulse = 1;
		if (id === "pickup") {
			this.run.active = true;
			this.run.time = 0;
			this.lastDeliveryAt = this.clock;
			audio.deliver();
			this.hitstop = JUICE.hitstop.pickup;
			this.addPunch(JUICE.punch.deliver);
		} else if (step.kind === "deliver") {
			const interval = this.lastDeliveryAt > 0 ? this.clock - this.lastDeliveryAt : 0;
			const gained = scoreDelivery(this.run, interval, this.currentTier().parSeconds);
			this.lastDeliveryAt = this.clock;
			this.float(`COMBO x${this.run.combo}`, PAL.gold, this.px, this.py - 78);
			if (gained > 420) this.float("FAST", PAL.gold);
			audio.deliver();
			audio.combo(this.run.combo);
			this.hitstop = JUICE.hitstop.deliver;
			this.addPunch(JUICE.punch.deliver);
		} else {
			audio.cash();
		}
		this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
		analytics.track("mission_completed", { stepId: id, label: step.label, reward: step.reward });
		commerce.notifyMissionComplete(this.mission.id, id);
		if (id === "wake") this.unlockTrophy("first_steps");
		if (id === "link_k") this.unlockTrophy("family");
		if (id === "ball") this.unlockTrophy("baller");
		const next = this.mission.steps.findIndex((s) => !s.done);
		if (next === -1) {
			this.mission.complete = true;
			this.missionComplete = true;
			this.mission.activeStep = this.mission.steps.length;
			this.respect += 25;
			const result = finalizeRun(this.run, this.currentTier().parSeconds, 180, 18);
			this.sackdollars += result.bonusDollars;
			this.respect += result.bonusRespect;
			this.bestRunScore = Math.max(this.bestRunScore, this.run.points);
			this.bestGrade = !this.bestGrade || gradeRank(result.grade) >= gradeRank(this.bestGrade) ? result.grade : this.bestGrade;
			if (result.bonusDollars > 0) this.float(`GRADE ${result.grade} +$${result.bonusDollars}`, PAL.gold);
			this.unlockTrophy("drop_day");
			this.beginDropLive(result.grade);
			analytics.track("chapter_completed", { chapter: this.mission.chapter, grade: result.grade });
			commerce.notifyChapterComplete(this.mission.chapter);
			commerce.runComplete({
				score: this.run.points,
				durationMs: this.run.time * 1000,
				level: this.mission.chapter,
			});
			if (result.grade === "S") this.unlockTrophy("sackrow_s");
		} else {
			this.mission.activeStep = next;
			const upcoming = this.mission.steps[next];
			if (upcoming) analytics.track("mission_started", { stepId: upcoming.id, label: upcoming.label });
		}
		if (this.respect >= 40) this.unlockTrophy("city_legend");
		if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
		this.applyRespectUnlocks();
		this.save();
		this.emitHud();
	}
	unlockTrophy(id: TrophyId) {
		if (this.trophies.includes(id)) return;
		const def = TROPHIES.find((t) => t.id === id);
		if (!def) return;
		this.trophies.push(id);
		this.trophyPopup = {
			name: def.name,
			rank: def.rank,
			t: 4.2
		};
		audio.trophy();
		commerce.unlock(`trophy:${id}`, def.name);
		this.save();
		this.emitHud();
	}
	beginDropLive(grade: string) {
		this.dropLive = true;
		this.dropLiveSeq = 8;
		this.celebrate = 1;
		this.crowdPulse = 1;
		if (this.worldHour < 19) this.worldHour = 19.15;
		this.unlockTrophy("drop_live");
		this.seedDropLiveCity();
		this.cinematic = {
			kind: "droplive",
			title: "DROP LIVE",
			subtitle: `IN THE $ACK, WE TRUST  ·  GRADE ${grade}`,
			t: 0,
			duration: 6.4,
		};
		audio.dropAnthem();
		audio.grade(grade);
		this.addTrauma(JUICE.trauma.complete);
		this.addPunch(1);
		this.hitstop = 0.22;
		this.showToast("DROP LIVE · Chapter 02 After Hours is open");
	}
	completeAfterHours(id: string) {
		const step = this.afterHours.steps.find((s) => s.id === id);
		if (!step || step.done) return;
		step.done = true;
		this.sackdollars += step.reward;
		this.respect += Math.ceil(step.reward / 8);
		this.burst(this.px, this.py - 20, "#c9a84c");
		this.float(`+$${step.reward}`, PAL.gold);
		audio.mission();
		this.uiPulse = 1;
		this.showToast(`AFTER HOURS · ${step.label}`);
		commerce.notifyMissionComplete(this.afterHours.id, id);
		const next = this.afterHours.steps.findIndex((s) => !s.done);
		if (next === -1) {
			this.afterHours.complete = true;
			this.afterHours.activeStep = this.afterHours.steps.length;
			this.respect += 20;
			this.unlockTrophy("after_hours");
			this.cinematic = {
				kind: "afterhours",
				title: "AFTER HOURS",
				subtitle: "THE NIGHT IS YOURS",
				t: 0,
				duration: 4.4,
			};
			this.letterbox = 1;
			audio.dropAnthem();
			commerce.notifyChapterComplete(this.afterHours.chapter);
			this.showToast("AFTER HOURS · side jobs still print Respect");
		} else {
			this.afterHours.activeStep = next;
			const upcoming = this.afterHours.steps[next];
			if (upcoming) analytics.track("mission_started", { stepId: upcoming.id, label: upcoming.label });
		}
		this.applyRespectUnlocks();
		this.save();
		this.emitHud();
	}
	seedDropLiveCity() {
		boostDropLive(this.peds, this.walks);
		if (this.cars.length < 70) {
			const lanes = [...this.laneMap.values()];
			const colors = ["#0d0d0d", "#c9a84c", "#1db954", "#f5f0e1", "#171717"];
			let extra = 0;
			for (const lane of lanes) {
				if (extra > 16) break;
				const vel = laneVelocity(lane, 0.45);
				const along = lane.min + 40 + extra * 90;
				this.cars.push({
					x: lane.axis === "x" ? along : lane.fixed,
					y: lane.axis === "y" ? along : lane.fixed,
					vx: vel.vx,
					vy: vel.vy,
					w: 40,
					color: colors[extra % colors.length]!,
					laneId: lane.id,
					skin: extra % 8,
					braking: true,
					yaw: lane.axis === "x" ? 0 : Math.PI / 2,
					turnT: 0,
					turnTo: null,
					turnX: 0,
					turnY: 0,
				});
				extra++;
			}
		}
	}
	repairMission() {
		const undone = this.mission.steps.findIndex((s) => !s.done);
		if (undone === -1 && this.mission.steps.length && this.mission.steps.every((s) => s.done)) {
			this.mission.complete = true;
			this.missionComplete = true;
			this.dropLive = true;
			this.mission.activeStep = this.mission.steps.length;
		} else if (undone >= 0 && this.mission.activeStep !== undone && !this.mission.complete) {
			this.mission.activeStep = undone;
		}
	}
	applyRespectUnlocks() {
		for (const m of dueMilestones(this.respect, this.unlocks)) {
			this.unlocks.add(m.unlock);
			this.showToast(m.toast);
			if (m.unlock === "night_run" && !this.owned.includes("night_run")) {
				/* shop unlock only */
			}
			if (m.unlock === "van_chrome") this.vanSkin = this.vanSkin ?? "chrome";
			if (m.unlock === "van_gold") this.vanSkin = "gold";
		}
	}
	applyVerifiedReward(reward: VerifiedReward) {
		if (this.verifiedOrders.includes(reward.orderId)) return;
		this.verifiedOrders.push(reward.orderId);
		const g = reward.grants;
		if (g.sackdollars) {
			this.sackdollars += g.sackdollars;
			this.float(`+$${g.sackdollars} IRL`, PAL.gold);
		}
		if (g.respect) this.respect += g.respect;
		const fit = g.colorway ?? g.apparelId;
		if (fit && APPAREL.some((a) => a.id === fit) && !this.owned.includes(fit)) {
			this.owned.push(fit);
			this.equipped = fit;
			this.showToast(`Verified order · wearing ${APPAREL.find((a) => a.id === fit)?.name}`);
		}
		if (g.vanSkin) this.vanSkin = g.vanSkin;
		if (g.badge) this.unlockTrophy(g.badge);
		else this.unlockTrophy("irl_family");
		this.applyRespectUnlocks();
		this.save();
		this.emitHud();
	}
	openShop() {
		audio.confirm();
		analytics.track("hq_entered", { location: "store" });
		this.cinematic = {
			kind: "enter",
			title: "SACKRELIGIOUS HQ",
			subtitle: "IN THE $ACK, WE TRUST",
			t: 0,
			duration: 1.15
		};
		this.shopOpen = true;
		this.mode = "shop";
		this.emitHud();
	}
	closeShop() {
		this.shopOpen = false;
		this.mode = "world";
		audio.ui();
		this.emitHud();
	}
	enterVehicle(kind: "van" | "car", carIndex = -1) {
		if (this.vehicle || this.mode !== "world") return;
		this.vehicle = { kind, carIndex };
		if (kind === "car" && carIndex >= 0) {
			const c = this.cars[carIndex];
			if (c) {
				this.px = c.x;
				this.py = c.y;
			}
		}
		this.showToast(kind === "van" ? (this.input.device === "touch" ? "Drop van · stick to roll" : "Drop van · WASD to roll") : (this.input.device === "touch" ? "Whip hopped · stick to roll" : "Whip hopped · WASD to roll"));
		if (kind === "van" && this.dropLive && (this.worldHour >= 20 || this.worldHour < 5)) this.completeSide("night_van");
		if (kind === "van" && this.mission.complete) this.completeStep("nightvan");
		audio.whoosh();
		this.emitHud();
	}
	exitVehicle() {
		if (!this.vehicle) return;
		const v = this.vehicle;
		if (v.kind === "car" && v.carIndex >= 0) {
			const c = this.cars[v.carIndex];
			if (c) {
				this.px = c.x + 28;
				this.py = c.y + 18;
			}
		}
		this.vehicle = null;
		this.showToast("Parked it");
		audio.ui();
		this.emitHud();
	}
	startRace(skipCountdown = false) {
		if (this.mode === "basketball") this.exitBasketball();
		if (this.mode === "shop") this.closeShop();
		this.mode = "world";
		this.dialogue = null;
		this.raceMenu = false;
		this.cinematic = null;
		this.courtMenu = false;
		if (this.vehicle) this.exitVehicle();
		const best = this.race.bestTime;
		this.clearRaceCars();
		this.race = beginRace(best);
		if (skipCountdown) {
			this.race.phase = "green";
			this.race.countdown = 0;
		}
		this.px = this.race.player.x;
		this.py = this.race.player.y;
		this.yaw = this.race.player.yaw;
		this.vx = 0;
		this.vy = 0;
		this.spawnPlayerRaceCar();
		this.spawnRivalCar();
		this.vehicle = { kind: "car", carIndex: this.playerRaceCarIndex };
		audio.whoosh();
		this.showToast(skipCountdown ? "GREEN · hit the arrows" : "Grid locked · arrows on the turns");
		this.emitHud();
	}
	closeRaceMenu() {
		this.raceMenu = false;
		this.emitHud();
	}
	leaveRace() {
		if (!this.race.active) return;
		this.showToast("DNF · bailed the 901");
		this.endRace(true);
	}
	dismissRaceRecap() {
		this.race.recap = false;
		this.endRace(false);
	}
	private spawnPlayerRaceCar() {
		this.cars.push({
			x: this.race.player.x,
			y: this.race.player.y,
			vx: 0,
			vy: 0,
			w: 46,
			color: "#1db954",
			laneId: "RACER",
			skin: 3,
			braking: false,
			yaw: this.race.player.yaw,
			turnT: 0,
			turnTo: null,
			turnX: 0,
			turnY: 0,
		});
		this.playerRaceCarIndex = this.cars.length - 1;
	}
	private spawnRivalCar() {
		this.cars.push({
			x: this.race.rival.x,
			y: this.race.rival.y,
			vx: 0,
			vy: 0,
			w: 46,
			color: "#c9a84c",
			laneId: "RIVAL",
			skin: 2,
			braking: false,
			yaw: this.race.rival.yaw,
			turnT: 0,
			turnTo: null,
			turnX: 0,
			turnY: 0,
		});
		this.rivalCarIndex = this.cars.length - 1;
	}
	private clearRivalCar() {
		this.clearRaceCars();
	}
	private clearRaceCars() {
		this.cars = this.cars.filter((c) => c.laneId !== "RIVAL" && c.laneId !== "RACER");
		this.rivalCarIndex = -1;
		this.playerRaceCarIndex = -1;
	}
	private syncRivalCar() {
		if (this.rivalCarIndex < 0 || !this.cars[this.rivalCarIndex] || this.cars[this.rivalCarIndex]?.laneId !== "RIVAL") {
			this.rivalCarIndex = this.cars.findIndex((x) => x.laneId === "RIVAL");
		}
		const c = this.cars[this.rivalCarIndex];
		if (!c) return;
		c.x = this.race.rival.x;
		c.y = this.race.rival.y;
		c.vx = this.race.rival.vx;
		c.vy = this.race.rival.vy;
		c.yaw = this.race.rival.yaw;
		c.braking = false;
		if (this.playerRaceCarIndex < 0 || !this.cars[this.playerRaceCarIndex] || this.cars[this.playerRaceCarIndex]?.laneId !== "RACER") {
			this.playerRaceCarIndex = this.cars.findIndex((x) => x.laneId === "RACER");
		}
		const p = this.cars[this.playerRaceCarIndex];
		if (p && this.vehicle?.kind === "car") {
			this.vehicle.carIndex = this.playerRaceCarIndex;
			p.x = this.px;
			p.y = this.py;
			p.vx = this.vx;
			p.vy = this.vy;
			p.yaw = this.yaw;
		}
	}
	updateRace(dt: number, tap: ArrowDir | null = null) {
		if (!this.race.active) return;
		if (this.race.phase === "countdown") {
			const prev = Math.ceil(this.race.countdown);
			this.race.countdown -= dt;
			const next = Math.ceil(this.race.countdown);
			if (next > 0 && next < prev) {
				this.showToast(String(next), 0.85);
				audio.ui();
			}
			if (this.race.countdown <= 0) {
				this.race.phase = "green";
				this.race.countdown = 0;
				this.showToast("GREEN · hit the arrows");
				audio.whoosh();
				audio.grade("S");
			}
			this.px = this.race.player.x;
			this.py = this.race.player.y;
			this.yaw = this.race.player.yaw;
			this.vx = 0;
			this.vy = 0;
			return;
		}
		if (this.race.phase !== "green") return;
		this.race.time += dt;
		const prevNext = this.race.player.next;
		const prevCue = this.race.cue?.status;
		tickRaceCues(this.race, dt, tap);
		if (this.race.cue && this.race.cue.status === "hit" && prevCue === "live") {
			audio.grade("S");
			this.showToast(this.race.combo > 1 ? `NITRO x${this.race.combo}` : "NITRO · CATCH CAM", 0.85);
		} else if (this.race.cue && this.race.cue.status === "miss" && prevCue === "live") {
			audio.ui();
			this.showToast("MISS · SLOWED", 0.85);
		}
		const passed = tickAutoDrive(this.race.player, dt, this.race.cruise, 10);
		if (passed) {
			armNextSegment(this.race);
			audio.ui();
			if (this.race.player.finished) {
				this.race.player.finishT = this.race.time;
				this.px = this.race.player.x;
				this.py = this.race.player.y;
				this.vx = this.race.player.vx;
				this.vy = this.race.player.vy;
				this.yaw = this.race.player.yaw;
				this.finishRace();
				return;
			}
			const next = RACE_CHECKPOINTS[this.race.player.next]!;
			this.showToast(next.name, 1.1);
		} else if (this.race.player.next !== prevNext) {
			armNextSegment(this.race);
		}
		this.px = this.race.player.x;
		this.py = this.race.player.y;
		this.vx = this.race.player.vx;
		this.vy = this.race.player.vy;
		this.yaw = this.race.player.yaw;
		this.moving = true;
		tickRival(this.race.rival, dt, progressOf(this.race.player), this.race.boostT > 0);
		if (inCourtPx(this.race.player.x, this.race.player.y) || carBlocked(this.race.player.x, this.race.player.y, 14)) {
			const safe = nearestAsphalt(this.race.player.x, this.race.player.y);
			this.race.player.x = safe.x;
			this.race.player.y = safe.y;
			this.px = safe.x;
			this.py = safe.y;
		}
		if (inCourtPx(this.race.rival.x, this.race.rival.y) || carBlocked(this.race.rival.x, this.race.rival.y, 14)) {
			const safe = nearestAsphalt(this.race.rival.x, this.race.rival.y);
			this.race.rival.x = safe.x;
			this.race.rival.y = safe.y;
		}
		if (this.race.rival.finished && !this.race.player.finished) {
			this.race.rival.finishT = this.race.rival.finishT || this.race.time;
			this.finishRace();
			return;
		}
		const pp = progressOf(this.race.player);
		const rp = progressOf(this.race.rival);
		this.race.place = pp >= rp ? 1 : 2;
		if (playerWrongWay(this.race.player, this.vx, this.vy)) {
			this.race.wrongWay += dt;
			if (this.race.wrongWay > 1.15 && this.race.wrongWay < 1.15 + dt + 0.02) this.showToast("Wrong way");
		} else this.race.wrongWay = 0;
	}
	private finishRace() {
		if (this.race.phase === "finish") return;
		if (!this.race.rival.finished && this.race.player.finished) this.race.rival.finishT = this.race.time + 8;
		if (!this.race.player.finished && this.race.rival.finished) this.race.player.finishT = this.race.time + 8;
		settleRace(this.race);
		const win = this.race.winner === "player";
		this.sackdollars += this.race.payout;
		this.respect += this.race.respect;
		this.float(win ? "1ST" : "2ND", win ? PAL.gold : "#a8a29e");
		this.showToast(win ? `YOU BEAT CAM · +$${this.race.payout}` : `Cam took it · +$${this.race.payout}`);
		if (win) {
			this.unlockTrophy("strip_king");
			this.completeSide("strip_kings");
			audio.trophy();
			audio.grade("S");
		} else audio.mission();
		this.applyRespectUnlocks();
		this.save();
		this.emitHud();
	}
	private debugCompleteRace(win: boolean) {
		if (!this.race.active) this.startRace(true);
		this.race.player.finished = win;
		this.race.rival.finished = !win;
		this.race.player.finishT = win ? this.race.time : this.race.time + 4;
		this.race.rival.finishT = win ? this.race.time + 4 : this.race.time;
		if (win) this.race.player.lap = 3;
		else this.race.rival.lap = 3;
		this.finishRace();
	}
	private endRace(dnf: boolean) {
		this.race.phase = "idle";
		this.race.active = false;
		this.race.recap = false;
		if (dnf) this.race.winner = null;
		this.clearRaceCars();
		if (this.vehicle) this.exitVehicle();
		this.save();
		this.emitHud();
	}
	openPedTalk(index: number) {
		const p = this.peds[index];
		if (!p) return;
		audio.talk();
		this.talked.add(`ped-${index}`);
		this.checkSideTalk();
		this.dialogueNpcId = `ped-${index}`;
		this.dialogueIndex = 0;
		const lines = PED_JOB_CHAT[p.job] ?? PED_CHAT;
		this.dialogueLines = [lines[index % lines.length]!];
		this.dialogue = {
			speaker: pedSpeaker(p),
			text: this.dialogueLines[0] ?? "...",
		};
		p.svx = p.vx;
		p.svy = p.vy;
		p.vx = 0;
		p.vy = 0;
		p.freeze = 6;
		this.mode = "dialogue";
		this.emitHud();
	}
	grantTourTees() {
		for (const id of ["tour_black", "tour_white", "tour_red"] as const) {
			if (!this.owned.includes(id)) this.owned.push(id);
		}
	}
	buyItem(id: ApparelId) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
		if (item.irlOnly && !this.owned.includes(id)) {
			this.showToast("IRL Gold Drop · verified order only");
			audio.ui();
			return;
		}
		if (item.dropLiveRequired && !this.dropLive && !this.owned.includes(id)) {
			this.showToast("Night Run unlocks after Drop Live");
			audio.ui();
			return;
		}
		if (item.respectRequired && this.respect < item.respectRequired && !this.owned.includes(id)) {
			this.showToast(`Need ${item.respectRequired} Respect to unlock ${item.name}`);
			audio.ui();
			return;
		}
		if (this.owned.includes(id)) {
			this.wearOutfit(id, `Equipped ${item.name}`);
			return;
		}
		if (this.sackdollars < item.price) {
			this.showToast("Not enough $ackdollars");
			return;
		}
		this.sackdollars -= item.price;
		this.owned.push(id);
		this.respect += 3;
		this.float(item.name, item.color);
		this.burst(this.px, this.py, item.color);
		audio.cash();
		if (this.settings.rumble) this.input.rumble(70, .2, .35);
		this.unlockTrophy("fresh_fit");
		this.checkSideOwn();
		if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
		this.wearOutfit(id, `Bought ${item.name}`);
	}
	wearOutfit(id: ApparelId, toast?: string) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
		this.equipped = id;
		if (toast) this.showToast(toast);
		audio.ui();
		this.save();
		this.emitHud();
	}
	/** Try-on the virtual fit that matches a real product, then BUY IRL can open checkout. */
	wearProduct(id: ApparelId) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
		this.equipped = id;
		this.showToast(`Wearing ${item.name} · same piece as the real drop`);
		audio.ui();
		this.save();
		this.emitHud();
	}
	enterBasketball() {
		this.startCourt("timed");
	}
	cycleCourtDifficulty() {
		this.courtDifficulty = cycleDifficulty(this.courtDifficulty);
		this.showToast(`${DIFFICULTY[this.courtDifficulty].label} court`);
		this.emitHud();
	}
	startCourt(mode: CourtChallenge = "timed") {
		audio.whoosh();
		this.courtMenu = false;
		this.courtChallenge = mode;
		const spec = DIFFICULTY[this.courtDifficulty];
		analytics.track("basketball_started", { target: spec.target, mode });
		this.mode = "basketball";
		const court = POIS.find((p) => p.id === "court")!;
		if (!this.onCourt()) {
			this.px = clamp(this.px, court.x + 24, court.x + court.w - 24);
			this.py = clamp(this.py, court.y + 48, court.y + court.h - 18);
		}
		this.squareToHoop(1);
		this.mover.reset(this.yaw);
		this.ball.active = true;
		this.ball.score = 0;
		this.ball.shots = 0;
		this.ball.inFlight = false;
		this.ball.held = true;
		this.ball.charging = false;
		this.ball.power = 0;
		this.ball.flash = 0;
		this.ball.combo = 0;
		this.ball.missionCredited = false;
		this.ball.grade = "";
		this.ball.ballZ = 36;
		this.ball.heat = 0;
		this.ball.releaseT = 0;
		this.ball.pending = null;
		this.ball.scrambleT = 0;
		this.horseMisses = 0;
		this.horseIndex = 0;
		this.threesMade = 0;
		this.courtStartedAt = performance.now();
		if (mode === "threes") {
			this.ball.timeLeft = 42;
			this.ball.targetScore = 6;
			this.showToast(`${spec.label} · 3-POINT · 6 makes from downtown`);
		} else if (mode === "horse") {
			this.ball.timeLeft = 999;
			this.ball.targetScore = HORSE_CALLS.length;
			this.showToast(`HORSE · call is ${HORSE_CALLS[0]} · miss = letter`);
		} else {
			this.ball.timeLeft = spec.time;
			const night = this.activeQuest().steps[this.activeQuest().activeStep]?.id === "nightball";
			this.ball.targetScore = night ? 10 : this.missionComplete ? spec.target : this.currentTier().courtTarget;
			this.showToast(night ? `Night court · score ${this.ball.targetScore}` : `${spec.label} timed run · need ${this.ball.targetScore}`);
		}
		this.bark("Don't rush the release. Green window.");
		this.emitHud();
	}
	private bark(line: string) {
		this.ogBark = line;
		this.ogBarkT = 2.6;
	}
	closeCourtMenu() {
		this.courtMenu = false;
		this.emitHud();
	}
	tryCreditBasketball() {
		const step = this.activeQuest().steps[this.activeQuest().activeStep];
		if (step?.kind === "basketball" && this.ball.score >= this.ball.targetScore && !step.done && !this.ball.missionCredited) {
			this.ball.missionCredited = true;
			this.completeStep(step.id);
			analytics.track("basketball_completed", { score: this.ball.score, target: this.ball.targetScore });
			this.showToast(step.id === "nightball" ? "Night court locked. Take the van after dark." : "Respect earned. Return to HQ when ready.");
		}
		const side = this.side.find((s) => s.id === "pickup_kings");
		if (side && !side.done && this.ball.score >= (side.need ?? 16)) this.completeSide("pickup_kings");
		if (this.courtChallenge === "threes" && this.threesMade >= 6) this.completeSide("downtown_threes");
		if (this.courtChallenge === "horse" && this.horseIndex >= HORSE_CALLS.length) this.completeSide("horse_beat");
		if (this.ball.score >= 20) this.unlockTrophy("court_king");
		if (this.ball.score > this.highScore) this.highScore = this.ball.score;
		if (this.mission.complete && this.ball.score >= 10) this.completeStep("nightball");
	}
	exitBasketball() {
		this.tryCreditBasketball();
		if (this.ball.shots > 0) {
			this.courtBoard = pushBoard({
				score: this.ball.score,
				mode: this.courtChallenge,
				difficulty: this.courtDifficulty,
				combo: this.ball.best,
				at: Date.now(),
			});
		}
		const comboPay = Math.max(0, this.ball.combo) * 4;
		const pay = this.ball.score * 5 + comboPay;
		if (pay > 0) {
			this.sackdollars += pay;
			this.float(`+$${pay}`, "#1db954");
			this.showToast(`Court payout: +$${pay} $ackdollars`);
			audio.cash();
		}
		this.mode = "world";
		this.ball.charging = false;
		this.ball.inFlight = false;
		this.ball.held = true;
		this.ball.heat = 0;
		this.ball.active = this.onCourt();
		if (this.ball.shots > 0 || this.courtChallenge !== "timed") {
			commerce.runComplete({
				score: this.ball.score,
				durationMs: Math.max(0, performance.now() - (this.courtStartedAt || performance.now())),
				level: `court-${this.courtChallenge}-${this.courtDifficulty}`,
			});
		}
		this.save();
		this.emitHud();
	}
	onCourt() {
		const court = POIS.find((p) => p.id === "court");
		if (!court) return false;
		return this.px >= court.x - 10 && this.px <= court.x + court.w + 10 && this.py >= court.y - 6 && this.py <= court.y + court.h + 18;
	}
	hoops() {
		const court = POIS.find((p) => p.id === "court")!;
		const cx = court.x + court.w / 2;
		const cy = court.y + court.h / 2;
		return [
			{ id: 0, x: cx, y: court.y + 22, z: 86, axis: "x" as const },
			{ id: 1, x: cx, y: court.y + court.h - 22, z: 86, axis: "x" as const },
			{ id: 2, x: court.x + 22, y: cy, z: 86, axis: "y" as const },
			{ id: 3, x: court.x + court.w - 22, y: cy, z: 86, axis: "y" as const },
		];
	}
	hoopById(id: number) {
		return this.hoops()[id] ?? this.hoops()[0]!;
	}
	courtSpot() {
		const hoop = this.hoop();
		const d = dist(this.px, this.py, hoop.x, hoop.y);
		const along = hoop.axis === "x" ? Math.abs(this.px - hoop.x) : Math.abs(this.py - hoop.y);
		if (d < 72) return { zone: "close" as const, label: "LAYUP", pts: 2 };
		if (d < 118) return { zone: "close" as const, label: "PAINT", pts: 2 };
		if (along > 108 && d < 210) return { zone: "deep" as const, label: "CORNER", pts: 3 };
		if (d < 168) return { zone: "mid" as const, label: "MID", pts: 2 };
		if (d < 236) return { zone: "deep" as const, label: "THREE", pts: 3 };
		return { zone: "deep" as const, label: "LOGO", pts: 4 };
	}
	squareToHoop(dt: number) {
		const hoop = this.hoop();
		const lookTo = Math.atan2(-(hoop.x - this.px), -(hoop.y - this.py));
		let err = lookTo - this.yaw;
		while (err > Math.PI) err -= Math.PI * 2;
		while (err < -Math.PI) err += Math.PI * 2;
		this.yaw += err * Math.min(1, dt * 11);
		this.mover.heading = this.yaw;
		this.applyYawToFacing();
	}
	canShoot() {
		if (!this.started || this.paused || this.cinematic || this.vehicle || this.fish.active) return false;
		if (this.mode === "shop" || this.mode === "dialogue" || this.mode === "menu" || this.mode === "interior") return false;
		return this.mode === "basketball" || this.onCourt();
	}
	hoop() {
		const court = POIS.find((p) => p.id === "court")!;
		const list = this.hoops();
		const f = this.fwd();
		let best = list[0]!;
		let bestScore = Infinity;
		for (const h of list) {
			const dx = h.x - this.px;
			const dy = h.y - this.py;
			const d = Math.hypot(dx, dy) || 1;
			const align = (dx / d) * f.x + (dy / d) * f.y;
			const score = d * (align > 0.12 ? 0.42 : 1.35);
			if (score < bestScore) {
				bestScore = score;
				best = h;
			}
		}
		return { ...best, court, sway: 0 };
	}
	updateBasketball(dt: number) {
		if (this.onCourt() && !this.vehicle) this.ball.active = true;
		this.ball.heat = Math.max(0, this.ball.heat - dt * 0.045);
		if (this.ball.flash > 0) this.ball.flash -= dt;
		if (this.ogBarkT > 0) {
			this.ogBarkT -= dt;
			if (this.ogBarkT <= 0) this.ogBark = null;
		}
		this.crowdPulse = Math.max(0, this.crowdPulse - dt * 0.85);
		if (this.mode === "basketball" && this.courtChallenge !== "horse") {
			this.ball.timeLeft -= dt;
			if (this.ball.timeLeft <= 0) {
				this.ball.timeLeft = 0;
				this.exitBasketball();
				this.showToast("Run over · keep shooting pickup");
				return;
			}
		}
		if (this.ball.releaseT > 0) {
			this.ball.releaseT -= dt;
			const f = this.fwd();
			this.ball.ballX = this.px + f.x * 12;
			this.ball.ballY = this.py + f.y * 12;
			this.ball.ballZ = 52;
			if (this.ball.releaseT <= 0 && this.ball.pending) {
				this.ball.ballVx = this.ball.pending.vx;
				this.ball.ballVy = this.ball.pending.vy;
				this.ball.ballVz = this.ball.pending.vz;
				this.ball.pending = null;
				this.ball.inFlight = true;
				this.ball.held = false;
			}
			return;
		}
		if (this.ball.charging && this.ball.held) this.ball.power = Math.min(1, this.ball.power + dt * 0.88);
		if (this.ball.held) {
			const f = this.fwd();
			const moving = Math.hypot(this.vx, this.vy) > 12;
			this.ball.ballX = this.px + f.x * 10;
			this.ball.ballY = this.py + f.y * 10;
			const dribble = moving ? 12 + Math.abs(Math.sin(this.clock * 11)) * 24 : 28 + Math.sin(this.clock * 3) * 3;
			this.ball.ballZ = this.ball.charging ? 38 + this.ball.power * 20 : dribble;
			if (moving) this.mover.animT += dt * 2.1;
			return;
		}
		if (this.ball.inFlight || this.ball.ballZ > 8) {
			this.ball.ballX += this.ball.ballVx * dt;
			this.ball.ballY += this.ball.ballVy * dt;
			this.ball.ballZ += this.ball.ballVz * dt;
			this.ball.ballVz -= 780 * dt;
			const hoop = this.hoopById(this.ball.hoopId);
			const dx = this.ball.ballX - hoop.x;
			const dy = this.ball.ballY - hoop.y;
			let planar = Math.hypot(dx, dy);
			const makeR = this.ball.shotDist < 125 ? 20 : Math.max(7.5, 12.5 - this.ball.heat * 3.4);
			if (this.ball.ballVz < 0 && this.ball.ballZ <= hoop.z + 18 && this.ball.ballZ >= hoop.z - 28) {
				if (this.ball.shotDist < 125 && planar < 28) {
					this.ball.ballX += (hoop.x - this.ball.ballX) * 0.45;
					this.ball.ballY += (hoop.y - this.ball.ballY) * 0.45;
					planar = Math.hypot(this.ball.ballX - hoop.x, this.ball.ballY - hoop.y);
				}
				if (planar < makeR) {
					const perfect = this.ball.grade === "PERFECT";
					const label = this.ball.spotLabel;
					const threeish = label === "THREE" || label === "CORNER" || label === "LOGO";
					if (this.courtChallenge === "threes" && !threeish) {
						this.bark(ogLine("miss", this.ball.shots));
						this.ball.inFlight = false;
						this.ball.ballVz = -40;
						this.ball.ballVx *= 0.2;
						this.ball.ballVy *= 0.2;
					} else {
					const pts = this.courtChallenge === "threes" ? 3 : perfect ? this.ball.spotPts + 1 : this.ball.spotPts;
					this.ball.score += pts;
					this.ball.combo += 1;
					this.ball.best = Math.max(this.ball.best, this.ball.combo);
					this.ball.heat = Math.min(1, this.ball.heat + (0.14 + (this.ball.spotPts >= 3 ? 0.08 : 0)) * DIFFICULTY[this.courtDifficulty].heat);
					this.ball.flash = 0;
					this.hoopPulse = perfect ? 0.85 : 0.62;
					this.crowdPulse = perfect || this.ball.combo >= 3 ? 0.7 : 0.4;
					if (this.run.active) scoreMake(this.run, perfect, shotZone(this.ball.shotDist), this.ball.combo);
					if (perfect) audio.perfect();
					else audio.swish();
					if (this.ball.combo > 1) audio.combo(this.ball.combo);
					if (perfect || threeish || this.ball.combo >= 3) audio.cheer();
					if (this.settings.rumble) this.input.rumble(perfect ? 140 : 80, 0.3, 0.55);
					if (this.courtChallenge === "threes" && threeish) this.threesMade += 1;
					if (this.courtChallenge === "horse") {
						const call = HORSE_CALLS[this.horseIndex] ?? "MID";
						if (label === call) {
							this.horseIndex += 1;
							this.bark(ogLine("horseMake", this.horseIndex));
							if (this.horseIndex >= HORSE_CALLS.length) {
								this.completeSide("horse_beat");
								this.tryCreditBasketball();
								this.showToast("HORSE · you cleared the calls");
							} else {
								this.showToast(`Next call · ${HORSE_CALLS[this.horseIndex]}`);
							}
						} else {
							this.bark("Wrong spot. That's the call, not yours.");
						}
					} else if (label === "LOGO") this.bark(ogLine("logo", this.ball.shots));
					else if (threeish) this.bark(ogLine(perfect ? "perfect" : "three", this.ball.shots));
					else if (this.ball.combo >= 3) this.bark(ogLine("streak", this.ball.combo));
					else this.bark(ogLine(perfect ? "perfect" : "make", this.ball.shots));
					this.tryCreditBasketball();
					this.ball.inFlight = false;
					this.ball.ballVz = -70;
					this.ball.ballVx *= 0.12;
					this.ball.ballVy *= 0.12;
					this.ball.returnIn = 0.12;
					}
				} else if (planar < 22) {
					this.ball.combo = 0;
					this.ball.heat *= 0.55;
					if (this.run.active) scoreMiss(this.run);
					audio.rim();
					audio.groan();
					this.hoopPulse = 0.7;
					this.crowdPulse = 0.15;
					this.bark(ogLine("rim", this.ball.shots));
					if (this.courtChallenge === "horse") this.horseLetter();
					const nx = dx / (planar || 1);
					const ny = dy / (planar || 1);
					this.ball.ballVx = nx * 110 + Math.sin(this.clock * 9) * 40;
					this.ball.ballVy = ny * 110 + Math.cos(this.clock * 7) * 40;
					this.ball.ballVz = Math.abs(this.ball.ballVz) * 0.35 + 55;
					this.ball.scrambleT = 0.01;
				}
			}
			if (this.ball.inFlight && this.ball.shotDist >= 125 && planar < 28 && this.ball.ballZ > 50 && this.ball.ballZ < 120 && this.ball.ballVz < 0) {
				this.ball.ballVy = Math.abs(this.ball.ballVy) * 0.45;
				this.ball.ballVx *= 0.7;
				this.hoopPulse = Math.max(this.hoopPulse, 0.4);
				audio.rim();
			}
			const court = this.hoop().court;
			if (this.ball.ballX < court.x - 80 || this.ball.ballX > court.x + court.w + 80) {
				this.ball.ballVx *= 0.92;
			}
			if (this.ball.ballY < court.y - 80 || this.ball.ballY > court.y + court.h + 80) {
				this.ball.ballVy *= 0.92;
			}
		}
		if (this.ball.ballZ <= 8) {
			this.ball.ballZ = 8;
			if (Math.abs(this.ball.ballVz) > 80) {
				this.ball.ballVz = Math.abs(this.ball.ballVz) * 0.48;
				this.ball.ballVx *= 0.72;
				this.ball.ballVy *= 0.72;
				audio.bounce();
			} else {
				this.ball.ballVz = 0;
				this.ball.ballVx *= 0.9;
				this.ball.ballVy *= 0.9;
				if (this.ball.inFlight) {
					this.ball.inFlight = false;
					this.ball.combo = 0;
					this.bark(ogLine("air", this.ball.shots));
					audio.groan();
					if (this.courtChallenge === "horse") this.horseLetter();
					this.ball.scrambleT = 0.01;
				}
			}
		}
		if (this.ball.returnIn > 0) {
			this.ball.returnIn -= dt;
			if (this.ball.returnIn <= 0) this.giveBall();
		}
		if (!this.ball.held && !this.ball.inFlight && this.ball.releaseT <= 0 && this.ball.returnIn <= 0) {
			this.ball.scrambleT += dt;
			const reach = dist(this.px, this.py, this.ball.ballX, this.ball.ballY);
			const scrambleNeed = 0.55 * DIFFICULTY[this.courtDifficulty].scramble;
			if (reach < 86 && this.ball.ballZ <= 28) {
				this.giveBall();
				audio.bounce();
			} else if (this.ball.scrambleT > scrambleNeed) {
				this.giveBall();
				this.bark("I got you. Don't make me chase it next time.");
			} else {
				this.ball.ballVx *= Math.exp(-1.6 * dt);
				this.ball.ballVy *= Math.exp(-1.6 * dt);
				this.ball.ballX += this.ball.ballVx * dt;
				this.ball.ballY += this.ball.ballVy * dt;
			}
		} else if (this.ball.held) {
			this.ball.returnIn = 0;
		}
	}
	horseLetter() {
		this.horseMisses = Math.min(5, this.horseMisses + 1);
		this.bark(ogLine("horseMiss", this.horseMisses));
		this.showToast(horseDisplay(this.horseMisses));
		if (this.horseMisses >= 5) {
			this.showToast("HORSE · OG got you. Run it back.");
			this.exitBasketball();
		}
	}
	giveBall() {
		this.ball.held = true;
		this.ball.inFlight = false;
		this.ball.charging = false;
		this.ball.power = 0;
		this.ball.scrambleT = 0;
		this.ball.returnIn = 0;
		this.ball.releaseT = 0;
		this.ball.pending = null;
		this.ball.ballZ = 28;
		if (this.input.keys.has("Space") || this.input.keys.has("KeyF") || this.input.touch.shoot) this.beginCharge();
	}
	releaseShot() {
		if (!this.canShoot() || this.ball.inFlight || this.ball.releaseT > 0) return;
		if (!this.ball.held) return;
		if (!this.ball.charging) return;
		if (this.ball.power < 0.1) this.ball.power = 0.55;
		this.ball.charging = false;
		this.ball.shots++;
		audio.bounce();
		const hoop = this.hoop();
		const pwr = this.ball.power;
		const d = dist(this.px, this.py, hoop.x, hoop.y);
		const spot = this.courtSpot();
		const heat = this.ball.heat;
		const moving = Math.hypot(this.vx, this.vy);
		const aligned = hoop.axis === "x" ? Math.abs(this.px - hoop.x) < 42 : Math.abs(this.py - hoop.y) < 42;
		const close = spot.label === "LAYUP" || spot.label === "PAINT";
		const half = this.currentTier().perfectHalfWidth
			* DIFFICULTY[this.courtDifficulty].window
			* (1 - heat * 0.28)
			* (spot.label === "LOGO" ? 0.55 : spot.label === "CORNER" ? 0.64 : spot.label === "THREE" ? 0.74 : spot.label === "MID" ? 0.95 : 1.35);
		const win = perfectWindow(spot.zone, half);
		const good = goodWindow(win);
		const perfect = pwr >= win.lo && pwr <= win.hi;
		let isGood = pwr >= good.lo && pwr <= good.hi;
		if (close && aligned && pwr > 0.16 && pwr < 0.94) isGood = true;
		this.ball.grade = perfect ? "PERFECT" : isGood ? "GOOD" : "LATE";
		const T = clamp(0.46 + d / 300, 0.48, 1.18);
		const g = 780;
		const dx = hoop.x - this.px;
		const dy = hoop.y - this.py;
		const dz = hoop.z - 42;
		let vx = dx / T;
		let vy = dy / T;
		let vz = (dz + 0.5 * g * T * T) / T;
		const pwrMul = perfect || (close && aligned) ? 1 : isGood ? 0.995 : close ? 0.96 : clamp(0.84 + pwr * 0.28, 0.8, 1.04);
		vz *= pwrMul;
		const corner = Math.abs(Math.atan2(this.px - hoop.x, hoop.y - this.py));
		const noise = close && aligned
			? (perfect ? 0.006 : 0.014)
			: (perfect ? 0.016 : isGood ? 0.05 : 0.16)
				+ d / 1400
				+ Math.max(0, corner - 0.5) * 0.12
				+ heat * 0.12
				+ Math.min(moving / 520, 0.12);
		const n1 = Math.sin(this.clock * 37.1 + this.ball.shots * 4.2);
		const n2 = Math.cos(this.clock * 19.7 + this.ball.shots * 2.8);
		vx += n1 * 78 * noise;
		vy += n2 * 78 * noise;
		this.ball.shotDist = d;
		this.ball.spotLabel = spot.label;
		this.ball.spotPts = spot.pts;
		this.ball.hoopId = hoop.id;
		this.ball.made = isGood || perfect;
		this.ball.active = true;
		this.ball.power = 0;
		this.ball.pending = { vx, vy, vz };
		this.ball.releaseT = close ? 0.04 : 0.07;
		this.mover.triggerShoot();
		if (close) {
			this.mover.vz = 2.6;
			this.mover.air = 0.05;
			this.mover.grounded = false;
		}
	}
	beginCharge() {
		if (!this.canShoot() || this.ball.releaseT > 0) return;
		if (this.ball.inFlight) return;
		if (!this.ball.held) {
			const reach = dist(this.px, this.py, this.ball.ballX, this.ball.ballY);
			if (reach < 96 && this.ball.ballZ < 48) this.giveBall();
			else if (this.ball.returnIn > 0) this.giveBall();
			else return;
		}
		this.ball.active = true;
		if (this.ball.charging) return;
		this.ball.charging = true;
		this.ball.power = 0.02;
		this.mover.triggerShoot();
	}
	burst(_x: number, _y: number, color: string) {
		this.particles.push(...emitBurst(color, 22));
	}
	dismissRecap() {
		this.run.recap = false;
		this.emitHud();
	}
	replayDrop() {
		if (this.mode === "basketball") this.exitBasketball();
		if (this.mode === "shop") this.closeShop();
		this.mode = "world";
		this.dialogue = null;
		this.cinematic = null;
		this.runIndex += 1;
		const tier = this.currentTier();
		this.mission = createDropDayMission({ order: tier.deliveryOrder, courtTarget: tier.courtTarget });
		this.missionComplete = false;
		this.ball.missionCredited = false;
		this.ball.targetScore = tier.courtTarget;
		this.run = createRun(this.runIndex);
		this.lastDeliveryAt = 0;
		const store = POIS.find((p) => p.id === "store");
		if (store) {
			this.px = store.x + store.w / 2;
			this.py = store.y + store.h + 28;
		}
		this.leftSpawn = true;
		this.cinematic = {
			kind: "briefing",
			title: `DROP RUN ${this.runIndex}`,
			subtitle: `${tier.courtTarget} ON THE COURT  ·  TIGHTER CLOCK`,
			t: 0,
			duration: 2.6,
		};
		this.showToast(`Run ${this.runIndex}. Link with K Blanco, then take a new route.`);
		this.save();
		this.emitHud();
	}
	getObjectiveTarget() {
		const step = this.mission.steps[this.mission.activeStep];
		if (!step?.target || this.mission.complete) return null;
		const p = POIS.find((x) => x.id === step.target);
		if (step.id === "wake" && p) {
			return { x: p.x + TILE, y: p.y + p.h + 40 };
		}
		if (step.kind === "talk" || step.kind === "return") {
			const k = this.npcPos("k_blanco");
			if (k) return {
				x: k.x,
				y: k.y
			};
		}
		if (!p) return null;
		return {
			x: p.x + p.w / 2,
			y: p.y + p.h / 2
		};
	}
	draw() {
		const ctx = this.ctx;
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		if (this.world3d) {
			this.world3d.sync({
				px: this.px,
				py: this.py,
				yaw: this.yaw,
				pitch: this.pitch,
				cameraView: this.settings.cameraView,
				mode: this.mode,
				facing: this.facing,
				moving: this.moving,
				bob: this.bob,
				trauma: this.trauma,
				clock: this.clock,
				ball: {
					x: this.ball.ballX,
					y: this.ball.ballY,
					z: this.ball.ballZ,
					held: this.ball.held,
					inFlight: this.ball.inFlight,
					active: this.ball.active || this.canShoot() || this.ball.inFlight,
				},
				cars: this.cars,
				peds: this.peds,
				npcs: this.npcLive
					.filter((n) => {
						if (n.id === "cam" && this.race.active) return false;
						if (n.id === "k_blanco") {
							const hq = POIS.find((p) => p.id === "store");
							if (!hq) return false;
							return this.px > hq.x + 28 && this.px < hq.x + hq.w - 28
								&& this.py > hq.y + 36 && this.py < hq.y + hq.h - 70;
						}
						return true;
					})
					.map((n) => ({
					id: n.id,
					x: n.x,
					y: n.y,
					isK: !!NPCS.find((d) => d.id === n.id)?.isKBlanco,
				})),
				images: this.images,
				dt: this.lastDt,
				heading: this.mover.heading,
				moveSpeed: this.mover.speed,
				lean: this.mover.lean,
				animT: this.mover.animT,
				loco: this.mover.state,
				indoor: this.mode === "interior" || this.mode === "shop" || this.nearPoi === "store" || this.nearPoi === "apartment" ||
					(() => {
						const home = POIS.find((p) => p.id === "apartment")!;
						const hq = POIS.find((p) => p.id === "store")!;
						const hit = (p: typeof home) => this.px >= p.x && this.px <= p.x + p.w && this.py >= p.y && this.py <= p.y + p.h;
						return hit(home) || hit(hq);
					})(),
				punch: this.punch,
				hoopPulse: this.hoopPulse,
				hoopSway: this.hoop().sway,
				hoopIndex: this.ball.inFlight ? this.ball.hoopId : this.hoop().id,
				ballCharging: this.ball.charging,
				air: this.mover.air,
				vz: this.mover.vz,
				equipped: this.equipped,
				outfitColor: APPAREL.find((a) => a.id === this.equipped)?.color ?? null,
				dropLive: this.dropLive,
				driving: !!this.vehicle,
				vehicleKind: this.vehicle?.kind ?? null,
				jooking: this.jooking,
				listening: (() => {
					if (this.vehicle) return false;
					const near = (id: string, r: number) => {
						const p = POIS.find((x) => x.id === id);
						if (!p) return false;
						return Math.hypot(this.px - (p.x + p.w / 2), this.py - (p.y + p.h / 2)) < r;
					};
					return near("velis", 168) || near("listenpost", 150);
				})(),
				worldHour: this.worldHour,
				dribbling: this.ball.held && !this.ball.charging && this.ball.releaseT <= 0 && this.canShoot() && Math.hypot(this.vx, this.vy) > 12,
				releasing: this.ball.releaseT > 0,
				crowdPulse: this.crowdPulse,
				celebrate: this.celebrate,
				talking: this.mode === "dialogue",
				interacting: !this.vehicle && !!this.nearNpc && this.mode === "world" && Math.hypot(this.vx, this.vy) < 24,
				rebounding: this.canShoot() && !this.ball.held && !this.ball.inFlight && this.ball.releaseT <= 0,
				vanSkin: this.vanSkin,
				fishing: this.fish.active
					? {
						active: true,
						phase: this.fish.phase,
						bobX: this.fish.bobX,
						bobY: this.fish.bobY,
						nibble: this.fish.phase === "nibble" || this.fish.phase === "strike",
						power: this.fish.power,
						progress: this.fish.progress,
						tension: this.fish.tension,
						fishId: this.fish.fish?.id ?? null,
					}
					: null,
				raceClear: this.race.active && this.race.phase !== "idle",
				raceGates: this.race.active
					? RACE_CHECKPOINTS.map((c, i) => ({
						x: c.x,
						y: c.y,
						next: i === this.race.player.next,
					}))
					: [],
				foodServe: this.foodServe,
			});
			this.world3d.render(w, h);
		}
		if (ctx.canvas.width !== Math.floor(w * dpr) || ctx.canvas.height !== Math.floor(h * dpr)) {
			ctx.canvas.width = Math.floor(w * dpr);
			ctx.canvas.height = Math.floor(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		if (!this.world3d) this.drawFallbackWorld(ctx, w, h);
		for (const p of this.particles) {
			if (this.mode === "basketball") break;
			const a = Math.max(0, p.life / p.maxLife);
			ctx.globalAlpha = a;
			ctx.fillStyle = p.color;
			ctx.fillRect(w * 0.5 + p.ox - p.size / 2, h * 0.36 + p.oy - p.size / 2, p.size, p.size);
		}
		ctx.globalAlpha = 1;
		if (this.settings.cameraView === "first") {
			ctx.strokeStyle = "rgba(232,226,214,0.5)";
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			ctx.moveTo(w / 2 - 7, h / 2);
			ctx.lineTo(w / 2 + 7, h / 2);
			ctx.moveTo(w / 2, h / 2 - 7);
			ctx.lineTo(w / 2, h / 2 + 7);
			ctx.stroke();
		}
		for (const [i, f] of this.floaters.entries()) {
			if (this.mode === "basketball") continue;
			ctx.globalAlpha = Math.max(0, f.life);
			ctx.fillStyle = f.color;
			ctx.font = `700 ${Math.round(16 * f.scale)}px DM Sans, sans-serif`;
			ctx.textAlign = "center";
			ctx.fillText(f.text, w / 2, h * 0.22 - i * 22);
			ctx.textAlign = "start";
		}
		ctx.globalAlpha = 1;
		if (this.canShoot() && (this.ball.charging || this.ball.power > 0) && !this.fish.active) this.drawShotMeter(ctx, w, h);
		if (this.ball.flash > 0 && this.mode === "basketball") {
			this.ball.flash = 0;
		}
		if (this.started && (this.mode === "world" || this.mode === "basketball")) {
			this.drawCompass(ctx, w, h);
			this.drawMinimap(ctx, w, h);
		}
	}
	drawFallbackWorld(ctx: CanvasRenderingContext2D, w: number, h: number) {
		this.camX = clamp(this.px - w / 2, 0, Math.max(0, WORLD_PX_W - w));
		this.camY = clamp(this.py - h / 2, 0, Math.max(0, WORLD_PX_H - h));
		const night = nightAmount(this.worldHour);
		ctx.fillStyle = night > 0.35 ? "#1a1612" : night > 0.08 ? "#6a8aa0" : "#9ec9e6";
		ctx.fillRect(0, 0, w, h);
		ctx.save();
		ctx.translate(-this.camX, -this.camY);
		if (this.mapCanvas) ctx.drawImage(this.mapCanvas, 0, 0);
		for (const car of this.cars) this.drawCar(ctx, car);
		for (const p of this.peds) if (!p.inside) this.drawPed(ctx, p);
		for (const n of NPCS) this.drawNpc(ctx, n);
		this.drawPlayer(ctx);
		ctx.restore();
		if (night > 0.05) {
			ctx.fillStyle = `rgba(6,8,14,${night * 0.45})`;
			ctx.fillRect(0, 0, w, h);
		}
	}
	drawShotMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const mw = 188;
		const mh = 16;
		const mx = w / 2 - mw / 2;
		const my = h - 128;
		const spot = this.courtSpot();
		const half = this.currentTier().perfectHalfWidth * (1 - this.ball.heat * 0.34)
			* (spot.label === "LOGO" ? 0.52 : spot.label === "CORNER" ? 0.62 : spot.label === "THREE" ? 0.72 : spot.label === "MID" ? 0.9 : 1.2);
		const win = perfectWindow(spot.zone, half);
		const good = goodWindow(win);
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.beginPath();
		rr(ctx, mx - 5, my - 5, 198, 26, 8);
		ctx.fill();
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(mx, my, mw, mh);
		ctx.fillStyle = "rgba(29,185,84,0.28)";
		ctx.fillRect(mx + mw * good.lo, my, mw * (good.hi - good.lo), mh);
		ctx.fillStyle = "rgba(29,185,84,0.7)";
		ctx.fillRect(mx + mw * win.lo, my, mw * (win.hi - win.lo), mh);
		ctx.fillStyle = "#1db954";
		ctx.fillRect(mx, my, mw * this.ball.power, mh);
		ctx.textAlign = "start";
	}
	drawFishMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const mw = 188;
		const mh = 16;
		const mx = w / 2 - mw / 2;
		const my = h - 128;
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.beginPath();
		rr(ctx, mx - 5, my - 5, 198, 26, 8);
		ctx.fill();
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(mx, my, mw, mh);
		if (this.fish.phase === "cast") {
			ctx.fillStyle = "rgba(79,157,223,0.7)";
			ctx.fillRect(mx, my, mw * this.fish.power, mh);
		} else {
			ctx.fillStyle = "rgba(232,80,80,0.28)";
			ctx.fillRect(mx + mw * 0.82, my, mw * 0.18, mh);
			ctx.fillStyle = "rgba(29,185,84,0.55)";
			ctx.fillRect(mx + mw * 0.18, my, mw * 0.64, mh);
			ctx.fillStyle = "#f4e27c";
			ctx.fillRect(mx + mw * Math.min(1, this.fish.tension) - 2, my - 3, 4, mh + 6);
			ctx.fillStyle = "#4f9ddf";
			ctx.fillRect(mx, my - 10, mw * this.fish.progress, 4);
		}
	}
	drawCar(ctx: CanvasRenderingContext2D, car: { x: number; y: number; vx: number; vy: number; w: number; color: string }) {
		ctx.save();
		ctx.translate(car.x, car.y);
		if (Math.abs(car.vy) > Math.abs(car.vx)) ctx.rotate(car.vy > 0 ? Math.PI / 2 : -Math.PI / 2);
		else if (car.vx < 0) ctx.rotate(Math.PI);
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.fillRect(2, 6, car.w, 16);
		ctx.fillStyle = car.color;
		ctx.fillRect(0, 0, car.w, 18);
		ctx.fillStyle = "rgba(180,220,255,0.35)";
		ctx.fillRect(car.w * .45, 3, car.w * .28, 12);
		ctx.fillStyle = "#fde68a";
		ctx.fillRect(car.w - 3, 3, 3, 5);
		ctx.fillRect(car.w - 3, 10, 3, 5);
		ctx.restore();
	}
	drawPed(ctx: CanvasRenderingContext2D, p: { x: number; y: number; color: string; t: number }) {
		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.beginPath();
		ctx.ellipse(p.x, p.y + 3, 8, 4, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = p.color;
		ctx.fillRect(p.x - 6, p.y - 20 + Math.sin(p.t * 6) * 1.2, 12, 18);
		ctx.fillStyle = "#1c1917";
		ctx.beginPath();
		ctx.arc(p.x, p.y - 24, 6, 0, Math.PI * 2);
		ctx.fill();
	}
	drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const target = this.getObjectiveTarget();
		if (!target) return;
		const sx = target.x - this.camX;
		const sy = target.y - this.camY;
		const margin = 48;
		if (sx > margin && sx < w - margin && sy > margin && sy < h - margin) return;
		const cx = w / 2;
		const cy = h / 2;
		const ang = Math.atan2(target.y - this.py, target.x - this.px);
		const edgePad = 56;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);
		const tX = cos > 0 ? (w - edgePad - cx) / cos : cos < 0 ? (edgePad - cx) / cos : Infinity;
		const tY = sin > 0 ? (h - edgePad - cy) / sin : sin < 0 ? (edgePad - cy) / sin : Infinity;
		const t = Math.min(Math.abs(tX), Math.abs(tY));
		const ax = clamp(cx + cos * t, edgePad, w - edgePad);
		const ay = clamp(cy + sin * t, 96, h - edgePad - 80);
		ctx.save();
		ctx.translate(ax, ay);
		ctx.rotate(ang);
		ctx.fillStyle = "rgba(29,185,84,0.95)";
		ctx.beginPath();
		ctx.moveTo(14, 0);
		ctx.lineTo(-10, 9);
		ctx.lineTo(-6, 0);
		ctx.lineTo(-10, -9);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		const meters = Math.round(dist(this.px, this.py, target.x, target.y) / 12);
		ctx.fillStyle = "rgba(10,12,11,0.75)";
		ctx.font = "600 11px DM Sans, sans-serif";
		const label = `${meters}m`;
		const tw = ctx.measureText(label).width;
		const lx = clamp(ax - tw / 2, 8, w - tw - 8);
		const ly = clamp(ay + 22, 20, h - 20);
		ctx.fillRect(lx - 4, ly - 11, tw + 8, 16);
		ctx.fillStyle = "#1db954";
		ctx.fillText(label, lx, ly);
	}
	drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const size = Math.min(136, Math.max(100, w * .15));
		const pad = 12;
		const mx = pad;
		const my = h - size - pad - (w < 640 ? 108 : 10);
		const scaleX = size / WORLD_PX_W;
		const scaleY = size / WORLD_PX_H;
		ctx.fillStyle = "rgba(10,12,11,0.86)";
		ctx.beginPath();
		rr(ctx, mx - 3, my - 3, size + 6, size + 6, 12);
		ctx.fill();
		ctx.strokeStyle = "rgba(29,185,84,0.45)";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		rr(ctx, mx, my, size, size, 10);
		ctx.clip();
		ctx.fillStyle = "#1a211c";
		ctx.fillRect(mx, my, size, size);
		ctx.fillStyle = "#2a332c";
		ctx.fillRect(mx, my + 960 * scaleY - 2, size, 4);
		ctx.fillRect(mx + 768 * scaleX - 2, my, 4, size);
		ctx.fillRect(mx + 1632 * scaleX - 2, my, 4, size);
		for (const p of POIS) {
			const isTarget = this.mission.steps[this.mission.activeStep]?.target === p.id;
			ctx.fillStyle = isTarget ? "#1db954" : p.color;
			const px = mx + p.x * scaleX;
			const py = my + p.y * scaleY;
			const pw = Math.max(4, p.w * scaleX);
			const ph = Math.max(4, p.h * scaleY);
			ctx.fillRect(px, py, pw, ph);
			if (isTarget) {
				ctx.strokeStyle = `rgba(29,185,84,${.4 + Math.sin(this.clock * 5) * .3})`;
				ctx.lineWidth = 2;
				ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
			}
		}
		const ppx = mx + this.px * scaleX;
		const ppy = my + this.py * scaleY;
		ctx.fillStyle = "#f2f5f3";
		ctx.beginPath();
		ctx.arc(ppx, ppy, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#1db954";
		ctx.lineWidth = 1.5;
		ctx.stroke();
		const fang = this.facing === "up" ? -Math.PI / 2 : this.facing === "down" ? Math.PI / 2 : this.facing === "left" ? Math.PI : 0;
		ctx.fillStyle = "#1db954";
		ctx.beginPath();
		ctx.moveTo(ppx + Math.cos(fang) * 8, ppy + Math.sin(fang) * 8);
		ctx.lineTo(ppx + Math.cos(fang + 2.5) * 4, ppy + Math.sin(fang + 2.5) * 4);
		ctx.lineTo(ppx + Math.cos(fang - 2.5) * 4, ppy + Math.sin(fang - 2.5) * 4);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "rgba(242,245,243,0.55)";
		ctx.font = "600 9px DM Sans, sans-serif";
		ctx.fillText("MEMPHIS 901", 20, my + 14);
	}
	drawNpc(ctx: CanvasRenderingContext2D, n: NpcDef) {
		const live = this.npcPos(n.id);
		const x = live.x;
		const y = live.y;
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.ellipse(x, y + 4, 14, 6, 0, 0, Math.PI * 2);
		ctx.fill();
		if (n.isKBlanco && this.images.k) {
			const img = this.images.k;
			const ih = 72;
			const iw = img.width / img.height * ih;
			ctx.drawImage(img, x - iw / 2, y - ih + 4, iw, ih);
		} else {
			ctx.fillStyle = n.color;
			ctx.fillRect(x - 12, y - 40, 24, 36);
			ctx.fillStyle = "#1c1917";
			ctx.beginPath();
			ctx.arc(x, y - 48, 12, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "rgba(10,12,11,0.78)";
		ctx.font = "600 11px DM Sans, sans-serif";
		const tw = ctx.measureText(n.name).width;
		ctx.fillRect(x - tw / 2 - 6, y - 78, tw + 12, 16);
		ctx.fillStyle = n.isKBlanco ? "#1db954" : "#f2f5f3";
		ctx.fillText(n.name, x - tw / 2, y - 66);
		if (this.nearNpc === n.id) {
			ctx.strokeStyle = "#1db954";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(x, y + 4, 18, 8, 0, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	drawPlayer(ctx: CanvasRenderingContext2D) {
		const y = this.py + this.bob;
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.beginPath();
		ctx.ellipse(this.px, this.py + 6, 16, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		const view = this.facing === "up" ? "back" : this.facing === "down" ? "front" : this.facing === "left" ? "left" : "right";
		const img =
			(view === "front" ? this.images.frontHi : view === "back" ? this.images.backHi : view === "left" ? this.images.leftHi : this.images.rightHi)
			?? this.images[view];
		if (img) {
			const look = lookFor(this.equipped);
			const key = stampFor(look, view);
			const stamp = (key && this.images[key]) || this.images.icon;
			const ovKey = overlayKey(look, view);
			const overlay = (ovKey && this.images[ovKey]) || null;
			const dressed = dressBenji(cleanSprite(img), look, view, stamp, overlay);
			const h = 80;
			const w = dressed.width / dressed.height * h;
			const sx = this.moving ? 1 + Math.sin(this.animT) * .05 : 1;
			const sy = this.moving ? 1 - Math.sin(this.animT) * .05 : 1;
			ctx.save();
			ctx.translate(this.px, y);
			ctx.scale(sx, sy);
			ctx.drawImage(dressed, -w / 2, -76, w, h);
			ctx.restore();
		} else {
			ctx.fillStyle = "#1db954";
			ctx.fillRect(this.px - 14, y - 48, 28, 40);
		}
	}
	getLocationName() {
		if (onRiverfront(this.px, this.py) || this.nearPoi === "river") return "Mississippi River";
		if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.name ?? "Memphis";
		if (this.py > riverHole().y - 80) return "Riverfront";
		if (this.px > 3072 * .7) return "East Memphis";
		if (this.px < 3072 * .28) return "West Side";
		return "Memphis Streets";
	}
	getDistrict() {
		if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.district ?? "901";
		return "901";
	}
	hourLabel() {
		const h = Math.floor(this.worldHour);
		const m = Math.floor((this.worldHour - h) * 60);
		const ap = h >= 12 ? "PM" : "AM";
		return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, "0")} ${ap}`;
	}
	emitHud() {
		this.onHud?.(this.getHud());
	}
	getHud() {
		const quest = this.activeQuest();
		const step = quest.steps[quest.activeStep];
		const done = quest.steps.filter((s) => s.done).length;
		const prompts = this.input.prompt(this.input.device);
		const ch2 = this.dropLive ? this.afterHours.steps.map((s) => ({
			id: s.id,
			label: s.label,
			done: s.done,
			description: s.description,
		})) : [];
		return {
			mode: this.mode,
			sackdollars: this.sackdollars,
			respect: this.respect,
			missionTitle: quest.title,
			missionChapter: quest.chapter,
			missionStep: quest.complete && this.mission.complete
				? "Free roam · After Hours locked"
				: this.mission.complete && !this.afterHours.complete
					? (step ? step.label : "After Hours")
					: this.mission.complete
						? "Free roam · side missions live"
						: step ? step.label : "—",
			missionProgress: `${done}/${quest.steps.length}`,
			interactHint: this.fish.active
				? fishingHud(this.fish, this.input.device === "touch").prompt
				: this.mode === "world"
				? this.interactHint
				: this.mode === "dialogue"
					? (this.input.device === "touch" ? "TAP to continue" : `${prompts.interact} to continue`)
					: this.mode === "basketball"
						? null
						: null,
			hintWalk: this.mode === "world" && this.hintWalk && !this.fish.active,
			locationName: this.getLocationName(),
			district: this.getDistrict(),
			dialogue: this.dialogue,
			shopOpen: this.shopOpen,
			toast: this.toast,
			equipped: this.equipped,
			owned: [...this.owned],
			basketball: this.mode === "basketball" ? {
				score: this.ball.score,
				timeLeft: this.mode === "basketball" && this.courtChallenge !== "horse" ? Math.ceil(this.ball.timeLeft) : 0,
				shots: this.ball.shots,
				active: true,
				combo: this.ball.combo,
				power: this.ball.power,
				charging: this.ball.charging,
				best: this.ball.best,
				target: this.ball.targetScore,
				perfects: this.run.ballPerfects,
				zone: this.courtSpot().label,
				difficulty: DIFFICULTY[this.courtDifficulty].label,
				challenge: this.courtChallenge,
				ogLine: this.ogBark,
				horse: this.courtChallenge === "horse" ? horseDisplay(this.horseMisses) : null,
				call: this.courtChallenge === "horse" ? HORSE_CALLS[this.horseIndex] ?? "DONE" : this.courtChallenge === "threes" ? "THREES ONLY" : null,
				board: this.courtBoard.slice(0, 5).map((r) => ({ score: r.score, label: `${r.mode} · ${r.difficulty}` })),
			} : null,
			courtMenu: this.courtMenu ? { difficulty: DIFFICULTY[this.courtDifficulty].label, unlocked: this.missionComplete } : null,
			canShoot: this.canShoot(),
			paused: this.paused,
			started: this.started,
			missionComplete: this.missionComplete,
			cinematic: this.cinematic,
			letterbox: this.letterbox,
			worldHour: this.worldHour,
			inputDevice: this.input.device,
			promptButton: prompts.interact,
			trophies: [...this.trophies],
			trophyPopup: this.trophyPopup,
			pauseTab: this.pauseTab,
			settings: this.settings,
			sideMissions: this.side.map((s) => ({
				id: s.id,
				title: s.title,
				description: s.description,
				done: s.done,
				reward: s.reward
			})),
			highScore: this.highScore,
			hasSave: this.hasSave,
			cameraView: this.settings.cameraView,
			steps: [
				...this.mission.steps.map((s) => ({
					id: s.id,
					label: s.label,
					done: s.done,
					description: s.description
				})),
				...ch2,
			],
			dropRun: toHud(this.run, this.currentTier().courtTarget, this.currentTier().parSeconds),
			uiPulse: this.uiPulse,
			bestGrade: this.bestGrade,
			bestRunScore: this.bestRunScore,
			buildVersion: GAME_BUILD_VERSION,
			dropLive: this.dropLive,
			driving: !!this.vehicle,
			jooking: this.jooking,
			nextUnlock: (() => {
				const n = nextMilestone(this.respect, this.unlocks);
				return n ? { label: n.label, at: n.at } : null;
			})(),
			vanSkin: this.vanSkin,
			race: toRaceHud(this.race),
			raceMenu: this.raceMenu,
			fishing: this.fish.active ? fishingHud(this.fish, this.input.device === "touch") : null,
			food: this.foodMenu ? foodHud(foodTruckById(this.foodMenu)!, this.cooler, this.sackdollars) : null,
			coolerCount: this.cooler.length,
			fed: this.fedT > 0,
			sponsor: sponsorHud(),
			sponsorOpen: this.sponsorOpen,
		};
	}
};
