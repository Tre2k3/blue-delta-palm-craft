import * as THREE from "three";
import { STREETS, TILE, WORLD_PX_W, WORLD_W } from "./data";
import { WorldLifePass } from "./worldLifePass";
import { wx, wz, type WorldFrame } from "./world3dCore";
import { cityBlockBuildings, courtHole, inCourtPx, inRiverPx, isRoadPoint, RIVER_TILE_Y } from "./worldTopology";

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function grassMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#2a6a32";
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) {
    g.fillStyle = x % 16 === 0 ? "#245e2c" : "#34803c";
    g.fillRect(x, 0, 8, 256);
  }
  g.fillStyle = "rgba(92, 68, 36, 0.45)";
  for (let i = 0; i < 28; i++) {
    g.beginPath();
    g.ellipse((i * 47) % 256, (i * 83) % 256, 10 + (i % 4) * 4, 6, 0.4, 0, Math.PI * 2);
    g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.96, metalness: 0 });
}

function wearMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = "rgba(8, 8, 8, 0.35)";
  for (let i = 0; i < 10; i++) {
    g.beginPath();
    g.ellipse((i * 37) % 256, 32, 18, 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = "rgba(0, 0, 0, 0.28)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 20);
  g.lineTo(256, 44);
  g.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 1);
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0.55 });
}

function dressLawns(scene: THREE.Scene) {
  const lawns = scene.getObjectByName("console-lawns");
  if (!lawns) return null;
  const mat = grassMaterial();
  for (const child of lawns.children) {
    if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.PlaneGeometry)) continue;
    const { width, height } = child.geometry.parameters;
    child.material = mat;
    const tex = mat.map;
    if (tex) {
      tex.repeat.set(Math.max(1, width / 8), Math.max(1, height / 8));
    }
  }
  return mat;
}

function addStreetWear(root: THREE.Group, mat: THREE.Material) {
  const half = wx(TILE * 0.78);
  const court = courtHole();
  for (const street of STREETS) {
    if (street.axis === "y") {
      const cy = street.tile * TILE;
      const overlaps = cy > court.y - 20 && cy < court.y + court.h + 20;
      const spans: { x: number; w: number }[] = overlaps
        ? [
            { x: 0, w: Math.max(0, court.x - 24) },
            { x: court.x + court.w + 24, w: Math.max(0, WORLD_PX_W - (court.x + court.w + 24)) },
          ]
        : [{ x: 0, w: WORLD_PX_W }];
      for (const span of spans) {
        if (span.w < 80) continue;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wx(span.w), half * 2), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(wx(span.x + span.w / 2), 0.132, wz(cy));
        root.add(mesh);
      }
    } else {
      const cx = street.tile * TILE;
      const overlaps = cx > court.x - 20 && cx < court.x + court.w + 20;
      const end = RIVER_TILE_Y * TILE;
      const spans: { y: number; h: number }[] = overlaps
        ? [
            { y: 0, h: Math.max(0, court.y - 24) },
            { y: court.y + court.h + 24, h: Math.max(0, end - (court.y + court.h + 24)) },
          ]
        : [{ y: 0, h: end }];
      for (const span of spans) {
        if (span.h < 80) continue;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, wz(span.h)), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(wx(cx), 0.132, wz(span.y + span.h / 2));
        root.add(mesh);
      }
    }
  }
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, places: THREE.Matrix4[]) {
  if (!places.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, places.length);
  places.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

function mat4(x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.rotation.y = rotY;
  o.scale.set(sx, sy, sz);
  o.updateMatrix();
  return o.matrix.clone();
}

function clearSpot(x: number, y: number) {
  return !inCourtPx(x, y) && !inRiverPx(x, y) && !isRoadPoint(x, y, 10);
}

function dressBlocks(root: THREE.Group) {
  const buildings = cityBlockBuildings();
  const shrubs: THREE.Matrix4[] = [];
  const trees: THREE.Matrix4[] = [];
  const trunks: THREE.Matrix4[] = [];
  const fences: THREE.Matrix4[] = [];
  const windows: THREE.Matrix4[] = [];
  const awnings: THREE.Matrix4[] = [];
  const ac: THREE.Matrix4[] = [];
  const lamps: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];

  for (const street of STREETS) {
    if (street.axis === "y") {
      const z = wz(street.tile * TILE);
      const side = wx(TILE * 1.15);
      for (let i = 2; i < WORLD_W - 2; i += 5) {
        const x = wx(i * TILE);
        if (!clearSpot(i * TILE, street.tile * TILE + TILE)) continue;
        lamps.push(mat4(x, 1.35, z + side));
        heads.push(mat4(x, 2.85, z + side));
      }
    } else {
      const x = wx(street.tile * TILE);
      const side = wx(TILE * 1.15);
      const end = RIVER_TILE_Y - 1;
      for (let i = 2; i < end; i += 5) {
        const z = wz(i * TILE);
        if (!clearSpot(street.tile * TILE + TILE, i * TILE)) continue;
        lamps.push(mat4(x + side, 1.35, z));
        heads.push(mat4(x + side, 2.85, z));
      }
    }
  }

  for (const b of buildings) {
    const stories = 1.8 + hash(b.x * 3 + b.y) * 7.5;
    const cx = wx(b.x + b.w / 2);
    const south = wz(b.y + b.h);
    const bw = wx(b.w);
    awnings.push(mat4(cx, Math.min(2.15, stories - 0.3), south + 0.32, 0, Math.max(0.8, bw * 0.92), 1, 1));
    ac.push(mat4(cx + bw * 0.18, stories + 0.22, wz(b.y + b.h * 0.55), hash(b.x) * 1.2));
    const cols = Math.min(5, Math.max(2, Math.floor(bw / 0.85)));
    const rows = Math.min(4, Math.max(1, Math.floor((stories - 0.9) / 1.05)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (windows.length > 260) break;
        const lx = -bw * 0.38 + (c / Math.max(1, cols - 1)) * bw * 0.76;
        const wy = 0.85 + r * 1.02;
        if (wy > stories - 0.45) continue;
        const glow = hash(b.x + c * 4 + r) > 0.42 ? 1 : 0.55;
        windows.push(mat4(cx + lx, wy, south + 0.08, Math.PI, 0.34 * glow, 0.48, 1));
      }
    }
    const yardY = b.y + b.h + 26;
    if (clearSpot(b.x + b.w / 2, yardY)) {
      const span = Math.min(4, Math.floor(b.w / 70));
      for (let i = 0; i < span; i++) {
        const x = b.x + 28 + i * ((b.w - 40) / Math.max(1, span));
        if (!clearSpot(x, yardY)) continue;
        shrubs.push(mat4(wx(x), 0.28, wz(yardY), 0, 0.8 + (i % 3) * 0.15, 0.7 + (i % 2) * 0.25, 0.8));
      }
      const treeY = yardY + 34;
      if (clearSpot(b.x + b.w * 0.35, treeY) && shrubs.length < 180) {
        const tx = wx(b.x + b.w * 0.35);
        const tz = wz(treeY);
        trunks.push(mat4(tx, 0.55, tz));
        trees.push(mat4(tx, 1.7, tz, 0, 0.9 + hash(b.x) * 0.35, 0.85, 0.9));
      }
      if (b.w > 140 && clearSpot(b.x + 20, b.y + b.h + 8)) {
        fences.push(mat4(wx(b.x + b.w / 2), 0.38, wz(b.y + b.h + 14), 0, Math.min(bw * 0.7, 4.5), 1, 1));
      }
    }
  }

  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.86 });
  const shrub = new THREE.MeshStandardMaterial({ color: 0x24562c, roughness: 0.9 });
  const fence = new THREE.MeshStandardMaterial({ color: 0x8a8f92, roughness: 0.45, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xf2d7a2,
    emissive: 0xffb15a,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x1f3d34, roughness: 0.84 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.4, metalness: 0.7 });
  const pole = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.45 });
  const bulb = new THREE.MeshBasicMaterial({ color: 0xffe3a8 });

  const add = (mesh: THREE.InstancedMesh | null) => {
    if (mesh) root.add(mesh);
  };
  add(instanced(new THREE.ConeGeometry(0.28, 0.55, 5), shrub, shrubs));
  add(instanced(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 5), wood, trunks));
  add(instanced(new THREE.IcosahedronGeometry(0.72, 0), leaf, trees));
  add(instanced(new THREE.BoxGeometry(1, 0.72, 0.04), fence, fences));
  add(instanced(new THREE.PlaneGeometry(1, 1), glass, windows));
  add(instanced(new THREE.BoxGeometry(1, 0.08, 0.55), cloth, awnings));
  add(instanced(new THREE.BoxGeometry(0.55, 0.28, 0.4), metal, ac));
  add(instanced(new THREE.CylinderGeometry(0.05, 0.07, 2.7, 6), pole, lamps));
  add(instanced(new THREE.SphereGeometry(0.12, 8, 6), bulb, heads));
}

function dressCity(scene: THREE.Scene) {
  if (scene.getObjectByName("city-detail")) return null;
  const grass = dressLawns(scene);
  const root = new THREE.Group();
  root.name = "city-detail";
  const wear = wearMaterial();
  addStreetWear(root, wear);
  dressBlocks(root);
  scene.add(root);
  return { grass, wear };
}

type Patched = WorldLifePass & {
  __cityDetail?: boolean;
  __cityGrass?: THREE.MeshStandardMaterial | null;
  __cityWear?: THREE.MeshBasicMaterial | null;
};

export function installCityDetailPass() {
  const proto = WorldLifePass.prototype as Patched;
  if (proto.__cityDetail) return;
  proto.__cityDetail = true;

  const originalBuild = WorldLifePass.prototype.build;
  WorldLifePass.prototype.build = function cityDetailBuild(this: Patched) {
    originalBuild.call(this);
    const look = dressCity((this as unknown as { scene: THREE.Scene }).scene);
    this.__cityGrass = look?.grass ?? null;
    this.__cityWear = look?.wear ?? null;
  };

  const originalPost = WorldLifePass.prototype.postSync;
  WorldLifePass.prototype.postSync = function cityDetailPost(
    this: Patched,
    frame: WorldFrame,
    cars: THREE.Group[],
    sprites: Map<string, THREE.Object3D>,
  ) {
    originalPost.call(this, frame, cars, sprites);
    if (this.__cityGrass?.map) this.__cityGrass.map.offset.x = Math.sin(frame.clock * 0.05) * 0.002;
    if (this.__cityWear?.map) this.__cityWear.map.offset.x = (frame.clock * 0.01) % 1;
  };
}
