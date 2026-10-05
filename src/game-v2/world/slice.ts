import * as THREE from "three";
import type { Solid } from "../core/types";

export type VehicleKind = "coupe" | "sedan" | "suv" | "van";

export type Board = {
  x: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  nx: number;
};

export type SliceWorld = {
  scene: THREE.Scene;
  solids: Record<"street" | "home" | "hq", Solid[]>;
  exterior: THREE.Group;
  home: THREE.Group;
  hq: THREE.Group;
  courtGate: { x: number; z: number };
  homeDoor: { x: number; z: number };
  hqDoor: { x: number; z: number };
  homeIn: { x: number; z: number };
  hqIn: { x: number; z: number };
  homeOut: { x: number; z: number };
  hqOut: { x: number; z: number };
  hoop: { x: number; z: number; y: number };
  hoops: { x: number; z: number; y: number }[];
  backboards: Board[];
  courtOg: { x: number; z: number };
  wardrobe: { x: number; z: number };
  kAnchor: { x: number; z: number };
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  lamps: THREE.PointLight[];
  courtLights: THREE.PointLight[];
  homeLights: THREE.PointLight[];
  hqLights: THREE.PointLight[];
  pedestrians: THREE.Group[];
  billboards: THREE.Object3D[];
  kSprite: THREE.Object3D;
  headlightMats: THREE.MeshStandardMaterial[];
  glowMats: THREE.MeshStandardMaterial[];
  skyDay: THREE.Texture;
  skyNight: THREE.Texture;
  counterPack: THREE.Object3D;
};

const trimMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.55 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.35, metalness: 0.72, emissive: 0x5a3e08, emissiveIntensity: 0.2 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, roughness: 0.22, metalness: 0.92 });
const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x17324a, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.72 });
const wood = new THREE.MeshStandardMaterial({ color: 0x8a623d, roughness: 0.75 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.95 });
const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3d7a38, roughness: 0.95 });
const concrete = new THREE.MeshStandardMaterial({ color: 0xb7b2a8, roughness: 0.92 });
const curbMat = new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: 0.9 });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
}

function canvasTex(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, repeat = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

function skyTex(night: boolean) {
  return canvasTex((g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    if (night) {
      grd.addColorStop(0, "#070b16");
      grd.addColorStop(0.55, "#141a30");
      grd.addColorStop(1, "#2a241c");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f4efe4";
      for (let i = 0; i < 80; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.7), i % 5 === 0 ? 2 : 1, 1);
    } else {
      grd.addColorStop(0, "#6eb6ee");
      grd.addColorStop(0.6, "#b7ddf6");
      grd.addColorStop(1, "#efe4cf");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const [x, y, r] of [
        [120, 80, 36],
        [180, 70, 28],
        [420, 110, 40],
        [700, 60, 30],
      ] as const) {
        g.beginPath();
        g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 1024, 512);
}

function grassMat() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#3c7638";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = i % 3 === 0 ? "#2f622e" : "#4d8a42";
      g.fillRect((i * 47) % w, (i * 19) % h, 2, 3);
    }
  }, 256, 256, true);
  tex.repeat.set(28, 20);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
}

function asphaltTex() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#2a2e33";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = i % 2 ? "#343a40" : "#22262b";
      g.fillRect(Math.random() * w, Math.random() * h, 3, 2);
    }
  }, 512, 512, true);
  tex.repeat.set(12, 4);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96 });
}

function paintLabel(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, color: string, start: number) {
  let size = start;
  g.textAlign = "center";
  g.textBaseline = "middle";
  do {
    g.font = `700 ${size}px sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > maxW && size > 18);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function sign(title: string, sub: string, w: number, h: number) {
  const tex = canvasTex((g, W, H) => {
    g.fillStyle = "#121212";
    g.fillRect(0, 0, W, H);
    paintLabel(g, title, W / 2, H * 0.38, W * 0.9, "#e0b33a", 110);
    paintLabel(g, sub, W / 2, H * 0.72, W * 0.8, "#f4efe4", 56);
  }, 1024, 512);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffe0b0, emissiveMap: tex, emissiveIntensity: 0.25 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return { plane, mat };
}

function actor(url: string, w: number, h: number, x: number, z: number, parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.035;
  g.add(shadow);
  const mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.28, roughness: 0.84, side: THREE.DoubleSide });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  sprite.name = "sprite";
  sprite.position.y = h / 2;
  sprite.castShadow = true;
  g.add(sprite);
  parent.add(g);
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    mat.needsUpdate = true;
  });
  return g;
}

function tree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  box(0.32 * scale, 2.2 * scale, 0.32 * scale, x, 1.1 * scale, z, trunkMat, parent);
  const canopy = scale > 1.05 ? leafMat2 : leafMat;
  mesh(new THREE.SphereGeometry(1.15 * scale, 12, 10), canopy, x, 2.55 * scale, z, parent);
  mesh(new THREE.SphereGeometry(0.85 * scale, 10, 8), canopy, x + 0.7 * scale, 2.35 * scale, z + 0.25, parent);
  mesh(new THREE.SphereGeometry(0.75 * scale, 10, 8), canopy, x - 0.55 * scale, 2.4 * scale, z - 0.2, parent);
}

function palm(x: number, z: number, parent: THREE.Object3D) {
  box(0.28, 5.4, 0.28, x, 2.7, z, trunkMat, parent);
  const frond = new THREE.MeshStandardMaterial({ color: 0x2d6a32, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const yaw = (i / 7) * Math.PI * 2;
    const m = mesh(new THREE.BoxGeometry(0.16, 0.06, 2.1), frond, x, 5.35, z, parent);
    m.rotation.y = yaw;
    m.rotation.x = 0.85;
    m.position.x = x + Math.sin(yaw) * 0.85;
    m.position.z = z + Math.cos(yaw) * 0.85;
  }
}

function lamp(x: number, z: number, parent: THREE.Object3D, lights: THREE.PointLight[]) {
  box(0.1, 4.2, 0.1, x, 2.1, z, black, parent);
  box(0.7, 0.08, 0.28, x, 4.15, z, black, parent);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffb45a, emissiveIntensity: 0.15 });
  mesh(new THREE.SphereGeometry(0.14, 10, 8), bulbMat, x, 4.05, z, parent);
  const light = new THREE.PointLight(0xffc27a, 0, 14, 2);
  light.position.set(x, 4.05, z);
  parent.add(light);
  lights.push(light);
}

function gable(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function bungalow(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  x: number,
  z: number,
  w: number,
  d: number,
  wall: string,
  roofColor: number,
  door: string,
  openDoor: boolean,
) {
  const wallH = 3.15;
  const body = box(w, wallH, d, x, wallH / 2, z, new THREE.MeshStandardMaterial({ color: wall, roughness: 0.82 }), parent);
  body.castShadow = true;
  const roof = mesh(gable(w + 1.1, d + 1.1, 1.45), new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.72 }), x, wallH, z, parent);
  roof.castShadow = true;
  const facade = canvasTex((g, W, H) => {
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < H; y += 10) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    const win = (px: number, py: number) => {
      g.fillStyle = "#f7f3ea";
      g.fillRect(px - 8, py - 8, 116, 150);
      g.fillStyle = "#16384e";
      g.fillRect(px, py, 100, 134);
      g.strokeStyle = "rgba(255,255,255,0.45)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(px + 50, py);
      g.lineTo(px + 50, py + 134);
      g.moveTo(px, py + 67);
      g.lineTo(px + 100, py + 67);
      g.stroke();
    };
    win(70, 70);
    win(W - 170, 70);
    g.fillStyle = "#f3efe6";
    g.fillRect(W / 2 - 58, H - 250, 116, 250);
    g.fillStyle = door;
    g.fillRect(W / 2 - 46, H - 236, 92, 230);
    g.fillStyle = "#e0b33a";
    g.beginPath();
    g.arc(W / 2 + 28, H - 110, 6, 0, Math.PI * 2);
    g.fill();
  }, 512, 384);
  const glowMap = canvasTex((g, W, H) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffb15a";
    g.fillRect(70, 70, 100, 134);
    g.fillRect(W - 170, 70, 100, 134);
  }, 512, 384);
  const faceMat = new THREE.MeshStandardMaterial({ map: facade, emissive: 0xffc27a, emissiveMap: glowMap, emissiveIntensity: 0.05, roughness: 0.8 });
  glow.push(faceMat);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, wallH * 0.98), faceMat);
  face.position.set(x, wallH / 2, z - d / 2 - 0.04);
  face.rotation.y = Math.PI;
  parent.add(face);
  const porchZ = z - d / 2 - 1.15;
  box(w * 0.62, 0.12, 2.2, x, 0.28, porchZ, wood, parent);
  box(w * 0.66, 0.1, 2.3, x, 2.35, porchZ, new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }), parent);
  for (const sx of [-w * 0.26, w * 0.26]) box(0.14, 2.1, 0.14, x + sx, 1.2, porchZ - 0.9, trimMat, parent);
  box(1.3, 0.1, 0.4, x, 0.12, porchZ - 1.35, concrete, parent);
  box(1.15, 0.1, 0.4, x, 0.2, porchZ - 1.05, concrete, parent);
  const front = z - d / 2;
  if (openDoor) {
    solids.push({ minX: x - w / 2, maxX: x - 0.7, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x + 0.7, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front + 1.15, maxZ: z + d / 2 });
  } else {
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: front, maxZ: z + d / 2 });
  }
}

function carSolid(x: number, z: number, yaw: number, length: number, width: number): Solid {
  const alongZ = Math.abs(Math.cos(yaw)) > 0.5;
  const hx = (alongZ ? width : length) / 2;
  const hz = (alongZ ? length : width) / 2;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

function hull(profile: [number, number][], width: number, mat: THREE.Material, parent: THREE.Object3D) {
  const shape = new THREE.Shape();
  shape.moveTo(profile[0]![0], profile[0]![1]);
  for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i]![0], profile[i]![1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.028,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -width / 2);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.y = -Math.PI / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function sideGlass(pts: [number, number][], x: number, parent: THREE.Object3D) {
  const positions: number[] = [];
  const [a, b, c, d] = pts;
  if (!a || !b || !c || !d) return;
  positions.push(0, a[1], a[0], 0, b[1], b[0], 0, c[1], c[0], 0, a[1], a[0], 0, c[1], c[0], 0, d[1], d[0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, glassMat);
  m.position.x = x;
  parent.add(m);
}

function spokeWheel(x: number, z: number, goldRim: boolean, parent: THREE.Object3D) {
  const radius = 0.36;
  const y = 0.4;
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.94 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: goldRim ? 0xe6c15a : 0xc5c8ce,
    roughness: goldRim ? 0.28 : 0.35,
    metalness: 0.88,
  });
  const tire = mesh(new THREE.CylinderGeometry(radius, radius, 0.22, 18), tireMat, x, y, z, parent);
  tire.rotation.z = Math.PI / 2;
  const rim = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.23, 16), rimMat, x, y, z, parent);
  rim.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const spoke = mesh(new THREE.BoxGeometry(0.03, 0.34, 0.035), rimMat, x, y, z, parent);
    spoke.rotation.x = (i / 5) * Math.PI;
  }
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), rimMat, x, y, z, parent).rotation.z = Math.PI / 2;
}

export function carBody(kind: VehicleKind) {
  const spec = {
    coupe: { L: 4.75, W: 1.84, color: 0x1b5c34, gold: true },
    sedan: { L: 4.6, W: 1.78, color: 0xd5d8dc, gold: false },
    suv: { L: 4.9, W: 1.96, color: 0x111111, gold: false },
    van: { L: 5.5, W: 2.05, color: 0x161616, gold: false },
  }[kind];
  const g = new THREE.Group();
  g.userData.radius = Math.max(spec.L, spec.W) * 0.48;
  const paint = new THREE.MeshStandardMaterial({ color: spec.color, roughness: kind === "suv" ? 0.42 : 0.28, metalness: 0.72 });
  const half = spec.L / 2 - 0.06;
  const profiles: Record<VehicleKind, [number, number][]> = {
    coupe: [
      [half, 0.42], [half, 0.86], [half - 0.45, 1.02], [0.42, 1.06], [0.05, 1.38], [-0.62, 1.5], [-1.2, 1.42], [-1.55, 1.12], [-half + 0.2, 0.98], [-half, 0.8], [-half, 0.42],
      [-1.62, 0.42], [-1.42, 0.7], [-0.78, 0.72], [-0.55, 0.42], [0.48, 0.42], [0.7, 0.7], [1.32, 0.72], [1.55, 0.42],
    ],
    sedan: [
      [half, 0.42], [half, 0.88], [half - 0.5, 1.02], [0.72, 1.08], [0.32, 1.48], [-0.95, 1.54], [-1.4, 1.18], [-half + 0.15, 1.0], [-half, 0.82], [-half, 0.42],
      [-1.55, 0.42], [-1.35, 0.7], [-0.72, 0.72], [-0.5, 0.42], [0.55, 0.42], [0.78, 0.7], [1.4, 0.72], [1.62, 0.42],
    ],
    suv: [
      [half, 0.46], [half, 1.12], [half - 0.35, 1.22], [1.15, 1.78], [-1.45, 1.82], [-1.85, 1.22], [-half, 1.08], [-half, 0.46],
      [-1.7, 0.46], [-1.48, 0.78], [-0.82, 0.8], [-0.58, 0.46], [0.7, 0.46], [0.95, 0.78], [1.58, 0.8], [1.82, 0.46],
    ],
    van: [
      [half, 0.46], [half, 1.22], [half - 0.85, 1.32], [half - 1.25, 2.15], [-half + 0.15, 2.18], [-half, 1.15], [-half, 0.46],
      [-1.85, 0.46], [-1.6, 0.78], [-0.9, 0.8], [-0.65, 0.46], [0.85, 0.46], [1.1, 0.78], [1.75, 0.8], [2.0, 0.46],
    ],
  };
  hull(profiles[kind], spec.W, paint, g);
  const glass: Record<VehicleKind, [number, number][]> = {
    coupe: [[0.28, 1.1], [-0.08, 1.36], [-1.05, 1.36], [-1.32, 1.12]],
    sedan: [[0.55, 1.14], [0.22, 1.44], [-1.15, 1.44], [-1.38, 1.16]],
    suv: [[1.05, 1.28], [0.95, 1.7], [-1.35, 1.72], [-1.55, 1.28]],
    van: [[half - 0.95, 1.4], [half - 1.15, 2.02], [half - 1.7, 2.02], [half - 1.85, 1.38]],
  };
  sideGlass(glass[kind], spec.W / 2 + 0.02, g);
  sideGlass(glass[kind], -spec.W / 2 - 0.02, g);
  const nose = half + 0.02;
  box(spec.W * 0.92, 0.16, 0.1, 0, 0.58, nose, chrome, g);
  box(spec.W * 0.92, 0.14, 0.1, 0, 0.56, -half - 0.02, chrome, g);
  box(spec.W * 0.46, 0.22, 0.06, 0, kind === "suv" || kind === "van" ? 0.95 : 0.78, nose + 0.02, black, g);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff4d2, emissive: 0xffe7b0, emissiveIntensity: 0.7 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x9a1e1e, emissive: 0xff2a2a, emissiveIntensity: 0.35 });
  g.userData.headlights = [headMat, tailMat];
  const lampY = kind === "van" || kind === "suv" ? 0.92 : 0.74;
  box(0.36, 0.14, 0.05, -spec.W * 0.3, lampY, nose + 0.03, headMat, g);
  box(0.36, 0.14, 0.05, spec.W * 0.3, lampY, nose + 0.03, headMat, g);
  box(0.4, 0.12, 0.05, -spec.W * 0.32, lampY - 0.06, -half - 0.04, tailMat, g);
  box(0.4, 0.12, 0.05, spec.W * 0.32, lampY - 0.06, -half - 0.04, tailMat, g);
  if (spec.gold) {
    box(0.06, 0.05, spec.L * 0.86, spec.W / 2 + 0.015, 0.58, 0, gold, g);
    box(0.06, 0.05, spec.L * 0.86, -spec.W / 2 - 0.015, 0.58, 0, gold, g);
    box(0.16, 0.05, 1.15, 0, 1.08, spec.L * 0.18, gold, g);
  }
  if (kind === "van") {
    box(0.04, 0.1, spec.L * 0.5, spec.W / 2 + 0.02, 1.35, -0.35, gold, g);
    const mark = sign("$ACK", "DROP", 1.35, 0.48);
    mark.plane.position.set(spec.W / 2 + 0.03, 1.15, -0.3);
    mark.plane.rotation.y = Math.PI / 2;
    g.add(mark.plane);
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(spec.L * 0.42, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  g.add(shadow);
  const wz = kind === "van" ? 1.55 : kind === "suv" ? 1.25 : 1.05;
  const wx = spec.W * 0.5 + 0.02;
  for (const [sx, sz] of [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]] as const) spokeWheel(sx, sz, spec.gold, g);
  return g;
}

export function parkedCar(x: number, z: number, yaw: number, kind: VehicleKind, parent: THREE.Object3D) {
  const car = carBody(kind);
  car.position.set(x, 0, z);
  car.rotation.y = yaw;
  parent.add(car);
  return car;
}

function collectLights(root: THREE.Object3D, into: THREE.MeshStandardMaterial[]) {
  root.traverse((obj) => {
    const mats = obj.userData.headlights as THREE.MeshStandardMaterial[] | undefined;
    if (mats) into.push(...mats);
  });
}

function courtTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#1a4c86";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f4efe4";
    g.lineWidth = 10;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.beginPath();
    g.moveTo(w / 2, 24);
    g.lineTo(w / 2, h - 24);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#8e2a2a";
    g.fillRect(24, h * 0.28, 150, h * 0.44);
    g.fillRect(w - 174, h * 0.28, 150, h * 0.44);
    g.strokeRect(24, h * 0.28, 150, h * 0.44);
    g.strokeRect(w - 174, h * 0.28, 150, h * 0.44);
    g.fillStyle = "#f4efe4";
    g.font = "700 92px sans-serif";
    g.textAlign = "center";
    g.fillText("901", w / 2, h / 2 + 10);
    g.font = "600 28px sans-serif";
    g.fillText("MEMPHIS", w / 2, h / 2 + 48);
  }, 1024, 640);
}

function muralTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#16324f";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e0b33a";
    g.font = "800 180px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("901", w / 2, h * 0.42);
    g.fillStyle = "#f4efe4";
    g.font = "700 54px sans-serif";
    g.fillText("MEMPHIS", w / 2, h * 0.72);
  }, 1024, 512);
}

function hoopRig(rimX: number, z: number, dir: 1 | -1, parent: THREE.Object3D) {
  const boardX = rimX - dir * 0.48;
  box(0.12, 3.3, 0.12, boardX - dir * 0.2, 1.65, z, black, parent);
  const board = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.35 });
  box(0.08, 1.05, 1.7, boardX, 3.15, z, board, parent);
  box(0.02, 0.42, 0.55, boardX + dir * 0.05, 2.95, z, new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.4 }), parent);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 18), gold);
  rim.position.set(rimX, 2.72, z);
  rim.rotation.y = Math.PI / 2;
  rim.castShadow = true;
  parent.add(rim);
  const net = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.42, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf4efe4, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 1 }),
  );
  net.rotation.x = Math.PI;
  net.position.set(rimX, 2.46, z);
  parent.add(net);
  return {
    hoop: { x: rimX, z, y: 2.72 },
    board: { x: boardX, minY: 2.6, maxY: 3.7, minZ: z - 0.85, maxZ: z + 0.85, nx: dir },
  };
}

function signal(x: number, z: number, parent: THREE.Object3D) {
  box(0.1, 3.6, 0.1, x, 1.8, z, black, parent);
  box(0.28, 0.72, 0.28, x, 3.5, z, black, parent);
  const green = new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.8 });
  mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0x330000, emissiveIntensity: 0.2 }), x, 3.72, z + 0.15, parent);
  mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x887722, emissive: 0x443300, emissiveIntensity: 0.15 }), x, 3.5, z + 0.15, parent);
  mesh(new THREE.SphereGeometry(0.07, 8, 8), green, x, 3.28, z + 0.15, parent);
}

export function buildSlice(): SliceWorld {
  const scene = new THREE.Scene();
  const skyDay = skyTex(false);
  const skyNight = skyTex(true);
  scene.background = skyDay;
  scene.fog = new THREE.Fog(0xb7d4ef, 36, 120);

  const exterior = new THREE.Group();
  const home = new THREE.Group();
  const hq = new THREE.Group();
  home.visible = false;
  hq.visible = false;
  scene.add(exterior, home, hq);

  const sun = new THREE.DirectionalLight(0xfff1d6, 5.5);
  sun.position.set(-22, 32, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xc5e4ff, 0x6a8f55, 2.15);
  scene.add(hemi);

  const streetSolids: Solid[] = [];
  const homeSolids: Solid[] = [];
  const hqSolids: Solid[] = [];
  const glowMats: THREE.MeshStandardMaterial[] = [];
  const headlightMats: THREE.MeshStandardMaterial[] = [];
  const asphalt = asphaltTex();

  mesh(new THREE.PlaneGeometry(200, 160), grassMat(), 8, 0, -6, exterior).rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(46, 16), new THREE.MeshStandardMaterial({ color: 0x2f552c, roughness: 1 }), -28, 0.004, 16, exterior).rotation.x = -Math.PI / 2;

  box(156, 0.06, 9.1, 8, 0.03, 0, asphalt, exterior);
  box(9.1, 0.06, 48, 8, 0.03, -2, asphalt, exterior);
  box(150, 0.1, 2.5, 8, 0.08, 6.15, concrete, exterior);
  box(150, 0.1, 2.5, 8, 0.08, -6.15, concrete, exterior);
  box(2.4, 0.1, 36, 3.15, 0.08, -4, concrete, exterior);
  box(2.4, 0.1, 36, 12.85, 0.08, -4, concrete, exterior);
  box(150, 0.16, 0.28, 8, 0.08, 4.62, curbMat, exterior);
  box(150, 0.16, 0.28, 8, 0.08, -4.62, curbMat, exterior);

  const yellow = new THREE.MeshStandardMaterial({ color: 0xe6c15a, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.7 });
  for (let x = -48; x < 70; x += 4.2) {
    if (x > 2 && x < 14) continue;
    box(1.7, 0.02, 0.12, x, 0.07, 0, yellow, exterior);
  }
  for (let x = -40; x < 70; x += 6) {
    box(2.4, 0.015, 0.08, x, 0.07, 4.15, white, exterior);
    box(2.4, 0.015, 0.08, x, 0.07, -4.15, white, exterior);
  }
  for (let i = 0; i < 8; i++) {
    box(0.16, 0.02, 0.85, 3.4, 0.08, -3.2 + i * 0.9, white, exterior);
    box(0.16, 0.02, 0.85, 12.6, 0.08, -3.2 + i * 0.9, white, exterior);
    box(0.85, 0.02, 0.16, 4.4 + i * 0.9, 0.08, 3.5, white, exterior);
    box(0.85, 0.02, 0.16, 4.4 + i * 0.9, 0.08, -3.5, white, exterior);
  }
  box(0.28, 0.02, 2.4, 2.6, 0.08, -1.25, white, exterior);
  box(0.28, 0.02, 2.4, 13.4, 0.08, 1.25, white, exterior);

  const lamps: THREE.PointLight[] = [];
  for (const x of [-42, -24, -8, 14, 36, 56]) lamp(x, 7.45, exterior, lamps);
  for (const x of [-36, -16, 2, 16, 34, 50]) lamp(x, -8.85, exterior, lamps);
  signal(2.4, 7.2, exterior);
  signal(13.6, -7.2, exterior);

  for (const x of [-46, -38, -24, -14, 16, 34, 46, 62]) tree(x, 11.2, exterior, x % 2 === 0 ? 1 : 1.15);
  for (const x of [-44, -18, 18, 40, 58]) tree(x, -10.5, exterior, 1.2);
  palm(14, -9.2, exterior);
  palm(33, -9.4, exterior);
  palm(-6, 12.4, exterior);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const poleXs = [-44, -20, 2, 28, 52];
  for (let i = 0; i < poleXs.length; i++) {
    const x = poleXs[i]!;
    box(0.12, 6.2, 0.12, x, 3.1, 8.6, poleMat, exterior);
    box(1.2, 0.08, 0.08, x, 6.1, 8.6, poleMat, exterior);
    if (i < poleXs.length - 1) {
      const x2 = poleXs[i + 1]!;
      const len = x2 - x;
      const wire = box(len, 0.03, 0.03, (x + x2) / 2, 6.05, 8.6, wireMat, exterior);
      wire.castShadow = false;
    }
  }

  const pedestrians = [
    actor("/game/people/local.webp", 0.78, 1.72, -26, 6.15, exterior),
    actor("/game/people/fan.webp", 0.78, 1.72, -4, 6.05, exterior),
    actor("/game/people/supporter.webp", 0.78, 1.72, 18, -6.2, exterior),
    actor("/game/people/local.webp", 0.78, 1.72, 42, 6.2, exterior),
  ];
  const billboards: THREE.Object3D[] = [...pedestrians];

  bungalow(exterior, streetSolids, glowMats, -32, 14.6, 8.6, 7.4, "#e7d7c0", 0x7a3b32, "#6b3a22", true);
  bungalow(exterior, streetSolids, glowMats, -20.5, 14.8, 7.4, 6.8, "#d5ddd8", 0x3c4148, "#243044", false);
  bungalow(exterior, streetSolids, glowMats, -10, 15, 7.8, 7, "#c4a08a", 0x3c4148, "#5c3828", false);
  bungalow(exterior, streetSolids, glowMats, 18, 14.7, 7.6, 6.8, "#efe6d4", 0x6e4030, "#1f4d3a", false);
  bungalow(exterior, streetSolids, glowMats, 30, 15.1, 8, 7.2, "#d7c4a3", 0x3c4148, "#5a4030", false);
  bungalow(exterior, streetSolids, glowMats, 44, 14.5, 7.2, 6.6, "#c9d4cf", 0x7a3b32, "#243044", false);

  for (const [fx, fz] of [
    [-36.2, 9.4],
    [-16.8, 9.6],
    [22, 9.5],
    [48, 9.2],
  ] as const) {
    box(0.12, 0.55, 1.6, fx, 0.35, fz, wood, exterior);
  }
  box(3.4, 0.05, 6.2, -35.6, 0.04, 8.4, asphalt, exterior);
  const coupe = parkedCar(-35.4, 8.9, 2.35, "coupe", exterior);
  collectLights(coupe, headlightMats);
  streetSolids.push(carSolid(-35.4, 8.9, 2.35, 4.75, 1.84));
  const sedan = parkedCar(-16.2, 9.1, Math.PI, "sedan", exterior);
  collectLights(sedan, headlightMats);
  streetSolids.push(carSolid(-16.2, 9.1, Math.PI, 4.6, 1.78));
  const curbSuv = parkedCar(33.5, -3.55, Math.PI / 2, "suv", exterior);
  collectLights(curbSuv, headlightMats);
  streetSolids.push(carSolid(33.5, -3.55, Math.PI / 2, 4.9, 1.96));

  box(0.28, 0.9, 0.28, -28.4, 0.55, 7.15, new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.6 }), exterior);
  box(0.42, 0.28, 0.22, -28.4, 1.05, 7.15, new THREE.MeshStandardMaterial({ color: 0x8d1d1d, roughness: 0.5 }), exterior);
  box(0.45, 0.7, 0.45, -29.6, 0.4, 6.5, black, exterior);
  box(0.22, 0.55, 0.22, 3.4, 0.35, 5.2, new THREE.MeshStandardMaterial({ color: 0xc4362c, roughness: 0.45 }), exterior);
  box(0.28, 0.16, 0.28, 3.4, 0.7, 5.2, chrome, exterior);
  const ave = sign("901", "AVE", 0.7, 0.4);
  ave.plane.position.set(2.2, 2.4, 5.4);
  exterior.add(ave.plane);
  glowMats.push(ave.mat);

  const hqX = 24;
  const hqZ = -16.4;
  const brick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    map: canvasTex((g, w, h) => {
      g.fillStyle = "#8a4632";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(40,16,10,0.35)";
      for (let row = 0; row < 16; row++) {
        const y = row * (h / 16);
        g.fillRect(0, y, w, 4);
        const off = row % 2 ? 28 : 0;
        for (let x = -40 + off; x < w; x += 56) g.fillRect(x, y, 4, h / 16);
      }
    }, 256, 256, true),
  });
  brick.map!.repeat.set(3, 2);
  box(18, 5.8, 10.6, hqX, 2.9, hqZ, brick, exterior);
  box(18.4, 0.28, 11, hqX, 5.9, hqZ, new THREE.MeshStandardMaterial({ color: 0x2a1814, roughness: 0.8 }), exterior);
  box(6.2, 0.7, 10.8, hqX, 6.35, hqZ, brick, exterior);
  const frontZ = hqZ + 5.48;
  const panel = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.45, metalness: 0.35 });
  box(10.2, 3.55, 0.28, hqX, 4.35, frontZ, panel, exterior);
  const brandTex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#e0b33a";
    const cx = w / 2;
    const cy = h * 0.36;
    g.beginPath();
    g.moveTo(cx - 150, cy + 36);
    g.lineTo(cx - 170, cy - 28);
    g.lineTo(cx - 100, cy + 8);
    g.lineTo(cx, cy - 70);
    g.lineTo(cx + 100, cy + 8);
    g.lineTo(cx + 170, cy - 28);
    g.lineTo(cx + 150, cy + 36);
    g.closePath();
    g.fill();
    g.fillRect(cx - 160, cy + 36, 320, 16);
    paintLabel(g, "$ACKRELIGIOUS", w / 2, h * 0.58, w * 0.9, "#e0b33a", 92);
    paintLabel(g, "HQ", w / 2, h * 0.8, w * 0.3, "#f4efe4", 48);
  }, 1024, 512);
  const brandMat = new THREE.MeshStandardMaterial({
    map: brandTex,
    transparent: true,
    emissive: 0xffe0b0,
    emissiveMap: brandTex,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    depthWrite: false,
  });
  glowMats.push(brandMat);
  const brand = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.3), brandMat);
  brand.position.set(hqX, 4.55, frontZ + 0.2);
  exterior.add(brand);
  const frame = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.4, metalness: 0.5 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffb15a, emissiveIntensity: 0.35, roughness: 0.4 });
  glowMats.push(warm);
  for (const ox of [-3.15, 0, 3.15]) {
    box(2.35, 2.15, 0.16, hqX + ox, 1.25, frontZ + 0.08, ox === 0 ? black : frame, exterior);
    if (ox !== 0) {
      box(2.05, 1.85, 0.08, hqX + ox, 1.28, frontZ + 0.16, glassMat, exterior);
      box(1.7, 1.45, 0.04, hqX + ox, 1.25, frontZ - 0.2, warm, exterior);
    } else {
      box(1.15, 1.9, 0.08, hqX, 1.15, frontZ + 0.18, glassMat, exterior);
      box(0.08, 0.12, 0.08, hqX + 0.35, 1.15, frontZ + 0.24, gold, exterior);
    }
  }
  for (const side of [-1, 1]) {
    const banner = sign("K", "901", 0.7, 1.8);
    banner.plane.position.set(hqX + side * 6.35, 3.4, frontZ + 0.08);
    exterior.add(banner.plane);
    glowMats.push(banner.mat);
  }
  box(5.2, 3.2, 4.2, hqX + 11.6, 1.6, hqZ - 1.2, black, exterior);
  streetSolids.push({ minX: hqX + 9, maxX: hqX + 14.2, minZ: hqZ - 3.3, maxZ: hqZ + 0.9 });
  const van = parkedCar(hqX + 11.6, hqZ - 4.6, Math.PI / 2, "van", exterior);
  collectLights(van, headlightMats);
  streetSolids.push(carSolid(hqX + 11.6, hqZ - 4.6, Math.PI / 2, 5.5, 2.05));
  streetSolids.push({ minX: hqX - 9, maxX: hqX - 0.85, minZ: hqZ - 5.5, maxZ: hqZ + 5.5 });
  streetSolids.push({ minX: hqX + 0.85, maxX: hqX + 9, minZ: hqZ - 5.5, maxZ: hqZ + 5.5 });
  streetSolids.push({ minX: hqX - 9, maxX: hqX + 9, minZ: hqZ - 5.5, maxZ: hqZ + 3.6 });
  box(14, 0.08, 6.5, hqX, 0.05, hqZ + 8.2, concrete, exterior);
  for (const px of [hqX - 5.2, hqX + 5.2]) {
    box(0.7, 0.7, 0.7, px, 0.4, hqZ + 6.3, black, exterior);
    mesh(new THREE.SphereGeometry(0.45, 10, 8), leafMat, px, 1.05, hqZ + 6.3, exterior);
  }

  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.45,
    map: canvasTex((g, w, h) => {
      g.fillStyle = "#8ea0b4";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#d7e7f4";
      for (let y = 8; y < h; y += 18) for (let x = 6; x < w; x += 16) g.fillRect(x, y, 8, 10);
    }, 128, 256, true),
    emissive: 0xffe0b0,
    emissiveIntensity: 0.05,
  });
  glowMats.push(towerMat);
  for (const [tx, th] of [
    [8, 14],
    [14, 22],
    [20, 16],
    [28, 26],
    [36, 18],
  ] as const) {
    box(3.2, th, 3.2, tx, th / 2, -46, towerMat, exterior);
  }

  const courtX = 52;
  const courtZ = -22;
  const courtMat = new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.62 });
  mesh(new THREE.PlaneGeometry(22, 14), courtMat, courtX, 0.04, courtZ, exterior).rotation.x = -Math.PI / 2;
  const fence = new THREE.MeshStandardMaterial({ color: 0xb7c2cc, roughness: 0.4, metalness: 0.65, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  box(22.4, 2.6, 0.08, courtX, 1.3, courtZ - 7.1, fence, exterior);
  box(9.2, 2.6, 0.08, courtX - 6.4, 1.3, courtZ + 7.1, fence, exterior);
  box(9.2, 2.6, 0.08, courtX + 6.4, 1.3, courtZ + 7.1, fence, exterior);
  box(0.08, 2.6, 14.2, courtX - 11.2, 1.3, courtZ, fence, exterior);
  box(0.08, 2.6, 14.2, courtX + 11.2, 1.3, courtZ, fence, exterior);
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.7 }));
  mural.position.set(courtX - 11.05, 1.8, courtZ);
  mural.rotation.y = Math.PI / 2;
  exterior.add(mural);
  streetSolids.push({ minX: courtX - 11.4, maxX: courtX + 11.4, minZ: courtZ - 7.3, maxZ: courtZ - 6.8 });
  streetSolids.push({ minX: courtX - 11.4, maxX: courtX - 1.3, minZ: courtZ + 6.8, maxZ: courtZ + 7.4 });
  streetSolids.push({ minX: courtX + 1.3, maxX: courtX + 11.4, minZ: courtZ + 6.8, maxZ: courtZ + 7.4 });
  streetSolids.push({ minX: courtX - 11.5, maxX: courtX - 10.9, minZ: courtZ - 7, maxZ: courtZ + 7 });
  streetSolids.push({ minX: courtX + 10.9, maxX: courtX + 11.5, minZ: courtZ - 7, maxZ: courtZ + 7 });
  for (let i = 0; i < 4; i++) box(4.2, 0.22, 1.15, courtX - 1 + i * 0.08, 0.18 + i * 0.22, courtZ - 8.5, wood, exterior);
  const west = hoopRig(courtX - 9.6, courtZ, 1, exterior);
  const east = hoopRig(courtX + 9.6, courtZ, -1, exterior);
  const scoreTex = canvasTex((g, w, h) => {
    g.fillStyle = "#0c0c0c";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e0b33a";
    g.lineWidth = 8;
    g.strokeRect(8, 8, w - 16, h - 16);
    paintLabel(g, "901 COURT", w / 2, h * 0.28, w * 0.86, "#e0b33a", 54);
    paintLabel(g, "HOME  00", w * 0.28, h * 0.68, w * 0.4, "#ff4d4d", 42);
    paintLabel(g, "GUEST  00", w * 0.72, h * 0.68, w * 0.42, "#7eb6ff", 42);
  }, 768, 384);
  const scoreMat = new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0xffe0b0, emissiveMap: scoreTex, emissiveIntensity: 0.35, roughness: 0.4 });
  glowMats.push(scoreMat);
  const score = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), scoreMat);
  score.position.set(courtX + 6.2, 3.1, courtZ + 6.55);
  score.rotation.y = Math.PI;
  exterior.add(score);
  box(0.12, 2.4, 0.12, courtX + 5.1, 1.2, courtZ + 6.4, black, exterior);
  box(0.12, 2.4, 0.12, courtX + 7.3, 1.2, courtZ + 6.4, black, exterior);
  box(2.2, 0.16, 0.55, courtX + 3.4, 0.48, courtZ + 8.6, wood, exterior);
  box(0.1, 0.48, 0.1, courtX + 2.6, 0.24, courtZ + 8.85, wood, exterior);
  box(0.1, 0.48, 0.1, courtX + 4.2, 0.24, courtZ + 8.85, wood, exterior);
  const courtLights: THREE.PointLight[] = [];
  for (const lx of [courtX - 8, courtX + 8]) {
    box(0.1, 6.2, 0.1, lx, 3.1, courtZ - 8.2, black, exterior);
    box(2.2, 0.08, 0.4, lx, 6.15, courtZ - 6.5, black, exterior);
    const bulb = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffe2a8, emissiveIntensity: 0.2 });
    glowMats.push(bulb);
    box(1.6, 0.08, 0.2, lx, 6.05, courtZ - 6.5, bulb, exterior);
    const light = new THREE.PointLight(0xfff1d0, 0, 22, 2);
    light.position.set(lx, 6, courtZ - 4);
    exterior.add(light);
    courtLights.push(light);
  }
  const og = actor("/game/people/court-og.webp", 0.96, 1.82, courtX, courtZ + 9.1, exterior);
  billboards.push(og);

  buildHomeInterior(home, homeSolids, glowMats);
  const interior = buildHqInterior(hq, hqSolids, glowMats);
  const counterPack = interior.counterPack;
  const kSprite = interior.kSprite;

  return {
    scene,
    solids: { street: streetSolids, home: homeSolids, hq: hqSolids },
    exterior,
    home,
    hq,
    homeDoor: { x: -32, z: 9.55 },
    hqDoor: { x: hqX, z: hqZ + 6.35 },
    homeOut: { x: -32, z: 8.4 },
    hqOut: { x: hqX, z: hqZ + 7.4 },
    homeIn: { x: 0, z: 3.15 },
    hqIn: { x: 0, z: 4.7 },
    courtGate: { x: courtX, z: courtZ + 7.2 },
    hoop: west.hoop,
    hoops: [west.hoop, east.hoop],
    backboards: [west.board, east.board],
    courtOg: { x: courtX, z: courtZ + 9.1 },
    wardrobe: { x: -3.5, z: -2.5 },
    kAnchor: { x: 3.05, z: 2.65 },
    sun,
    hemi,
    lamps,
    courtLights,
    homeLights: home.userData.lights as THREE.PointLight[],
    hqLights: hq.userData.lights as THREE.PointLight[],
    pedestrians,
    billboards,
    kSprite,
    headlightMats,
    glowMats,
    skyDay,
    skyNight,
    counterPack,
  };
}

function buildHomeInterior(group: THREE.Group, solids: Solid[], glow: THREE.MeshStandardMaterial[]) {
  group.position.set(0, 0, 200);
  const floorTex = canvasTex((g, w, h) => {
    g.fillStyle = "#c2a078";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,60,30,0.35)";
    for (let i = 0; i < 8; i++) {
      g.strokeRect(i * 32, 0, 32, h);
    }
  }, 256, 256, true);
  const floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
  floor.map!.repeat.set(4, 3);
  mesh(new THREE.PlaneGeometry(10, 8), floor, 0, 0, 0, group).rotation.x = -Math.PI / 2;
  const wall = new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.9 });
  box(10, 2.8, 0.16, 0, 1.4, -4, wall, group);
  box(0.16, 2.8, 8, -5, 1.4, 0, wall, group);
  box(0.16, 2.8, 8, 5, 1.4, 0, wall, group);
  box(3.5, 2.8, 0.16, -3.2, 1.4, 4, wall, group);
  box(3.5, 2.8, 0.16, 3.2, 1.4, 4, wall, group);
  box(10, 0.12, 8, 0, 2.75, 0, new THREE.MeshStandardMaterial({ color: 0xf7f1e6, roughness: 0.9 }), group);
  solids.push({ minX: -5.2, maxX: 5.2, minZ: -4.2, maxZ: -3.75 });
  solids.push({ minX: -5.2, maxX: -4.75, minZ: -4, maxZ: 4.2 });
  solids.push({ minX: 4.75, maxX: 5.2, minZ: -4, maxZ: 4.2 });
  solids.push({ minX: -5, maxX: -1.15, minZ: 3.75, maxZ: 4.25 });
  solids.push({ minX: 1.15, maxX: 5, minZ: 3.75, maxZ: 4.25 });
  const couch = new THREE.MeshStandardMaterial({ color: 0x1f4d3a, roughness: 0.8 });
  box(2.6, 0.45, 0.9, -2.3, 0.32, -1.6, couch, group);
  box(2.6, 0.7, 0.16, -2.3, 0.75, -2.0, couch, group);
  solids.push({ minX: -3.7, maxX: -0.9, minZ: -2.2, maxZ: -1.1 });
  box(1.2, 0.28, 0.7, -2.2, 0.4, -0.3, wood, group);
  box(1.5, 0.9, 0.35, -3.6, 0.7, 1.6, black, group);
  const screen = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x88b7d6, emissiveIntensity: 0.35 });
  glow.push(screen);
  box(1.2, 0.7, 0.06, -3.6, 1.15, 1.78, screen, group);
  box(2.4, 0.9, 0.7, 2.2, 0.5, 0.2, new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.6 }), group);
  box(2.2, 0.08, 0.7, 2.2, 0.98, 0.2, wood, group);
  solids.push({ minX: 0.9, maxX: 3.5, minZ: -0.3, maxZ: 0.7 });
  box(1.7, 0.45, 2.2, 3.4, 0.35, -2.2, new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.8 }), group);
  box(1.7, 0.35, 0.4, 3.4, 0.55, -1.2, trimMat, group);
  solids.push({ minX: 2.4, maxX: 4.4, minZ: -3.4, maxZ: -1.0 });
  box(1.3, 2.2, 0.7, -3.5, 1.1, -2.5, wood, group);
  solids.push({ minX: -4.3, maxX: -2.7, minZ: -3.0, maxZ: -2.0 });
  const closet = sign("FIT", "CLOSET", 1.1, 0.4);
  closet.plane.position.set(-3.5, 1.7, -2.12);
  group.add(closet.plane);
  const light = new THREE.PointLight(0xffe0b0, 0, 14, 2);
  light.position.set(0, 2.5, 0);
  group.add(light);
  group.userData.lights = [light];
}

function buildHqInterior(group: THREE.Group, solids: Solid[], glow: THREE.MeshStandardMaterial[]) {
  group.position.set(80, 0, 200);
  const floor = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.25 });
  mesh(new THREE.PlaneGeometry(16, 12), floor, 0, 0.01, 0, group).rotation.x = -Math.PI / 2;
  box(16, 3.2, 0.16, 0, 1.6, -6, black, group);
  box(0.16, 3.2, 12, -8, 1.6, 0, black, group);
  box(0.16, 3.2, 12, 8, 1.6, 0, black, group);
  box(6, 3.2, 0.16, -5, 1.6, 6, black, group);
  box(6, 3.2, 0.16, 5, 1.6, 6, black, group);
  box(16, 0.1, 12, 0, 3.15, 0, new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8 }), group);
  box(6, 0.08, 0.2, 0, 2.9, 6.05, gold, group);
  solids.push({ minX: -8.2, maxX: 8.2, minZ: -6.2, maxZ: -5.75 });
  solids.push({ minX: -8.2, maxX: -7.75, minZ: -6, maxZ: 6.2 });
  solids.push({ minX: 7.75, maxX: 8.2, minZ: -6, maxZ: 6.2 });
  solids.push({ minX: -8, maxX: -1.15, minZ: 5.75, maxZ: 6.25 });
  solids.push({ minX: 1.15, maxX: 8, minZ: 5.75, maxZ: 6.25 });
  const rack = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.2 });
  for (const x of [-4.2, -1.4, 1.5]) {
    box(1.5, 1.7, 0.45, x, 0.9, -2.4, rack, group);
    solids.push({ minX: x - 0.85, maxX: x + 0.85, minZ: -2.8, maxZ: -2.05 });
    for (const [dx, color] of [
      [-0.45, 0x1f7a43],
      [-0.15, 0xb43322],
      [0.15, 0x111111],
      [0.45, 0xf4efe4],
    ] as const) {
      box(0.24, 0.7, 0.06, x + dx, 1.2, -2.12, new THREE.MeshStandardMaterial({ color }), group);
    }
  }
  for (let i = 0; i < 4; i++) {
    box(0.35, 0.16, 0.7, -5.6, 0.2 + i * 0.28, 2.2, rack, group);
    box(0.28, 0.1, 0.5, -5.6, 0.32 + i * 0.28, 2.2, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe0b33a : 0xf4efe4 }), group);
  }
  box(2.4, 1.05, 0.7, 4.6, 0.55, 1.6, black, group);
  box(2.4, 0.08, 0.7, 4.6, 1.1, 1.6, gold, group);
  solids.push({ minX: 3.3, maxX: 5.9, minZ: 1.15, maxZ: 2.05 });
  box(0.08, 2.3, 2.2, -6.2, 1.15, 0.2, black, group);
  box(1.8, 2.3, 0.08, -6.9, 1.15, -0.9, black, group);
  box(1.8, 2.3, 0.08, -6.9, 1.15, 1.3, black, group);
  const curtain = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.6, side: THREE.DoubleSide });
  box(0.08, 2.1, 1.1, -6.15, 1.15, 0.2, curtain, group);
  solids.push({ minX: -7.9, maxX: -6.1, minZ: -1.0, maxZ: 1.4 });
  const sofa = new THREE.MeshStandardMaterial({ color: 0x1f4d3a, roughness: 0.75 });
  box(2.2, 0.45, 0.8, -3.4, 0.35, -4.4, sofa, group);
  box(2.2, 0.55, 0.16, -3.4, 0.7, -4.75, sofa, group);
  solids.push({ minX: -4.6, maxX: -2.2, minZ: -5.0, maxZ: -3.9 });
  box(2.6, 2.4, 2.4, 6.2, 1.2, -4.2, new THREE.MeshStandardMaterial({ color: 0x242018, roughness: 0.75 }), group);
  box(1.4, 0.08, 0.7, 6.2, 0.78, -3.4, wood, group);
  solids.push({ minX: 4.8, maxX: 7.6, minZ: -5.5, maxZ: -2.9 });
  box(3.2, 2.2, 0.2, 2.4, 1.1, -5.2, black, group);
  box(1.4, 1.2, 0.5, 2.4, 0.7, -4.6, wood, group);
  solids.push({ minX: 0.6, maxX: 4.2, minZ: -5.5, maxZ: -4.2 });
  const banner = sign("$ACKRELIGIOUS", "SHOWROOM", 5.2, 1.15);
  banner.plane.position.set(0, 2.45, -5.85);
  group.add(banner.plane);
  glow.push(banner.mat);
  const k = actor("/game/people/k-blanco-hq-cutout.png", 1.2, 1.8, 3.05, 2.65, group);
  const pack = box(0.28, 0.16, 0.22, 4.6, 1.22, 2.15, gold, group);
  const light = new THREE.PointLight(0xffe2b0, 0, 20, 2);
  light.position.set(0, 2.8, 0);
  const light2 = new THREE.PointLight(0xfff6e0, 0, 10, 2);
  light2.position.set(4.6, 2.3, 1.4);
  group.add(light, light2);
  group.userData.lights = [light, light2];
  return { kSprite: k.getObjectByName("sprite")!, counterPack: pack };
}
