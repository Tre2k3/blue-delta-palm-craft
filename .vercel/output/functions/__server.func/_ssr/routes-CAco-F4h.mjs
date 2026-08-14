import { r as __toESM } from "../_runtime.mjs";
import { M as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Shirt, c as Map$1, i as SwitchCamera, n as Trophy, o as Settings, r as Target, s as Play, t as Volume2 } from "../_libs/lucide-react.mjs";
import { A as TorusGeometry, C as SRGBColorSpace, D as SpriteMaterial, E as Sprite, O as Texture, S as RepeatWrapping, T as SphereGeometry, _ as MeshBasicMaterial, a as CapsuleGeometry, b as PlaneGeometry, c as CylinderGeometry, d as Group, f as HemisphereLight, g as Mesh, h as LinearMipmapLinearFilter, i as CanvasTexture, j as Vector3, k as TextureLoader, l as DirectionalLight, m as LinearFilter, n as AmbientLight, o as CircleGeometry, p as IcosahedronGeometry, r as BoxGeometry, s as ConeGeometry, t as WebGLRenderer, u as Fog, v as MeshStandardMaterial, w as Scene, x as PointLight, y as PerspectiveCamera } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CAco-F4h.js
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
var BRAND = {
	name: "$ackReligious",
	line: "KLOTHING",
	city: "Memphis",
	zip: "901",
	currency: "$ackdollars"
};
var WORLD_PX_W = 3072;
var WORLD_PX_H = 2304;
var DEFAULT_SETTINGS = {
	master: .85,
	music: .42,
	sfx: .7,
	shake: true,
	rumble: true,
	cameraView: "third"
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
		shoot: false,
		lookX: 0
	};
	device = "keyboard";
	prevShoot = false;
	prevInteract = false;
	prevBack = false;
	prevPause = false;
	prevView = false;
	padInteract = false;
	padBack = false;
	padPause = false;
	padShoot = false;
	padRun = false;
	padMx = 0;
	padMy = 0;
	padLookX = 0;
	lastPad = null;
	mouseDX = 0;
	mouseDY = 0;
	pointerLocked = false;
	padLookY = 0;
	queuedInteract = false;
	queuedPause = false;
	queuedBack = false;
	queuedShootPress = false;
	queuedShootRelease = false;
	queuedView = false;
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
		if (e.code === "KeyV" || e.code === "KeyC") this.queuedView = true;
	};
	ku = (e) => {
		this.keys.delete(e.code);
		if (e.code === "Space" || e.code === "KeyF") this.queuedShootRelease = true;
	};
	blur = () => this.keys.clear();
	mm = (e) => {
		if (this.pointerLocked || e.buttons === 2) {
			this.mouseDX += e.movementX;
			this.mouseDY += e.movementY;
			this.device = "keyboard";
		}
	};
	lock = () => {
		this.pointerLocked = !!document.pointerLockElement;
	};
	bind() {
		window.addEventListener("keydown", this.kd);
		window.addEventListener("keyup", this.ku);
		window.addEventListener("blur", this.blur);
		window.addEventListener("mousemove", this.mm);
		document.addEventListener("pointerlockchange", this.lock);
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("gamepadconnected", () => {
			this.device = "gamepad";
		});
	}
	unbind() {
		window.removeEventListener("keydown", this.kd);
		window.removeEventListener("keyup", this.ku);
		window.removeEventListener("blur", this.blur);
		window.removeEventListener("mousemove", this.mm);
		document.removeEventListener("pointerlockchange", this.lock);
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
		let lookX = 0;
		if (this.keys.has("KeyQ")) lookX -= 1;
		if (this.keys.has("KeyR")) lookX += 1;
		lookX += this.padLookX;
		lookX += this.touch.lookX;
		lookX += this.mouseDX * .045;
		const lookY = this.padLookY + this.mouseDY * .045;
		this.mouseDX = 0;
		this.mouseDY = 0;
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
		const viewHeld = this.keys.has("KeyV") || this.keys.has("KeyC");
		const viewPressed = viewHeld && !this.prevView || this.queuedView;
		this.queuedView = false;
		this.prevView = viewHeld;
		this.prevInteract = interactHeld;
		this.prevBack = backHeld;
		this.prevPause = pauseHeld;
		this.prevShoot = shootHeld;
		return {
			mx,
			my,
			lookX,
			lookY,
			run,
			interact: interactHeld,
			interactPressed,
			backPressed,
			pausePressed,
			shoot: shootHeld,
			shootPressed,
			shootReleased,
			viewPressed
		};
	}
	pollPad() {
		this.padMx = 0;
		this.padMy = 0;
		this.padLookX = 0;
		this.padLookY = 0;
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
			const look = radial(p.axes[2] ?? 0, p.axes[3] ?? 0, .2);
			this.padLookX += look.x;
			this.padLookY += look.y;
			if (p.buttons[11]?.pressed) this.queuedView = true;
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
var MAT_URLS = {
	asphalt: "/game/materials/01_asphalt_basecolor.png",
	sidewalk: "/game/materials/02_sidewalk_basecolor.png",
	brick: "/game/materials/03_old_memphis_brick_basecolor.png",
	windows: "/game/materials/04_window_facade_emissive_reference.png",
	roof: "/game/materials/05_rooftop_tar_gravel_basecolor.png",
	court: "/game/materials/06_court_wood_basecolor.png",
	courtLines: "/game/materials/07_court_lines_and_clay_reference.png",
	canopy: "/game/materials/08_tree_canopy_topdown.png",
	carMetal: "/game/materials/09_dark_car_body_metal_basecolor.png",
	hqBrick: "/game/materials/10_hq_beale_dark_brick_accent.png",
	fence: "/game/materials/11_chain_link_fence.png",
	stripe: "/game/materials/12_asphalt_road_stripe.png",
	concrete: "/game/materials/13_polished_warm_concrete.png",
	wood: "/game/materials/14_dark_wood_panel.png",
	shutter: "/game/materials/15_rollup_metal_shutter.png",
	stucco: "/game/materials/16_weathered_stucco.png",
	cinder: "/game/materials/17_green_cinder_block_wall.png",
	storefront: "/game/materials/18_storefront_window_grid.png",
	charcoal: "/game/materials/19_charcoal_metal_surface.png",
	fabric: "/game/materials/20_green_gold_fabric_stripe.png"
};
var cache = /* @__PURE__ */ new Map();
var maxAniso = 4;
function setAnisotropy(n) {
	maxAniso = n;
}
function prep(tex, repeatX, repeatY) {
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = maxAniso;
	tex.generateMipmaps = true;
	tex.minFilter = LinearMipmapLinearFilter;
	tex.magFilter = LinearFilter;
	tex.repeat.set(repeatX, repeatY);
	tex.needsUpdate = true;
	return tex;
}
async function loadTexture(url, rx = 1, ry = 1) {
	const key = `${url}|${rx}|${ry}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const loader = new TextureLoader();
	const tex = await new Promise((resolve, reject) => {
		loader.load(url, resolve, void 0, () => reject(/* @__PURE__ */ new Error(`texture ${url}`)));
	});
	prep(tex, rx, ry);
	cache.set(key, tex);
	return tex;
}
async function loadAllMaterials(onProgress) {
	const keys = Object.keys(MAT_URLS);
	const out = {};
	let done = 0;
	for (const k of keys) {
		try {
			out[k] = await loadTexture(MAT_URLS[k], 1, 1);
		} catch {
			out[k] = new Texture();
		}
		done += 1;
		onProgress?.(done, keys.length);
	}
	return out;
}
function std(map, opts = {}) {
	const tex = map?.clone();
	if (tex && opts.repeat) {
		tex.wrapS = RepeatWrapping;
		tex.wrapT = RepeatWrapping;
		tex.repeat.set(opts.repeat[0], opts.repeat[1]);
		tex.needsUpdate = true;
	}
	return new MeshStandardMaterial({
		map: tex,
		color: opts.color ?? 16777215,
		roughness: opts.roughness ?? .86,
		metalness: opts.metalness ?? .04,
		emissive: opts.emissive ?? 0,
		emissiveIntensity: opts.emissiveIntensity ?? 0,
		transparent: opts.transparent ?? false,
		opacity: opts.opacity ?? 1
	});
}
var S = 1 / 16;
function wx(x) {
	return x * S;
}
function wz(y) {
	return y * S;
}
function hash(n) {
	const x = Math.sin(n * 127.1) * 43758.5453;
	return x - Math.floor(x);
}
function makeSkyTex() {
	const c = document.createElement("canvas");
	c.width = 8;
	c.height = 256;
	const g = c.getContext("2d");
	const grd = g.createLinearGradient(0, 0, 0, 256);
	grd.addColorStop(0, "#1a1520");
	grd.addColorStop(.32, "#3a2a28");
	grd.addColorStop(.58, "#c47848");
	grd.addColorStop(.76, "#f2c66a");
	grd.addColorStop(1, "#1a1612");
	g.fillStyle = grd;
	g.fillRect(0, 0, 8, 256);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	return tex;
}
var World3D = class {
	renderer;
	scene = new Scene();
	camera = new PerspectiveCamera(68, 1, .12, 420);
	player;
	sprite;
	ball;
	ballShadow;
	hoopRim;
	cars = [];
	peds = [];
	npcSprites = /* @__PURE__ */ new Map();
	sun;
	overlay;
	mats = {};
	spriteMats = {};
	clock = 0;
	tmp = new Vector3();
	camPos = new Vector3();
	constructor(canvas) {
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance",
			alpha: false
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
		this.renderer.setClearColor(1709586, 1);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = 2;
		this.renderer.toneMapping = 4;
		this.renderer.toneMappingExposure = 1.12;
		this.renderer.outputColorSpace = SRGBColorSpace;
		setAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
		this.overlay = document.createElement("canvas");
		this.overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
		canvas.parentElement?.appendChild(this.overlay);
		this.scene.fog = new Fog(3811874, 22, 145);
		this.scene.background = makeSkyTex();
		const hemi = new HemisphereLight(16763e3, 2761756, .82);
		this.scene.add(hemi);
		this.scene.add(new AmbientLight(4864040, .42));
		this.sun = new DirectionalLight(16763e3, 1.45);
		this.sun.position.set(-52, 28, -18);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		this.sun.shadow.camera.near = 4;
		this.sun.shadow.camera.far = 160;
		this.sun.shadow.camera.left = -70;
		this.sun.shadow.camera.right = 70;
		this.sun.shadow.camera.top = 70;
		this.sun.shadow.camera.bottom = -70;
		this.sun.shadow.bias = -8e-4;
		this.scene.add(this.sun);
		this.scene.add(this.sun.target);
		this.buildSky();
		this.player = new Group();
		this.sprite = new Sprite(new SpriteMaterial({
			color: 16777215,
			transparent: true
		}));
		this.sprite.scale.set(1.15, 1.85, 1);
		this.sprite.position.y = .95;
		this.player.add(this.sprite);
		const contact = new Mesh(new CircleGeometry(.32, 16), new MeshBasicMaterial({
			color: 0,
			transparent: true,
			opacity: .32,
			depthWrite: false
		}));
		contact.rotation.x = -Math.PI / 2;
		contact.position.y = .02;
		this.player.add(contact);
		this.scene.add(this.player);
		this.ball = new Mesh(new SphereGeometry(.12, 20, 16), new MeshStandardMaterial({
			color: 12872242,
			roughness: .55,
			metalness: .05
		}));
		this.ball.castShadow = true;
		this.scene.add(this.ball);
		this.ballShadow = new Mesh(new CircleGeometry(.14, 16), new MeshBasicMaterial({
			color: 0,
			transparent: true,
			opacity: .35,
			depthWrite: false
		}));
		this.ballShadow.rotation.x = -Math.PI / 2;
		this.scene.add(this.ballShadow);
		this.hoopRim = new Mesh(new TorusGeometry(.23, .028, 10, 24));
		this.camera.position.set(10, 8, 18);
	}
	async loadTextures(onProgress) {
		try {
			this.mats = await loadAllMaterials(onProgress);
		} catch {
			this.mats = {};
		}
	}
	buildSky() {
		const sky = new Mesh(new SphereGeometry(200, 24, 16), new MeshBasicMaterial({
			map: makeSkyTex(),
			side: 1,
			fog: false,
			depthWrite: false
		}));
		this.scene.add(sky);
		const sunDisk = new Mesh(new SphereGeometry(6.5, 16, 12), new MeshBasicMaterial({
			color: 16764810,
			fog: false,
			toneMapped: false
		}));
		sunDisk.position.set(-78, 22, -86);
		this.scene.add(sunDisk);
		const glow = new Mesh(new SphereGeometry(16, 16, 12), new MeshBasicMaterial({
			color: 16751178,
			transparent: true,
			opacity: .26,
			fog: false,
			depthWrite: false
		}));
		glow.position.copy(sunDisk.position);
		this.scene.add(glow);
	}
	t(key) {
		return this.mats[key];
	}
	buildCity(walls, trees) {
		this.buildGround();
		const wallMat = std(this.t("brick"), {
			roughness: .88,
			repeat: [2.4, 1.6]
		});
		const stuccoMat = std(this.t("stucco"), {
			roughness: .9,
			repeat: [2, 1.4]
		});
		const facadeMat = std(this.t("windows"), {
			roughness: .5,
			metalness: .08,
			emissive: 15910506,
			emissiveIntensity: .38,
			repeat: [2, 2]
		});
		const roofMat = std(this.t("roof"), {
			roughness: .92,
			repeat: [2, 2]
		});
		const shutterMat = std(this.t("shutter"), {
			roughness: .5,
			metalness: .5,
			repeat: [1, 1]
		});
		for (const wall of walls) {
			if (wall.w >= 3068 || wall.h >= 2300) continue;
			const bw = Math.max(wx(wall.w), 1.6);
			const bd = Math.max(wz(wall.h), 1.6);
			const stories = 1.8 + hash(wall.x * 3 + wall.y) * 7.5;
			const g = new Group();
			const body = new Mesh(new BoxGeometry(bw, stories, bd), hash(wall.x) > .45 ? stuccoMat : wallMat);
			body.position.y = stories / 2;
			body.castShadow = true;
			body.receiveShadow = true;
			g.add(body);
			const face = new Mesh(new PlaneGeometry(bw * .92, stories * .78), facadeMat);
			face.position.set(0, stories * .52, bd / 2 + .03);
			g.add(face);
			if (stories > 3) {
				const shut = new Mesh(new PlaneGeometry(bw * .5, 1.1), shutterMat);
				shut.position.set(0, 1, bd / 2 + .04);
				g.add(shut);
			}
			const roof = new Mesh(new BoxGeometry(bw + .18, .18, bd + .18), roofMat);
			roof.position.y = stories + .08;
			roof.castShadow = true;
			g.add(roof);
			g.position.set(wx(wall.x + wall.w / 2), 0, wz(wall.y + wall.h / 2));
			this.scene.add(g);
		}
		const hqMat = std(this.t("hqBrick"), {
			roughness: .82,
			repeat: [2, 1.6]
		});
		const woodMat = std(this.t("wood"), {
			roughness: .65,
			repeat: [1.4, 1]
		});
		const fabricMat = std(this.t("fabric"), {
			roughness: .88,
			repeat: [2, 1]
		});
		const storefrontMat = std(this.t("storefront"), {
			roughness: .25,
			metalness: .15,
			emissive: 15910506,
			emissiveIntensity: .22,
			repeat: [1.2, 1]
		});
		const cinderMat = std(this.t("cinder"), {
			roughness: .88,
			repeat: [2, 1.4]
		});
		for (const poi of POIS) {
			if (poi.id === "court" || poi.id === "river") continue;
			if (poi.id === "pyramid") {
				const pyr = new Mesh(new ConeGeometry(wx(poi.w) * .62, 14, 4), std(this.t("concrete"), {
					roughness: .7,
					metalness: .08,
					repeat: [2, 2]
				}));
				pyr.position.set(wx(poi.x + poi.w / 2), 7, wz(poi.y + poi.h / 2));
				pyr.rotation.y = Math.PI / 4;
				pyr.castShadow = true;
				this.scene.add(pyr);
				continue;
			}
			if (poi.id === "dropvan") {
				this.scene.add(this.makeVan(wx(poi.x + poi.w / 2), wz(poi.y + poi.h / 2)));
				continue;
			}
			const h = poi.id === "store" ? 6.6 : poi.id === "beale" ? 5.4 : 4.6 + hash(poi.x) * 3;
			const g = new Group();
			const bodyMat = poi.id === "store" || poi.id === "beale" ? hqMat : poi.id === "culture" ? woodMat : cinderMat;
			const body = new Mesh(new BoxGeometry(wx(poi.w), h, wz(poi.h)), bodyMat);
			body.position.y = h / 2;
			body.castShadow = true;
			body.receiveShadow = true;
			g.add(body);
			const glass = new Mesh(new PlaneGeometry(wx(poi.w) * .72, 1.8), storefrontMat);
			glass.position.set(0, 1.4, wz(poi.h) / 2 + .05);
			g.add(glass);
			const sign = new Mesh(new BoxGeometry(wx(poi.w) * .55, .38, .1), new MeshStandardMaterial({
				color: poi.id === "store" ? 1947988 : 13938487,
				emissive: poi.id === "store" ? 1947988 : 13938487,
				emissiveIntensity: .55
			}));
			sign.position.set(0, h * .72, wz(poi.h) / 2 + .08);
			g.add(sign);
			const awning = new Mesh(new BoxGeometry(wx(poi.w) * .95, .1, .72), fabricMat);
			awning.position.set(0, 2.2, wz(poi.h) / 2 + .28);
			g.add(awning);
			g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
			this.scene.add(g);
		}
		const trunkMat = std(this.t("wood"), {
			roughness: .95,
			color: 9071176,
			repeat: [1, 2]
		});
		const leafMat = std(this.t("canopy"), {
			roughness: .88,
			color: 16777215
		});
		for (const t of trees) {
			const g = new Group();
			const trunk = new Mesh(new CylinderGeometry(.12, .18, 1.1, 6), trunkMat);
			trunk.position.y = .55;
			trunk.castShadow = true;
			g.add(trunk);
			const leaf = new Mesh(new IcosahedronGeometry(.88, 0), leafMat);
			leaf.position.y = 1.55;
			leaf.castShadow = true;
			g.add(leaf);
			g.position.set(wx(t.x), 0, wz(t.y));
			this.scene.add(g);
		}
		const poleMat = std(this.t("charcoal"), {
			metalness: .55,
			roughness: .4
		});
		for (let i = 3; i < 60; i += 7) for (const yt of [
			6,
			20,
			34
		]) {
			const g = new Group();
			const pole = new Mesh(new CylinderGeometry(.05, .07, 3.4, 6), poleMat);
			pole.position.y = 1.7;
			g.add(pole);
			const lamp = new Mesh(new SphereGeometry(.16, 10, 8), new MeshStandardMaterial({
				color: 15910506,
				emissive: 16757575,
				emissiveIntensity: 1.5
			}));
			lamp.position.y = 3.35;
			g.add(lamp);
			if ((i + yt) % 21 === 3) {
				const light = new PointLight(16757575, 2, 14, 2);
				light.position.y = 3.3;
				g.add(light);
			}
			g.position.set(wx(i * 48 + 12), 0, wz(yt * 48 + 10));
			this.scene.add(g);
		}
		this.buildCourt();
	}
	buildGround() {
		const asphaltMat = std(this.t("asphalt"), {
			roughness: .94,
			metalness: .02,
			repeat: [36, 28]
		});
		const ground = new Mesh(new PlaneGeometry(wx(WORLD_PX_W) + 20, wz(WORLD_PX_H) + 20), asphaltMat);
		ground.rotation.x = -Math.PI / 2;
		ground.position.set(wx(WORLD_PX_W) / 2, 0, wz(WORLD_PX_H) / 2);
		ground.receiveShadow = true;
		this.scene.add(ground);
		const sidewalkMat = std(this.t("sidewalk"), {
			roughness: .9,
			repeat: [18, 2]
		});
		const mkWalk = (x, z, w, d) => {
			const m = new Mesh(new BoxGeometry(w, .08, d), sidewalkMat);
			m.position.set(x, .04, z);
			m.receiveShadow = true;
			this.scene.add(m);
		};
		mkWalk(wx(WORLD_PX_W) / 2, wz(960), wx(WORLD_PX_W), 2.4);
		mkWalk(wx(WORLD_PX_W) / 2, wz(288), wx(WORLD_PX_W), 2.2);
		mkWalk(wx(WORLD_PX_W) / 2, wz(1632), wx(WORLD_PX_W), 2.2);
		mkWalk(wx(768), wz(WORLD_PX_H) / 2, 2.2, wz(WORLD_PX_H));
		mkWalk(wx(1632), wz(WORLD_PX_H) / 2, 2.2, wz(WORLD_PX_H));
		const stripeMat = std(this.t("stripe"), {
			roughness: .85,
			repeat: [8, 1]
		});
		for (let i = 0; i < 28; i++) {
			const dash = new Mesh(new BoxGeometry(1.6, .03, .16), stripeMat);
			dash.position.set(6 + i * 6.4, .07, wz(960));
			this.scene.add(dash);
		}
	}
	makeVan(x, z) {
		const g = new Group();
		const metal = std(this.t("carMetal"), {
			roughness: .38,
			metalness: .62,
			color: 1710102
		});
		const body = new Mesh(new BoxGeometry(3.1, 1.7, 1.7), metal);
		body.position.y = 1.05;
		body.castShadow = true;
		g.add(body);
		const cab = new Mesh(new BoxGeometry(1, .85, 1.62), new MeshStandardMaterial({
			color: 1713196,
			roughness: .2,
			metalness: .35
		}));
		cab.position.set(1.15, 1.45, 0);
		g.add(cab);
		const stripe = new Mesh(new BoxGeometry(3.12, .22, 1.72), new MeshStandardMaterial({
			color: 1947988,
			emissive: 1947988,
			emissiveIntensity: .35
		}));
		stripe.position.y = 1.35;
		g.add(stripe);
		this.addWheels(g, 1.15, .62);
		const hl = new Mesh(new BoxGeometry(.08, .14, .28), new MeshStandardMaterial({
			color: 16773576,
			emissive: 16769162,
			emissiveIntensity: .9
		}));
		hl.position.set(1.58, .95, .48);
		g.add(hl);
		const hl2 = hl.clone();
		hl2.position.z = -.48;
		g.add(hl2);
		g.position.set(x, 0, z);
		return g;
	}
	addWheels(g, ax, az) {
		const tire = new MeshStandardMaterial({
			color: 1118481,
			roughness: .9
		});
		const geo = new CylinderGeometry(.28, .28, .18, 10);
		const spots = [
			[ax, az],
			[ax, -az],
			[-ax, az],
			[-ax, -az]
		];
		for (const [x, z] of spots) {
			const w = new Mesh(geo, tire);
			w.rotation.z = Math.PI / 2;
			w.position.set(x * .7, .28, z);
			g.add(w);
		}
	}
	buildCourt() {
		const court = POIS.find((p) => p.id === "court");
		const cx = wx(court.x + court.w / 2);
		const cz = wz(court.y + court.h / 2);
		const cw = wx(court.w);
		const cd = wz(court.h);
		const floor = new Mesh(new BoxGeometry(cw, .1, cd), std(this.t("court"), {
			roughness: .76,
			repeat: [3, 2.4]
		}));
		floor.position.set(cx, .06, cz);
		floor.receiveShadow = true;
		this.scene.add(floor);
		const lines = new Mesh(new BoxGeometry(2.7, .04, 3.5), std(this.t("courtLines"), {
			roughness: .72,
			repeat: [1, 1]
		}));
		lines.position.set(cx, .13, wz(court.y) + 2.2);
		this.scene.add(lines);
		const fenceMat = std(this.t("fence"), {
			roughness: .45,
			metalness: .35,
			transparent: true,
			opacity: .72,
			repeat: [4, 1.2]
		});
		for (const [dx, dz, rw, rd] of [
			[
				0,
				-cd / 2 - .05,
				cw,
				.06
			],
			[
				-cw / 2 - .05,
				0,
				.06,
				cd
			],
			[
				cw / 2 + .05,
				0,
				.06,
				cd
			]
		]) {
			const f = new Mesh(new BoxGeometry(rw, 1.6, rd), fenceMat);
			f.position.set(cx + dx, .85, cz + dz);
			this.scene.add(f);
		}
		const hoopZ = wz(court.y + 26);
		const pole = new Mesh(new CylinderGeometry(.08, .1, 3.15, 8), std(this.t("charcoal"), {
			metalness: .65,
			roughness: .3
		}));
		pole.position.set(cx, 1.58, hoopZ - .55);
		pole.castShadow = true;
		this.scene.add(pole);
		const board = new Mesh(new BoxGeometry(1.85, 1.15, .08), new MeshStandardMaterial({
			color: 15921128,
			roughness: .35,
			metalness: .05
		}));
		board.position.set(cx, 3.15, hoopZ - .42);
		this.scene.add(board);
		const square = new Mesh(new BoxGeometry(.55, .42, .02), new MeshBasicMaterial({ color: 15228236 }));
		square.position.set(cx, 2.95, hoopZ - .37);
		this.scene.add(square);
		this.hoopRim = new Mesh(new TorusGeometry(.23, .028, 10, 24), new MeshStandardMaterial({
			color: 15357964,
			metalness: .55,
			roughness: .25,
			emissive: 3806216,
			emissiveIntensity: .2
		}));
		this.hoopRim.rotation.x = Math.PI / 2;
		this.hoopRim.position.set(cx, 2.72, hoopZ);
		this.scene.add(this.hoopRim);
		const net = new Mesh(new CylinderGeometry(.22, .14, .42, 10, 3, true), new MeshBasicMaterial({
			color: 15262422,
			transparent: true,
			opacity: .55,
			wireframe: true
		}));
		net.position.set(cx, 2.48, hoopZ);
		this.scene.add(net);
		return this.hoopRim;
	}
	matFor(img, key) {
		if (this.spriteMats[key]) return this.spriteMats[key];
		const tex = new Texture(img);
		tex.needsUpdate = true;
		tex.colorSpace = SRGBColorSpace;
		const mat = new SpriteMaterial({
			map: tex,
			transparent: true,
			depthWrite: false
		});
		this.spriteMats[key] = mat;
		return mat;
	}
	ensureCars(n) {
		const metal = std(this.t("carMetal"), {
			roughness: .36,
			metalness: .58
		});
		while (this.cars.length < n) {
			const g = new Group();
			const body = new Mesh(new BoxGeometry(1.85, .48, .86), metal.clone());
			body.position.y = .42;
			body.castShadow = true;
			g.add(body);
			const cabin = new Mesh(new BoxGeometry(.72, .34, .78), new MeshStandardMaterial({
				color: 1713196,
				roughness: .18,
				metalness: .32
			}));
			cabin.position.set(-.12, .74, 0);
			g.add(cabin);
			this.addWheels(g, .7, .42);
			const hl = new Mesh(new BoxGeometry(.06, .1, .16), new MeshStandardMaterial({
				color: 16773576,
				emissive: 16769162,
				emissiveIntensity: .8
			}));
			hl.position.set(.94, .42, .28);
			g.add(hl);
			const hl2 = hl.clone();
			hl2.position.z = -.28;
			g.add(hl2);
			const tl = new Mesh(new BoxGeometry(.05, .08, .14), new MeshStandardMaterial({
				color: 16726832,
				emissive: 16722458,
				emissiveIntensity: .55
			}));
			tl.position.set(-.94, .42, .28);
			g.add(tl);
			const tl2 = tl.clone();
			tl2.position.z = -.28;
			g.add(tl2);
			const sh = new Mesh(new CircleGeometry(.85, 12), new MeshBasicMaterial({
				color: 0,
				transparent: true,
				opacity: .28,
				depthWrite: false
			}));
			sh.rotation.x = -Math.PI / 2;
			sh.position.y = .02;
			g.add(sh);
			this.scene.add(g);
			this.cars.push(g);
		}
	}
	ensurePeds(n) {
		while (this.peds.length < n) {
			const g = new Group();
			const body = new Mesh(new CapsuleGeometry(.18, .62, 4, 8), new MeshStandardMaterial({
				color: 9076852,
				roughness: .8
			}));
			body.position.y = .78;
			body.castShadow = true;
			g.add(body);
			const head = new Mesh(new SphereGeometry(.16, 8, 8), new MeshStandardMaterial({
				color: 12888194,
				roughness: .7
			}));
			head.position.y = 1.28;
			g.add(head);
			this.scene.add(g);
			this.peds.push(g);
		}
	}
	sync(f) {
		this.clock = f.clock;
		const x = wx(f.px);
		const z = wz(f.py);
		this.player.position.set(x, 0, z);
		const key = f.facing === "up" ? "back" : f.facing === "down" ? "front" : f.facing === "left" ? "left" : "right";
		const img = f.images[key] ?? f.images.front;
		if (img) this.sprite.material = this.matFor(img, key);
		this.sprite.visible = f.cameraView === "third";
		this.sprite.position.y = .95 + f.bob * .02;
		const by = Math.max(.12, f.ball.z * (2.72 / 86));
		if (f.mode === "basketball" && (f.ball.inFlight || !f.ball.held || f.cameraView === "third")) {
			this.ball.visible = !(f.ball.held && f.cameraView === "first");
			this.ball.position.set(wx(f.ball.x), by, wz(f.ball.y));
			this.ballShadow.visible = this.ball.visible;
			this.ballShadow.position.set(wx(f.ball.x), .08, wz(f.ball.y));
			this.ballShadow.material.opacity = .32 * (1 - Math.min(by / 4, .8));
		} else {
			this.ball.visible = false;
			this.ballShadow.visible = false;
		}
		this.ensureCars(f.cars.length);
		for (let i = 0; i < this.cars.length; i++) {
			const c = f.cars[i];
			const g = this.cars[i];
			if (!c) {
				g.visible = false;
				continue;
			}
			g.visible = true;
			g.position.set(wx(c.x), 0, wz(c.y));
			g.rotation.y = Math.abs(c.vy) > Math.abs(c.vx) ? c.vy > 0 ? 0 : Math.PI : c.vx < 0 ? Math.PI / 2 : -Math.PI / 2;
			g.children[0].material.color.set(c.color);
		}
		this.ensurePeds(f.peds.length);
		for (let i = 0; i < this.peds.length; i++) {
			const p = f.peds[i];
			const g = this.peds[i];
			if (!p) {
				g.visible = false;
				continue;
			}
			g.visible = true;
			g.position.set(wx(p.x), 0, wz(p.y));
			g.children[0].material.color.set(p.color);
		}
		for (const n of f.npcs) {
			let s = this.npcSprites.get(n.id);
			if (!s) {
				const mat = new SpriteMaterial({
					color: n.isK ? 16777215 : 12892328,
					transparent: true
				});
				if (n.isK && f.images.k) {
					const tex = new Texture(f.images.k);
					tex.needsUpdate = true;
					tex.colorSpace = SRGBColorSpace;
					mat.map = tex;
				}
				s = new Sprite(mat);
				s.scale.set(n.isK ? 1.2 : 1.05, n.isK ? 1.85 : 1.65, 1);
				this.scene.add(s);
				this.npcSprites.set(n.id, s);
			}
			s.position.set(wx(n.x), .92, wz(n.y));
		}
		const fwdX = -Math.sin(f.yaw);
		const fwdZ = -Math.cos(f.yaw);
		const shake = f.trauma * f.trauma;
		const sx = Math.sin(f.clock * 47) * shake * .12;
		const sy = Math.cos(f.clock * 39) * shake * .08;
		if (f.cameraView === "first") {
			this.camera.position.set(x + sx, 1.68 + f.bob * .012, z + sy);
			const ly = Math.sin(f.pitch);
			const lh = Math.cos(f.pitch);
			this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8, z + fwdZ * lh * 8);
			this.camera.fov = f.mode === "basketball" ? 74 : 70;
		} else {
			this.camPos.set(x - fwdX * 5.6 + sx, 2.35, z - fwdZ * 5.6 + sy);
			this.camera.position.lerp(this.camPos, .18);
			this.camera.lookAt(x, 1.28, z);
			this.camera.fov = 62;
		}
		this.sun.target.position.set(x, 0, z);
	}
	render(w, h) {
		if (w < 2 || h < 2) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
		if (this.renderer.domElement.width !== Math.floor(w * dpr) || this.renderer.domElement.height !== Math.floor(h * dpr)) {
			this.renderer.setSize(w, h, false);
			this.overlay.width = Math.floor(w * dpr);
			this.overlay.height = Math.floor(h * dpr);
			this.overlay.style.width = `${w}px`;
			this.overlay.style.height = `${h}px`;
		}
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.render(this.scene, this.camera);
	}
	dispose() {
		this.renderer.dispose();
		this.overlay.remove();
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
	yaw = 0;
	pitch = 0;
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
	onLoad = null;
	hudAcc = 0;
	clock = 0;
	mapCanvas = null;
	leftSpawn = false;
	hasSave = false;
	world3d = null;
	constructor(canvas) {
		this.canvas = canvas;
		this.world3d = new World3D(canvas);
		this.ctx = this.world3d.overlay.getContext("2d");
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
		await this.world3d?.loadTextures((d, t) => this.onLoad?.(d / t));
		this.world3d?.buildCity(this.walls, this.trees);
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
			"#1db954",
			"#111111",
			"#e5e5e5",
			"#3b82f6",
			"#b91c1c",
			"#854d0e"
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
			"#d6d3d1",
			"#a8a29e",
			"#78716c",
			"#1db954",
			"#44403c",
			"#fafaf9"
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
		g.globalAlpha = .16;
		g.fillStyle = "#1db954";
		g.beginPath();
		g.arc(store.x + store.w / 2, store.y + store.h + 50, 40, 0, Math.PI * 2);
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
			getSpeed: () => Math.hypot(this.vx, this.vy),
			getFacing: () => this.facing,
			setKeys: (codes) => {
				this.input.keys.clear();
				for (const c of codes) this.input.keys.add(c);
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
				vy: this.vy
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
		if (act.viewPressed) this.toggleView();
		if (Math.abs(act.lookX) <= 1.25) this.yaw -= act.lookX * 2.2 * dt;
		else this.yaw -= act.lookX * .032;
		if (Math.abs(act.lookY) <= 1.25) this.pitch -= act.lookY * 1.7 * dt;
		else this.pitch -= act.lookY * .028;
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
			this.updatePlayer(dt, act.mx, act.my, act.run);
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
	toggleView() {
		this.settings.cameraView = this.settings.cameraView === "first" ? "third" : "first";
		this.showToast(this.settings.cameraView === "first" ? "First person" : "Third person", 1.4);
		audio.ui();
		this.save();
		this.emitHud();
	}
	fwd() {
		return {
			x: -Math.sin(this.yaw),
			y: -Math.cos(this.yaw)
		};
	}
	right() {
		return {
			x: Math.cos(this.yaw),
			y: -Math.sin(this.yaw)
		};
	}
	applyYawToFacing() {
		this.facingFromAngle(this.yaw);
	}
	facingFromAngle(angle) {
		const a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
		if (a >= Math.PI * 1.75 || a < Math.PI * .25) this.facing = "up";
		else if (a < Math.PI * .75) this.facing = "right";
		else if (a < Math.PI * 1.25) this.facing = "down";
		else this.facing = "left";
		this.dir = this.facing;
	}
	updatePlayer(dt, mx, my, runHeld) {
		const f = this.fwd();
		const r = this.right();
		const len = Math.hypot(mx, my);
		let wx = 0;
		let wy = 0;
		if (len > .01) {
			mx /= len;
			my /= len;
			wx = mx * r.x + -my * f.x;
			wy = mx * r.y + -my * f.y;
			this.moving = true;
			this.leftSpawn = true;
			audio.foot(this.clock);
		} else this.moving = false;
		const speed = runHeld ? 268 : 168;
		this.vx = wx * speed;
		this.vy = wy * speed;
		if (Math.abs(this.vx) > Math.abs(this.vy) && Math.abs(this.vx) > 1) {
			this.facing = this.vx < 0 ? "left" : "right";
			this.dir = this.facing;
		} else if (Math.abs(this.vy) > 1) {
			this.facing = this.vy < 0 ? "up" : "down";
			this.dir = this.facing;
		}
		const rad = 14;
		let nx = this.px + this.vx * dt;
		let ny = this.py + this.vy * dt;
		if (this.mode === "basketball") {
			const court = POIS.find((p) => p.id === "court");
			nx = clamp(nx, court.x + 18, court.x + court.w - 18);
			ny = clamp(ny, court.y + 36, court.y + court.h - 16);
		} else {
			nx = clamp(nx, 62, WORLD_PX_W - 48 - rad);
			ny = clamp(ny, 62, WORLD_PX_H - 48 - rad);
		}
		if (!this.collides(nx, this.py, rad)) this.px = nx;
		if (!this.collides(this.px, ny, rad)) this.py = ny;
		this.animT += dt * (this.moving ? 9 : 2);
		this.bob = this.moving ? Math.sin(this.animT * 2) * 3.2 : Math.sin(this.animT) * .6;
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
		this.input.prompt(this.input.device).interact;
		if (this.nearNpc) {
			const name = NPCS.find((x) => x.id === this.nearNpc).name;
			this.interactHint = `Talk to ${name}`;
		} else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
		else if (this.nearPoi === "court") this.interactHint = "Play basketball";
		else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
		else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi).name}`;
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
		this.float(`+$${s.reward}`, "#1db954");
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
		this.burst(this.px, this.py - 20, "#1db954");
		this.float(`+$${step.reward}`, "#1db954");
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
		const court = POIS.find((p) => p.id === "court");
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h - 58;
		this.yaw = 0;
		this.pitch = .12;
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
		this.showToast("Move · look · V camera · hold shoot");
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
			this.float(`+$${pay}`, "#1db954");
			this.showToast(`Court payout: +$${pay} $ackdollars`);
			audio.cash();
		}
		this.mode = "world";
		this.ball.active = false;
		this.ball.charging = false;
		this.ball.inFlight = false;
		this.ball.held = true;
		const court = POIS.find((p) => p.id === "court");
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h + 30;
		this.save();
		this.emitHud();
	}
	hoop() {
		const court = POIS.find((p) => p.id === "court");
		return {
			x: court.x + court.w / 2,
			y: court.y + 26,
			z: 86,
			court
		};
	}
	updateBasketball(dt) {
		this.ball.timeLeft -= dt;
		if (this.ball.flash > 0) this.ball.flash -= dt;
		if (this.ball.timeLeft <= 0) {
			this.ball.timeLeft = 0;
			this.exitBasketball();
			return;
		}
		if (this.ball.charging && this.ball.held) this.ball.power = Math.min(1, this.ball.power + dt * .78);
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
					const pts = this.ball.shotDist > 158 ? 3 : 2;
					const perfect = this.ball.grade === "PERFECT";
					this.ball.score += perfect ? pts + 1 : pts;
					this.ball.combo += 1;
					this.ball.best = Math.max(this.ball.best, this.ball.combo);
					this.ball.flash = .5;
					this.burst(hoop.x, hoop.y, PAL.gold);
					this.float(perfect ? `SWISH +${pts + 1}` : `+${pts}`, PAL.gold, hoop.x, hoop.y);
					this.addTrauma(perfect ? .45 : .28);
					this.hitstop = perfect ? .07 : .04;
					audio.swish();
					if (this.settings.rumble) this.input.rumble(perfect ? 140 : 80, .3, .55);
					this.tryCreditBasketball();
					this.ball.inFlight = false;
					this.ball.ballVz = -40;
					this.ball.ballVx *= .2;
					this.ball.ballVy *= .2;
				} else if (planar < 20) {
					this.ball.combo = 0;
					this.burst(hoop.x, hoop.y, "#e85d4c");
					this.float("RIM", "#e85d4c", hoop.x, hoop.y);
					audio.rim();
					this.addTrauma(.18);
					const nx = dx / (planar || 1);
					const ny = dy / (planar || 1);
					this.ball.ballVx = nx * 90;
					this.ball.ballVy = ny * 90;
					this.ball.ballVz = Math.abs(this.ball.ballVz) * .35 + 40;
				}
			}
			if (this.ball.ballY < hoop.y - 6 && this.ball.ballZ > 50 && this.ball.ballZ < 120 && Math.abs(dx) < 28 && this.ball.ballVy < 0) {
				this.ball.ballVy = Math.abs(this.ball.ballVy) * .45;
				this.ball.ballVx *= .7;
				audio.rim();
			}
			const court = hoop.court;
			if (this.ball.ballX < court.x + 6 || this.ball.ballX > court.x + court.w - 6) {
				this.ball.ballVx *= -.4;
				this.ball.ballX = clamp(this.ball.ballX, court.x + 6, court.x + court.w - 6);
			}
			if (this.ball.ballY < court.y + 8 || this.ball.ballY > court.y + court.h - 8) {
				this.ball.ballVy *= -.4;
				this.ball.ballY = clamp(this.ball.ballY, court.y + 8, court.y + court.h - 8);
			}
		}
		if (this.ball.ballZ <= 8) {
			this.ball.ballZ = 8;
			if (Math.abs(this.ball.ballVz) > 80) {
				this.ball.ballVz = Math.abs(this.ball.ballVz) * .48;
				this.ball.ballVx *= .72;
				this.ball.ballVy *= .72;
				audio.bounce();
			} else {
				this.ball.ballVz = 0;
				this.ball.ballVx *= .9;
				this.ball.ballVy *= .9;
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
		const perfect = pwr >= .54 && pwr <= .76;
		const good = pwr >= .42 && pwr <= .88;
		this.ball.grade = perfect ? "PERFECT" : good ? "GOOD" : "LATE";
		const d = dist(this.px, this.py, hoop.x, hoop.y);
		const lookTo = Math.atan2(-(hoop.x - this.px), -(hoop.y - this.py));
		let err = this.yaw - lookTo;
		while (err > Math.PI) err -= Math.PI * 2;
		while (err < -Math.PI) err += Math.PI * 2;
		const assist = (perfect ? .72 : good ? .42 : .08) * clamp(1 - Math.abs(err) / .9, 0, 1);
		const shootYaw = this.yaw + (lookTo - this.yaw) * assist;
		const speedErr = perfect ? 1 : good ? .94 + pwr * .08 : .62 + pwr * .55;
		const horiz = (155 + d * .92) * speedErr;
		const f = this.fwd();
		this.ball.ballX = this.px + f.x * 10;
		this.ball.ballY = this.py + f.y * 10;
		this.ball.ballZ = 42;
		this.ball.ballVx = -Math.sin(shootYaw) * horiz;
		this.ball.ballVy = -Math.cos(shootYaw) * horiz;
		this.ball.ballVz = 240 + pwr * 210 + d * .12;
		this.ball.shotDist = d;
		this.ball.inFlight = true;
		this.ball.held = false;
		this.ball.power = 0;
		this.ball.made = good;
	}
	beginCharge() {
		if (this.mode === "basketball" && this.ball.held && !this.ball.inFlight) {
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
					inFlight: this.ball.inFlight
				},
				cars: this.cars,
				peds: this.peds,
				npcs: this.npcLive.map((n) => ({
					id: n.id,
					x: n.x,
					y: n.y,
					isK: !!NPCS.find((d) => d.id === n.id)?.isKBlanco
				})),
				images: this.images
			});
			this.world3d.render(w, h);
		}
		if (ctx.canvas.width !== Math.floor(w * dpr) || ctx.canvas.height !== Math.floor(h * dpr)) {
			ctx.canvas.width = Math.floor(w * dpr);
			ctx.canvas.height = Math.floor(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
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
			ctx.fillText(f.text, w / 2, h * .28);
			ctx.textAlign = "start";
		}
		ctx.globalAlpha = 1;
		if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) this.drawShotMeter(ctx, w, h);
		if (this.ball.flash > 0 && this.mode === "basketball") {
			ctx.fillStyle = `rgba(242,198,106,${this.ball.flash * .28})`;
			ctx.fillRect(0, 0, w, h);
			if (this.ball.grade) {
				ctx.fillStyle = PAL.gold;
				ctx.font = "700 48px Bebas Neue, DM Sans, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(this.ball.grade, w / 2, h * .16);
				ctx.textAlign = "start";
			}
		}
		if (this.started && (this.mode === "world" || this.mode === "basketball")) {
			this.drawCompass(ctx, w, h);
			this.drawMinimap(ctx, w, h);
		}
	}
	drawShotMeter(ctx, w, h) {
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
		ctx.fillStyle = "rgba(29,185,84,0.28)";
		ctx.fillRect(mx + mw * .48, my, mw * .4, mh);
		ctx.fillStyle = "rgba(29,185,84,0.7)";
		ctx.fillRect(mx + mw * .56, my, mw * .22, mh);
		ctx.fillStyle = "#1db954";
		ctx.fillRect(mx, my, mw * this.ball.power, mh);
		ctx.fillStyle = "#f2f5f3";
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
		ctx.fillStyle = "#1db954";
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
			cameraView: this.settings.cameraView,
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
		rumble: true,
		cameraView: "third"
	},
	sideMissions: [],
	highScore: 0,
	hasSave: false,
	cameraView: "third",
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
		icon: Map$1
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
	const [loadPct, setLoadPct] = (0, import_react.useState)(0);
	const [bootError, setBootError] = (0, import_react.useState)(null);
	const [titlePhase, setTitlePhase] = (0, import_react.useState)("press");
	const [titleSettings, setTitleSettings] = (0, import_react.useState)(false);
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
				eng.onLoad = (p) => setLoadPct(p);
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
		titlePhase,
		boot
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
				style: { imageRendering: "auto" },
				onClick: () => {
					if (hud.started && !hud.paused) canvasRef.current?.requestPointerLock?.();
				}
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
						src: "/game/opening-title.png",
						alt: "",
						className: "absolute inset-0 h-full w-full object-cover",
						style: { objectPosition: "68% 46%" },
						crossOrigin: "anonymous"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/35" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 inset-x-0 h-8 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-0 inset-x-0 h-8 bg-black" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 flex h-full flex-col justify-between px-6 py-10 sm:px-12",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-primary text-xl tracking-[0.22em]",
									children: BRAND.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-[11px] uppercase tracking-[0.42em] text-gold",
									children: BRAND.line
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-[11px] uppercase tracking-[0.28em] text-muted",
									children: "A Memphis Open World"
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-lg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "font-display text-6xl leading-[0.85] text-fg sm:text-8xl",
										children: BRAND.city.toUpperCase()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 font-display text-3xl text-primary sm:text-4xl",
										children: BRAND.zip
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-4 max-w-sm text-sm leading-relaxed text-muted",
										children: [
											"Play as Benji. Run Drop Day, ball the 901 Court, earn ",
											BRAND.currency,
											", and re-up the fit."
										]
									}),
									!ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-8 max-w-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm tracking-widest text-muted",
												children: "LOADING MEMPHIS"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-2 h-1.5 overflow-hidden rounded-full bg-white/15",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-full bg-primary transition-all",
													style: { width: `${Math.round(loadPct * 100)}%` }
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 text-[11px] text-subtle",
												children: [Math.round(loadPct * 100), "%"]
											})
										]
									}),
									ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-8 flex flex-col gap-2 max-w-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(false),
												className: "min-h-12 rounded-lg bg-primary px-6 font-display text-2xl text-primary-fg transition hover:brightness-110 active:scale-[0.98]",
												children: "ENTER MEMPHIS"
											}),
											hud.hasSave && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(false),
												className: "min-h-11 rounded-lg border border-gold/50 bg-surface/70 px-6 font-display text-xl text-gold hover:bg-surface-2",
												children: "CONTINUE"
											}),
											hud.hasSave && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => boot(true),
												className: "min-h-12 rounded-lg border border-border bg-surface/80 px-6 font-display text-2xl text-fg hover:bg-surface-2",
												children: "NEW GAME"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setTitleSettings((v) => !v),
												className: "min-h-10 rounded-lg border border-border/70 px-6 text-sm uppercase tracking-wider text-muted hover:text-fg",
												children: "Settings"
											})
										]
									}),
									bootError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm text-danger",
										children: bootError
									}),
									titleSettings && ready && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-4 max-w-xs rounded-xl border border-border bg-panel p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseSettings, {
											settings: hud.settings,
											onChange: (s) => engineRef.current?.applySettings(s)
										})
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
				hud.started && !hud.paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "absolute left-3 bottom-24 z-20 flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-xs text-fg backdrop-blur-sm sm:bottom-3",
					onClick: () => engineRef.current?.toggleView(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchCamera, { className: "h-4 w-4 text-gold" }), hud.cameraView === "first" ? "First person" : "Third person"]
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
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg",
								onTouchStart: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = -1;
								},
								onTouchEnd: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 0;
								},
								children: "←"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-panel font-display text-lg text-fg",
								onTouchStart: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 1;
								},
								onTouchEnd: (e) => {
									e.preventDefault();
									if (engineRef.current) engineRef.current.input.touch.lookX = 0;
								},
								children: "→"
							})]
						}), hud.mode === "basketball" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-lg border border-border bg-panel/70 px-2 py-1 text-[10px] text-muted sm:block",
					children: [
						"WASD · Q/R look · V camera · ",
						hud.promptButton,
						" · Space"
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
	}, 10);
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
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm",
					children: ["Camera", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded-md px-2 py-1 text-xs ${settings.cameraView === "third" ? "bg-primary text-primary-fg" : "text-muted"}`,
							onClick: () => onChange({ cameraView: "third" }),
							children: "Third"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded-md px-2 py-1 text-xs ${settings.cameraView === "first" ? "bg-primary text-primary-fg" : "text-muted"}`,
							onClick: () => onChange({ cameraView: "first" }),
							children: "First"
						})]
					})]
				})
			]
		})
	] });
}
var SplitComponent = GameApp;
//#endregion
export { SplitComponent as component };
