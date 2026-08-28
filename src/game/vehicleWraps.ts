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
            pack[face] = await loadTex(`/game/wraps/${name}/${face}.png`);
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

function wrapMat(face: WrapFace, packName: WrapPackName) {
  const pack = cache.get(packName);
  const tex =
    pack?.[face] ??
    (face === "right" ? pack?.left : face === "left" ? pack?.right : undefined) ??
    pack?.side;
  const mat = new THREE.MeshStandardMaterial({
    map: tex ?? null,
    color: tex ? 0xffffff : 0x111111,
    roughness: 0.42,
    metalness: 0.18,
    toneMapped: true,
    side: face === "right" ? THREE.BackSide : THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  });
  return applyPolygonOffset(mat, "contact");
}

export function bindWrapTextures(hull: THREE.Group) {
  hull.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const face = obj.userData.wrapFace as WrapFace | undefined;
    const packName = obj.userData.wrapPack as WrapPackName | undefined;
    if (!face || !packName) return;
    obj.material = wrapMat(face, packName);
  });
}

function bodyProfile(kind: CarKind, L: number, H: number) {
  const n = L / 2;
  const s = new THREE.Shape();
  if (kind === "van") {
    s.moveTo(n, 0.07);
    s.lineTo(n, 0.42);
    s.quadraticCurveTo(n * 0.92, 0.7, n * 0.55, 0.88);
    s.lineTo(-n * 0.55, H * 0.98);
    s.lineTo(-n, H * 0.92);
    s.lineTo(-n, 0.08);
  } else if (kind === "suv") {
    s.moveTo(n, 0.07);
    s.lineTo(n, 0.38);
    s.quadraticCurveTo(n * 0.78, 0.62, n * 0.42, 0.78);
    s.lineTo(-n * 0.35, H);
    s.quadraticCurveTo(-n * 0.85, H * 0.88, -n, H * 0.55);
    s.lineTo(-n, 0.08);
  } else if (kind === "coupe") {
    s.moveTo(n, 0.07);
    s.lineTo(n, 0.32);
    s.quadraticCurveTo(n * 0.55, 0.55, n * 0.12, 0.7);
    s.quadraticCurveTo(-n * 0.2, H, -n * 0.55, H * 0.72);
    s.quadraticCurveTo(-n * 0.92, 0.42, -n, 0.28);
    s.lineTo(-n, 0.07);
  } else {
    s.moveTo(n, 0.07);
    s.lineTo(n, 0.34);
    s.quadraticCurveTo(n * 0.7, 0.52, n * 0.22, 0.68);
    s.lineTo(-n * 0.15, H);
    s.quadraticCurveTo(-n * 0.7, H * 0.85, -n * 0.92, 0.42);
    s.lineTo(-n, 0.28);
    s.lineTo(-n, 0.07);
  }
  s.closePath();
  return s;
}

export function makeWrappedHull(packName: WrapPackName, L: number, H: number, W: number, y: number) {
  const kind = kindFromPack(packName);
  const root = new THREE.Group();
  root.userData.wrapPack = packName;
  const extrude = new THREE.ExtrudeGeometry(bodyProfile(kind, L, H), { depth: W, bevelEnabled: false, steps: 1 });
  extrude.translate(0, 0, -W / 2);
  root.add(
    new THREE.Mesh(extrude, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45, metalness: 0.16 })),
  );

  const addFace = (mesh: THREE.Mesh, face: WrapFace) => {
    mesh.userData.wrapFace = face;
    mesh.userData.wrapPack = packName;
    mesh.castShadow = false;
    root.add(mesh);
  };

  const hood = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.38, W * 0.88), wrapMat("hood", packName));
  hood.rotation.x = -Math.PI / 2;
  hood.position.set(L * 0.22, H * 0.42, 0);
  addFace(hood, "hood");

  const roof = new THREE.Mesh(new THREE.PlaneGeometry(L * (kind === "van" ? 0.72 : 0.5), W * 0.86), wrapMat("roof", packName));
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(kind === "van" ? -L * 0.06 : -L * 0.03, H * 0.98, 0);
  addFace(roof, "roof");

  const front = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.55), wrapMat("front", packName));
  front.rotation.y = Math.PI / 2;
  front.position.set(L / 2 + 0.012, H * 0.38, 0);
  addFace(front, "front");

  const rear = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.7), wrapMat("rear", packName));
  rear.rotation.y = -Math.PI / 2;
  rear.position.set(-L / 2 - 0.012, H * 0.45, 0);
  addFace(rear, "rear");

  const left = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.92, H * 0.82), wrapMat("left", packName));
  left.position.set(0, H * 0.48, W / 2 + 0.014);
  addFace(left, "left");

  const right = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.92, H * 0.82), wrapMat("right", packName));
  right.rotation.y = Math.PI;
  right.position.set(0, H * 0.48, -W / 2 - 0.014);
  addFace(right, "right");

  const cabinH = kind === "van" ? H * 0.55 : H * 0.48;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "van" ? L * 0.42 : L * 0.38, cabinH * 0.5, W * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.12, metalness: 0.45, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  glass.position.set(kind === "van" ? -0.12 : 0.05, H * 0.72, 0);
  root.add(glass);

  root.position.y = y - H / 2;
  return root;
}

export function makePaintedHull(kind: CarKind, L: number, H: number, W: number, y: number, color: number) {
  const root = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.44, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55, metalness: 0.16 });
  const extrude = new THREE.ExtrudeGeometry(bodyProfile(kind, L, H), { depth: W, bevelEnabled: false, steps: 1 });
  extrude.translate(0, 0, -W / 2);
  const body = new THREE.Mesh(extrude, paint);
  body.castShadow = true;
  root.add(body);

  const hood = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.38, W * 0.88), paint);
  hood.rotation.x = -Math.PI / 2;
  hood.position.set(L * 0.22, H * 0.42, 0);
  root.add(hood);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(L * (kind === "van" ? 0.72 : 0.5), W * 0.86), paint);
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(kind === "van" ? -L * 0.06 : -L * 0.03, H * 0.98, 0);
  root.add(roof);

  const cabinH = kind === "van" ? H * 0.55 : H * 0.48;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "van" ? L * 0.42 : L * 0.38, cabinH * 0.5, W * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x1a242c, roughness: 0.12, metalness: 0.45, transparent: true, opacity: 0.52, depthWrite: false }),
  );
  glass.position.set(kind === "van" ? -0.12 : 0.05, H * 0.72, 0);
  root.add(glass);

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.08, W + 0.02), dark);
  rocker.position.set(0, 0.1, 0);
  root.add(rocker);

  root.position.y = y - H / 2;
  return root;
}
