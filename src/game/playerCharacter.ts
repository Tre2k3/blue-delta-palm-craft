import * as THREE from "three";
import type { LocomotionState } from "./characterController";
import { cleanSprite } from "./chroma";
import { CUTOUT_ALPHA, hardenCutoutTexture } from "./cutout";
import { dressBenji } from "./outfitCompositor";
import { lookFor, stampFor, overlayKey, type View } from "./outfitLook";
import { outfitImageKey, outfitPlatesFor } from "./outfitSprites";
import { basketballImageKey, basketballPackFor } from "./basketballSprites";
import type { ApparelId } from "./types";

type CycleKind =
  | "idle"
  | "walk"
  | "jump"
  | "shoot"
  | "dribble"
  | "gather"
  | "release"
  | "rebound"
  | "celebrate"
  | "talk"
  | "interact"
  | "phone"
  | "bb-ready"
  | "bb-drive"
  | "bb-shot";

const TAU = Math.PI * 2;
const VIEWS: View[] = ["back", "right", "front", "left"];
const CARD_H = 1.78;

function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function finishTexture(tex: THREE.Texture) {
  return hardenCutoutTexture(tex);
}

function opaqueHeightRatio(src: HTMLImageElement | HTMLCanvasElement): number {
  const c = src instanceof HTMLCanvasElement ? src : copyTransparent(src);
  const ctx = c.getContext("2d");
  if (!ctx) return 1;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let y0 = height;
  let y1 = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > 12) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }
  }
  if (y1 <= y0) return 1;
  return (y1 - y0 + 1) / height;
}

function srcSize(src: HTMLImageElement | HTMLCanvasElement) {
  if (src instanceof HTMLImageElement) {
    return { w: src.naturalWidth || src.width || 1, h: src.naturalHeight || src.height || 1 };
  }
  return { w: src.width || 1, h: src.height || 1 };
}

function copyTransparent(src: HTMLImageElement | HTMLCanvasElement) {
  const { w, h } = srcSize(src);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

function benjiCardMaterial(src?: HTMLImageElement | HTMLCanvasElement, path = "") {
  if (!src) {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      visible: false,
      depthWrite: false,
    });
  }
  const tex = finishTexture(new THREE.CanvasTexture(copyTransparent(src)));
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    alphaTest: CUTOUT_ALPHA,
    alphaToCoverage: true,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
    side: THREE.DoubleSide,
    // Unlit plate: ACES at day exposure pushed his browns to yellow. Show the approved colours, same as street NPC cards.
    toneMapped: false,
    fog: true,
  });
  mat.userData.path = path;
  mat.userData.imgW = srcSize(src).w;
  mat.userData.imgH = srcSize(src).h;
  return mat;
}

function plateMat(src?: HTMLImageElement | HTMLCanvasElement, path = "") {
  return benjiCardMaterial(src, path);
}

function cardMat(src?: HTMLImageElement | HTMLCanvasElement, path = "") {
  return benjiCardMaterial(src, path);
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
  private bbReady: THREE.MeshBasicMaterial | null = null;
  private bbDrive: THREE.MeshBasicMaterial | null = null;
  private bbShotFront: THREE.MeshBasicMaterial | null = null;
  private bbShotBack: THREE.MeshBasicMaterial | null = null;
  private bbLoaded = false;
  private ready = false;
  private lastKeyA = "";
  private lastKeyB = "";
  private lastState: LocomotionState = "idle";
  private actionT = 0;
  private grooveT = 0;
  private images: Record<string, HTMLImageElement> = {};
  private outfitId: ApparelId = "starter_tee";
  private icon: HTMLImageElement | HTMLCanvasElement | null = null;
  private cardW = 0;
  private packScale = 1;
  private activeKind: CycleKind = "idle";
  private activePath = "";
  private qCam = new THREE.Quaternion();
  private qParent = new THREE.Quaternion();
  private qLocal = new THREE.Quaternion();
  private tmpPos = new THREE.Vector3();
  private upY = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.root.add(this.body);
    const geo = this.makeCardGeo(1.05);
    const blank = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.cardA = new THREE.Mesh(geo, blank);
    this.cardB = new THREE.Mesh(geo.clone(), blank.clone());
    this.cardA.position.y = 0.02;
    this.cardB.position.y = 0.02;
    this.cardB.visible = false;
    this.cardA.castShadow = false;
    this.cardA.renderOrder = 2;
    this.cardB.renderOrder = 2;
    this.body.add(this.cardA);
    this.body.add(this.cardB);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.46, depthWrite: false, toneMapped: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.03;
    this.root.add(this.shadow);
  }

  private makeCardGeo(width: number) {
    const geo = new THREE.PlaneGeometry(width, CARD_H);
    // Pivot at the feet so scale / camera-billboard never bury the head or shoes.
    geo.translate(0, CARD_H / 2, 0);
    return geo;
  }

  private layoutCard(mat: THREE.MeshBasicMaterial) {
    const img = mat.map?.image as { width?: number; height?: number } | undefined;
    const imgW = Number(mat.userData.imgW) || img?.width || 512;
    const imgH = Number(mat.userData.imgH) || img?.height || 896;
    const width = CARD_H * (imgW / Math.max(imgH, 1));
    if (Math.abs(width - this.cardW) < 0.004) return;
    this.cardW = width;
    this.cardA.geometry.dispose();
    this.cardA.geometry = this.makeCardGeo(width);
    this.cardB.visible = false;
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
    if (this.outfitId) this.rebuildOutfit();
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

  private disposeBasketball() {
    const drop = (m: THREE.MeshBasicMaterial | null) => {
      if (!m) return;
      m.map?.dispose();
      m.dispose();
    };
    drop(this.bbReady);
    drop(this.bbDrive);
    drop(this.bbShotFront);
    drop(this.bbShotBack);
    this.bbReady = null;
    this.bbDrive = null;
    this.bbShotFront = null;
    this.bbShotBack = null;
    this.bbLoaded = false;
    this.packScale = 1;
  }

  /** Pre-dressed action plates. Never run these through dressBenji. */
  applyBasketballPack(pack: {
    ready?: HTMLImageElement | HTMLCanvasElement | null;
    drive?: HTMLImageElement | HTMLCanvasElement | null;
    shotFront?: HTMLImageElement | HTMLCanvasElement | null;
    shotBack?: HTMLImageElement | HTMLCanvasElement | null;
  } | null) {
    this.disposeBasketball();
    if (!pack) return;
    const plate = (src?: HTMLImageElement | HTMLCanvasElement | null, path = "") => (src ? plateMat(src, path) : null);
    this.bbReady = plate(pack.ready, "ready");
    this.bbDrive = plate(pack.drive, "drive");
    this.bbShotFront = plate(pack.shotFront, "shot-front");
    this.bbShotBack = plate(pack.shotBack, "shot-back");
    this.bbLoaded = !!(this.bbReady || this.bbDrive || this.bbShotFront || this.bbShotBack);
    this.packScale = 1;
    const readyFill = pack.ready ? opaqueHeightRatio(pack.ready) : 0;
    const fills = [pack.ready, pack.drive, pack.shotFront, pack.shotBack]
      .filter(Boolean)
      .map((src) => opaqueHeightRatio(src as HTMLImageElement | HTMLCanvasElement));
    const refFill = readyFill > 0.2 ? readyFill : fills.length ? Math.max(...fills) : 1;
    if (refFill > 0.2 && refFill < 0.93) this.packScale = Math.min(1.18, 0.94 / refFill);
    this.lastKeyA = "";
  }

  private rebuildOutfit() {
    this.disposePack();
    const images = this.images;
    const plates = outfitPlatesFor(this.outfitId);
    const plateImg = (view: View) => images[outfitImageKey(this.outfitId, view)];
    if (plates && (plateImg("front") || plateImg("back"))) {
      const front = plateImg("front") || plateImg("back");
      const back = plateImg("back") || front;
      const left = plateImg("left") || front;
      const right = plateImg("right") || front;
      this.idle.front = cardMat(front);
      this.idle.back = cardMat(back);
      this.idle.left = cardMat(left);
      this.idle.right = cardMat(right);
      for (const view of VIEWS) {
        const idle = this.idle[view]!;
        this.walk[view] = [idle, idle, idle, idle];
      }
      const stand = this.idle.front!;
      this.jump = [stand, stand, stand, stand];
      this.shoot = [stand, stand];
      this.dribble = [stand, stand, stand, stand];
      this.gather = [stand, stand];
      this.release = [stand, stand];
      this.rebound = [stand, stand];
      this.celebrate = [stand, stand];
      this.talk = [stand];
      this.interact = [stand];
      this.phone = [stand];
      this.applyLoadedBasketball();
      this.ready = true;
      this.lastKeyA = "";
      this.lastKeyB = "";
      return;
    }
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
    const pack = (prefix: string, count: number, fallback: THREE.MeshBasicMaterial[]) =>
      Array.from({ length: count }, (_, i) => {
        const img = images[`${prefix}-${i + 1}`];
        return img ? cardMat(this.dress(img, "front")) : fallback[i % fallback.length]!;
      });
    this.dribble = pack("dribble", 4, this.jump);
    this.gather = pack("gather", 2, this.jump);
    this.release = pack("release", 2, this.jump);
    this.shoot = this.release;
    this.rebound = pack("rebound", 2, this.jump);
    this.celebrate = pack("celebrate", 2, this.jump);
    this.talk = pack("talk", 1, [this.idle.front!]);
    this.interact = pack("interact", 1, [this.idle.front!]);
    this.phone = pack("phone", 1, [this.idle.front!]);

    this.applyLoadedBasketball();
    this.ready = true;
    this.lastKeyA = "";
    this.lastKeyB = "";
  }

  private applyLoadedBasketball() {
    const spec = basketballPackFor(this.outfitId);
    if (!spec) {
      this.applyBasketballPack(null);
      return;
    }
    const ready = this.images[basketballImageKey(this.outfitId, "ready")];
    const drive = this.images[basketballImageKey(this.outfitId, "drive")];
    const shotFront = this.images[basketballImageKey(this.outfitId, "shotFront")];
    const shotBack = this.images[basketballImageKey(this.outfitId, "shotBack")];
    if (ready || drive || shotFront || shotBack) {
      this.applyBasketballPack({ ready, drive, shotFront, shotBack });
    } else {
      this.applyBasketballPack(null);
    }
  }

  private matFor(view: View, kind: CycleKind, frame: number, shotBack = false) {
    if (kind === "bb-ready") return this.bbReady ?? this.idle[view];
    if (kind === "bb-drive") return this.bbDrive ?? this.bbReady ?? this.idle[view];
    if (kind === "bb-shot") return (shotBack ? this.bbShotBack : this.bbShotFront) ?? this.bbReady ?? this.idle[view];
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
    ballHeld = false,
    basketballMode = false,
  ) {
    this.root.visible = thirdPerson;
    // Yaw is a fallback; alignToCamera() after the chase cam is placed does the real billboard.

    if (state !== this.lastState) {
      this.lastState = state;
      this.actionT = 0;
    } else {
      this.actionT += dt;
    }

    const jumping = state === "jump" || air > 0.04;
    const useBb = this.bbLoaded;
    const towardCam = Math.cos(wrap(heading - cameraYaw));
    const facingBack = towardCam > (releasing || charging ? -0.08 : 0.12);
    let kind: CycleKind = "idle";
    if (basketballMode) {
      // Never jump-1..4 or baked-ball dribble on the court.
      if (useBb) {
        if (releasing || state === "shoot" || (charging && this.actionT > 0.12)) {
          kind = "bb-shot";
        } else if (charging) {
          kind = "bb-ready";
        } else if (rebounding) {
          kind = "rebound";
        } else if (ballHeld && (speed > 18 || state === "walk" || state === "run")) {
          kind = "bb-drive";
        } else if (ballHeld) {
          kind = "bb-ready";
        } else if (jumping) {
          kind = "jump";
        } else if (state === "walk" || state === "run") {
          kind = "bb-drive";
        } else {
          kind = "bb-ready";
        }
      } else if (ballHeld && (state === "walk" || state === "run" || speed > 8)) {
        kind = "walk";
      } else {
        kind = "idle";
      }
    } else if (jumping) kind = "jump";
    else if (celebrating > 0.12) kind = "celebrate";
    else if (talking) kind = "talk";
    else if (interacting) kind = "interact";
    else if (state === "shoot") kind = "shoot";
    else if (state === "walk" || state === "run") kind = "walk";
    else if (this.actionT > 3.8 && state === "idle") kind = "phone";
    else kind = "idle";
    const frame = kind === "walk"
      ? walkFrame(animT)
      : kind === "jump"
        ? jumpFrame(air, vz)
        : kind === "celebrate"
          ? Math.min(1, Math.floor(this.actionT / 0.18))
          : kind === "shoot"
            ? Math.min(3, Math.floor(this.actionT / 0.105))
            : 0;

    const rel = wrap(heading - cameraYaw);
    const blend = viewBlend(rel);

    if (this.ready) {
      const view = blend.wa >= blend.wb ? blend.a : blend.b;
      const key = `${view}:${kind}:${frame}:${this.outfitId}:${facingBack ? "b" : "f"}:${this.bbLoaded ? "bb" : "x"}`;
      if (key !== this.lastKeyA) {
        const posed = kind !== "idle" && kind !== "walk";
        const mat = this.matFor(posed ? "front" : view, kind, frame, facingBack);
        if (mat) {
          this.cardA.material = mat;
          this.layoutCard(mat);
          this.activePath = String(mat.userData.path || "");
        }
        this.lastKeyA = key;
      }
      const matA = this.cardA.material as THREE.MeshBasicMaterial;
      matA.opacity = 1;
      matA.transparent = true;
      matA.alphaTest = CUTOUT_ALPHA;
      matA.alphaToCoverage = true;
      matA.depthWrite = true;
      this.cardA.visible = true;
      this.cardB.visible = false;
      this.activeKind = kind;
      if (typeof window !== "undefined") {
        (window as unknown as { __BENJI_VISUAL_DEBUG__?: Record<string, unknown> }).__BENJI_VISUAL_DEBUG__ = {
          activeMaterial: kind,
          activeOutfit: this.outfitId,
          action: kind,
          cardAVisible: this.cardA.visible,
          cardBVisible: this.cardB.visible,
          texturePath: this.activePath,
          bbLoaded: this.bbLoaded,
        };
      }
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

    const bbPose = basketballMode && (charging || releasing || ballHeld);
    const stretch = bbPose
      ? 1
      : jumping
      ? vz > 0.8
        ? 1.08
        : vz < -1.2
          ? 0.94
          : 1.03
      : 1 + Math.sin(animT * 2) * 0.016 * Math.min(speed / 268, 1);
    const squat = bbPose ? 1 : jumping && vz > 0.8 ? 0.94 : jumping && vz < -1.2 ? 1.06 : dribbling ? 1 + dribbleBeat * 0.03 : 1;
    const usingBb = kind === "bb-ready" || kind === "bb-drive" || kind === "bb-shot";
    const bodyScale = usingBb ? this.packScale : 1;
    const sx = squat * (1 + nod * 0.05) * bodyScale;
    const sy = stretch * (1 - nod * 0.08) * bodyScale;
    this.cardA.scale.set(sx, sy, 1);
    this.cardB.scale.set(sx, sy, 1);
    // Geometry is feet-pivoted; sit just above the court slab so shoes stay visible.
    this.cardA.position.y = 0.02;
    this.cardB.position.y = 0.02;

    const lift = Math.min(air / 1.4, 1);
    this.shadow.scale.setScalar(1 - lift * 0.45);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.46 * (1 - lift * 0.7);
  }

  /** Yaw-only billboard — stay upright so a court camera cannot flatten him into a torso. */
  alignToCamera(camera: THREE.Camera) {
    const parent = this.cardA.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    parent.getWorldPosition(this.tmpPos);
    const yaw = Math.atan2(camera.position.x - this.tmpPos.x, camera.position.z - this.tmpPos.z);
    this.qCam.setFromAxisAngle(this.upY, yaw);
    parent.getWorldQuaternion(this.qParent);
    this.qLocal.copy(this.qParent).invert().multiply(this.qCam);
    this.cardA.quaternion.copy(this.qLocal);
    this.cardB.quaternion.copy(this.qLocal);
  }
}
