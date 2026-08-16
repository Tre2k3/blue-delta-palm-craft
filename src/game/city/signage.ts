import * as THREE from "three";

export type SignSlot = "storefront" | "billboard";

export type SignDef = {
  id: string;
  label: string;
  sub?: string;
  ink: string;
  paper: string;
  accent: string;
};

export type SignPlacement = {
  buildingId: string;
  signId: string;
  slot: SignSlot;
  face?: "south" | "north" | "east" | "west";
};

export const SIGN_DEFS: SignDef[] = [
  { id: "sackreligious-hq", label: "$ACKRELIGIOUS", sub: "KLOTHING", ink: "#f3e6c4", paper: "#14110f", accent: "#1db954" },
  { id: "in-the-sack", label: "IN THE $ACK", sub: "WE TRUST", ink: "#f6e7b2", paper: "#10110f", accent: "#d4af37" },
  { id: "901-court", label: "901", sub: "SACKROW", ink: "#f4efe6", paper: "#3b1d12", accent: "#e85d4c" },
  { id: "beale-st", label: "BEALE ST", sub: "MEMPHIS", ink: "#f7ecd0", paper: "#2a2118", accent: "#d4af37" },
  { id: "east-memphis", label: "EAST MEMPHIS", sub: "THE HOOD", ink: "#efe6d6", paper: "#1c2430", accent: "#7aa2c8" },
  { id: "downtown", label: "DOWNTOWN", sub: "38103", ink: "#ece7de", paper: "#1a1d22", accent: "#c4b08a" },
  { id: "culture-spot", label: "CULTURE", sub: "SOUTH MAIN", ink: "#f0e4c8", paper: "#241c16", accent: "#1db954" },
  { id: "fresh-38127", label: "FRESH", sub: "38127", ink: "#f5edd8", paper: "#121814", accent: "#1db954" },
];

/** Assign specific signs to specific buildings. HQ owns its own pair. */
export const SIGN_TABLE: SignPlacement[] = [
  { buildingId: "store", signId: "sackreligious-hq", slot: "storefront" },
  { buildingId: "store", signId: "in-the-sack", slot: "billboard" },
  { buildingId: "beale", signId: "beale-st", slot: "storefront" },
  { buildingId: "apartment", signId: "fresh-38127", slot: "storefront" },
  { buildingId: "neighborhood", signId: "east-memphis", slot: "storefront" },
  { buildingId: "downtown", signId: "downtown", slot: "storefront" },
  { buildingId: "downtown", signId: "downtown", slot: "billboard" },
  { buildingId: "culture", signId: "culture-spot", slot: "storefront" },
  { buildingId: "court", signId: "901-court", slot: "storefront" },
];

const COLS = 4;
const ROWS = 2;
const CELL = 256;
const ATLAS_W = COLS * CELL;
const ATLAS_H = ROWS * CELL;

let atlasTex: THREE.CanvasTexture | THREE.Texture | null = null;
let atlasMat: THREE.MeshStandardMaterial | null = null;

function defIndex(id: string) {
  const i = SIGN_DEFS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

function cellUv(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    u0: col / COLS,
    v0: 1 - (row + 1) / ROWS,
    u1: (col + 1) / COLS,
    v1: 1 - row / ROWS,
  };
}

function paintAtlas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = ATLAS_W;
  c.height = ATLAS_H;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, ATLAS_W, ATLAS_H);
  SIGN_DEFS.forEach((sign, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = row * CELL;
    g.fillStyle = sign.paper;
    g.fillRect(x, y, CELL, CELL);
    g.fillStyle = sign.accent;
    g.fillRect(x, y, 10, CELL);
    g.fillRect(x + CELL - 10, y, 10, CELL);
    g.fillRect(x + 18, y + 28, CELL - 36, 6);
    g.fillStyle = sign.ink;
    g.font = "700 28px 'Bebas Neue', Impact, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(sign.label, x + CELL / 2, y + CELL * 0.46);
    if (sign.sub) {
      g.font = "600 16px 'DM Sans', sans-serif";
      g.fillStyle = sign.accent;
      g.fillText(sign.sub, x + CELL / 2, y + CELL * 0.64);
    }
  });
  return c;
}

async function loadAtlasFile(): Promise<THREE.Texture | null> {
  const urls = ["/game3d/signs/atlas.svg"];
  for (const url of urls) {
    const tex = await new Promise<THREE.Texture | null>((resolve) => {
      new THREE.TextureLoader().load(
        url,
        (t) => resolve(t),
        undefined,
        () => resolve(null),
      );
    });
    if (tex) return tex;
  }
  return null;
}

export async function getSignAtlas(): Promise<THREE.Texture> {
  if (atlasTex) return atlasTex;
  const file = await loadAtlasFile();
  if (file) {
    file.colorSpace = THREE.SRGBColorSpace;
    file.wrapS = THREE.ClampToEdgeWrapping;
    file.wrapT = THREE.ClampToEdgeWrapping;
    file.anisotropy = 8;
    file.needsUpdate = true;
    atlasTex = file;
    return file;
  }
  const canvas = paintAtlas();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  atlasTex = tex;
  return tex;
}

export async function getSignMaterial(): Promise<THREE.MeshStandardMaterial> {
  if (atlasMat) return atlasMat;
  const map = await getSignAtlas();
  atlasMat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.48,
    metalness: 0.08,
    transparent: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    depthWrite: true,
  });
  return atlasMat;
}

function planeForCell(index: number, w: number, h: number) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.getAttribute("uv");
  const { u0, v0, u1, v1 } = cellUv(index);
  uv.setXY(0, u0, v0);
  uv.setXY(1, u1, v0);
  uv.setXY(2, u0, v1);
  uv.setXY(3, u1, v1);
  uv.needsUpdate = true;
  return geo;
}

const FACE_YAW: Record<NonNullable<SignPlacement["face"]>, number> = {
  south: 0,
  north: Math.PI,
  east: Math.PI / 2,
  west: -Math.PI / 2,
};

export type BuildingRef = {
  id: string;
  group: THREE.Group;
  width: number;
  depth: number;
  height: number;
  tall?: boolean;
};

export function placementsFor(id: string, tall: boolean): SignPlacement[] {
  const listed = SIGN_TABLE.filter((p) => p.buildingId === id);
  if (listed.length) return listed;
  const fallback: SignPlacement[] = [
    { buildingId: id, signId: SIGN_DEFS[Math.abs(id.length * 3) % SIGN_DEFS.length]!.id, slot: "storefront" },
  ];
  if (tall) {
    fallback.push({
      buildingId: id,
      signId: "in-the-sack",
      slot: "billboard",
    });
  }
  return fallback;
}

export function mountSign(
  parent: THREE.Group,
  building: BuildingRef,
  placement: SignPlacement,
  material: THREE.MeshStandardMaterial,
) {
  const face = placement.face ?? "south";
  const yaw = FACE_YAW[face];
  const storefront = placement.slot === "storefront";
  const w = storefront ? Math.min(building.width * 0.62, 4.2) : Math.min(building.width * 0.7, 5.4);
  const h = storefront ? 0.72 : 1.35;
  const mesh = new THREE.Mesh(planeForCell(defIndex(placement.signId), w, h), material);
  mesh.rotation.y = yaw;
  const lift = storefront ? 2.55 : building.height + 0.9;
  const offset = 0.02;
  const hx = building.width / 2 + offset;
  const hz = building.depth / 2 + offset;
  if (face === "south") mesh.position.set(0, lift, hz);
  else if (face === "north") mesh.position.set(0, lift, -hz);
  else if (face === "east") mesh.position.set(hx, lift, 0);
  else mesh.position.set(-hx, lift, 0);
  mesh.userData.signId = placement.signId;
  mesh.userData.buildingId = building.id;
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

export async function decorateBuildings(buildings: BuildingRef[]) {
  const mat = await getSignMaterial();
  for (const b of buildings) {
    const rows = placementsFor(b.id, !!b.tall || b.height > 6.2);
    for (const row of rows) {
      if (row.slot === "billboard" && !(b.tall || b.height > 6.2 || b.id === "store")) continue;
      mountSign(b.group, b, row, mat);
    }
  }
}
