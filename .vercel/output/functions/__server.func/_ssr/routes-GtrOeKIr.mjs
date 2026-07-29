import { r as __toESM } from "../_runtime.mjs";
import { M as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-GtrOeKIr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var WORLD_PX_W = 2880;
var WORLD_PX_H = 2160;
var APPAREL = [
	{
		id: "starter_tee",
		name: "Starter Green Tee",
		price: 0,
		category: "top",
		color: "#1db954",
		description: "What Benji woke up in. In the sack we trust."
	},
	{
		id: "classic_green",
		name: "Classic $ack Tee",
		price: 40,
		category: "top",
		color: "#16a34a",
		description: "The drop that put the city on notice."
	},
	{
		id: "moneybag_hoodie",
		name: "Moneybag Hoodie",
		price: 90,
		category: "top",
		color: "#15803d",
		description: "Heavyweight fleece. Moneybag logo front and center."
	},
	{
		id: "black_hoodie",
		name: "Midnight Hoodie",
		price: 85,
		category: "top",
		color: "#171717",
		description: "Black on black. Silent flex."
	},
	{
		id: "fresh_jersey",
		name: "FRESH 38127 Jersey",
		price: 120,
		category: "top",
		color: "#0f766e",
		description: "Memphis zip. K Blanco co-sign energy."
	},
	{
		id: "white_cap",
		name: "White Snapback",
		price: 35,
		category: "hat",
		color: "#f5f5f5",
		description: "SackReligious script. Keep it tilted."
	},
	{
		id: "gold_chain",
		name: "Moneybag Chain",
		price: 150,
		category: "chain",
		color: "#d4af37",
		description: "Gold rope + pendant. Respect required."
	},
	{
		id: "green_sweats",
		name: "Green Sweat Set",
		price: 110,
		category: "set",
		color: "#22c55e",
		description: "Full fit. Court to culture spot ready."
	}
];
var POIS = [
	{
		id: "apartment",
		name: "Benji's Apartment",
		x: 192,
		y: 288,
		w: 192,
		h: 192,
		color: "#3f3f46",
		label: "HOME"
	},
	{
		id: "store",
		name: "SackReligious HQ",
		x: 1248,
		y: 384,
		w: 288,
		h: 240,
		color: "#14532d",
		label: "HQ"
	},
	{
		id: "court",
		name: "901 Court",
		x: 480,
		y: 1344,
		w: 384,
		h: 336,
		color: "#7c2d12",
		label: "BALL"
	},
	{
		id: "neighborhood",
		name: "The Neighborhood",
		x: 2016,
		y: 480,
		w: 240,
		h: 192,
		color: "#1e3a5f",
		label: "HOOD"
	},
	{
		id: "downtown",
		name: "Downtown Memphis",
		x: 2112,
		y: 1344,
		w: 240,
		h: 192,
		color: "#312e81",
		label: "DT"
	},
	{
		id: "culture",
		name: "The Culture Spot",
		x: 1056,
		y: 1632,
		w: 240,
		h: 192,
		color: "#4a044e",
		label: "CULTURE"
	},
	{
		id: "dropvan",
		name: "Drop Van",
		x: 1728,
		y: 960,
		w: 144,
		h: 2.5 * 48,
		color: "#292524",
		label: "VAN"
	}
];
function createDropDayMission() {
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
				done: false
			},
			{
				id: "link_k",
				label: "Link up with K Blanco",
				description: "Hit SackReligious HQ and talk to K.",
				target: "store",
				kind: "talk",
				reward: 25,
				done: false
			},
			{
				id: "pickup",
				label: "Pick up the drop",
				description: "Secure the new drop at the van.",
				target: "dropvan",
				kind: "pickup",
				reward: 40,
				done: false
			},
			{
				id: "hood",
				label: "Move product — Neighborhood",
				description: "Connect with the real ones in the hood.",
				target: "neighborhood",
				kind: "deliver",
				reward: 50,
				done: false
			},
			{
				id: "dt",
				label: "Move product — Downtown",
				description: "Downtown vibes. More supporters.",
				target: "downtown",
				kind: "deliver",
				reward: 50,
				done: false
			},
			{
				id: "culture",
				label: "Move product — Culture Spot",
				description: "Last stop. The brand grows.",
				target: "culture",
				kind: "deliver",
				reward: 60,
				done: false
			},
			{
				id: "ball",
				label: "Ball up for respect",
				description: "Hit the 901 Court. Score 8 points.",
				target: "court",
				kind: "basketball",
				reward: 45,
				done: false
			},
			{
				id: "return",
				label: "Return to HQ",
				description: "Mission complete. Report back to K Blanco.",
				target: "store",
				kind: "return",
				reward: 100,
				done: false
			}
		]
	};
}
var NPCS = [
	{
		id: "k_blanco",
		name: "K Blanco",
		x: 28.5 * 48,
		y: 10.5 * 48,
		color: "#f5d0a9",
		dialogue: [
			"Welcome to the family. Glad you made it.",
			"In the sack, we trust. You ready for Drop Day?",
			"Shop the wall, move the product, grow the brand."
		],
		missionTalk: "Benji. Lock in. Grab the drop from the van, hit three spots, then bounce back.",
		isKBlanco: true
	},
	{
		id: "supporter_1",
		name: "Local Supporter",
		x: 2112,
		y: 576,
		color: "#a3a3a3",
		dialogue: ["You Benji? Heard SackReligious got that new drop.", "This city rocking with the brand heavy."]
	},
	{
		id: "downtown_fan",
		name: "901 Fan",
		x: 2208,
		y: 1440,
		color: "#e5e5e5",
		dialogue: ["Fresh fits only. Respect the movement.", "You got that energy, Benji."]
	},
	{
		id: "culture_host",
		name: "Culture Host",
		x: 1152,
		y: 1728,
		color: "#c4b5fd",
		dialogue: ["Culture spot is lit tonight.", "Drop sold through. Brand growing."]
	},
	{
		id: "court_coach",
		name: "Court OG",
		x: 576,
		y: 1440,
		color: "#fdba74",
		dialogue: ["Court's open. Put up points, earn $ackdollars.", "Timing is everything. Let it fly at the peak."]
	},
	{
		id: "street_npc",
		name: "Memphis Local",
		x: 864,
		y: 864,
		color: "#86efac",
		dialogue: ["Man, this city rockin' with the brand heavy.", "Pyramid looks different on Drop Day."]
	}
];
var SAVE_KEY = "sackreligious-memphis-v1";
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${src}`));
		img.src = src;
	});
}
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function dist(ax, ay, bx, by) {
	return Math.hypot(ax - bx, ay - by);
}
function insidePoi(x, y, p, pad = 8) {
	return x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad;
}
var GameEngine = class {
	canvas;
	ctx;
	images = {};
	keys = /* @__PURE__ */ new Set();
	touch = {
		mx: 0,
		my: 0,
		interact: false,
		shoot: false
	};
	started = false;
	paused = false;
	mode = "world";
	toast = null;
	toastT = 0;
	px = 288;
	py = 480;
	vx = 0;
	vy = 0;
	dir = "down";
	facing = "down";
	moving = false;
	animT = 0;
	bob = 0;
	camX = 0;
	camY = 0;
	sackdollars = 25;
	respect = 0;
	owned = ["starter_tee"];
	equipped = "starter_tee";
	mission = createDropDayMission();
	missionComplete = false;
	dialogue = null;
	dialogueNpcId = null;
	dialogueLines = [];
	dialogueIndex = 0;
	ball = {
		active: false,
		score: 0,
		timeLeft: 45,
		shots: 0,
		power: 0,
		charging: false,
		ballX: 0,
		ballY: 0,
		ballVx: 0,
		ballVy: 0,
		inFlight: false,
		made: false,
		flash: 0,
		targetScore: 8,
		missionCredited: false
	};
	walls = [];
	trees = [];
	cars = [];
	shopOpen = false;
	interactHint = null;
	nearPoi = null;
	nearNpc = null;
	lastInteract = 0;
	particles = [];
	running = false;
	raf = 0;
	lastT = 0;
	onHud = null;
	hudAcc = 0;
	mapCanvas = null;
	leftSpawn = false;
	constructor(canvas) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("2d context missing");
		this.ctx = ctx;
		this.buildWorld();
	}
	async init() {
		await Promise.all(Object.entries({
			front: "/game/benji-front-norm.png",
			back: "/game/benji-back-norm.png",
			left: "/game/benji-left-norm.png",
			right: "/game/benji-right-norm.png",
			icon: "/game/sack-icon.png",
			k: "/game/k-blanco-portrait.png",
			featured: "/game/featured-products.png"
		}).map(async ([k, src]) => {
			try {
				this.images[k] = await loadImage(src);
			} catch {}
		}));
		this.loadSave();
		this.paintMap();
		this.bindInput();
		this.emitHud();
	}
	buildWorld() {
		this.walls.push({
			x: 0,
			y: 0,
			w: WORLD_PX_W,
			h: 48 * .6
		}, {
			x: 0,
			y: WORLD_PX_H - 48 * .6,
			w: WORLD_PX_W,
			h: 48 * .6
		}, {
			x: 0,
			y: 0,
			w: 48 * .6,
			h: WORLD_PX_H
		}, {
			x: WORLD_PX_W - 48 * .6,
			y: 0,
			w: 48 * .6,
			h: WORLD_PX_H
		});
		for (let gy = 2; gy < 43; gy += 5) for (let gx = 2; gx < 58; gx += 5) {
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
			if (bx < 672 && by < 768) continue;
			this.walls.push({
				x: bx,
				y: by,
				w: bw,
				h: bh - 18
			});
		}
		for (let i = 0; i < 40; i++) this.trees.push({
			x: (3 + Math.random() * 54) * 48,
			y: (3 + Math.random() * 39) * 48
		});
		const carColors = [
			"#1db954",
			"#111",
			"#e5e5e5",
			"#3b82f6",
			"#ef4444"
		];
		for (let i = 0; i < 18; i++) this.cars.push({
			x: (4 + Math.random() * 52) * 48,
			y: (4 + Math.random() * 37) * 48,
			w: 40 + Math.random() * 20,
			color: carColors[i % carColors.length]
		});
	}
	paintMap() {
		const c = document.createElement("canvas");
		c.width = WORLD_PX_W;
		c.height = WORLD_PX_H;
		const g = c.getContext("2d");
		g.fillStyle = "#2a2e2b";
		g.fillRect(0, 0, c.width, c.height);
		for (let y = 0; y < 45; y++) for (let x = 0; x < 60; x++) {
			const px = x * 48;
			const py = y * 48;
			if (Math.abs(y - 20) <= 1 || y === 5 || Math.abs(x - 15) <= 1 || Math.abs(x - 32) <= 1) {
				g.fillStyle = "#3a3f3c";
				g.fillRect(px, py, 48, 48);
				g.strokeStyle = "rgba(255,255,255,0.12)";
				g.setLineDash([8, 10]);
				g.beginPath();
				if (Math.abs(y - 20) <= 1) {
					g.moveTo(px, py + 48 / 2);
					g.lineTo(px + 48, py + 48 / 2);
				} else {
					g.moveTo(px + 48 / 2, py);
					g.lineTo(px + 48 / 2, py + 48);
				}
				g.stroke();
				g.setLineDash([]);
			} else {
				g.fillStyle = (x + y) % 2 === 0 ? "#4a524c" : "#454d47";
				g.fillRect(px, py, 48, 48);
			}
		}
		g.fillStyle = "#2f4a36";
		for (let i = 0; i < 30; i++) {
			g.beginPath();
			g.ellipse(Math.random() * WORLD_PX_W, Math.random() * WORLD_PX_H, 40 + Math.random() * 60, 30 + Math.random() * 40, 0, 0, Math.PI * 2);
			g.fill();
		}
		for (const w of this.walls) {
			if (w.w >= 2878 || w.h >= 2158) continue;
			const grad = g.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
			grad.addColorStop(0, "#1c2420");
			grad.addColorStop(1, "#141a17");
			g.fillStyle = grad;
			g.fillRect(w.x, w.y, w.w, w.h);
			g.strokeStyle = "#0a0c0b";
			g.lineWidth = 2;
			g.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
			g.fillStyle = "rgba(253, 224, 71, 0.12)";
			for (let wy = w.y + 16; wy < w.y + w.h - 16; wy += 22) for (let wx = w.x + 14; wx < w.x + w.w - 14; wx += 20) g.fillRect(wx, wy, 10, 12);
		}
		for (const p of POIS) if (p.id === "court") {
			g.fillStyle = "#c2410c";
			g.fillRect(p.x, p.y, p.w, p.h);
			g.strokeStyle = "#fff";
			g.lineWidth = 3;
			g.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
			g.strokeRect(p.x + p.w / 2 - 40, p.y + 8, 80, 70);
			g.beginPath();
			g.arc(p.x + p.w / 2, p.y + 78, 40, 0, Math.PI);
			g.stroke();
			g.fillStyle = "#f97316";
			g.fillRect(p.x + p.w / 2 - 22, p.y + 6, 44, 6);
			g.strokeStyle = "#ef4444";
			g.lineWidth = 3;
			g.beginPath();
			g.arc(p.x + p.w / 2, p.y + 22, 12, 0, Math.PI * 2);
			g.stroke();
			g.fillStyle = "rgba(255,255,255,0.25)";
			g.font = "bold 14px sans-serif";
			g.fillText("901 COURT", p.x + 20, p.y + p.h - 16);
		} else if (p.id === "dropvan") {
			g.fillStyle = "#1c1917";
			g.fillRect(p.x, p.y + 10, p.w, p.h - 10);
			g.fillStyle = "#292524";
			g.fillRect(p.x + 8, p.y, p.w - 16, 18);
			g.fillStyle = "#1db954";
			g.font = "bold 12px sans-serif";
			g.fillText("DROP VAN", p.x + 12, p.y + p.h / 2);
		} else {
			g.fillStyle = p.color;
			g.fillRect(p.x, p.y, p.w, p.h);
			g.fillStyle = "rgba(0,0,0,0.25)";
			g.fillRect(p.x, p.y + p.h - 20, p.w, 20);
			g.fillStyle = "#0a0c0b";
			g.fillRect(p.x + p.w / 2 - 14, p.y + p.h - 36, 28, 36);
			g.fillStyle = "#1db954";
			g.font = "bold 13px sans-serif";
			g.fillText(p.label, p.x + 10, p.y + 22);
			if (p.id === "store") {
				g.fillStyle = "#f2f5f3";
				g.font = "bold 16px sans-serif";
				g.fillText("$ACKRELIGIOUS", p.x + 18, p.y + 48);
				g.fillStyle = "#1db954";
				g.font = "11px sans-serif";
				g.fillText("IN THE $ACK, WE TRUST", p.x + 18, p.y + 66);
			}
		}
		const store = POIS.find((p) => p.id === "store");
		g.globalAlpha = .15;
		g.fillStyle = "#1db954";
		g.beginPath();
		g.arc(store.x + store.w / 2, store.y + store.h + 50, 36, 0, Math.PI * 2);
		g.fill();
		g.globalAlpha = 1;
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
		for (const car of this.cars) {
			g.fillStyle = car.color;
			g.fillRect(car.x, car.y, car.w, 22);
			g.fillStyle = "rgba(255,255,255,0.2)";
			g.fillRect(car.x + 6, car.y + 4, car.w * .35, 10);
		}
		const river = g.createLinearGradient(0, WORLD_PX_H - 80, 0, WORLD_PX_H);
		river.addColorStop(0, "rgba(30, 64, 100, 0)");
		river.addColorStop(1, "rgba(30, 64, 100, 0.55)");
		g.fillStyle = river;
		g.fillRect(0, WORLD_PX_H - 90, WORLD_PX_W, 90);
		g.fillStyle = "#0d1210";
		for (let i = 0; i < 20; i++) g.fillRect(80 + i * 140, 40, 50 + i % 3 * 20, 40 + i * 37 % 80);
		g.fillStyle = "#151a18";
		g.beginPath();
		g.moveTo(WORLD_PX_W - 200, 120);
		g.lineTo(WORLD_PX_W - 120, 30);
		g.lineTo(WORLD_PX_W - 40, 120);
		g.closePath();
		g.fill();
		this.mapCanvas = c;
	}
	bindInput() {
		const down = (e) => {
			this.keys.add(e.code);
			if ([
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Space"
			].includes(e.code)) e.preventDefault();
			if (e.code === "KeyE" || e.code === "Enter") this.tryInteract();
			if (e.code === "Space") {
				if (this.mode === "basketball") this.beginCharge();
				else if (this.mode === "world" || this.mode === "dialogue") this.tryInteract();
			}
			if (e.code === "Escape") {
				if (this.mode === "shop") this.closeShop();
				else if (this.mode === "dialogue") this.advanceDialogue();
				else if (this.mode === "basketball") this.exitBasketball();
				else if (this.started) this.paused = !this.paused;
			}
		};
		const up = (e) => {
			this.keys.delete(e.code);
			if (e.code === "Space" && this.mode === "basketball" && this.ball.charging) this.releaseShot();
		};
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		window.addEventListener("blur", () => this.keys.clear());
		this._kd = down;
		this._ku = up;
		if (typeof window !== "undefined") {
			window.__controlsTest = {
				getYaw: () => {
					return {
						up: 0,
						right: Math.PI / 2,
						down: Math.PI,
						left: -Math.PI / 2
					}[this.facing];
				},
				getSpeed: () => Math.hypot(this.vx, this.vy),
				setKeys: (codes) => {
					this.keys.clear();
					for (const c of codes) this.keys.add(c);
				}
			};
			window.__gameTest = {
				teleport: (loc) => {
					if (this.mode === "basketball") this.exitBasketball();
					if (this.mode === "shop") this.closeShop();
					if (this.mode === "dialogue") {
						this.mode = "world";
						this.dialogue = null;
					}
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
					missionComplete: this.missionComplete
				}),
				setBallScore: (n) => {
					this.ball.score = n;
					this.tryCreditBasketball();
					this.emitHud();
				},
				advanceDialogue: () => this.advanceDialogue(),
				interact: () => this.tryInteract(),
				resetSave: () => {
					try {
						localStorage.removeItem(SAVE_KEY);
					} catch {}
					this.mission = createDropDayMission();
					this.missionComplete = false;
					this.sackdollars = 25;
					this.respect = 0;
					this.owned = ["starter_tee"];
					this.equipped = "starter_tee";
					this.px = 288;
					this.py = 480;
					this.leftSpawn = false;
					this.mode = "world";
					this.shopOpen = false;
					this.dialogue = null;
					this.ball.missionCredited = false;
					this.emitHud();
				}
			};
		}
	}
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		const self = this;
		if (self._kd) window.removeEventListener("keydown", self._kd);
		if (self._ku) window.removeEventListener("keyup", self._ku);
	}
	start() {
		this.started = true;
		this.paused = false;
		this.showToast("Drop Day is live. Find K Blanco at HQ.");
		this.emitHud();
	}
	showToast(msg, t = 3.2) {
		this.toast = msg;
		this.toastT = t;
	}
	loadSave() {
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (data.version !== 1) return;
			this.sackdollars = data.sackdollars;
			this.respect = data.respect;
			this.owned = data.owned?.length ? data.owned : ["starter_tee"];
			this.equipped = data.equipped;
			this.mission.complete = data.missionComplete ?? false;
			this.missionComplete = this.mission.complete;
			for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
			const firstUndone = this.mission.steps.findIndex((s) => !s.done);
			this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
		} catch {}
	}
	save() {
		const progress = {};
		for (const s of this.mission.steps) progress[s.id] = s.done;
		const data = {
			version: 1,
			sackdollars: this.sackdollars,
			respect: this.respect,
			owned: this.owned,
			equipped: this.equipped,
			missionProgress: progress,
			missionActiveStep: this.mission.activeStep,
			missionComplete: this.mission.complete,
			basketballHighScore: this.ball.score,
			tutorialDone: true
		};
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
		} catch {}
	}
	startLoop() {
		this.running = true;
		this.lastT = performance.now();
		const frame = (t) => {
			if (!this.running) return;
			let dt = (t - this.lastT) / 1e3;
			this.lastT = t;
			dt = Math.min(dt, .1);
			this.update(dt);
			this.draw();
			this.hudAcc += dt;
			if (this.hudAcc > .1) {
				this.hudAcc = 0;
				this.emitHud();
			}
			this.raf = requestAnimationFrame(frame);
		};
		this.raf = requestAnimationFrame(frame);
	}
	update(dt) {
		if (!this.started || this.paused) return;
		if (this.toastT > 0) {
			this.toastT -= dt;
			if (this.toastT <= 0) this.toast = null;
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			if (p.life <= 0) this.particles.splice(i, 1);
		}
		if (this.mode === "dialogue" || this.mode === "shop" || this.mode === "menu") return;
		if (this.mode === "basketball") {
			this.updateBasketball(dt);
			return;
		}
		this.updatePlayer(dt);
		this.updateProximity();
		this.checkMissionAuto();
	}
	updatePlayer(dt) {
		let mx = 0;
		let my = 0;
		if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my -= 1;
		if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my += 1;
		if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
		if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
		mx += this.touch.mx;
		my += this.touch.my;
		const len = Math.hypot(mx, my);
		if (len > .01) {
			mx /= len;
			my /= len;
			this.moving = true;
			this.leftSpawn = true;
			if (Math.abs(mx) > Math.abs(my)) this.facing = mx < 0 ? "left" : "right";
			else this.facing = my < 0 ? "up" : "down";
			this.dir = this.facing;
		} else this.moving = false;
		const speed = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 250 : 165;
		this.vx = mx * speed;
		this.vy = my * speed;
		const r = 14;
		let nx = this.px + this.vx * dt;
		let ny = this.py + this.vy * dt;
		nx = clamp(nx, 62, WORLD_PX_W - 48 - r);
		ny = clamp(ny, 62, WORLD_PX_H - 48 - r);
		if (!this.collides(nx, this.py, r)) this.px = nx;
		if (!this.collides(this.px, ny, r)) this.py = ny;
		this.animT += dt * (this.moving ? 8 : 2);
		this.bob = this.moving ? Math.sin(this.animT * 2) * 3 : 0;
		const tw = this.canvas.clientWidth;
		const th = this.canvas.clientHeight;
		this.camX += (this.px - tw / 2 - this.camX) * Math.min(1, 6 * dt);
		this.camY += (this.py - th / 2 - this.camY) * Math.min(1, 6 * dt);
		this.camX = clamp(this.camX, 0, Math.max(0, WORLD_PX_W - tw));
		this.camY = clamp(this.camY, 0, Math.max(0, WORLD_PX_H - th));
	}
	collides(x, y, r) {
		for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
		return false;
	}
	updateProximity() {
		this.nearPoi = null;
		this.nearNpc = null;
		this.interactHint = null;
		let bestPoi = 9999;
		for (const p of POIS) {
			const d = dist(this.px, this.py, p.x + p.w / 2, p.y + p.h / 2);
			if (d < Math.max(p.w, p.h) * .55 + 40 && d < bestPoi) {
				bestPoi = d;
				this.nearPoi = p.id;
			}
		}
		let best = 90;
		for (const n of NPCS) {
			const d = dist(this.px, this.py, n.x, n.y);
			if (d < best) {
				best = d;
				this.nearNpc = n.id;
			}
		}
		if (this.nearNpc) this.interactHint = `Talk to ${NPCS.find((x) => x.id === this.nearNpc).name}`;
		else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
		else if (this.nearPoi === "court") this.interactHint = "Play basketball";
		else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
		else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi).name}`;
	}
	tryInteract() {
		if (!this.started || this.paused) return;
		if (this.mode === "dialogue") {
			this.advanceDialogue();
			return;
		}
		const now = performance.now();
		if (now - this.lastInteract < 220) return;
		this.lastInteract = now;
		if (this.mode === "shop") return;
		if (this.mode === "basketball") {
			if (!this.ball.inFlight) this.beginCharge();
			return;
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
	openDialogue(npcId) {
		const n = NPCS.find((x) => x.id === npcId);
		if (!n) return;
		this.dialogueNpcId = npcId;
		this.dialogueIndex = 0;
		const step = this.mission.steps[this.mission.activeStep];
		if (n.isKBlanco && step && step.kind === "talk" && !step.done) this.dialogueLines = [n.missionTalk ?? "Lock in for Drop Day.", "Grab the drop from the van, hit three spots, then bounce back."];
		else if (n.isKBlanco && step && step.kind === "return" && !step.done) this.dialogueLines = ["You did it, Benji. Drop Day secured. Respect unlocked.", "Shop the wall anytime. In the sack, we trust."];
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
	tryMissionAction(loc) {
		const step = this.mission.steps[this.mission.activeStep];
		if (!step || step.done) {
			if (loc === "dropvan") this.showToast("Van's locked. Keep moving the brand.");
			return;
		}
		if (step.target && step.target !== loc) {
			this.showToast(`Objective: ${step.label}`);
			return;
		}
		if (step.kind === "pickup" && loc === "dropvan") {
			this.completeStep(step.id);
			this.burst(this.px, this.py, "#1db954");
			this.showToast("Drop secured. Hit the Neighborhood.");
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
			if (!insidePoi(this.px, this.py, apt, 50)) {
				this.completeStep("wake");
				this.showToast("Memphis is open. Head to SackReligious HQ.");
			}
		}
	}
	completeStep(id) {
		const step = this.mission.steps.find((s) => s.id === id);
		if (!step || step.done) return;
		step.done = true;
		this.sackdollars += step.reward;
		this.respect += Math.ceil(step.reward / 10);
		this.burst(this.px, this.py - 20, "#1db954");
		this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
		const next = this.mission.steps.findIndex((s) => !s.done);
		if (next === -1) {
			this.mission.complete = true;
			this.missionComplete = true;
			this.mission.activeStep = this.mission.steps.length;
			this.respect += 25;
			this.showToast("MISSION COMPLETE · Respect Power unlocked");
		} else this.mission.activeStep = next;
		this.save();
		this.emitHud();
	}
	openShop() {
		this.shopOpen = true;
		this.mode = "shop";
		this.emitHud();
	}
	closeShop() {
		this.shopOpen = false;
		this.mode = "world";
		this.emitHud();
	}
	buyItem(id) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
		if (this.owned.includes(id)) {
			this.equipped = id;
			this.showToast(`Equipped ${item.name}`);
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
		this.burst(this.px, this.py, item.color);
		this.save();
		this.emitHud();
	}
	enterBasketball() {
		this.mode = "basketball";
		this.ball.active = true;
		this.ball.score = 0;
		this.ball.timeLeft = 45;
		this.ball.shots = 0;
		this.ball.inFlight = false;
		this.ball.charging = false;
		this.ball.power = 0;
		this.ball.flash = 0;
		this.ball.missionCredited = false;
		this.showToast("Ball up! Hold Space / Shoot, release in the green zone.");
		this.emitHud();
	}
	tryCreditBasketball() {
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.kind === "basketball" && this.ball.score >= this.ball.targetScore && !step.done && !this.ball.missionCredited) {
			this.ball.missionCredited = true;
			this.completeStep(step.id);
			this.showToast("Respect earned. Return to HQ when ready.");
		}
	}
	exitBasketball() {
		this.tryCreditBasketball();
		const pay = this.ball.score * 5;
		if (pay > 0) {
			this.sackdollars += pay;
			this.showToast(`Court payout: +$${pay} $ackdollars`);
		}
		this.mode = "world";
		this.ball.active = false;
		this.ball.charging = false;
		this.ball.inFlight = false;
		const court = POIS.find((p) => p.id === "court");
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h + 30;
		this.save();
		this.emitHud();
	}
	updateBasketball(dt) {
		this.ball.timeLeft -= dt;
		if (this.ball.flash > 0) this.ball.flash -= dt;
		if (this.ball.timeLeft <= 0) {
			this.ball.timeLeft = 0;
			this.exitBasketball();
			return;
		}
		if (this.ball.charging && !this.ball.inFlight) this.ball.power = Math.min(1, this.ball.power + dt * .85);
		if (this.ball.inFlight) {
			this.ball.ballX += this.ball.ballVx * dt;
			this.ball.ballY += this.ball.ballVy * dt;
			this.ball.ballVy += 520 * dt;
			const court = POIS.find((p) => p.id === "court");
			const hoopX = court.x + court.w / 2;
			const hoopY = court.y + 22;
			if (dist(this.ball.ballX, this.ball.ballY, hoopX, hoopY) < 24 && this.ball.ballVy > 0) {
				if (this.ball.made) {
					this.ball.score += 2;
					this.ball.flash = .4;
					this.burst(hoopX, hoopY, "#1db954");
					this.showToast("SWISH +2");
					this.tryCreditBasketball();
				} else {
					this.burst(hoopX, hoopY, "#e85d4c");
					this.showToast("Rim...");
				}
				this.ball.inFlight = false;
				this.ball.charging = false;
				this.ball.power = 0;
			}
			if (this.ball.ballY > court.y + court.h - 20 || this.ball.ballX < court.x || this.ball.ballX > court.x + court.w) {
				this.ball.inFlight = false;
				this.ball.charging = false;
				this.ball.power = 0;
			}
		}
		const court = POIS.find((p) => p.id === "court");
		const tw = this.canvas.clientWidth;
		const th = this.canvas.clientHeight;
		this.camX += (court.x + court.w / 2 - tw / 2 - this.camX) * Math.min(1, 4 * dt);
		this.camY += (court.y + court.h / 2 - th / 2 - this.camY) * Math.min(1, 4 * dt);
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h - 50;
		this.facing = "up";
	}
	releaseShot() {
		if (this.mode !== "basketball" || this.ball.inFlight) return;
		if (!this.ball.charging && this.ball.power <= 0) return;
		this.ball.charging = false;
		this.ball.shots++;
		const court = POIS.find((p) => p.id === "court");
		const hoopX = court.x + court.w / 2;
		const hoopY = court.y + 22;
		const pwr = this.ball.power;
		this.ball.made = pwr >= .52 && pwr <= .85;
		this.ball.ballX = this.px;
		this.ball.ballY = this.py - 30;
		const dx = hoopX - this.ball.ballX;
		const dy = hoopY - this.ball.ballY;
		const speed = 280 + pwr * 220;
		const ang = Math.atan2(dy, dx) - .35;
		this.ball.ballVx = Math.cos(ang) * speed * (.7 + pwr * .5);
		this.ball.ballVy = Math.sin(ang) * speed - 180 - pwr * 80;
		if (!this.ball.made) this.ball.ballVx += (Math.random() - .5) * 120;
		this.ball.inFlight = true;
		this.ball.power = 0;
	}
	beginCharge() {
		if (this.mode === "basketball" && !this.ball.inFlight) {
			this.ball.charging = true;
			this.ball.power = 0;
		}
	}
	burst(x, y, color) {
		for (let i = 0; i < 14; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = 40 + Math.random() * 120;
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				life: .4 + Math.random() * .5,
				color,
				size: 2 + Math.random() * 4
			});
		}
	}
	getObjectiveTarget() {
		const step = this.mission.steps[this.mission.activeStep];
		if (!step?.target || this.mission.complete) return null;
		if (step.kind === "talk" || step.kind === "return") {
			const k = NPCS.find((n) => n.isKBlanco);
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
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
			this.canvas.width = Math.floor(w * dpr);
			this.canvas.height = Math.floor(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		const sky = ctx.createLinearGradient(0, 0, 0, h);
		sky.addColorStop(0, "#1a2a22");
		sky.addColorStop(1, "#0a0c0b");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		ctx.save();
		ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));
		if (this.mapCanvas) ctx.drawImage(this.mapCanvas, 0, 0);
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.target && !this.mission.complete) {
			const p = POIS.find((x) => x.id === step.target);
			if (p) {
				ctx.strokeStyle = "rgba(29,185,84,0.7)";
				ctx.lineWidth = 3;
				ctx.setLineDash([8, 6]);
				ctx.strokeRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
				ctx.setLineDash([]);
				const t = performance.now() / 400;
				ctx.fillStyle = `rgba(29,185,84,${.35 + Math.sin(t) * .2})`;
				ctx.beginPath();
				ctx.arc(p.x + p.w / 2, p.y - 18, 8, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		for (const n of NPCS) this.drawNpc(ctx, n);
		this.drawPlayer(ctx);
		if (this.mode === "basketball" && this.ball.inFlight) {
			ctx.fillStyle = "#f97316";
			ctx.beginPath();
			ctx.arc(this.ball.ballX, this.ball.ballY, 10, 0, Math.PI * 2);
			ctx.fill();
		}
		for (const p of this.particles) {
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		ctx.restore();
		if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) {
			const mw = 160;
			const mh = 14;
			const mx = w / 2 - mw / 2;
			const my = h - 120;
			ctx.fillStyle = "rgba(0,0,0,0.55)";
			ctx.fillRect(mx - 4, my - 4, 168, 22);
			ctx.fillStyle = "#27272a";
			ctx.fillRect(mx, my, mw, mh);
			ctx.fillStyle = "rgba(29,185,84,0.35)";
			ctx.fillRect(mx + mw * .52, my, mw * .33, mh);
			ctx.fillStyle = "#1db954";
			ctx.fillRect(mx, my, mw * this.ball.power, mh);
		}
		if (this.ball.flash > 0) {
			ctx.fillStyle = `rgba(29,185,84,${this.ball.flash * .35})`;
			ctx.fillRect(0, 0, w, h);
		}
		if (this.started && this.mode === "world") {
			this.drawCompass(ctx, w, h);
			this.drawMinimap(ctx, w, h);
		}
	}
	drawCompass(ctx, w, h) {
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
		let ax = cx + cos * 1e3;
		let ay = cy + sin * 1e3;
		const tX = cos > 0 ? (w - edgePad - cx) / cos : cos < 0 ? (edgePad - cx) / cos : Infinity;
		const tY = sin > 0 ? (h - edgePad - cy) / sin : sin < 0 ? (edgePad - cy) / sin : Infinity;
		const t = Math.min(Math.abs(tX), Math.abs(tY));
		ax = cx + cos * t;
		ay = cy + sin * t;
		ax = clamp(ax, edgePad, w - edgePad);
		ay = clamp(ay, 96, h - edgePad - 80);
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
		ctx.strokeStyle = "rgba(4,18,8,0.5)";
		ctx.lineWidth = 1.5;
		ctx.stroke();
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
	drawMinimap(ctx, w, h) {
		const size = Math.min(128, Math.max(96, w * .14));
		const pad = 12;
		const mx = pad;
		const my = h - size - pad - (w < 640 ? 100 : 8);
		const scaleX = size / WORLD_PX_W;
		const scaleY = size / WORLD_PX_H;
		ctx.fillStyle = "rgba(10,12,11,0.82)";
		ctx.beginPath();
		ctx.roundRect(mx - 3, my - 3, size + 6, size + 6, 12);
		ctx.fill();
		ctx.strokeStyle = "rgba(29,185,84,0.45)";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(mx, my, size, size, 10);
		ctx.clip();
		ctx.fillStyle = "#1a211c";
		ctx.fillRect(mx, my, size, size);
		ctx.fillStyle = "#2a332c";
		ctx.fillRect(mx, my + 960 * scaleY - 2, size, 4);
		ctx.fillRect(mx + 720 * scaleX - 2, my, 4, size);
		ctx.fillRect(mx + 1536 * scaleX - 2, my, 4, size);
		for (const p of POIS) {
			const isTarget = this.mission.steps[this.mission.activeStep]?.target === p.id;
			ctx.fillStyle = isTarget ? "#1db954" : p.color;
			const px = mx + p.x * scaleX;
			const py = my + p.y * scaleY;
			const pw = Math.max(4, p.w * scaleX);
			const ph = Math.max(4, p.h * scaleY);
			ctx.fillRect(px, py, pw, ph);
			if (isTarget) {
				ctx.strokeStyle = `rgba(29,185,84,${.4 + Math.sin(performance.now() / 250) * .3})`;
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
		ctx.fillText("MEMPHIS", 20, my + 14);
	}
	drawNpc(ctx, n) {
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.ellipse(n.x, n.y + 4, 14, 6, 0, 0, Math.PI * 2);
		ctx.fill();
		if (n.isKBlanco && this.images.k) {
			const img = this.images.k;
			const ih = 72;
			const iw = img.width / img.height * ih;
			ctx.drawImage(img, n.x - iw / 2, n.y - ih + 4, iw, ih);
		} else {
			ctx.fillStyle = n.color;
			ctx.fillRect(n.x - 12, n.y - 40, 24, 36);
			ctx.fillStyle = "#1c1917";
			ctx.beginPath();
			ctx.arc(n.x, n.y - 48, 12, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "rgba(10,12,11,0.75)";
		ctx.font = "600 11px DM Sans, sans-serif";
		const tw = ctx.measureText(n.name).width;
		ctx.fillRect(n.x - tw / 2 - 6, n.y - 78, tw + 12, 16);
		ctx.fillStyle = n.isKBlanco ? "#1db954" : "#f2f5f3";
		ctx.fillText(n.name, n.x - tw / 2, n.y - 66);
		if (this.nearNpc === n.id) {
			ctx.strokeStyle = "#1db954";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(n.x, n.y + 4, 18, 8, 0, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	drawPlayer(ctx) {
		const y = this.py + this.bob;
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.beginPath();
		ctx.ellipse(this.px, this.py + 6, 16, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		const key = this.facing === "up" ? "back" : this.facing === "down" ? "front" : this.facing === "left" ? "left" : "right";
		const img = this.images[key];
		if (img) {
			const h = 78;
			const w = img.width / img.height * h;
			const sx = this.moving ? 1 + Math.sin(this.animT) * .04 : 1;
			const sy = this.moving ? 1 - Math.sin(this.animT) * .04 : 1;
			ctx.save();
			ctx.translate(this.px, y);
			ctx.scale(sx, sy);
			ctx.drawImage(img, -w / 2, -74, w, h);
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
				ctx.arc(this.px + 18, y - 60, 5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
	getLocationName() {
		if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.name ?? "Memphis";
		if (this.py > 2040) return "Riverfront";
		if (this.px > 2880 * .65) return "East Memphis";
		if (this.px < 2880 * .35) return "West Side";
		return "Memphis Streets";
	}
	emitHud() {
		this.onHud?.(this.getHud());
	}
	getHud() {
		const step = this.mission.steps[this.mission.activeStep];
		const done = this.mission.steps.filter((s) => s.done).length;
		return {
			mode: this.mode,
			sackdollars: this.sackdollars,
			respect: this.respect,
			missionTitle: this.mission.title,
			missionStep: this.mission.complete ? "All objectives complete" : step ? step.label : "—",
			missionProgress: `${done}/${this.mission.steps.length}`,
			interactHint: this.mode === "world" ? this.interactHint : this.mode === "dialogue" ? "Tap / E to continue" : this.mode === "basketball" ? "Hold Shoot · release in green" : null,
			locationName: this.getLocationName(),
			dialogue: this.dialogue,
			shopOpen: this.shopOpen,
			toast: this.toast,
			equipped: this.equipped,
			owned: [...this.owned],
			basketball: this.mode === "basketball" ? {
				score: this.ball.score,
				timeLeft: Math.ceil(this.ball.timeLeft),
				shots: this.ball.shots,
				active: true
			} : null,
			paused: this.paused,
			started: this.started,
			missionComplete: this.missionComplete
		};
	}
};
var emptyHud = {
	mode: "menu",
	sackdollars: 0,
	respect: 0,
	missionTitle: "",
	missionStep: "",
	missionProgress: "0/0",
	interactHint: null,
	locationName: "Memphis",
	dialogue: null,
	shopOpen: false,
	toast: null,
	equipped: null,
	owned: [],
	basketball: null,
	paused: false,
	started: false,
	missionComplete: false
};
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(emptyHud);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [bootError, setBootError] = (0, import_react.useState)(null);
	const stickRef = (0, import_react.useRef)({
		id: null,
		ox: 0,
		oy: 0
	});
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let eng;
		let cancelled = false;
		(async () => {
			try {
				eng = new GameEngine(canvas);
				engineRef.current = eng;
				eng.onHud = (h) => setHud({ ...h });
				await eng.init();
				if (cancelled) {
					eng.destroy();
					return;
				}
				eng.startLoop();
				setReady(true);
				setHud(eng.getHud());
			} catch (e) {
				setBootError(e instanceof Error ? e.message : "Failed to start");
			}
		})();
		return () => {
			cancelled = true;
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, []);
	const onStart = (0, import_react.useCallback)(() => {
		engineRef.current?.start();
		setHud((h) => ({
			...h,
			started: true
		}));
	}, []);
	const onBuy = (0, import_react.useCallback)((id) => {
		engineRef.current?.buyItem(id);
	}, []);
	const closeShop = (0, import_react.useCallback)(() => {
		engineRef.current?.closeShop();
	}, []);
	const advanceDialogue = (0, import_react.useCallback)(() => {
		engineRef.current?.advanceDialogue();
	}, []);
	const onStickStart = (e) => {
		const t = e.changedTouches[0];
		if (!t) return;
		const rect = e.currentTarget.getBoundingClientRect();
		stickRef.current = {
			id: t.identifier,
			ox: rect.left + rect.width / 2,
			oy: rect.top + rect.height / 2
		};
		e.preventDefault();
	};
	const onStickMove = (e) => {
		const eng = engineRef.current;
		if (!eng) return;
		for (const t of Array.from(e.changedTouches)) {
			if (t.identifier !== stickRef.current.id) continue;
			const dx = t.clientX - stickRef.current.ox;
			const dy = t.clientY - stickRef.current.oy;
			const max = 48;
			const len = Math.hypot(dx, dy) || 1;
			const s = Math.min(1, len / max);
			eng.touch.mx = dx / len * s;
			eng.touch.my = dy / len * s;
		}
		e.preventDefault();
	};
	const onStickEnd = (e) => {
		const eng = engineRef.current;
		if (!eng) return;
		for (const t of Array.from(e.changedTouches)) if (t.identifier === stickRef.current.id) {
			eng.touch.mx = 0;
			eng.touch.my = 0;
			stickRef.current.id = null;
		}
	};
	const onInteractTouch = () => {
		engineRef.current?.tryInteract();
	};
	const onShootStart = () => {
		const eng = engineRef.current;
		if (!eng) return;
		eng.touch.shoot = true;
		eng.beginCharge();
	};
	const onShootEnd = () => {
		const eng = engineRef.current;
		if (!eng) return;
		eng.touch.shoot = false;
		eng.releaseShot();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				style: { imageRendering: "auto" }
			}),
			!hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg/95 px-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-0 opacity-30 pointer-events-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/game/store-welcome.jpg",
						alt: "",
						className: "h-full w-full object-cover",
						crossOrigin: "anonymous"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/40" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10 flex max-w-md flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/game/benji-front-norm.png",
							alt: "Benji",
							className: "mb-4 h-40 w-auto drop-shadow-2xl",
							crossOrigin: "anonymous"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-primary text-xl tracking-[0.2em]",
							children: "SACKRELIGIOUS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display mt-1 text-5xl leading-none text-fg sm:text-6xl",
							children: "MEMPHIS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-display text-3xl text-muted",
							children: "OPEN WORLD"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-sm text-sm leading-relaxed text-muted",
							children: "Play as Benji. Run Drop Day missions across Memphis, ball up at the 901 Court, earn $ackdollars, and re-up the fit at HQ."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onStart,
							disabled: !ready,
							className: "mt-8 min-h-12 rounded-xl bg-primary px-10 py-3 font-display text-2xl tracking-wide text-primary-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50",
							children: ready ? "ENTER MEMPHIS" : "LOADING…"
						}),
						bootError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-danger",
							children: bootError
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-8 grid w-full max-w-sm grid-cols-2 gap-2 text-left text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-surface/80 p-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium text-fg",
										children: "Move"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1",
										children: "WASD / stick"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-surface/80 p-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium text-fg",
										children: "Interact"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1",
										children: "E / Space / button"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-surface/80 p-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium text-fg",
										children: "Run"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1",
										children: "Hold Shift"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border bg-surface/80 p-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium text-fg",
										children: "Shop"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1",
										children: "E at HQ"
									})]
								})
							]
						})
					]
				})]
			}),
			hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/sack-icon.png",
								alt: "",
								className: "h-7 w-7"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "$ackdollars"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "tabular font-display text-2xl leading-none text-primary",
								children: ["$", hud.sackdollars]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "Respect"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "tabular font-display text-xl leading-none text-fg",
								children: hud.respect
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-[14rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-primary",
								children: hud.missionTitle
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-sm font-medium leading-snug text-fg",
								children: hud.missionStep
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted tabular",
								children: hud.missionProgress
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-3 top-[9.5rem] z-20 sm:top-[10.5rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted backdrop-blur-sm",
						children: hud.locationName
					})
				}),
				hud.interactHint && hud.mode === "world" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-full border border-primary/40 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary font-display text-sm text-primary-fg",
							children: "E"
						}), hud.interactHint]
					})
				}),
				hud.toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl",
						children: hud.toast
					})
				}),
				hud.basketball && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute right-3 top-28 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg text-primary",
							children: "901 COURT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "tabular text-2xl font-semibold text-fg",
							children: [hud.basketball.score, " pts"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								hud.basketball.timeLeft,
								"s · ",
								hud.basketball.shots,
								" shots · need 8"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pointer-events-auto mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted",
							onClick: () => engineRef.current?.exitBasketball(),
							children: "Leave court"
						})
					]
				}),
				hud.dialogue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
					role: "dialog",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: advanceDialogue,
						className: "w-full max-w-xl rounded-2xl border border-border bg-panel p-4 text-left shadow-2xl backdrop-blur-md",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [hud.dialogue.speaker === "K Blanco" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/k-blanco-portrait.png",
								alt: "",
								className: "h-14 w-14 shrink-0 rounded-xl object-cover object-top",
								crossOrigin: "anonymous"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-semibold uppercase tracking-wider text-primary",
										children: hud.dialogue.speaker
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-base leading-relaxed text-fg",
										children: hud.dialogue.text
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-xs text-muted",
										children: "Tap to continue"
									})
								]
							})]
						})
					})
				}),
				hud.shopOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 z-40 flex items-end justify-center bg-bg/70 p-3 backdrop-blur-sm sm:items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative h-28 shrink-0 overflow-hidden sm:h-36",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: "/game/featured-products.png",
										alt: "",
										className: "h-full w-full object-cover object-center",
										crossOrigin: "anonymous"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "absolute bottom-3 left-4 right-4 flex items-end justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-2xl text-primary",
											children: "HQ SHOP"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted",
											children: "In the $ack, we trust"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "tabular font-display text-2xl text-fg",
											children: ["$", hud.sackdollars]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-1 overflow-y-auto p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-2",
									children: APPAREL.map((item) => {
										const owned = hud.owned.includes(item.id);
										const eq = hud.equipped === item.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
													style: { backgroundColor: item.color },
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-display text-lg text-white/90",
														children: item.category === "hat" ? "CAP" : item.category === "chain" ? "$" : "SR"
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0 flex-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "truncate font-medium text-fg",
														children: item.name
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "truncate text-xs text-muted",
														children: item.description
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => onBuy(item.id),
													className: `min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${eq ? "bg-primary/20 text-primary" : owned ? "border border-border bg-surface text-fg" : "bg-primary text-primary-fg"}`,
													children: eq ? "On" : owned ? "Equip" : `$${item.price}`
												})
											]
										}, item.id);
									})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "border-t border-border p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: closeShop,
									className: "min-h-11 w-full rounded-xl border border-border bg-surface-2 font-medium text-fg",
									children: "Back to streets"
								})
							})
						]
					})
				}),
				hud.missionComplete && hud.mode === "world" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-1/3 z-20 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-primary/40 bg-panel px-6 py-4 text-center shadow-2xl backdrop-blur-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl text-primary",
							children: "DROP DAY COMPLETE"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Keep ballin' · keep building the brand"
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-x-0 bottom-0 z-25 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-28 w-28 touch-none rounded-full border border-border bg-panel/80 backdrop-blur-sm",
						onTouchStart: onStickStart,
						onTouchMove: onStickMove,
						onTouchEnd: onStickEnd,
						onTouchCancel: onStickEnd,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted",
							children: "MOVE"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-col gap-2",
						children: hud.mode === "basketball" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-fg shadow-lg active:scale-95",
							onTouchStart: (e) => {
								e.preventDefault();
								onShootStart();
							},
							onTouchEnd: (e) => {
								e.preventDefault();
								onShootEnd();
							},
							onMouseDown: onShootStart,
							onMouseUp: onShootEnd,
							onMouseLeave: onShootEnd,
							children: "SHOOT"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-fg shadow-lg active:scale-95",
							onClick: onInteractTouch,
							children: "E"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block",
					children: "WASD move · E interact · Shift run · Esc pause"
				}),
				hud.paused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border bg-surface p-8 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl text-fg",
								children: "PAUSED"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Press Esc to resume"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mt-6 min-h-11 rounded-xl bg-primary px-8 font-display text-xl text-primary-fg",
								onClick: () => {
									if (engineRef.current) engineRef.current.paused = false;
									setHud((h) => ({
										...h,
										paused: false
									}));
								},
								children: "RESUME"
							})
						]
					})
				})
			] })
		]
	});
}
var SplitComponent = GameApp;
//#endregion
export { SplitComponent as component };
