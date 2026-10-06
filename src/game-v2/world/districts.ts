import * as THREE from "three";
import type { Solid } from "../core/types";
import type { Spawnable } from "../assets/characters";
import { characters } from "../assets/characters";
import { addGround } from "./ground";
import { concreteSlab } from "./kits/materials";
import { palmTree, streetTree } from "./kits/trees";
import { carBody } from "./kits/vehicles";

export type DistrictAnchors = {
  bowlDoor: { x: number; z: number };
  pier: { x: number; z: number };
  bait: { x: number; z: number };
  meetStart: { x: number; z: number };
  truckOrder: { x: number; z: number };
};

type Pace = (asset: Spawnable, x: number, z: number, pts: { x: number; z: number }[], speed: number) => void;

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function solid(solids: Solid[], minX: number, maxX: number, minZ: number, maxZ: number) {
  solids.push({ minX, maxX, minZ, maxZ });
}

function glowMat(color: number, intensity = 0.55) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
  });
  return mat;
}

function sign(title: string, sub: string, titleColor: string, subColor: string) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#10080e";
  g.fillRect(0, 0, 768, 320);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = titleColor;
  g.font = "700 120px sans-serif";
  g.fillText(title, 384, 120);
  g.fillStyle = subColor;
  g.font = "700 64px sans-serif";
  g.fillText(sub, 384, 230);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xfff1e4,
    emissiveMap: tex,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
}

function lamp(x: number, y: number, z: number, color: number, parent: THREE.Object3D, into: THREE.PointLight[]) {
  const light = new THREE.PointLight(color, 0, 16, 2);
  light.position.set(x, y, z);
  parent.add(light);
  into.push(light);
}

function road(parent: THREE.Object3D, x: number, z: number, w: number, d: number, asphalt: THREE.Material) {
  box(w, 0.06, d, x, 0.03, z, asphalt, parent);
  addGround({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y: 0.06 });
}

function walk(parent: THREE.Object3D, x: number, z: number, w: number, d: number) {
  box(w, 0.1, d, x, 0.12, z, concreteSlab(Math.round(x + z)), parent);
  addGround({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y: 0.17 });
}

/** Bowling, river, food trucks, and the night-run meet. All on the same street graph. */
export function buildDistricts(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
  pace: Pace,
): DistrictAnchors {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.92 });
  const brick = new THREE.MeshStandardMaterial({ color: 0x2a2428, roughness: 0.86 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 });
  const pink = glowMat(0xff3ea5, 0.8);
  const warm = glowMat(0xffb45a, 0.45);
  glow.push(pink, warm);

  bowling(parent, solids, glow, lamps, brick, pink, asphalt);
  river(parent, solids, glow, lamps, asphalt, wood, warm);
  trucks(parent, solids, glow, lamps, warm);
  meet(parent, solids, glow, lamps, asphalt, warm);

  pace(characters.pedestrian.female02, 90, -10.2, [
    { x: 78, z: -10.2 },
    { x: 102, z: -10.2 },
  ], 0.9);
  pace(characters.pedestrian.male02, -16, -40, [
    { x: -16, z: -14 },
    { x: -16, z: -58 },
  ], 0.95);
  pace(characters.pedestrian.female01, 70, 20, [
    { x: 62, z: 20 },
    { x: 82, z: 20 },
  ], 0.8);
  pace(characters.pedestrian.male04, -36, -30.2, [
    { x: -50, z: -30.2 },
    { x: -24, z: -30.2 },
  ], 0.85);

  return {
    bowlDoor: { x: 92, z: -15.2 },
    pier: { x: -16, z: -70 },
    bait: { x: -30, z: -55.6 },
    meetStart: { x: -40, z: -36 },
    truckOrder: { x: 72, z: 20 },
  };
}

function bowling(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
  brick: THREE.Material,
  pink: THREE.Material,
  asphalt: THREE.Material,
) {
  const x = 92;
  const z = -24;
  road(parent, 94, 0, 28, 9.1, asphalt);
  walk(parent, 94, -6.35, 28, 2.35);
  walk(parent, 92, -11.2, 6, 7.2);

  const h = 5.4;
  box(0.45, h, 16.4, x - 9, h / 2, z, brick, parent);
  box(0.45, h, 16.4, x + 9, h / 2, z, brick, parent);
  box(18.4, h, 0.45, x, h / 2, z - 8, brick, parent);
  box(7.6, h, 0.4, x - 5.2, h / 2, z + 8, brick, parent);
  box(7.6, h, 0.4, x + 5.2, h / 2, z + 8, brick, parent);
  box(18.6, 0.28, 16.8, x, 5.5, z, brick, parent);
  box(18.4, 0.16, 0.16, x, 5.35, z + 8.2, pink, parent);
  box(0.14, 3.4, 0.14, x - 1.35, 2.4, z + 8.25, pink, parent);
  box(0.14, 3.4, 0.14, x + 1.35, 2.4, z + 8.25, pink, parent);
  const face = sign("901", "BOWL", "#ff4fd8", "#7af0ff");
  glow.push(face);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3), face);
  board.position.set(x, 4.15, z + 8.35);
  parent.add(board);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x163044,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    metalness: 0.25,
    emissive: 0x3de0ff,
    emissiveIntensity: 0.25,
  });
  glow.push(glass);
  box(2.5, 2.6, 0.06, x, 1.7, z + 8.15, glass, parent);

  solid(solids, x - 9, x - 1.3, z + 7.6, z + 8.4);
  solid(solids, x + 1.3, x + 9, z + 7.6, z + 8.4);
  solid(solids, x - 9, x + 9, z - 8.2, z - 7.4);
  solid(solids, x - 9.2, x - 8.6, z - 8, z + 8);
  solid(solids, x + 8.6, x + 9.2, z - 8, z + 8);

  const floor = new THREE.MeshStandardMaterial({ color: 0x241820, roughness: 0.8 });
  box(16.4, 0.08, 14.4, x, 0.08, z, floor, parent);
  addGround({ minX: x - 8.2, maxX: x + 8.2, minZ: z - 7.2, maxZ: z + 7.6, y: 0.12 });
  const lane = new THREE.MeshStandardMaterial({ color: 0xc9844a, roughness: 0.55 });
  const gutter = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const lx = x - 4.5 + i * 2.3;
    box(1.15, 0.02, 12, lx, 0.14, z - 0.6, lane, parent);
    box(0.18, 0.03, 12, lx - 0.72, 0.14, z - 0.6, gutter, parent);
    box(0.18, 0.03, 12, lx + 0.72, 0.14, z - 0.6, gutter, parent);
    for (let p = 0; p < 4; p++) box(0.08, 0.28, 0.08, lx - 0.18 + (p % 2) * 0.28, 0.3, z - 6.2 + Math.floor(p / 2) * 0.28, new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.45 }), parent);
  }
  const seat = new THREE.MeshStandardMaterial({ color: 0x8e2438, roughness: 0.6 });
  box(1.4, 0.45, 6, x - 7.2, 0.4, z + 1, seat, parent);
  box(1.4, 0.45, 6, x + 7.2, 0.4, z + 1, seat, parent);
  solid(solids, x - 8, x - 6.4, z - 2, z + 4);
  solid(solids, x + 6.4, x + 8, z - 2, z + 4);
  box(2.2, 1.1, 0.4, x - 6.6, 1.3, z + 4.5, new THREE.MeshStandardMaterial({ color: 0x6a4328, roughness: 0.7 }), parent);
  lamp(x, 4.4, z + 6, 0xff4fd8, parent, lamps);
  lamp(x, 3.2, z - 2, 0xffb45a, parent, lamps);
}

function river(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
  asphalt: THREE.Material,
  wood: THREE.Material,
  warm: THREE.Material,
) {
  road(parent, -16, -36, 8, 52, asphalt);
  walk(parent, -20.6, -36, 2.2, 52);
  walk(parent, -11.4, -36, 2.2, 52);
  for (let z = -16; z > -58; z -= 10) {
    streetTree(-24, z, parent, 1);
    palmTree(-8, z - 3, parent);
  }

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1c4d6e, roughness: 0.18, metalness: 0.35, emissive: 0x0c2a40, emissiveIntensity: 0.25 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 36), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, -84);
  parent.add(water);
  walk(parent, -8, -64, 70, 4.2);

  const pierY = 0.42;
  box(4.2, 0.16, 16, -16, pierY, -72, wood, parent);
  addGround({ minX: -18.1, maxX: -13.9, minZ: -80, maxZ: -64, y: pierY + 0.08 });
  for (const pz of [-66, -70, -74, -78]) {
    box(0.22, 1.3, 0.22, -18.3, 0.5, pz, wood, parent);
    box(0.22, 1.3, 0.22, -13.7, 0.5, pz, wood, parent);
  }
  box(4.6, 0.08, 0.08, -16, 1.05, -78.5, wood, parent);
  solid(solids, -18.6, -18.1, -80, -64);
  solid(solids, -13.9, -13.4, -80, -64);

  const shack = new THREE.MeshStandardMaterial({ color: 0x6e4a32, roughness: 0.8 });
  box(5.5, 3.2, 4.2, -30, 1.6, -60, shack, parent);
  solid(solids, -32.8, -27.2, -62.2, -57.8);
  const bait = sign("BAIT", "TACKLE", "#e0b33a", "#f4efe4");
  glow.push(bait);
  const baitBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.3), bait);
  baitBoard.position.set(-30, 2.6, -57.8);
  parent.add(baitBoard);
  box(1.4, 0.8, 0.6, -27.2, 0.55, -58.6, new THREE.MeshStandardMaterial({ color: 0x2c4a38, roughness: 0.6 }), parent);

  const steel = new THREE.MeshStandardMaterial({ color: 0x6a5538, roughness: 0.45, metalness: 0.4 });
  box(28, 0.35, 1.2, 8, 7.2, -86, steel, parent);
  box(0.35, 7.4, 0.35, -6, 3.6, -86, steel, parent);
  box(0.35, 7.4, 0.35, 22, 3.6, -86, steel, parent);
  box(26, 0.2, 0.2, 8, 9.2, -86, steel, parent);
  for (let i = 0; i < 6; i++) box(0.12, 2.4, 0.12, -4 + i * 4.6, 8.2, -86, warm, parent);

  lamp(-16, 3.2, -66, 0xffb45a, parent, lamps);
  lamp(-30, 3.4, -58, 0xffb45a, parent, lamps);
  for (const tz of [-48, -58]) box(3.2, 16 + (tz % 7), 3.2, 6, 8, tz, new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.7, emissive: 0xffe0b0, emissiveIntensity: 0.04 }), parent);
}

function trucks(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
  warm: THREE.Material,
) {
  walk(parent, 72, 13, 4, 10);
  walk(parent, 72, 22, 22, 14);
  const colors = [0xe0b33a, 0xc4473a, 0x2f6a4a];
  const names = ["CROWN", "901", "SOUL"];
  names.forEach((name, i) => {
    const x = 62 + i * 8;
    const body = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.55, metalness: 0.15 });
    const cab = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 });
    box(3.1, 2.35, 5.2, x, 1.55, 27.2, body, parent);
    box(2.5, 1.55, 1.7, x, 1.15, 24.1, cab, parent);
    box(2.7, 0.9, 0.08, x, 1.35, 23.22, new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.15, metalness: 0.2, emissive: 0xffb45a, emissiveIntensity: 0.15 }), parent);
    box(3.3, 0.08, 1.6, x, 2.7, 23.4, warm, parent);
    for (const wz of [25.4, 29.1]) {
      for (const wx of [-1.35, 1.35]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.24, 10),
          new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.85 }),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + wx, 0.38, wz);
        parent.add(wheel);
      }
    }
    solid(solids, x - 1.7, x + 1.7, 24.4, 29.8);
    const mat = sign(name, "ORDER", "#1a1208", "#e0b33a");
    glow.push(mat);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.15), mat);
    board.position.set(x, 2.35, 23.12);
    parent.add(board);
    lamp(x, 3.4, 24, 0xffb45a, parent, lamps);
  });
  const table = new THREE.MeshStandardMaterial({ color: 0x6a4328, roughness: 0.75 });
  for (const tx of [66, 76]) {
    box(2.4, 0.08, 1.1, tx, 0.78, 18.5, table, parent);
    box(0.12, 0.7, 0.12, tx - 1, 0.4, 18.1, table, parent);
    box(0.12, 0.7, 0.12, tx + 1, 0.4, 18.1, table, parent);
    box(0.12, 0.7, 0.12, tx - 1, 0.4, 18.9, table, parent);
    box(0.12, 0.7, 0.12, tx + 1, 0.4, 18.9, table, parent);
    solid(solids, tx - 1.3, tx + 1.3, 17.9, 19.1);
  }
  const menu = sign("MENU", "EAT", "#ffb45a", "#f4efe4");
  glow.push(menu);
  const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), menu);
  menuBoard.position.set(84, 2.2, 24);
  parent.add(menuBoard);
  box(0.12, 2.4, 0.12, 84, 1.2, 24.1, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }), parent);
  for (let i = 0; i < 8; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), warm);
    bulb.position.set(60 + i * 3.2, 3.6, 21);
    parent.add(bulb);
  }
}

function meet(
  parent: THREE.Object3D,
  solids: Solid[],
  glow: THREE.MeshStandardMaterial[],
  lamps: THREE.PointLight[],
  asphalt: THREE.Material,
  warm: THREE.Material,
) {
  road(parent, -38, -36, 40, 8, asphalt);
  walk(parent, -38, -30.4, 36, 2.2);
  const paint = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.5 });
  box(0.35, 0.02, 6, -40, 0.08, -36, paint, parent);
  box(0.35, 0.02, 6, -19.2, 0.08, -36, paint, parent);
  box(8, 0.2, 0.2, -40, 4.2, -32.2, paint, parent);
  box(0.12, 4.2, 0.12, -44, 2.1, -32.2, paint, parent);
  box(0.12, 4.2, 0.12, -36, 2.1, -32.2, paint, parent);
  const start = sign("START", "901", "#f4efe4", "#e0b33a");
  glow.push(start);
  const startBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.3), start);
  startBoard.position.set(-40, 3.5, -32.05);
  parent.add(startBoard);
  const finish = sign("FINISH", "901", "#39ff14", "#e0b33a");
  glow.push(finish);
  const finishBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), finish);
  finishBoard.position.set(-19.2, 3.2, -32.05);
  parent.add(finishBoard);
  box(0.12, 3.4, 0.12, -21.4, 1.7, -32.2, paint, parent);
  box(0.12, 3.4, 0.12, -17, 1.7, -32.2, paint, parent);

  const shop = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.75 });
  box(10, 4.2, 6, -50, 2.1, -26, shop, parent);
  solid(solids, -55, -45, -29, -23);
  const mod = sign("MOD", "SHOP", "#ff4d4d", "#f4efe4");
  glow.push(mod);
  const modBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), mod);
  modBoard.position.set(-50, 3.2, -22.9);
  parent.add(modBoard);

  for (const [cx, kind] of [
    [-30, "coupe"],
    [-24, "sedan"],
    [-46, "suv"],
    [-34, "coupe"],
  ] as const) {
    const car = carBody(kind);
    car.position.set(cx, 0, -33.2);
    car.rotation.y = Math.PI;
    parent.add(car);
    solid(solids, cx - 1.1, cx + 1.1, -35.2, -31.2);
  }
  lamp(-40, 5, -34, 0xffe0b0, parent, lamps);
  lamp(-50, 4.2, -24, 0xff4d4d, parent, lamps);
  box(12, 0.9, 0.08, -28, 0.7, -39.2, warm, parent);
}
