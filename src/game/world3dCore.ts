import * as THREE from "three";
import { POIS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { loadAllMaterials, setAnisotropy, std, type MatKey } from "./materials";
import { PlayerCharacter } from "./playerCharacter";
import type { LocomotionState } from "./characterController";
import { CAR_SKINS, facadeFor, loadCityArt, NPC_SPRITE, PED_SKINS, type CityArt } from "./cityArt";
import { decorateBuildings, getSignMaterial, type BuildingRef } from "./city/signage";

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
  ball: { x: number; y: number; z: number; held: boolean; inFlight: boolean };
  cars: { x: number; y: number; vx: number; vy: number; w: number; color: string; skin?: number }[];
  peds: { x: number; y: number; color: string; t: number; skin?: number }[];
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
  air: number;
  vz: number;
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
  cars: THREE.Group[] = [];
  peds: THREE.Group[] = [];
  npcSprites = new Map<string, THREE.Sprite>();
  sun: THREE.DirectionalLight;
  overlay: HTMLCanvasElement;
  mats: TexPack = {};
  private spriteMats: Partial<Record<string, THREE.SpriteMaterial>> = {};
  private art: CityArt = { people: {}, cars: {}, facades: {} };
  private signMat: THREE.MeshStandardMaterial | null = null;
  private clock = 0;
  private tmp = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camFov = 62;
  private lastDt = 1 / 60;
  private benjiReady = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
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
        const pyr = new THREE.Mesh(
          new THREE.ConeGeometry(wx(poi.w) * 0.62, 14, 4),
          std(this.t("concrete"), { roughness: 0.7, metalness: 0.08, repeat: [2, 2] }),
        );
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
      const g = new THREE.Group();
      const bodyMat = poi.id === "store" || poi.id === "beale" ? hqMat : poi.id === "culture" ? woodMat : cinderMat;
      const bw = wx(poi.w);
      const bd = wz(poi.h);
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
      g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
      this.scene.add(g);
      buildings.push({ id: poi.id, group: g, width: bw, depth: bd, height: h, tall: h > 6 });
    }
    if (this.signMat) void decorateBuildings(buildings);

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
    this.scene.add(this.hoopRim);
    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.14, 0.42, 10, 3, true),
      new THREE.MeshBasicMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.55, wireframe: true }),
    );
    net.position.set(cx, 2.48, hoopZ);
    this.scene.add(net);
    this.hoopNet = net;
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
    this.benji.update(dt, f.heading, f.yaw, f.moveSpeed, f.lean, f.loco, f.animT, f.cameraView === "third", f.air, f.vz);

    const hoopY = 2.72;
    const by = Math.max(0.12, f.ball.z * (hoopY / 86));
    if (f.mode === "basketball" && (f.ball.inFlight || !f.ball.held || f.cameraView === "third")) {
      this.ball.visible = !(f.ball.held && f.cameraView === "first");
      this.ball.position.set(wx(f.ball.x), by, wz(f.ball.y));
      this.ballShadow.visible = this.ball.visible;
      this.ballShadow.position.set(wx(f.ball.x), 0.08, wz(f.ball.y));
      (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - Math.min(by / 4, 0.8));
    } else {
      this.ball.visible = false;
      this.ballShadow.visible = false;
    }

    this.ensureCars(f.cars.length);
    for (let i = 0; i < this.cars.length; i++) {
      const c = f.cars[i];
      const g = this.cars[i]!;
      if (!c) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      g.position.set(wx(c.x), 0, wz(c.y));
      g.rotation.y = Math.abs(c.vy) > Math.abs(c.vx) ? (c.vy > 0 ? 0 : Math.PI) : c.vx < 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    this.ensurePeds(f.peds.length);
    for (let i = 0; i < this.peds.length; i++) {
      const p = f.peds[i];
      const g = this.peds[i]!;
      if (!p) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      g.position.set(wx(p.x), 0, wz(p.y));
      g.rotation.y = f.yaw;
      const bob = Math.sin(f.clock * 2.4 + p.t) * 0.02;
      const card = g.children[0];
      if (card) card.position.y = 0.82 + bob;
    }

    for (const n of f.npcs) {
      let s = this.npcSprites.get(n.id);
      if (!s) {
        const key = NPC_SPRITE[n.id] ?? "local";
        const tex = this.art.people[key] ?? (n.isK ? this.art.people["k-blanco"] : undefined);
        const mat = new THREE.SpriteMaterial({
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
        s.scale.set(tex ? 1.12 : 1.05, tex ? 1.9 : 1.65, 1);
        this.scene.add(s);
        this.npcSprites.set(n.id, s);
      }
      s.position.set(wx(n.x), 0.95, wz(n.y));
    }

    const fwdX = -Math.sin(f.yaw);
    const fwdZ = -Math.cos(f.yaw);
    const shake = f.trauma * f.trauma;
    const sx = Math.sin(f.clock * 47) * shake * 0.12;
    const sy = Math.cos(f.clock * 39) * shake * 0.08;
    const air = f.air ?? 0;
    const step = Math.sin(f.animT) * (f.loco === "run" ? 0.028 : f.loco === "walk" ? 0.014 : 0);
    const lookAhead = Math.min(f.moveSpeed / 268, 1);
    const follow = f.loco === "run" ? 6.15 : 5.45;
    const height = (f.indoor ? 1.85 : 2.38) + air * 0.35;
    const k = f.indoor ? 11 : f.loco === "run" ? 5.4 : 7.6;
    const ease = 1 - Math.exp(-k * dt);
    const targetFov = f.cameraView === "first" ? (f.mode === "basketball" ? 74 : 70) : f.loco === "run" ? 66.5 : f.indoor ? 58 : 62;
    this.camFov += (targetFov - this.camFov) * (1 - Math.exp(-4.2 * dt));
    this.camFov += (f.punch ?? 0) * 3.4;

    const rimScale = 1 + (f.hoopPulse ?? 0) * 0.28;
    this.hoopRim.scale.set(rimScale, rimScale, rimScale);
    if (this.hoopNet) {
      const netS = 1 + f.hoopPulse * 0.18;
      this.hoopNet.scale.set(netS, 1 + f.hoopPulse * 0.35, netS);
    }

    if (f.cameraView === "first") {
      this.camPos.set(x + sx, 1.68 + f.bob * 0.012 + step + air, z + sy);
      this.camera.position.copy(this.camPos);
      const ly = Math.sin(f.pitch);
      const lh = Math.cos(f.pitch);
      this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8 + air, z + fwdZ * lh * 8);
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
    this.renderer.dispose();
    this.overlay.remove();
  }
}
