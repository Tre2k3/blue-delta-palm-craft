import * as THREE from "three";
import { roadRects, sidewalkRects } from "./worldTopology";
import { POIS, STREETS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";
import { loadAllMaterials, setAnisotropy, std, type MatKey } from "./materials";

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
  cars: { x: number; y: number; vx: number; vy: number; w: number; color: string }[];
  peds: { x: number; y: number; color: string; t: number }[];
  npcs: { id: string; x: number; y: number; isK: boolean }[];
  images: Record<string, HTMLImageElement>;
  objective: { x: number; y: number; label: string } | null;
  worldHour: number;
  vehicle: { x: number; y: number; yaw: number; active: boolean; speed: number };
};

type TexPack = Partial<Record<MatKey, THREE.Texture>>;

export class World3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, 1, 0.12, 420);
  player: THREE.Group;
  sprite: THREE.Sprite;
  ball: THREE.Mesh;
  ballShadow: THREE.Mesh;
  hoopRim: THREE.Mesh;
  cars: THREE.Group[] = [];
  peds: THREE.Group[] = [];
  npcSprites = new Map<string, THREE.Sprite>();
  sun: THREE.DirectionalLight;
  overlay: HTMLCanvasElement;
  mats: TexPack = {};
  private spriteMats: Partial<Record<string, THREE.SpriteMaterial>> = {};
  private clock = 0;
  private lastClock = 0;
  private cameraReady = false;
  private quality: "low" | "high" = "high";
  private hemi: THREE.HemisphereLight;
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private sunDisk!: THREE.Mesh;
  private glow!: THREE.Mesh;
  private van: THREE.Group | null = null;
  private marker = new THREE.Group();
  private solidMeshes: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private rayStart = new THREE.Vector3();
  private rayDirection = new THREE.Vector3();
  private disposed = false;
  private tmp = new THREE.Vector3();
  private camPos = new THREE.Vector3();

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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    this.overlay = document.createElement("canvas");
    this.overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
    canvas.parentElement?.appendChild(this.overlay);

    this.scene.fog = new THREE.Fog(0x3a2a22, 22, 145);
    this.scene.background = makeSkyTex();

    this.hemi = new THREE.HemisphereLight(0xffe6bf, 0x354434, 1.3);
    this.scene.add(this.hemi);
    this.scene.add(new THREE.AmbientLight(0x9aafa0, 0.55));

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
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xffffff, transparent: true }),
    );
    this.sprite.scale.set(1.15, 1.85, 1);
    this.sprite.position.y = 0.95;
    this.player.add(this.sprite);
    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.02;
    this.player.add(contact);
    this.scene.add(this.player);

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xc46a32, roughness: 0.55, metalness: 0.05 }),
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);

    this.hoopRim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 10, 24));
    this.camera.position.set(10, 8, 18);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x44ed85, toneMapped: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    this.marker.add(ring);
    const pin = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, toneMapped: false }),
    );
    pin.position.y = 2.8;
    this.marker.add(pin);
    this.scene.add(this.marker);
  }

  async loadTextures(onProgress?: (d: number, t: number) => void) {
    try {
      this.mats = await loadAllMaterials(onProgress);
    } catch {
      this.mats = {};
    }
  }

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 24, 16),
      new THREE.MeshBasicMaterial({
        map: makeSkyTex(),
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    sky.position.set(wx(WORLD_PX_W) / 2, 0, wz(WORLD_PX_H) / 2);
    this.sky = sky;
    this.scene.add(sky);
    const sunDisk = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: false, toneMapped: false }),
    );
    sunDisk.position.set(-78, 22, -86);
    this.sunDisk = sunDisk;
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
    this.glow = glow;
    this.scene.add(glow);
  }

  private t(key: MatKey) {
    return this.mats[key];
  }

  buildCity(
    walls: { x: number; y: number; w: number; h: number }[],
    trees: { x: number; y: number }[],
  ) {
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
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(bw, stories, bd),
        hash(wall.x) > 0.45 ? stuccoMat : wallMat,
      );
      body.position.y = stories / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      this.solidMeshes.push(body);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.92, stories * 0.78), facadeMat);
      face.position.set(0, stories * 0.52, bd / 2 + 0.03);
      g.add(face);
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
        this.van = this.makeVan(wx(poi.x + poi.w / 2), wz(poi.y + poi.h / 2));
        this.scene.add(this.van);
        continue;
      }
      const h = poi.id === "store" ? 6.6 : poi.id === "beale" ? 5.4 : 4.6 + hash(poi.x) * 3;
      const g = new THREE.Group();
      const bodyMat =
        poi.id === "store" || poi.id === "beale"
          ? hqMat
          : poi.id === "culture"
            ? woodMat
            : cinderMat;
      const body = new THREE.Mesh(new THREE.BoxGeometry(wx(poi.w), h, wz(poi.h)), bodyMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      this.solidMeshes.push(body);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(wx(poi.w) * 0.72, 1.8), storefrontMat);
      glass.position.set(0, 1.4, wz(poi.h) / 2 + 0.05);
      g.add(glass);
      const sign = this.makeSign(
        poi.id === "store" ? "$ackReligious · KLOTHING" : poi.name,
        Math.min(wx(poi.w) * 0.9, 13),
        poi.id === "store",
      );
      sign.position.set(0, h * 0.7, wz(poi.h) / 2 + 0.08);
      g.add(sign);
      const awning = new THREE.Mesh(new THREE.BoxGeometry(wx(poi.w) * 0.95, 0.1, 0.72), fabricMat);
      awning.position.set(0, 2.2, wz(poi.h) / 2 + 0.28);
      g.add(awning);
      g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
      this.scene.add(g);
    }

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
          new THREE.MeshStandardMaterial({
            color: 0xf2c66a,
            emissive: 0xffb347,
            emissiveIntensity: 1.5,
          }),
        );
        lamp.position.y = 3.35;
        g.add(lamp);
        if ((i + yt) % 21 === 3) {
          const light = new THREE.PointLight(0xffb347, 2.0, 14, 2);
          light.position.y = 3.3;
          g.add(light);
        }
        g.position.set(wx(i * TILE + 12), 0, wz(yt * TILE + TILE * 1.18));
        this.scene.add(g);
      }
    }

    this.buildCourt();
  }

  private makeSign(text: string, width: number, brand = false) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#101c17";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.strokeStyle = brand ? "#1db954" : "#d4af37";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 1018, 122);
    ctx.fillStyle = "#efe8de";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 67, 960);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, width / 8),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
  }
  private buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(wx(WORLD_PX_W) + 20, wz(WORLD_PX_H) + 20),
      new THREE.MeshStandardMaterial({ color: 0x474d3b, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(wx(WORLD_PX_W) / 2, -0.04, wz(WORLD_PX_H) / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    const roadMaterial = std(this.t("asphalt"), { roughness: 0.94, repeat: [18, 2] });
    const walkMaterial = std(this.t("sidewalk"), { roughness: 0.9, repeat: [18, 1] });
    for (const [rects, material, height] of [
      [roadRects(), roadMaterial, 0.02],
      [sidewalkRects(), walkMaterial, 0.08],
    ] as const) {
      for (const r of rects) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(wx(r.w), height, wz(r.h)), material);
        mesh.position.set(wx(r.x + r.w / 2), height / 2, wz(r.y + r.h / 2));
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }
    const matrix = new THREE.Matrix4(),
      dashes: { x: number; z: number; angle: number }[] = [];
    for (const street of STREETS) {
      const length = street.axis === "y" ? WORLD_PX_W : WORLD_PX_H;
      for (let p = 60; p < length; p += 88) {
        if (
          STREETS.some(
            (cross) => cross.axis !== street.axis && Math.abs(cross.tile * TILE - p) < 65,
          )
        )
          continue;
        dashes.push({
          x: wx(street.axis === "y" ? p : street.tile * TILE),
          z: wz(street.axis === "y" ? street.tile * TILE : p),
          angle: street.axis === "y" ? 0 : Math.PI / 2,
        });
      }
    }
    const marks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.3, 0.02, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xc7aa69, roughness: 0.9 }),
      dashes.length,
    );
    dashes.forEach((d, i) => {
      matrix.makeRotationY(d.angle);
      matrix.setPosition(d.x, 0.04, d.z);
      marks.setMatrixAt(i, matrix);
    });
    this.scene.add(marks);
    const river = POIS.find((p) => p.id === "river")!;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(wx(river.w), wz(river.h)),
      new THREE.MeshStandardMaterial({ color: 0x314f57, metalness: 0.55, roughness: 0.25 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(wx(river.x + river.w / 2), 0.01, wz(river.y + river.h / 2));
    this.scene.add(water);
  }

  private makeVan(x: number, z: number) {
    const g = new THREE.Group();
    const metal = std(this.t("carMetal"), { roughness: 0.38, metalness: 0.62, color: 0x1a1816 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.7, 1.7), metal);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.85, 1.62),
      new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.2, metalness: 0.35 }),
    );
    cab.position.set(1.15, 1.45, 0);
    g.add(cab);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.12, 0.22, 1.72),
      new THREE.MeshStandardMaterial({
        color: 0x1db954,
        emissive: 0x1db954,
        emissiveIntensity: 0.35,
      }),
    );
    stripe.position.y = 1.35;
    g.add(stripe);
    this.addWheels(g, 1.15, 0.62);
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0xfff1c8,
        emissive: 0xffe08a,
        emissiveIntensity: 0.9,
      }),
    );
    hl.position.set(1.58, 0.95, 0.48);
    g.add(hl);
    const hl2 = hl.clone();
    hl2.position.z = -0.48;
    g.add(hl2);
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
      w.rotation.x = Math.PI / 2;
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
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(cw, 0.1, cd),
      std(this.t("court"), { roughness: 0.76, repeat: [3, 2.4] }),
    );
    floor.position.set(cx, 0.06, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const lines = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.04, 3.5),
      std(this.t("courtLines"), { roughness: 0.72, repeat: [1, 1] }),
    );
    lines.position.set(cx, 0.13, wz(court.y) + 2.2);
    this.scene.add(lines);

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
    const square = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.42, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xe85d4c }),
    );
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
      new THREE.MeshBasicMaterial({
        color: 0xe8e2d6,
        transparent: true,
        opacity: 0.55,
        wireframe: true,
      }),
    );
    net.position.set(cx, 2.48, hoopZ);
    this.scene.add(net);
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
    if (this.cars.length >= n) return;
    const metal = std(this.t("carMetal"), { roughness: 0.36, metalness: 0.58 });
    while (this.cars.length < n) {
      const g = new THREE.Group();
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
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.1, 0.16),
        new THREE.MeshStandardMaterial({
          color: 0xfff1c8,
          emissive: 0xffe08a,
          emissiveIntensity: 0.8,
        }),
      );
      hl.position.set(0.94, 0.42, 0.28);
      g.add(hl);
      const hl2 = hl.clone();
      hl2.position.z = -0.28;
      g.add(hl2);
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.08, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xff3b30,
          emissive: 0xff2a1a,
          emissiveIntensity: 0.55,
        }),
      );
      tl.position.set(-0.94, 0.42, 0.28);
      g.add(tl);
      const tl2 = tl.clone();
      tl2.position.z = -0.28;
      g.add(tl2);
      const sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 12),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
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
      const g = new THREE.Group();
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
      this.scene.add(g);
      this.peds.push(g);
    }
  }

  sync(f: WorldFrame) {
    const dt = Math.min(0.1, Math.max(0, f.clock - this.lastClock));
    this.lastClock = f.clock;
    this.clock = f.clock;
    const daylight = Math.max(0, Math.sin(((f.worldHour - 6) / 24) * Math.PI * 2));
    this.hemi.intensity = 0.85 + daylight * 1.1;
    this.sun.intensity = 0.12 + daylight * 1.7;
    this.sky.material.color.setRGB(
      0.2 + daylight * 0.8,
      0.26 + daylight * 0.74,
      0.44 + daylight * 0.56,
    );
    this.sunDisk.visible = this.glow.visible = daylight > 0.04;
    if (this.scene.fog instanceof THREE.Fog)
      this.scene.fog.color.setRGB(
        0.08 + daylight * 0.15,
        0.09 + daylight * 0.12,
        0.14 + daylight * 0.03,
      );
    if (this.van) {
      this.van.position.set(wx(f.vehicle.x), 0, wz(f.vehicle.y));
      this.van.rotation.y = f.vehicle.yaw + Math.PI / 2;
    }
    this.marker.visible = !!f.objective && f.mode === "world";
    if (f.objective) {
      this.marker.position.set(wx(f.objective.x), 0, wz(f.objective.y));
      this.marker.children[1]!.position.y = 2.8 + Math.sin(f.clock * 3) * 0.18;
      this.marker.children[1]!.rotation.y = f.clock;
    }

    const x = wx(f.px);
    const z = wz(f.py);
    this.player.position.set(x, 0, z);

    // Billboard frames must face the camera-relative movement direction.
    const direction = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[f.facing]!;
    const forward = direction[0]! * -Math.sin(f.yaw) + direction[1]! * -Math.cos(f.yaw);
    const right = direction[0]! * Math.cos(f.yaw) + direction[1]! * -Math.sin(f.yaw);
    const key = !f.moving
      ? "back"
      : Math.abs(forward) >= Math.abs(right)
        ? forward > 0
          ? "back"
          : "front"
        : right > 0
          ? "right"
          : "left";
    const img = f.images[key] ?? f.images.front;
    if (img) this.sprite.material = this.matFor(img, key);
    this.sprite.visible = f.cameraView === "third" && !f.vehicle.active;
    this.sprite.position.y = 0.95 + f.bob * 0.02;

    const hoopY = 2.72;
    const by = Math.max(0.12, f.ball.z * (hoopY / 86));
    if (f.mode === "basketball" && (f.ball.inFlight || !f.ball.held || f.cameraView === "third")) {
      this.ball.visible = !(f.ball.held && f.cameraView === "first");
      this.ball.position.set(wx(f.ball.x), by, wz(f.ball.y));
      this.ballShadow.visible = this.ball.visible;
      this.ballShadow.position.set(wx(f.ball.x), 0.08, wz(f.ball.y));
      (this.ballShadow.material as THREE.MeshBasicMaterial).opacity =
        0.32 * (1 - Math.min(by / 4, 0.8));
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
      g.rotation.y = Math.atan2(-c.vy, c.vx);
      const body = g.children[0] as THREE.Mesh;
      (body.material as THREE.MeshStandardMaterial).color.set(c.color);
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
      const body = g.children[0] as THREE.Mesh;
      (body.material as THREE.MeshStandardMaterial).color.set(p.color);
    }

    for (const n of f.npcs) {
      let s = this.npcSprites.get(n.id);
      if (!s) {
        const mat = new THREE.SpriteMaterial({
          color: 0xffffff,
          transparent: true,
          depthWrite: false,
        });
        if (f.images.k || f.images.front) {
          const tex = new THREE.Texture(n.isK ? f.images.k : f.images.front);
          tex.needsUpdate = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
        }
        s = new THREE.Sprite(mat);
        s.scale.set(n.isK ? 1.2 : 1.05, n.isK ? 1.85 : 1.65, 1);
        this.scene.add(s);
        this.npcSprites.set(n.id, s);
      }
      s.position.set(wx(n.x), 0.92, wz(n.y));
    }

    const fwdX = -Math.sin(f.yaw);
    const fwdZ = -Math.cos(f.yaw);
    const shake = f.trauma * f.trauma;
    const sx = Math.sin(f.clock * 47) * shake * 0.12;
    const sy = Math.cos(f.clock * 39) * shake * 0.08;

    if (f.cameraView === "first" && !f.vehicle.active) {
      this.camera.position.set(x + sx, 1.68 + f.bob * 0.012, z + sy);
      const ly = Math.sin(f.pitch);
      const lh = Math.cos(f.pitch);
      this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8, z + fwdZ * lh * 8);
      this.camera.fov = f.mode === "basketball" ? 74 : 70;
    } else {
      const distance = f.vehicle.active ? 7.8 : 5.6;
      this.camPos.set(
        x - fwdX * distance + sx,
        (f.vehicle.active ? 3.8 : 2.8) + Math.sin(f.pitch) * 2,
        z - fwdZ * distance + sy,
      );
      this.rayStart.set(x, 1.35, z);
      this.rayDirection.copy(this.camPos).sub(this.rayStart);
      this.ray.far = this.rayDirection.length();
      this.ray.set(this.rayStart, this.rayDirection.normalize());
      const hit = this.ray.intersectObjects(this.solidMeshes, false)[0];
      if (hit)
        this.camPos
          .copy(this.rayStart)
          .addScaledVector(this.rayDirection, Math.max(0.55, hit.distance - 0.3));
      if (!this.cameraReady || this.camera.position.distanceTo(this.camPos) > 25)
        this.camera.position.copy(this.camPos);
      else this.camera.position.lerp(this.camPos, 1 - Math.exp(-12 * dt));
      this.camera.lookAt(x, 1.28, z);
      this.camera.fov = 62;
    }
    this.cameraReady = true;
    this.sun.position.set(x - 52, 34, z - 18);
    this.sun.target.position.set(x, 0, z);
  }

  setQuality(quality: "low" | "high") {
    this.quality = quality;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, quality === "low" ? 1 : 1.75),
    );
    this.renderer.shadowMap.enabled = quality === "high";
  }
  render(w: number, h: number) {
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === "low" ? 1 : 1.75);
    if (
      this.renderer.domElement.width !== Math.floor(w * dpr) ||
      this.renderer.domElement.height !== Math.floor(h * dpr)
    ) {
      this.renderer.setSize(w, h, false);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        if (o instanceof THREE.Mesh) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
      }
    });
    Object.values(this.spriteMats).forEach((m) => {
      if (m) materials.add(m);
    });
    for (const m of materials)
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
    if (this.scene.background instanceof THREE.Texture) textures.add(this.scene.background);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.overlay.remove();
  }
}
