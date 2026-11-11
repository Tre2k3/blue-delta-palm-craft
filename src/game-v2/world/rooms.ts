import * as THREE from "three";
import type { Place, Solid } from "../core/types";
import { cropTex, tex } from "../gfx/tex";
import { CATALOG } from "../play/catalog";
import { Frame, MAT, YAW, addSolid, emissiveMat, makeCtx, neon, sign, std, type BuildCtx } from "./kit";
import { ROOM, type Rect } from "./map";

export type Room = {
  id: Place;
  group: THREE.Group;
  bounds: Rect;
  solids: Solid[];
  floorY: number;
  spawn: { x: number; z: number; heading: number };
  exit: { x: number; z: number };
  lights: THREE.PointLight[];
  /** Hemisphere fill while inside. */
  ambient: { sky: number; ground: number; power: number };
  /** Camera boom length indoors. */
  boom: number;
};

const loader = new THREE.TextureLoader();
function image(src: string) {
  const t = loader.load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function light(group: THREE.Group, list: THREE.PointLight[], x: number, y: number, z: number, color: number, power: number, reach = 16) {
  const l = new THREE.PointLight(color, power, reach, 1.6);
  l.position.set(x, y, z);
  group.add(l);
  list.push(l);
  return l;
}

/** Shell: floor, four walls, ceiling. Local +Z is the door wall. */
export function shell(ctx: BuildCtx, cx: number, cz: number, w: number, d: number, h: number, floor: THREE.Material, wall: THREE.Material, ceil: THREE.Material, tile = 4) {
  ctx.ground.flat(w, d, cx, 0, cz, floor, 0, tile);
  const cg = new THREE.PlaneGeometry(w, d);
  cg.rotateX(Math.PI / 2);
  ctx.solid.add(cg, ceil, cx, h, cz);
  ctx.solid.wall(w, h, cx, h / 2, cz - d / 2, wall, YAW.south, w / 4, h / 4);
  ctx.solid.wall(w, h, cx, h / 2, cz + d / 2, wall, YAW.north, w / 4, h / 4);
  ctx.solid.wall(d, h, cx - w / 2, h / 2, cz, wall, YAW.east, d / 4, h / 4);
  ctx.solid.wall(d, h, cx + w / 2, h / 2, cz, wall, YAW.west, d / 4, h / 4);
  addSolid(ctx, cx - w / 2 - 1, cx + w / 2 + 1, cz - d / 2 - 1, cz - d / 2);
  addSolid(ctx, cx - w / 2 - 1, cx + w / 2 + 1, cz + d / 2, cz + d / 2 + 1);
  addSolid(ctx, cx - w / 2 - 1, cx - w / 2, cz - d / 2, cz + d / 2);
  addSolid(ctx, cx + w / 2, cx + w / 2 + 1, cz - d / 2, cz + d / 2);
}

export function finish(ctx: BuildCtx, group: THREE.Group) {
  ctx.ground.build(group, { cast: false, receive: true });
  ctx.solid.build(group, { cast: false, receive: true });
  for (const m of ctx.flat.build(group, { cast: false, receive: false })) m.renderOrder = 2;
  ctx.glow.apply(1, 0.5);
  group.visible = false;
}

const STEP_UP = 0.24;

export type HqRoom = Room & {
  counter: { x: number; z: number };
  /** Where K Blanco stands, and how far the step behind the counter lifts her. */
  kSpot: { x: number; z: number; heading: number; lift: number };
  fitting: { x: number; z: number };
  /** Product on show at each stand. */
  stands: { x: number; z: number; productId: string }[];
};

/** A poster of Benji in three pieces from the line, for the shop's hanging banners. */
function lookbook(title: string, fits: string[]) {
  const c = document.createElement("canvas");
  c.width = c.height = 768;
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const pics: (HTMLImageElement | null)[] = fits.map(() => null);
  const draw = () => {
    const bg = g.createLinearGradient(0, 0, 0, 768);
    bg.addColorStop(0, "#123a22");
    bg.addColorStop(1, "#07130c");
    g.fillStyle = bg;
    g.fillRect(0, 0, 768, 768);
    g.fillStyle = "#39ff14";
    g.fillRect(0, 122, 768, 5);
    g.fillRect(0, 716, 768, 5);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#f5f0e1";
    g.font = `900 68px Impact, "Arial Narrow Bold", "Arial Black", sans-serif`;
    g.fillText(title, 384, 66, 720);
    g.fillStyle = "#e0b33a";
    g.font = `800 26px ui-sans-serif, system-ui, sans-serif`;
    g.fillText("WEAR IT IN MEMPHIS  ·  BUY IT FOR REAL", 384, 745, 720);
    pics.forEach((img, i) => {
      if (!img) return;
      const h = 560;
      const w = (img.naturalWidth / img.naturalHeight) * h;
      g.drawImage(img, 128 + i * 256 - w / 2, 140, w, h);
    });
    t.needsUpdate = true;
  };
  draw();
  fits.forEach((fit, i) => {
    const img = new Image();
    img.onload = () => {
      pics[i] = img;
      draw();
    };
    img.src = `/game/apparel/previews/${fit}.png`;
  });
  return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0xe9e6e0 });
}

/**
 * The showroom: brick and black, green tube light, the cashwrap under the script sign,
 * and the real line on the walls. Every stand is a product you can buy.
 */
export function buildHqRoom(): HqRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(77);
  const C = ROOM.hq;
  const W = 24;
  const D = 16;
  const H = 5.4;
  const brick = MAT.brick("#3a2620", 11);
  const floor = new THREE.MeshStandardMaterial({ map: (MAT.plaza(ctx.glow) as THREE.MeshStandardMaterial).map, roughness: 0.42, metalness: 0.1, color: 0x9a938a });
  shell(ctx, C.x, C.z, W, D, H, floor, brick, std(0x0c0c0e, 0.9), 5);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  const green = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 2.4, 0.18), toneMapped: false });
  const gold = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.5), toneMapped: false });

  // Back wall: black panel, the script sign, the counter under it.
  f.box(11, H, 0.2, 0, H / 2, -D / 2 + 0.1, std(0x0a0a0b, 0.7));
  const signMat = new THREE.MeshBasicMaterial({ map: cropTex("/game/opening-title.webp", 0.272, 0.05, 0.536, 0.232, 1024, 512), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  f.wall(8.4, 4.05, 0, 3.25, -D / 2 + 0.24, signMat, ctx.flat);
  for (const s of [-1, 1]) f.box(0.08, H - 0.4, 0.08, s * 5.5, H / 2, -D / 2 + 0.26, green, ctx.flat);
  const counterZ = -D / 2 + 2.6;
  f.box(7.4, 1.1, 1.1, 0, 0.55, counterZ, std(0x101012, 0.35, 0.3));
  f.box(7.6, 0.08, 1.3, 0, 1.14, counterZ, std(0x1c1a18, 0.2, 0.4));
  f.box(7.3, 0.06, 0.06, 0, 0.06, counterZ + 0.58, gold, ctx.flat);
  f.wall(3.2, 0.5, 0, 0.62, counterZ + 0.56, sign("$ackReligious", "#d8a93a", "#101012", { sub: "KLOTHING", w: 512, h: 128 }), ctx.flat);
  f.box(0.5, 0.36, 0.34, -2.4, 1.36, counterZ, std(0x1a1a1c, 0.4, 0.5));
  f.box(0.42, 0.26, 0.02, -2.4, 1.44, counterZ + 0.18, emissiveMat(ctx, 0x9fd0ff, 0.8, 1.6));
  f.solid(-3.7, 3.7, counterZ - 0.6, counterZ + 0.6);
  // The till stands on a step, so whoever works it looks down at the customer.
  f.box(7.4, STEP_UP, 1.5, 0, STEP_UP / 2, counterZ - 1.35, std(0x141416, 0.6));
  light(group, lights, C.x, 3.6, C.z + counterZ + 1.6, 0xffd9a0, 40, 14);

  // Product stands: a lit frame on the wall with the piece in it.
  const stands: HqRoom["stands"] = [];
  const black = std(0x0a0a0b, 0.5);
  const stand = (lx: number, lz: number, yaw: number, productId: string, w = 2.1, h = 2.7) => {
    const product = CATALOG.find((x) => x.id === productId);
    if (!product) return;
    const sf = new Frame(ctx, C.x + lx, C.z + lz, yaw);
    const art = new THREE.MeshBasicMaterial({ map: image(product.image), toneMapped: false });
    sf.box(w + 0.24, h + 0.24, 0.1, 0, 2.3, 0.05, black);
    sf.wall(w, h, 0, 2.3, 0.11, art, ctx.flat);
    sf.box(w + 0.3, 0.05, 0.05, 0, 2.3 + h / 2 + 0.16, 0.12, green, ctx.flat);
    sf.box(w + 0.3, 0.05, 0.05, 0, 2.3 - h / 2 - 0.16, 0.12, green, ctx.flat);
    sf.wall(w + 0.2, 0.34, 0, 0.62, 0.1, sign(product.name.toUpperCase(), "#f5f0e1", "#101012", { sub: `$${product.usd} IN STORE`, w: 512, h: 96 }), ctx.flat);
    stands.push({ x: sf.wx(0, 1.7), z: sf.wz(0, 1.7), productId });
  };
  const ids = CATALOG.map((x) => x.id);

  // The real pieces, photographed: one material per shot, shared by every display that shows it.
  const TEES = ["black", "white", "red"] as const;
  type Tee = (typeof TEES)[number];
  const shots = new Map<string, THREE.MeshBasicMaterial>();
  const shot = (tee: Tee, view: "front" | "back" | "print" | "tour") => {
    const key = `${tee}-${view}`;
    let m = shots.get(key);
    if (!m) {
      // The photos run off into the next shirt at the right and bottom edge: trim that away.
      const whole = view === "front" || view === "back";
      const map = whole ? cropTex(`/game/apparel/tour-${tee}-${view}.webp`, 0, 0, 0.945, 0.93, 512, 512) : cropTex(`/game/apparel/tour-${tee}-${view}.webp`, 0.03, 0.03, 0.97, view === "tour" ? 0.8 : 0.97, 256, 256);
      m = new THREE.MeshBasicMaterial({ map, toneMapped: false, color: 0xe9e6e0 });
      shots.set(key, m);
    }
    return m;
  };

  // West wall: the Worldwide Tour bay. Each tee front and back on a black board, life size and up.
  const wf = new Frame(ctx, C.x - W / 2 + 0.02, C.z, YAW.east);
  wf.box(D - 0.9, 4.3, 0.08, 0, 2.5, 0.04, black);
  wf.wall(7.2, 0.72, 0, 4.36, 0.1, sign("WORLDWIDE TOUR", "#e8b84a", "#0a0a0b", { sub: "EST. 2020  ·  KLOTHING KOMPANY", w: 1024, h: 128 }), ctx.flat);
  wf.box(7.4, 0.045, 0.05, 0, 3.94, 0.11, gold, ctx.flat);
  TEES.forEach((tee, i) => {
    const product = CATALOG.find((x) => x.id === `sr-tour-${tee}`);
    // Local +X on this wall runs toward the back of the shop.
    const cx = (1 - i) * 4.85;
    const size = 2.2;
    for (const [dx, view] of [
      [-1.15, "front"],
      [1.15, "back"],
    ] as const) {
      wf.wall(size, size, cx + dx, 2.62, 0.1, shot(tee, view), ctx.flat);
      wf.box(size + 0.1, 0.045, 0.05, cx + dx, 2.62 + size / 2 + 0.07, 0.11, green, ctx.flat);
    }
    wf.box(2 * size + 0.2, 0.045, 0.05, cx, 2.62 - size / 2 - 0.07, 0.11, green, ctx.flat);
    if (product) {
      wf.wall(4.3, 0.42, cx, 1.14, 0.1, sign(product.name.toUpperCase(), "#f5f0e1", "#101012", { sub: `$${product.usd} IN STORE  ·  FRONT + BACK`, w: 1024, h: 100 }), ctx.flat);
      stands.push({ x: wf.wx(cx, 1.7), z: wf.wz(cx, 1.7), productId: product.id });
    }
  });

  // East wall: the rest of the line, under a frieze of the prints.
  [-5.8, -2.9, 0, 2.9, 5.8].forEach((lz, i) => stand(W / 2 - 0.02, lz, YAW.west, ids[4 + i]!));
  const frieze = (fr: Frame, from: number, to: number, y: number, tile = 0.96) => {
    const n = Math.max(1, Math.floor((to - from) / (tile + 0.1)));
    const step = (to - from) / n;
    for (let i = 0; i < n; i++) {
      const tee = TEES[i % 3]!;
      fr.box(tile + 0.06, tile + 0.06, 0.04, from + step * (i + 0.5), y, 0.03, black);
      fr.wall(tile, tile, from + step * (i + 0.5), y, 0.06, shot(tee, i % 2 ? "tour" : "print"), ctx.flat);
    }
  };
  frieze(new Frame(ctx, C.x + W / 2 - 0.02, C.z, YAW.west), -D / 2 + 0.6, D / 2 - 0.6, 4.5);

  // Back wall: cap and chain either side of the sign, the tour list between.
  stand(-8.6, -D / 2 + 0.02, YAW.south, ids[9]!);
  stand(8.6, -D / 2 + 0.02, YAW.south, ids[10]!);
  const bf = new Frame(ctx, C.x, C.z - D / 2 + 0.02, YAW.south);
  ([
    [-6.5, "black"],
    [6.5, "red"],
  ] as const).forEach(([lx, tee]) => {
    bf.box(1.56, 1.96, 0.06, lx, 2.5, 0.03, black);
    bf.wall(1.44, 1.8, lx, 2.5, 0.07, new THREE.MeshBasicMaterial({ map: cropTex(`/game/apparel/tour-${tee}-tour.webp`, 0, 0, 1, 1, 256, 320), toneMapped: false, color: 0xe9e6e0 }), ctx.flat);
    bf.box(1.6, 0.045, 0.05, lx, 3.54, 0.08, gold, ctx.flat);
  });
  frieze(bf, -11.4, -5.9, 4.5);
  frieze(bf, 5.9, 11.4, 4.5);

  // Door wall.
  stand(-8.2, D / 2 - 0.02, YAW.north, ids[11]!);
  stand(8.2, D / 2 - 0.02, YAW.north, ids[12]!);
  for (const lx of [-W / 2 + 1.4, W / 2 - 1.4]) {
    light(group, lights, C.x + lx, 3.9, C.z - 3, 0xfff0d8, 26, 12);
    light(group, lights, C.x + lx, 3.9, C.z + 3.2, 0xfff0d8, 26, 12);
  }

  // Banners hung over the floor either side of the aisle: a tee each, front one way, back the other.
  const wire = std(0x2a2a2e, 0.4, 0.6);
  const hang = (lx: number, lz: number, turn: number, front: THREE.Material, back: THREE.Material, size = 1.9) => {
    const y = 3.2;
    f.box(size + 0.1, size + 0.1, 0.05, lx, y, lz, black, ctx.solid, turn);
    const ox = Math.sin(turn) * 0.035;
    const oz = Math.cos(turn) * 0.035;
    f.wall(size, size, lx + ox, y, lz + oz, front, ctx.flat, turn);
    f.wall(size, size, lx - ox, y, lz - oz, back, ctx.flat, turn + Math.PI);
    for (const s of [-1, 1]) f.box(0.02, H - y - size / 2, 0.02, lx + s * Math.cos(turn) * size * 0.42, (H + y + size / 2) / 2, lz - s * Math.sin(turn) * size * 0.42, wire);
    f.box(size + 0.16, 0.04, 0.07, lx, y - size / 2 - 0.07, lz, green, ctx.flat, turn);
  };
  hang(-3.5, 3.9, 0.3, shot("black", "front"), shot("black", "back"));
  hang(3.5, 3.9, -0.3, shot("red", "front"), shot("red", "back"));
  hang(-3.5, -1.9, 0.3, shot("white", "front"), shot("white", "back"));
  hang(3.5, -1.9, -0.3, lookbook("THE TOUR TEES", ["tour_black", "tour_white", "tour_red"]), lookbook("SACKROW JERSEYS", ["jersey_black_fresh", "jersey_blue_fresh", "jersey_white_224"]));

  // Floor tables: folded stock with the print showing on top of every stack.
  const cloth: Record<Tee | "green", THREE.Material> = { black: std(0x111113, 0.9), white: std(0xece8de, 0.9), red: std(0xa3261c, 0.9), green: std(0x1f6a3c, 0.9) };
  const script = sign("$ackReligious", "#f5f0e1", "#1f6a3c", { w: 256, h: 128 });
  const order = ["black", "red", "white", "green"] as const;
  for (const [tx, tz] of [
    [-4.6, 1.2],
    [4.6, 1.2],
  ] as const) {
    f.box(3.2, 0.1, 1.5, tx, 0.92, tz, MAT.darkWood());
    for (const lx of [-1.4, 1.4]) for (const lz of [-0.6, 0.6]) f.box(0.1, 0.9, 0.1, tx + lx, 0.45, tz + lz, MAT.black());
    for (let i = 0; i < 8; i++) {
      const kind = order[(i + (tx > 0 ? 1 : 0) + (i < 4 ? 0 : 2)) % order.length]!;
      const sx = tx - 1.2 + (i % 4) * 0.8;
      const sz = tz + (i < 4 ? -0.36 : 0.36);
      const tall = 2 + (i % 3);
      for (let k = 0; k < tall; k++) f.box(0.6, 0.07, 0.48, sx, 1.01 + k * 0.075, sz, cloth[kind]);
      f.flat(0.4, 0.4, sx, 1.01 + (tall - 1) * 0.075 + 0.04, sz, kind === "green" ? script : shot(kind, "print"), ctx.flat);
    }
    f.solid(tx - 1.6, tx + 1.6, tz - 0.75, tz + 0.75);
  }
  // Rails by the door: the shirt at each end shows its print.
  for (const rx of [-7.6, 7.6]) {
    f.box(0.06, 1.7, 0.06, rx, 0.85, 4.2, MAT.chrome());
    f.box(0.06, 1.7, 0.06, rx, 0.85, 6.2, MAT.chrome());
    f.box(0.06, 0.06, 2.1, rx, 1.7, 5.2, MAT.chrome());
    for (let i = 0; i < 7; i++) {
      const kind = order[(i + (rx > 0 ? 1 : 3)) % order.length]!;
      f.box(0.62, 0.8, 0.05, rx, 1.24, 4.4 + i * 0.27, cloth[kind], ctx.solid, 0.12);
      const face = kind === "green" ? script : shot(kind, "print");
      if (i === 6) f.wall(0.46, 0.46, rx + 0.004, 1.3, 4.4 + i * 0.27 + 0.03, face, ctx.flat, 0.12);
      if (i === 0) f.wall(0.46, 0.46, rx - 0.004, 1.3, 4.4 - 0.03, kind === "green" ? script : shot(kind, "tour"), ctx.flat, 0.12 + Math.PI);
    }
    f.solid(rx - 0.4, rx + 0.4, 4.1, 6.3);
  }
  // Ceiling: black, track heads, a green line round the room.
  for (const lx of [-8, -4, 0, 4, 8]) {
    for (const lz of [-4, 0, 4]) {
      f.box(0.18, 0.16, 0.18, lx, H - 0.14, lz, MAT.black());
      f.box(0.12, 0.03, 0.12, lx, H - 0.24, lz, emissiveMat(ctx, 0xfff0d8, 2, 3));
    }
  }
  f.box(W - 0.6, 0.05, 0.05, 0, H - 0.3, -D / 2 + 0.3, green, ctx.flat);
  f.box(W - 0.6, 0.05, 0.05, 0, H - 0.3, D / 2 - 0.3, green, ctx.flat);
  f.box(0.05, 0.05, D - 0.6, -W / 2 + 0.3, H - 0.3, 0, green, ctx.flat);
  f.box(0.05, 0.05, D - 0.6, W / 2 - 0.3, H - 0.3, 0, green, ctx.flat);
  // Door wall: the door, the mascot wall, the fitting room.
  f.box(2.6, 3.4, 0.14, 0, 1.7, D / 2 - 0.08, emissiveMat(ctx, 0xffb46a, 0.5, 0.9));
  f.box(2.9, 0.16, 0.2, 0, 3.48, D / 2 - 0.1, MAT.black());
  f.wall(1.6, 0.36, 0, 3.86, D / 2 - 0.2, sign("EXIT", "#39ff14", "#0a0a0b", { w: 256, h: 64 }), ctx.flat, Math.PI);
  const wallArt = new THREE.MeshBasicMaterial({ map: image("/game/logo-wall.webp"), toneMapped: false, color: 0xd8d2c6 });
  f.wall(5.4, 3.2, 4.6, 2.5, D / 2 - 0.04, wallArt, ctx.flat, Math.PI);
  f.box(2.6, 3.6, 0.14, -4.6, 1.8, D / 2 - 0.5, std(0x17110e, 0.8));
  f.wall(2.2, 3.2, -4.6, 1.8, D / 2 - 0.58, new THREE.MeshStandardMaterial({ color: 0x9fb4c0, roughness: 0.16, metalness: 0.95 }), ctx.solid, Math.PI);
  f.wall(2.4, 0.4, -4.6, 3.9, D / 2 - 0.58, sign("FITTING ROOM", "#d8a93a", "#101012", { w: 384, h: 64 }), ctx.flat, Math.PI);
  light(group, lights, C.x, 3.8, C.z + 4, 0x7dff6a, 14, 12);
  // Plants in the corners.
  for (const [px, pz] of [
    [-W / 2 + 1, D / 2 - 1],
    [W / 2 - 1, D / 2 - 1],
  ] as const) {
    f.add(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 10), std(0x4a4640, 0.9), px, 0.4, pz);
    for (let i = 0; i < 5; i++) f.add(new THREE.ConeGeometry(0.18, 1.6, 5), MAT.leaf(i), px + Math.cos(i * 1.3) * 0.16, 1.5, pz + Math.sin(i * 1.3) * 0.16, ctx.solid, 0, Math.cos(i) * 0.3, Math.sin(i * 2) * 0.3);
  }
  finish(ctx, group);
  return {
    id: "hq",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    // A few steps in from the door, so the first look is the whole shop and not the floor.
    spawn: { x: C.x, z: C.z + D / 2 - 3.6, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 0.9 },
    lights,
    ambient: { sky: 0xffe2c0, ground: 0x2a1e16, power: 0.55 },
    boom: 4.4,
    counter: { x: C.x, z: C.z + counterZ + 1.5 },
    kSpot: { x: C.x + 1.3, z: C.z + counterZ - 0.98, heading: 0, lift: STEP_UP },
    fitting: { x: C.x - 4.6, z: C.z + D / 2 - 1.9 },
    stands,
  };
}

export type HomeRoom = Room & { wardrobe: { x: number; z: number }; bed: { x: number; z: number } };

/** Benji's front room: couch, TV, the closet. */
export function buildHomeRoom(): HomeRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(31);
  const C = ROOM.home;
  const W = 11;
  const D = 9;
  const H = 3.2;
  const wood = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#7a5636";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(${50 + i * 9},${32 + i * 5},18,0.45)`;
        g.fillRect(0, i * 21.3, w, 20);
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(0, i * 21.3 + 20, w, 1.4);
      }
    }),
    roughness: 0.6,
  });
  shell(ctx, C.x, C.z, W, D, H, wood, std(0xd9cfb8, 0.95), std(0xeeeae2, 0.95), 2);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  // Couch and rug facing the TV on the west wall.
  f.flat(4.2, 3, -1, 0.01, 0.4, std(0x1f4a2c, 1), ctx.ground);
  f.box(0.9, 0.5, 2.6, 1.1, 0.3, 0.4, std(0x3a3d42, 0.9));
  f.box(0.3, 0.7, 2.6, 1.55, 0.75, 0.4, std(0x3a3d42, 0.9));
  f.box(0.9, 0.3, 0.3, 1.1, 0.65, -0.9, std(0x34373c, 0.9));
  f.box(0.9, 0.3, 0.3, 1.1, 0.65, 1.7, std(0x34373c, 0.9));
  f.solid(0.6, 1.8, -1.1, 1.9);
  f.box(0.5, 0.5, 2.2, -W / 2 + 0.4, 0.25, 0.4, MAT.darkWood());
  f.box(0.08, 1.2, 2, -W / 2 + 0.3, 1.4, 0.4, MAT.black());
  f.box(0.02, 1.08, 1.88, -W / 2 + 0.36, 1.4, 0.4, emissiveMat(ctx, 0x6aa8ff, 1.2, 1.6));
  f.solid(-W / 2, -W / 2 + 0.7, -0.8, 1.6);
  light(group, lights, C.x - W / 2 + 1.6, 1.6, C.z + 0.4, 0x7ab0ff, 8, 8);
  // Bed in the back corner, closet on the east wall.
  f.box(2, 0.5, 3, W / 2 - 1.2, 0.3, -D / 2 + 1.7, MAT.darkWood());
  f.box(1.9, 0.22, 2.9, W / 2 - 1.2, 0.62, -D / 2 + 1.7, std(0x1f6a3c, 0.95));
  f.box(1.5, 0.16, 0.6, W / 2 - 1.2, 0.8, -D / 2 + 0.6, MAT.white());
  f.solid(W / 2 - 2.3, W / 2, -D / 2, -D / 2 + 3.3);
  f.box(0.7, 2.4, 2.4, W / 2 - 0.4, 1.2, 2.2, MAT.darkWood());
  f.box(0.06, 2.2, 1.1, W / 2 - 0.78, 1.2, 1.62, MAT.wood());
  f.box(0.06, 2.2, 1.1, W / 2 - 0.78, 1.2, 2.78, MAT.wood());
  f.solid(W / 2 - 0.8, W / 2, 1, 3.4);
  // Kitchen counter, posters, the door.
  f.box(3.4, 0.95, 0.7, -3, 0.48, -D / 2 + 0.4, MAT.white());
  f.box(3.5, 0.06, 0.8, -3, 0.98, -D / 2 + 0.4, std(0x2a2c30, 0.4, 0.3));
  f.solid(-4.8, -1.2, -D / 2, -D / 2 + 0.8);
  const poster = new THREE.MeshBasicMaterial({ map: image("/game/ads/901-luxury.webp"), toneMapped: false, color: 0xcfc8bc });
  f.wall(1.5, 1.9, 1.4, 1.9, -D / 2 + 0.03, poster, ctx.flat);
  const poster2 = new THREE.MeshBasicMaterial({ map: image("/game/ads/sacks-giving.webp"), toneMapped: false, color: 0xcfc8bc });
  f.wall(1.3, 1.9, -W / 2 + 0.03, 1.9, -2.6, poster2, ctx.flat, Math.PI / 2);
  f.box(1.1, 2.2, 0.1, 0, 1.1, D / 2 - 0.06, std(0x7a1f1f, 0.6));
  f.box(1.3, 2.36, 0.06, 0, 1.18, D / 2 - 0.03, MAT.white());
  f.box(0.5, 0.06, 0.5, 2.6, H - 0.04, 0, emissiveMat(ctx, 0xffe2b0, 2, 3));
  light(group, lights, C.x, 2.7, C.z, 0xffd9a0, 22, 11);
  finish(ctx, group);
  return {
    id: "home",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x, z: C.z + D / 2 - 1.3, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 0.8 },
    lights,
    ambient: { sky: 0xffe9cc, ground: 0x4a3828, power: 0.75 },
    boom: 3.3,
    wardrobe: { x: C.x + W / 2 - 1.5, z: C.z + 2.2 },
    bed: { x: C.x + W / 2 - 2.8, z: C.z - D / 2 + 1.8 },
  };
}

/** Lane geometry shared by the room and the physics. Local Z: foul line at 0, pins toward -Z. */
export const LANE = {
  width: 1.07,
  gutter: 0.24,
  length: 18.29,
  /** Head pin. */
  pinZ: -18.29,
  /** Row spacing down the deck and pin spacing across it. */
  rowZ: 0.264,
  colX: 0.3048,
  approach: 4.6,
  pitEnd: -19.9,
};

export type BowlRoom = Room & {
  /** World position of the foul line centre of the lane you play. */
  lane: { x: number; z: number };
  desk: { x: number; z: number };
  strikeSpot: { x: number; z: number; heading: number };
};

/** 901 Bowl: five lanes under blacklight, pink and teal neon, one lane yours. */
export function buildBowlRoom(): BowlRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(55);
  const C = ROOM.bowl;
  const W = 17;
  const zFront = 11;
  const zBack = LANE.pitEnd - 1.2;
  const D = zFront - zBack;
  const cz = C.z + (zFront + zBack) / 2;
  const H = 5;
  const carpet = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#1a1030";
      g.fillRect(0, 0, w, h);
      const cols = ["#ff5ad1", "#35e0d0", "#ffd23a", "#7a6cff"];
      for (let i = 0; i < 60; i++) {
        g.fillStyle = cols[i % 4]!;
        g.globalAlpha = 0.5;
        g.beginPath();
        g.arc((i * 37) % w, (i * 53) % h, 2 + (i % 4), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }),
    roughness: 1,
  });
  shell(ctx, C.x, cz, W, D, H, carpet, std(0x1a1030, 0.9), std(0x0a0814, 0.9), 3);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  const laneWood = new THREE.MeshStandardMaterial({
    map: tex(128, 512, (g, w, h) => {
      g.fillStyle = "#d9a55c";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 13; i++) {
        g.fillStyle = `rgba(${150 + (i % 3) * 22},${96 + (i % 4) * 14},40,0.5)`;
        g.fillRect(i * (w / 13), 0, w / 13 - 1, h);
      }
      g.fillStyle = "#3a2a1a";
      // Seven target arrows, the middle one deepest.
      for (let i = 0; i < 7; i++) {
        const x = ((i + 0.5) / 7) * w;
        const y = h * 0.72 + Math.abs(i - 3) * 9;
        g.beginPath();
        g.moveTo(x, y - 12);
        g.lineTo(x - 5, y + 6);
        g.lineTo(x + 5, y + 6);
        g.fill();
      }
      for (let i = 0; i < 10; i++) g.fillRect(((i + 0.5) / 10) * w - 1.5, h * 0.9, 3, 3);
    }, { repeat: false }),
    roughness: 0.08,
    metalness: 0.1,
  });
  const gutter = std(0x17171a, 0.3, 0.4);
  const pitch = LANE.width + LANE.gutter * 2 + 0.5;
  const pink = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.5, 1.9), toneMapped: false });
  const teal = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.0), toneMapped: false });
  const laneLen = LANE.approach - LANE.pitEnd;
  const laneMid = (LANE.approach + LANE.pitEnd) / 2;
  for (let i = -2; i <= 2; i++) {
    const lx = i * pitch;
    f.box(LANE.width, 0.1, laneLen, lx, 0.03, laneMid, laneWood);
    for (const s of [-1, 1]) {
      f.box(LANE.gutter, 0.06, -LANE.pitEnd, lx + s * (LANE.width / 2 + LANE.gutter / 2), 0.0, LANE.pitEnd / 2, gutter);
      f.box(0.24, 0.16, laneLen, lx + s * (LANE.width / 2 + LANE.gutter + 0.12), 0.08, laneMid, std(0x241a3a, 0.5));
      f.box(0.04, 0.04, -LANE.pitEnd, lx + s * (LANE.width / 2 + LANE.gutter + 0.12), 0.18, LANE.pitEnd / 2, i % 2 === 0 ? pink : teal, ctx.flat);
    }
    f.box(LANE.width + 0.1, 0.02, 0.05, lx, 0.085, 0, std(0x101010, 0.5), ctx.flat);
    // Masking unit over the pins with the lane number.
    f.box(pitch - 0.1, 1.5, 0.3, lx, 2.3, LANE.pinZ - 0.4, std(0x120a24, 0.7));
    f.wall(pitch - 0.3, 1.1, lx, 2.3, LANE.pinZ - 0.24, neon(ctx, i === 0 ? "901 BOWL" : `LANE ${i + 3}`, i % 2 === 0 ? "#ff5ad1" : "#35e0d0", { w: 384, h: 128 }), ctx.flat);
    f.box(pitch - 0.1, 2, 0.2, lx, 0.8, LANE.pitEnd - 0.5, std(0x08060e, 0.9));
    if (i !== 0) {
      // Pins standing on the lanes you are not using.
      const rows = [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]];
      rows.forEach((row, r) => row.forEach((c) => f.add(new THREE.CylinderGeometry(0.035, 0.057, 0.38, 8), MAT.white(), lx + c * LANE.colX, 0.27, LANE.pinZ - r * LANE.rowZ)));
    }
  }
  light(group, lights, C.x, 2.2, C.z + LANE.pinZ + 0.6, 0xffffff, 26, 9);
  light(group, lights, C.x, 3.6, C.z - 8, 0x9a6cff, 30, 20);
  light(group, lights, C.x, 3.4, C.z + 3, 0xff8ad8, 34, 16);
  // Ball return beside your lane, seats behind the approach, the desk by the door.
  f.box(0.5, 0.6, 2.2, pitch / 2, 0.3, 3, std(0x241a3a, 0.4, 0.3));
  for (let i = 0; i < 4; i++) f.add(new THREE.SphereGeometry(0.11, 12, 10), std([0x1a1a1c, 0xa3261c, 0x1f4a8a, 0x1f6a3c][i]!, 0.2, 0.4), pitch / 2, 0.7, 2.2 + i * 0.26);
  f.solid(pitch / 2 - 0.3, pitch / 2 + 0.3, 1.9, 4.1);
  for (const sx of [-5.4, -2.6, 2.6, 5.4]) {
    f.box(2.2, 0.45, 0.6, sx, 0.25, 6.2, std(0x35e0d0, 0.7));
    f.box(2.2, 0.7, 0.14, sx, 0.8, 6.5, std(0xff5ad1, 0.7));
    f.solid(sx - 1.1, sx + 1.1, 5.9, 6.6);
  }
  f.box(4.6, 1.15, 1, 5.4, 0.58, 9.2, std(0x241a3a, 0.5));
  f.box(4.7, 0.06, 1.1, 5.4, 1.18, 9.2, std(0xff5ad1, 0.5));
  f.wall(4.2, 1, 5.4, 3.2, zFront - 0.05, neon(ctx, "SHOES · LANES · PRIZES", "#ffd23a", { w: 640, h: 128 }), ctx.flat, Math.PI);
  f.solid(3.1, 7.7, 8.7, zFront);
  f.box(2.4, 3.2, 0.14, 0, 1.6, zFront - 0.08, emissiveMat(ctx, 0xffb46a, 0.5, 0.9));
  f.wall(1.6, 0.36, 0, 3.6, zFront - 0.2, sign("EXIT", "#39ff14", "#0a0a0b", { w: 256, h: 64 }), ctx.flat, Math.PI);
  for (const s of [-1, 1]) f.box(0.05, 0.05, D - 1, s * (W / 2 - 0.2), H - 0.3, (zFront + zBack) / 2, s < 0 ? pink : teal, ctx.flat);
  finish(ctx, group);
  return {
    id: "bowl",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z + zBack, maxZ: C.z + zFront },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x, z: C.z + zFront - 1.5, heading: Math.PI },
    exit: { x: C.x, z: C.z + zFront - 0.9 },
    lights,
    ambient: { sky: 0x8a6cff, ground: 0x1a1030, power: 0.5 },
    boom: 4.2,
    lane: { x: C.x, z: C.z },
    desk: { x: C.x + 5.4, z: C.z + 8 },
    strikeSpot: { x: C.x + 5.4, z: C.z + 9.9, heading: Math.PI },
  };
}
