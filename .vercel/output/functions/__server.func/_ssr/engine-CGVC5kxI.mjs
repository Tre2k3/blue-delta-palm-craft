import { A as SpriteMaterial, C as Raycaster, D as Scene, E as SRGBColorSpace, M as TextureLoader, N as TorusGeometry, O as SphereGeometry, P as Vector3, S as PointLight, T as RingGeometry, _ as Mesh, a as CapsuleGeometry, b as PerspectiveCamera, c as ConeGeometry, d as Fog, f as Group, g as LinearMipmapLinearFilter, h as LinearFilter, i as CanvasTexture, j as Texture, k as Sprite, l as CylinderGeometry, m as IcosahedronGeometry, n as AmbientLight, o as CircleGeometry, p as HemisphereLight, r as BoxGeometry, s as ClampToEdgeWrapping, t as WebGLRenderer, u as DirectionalLight, v as MeshBasicMaterial, w as RepeatWrapping, x as PlaneGeometry, y as MeshStandardMaterial } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-CGVC5kxI.js
var GRADE_MUL = {
	D: 1,
	C: 1.1,
	B: 1.25,
	A: 1.5,
	S: 2
};
var ROUTES = [
	[
		"hood",
		"dt",
		"culture"
	],
	[
		"dt",
		"hood",
		"culture"
	],
	[
		"culture",
		"dt",
		"hood"
	],
	[
		"hood",
		"culture",
		"dt"
	]
];
function tierFor(runIndex) {
	const run = Math.max(1, Math.floor(runIndex));
	if (run <= 1) return {
		run: 1,
		courtTarget: 8,
		parSeconds: 240,
		perfectHalfWidth: .11,
		deliveryOrder: ROUTES[0]
	};
	if (run === 2) return {
		run: 2,
		courtTarget: 12,
		parSeconds: 200,
		perfectHalfWidth: .095,
		deliveryOrder: ROUTES[1]
	};
	if (run === 3) return {
		run: 3,
		courtTarget: 16,
		parSeconds: 170,
		perfectHalfWidth: .08,
		deliveryOrder: ROUTES[2]
	};
	return {
		run,
		courtTarget: Math.min(24, 16 + (run - 3) * 2),
		parSeconds: Math.max(120, 160 - (run - 3) * 8),
		perfectHalfWidth: Math.max(.055, .078 - (run - 4) * .006),
		deliveryOrder: ROUTES[(run - 1) % ROUTES.length]
	};
}
function createRun(runIndex) {
	return {
		runIndex: Math.max(1, runIndex),
		active: false,
		time: 0,
		deliveries: 0,
		combo: 0,
		bestCombo: 0,
		mistakes: 0,
		ballMakes: 0,
		ballPerfects: 0,
		ballScore: 0,
		points: 0,
		grade: null,
		recap: false,
		lastPayout: 0,
		lastRespect: 0
	};
}
function shotZone(dist) {
	if (dist < 92) return "close";
	if (dist < 158) return "mid";
	return "deep";
}
function perfectWindow(zone, halfWidth) {
	const center = zone === "close" ? .62 : zone === "mid" ? .65 : .69;
	const w = zone === "close" ? halfWidth * 1.22 : zone === "deep" ? halfWidth * .76 : halfWidth;
	return {
		lo: center - w,
		hi: center + w
	};
}
function goodWindow(perfect) {
	const pad = (perfect.hi - perfect.lo) * .85;
	return {
		lo: Math.max(.18, perfect.lo - pad),
		hi: Math.min(.98, perfect.hi + pad)
	};
}
function zoneValue(zone) {
	if (zone === "deep") return {
		pts: 3,
		scoreMul: 1.4
	};
	if (zone === "mid") return {
		pts: 2,
		scoreMul: 1.15
	};
	return {
		pts: 2,
		scoreMul: 1
	};
}
function noteMistake(run) {
	run.mistakes += 1;
	run.combo = 0;
	run.points = Math.max(0, run.points - 80);
}
function scoreDelivery(run, interval, parSeconds) {
	run.deliveries += 1;
	run.combo += 1;
	run.bestCombo = Math.max(run.bestCombo, run.combo);
	const targetGap = parSeconds / 3;
	const gained = 420 + (interval > 0 && interval < targetGap * .72 ? 160 : 0) + (run.combo - 1) * 90;
	run.points += gained;
	return gained;
}
function scoreMake(run, perfect, zone, streak) {
	run.ballMakes += 1;
	if (perfect) run.ballPerfects += 1;
	const z = zoneValue(zone);
	run.ballScore += perfect ? z.pts + 1 : z.pts;
	const gained = Math.round((perfect ? 200 : 90) * z.scoreMul + streak * 25);
	run.points += gained;
	run.combo += 1;
	run.bestCombo = Math.max(run.bestCombo, run.combo);
	return gained;
}
function scoreMiss(run) {
	run.combo = 0;
}
function gradeFor(points) {
	if (points >= 3600) return "S";
	if (points >= 2700) return "A";
	if (points >= 1900) return "B";
	if (points >= 1100) return "C";
	return "D";
}
function finalizeRun(run, parSeconds, basePayout, baseRespect) {
	const timeFactor = Math.max(-.12, Math.min(.45, (parSeconds - run.time) / parSeconds));
	run.points += Math.round(timeFactor * 700);
	run.points = Math.max(0, run.points);
	run.grade = gradeFor(run.points);
	const mul = GRADE_MUL[run.grade];
	run.lastPayout = Math.round(basePayout * (mul - 1));
	run.lastRespect = Math.max(1, Math.round(baseRespect * (mul - 1) + (run.grade === "S" ? 12 : run.grade === "A" ? 6 : 0)));
	run.active = false;
	run.recap = true;
	return {
		grade: run.grade,
		bonusDollars: run.lastPayout,
		bonusRespect: run.lastRespect,
		mul
	};
}
function toHud(run, courtTarget, par) {
	return {
		run: run.runIndex,
		time: run.time,
		combo: run.combo,
		bestCombo: run.bestCombo,
		points: run.points,
		courtTarget,
		grade: run.grade,
		recap: run.recap,
		deliveries: run.deliveries,
		ballMakes: run.ballMakes,
		ballPerfects: run.ballPerfects,
		ballScore: run.ballScore,
		payout: run.lastPayout,
		respectEarned: run.lastRespect,
		par,
		active: run.active
	};
}
function formatRunClock(seconds) {
	const s = Math.max(0, Math.floor(seconds));
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function gradeRank(g) {
	return {
		D: 1,
		C: 2,
		B: 3,
		A: 4,
		S: 5
	}[g];
}
function deliveryTarget(id) {
	if (id === "hood") return "neighborhood";
	if (id === "dt") return "downtown";
	return "culture";
}
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
	cameraView: "third",
	sensitivity: 1,
	quality: "high",
	reduceMotion: false
};
var APPAREL = [
	{
		id: "starter_tee",
		name: "Starter Green Tee",
		price: 0,
		category: "top",
		color: "#1db954",
		description: "What Benji woke up in. In the sack we trust.",
		productId: "sr-starter-tee"
	},
	{
		id: "classic_green",
		name: "Classic $ack Tee",
		price: 40,
		category: "top",
		color: "#16a34a",
		description: "The drop that put the city on notice.",
		productId: "sr-black-gold-tee"
	},
	{
		id: "moneybag_hoodie",
		name: "Moneybag Hoodie",
		price: 90,
		category: "top",
		color: "#15803d",
		description: "Heavyweight fleece. Moneybag logo front and center.",
		productId: "sr-moneybag-hoodie"
	},
	{
		id: "black_hoodie",
		name: "Midnight Hoodie",
		price: 85,
		category: "top",
		color: "#171717",
		description: "Black on black. Silent flex.",
		productId: "sr-midnight-hoodie"
	},
	{
		id: "fresh_jersey",
		name: "FRESH 38127 Jersey",
		price: 120,
		category: "top",
		color: "#0f766e",
		description: "Memphis zip. K Blanco co-sign energy.",
		productId: "sr-fresh-jersey"
	},
	{
		id: "white_cap",
		name: "White Snapback",
		price: 35,
		category: "hat",
		color: "#f5f5f5",
		description: "SackReligious script. Keep it tilted.",
		productId: "sr-white-snapback"
	},
	{
		id: "gold_chain",
		name: "Moneybag Chain",
		price: 150,
		category: "chain",
		color: "#d4af37",
		description: "Gold rope + pendant. Respect required.",
		productId: "sr-moneybag-chain",
		respectRequired: 20
	},
	{
		id: "green_sweats",
		name: "Green Sweat Set",
		price: 110,
		category: "set",
		color: "#22c55e",
		description: "Full fit. Court to culture spot ready.",
		productId: "sr-green-sweats"
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
function createDropDayMission(opts) {
	const order = opts?.order ?? [
		"hood",
		"dt",
		"culture"
	];
	const courtTarget = opts?.courtTarget ?? 8;
	const delivers = {
		hood: {
			id: "hood",
			label: "Take the drop — Neighborhood",
			description: "Deliver the pack. Meet a supporter who actually lives this city.",
			target: deliveryTarget("hood"),
			kind: "deliver",
			reward: 50,
			done: false
		},
		dt: {
			id: "dt",
			label: "Get fresh — Downtown",
			description: "Move product downtown, then represent. Fit is part of the work.",
			target: deliveryTarget("dt"),
			kind: "deliver",
			reward: 50,
			done: false
		},
		culture: {
			id: "culture",
			label: "Build Respect — Culture Spot",
			description: "Show up for the culture. Respect is reputation, not a second wallet.",
			target: deliveryTarget("culture"),
			kind: "deliver",
			reward: 60,
			done: false
		}
	};
	return {
		id: "drop_day",
		title: "The Drop Day",
		chapter: "CHAPTER 01",
		activeStep: 0,
		complete: false,
		steps: [
			{
				id: "wake",
				label: "Wake Up",
				description: "Explore the apartment. The doorway is south. Step into Memphis.",
				target: "apartment",
				kind: "goto",
				reward: 10,
				done: false
			},
			{
				id: "link_k",
				label: "Link Up",
				description: "Walk to SackReligious HQ and talk to K Blanco. Tonight is Drop Day.",
				target: "store",
				kind: "talk",
				reward: 25,
				done: false
			},
			{
				id: "pickup",
				label: "Get the Drop Ready",
				description: "Inspect the wall, then secure the drop at the branded van.",
				target: "dropvan",
				kind: "pickup",
				reward: 40,
				done: false
			},
			...order.map((id) => ({ ...delivers[id] })),
			{
				id: "ball",
				label: "Own the 901 Court",
				description: `Meet Court OG. Pick up, dribble, shoot. Score ${courtTarget}.`,
				target: "court",
				kind: "basketball",
				reward: 45,
				done: false
			},
			{
				id: "return",
				label: "The Drop",
				description: "Return to HQ. The floor should feel different. Drop goes live.",
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
			"You made it. I needed somebody who moves like the city, not like a tourist.",
			"Tonight is Drop Day. We do this clean — product out, Respect in.",
			"Shop the wall if you want the fit. The real drop still has to hit the streets."
		],
		missionTalk: "Benji. Tonight is Drop Day. Grab the van, hit three spots, then come back to me.",
		isKBlanco: true
	},
	{
		id: "supporter_1",
		name: "Local Supporter",
		x: 2304,
		y: 576,
		color: "#a3a3a3",
		dialogue: ["You Benji? K said the new drop was coming through this block.", "Don't just drop it and bounce. Talk to people. That's how Respect works."]
	},
	{
		id: "downtown_fan",
		name: "901 Fan",
		x: 2400,
		y: 1536,
		color: "#e5e5e5",
		dialogue: ["Downtown don't care about talk. They care who showed up.", "You got that energy, Benji. Wear it."]
	},
	{
		id: "culture_host",
		name: "Culture Host",
		x: 1248,
		y: 1824,
		color: "#c4b8a8",
		dialogue: ["Culture spot remembers who pulled up when it was quiet.", "You moved product. Now move with purpose."]
	},
	{
		id: "court_coach",
		name: "Court OG",
		x: 624,
		y: 1488,
		color: "#fdba74",
		dialogue: ["Court's open. Pick the ball up, gather, then let it fly.", "Don't rush the release. Green window. Miss, rebound, go again."]
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
var SAVE_KEY = "sackreligious-memphis-v3";
var SAVE_KEY_LEGACY = "sackreligious-memphis-v2";
var SAVE_KEY_LEGACY_V1 = "sackreligious-memphis-v1";
var ROAD_HALF = 48 * .92;
var LANE_OFFSET = 48 * .34;
var SIDEWALK = 48 * .28;
var INTERIOR_WALL = 48 * .24;
function roadRects() {
	return STREETS.map((s) => s.axis === "y" ? {
		x: 0,
		y: s.tile * 48 - ROAD_HALF,
		w: WORLD_PX_W,
		h: ROAD_HALF * 2
	} : {
		x: s.tile * 48 - ROAD_HALF,
		y: 0,
		w: ROAD_HALF * 2,
		h: WORLD_PX_H
	});
}
function sidewalkRects() {
	const out = [];
	for (const s of STREETS) if (s.axis === "y") {
		const cy = s.tile * 48;
		out.push({
			x: 0,
			y: cy - ROAD_HALF - SIDEWALK,
			w: WORLD_PX_W,
			h: SIDEWALK
		});
		out.push({
			x: 0,
			y: cy + ROAD_HALF,
			w: WORLD_PX_W,
			h: SIDEWALK
		});
	} else {
		const cx = s.tile * 48;
		out.push({
			x: cx - ROAD_HALF - SIDEWALK,
			y: 0,
			w: SIDEWALK,
			h: WORLD_PX_H
		});
		out.push({
			x: cx + ROAD_HALF,
			y: 0,
			w: SIDEWALK,
			h: WORLD_PX_H
		});
	}
	return out;
}
function trafficLanes() {
	const lanes = [];
	for (const s of STREETS) {
		const c = s.tile * 48;
		if (s.axis === "y") {
			lanes.push({
				id: `${s.name}:east`,
				axis: "x",
				fixed: c - LANE_OFFSET,
				min: 0,
				max: WORLD_PX_W,
				dir: 1,
				speed: 86
			});
			lanes.push({
				id: `${s.name}:west`,
				axis: "x",
				fixed: c + LANE_OFFSET,
				min: 0,
				max: WORLD_PX_W,
				dir: -1,
				speed: 80
			});
		} else {
			lanes.push({
				id: `${s.name}:south`,
				axis: "y",
				fixed: c - LANE_OFFSET,
				min: 0,
				max: WORLD_PX_H,
				dir: 1,
				speed: 82
			});
			lanes.push({
				id: `${s.name}:north`,
				axis: "y",
				fixed: c + LANE_OFFSET,
				min: 0,
				max: WORLD_PX_H,
				dir: -1,
				speed: 78
			});
		}
	}
	return lanes;
}
var NON_SOLID_POIS = /* @__PURE__ */ new Set([
	"apartment",
	"store",
	"court",
	"river",
	"dropvan",
	"beale"
]);
function shellWithSouthDoor(p, doorCenterX, doorWidth) {
	const t = INTERIOR_WALL;
	const doorL = Math.max(p.x + t, doorCenterX - doorWidth / 2);
	const doorR = Math.min(p.x + p.w - t, doorCenterX + doorWidth / 2);
	const out = [
		{
			x: p.x,
			y: p.y,
			w: p.w,
			h: t
		},
		{
			x: p.x,
			y: p.y,
			w: t,
			h: p.h
		},
		{
			x: p.x + p.w - t,
			y: p.y,
			w: t,
			h: p.h
		}
	];
	if (doorL > p.x) out.push({
		x: p.x,
		y: p.y + p.h - t,
		w: doorL - p.x,
		h: t
	});
	if (doorR < p.x + p.w) out.push({
		x: doorR,
		y: p.y + p.h - t,
		w: p.x + p.w - doorR,
		h: t
	});
	return out;
}
function poiColliders() {
	const out = POIS.filter((p) => !NON_SOLID_POIS.has(p.id)).map((p) => ({
		x: p.x,
		y: p.y,
		w: p.w,
		h: p.h
	}));
	const apartment = POIS.find((p) => p.id === "apartment");
	if (apartment) out.push(...shellWithSouthDoor(apartment, 288, 48 * 1.3));
	const store = POIS.find((p) => p.id === "store");
	if (store) {
		const center = store.x + store.w / 2;
		out.push(...shellWithSouthDoor(store, center, 48 * 1.7));
	}
	return out;
}
function circleHitsRect(x, y, r, q) {
	const nx = Math.max(q.x, Math.min(x, q.x + q.w));
	const ny = Math.max(q.y, Math.min(y, q.y + q.h));
	return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
}
function isRoadPoint(x, y) {
	return roadRects().some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}
function laneVelocity(lane, speedScale = 1) {
	const v = lane.speed * lane.dir * speedScale;
	return lane.axis === "x" ? {
		vx: v,
		vy: 0
	} : {
		vx: 0,
		vy: v
	};
}
function aheadDistance(a, b) {
	const speed = Math.hypot(a.vx, a.vy);
	if (speed < .001) return Infinity;
	const fx = a.vx / speed;
	const fy = a.vy / speed;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const along = dx * fx + dy * fy;
	if (along <= 0) return Infinity;
	return Math.abs(dx * -fy + dy * fx) < 48 * .72 ? along : Infinity;
}
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
var CAST_ATLAS_URL = "/game/sprites/chapter1-cast-atlas.png";
var CAST_ROWS = {
	front: 0,
	back: 1,
	left: 2,
	right: 3,
	jump: 4,
	shoot: 5,
	peopleA: 6,
	peopleB: 7
};
function cropCastFrame(img, col, row) {
	const width = img.naturalWidth || img.width;
	const height = img.naturalHeight || img.height;
	const cellW = Math.floor(width / 4);
	const cellH = Math.floor(height / 8);
	const c = document.createElement("canvas");
	c.width = cellW;
	c.height = cellH;
	c.getContext("2d").drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
	return c;
}
function loadCastAtlas() {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${CAST_ATLAS_URL}`));
		img.src = CAST_ATLAS_URL;
	});
}
var TAU = Math.PI * 2;
var VIEWS = [
	"back",
	"left",
	"front",
	"right"
];
function wrap(a) {
	return Math.atan2(Math.sin(a), Math.cos(a));
}
function finishTexture(tex) {
	tex.colorSpace = SRGBColorSpace;
	tex.needsUpdate = true;
	tex.minFilter = LinearFilter;
	tex.magFilter = LinearFilter;
	tex.anisotropy = 8;
	tex.premultiplyAlpha = false;
	return tex;
}
function cardMat(src) {
	if (!src) return new MeshBasicMaterial({
		color: 1711134,
		transparent: true,
		opacity: 0
	});
	return new MeshBasicMaterial({
		map: src instanceof HTMLCanvasElement ? finishTexture(new CanvasTexture(src)) : finishTexture(new Texture(src)),
		transparent: true,
		alphaTest: .22,
		depthWrite: true,
		side: 2,
		toneMapped: false
	});
}
/** Hold a view through most of its 90° sector; blend only near the seams. */
function viewBlend(rel) {
	const sector = (rel % TAU + TAU) % TAU / (Math.PI / 2);
	const i0 = Math.floor(sector) % 4;
	const t = sector - Math.floor(sector);
	const edge = .18;
	if (t < edge) {
		const u = t / edge;
		return {
			a: VIEWS[(i0 + 3) % 4],
			b: VIEWS[i0],
			wa: 1 - u,
			wb: u
		};
	}
	if (t > 1 - edge) {
		const u = (t - (1 - edge)) / edge;
		return {
			a: VIEWS[i0],
			b: VIEWS[(i0 + 1) % 4],
			wa: 1 - u,
			wb: u
		};
	}
	return {
		a: VIEWS[i0],
		b: VIEWS[i0],
		wa: 1,
		wb: 0
	};
}
function walkFrame(animT) {
	return (Math.floor(animT) % 4 + 4) % 4;
}
function jumpFrame(air, vz) {
	if (vz > 1.4) return 1;
	if (air > .55) return 2;
	if (vz < -.4 && air > .12) return 3;
	return 0;
}
/**
* Permanent Benji renderer.
*
* The clean Chapter 1 atlas is true RGBA and is never chroma-keyed, fixing
* the transparent "holes" that appeared in Benji's hair/hat. Existing
* individual assets remain a safe fallback if the atlas cannot be loaded.
*/
var PlayerCharacter = class {
	root = new Group();
	body = new Group();
	cardA;
	cardB;
	shadow;
	idle = {};
	walk = {};
	jump = [];
	shoot = [];
	ready = false;
	atlasRequested = false;
	lastKeyA = "";
	lastKeyB = "";
	lastState = "idle";
	actionT = 0;
	ring;
	badge;
	constructor() {
		this.root.add(this.body);
		const geo = new PlaneGeometry(1.05, 1.78);
		const blank = new MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthWrite: false
		});
		this.cardA = new Mesh(geo, blank);
		this.cardB = new Mesh(geo, blank.clone());
		this.cardA.position.y = .9;
		this.cardB.position.y = .9;
		this.cardB.position.z = -.004;
		this.cardA.castShadow = false;
		this.body.add(this.cardA);
		this.body.add(this.cardB);
		this.shadow = new Mesh(new CircleGeometry(.32, 18), new MeshBasicMaterial({
			color: 0,
			transparent: true,
			opacity: .3,
			depthWrite: false
		}));
		this.shadow.rotation.x = -Math.PI / 2;
		this.shadow.position.y = .015;
		this.root.add(this.shadow);
		this.ring = new Mesh(new RingGeometry(.34, .42, 24), new MeshBasicMaterial({
			color: 1947988,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: 2
		}));
		this.ring.rotation.x = -Math.PI / 2;
		this.ring.position.y = .03;
		this.root.add(this.ring);
		this.badge = new Mesh(new PlaneGeometry(.28, .34), new MeshBasicMaterial({
			color: 1947988,
			transparent: true,
			opacity: 0,
			depthWrite: false
		}));
		this.badge.position.set(.22, 1.18, .06);
		this.body.add(this.badge);
	}
	setOutfitTint(hex) {
		const color = hex ? Number.parseInt(hex.replace("#", ""), 16) : 1947988;
		if (!Number.isFinite(color)) return;
		const show = Boolean(hex);
		const ringMat = this.ring.material;
		const badgeMat = this.badge.material;
		ringMat.color.setHex(color);
		badgeMat.color.setHex(color);
		ringMat.opacity = show ? .78 : 0;
		badgeMat.opacity = show ? .92 : 0;
	}
	applyApprovedTextures(images) {
		const front = images.frontHi ?? images.front;
		const back = images.backHi ?? images.back;
		const left = images.leftHi ?? images.left;
		const right = images.rightHi ?? images.right;
		if (!front && !back) return;
		this.idle.front = cardMat(front);
		this.idle.back = cardMat(back ?? front);
		this.idle.left = cardMat(left ?? front);
		this.idle.right = cardMat(right ?? front);
		for (const view of VIEWS) {
			const frames = [];
			for (let i = 1; i <= 4; i++) {
				const img = images[`walk-${view}-${i}`];
				frames.push(img ? cardMat(img) : this.idle[view]);
			}
			this.walk[view] = frames;
		}
		this.jump = [];
		for (let i = 1; i <= 4; i++) {
			const img = images[`jump-${i}`];
			this.jump.push(img ? cardMat(img) : this.idle.front);
		}
		this.ready = true;
		this.lastKeyA = "";
		this.lastKeyB = "";
		if (!this.atlasRequested) {
			this.atlasRequested = true;
			loadCastAtlas().then((atlas) => this.installCastAtlas(atlas)).catch(() => {});
		}
	}
	installCastAtlas(atlas) {
		const rows = {
			front: CAST_ROWS.front,
			back: CAST_ROWS.back,
			left: CAST_ROWS.left,
			right: CAST_ROWS.right
		};
		for (const view of VIEWS) {
			const frames = [
				0,
				1,
				2,
				3
			].map((col) => cardMat(cropCastFrame(atlas, col, rows[view])));
			this.walk[view] = frames;
			this.idle[view] = frames[0];
		}
		this.jump = [
			0,
			1,
			2,
			3
		].map((col) => cardMat(cropCastFrame(atlas, col, CAST_ROWS.jump)));
		this.shoot = [
			0,
			1,
			2,
			3
		].map((col) => cardMat(cropCastFrame(atlas, col, CAST_ROWS.shoot)));
		this.ready = true;
		this.lastKeyA = "";
		this.lastKeyB = "";
	}
	matFor(view, kind, frame) {
		if (kind === "jump") return this.jump[frame] ?? this.idle[view];
		if (kind === "shoot") return this.shoot[frame] ?? this.idle[view];
		if (kind === "walk") return this.walk[view]?.[frame] ?? this.idle[view];
		return this.idle[view];
	}
	update(dt, heading, cameraYaw, speed, lean, state, animT, thirdPerson, air = 0, vz = 0) {
		this.root.visible = thirdPerson;
		this.root.rotation.y = cameraYaw;
		if (state !== this.lastState) {
			this.lastState = state;
			this.actionT = 0;
		} else this.actionT += dt;
		const jumping = state === "jump" || air > .04;
		const kind = jumping ? "jump" : state === "shoot" ? "shoot" : state === "walk" || state === "run" ? "walk" : "idle";
		const frame = kind === "walk" ? walkFrame(animT) : kind === "jump" ? jumpFrame(air, vz) : kind === "shoot" ? Math.min(3, Math.floor(this.actionT / .105)) : 0;
		const blend = viewBlend(wrap(heading - cameraYaw));
		if (this.ready) if (kind === "jump" || kind === "shoot") {
			const key = `${kind}:${frame}`;
			if (key !== this.lastKeyA) {
				const mat = this.matFor("front", kind, frame);
				if (mat) this.cardA.material = mat;
				this.lastKeyA = key;
			}
			this.lastKeyB = "";
			const matA = this.cardA.material;
			matA.opacity = 1;
			matA.alphaTest = .22;
			this.cardB.visible = false;
		} else {
			const keyA = `${blend.a}:${kind}:${frame}`;
			const keyB = `${blend.b}:${kind}:${frame}`;
			if (keyA !== this.lastKeyA) {
				const mat = this.matFor(blend.a, kind, frame);
				if (mat) this.cardA.material = mat;
				this.lastKeyA = keyA;
			}
			if (keyB !== this.lastKeyB) {
				const mat = this.matFor(blend.b, kind, frame);
				if (mat) this.cardB.material = mat;
				this.lastKeyB = keyB;
			}
			const matA = this.cardA.material;
			const matB = this.cardB.material;
			matA.opacity = blend.wa;
			matB.opacity = blend.wb;
			matA.alphaTest = blend.wa > .92 ? .22 : .04;
			matB.alphaTest = blend.wb > .92 ? .22 : .04;
			this.cardB.visible = blend.wb > .02 && blend.a !== blend.b;
		}
		this.body.rotation.z = lean * .55;
		this.body.rotation.x = state === "run" ? -.05 : state === "walk" ? -.02 : jumping ? -.04 : 0;
		const bob = jumping ? 0 : state === "idle" ? Math.sin(animT * .7) * .01 : Math.abs(Math.sin(animT)) * (state === "run" ? .042 : .024);
		this.body.position.y = air + bob;
		const stretch = jumping ? vz > .8 ? 1.08 : vz < -1.2 ? .94 : 1.03 : 1 + Math.sin(animT * 2) * .016 * Math.min(speed / 268, 1);
		const squat = jumping && vz > .8 ? .94 : jumping && vz < -1.2 ? 1.06 : 1;
		this.cardA.scale.set(squat, stretch, 1);
		this.cardB.scale.set(squat, stretch, 1);
		const lift = Math.min(air / 1.4, 1);
		this.shadow.scale.setScalar(1 - lift * .45);
		this.shadow.material.opacity = .3 * (1 - lift * .7);
	}
};
/** Knock leftover #FF00FF chroma out of generated sprites. */
function keyMagenta(img, w, h) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const g = c.getContext("2d");
	g.drawImage(img, 0, 0, w, h);
	const data = g.getImageData(0, 0, w, h);
	const p = data.data;
	for (let i = 0; i < p.length; i += 4) {
		const r = p[i];
		const gv = p[i + 1];
		const b = p[i + 2];
		const mag = (r + b) * .5 - gv;
		if (r > 165 && b > 155 && gv < 88 && mag > 55) {
			p[i + 3] = 0;
			continue;
		}
		if (mag > 38 && r > 110 && b > 110 && gv < 170) {
			const t = Math.min(1, (mag - 38) / 90);
			p[i + 3] = Math.round(p[i + 3] * (1 - t));
			p[i] = Math.max(0, r - mag * .55);
			p[i + 2] = Math.max(0, b - mag * .55);
		}
		if (p[i + 3] < 12) p[i + 3] = 0;
	}
	g.putImageData(data, 0, 0);
	return c;
}
function keyedTexture(img) {
	return keyMagenta(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}
var PEOPLE_URLS = {
	"k-blanco": "/game/people/k-blanco.png",
	supporter: "/game/people/supporter.png",
	fan: "/game/people/fan.png",
	host: "/game/people/host.png",
	local: "/game/people/local.png",
	"court-og": "/game/people/court-og.png",
	dj: "/game/people/dj.png"
};
var PEOPLE_ATLAS_SLOTS = [
	{
		key: "k-blanco",
		col: 0,
		row: CAST_ROWS.peopleA
	},
	{
		key: "supporter",
		col: 1,
		row: CAST_ROWS.peopleA
	},
	{
		key: "fan",
		col: 2,
		row: CAST_ROWS.peopleA
	},
	{
		key: "host",
		col: 0,
		row: CAST_ROWS.peopleB
	},
	{
		key: "local",
		col: 1,
		row: CAST_ROWS.peopleB
	},
	{
		key: "court-og",
		col: 2,
		row: CAST_ROWS.peopleB
	}
];
var CAR_URLS = {
	sedan: "/game/cars/sedan.png",
	suv: "/game/cars/suv.png",
	chevy: "/game/cars/chevy.png",
	coupe: "/game/cars/coupe.png",
	van: "/game/cars/van.png"
};
var FACADE_URLS = {
	hq: "/game/facades/hq.jpg",
	apartment: "/game/facades/apartment.jpg",
	beale: "/game/facades/beale.jpg",
	court: "/game/facades/court-floor.jpg"
};
var NPC_SPRITE = {
	k_blanco: "k-blanco",
	supporter_1: "supporter",
	downtown_fan: "fan",
	culture_host: "host",
	court_coach: "court-og",
	street_npc: "local",
	beale_dj: "dj"
};
var PED_SKINS = [
	"supporter",
	"fan",
	"host",
	"local"
];
var CAR_SKINS = [
	"sedan",
	"suv",
	"chevy",
	"coupe"
];
function spriteTex(src, keyed) {
	const tex = new Texture(keyed && src instanceof HTMLImageElement ? keyedTexture(src) : src);
	tex.colorSpace = SRGBColorSpace;
	tex.minFilter = LinearFilter;
	tex.magFilter = LinearFilter;
	tex.generateMipmaps = false;
	tex.anisotropy = 8;
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.needsUpdate = true;
	return tex;
}
function loadImage$1(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(src));
		img.src = src;
	});
}
async function loadMap(urls, keyed) {
	const out = {};
	await Promise.all(Object.keys(urls).map(async (k) => {
		try {
			out[k] = spriteTex(await loadImage$1(urls[k]), keyed);
		} catch {}
	}));
	return out;
}
async function loadPeople() {
	try {
		const atlas = await loadCastAtlas();
		const out = {};
		for (const slot of PEOPLE_ATLAS_SLOTS) out[slot.key] = spriteTex(cropCastFrame(atlas, slot.col, slot.row), false);
		try {
			out.dj = spriteTex(await loadImage$1(PEOPLE_URLS.dj), true);
		} catch {}
		return out;
	} catch {
		return loadMap(PEOPLE_URLS, true);
	}
}
async function loadCityArt() {
	const [people, cars, facades] = await Promise.all([
		loadPeople(),
		loadMap(CAR_URLS, true),
		loadMap(FACADE_URLS, false)
	]);
	return {
		people,
		cars,
		facades
	};
}
function facadeFor(id) {
	if (id === "store" || id === "downtown") return "hq";
	if (id === "apartment" || id === "neighborhood") return "apartment";
	if (id === "beale" || id === "culture") return "beale";
	return null;
}
var SIGN_DEFS = [
	{
		id: "sackreligious-hq",
		label: "$ACKRELIGIOUS",
		sub: "KLOTHING",
		ink: "#f3e6c4",
		paper: "#14110f",
		accent: "#1db954"
	},
	{
		id: "in-the-sack",
		label: "IN THE $ACK",
		sub: "WE TRUST",
		ink: "#f6e7b2",
		paper: "#10110f",
		accent: "#d4af37"
	},
	{
		id: "901-court",
		label: "901",
		sub: "SACKROW",
		ink: "#f4efe6",
		paper: "#3b1d12",
		accent: "#e85d4c"
	},
	{
		id: "beale-st",
		label: "BEALE ST",
		sub: "MEMPHIS",
		ink: "#f7ecd0",
		paper: "#2a2118",
		accent: "#d4af37"
	},
	{
		id: "east-memphis",
		label: "EAST MEMPHIS",
		sub: "THE HOOD",
		ink: "#efe6d6",
		paper: "#1c2430",
		accent: "#7aa2c8"
	},
	{
		id: "downtown",
		label: "DOWNTOWN",
		sub: "38103",
		ink: "#ece7de",
		paper: "#1a1d22",
		accent: "#c4b08a"
	},
	{
		id: "culture-spot",
		label: "CULTURE",
		sub: "SOUTH MAIN",
		ink: "#f0e4c8",
		paper: "#241c16",
		accent: "#1db954"
	},
	{
		id: "fresh-38127",
		label: "FRESH",
		sub: "38127",
		ink: "#f5edd8",
		paper: "#121814",
		accent: "#1db954"
	}
];
/** Assign specific signs to specific buildings. HQ owns its own pair. */
var SIGN_TABLE = [
	{
		buildingId: "store",
		signId: "sackreligious-hq",
		slot: "storefront"
	},
	{
		buildingId: "store",
		signId: "in-the-sack",
		slot: "billboard"
	},
	{
		buildingId: "beale",
		signId: "beale-st",
		slot: "storefront"
	},
	{
		buildingId: "apartment",
		signId: "fresh-38127",
		slot: "storefront"
	},
	{
		buildingId: "neighborhood",
		signId: "east-memphis",
		slot: "storefront"
	},
	{
		buildingId: "downtown",
		signId: "downtown",
		slot: "storefront"
	},
	{
		buildingId: "downtown",
		signId: "downtown",
		slot: "billboard"
	},
	{
		buildingId: "culture",
		signId: "culture-spot",
		slot: "storefront"
	},
	{
		buildingId: "court",
		signId: "901-court",
		slot: "storefront"
	}
];
var COLS = 4;
var ROWS = 2;
var CELL = 256;
var ATLAS_W = COLS * CELL;
var ATLAS_H = ROWS * CELL;
var atlasTex = null;
var atlasMat = null;
function defIndex(id) {
	const i = SIGN_DEFS.findIndex((s) => s.id === id);
	return i < 0 ? 0 : i;
}
function cellUv(index) {
	const col = index % COLS;
	const row = Math.floor(index / COLS);
	return {
		u0: col / COLS,
		v0: 1 - (row + 1) / ROWS,
		u1: (col + 1) / COLS,
		v1: 1 - row / ROWS
	};
}
function paintAtlas() {
	const c = document.createElement("canvas");
	c.width = ATLAS_W;
	c.height = ATLAS_H;
	const g = c.getContext("2d");
	g.clearRect(0, 0, ATLAS_W, ATLAS_H);
	SIGN_DEFS.forEach((sign, i) => {
		const col = i % COLS;
		const row = Math.floor(i / COLS);
		const x = col * CELL;
		const y = row * CELL;
		g.fillStyle = sign.paper;
		g.fillRect(x, y, CELL, CELL);
		g.fillStyle = sign.accent;
		g.fillRect(x, y, 10, CELL);
		g.fillRect(x + CELL - 10, y, 10, CELL);
		g.fillRect(x + 18, y + 28, CELL - 36, 6);
		g.fillStyle = sign.ink;
		g.font = "700 28px 'Bebas Neue', Impact, sans-serif";
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.fillText(sign.label, x + CELL / 2, y + CELL * .46);
		if (sign.sub) {
			g.font = "600 16px 'DM Sans', sans-serif";
			g.fillStyle = sign.accent;
			g.fillText(sign.sub, x + CELL / 2, y + CELL * .64);
		}
	});
	return c;
}
async function loadAtlasFile() {
	for (const url of ["/game3d/signs/atlas.svg"]) {
		const tex = await new Promise((resolve) => {
			new TextureLoader().load(url, (t) => resolve(t), void 0, () => resolve(null));
		});
		if (tex) return tex;
	}
	return null;
}
async function getSignAtlas() {
	if (atlasTex) return atlasTex;
	const file = await loadAtlasFile();
	if (file) {
		file.colorSpace = SRGBColorSpace;
		file.wrapS = ClampToEdgeWrapping;
		file.wrapT = ClampToEdgeWrapping;
		file.anisotropy = 8;
		file.needsUpdate = true;
		atlasTex = file;
		return file;
	}
	const tex = new CanvasTexture(paintAtlas());
	tex.colorSpace = SRGBColorSpace;
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = ClampToEdgeWrapping;
	tex.anisotropy = 8;
	tex.needsUpdate = true;
	atlasTex = tex;
	return tex;
}
async function getSignMaterial() {
	if (atlasMat) return atlasMat;
	atlasMat = new MeshStandardMaterial({
		map: await getSignAtlas(),
		roughness: .48,
		metalness: .08,
		transparent: false,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1,
		depthWrite: true
	});
	return atlasMat;
}
function planeForCell(index, w, h) {
	const geo = new PlaneGeometry(w, h);
	const uv = geo.getAttribute("uv");
	const { u0, v0, u1, v1 } = cellUv(index);
	uv.setXY(0, u0, v0);
	uv.setXY(1, u1, v0);
	uv.setXY(2, u0, v1);
	uv.setXY(3, u1, v1);
	uv.needsUpdate = true;
	return geo;
}
var FACE_YAW = {
	south: 0,
	north: Math.PI,
	east: Math.PI / 2,
	west: -Math.PI / 2
};
function placementsFor(id, tall) {
	const listed = SIGN_TABLE.filter((p) => p.buildingId === id);
	if (listed.length) return listed;
	const fallback = [{
		buildingId: id,
		signId: SIGN_DEFS[Math.abs(id.length * 3) % SIGN_DEFS.length].id,
		slot: "storefront"
	}];
	if (tall) fallback.push({
		buildingId: id,
		signId: "in-the-sack",
		slot: "billboard"
	});
	return fallback;
}
function mountSign(parent, building, placement, material) {
	const face = placement.face ?? "south";
	const yaw = FACE_YAW[face];
	const storefront = placement.slot === "storefront";
	const w = storefront ? Math.min(building.width * .62, 4.2) : Math.min(building.width * .7, 5.4);
	const h = storefront ? .72 : 1.35;
	const mesh = new Mesh(planeForCell(defIndex(placement.signId), w, h), material);
	mesh.rotation.y = yaw;
	const lift = storefront ? 2.55 : building.height + .9;
	const offset = .02;
	const hx = building.width / 2 + offset;
	const hz = building.depth / 2 + offset;
	if (face === "south") mesh.position.set(0, lift, hz);
	else if (face === "north") mesh.position.set(0, lift, -hz);
	else if (face === "east") mesh.position.set(hx, lift, 0);
	else mesh.position.set(-hx, lift, 0);
	mesh.userData.signId = placement.signId;
	mesh.userData.buildingId = building.id;
	mesh.castShadow = false;
	parent.add(mesh);
	return mesh;
}
async function decorateBuildings(buildings) {
	const mat = await getSignMaterial();
	for (const b of buildings) {
		const rows = placementsFor(b.id, !!b.tall || b.height > 6.2);
		for (const row of rows) {
			if (row.slot === "billboard" && !(b.tall || b.height > 6.2 || b.id === "store")) continue;
			mountSign(b.group, b, row, mat);
		}
	}
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
var World3D$1 = class {
	renderer;
	scene = new Scene();
	camera = new PerspectiveCamera(68, 1, .12, 420);
	player;
	benji;
	ball;
	ballShadow;
	hoopRim;
	hoopNet = null;
	cars = [];
	peds = [];
	npcSprites = /* @__PURE__ */ new Map();
	sun;
	overlay;
	mats = {};
	spriteMats = {};
	art = {
		people: {},
		cars: {},
		facades: {}
	};
	signMat = null;
	clock = 0;
	tmp = new Vector3();
	camPos = new Vector3();
	camLook = new Vector3();
	camFov = 62;
	lastDt = 1 / 60;
	benjiReady = false;
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
		this.benji = new PlayerCharacter();
		this.player.add(this.benji.root);
		this.scene.add(this.player);
		this.camPos.set(10, 8, 18);
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
			const [mats, art, signMat] = await Promise.all([
				loadAllMaterials(onProgress),
				loadCityArt(),
				getSignMaterial()
			]);
			this.mats = mats;
			this.art = art;
			this.signMat = signMat;
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
			const facPick = [
				"hq",
				"apartment",
				"beale"
			][Math.floor(hash(wall.x + wall.y * 3) * 3)];
			const facTex = this.art.facades[facPick] ?? this.t("windows");
			const face = new Mesh(new PlaneGeometry(bw * .96, stories * .88), facTex ? new MeshStandardMaterial({
				map: facTex,
				roughness: .64
			}) : facadeMat);
			face.position.set(0, stories * .5, bd / 2 + .03);
			g.add(face);
			const faceN = face.clone();
			faceN.rotation.y = Math.PI;
			faceN.position.z = -bd / 2 - .03;
			g.add(faceN);
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
		const buildings = [];
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
			const bw = wx(poi.w);
			const bd = wz(poi.h);
			const body = new Mesh(new BoxGeometry(bw, h, bd), bodyMat);
			body.position.y = h / 2;
			body.castShadow = true;
			body.receiveShadow = true;
			g.add(body);
			const facadeKey = facadeFor(poi.id);
			const facadeTex = facadeKey ? this.art.facades[facadeKey] : void 0;
			if (facadeTex) {
				const face = new Mesh(new PlaneGeometry(bw * .98, h * .9), new MeshStandardMaterial({
					map: facadeTex,
					roughness: .62,
					metalness: .04
				}));
				face.position.set(0, h * .48, bd / 2 + .04);
				g.add(face);
				const faceN = face.clone();
				faceN.rotation.y = Math.PI;
				faceN.position.z = -bd / 2 - .04;
				g.add(faceN);
			} else {
				const glass = new Mesh(new PlaneGeometry(bw * .72, 1.8), storefrontMat);
				glass.position.set(0, 1.4, bd / 2 + .05);
				g.add(glass);
			}
			const awning = new Mesh(new BoxGeometry(bw * .95, .1, .72), fabricMat);
			awning.position.set(0, 2.2, bd / 2 + .28);
			g.add(awning);
			g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
			this.scene.add(g);
			buildings.push({
				id: poi.id,
				group: g,
				width: bw,
				depth: bd,
				height: h,
				tall: h > 6
			});
		}
		if (this.signMat) decorateBuildings(buildings);
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
		const vanTex = this.art.cars.van;
		if (vanTex) {
			const card = new Mesh(new PlaneGeometry(3.6, 1.7), new MeshBasicMaterial({
				map: vanTex,
				transparent: true,
				alphaTest: .2,
				side: 2,
				toneMapped: false
			}));
			card.position.y = .88;
			g.add(card);
			const card2 = card.clone();
			card2.rotation.y = Math.PI / 2;
			g.add(card2);
		} else {
			const metal = std(this.t("carMetal"), {
				roughness: .38,
				metalness: .62,
				color: 1710102
			});
			const body = new Mesh(new BoxGeometry(3.1, 1.7, 1.7), metal);
			body.position.y = 1.05;
			body.castShadow = true;
			g.add(body);
			const stripe = new Mesh(new BoxGeometry(3.12, .22, 1.72), new MeshStandardMaterial({
				color: 1947988,
				emissive: 1947988,
				emissiveIntensity: .35
			}));
			stripe.position.y = 1.35;
			g.add(stripe);
		}
		this.addWheels(g, 1.15, .62);
		const sh = new Mesh(new CircleGeometry(1.4, 16), new MeshBasicMaterial({
			color: 0,
			transparent: true,
			opacity: .32,
			depthWrite: false
		}));
		sh.rotation.x = -Math.PI / 2;
		sh.position.y = .02;
		g.add(sh);
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
		const courtMap = this.art.facades.court;
		const floor = new Mesh(new BoxGeometry(cw, .1, cd), courtMap ? new MeshStandardMaterial({
			map: courtMap,
			roughness: .72
		}) : std(this.t("court"), {
			roughness: .76,
			repeat: [3, 2.4]
		}));
		floor.position.set(cx, .06, cz);
		floor.receiveShadow = true;
		this.scene.add(floor);
		if (!this.art.facades.court) {
			const lines = new Mesh(new BoxGeometry(2.7, .04, 3.5), std(this.t("courtLines"), {
				roughness: .72,
				repeat: [1, 1]
			}));
			lines.position.set(cx, .13, wz(court.y) + 2.2);
			this.scene.add(lines);
		}
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
		this.hoopNet = net;
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
			const i = this.cars.length;
			const g = new Group();
			const skin = CAR_SKINS[i % CAR_SKINS.length];
			const tex = this.art.cars[skin];
			if (tex) {
				const card = new Mesh(new PlaneGeometry(2.35, 1.02), new MeshBasicMaterial({
					map: tex,
					transparent: true,
					alphaTest: .18,
					side: 2,
					toneMapped: false
				}));
				card.position.y = .52;
				g.add(card);
				const card2 = card.clone();
				card2.rotation.y = Math.PI / 2;
				g.add(card2);
			} else {
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
			}
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
			const i = this.peds.length;
			const g = new Group();
			const skin = PED_SKINS[i % PED_SKINS.length];
			const tex = this.art.people[skin];
			if (tex) {
				const card = new Mesh(new PlaneGeometry(.95, 1.62), new MeshBasicMaterial({
					map: tex,
					transparent: true,
					alphaTest: .18,
					side: 2,
					toneMapped: false,
					depthWrite: true
				}));
				card.position.y = .82;
				g.add(card);
			} else {
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
			}
			const sh = new Mesh(new CircleGeometry(.22, 10), new MeshBasicMaterial({
				color: 0,
				transparent: true,
				opacity: .28,
				depthWrite: false
			}));
			sh.rotation.x = -Math.PI / 2;
			sh.position.y = .015;
			g.add(sh);
			this.scene.add(g);
			this.peds.push(g);
		}
	}
	sync(f) {
		this.clock = f.clock;
		const dt = Math.min(f.dt || this.lastDt, .05);
		this.lastDt = dt;
		const x = wx(f.px);
		const z = wz(f.py);
		this.player.position.set(x, 0, z);
		if (!this.benjiReady && (f.images.frontHi || f.images.front)) {
			this.benji.applyApprovedTextures(f.images);
			this.benjiReady = true;
		}
		this.benji.update(dt, f.heading, f.yaw, f.moveSpeed, f.lean, f.loco, f.animT, f.cameraView === "third", f.air, f.vz);
		this.benji.setOutfitTint(f.outfitColor ?? null);
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
			g.rotation.y = f.yaw;
			const bob = Math.sin(f.clock * 2.4 + p.t) * .02;
			const card = g.children[0];
			if (card) card.position.y = .82 + bob;
		}
		for (const n of f.npcs) {
			let s = this.npcSprites.get(n.id);
			if (!s) {
				const key = NPC_SPRITE[n.id] ?? "local";
				const tex = this.art.people[key] ?? (n.isK ? this.art.people["k-blanco"] : void 0);
				const mat = new SpriteMaterial({
					map: tex,
					color: 16777215,
					transparent: true,
					alphaTest: tex ? .18 : 0
				});
				if (!tex && n.isK && f.images.k) {
					const t = new Texture(f.images.k);
					t.needsUpdate = true;
					t.colorSpace = SRGBColorSpace;
					mat.map = t;
				}
				s = new Sprite(mat);
				if (n.isK) s.scale.set(1.22, 2.52, 1);
				else s.scale.set(tex ? 1.12 : 1.05, tex ? 1.9 : 1.65, 1);
				s.position.y = n.isK ? 1.26 : .95;
				this.scene.add(s);
				this.npcSprites.set(n.id, s);
			}
			s.position.set(wx(n.x), n.isK ? 1.26 : .95, wz(n.y));
		}
		const fwdX = -Math.sin(f.yaw);
		const fwdZ = -Math.cos(f.yaw);
		const shake = f.trauma * f.trauma;
		const sx = Math.sin(f.clock * 47) * shake * .12;
		const sy = Math.cos(f.clock * 39) * shake * .08;
		const air = f.air ?? 0;
		const step = Math.sin(f.animT) * (f.loco === "run" ? .028 : f.loco === "walk" ? .014 : 0);
		const lookAhead = Math.min(f.moveSpeed / 268, 1);
		const follow = f.loco === "run" ? 6.15 : 5.45;
		const height = (f.indoor ? 1.85 : 2.38) + air * .35;
		const k = f.indoor ? 11 : f.loco === "run" ? 5.4 : 7.6;
		const ease = 1 - Math.exp(-k * dt);
		const targetFov = f.cameraView === "first" ? f.mode === "basketball" ? 74 : 70 : f.loco === "run" ? 66.5 : f.indoor ? 58 : 62;
		this.camFov += (targetFov - this.camFov) * (1 - Math.exp(-4.2 * dt));
		this.camFov += (f.punch ?? 0) * 3.4;
		const rimScale = 1 + (f.hoopPulse ?? 0) * .28;
		this.hoopRim.scale.set(rimScale, rimScale, rimScale);
		if (this.hoopNet) {
			const netS = 1 + f.hoopPulse * .18;
			this.hoopNet.scale.set(netS, 1 + f.hoopPulse * .35, netS);
		}
		if (f.cameraView === "first") {
			this.camPos.set(x + sx, 1.68 + f.bob * .012 + step + air, z + sy);
			this.camera.position.copy(this.camPos);
			const ly = Math.sin(f.pitch);
			const lh = Math.cos(f.pitch);
			this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8 + air, z + fwdZ * lh * 8);
		} else {
			const desired = this.tmp.set(x - fwdX * follow + fwdX * lookAhead * .55 + sx, height, z - fwdZ * follow + fwdZ * lookAhead * .55 + sy);
			this.camPos.x += (desired.x - this.camPos.x) * ease;
			this.camPos.y += (desired.y - this.camPos.y) * ease;
			this.camPos.z += (desired.z - this.camPos.z) * ease;
			this.camera.position.copy(this.camPos);
			this.camLook.set(x, 1.22 + step + air * .55, z);
			this.camera.lookAt(this.camLook);
		}
		this.camera.fov = this.camFov;
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
var COURT = POIS.find((p) => p.id === "court");
var VERTICAL_STREET_CENTERS = STREETS.filter((s) => s.axis === "x").map((s) => s.tile * 48);
var HORIZONTAL_STREET_CENTERS = STREETS.filter((s) => s.axis === "y").map((s) => s.tile * 48);
function box$1(w, h, d, material, x, y, z) {
	const mesh = new Mesh(new BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	mesh.receiveShadow = true;
	return mesh;
}
function pseudo(n) {
	const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
	return x - Math.floor(x);
}
function nearest(value, values) {
	let best = values[0] ?? value;
	let bestD = Math.abs(value - best);
	for (const candidate of values) {
		const d = Math.abs(value - candidate);
		if (d < bestD) {
			bestD = d;
			best = candidate;
		}
	}
	return best;
}
function lerpAngle(a, b, t) {
	return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
}
/**
* World-life layer for the Memphis map.
*
* The gameplay engine remains authoritative for collision and movement. This
* director makes that simulation read like a city: authored road surfaces,
* signals, crosswalks, route-aware traffic, varied pedestrians, parked cars,
* landmark wayfinding and a populated Sackrow court.
*/
var WorldLifePass = class {
	scene;
	root = null;
	lanes = trafficLanes();
	laneMap = new Map(this.lanes.map((lane) => [lane.id, lane]));
	trafficMemory = /* @__PURE__ */ new WeakMap();
	pedMemory = /* @__PURE__ */ new WeakMap();
	signals = [];
	totalTurns = 0;
	pedestrianPauses = 0;
	courtCrowd = null;
	markerCount = 0;
	parkedCars = 0;
	constructor(scene) {
		this.scene = scene;
	}
	build() {
		this.root?.removeFromParent();
		this.root = new Group();
		this.root.name = "memphis-world-life";
		this.signals = [];
		this.markerCount = 0;
		this.parkedCars = 0;
		this.buildRoadSurfaces(this.root);
		this.buildIntersections(this.root);
		this.buildLandmarkMarkers(this.root);
		this.buildParkedCars(this.root);
		this.buildCourtGameDay(this.root);
		this.buildBealeNeon(this.root);
		this.scene.add(this.root);
	}
	buildRoadSurfaces(root) {
		const road = new MeshStandardMaterial({
			color: 1513754,
			roughness: .98,
			metalness: .01
		});
		const curb = new MeshStandardMaterial({
			color: 7762797,
			roughness: .94
		});
		const laneWhite = new MeshStandardMaterial({
			color: 15065559,
			roughness: .9
		});
		const laneGold = new MeshStandardMaterial({
			color: 14068269,
			roughness: .86
		});
		const roadWidth = wx(48 * 1.72);
		const walkWidth = wx(48 * .3);
		const worldW = wx(WORLD_PX_W);
		const worldH = wz(WORLD_PX_H);
		for (const street of STREETS) if (street.axis === "y") {
			const z = wz(street.tile * 48);
			root.add(box$1(worldW, .035, roadWidth, road, worldW / 2, .075, z));
			root.add(box$1(worldW, .09, walkWidth, curb, worldW / 2, .1, z - roadWidth / 2 - walkWidth / 2));
			root.add(box$1(worldW, .09, walkWidth, curb, worldW / 2, .1, z + roadWidth / 2 + walkWidth / 2));
			root.add(box$1(worldW, .018, .08, laneWhite, worldW / 2, .105, z - roadWidth * .37));
			root.add(box$1(worldW, .018, .08, laneWhite, worldW / 2, .105, z + roadWidth * .37));
			for (let x = 2; x < worldW - 1; x += 5.7) root.add(box$1(2.4, .022, .09, laneGold, x, .11, z));
		} else {
			const x = wx(street.tile * 48);
			root.add(box$1(roadWidth, .035, worldH, road, x, .075, worldH / 2));
			root.add(box$1(walkWidth, .09, worldH, curb, x - roadWidth / 2 - walkWidth / 2, .1, worldH / 2));
			root.add(box$1(walkWidth, .09, worldH, curb, x + roadWidth / 2 + walkWidth / 2, .1, worldH / 2));
			root.add(box$1(.08, .018, worldH, laneWhite, x - roadWidth * .37, .105, worldH / 2));
			root.add(box$1(.08, .018, worldH, laneWhite, x + roadWidth * .37, .105, worldH / 2));
			for (let z = 2; z < worldH - 1; z += 5.7) root.add(box$1(.09, .022, 2.4, laneGold, x, .11, z));
		}
	}
	buildIntersections(root) {
		const stripe = new MeshStandardMaterial({
			color: 15789541,
			roughness: .9
		});
		const pole = new MeshStandardMaterial({
			color: 2368548,
			roughness: .4,
			metalness: .62
		});
		const signalCase = new MeshStandardMaterial({
			color: 1118481,
			roughness: .62,
			metalness: .2
		});
		const roadWidth = wx(48 * 1.72);
		const stop = wx(48 * .92);
		for (const vx0 of VERTICAL_STREET_CENTERS) for (const hy0 of HORIZONTAL_STREET_CENTERS) {
			const cx = wx(vx0);
			const cz = wz(hy0);
			for (let i = -3; i <= 3; i++) {
				root.add(box$1(.16, .02, roadWidth, stripe, cx - stop + i * .34, .13, cz));
				root.add(box$1(roadWidth, .02, .16, stripe, cx, .13, cz - stop + i * .34));
			}
			root.add(box$1(.12, .025, roadWidth * .9, stripe, cx - stop - .45, .135, cz));
			root.add(box$1(roadWidth * .9, .025, .12, stripe, cx, .135, cz - stop - .45));
			this.addSignalHead(root, pole, signalCase, "x", vx0, hy0, cx + stop, cz - stop);
			this.addSignalHead(root, pole, signalCase, "y", vx0, hy0, cx - stop, cz + stop);
		}
	}
	addSignalHead(root, poleMat, caseMat, axis, ix, iy, x, z) {
		const group = new Group();
		group.position.set(x, 0, z);
		const pole = new Mesh(new CylinderGeometry(.055, .075, 2.55, 8), poleMat);
		pole.position.y = 1.275;
		group.add(pole);
		group.add(box$1(.34, .9, .22, caseMat, 0, 2.34, 0));
		const red = new MeshStandardMaterial({
			color: 4854033,
			emissive: 16721189,
			emissiveIntensity: .08
		});
		const yellow = new MeshStandardMaterial({
			color: 4864779,
			emissive: 16763176,
			emissiveIntensity: .05
		});
		const green = new MeshStandardMaterial({
			color: 736546,
			emissive: 2418043,
			emissiveIntensity: .05
		});
		for (const [mat, y] of [
			[red, 2.61],
			[yellow, 2.34],
			[green, 2.07]
		]) {
			const lamp = new Mesh(new SphereGeometry(.085, 8, 6), mat);
			lamp.position.set(0, y, .12);
			group.add(lamp);
		}
		if (axis === "x") group.rotation.y = Math.PI / 2;
		root.add(group);
		this.signals.push({
			axis,
			ix,
			iy,
			red,
			yellow,
			green
		});
	}
	makeTextSprite(text, accent, width = 512, height = 128) {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = "rgba(8,10,9,0.9)";
		ctx.fillRect(10, 18, width - 20, height - 36);
		ctx.strokeStyle = accent;
		ctx.lineWidth = 6;
		ctx.strokeRect(13, 21, width - 26, height - 42);
		ctx.fillStyle = accent;
		ctx.fillRect(28, height - 36, width - 56, 5);
		ctx.fillStyle = "#f4f0e7";
		ctx.font = "800 42px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, width / 2, height / 2, width - 62);
		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		texture.needsUpdate = true;
		const sprite = new Sprite(new SpriteMaterial({
			map: texture,
			transparent: true,
			depthWrite: false,
			toneMapped: false
		}));
		sprite.scale.set(5.8, 1.45, 1);
		sprite.renderOrder = 4;
		return sprite;
	}
	buildLandmarkMarkers(root) {
		for (const def of [
			{
				id: "apartment",
				text: "BENJI'S APARTMENT",
				accent: "#1db954",
				y: 5.2
			},
			{
				id: "store",
				text: "$ACKRELIGIOUS HQ",
				accent: "#d4af37",
				y: 6.7
			},
			{
				id: "court",
				text: "901 COURT",
				accent: "#1db954",
				y: 4.2
			},
			{
				id: "dropvan",
				text: "DROP VAN",
				accent: "#d4af37",
				y: 3.5
			},
			{
				id: "beale",
				text: "BEALE STREET",
				accent: "#e85d4c",
				y: 6.4
			},
			{
				id: "pyramid",
				text: "THE PYRAMID",
				accent: "#d4af37",
				y: 15
			},
			{
				id: "river",
				text: "MISSISSIPPI RIVER",
				accent: "#4f9ddf",
				y: 4.8
			}
		]) {
			const poi = POIS.find((p) => p.id === def.id);
			if (!poi) continue;
			const marker = this.makeTextSprite(def.text, def.accent);
			marker.position.set(wx(poi.x + poi.w / 2), def.y, wz(poi.y + poi.h / 2));
			root.add(marker);
			this.markerCount++;
		}
	}
	makeParkedCar(color) {
		const root = new Group();
		const bodyMat = new MeshStandardMaterial({
			color,
			roughness: .42,
			metalness: .32
		});
		const glass = new MeshStandardMaterial({
			color: 1516330,
			roughness: .18,
			metalness: .25
		});
		const tire = new MeshStandardMaterial({
			color: 723723,
			roughness: .96
		});
		root.add(box$1(2.25, .48, 1, bodyMat, 0, .42, 0));
		root.add(box$1(1.15, .42, .86, glass, -.1, .79, 0));
		const wheelGeo = new CylinderGeometry(.24, .24, .16, 10);
		for (const [x, z] of [
			[.72, .5],
			[.72, -.5],
			[-.72, .5],
			[-.72, -.5]
		]) {
			const wheel = new Mesh(wheelGeo, tire);
			wheel.rotation.x = Math.PI / 2;
			wheel.position.set(x, .24, z);
			root.add(wheel);
		}
		return root;
	}
	buildParkedCars(root) {
		const colors = [
			1118481,
			3167610,
			7613741,
			7102539,
			1527091,
			14736853
		];
		const placements = [
			[
				15,
				5,
				0
			],
			[
				24,
				6.8,
				Math.PI
			],
			[
				44,
				20.9,
				0
			],
			[
				53,
				19.1,
				Math.PI
			],
			[
				33.4,
				13,
				Math.PI / 2
			],
			[
				34.7,
				25,
				-Math.PI / 2
			],
			[
				15.2,
				35.2,
				0
			],
			[
				51,
				33.1,
				Math.PI
			],
			[
				27,
				20.8,
				0
			],
			[
				18,
				19.2,
				Math.PI
			],
			[
				49.4,
				7,
				Math.PI / 2
			],
			[
				16.6,
				29,
				-Math.PI / 2
			]
		];
		for (let i = 0; i < placements.length; i++) {
			const [tx, ty, rot] = placements[i];
			const car = this.makeParkedCar(colors[i % colors.length]);
			car.position.set(wx(tx * 48), .02, wz(ty * 48));
			car.rotation.y = rot;
			root.add(car);
			this.parkedCars++;
		}
	}
	buildCourtGameDay(root) {
		const cx = wx(COURT.x + COURT.w / 2);
		const cz = wz(COURT.y + COURT.h / 2);
		const cw = wx(COURT.w);
		const cd = wz(COURT.h);
		const black = new MeshStandardMaterial({
			color: 1052688,
			roughness: .78
		});
		const green = new MeshStandardMaterial({
			color: 553279,
			roughness: .68,
			emissive: 404764,
			emissiveIntensity: .24
		});
		const gold = new MeshStandardMaterial({
			color: 13938487,
			roughness: .52,
			metalness: .22
		});
		const outer = new Mesh(new TorusGeometry(1.65, .13, 8, 32), gold);
		outer.rotation.x = Math.PI / 2;
		outer.position.set(cx, .17, cz);
		root.add(outer);
		const inner = new Mesh(new TorusGeometry(1.18, .08, 8, 32), green);
		inner.rotation.x = Math.PI / 2;
		inner.position.set(cx, .18, cz);
		root.add(inner);
		for (const side of [-1, 1]) {
			const bx = cx + side * (cw / 2 + 1.35);
			root.add(box$1(1.65, .35, cd * .7, black, bx, .22, cz));
			root.add(box$1(1.35, .32, cd * .62, green, bx + side * .35, .55, cz));
			root.add(box$1(1.05, .28, cd * .54, gold, bx + side * .62, .84, cz));
		}
		const sign = this.makeTextSprite("SACKROW BALLERS", "#d4af37");
		sign.scale.set(7.2, 1.8, 1);
		sign.position.set(cx, 5.4, cz - cd / 2 - 1.3);
		root.add(sign);
		this.markerCount++;
		root.add(box$1(5.2, .22, .24, black, cx, 3.65, cz - cd / 2 - 1.22));
		root.add(box$1(2.4, .12, .28, green, cx, 3.34, cz - cd / 2 - 1.18));
		root.add(box$1(1.4, .1, .3, gold, cx, 3.08, cz - cd / 2 - 1.16));
	}
	buildBealeNeon(root) {
		const beale = POIS.find((p) => p.id === "beale");
		if (!beale) return;
		const colors = [
			1947988,
			15228236,
			5217759,
			13938487,
			11619807,
			3196610
		];
		for (let i = 0; i < 10; i++) {
			const material = new MeshStandardMaterial({
				color: colors[i % colors.length],
				emissive: colors[i % colors.length],
				emissiveIntensity: 1.45,
				roughness: .38
			});
			const x = wx(beale.x + 22 + i * ((beale.w - 44) / 9));
			const z = wz(beale.y + (i % 2 === 0 ? 18 : beale.h - 18));
			root.add(box$1(1.1 + i % 3 * .25, .42, .08, material, x, 2.8 + i % 2 * .45, z));
		}
	}
	signalOffset(ix, iy) {
		const sx = nearest(ix, VERTICAL_STREET_CENTERS);
		const sy = nearest(iy, HORIZONTAL_STREET_CENTERS);
		return ((Math.floor(sx / 48) * .37 + Math.floor(sy / 48) * .19) % 1.7 + 1.7) % 1.7;
	}
	signalState(clock, axis, ix, iy) {
		const p = (clock + this.signalOffset(ix, iy)) % 12;
		if (axis === "x") {
			if (p < 4.6) return "green";
			if (p < 5.3) return "yellow";
			return "red";
		}
		if (p < 5.8) return "red";
		if (p < 10.4) return "green";
		if (p < 11.1) return "yellow";
		return "red";
	}
	updateSignals(clock) {
		for (const signal of this.signals) {
			const state = this.signalState(clock, signal.axis, signal.ix, signal.iy);
			signal.red.emissiveIntensity = state === "red" ? 2.8 : .08;
			signal.yellow.emissiveIntensity = state === "yellow" ? 2.4 : .05;
			signal.green.emissiveIntensity = state === "green" ? 2.5 : .05;
		}
	}
	approachFor(car, lane) {
		const centers = lane.axis === "x" ? VERTICAL_STREET_CENTERS : HORIZONTAL_STREET_CENTERS;
		const along = lane.axis === "x" ? car.x : car.y;
		let bestCenter = null;
		let bestDelta = Infinity;
		for (const center of centers) {
			const delta = (center - along) * lane.dir;
			if (delta < -10 || delta > 82) continue;
			if (delta < bestDelta) {
				bestDelta = delta;
				bestCenter = center;
			}
		}
		if (bestCenter === null) return null;
		const ix = lane.axis === "x" ? bestCenter : nearest(lane.fixed, VERTICAL_STREET_CENTERS);
		const iy = lane.axis === "x" ? nearest(lane.fixed, HORIZONTAL_STREET_CENTERS) : bestCenter;
		return {
			center: bestCenter,
			delta: bestDelta,
			ix,
			iy
		};
	}
	destinationLane(lane, center, turn) {
		const axis = lane.axis === "x" ? "y" : "x";
		const desiredDir = lane.axis === "x" ? turn === "left" ? -lane.dir : lane.dir : turn === "left" ? lane.dir : -lane.dir;
		return this.lanes.filter((candidate) => candidate.axis === axis && candidate.dir === desiredDir && Math.abs(candidate.fixed - center) < 48 * .62).sort((a, b) => Math.abs(a.fixed - center) - Math.abs(b.fixed - center))[0] ?? null;
	}
	preSync(f) {
		let stoppedAtRed = 0;
		let movingPeds = 0;
		let pausedPeds = 0;
		for (let i = 0; i < f.cars.length; i++) {
			const car = f.cars[i];
			if (!car.laneId) continue;
			const lane = this.laneMap.get(car.laneId);
			if (!lane) continue;
			let memory = this.trafficMemory.get(car);
			if (!memory) {
				memory = {
					turnCount: 0,
					cooldownUntil: f.clock + pseudo(i * 7.3) * 1.5
				};
				this.trafficMemory.set(car, memory);
			}
			const approach = this.approachFor(car, lane);
			if (!approach) continue;
			const signal = this.signalState(f.clock, lane.axis, approach.ix, approach.iy);
			const yellowStop = signal === "yellow" && approach.delta > 28;
			if ((signal === "red" || yellowStop) && approach.delta > 0 && approach.delta < 62) {
				const stopGap = Math.max(28, car.w * .64);
				const stopCoord = approach.center - lane.dir * stopGap;
				const toStop = (stopCoord - (lane.axis === "x" ? car.x : car.y)) * lane.dir;
				if (toStop <= 8 && toStop > -7) {
					if (lane.axis === "x") car.x = stopCoord;
					else car.y = stopCoord;
					car.vx = 0;
					car.vy = 0;
					stoppedAtRed++;
				} else if (toStop > 0) {
					car.vx *= .22;
					car.vy *= .22;
				}
			}
			if (signal !== "green" || f.clock < memory.cooldownUntil || approach.delta < -10 || approach.delta > 15) continue;
			const roll = pseudo(i * 97 + memory.turnCount * 41 + approach.center * .013);
			const turn = roll < .18 ? "left" : roll < .36 ? "right" : null;
			memory.turnCount++;
			memory.cooldownUntil = f.clock + 1.7;
			if (!turn) continue;
			const destination = this.destinationLane(lane, approach.center, turn);
			if (!destination) continue;
			car.laneId = destination.id;
			if (destination.axis === "x") car.y = destination.fixed;
			else car.x = destination.fixed;
			const velocity = laneVelocity(destination, .62);
			car.vx = velocity.vx;
			car.vy = velocity.vy;
			this.totalTurns++;
		}
		for (let i = 0; i < f.peds.length; i++) {
			const ped = f.peds[i];
			if (typeof ped.vx !== "number" || typeof ped.vy !== "number") continue;
			if (Math.hypot(ped.vx, ped.vy) > .5) movingPeds++;
			let memory = this.pedMemory.get(ped);
			if (!memory) {
				memory = {
					nextDecision: f.clock + .6 + pseudo(i * 19) * 2.5,
					pauseUntil: 0,
					resumeVx: 0,
					resumeVy: 0,
					pauseCount: 0
				};
				this.pedMemory.set(ped, memory);
			}
			if (f.clock < memory.pauseUntil) {
				ped.vx = 0;
				ped.vy = 0;
				pausedPeds++;
				continue;
			}
			if (memory.resumeVx !== 0 || memory.resumeVy !== 0) {
				ped.vx = memory.resumeVx;
				ped.vy = memory.resumeVy;
				memory.resumeVx = 0;
				memory.resumeVy = 0;
			}
			if (f.clock < memory.nextDecision) continue;
			const roll = pseudo(i * 53 + memory.pauseCount * 17 + Math.floor(f.clock * .5));
			memory.nextDecision = f.clock + 2.2 + pseudo(i * 31 + memory.pauseCount * 11) * 3.8;
			if (roll > .58 || Math.hypot(ped.vx, ped.vy) < .5) continue;
			memory.resumeVx = ped.vx;
			memory.resumeVy = ped.vy;
			memory.pauseUntil = f.clock + .8 + pseudo(i * 47 + memory.pauseCount * 13) * 1.7;
			memory.pauseCount++;
			this.pedestrianPauses++;
			ped.vx = 0;
			ped.vy = 0;
			pausedPeds++;
		}
		this.lastStoppedAtRed = stoppedAtRed;
		this.lastMovingPeds = movingPeds;
		this.lastPausedPeds = pausedPeds;
	}
	lastStoppedAtRed = 0;
	lastMovingPeds = 0;
	lastPausedPeds = 0;
	postSync(f, carGroups, npcSprites) {
		this.updateSignals(f.clock);
		this.smoothCarVisuals(f, carGroups);
		this.ensureCourtCrowd(npcSprites);
		if (this.courtCrowd) {
			const cx = COURT.x + COURT.w / 2;
			const cy = COURT.y + COURT.h / 2;
			const near = Math.hypot(f.px - cx, f.py - cy) < 520;
			this.courtCrowd.visible = f.mode === "basketball" || near;
			for (let i = 0; i < this.courtCrowd.children.length; i++) {
				const child = this.courtCrowd.children[i];
				child.position.y = .95 + Math.sin(f.clock * 2.2 + i * 1.4) * .025;
			}
		}
		this.publishDiagnostics(f);
	}
	smoothCarVisuals(f, groups) {
		const ease = 1 - Math.exp(-10 * Math.min(f.dt || 1 / 60, .05));
		for (let i = 0; i < groups.length; i++) {
			const car = f.cars[i];
			const group = groups[i];
			if (!car || !group || !group.visible) continue;
			const target = Math.abs(car.vy) > Math.abs(car.vx) ? car.vy > 0 ? 0 : Math.PI : car.vx < 0 ? Math.PI / 2 : -Math.PI / 2;
			const smooth = lerpAngle(typeof group.userData.smoothYaw === "number" ? group.userData.smoothYaw : target, target, ease);
			group.userData.smoothYaw = smooth;
			group.rotation.y = smooth;
			const speed = Math.min(1, Math.hypot(car.vx, car.vy) / 85);
			group.position.y = Math.sin(f.clock * 7.5 + i * .83) * .012 * speed;
		}
	}
	ensureCourtCrowd(npcSprites) {
		if (this.courtCrowd) return;
		const ids = [
			"court_coach",
			"supporter_1",
			"downtown_fan",
			"culture_host",
			"street_npc",
			"k_blanco"
		];
		if (ids.some((id) => !npcSprites.get(id))) return;
		const group = new Group();
		group.name = "sackrow-court-crowd";
		const positions = [
			[COURT.x + 22, COURT.y + 74],
			[COURT.x + 24, COURT.y + 145],
			[COURT.x + 26, COURT.y + 215],
			[COURT.x + COURT.w - 22, COURT.y + 82],
			[COURT.x + COURT.w - 24, COURT.y + 154],
			[COURT.x + COURT.w - 26, COURT.y + 224]
		];
		for (let i = 0; i < ids.length; i++) {
			const source = npcSprites.get(ids[i]);
			if (!source) continue;
			const clone = new Sprite(source.material.clone());
			clone.scale.copy(source.scale).multiplyScalar(i === 0 ? 1.08 : .94 + i % 3 * .05);
			clone.position.set(wx(positions[i][0]), .95, wz(positions[i][1]));
			group.add(clone);
		}
		this.courtCrowd = group;
		this.scene.add(group);
	}
	publishDiagnostics(f) {
		let offLaneCars = 0;
		const sampleLanes = [];
		for (const raw of f.cars) {
			const car = raw;
			if (!car.laneId) continue;
			const lane = this.laneMap.get(car.laneId);
			if (!lane) {
				offLaneCars++;
				continue;
			}
			if ((lane.axis === "x" ? Math.abs(car.y - lane.fixed) : Math.abs(car.x - lane.fixed)) > 48 * .72) offLaneCars++;
			if (sampleLanes.length < 8) sampleLanes.push(car.laneId);
		}
		window.__SACK_TRAFFIC__ = {
			cars: f.cars.length,
			lanes: this.lanes.length,
			signals: this.signals.length,
			markers: this.markerCount,
			parkedCars: this.parkedCars,
			courtCrowd: this.courtCrowd?.children.length ?? 0,
			turningEnabled: true,
			totalTurns: this.totalTurns,
			stoppedAtRed: this.lastStoppedAtRed,
			pedestrianPauses: this.pedestrianPauses,
			movingPeds: this.lastMovingPeds,
			pausedPeds: this.lastPausedPeds,
			offLaneCars,
			sampleLanes
		};
	}
};
var CAMERA_ORBITS = [
	.38,
	-.38,
	.72,
	-.72,
	1.02,
	-1.02
];
var UP = new Vector3(0, 1, 0);
var APARTMENT = POIS.find((p) => p.id === "apartment");
var STORE = POIS.find((p) => p.id === "store");
function box(w, h, d, material, x, y, z) {
	const mesh = new Mesh(new BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	mesh.receiveShadow = true;
	return mesh;
}
function isActuallyVisible(object) {
	let node = object;
	while (node) {
		if (!node.visible) return false;
		node = node.parent;
	}
	return true;
}
function inside(f, p) {
	return f.px >= p.x && f.px <= p.x + p.w && f.py >= p.y && f.py <= p.y + p.h;
}
var World3D = class extends World3D$1 {
	cameraBlockers = [];
	cameraRay = new Raycaster();
	cameraTarget = new Vector3();
	cameraDesired = new Vector3();
	cameraOffset = new Vector3();
	cameraCandidate = new Vector3();
	cameraBest = new Vector3();
	cameraDirection = new Vector3();
	lastCameraOccluded = false;
	apartmentExterior = null;
	apartmentInterior = null;
	hqExterior = null;
	hqInterior = null;
	worldLife = new WorldLifePass(this.scene);
	buildCity(walls, trees) {
		super.buildCity(walls, trees);
		this.cameraBlockers = [];
		this.apartmentExterior = this.findLandmark(APARTMENT);
		this.hqExterior = this.findLandmark(STORE);
		this.scene.traverse((obj) => {
			if (!(obj instanceof Mesh) || !(obj.geometry instanceof BoxGeometry)) return;
			const p = obj.geometry.parameters;
			const width = Number(p.width) || 0;
			const height = Number(p.height) || 0;
			const depth = Number(p.depth) || 0;
			if (width >= 1.25 && height >= 1.7 && depth >= 1.25) this.cameraBlockers.push(obj);
		});
		this.apartmentInterior?.removeFromParent();
		this.apartmentInterior = this.buildApartmentInterior(wx(APARTMENT.x + APARTMENT.w / 2), wz(APARTMENT.y + APARTMENT.h / 2));
		this.apartmentInterior.visible = false;
		this.scene.add(this.apartmentInterior);
		this.hqInterior?.removeFromParent();
		this.hqInterior = this.buildHQInterior(wx(STORE.x + STORE.w / 2), wz(STORE.y + STORE.h / 2));
		this.hqInterior.visible = false;
		this.scene.add(this.hqInterior);
		this.worldLife.build();
	}
	findLandmark(poi) {
		const cx = wx(poi.x + poi.w / 2);
		const cz = wz(poi.y + poi.h / 2);
		for (const child of this.scene.children) {
			if (!(child instanceof Group)) continue;
			if (Math.abs(child.position.x - cx) > .02 || Math.abs(child.position.z - cz) > .02) continue;
			if (child.children.some((c) => c instanceof Mesh && c.geometry instanceof BoxGeometry)) return child;
		}
		return null;
	}
	addSouthDoor(root, width, halfD, wallH, wallT, wallMat, trimMat, doorX, doorW) {
		const halfW = width / 2;
		const doorL = doorX - doorW / 2;
		const doorR = doorX + doorW / 2;
		const leftW = Math.max(0, doorL + halfW);
		const rightW = Math.max(0, halfW - doorR);
		if (leftW > .01) root.add(box(leftW, wallH, wallT, wallMat, -halfW + leftW / 2, wallH / 2, halfD));
		if (rightW > .01) root.add(box(rightW, wallH, wallT, wallMat, doorR + rightW / 2, wallH / 2, halfD));
		root.add(box(doorW, .18, wallT + .04, trimMat, doorX, 2.55, halfD));
	}
	buildApartmentInterior(cx, cz) {
		const root = new Group();
		root.position.set(cx, 0, cz);
		root.name = "benji-apartment-interior";
		const floorMat = new MeshStandardMaterial({
			color: 3680543,
			roughness: .86,
			metalness: .02
		});
		const wallMat = new MeshStandardMaterial({
			color: 14273464,
			roughness: .92
		});
		const trimMat = new MeshStandardMaterial({
			color: 1588519,
			roughness: .72
		});
		const darkMat = new MeshStandardMaterial({
			color: 1513239,
			roughness: .82
		});
		const fabricMat = new MeshStandardMaterial({
			color: 1929026,
			roughness: .95
		});
		const woodMat = new MeshStandardMaterial({
			color: 7030056,
			roughness: .9
		});
		const goldMat = new MeshStandardMaterial({
			color: 13938487,
			roughness: .5,
			metalness: .35
		});
		const width = wx(APARTMENT.w) - .35;
		const depth = wz(APARTMENT.h) - .35;
		const halfW = width / 2;
		const halfD = depth / 2;
		const wallH = 3.05;
		const wallT = .14;
		root.add(box(width, .1, depth, floorMat, 0, .04, 0));
		root.add(box(width, wallH, wallT, wallMat, 0, wallH / 2, -halfD));
		root.add(box(wallT, wallH, depth, wallMat, -halfW, wallH / 2, 0));
		root.add(box(wallT, wallH, depth, wallMat, halfW, wallH / 2, 0));
		this.addSouthDoor(root, width, halfD, wallH, wallT, wallMat, trimMat, wx(288 - (APARTMENT.x + APARTMENT.w / 2)), wx(48 * 1.3));
		const rug = new Mesh(new PlaneGeometry(4, 2.8), new MeshStandardMaterial({
			color: 1006645,
			roughness: 1
		}));
		rug.rotation.x = -Math.PI / 2;
		rug.position.set(1.25, .105, .3);
		root.add(rug);
		root.add(box(3.45, .5, 2.15, darkMat, -2.55, .3, -2.55));
		root.add(box(3.25, .34, 1.95, fabricMat, -2.55, .63, -2.55));
		root.add(box(3.25, .5, .16, trimMat, -2.55, 1.02, -3.5));
		root.add(box(.85, .74, .75, woodMat, -4.25, .39, -2.7));
		root.add(box(2.9, .65, 1.08, fabricMat, 2.05, .42, -.15));
		root.add(box(2.9, .72, .28, trimMat, 2.05, .78, -.62));
		root.add(box(1.65, .18, .9, woodMat, 1.3, .3, 1.35));
		root.add(box(2.05, 1.2, .12, darkMat, 2.55, 1.72, -halfD + .1));
		root.add(box(1.75, .92, .06, new MeshStandardMaterial({
			color: 729623,
			emissive: 534037,
			emissiveIntensity: .45
		}), 2.55, 1.72, -halfD + .02));
		root.add(box(2.55, 1.15, .08, darkMat, -.25, 1.85, -halfD + .04));
		root.add(box(2.1, .12, .06, goldMat, -.25, 2.14, -halfD - .01));
		root.add(box(1.5, .11, .06, fabricMat, -.25, 1.84, -halfD - .01));
		root.add(box(.9, .11, .06, goldMat, -.25, 1.54, -halfD - .01));
		root.add(box(1.8, .92, .58, woodMat, -3.65, .48, 2.65));
		root.add(box(.72, .28, .52, darkMat, -3.1, 1.05, 2.65));
		root.add(box(.72, .28, .52, trimMat, -3.85, 1.05, 2.65));
		const light = new PointLight(16768432, 3.1, 17, 1.55);
		light.position.set(0, 2.65, .2);
		root.add(light);
		const fill = new PointLight(5622920, .75, 10, 2);
		fill.position.set(-3.2, 1.65, -2.3);
		root.add(fill);
		return root;
	}
	buildHQInterior(cx, cz) {
		const root = new Group();
		root.position.set(cx, 0, cz);
		root.name = "sackreligious-hq-interior";
		const black = new MeshStandardMaterial({
			color: 1118481,
			roughness: .72
		});
		const charcoal = new MeshStandardMaterial({
			color: 2368548,
			roughness: .78
		});
		const green = new MeshStandardMaterial({
			color: 551739,
			roughness: .68
		});
		const gold = new MeshStandardMaterial({
			color: 14068269,
			roughness: .4,
			metalness: .42
		});
		const wall = new MeshStandardMaterial({
			color: 15065560,
			roughness: .9
		});
		const wood = new MeshStandardMaterial({
			color: 5912868,
			roughness: .88
		});
		const width = wx(STORE.w) - .35;
		const depth = wz(STORE.h) - .35;
		const halfW = width / 2;
		const halfD = depth / 2;
		const wallH = 3.25;
		const wallT = .14;
		root.add(box(width, .1, depth, charcoal, 0, .04, 0));
		root.add(box(width, wallH, wallT, wall, 0, wallH / 2, -halfD));
		root.add(box(wallT, wallH, depth, wall, -halfW, wallH / 2, 0));
		root.add(box(wallT, wallH, depth, wall, halfW, wallH / 2, 0));
		this.addSouthDoor(root, width, halfD, wallH, wallT, wall, green, 0, wx(48 * 1.7));
		root.add(box(4.2, 1.05, .82, black, 4.2, .55, -3.9));
		root.add(box(4.2, .08, .88, gold, 4.2, 1.08, -3.9));
		root.add(box(.75, .55, .5, green, 3.1, 1.42, -3.9));
		for (const x of [
			-5.4,
			-2.5,
			.4
		]) {
			root.add(box(.1, 1.8, 3.1, gold, x, 1, -1.5));
			root.add(box(.82, .72, 2.75, black, x + .48, .42, -1.5));
			root.add(box(.58, .12, 2.35, green, x + .48, .86, -1.5));
		}
		root.add(box(3.4, .75, 1.45, wood, -2.5, .4, 2.4));
		root.add(box(1, .18, 1.1, green, -3.5, .88, 2.4));
		root.add(box(1, .18, 1.1, gold, -2.35, .88, 2.4));
		root.add(box(1, .18, 1.1, black, -1.2, .88, 2.4));
		root.add(box(6.6, 1.65, .08, black, 0, 2.05, -halfD + .04));
		root.add(box(5.5, .16, .06, green, 0, 2.48, -halfD - .01));
		root.add(box(4.6, .18, .06, gold, 0, 2.08, -halfD - .01));
		root.add(box(3.2, .12, .06, green, 0, 1.68, -halfD - .01));
		root.add(box(2.4, .55, 1, green, 3.8, .33, 1.8));
		root.add(box(1.3, .2, .8, gold, 3.8, .7, 1.8));
		const key = new PointLight(16768922, 3.6, 21, 1.5);
		key.position.set(0, 3, 0);
		root.add(key);
		const greenFill = new PointLight(2675068, 1.25, 15, 1.8);
		greenFill.position.set(-5.2, 2.3, -2.4);
		root.add(greenFill);
		const goldFill = new PointLight(16762954, 1, 13, 1.8);
		goldFill.position.set(5.1, 2.2, 2);
		root.add(goldFill);
		return root;
	}
	blockerDistance(position) {
		this.cameraDirection.subVectors(position, this.cameraTarget);
		const distance = this.cameraDirection.length();
		if (distance < .25) return null;
		this.cameraDirection.multiplyScalar(1 / distance);
		this.cameraRay.set(this.cameraTarget, this.cameraDirection);
		this.cameraRay.near = .28;
		this.cameraRay.far = distance - .04;
		return this.cameraRay.intersectObjects(this.cameraBlockers, false).find((candidate) => candidate.distance > .3 && candidate.distance < distance - .04 && isActuallyVisible(candidate.object))?.distance ?? null;
	}
	sync(f) {
		this.worldLife.preSync(f);
		super.sync(f);
		this.worldLife.postSync(f, this.cars, this.npcSprites);
		const inApartment = inside(f, APARTMENT) && f.mode === "world";
		const inHQ = inside(f, STORE) && (f.mode === "world" || f.mode === "dialogue" || f.mode === "shop");
		if (this.apartmentExterior) this.apartmentExterior.visible = !inApartment;
		if (this.apartmentInterior) this.apartmentInterior.visible = inApartment;
		if (this.hqExterior) this.hqExterior.visible = !inHQ;
		if (this.hqInterior) this.hqInterior.visible = inHQ;
		if (f.cameraView !== "third") {
			this.lastCameraOccluded = false;
			return;
		}
		const air = f.air ?? 0;
		this.cameraTarget.set(wx(f.px), 1.2 + air * .55, wz(f.py));
		this.cameraDesired.copy(this.camera.position);
		this.scene.updateMatrixWorld(true);
		const directHit = this.blockerDistance(this.cameraDesired);
		this.lastCameraOccluded = directHit !== null;
		if (directHit !== null) {
			this.cameraOffset.subVectors(this.cameraDesired, this.cameraTarget);
			let foundClear = false;
			let bestClearance = directHit;
			this.cameraBest.copy(this.cameraDesired);
			for (const angle of CAMERA_ORBITS) {
				this.cameraCandidate.copy(this.cameraOffset).applyAxisAngle(UP, angle).add(this.cameraTarget);
				const hit = this.blockerDistance(this.cameraCandidate);
				if (hit === null) {
					this.cameraBest.copy(this.cameraCandidate);
					foundClear = true;
					break;
				}
				if (hit > bestClearance) {
					bestClearance = hit;
					this.cameraBest.copy(this.cameraCandidate);
				}
			}
			if (!foundClear) {
				this.cameraCandidate.copy(this.cameraDesired);
				this.cameraCandidate.y += 1.15;
				const raisedHit = this.blockerDistance(this.cameraCandidate);
				if (raisedHit === null) {
					this.cameraBest.copy(this.cameraCandidate);
					foundClear = true;
				} else if (raisedHit > bestClearance) {
					bestClearance = raisedHit;
					this.cameraBest.copy(this.cameraCandidate);
				}
			}
			if (foundClear) {
				this.camera.position.copy(this.cameraBest);
				this.camera.lookAt(this.cameraTarget);
			} else if (bestClearance > 1.85) {
				this.cameraDirection.subVectors(this.cameraBest, this.cameraTarget).normalize();
				this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, Math.max(1.65, bestClearance - .28));
				this.camera.lookAt(this.cameraTarget);
			}
		}
		const actualCameraYaw = Math.atan2(this.camera.position.x - this.cameraTarget.x, this.camera.position.z - this.cameraTarget.z);
		const yawDelta = Math.atan2(Math.sin(actualCameraYaw - f.yaw), Math.cos(actualCameraYaw - f.yaw));
		if (Math.abs(yawDelta) > .001) {
			this.benji.update(0, f.heading, actualCameraYaw, f.moveSpeed, f.lean, f.loco, f.animT, true, f.air, f.vz);
			for (const ped of this.peds) if (ped.visible) ped.rotation.y = actualCameraYaw;
		}
		window.__SACK_CAMERA__ = {
			blockers: this.cameraBlockers.length,
			occluded: this.lastCameraOccluded,
			distance: this.camera.position.distanceTo(this.cameraTarget),
			yawDelta,
			apartment: inApartment,
			hq: inHQ
		};
	}
};
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
	noiseBuf = null;
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
	noise() {
		if (!this.ctx) return null;
		if (!this.noiseBuf) {
			this.noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * .22), this.ctx.sampleRate);
			const d = this.noiseBuf.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		return this.noiseBuf;
	}
	noiseBurst(dur, vol, hp, lp) {
		if (!this.ctx || !this.sfx) return;
		const buf = this.noise();
		if (!buf) return;
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		const f = this.ctx.createBiquadFilter();
		f.type = "highpass";
		f.frequency.value = hp;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(vol, this.ctx.currentTime);
		g.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + dur);
		src.connect(f);
		if (lp) {
			const lpf = this.ctx.createBiquadFilter();
			lpf.type = "lowpass";
			lpf.frequency.value = lp;
			f.connect(lpf);
			lpf.connect(g);
		} else f.connect(g);
		g.connect(this.sfx);
		src.start();
		src.stop(this.ctx.currentTime + dur + .02);
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
	duck(amount = .38, recover = .55) {
		if (!this.ctx || !this.music) return;
		const now = this.ctx.currentTime;
		const curve = (x) => x * x;
		const base = curve(this.volumes.music);
		this.music.gain.setTargetAtTime(base * amount, now, .04);
		this.music.gain.setTargetAtTime(base, now + recover, .18);
	}
	ui() {
		this.tone(660, .06, "triangle", .07);
	}
	interact() {
		this.tone(640, .05, "triangle", .065);
		this.tone(980, .07, "sine", .03);
		this.noiseBurst(.04, .02, 2400);
	}
	confirm() {
		this.tone(520, .08, "triangle", .08);
		this.tone(780, .1, "sine", .05);
	}
	cash() {
		this.tone(880, .08, "square", .05);
		this.tone(1320, .12, "triangle", .06);
		this.tone(1760, .09, "sine", .03);
	}
	deliver() {
		this.tone(392, .1, "triangle", .07);
		this.tone(523, .14, "sine", .055);
		this.tone(784, .18, "triangle", .05);
		this.cash();
	}
	swish() {
		this.tone(740, .09, "sine", .08);
		this.tone(1180, .16, "triangle", .07);
		this.noiseBurst(.08, .03, 1800, 5200);
	}
	perfect() {
		this.tone(880, .1, "sine", .09);
		this.tone(1174, .14, "triangle", .07);
		this.tone(1568, .2, "sine", .055);
		this.noiseBurst(.1, .04, 1400, 6400);
	}
	combo(n) {
		const f = 520 + Math.min(n, 8) * 42;
		this.tone(f, .07, "triangle", .05);
		this.tone(f * 1.5, .05, "sine", .028);
	}
	rim() {
		this.tone(180, .08, "square", .05);
		this.tone(90, .12, "sine", .08);
		this.noiseBurst(.07, .035, 600, 2400);
	}
	bounce() {
		this.tone(140, .07, "sine", .06);
		this.noiseBurst(.04, .02, 300, 1600);
	}
	trophy() {
		this.tone(523, .12, "triangle", .08);
		this.tone(659, .16, "triangle", .07);
		this.tone(784, .22, "sine", .08);
	}
	mission() {
		this.duck(.32, .7);
		this.tone(392, .18, "triangle", .08);
		this.tone(523, .24, "triangle", .07);
		this.tone(659, .32, "sine", .09);
	}
	grade(letter) {
		if (letter === "S" || letter === "A") {
			this.mission();
			this.tone(988, .22, "sine", .05);
		} else this.confirm();
	}
	talk() {
		const f = 240 + Math.random() * 80;
		this.tone(f, .05, "triangle", .04);
	}
	foot(now, running = false) {
		const gap = running ? .2 : .3;
		if (now - this.lastFoot < gap) return;
		this.lastFoot = now;
		const vol = running ? .05 : .03;
		this.tone((running ? 72 : 88) + Math.random() * 26, .045, "sine", vol);
		this.noiseBurst(.035, running ? .032 : .018, running ? 280 : 420, running ? 1400 : 1800);
	}
	whoosh() {
		this.tone(320, .1, "sawtooth", .03);
		this.noiseBurst(.09, .025, 400, 2200);
	}
	jump() {
		this.tone(210, .07, "sine", .05);
		this.tone(390, .08, "triangle", .028);
		this.noiseBurst(.06, .022, 380, 2100);
	}
	land() {
		this.tone(92, .07, "sine", .055);
		this.noiseBurst(.05, .03, 220, 1400);
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
		lookX: 0,
		jump: false
	};
	device = "keyboard";
	prevShoot = false;
	prevInteract = false;
	prevBack = false;
	prevPause = false;
	prevView = false;
	prevJump = false;
	padInteract = false;
	padBack = false;
	padPause = false;
	padShoot = false;
	padRun = false;
	padJump = false;
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
	queuedJump = false;
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
		if (e.code === "Space") this.queuedJump = true;
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
		if (e.code === "KeyF") this.queuedShootRelease = true;
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
	queueJump() {
		this.queuedJump = true;
		this.touch.jump = true;
	}
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
		const interactHeld = this.keys.has("KeyE") || this.keys.has("Enter") || this.padInteract;
		const backHeld = this.keys.has("Escape") || this.keys.has("Backspace") || this.padBack;
		const pauseHeld = this.keys.has("Escape") || this.keys.has("KeyP") || this.padPause;
		const shootHeld = this.keys.has("KeyF") || this.padShoot || this.touch.shoot;
		const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.padRun;
		const jumpHeld = this.keys.has("Space") || this.padJump || this.touch.jump;
		const interactPressed = interactHeld && !this.prevInteract || this.queuedInteract;
		const backPressed = backHeld && !this.prevBack || this.queuedBack;
		const pausePressed = pauseHeld && !this.prevPause || this.queuedPause;
		const shootPressed = shootHeld && !this.prevShoot || this.queuedShootPress;
		const shootReleased = !shootHeld && this.prevShoot || this.queuedShootRelease;
		const jumpPressed = jumpHeld && !this.prevJump || this.queuedJump;
		this.queuedInteract = false;
		this.queuedBack = false;
		this.queuedPause = false;
		this.queuedJump = false;
		const viewHeld = this.keys.has("KeyV") || this.keys.has("KeyC");
		const viewPressed = viewHeld && !this.prevView || this.queuedView;
		this.queuedView = false;
		this.prevView = viewHeld;
		this.prevInteract = interactHeld;
		this.prevBack = backHeld;
		this.prevPause = pauseHeld;
		this.prevShoot = shootHeld;
		this.prevJump = jumpHeld;
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
			viewPressed,
			jump: jumpHeld,
			jumpPressed
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
		this.padJump = false;
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
			this.padJump = !!p.buttons[5]?.pressed;
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
			shoot: "X",
			jump: "RB"
		};
		if (device === "touch") return {
			interact: "TAP",
			pause: "II",
			run: "HOLD",
			shoot: "SHOOT",
			jump: "JUMP"
		};
		return {
			interact: "E",
			pause: "Esc",
			run: "Shift",
			shoot: "F",
			jump: "Space"
		};
	}
};
function approach(current, target, maxDelta) {
	const d = target - current;
	if (Math.abs(d) <= maxDelta) return target;
	return current + Math.sign(d) * maxDelta;
}
function wrapAngle(a) {
	return Math.atan2(Math.sin(a), Math.cos(a));
}
function dampAngle(current, target, rate, dt) {
	return current + wrapAngle(target - current) * (1 - Math.exp(-rate * dt));
}
var CharacterController = class {
	vx = 0;
	vy = 0;
	vz = 0;
	air = 0;
	heading = 0;
	speed = 0;
	lean = 0;
	turnLean = 0;
	state = "idle";
	animT = 0;
	interactT = 0;
	shootT = 0;
	grounded = true;
	jumped = false;
	landed = false;
	coyote = 0;
	jumpBuffer = 0;
	walkSpeed = 168;
	runSpeed = 268;
	accel = 940;
	decel = 1520;
	turnIdle = 11.5;
	turnWalk = 8.2;
	turnRun = 4.05;
	jumpVel = 6.15;
	gravity = 15.4;
	triggerInteract() {
		this.interactT = .38;
	}
	triggerShoot() {
		this.shootT = .42;
	}
	tryJump() {
		this.jumpBuffer = .14;
	}
	reset(heading = 0) {
		this.vx = 0;
		this.vy = 0;
		this.vz = 0;
		this.air = 0;
		this.heading = heading;
		this.speed = 0;
		this.lean = 0;
		this.turnLean = 0;
		this.state = "idle";
		this.animT = 0;
		this.interactT = 0;
		this.shootT = 0;
		this.grounded = true;
		this.jumped = false;
		this.landed = false;
		this.coyote = 0;
		this.jumpBuffer = 0;
	}
	update(dt, wishX, wishY, runHeld, jumpPressed = false, jumpHeld = false) {
		this.jumped = false;
		this.landed = false;
		if (jumpPressed) this.tryJump();
		const wishLen = Math.hypot(wishX, wishY);
		const sprint = runHeld && wishLen > .18;
		const maxSpeed = sprint ? this.runSpeed : this.walkSpeed;
		let tx = 0;
		let ty = 0;
		if (wishLen > .01) {
			tx = wishX / wishLen * maxSpeed;
			ty = wishY / wishLen * maxSpeed;
		}
		const hasWish = wishLen > .01;
		const rate = hasWish ? this.accel : this.decel;
		this.vx = approach(this.vx, tx, rate * dt);
		this.vy = approach(this.vy, ty, rate * dt);
		this.speed = Math.hypot(this.vx, this.vy);
		if (this.speed > 10) {
			const desired = Math.atan2(-this.vx, -this.vy);
			const turnRate = this.speed > this.walkSpeed * .88 ? this.turnRun : this.turnWalk;
			this.heading = dampAngle(this.heading, desired, turnRate, dt);
			this.turnLean = wrapAngle(desired - this.heading);
		} else if (hasWish) {
			const desired = Math.atan2(-wishX, -wishY);
			this.heading = dampAngle(this.heading, desired, this.turnIdle, dt);
			this.turnLean *= Math.exp(-8 * dt);
		} else this.turnLean *= Math.exp(-6 * dt);
		const targetLean = ((hasWish ? maxSpeed : 0) - this.speed) / Math.max(maxSpeed, 1) * .16 + this.turnLean * .28;
		this.lean += (targetLean - this.lean) * (1 - Math.exp(-10 * dt));
		if (this.grounded) this.coyote = .11;
		else this.coyote = Math.max(0, this.coyote - dt);
		if (this.jumpBuffer > 0) {
			this.jumpBuffer -= dt;
			if (this.grounded || this.coyote > 0) {
				this.vz = this.jumpVel;
				this.air = Math.max(this.air, .02);
				this.grounded = false;
				this.coyote = 0;
				this.jumpBuffer = 0;
				this.jumped = true;
			}
		}
		if (!this.grounded) {
			if (!jumpHeld && this.vz > 2.1) this.vz *= Math.exp(-6 * dt);
			this.vz -= this.gravity * dt;
			this.air += this.vz * dt;
			if (this.air <= 0) {
				this.air = 0;
				this.vz = 0;
				this.grounded = true;
				this.landed = true;
			}
		}
		if (!this.grounded || this.air > .03) this.state = "jump";
		else if (this.shootT > 0) {
			this.shootT -= dt;
			this.state = "shoot";
		} else if (this.interactT > 0) {
			this.interactT -= dt;
			this.state = "interact";
		} else if (this.speed < 14) this.state = Math.abs(this.turnLean) > .55 ? "turn" : "idle";
		else if (sprint && this.speed > this.walkSpeed * .9) this.state = "run";
		else this.state = "walk";
		const cadence = this.state === "run" ? 11.2 : this.state === "walk" ? 7.4 : this.state === "jump" ? 6 : 1.7;
		this.animT += dt * cadence * (.55 + Math.min(this.speed / this.runSpeed, 1) * .7);
	}
	facing() {
		const a = (this.heading % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
		if (a >= Math.PI * 1.75 || a < Math.PI * .25) return "up";
		if (a < Math.PI * .75) return "right";
		if (a < Math.PI * 1.25) return "down";
		return "left";
	}
};
var JUICE = {
	trauma: {
		interact: .1,
		pickup: .26,
		deliver: .34,
		cash: .2,
		perfect: .48,
		make: .3,
		miss: .16,
		combo: .12,
		complete: .55,
		grade: .22,
		jump: .12,
		land: .16
	},
	hitstop: {
		pickup: .035,
		deliver: .05,
		perfect: .08,
		make: .04
	},
	punch: {
		deliver: .55,
		perfect: .72,
		make: .38,
		complete: .82
	}
};
function emitBurst(color, count = 22) {
	const out = [];
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2;
		const s = 90 + Math.random() * 240;
		const life = .42 + Math.random() * .5;
		out.push({
			ox: (Math.random() - .5) * 18,
			oy: (Math.random() - .5) * 10,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s - 50,
			life,
			maxLife: life,
			color,
			size: 2 + Math.random() * 5
		});
	}
	return out;
}
function stepParticles(list, dt) {
	for (let i = list.length - 1; i >= 0; i--) {
		const p = list[i];
		p.ox += p.vx * dt;
		p.oy += p.vy * dt;
		p.vy += 220 * dt;
		p.life -= dt;
		if (p.life <= 0) list.splice(i, 1);
	}
}
/** Client-safe game configuration. Never put secrets here. */
function env(name) {
	try {
		return {
			"BASE_URL": "/",
			"DEV": false,
			"MODE": "production",
			"PROD": true,
			"SSR": true,
			"TSS_DEV_SERVER": "false",
			"TSS_DEV_SSR_STYLES_BASEPATH": "/",
			"TSS_DEV_SSR_STYLES_ENABLED": "true",
			"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
			"TSS_INLINE_CSS_ENABLED": "false",
			"TSS_ROUTER_BASEPATH": "",
			"TSS_SERVER_FN_BASE": "/_serverFn/",
			"VITE_DEV_SERVER_HOST": "0.0.0.0"
		}[name];
	} catch {
		return;
	}
}
function bool(name, fallback) {
	const v = env(name);
	if (v == null || v === "") return fallback;
	return v === "1" || v.toLowerCase() === "true";
}
var GAME_BUILD_VERSION = env("VITE_GAME_BUILD_VERSION") ?? "0.9.0-rc";
var GAME_TITLE = "$ackReligious: Memphis";
var STORE_BASE_URL = (env("VITE_STORE_BASE_URL") ?? "").replace(/\/$/, "");
var PRODUCT_CATALOG_URL = env("VITE_PRODUCT_CATALOG_URL") ?? "/config/store-products.json";
var ALLOWED_PARENT_ORIGIN = env("VITE_ALLOWED_PARENT_ORIGIN") ?? "";
var ANALYTICS_ENABLED = bool("VITE_ANALYTICS_ENABLED", true);
function storeProductUrl(slugOrPath) {
	if (/^https?:\/\//i.test(slugOrPath)) return slugOrPath;
	const path = slugOrPath.startsWith("/") ? slugOrPath : `/product/${slugOrPath}`;
	return STORE_BASE_URL ? `${STORE_BASE_URL}${path}` : path;
}
function isEmbedded() {
	try {
		return typeof window !== "undefined" && window.parent !== window;
	} catch {
		return false;
	}
}
var ConsoleSink = class {
	send(name, payload) {
		if (typeof console === "undefined") return;
		if (importMetaDev()) console.debug("[sack:analytics]", name, payload);
	}
};
function importMetaDev() {
	try {
		return Boolean(false);
	} catch {
		return false;
	}
}
var AnalyticsService = class {
	enabled = ANALYTICS_ENABLED;
	events = [];
	sinks = [new ConsoleSink()];
	last = {};
	track(name, payload = {}) {
		if (!this.enabled) return;
		const at = Date.now();
		if (at - (this.last[name] ?? 0) < 80 && name !== "product_viewed" && name !== "product_buy_clicked") return;
		this.last[name] = at;
		const rec = {
			name,
			payload,
			at
		};
		this.events.push(rec);
		if (this.events.length > 200) this.events.shift();
		for (const sink of this.sinks) sink.send(name, payload, at);
	}
};
var analytics = new AnalyticsService();
function installAnalyticsTestHook() {
	if (typeof window === "undefined") return;
	window.__SACK_ANALYTICS__ = {
		events: () => analytics.events.slice(),
		track: (name, payload) => analytics.track(name, payload ?? {})
	};
}
var BRIDGE_NS = "SACK";
var ProductCatalog = class {
	products = [];
	loaded = false;
	error = null;
	byId(id) {
		return this.products.find((p) => p.id === id) ?? null;
	}
	byVirtual(id) {
		return this.products.find((p) => p.virtualOutfitId === id) ?? null;
	}
	async load(url = PRODUCT_CATALOG_URL) {
		try {
			const res = await fetch(url, { cache: "no-store" });
			if (!res.ok) throw new Error(`catalog ${res.status}`);
			const json = await res.json();
			this.products = Array.isArray(json.products) ? json.products.map(normalizeProduct) : [];
			this.loaded = true;
			this.error = null;
		} catch (err) {
			this.error = err instanceof Error ? err.message : "catalog failed";
			this.products = FALLBACK_CATALOG;
			this.loaded = true;
		}
		return this.products;
	}
};
function normalizeProduct(raw) {
	const slug = raw.slug || raw.id;
	return {
		...raw,
		slug,
		storeUrl: raw.storeUrl || storeProductUrl(slug),
		available: raw.available !== false,
		currency: raw.currency ?? "USD",
		sizes: raw.sizes ?? [
			"S",
			"M",
			"L",
			"XL",
			"2XL"
		]
	};
}
var FALLBACK_CATALOG = [{
	id: "sr-black-gold-tee",
	slug: "sr-black-gold-tee",
	name: "SackReligious Black & Gold Tee",
	storeUrl: storeProductUrl("sr-black-gold-tee"),
	virtualOutfitId: "classic_green",
	price: 48,
	currency: "USD",
	sizes: [
		"S",
		"M",
		"L",
		"XL",
		"2XL"
	],
	available: true
}];
var StoreBridge = class {
	post(event) {
		if (typeof window === "undefined") return;
		if (!isEmbedded()) return;
		const target = ALLOWED_PARENT_ORIGIN;
		if (!target) return;
		try {
			window.parent.postMessage({
				ns: BRIDGE_NS,
				...event
			}, target);
		} catch {}
	}
	openStore(url) {
		if (typeof window === "undefined") return;
		const abs = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).toString();
		window.open(abs, "_blank", "noopener,noreferrer");
	}
};
var CommerceService = class {
	catalog = new ProductCatalog();
	bridge = new StoreBridge();
	lastIntent = null;
	async init() {
		await this.catalog.load();
		this.publishReady();
	}
	publishReady() {
		this.bridge.post({
			type: "SACK_GAME_READY",
			version: GAME_BUILD_VERSION
		});
	}
	productForOutfit(id) {
		return this.catalog.byVirtual(id);
	}
	viewProduct(product) {
		this.lastIntent = {
			kind: "view",
			productId: product.id,
			at: Date.now()
		};
		analytics.track("product_viewed", {
			productId: product.id,
			slug: product.slug
		});
		this.bridge.post({
			type: "SACK_PRODUCT_VIEW",
			productId: product.id,
			slug: product.slug,
			name: product.name
		});
		if (!isEmbedded() || !ALLOWED_PARENT_ORIGIN) this.bridge.openStore(product.storeUrl);
	}
	buyIrl(product) {
		this.lastIntent = {
			kind: "buy",
			productId: product.id,
			at: Date.now()
		};
		analytics.track("product_buy_clicked", {
			productId: product.id,
			slug: product.slug
		});
		this.bridge.post({
			type: "SACK_PRODUCT_BUY",
			productId: product.id,
			slug: product.slug,
			name: product.name,
			storeUrl: product.storeUrl
		});
		if (!isEmbedded() || !ALLOWED_PARENT_ORIGIN) this.bridge.openStore(product.storeUrl);
	}
	notifyMissionComplete(missionId, stepId) {
		this.bridge.post({
			type: "SACK_MISSION_COMPLETE",
			missionId,
			stepId
		});
	}
	notifyChapterComplete(chapter) {
		this.bridge.post({
			type: "SACK_CHAPTER_COMPLETE",
			chapter
		});
	}
};
var commerce = new CommerceService();
function installCommerceTestHook() {
	if (typeof window === "undefined") return;
	window.__SACK_COMMERCE__ = {
		catalog: () => commerce.catalog.products,
		loaded: () => commerce.catalog.loaded,
		lastIntent: () => commerce.lastIntent,
		buyIrl: (id) => {
			const p = commerce.catalog.byId(id);
			if (p) commerce.buyIrl(p);
		},
		viewProduct: (id) => {
			const p = commerce.catalog.byId(id);
			if (p) commerce.viewProduct(p);
		}
	};
}
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
	poiBoxes = [];
	laneMap = /* @__PURE__ */ new Map();
	walks = [];
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
	mover = new CharacterController();
	lastDt = 1 / 60;
	runIndex = 1;
	run = createRun(1);
	bestRunScore = 0;
	bestGrade = null;
	dropLive = false;
	uiPulse = 0;
	punch = 0;
	hoopPulse = 0;
	plantSign = 0;
	lastDeliveryAt = 0;
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
			"jump-4": "/game/benji/jump-4.png"
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
				const t = (i + .28) / count;
				const along = lane.min + (lane.max - lane.min) * t;
				const vel = laneVelocity(lane);
				this.cars.push({
					x: lane.axis === "x" ? along : lane.fixed,
					y: lane.axis === "y" ? along : lane.fixed,
					vx: vel.vx,
					vy: vel.vy,
					w: 38 + ci % 3 * 8,
					color: carColors[ci % carColors.length],
					laneId: lane.id,
					skin: ci % 4
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
			const along = walk ? walk.w > walk.h ? {
				x: walk.x + i * 211 % Math.max(walk.w - 8, 8),
				y: walk.y + walk.h * .5
			} : {
				x: walk.x + walk.w * .5,
				y: walk.y + i * 173 % Math.max(walk.h - 8, 8)
			} : {
				x: (6 + i * 11 % 50) * 48,
				y: (8 + i * 7 % 34) * 48
			};
			const alongStreet = !!(walk && walk.w > walk.h);
			this.peds.push({
				x: along.x,
				y: along.y,
				vx: alongStreet ? (i % 2 === 0 ? 1 : -1) * (22 + i % 5 * 4) : 0,
				vy: alongStreet ? 0 : (i % 2 === 0 ? 1 : -1) * (18 + i % 4 * 3),
				color: pedColors[i % pedColors.length],
				t: i,
				skin: i % 4
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
				vy: this.vy,
				air: this.mover.air,
				loco: this.mover.state,
				equipped: this.equipped,
				respect: this.respect,
				owned: [...this.owned],
				saveVersion: 3,
				dropLive: this.dropLive
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
			resetSave: () => this.resetProgress(),
			buyItem: (id) => this.buyItem(id),
			openShop: () => this.openShop()
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
			mission: this.mission.id
		});
		const first = this.mission.steps.find((s) => !s.done);
		if (first) analytics.track("mission_started", {
			stepId: first.id,
			label: first.label
		});
		this.emitHud();
	}
	resetProgress(emit = true) {
		try {
			localStorage.removeItem(SAVE_KEY);
			localStorage.removeItem(SAVE_KEY_LEGACY);
			localStorage.removeItem(SAVE_KEY_LEGACY_V1);
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
	showToast(msg, t = 3.1) {
		this.toast = msg;
		this.toastT = t;
	}
	float(text, color, x = this.px, y = this.py - 50) {
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
	addTrauma(v) {
		if (!this.settings.shake || this.settings.reduceMotion) return;
		this.trauma = clamp(this.trauma + v, 0, 1);
	}
	addPunch(v) {
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
			if (this.missionComplete) this.run = createRun(this.runIndex);
			else {
				this.mission = createDropDayMission({
					order: tier.deliveryOrder,
					courtTarget: tier.courtTarget
				});
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
				} else if (this.mission.steps.find((s) => s.id === "pickup")?.done) this.run.active = true;
			}
			this.ball.targetScore = tier.courtTarget;
			this.bestRunScore = data.bestRunScore ?? 0;
			this.bestGrade = data.bestGrade ?? null;
			if (!localStorage.getItem("sackreligious-memphis-v3")) {
				data.version = 3;
				localStorage.setItem(SAVE_KEY, JSON.stringify(data));
			}
		} catch {}
	}
	save() {
		const progress = {};
		for (const s of this.mission.steps) progress[s.id] = s.done;
		const sideProgress = {};
		for (const s of this.side) sideProgress[s.id] = s.done;
		const data = {
			version: 3,
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
				grade: this.run.grade
			},
			bestRunScore: this.bestRunScore,
			bestGrade: this.bestGrade
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
		this.applyQuality();
		this.save();
		this.emitHud();
	}
	applyQuality() {
		const dpr = Math.min(window.devicePixelRatio || 1, this.settings.quality === "low" ? 1 : this.settings.quality === "medium" ? 1.35 : 1.75);
		this.world3d?.renderer.setPixelRatio(dpr);
		if (this.world3d) this.world3d.renderer.shadowMap.enabled = this.settings.quality !== "low";
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
				if (kind === "briefing") this.showToast(this.runIndex > 1 ? `Run ${this.runIndex}. Link with K Blanco at HQ.` : "Drop Day is live. Find K Blanco at HQ.");
				this.emitHud();
			}
		}
		if (!this.started || this.paused) return;
		if (act.viewPressed) this.toggleView();
		const lookMul = this.settings.sensitivity || 1;
		if (Math.abs(act.lookX) <= 1.25) this.yaw -= act.lookX * 2.2 * dt * lookMul;
		else this.yaw -= act.lookX * .032 * lookMul;
		if (Math.abs(act.lookY) <= 1.25) this.pitch -= act.lookY * 1.7 * dt * lookMul;
		else this.pitch -= act.lookY * .028 * lookMul;
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
	updateTraffic(dt) {
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
			const pd = aheadDistance(c, {
				x: this.px,
				y: this.py
			});
			if (pd < 86) scale = Math.min(scale, Math.max(0, (pd - 34) / 52));
			const spd = Math.hypot(c.vx, c.vy);
			if (spd > 1) {
				const nx = c.x + c.vx / spd * 52;
				const ny = c.y + c.vy / spd * 52;
				for (const box of this.poiBoxes) if (circleHitsRect(nx, ny, 18, box)) {
					scale = Math.min(scale, .12);
					break;
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
	updatePeds(dt) {
		for (const p of this.peds) {
			p.t += dt;
			let nx = p.x + p.vx * dt;
			let ny = p.y + p.vy * dt;
			if (nx < 96 || nx > 2976) p.vx *= -1;
			if (ny < 96 || ny > 2112) p.vy *= -1;
			if (!this.walks.some((w) => nx >= w.x && nx <= w.x + w.w && ny >= w.y && ny <= w.y + w.h) || isRoadPoint(nx, ny)) {
				p.vx *= -1;
				p.vy *= -1;
				nx = p.x + p.vx * dt;
				ny = p.y + p.vy * dt;
			}
			for (const box of this.poiBoxes) if (circleHitsRect(nx, ny, 10, box)) {
				p.vx *= -1;
				p.vy *= -1;
				nx = p.x;
				ny = p.y;
				break;
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
	updatePlayer(dt, mx, my, runHeld, jumpPressed = false, jumpHeld = false) {
		const f = this.fwd();
		const r = this.right();
		const len = Math.hypot(mx, my);
		let wishX = 0;
		let wishY = 0;
		if (len > .01) {
			mx /= len;
			my /= len;
			wishX = mx * r.x + -my * f.x;
			wishY = mx * r.y + -my * f.y;
			this.leftSpawn = true;
		}
		const wasAir = this.mover.air > .08;
		this.mover.update(dt, wishX, wishY, runHeld, jumpPressed, jumpHeld);
		this.vx = this.mover.vx;
		this.vy = this.mover.vy;
		this.moving = this.mover.speed > 12;
		this.facing = this.mover.facing();
		this.dir = this.facing;
		this.animT = this.mover.animT;
		this.bob = this.moving ? Math.sin(this.animT * 2) * 3.2 : Math.sin(this.animT) * .6;
		if (this.mover.jumped) {
			audio.jump();
			this.addTrauma(JUICE.trauma.jump);
		}
		if (this.mover.landed || wasAir && this.mover.grounded) {
			audio.land();
			this.addTrauma(JUICE.trauma.land);
			this.punch = Math.max(this.punch, .2);
		}
		const plant = Math.sin(this.mover.animT);
		if (this.moving && this.mover.grounded && plant > 0 && this.plantSign <= 0) audio.foot(this.clock, this.mover.state === "run");
		this.plantSign = plant;
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
		else this.mover.vx = 0;
		if (!this.collides(this.px, ny, rad)) this.py = ny;
		else this.mover.vy = 0;
	}
	collides(x, y, r) {
		for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
		for (const box of this.poiBoxes) if (circleHitsRect(x, y, r, box)) return true;
		if (this.mode !== "basketball" && this.mover.air < .55) {
			for (const c of this.cars) if (circleHitsRect(x, y, r, {
				x: c.x - c.w * .5,
				y: c.y - 11,
				w: c.w,
				h: 22
			})) return true;
		}
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
	openDialogue(npcId) {
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
	tryMissionAction(loc) {
		const step = this.mission.steps[this.mission.activeStep];
		if (!step || step.done) {
			if (loc === "dropvan") this.showToast("Van's locked. Keep moving the brand.");
			return;
		}
		if (step.target && step.target !== loc) {
			if ((step.kind === "deliver" || step.kind === "pickup") && this.run.active) {
				if (loc === "store" || loc === "court" || loc === "dropvan" || loc === "neighborhood" || loc === "downtown" || loc === "culture") noteMistake(this.run);
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
		} else audio.cash();
		this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
		analytics.track("mission_completed", {
			stepId: id,
			label: step.label,
			reward: step.reward
		});
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
			analytics.track("chapter_completed", {
				chapter: this.mission.chapter,
				grade: result.grade
			});
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
			if (upcoming) analytics.track("mission_started", {
				stepId: upcoming.id,
				label: upcoming.label
			});
		}
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
	buyItem(id) {
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
		const court = POIS.find((p) => p.id === "court");
		this.px = court.x + court.w / 2;
		this.py = court.y + court.h - 58;
		this.yaw = 0;
		this.pitch = .12;
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
			analytics.track("basketball_completed", {
				score: this.ball.score,
				target: this.ball.targetScore
			});
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
					const zone = shotZone(this.ball.shotDist);
					const pts = zone === "deep" ? 3 : 2;
					const perfect = this.ball.grade === "PERFECT";
					this.ball.score += perfect ? pts + 1 : pts;
					this.ball.combo += 1;
					this.ball.best = Math.max(this.ball.best, this.ball.combo);
					this.ball.flash = perfect ? .62 : .5;
					this.burst(hoop.x, hoop.y, PAL.gold);
					this.float(perfect ? `PERFECT +${pts + 1}` : `+${pts}`, PAL.gold, hoop.x, hoop.y);
					this.addTrauma(perfect ? JUICE.trauma.perfect : JUICE.trauma.make);
					this.hitstop = perfect ? JUICE.hitstop.perfect : JUICE.hitstop.make;
					this.addPunch(perfect ? JUICE.punch.perfect : JUICE.punch.make);
					this.hoopPulse = perfect ? 1 : .65;
					if (this.run.active) scoreMake(this.run, perfect, zone, this.ball.combo);
					if (perfect) audio.perfect();
					else audio.swish();
					if (this.ball.combo > 1) audio.combo(this.ball.combo);
					if (this.settings.rumble) this.input.rumble(perfect ? 140 : 80, .3, .55);
					this.tryCreditBasketball();
					this.ball.inFlight = false;
					this.ball.ballVz = -40;
					this.ball.ballVx *= .2;
					this.ball.ballVy *= .2;
				} else if (planar < 20) {
					this.ball.combo = 0;
					if (this.run.active) scoreMiss(this.run);
					this.burst(hoop.x, hoop.y, "#e85d4c");
					this.float("RIM", "#e85d4c", hoop.x, hoop.y);
					audio.rim();
					this.addTrauma(JUICE.trauma.miss);
					this.hoopPulse = .35;
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
		const win = perfectWindow(shotZone(dist(this.px, this.py, hoop.x, hoop.y)), this.currentTier().perfectHalfWidth);
		const good = goodWindow(win);
		const perfect = pwr >= win.lo && pwr <= win.hi;
		const isGood = pwr >= good.lo && pwr <= good.hi;
		this.ball.grade = perfect ? "PERFECT" : isGood ? "GOOD" : "LATE";
		const d = dist(this.px, this.py, hoop.x, hoop.y);
		const lookTo = Math.atan2(-(hoop.x - this.px), -(hoop.y - this.py));
		let err = this.yaw - lookTo;
		while (err > Math.PI) err -= Math.PI * 2;
		while (err < -Math.PI) err += Math.PI * 2;
		const assist = (perfect ? .72 : isGood ? .42 : .08) * clamp(1 - Math.abs(err) / .9, 0, 1);
		const shootYaw = this.yaw + (lookTo - this.yaw) * assist;
		const speedErr = perfect ? 1 : isGood ? .94 + pwr * .08 : .62 + pwr * .55;
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
		this.ball.made = isGood;
	}
	beginCharge() {
		if (this.mode === "basketball" && this.ball.held && !this.ball.inFlight) {
			this.ball.charging = true;
			this.ball.power = 0;
			this.mover.triggerShoot();
		}
	}
	burst(_x, _y, color) {
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
		this.mission = createDropDayMission({
			order: tier.deliveryOrder,
			courtTarget: tier.courtTarget
		});
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
			duration: 2.6
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
				outfitColor: this.equipped && this.equipped !== "starter_tee" ? APPAREL.find((a) => a.id === this.equipped)?.color ?? null : null,
				dropLive: this.dropLive
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
			ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
			ctx.fillStyle = p.color;
			ctx.fillRect(w * .5 + p.ox - p.size / 2, h * .36 + p.oy - p.size / 2, p.size, p.size);
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
				best: this.ball.best,
				target: this.ball.targetScore,
				perfects: this.run.ballPerfects,
				zone: shotZone(dist(this.px, this.py, this.hoop().x, this.hoop().y))
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
			dropLive: this.dropLive
		};
	}
};
//#endregion
export { wx as C, trafficLanes as S, formatRunClock as _, GameEngine as a, isRoadPoint as b, STREETS as c, WORLD_PX_H as d, WORLD_PX_W as f, commerce as g, circleHitsRect as h, GAME_TITLE as i, TIPS as l, WorldLifePass as m, BRAND as n, POIS as o, World3D as p, GAME_BUILD_VERSION as r, SAVE_KEY as s, APPAREL as t, TROPHIES as u, installAnalyticsTestHook as v, wz as w, laneVelocity as x, installCommerceTestHook as y };
