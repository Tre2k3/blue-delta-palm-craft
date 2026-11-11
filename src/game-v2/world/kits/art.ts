import * as THREE from "three";

type Slot = {
  file: string;
  side?: string;
  hide?: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY: number;
  name?: string;
  sideX?: number;
  sideZ?: number;
  sideW?: number;
  cross?: boolean;
};

function house(front: string, side: string, hide: string, x: number, z: number, w: number, d: number): Slot {
  return {
    file: front,
    side,
    hide,
    x,
    y: 3.2,
    z: z - d / 2 - 0.22,
    w: w + 0.5,
    h: 6.4,
    rotY: Math.PI,
    sideX: x - w / 2 - 0.18,
    sideZ: z,
    sideW: d + 0.35,
  };
}

/** Transparent plates in public/game-v2/kit/. Names listed in manifest.json replace the box shells. */
const SLOTS: Slot[] = [
  house("house_home_front.png", "house_home_side.png", "house-home", -32, 14.6, 8.6, 7.4),
  house("house_02_front.png", "house_02_side.png", "house-02", -20.5, 14.8, 7.4, 6.8),
  house("house_03_front.png", "house_03_side.png", "house-03", -10, 15, 7.8, 7),
  house("house_04_front.png", "house_04_side.png", "house-04", 18, 14.7, 7.6, 6.8),
  house("house_05_front.png", "house_05_side.png", "house-05", 30, 15.1, 8, 7.2),
  house("house_06_front.png", "house_06_side.png", "house-06", 44, 14.5, 7.2, 6.6),
  { file: "hq_front_day.png", name: "hq-plate-day", x: 24, y: 3.85, z: -10.28, w: 18.6, h: 7.7, rotY: 0 },
  { file: "hq_front_night.png", name: "hq-plate-night", x: 24, y: 3.85, z: -10.22, w: 18.6, h: 7.7, rotY: 0 },
];

function card(file: string, w: number, h: number, x: number, y: number, z: number, rotY: number, parent: THREE.Object3D, name?: string) {
  const tex = new THREE.TextureLoader().load(`/game-v2/kit/${file}?v=3`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide, depthWrite: true }),
  );
  if (name) mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function place(slot: Slot, parent: THREE.Object3D) {
  card(slot.file, slot.w, slot.h, slot.x, slot.y, slot.z, slot.rotY, parent, slot.name);
  if (slot.cross) {
    card(slot.file, slot.w, slot.h, slot.x, slot.y, slot.z, slot.rotY + Math.PI / 2.4, parent);
  }
  if (slot.side && slot.sideX != null && slot.sideZ != null && slot.sideW != null) {
    card(slot.side, slot.sideW, slot.h, slot.sideX, slot.y, slot.sideZ, -Math.PI / 2, parent);
  }
  if (slot.hide) {
    const shell = parent.getObjectByName(slot.hide);
    if (shell) shell.visible = false;
  }
  if (slot.name === "hq-plate-night") {
    const night = parent.getObjectByName("hq-plate-night");
    if (night) night.visible = false;
  }
}

/** Illustrated plates replace box scenery when the production kit is present. Collision stays. */
export function mountStreetKit(parent: THREE.Object3D) {
  void fetch("/game-v2/kit/manifest.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { files?: string[] } | null) => {
      const ready = new Set(body?.files ?? []);
      for (const slot of SLOTS) {
        if (!ready.has(slot.file)) continue;
        if (slot.side && !ready.has(slot.side)) slot.side = undefined;
        place(slot, parent);
      }
    })
    .catch(() => undefined);
}
