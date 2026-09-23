import * as THREE from "three";
import { applyPolygonOffset } from "./polygonOffset";

export type WrapFace = "front" | "rear" | "left" | "right" | "hood" | "roof" | "side";
export type WrapPackName =
  | "sackrow-van"
  | "klothing-van"
  | "klothing-suv"
  | "klothing-sedan"
  | "klothing-coupe"
  | "sackrow-sedan"
  | "sackrow-suv";
export type CarKind = "van" | "suv" | "coupe" | "sedan";

export const DROP_VAN_WRAP: WrapPackName = "sackrow-van";
export const TRAFFIC_WRAPS: WrapPackName[] = [
  "klothing-sedan",
  "klothing-suv",
  "klothing-coupe",
  "sackrow-sedan",
  "sackrow-suv",
];

type WrapPack = Partial<Record<WrapFace, THREE.Texture>>;
const cache = new Map<WrapPackName, WrapPack>();
const wrapMats = new Map<string, THREE.MeshStandardMaterial>();
let booting: Promise<void> | null = null;

export function kindFromPack(packName: WrapPackName): CarKind {
  if (packName.includes("van")) return "van";
  if (packName.includes("suv")) return "suv";
  if (packName.includes("coupe")) return "coupe";
  return "sedan";
}

function loadTex(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.needsUpdate = true;
        resolve(t);
      },
      undefined,
      () => reject(new Error(url)),
    );
  });
}

export function bootVehicleWraps() {
  if (booting) return booting;
  const packs: WrapPackName[] = [
    "sackrow-van",
    "klothing-van",
    "klothing-suv",
    "klothing-sedan",
    "klothing-coupe",
    "sackrow-sedan",
    "sackrow-suv",
  ];
  const faces: WrapFace[] = ["front", "rear", "left", "right", "hood", "roof", "side"];
  booting = Promise.all(
    packs.map(async (name) => {
      const pack: WrapPack = {};
      await Promise.all(
        faces.map(async (face) => {
          try {
            pack[face] = await loadTex(`/game/wraps/${name}/${face}.webp`);
          } catch {
            /* optional face */
          }
        }),
      );
      cache.set(name, pack);
    }),
  ).then(() => undefined);
  return booting;
}

export function disposeVehicleWraps() {
  for (const pack of cache.values()) {
    for (const tex of Object.values(pack)) tex?.dispose();
  }
  cache.clear();
  wrapMats.clear();
  booting = null;
}

function textureFor(pack: WrapPack | undefined, face: WrapFace) {
  return pack?.[face] ?? (face === "right" ? pack?.left : face === "left" ? pack?.right : undefined) ?? pack?.side;
}

/** One material per pack+face, shared by every car wearing it. Decal geometry carries the logo crop. */
function wrapMat(face: WrapFace, packName: WrapPackName, tex: THREE.Texture) {
  const key = `${packName}:${face}`;
  let mat = wrapMats.get(key);
  if (!mat) {
    mat = applyPolygonOffset(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.3 }), "contact");
    wrapMats.set(key, mat);
  }
  return mat;
}

/** Swap decal placeholders for the pack's art. Runs until every face has its texture, then never again. */
export function bindWrapTextures(hull: THREE.Group) {
  if (hull.userData.wrapBound) return;
  let pending = false;
  hull.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const face = obj.userData.wrapFace as WrapFace | undefined;
    const packName = obj.userData.wrapPack as WrapPackName | undefined;
    if (!face || !packName || obj.userData.wrapMatApplied) return;
    const tex = textureFor(cache.get(packName), face);
    if (!tex) {
      pending = true;
      return;
    }
    obj.material = wrapMat(face, packName, tex);
    obj.userData.wrapMatApplied = true;
  });
  if (!pending) hull.userData.wrapBound = true;
  else if (booting && !hull.userData.wrapRetry) {
    // Parked cars and the drop van are built once and never re-visited by the traffic pass.
    hull.userData.wrapRetry = true;
    void booting.then(() => bindWrapTextures(hull));
  }
}
