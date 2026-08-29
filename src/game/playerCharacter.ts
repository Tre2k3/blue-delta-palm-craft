import * as THREE from "three";
import type { LocomotionState } from "./characterController";
import { cleanSprite } from "./chroma";
import { CUTOUT_ALPHA, cutoutMeshMaterial, hardenCutoutTexture } from "./cutout";
import { dressBenji } from "./outfitCompositor";
import { lookFor, stampFor, overlayKey, type View } from "./outfitLook";
import type { ApparelId } from "./types";

type CycleKind = "idle" | "walk" | "jump" | "shoot" | "dribble" | "gather" | "release" | "rebound" | "celebrate" | "talk" | "interact" | "phone";

const TAU = Math.PI * 2;
const VIEWS: View[] = ["back", "right", "front", "left"];

function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function finishTexture(tex: THREE.Texture) {
  return hardenCutoutTexture(tex);
}

function cardMat(src?: HTMLImageElement | HTMLCanvasElement) {
  if (!src) {
    return new THREE.MeshBasicMaterial({ color: 0x1a1c1e, transparent: false, opacity: 0, visible: false });
  }
  const tex = finishTexture(new THREE.CanvasTexture(src));
  return cutoutMeshMaterial(tex);
}

/** Cardinals sit in the middle of each 90° sector so up/left/right/down pick the right plate. */
function viewBlend(rel: number): { a: View; b: View; wa: number; wb: number } {
  const ang = ((rel + Math.PI / 4) % TAU + TAU) % TAU;
  const sector = ang / (Math.PI / 2);
  const i0 = Math.floor(sector) % 4;
  const t = sector - Math.floor(sector);
  const edge = 0.18;
  if (t < edge) {
    const u = t / edge;
    return { a: VIEWS[(i0 + 3) % 4]!, b: VIEWS[i0]!, wa: 1 - u, wb: u };
  }
  if (t > 1 - edge) {
    const u = (t - (1 - edge)) / edge;
    return { a: VIEWS[i0]!, b: VIEWS[(i0 + 1) % 4]!, wa: 1 - u, wb: u };
  }
  return { a: VIEWS[i0]!, b: VIEWS[i0]!, wa: 1, wb: 0 };
}

function walkFrame(animT: number) {
  return ((Math.floor(animT) % 4) + 4) % 4;
}

function jumpFrame(air: number, vz: number) {
  if (vz > 1.4) return 1;
  if (air > 0.55) return 2;
  if (vz < -0.4 && air > 0.12) return 3;
  return 0;
}

/**
 * Benji renderer. Clothing is composited onto every idle / walk / jump plate
 * so an equipped fit is the actual garment, not a color ring.
 */
export class PlayerCharacter {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private cardA: THREE.Mesh;
  private cardB: THREE.Mesh;
  private shadow: THREE.Mesh;
  private idle: Partial<Record<View, THREE.MeshBasicMaterial>> = {};
  private walk: Partial<Record<View, THREE.MeshBasicMaterial[]>> = {};
  private jump: THREE.MeshBasicMaterial[] = [];
  private shoot: THREE.MeshBasicMaterial[] = [];
  private dribble: THREE.MeshBasicMaterial[] = [];
  private gather: THREE.MeshBasicMaterial[] = [];
  private release: THREE.MeshBasicMaterial[] = [];
  private rebound: THREE.MeshBasicMaterial[] = [];
  private celebrate: THREE.MeshBasicMaterial[] = [];
  private talk: THREE.MeshBasicMaterial[] = [];
  private interact: THREE.MeshBasicMaterial[] = [];
  private phone: THREE.MeshBasicMaterial[] = [];
  private ready = false;
  private lastKeyA = "";
  private lastKeyB = "";
  private lastState: LocomotionState = "idle";
  private actionT = 0;
  private grooveT = 0;
  private images: Record<string, HTMLImageElement> = {};
  private outfitId: ApparelId = "starter_tee";
  private icon: HTMLImageElement | HTMLCanvasElement | null = null;

  constructor() {
    this.root.add(this.body);
    const geo = new THREE.PlaneGeometry(1.05, 1.78);
    const blank = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.cardA = new THREE.Mesh(geo, blank);
    this.cardB = new THREE.Mesh(geo, blank.clone());
    this.cardA.position.y = 0.9;
    this.cardB.position.y = 0.9;
    this.cardB.position.z = -0.004;
    this.cardA.castShadow = false;
    this.body.add(this.cardA);
    this.body.add(this.cardB);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.015;
    this.root.add(this.shadow);
  }

  setOutfit(id: string | null | undefined) {
    const next = (id as ApparelId) || "starter_tee";
    if (next === this.outfitId && this.ready) return;
    this.outfitId = next;
    if (Object.keys(this.images).length) this.rebuildOutfit();
  }

  /** @deprecated clothing is now on the sprite; kept so old calls compile. */
  setOutfitTint(_hex: string | null) {}

  applyApprovedTextures(images: Record<string, HTMLImageElement>) {
    this.images = images;
    this.icon = images.icon ?? null;
    this.ready = false;
    this.lastKeyA = "";
  }

  private dress(src: HTMLImageElement | undefined, view: View) {
    if (!src) return undefined;
    const cleaned = cleanSprite(src);
    const look = lookFor(this.outfitId);
    const key = stampFor(look, view);
    const stamp = (key && this.images[key]) || this.icon;
    const ovKey = overlayKey(look, view);
    const overlay = (ovKey && this.images[ovKey]) || null;
    return dressBenji(cleaned, look, view, stamp, overlay);
  }

  private disposePack() {
    const drop = (m?: THREE.MeshBasicMaterial) => {
      if (!m) return;
      m.map?.dispose();
      m.dispose();
    };
    for (const view of VIEWS) {
      drop(this.idle[view]);
      this.walk[view]?.forEach(drop);
    }
    this.jump.forEach(drop);
    this.shoot.forEach(drop);
    this.dribble.forEach(drop);
    this.gather.forEach(drop);
    this.release.forEach(drop);
    this.rebound.forEach(drop);
    this.celebrate.forEach(drop);
    this.talk.forEach(drop);
    this.interact.forEach(drop);
    this.phone.forEach(drop);
  }

  private rebuildOutfit() {
    this.disposePack();
    const images = this.images;
    const front = this.dress(images.frontHi ?? images.front, "front");
    const back = this.dress(images.backHi ?? images.back, "back") ?? front;
    // Engine already path-swaps left/right files so screen-left is visual left.
    const left = this.dress(images.leftHi ?? images.left, "left") ?? front;
    const right = this.dress(images.rightHi ?? images.right, "right") ?? front;
    if (!front && !back) return;

    this.idle.front = cardMat(front);
    this.idle.back = cardMat(back);
    this.idle.left = cardMat(left);
    this.idle.right = cardMat(right);

    for (const view of VIEWS) {
      const idle = this.idle[view]!;
      const frames: THREE.MeshBasicMaterial[] = [];
      for (let i = 1; i <= 4; i++) {
        const img = images[`walk-${view}-${i}`];
        frames.push(img ? cardMat(this.dress(img, view)) : idle);
      }
      this.walk[view] = frames;
    }

    this.jump = [1, 2, 3, 4].map((i) => {
      const img = images[`jump-${i}`];
      return img ? cardMat(this.dress(img, "front")) : this.idle.front!;
    });
    this.shoot = this.jump;
    const pack = (prefix: string, count: number, fallback: THREE.MeshBasicMaterial[]) =>
      Array.from({ length: count }, (_, i) => {
        const img = images[`${prefix}-${i + 1}`];
        return img ? cardMat(this.dress(img, "front")) : fallback[i % fallback.length]!;
      });
    this.dribble = pack("dribble", 4, this.jump);
    this.gather = pack("gather", 2, this.jump);
    this.release = pack("release", 2, this.jump);
    this.rebound = pack("rebound", 2, this.jump);
    this.celebrate = pack("celebrate", 2, this.jump);
    this.talk = pack("talk", 1, [this.idle.front!]);
    this.interact = pack("interact", 1, [this.idle.front!]);
    this.phone = pack("phone", 1, [this.idle.front!]);

    this.ready = true;
    this.lastKeyA = "";
    this.lastKeyB = "";
  }

  private matFor(view: View, kind: CycleKind, frame: number) {
    if (kind === "jump") return this.jump[frame] ?? this.idle[view];
    if (kind === "shoot") return this.shoot[frame] ?? this.idle[view];
    if (kind === "dribble") return this.dribble[frame] ?? this.idle[view];
    if (kind === "gather") return this.gather[frame] ?? this.idle[view];
    if (kind === "release") return this.release[frame] ?? this.idle[view];
    if (kind === "rebound") return this.rebound[frame] ?? this.idle[view];
    if (kind === "celebrate") return this.celebrate[frame] ?? this.idle[view];
    if (kind === "talk") return this.talk[0] ?? this.idle[view];
    if (kind === "interact") return this.interact[0] ?? this.idle[view];
    if (kind === "phone") return this.phone[0] ?? this.idle[view];
    if (kind === "walk") return this.walk[view]?.[frame] ?? this.idle[view];
    return this.idle[view];
  }

  update(
    dt: number,
    heading: number,
    cameraYaw: number,
    speed: number,
    lean: number,
    state: LocomotionState,
    animT: number,
    thirdPerson: boolean,
    air = 0,
    vz = 0,
    jooking = false,
    dribbling = false,
    charging = false,
    releasing = false,
    listening = false,
    musicT = 0,
    celebrating = 0,
    talking = false,
    interacting = false,
    rebounding = false,
  ) {
    this.root.visible = thirdPerson;
    this.root.rotation.y = cameraYaw;

    if (state !== this.lastState) {
      this.lastState = state;
      this.actionT = 0;
    } else {
      this.actionT += dt;
    }

    const jumping = state === "jump" || air > 0.04;
    const kind: CycleKind = jumping
      ? "jump"
      : releasing
        ? "release"
        : charging
          ? "gather"
          : celebrating > 0.12
            ? "celebrate"
            : rebounding
              ? "rebound"
              : dribbling
                ? "dribble"
                : talking
                  ? "talk"
                  : interacting
                    ? "interact"
                    : state === "shoot"
                      ? "shoot"
                      : state === "walk" || state === "run"
                        ? "walk"
                        : this.actionT > 3.8 && state === "idle"
                          ? "phone"
                          : "idle";
    const frame = kind === "walk"
      ? walkFrame(animT)
      : kind === "jump"
        ? jumpFrame(air, vz)
        : kind === "dribble"
          ? walkFrame(animT * 1.35)
          : kind === "gather"
            ? Math.min(1, Math.floor(this.actionT / 0.16))
            : kind === "release"
              ? Math.min(1, Math.floor(this.actionT / 0.09))
              : kind === "rebound" || kind === "celebrate"
                ? Math.min(1, Math.floor(this.actionT / 0.18))
                : kind === "shoot"
                  ? Math.min(3, Math.floor(this.actionT / 0.105))
                  : 0;

    const rel = wrap(heading - cameraYaw);
    const blend = viewBlend(rel);

    if (this.ready) {
      const view = blend.wa >= blend.wb ? blend.a : blend.b;
      const key = `${view}:${kind}:${frame}:${this.outfitId}`;
      if (key !== this.lastKeyA) {
        const mat = this.matFor(
          kind === "jump" || kind === "shoot" || kind === "dribble" || kind === "gather" || kind === "release" || kind === "rebound" || kind === "celebrate" || kind === "talk" || kind === "interact" || kind === "phone"
            ? "front"
            : view,
          kind,
          frame,
        );
        if (mat) this.cardA.material = mat;
        this.lastKeyA = key;
      }
      const matA = this.cardA.material as THREE.MeshBasicMaterial;
      matA.opacity = 1;
      matA.transparent = false;
      matA.alphaTest = CUTOUT_ALPHA;
      // Match cutoutMeshMaterial: MSAA resolves the silhouette instead of a
      // hard binary edge. Without this the runtime swap re-introduces the
      // stair-stepped outline that hardenCutoutTexture was fixed to remove.
      matA.alphaToCoverage = true;
      matA.depthWrite = true;
      this.cardB.visible = false;
    }

    this.body.rotation.z = (jooking ? Math.sin(animT * 2.2) * 0.18 : dribbling ? Math.sin(animT * 2.4) * 0.1 : 0) + lean * 0.55;
    this.body.rotation.x = jooking
      ? Math.sin(animT * 3.1) * 0.12
      : charging
        ? -0.14
        : releasing
          ? 0.1
          : state === "run"
            ? -0.05
            : state === "walk"
              ? -0.02
              : jumping
                ? -0.04
                : 0;
    const dribbleBeat = dribbling ? Math.abs(Math.sin(animT * 2.35)) : 0;
    const bob =
      jumping
        ? 0
        : jooking
          ? Math.abs(Math.sin(animT * 2.4)) * 0.16
          : dribbling
            ? dribbleBeat * 0.06
          : state === "idle"
            ? Math.sin(animT * 0.7) * 0.01
            : Math.abs(Math.sin(animT)) * (state === "run" ? 0.042 : 0.024);

    if (listening) this.grooveT = Math.min(1, this.grooveT + dt * 4.5);
    else this.grooveT = Math.max(0, this.grooveT - dt * 5.5);
    const groove = this.grooveT * this.grooveT;
    const beat = musicT > 0.05 ? musicT * 9.95 : animT * 8.6;
    const hit = Math.pow(Math.max(0, Math.sin(beat)), 2.4);
    const nod = groove * hit;
    if (!jooking && !jumping && groove > 0.02) {
      this.body.rotation.x += nod * 0.32;
      this.body.rotation.z += Math.sin(beat * 0.5) * 0.05 * groove;
    }
    this.body.position.y = air + bob - nod * 0.07;

    const stretch = jumping
      ? vz > 0.8
        ? 1.08
        : vz < -1.2
          ? 0.94
          : 1.03
      : charging
        ? 0.92
        : releasing
          ? 1.12
      : 1 + Math.sin(animT * 2) * 0.016 * Math.min(speed / 268, 1);
    const squat = jumping && vz > 0.8 ? 0.94 : jumping && vz < -1.2 ? 1.06 : charging ? 1.08 : releasing ? 0.9 : dribbling ? 1 + dribbleBeat * 0.03 : 1;
    this.cardA.scale.set(squat * (1 + nod * 0.05), stretch * (1 - nod * 0.08), 1);
    this.cardB.scale.set(squat * (1 + nod * 0.05), stretch * (1 - nod * 0.08), 1);

    const lift = Math.min(air / 1.4, 1);
    this.shadow.scale.setScalar(1 - lift * 0.45);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - lift * 0.7);
  }
}
