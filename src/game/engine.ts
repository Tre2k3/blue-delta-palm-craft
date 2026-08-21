import {
  APPAREL,
  DEFAULT_SETTINGS,
  NPCS,
  PAL,
  POIS,
  SAVE_KEY,
  SAVE_KEY_LEGACY,
  SAVE_KEY_LEGACY_V1,
  SAVE_VERSION,
  STREETS,
  TROPHIES,
  WORLD_PX_H,
  WORLD_PX_W,
  createDropDayMission,
  createSideMissions,
} from "./data";
import { audio } from "./audio";
import { InputManager } from "./input";
import { World3D } from "./world3d";
import { CharacterController } from "./characterController";
import { JUICE, emitBurst, stepParticles, type ScreenParticle } from "./juice";
import {
  aheadDistance,
  circleHitsRect,
  isRoadPoint,
  laneVelocity,
  poiColliders,
  sidewalkRects,
  trafficLanes,
  type Lane,
  type Rect,
} from "./worldTopology";
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
		img.src = src;
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
function nightAmount(hour: number) {
	if (hour < 5.5) return .78;
	if (hour < 7) return .78 * (1 - (hour - 5.5) / 1.5);
	if (hour < 18) return 0;
	if (hour < 20.5) return (hour - 18) / 2.5 * .78;
	return .78;
}
export class GameEngine {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	images: ImgMap = {};
	input = new InputManager();
	started = false;
	paused = false;
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
	};
	highScore = 0;
	walls: { x: number; y: number; w: number; h: number }[] = [];
	trees: { x: number; y: number }[] = [];
	cars: { x: number; y: number; vx: number; vy: number; w: number; color: string; laneId: string; skin: number }[] = [];
	peds: { x: number; y: number; vx: number; vy: number; color: string; t: number; skin: number }[] = [];
	npcLive: { id: string; x: number; y: number; ox: number; oy: number; t: number }[] = [];
	poiBoxes: Rect[] = [];
	laneMap = new Map<string, Lane>();
	walks: Rect[] = [];
	shopOpen = false;
	cinematic: CinematicState | null = null;
	letterbox = 0;
	worldHour = 16.2;
	settings: GameSettings = { ...DEFAULT_SETTINGS };
	interactHint: string | null = null;
	nearPoi: LocationId | null = null;
	nearNpc: string | null = null;
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
	mover = new CharacterController();
	lastDt = 1 / 60;
	runIndex = 1;
	run: DropRunState = createRun(1);
	bestRunScore = 0;
	bestGrade: RunGrade | null = null;
	dropLive = false;
	uiPulse = 0;
	punch = 0;
	hoopPulse = 0;
	plantSign = 0;
	lastDeliveryAt = 0;
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.world3d = new World3D(canvas);
		this.ctx = this.world3d.overlay.getContext("2d")!;
		this.buildWorld();
	}
	async init() {
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
		}).map(async ([k, src]) => {
			try {
				this.images[k] = await loadImage(src);
			} catch { /* missing optional sprite */ }
		}));
		this.loadSave();
		this.paintMap();
		await this.world3d?.loadTextures((d, t) => this.onLoad?.(d / t));
		this.world3d?.buildCity(this.walls, this.trees);
		this.input.bind();
		this.wireQa();
		this.applyQuality();
		this.emitHud();
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
		for (let gy = 2; gy < 46; gy += 5) for (let gx = 2; gx < 62; gx += 5) {
			if (gx % 10 === 2 || gy % 10 === 2) continue;
			const bx = gx * 48;
			const by = gy * 48;
			const bw = 144;
			const bh = 2.5 * 48;
			let blocked = false;
			for (const p of POIS) if (bx < p.x + p.w + 48 * 1.5 && bx + bw > p.x - 48 * 1.5 && by < p.y + p.h + 48 * 1.5 && by + bh > p.y - 48 * 1.5) {
				blocked = true;
				break;
			}
			if (blocked) continue;
			if (bx < 768 && by < 768) continue;
			this.walls.push({
				x: bx,
				y: by,
				w: bw,
				h: bh - 18
			});
		}
		for (let i = 0; i < 48; i++) this.trees.push({
			x: (3 + i * 17 % 58) * 48,
			y: (3 + i * 29 % 42) * 48
		});
		this.poiBoxes = poiColliders();
		this.walks = sidewalkRects();
		const carColors = [
			"#1db954",
			"#111111",
			"#e5e5e5",
			"#3b82f6",
			"#b91c1c",
			"#854d0e"
		];
		const lanes = trafficLanes();
		this.laneMap = new Map(lanes.map((l) => [l.id, l]));
		let ci = 0;
		for (const lane of lanes) {
			const count = lane.axis === "x" ? 3 : 2;
			for (let i = 0; i < count; i++) {
				const t = (i + 0.28) / count;
				const along = lane.min + (lane.max - lane.min) * t;
				const vel = laneVelocity(lane);
				this.cars.push({
					x: lane.axis === "x" ? along : lane.fixed,
					y: lane.axis === "y" ? along : lane.fixed,
					vx: vel.vx,
					vy: vel.vy,
					w: 38 + ci % 3 * 8,
					color: carColors[ci % carColors.length]!,
					laneId: lane.id,
					skin: ci % 4,
				});
				ci++;
			}
		}
		const pedColors = [
			"#d6d3d1",
			"#a8a29e",
			"#78716c",
			"#1db954",
			"#44403c",
			"#fafaf9"
		];
		for (let i = 0; i < 14; i++) {
			const walk = this.walks[i % Math.max(this.walks.length, 1)];
			const along = walk
				? walk.w > walk.h
					? { x: walk.x + ((i * 211) % Math.max(walk.w - 8, 8)), y: walk.y + walk.h * 0.5 }
					: { x: walk.x + walk.w * 0.5, y: walk.y + ((i * 173) % Math.max(walk.h - 8, 8)) }
				: { x: (6 + (i * 11) % 50) * 48, y: (8 + (i * 7) % 34) * 48 };
			const alongStreet = !!(walk && walk.w > walk.h);
			this.peds.push({
				x: along.x,
				y: along.y,
				vx: alongStreet ? (i % 2 === 0 ? 1 : -1) * (22 + (i % 5) * 4) : 0,
				vy: alongStreet ? 0 : (i % 2 === 0 ? 1 : -1) * (18 + (i % 4) * 3),
				color: pedColors[i % pedColors.length]!,
				t: i,
				skin: i % 4,
			});
		}
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
			river.addColorStop(0, "#1e3a5f");
			river.addColorStop(1, "#0c1929");
			g.fillStyle = river;
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "rgba(255,255,255,0.08)";
			for (let i = 0; i < 8; i++) g.fillRect(p.x + 10 + i * 70, p.y + 20 + i % 3 * 12, 40, 3);
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
		const river = g.createLinearGradient(0, WORLD_PX_H - 110, 0, WORLD_PX_H);
		river.addColorStop(0, "rgba(30, 64, 100, 0)");
		river.addColorStop(1, "rgba(20, 50, 90, 0.62)");
		g.fillStyle = river;
		g.fillRect(0, WORLD_PX_H - 110, WORLD_PX_W, 110);
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
			}
		};
		window.__gameTest = {
			teleport: (loc: string) => {
				if (this.mode === "basketball") this.exitBasketball();
				if (this.mode === "shop") this.closeShop();
				if (this.mode === "dialogue") {
					this.mode = "world";
					this.dialogue = null;
				}
				this.cinematic = null;
				const p = POIS.find((x) => x.id === loc);
				if (!p) return;
				this.px = p.x + p.w / 2;
				this.py = p.y + p.h + 24;
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
		};
	}
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.input.unbind();
		this.world3d?.dispose();
		this.world3d = null;
	}
	start(fresh = false) {
		audio.unlock();
		audio.confirm();
		if (fresh) this.resetProgress(false);
		this.started = true;
		this.paused = false;
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
		this.side = createSideMissions();
		this.missionComplete = false;
		this.sackdollars = 25;
		this.respect = 0;
		this.owned = ["starter_tee"];
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
		this.dialogue = null;
		this.ball.missionCredited = false;
		this.ball.best = 0;
		this.ball.targetScore = 8;
		this.worldHour = 16.2;
		this.hasSave = false;
		this.runIndex = 1;
		this.run = createRun(1);
		this.bestRunScore = 0;
		this.bestGrade = null;
		this.dropLive = false;
		this.uiPulse = 0;
		this.punch = 0;
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
			this.equipped = data.equipped;
			this.mission.complete = data.missionComplete ?? false;
			this.missionComplete = this.mission.complete;
			this.dropLive = !!data.dropLive || this.missionComplete;
			for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
			const firstUndone = this.mission.steps.findIndex((s) => !s.done);
			this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
			this.trophies = data.trophies ?? [];
			this.highScore = data.basketballHighScore ?? 0;
			this.worldHour = data.worldHour ?? 16.2;
			if (data.settings) this.settings = {
				...DEFAULT_SETTINGS,
				...data.settings
			};
			if (data.sideProgress) for (const s of this.side) s.done = !!data.sideProgress[s.id];
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
			bestRunScore: this.bestRunScore,
			bestGrade: this.bestGrade,
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
		this.paused = false;
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
		this.paused = false;
		audio.ui();
		this.emitHud();
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
		if (this.started && act.pausePressed && !this.cinematic) if (this.mode === "shop") this.closeShop();
		else if (this.mode === "dialogue") this.advanceDialogue();
		else if (this.mode === "basketball" && act.backPressed) this.exitBasketball();
		else {
			this.paused = !this.paused;
			this.pauseTab = "resume";
			audio.ui();
			this.emitHud();
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
					this.showToast(this.runIndex > 1 ? `Run ${this.runIndex}. Link with K Blanco at HQ.` : "Drop Day is live. Find K Blanco at HQ.");
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
		this.worldHour = (this.worldHour + dt * .042) % 24;
		if (this.worldHour >= 20 && this.worldHour < 20.1) this.unlockTrophy("night_owl");
		this.updateTraffic(dt);
		this.updatePeds(dt);
		if (this.mode === "dialogue") {
			if (act.interactPressed || act.shootPressed) this.advanceDialogue();
			return;
		}
		if (this.mode === "shop" || this.mode === "menu") return;
		if (this.mode === "basketball") {
			if (act.shootPressed) this.beginCharge();
			if (act.shootReleased) this.releaseShot();
			if (act.backPressed) this.exitBasketball();
			this.updatePlayer(dt, act.mx, act.my, act.run, false, false);
			this.updateBasketball(dt);
			return;
		}
		if (this.cinematic) return;
		this.updatePlayer(dt, act.mx, act.my, act.run, act.jumpPressed, act.jump);
		this.updateProximity();
		this.checkMissionAuto();
		this.checkSideVisits();
		if (act.interactPressed) this.tryInteract();
	}
	updateTraffic(dt: number) {
		for (const c of this.cars) {
			const lane = this.laneMap.get(c.laneId);
			if (!lane) continue;
			if (lane.axis === "x") c.y += (lane.fixed - c.y) * (1 - Math.exp(-8 * dt));
			else c.x += (lane.fixed - c.x) * (1 - Math.exp(-8 * dt));
			let scale = 1;
			for (const o of this.cars) {
				if (o === c || o.laneId !== c.laneId) continue;
				const d = aheadDistance(c, o);
				if (d < 78) scale = Math.min(scale, Math.max(0, (d - 30) / 48));
			}
			const pd = aheadDistance(c, { x: this.px, y: this.py });
			if (pd < 86) scale = Math.min(scale, Math.max(0, (pd - 34) / 52));
			const spd = Math.hypot(c.vx, c.vy);
			if (spd > 1) {
				const nx = c.x + (c.vx / spd) * 52;
				const ny = c.y + (c.vy / spd) * 52;
				for (const box of this.poiBoxes) {
					if (circleHitsRect(nx, ny, 18, box)) {
						scale = Math.min(scale, 0.12);
						break;
					}
				}
			}
			const desired = laneVelocity(lane, scale);
			c.vx += (desired.vx - c.vx) * (1 - Math.exp(-6 * dt));
			c.vy += (desired.vy - c.vy) * (1 - Math.exp(-6 * dt));
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			if (lane.axis === "x") {
				if (c.x > lane.max + 48) c.x = lane.min - 48;
				if (c.x < lane.min - 48) c.x = lane.max + 48;
			} else {
				if (c.y > lane.max + 48) c.y = lane.min - 48;
				if (c.y < lane.min - 48) c.y = lane.max + 48;
			}
		}
	}
	updatePeds(dt: number) {
		for (const p of this.peds) {
			p.t += dt;
			let nx = p.x + p.vx * dt;
			let ny = p.y + p.vy * dt;
			if (nx < 96 || nx > 2976) p.vx *= -1;
			if (ny < 96 || ny > 2112) p.vy *= -1;
			const onWalk = this.walks.some((w) => nx >= w.x && nx <= w.x + w.w && ny >= w.y && ny <= w.y + w.h);
			if (!onWalk || isRoadPoint(nx, ny)) {
				p.vx *= -1;
				p.vy *= -1;
				nx = p.x + p.vx * dt;
				ny = p.y + p.vy * dt;
			}
			for (const box of this.poiBoxes) {
				if (circleHitsRect(nx, ny, 10, box)) {
					p.vx *= -1;
					p.vy *= -1;
					nx = p.x;
					ny = p.y;
					break;
				}
			}
			p.x = nx;
			p.y = ny;
		}
		for (const n of this.npcLive) {
			if (!NPCS.find((x) => x.id === n.id)?.wander) continue;
			n.t += dt;
			n.x = n.ox + Math.sin(n.t * .35) * 36;
			n.y = n.oy + Math.cos(n.t * .28) * 22;
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
		const rad = 14;
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
		else this.mover.vx = 0;
		if (!this.collides(this.px, ny, rad)) this.py = ny;
		else this.mover.vy = 0;
	}
	collides(x: number, y: number, r: number) {
		for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
		for (const box of this.poiBoxes) if (circleHitsRect(x, y, r, box)) return true;
		if (this.mode !== "basketball" && this.mover.air < 0.55) {
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
		this.interactHint = null;
		let bestPoi = 9999;
		for (const p of POIS) {
			const d = dist(this.px, this.py, p.x + p.w / 2, p.y + p.h / 2);
			if (d < Math.max(p.w, p.h) * .55 + 44 && d < bestPoi) {
				bestPoi = d;
				this.nearPoi = p.id;
			}
		}
		let best = 92;
		for (const n of this.npcLive) {
			const d = dist(this.px, this.py, n.x, n.y);
			if (d < best) {
				best = d;
				this.nearNpc = n.id;
			}
		}
		if (this.nearNpc) {
			const name = NPCS.find((x) => x.id === this.nearNpc)?.name ?? "local";
			this.interactHint = `Talk to ${name}`;
		} else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
		else if (this.nearPoi === "court") this.interactHint = "Play basketball";
		else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
		else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi)?.name ?? this.nearPoi}`;
	}
	tryInteract() {
		if (!this.started || this.paused || this.cinematic) return;
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
		if (this.mode === "basketball") {
			if (!this.ball.inFlight) this.beginCharge();
			return;
		}
		if (this.nearPoi) {
			const step = this.mission.steps[this.mission.activeStep];
			if (step && !step.done && step.target === this.nearPoi && (step.kind === "deliver" || step.kind === "pickup" || step.kind === "goto")) {
				this.tryMissionAction(this.nearPoi);
				return;
			}
		}
		if (this.nearNpc) {
			this.openDialogue(this.nearNpc);
			return;
		}
		if (this.nearPoi === "court") {
			this.enterBasketball();
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
		if (this.nearPoi === "dropvan") {
			this.tryMissionAction("dropvan");
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
		const step = this.mission.steps[this.mission.activeStep];
		if (n.isKBlanco && step && step.kind === "talk" && !step.done) this.dialogueLines = [n.missionTalk ?? "Tonight is Drop Day.", "Grab the van, hit three spots, then come back to me."];
		else if (n.isKBlanco && step && step.kind === "return" && !step.done) this.dialogueLines = ["You moved the city, Benji. That's Respect. The drop is live.", "Shop the wall anytime. Wear it like you earned it."];
		else this.dialogueLines = [...n.dialogue];
		this.dialogue = {
			speaker: n.name,
			text: this.dialogueLines[0] ?? "..."
		};
		this.mode = "dialogue";
		this.emitHud();
	}
	advanceDialogue() {
		if (!this.dialogue) {
			this.mode = "world";
			return;
		}
		audio.talk();
		this.dialogueIndex++;
		if (this.dialogueIndex >= this.dialogueLines.length) {
			if (NPCS.find((x) => x.id === this.dialogueNpcId)?.isKBlanco) {
				const step = this.mission.steps[this.mission.activeStep];
				if (step && step.kind === "talk" && !step.done) this.completeStep(step.id);
				if (step && step.kind === "return" && !step.done) this.completeStep(step.id);
			}
			if (this.dialogueNpcId === "supporter_1") this.tryMissionAction("neighborhood");
			if (this.dialogueNpcId === "downtown_fan") this.tryMissionAction("downtown");
			if (this.dialogueNpcId === "culture_host") this.tryMissionAction("culture");
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
		const step = this.mission.steps[this.mission.activeStep];
		if (!step || step.done) {
			if (loc === "dropvan") this.showToast("Van's locked. Keep moving the brand.");
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
		const step = this.mission.steps[this.mission.activeStep];
		if (!step || step.done) return;
		if (step.id === "wake" && this.leftSpawn) {
			const apt = POIS.find((p) => p.id === "apartment");
			if (apt && !insidePoi(this.px, this.py, apt, 50)) {
				this.completeStep("wake");
				this.showToast("Memphis is open. Head to SackReligious HQ.");
			}
		}
	}
	checkSideVisits() {
		for (const s of this.side) {
			if (s.done || s.kind !== "visit" || !s.target) continue;
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
		if (this.owned.length >= APPAREL.length) this.unlockTrophy("full_closet");
	}
	completeSide(id: string) {
		const s = this.side.find((x) => x.id === id);
		if (!s || s.done) return;
		s.done = true;
		this.sackdollars += s.reward;
		this.respect += 4;
		this.float(`+$${s.reward}`, "#1db954");
		this.showToast(`SIDE MISSION · ${s.title}`);
		audio.mission();
		this.save();
	}
	completeStep(id: string) {
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
			this.dropLive = true;
			if (this.worldHour < 18.6) this.worldHour = 18.8;
			analytics.track("chapter_completed", { chapter: this.mission.chapter, grade: result.grade });
			commerce.notifyChapterComplete(this.mission.chapter);
			this.cinematic = {
				kind: "complete",
				title: "MISSION COMPLETE",
				subtitle: `THE DROP DAY  ·  GRADE ${result.grade}`,
				t: 0,
				duration: 3.6
			};
			audio.mission();
			audio.grade(result.grade);
			this.addTrauma(JUICE.trauma.complete);
			this.addPunch(JUICE.punch.complete);
		} else {
			this.mission.activeStep = next;
			const upcoming = this.mission.steps[next];
			if (upcoming) analytics.track("mission_started", { stepId: upcoming.id, label: upcoming.label });
		}
		if (this.respect >= 40) this.unlockTrophy("city_legend");
		if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
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
	buyItem(id: ApparelId) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
		if (item.respectRequired && this.respect < item.respectRequired && !this.owned.includes(id)) {
			this.showToast(`Need ${item.respectRequired} Respect to unlock ${item.name}`);
			audio.ui();
			return;
		}
		if (this.owned.includes(id)) {
			this.equipped = id;
			this.showToast(`Equipped ${item.name}`);
			audio.ui();
			this.save();
			this.emitHud();
			return;
		}
		if (this.sackdollars < item.price) {
			this.showToast("Not enough $ackdollars");
			return;
		}
		this.sackdollars -= item.price;
		this.owned.push(id);
		this.equipped = id;
		this.respect += 3;
		this.showToast(`Bought ${item.name}`);
		this.float(item.name, item.color);
		this.burst(this.px, this.py, item.color);
		audio.cash();
		if (this.settings.rumble) this.input.rumble(70, .2, .35);
		this.unlockTrophy("fresh_fit");
		this.checkSideOwn();
		if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
		this.save();
		this.emitHud();
	}
	enterBasketball() {
		audio.whoosh();
		analytics.track("basketball_started", { target: this.currentTier().courtTarget });
		this.mode = "basketball";
		const court = POIS.find((p) => p.id === "court")!;
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h - 58;
		this.yaw = 0;
		this.pitch = 0.12;
		this.mover.reset(0);
		this.applyYawToFacing();
		this.ball.active = true;
		this.ball.score = 0;
		this.ball.timeLeft = 50;
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
		this.ball.targetScore = this.currentTier().courtTarget;
		this.showToast(`Move · look · V camera · hold shoot · need ${this.ball.targetScore}`);
		this.emitHud();
	}
	tryCreditBasketball() {
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.kind === "basketball" && this.ball.score >= this.ball.targetScore && !step.done && !this.ball.missionCredited) {
			this.ball.missionCredited = true;
			this.completeStep(step.id);
			analytics.track("basketball_completed", { score: this.ball.score, target: this.ball.targetScore });
			this.showToast("Respect earned. Return to HQ when ready.");
		}
		const side = this.side.find((s) => s.id === "pickup_kings");
		if (side && !side.done && this.ball.score >= (side.need ?? 16)) this.completeSide("pickup_kings");
		if (this.ball.score >= 20) this.unlockTrophy("court_king");
		if (this.ball.score > this.highScore) this.highScore = this.ball.score;
	}
	exitBasketball() {
		this.tryCreditBasketball();
		const comboPay = Math.max(0, this.ball.combo) * 4;
		const pay = this.ball.score * 5 + comboPay;
		if (pay > 0) {
			this.sackdollars += pay;
			this.float(`+$${pay}`, "#1db954");
			this.showToast(`Court payout: +$${pay} $ackdollars`);
			audio.cash();
		}
		this.mode = "world";
		this.ball.active = false;
		this.ball.charging = false;
		this.ball.inFlight = false;
		this.ball.held = true;
		const court = POIS.find((p) => p.id === "court")!;
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h + 30;
		this.save();
		this.emitHud();
	}
	hoop() {
		const court = POIS.find((p) => p.id === "court")!;
		return { x: court.x + court.w / 2, y: court.y + 26, z: 86, court };
	}
	updateBasketball(dt: number) {
		this.ball.timeLeft -= dt;
		if (this.ball.flash > 0) this.ball.flash -= dt;
		if (this.ball.timeLeft <= 0) {
			this.ball.timeLeft = 0;
			this.exitBasketball();
			return;
		}
		if (this.ball.charging && this.ball.held) this.ball.power = Math.min(1, this.ball.power + dt * 0.78);
		if (this.ball.held) {
			this.ball.ballX = this.px;
			this.ball.ballY = this.py;
			this.ball.ballZ = 36 + (this.ball.charging ? this.ball.power * 18 : Math.sin(this.clock * 3) * 2);
			return;
		}
		if (this.ball.inFlight || this.ball.ballZ > 8) {
			this.ball.ballX += this.ball.ballVx * dt;
			this.ball.ballY += this.ball.ballVy * dt;
			this.ball.ballZ += this.ball.ballVz * dt;
			this.ball.ballVz -= 780 * dt;
			const hoop = this.hoop();
			const dx = this.ball.ballX - hoop.x;
			const dy = this.ball.ballY - hoop.y;
			const planar = Math.hypot(dx, dy);
			if (this.ball.ballVz < 0 && this.ball.ballZ <= hoop.z + 10 && this.ball.ballZ >= hoop.z - 14) {
				if (planar < 11) {
					const zone = shotZone(this.ball.shotDist);
					const pts = zone === "deep" ? 3 : 2;
					const perfect = this.ball.grade === "PERFECT";
					this.ball.score += perfect ? pts + 1 : pts;
					this.ball.combo += 1;
					this.ball.best = Math.max(this.ball.best, this.ball.combo);
					this.ball.flash = perfect ? 0.62 : 0.5;
					this.burst(hoop.x, hoop.y, PAL.gold);
					this.float(perfect ? `PERFECT +${pts + 1}` : `+${pts}`, PAL.gold, hoop.x, hoop.y);
					this.addTrauma(perfect ? JUICE.trauma.perfect : JUICE.trauma.make);
					this.hitstop = perfect ? JUICE.hitstop.perfect : JUICE.hitstop.make;
					this.addPunch(perfect ? JUICE.punch.perfect : JUICE.punch.make);
					this.hoopPulse = perfect ? 1 : 0.65;
					if (this.run.active) scoreMake(this.run, perfect, zone, this.ball.combo);
					if (perfect) audio.perfect();
					else audio.swish();
					if (this.ball.combo > 1) audio.combo(this.ball.combo);
					if (this.settings.rumble) this.input.rumble(perfect ? 140 : 80, 0.3, 0.55);
					this.tryCreditBasketball();
					this.ball.inFlight = false;
					this.ball.ballVz = -40;
					this.ball.ballVx *= 0.2;
					this.ball.ballVy *= 0.2;
				} else if (planar < 20) {
					this.ball.combo = 0;
					if (this.run.active) scoreMiss(this.run);
					this.burst(hoop.x, hoop.y, "#e85d4c");
					this.float("RIM", "#e85d4c", hoop.x, hoop.y);
					audio.rim();
					this.addTrauma(JUICE.trauma.miss);
					this.hoopPulse = 0.35;
					const nx = dx / (planar || 1);
					const ny = dy / (planar || 1);
					this.ball.ballVx = nx * 90;
					this.ball.ballVy = ny * 90;
					this.ball.ballVz = Math.abs(this.ball.ballVz) * 0.35 + 40;
				}
			}
			if (this.ball.ballY < hoop.y - 6 && this.ball.ballZ > 50 && this.ball.ballZ < 120 && Math.abs(dx) < 28 && this.ball.ballVy < 0) {
				this.ball.ballVy = Math.abs(this.ball.ballVy) * 0.45;
				this.ball.ballVx *= 0.7;
				audio.rim();
			}
			const court = hoop.court;
			if (this.ball.ballX < court.x + 6 || this.ball.ballX > court.x + court.w - 6) {
				this.ball.ballVx *= -0.4;
				this.ball.ballX = clamp(this.ball.ballX, court.x + 6, court.x + court.w - 6);
			}
			if (this.ball.ballY < court.y + 8 || this.ball.ballY > court.y + court.h - 8) {
				this.ball.ballVy *= -0.4;
				this.ball.ballY = clamp(this.ball.ballY, court.y + 8, court.y + court.h - 8);
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
				this.ball.inFlight = false;
			}
		}
		if (!this.ball.held && !this.ball.inFlight && dist(this.px, this.py, this.ball.ballX, this.ball.ballY) < 32 && this.ball.ballZ < 22) {
			this.ball.held = true;
			this.ball.power = 0;
			this.ball.charging = false;
		}
	}
	releaseShot() {
		if (this.mode !== "basketball" || this.ball.inFlight) return;
		if (!this.ball.held) {
			if (dist(this.px, this.py, this.ball.ballX, this.ball.ballY) < 40) this.ball.held = true;
			return;
		}
		if (!this.ball.charging && this.ball.power <= 0) return;
		this.ball.charging = false;
		this.ball.shots++;
		audio.bounce();
		const hoop = this.hoop();
		const pwr = this.ball.power;
		const zone = shotZone(dist(this.px, this.py, hoop.x, hoop.y));
		const win = perfectWindow(zone, this.currentTier().perfectHalfWidth);
		const good = goodWindow(win);
		const perfect = pwr >= win.lo && pwr <= win.hi;
		const isGood = pwr >= good.lo && pwr <= good.hi;
		this.ball.grade = perfect ? "PERFECT" : isGood ? "GOOD" : "LATE";
		const d = dist(this.px, this.py, hoop.x, hoop.y);
		const lookTo = Math.atan2(-(hoop.x - this.px), -(hoop.y - this.py));
		let err = this.yaw - lookTo;
		while (err > Math.PI) err -= Math.PI * 2;
		while (err < -Math.PI) err += Math.PI * 2;
		const assist = (perfect ? 0.72 : isGood ? 0.42 : 0.08) * clamp(1 - Math.abs(err) / 0.9, 0, 1);
		const shootYaw = this.yaw + (lookTo - this.yaw) * assist;
		const speedErr = perfect ? 1 : isGood ? 0.94 + pwr * 0.08 : 0.62 + pwr * 0.55;
		const horiz = (155 + d * 0.92) * speedErr;
		const f = this.fwd();
		this.ball.ballX = this.px + f.x * 10;
		this.ball.ballY = this.py + f.y * 10;
		this.ball.ballZ = 42;
		this.ball.ballVx = -Math.sin(shootYaw) * horiz;
		this.ball.ballVy = -Math.cos(shootYaw) * horiz;
		this.ball.ballVz = 240 + pwr * 210 + d * 0.12;
		this.ball.shotDist = d;
		this.ball.inFlight = true;
		this.ball.held = false;
		this.ball.power = 0;
		this.ball.made = isGood;
	}
	beginCharge() {
		if (this.mode === "basketball" && this.ball.held && !this.ball.inFlight) {
			this.ball.charging = true;
			this.ball.power = 0;
			this.mover.triggerShoot();
		}
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
		if (step.kind === "talk" || step.kind === "return") {
			const k = this.npcPos("k_blanco");
			if (k) return {
				x: k.x,
				y: k.y
			};
		}
		const p = POIS.find((x) => x.id === step.target);
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
				},
				cars: this.cars,
				peds: this.peds,
				npcs: this.npcLive.map((n) => ({
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
				indoor: this.mode === "interior" || this.mode === "shop",
				punch: this.punch,
				hoopPulse: this.hoopPulse,
				air: this.mover.air,
				vz: this.mover.vz,
				equipped: this.equipped,
				outfitColor: this.equipped && this.equipped !== "starter_tee"
					? APPAREL.find((a) => a.id === this.equipped)?.color ?? null
					: null,
				dropLive: this.dropLive,
			});
			this.world3d.render(w, h);
		}
		if (ctx.canvas.width !== Math.floor(w * dpr) || ctx.canvas.height !== Math.floor(h * dpr)) {
			ctx.canvas.width = Math.floor(w * dpr);
			ctx.canvas.height = Math.floor(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		for (const p of this.particles) {
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
		for (const f of this.floaters) {
			ctx.globalAlpha = Math.max(0, f.life);
			ctx.fillStyle = f.color;
			ctx.font = `700 ${Math.round(16 * f.scale)}px DM Sans, sans-serif`;
			ctx.textAlign = "center";
			ctx.fillText(f.text, w / 2, h * 0.28);
			ctx.textAlign = "start";
		}
		ctx.globalAlpha = 1;
		if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) this.drawShotMeter(ctx, w, h);
		if (this.ball.flash > 0 && this.mode === "basketball") {
			ctx.fillStyle = `rgba(242,198,106,${this.ball.flash * 0.28})`;
			ctx.fillRect(0, 0, w, h);
			if (this.ball.grade) {
				ctx.fillStyle = PAL.gold;
				ctx.font = "700 48px Bebas Neue, DM Sans, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(this.ball.grade, w / 2, h * 0.16);
				ctx.textAlign = "start";
			}
		}
		if (this.started && (this.mode === "world" || this.mode === "basketball")) {
			this.drawCompass(ctx, w, h);
			this.drawMinimap(ctx, w, h);
		}
	}
	drawShotMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const mw = 188;
		const mh = 16;
		const mx = w / 2 - mw / 2;
		const my = h - 128;
		const hoop = this.hoop();
		const zone = shotZone(dist(this.px, this.py, hoop.x, hoop.y));
		const win = perfectWindow(zone, this.currentTier().perfectHalfWidth);
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
		ctx.fillStyle = "#f2f5f3";
		ctx.font = "700 10px DM Sans, sans-serif";
		ctx.fillText(`RELEASE IN THE GREEN · ${zone.toUpperCase()}`, mx, my - 10);
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
		const key = this.facing === "up" ? "back" : this.facing === "down" ? "front" : this.facing === "left" ? "left" : "right";
		const img = this.images[key];
		if (img) {
			const h = 80;
			const w = img.width / img.height * h;
			const sx = this.moving ? 1 + Math.sin(this.animT) * .05 : 1;
			const sy = this.moving ? 1 - Math.sin(this.animT) * .05 : 1;
			ctx.save();
			ctx.translate(this.px, y);
			ctx.scale(sx, sy);
			ctx.drawImage(img, -w / 2, -76, w, h);
			ctx.restore();
		} else {
			ctx.fillStyle = "#1db954";
			ctx.fillRect(this.px - 14, y - 48, 28, 40);
		}
		if (this.equipped && this.equipped !== "starter_tee") {
			const item = APPAREL.find((a) => a.id === this.equipped);
			if (item) {
				ctx.fillStyle = item.color;
				ctx.beginPath();
				ctx.arc(this.px + 18, y - 62, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "rgba(255,255,255,0.35)";
				ctx.stroke();
			}
		}
	}
	getLocationName() {
		if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.name ?? "Memphis";
		if (this.py > 2164) return "Riverfront";
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
		const step = this.mission.steps[this.mission.activeStep];
		const done = this.mission.steps.filter((s) => s.done).length;
		const prompts = this.input.prompt(this.input.device);
		return {
			mode: this.mode,
			sackdollars: this.sackdollars,
			respect: this.respect,
			missionTitle: this.mission.title,
			missionChapter: this.mission.chapter,
			missionStep: this.mission.complete ? "Free roam · side missions live" : step ? step.label : "—",
			missionProgress: `${done}/${this.mission.steps.length}`,
			interactHint: this.mode === "world" ? this.interactHint : this.mode === "dialogue" ? `${prompts.interact} to continue` : this.mode === "basketball" ? `Hold ${prompts.shoot} · release in green` : null,
			locationName: this.getLocationName(),
			district: this.getDistrict(),
			dialogue: this.dialogue,
			shopOpen: this.shopOpen,
			toast: this.toast,
			equipped: this.equipped,
			owned: [...this.owned],
			basketball: this.mode === "basketball" ? {
				score: this.ball.score,
				timeLeft: Math.ceil(this.ball.timeLeft),
				shots: this.ball.shots,
				active: true,
				combo: this.ball.combo,
				power: this.ball.power,
				charging: this.ball.charging,
				best: this.ball.best,
				target: this.ball.targetScore,
				perfects: this.run.ballPerfects,
				zone: shotZone(dist(this.px, this.py, this.hoop().x, this.hoop().y)),
			} : null,
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
			steps: this.mission.steps.map((s) => ({
				id: s.id,
				label: s.label,
				done: s.done,
				description: s.description
			})),
			dropRun: toHud(this.run, this.currentTier().courtTarget, this.currentTier().parSeconds),
			uiPulse: this.uiPulse,
			bestGrade: this.bestGrade,
			bestRunScore: this.bestRunScore,
			buildVersion: GAME_BUILD_VERSION,
			dropLive: this.dropLive,
		};
	}
};
