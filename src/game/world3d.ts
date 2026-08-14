import * as THREE from "three";
import { PAL, POIS, TILE, WORLD_PX_H, WORLD_PX_W } from "./data";

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

function makeNoiseTex(w: number, h: number, c0: string, c1: string, grain = 28) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = c0;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.35; i++) {
    const x = (i * 73) % w;
    const y = (i * 41 + (i * 17) % 9) % h;
    g.fillStyle = i % 3 === 0 ? c1 : "rgba(0,0,0,0.08)";
    g.fillRect(x, y, 1 + (i % 2), 1);
  }
  g.fillStyle = `rgba(0,0,0,${grain / 255})`;
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyTex() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#1a1520");
  grd.addColorStop(0.35, "#3a2a28");
  grd.addColorStop(0.62, "#c47848");
  grd.addColorStop(0.78, "#f2c66a");
  grd.addColorStop(1, "#1a1612");
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWindowTex() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2b2724";
  g.fillRect(0, 0, 64, 64);
  for (let y = 6; y < 60; y += 14) {
    for (let x = 6; x < 60; x += 12) {
      const lit = ((x * 3 + y * 7) % 10) > 3;
      g.fillStyle = lit ? `rgba(242,198,106,${0.35 + ((x + y) % 5) * 0.1})` : "#1a1715";
      g.fillRect(x, y, 7, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
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
};

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
  private spriteMats: Partial<Record<string, THREE.SpriteMaterial>> = {};
  private clock = 0;
  private tmp = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x1a1612, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.overlay = document.createElement("canvas");
    this.overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
    canvas.parentElement?.appendChild(this.overlay);

    this.scene.fog = new THREE.Fog(0x2a221c, 28, 160);
    this.scene.background = makeSkyTex();

    const hemi = new THREE.HemisphereLight(0xffc878, 0x2a241c, 0.72);
    this.scene.add(hemi);
    const amb = new THREE.AmbientLight(0x3a3228, 0.38);
    this.scene.add(amb);

    this.sun = new THREE.DirectionalLight(0xffd4a0, 1.15);
    this.sun.position.set(-38, 46, -22);
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
    this.buildGround();

    this.player = new THREE.Group();
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true }));
    this.sprite.scale.set(1.15, 1.85, 1);
    this.sprite.position.y = 0.95;
    this.player.add(this.sprite);
    this.scene.add(this.player);

    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xc46a32,
      roughness: 0.55,
      metalness: 0.05,
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), ballMat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);

    this.hoopRim = this.buildCourt();
    this.camera.position.set(10, 8, 18);
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
    sunDisk.position.set(-70, 28, -90);
    this.scene.add(sunDisk);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff9a4a,
        transparent: true,
        opacity: 0.22,
        fog: false,
        depthWrite: false,
      }),
    );
    glow.position.copy(sunDisk.position);
    this.scene.add(glow);
  }

  private buildGround() {
    const asphalt = makeNoiseTex(256, 256, "#22201e", "#2a2622", 40);
    asphalt.repeat.set(48, 36);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(wx(WORLD_PX_W) + 20, wz(WORLD_PX_H) + 20),
      new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92, metalness: 0.02, color: 0x888888 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(wx(WORLD_PX_W) / 2, 0, wz(WORLD_PX_H) / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const walk = makeNoiseTex(128, 128, "#35302a", "#3d372f", 22);
    walk.repeat.set(20, 3);
    const sidewalkMat = new THREE.MeshStandardMaterial({ map: walk, roughness: 0.88, color: 0x999088 });
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

    const laneMat = new THREE.MeshBasicMaterial({ color: 0xb8a678, transparent: true, opacity: 0.28 });
    for (let i = 0; i < 40; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.12), laneMat);
      dash.position.set(4 + i * 4.8, 0.06, wz(20 * TILE));
      this.scene.add(dash);
    }
  }

  buildCity(walls: { x: number; y: number; w: number; h: number }[], trees: { x: number; y: number }[]) {
    const brick = makeNoiseTex(128, 128, "#2b2724", "#3a342e", 18);
    const roofTex = makeNoiseTex(64, 64, "#3d3630", "#4a4239", 12);
    const winTex = makeWindowTex();
    const wallMat = new THREE.MeshStandardMaterial({
      map: brick,
      roughness: 0.86,
      metalness: 0.04,
      color: 0x9a9288,
    });
    const facadeMat = new THREE.MeshStandardMaterial({
      map: winTex,
      roughness: 0.55,
      metalness: 0.08,
      emissive: new THREE.Color(0xf2c66a),
      emissiveIntensity: 0.22,
    });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9, color: 0x8a8074 });

    for (const wall of walls) {
      if (wall.w >= WORLD_PX_W - 4 || wall.h >= WORLD_PX_H - 4) continue;
      const bw = Math.max(wx(wall.w), 1.6);
      const bd = Math.max(wz(wall.h), 1.6);
      const stories = 1.8 + hash(wall.x * 3 + wall.y) * 7.5;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, stories, bd), wallMat);
      body.position.y = stories / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.92, stories * 0.78), facadeMat);
      face.position.set(0, stories * 0.52, bd / 2 + 0.03);
      g.add(face);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.18, 0.18, bd + 0.18), roofMat);
      roof.position.y = stories + 0.08;
      roof.castShadow = true;
      g.add(roof);
      g.position.set(wx(wall.x + wall.w / 2), 0, wz(wall.y + wall.h / 2));
      this.scene.add(g);
    }

    for (const poi of POIS) {
      if (poi.id === "court" || poi.id === "river") continue;
      if (poi.id === "pyramid") {
        const pyr = new THREE.Mesh(
          new THREE.ConeGeometry(wx(poi.w) * 0.62, 14, 4),
          new THREE.MeshStandardMaterial({ color: 0x3d3630, roughness: 0.7, metalness: 0.08 }),
        );
        pyr.position.set(wx(poi.x + poi.w / 2), 7, wz(poi.y + poi.h / 2));
        pyr.rotation.y = Math.PI / 4;
        pyr.castShadow = true;
        this.scene.add(pyr);
        continue;
      }
      if (poi.id === "dropvan") {
        const van = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 1.4, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.5 }),
        );
        van.position.set(wx(poi.x + poi.w / 2), 0.75, wz(poi.y + poi.h / 2));
        van.castShadow = true;
        this.scene.add(van);
        continue;
      }
      const h = poi.id === "store" ? 6.4 : poi.id === "beale" ? 5.2 : 4.6 + hash(poi.x) * 3;
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(wx(poi.w), h, wz(poi.h)),
        new THREE.MeshStandardMaterial({ color: poi.id === "store" ? 0x1c1a18 : 0x322c28, roughness: 0.8 }),
      );
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(wx(poi.w) * 0.7, 0.45, 0.12),
        new THREE.MeshStandardMaterial({
          color: poi.id === "store" ? 0x1db954 : 0xd4af37,
          emissive: poi.id === "store" ? 0x1db954 : 0xd4af37,
          emissiveIntensity: 0.55,
        }),
      );
      sign.position.set(0, h * 0.72, wz(poi.h) / 2 + 0.08);
      g.add(sign);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(wx(poi.w) * 0.95, 0.12, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a1816 }),
      );
      awning.position.set(0, 2.15, wz(poi.h) / 2 + 0.25);
      g.add(awning);
      g.position.set(wx(poi.x + poi.w / 2), 0, wz(poi.y + poi.h / 2));
      this.scene.add(g);
    }

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a5c3a, roughness: 0.85 });
    for (const t of trees) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 6), trunkMat);
      trunk.position.y = 0.55;
      trunk.castShadow = true;
      g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), leafMat);
      leaf.position.y = 1.55;
      leaf.castShadow = true;
      g.add(leaf);
      g.position.set(wx(t.x), 0, wz(t.y));
      this.scene.add(g);
    }

    for (let i = 3; i < 60; i += 7) {
      for (const yt of [6, 20, 34]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x1a1816, metalness: 0.4, roughness: 0.45 }),
        );
        pole.position.y = 1.7;
        g.add(pole);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 10, 8),
          new THREE.MeshStandardMaterial({
            color: 0xf2c66a,
            emissive: 0xffb347,
            emissiveIntensity: 1.4,
          }),
        );
        lamp.position.y = 3.35;
        g.add(lamp);
        const light = new THREE.PointLight(0xffb347, 2.1, 14, 2);
        light.position.y = 3.3;
        if ((i + yt) % 21 === 3) g.add(light);
        g.position.set(wx(i * TILE + 12), 0, wz(yt * TILE + 10));
        this.scene.add(g);
      }
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
      new THREE.MeshStandardMaterial({ color: 0x8a5640, roughness: 0.7 }),
    );
    floor.position.set(cx, 0.06, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd9d0c4 });
    const key = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 3.4), lineMat);
    key.position.set(cx, 0.13, wz(court.y) + 2.2);
    this.scene.add(key);

    const hoopZ = wz(court.y + 26);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.15, 8),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.65, roughness: 0.3 }),
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
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.028, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.55, roughness: 0.25, emissive: 0x3a1408, emissiveIntensity: 0.2 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, 2.72, hoopZ);
    this.scene.add(rim);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.55, wireframe: true });
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.42, 10, 3, true), netMat);
    net.position.set(cx, 2.48, hoopZ);
    this.scene.add(net);
    return rim;
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
    while (this.cars.length < n) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.45, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x5c5148, roughness: 0.45, metalness: 0.15 }),
      );
      body.position.y = 0.38;
      body.castShadow = true;
      g.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.32, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.2, metalness: 0.3 }),
      );
      cabin.position.set(-0.12, 0.68, 0);
      g.add(cabin);
      this.scene.add(g);
      this.cars.push(g);
    }
  }

  private ensurePeds(n: number) {
    while (this.peds.length < n) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a8074, roughness: 0.8 }),
      );
      body.position.y = 0.72;
      body.castShadow = true;
      g.add(body);
      this.scene.add(g);
      this.peds.push(g);
    }
  }

  sync(f: WorldFrame) {
    this.clock = f.clock;
    const x = wx(f.px);
    const z = wz(f.py);
    this.player.position.set(x, 0, z);

    const key = f.facing === "up" ? "back" : f.facing === "down" ? "front" : f.facing === "left" ? "left" : "right";
    const img = f.images[key] ?? f.images.front;
    if (img) this.sprite.material = this.matFor(img, key);
    this.sprite.visible = f.cameraView === "third";
    this.sprite.position.y = 0.95 + f.bob * 0.02;

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
        const mat = new THREE.SpriteMaterial({ color: n.isK ? 0xffffff : 0xc4b8a8, transparent: true });
        if (n.isK && f.images.k) {
          const tex = new THREE.Texture(f.images.k);
          tex.needsUpdate = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
        }
        s = new THREE.Sprite(mat);
        s.scale.set(1.1, 1.7, 1);
        this.scene.add(s);
        this.npcSprites.set(n.id, s);
      }
      s.position.set(wx(n.x), 0.9, wz(n.y));
    }

    const fwdX = -Math.sin(f.yaw);
    const fwdZ = -Math.cos(f.yaw);
    const shake = f.trauma * f.trauma;
    const sx = Math.sin(f.clock * 47) * shake * 0.12;
    const sy = Math.cos(f.clock * 39) * shake * 0.08;

    if (f.cameraView === "first") {
      this.camera.position.set(x + sx, 1.68 + f.bob * 0.012, z + sy);
      const ly = Math.sin(f.pitch);
      const lh = Math.cos(f.pitch);
      this.camera.lookAt(x + fwdX * lh * 8, 1.62 + ly * 8, z + fwdZ * lh * 8);
      this.camera.fov = f.mode === "basketball" ? 74 : 70;
    } else {
      this.camPos.set(x - fwdX * 5.6 + sx, 2.35, z - fwdZ * 5.6 + sy);
      this.camera.position.lerp(this.camPos, 0.18);
      this.camera.lookAt(x, 1.28, z);
      this.camera.fov = 62;
    }
    this.sun.target.position.set(x, 0, z);
  }

  render(w: number, h: number) {
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
