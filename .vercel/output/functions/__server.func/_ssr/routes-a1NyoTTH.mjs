import { r as __toESM } from "../_runtime.mjs";
import { M as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Settings, i as Shirt, n as Trophy, o as Play, r as Target, s as Map, t as Volume2 } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-a1NyoTTH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Warm Memphis dusk — brand green/gold are accents only. */
var PAL = {
	asphalt: "#22201e",
	asphaltAlt: "#262320",
	lot: "#2a2623",
	lane: "rgba(184,166,120,0.22)",
	sidewalk: "#35302a",
	sidewalkAlt: "#3b352e",
	curb: "#4a4239",
	wall: "#2b2724",
	wallAlt: "#322c28",
	wallCool: "#26282c",
	roof: "#3d3630",
	roofEdge: "#6b5c4a",
	windowDark: "#1a1715",
	windowLit: "#f2c66a",
	grass: "#4a5c3a",
	grassTip: "#6d8250",
	shadow: "rgba(74,95,107,0.28)",
	shade: "#4a5f6b",
	label: "#c4b8a8",
	ink: "#0d0b0a",
	skyTop: "#3a2e24",
	skyBot: "#1a1612",
	river0: "#2a3840",
	river1: "#1a242c",
	accent: "#1db954",
	gold: "#d4af37"
};
var WORLD_PX_W = 3072;
var WORLD_PX_H = 2304;
var DEFAULT_SETTINGS = {
	master: .85,
	music: .42,
	sfx: .7,
	shake: true,
	rumble: true
};
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
		x: 240,
		y: 336,
		w: 192,
		h: 192,
		color: "#3f3f46",
		label: "HOME",
		district: "West Side"
	},
	{
		id: "store",
		name: "SackReligious HQ",
		x: 1344,
		y: 384,
		w: 288,
		h: 240,
		color: "#2b2724",
		label: "HQ",
		district: "Midtown"
	},
	{
		id: "court",
		name: "901 Court",
		x: 528,
		y: 1392,
		w: 384,
		h: 336,
		color: "#7c2d12",
		label: "BALL",
		district: "South Memphis"
	},
	{
		id: "neighborhood",
		name: "The Neighborhood",
		x: 2208,
		y: 480,
		w: 240,
		h: 192,
		color: "#1e3a5f",
		label: "HOOD",
		district: "East Memphis"
	},
	{
		id: "downtown",
		name: "Downtown Memphis",
		x: 2304,
		y: 1440,
		w: 240,
		h: 192,
		color: "#1f2937",
		label: "DT",
		district: "Downtown"
	},
	{
		id: "culture",
		name: "The Culture Spot",
		x: 1152,
		y: 1728,
		w: 240,
		h: 192,
		color: "#322c28",
		label: "CULTURE",
		district: "South Main"
	},
	{
		id: "dropvan",
		name: "Drop Van",
		x: 1824,
		y: 1008,
		w: 144,
		h: 2.5 * 48,
		color: "#292524",
		label: "VAN",
		district: "Union Ave"
	},
	{
		id: "beale",
		name: "Beale Street",
		x: 864,
		y: 912,
		w: 384,
		h: 144,
		color: "#3d3630",
		label: "BEALE",
		district: "Beale"
	},
	{
		id: "pyramid",
		name: "The Pyramid",
		x: 2592,
		y: 192,
		w: 288,
		h: 288,
		color: "#1c1917",
		label: "PYRAMID",
		district: "Harbor"
	},
	{
		id: "river",
		name: "Mississippi River",
		x: 48,
		y: 2016,
		w: 672,
		h: 192,
		color: "#1e3a5f",
		label: "RIVER",
		district: "Riverfront"
	}
];
var STREETS = [
	{
		name: "BEALE ST",
		axis: "y",
		tile: 20
	},
	{
		name: "UNION AVE",
		axis: "y",
		tile: 6
	},
	{
		name: "POPLAR AVE",
		axis: "y",
		tile: 34
	},
	{
		name: "3RD ST",
		axis: "x",
		tile: 16
	},
	{
		name: "FRONT ST",
		axis: "x",
		tile: 34
	},
	{
		name: "HIGHLAND",
		axis: "x",
		tile: 50
	}
];
function createDropDayMission() {
	return {
		id: "drop_day",
		title: "The Drop Day",
		chapter: "CHAPTER 01",
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
function createSideMissions() {
	return [
		{
			id: "pickup_kings",
			title: "Pickup Kings",
			description: "Score 16 in a single run at 901 Court.",
			reward: 80,
			done: false,
			kind: "score",
			target: "court",
			need: 16
		},
		{
			id: "full_fit",
			title: "Full Fit",
			description: "Own four pieces from the HQ wall.",
			reward: 60,
			done: false,
			kind: "own",
			need: 4
		},
		{
			id: "city_tour",
			title: "City Tour",
			description: "Talk to every local on the map.",
			reward: 70,
			done: false,
			kind: "talk",
			need: 6
		},
		{
			id: "sunset_river",
			title: "Sunset at the River",
			description: "Walk the Mississippi riverfront.",
			reward: 35,
			done: false,
			kind: "visit",
			target: "river"
		},
		{
			id: "pyramid_pic",
			title: "Pyramid Flex",
			description: "Stand at the Pyramid and take it in.",
			reward: 40,
			done: false,
			kind: "visit",
			target: "pyramid"
		},
		{
			id: "beale_night",
			title: "Beale After Dark",
			description: "Hit Beale Street once the lights come on.",
			reward: 45,
			done: false,
			kind: "visit",
			target: "beale"
		}
	];
}
var TROPHIES = [
	{
		id: "first_steps",
		name: "First Steps",
		description: "Leave the apartment on Drop Day.",
		rank: "bronze"
	},
	{
		id: "family",
		name: "Welcome to the Family",
		description: "Link with K Blanco at HQ.",
		rank: "bronze"
	},
	{
		id: "baller",
		name: "Baller",
		description: "Score 8 at the 901 Court.",
		rank: "silver"
	},
	{
		id: "drop_day",
		name: "Drop Day",
		description: "Finish the main mission.",
		rank: "gold"
	},
	{
		id: "fresh_fit",
		name: "Fresh Fit",
		description: "Buy your first apparel drop.",
		rank: "bronze"
	},
	{
		id: "deep_pockets",
		name: "Deep Pockets",
		description: "Hold $400 $ackdollars.",
		rank: "silver"
	},
	{
		id: "court_king",
		name: "Court King",
		description: "Score 20 in one basketball run.",
		rank: "gold"
	},
	{
		id: "city_legend",
		name: "901 Legend",
		description: "Reach 40 Respect.",
		rank: "gold"
	},
	{
		id: "night_owl",
		name: "Night Owl",
		description: "Be out after 20:00.",
		rank: "bronze"
	},
	{
		id: "full_closet",
		name: "Closet Heavy",
		description: "Own every piece on the wall.",
		rank: "platinum"
	}
];
var NPCS = [
	{
		id: "k_blanco",
		name: "K Blanco",
		x: 30.5 * 48,
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
		x: 2304,
		y: 576,
		color: "#a3a3a3",
		dialogue: ["You Benji? Heard SackReligious got that new drop.", "This city rocking with the brand heavy."]
	},
	{
		id: "downtown_fan",
		name: "901 Fan",
		x: 2400,
		y: 1536,
		color: "#e5e5e5",
		dialogue: ["Fresh fits only. Respect the movement.", "You got that energy, Benji."]
	},
	{
		id: "culture_host",
		name: "Culture Host",
		x: 1248,
		y: 1824,
		color: "#c4b8a8",
		dialogue: ["Culture spot is lit tonight.", "Drop sold through. Brand growing."]
	},
	{
		id: "court_coach",
		name: "Court OG",
		x: 624,
		y: 1488,
		color: "#fdba74",
		dialogue: ["Court's open. Put up points, earn $ackdollars.", "Timing is everything. Let it fly at the peak."]
	},
	{
		id: "street_npc",
		name: "Memphis Local",
		x: 960,
		y: 864,
		color: "#c4b8a8",
		dialogue: ["Man, this city rockin' with the brand heavy.", "Pyramid looks different on Drop Day."],
		wander: true
	},
	{
		id: "beale_dj",
		name: "Beale DJ",
		x: 1056,
		y: 1008,
		color: "#fbbf24",
		dialogue: ["Beale don't sleep. Brand either.", "When the neon hits, the city talks."],
		wander: true
	}
];
var TIPS = [
	"Hold Shift or the right face button to sprint the block.",
	"Release the shot in the green window for a swish.",
	"Streaks at the court pay extra $ackdollars.",
	"Press Start or Esc for the map, missions, and wardrobe.",
	"A DualSense or Xbox pad works — left stick to move, South to talk.",
	"Night on Beale hits different. Stay out after 20:00.",
	"Shop the wall at HQ. Fit changes how the city sees you."
];
var SAVE_KEY = "sackreligious-memphis-v2";
var SAVE_KEY_LEGACY = "sackreligious-memphis-v1";
var GameAudio = class {
	ctx = null;
	master = null;
	music = null;
	sfx = null;
	unlocked = false;
	muted = false;
	volumes = {
		master: .85,
		music: .42,
		sfx: .7
	};
	musicTimer = 0;
	step = 0;
	lastKick = 0;
	padOsc = null;
	padGain = null;
	cityNoise = null;
	cityGain = null;
	bassOsc = null;
	bassGain = null;
	running = false;
	lastFoot = 0;
	unlock() {
		if (this.unlocked && this.ctx) {
			if (this.ctx.state === "suspended") this.ctx.resume();
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		this.ctx = new AC({ latencyHint: "interactive" });
		this.master = this.ctx.createGain();
		this.music = this.ctx.createGain();
		this.sfx = this.ctx.createGain();
		this.music.connect(this.master);
		this.sfx.connect(this.master);
		this.master.connect(this.ctx.destination);
		this.applyVolumes();
		this.unlocked = true;
		this.ctx.resume();
		this.startBed();
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") this.ctx?.resume();
		});
	}
	setVolumes(v) {
		this.volumes = v;
		this.applyVolumes();
	}
	applyVolumes() {
		if (!this.ctx || !this.master || !this.music || !this.sfx) return;
		const now = this.ctx.currentTime;
		const curve = (x) => x * x;
		this.master.gain.setTargetAtTime(this.muted ? 0 : curve(this.volumes.master), now, .04);
		this.music.gain.setTargetAtTime(curve(this.volumes.music), now, .06);
		this.sfx.gain.setTargetAtTime(curve(this.volumes.sfx), now, .03);
	}
	startBed() {
		if (!this.ctx || !this.music) return;
		this.running = true;
		this.padOsc = this.ctx.createOscillator();
		this.padGain = this.ctx.createGain();
		const padFilter = this.ctx.createBiquadFilter();
		padFilter.type = "lowpass";
		padFilter.frequency.value = 420;
		this.padOsc.type = "triangle";
		this.padOsc.frequency.value = 55;
		this.padGain.gain.value = .045;
		this.padOsc.connect(padFilter);
		padFilter.connect(this.padGain);
		this.padGain.connect(this.music);
		this.padOsc.start();
		this.bassOsc = this.ctx.createOscillator();
		this.bassGain = this.ctx.createGain();
		this.bassOsc.type = "sine";
		this.bassOsc.frequency.value = 55;
		this.bassGain.gain.value = 0;
		this.bassOsc.connect(this.bassGain);
		this.bassGain.connect(this.music);
		this.bassOsc.start();
		const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .18;
		this.cityNoise = this.ctx.createBufferSource();
		this.cityNoise.buffer = buf;
		this.cityNoise.loop = true;
		const cityFilter = this.ctx.createBiquadFilter();
		cityFilter.type = "bandpass";
		cityFilter.frequency.value = 900;
		cityFilter.Q.value = .4;
		this.cityGain = this.ctx.createGain();
		this.cityGain.gain.value = .035;
		this.cityNoise.connect(cityFilter);
		cityFilter.connect(this.cityGain);
		this.cityGain.connect(this.music);
		this.cityNoise.start();
	}
	tick(dt, playing, night) {
		if (!this.unlocked || !this.ctx || !this.music) return;
		if (this.ctx.state === "suspended") return;
		if (this.cityGain) this.cityGain.gain.setTargetAtTime(.025 + night * .02, this.ctx.currentTime, .2);
		if (!playing) return;
		this.musicTimer += dt;
		if (this.musicTimer - this.lastKick >= 60 / 88) {
			this.lastKick = this.musicTimer;
			this.step = (this.step + 1) % 8;
			this.kick();
			if (this.step % 2 === 1) this.hat();
			if (this.step === 2 || this.step === 6) this.snare();
			this.blipBass([
				55,
				55,
				65.4,
				55,
				73.4,
				55,
				49,
				55
			][this.step]);
		}
	}
	kick() {
		if (!this.ctx || !this.music) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(140, this.ctx.currentTime);
		o.frequency.exponentialRampToValueAtTime(42, this.ctx.currentTime + .12);
		g.gain.setValueAtTime(.22, this.ctx.currentTime);
		g.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + .18);
		o.connect(g);
		g.connect(this.music);
		o.start();
		o.stop(this.ctx.currentTime + .2);
	}
	snare() {
		if (!this.ctx || !this.music) return;
		const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * .15, this.ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		const f = this.ctx.createBiquadFilter();
		f.type = "highpass";
		f.frequency.value = 1200;
		const g = this.ctx.createGain();
		g.gain.value = .08;
		src.connect(f);
		f.connect(g);
		g.connect(this.music);
		src.start();
	}
	hat() {
		if (!this.ctx || !this.music) return;
		const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * .04, this.ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		const f = this.ctx.createBiquadFilter();
		f.type = "highpass";
		f.frequency.value = 6e3;
		const g = this.ctx.createGain();
		g.gain.value = .04;
		src.connect(f);
		f.connect(g);
		g.connect(this.music);
		src.start();
	}
	blipBass(freq) {
		if (!this.ctx || !this.bassOsc || !this.bassGain) return;
		this.bassOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, .03);
		this.bassGain.gain.cancelScheduledValues(this.ctx.currentTime);
		this.bassGain.gain.setValueAtTime(.09, this.ctx.currentTime);
		this.bassGain.gain.exponentialRampToValueAtTime(.002, this.ctx.currentTime + .28);
	}
	tone(freq, dur, type, vol, bus = "sfx") {
		if (!this.ctx) return;
		const dest = bus === "music" ? this.music : this.sfx;
		if (!dest) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, this.ctx.currentTime);
		g.gain.setValueAtTime(vol, this.ctx.currentTime);
		g.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + dur);
		o.connect(g);
		g.connect(dest);
		o.start();
		o.stop(this.ctx.currentTime + dur + .02);
	}
	ui() {
		this.tone(660, .06, "triangle", .07);
	}
	confirm() {
		this.tone(520, .08, "triangle", .08);
		this.tone(780, .1, "sine", .05);
	}
	cash() {
		this.tone(880, .08, "square", .05);
		this.tone(1320, .12, "triangle", .06);
	}
	swish() {
		this.tone(740, .09, "sine", .08);
		this.tone(1180, .16, "triangle", .07);
	}
	rim() {
		this.tone(180, .08, "square", .05);
		this.tone(90, .12, "sine", .08);
	}
	bounce() {
		this.tone(140, .07, "sine", .06);
	}
	trophy() {
		this.tone(523, .12, "triangle", .08);
		this.tone(659, .16, "triangle", .07);
		this.tone(784, .22, "sine", .08);
	}
	mission() {
		this.tone(392, .18, "triangle", .08);
		this.tone(523, .24, "triangle", .07);
		this.tone(659, .32, "sine", .09);
	}
	talk() {
		const f = 240 + Math.random() * 80;
		this.tone(f, .05, "triangle", .04);
	}
	foot(now) {
		if (now - this.lastFoot < .28) return;
		this.lastFoot = now;
		this.tone(90 + Math.random() * 30, .05, "sine", .035);
	}
	whoosh() {
		this.tone(320, .1, "sawtooth", .03);
	}
};
var audio = new GameAudio();
var DEAD = .16;
function radial(x, y, dz = DEAD) {
	const m = Math.hypot(x, y);
	if (m < dz) return {
		x: 0,
		y: 0
	};
	const scale = (m - dz) / (1 - dz) / m;
	return {
		x: x * scale,
		y: y * scale
	};
}
var InputManager = class {
	keys = /* @__PURE__ */ new Set();
	touch = {
		mx: 0,
		my: 0,
		shoot: false
	};
	device = "keyboard";
	prevShoot = false;
	prevInteract = false;
	prevBack = false;
	prevPause = false;
	padInteract = false;
	padBack = false;
	padPause = false;
	padShoot = false;
	padRun = false;
	padMx = 0;
	padMy = 0;
	lastPad = null;
	queuedInteract = false;
	queuedPause = false;
	queuedBack = false;
	queuedShootPress = false;
	queuedShootRelease = false;
	kd = (e) => {
		this.keys.add(e.code);
		this.device = "keyboard";
		if ([
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Space"
		].includes(e.code)) e.preventDefault();
		if (e.code === "KeyE" || e.code === "Enter") this.queuedInteract = true;
		if (e.code === "Space") {
			this.queuedInteract = true;
			this.queuedShootPress = true;
		}
		if (e.code === "Escape") {
			this.queuedPause = true;
			this.queuedBack = true;
		}
		if (e.code === "KeyP") this.queuedPause = true;
		if (e.code === "KeyF") this.queuedShootPress = true;
	};
	ku = (e) => {
		this.keys.delete(e.code);
		if (e.code === "Space" || e.code === "KeyF") this.queuedShootRelease = true;
	};
	blur = () => this.keys.clear();
	bind() {
		window.addEventListener("keydown", this.kd);
		window.addEventListener("keyup", this.ku);
		window.addEventListener("blur", this.blur);
		window.addEventListener("gamepadconnected", () => {
			this.device = "gamepad";
		});
	}
	unbind() {
		window.removeEventListener("keydown", this.kd);
		window.removeEventListener("keyup", this.ku);
		window.removeEventListener("blur", this.blur);
	}
	poll() {
		let mx = 0;
		let my = 0;
		if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my -= 1;
		if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my += 1;
		if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
		if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
		mx += this.touch.mx;
		my += this.touch.my;
		if (Math.abs(this.touch.mx) + Math.abs(this.touch.my) > .05) this.device = "touch";
		this.pollPad();
		mx += this.padMx;
		my += this.padMy;
		const len = Math.hypot(mx, my);
		if (len > 1) {
			mx /= len;
			my /= len;
		}
		const interactHeld = this.keys.has("KeyE") || this.keys.has("Enter") || this.keys.has("Space") || this.padInteract;
		const backHeld = this.keys.has("Escape") || this.keys.has("Backspace") || this.padBack;
		const pauseHeld = this.keys.has("Escape") || this.keys.has("KeyP") || this.padPause;
		const shootHeld = this.keys.has("Space") || this.keys.has("KeyF") || this.padShoot || this.touch.shoot;
		const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.padRun;
		const interactPressed = interactHeld && !this.prevInteract || this.queuedInteract;
		const backPressed = backHeld && !this.prevBack || this.queuedBack;
		const pausePressed = pauseHeld && !this.prevPause || this.queuedPause;
		const shootPressed = shootHeld && !this.prevShoot || this.queuedShootPress;
		const shootReleased = !shootHeld && this.prevShoot || this.queuedShootRelease;
		this.queuedInteract = false;
		this.queuedBack = false;
		this.queuedPause = false;
		this.queuedShootPress = false;
		this.queuedShootRelease = false;
		this.prevInteract = interactHeld;
		this.prevBack = backHeld;
		this.prevPause = pauseHeld;
		this.prevShoot = shootHeld;
		return {
			mx,
			my,
			run,
			interact: interactHeld,
			interactPressed,
			backPressed,
			pausePressed,
			shoot: shootHeld,
			shootPressed,
			shootReleased
		};
	}
	pollPad() {
		this.padMx = 0;
		this.padMy = 0;
		this.padInteract = false;
		this.padBack = false;
		this.padPause = false;
		this.padShoot = false;
		this.padRun = false;
		const pads = navigator.getGamepads?.() ?? [];
		for (const p of pads) {
			if (!p) continue;
			this.lastPad = p;
			const st = radial(p.axes[0] ?? 0, p.axes[1] ?? 0);
			this.padMx += st.x;
			this.padMy += st.y;
			if (p.buttons[12]?.pressed) this.padMy -= 1;
			if (p.buttons[13]?.pressed) this.padMy += 1;
			if (p.buttons[14]?.pressed) this.padMx -= 1;
			if (p.buttons[15]?.pressed) this.padMx += 1;
			this.padInteract = !!p.buttons[0]?.pressed;
			this.padBack = !!p.buttons[1]?.pressed;
			this.padShoot = !!(p.buttons[2]?.pressed || p.buttons[7]?.pressed);
			this.padRun = !!(p.buttons[3]?.pressed || p.buttons[6]?.pressed);
			this.padPause = !!p.buttons[9]?.pressed;
			if (Math.abs(st.x) + Math.abs(st.y) > .2 || p.buttons.some((b) => b.pressed)) this.device = "gamepad";
			break;
		}
	}
	rumble(ms, strong = .35, weak = .55) {
		const act = this.lastPad?.vibrationActuator;
		if (!act?.playEffect) return;
		act.playEffect("dual-rumble", {
			startDelay: 0,
			duration: ms,
			strongMagnitude: strong,
			weakMagnitude: weak
		});
	}
	prompt(device) {
		if (device === "gamepad") return {
			interact: "A",
			pause: "Start",
			run: "Y",
			shoot: "X"
		};
		if (device === "touch") return {
			interact: "TAP",
			pause: "II",
			run: "HOLD",
			shoot: "SHOOT"
		};
		return {
			interact: "E",
			pause: "Esc",
			run: "Shift",
			shoot: "Space"
		};
	}
};
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
function rr(ctx, x, y, w, h, r) {
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(x, y, w, h, r);
		return;
	}
	ctx.rect(x, y, w, h);
}
function nightAmount(hour) {
	if (hour < 5.5) return .78;
	if (hour < 7) return .78 * (1 - (hour - 5.5) / 1.5);
	if (hour < 18) return 0;
	if (hour < 20.5) return (hour - 18) / 2.5 * .78;
	return .78;
}
var GameEngine = class {
	canvas;
	ctx;
	images = {};
	input = new InputManager();
	started = false;
	paused = false;
	mode = "world";
	toast = null;
	toastT = 0;
	pauseTab = "resume";
	px = 288;
	py = 528;
	vx = 0;
	vy = 0;
	dir = "down";
	facing = "down";
	moving = false;
	animT = 0;
	bob = 0;
	camX = 0;
	camY = 0;
	lookX = 0;
	lookY = 0;
	trauma = 0;
	hitstop = 0;
	sackdollars = 25;
	respect = 0;
	owned = ["starter_tee"];
	equipped = "starter_tee";
	mission = createDropDayMission();
	missionComplete = false;
	side = createSideMissions();
	trophies = [];
	trophyPopup = null;
	talked = /* @__PURE__ */ new Set();
	dialogue = null;
	dialogueNpcId = null;
	dialogueLines = [];
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
		ballVx: 0,
		ballVy: 0,
		inFlight: false,
		made: false,
		flash: 0,
		targetScore: 8,
		missionCredited: false,
		combo: 0,
		best: 0,
		grade: ""
	};
	highScore = 0;
	walls = [];
	trees = [];
	cars = [];
	peds = [];
	npcLive = [];
	shopOpen = false;
	cinematic = null;
	letterbox = 0;
	worldHour = 16.2;
	settings = { ...DEFAULT_SETTINGS };
	interactHint = null;
	nearPoi = null;
	nearNpc = null;
	lastInteract = 0;
	particles = [];
	floaters = [];
	running = false;
	raf = 0;
	lastT = 0;
	onHud = null;
	hudAcc = 0;
	clock = 0;
	mapCanvas = null;
	leftSpawn = false;
	hasSave = false;
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
		this.input.bind();
		this.wireQa();
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
		const carColors = [
			"#5c5148",
			"#1a1816",
			"#c4b8a8",
			"#3a4550",
			"#6b3a32",
			"#6b5c4a"
		];
		const lanes = [];
		for (let i = 0; i < 10; i++) {
			lanes.push({
				x: (4 + i * 6) * 48,
				y: 968,
				vx: 90,
				vy: 0
			});
			lanes.push({
				x: (2 + i * 6) * 48,
				y: 942,
				vx: -80,
				vy: 0
			});
		}
		for (let i = 0; i < 6; i++) {
			lanes.push({
				x: 774,
				y: (3 + i * 7) * 48,
				vx: 0,
				vy: 85
			});
			lanes.push({
				x: 1622,
				y: (4 + i * 7) * 48,
				vx: 0,
				vy: -78
			});
		}
		lanes.forEach((l, i) => {
			this.cars.push({
				x: l.x,
				y: l.y,
				vx: l.vx,
				vy: l.vy,
				w: 38 + i % 3 * 8,
				color: carColors[i % carColors.length]
			});
		});
		const pedColors = [
			"#c4b8a8",
			"#8a8074",
			"#5c564e",
			"#6b5c4a",
			"#3a3632",
			"#d9d0c4"
		];
		for (let i = 0; i < 14; i++) this.peds.push({
			x: (6 + i * 11 % 50) * 48,
			y: (8 + i * 7 % 34) * 48,
			vx: (i % 2 === 0 ? 1 : -1) * (22 + i % 5 * 4),
			vy: (i % 3 === 0 ? 1 : -1) * (10 + i % 4 * 3),
			color: pedColors[i % pedColors.length],
			t: i
		});
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
		const g = c.getContext("2d");
		const isRoadAt = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 48 && (Math.abs(y - 20) <= 1 || y === 6 || y === 34 || Math.abs(x - 16) <= 1 || Math.abs(x - 34) <= 1 || x === 50);
		g.fillStyle = PAL.asphalt;
		g.fillRect(0, 0, c.width, c.height);
		for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
			const px = x * 48;
			const py = y * 48;
			if (isRoadAt(x, y)) {
				g.fillStyle = (x + y) % 2 === 0 ? PAL.asphalt : PAL.asphaltAlt;
				g.fillRect(px, py, 48, 48);
				g.strokeStyle = PAL.lane;
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
				g.fillStyle = (x + y) % 2 === 0 ? PAL.sidewalk : PAL.sidewalkAlt;
				g.fillRect(px, py, 48, 48);
			}
		}
		g.fillStyle = PAL.curb;
		for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
			if (!isRoadAt(x, y)) continue;
			const px = x * 48;
			const py = y * 48;
			if (!isRoadAt(x, y - 1)) g.fillRect(px, py, 48, 2);
			if (!isRoadAt(x, y + 1)) g.fillRect(px, py + 48 - 2, 48, 2);
			if (!isRoadAt(x - 1, y)) g.fillRect(px, py, 2, 48);
			if (!isRoadAt(x + 1, y)) g.fillRect(px + 48 - 2, py, 2, 48);
		}
		for (let i = 0; i < 36; i++) {
			const gx = i * 173 % WORLD_PX_W;
			const gy = i * 241 % WORLD_PX_H;
			g.fillStyle = PAL.grass;
			g.beginPath();
			g.ellipse(gx, gy, 36 + i % 5 * 12, 24 + i % 4 * 10, 0, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = PAL.grassTip;
			g.beginPath();
			g.ellipse(gx - 6, gy - 6, 14 + i % 3 * 4, 10, 0, 0, Math.PI * 2);
			g.fill();
		}
		const coolShadow = (x, y, w, h) => {
			g.fillStyle = PAL.shadow;
			g.fillRect(x + 6, y + h, w, 10);
			g.fillRect(x + w, y + 8, 8, h);
		};
		for (const wall of this.walls) {
			if (wall.w >= 3070 || wall.h >= 2302) continue;
			coolShadow(wall.x, wall.y, wall.w, wall.h);
			g.fillStyle = (Math.floor(wall.x / 48) + Math.floor(wall.y / 48)) % 2 === 0 ? PAL.wall : PAL.wallAlt;
			g.fillRect(wall.x, wall.y, wall.w, wall.h);
			g.fillStyle = PAL.roof;
			g.fillRect(wall.x, wall.y, wall.w, 10);
			g.fillStyle = PAL.roofEdge;
			g.fillRect(wall.x, wall.y, wall.w, 2);
			g.fillRect(wall.x, wall.y, 2, wall.h);
			g.strokeStyle = PAL.ink;
			g.lineWidth = 1;
			g.strokeRect(wall.x + .5, wall.y + .5, wall.w - 1, wall.h - 1);
			let wi = 0;
			for (let wy = wall.y + 16; wy < wall.y + wall.h - 12; wy += 20) for (let wx = wall.x + 12; wx < wall.x + wall.w - 12; wx += 18) {
				const lit = (wi * 17 + Math.floor(wall.x) + Math.floor(wall.y)) % 10 > 3;
				const a = .15 + (wi * 37 + Math.floor(wx)) % 71 / 100;
				g.fillStyle = lit ? PAL.windowLit : PAL.windowDark;
				g.globalAlpha = lit ? Math.min(.85, Math.max(.15, a)) : 1;
				g.fillRect(wx, wy, 9, 11);
				g.globalAlpha = 1;
				wi++;
			}
		}
		for (const poi of POIS) if (poi.id === "court") {
			coolShadow(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = "#7a4a32";
			g.fillRect(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = "#8a5640";
			g.fillRect(poi.x + 10, poi.y + 10, poi.w - 20, poi.h - 20);
			g.strokeStyle = "#d9d0c4";
			g.lineWidth = 3;
			g.strokeRect(poi.x + 8, poi.y + 8, poi.w - 16, poi.h - 16);
			g.strokeRect(poi.x + poi.w / 2 - 42, poi.y + 8, 84, 72);
			g.beginPath();
			g.arc(poi.x + poi.w / 2, poi.y + 80, 42, 0, Math.PI);
			g.stroke();
			g.fillStyle = "#c4a574";
			g.fillRect(poi.x + poi.w / 2 - 24, poi.y + 4, 48, 7);
			g.strokeStyle = "#a85a48";
			g.lineWidth = 3;
			g.beginPath();
			g.arc(poi.x + poi.w / 2, poi.y + 22, 13, 0, Math.PI * 2);
			g.stroke();
			g.fillStyle = PAL.label;
			g.font = "bold 13px sans-serif";
			g.fillText("901 COURT", poi.x + 22, poi.y + poi.h - 14);
		} else if (poi.id === "dropvan") {
			coolShadow(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = PAL.wall;
			g.fillRect(poi.x, poi.y + 10, poi.w, poi.h - 10);
			g.fillStyle = PAL.roof;
			g.fillRect(poi.x + 8, poi.y, poi.w - 16, 18);
			g.fillStyle = PAL.label;
			g.font = "bold 12px sans-serif";
			g.fillText("DROP VAN", poi.x + 10, poi.y + poi.h / 2);
		} else if (poi.id === "pyramid") {
			g.fillStyle = PAL.shadow;
			g.beginPath();
			g.moveTo(poi.x + poi.w / 2 + 6, poi.y + 8);
			g.lineTo(poi.x + poi.w + 8, poi.y + poi.h + 8);
			g.lineTo(poi.x + 8, poi.y + poi.h + 8);
			g.closePath();
			g.fill();
			g.fillStyle = PAL.wall;
			g.beginPath();
			g.moveTo(poi.x + poi.w / 2, poi.y);
			g.lineTo(poi.x + poi.w, poi.y + poi.h);
			g.lineTo(poi.x, poi.y + poi.h);
			g.closePath();
			g.fill();
			g.fillStyle = PAL.roof;
			g.beginPath();
			g.moveTo(poi.x + poi.w / 2, poi.y + 18);
			g.lineTo(poi.x + poi.w - 16, poi.y + poi.h);
			g.lineTo(poi.x + 16, poi.y + poi.h);
			g.closePath();
			g.fill();
			g.fillStyle = PAL.label;
			g.font = "bold 12px sans-serif";
			g.fillText("PYRAMID", poi.x + 18, poi.y + poi.h - 10);
		} else if (poi.id === "river") {
			const river = g.createLinearGradient(poi.x, poi.y, poi.x, poi.y + poi.h);
			river.addColorStop(0, PAL.river0);
			river.addColorStop(1, PAL.river1);
			g.fillStyle = river;
			g.fillRect(poi.x, poi.y, poi.w, poi.h);
		} else if (poi.id === "beale") {
			coolShadow(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = PAL.wall;
			g.fillRect(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = PAL.roof;
			g.fillRect(poi.x, poi.y, poi.w, 12);
			g.fillStyle = PAL.roofEdge;
			g.fillRect(poi.x, poi.y, poi.w, 2);
			g.fillStyle = PAL.windowLit;
			g.globalAlpha = .45;
			for (let i = 0; i < 5; i++) g.fillRect(poi.x + 16 + i * 70, poi.y + 8, 36, 8);
			g.globalAlpha = 1;
			g.fillStyle = PAL.label;
			g.font = "bold 14px sans-serif";
			g.fillText("BEALE STREET", poi.x + 24, poi.y + poi.h / 2 + 4);
		} else {
			coolShadow(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = PAL.wall;
			g.fillRect(poi.x, poi.y, poi.w, poi.h);
			g.fillStyle = PAL.roof;
			g.fillRect(poi.x, poi.y, poi.w, 14);
			g.fillStyle = PAL.roofEdge;
			g.fillRect(poi.x, poi.y, poi.w, 2);
			g.fillRect(poi.x, poi.y, 2, poi.h);
			g.fillStyle = poi.color;
			g.fillRect(poi.x + 8, poi.y + 16, poi.w - 16, 4);
			g.fillStyle = PAL.ink;
			g.fillRect(poi.x + poi.w / 2 - 14, poi.y + poi.h - 36, 28, 36);
			g.fillStyle = PAL.label;
			g.font = "bold 13px sans-serif";
			g.fillText(poi.label, poi.x + 10, poi.y + 28);
			if (poi.id === "store") {
				g.fillStyle = PAL.label;
				g.font = "bold 15px sans-serif";
				g.fillText("$ACKRELIGIOUS", poi.x + 16, poi.y + 52);
				g.fillStyle = "rgba(196,184,168,0.7)";
				g.font = "11px sans-serif";
				g.fillText("IN THE $ACK, WE TRUST", poi.x + 16, poi.y + 70);
			}
		}
		for (const t of this.trees) {
			g.fillStyle = PAL.shadow;
			g.beginPath();
			g.ellipse(t.x + 6, t.y + 8, 14, 7, 0, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = PAL.grass;
			g.beginPath();
			g.arc(t.x, t.y, 16, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = PAL.grassTip;
			g.beginPath();
			g.arc(t.x - 5, t.y - 5, 10, 0, Math.PI * 2);
			g.fill();
		}
		const river = g.createLinearGradient(0, WORLD_PX_H - 110, 0, WORLD_PX_H);
		river.addColorStop(0, "rgba(42,56,64,0)");
		river.addColorStop(1, "rgba(26,36,44,0.7)");
		g.fillStyle = river;
		g.fillRect(0, WORLD_PX_H - 110, WORLD_PX_W, 110);
		for (let i = 0; i < 22; i++) {
			const bx = 90 + i * 130;
			const bw = 44 + i % 3 * 18;
			const bh = 36 + i * 37 % 72;
			coolShadow(bx, 28, bw, bh);
			g.fillStyle = i % 2 === 0 ? PAL.wall : PAL.wallAlt;
			g.fillRect(bx, 28, bw, bh);
			g.fillStyle = PAL.roof;
			g.fillRect(bx, 28, bw, 8);
			g.fillStyle = PAL.roofEdge;
			g.fillRect(bx, 28, bw, 2);
		}
		g.fillStyle = "rgba(196,184,168,0.28)";
		g.font = "bold 11px sans-serif";
		for (const s of STREETS) if (s.axis === "y") g.fillText(s.name, 80, s.tile * 48 - 8);
		else g.fillText(s.name, s.tile * 48 + 8, 70);
		this.mapCanvas = c;
	}
	wireQa() {
		if (typeof window === "undefined") return;
		const w = window;
		w.__controlsTest = {
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
				this.input.keys.clear();
				for (const c of codes) this.input.keys.add(c);
			}
		};
		w.__gameTest = {
			teleport: (loc) => {
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
				missionComplete: this.missionComplete
			}),
			setBallScore: (n) => {
				this.ball.score = n;
				this.tryCreditBasketball();
				this.emitHud();
			},
			advanceDialogue: () => this.advanceDialogue(),
			interact: () => {
				this.lastInteract = 0;
				this.tryInteract();
			},
			resetSave: () => this.resetProgress()
		};
	}
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.input.unbind();
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
		this.emitHud();
	}
	resetProgress(emit = true) {
		try {
			localStorage.removeItem(SAVE_KEY);
			localStorage.removeItem(SAVE_KEY_LEGACY);
		} catch {}
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
		this.mode = "world";
		this.shopOpen = false;
		this.dialogue = null;
		this.ball.missionCredited = false;
		this.ball.best = 0;
		this.worldHour = 16.2;
		this.hasSave = false;
		if (emit) this.emitHud();
	}
	showToast(msg, t = 3.1) {
		this.toast = msg;
		this.toastT = t;
	}
	float(text, color, x = this.px, y = this.py - 50) {
		this.floaters.push({
			x,
			y,
			vy: -38,
			life: 1.15,
			text,
			color,
			scale: 1.15
		});
	}
	addTrauma(v) {
		if (!this.settings.shake) return;
		this.trauma = clamp(this.trauma + v, 0, 1);
	}
	loadSave() {
		try {
			let raw = localStorage.getItem(SAVE_KEY);
			if (!raw) raw = localStorage.getItem(SAVE_KEY_LEGACY);
			this.hasSave = !!raw;
			if (!raw) return;
			const data = JSON.parse(raw);
			this.sackdollars = data.sackdollars ?? 25;
			this.respect = data.respect ?? 0;
			this.owned = data.owned?.length ? data.owned : ["starter_tee"];
			this.equipped = data.equipped;
			this.mission.complete = data.missionComplete ?? false;
			this.missionComplete = this.mission.complete;
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
		} catch {}
	}
	save() {
		const progress = {};
		for (const s of this.mission.steps) progress[s.id] = s.done;
		const sideProgress = {};
		for (const s of this.side) sideProgress[s.id] = s.done;
		const data = {
			version: 2,
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
			settings: this.settings
		};
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(data));
			this.hasSave = true;
		} catch {}
	}
	applySettings(next) {
		this.settings = {
			...this.settings,
			...next
		};
		audio.setVolumes(this.settings);
		this.save();
		this.emitHud();
	}
	setPauseTab(tab) {
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
		const frame = (t) => {
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
	update(dt) {
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
		this.letterbox += ((this.cinematic ? 1 : 0) - this.letterbox) * (1 - Math.exp(-8 * dt));
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			if (p.life <= 0) this.particles.splice(i, 1);
		}
		for (let i = this.floaters.length - 1; i >= 0; i--) {
			const f = this.floaters[i];
			f.y += f.vy * dt;
			f.life -= dt;
			f.scale += (1 - f.scale) * (1 - Math.exp(-10 * dt));
			if (f.life <= 0) this.floaters.splice(i, 1);
		}
		if (this.cinematic) {
			this.cinematic.t += dt;
			if (this.cinematic.t >= this.cinematic.duration) {
				const kind = this.cinematic.kind;
				this.cinematic = null;
				if (kind === "briefing") this.showToast("Drop Day is live. Find K Blanco at HQ.");
				this.emitHud();
			}
		}
		if (!this.started || this.paused) return;
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
			this.updateBasketball(dt);
			return;
		}
		if (this.cinematic) return;
		this.updatePlayer(dt, act.mx, act.my, act.run);
		this.updateProximity();
		this.checkMissionAuto();
		this.checkSideVisits();
		if (act.interactPressed) this.tryInteract();
	}
	updateTraffic(dt) {
		for (const c of this.cars) {
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			if (c.x > 3112) c.x = -50;
			if (c.x < -50) c.x = WORLD_PX_W + 40;
			if (c.y > 2344) c.y = -40;
			if (c.y < -40) c.y = WORLD_PX_H + 40;
		}
	}
	updatePeds(dt) {
		for (const p of this.peds) {
			p.t += dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.x < 96 || p.x > 2976) p.vx *= -1;
			if (p.y < 96 || p.y > 2112) p.vy *= -1;
		}
		for (const n of this.npcLive) {
			if (!NPCS.find((x) => x.id === n.id)?.wander) continue;
			n.t += dt;
			n.x = n.ox + Math.sin(n.t * .35) * 36;
			n.y = n.oy + Math.cos(n.t * .28) * 22;
		}
	}
	updatePlayer(dt, mx, my, runHeld) {
		const len = Math.hypot(mx, my);
		if (len > .01) {
			mx /= len;
			my /= len;
			this.moving = true;
			this.leftSpawn = true;
			if (Math.abs(mx) > Math.abs(my)) this.facing = mx < 0 ? "left" : "right";
			else this.facing = my < 0 ? "up" : "down";
			this.dir = this.facing;
			audio.foot(this.clock);
			if (runHeld && Math.random() < .08) this.particles.push({
				x: this.px,
				y: this.py + 4,
				vx: -mx * 20,
				vy: -10,
				life: .35,
				color: "rgba(200,200,180,0.45)",
				size: 3
			});
		} else this.moving = false;
		const speed = runHeld ? 268 : 168;
		this.vx = mx * speed;
		this.vy = my * speed;
		const r = 14;
		let nx = this.px + this.vx * dt;
		let ny = this.py + this.vy * dt;
		nx = clamp(nx, 62, WORLD_PX_W - 48 - r);
		ny = clamp(ny, 62, WORLD_PX_H - 48 - r);
		if (!this.collides(nx, this.py, r)) this.px = nx;
		if (!this.collides(this.px, ny, r)) this.py = ny;
		this.animT += dt * (this.moving ? 9 : 2);
		this.bob = this.moving ? Math.sin(this.animT * 2) * 3.2 : Math.sin(this.animT) * .6;
		const tw = this.canvas.clientWidth;
		const th = this.canvas.clientHeight;
		this.lookX += (this.vx * .22 - this.lookX) * (1 - Math.exp(-4 * dt));
		this.lookY += (this.vy * .22 - this.lookY) * (1 - Math.exp(-4 * dt));
		const tx = this.px + this.lookX - tw / 2;
		const ty = this.py + this.lookY - th / 2;
		const k = 1 - Math.exp(-7 * dt);
		this.camX += (tx - this.camX) * k;
		this.camY += (ty - this.camY) * k;
		this.camX = clamp(this.camX, 0, Math.max(0, WORLD_PX_W - tw));
		this.camY = clamp(this.camY, 0, Math.max(0, WORLD_PX_H - th));
	}
	collides(x, y, r) {
		for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
		return false;
	}
	npcPos(id) {
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
			const name = NPCS.find((x) => x.id === this.nearNpc).name;
			this.interactHint = `Talk to ${name}`;
		} else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
		else if (this.nearPoi === "court") this.interactHint = "Play basketball";
		else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
		else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi)?.name ?? "Memphis"}`;
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
	openDialogue(npcId) {
		const n = NPCS.find((x) => x.id === npcId);
		if (!n) return;
		audio.talk();
		this.talked.add(npcId);
		this.checkSideTalk();
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
			this.burst(this.px, this.py, PAL.gold);
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
	completeSide(id) {
		const s = this.side.find((x) => x.id === id);
		if (!s || s.done) return;
		s.done = true;
		this.sackdollars += s.reward;
		this.respect += 4;
		this.float(`+$${s.reward}`, PAL.gold);
		this.showToast(`SIDE MISSION · ${s.title}`);
		audio.mission();
		this.save();
	}
	completeStep(id) {
		const step = this.mission.steps.find((s) => s.id === id);
		if (!step || step.done) return;
		step.done = true;
		this.sackdollars += step.reward;
		this.respect += Math.ceil(step.reward / 10);
		this.burst(this.px, this.py - 20, PAL.gold);
		this.float(`+$${step.reward}`, PAL.gold);
		this.addTrauma(.28);
		if (this.settings.rumble) this.input.rumble(90, .25, .4);
		audio.cash();
		this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
		if (id === "wake") this.unlockTrophy("first_steps");
		if (id === "link_k") this.unlockTrophy("family");
		if (id === "ball") this.unlockTrophy("baller");
		const next = this.mission.steps.findIndex((s) => !s.done);
		if (next === -1) {
			this.mission.complete = true;
			this.missionComplete = true;
			this.mission.activeStep = this.mission.steps.length;
			this.respect += 25;
			this.unlockTrophy("drop_day");
			this.cinematic = {
				kind: "complete",
				title: "MISSION COMPLETE",
				subtitle: "THE DROP DAY  ·  RESPECT UNLOCKED",
				t: 0,
				duration: 3.6
			};
			audio.mission();
		} else this.mission.activeStep = next;
		if (this.respect >= 40) this.unlockTrophy("city_legend");
		if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
		this.save();
		this.emitHud();
	}
	unlockTrophy(id) {
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
	buyItem(id) {
		const item = APPAREL.find((a) => a.id === id);
		if (!item) return;
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
		this.mode = "basketball";
		this.ball.active = true;
		this.ball.score = 0;
		this.ball.timeLeft = 50;
		this.ball.shots = 0;
		this.ball.inFlight = false;
		this.ball.charging = false;
		this.ball.power = 0;
		this.ball.flash = 0;
		this.ball.combo = 0;
		this.ball.missionCredited = false;
		this.ball.grade = "";
		this.showToast("Ball up. Hold shoot, release in the green.");
		this.emitHud();
	}
	tryCreditBasketball() {
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.kind === "basketball" && this.ball.score >= this.ball.targetScore && !step.done && !this.ball.missionCredited) {
			this.ball.missionCredited = true;
			this.completeStep(step.id);
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
			this.float(`+$${pay}`, PAL.gold);
			this.showToast(`Court payout: +$${pay} $ackdollars`);
			audio.cash();
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
		if (this.ball.charging && !this.ball.inFlight) this.ball.power = Math.min(1, this.ball.power + dt * .82);
		if (this.ball.inFlight) {
			this.ball.ballX += this.ball.ballVx * dt;
			this.ball.ballY += this.ball.ballVy * dt;
			this.ball.ballVy += 520 * dt;
			const court = POIS.find((p) => p.id === "court");
			const hoopX = court.x + court.w / 2;
			const hoopY = court.y + 22;
			if (dist(this.ball.ballX, this.ball.ballY, hoopX, hoopY) < 24 && this.ball.ballVy > 0) {
				if (this.ball.made) {
					const pts = this.ball.grade === "PERFECT" ? 3 : 2;
					this.ball.score += pts;
					this.ball.combo += 1;
					this.ball.best = Math.max(this.ball.best, this.ball.combo);
					this.ball.flash = .45;
					this.burst(hoopX, hoopY, PAL.gold);
					this.float(this.ball.grade === "PERFECT" ? "SWISH +3" : `+${pts}`, PAL.gold, hoopX, hoopY);
					this.addTrauma(this.ball.grade === "PERFECT" ? .45 : .28);
					this.hitstop = this.ball.grade === "PERFECT" ? .07 : .04;
					audio.swish();
					if (this.settings.rumble) this.input.rumble(this.ball.grade === "PERFECT" ? 140 : 80, .3, .55);
					this.tryCreditBasketball();
				} else {
					this.ball.combo = 0;
					this.burst(hoopX, hoopY, "#e85d4c");
					this.float("RIM", "#e85d4c", hoopX, hoopY);
					audio.rim();
					this.addTrauma(.18);
				}
				this.ball.inFlight = false;
				this.ball.charging = false;
				this.ball.power = 0;
			}
			if (this.ball.ballY > court.y + court.h - 20 || this.ball.ballX < court.x || this.ball.ballX > court.x + court.w) {
				this.ball.inFlight = false;
				this.ball.charging = false;
				this.ball.power = 0;
				this.ball.combo = 0;
			}
		}
		const court = POIS.find((p) => p.id === "court");
		const tw = this.canvas.clientWidth;
		const th = this.canvas.clientHeight;
		const k = 1 - Math.exp(-5 * dt);
		this.camX += (court.x + court.w / 2 - tw / 2 - this.camX) * k;
		this.camY += (court.y + court.h / 2 - th / 2 - this.camY) * k;
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h - 50;
		this.facing = "up";
	}
	releaseShot() {
		if (this.mode !== "basketball" || this.ball.inFlight) return;
		if (!this.ball.charging && this.ball.power <= 0) return;
		this.ball.charging = false;
		this.ball.shots++;
		audio.bounce();
		const court = POIS.find((p) => p.id === "court");
		const hoopX = court.x + court.w / 2;
		const hoopY = court.y + 22;
		const pwr = this.ball.power;
		const perfect = pwr >= .56 && pwr <= .78;
		const good = pwr >= .48 && pwr <= .88;
		this.ball.made = good;
		this.ball.grade = perfect ? "PERFECT" : good ? "GOOD" : "LATE";
		this.ball.ballX = this.px;
		this.ball.ballY = this.py - 30;
		const dx = hoopX - this.ball.ballX;
		const dy = hoopY - this.ball.ballY;
		const speed = 280 + pwr * 220;
		const ang = Math.atan2(dy, dx) - .35;
		this.ball.ballVx = Math.cos(ang) * speed * (.7 + pwr * .5);
		this.ball.ballVy = Math.sin(ang) * speed - 180 - pwr * 80;
		if (!this.ball.made) this.ball.ballVx += (Math.random() - .5) * 130;
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
		for (let i = 0; i < 18; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = 50 + Math.random() * 140;
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				life: .4 + Math.random() * .55,
				color,
				size: 2 + Math.random() * 4
			});
		}
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
		const night = nightAmount(this.worldHour);
		sky.addColorStop(0, night > .4 ? "#1a1618" : PAL.skyTop);
		sky.addColorStop(1, PAL.skyBot);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		const shake = this.trauma * this.trauma;
		const ox = shake * 11 * Math.sin(this.clock * 47);
		const oy = shake * 9 * Math.cos(this.clock * 39);
		ctx.save();
		ctx.translate(-Math.floor(this.camX) + ox, -Math.floor(this.camY) + oy);
		if (this.mapCanvas) ctx.drawImage(this.mapCanvas, 0, 0);
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.target && !this.mission.complete) {
			const p = POIS.find((x) => x.id === step.target);
			if (p) {
				ctx.strokeStyle = "rgba(29,185,84,0.75)";
				ctx.lineWidth = 3;
				ctx.setLineDash([8, 6]);
				ctx.strokeRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
				ctx.setLineDash([]);
				const t = this.clock * 3;
				ctx.fillStyle = `rgba(29,185,84,${.35 + Math.sin(t) * .2})`;
				ctx.beginPath();
				ctx.arc(p.x + p.w / 2, p.y - 18, 8, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		for (const car of this.cars) this.drawCar(ctx, car);
		for (const ped of this.peds) this.drawPed(ctx, ped);
		for (const n of NPCS) this.drawNpc(ctx, n);
		this.drawPlayer(ctx);
		if (this.mode === "basketball" && this.ball.inFlight) {
			ctx.fillStyle = "#ea580c";
			ctx.beginPath();
			ctx.arc(this.ball.ballX, this.ball.ballY, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#7c2d12";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
		for (const p of this.particles) {
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		for (const f of this.floaters) {
			ctx.globalAlpha = Math.max(0, f.life);
			ctx.fillStyle = f.color;
			ctx.font = `700 ${Math.round(15 * f.scale)}px DM Sans, sans-serif`;
			ctx.textAlign = "center";
			ctx.fillText(f.text, f.x, f.y);
			ctx.textAlign = "start";
		}
		ctx.globalAlpha = 1;
		ctx.restore();
		if (night > .05) {
			ctx.fillStyle = `rgba(13,11,10,${night * .42})`;
			ctx.fillRect(0, 0, w, h);
		}
		if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) this.drawShotMeter(ctx, w, h);
		if (this.ball.flash > 0) {
			ctx.fillStyle = `rgba(242,198,106,${this.ball.flash * .28})`;
			ctx.fillRect(0, 0, w, h);
		}
		if (this.started && this.mode === "world") {
			this.drawCompass(ctx, w, h);
			this.drawMinimap(ctx, w, h);
		}
	}
	drawShotMeter(ctx, w, h) {
		const mw = 188;
		const mh = 16;
		const mx = w / 2 - mw / 2;
		const my = h - 128;
		ctx.fillStyle = "rgba(13,11,10,0.7)";
		ctx.beginPath();
		rr(ctx, mx - 5, my - 5, 198, 26, 8);
		ctx.fill();
		ctx.fillStyle = PAL.windowDark;
		ctx.fillRect(mx, my, mw, mh);
		ctx.fillStyle = "rgba(109,130,80,0.35)";
		ctx.fillRect(mx + mw * .48, my, mw * .4, mh);
		ctx.fillStyle = "rgba(109,130,80,0.7)";
		ctx.fillRect(mx + mw * .56, my, mw * .22, mh);
		ctx.fillStyle = PAL.label;
		ctx.fillRect(mx, my, mw * this.ball.power, mh);
		ctx.fillStyle = "rgba(255,255,255,0.6)";
		ctx.font = "700 10px DM Sans, sans-serif";
		ctx.fillText("RELEASE IN THE GREEN", mx, my - 10);
	}
	drawCar(ctx, car) {
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
	drawPed(ctx, p) {
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
		ctx.fillStyle = PAL.label;
		ctx.fillText(label, lx, ly);
	}
	drawMinimap(ctx, w, h) {
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
		ctx.strokeStyle = "rgba(107,92,74,0.55)";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		rr(ctx, mx, my, size, size, 10);
		ctx.clip();
		ctx.fillStyle = PAL.asphalt;
		ctx.fillRect(mx, my, size, size);
		ctx.fillStyle = PAL.sidewalk;
		ctx.fillRect(mx, my + 960 * scaleY - 2, size, 4);
		ctx.fillRect(mx + 768 * scaleX - 2, my, 4, size);
		ctx.fillRect(mx + 1632 * scaleX - 2, my, 4, size);
		for (const p of POIS) {
			const isTarget = this.mission.steps[this.mission.activeStep]?.target === p.id;
			ctx.fillStyle = isTarget ? PAL.accent : PAL.wall;
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
		ctx.fillStyle = PAL.accent;
		ctx.beginPath();
		ctx.arc(ppx, ppy, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = PAL.accent;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		const fang = this.facing === "up" ? -Math.PI / 2 : this.facing === "down" ? Math.PI / 2 : this.facing === "left" ? Math.PI : 0;
		ctx.fillStyle = PAL.accent;
		ctx.lineTo(ppx + Math.cos(fang + 2.5) * 4, ppy + Math.sin(fang + 2.5) * 4);
		ctx.lineTo(ppx + Math.cos(fang - 2.5) * 4, ppy + Math.sin(fang - 2.5) * 4);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "rgba(255,255,255,0.55)";
		ctx.font = "600 9px DM Sans, sans-serif";
		ctx.fillText("MEMPHIS 901", 20, my + 14);
	}
	drawNpc(ctx, n) {
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
		ctx.fillStyle = PAL.label;
		ctx.fillText(n.name, x - tw / 2, y - 66);
		if (this.nearNpc === n.id) {
			ctx.strokeStyle = "#1db954";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(x, y + 4, 18, 8, 0, 0, Math.PI * 2);
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
			const h = 80;
			const w = img.width / img.height * h;
			const sx = this.moving ? 1 + Math.sin(this.animT) * .05 : 1;
			const sy = this.moving ? 1 - Math.sin(this.animT) * .05 : 1;
			ctx.save();
			ctx.translate(this.px, y);
			ctx.scale(sx, sy);
			ctx.drawImage(img, -w / 2, -76, w, h);
			ctx.restore();
		} else ctx.fillStyle = PAL.wallAlt;
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
				best: this.ball.best
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
			steps: this.mission.steps.map((s) => ({
				id: s.id,
				label: s.label,
				done: s.done,
				description: s.description
			}))
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
	missionChapter: "CHAPTER 01",
	interactHint: null,
	locationName: "Memphis",
	district: "901",
	dialogue: null,
	shopOpen: false,
	toast: null,
	equipped: null,
	owned: [],
	basketball: null,
	paused: false,
	started: false,
	missionComplete: false,
	cinematic: null,
	letterbox: 0,
	worldHour: 16,
	inputDevice: "keyboard",
	promptButton: "E",
	trophies: [],
	trophyPopup: null,
	pauseTab: "resume",
	settings: {
		master: .85,
		music: .42,
		sfx: .7,
		shake: true,
		rumble: true
	},
	sideMissions: [],
	highScore: 0,
	hasSave: false,
	steps: []
};
function formatHour(h) {
	const hr = Math.floor(h);
	const m = Math.floor((h - hr) * 60);
	const ap = hr >= 12 ? "PM" : "AM";
	return `${hr % 12 === 0 ? 12 : hr % 12}:${m.toString().padStart(2, "0")} ${ap}`;
}
var TABS = [
	{
		id: "resume",
		label: "Resume",
		icon: Play
	},
	{
		id: "map",
		label: "Map",
		icon: Map
	},
	{
		id: "missions",
		label: "Missions",
		icon: Target
	},
	{
		id: "wardrobe",
		label: "Wardrobe",
		icon: Shirt
	},
	{
		id: "trophies",
		label: "Trophies",
		icon: Trophy
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings
	}
];
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(emptyHud);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [bootError, setBootError] = (0, import_react.useState)(null);
	const [titlePhase, setTitlePhase] = (0, import_react.useState)("press");
	const [tip, setTip] = (0, import_react.useState)(TIPS[0]);
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
				setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
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
	const boot = (0, import_react.useCallback)((fresh) => {
		engineRef.current?.start(fresh);
		setHud((h) => ({
			...h,
			started: true
		}));
	}, []);
	(0, import_react.useEffect)(() => {
		if (hud.started || !ready) return;
		const go = (e) => {
			if (e.code === "Tab" || e.code.startsWith("F")) return;
			if (titlePhase === "press") {
				setTitlePhase("choose");
				return;
			}
			if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") boot(false);
		};
		window.addEventListener("keydown", go);
		return () => window.removeEventListener("keydown", go);
	}, [
		hud.started,
		ready,
		titlePhase
	]);
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
			eng.input.touch.mx = dx / len * s;
			eng.input.touch.my = dy / len * s;
		}
		e.preventDefault();
	};
	const onStickEnd = (e) => {
		const eng = engineRef.current;
		if (!eng) return;
		for (const t of Array.from(e.changedTouches)) if (t.identifier === stickRef.current.id) {
			eng.input.touch.mx = 0;
			eng.input.touch.my = 0;
			stickRef.current.id = null;
		}
	};
	const lb = Math.max(0, Math.min(1, hud.letterbox));
	const bar = Math.round(52 * lb);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				style: { imageRendering: "auto" }
			}),
			bar > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 top-0 z-40 bg-black",
				style: { height: bar }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-black",
				style: { height: bar }
			})] }),
			!hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-40 flex flex-col",
				onPointerDown: () => {
					if (titlePhase === "press" && ready) setTitlePhase("choose");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/game/title-key.jpg",
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover",
						crossOrigin: "anonymous"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/20" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 inset-x-0 h-10 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-0 inset-x-0 h-10 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 flex h-full flex-col justify-between px-6 py-10 sm:px-12",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-primary text-lg tracking-[0.35em]",
								children: "SACKRELIGIOUS"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[11px] uppercase tracking-[0.28em] text-muted",
								children: "A Memphis Open World"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-lg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "font-display text-6xl leading-[0.85] text-fg sm:text-8xl",
										children: "MEMPHIS"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 font-display text-3xl text-primary sm:text-4xl",
										children: "901"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-4 max-w-sm text-sm leading-relaxed text-muted",
										children: "Play as Benji. Run Drop Day, ball the 901 Court, earn $ackdollars, and re-up the fit."
									}),
									!ready && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-8 text-sm tracking-widest text-muted",
										children: "LOADING"
									}),
									ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-8 flex flex-col gap-2 max-w-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => boot(false),
											className: "min-h-12 rounded-lg bg-primary px-6 font-display text-2xl text-primary-fg transition hover:brightness-110 active:scale-[0.98]",
											children: "ENTER MEMPHIS"
										}), hud.hasSave && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => boot(true),
											className: "min-h-12 rounded-lg border border-border bg-surface/80 px-6 font-display text-2xl text-fg hover:bg-surface-2",
											children: "NEW GAME"
										})]
									}),
									bootError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm text-danger",
										children: bootError
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-end justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "max-w-sm text-[11px] leading-relaxed text-subtle",
									children: tip
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden text-[11px] text-subtle sm:block",
									children: [
										"WASD move · ",
										hud.promptButton,
										" talk · Shift run · Esc pause · Pad supported"
									]
								})]
							})
						]
					})
				]
			}),
			hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/sack-icon.png",
								alt: "",
								className: "h-7 w-7"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "$ackdollars"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "tabular font-display text-2xl leading-none text-gold",
								children: ["$", hud.sackdollars]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 backdrop-blur-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] uppercase tracking-wider text-muted",
									children: "Respect"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular font-display text-xl leading-none text-gold",
									children: hud.respect
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-px bg-border" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] uppercase tracking-wider text-muted",
									children: "901"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular text-xs font-medium text-fg",
									children: formatHour(hud.worldHour)
								})] })
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-[15rem] rounded-xl border border-border bg-panel px-3 py-2 text-right backdrop-blur-sm sm:max-w-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-[0.18em] text-primary",
								children: hud.missionChapter
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg leading-none text-gold",
								children: hud.missionTitle
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm font-medium leading-snug text-fg",
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
					className: "pointer-events-none absolute left-3 top-[9.6rem] z-20 sm:top-[10.6rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-panel px-3 py-1.5 text-xs text-muted backdrop-blur-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg",
								children: hud.locationName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mx-1.5 text-subtle",
								children: "/"
							}),
							hud.district
						]
					})
				}),
				hud.interactHint && hud.mode === "world" && !hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-[44%] z-20 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 rounded-full border border-primary/35 bg-panel px-4 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1.5 font-display text-sm text-primary-fg",
							children: hud.promptButton
						}), hud.interactHint]
					})
				}),
				hud.toast && !hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-primary/30 bg-surface-2 px-4 py-2 text-sm font-medium text-fg shadow-xl",
						children: hud.toast
					})
				}),
				hud.trophyPopup && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `pointer-events-none absolute z-40 ${hud.basketball ? "left-3 top-[13.5rem]" : "right-3 top-28 sm:top-32"}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 shadow-2xl backdrop-blur-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-wider text-muted",
								children: "Trophy unlocked"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: hud.trophyPopup.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] capitalize text-primary",
								children: hud.trophyPopup.rank
							})
						] })]
					})
				}),
				hud.basketball && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute right-3 top-28 z-20 rounded-xl border border-border bg-panel px-4 py-3 backdrop-blur-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg text-primary",
							children: "901 COURT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "tabular text-3xl font-semibold leading-none text-fg",
							children: hud.basketball.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: [
								hud.basketball.timeLeft,
								"s · ",
								hud.basketball.shots,
								" shots · need 8"
							]
						}),
						hud.basketball.combo > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-display text-xl text-primary",
							children: [
								"x",
								hud.basketball.combo,
								" STREAK"
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
				hud.cinematic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-0 z-30 flex items-end justify-start p-8 sm:p-12",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-[0.28em] text-primary",
						children: hud.cinematic.subtitle
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display mt-1 text-5xl text-fg sm:text-6xl",
						children: hud.cinematic.title
					})] })
				}),
				hud.dialogue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
					role: "dialog",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: advanceDialogue,
						className: "w-full max-w-2xl rounded-2xl border border-border bg-panel p-4 text-left shadow-2xl backdrop-blur-md",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [hud.dialogue.speaker === "K Blanco" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/k-blanco-portrait.png",
								alt: "",
								className: "h-16 w-16 shrink-0 rounded-xl object-cover object-top",
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
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-3 text-xs text-muted",
										children: [hud.promptButton, " continue"]
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
											className: "tabular font-display text-2xl text-gold",
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
													"data-testid": `buy-${item.id}`,
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden",
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
								const eng = engineRef.current;
								if (!eng) return;
								eng.input.touch.shoot = true;
								eng.beginCharge();
							},
							onTouchEnd: (e) => {
								e.preventDefault();
								const eng = engineRef.current;
								if (!eng) return;
								eng.input.touch.shoot = false;
								eng.releaseShot();
							},
							children: "SHOOT"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-fg shadow-lg active:scale-95",
							onClick: () => engineRef.current?.tryInteract(),
							children: hud.promptButton
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block",
					children: [
						"WASD · ",
						hud.promptButton,
						" · Shift · Esc / Start"
					]
				}),
				hud.paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-0 z-50 flex items-stretch bg-bg/80 backdrop-blur-md",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/game/memphis-dusk.jpg",
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover opacity-25",
						crossOrigin: "anonymous"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex w-full max-w-5xl mx-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
							className: "flex w-44 shrink-0 flex-col gap-1 border-r border-border p-4 sm:w-56",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-3 font-display text-2xl text-primary",
								children: "PAUSED"
							}), TABS.map((t) => {
								const Icon = t.icon;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										if (t.id === "resume") engineRef.current?.resume();
										else engineRef.current?.setPauseTab(t.id);
									},
									className: `flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${hud.pauseTab === t.id ? "bg-primary text-primary-fg" : "text-fg hover:bg-surface-2"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), t.label]
								}, t.id);
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1 overflow-y-auto p-5",
							children: [
								hud.pauseTab === "map" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseMap, { district: hud.locationName }),
								hud.pauseTab === "missions" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseMissions, {
									chapter: hud.missionChapter,
									title: hud.missionTitle,
									steps: hud.steps,
									sides: hud.sideMissions
								}),
								hud.pauseTab === "wardrobe" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseWardrobe, {
									owned: hud.owned,
									equipped: hud.equipped,
									onEquip: onBuy
								}),
								hud.pauseTab === "trophies" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseTrophies, { unlocked: hud.trophies }),
								hud.pauseTab === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseSettings, {
									settings: hud.settings,
									onChange: (p) => engineRef.current?.applySettings(p)
								}),
								hud.pauseTab === "resume" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex h-full flex-col justify-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-display text-5xl text-fg",
										children: "MEMPHIS"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-2 text-sm text-muted",
										children: [
											hud.locationName,
											" · ",
											formatHour(hud.worldHour),
											" · High score ",
											hud.highScore
										]
									})]
								})
							]
						})]
					})]
				})
			] })
		]
	});
}
function PauseMap({ district }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: ["City map · ", district]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "MEMPHIS 901"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-2",
			children: POIS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute -translate-x-1/2 -translate-y-1/2 text-center",
				style: {
					left: `${p.x / 3072 * 100}%`,
					top: `${p.y / 2304 * 100}%`
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto h-2.5 w-2.5 rounded-full bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[9px] uppercase tracking-wide text-fg",
					children: p.label
				})]
			}, p.id))
		})
	] });
}
function PauseMissions({ chapter, title, steps, sides }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-primary",
			children: chapter
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 space-y-2",
			children: steps.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `rounded-lg border px-3 py-2 ${s.done ? "border-border bg-surface-2 text-muted" : "border-primary/30 bg-surface text-fg"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium",
					children: s.done ? s.label : s.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: s.description
				})]
			}, s.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 text-[11px] uppercase tracking-wider text-muted",
			children: "Side jobs"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2 space-y-2",
			children: sides.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-sm font-medium ${s.done ? "text-muted" : "text-fg"}`,
					children: s.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: s.description
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "tabular text-xs text-primary",
					children: s.done ? "DONE" : `$${s.reward}`
				})]
			}, s.id))
		})
	] });
}
function PauseWardrobe({ owned, equipped, onEquip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: "Locker"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "WARDROBE"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 grid gap-2",
			children: APPAREL.filter((a) => owned.includes(a.id)).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => onEquip(a.id),
				className: `flex items-center justify-between rounded-lg border px-3 py-2 text-left ${equipped === a.id ? "border-primary bg-primary/10" : "border-border bg-surface-2"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium text-fg",
					children: a.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted",
					children: equipped === a.id ? "Equipped" : "Equip"
				})]
			}, a.id))
		})
	] });
}
function PauseTrophies({ unlocked }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: [
				unlocked.length,
				"/",
				TROPHIES.length,
				" unlocked"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "TROPHIES"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 grid gap-2 sm:grid-cols-2",
			children: TROPHIES.map((t) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `rounded-lg border px-3 py-2 ${unlocked.includes(t.id) ? "border-primary/40 bg-surface" : "border-border bg-surface-2 opacity-60"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-fg",
							children: t.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: t.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[10px] uppercase tracking-wider text-primary",
							children: t.rank
						})
					]
				}, t.id);
			})
		})
	] });
}
function PauseSettings({ settings, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-wider text-muted",
			children: "Audio and feel"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-fg",
			children: "SETTINGS"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 max-w-md space-y-5",
			children: [
				[
					["master", "Master"],
					["music", "Music"],
					["sfx", "Effects"]
				].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-xs uppercase tracking-wider text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "h-3.5 w-3.5" }), label]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 0,
						max: 1,
						step: .01,
						value: settings[key],
						onChange: (e) => onChange({ [key]: Number(e.target.value) }),
						className: "mt-2 w-full accent-primary"
					})]
				}, key)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Camera shake", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: settings.shake,
						onChange: (e) => onChange({ shake: e.target.checked }),
						className: "accent-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Controller rumble", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: settings.rumble,
						onChange: (e) => onChange({ rumble: e.target.checked }),
						className: "accent-primary"
					})]
				})
			]
		})
	] });
}
var SplitComponent = GameApp;
//#endregion
export { SplitComponent as component };
