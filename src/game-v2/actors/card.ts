import * as THREE from "three";
import { wrapAngle } from "../core/util";
import { GROUND_EPSILON, standHeight } from "../world/ground";

export type View = "front" | "back" | "left" | "right";

export type CardArt = {
  front: string;
  back?: string;
  left?: string;
  right?: string;
  /** Stride frames per view. Shown in a loop while the character moves. */
  walk?: Partial<Record<View, string[]>>;
  /** One-off poses by name: shoot, ready. A pose can have its own drawing for each side it is seen from. */
  poses?: Record<string, string | Partial<Record<View, string>>>;
  /** How tall a drawing stands next to the standing one, by file: arms up is taller, a crouch is shorter. */
  scale?: Record<string, number>;
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

/** Cutout texture. No mipmaps: averaging alpha at the edge of hair punches holes through it. */
export function cutout(src: string) {
  let t = cache.get(src);
  if (!t && src.startsWith("tint:")) {
    t = tinted(src);
    cache.set(src, t);
    return t;
  }
  if (!t && src.startsWith("flip:")) {
    // The same drawing facing the other way.
    const flipped = new THREE.Texture();
    flipped.colorSpace = THREE.SRGBColorSpace;
    flipped.generateMipmaps = false;
    flipped.minFilter = THREE.LinearFilter;
    flipped.magFilter = THREE.LinearFilter;
    flipped.repeat.x = -1;
    flipped.offset.x = 1;
    loader.load(src.slice(5), (base) => {
      flipped.image = base.image;
      flipped.needsUpdate = true;
      base.dispose();
    });
    cache.set(src, flipped);
    return flipped;
  }
  if (!t) {
    t = loader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    cache.set(src, t);
  }
  return t;
}

/**
 * `tint:#rrggbb:<url>`: the drawing at the url with everything green repainted in the given
 * colour, shading kept. Used to give each fit a back view from the one back drawing there is.
 */
function tinted(key: string) {
  const hex = key.slice(5, 12);
  const url = key.slice(13);
  const blank = document.createElement("canvas");
  blank.width = blank.height = 2;
  const t: THREE.Texture = new THREE.CanvasTexture(blank);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  const tr = parseInt(hex.slice(1, 3), 16);
  const tg = parseInt(hex.slice(3, 5), 16);
  const tb = parseInt(hex.slice(5, 7), 16);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]!;
      const gr = px[i + 1]!;
      const b = px[i + 2]!;
      if (gr > 46 && gr > r * 1.22 && gr > b * 1.22) {
        const k = 0.42 + (gr / 255) * 0.95;
        px[i] = Math.min(255, tr * k);
        px[i + 1] = Math.min(255, tg * k);
        px[i + 2] = Math.min(255, tb * k);
      }
    }
    g.putImageData(d, 0, 0);
    t.dispose();
    t.image = c;
    t.needsUpdate = true;
  };
  img.src = url;
  return t;
}

const unit = new THREE.PlaneGeometry(1, 1);
unit.translate(0, 0.5, 0);
const blob = new THREE.CircleGeometry(0.5, 18);
blob.rotateX(-Math.PI / 2);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const _world = new THREE.Vector3();

/**
 * A person: one upright card that turns to the camera and picks the drawing that matches
 * where they are heading. Origin is the soles. Walking adds a step bounce and a lean so a
 * single drawing still reads as a walk.
 */
export class Card {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.MeshBasicMaterial;
  private shadow: THREE.Mesh;
  /** World heading, radians. 0 faces +Z. */
  heading = 0;
  /** Ground speed in m/s; drives the stride. */
  speed = 0;
  /** Extra lift above the ground (jumps, trampolines). */
  lift = 0;
  pose: string | null = null;
  /** Seconds into a song playing nearby, or -1. Standing still, the character bops to it. */
  groove = -1;
  visible = true;
  private phase = 0;
  private art: CardArt;
  private current = "";
  private idle: number;

  constructor(
    art: CardArt,
    public height: number,
  ) {
    this.art = art;
    this.mat = new THREE.MeshBasicMaterial({ map: cutout(art.front), alphaTest: 0.4, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(unit, this.mat);
    this.mesh.castShadow = true;
    this.mesh.renderOrder = 3;
    this.shadow = new THREE.Mesh(blob, blobMat);
    this.shadow.scale.set(height * 0.5, 1, height * 0.32);
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow, this.mesh);
    this.idle = Math.random() * 10;
    this.preload();
  }

  setArt(art: CardArt) {
    this.art = art;
    this.current = "";
    this.preload();
  }

  private preload() {
    const a = this.art;
    const poses = Object.values(a.poses ?? {}).flatMap((p) => (typeof p === "string" ? [p] : Object.values(p)));
    for (const src of [a.front, a.back, a.left, a.right, ...Object.values(a.walk ?? {}).flat(), ...poses]) if (src) cutout(src);
  }

  place(x: number, z: number) {
    this.group.position.x = x;
    this.group.position.z = z;
  }

  /** Call every frame after moving. `plant` false skips the ground lookup for rooms with a flat floor. */
  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, floorY: number | null = null) {
    const g = this.group;
    g.visible = this.visible;
    if (!this.visible) return;
    const ground = floorY ?? standHeight(g.position.x, g.position.z) + GROUND_EPSILON;
    g.position.y = ground;
    g.getWorldPosition(_world);
    const toCam = Math.atan2(camera.x - _world.x, camera.z - _world.z);
    const rel = wrapAngle(toCam - this.heading);
    const abs = Math.abs(rel);
    let view: View = "front";
    if (this.art.back) view = abs < 0.8 ? "front" : abs > 2.3 ? "back" : rel > 0 ? "left" : "right";
    // No side drawing: whichever of front and back is nearer the truth.
    if ((view === "left" || view === "right") && !this.art[view]) view = this.art.back && abs > Math.PI / 2 ? "back" : "front";
    if (view !== "front" && !this.art[view]) view = "front";

    const moving = this.speed > 0.35;
    if (moving) this.phase += (this.speed * dt) / 0.82;
    this.idle += dt;
    let src = this.art[view] ?? this.art.front;
    const strides = this.art.walk?.[view];
    const pose = this.pose ? this.art.poses?.[this.pose] : undefined;
    // A pose drawn for some sides only is not shown from the others.
    const posed = typeof pose === "string" ? pose : pose ? (pose[view] ?? (view === "left" || view === "right" ? pose[abs > Math.PI / 2 ? "back" : "front"] : undefined)) : undefined;
    if (posed) src = posed;
    else if (moving && strides?.length) {
      // Alternate the standing drawing with each stride frame: stand, step, stand, step.
      const slot = Math.floor(this.phase * 2) % (strides.length * 2);
      if (slot % 2 === 1) src = strides[(slot - 1) / 2]!;
    }
    if (src !== this.current) {
      this.current = src;
      this.mat.map = cutout(src);
      this.mat.needsUpdate = true;
    }
    const img = this.mat.map?.image as { width?: number; height?: number } | undefined;
    const aspect = img?.width && img?.height ? img.width / img.height : 0.4;
    const step = moving ? Math.abs(Math.sin(this.phase * Math.PI)) : 0;
    const breathe = moving ? 0 : Math.sin(this.idle * 1.6) * 0.006;
    // About 95 beats a minute: dip on the beat, sway across two.
    const bop = !moving && this.groove >= 0 ? Math.pow(Math.abs(Math.sin(this.groove * Math.PI * 1.58)), 1.6) : 0;
    const sway = bop > 0 || (!moving && this.groove >= 0) ? Math.sin(this.groove * Math.PI * 1.58) * 0.05 : 0;
    const h = this.height * (this.art.scale?.[src] ?? 1) * (1 + breathe - step * 0.012 - bop * 0.035);
    this.mesh.scale.set(h * aspect, h, 1);
    this.mesh.position.y = this.lift + step * 0.055;
    this.mesh.rotation.set(0, toCam - g.rotation.y, moving ? Math.sin(this.phase * Math.PI) * 0.035 : Math.sin(this.idle * 1.3) * 0.008 + sway);
    // Pull the card a touch toward the lens so a curb never clips the shoes.
    this.mesh.position.x = Math.sin(toCam) * 0.1;
    this.mesh.position.z = Math.cos(toCam) * 0.1;
    this.mat.color.copy(tint);
    const s = 1 - Math.min(0.6, this.lift * 0.25);
    this.shadow.scale.set(this.height * 0.5 * s, 1, this.height * 0.32 * s);
    this.shadow.position.y = 0.02;
  }

  dispose() {
    this.mat.dispose();
  }
}
