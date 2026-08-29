import * as THREE from "three";
import { POIS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { poiBuildingRect, inCourtPx } from "./worldTopology";
import { FOOD_TRUCKS } from "./foodTrucks";
import { loadAllMaterials, setAnisotropy, std, type MatKey } from "./materials";
import { PlayerCharacter } from "./playerCharacter";
import type { LocomotionState } from "./characterController";
import { CAR_SKINS, facadeFor, loadCityArt, NPC_SPRITE, PED_SKINS, type CityArt } from "./cityArt";
import { decorateBuildings, getSignMaterial, type BuildingRef } from "./city/signage";
import { mountCityAds } from "./city/ads";
import { cutoutMeshMaterial, cutoutSpriteMaterial } from "./cutout";
import { createWebGLRenderer, disposeRenderer } from "./webgl";
import { makeDropVan, CAR_RIDE } from "./carRig";
import { bootVehicleWraps } from "./vehicleWraps";
import { ALL_PACKAGES, CYCLE_LABEL, CYCLE_SLOTS } from "./sponsors";

export const S = 1 / 16;

export function wx(x: number) {
  return x * S;
}
export function wz(y: number) {
  return y * S;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function canvasTex(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintWelkomeBoard() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1408;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0d0b0a";
  ctx.fillRect(0, 0, 1024, 1408);
  ctx.fillStyle = "#1db954";
  ctx.fillRect(0, 0, 1024, 18);
  ctx.fillRect(0, 1390, 1024, 18);
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(0, 18, 1024, 8);
  ctx.fillRect(0, 1382, 1024, 8);
  ctx.fillStyle = "#1db954";
  ctx.font = "700 42px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("$ACKRELIGIOUS", 512, 90);
  ctx.fillStyle = "#d4af37";
  ctx.font = "700 64px ui-sans-serif, system-ui";
  ctx.fillText("WELKOME", 512, 160);
  ctx.fillStyle = "#f5f0e1";
  ctx.font = "600 28px ui-sans-serif, system-ui";
  ctx.fillText("TO THE WORLD  ·  " + CYCLE_LABEL, 512, 205);
  ctx.fillStyle = "#8a8174";
  ctx.font = "500 22px ui-sans-serif, system-ui";
  ctx.fillText("2 SPONSORS  ·  2 ARTISTS  ·  30 DAYS", 512, 248);

  let y = 300;
  const drawPkg = (title: string, price: string, perks: string[], accent: string) => {
    ctx.fillStyle = "#171412";
    roundRect(ctx, 48, y, 928, 118 + perks.length * 28, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundRect(ctx, 48, y, 928, 118 + perks.length * 28, 16);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = "left";
    ctx.font = "700 28px ui-sans-serif, system-ui";
    ctx.fillText(title, 80, y + 42);
    ctx.textAlign = "right";
    ctx.fillText(price, 944, y + 42);
    ctx.textAlign = "left";
    ctx.fillStyle = "#c4b8a8";
    ctx.font = "500 22px ui-sans-serif, system-ui";
    perks.forEach((p, i) => ctx.fillText("·  " + p, 80, y + 78 + i * 28));
    y += 136 + perks.length * 28;
  };
  for (const p of ALL_PACKAGES) {
    drawPkg(p.name.toUpperCase(), "$" + p.price, p.perks.slice(0, 3), p.kind === "sponsor" ? "#1db954" : "#d4af37");
  }
  y += 8;
  ctx.fillStyle = "#d4af37";
  ctx.font = "700 26px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("THIS CYCLE", 512, y);
  y += 20;
  for (const s of CYCLE_SLOTS) {
    ctx.fillStyle = s.status === "held" ? "#122016" : "#1a1610";
    roundRect(ctx, 48, y, 928, 64, 12);
    ctx.fill();
    ctx.fillStyle = s.status === "held" ? "#1db954" : "#d4af37";
    ctx.textAlign = "left";
    ctx.font = "700 22px ui-sans-serif, system-ui";
    ctx.fillText(s.status === "held" ? "LIVE" : "OPEN", 72, y + 40);
    ctx.fillStyle = "#f5f0e1";
    ctx.font = "600 22px ui-sans-serif, system-ui";
    ctx.fillText(s.name, 170, y + 40);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8a8174";
    ctx.font = "500 18px ui-sans-serif, system-ui";
    ctx.fillText(s.kind.toUpperCase(), 944, y + 40);
    y += 74;
  }
  return canvasTex(c);
}

function paintOpenSlot(kicker: string, title: string, sub: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0d0b0a";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 498, 1024, 14);
  ctx.fillStyle = "#1db954";
  ctx.font = "700 36px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(kicker, 512, 150);
  ctx.fillStyle = "#f5f0e1";
  ctx.font = "700 52px ui-sans-serif, system-ui";
  ctx.fillText(title, 512, 230);
  ctx.fillStyle = "#c4b8a8";
  ctx.font = "500 28px ui-sans-serif, system-ui";
  ctx.fillText(sub, 512, 300);
  ctx.fillStyle = "#8a8174";
  ctx.font = "600 22px ui-sans-serif, system-ui";
  ctx.fillText("SONGS MUST BE KLEAN  ·  30 DAYS", 512, 380);
  return canvasTex(c);
}

function makeFloatLabel(text: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = "rgba(13,11,10,0.72)";
  ctx.fillRect(20, 18, 472, 60);
  ctx.fillStyle = "#d4af37";
  ctx.font = "700 32px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 48);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthTest: false }));
  sprite.scale.set(1.7, 0.32, 1);
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeSkyTex() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#1a1520");
  grd.addColorStop(0.32, "#3a2a28");
  grd.addColorStop(0.58, "#c47848");
  grd.addColorStop(0.76, "#f2c66a");
  grd.addColorStop(1, "#1a1612");
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type WorldFrame = {
  px: number;
  py: number;
  yaw: number;
  pitch: number;
  cameraView: "first" | "third";
  mode: string;
  facing: "up" | "down" | "left" | "right";
  moving: boolean;
  bob: number;
  trauma: number;
  clock: number;
  ball: { x: number; y: number; z: number; held: boolean; inFlight: boolean; active?: boolean };
  cars: { x: number; y: number; vx: number; vy: number; w: number; color: string; skin?: number; laneId?: string; yaw?: number; braking?: boolean; parked?: boolean }[];
  peds: { x: number; y: number; color: string; t: number; skin?: number; vx?: number; vy?: number; facing?: number; waving?: number; talking?: number; inside?: boolean }[];
  npcs: { id: string; x: number; y: number; isK: boolean }[];
  images: Record<string, HTMLImageElement>;
  dt: number;
  heading: number;
  moveSpeed: number;
  lean: number;
  animT: number;
  loco: LocomotionState;
  indoor: boolean;
  punch: number;
  hoopPulse: number;
  hoopSway?: number;
  hoopIndex?: number;
  ballCharging?: boolean;
  air: number;
  vz: number;
  equipped?: string | null;
  outfitColor?: string | null;
  dropLive?: boolean;
  driving?: boolean;
  vehicleKind?: "van" | "car" | null;
  jooking?: boolean;
  listening?: boolean;
  worldHour?: number;
  dribbling?: boolean;
  releasing?: boolean;
  crowdPulse?: number;
  celebrate?: number;
  talking?: boolean;
  interacting?: boolean;
  rebounding?: boolean;
  vanSkin?: string | null;
  fishing?: {
    active: boolean;
    phase: string;
    bobX: number;
    bobY: number;
    nibble: boolean;
    power?: number;
    progress?: number;
    tension?: number;
    fishId?: string | null;
  } | null;
  raceGates?: { x: number; y: number; next: boolean }[];
  raceClear?: boolean;
  foodServe?: { truckId: string; t: number; duration: number; item: string } | null;
};

type TexPack = Partial<Record<MatKey, THREE.Texture>>;

export class World3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, 1, 0.12, 420);
  player: THREE.Group;
  benji: PlayerCharacter;
  ball: THREE.Mesh;
  ballShadow: THREE.Mesh;
  hoopRim: THREE.Mesh;
  hoopNet: THREE.Mesh | null = null;
  private hoopRimHome = new THREE.Vector3();
  private hoopNetHome = new THREE.Vector3();
  cars: THREE.Group[] = [];
  peds: THREE.Group[] = [];
  npcSprites = new Map<string, THREE.Sprite>();
  sun: THREE.DirectionalLight;
  overlay: HTMLCanvasElement;
  mats: TexPack = {};
  private spriteMats: Partial<Record<string, THREE.SpriteMaterial>> = {};
  protected art: CityArt = { people: {}, cars: {}, facades: {}, store: {}, food: {}, ads: {} };
  dropVan: THREE.Group | null = null;
  private foodRigs: THREE.Group[] = [];
  private veliVideo: HTMLVideoElement | null = null;
  private veliScreen: THREE.Mesh | null = null;
  private kollabRigs: THREE.Group[] = [];
  private fishingRig: THREE.Group | null = null;
  private bobber: THREE.Mesh | null = null;
  private signMat: THREE.MeshStandardMaterial | null = null;
  private clock = 0;
  private tmp = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camFov = 62;
  private lastDt = 1 / 60;
  private benjiReady = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = createWebGLRenderer(canvas);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x1a1612, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    this.overlay = document.createElement("canvas");
    this.overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
    canvas.parentElement?.appendChild(this.overlay);

    this.scene.fog = new THREE.Fog(0x3a2a22, 22, 145);
    this.scene.background = makeSkyTex();

    const hemi = new THREE.HemisphereLight(0xffc878, 0x2a241c, 0.82);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0x4a3828, 0.42));

    this.sun = new THREE.DirectionalLight(0xffc878, 1.45);
    this.sun.position.set(-52, 28, -18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.buildSky();

    this.player = new THREE.Group();
    this.benji = new PlayerCharacter();
    this.player.add(this.benji.root);
    this.scene.add(this.player);
    this.camPos.set(10, 8, 18);

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xc46a32, roughness: 0.55, metalness: 0.05 }),
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);

    this.hoopRim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 10, 24));
    this.camera.position.set(10, 8, 18);
  }

  async loadTextures(onProgress?: (d: number, t: number) => void) {
    try {
      const [mats, art, signMat] = await Promise.all([
        loadAllMaterials(onProgress),
        loadCityArt(),
        getSignMaterial(),
        bootVehicleWraps(),
      ]);
      this.mats = mats;
      this.art = art;
      this.signMat = signMat;
    } catch {
      this.mats = {};
    }
  }

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 24, 16),
      new THREE.MeshBasicMaterial({ map: makeSkyTex(), side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.scene.add(sky);
    const sunDisk = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: false, toneMapped: false }),
    );
    sunDisk.position.set(-78, 22, -86);
    this.scene.add(sunDisk);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(16, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff9a4a,
        transparent: true,
        opacity: 0.26,
        fog: false,
        depthWrite: false,
      }),
    );
    glow.position.copy(sunDisk.position);
    this.scene.add(glow);
  }

  private t(key: MatKey) {
    return this.mats[key];
  }

  buildCity(walls: { x: number; y: number; w: number; h: number }[], trees: { x: number; y: number }[]) {
    this.foodRigs = [];
    this.kollabRigs = [];
    this.buildGround();
    const wallMat = std(this.t("brick"), { roughness: 0.88, repeat: [2.4, 1.6] });
    const stuccoMat = std(this.t("stucco"), { roughness: 0.9, repeat: [2, 1.4] });
    const facadeMat = std(this.t("windows"), {
      roughness: 0.5,
      metalness: 0.08,
      emissive: 0xf2c66a,
      emissiveIntensity: 0.38,
      repeat: [2, 2],
    });
    const roofMat = std(this.t("roof"), { roughness: 0.92, repeat: [2, 2] });
    const shutterMat = std(this.t("shutter"), { roughness: 0.5, metalness: 0.5, repeat: [1, 1] });

    for (const wall of walls) {
      if (wall.w >= WORLD_PX_W - 4 || wall.h >= WORLD_PX_H - 4) continue;
      const bw = Math.max(wx(wall.w), 1.6);
      const bd = Math.max(wz(wall.h), 1.6);
      const stories = 1.8 + hash(wall.x * 3 + wall.y) * 7.5;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, stories, bd), hash(wall.x) > 0.45 ? stuccoMat : wallMat);
      body.position.y = stories / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const facPick = (["hq", "apartment", "beale"] as const)[Math.floor(hash(wall.x + wall.y * 3) * 3)]!;
      const facTex = this.art.facades[facPick] ?? this.t("windows");
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(bw * 0.96, stories * 0.88),
        facTex
          ? new THREE.MeshStandardMaterial({ map: facTex, roughness: 0.64 })
          : facadeMat,
      );
      face.position.set(0, stories * 0.5, bd / 2 + 0.03);
      g.add(face);
      const faceN = face.clone();
      faceN.rotation.y = Math.PI;
      faceN.position.z = -bd / 2 - 0.03;
      g.add(faceN);
      if (stories > 3) {
        const shut = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.5, 1.1), shutterMat);
        shut.position.set(0, 1.0, bd / 2 + 0.04);
        g.add(shut);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.18, 0.18, bd + 0.18), roofMat);
      roof.position.y = stories + 0.08;
      roof.castShadow = true;
      g.add(roof);
      g.position.set(wx(wall.x + wall.w / 2), 0, wz(wall.y + wall.h / 2));
      this.scene.add(g);
    }

    const buildings: BuildingRef[] = [];
    const hqMat = std(this.t("hqBrick"), { roughness: 0.82, repeat: [2, 1.6] });
    const woodMat = std(this.t("wood"), { roughness: 0.65, repeat: [1.4, 1] });
    const fabricMat = std(this.t("fabric"), { roughness: 0.88, repeat: [2, 1] });
    const storefrontMat = std(this.t("storefront"), {
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0xf2c66a,
      emissiveIntensity: 0.22,
      repeat: [1.2, 1],
    });
    const cinderMat = std(this.t("cinder"), { roughness: 0.88, repeat: [2, 1.4] });

    for (const poi of POIS) {
      if (poi.id === "court" || poi.id === "river") continue;
      if (poi.id === "pyramid") {
        const br = poiBuildingRect(poi);
        const pyr = new THREE.Mesh(
          new THREE.ConeGeometry(wx(br.w) * 0.62, 14, 4),
          std(this.t("concrete"), { roughness: 0.7, metalness: 0.08, repeat: [2, 2] }),
        );
        pyr.position.set(wx(br.x + br.w / 2), 7, wz(br.y + br.h / 2));
        pyr.rotation.y = Math.PI / 4;
        pyr.castShadow = true;
        this.scene.add(pyr);
        continue;
      }
      if (poi.id === "dropvan") {
        this.dropVan = makeDropVan();
        this.dropVan.position.set(wx(poi.x + poi.w / 2), CAR_RIDE, wz(poi.y + poi.h / 2));
        this.dropVan.rotation.y = 0;
        this.scene.add(this.dropVan);
        continue;
      }
      if (poi.id === "foodtruck" || poi.id === "velis" || poi.id === "brothers") continue;
      if (poi.id === "welcome" || poi.id === "listenpost" || poi.id === "billboard") continue;
      const br = poiBuildingRect(poi);
      const h = poi.id === "store" ? 6.6 : poi.id === "beale" ? 5.4 : 4.6 + hash(poi.x) * 3;
      const g = new THREE.Group();
      g.userData.poiId = poi.id;
      const bodyMat = poi.id === "store" || poi.id === "beale" ? hqMat : poi.id === "culture" ? woodMat : cinderMat;
      const bw = wx(br.w);
      const bd = wz(br.h);
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), bodyMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const facadeKey = facadeFor(poi.id);
      const facadeTex = facadeKey ? this.art.facades[facadeKey] : undefined;
      if (facadeTex) {
        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(bw * 0.98, h * 0.9),
          new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.62, metalness: 0.04 }),
        );
        face.position.set(0, h * 0.48, bd / 2 + 0.04);
        g.add(face);
        const faceN = face.clone();
        faceN.rotation.y = Math.PI;
        faceN.position.z = -bd / 2 - 0.04;
        g.add(faceN);
      } else {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.72, 1.8), storefrontMat);
        glass.position.set(0, 1.4, bd / 2 + 0.05);
        g.add(glass);
      }
      const awning = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.95, 0.1, 0.72), fabricMat);
      awning.position.set(0, 2.2, bd / 2 + 0.28);
      g.add(awning);
      g.position.set(wx(br.x + br.w / 2), 0, wz(br.y + br.h / 2));
      this.scene.add(g);
      buildings.push({ id: poi.id, group: g, width: bw, depth: bd, height: h, tall: h > 6 });
    }
    for (const truck of FOOD_TRUCKS) {
      const poi = POIS.find((p) => p.id === truck.id);
      if (!poi) continue;
      const key = truck.id === "velis" ? "velis" : truck.id === "brothers" ? "brothers" : "catch";
      const cookKey = truck.id === "velis" ? "local" : truck.id === "brothers" ? "fan" : "host";
      const cook2 = truck.id === "brothers" ? "dj" : null;
      this.scene.add(this.makeFoodTruck(truck.id, poi, this.art.food[key], truck.accentHex, cookKey, cook2));
    }
    this.buildKollabWorld();
    if (this.signMat) void decorateBuildings(buildings);
    mountCityAds(this.scene, buildings, this.art.ads["sacks-giving"]);

    const trunkMat = std(this.t("wood"), { roughness: 0.95, color: 0x8a6a48, repeat: [1, 2] });
    const leafMat = std(this.t("canopy"), { roughness: 0.88, color: 0xffffff });
    for (const t of trees) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 6), trunkMat);
      trunk.position.y = 0.55;
      trunk.castShadow = true;
      g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.88, 0), leafMat);
      leaf.position.y = 1.55;
      leaf.castShadow = true;
      g.add(leaf);
      g.position.set(wx(t.x), 0, wz(t.y));
      this.scene.add(g);
    }

    const poleMat = std(this.t("charcoal"), { metalness: 0.55, roughness: 0.4 });
    for (let i = 3; i < 60; i += 7) {
      for (const yt of [6, 20, 34]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6), poleMat);
        pole.position.y = 1.7;
        g.add(pole);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xf2c66a, emissive: 0xffb347, emissiveIntensity: 1.5 }),
        );
        lamp.position.y = 3.35;
        g.add(lamp);
        if ((i + yt) % 21 === 3) {
          const light = new THREE.PointLight(0xffb347, 2.0, 14, 2);
          light.position.y = 3.3;
          g.add(light);
        }
        g.position.set(wx(i * TILE + 12), 0, wz(yt * TILE + 10));
        this.scene.add(g);
      }
    }

    this.buildCourt();
  }

  private buildGround() {
    const asphaltMat = std(this.t("asphalt"), { roughness: 0.94, metalness: 0.02, repeat: [36, 28] });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(wx(WORLD_PX_W) + 20, wz(WORLD_PX_H) + 20), asphaltMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(wx(WORLD_PX_W) / 2, 0, wz(WORLD_PX_H) / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const sidewalkMat = std(this.t("sidewalk"), { roughness: 0.9, repeat: [18, 2] });
    const mkWalk = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), sidewalkMat);
      m.position.set(x, 0.04, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    mkWalk(wx(WORLD_PX_W) / 2, wz(20 * TILE), wx(WORLD_PX_W), 2.4);
    mkWalk(wx(WORLD_PX_W) / 2, wz(6 * TILE), wx(WORLD_PX_W), 2.2);
    mkWalk(wx(WORLD_PX_W) / 2, wz(34 * TILE), wx(WORLD_PX_W), 2.2);
    mkWalk(wx(16 * TILE), wz(WORLD_PX_H) / 2, 2.2, wz(WORLD_PX_H));
    mkWalk(wx(34 * TILE), wz(WORLD_PX_H) / 2, 2.2, wz(WORLD_PX_H));

    const stripeMat = std(this.t("stripe"), { roughness: 0.85, repeat: [8, 1] });
    for (let i = 0; i < 28; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.16), stripeMat);
      dash.position.set(6 + i * 6.4, 0.07, wz(20 * TILE));
      this.scene.add(dash);
    }
  }

  private makeVan(x: number, z: number) {
    const g = new THREE.Group();
    const vanTex = this.art.cars.van;
    if (vanTex) {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.7),
        new THREE.MeshBasicMaterial({
          map: vanTex,
          transparent: true,
          alphaTest: 0.2,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      card.position.y = 0.88;
      g.add(card);
      const card2 = card.clone();
      card2.rotation.y = Math.PI / 2;
      g.add(card2);
    } else {
      const metal = std(this.t("carMetal"), { roughness: 0.38, metalness: 0.62, color: 0x1a1816 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.7, 1.7), metal);
      body.position.y = 1.05;
      body.castShadow = true;
      g.add(body);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.12, 0.22, 1.72),
        new THREE.MeshStandardMaterial({ color: 0x1db954, emissive: 0x1db954, emissiveIntensity: 0.35 }),
      );
      stripe.position.y = 1.35;
      g.add(stripe);
    }
    this.addWheels(g, 1.15, 0.62);
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    g.add(sh);
    g.position.set(x, 0, z);
    return g;
  }

  private makeFoodTruck(
    id: string,
    poi: { x: number; y: number; w: number; h: number },
    logo: THREE.Texture | undefined,
    accent: number,
    cookKey: keyof CityArt["people"],
    cookKey2: keyof CityArt["people"] | null,
  ) {
    const g = new THREE.Group();
    g.name = `food-truck-${id}`;
    const paint = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.46, metalness: 0.16 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.64, metalness: 0.22 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8b3aa, roughness: 0.32, metalness: 0.7 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.22, metalness: 0.82 });
    const warm = new THREE.MeshStandardMaterial({ color: 0xffc07a, roughness: 0.45, emissive: 0xff9a3c, emissiveIntensity: 0.55 });
    const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };

    add(new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.18, 2.05), dark), 0.05, 0.42, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.1, 2.02), dark), 0.45, 0.55, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.1, 2.02), paint), 0.45, 2.18, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.72, 2.02), paint), -1.28, 1.36, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.72, 2.02), paint), 2.18, 1.36, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.55, 1.72, 0.1), paint), 0.45, 1.36, -0.96);

    add(new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.72, 0.1), paint), -0.62, 1.36, 0.96);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.72, 0.1), paint), 1.84, 1.36, 0.96);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.1), paint), 0.72, 2.01, 0.96);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 0.1), paint), 0.72, 0.86, 0.96);

    add(new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 0.48), steel), 0.72, 1.1, 1.22);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.78), paint), 0.72, 2.22, 1.28);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), chrome), 0.05, 2.08, 1.18);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), chrome), 1.4, 2.08, 1.18);

    add(new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.48, 2.02), dark), -1.9, 1.18, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.7), new THREE.MeshStandardMaterial({
      color: 0x8ec4e0, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.42,
    })), -2.58, 1.38, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 2.08), chrome), -1.9, 0.48, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), warm), -2.52, 0.72, 0.62);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), warm), -2.52, 0.72, -0.62);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), chrome), -2.55, 1.55, 1.02);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), chrome), -2.55, 1.55, -1.02);

    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.7), dark), 0.2, 2.42, -0.2);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 8), steel), 1.55, 2.52, -0.55);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10), steel), 2.05, 0.78, -0.55);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10), steel), 2.05, 0.78, -0.85);

    const interior = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.06, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.8 }),
    );
    interior.position.set(0.55, 0.62, 0);
    g.add(interior);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.55), steel), 0.7, 1.02, 0.35);

    const board = new THREE.Mesh(new THREE.BoxGeometry(id === "velis" ? 1.28 : 0.78, id === "velis" ? 0.78 : 0.92, 0.06), dark);
    board.position.set(id === "velis" ? 1.98 : 1.88, 1.52, 1.08);
    g.add(board);

    if (logo) {
      const src = logo.image as { width?: number; height?: number } | undefined;
      const aspect = src?.width && src?.height ? src.width / src.height : 1.5;
      const mat = new THREE.MeshBasicMaterial({
        map: logo, transparent: true, alphaTest: 0.04, toneMapped: false, side: THREE.DoubleSide,
      });
      const panel = (maxW: number, maxH: number) => {
        let w = maxW;
        let h = maxW / aspect;
        if (h > maxH) {
          h = maxH;
          w = maxH * aspect;
        }
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      };
      const street = panel(1.7, 1.5);
      street.position.set(0.45, 1.4, -1.02);
      street.rotation.y = Math.PI;
      g.add(street);
      const walkUp = panel(0.95, 1.35);
      walkUp.position.set(-0.62, 1.42, 1.02);
      if (id !== "velis") g.add(walkUp);
      const rear = panel(1.2, 1.4);
      rear.position.set(2.24, 1.4, 0);
      rear.rotation.y = Math.PI / 2;
      if (id !== "velis") g.add(rear);
      if (id !== "velis") {
        const sign = panel(0.7, 0.84);
        sign.position.set(1.88, 1.52, 1.12);
        g.add(sign);
      }
    }
    if (id === "velis") this.mountVeliScreen(g);

    const cookTex = this.art.people[cookKey];
    const cooks: THREE.Object3D[] = [];
    const makeCook = (tex: THREE.Texture | undefined, x: number) => {
      const cook = tex
        ? new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.35), cutoutMeshMaterial(tex))
        : new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), new THREE.MeshStandardMaterial({ color: 0xc4a574 }));
      cook.position.set(x, 1.28, 0.18);
      g.add(cook);
      cooks.push(cook);
      return cook;
    };
    makeCook(cookTex, cookKey2 ? 0.48 : 0.72);
    if (cookKey2) makeCook(this.art.people[cookKey2], 1.02);

    const plate = new THREE.Group();
    plate.name = "order-plate";
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.55 }));
    tray.position.y = 0;
    plate.add(tray);
    const pile = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: id === "foodtruck" ? 0x3d7a4a : id === "velis" ? 0xd4af37 : 0xc2410c, roughness: 0.5 }),
    );
    pile.position.set(0, 0.08, 0);
    pile.scale.set(1.3, 0.7, 1.1);
    plate.add(pile);
    const fry = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
    fry.position.set(0.08, 0.06, 0.04);
    plate.add(fry);
    plate.position.set(0.72, 1.16, 0.7);
    plate.visible = false;
    g.add(plate);

    const lamp = new THREE.PointLight(accent, 2.4, 5.5, 1.6);
    lamp.position.set(0.7, 1.7, 0.55);
    g.add(lamp);
    const windowGlow = new THREE.PointLight(0xffc07a, 1.6, 4.2, 1.8);
    windowGlow.position.set(0.72, 1.45, 1.15);
    g.add(windowGlow);

    this.addWheels(g, 1.35, 0.82);
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(1.85, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    g.add(sh);

    g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
    g.rotation.y = Math.PI;
    g.userData.cooks = cooks;
    g.userData.plate = plate;
    g.userData.truckId = id;
    this.foodRigs.push(g);
    return g;
  }

  private mountVeliScreen(g: THREE.Group) {
    const video = document.createElement("video");
    video.src = "/game/food/yung-veli.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.setAttribute("playsinline", "true");
    video.style.cssText = "position:fixed;left:-99px;top:-99px;width:8px;height:8px;opacity:0;pointer-events:none";
    document.body.appendChild(video);
    video.load();
    void video.play().catch(() => {});
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.86, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.4 }),
    );
    bezel.position.set(1.92, 1.5, 1.12);
    g.add(bezel);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 0.76),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    );
    screen.position.set(1.92, 1.5, 1.16);
    g.add(screen);
    const sideBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.86, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.4 }),
    );
    sideBezel.position.set(2.22, 1.5, 0.35);
    g.add(sideBezel);
    const sideScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 0.76),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    );
    sideScreen.position.set(2.26, 1.5, 0.35);
    sideScreen.rotation.y = Math.PI / 2;
    g.add(sideScreen);
    this.veliVideo = video;
    this.veliScreen = screen;
  }

  private syncFoodTrucks(f: WorldFrame) {
    const video = this.veliVideo;
    for (const g of this.foodRigs) {
      const id = g.userData.truckId as string;
      const cooks = g.userData.cooks as THREE.Object3D[] | undefined;
      const plate = g.userData.plate as THREE.Group | undefined;
      const serving = f.foodServe?.truckId === id;
      const dur = f.foodServe?.duration || 1;
      const u = serving ? 1 - Math.max(0, f.foodServe!.t) / dur : 0;
      const reach = serving ? Math.sin(Math.min(1, u) * Math.PI) : 0;
      if (cooks) {
        cooks.forEach((c, i) => {
          const groove = id === "velis" && video && !video.paused;
          const hit = groove ? Math.pow(Math.max(0, Math.sin(video.currentTime * 9.95 + i * 0.4)), 2.2) : 0;
          const idle = Math.sin(f.clock * 2.1 + i) * 0.03;
          c.position.z = 0.18 + reach * 0.55 + idle;
          c.position.y = 1.28 + Math.abs(Math.sin(f.clock * 3 + i)) * 0.02 + reach * 0.04 - hit * 0.07;
          c.rotation.x = -hit * 0.28;
        });
      }
      if (plate) {
        if (serving && u > 0.16 && u < 0.9) {
          plate.visible = true;
          const p = (u - 0.16) / 0.74;
          plate.position.set(0.72, 1.16 + Math.sin(p * Math.PI) * 0.08, 0.72 + p * 0.85);
          plate.rotation.y = p * 0.35;
        } else {
          plate.visible = false;
          plate.position.set(0.72, 1.16, 0.7);
        }
      }
    }
    if (video) {
      const poi = POIS.find((p) => p.id === "velis");
      const d = poi ? Math.hypot(f.px - (poi.x + poi.w / 2), f.py - (poi.y + poi.h / 2)) : 999;
      const close = d < 168;
      if (close) {
        if (video.paused) {
          video.muted = true;
          void video.play().then(() => {
            video.muted = false;
          }).catch(() => {});
        } else {
          video.muted = false;
          video.volume = Math.max(0.12, 1 - d / 180);
        }
      } else if (!video.paused) {
        video.pause();
        video.muted = true;
      }
    }
    this.pulseKollab(f);
  }

  private pulseKollab(f: WorldFrame) {
    for (const g of this.kollabRigs) {
      const kind = g.userData.kind as string;
      const light = g.userData.glow as THREE.PointLight | undefined;
      const screen = g.userData.screen as THREE.Mesh | undefined;
      const ring = g.userData.ring as THREE.Mesh | undefined;
      const close = kind === "listen"
        ? Math.hypot(f.px - (g.userData.px as number), f.py - (g.userData.py as number)) < 150
        : false;
      const pulse = 0.45 + Math.sin(f.clock * 3.2) * 0.35;
      if (light) light.intensity = close ? 2.4 + pulse : 0.55 + pulse * 0.4;
      if (ring) {
        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = close ? 1.4 + pulse : 0.35;
      }
      if (screen && close) screen.rotation.y = Math.sin(f.clock * 0.4) * 0.02;
    }
  }

  private buildKollabWorld() {
    const welcome = POIS.find((p) => p.id === "welcome");
    const post = POIS.find((p) => p.id === "listenpost");
    const board = POIS.find((p) => p.id === "billboard");
    if (welcome) this.scene.add(this.makeWelkomePlaza(welcome));
    if (post) this.scene.add(this.makeListenPost(post));
    if (board) this.scene.add(this.makeSponsorBillboard(board));
  }

  private makeWelkomePlaza(poi: { x: number; y: number; w: number; h: number }) {
    const g = new THREE.Group();
    const cx = wx(poi.x + poi.w / 2);
    const cz = wz(poi.y + poi.h / 2);
    g.position.set(cx, 0, cz);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(wx(poi.w) + 0.4, 0.08, wz(poi.h) + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.7, metalness: 0.15 }),
    );
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    g.add(pad);

    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.7, emissive: 0x6a4e12, emissiveIntensity: 0.35 });
    const green = new THREE.MeshStandardMaterial({ color: 0x1db954, roughness: 0.4, metalness: 0.25, emissive: 0x0a5c2a, emissiveIntensity: 0.25 });
    for (const [x, z] of [[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 8), gold);
      post.position.set(x, 1.2, z);
      g.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.16, 0.16), gold);
    lintel.position.set(0, 2.42, 1.4);
    g.add(lintel);

    const tex = paintWelkomeBoard();
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(3.35, 4.55),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    );
    card.position.set(0, 2.35, 1.28);
    g.add(card);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.7, 0.08), gold);
    frame.position.set(0, 2.35, 1.22);
    g.add(frame);

    const neon = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.12), green);
    neon.position.set(0, 4.78, 1.28);
    g.add(neon);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.045, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(1.55, 0.08, 0.85);
    g.add(ring);
    g.userData.ring = ring;

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.85, roughness: 0.28, emissive: 0x5a4310, emissiveIntensity: 0.2 }),
    );
    body.position.set(1.55, 0.95, 0.85);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), body.material);
    head.position.set(1.55, 1.48, 0.85);
    g.add(head);
    const tag = makeFloatLabel("YOUR KHARAKTER");
    tag.position.set(1.55, 1.85, 0.85);
    g.add(tag);

    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.9, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x111010, roughness: 0.45, metalness: 0.4 }),
    );
    kiosk.position.set(-1.7, 0.48, 0.15);
    g.add(kiosk);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x1db954 }),
    );
    screen.position.set(-1.7, 0.68, 0.36);
    g.add(screen);

    g.userData.kind = "welcome";
    g.userData.px = poi.x + poi.w / 2;
    g.userData.py = poi.y + poi.h / 2;
    this.kollabRigs.push(g);
    return g;
  }

  private makeListenPost(poi: { x: number; y: number; w: number; h: number }) {
    const g = new THREE.Group();
    g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.2, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.65 }),
    );
    pad.position.y = 0.05;
    g.add(pad);
    const cab = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45, metalness: 0.35 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.7, emissive: 0x5a4310, emissiveIntensity: 0.45 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.42), cab);
    left.position.set(-0.55, 0.72, 0);
    g.add(left);
    const right = left.clone();
    right.position.x = 0.55;
    g.add(right);
    const coneL = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), gold);
    coneL.position.set(-0.55, 0.95, 0.22);
    g.add(coneL);
    const coneR = coneL.clone();
    coneR.position.x = 0.55;
    g.add(coneR);
    const tex = paintOpenSlot("LISTENING POST", "ARTIST DELUXE $180", "Song plays when Benji is close");
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.92),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    );
    screen.position.set(0, 1.85, 0.28);
    g.add(screen);
    const light = new THREE.PointLight(0xd4af37, 1.2, 8, 2);
    light.position.set(0, 1.8, 0.4);
    g.add(light);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.5 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    const tag = makeFloatLabel("OPEN SLOT");
    tag.position.set(0, 2.25, 0);
    g.add(tag);
    g.userData.kind = "listen";
    g.userData.glow = light;
    g.userData.screen = screen;
    g.userData.ring = ring;
    g.userData.px = poi.x + poi.w / 2;
    g.userData.py = poi.y + poi.h / 2;
    this.kollabRigs.push(g);
    return g;
  }

  private makeSponsorBillboard(poi: { x: number; y: number; w: number; h: number }) {
    const g = new THREE.Group();
    g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.5, roughness: 0.4 }),
    );
    pole.position.y = 2.6;
    g.add(pole);
    const tex = paintOpenSlot("PREMIUM $250", "YOUR BILLBOARD · 30 DAYS", "Deluxe + this wall. Clean records only.");
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.35),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    );
    face.position.set(0, 5.15, 0.12);
    g.add(face);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 2.55, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.35, emissive: 0x5a4310, emissiveIntensity: 0.3 }),
    );
    frame.position.set(0, 5.15, 0.02);
    g.add(frame);
    const light = new THREE.PointLight(0xffe08a, 1.6, 14, 2);
    light.position.set(0, 4.4, 1.2);
    g.add(light);
    g.userData.kind = "billboard";
    g.userData.glow = light;
    g.userData.px = poi.x + poi.w / 2;
    g.userData.py = poi.y + poi.h / 2;
    this.kollabRigs.push(g);
    return g;
  }

  private addWheels(g: THREE.Group, ax: number, az: number) {
    const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const geo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
    const spots: [number, number][] = [
      [ax, az],
      [ax, -az],
      [-ax, az],
      [-ax, -az],
    ];
    for (const [x, z] of spots) {
      const w = new THREE.Mesh(geo, tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(x * 0.7, 0.28, z);
      g.add(w);
    }
  }

  private buildCourt() {
    const court = POIS.find((p) => p.id === "court")!;
    const cx = wx(court.x + court.w / 2);
    const cz = wz(court.y + court.h / 2);
    const cw = wx(court.w);
    const cd = wz(court.h);
    const courtMap = this.art.facades.court;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(cw, 0.1, cd),
      courtMap
        ? new THREE.MeshStandardMaterial({ map: courtMap, roughness: 0.72 })
        : std(this.t("court"), { roughness: 0.76, repeat: [3, 2.4] }),
    );
    floor.position.set(cx, 0.06, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    if (!this.art.facades.court) {
      const lines = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.04, 3.5),
        std(this.t("courtLines"), { roughness: 0.72, repeat: [1, 1] }),
      );
      lines.position.set(cx, 0.13, wz(court.y) + 2.2);
      this.scene.add(lines);
    }

    const fenceMat = std(this.t("fence"), {
      roughness: 0.45,
      metalness: 0.35,
      transparent: true,
      opacity: 0.72,
      repeat: [4, 1.2],
    });
    for (const [dx, dz, rw, rd] of [
      [0, -cd / 2 - 0.05, cw, 0.06],
      [-cw / 2 - 0.05, 0, 0.06, cd],
      [cw / 2 + 0.05, 0, 0.06, cd],
    ] as const) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.6, rd), fenceMat);
      f.position.set(cx + dx, 0.85, cz + dz);
      this.scene.add(f);
    }

    const hoopZ = wz(court.y + 26);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.15, 8),
      std(this.t("charcoal"), { metalness: 0.65, roughness: 0.3 }),
    );
    pole.position.set(cx, 1.58, hoopZ - 0.55);
    pole.castShadow = true;
    this.scene.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 1.15, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35, metalness: 0.05 }),
    );
    board.position.set(cx, 3.15, hoopZ - 0.42);
    this.scene.add(board);
    const flyer = this.art.ads["sacks-giving"];
    if (flyer) {
      const ad = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 2.25),
        new THREE.MeshBasicMaterial({ map: flyer, toneMapped: false, side: THREE.DoubleSide }),
      );
      ad.position.set(cx + 2.4, 2.7, hoopZ - 0.2);
      this.scene.add(ad);
      const ad2 = ad.clone();
      ad2.position.set(cx - 2.4, 2.7, hoopZ - 0.2);
      this.scene.add(ad2);
    }
    this.scene.add(board);
    const square = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.02), new THREE.MeshBasicMaterial({ color: 0xe85d4c }));
    square.position.set(cx, 2.95, hoopZ - 0.37);
    this.scene.add(square);
    this.hoopRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.028, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xea580c,
        metalness: 0.55,
        roughness: 0.25,
        emissive: 0x3a1408,
        emissiveIntensity: 0.2,
      }),
    );
    this.hoopRim.rotation.x = Math.PI / 2;
    this.hoopRim.position.set(cx, 2.72, hoopZ);
    this.hoopRimHome.copy(this.hoopRim.position);
    this.scene.add(this.hoopRim);
    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.14, 0.42, 10, 3, true),
      new THREE.MeshBasicMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.55, wireframe: true }),
    );
    net.position.set(cx, 2.48, hoopZ);
    this.scene.add(net);
    this.hoopNet = net;
    this.hoopNetHome.copy(net.position);
    return this.hoopRim;
  }

  private matFor(img: HTMLImageElement, key: string) {
    if (this.spriteMats[key]) return this.spriteMats[key]!;
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    this.spriteMats[key] = mat;
    return mat;
  }

  private ensureCars(n: number) {
    const metal = std(this.t("carMetal"), { roughness: 0.36, metalness: 0.58 });
    while (this.cars.length < n) {
      const i = this.cars.length;
      const g = new THREE.Group();
      const skin = CAR_SKINS[i % CAR_SKINS.length]!;
      const tex = this.art.cars[skin];
      if (tex) {
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(2.35, 1.02),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.18,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        );
        card.position.y = 0.52;
        g.add(card);
        const card2 = card.clone();
        card2.rotation.y = Math.PI / 2;
        g.add(card2);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.48, 0.86), metal.clone());
        body.position.y = 0.42;
        body.castShadow = true;
        g.add(body);
        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.34, 0.78),
          new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.18, metalness: 0.32 }),
        );
        cabin.position.set(-0.12, 0.74, 0);
        g.add(cabin);
        this.addWheels(g, 0.7, 0.42);
      }
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.02;
      g.add(sh);
      this.scene.add(g);
      this.cars.push(g);
    }
  }

  private ensurePeds(n: number) {
    while (this.peds.length < n) {
      const i = this.peds.length;
      const g = new THREE.Group();
      const skin = PED_SKINS[i % PED_SKINS.length]!;
      const tex = this.art.people[skin];
      if (tex) {
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.95, 1.62),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.18,
            side: THREE.DoubleSide,
            toneMapped: false,
            depthWrite: true,
          }),
        );
        card.position.y = 0.82;
        g.add(card);
      } else {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.18, 0.62, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x8a8074, roughness: 0.8 }),
        );
        body.position.y = 0.78;
        body.castShadow = true;
        g.add(body);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.7 }),
        );
        head.position.y = 1.28;
        g.add(head);
      }
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 10),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.015;
      g.add(sh);
      this.scene.add(g);
      this.peds.push(g);
    }
  }

  sync(f: WorldFrame) {
    this.clock = f.clock;
    const dt = Math.min(f.dt || this.lastDt, 0.05);
    this.lastDt = dt;
    const x = wx(f.px);
    const z = wz(f.py);
    this.player.position.set(x, 0, z);
    if (!this.benjiReady && (f.images.frontHi || f.images.front)) {
      this.benji.applyApprovedTextures(f.images);
      this.benjiReady = true;
    }
    const video = this.veliVideo;
    const listening = !!f.listening;
    const musicT = video && !video.paused ? video.currentTime : f.clock;
    this.benji.update(dt, f.heading, f.yaw, f.moveSpeed, f.lean, f.loco, f.animT, f.cameraView === "third" && !f.driving, f.air, f.vz, !!f.jooking, !!f.dribbling, !!f.ballCharging, !!f.releasing, listening, musicT, f.celebrate ?? 0, !!f.talking, !!f.interacting, !!f.rebounding);
    this.benji.setOutfit(f.equipped ?? "starter_tee");
    this.benji.setOutfitTint(f.outfitColor ?? null);
    this.player.visible = !f.driving;

    if (this.dropVan) {
      if (f.driving && f.vehicleKind === "van") {
        this.dropVan.position.set(x, CAR_RIDE, z);
        this.dropVan.rotation.y = f.yaw + Math.PI / 2;
        this.dropVan.visible = f.cameraView !== "first";
      } else {
        const poi = POIS.find((p) => p.id === "dropvan");
        if (poi) this.dropVan.position.set(wx(poi.x + poi.w / 2), CAR_RIDE, wz(poi.y + poi.h / 2));
        this.dropVan.rotation.y = 0;
        this.dropVan.visible = true;
      }
    }

    const hoopY = 2.72;
    const by = Math.max(0.12, f.ball.z * (hoopY / 86));
    const hoopin = f.mode === "basketball" || !!f.ball.active;
    if (hoopin && (f.ball.inFlight || !f.ball.held || f.ballCharging || f.cameraView === "third")) {
      this.ball.visible = !(f.ball.held && f.cameraView === "first" && !f.ballCharging);
      this.ball.position.set(wx(f.ball.x), by, wz(f.ball.y));
      this.ballShadow.visible = this.ball.visible;
      this.ballShadow.position.set(wx(f.ball.x), 0.08, wz(f.ball.y));
      (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - Math.min(by / 4, 0.8));
    } else {
      this.ball.visible = false;
      this.ballShadow.visible = false;
    }

    this.syncFishing(f, x, z);
    this.syncFoodTrucks(f);

    this.ensureCars(f.cars.length);
    for (let i = 0; i < this.cars.length; i++) {
      const c = f.cars[i];
      const g = this.cars[i]!;
      if (!c) {
        g.visible = false;
        continue;
      }
      g.visible = !(f.raceClear && c.laneId !== "RIVAL" && c.laneId !== "RACER");
      if (g.visible && inCourtPx(c.x, c.y)) g.visible = false;
      if (!g.visible) continue;
      g.position.set(wx(c.x), CAR_RIDE, wz(c.y));
      if (c.laneId === "RIVAL") {
        g.rotation.y = (c.yaw ?? 0) + Math.PI / 2;
        this.paintRaceCar(g, "rival");
      } else if (c.laneId === "RACER") {
        g.rotation.y = f.yaw + Math.PI / 2;
        this.paintRaceCar(g, "racer");
        if (f.cameraView === "first") g.visible = false;
      } else {
        if (g.userData.raceKind) {
          g.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;
            if (mat && "color" in mat) mat.color.setHex(0xffffff);
          });
          if (g.userData.tag) {
            g.remove(g.userData.tag);
            g.userData.tag = null;
          }
          g.userData.raceKind = null;
        }
        g.rotation.y = Math.abs(c.vy) > Math.abs(c.vx) ? (c.vy > 0 ? 0 : Math.PI) : c.vx < 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    this.ensurePeds(f.peds.length);
    for (let i = f.peds.length; i < this.peds.length; i++) this.peds[i]!.visible = false;
    for (let i = 0; i < this.peds.length; i++) {
      const p = f.peds[i];
      const g = this.peds[i]!;
      if (!p) {
        g.visible = false;
        continue;
      }
      g.visible = !p.inside;
      g.position.set(wx(p.x), 0, wz(p.y));
      const bob = Math.sin(f.clock * 2.4 + p.t) * 0.02;
      const card = g.children[0];
      if (card) card.position.y = 0.82 + bob;
    }

    const seenNpcs = new Set(f.npcs.map((n) => n.id));
    for (const [id, sprite] of this.npcSprites) {
      if (!seenNpcs.has(id)) sprite.visible = false;
    }
    for (const n of f.npcs) {
      let s = this.npcSprites.get(n.id);
      if (!s) {
        const key = NPC_SPRITE[n.id] ?? "local";
        const tex = this.art.people[key] ?? (n.isK ? this.art.people["k-blanco"] : undefined);
        const mat = n.isK
          ? cutoutSpriteMaterial(tex ?? null)
          : new THREE.SpriteMaterial({
              map: tex,
              color: 0xffffff,
              transparent: true,
              alphaTest: tex ? 0.18 : 0,
            });
        if (!tex && n.isK && f.images.k) {
          const t = new THREE.Texture(f.images.k);
          t.needsUpdate = true;
          t.colorSpace = THREE.SRGBColorSpace;
          mat.map = t;
        }
        s = new THREE.Sprite(mat);
        if (n.isK) s.scale.set(1.22, 2.52, 1);
        else s.scale.set(tex ? 1.12 : 1.05, tex ? 1.9 : 1.65, 1);
        s.position.y = n.isK ? 1.26 : 0.95;
        this.scene.add(s);
        this.npcSprites.set(n.id, s);
      }
      s.visible = true;
      s.position.set(wx(n.x), n.isK ? 1.26 : 0.95, wz(n.y));
    }

    const fwdX = -Math.sin(f.yaw);
    const fwdZ = -Math.cos(f.yaw);
    const shake = f.trauma * f.trauma;
    const sx = Math.sin(f.clock * 47) * shake * 0.12;
    const sy = Math.cos(f.clock * 39) * shake * 0.08;
    const air = f.air ?? 0;
    const step = Math.sin(f.animT) * (f.loco === "run" ? 0.028 : f.loco === "walk" ? 0.014 : 0);
    const lookAhead = Math.min(f.moveSpeed / 268, 1);
    const follow = (f.driving ? 11.5 : f.indoor ? 3.45 : f.loco === "run" ? 6.15 : 5.45);
    const height = (f.indoor ? 1.48 : f.driving ? 5.4 : 2.38) + air * 0.35;
    const k = f.indoor ? 11 : f.driving ? 4.6 : f.loco === "run" ? 5.4 : 7.6;
    const ease = 1 - Math.exp(-k * dt);
    const targetFov = f.cameraView === "first"
      ? (f.driving ? 74 : f.mode === "basketball" ? 74 : 70)
      : f.driving
        ? 68
        : f.loco === "run" ? 66.5 : f.indoor ? 58 : 62;
    this.camFov += (targetFov - this.camFov) * (1 - Math.exp(-4.2 * dt));
    this.camFov += (f.punch ?? 0) * 3.4;

    const pulse = f.hoopPulse ?? 0;
    const jig = pulse * pulse;
    this.hoopRim.position.set(
      this.hoopRimHome.x + Math.sin(f.clock * 68) * jig * 0.055,
      this.hoopRimHome.y + Math.cos(f.clock * 81) * jig * 0.04,
      this.hoopRimHome.z + Math.sin(f.clock * 54) * jig * 0.03,
    );
    this.hoopRim.scale.setScalar(1 + pulse * 0.035);
    if (this.hoopNet) {
      this.hoopNet.position.set(
        this.hoopNetHome.x + Math.sin(f.clock * 62) * jig * 0.04,
        this.hoopNetHome.y - pulse * 0.05,
        this.hoopNetHome.z,
      );
      this.hoopNet.scale.set(1 + pulse * 0.03, 1 + pulse * 0.12, 1 + pulse * 0.03);
    }

    if (f.cameraView === "first") {
      const beatT = this.veliVideo && !this.veliVideo.paused ? this.veliVideo.currentTime : f.clock;
      const listenNod = f.listening
        ? Math.pow(Math.max(0, Math.sin(beatT * 9.95)), 2.4) * 0.055
        : 0;
      this.camPos.set(x + sx, 1.68 + f.bob * 0.012 + step + air - listenNod, z + sy);
      this.camera.position.copy(this.camPos);
      const ly = Math.sin(f.pitch);
      const lh = Math.cos(f.pitch);
      this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8 + air - listenNod * 1.4, z + fwdZ * lh * 8);
    } else {
      const desired = this.tmp.set(
        x - fwdX * follow + fwdX * lookAhead * 0.55 + sx,
        height,
        z - fwdZ * follow + fwdZ * lookAhead * 0.55 + sy,
      );
      this.camPos.x += (desired.x - this.camPos.x) * ease;
      this.camPos.y += (desired.y - this.camPos.y) * ease;
      this.camPos.z += (desired.z - this.camPos.z) * ease;
      this.camera.position.copy(this.camPos);
      this.camLook.set(x, 1.22 + step + air * 0.55, z);
      this.camera.lookAt(this.camLook);
    }
    this.camera.fov = this.camFov;
    this.sun.target.position.set(x, 0, z);
  }

  private ensureFishingRig() {
    if (this.fishingRig) return this.fishingRig;
    const root = new THREE.Group();
    root.name = "benji-fishing-rig";
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.7, metalness: 0.15 }),
    );
    handle.position.y = 0.1;
    const blank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.028, 1.55, 7),
      new THREE.MeshStandardMaterial({ color: 0x6b3a18, roughness: 0.55 }),
    );
    blank.position.y = 0.95;
    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.4 }),
    );
    wrap.position.y = 0.22;
    const reel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.35, metalness: 0.5 }),
    );
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0.06, 0.18, 0);
    root.add(handle, blank, wrap, reel);
    this.scene.add(root);
    this.fishingRig = root;

    const bobMat = new THREE.MeshStandardMaterial({ color: 0xe85d4c, roughness: 0.4, emissive: 0x6a1810, emissiveIntensity: 0.45 });
    const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bobMat);
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf4e27c, roughness: 0.35 }));
    stripe.position.y = 0.05;
    bobber.add(stripe);
    this.scene.add(bobber);
    this.bobber = bobber;

    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 1)]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xd9e4ea, transparent: true, opacity: 0.85 }));
    this.scene.add(line);
    root.userData.line = line;

    const fish = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x5aa0c8, roughness: 0.45, metalness: 0.2 }),
    );
    body.scale.set(1.6, 0.7, 0.55);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.18, 5),
      new THREE.MeshStandardMaterial({ color: 0x3d7ea3, roughness: 0.5 }),
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.28;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x0d0b0a }));
    eye.position.set(0.18, 0.04, 0.08);
    fish.add(body, tail, eye);
    fish.visible = false;
    this.scene.add(fish);
    root.userData.fish = fish;
    return root;
  }

  private syncFishing(f: WorldFrame, px: number, pz: number) {
    const data = f.fishing;
    if (!data?.active) {
      if (this.fishingRig) this.fishingRig.visible = false;
      if (this.bobber) this.bobber.visible = false;
      const extra = this.fishingRig?.userData;
      if (extra?.line) extra.line.visible = false;
      if (extra?.fish) extra.fish.visible = false;
      return;
    }
    const rig = this.ensureFishingRig();
    rig.visible = true;
    const power = data.power ?? 0;
    const phase = data.phase;
    const progress = Math.max(0, Math.min(1, data.progress ?? 0));
    const showingFish = phase === "reel" || phase === "catch";
    const reeled = phase === "catch" ? 1 : phase === "reel" ? 0.28 + progress * 0.62 : 0;
    const castPull = phase === "cast" ? -0.85 - power * 0.9 : showingFish ? -0.22 - reeled * 0.18 : -0.22;
    const side = Math.cos(f.yaw) * 0.42;
    const fwd = -Math.sin(f.yaw) * 0.2;
    rig.position.set(px + side, 1.12, pz + fwd);
    rig.rotation.set(castPull, f.yaw + 0.35, 0.12);
    rig.updateMatrixWorld(true);
    const tip = new THREE.Vector3(0, 1.72, 0).applyMatrix4(rig.matrixWorld);
    const inWater = phase !== "cast" && phase !== "idle";
    const dip = data.nibble ? Math.abs(Math.sin(f.clock * 16)) * 0.14 : Math.sin(f.clock * 2.4) * 0.03;
    const water = new THREE.Vector3(wx(data.bobX), 0.16 - dip, wz(data.bobY));
    const hang = new THREE.Vector3(tip.x + 0.08, tip.y - 0.42, tip.z + 0.04);
    const hookedAt = water.clone().lerp(hang, reeled);
    if (this.bobber) {
      this.bobber.visible = inWater && phase !== "catch";
      this.bobber.position.copy(phase === "reel" ? hookedAt : water);
    }
    const line = rig.userData.line as THREE.Line | undefined;
    if (line) {
      line.visible = true;
      const geo = line.geometry as THREE.BufferGeometry;
      const end = !inWater
        ? tip.clone().add(new THREE.Vector3(0, -0.15, 0.1))
        : showingFish
          ? hookedAt
          : water;
      geo.setFromPoints([tip, end]);
    }
    const hooked = rig.userData.fish as THREE.Group | undefined;
    if (hooked) {
      hooked.visible = showingFish;
      if (showingFish) {
        const colors: Record<string, number> = {
          bluegill: 0x6db36d,
          crappie: 0xcfc8bf,
          catfish: 0x6b5c4a,
          bass: 0x3d7a3a,
          gar: 0xb7c45a,
          sackfish: 0x1db954,
        };
        const mat = (hooked.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
        if (mat) mat.color.setHex(colors[data.fishId ?? "bass"] ?? 0x5aa0c8);
        hooked.position.copy(hookedAt);
        hooked.position.y -= 0.1;
        if (phase === "catch") {
          hooked.rotation.set(0.35, f.clock * 2.4, -0.9 + Math.sin(f.clock * 7) * 0.15);
        } else {
          hooked.rotation.set(Math.sin(f.clock * 8) * 0.4, f.clock * 5, Math.sin(f.clock * 11) * 0.5);
        }
      }
    }
  }

  private paintRaceCar(g: THREE.Group, kind: "rival" | "racer") {
    if (g.userData.raceKind === kind) return;
    g.userData.raceKind = kind;
    const tint = kind === "rival" ? 0xffd56a : 0x39ff14;
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;
      if (!mat || !("color" in mat)) return;
      mat.color.setHex(tint);
    });
    if (kind !== "rival" || g.userData.tag) return;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#c9a84c";
    ctx.strokeStyle = "#0d0b0a";
    ctx.lineWidth = 8;
    ctx.strokeText("CAM", 128, 32);
    ctx.fillText("CAM", 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.position.set(0, 2.15, 0);
    sprite.scale.set(2.4, 0.6, 1);
    g.add(sprite);
    g.userData.tag = sprite;
  }

  render(w: number, h: number) {
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
    if (this.veliVideo) {
      this.veliVideo.pause();
      this.veliVideo.removeAttribute("src");
      this.veliVideo.load();
      this.veliVideo.remove();
      this.veliVideo = null;
    }
    disposeRenderer(this.renderer);
    this.overlay.remove();
  }
}
