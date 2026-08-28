import { N as TorusGeometry, O as SphereGeometry, P as Vector3, _ as Mesh, f as Group, l as CylinderGeometry, m as IcosahedronGeometry, r as BoxGeometry, v as MeshBasicMaterial, x as PlaneGeometry, y as MeshStandardMaterial } from "../_libs/three.mjs";
import { C as wx, S as trafficLanes, a as GameEngine, b as isRoadPoint, c as STREETS, d as WORLD_PX_H, f as WORLD_PX_W, h as circleHitsRect, m as WorldLifePass, o as POIS, p as World3D, s as SAVE_KEY, w as wz, x as laneVelocity } from "./engine-CGVC5kxI.mjs";
import { c as HeadContent, d as Outlet, f as lazyRouteComponent, h as require_jsx_runtime, m as createRootRoute, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CxQJe5ez.js
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-D_LdVb3t.css";
var Route$1 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
			},
			{ title: "SackReligious · Memphis 901" },
			{
				name: "description",
				content: "Play as Benji. Run missions across Memphis, ball up, earn $ackdollars, and rep the brand."
			},
			{
				name: "theme-color",
				content: "#0a0c0b"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/game/sack-icon.png"
		}]
	}),
	component: RootComponent
});
function RootComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RootDocument, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
}
function RootDocument({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function near(value, target, epsilon = .035) {
	return Math.abs(value - target) <= epsilon;
}
/**
* Correct a layout mistake in the first playable room without duplicating the
* whole apartment renderer. The dresser/shoe stack was originally placed right
* beside the south doorway at local x=-3.65, z=2.65. With Benji's 14px radius
* that turned the intended exit lane into an invisible collision trap.
*/
function installApartmentLayoutPass() {
	const proto = World3D.prototype;
	if (proto.__apartmentLayoutPatched) return;
	proto.__apartmentLayoutPatched = true;
	const originalBuildCity = World3D.prototype.buildCity;
	World3D.prototype.buildCity = function correctedApartmentLayout(walls, trees) {
		originalBuildCity.call(this, walls, trees);
		const apartment = this.scene.getObjectByName("benji-apartment-interior");
		if (!apartment) return;
		let moved = 0;
		for (const child of apartment.children) {
			if (!(child instanceof Mesh) || !(child.geometry instanceof BoxGeometry)) continue;
			if (near(child.position.x, -3.65) && near(child.position.y, .48) && near(child.position.z, 2.65)) {
				child.position.set(4.35, .48, 2.45);
				moved++;
				continue;
			}
			if (near(child.position.x, -3.1) && near(child.position.y, 1.05) && near(child.position.z, 2.65)) {
				child.position.set(3.82, 1.05, 2.45);
				moved++;
				continue;
			}
			if (near(child.position.x, -3.85) && near(child.position.y, 1.05) && near(child.position.z, 2.65)) {
				child.position.set(4.55, 1.05, 2.45);
				moved++;
			}
		}
		window.__SACK_APARTMENT_LAYOUT__ = {
			dresserMoved: moved >= 3,
			movedMeshes: moved
		};
	};
}
var COURT = POIS.find((p) => p.id === "court");
var COURT_BLOCKED_LANES = /* @__PURE__ */ new Set([
	"POPLAR AVE:east",
	"POPLAR AVE:west",
	"3RD ST:south",
	"3RD ST:north"
]);
var SAFE_LANES = trafficLanes().filter((lane) => !COURT_BLOCKED_LANES.has(lane.id));
function insideCourt(x, y, pad = 0) {
	return x >= COURT.x - pad && x <= COURT.x + COURT.w + pad && y >= COURT.y - pad && y <= COURT.y + COURT.h + pad;
}
function buildCourtDeck(scene) {
	scene.getObjectByName("sackrow-court-safety-deck")?.removeFromParent();
	const root = new Group();
	root.name = "sackrow-court-safety-deck";
	const cx = wx(COURT.x + COURT.w / 2);
	const cz = wz(COURT.y + COURT.h / 2);
	const cw = wx(COURT.w);
	const cd = wz(COURT.h);
	const floorMat = new MeshStandardMaterial({
		color: 1053201,
		roughness: .82,
		metalness: .02
	});
	const floor = new Mesh(new PlaneGeometry(cw - .25, cd - .25), floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.set(cx, .155, cz);
	floor.receiveShadow = true;
	root.add(floor);
	const green = new MeshStandardMaterial({
		color: 553279,
		emissive: 338714,
		emissiveIntensity: .22,
		roughness: .72
	});
	const gold = new MeshStandardMaterial({
		color: 13938487,
		roughness: .55,
		metalness: .12
	});
	const stripeH = .022;
	const edge = .1;
	const box = (w, d, mat, x, z) => {
		const mesh = new Mesh(new BoxGeometry(w, stripeH, d), mat);
		mesh.position.set(x, .17, z);
		root.add(mesh);
	};
	box(cw - .55, edge, gold, cx, cz - cd / 2 + .28);
	box(cw - .55, edge, gold, cx, cz + cd / 2 - .28);
	box(edge, cd - .55, green, cx - cw / 2 + .28, cz);
	box(edge, cd - .55, green, cx + cw / 2 - .28, cz);
	box(edge, cd - 1.2, gold, cx, cz);
	const center = new Mesh(new TorusGeometry(1.72, .08, 8, 36), green);
	center.rotation.x = Math.PI / 2;
	center.position.set(cx, .18, cz);
	root.add(center);
	const inner = new Mesh(new TorusGeometry(1.22, .05, 8, 36), gold);
	inner.rotation.x = Math.PI / 2;
	inner.position.set(cx, .182, cz);
	root.add(inner);
	scene.add(root);
}
function hideCourtStreetFurniture(scene) {
	const root = scene.getObjectByName("memphis-world-life");
	if (!root) return;
	scene.updateMatrixWorld(true);
	const pos = new Vector3();
	for (const child of [...root.children]) {
		if (!(child instanceof Group)) continue;
		let vehicleOrSignal = false;
		child.traverse((node) => {
			if (node instanceof Mesh && node.geometry instanceof CylinderGeometry) vehicleOrSignal = true;
		});
		if (!vehicleOrSignal) continue;
		child.getWorldPosition(pos);
		if (insideCourt(pos.x / (1 / 16), pos.z / (1 / 16), 48 * .65)) child.visible = false;
	}
}
function rerouteCourtCar(car, index) {
	if (!car.laneId || !COURT_BLOCKED_LANES.has(car.laneId)) return false;
	const source = trafficLanes().find((lane) => lane.id === car.laneId);
	if (!source) return false;
	const candidates = SAFE_LANES.filter((lane) => lane.axis === source.axis && lane.dir === source.dir);
	const target = candidates[index % Math.max(1, candidates.length)];
	if (!target) return false;
	car.laneId = target.id;
	if (target.axis === "x") car.y = target.fixed;
	else car.x = target.fixed;
	const velocity = laneVelocity(target, .82);
	car.vx = velocity.vx;
	car.vy = velocity.vy;
	return true;
}
function installCourtWorldIntegrity() {
	const proto = WorldLifePass.prototype;
	if (proto.__courtIntegrityPatched) return;
	proto.__courtIntegrityPatched = true;
	const originalBuild = WorldLifePass.prototype.build;
	WorldLifePass.prototype.build = function courtSafeBuild() {
		originalBuild.call(this);
		const scene = this.scene;
		hideCourtStreetFurniture(scene);
		buildCourtDeck(scene);
	};
	const originalPreSync = WorldLifePass.prototype.preSync;
	WorldLifePass.prototype.preSync = function courtSafeTraffic(frame) {
		originalPreSync.call(this, frame);
		for (let i = 0; i < frame.cars.length; i++) rerouteCourtCar(frame.cars[i], i);
	};
	const originalPostSync = WorldLifePass.prototype.postSync;
	WorldLifePass.prototype.postSync = function courtSafeDiagnostics(frame, carGroups, npcSprites) {
		originalPostSync.call(this, frame, carGroups, npcSprites);
		let carsOnCourt = 0;
		let carsOnBlockedLane = 0;
		for (const raw of frame.cars) {
			const car = raw;
			if (insideCourt(car.x, car.y, 48 * .18)) carsOnCourt++;
			if (car.laneId && COURT_BLOCKED_LANES.has(car.laneId)) carsOnBlockedLane++;
		}
		const w = window;
		if (w.__SACK_TRAFFIC__) {
			w.__SACK_TRAFFIC__.carsOnCourt = carsOnCourt;
			w.__SACK_TRAFFIC__.carsOnBlockedLane = carsOnBlockedLane;
			w.__SACK_TRAFFIC__.courtTrafficProtected = true;
		}
	};
}
var APARTMENT$1 = POIS.find((p) => p.id === "apartment");
var STORE$1 = POIS.find((p) => p.id === "store");
var loadedPositions = /* @__PURE__ */ new WeakMap();
var autoSaveState = /* @__PURE__ */ new WeakMap();
function insideStore(engine) {
	return engine.px >= STORE$1.x && engine.px <= STORE$1.x + STORE$1.w && engine.py >= STORE$1.y && engine.py <= STORE$1.y + STORE$1.h;
}
function insideApartmentDoorZone(engine, pad = 8) {
	return engine.px >= APARTMENT$1.x - pad && engine.px <= APARTMENT$1.x + APARTMENT$1.w + pad && engine.py >= APARTMENT$1.y - pad && engine.py <= APARTMENT$1.y + APARTMENT$1.h + pad;
}
function safeWorldPosition(value) {
	if (!value || typeof value !== "object") return null;
	const p = value;
	if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.yaw)) return null;
	const x = Number(p.x);
	const y = Number(p.y);
	const yaw = Number(p.yaw);
	if (x < 62 || y < 62 || x > 3010 || y > 2242) return null;
	return {
		x,
		y,
		yaw
	};
}
function placePosition(engine, p) {
	engine.px = p.x;
	engine.py = p.y;
	engine.yaw = p.yaw;
	engine.vx = 0;
	engine.vy = 0;
	engine.mover.reset(engine.mover.heading);
	engine.updateProximity();
}
function placeInsideApartment(engine) {
	engine.px = 288;
	engine.py = APARTMENT$1.y + APARTMENT$1.h - 72;
	engine.vx = 0;
	engine.vy = 0;
	engine.leftSpawn = false;
	engine.updateProximity();
}
function placeInsideHQ(engine, xRatio, yRatio) {
	if (engine.mode === "basketball") engine.exitBasketball();
	if (engine.mode === "shop") engine.closeShop();
	engine.mode = "world";
	engine.dialogue = null;
	engine.dialogueNpcId = null;
	engine.cinematic = null;
	engine.letterbox = 0;
	engine.shopOpen = false;
	engine.px = STORE$1.x + STORE$1.w * xRatio;
	engine.py = STORE$1.y + STORE$1.h * yRatio;
	engine.vx = 0;
	engine.vy = 0;
	engine.leftSpawn = true;
	engine.updateProximity();
	engine.emitHud();
}
function installGameplayIntegrity() {
	const proto = GameEngine.prototype;
	if (proto.__physicalHqPatched) return;
	proto.__physicalHqPatched = true;
	const originalLoadSave = GameEngine.prototype.loadSave;
	GameEngine.prototype.loadSave = function loadSaveWithPosition() {
		originalLoadSave.call(this);
		if (!this.hasSave) return;
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			const position = safeWorldPosition((raw ? JSON.parse(raw) : null)?.position);
			if (position) loadedPositions.set(this, position);
		} catch {}
	};
	const originalSave = GameEngine.prototype.save;
	GameEngine.prototype.save = function saveWithPosition() {
		originalSave.call(this);
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			parsed.position = {
				x: Math.round(this.px * 100) / 100,
				y: Math.round(this.py * 100) / 100,
				yaw: Math.round(this.yaw * 1e4) / 1e4
			};
			localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
			loadedPositions.set(this, parsed.position);
		} catch {}
	};
	const originalResetProgress = GameEngine.prototype.resetProgress;
	GameEngine.prototype.resetProgress = function physicalApartmentReset(emit = true) {
		originalResetProgress.call(this, false);
		loadedPositions.delete(this);
		autoSaveState.delete(this);
		this.cinematic = null;
		this.letterbox = 0;
		placeInsideApartment(this);
		if (emit) this.emitHud();
	};
	const originalStart = GameEngine.prototype.start;
	GameEngine.prototype.start = function physicalApartmentStart(fresh = false) {
		originalStart.call(this, fresh);
		const resumed = !fresh ? loadedPositions.get(this) : null;
		if (resumed) {
			placePosition(this, resumed);
			this.leftSpawn = true;
			this.showToast("Welcome back to Memphis.", 1.5);
		} else placeInsideApartment(this);
		if (this.cinematic?.kind === "briefing") this.cinematic.duration = 1.35;
		autoSaveState.set(this, {
			elapsed: 0,
			x: this.px,
			y: this.py
		});
		this.emitHud();
	};
	const originalUpdate = GameEngine.prototype.update;
	GameEngine.prototype.update = function autoSavingUpdate(dt) {
		originalUpdate.call(this, dt);
		if (!this.started || this.paused || this.mode !== "world" || this.cinematic) return;
		let state = autoSaveState.get(this);
		if (!state) {
			state = {
				elapsed: 0,
				x: this.px,
				y: this.py
			};
			autoSaveState.set(this, state);
		}
		state.elapsed += Math.min(Math.max(dt, 0), .1);
		if (state.elapsed < 12) return;
		state.elapsed = 0;
		if (Math.hypot(this.px - state.x, this.py - state.y) < 24) return;
		state.x = this.px;
		state.y = this.py;
		this.save();
	};
	const originalCheckMissionAuto = GameEngine.prototype.checkMissionAuto;
	GameEngine.prototype.checkMissionAuto = function physicalApartmentExit() {
		const step = this.mission.steps[this.mission.activeStep];
		if (step?.id === "wake" && !step.done && this.leftSpawn && !insideApartmentDoorZone(this)) {
			this.completeStep("wake");
			this.showToast("Memphis is open. Head to $ackReligious HQ.");
		}
		originalCheckMissionAuto.call(this);
	};
	const originalInteract = GameEngine.prototype.tryInteract;
	GameEngine.prototype.tryInteract = function physicalHqInteract() {
		if (this.nearPoi === "store" && !this.nearNpc) {
			if (!insideStore(this)) {
				this.showToast("Walk through the $ackReligious HQ doors.", 2.1);
				return;
			}
			const step = this.mission.steps[this.mission.activeStep];
			if (step && !step.done && step.target === "store" && (step.kind === "talk" || step.kind === "return")) {
				this.showToast("Find K Blanco inside HQ.", 1.9);
				return;
			}
		}
		originalInteract.call(this);
	};
	const originalWireQa = GameEngine.prototype.wireQa;
	GameEngine.prototype.wireQa = function physicalHqQa() {
		originalWireQa.call(this);
		if (typeof window === "undefined") return;
		const w = window;
		if (!w.__gameTest) return;
		w.__gameTest.enterHQ = () => placeInsideHQ(this, .5, .7);
		w.__gameTest.enterHQShop = () => placeInsideHQ(this, .84, .72);
		w.__gameTest.collisionProbe = () => ({
			px: this.px,
			py: this.py,
			south4: this.collides(this.px, this.py + 4, 14),
			south16: this.collides(this.px, this.py + 16, 14),
			east4: this.collides(this.px + 4, this.py, 14),
			started: this.started,
			paused: this.paused,
			cinematic: this.cinematic?.kind ?? null,
			nearPoi: this.nearPoi
		});
	};
}
var APARTMENT = POIS.find((p) => p.id === "apartment");
var STORE = POIS.find((p) => p.id === "store");
function gameRect(cx, cy, w, h) {
	return {
		x: cx - w / 2,
		y: cy - h / 2,
		w,
		h
	};
}
var apartmentCx = APARTMENT.x + APARTMENT.w / 2;
var apartmentCy = APARTMENT.y + APARTMENT.h / 2;
var hqCx = STORE.x + STORE.w / 2;
var hqCy = STORE.y + STORE.h / 2;
var APARTMENT_FURNITURE = [
	gameRect(apartmentCx - 2.55 * 16, apartmentCy - 2.55 * 16, 3.55 * 16, 2.25 * 16),
	gameRect(apartmentCx - 4.25 * 16, apartmentCy - 2.7 * 16, .95 * 16, .85 * 16),
	gameRect(apartmentCx + 2.05 * 16, apartmentCy - .15 * 16, 3.05 * 16, 1.18 * 16),
	gameRect(apartmentCx + 1.3 * 16, apartmentCy + 1.35 * 16, 1.8 * 16, 1.02 * 16),
	gameRect(apartmentCx + 4.35 * 16, apartmentCy + 2.45 * 16, 1.95 * 16, .72 * 16)
];
var HQ_FURNITURE = [
	gameRect(hqCx + 4.2 * 16, hqCy - 3.9 * 16, 4.35 * 16, .95 * 16),
	gameRect(hqCx - 4.92 * 16, hqCy - 1.5 * 16, .98 * 16, 2.95 * 16),
	gameRect(hqCx - 2.02 * 16, hqCy - 1.5 * 16, .98 * 16, 2.95 * 16),
	gameRect(hqCx + .88 * 16, hqCy - 1.5 * 16, .98 * 16, 2.95 * 16),
	gameRect(hqCx - 2.5 * 16, hqCy + 2.4 * 16, 3.55 * 16, 1.6 * 16),
	gameRect(hqCx + 3.8 * 16, hqCy + 1.8 * 16, 2.55 * 16, 1.15 * 16)
];
function inside(p, x, y, pad = 12) {
	return x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad;
}
function installInteriorCollisionPass() {
	const proto = GameEngine.prototype;
	if (proto.__interiorCollisionPatched) return;
	proto.__interiorCollisionPatched = true;
	const originalCollides = GameEngine.prototype.collides;
	GameEngine.prototype.collides = function furnitureAwareCollision(x, y, r) {
		if (originalCollides.call(this, x, y, r)) return true;
		if (this.mover.air >= .62) return false;
		const furniture = inside(APARTMENT, x, y) ? APARTMENT_FURNITURE : inside(STORE, x, y) ? HQ_FURNITURE : null;
		if (!furniture) return false;
		return furniture.some((rect) => circleHitsRect(x, y, r, rect));
	};
	const originalWireQa = GameEngine.prototype.wireQa;
	GameEngine.prototype.wireQa = function furnitureCollisionQa() {
		originalWireQa.call(this);
		if (typeof window === "undefined") return;
		const w = window;
		if (!w.__gameTest) return;
		const bed = APARTMENT_FURNITURE[0];
		const counter = HQ_FURNITURE[0];
		w.__gameTest.furnitureCollisionProbe = () => ({
			bed: this.collides(bed.x + bed.w / 2, bed.y + bed.h / 2, 12),
			hqCounter: this.collides(counter.x + counter.w / 2, counter.y + counter.h / 2, 12),
			apartmentSpawn: this.collides(288, APARTMENT.y + APARTMENT.h - 72, 14),
			apartmentDoorLane: this.collides(288, APARTMENT.y + APARTMENT.h - 48, 12),
			apartmentThreshold: this.collides(288, APARTMENT.y + APARTMENT.h - 16, 12),
			hqDoorLane: this.collides(STORE.x + STORE.w / 2, STORE.y + STORE.h - 48, 12)
		});
	};
}
var RIVER$1 = POIS.find((p) => p.id === "river");
function box(w, h, d, material, x, y, z) {
	const mesh = new Mesh(new BoxGeometry(w, h, d), material);
	mesh.position.set(x, y, z);
	mesh.receiveShadow = true;
	return mesh;
}
function addHydrant(root, x, z, color = 12067876) {
	const mat = new MeshStandardMaterial({
		color,
		roughness: .62,
		metalness: .24
	});
	const dark = new MeshStandardMaterial({
		color: 2105376,
		roughness: .72,
		metalness: .35
	});
	const g = new Group();
	const body = new Mesh(new CylinderGeometry(.13, .16, .52, 10), mat);
	body.position.y = .27;
	g.add(body);
	const cap = new Mesh(new SphereGeometry(.15, 10, 7), mat);
	cap.scale.y = .65;
	cap.position.y = .56;
	g.add(cap);
	for (const dx of [-.18, .18]) {
		const side = new Mesh(new CylinderGeometry(.07, .07, .18, 8), dark);
		side.rotation.z = Math.PI / 2;
		side.position.set(dx, .36, 0);
		g.add(side);
	}
	g.position.set(x, .11, z);
	root.add(g);
}
function addBench(root, x, z, rot = 0) {
	const wood = new MeshStandardMaterial({
		color: 6111272,
		roughness: .9
	});
	const metal = new MeshStandardMaterial({
		color: 2302755,
		roughness: .58,
		metalness: .55
	});
	const g = new Group();
	g.add(box(1.65, .12, .42, wood, 0, .48, 0));
	g.add(box(1.65, .55, .1, wood, 0, .78, -.18));
	for (const dx of [-.62, .62]) {
		g.add(box(.08, .48, .08, metal, dx, .25, -.1));
		g.add(box(.08, .48, .08, metal, dx, .25, .1));
	}
	g.position.set(x, .1, z);
	g.rotation.y = rot;
	root.add(g);
}
function addTrashCan(root, x, z) {
	const mat = new MeshStandardMaterial({
		color: 2435880,
		roughness: .86,
		metalness: .28
	});
	const can = new Mesh(new CylinderGeometry(.23, .27, .65, 12), mat);
	can.position.set(x, .43, z);
	root.add(can);
}
function addDumpster(root, x, z, rot = 0) {
	const green = new MeshStandardMaterial({
		color: 2645051,
		roughness: .82,
		metalness: .18
	});
	const dark = new MeshStandardMaterial({
		color: 1514265,
		roughness: .88
	});
	const g = new Group();
	g.add(box(1.65, .86, .92, green, 0, .49, 0));
	const lid = box(1.72, .1, .98, dark, 0, .98, 0);
	lid.rotation.z = -.08;
	g.add(lid);
	for (const dx of [-.62, .62]) {
		const wheel = new Mesh(new CylinderGeometry(.1, .1, .08, 8), dark);
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set(dx, .11, .42);
		g.add(wheel);
	}
	g.position.set(x, .08, z);
	g.rotation.y = rot;
	root.add(g);
}
function buildEnvironment(scene) {
	scene.getObjectByName("memphis-environment-detail")?.removeFromParent();
	const root = new Group();
	root.name = "memphis-environment-detail";
	const riverCx = wx(RIVER$1.x + RIVER$1.w / 2);
	const riverCz = wz(RIVER$1.y + RIVER$1.h / 2);
	const riverW = wx(RIVER$1.w);
	const riverD = wz(RIVER$1.h);
	const waterMat = new MeshStandardMaterial({
		color: 1523036,
		roughness: .23,
		metalness: .26,
		emissive: 465965,
		emissiveIntensity: .45,
		transparent: true,
		opacity: .96
	});
	const water = new Mesh(new PlaneGeometry(riverW, riverD), waterMat);
	water.rotation.x = -Math.PI / 2;
	water.position.set(riverCx, .16, riverCz);
	water.receiveShadow = true;
	root.add(water);
	const foamMat = new MeshBasicMaterial({
		color: 9356767,
		transparent: true,
		opacity: .28
	});
	for (let i = 0; i < 8; i++) {
		const strip = new Mesh(new PlaneGeometry(riverW * (.22 + i % 3 * .08), .035), foamMat.clone());
		strip.rotation.x = -Math.PI / 2;
		strip.position.set(riverCx - riverW * .36 + i * riverW * .1, .175 + i % 2 * .004, riverCz - riverD * .34 + i % 4 * riverD * .18);
		root.add(strip);
	}
	const boardwalk = new MeshStandardMaterial({
		color: 6113590,
		roughness: .94
	});
	const rail = new MeshStandardMaterial({
		color: 2435371,
		roughness: .44,
		metalness: .64
	});
	const walkZ = wz(RIVER$1.y) - .48;
	root.add(box(riverW + .8, .13, 1.25, boardwalk, riverCx, .14, walkZ));
	root.add(box(riverW + .4, .08, .08, rail, riverCx, 1.02, walkZ + .52));
	for (let x = riverCx - riverW / 2; x <= riverCx + riverW / 2; x += 1.45) root.add(box(.07, 1, .07, rail, x, .55, walkZ + .52));
	addBench(root, riverCx - 8.2, walkZ - .15, 0);
	addBench(root, riverCx + 2.8, walkZ - .15, 0);
	addBench(root, riverCx + 9.4, walkZ - .15, 0);
	addTrashCan(root, riverCx - 5.4, walkZ - .2);
	addTrashCan(root, riverCx + 6.2, walkZ - .2);
	const xStreets = STREETS.filter((s) => s.axis === "x");
	const yStreets = STREETS.filter((s) => s.axis === "y");
	for (let i = 0; i < Math.min(xStreets.length, yStreets.length) * 2; i++) {
		const xs = xStreets[i % xStreets.length];
		const ys = yStreets[(i * 2 + 1) % yStreets.length];
		const x = wx(xs.tile * 48 + (i % 2 === 0 ? 42 : -42));
		const z = wz(ys.tile * 48 + (i % 3 === 0 ? 43 : -43));
		addHydrant(root, x, z, i % 3 === 0 ? 13672744 : 12067876);
		addTrashCan(root, x + .62, z + .18);
	}
	const hq = POIS.find((p) => p.id === "store");
	addDumpster(root, wx(hq.x + hq.w - 20), wz(hq.y - 14), Math.PI / 2);
	const culture = POIS.find((p) => p.id === "culture");
	addDumpster(root, wx(culture.x + culture.w + 18), wz(culture.y + 22), 0);
	const beale = POIS.find((p) => p.id === "beale");
	addBench(root, wx(beale.x + 70), wz(beale.y + beale.h + 16), Math.PI);
	addBench(root, wx(beale.x + beale.w - 70), wz(beale.y + beale.h + 16), Math.PI);
	scene.add(root);
}
function installMemphisEnvironmentPass() {
	const proto = WorldLifePass.prototype;
	if (proto.__memphisEnvironmentPatched) return;
	proto.__memphisEnvironmentPatched = true;
	const originalBuild = WorldLifePass.prototype.build;
	WorldLifePass.prototype.build = function environmentBuild() {
		originalBuild.call(this);
		const scene = this.scene;
		buildEnvironment(scene);
		const w = window;
		w.__SACK_ENVIRONMENT__ = {
			river: true,
			riverRailing: true,
			curbProps: true,
			streetFurniture: true
		};
	};
}
var ROAD_HALF = 48 * .92;
var SIDEWALK = 48 * .28;
function isStreetLight(group) {
	let hasTallPole = false;
	let hasHighLamp = false;
	for (const child of group.children) {
		if (!(child instanceof Mesh)) continue;
		if (child.geometry instanceof CylinderGeometry) {
			const height = Number(child.geometry.parameters.height) || 0;
			if (height >= 3 && height <= 3.8) hasTallPole = true;
		}
		if (child.geometry instanceof SphereGeometry && child.position.y >= 2.8) hasHighLamp = true;
	}
	return hasTallPole && hasHighLamp;
}
function isTree(group) {
	return group.children.some((child) => child instanceof Mesh && child.geometry instanceof IcosahedronGeometry);
}
function nearestStreet(x, y) {
	let result = null;
	for (const street of STREETS) {
		const center = street.tile * 48;
		const distance = street.axis === "y" ? Math.abs(y - center) : Math.abs(x - center);
		if (!result || distance < result.distance) result = {
			axis: street.axis,
			center,
			distance
		};
	}
	return result;
}
function moveOffRoad(group, extra) {
	let x = group.position.x * 16;
	let y = group.position.z * 16;
	const street = nearestStreet(x, y);
	if (!street) return false;
	const side = (street.axis === "y" ? Math.floor(x / 48) : Math.floor(y / 48)) % 2 === 0 ? 1 : -1;
	const offset = ROAD_HALF + SIDEWALK * .68 + extra;
	if (street.axis === "y") y = street.center + side * offset;
	else x = street.center + side * offset;
	x = Math.max(36, Math.min(WORLD_PX_W - 36, x));
	y = Math.max(36, Math.min(WORLD_PX_H - 36, y));
	group.position.x = x / 16;
	group.position.z = y / 16;
	return true;
}
function sanitize(scene) {
	let streetLightsRelocated = 0;
	let treesRelocated = 0;
	for (const child of scene.children) {
		if (!(child instanceof Group)) continue;
		const x = child.position.x * 16;
		const y = child.position.z * 16;
		if (isStreetLight(child)) {
			const street = nearestStreet(x, y);
			if (street && street.distance <= ROAD_HALF + 6 && moveOffRoad(child, 2)) streetLightsRelocated++;
			continue;
		}
		if (isTree(child) && isRoadPoint(x, y) && moveOffRoad(child, 10)) treesRelocated++;
	}
	return {
		streetLightsRelocated,
		treesRelocated
	};
}
function installStreetSanitationPass() {
	const proto = WorldLifePass.prototype;
	if (proto.__streetSanitationPatched) return;
	proto.__streetSanitationPatched = true;
	const originalBuild = WorldLifePass.prototype.build;
	WorldLifePass.prototype.build = function sanitizedWorldBuild() {
		originalBuild.call(this);
		const scene = this.scene;
		const result = sanitize(scene);
		const w = window;
		w.__SACK_ENVIRONMENT__ = {
			...w.__SACK_ENVIRONMENT__ ?? {},
			streetLightsRelocated: result.streetLightsRelocated,
			treesRelocated: result.treesRelocated,
			clearDrivingLanes: true
		};
	};
}
var CAR_COLORS = [
	2575219,
	1381653,
	14210767,
	8861495,
	5917233,
	1527091,
	5264732,
	7025759
];
function makeWheel() {
	const tire = new MeshStandardMaterial({
		color: 657930,
		roughness: .96
	});
	const rim = new MeshStandardMaterial({
		color: 9868950,
		roughness: .4,
		metalness: .66
	});
	const root = new Group();
	const wheel = new Mesh(new CylinderGeometry(.245, .245, .17, 12), tire);
	wheel.rotation.x = Math.PI / 2;
	root.add(wheel);
	const hub = new Mesh(new CylinderGeometry(.115, .115, .178, 10), rim);
	hub.rotation.x = Math.PI / 2;
	root.add(hub);
	return root;
}
function makeVehicleRig(index) {
	const root = new Group();
	root.name = "world-life-3d-vehicle";
	const paint = new MeshStandardMaterial({
		color: CAR_COLORS[index % CAR_COLORS.length],
		roughness: .38,
		metalness: .48
	});
	const trim = new MeshStandardMaterial({
		color: 1118481,
		roughness: .72,
		metalness: .18
	});
	const glass = new MeshStandardMaterial({
		color: 1517876,
		roughness: .16,
		metalness: .22
	});
	const chrome = new MeshStandardMaterial({
		color: 12040119,
		roughness: .3,
		metalness: .72
	});
	const headlight = new MeshStandardMaterial({
		color: 15788233,
		emissive: 16768922,
		emissiveIntensity: .85,
		roughness: .28
	});
	const brakeLeft = new MeshStandardMaterial({
		color: 4852234,
		emissive: 16719904,
		emissiveIntensity: .3,
		roughness: .34
	});
	const brakeRight = brakeLeft.clone();
	const body = new Mesh(new BoxGeometry(2.25, .46, .98), paint);
	body.position.y = .45;
	body.castShadow = true;
	root.add(body);
	const hood = new Mesh(new BoxGeometry(.62, .18, .9), paint);
	hood.position.set(.87, .7, 0);
	root.add(hood);
	const trunk = new Mesh(new BoxGeometry(.46, .17, .9), paint);
	trunk.position.set(-.93, .69, 0);
	root.add(trunk);
	const cabin = new Mesh(new BoxGeometry(1.05, .43, .84), glass);
	cabin.position.set(-.08, .82, 0);
	root.add(cabin);
	const roof = new Mesh(new BoxGeometry(.76, .09, .76), paint);
	roof.position.set(-.12, 1.055, 0);
	root.add(roof);
	for (const z of [-.505, .505]) {
		const rail = new Mesh(new BoxGeometry(1.76, .09, .045), trim);
		rail.position.set(-.02, .38, z);
		root.add(rail);
		const pillar = new Mesh(new BoxGeometry(.07, .42, .035), trim);
		pillar.position.set(-.1, .8, z * .96);
		root.add(pillar);
	}
	const frontBumper = new Mesh(new BoxGeometry(.1, .16, .84), chrome);
	frontBumper.position.set(1.17, .37, 0);
	root.add(frontBumper);
	const rearBumper = frontBumper.clone();
	rearBumper.position.x = -1.17;
	root.add(rearBumper);
	for (const z of [-.34, .34]) {
		const lamp = new Mesh(new BoxGeometry(.055, .17, .22), headlight);
		lamp.position.set(1.225, .53, z);
		root.add(lamp);
	}
	for (const [z, mat] of [[-.34, brakeLeft], [.34, brakeRight]]) {
		const lamp = new Mesh(new BoxGeometry(.055, .17, .22), mat);
		lamp.position.set(-1.225, .53, z);
		root.add(lamp);
	}
	for (const [x, z] of [
		[.7, .5],
		[.7, -.5],
		[-.7, .5],
		[-.7, -.5]
	]) {
		const wheel = makeWheel();
		wheel.position.set(x, .25, z);
		root.add(wheel);
	}
	if (index % 3 === 1) root.scale.set(1.08, .93, 1);
	if (index % 3 === 2) root.scale.set(.95, 1.07, .96);
	return {
		root,
		brakeLeft,
		brakeRight
	};
}
function installRig(group, index) {
	for (const child of group.children) {
		if (!(child instanceof Mesh)) continue;
		const material = child.material;
		if (material instanceof MeshBasicMaterial && material.map) child.visible = false;
	}
	const rig = makeVehicleRig(index);
	group.add(rig.root);
	group.userData.vehicleRig = rig;
	return rig;
}
function yawForVelocity(vx, vy) {
	return Math.atan2(-vy, vx);
}
function installVehicleVisualPass() {
	const proto = WorldLifePass.prototype;
	if (proto.__vehicleVisualPatched) return;
	proto.__vehicleVisualPatched = true;
	const originalPostSync = WorldLifePass.prototype.postSync;
	WorldLifePass.prototype.postSync = function vehicleVisualPostSync(frame, carGroups, npcSprites) {
		originalPostSync.call(this, frame, carGroups, npcSprites);
		const dt = Math.min(frame.dt || 1 / 60, .05);
		const ease = 1 - Math.exp(-11 * dt);
		for (let i = 0; i < carGroups.length; i++) {
			const group = carGroups[i];
			const car = frame.cars[i];
			if (!group || !car || !group.visible) continue;
			const rig = group.userData.vehicleRig ?? installRig(group, i);
			const target = yawForVelocity(car.vx, car.vy);
			const previous = typeof group.userData.gameYaw === "number" ? group.userData.gameYaw : target;
			const yaw = previous + Math.atan2(Math.sin(target - previous), Math.cos(target - previous)) * ease;
			group.userData.gameYaw = yaw;
			group.rotation.y = yaw;
			const speed = Math.hypot(car.vx, car.vy);
			const braking = speed < 24;
			rig.brakeLeft.emissiveIntensity = braking ? 3.2 : .28;
			rig.brakeRight.emissiveIntensity = braking ? 3.2 : .28;
			rig.root.rotation.z = Math.sin(frame.clock * 6.8 + i * .7) * Math.min(speed / 90, 1) * .004;
		}
		const w = window;
		if (w.__SACK_TRAFFIC__) {
			w.__SACK_TRAFFIC__.vehicle3D = true;
			w.__SACK_TRAFFIC__.vehicleRigCount = carGroups.filter((group) => !!group.userData.vehicleRig).length;
		}
	};
}
var RIVER = POIS.find((p) => p.id === "river");
var WATER_COLLIDER = {
	x: RIVER.x + 4,
	y: RIVER.y + 8,
	w: RIVER.w - 8,
	h: RIVER.h - 8
};
function installWorldHazardPass() {
	const proto = GameEngine.prototype;
	if (proto.__worldHazardsPatched) return;
	proto.__worldHazardsPatched = true;
	const originalCollides = GameEngine.prototype.collides;
	GameEngine.prototype.collides = function worldHazardCollision(x, y, r) {
		if (originalCollides.call(this, x, y, r)) return true;
		return circleHitsRect(x, y, r, WATER_COLLIDER);
	};
	const originalWireQa = GameEngine.prototype.wireQa;
	GameEngine.prototype.wireQa = function worldHazardQa() {
		originalWireQa.call(this);
		if (typeof window === "undefined") return;
		const w = window;
		if (!w.__gameTest) return;
		w.__gameTest.environmentCollisionProbe = () => ({
			riverWater: this.collides(RIVER.x + RIVER.w / 2, RIVER.y + RIVER.h / 2, 12),
			riverBoardwalk: this.collides(RIVER.x + RIVER.w / 2, RIVER.y - 18, 12)
		});
	};
}
var $$splitComponentImporter = () => import("./routes-CUhhMl3z.mjs");
installGameplayIntegrity();
installApartmentLayoutPass();
installInteriorCollisionPass();
installWorldHazardPass();
installCourtWorldIntegrity();
installMemphisEnvironmentPass();
installStreetSanitationPass();
installVehicleVisualPass();
var rootRouteChildren = { IndexRoute: createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") }).update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$1
}) };
var routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent"
	});
}
//#endregion
export { getRouter };
