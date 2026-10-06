import * as THREE from "three";
import type { Solid } from "../core/types";
import { addGround } from "./ground";
import { buildGoal } from "./kits/hoop";

export type HauntWorld = {
  group: THREE.Group;
  lights: THREE.PointLight[];
  gate: { x: number; z: number };
  ticket: { x: number; z: number };
  out: { x: number; z: number };
  inside: { x: number; z: number };
  exit: { x: number; z: number };
  finalRoom: { minX: number; maxX: number; minZ: number; maxZ: number };
};

const OX = 0;
const OZ = 500;

const ROOM_ART: Record<string, string> = {
  FOYER: "/game-v2/places/haunt/foyer.jpg",
  "STAIR HALL": "/game-v2/places/haunt/stair.jpg",
  "PORTRAIT HALL": "/game-v2/places/haunt/portrait.jpg",
  LIBRARY: "/game-v2/places/haunt/library.jpg",
  ATTIC: "/game-v2/places/haunt/attic.jpg",
  "TOY ROOM": "/game-v2/places/haunt/toy.jpg",
  "DINING HALL": "/game-v2/places/haunt/dining.jpg",
  SEANCE: "/game-v2/places/haunt/seance.jpg",
  KITCHEN: "/game-v2/places/haunt/kitchen.jpg",
  BOILER: "/game-v2/places/haunt/boiler.jpg",
  "FINAL COURT": "/game-v2/places/haunt/final.jpg",
};

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function roomSign(title: string, x: number, y: number, z: number, parent: THREE.Object3D) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14080c";
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = "#ff3a2a";
  g.font = "800 54px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.PI;
  parent.add(mesh);
}

function artPlane(url: string, w: number, h: number, x: number, y: number, z: number, rotY: number, parent: THREE.Object3D) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xfff4ea,
    emissiveMap: tex,
    emissiveIntensity: 0.55,
    roughness: 0.62,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

function layRoom(url: string, x: number, z: number, parent: THREE.Object3D) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.15, 6.5), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.1, z);
  parent.add(mesh);
}

function hangArt(url: string, w: number, h: number, x: number, y: number, z: number, rotY: number, parent: THREE.Object3D) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.rotation.y = rotY;
  const frame = new THREE.MeshStandardMaterial({ color: 0xc9a15b, roughness: 0.4, metalness: 0.4 });
  const plane = artPlane(url, w, h, 0, 0, 0.02, 0, holder);
  plane.position.z = 0.02;
  box(w + 0.16, 0.08, 0.08, 0, h / 2 + 0.02, 0, frame, holder);
  box(w + 0.16, 0.08, 0.08, 0, -h / 2 - 0.02, 0, frame, holder);
  box(0.08, h + 0.16, 0.08, -w / 2 - 0.02, 0, 0, frame, holder);
  box(0.08, h + 0.16, 0.08, w / 2 + 0.02, 0, 0, frame, holder);
  parent.add(holder);
}

function canvasWet() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#140c10";
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 28; i++) {
    g.fillStyle = i % 2 ? "rgba(180,30,24,0.22)" : "rgba(40,16,18,0.45)";
    g.fillRect((i * 47) % 480, 20 + ((i * 29) % 200), 36 + (i % 4) * 18, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function woodCourt() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6a4630";
  g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 28) {
    g.fillStyle = x % 56 === 0 ? "#5a3824" : "#7a5438";
    g.fillRect(x, 0, 26, 512);
  }
  g.strokeStyle = "#f2efe6";
  g.lineWidth = 6;
  g.strokeRect(24, 24, 464, 464);
  g.beginPath();
  g.moveTo(256, 24);
  g.lineTo(256, 488);
  g.stroke();
  g.strokeStyle = "#ff4a12";
  g.lineWidth = 4;
  g.strokeRect(24, 150, 140, 212);
  g.beginPath();
  g.arc(256, 256, 70, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#1a0906";
  g.beginPath();
  g.ellipse(256, 250, 46, 34, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffb15a";
  g.beginPath();
  g.ellipse(242, 246, 5, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(270, 246, 5, 8, 0, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dressApproach(exterior: THREE.Object3D, solids: Solid[], glow: THREE.MeshStandardMaterial[], hx: number, frontZ: number) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x140e10, roughness: 0.55, metalness: 0.3 });
  const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xe85a12, emissive: 0xff5a18, emissiveIntensity: 0.35, roughness: 0.48 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffd2a0, emissive: 0xffb45a, emissiveIntensity: 0.7, roughness: 0.35 });
  glow.push(warm);
  const boothX = hx - 10.6;
  const boothZ = frontZ - 4.6;
  box(0.12, 1.7, 0.12, boothX - 1.15, 0.85, boothZ, dark, exterior);
  box(0.12, 1.7, 0.12, boothX + 1.15, 0.85, boothZ, dark, exterior);
  const sign = signPlane("TICKETS  $10", "#ff4a12", 2.5, 0.62);
  sign.position.set(boothX, 1.85, boothZ);
  sign.rotation.y = Math.PI;
  exterior.add(sign);
  solids.push({ minX: boothX - 1.3, maxX: boothX + 1.3, minZ: boothZ - 0.2, maxZ: boothZ + 0.2 });
  const pumpkin = (x: number, z: number, s: number) => {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 14, 12), pumpkinMat);
    body.scale.set(1.05, 0.82, 1.05);
    body.position.set(x, 0.28 * s, z);
    body.castShadow = true;
    exterior.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.14 * s, 6), dark);
    stem.position.set(x, 0.52 * s, z);
    exterior.add(stem);
    const slit = new THREE.MeshStandardMaterial({ color: 0x2a1008, emissive: 0xffc56a, emissiveIntensity: 0.45 });
    for (const ox of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.07 * s, 0.05), slit);
      eye.position.set(x + ox * s, 0.32 * s, z - 0.26 * s);
      exterior.add(eye);
    }
  };
  pumpkin(hx - 6.4, frontZ - 5.2, 1.15);
  pumpkin(hx - 4.6, frontZ - 5.5, 0.8);
  pumpkin(hx + 5.2, frontZ - 5.3, 1.2);
  pumpkin(hx + 7.1, frontZ - 5.6, 0.85);
  pumpkin(hx + 3.1, frontZ - 5.15, 0.7);
  const rail = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.07), dark);
    bar.position.set((x1 + x2) / 2, 0.95, (z1 + z2) / 2);
    bar.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
    exterior.add(bar);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    for (const [px, pz] of [
      [x1, z1],
      [midX, midZ],
      [x2, z2],
    ] as const) box(0.08, 1.05, 0.08, px, 0.52, pz, dark, exterior);
  };
  rail(hx - 4.6, frontZ - 4.6, hx - 1.35, frontZ - 4.6);
  rail(hx + 1.35, frontZ - 4.6, hx + 4.8, frontZ - 4.6);
  for (let i = 0; i < 11; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), warm);
    bulb.position.set(hx - 9 + i * 1.8, 4.55, frontZ - 0.45);
    exterior.add(bulb);
  }
}

function signPlane(title: string, color: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#12080a";
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = color;
  g.font = "800 54px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  return mesh;
}

const ROOMS: { name: string; x: number; z: number; color: number; light: number }[] = [
  { name: "FOYER", x: 0, z: 0, color: 0x4a181c, light: 0xff6a4a },
  { name: "STAIR HALL", x: 8, z: 0, color: 0x3a2214, light: 0xffc56a },
  { name: "PORTRAIT HALL", x: 16, z: 0, color: 0x32141c, light: 0xff4455 },
  { name: "LIBRARY", x: 24, z: 0, color: 0x2a1c10, light: 0xf0c14a },
  { name: "ATTIC", x: 32, z: 0, color: 0x161820, light: 0x9ab0ff },
  { name: "TOY ROOM", x: 0, z: 8, color: 0x24143a, light: 0xc46bff },
  { name: "DINING HALL", x: 8, z: 8, color: 0x3a1612, light: 0xff7a3a },
  { name: "SEANCE", x: 16, z: 8, color: 0x1c122c, light: 0xd9a0ff },
  { name: "KITCHEN", x: 24, z: 8, color: 0x321816, light: 0xff4a32 },
  { name: "BOILER", x: 32, z: 8, color: 0x102018, light: 0x4dff88 },
  { name: "FINAL COURT", x: 40, z: 8, color: 0x14160e, light: 0xd8ff6a },
];

/** Seasonal house on the west end of the block, plus the walkable room graph. */
export function buildHaunt(exterior: THREE.Object3D, streetSolids: Solid[], glow: THREE.MeshStandardMaterial[], lamps: THREE.PointLight[]): { world: HauntWorld; solids: Solid[] } {
  const stone = new THREE.MeshStandardMaterial({ color: 0x1a1416, roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x120c0e, roughness: 0.72 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0e0c0c, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff1a1a, emissiveIntensity: 0.8, roughness: 0.4 });
  glow.push(red);

  const hx = -78;
  const hz = 16;
  const frontZ = hz - 6.15;

  // Depth behind the painted front so the house is a building, not a card, from the side.
  box(20, 9.2, 10.4, hx, 4.6, hz + 0.4, stone, exterior);
  box(5.4, 12.4, 5.2, hx - 7.2, 6.2, hz + 1.2, stone, exterior);
  box(5.2, 13.2, 5.2, hx + 7.4, 6.6, hz + 1.4, stone, exterior);
  const leftSpire = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3.4, 4), roof);
  leftSpire.position.set(hx - 7.2, 13.6, hz + 1.2);
  leftSpire.rotation.y = Math.PI / 4;
  exterior.add(leftSpire);
  const rightSpire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.8, 4), roof);
  rightSpire.position.set(hx + 7.4, 14.6, hz + 1.4);
  rightSpire.rotation.y = Math.PI / 4;
  exterior.add(rightSpire);
  const gable = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4), roof);
  gable.position.set(hx, 10.6, hz + 0.2);
  gable.rotation.y = Math.PI / 4;
  gable.scale.set(1.35, 1, 0.72);
  exterior.add(gable);
  streetSolids.push({ minX: hx - 12.2, maxX: hx + 12.2, minZ: frontZ - 0.2, maxZ: hz + 5.6 });

  const facadeTex = new THREE.TextureLoader().load("/game-v2/places/haunt/facade.png");
  facadeTex.colorSpace = THREE.SRGBColorSpace;
  facadeTex.repeat.set(1, 0.8);
  facadeTex.offset.set(0, 0.2);
  const facade = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 11.2),
    new THREE.MeshBasicMaterial({ map: facadeTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }),
  );
  facade.position.set(hx, 5.8, frontZ);
  facade.rotation.y = Math.PI;
  facade.scale.x = -1;
  exterior.add(facade);

  const wetTex = canvasWet();
  const wet = new THREE.MeshStandardMaterial({
    map: wetTex,
    emissive: 0xff2a18,
    emissiveMap: wetTex,
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.45,
  });
  glow.push(wet);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wet);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(hx, 0.045, 6.6);
  exterior.add(plaza);
  addGround({ minX: hx - 20, maxX: hx + 18, minZ: 0.2, maxZ: 12.4, y: 0.06 });

  const porch = new THREE.PointLight(0xff3a22, 0, 22, 2);
  porch.position.set(hx, 5.2, frontZ - 1.4);
  exterior.add(porch);
  lamps.push(porch);
  const ticketGlow = new THREE.PointLight(0xffb45a, 0, 10, 2);
  ticketGlow.position.set(hx - 8.2, 2.4, frontZ - 2.4);
  exterior.add(ticketGlow);
  lamps.push(ticketGlow);

  dressApproach(exterior, streetSolids, glow, hx, frontZ);

  for (const tx of [hx - 14, hx + 14]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.2, 6), trim);
    trunk.position.set(tx, 1.6, hz - 2);
    exterior.add(trunk);
    for (const ang of [-0.8, 0.2, 1.1]) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.4, 4), trim);
      branch.position.set(tx + Math.sin(ang) * 0.5, 2.9, hz - 2);
      branch.rotation.z = ang;
      exterior.add(branch);
    }
  }

  const mist = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 10),
    new THREE.MeshBasicMaterial({ color: 0x6a3a78, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  mist.rotation.x = -Math.PI / 2;
  mist.position.set(hx, 0.12, 8.2);
  exterior.add(mist);

  const group = new THREE.Group();
  group.position.set(OX, 0, OZ);
  group.visible = false;
  const solids: Solid[] = [];
  const lights: THREE.PointLight[] = [];
  const wall = new THREE.MeshStandardMaterial({ color: 0x211418, roughness: 0.86 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xc9a15b, roughness: 0.45, metalness: 0.35 });

  for (const room of ROOMS) {
    const floor = new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.78 });
    box(7.7, 0.08, 7.5, room.x + 4, 0.04, room.z + 4, floor, group);
    const art = ROOM_ART[room.name];
    if (art) {
      if (room.name === "FINAL COURT") {
        hangArt(art, 7.2, 3.9, room.x + 7.62, 2.05, room.z + 4, -Math.PI / 2, group);
      } else if (room.name === "FOYER") {
        hangArt(art, 6.8, 3.85, room.x + 0.28, 2.05, room.z + 4, Math.PI / 2, group);
        layRoom(art, room.x + 4, room.z + 4, group);
      } else if (room.z === 0) {
        hangArt(art, 7.2, 3.85, room.x + 4, 2.05, room.z + 0.28, 0, group);
        layRoom(art, room.x + 4, room.z + 4, group);
      } else {
        hangArt(art, 7.2, 3.85, room.x + 4, 2.05, room.z + 7.55, Math.PI, group);
        layRoom(art, room.x + 4, room.z + 4, group);
      }
    }
    roomSign(room.name, room.x + 4, 3.72, room.z + 7.15, group);
    const light = new THREE.PointLight(room.light, 0, 10, 2);
    light.position.set(room.x + 4, 2.7, room.z + 4);
    group.add(light);
    lights.push(light);
  }
  addGround({ minX: 0, maxX: 48, minZ: OZ, maxZ: OZ + 16, y: 0.06 });

  dressRooms(group, glow);

  const h = 4.35;
  box(48, h, 0.2, 24, h / 2, 15.9, wall, group);
  solids.push({ minX: 0, maxX: 48, minZ: 15.7, maxZ: 16.1 });
  box(48, h, 0.2, 24, h / 2, 0, wall, group);
  solids.push({ minX: 0, maxX: 48, minZ: -0.2, maxZ: 0.2 });
  box(0.2, h, 16, 0, h / 2, 8, wall, group);
  box(0.2, h, 8, 40, h / 2, 4, wall, group);
  box(0.2, h, 8, 48, h / 2, 12, wall, group);
  solids.push({ minX: -0.2, maxX: 0.2, minZ: 0, maxZ: 16 });
  solids.push({ minX: 39.85, maxX: 40.15, minZ: 0, maxZ: 7.9 });
  solids.push({ minX: 47.8, maxX: 48.2, minZ: 8, maxZ: 16 });
  box(48, 0.16, 16.2, 24, 4.42, 8, trim, group);

  for (const x of [8, 16, 24, 32]) {
    box(0.16, h, 2.6, x, h / 2, 1.4, wall, group);
    box(0.16, h, 2.6, x, h / 2, 6.4, wall, group);
    solids.push({ minX: x - 0.15, maxX: x + 0.15, minZ: 0.1, maxZ: 2.8 });
    solids.push({ minX: x - 0.15, maxX: x + 0.15, minZ: 5, maxZ: 7.9 });
  }
  box(0.16, h, 2.6, 40, h / 2, 9.4, wall, group);
  box(0.16, h, 2.6, 40, h / 2, 14.4, wall, group);
  solids.push({ minX: 39.85, maxX: 40.15, minZ: 8.1, maxZ: 10.8 });
  solids.push({ minX: 39.85, maxX: 40.15, minZ: 13, maxZ: 15.9 });
  for (const x of [4, 12, 20, 28, 36]) {
    box(2.4, h, 0.16, x - 2.2, h / 2, 8, wall, group);
    box(2.4, h, 0.16, x + 2.2, h / 2, 8, wall, group);
    solids.push({ minX: x - 3.5, maxX: x - 0.9, minZ: 7.85, maxZ: 8.15 });
    solids.push({ minX: x + 0.9, maxX: x + 3.5, minZ: 7.85, maxZ: 8.15 });
  }
  box(8, h, 0.16, 44, h / 2, 8, wall, group);
  solids.push({ minX: 40, maxX: 48, minZ: 7.85, maxZ: 8.15 });

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x8e1a16, emissive: 0xff2a1a, emissiveIntensity: 0.35, roughness: 0.5 }),
  );
  door.position.set(4, 1.2, 0.16);
  group.add(door);

  // Faces the boiler door (west). Rim stays at the playable height.
  buildGoal(45.5, 12.2, -1, group);

  return {
    solids,
    world: {
      group,
      lights,
      gate: { x: hx, z: frontZ - 1.55 },
      ticket: { x: hx - 10.6, z: frontZ - 5.5 },
      out: { x: hx, z: frontZ - 2.6 },
      inside: { x: 4, z: OZ + 2.8 },
      exit: { x: 4, z: 1.2 },
      finalRoom: { minX: 40.2, maxX: 47.6, minZ: OZ + 8.2, maxZ: OZ + 15.6 },
    },
  };
}

function dressRooms(group: THREE.Group, glow: THREE.MeshStandardMaterial[]) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4030, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a140e, roughness: 0.65 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7a1838, roughness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4b15a, roughness: 0.4, metalness: 0.45 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a746c, roughness: 0.35, metalness: 0.55 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xf2e2b8, emissive: 0xffc56a, emissiveIntensity: 0.7, roughness: 0.5 });
  glow.push(wax);

  box(1.3, 0.04, 5.4, 4, 0.08, 3.2, cloth, group);

  for (let i = 0; i < 5; i++) box(1.5, 0.16, 0.7, 10.2, 0.2 + i * 0.28, 2.2 + i * 0.55, wood, group);
  box(0.9, 1.1, 0.9, 13.4, 0.55, 5.4, wood, group);

  for (let i = 0; i < 4; i++) {
    box(1.15, 1.7, 0.06, 17.2 + (i % 2) * 1.5, 1.55, 1.15 + Math.floor(i / 2) * 2.2, cloth, group);
    box(1.3, 0.08, 0.08, 17.2 + (i % 2) * 1.5, 2.45, 1.15 + Math.floor(i / 2) * 2.2, gold, group);
  }

  for (let i = 0; i < 5; i++) box(0.55, 2.15, 1.7, 24.7, 1.1, 1.15 + i * 1.15, wood, group);
  box(1.8, 0.75, 0.8, 27.2, 0.45, 4.6, wood, group);

  for (let i = 0; i < 4; i++) box(0.12, 0.12, 3.6, 33.2 + i * 0.7, 2.55, 3.2, wood, group);
  box(1.6, 0.7, 0.9, 35.2, 0.4, 5.2, wood, group);

  const dollHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf0d2c0, roughness: 0.6 }));
  dollHead.position.set(2.4, 1.55, 11.2);
  group.add(dollHead);
  box(0.7, 0.9, 0.45, 2.4, 0.7, 11.2, new THREE.MeshStandardMaterial({ color: 0x6a2cff, roughness: 0.5 }), group);
  for (const [bx, bz] of [[1.2, 13.2], [3.4, 13.4], [2.2, 14.2]] as const) box(0.35, 0.35, 0.35, bx, 0.2, bz, cloth, group);

  box(4.4, 0.12, 1.35, 12, 0.78, 12.2, wood, group);
  for (const cx of [10.2, 11.4, 12.6, 13.6]) box(0.12, 0.7, 0.12, cx, 0.4, 11.5, wood, group);
  for (const cx of [10.6, 12, 13.2]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6), wax);
    candle.position.set(cx, 1.05, 12.2);
    group.add(candle);
  }

  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 16), dark);
  table.position.set(20, 0.75, 12);
  group.add(table);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 6), wax);
    candle.position.set(20 + Math.cos(a) * 0.55, 0.95, 12 + Math.sin(a) * 0.55);
    group.add(candle);
  }

  box(3.6, 0.9, 0.7, 26.2, 0.5, 9.6, metal, group);
  box(2.2, 0.15, 0.8, 29.4, 0.9, 13.4, wood, group);
  for (const px of [25.4, 26.4, 27.2]) {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), metal);
    pot.position.set(px, 1.15, 9.6);
    group.add(pot);
  }

  for (const [px, pz, len] of [[33.2, 10.4, 2.4], [35.6, 13.5, 1.8]] as const) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 8), metal);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(px, 1.6, pz);
    group.add(pipe);
  }
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x39ff7a, emissive: 0x39ff7a, emissiveIntensity: 1.1, roughness: 0.3 }),
  );
  core.position.set(34.4, 1.1, 12.2);
  group.add(core);

  const courtTex = woodCourt();
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 5.6),
    new THREE.MeshStandardMaterial({
      map: courtTex,
      emissive: 0xffffff,
      emissiveMap: courtTex,
      emissiveIntensity: 0.28,
      roughness: 0.42,
      metalness: 0.12,
    }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.set(44, 0.09, 12.2);
  group.add(court);
  const line = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.4, emissive: 0xe0b33a, emissiveIntensity: 0.25 });
  box(6.2, 0.02, 0.06, 44, 0.11, 9.7, line, group);
  box(6.2, 0.02, 0.06, 44, 0.11, 14.7, line, group);
  box(0.06, 0.02, 5.1, 41.1, 0.11, 12.2, line, group);
  box(0.06, 0.02, 5.1, 46.9, 0.11, 12.2, line, group);
}
