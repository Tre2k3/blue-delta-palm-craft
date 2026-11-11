import * as THREE from "three";

export type VehicleKind = "coupe" | "sedan" | "suv" | "van";
type Face = "front" | "back" | "left" | "right";

const SIZE: Record<VehicleKind, { length: number; width: number; height: number }> = {
  sedan: { length: 4.7, width: 1.9, height: 1.45 },
  suv: { length: 5.05, width: 2.05, height: 1.85 },
  van: { length: 5.7, width: 2.15, height: 2.45 },
  coupe: { length: 4.9, width: 1.9, height: 1.4 },
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

function tex(kind: VehicleKind, face: Face) {
  const key = `${kind}-${face}`;
  let map = cache.get(key);
  if (!map) {
    map = loader.load(`/game-v2/vehicles/${key}.png?v=4`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;
    cache.set(key, map);
  }
  return map;
}

export type VehicleCard = {
  group: THREE.Group;
  card: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  kind: VehicleKind;
  views: Record<Face, THREE.Texture>;
  face: Face;
};

export const vehicleCards: VehicleCard[] = [];

export function resetVehicleCards() {
  vehicleCards.length = 0;
}

/** Production turnaround card. Group yaw is the lane heading. The card billboards. */
export function carBody(kind: VehicleKind) {
  const spec = SIZE[kind];
  const g = new THREE.Group();
  g.userData.radius = Math.max(spec.length, spec.width) * 0.48;
  g.userData.kind = kind;
  g.userData.headlights = [] as THREE.MeshStandardMaterial[];
  const views: Record<Face, THREE.Texture> = {
    front: tex(kind, "front"),
    back: tex(kind, "back"),
    left: tex(kind, "left"),
    right: tex(kind, "right"),
  };
  const mat = new THREE.MeshBasicMaterial({
    map: views.left,
    transparent: false,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(spec.length, spec.height), mat);
  card.name = "body";
  card.position.y = spec.height * 0.5;
  g.add(card);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.length * 0.9, spec.width * 0.7),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);
  const rec: VehicleCard = { group: g, card, mat, kind, views, face: "left" };
  g.userData.card = rec;
  vehicleCards.push(rec);
  return g;
}

const _pos = new THREE.Vector3();

export function presentVehicles(camera: THREE.Vector3) {
  for (const rec of vehicleCards) {
    const g = rec.group;
    g.getWorldPosition(_pos);
    const toCam = Math.atan2(camera.x - _pos.x, camera.z - _pos.z);
    let rel = toCam - g.rotation.y;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const abs = Math.abs(rel);
    const face: Face = abs < 0.85 ? "front" : abs > 2.15 ? "back" : rel > 0 ? "right" : "left";
    const spec = SIZE[rec.kind];
    const side = face === "left" || face === "right";
    const w = side ? spec.length : spec.width * 1.15;
    rec.card.scale.set(w / spec.length, 1, 1);
    if (rec.face !== face) {
      rec.face = face;
      rec.mat.map = rec.views[face];
      rec.mat.needsUpdate = true;
    }
    // Lock the card to the car's face. A free billboard turns the 5 m side
    // into a wall that cuts through the sidewalk and anyone standing there.
    const base = side ? (rel > 0 ? -Math.PI / 2 : Math.PI / 2) : abs > 2.15 ? Math.PI : 0;
    let bias = rel - base;
    while (bias > Math.PI) bias -= Math.PI * 2;
    while (bias < -Math.PI) bias += Math.PI * 2;
    bias = Math.max(-0.28, Math.min(0.28, bias));
    rec.card.rotation.y = base + bias;
  }
}
