import * as THREE from "three";
import type { Hoop } from "../core/types";
import { cropTex, glyphCells, paintMat, tex } from "../gfx/tex";
import { addGround } from "./ground";
import { lotSurface } from "./buildings";
import { MAT, Frame, YAW, addSolid, bench, bush, emissiveMat, globeLamp, neon, poolMat, sign, std, tree, type BuildCtx } from "./kit";
import { BAIT_SHOP, COURT, CURB, HQ, PIER, PLAZA, RIVER_Z, ROAD_HALF, STREETS_Z, TRUCKS, rect } from "./map";
import { FOOD, FOOD_TRUCKS, type Truck, type TruckId } from "../play/goods";

const Y0 = CURB;
const OPENING = "/game/opening-title.webp";

export type Riverfront = {
  hoops: Hoop[];
  nets: THREE.Mesh[];
  rims: THREE.Mesh[];
  hqDoor: { x: number; z: number };
  baitCounter: { x: number; z: number };
  trucks: TruckLot;
  castSpots: { x: number; z: number }[];
  ogSpot: { x: number; z: number };
  /** Where Court OG stands, behind his table. */
  ogStand: { x: number; z: number };
  uncStand: { x: number; z: number; heading: number };
};

/** Solid block lettering, readable from across the plaza. */
export function blockText(ctx: BuildCtx, text: string, x: number, y: number, z: number, yaw: number, cell: number, mat: THREE.Material, depth = 0.6) {
  const f = new Frame(ctx, x, z, yaw);
  const adv = cell * 6.2;
  const total = adv * text.length - cell * 1.2;
  [...text].forEach((ch, i) => {
    for (const [cx, cy] of glyphCells(ch)) {
      f.box(cell, cell, depth, -total / 2 + i * adv + cx * cell + cell / 2, y + cy * cell + cell / 2, 0, mat);
    }
  });
  return total;
}

export function buildRiverfront(ctx: BuildCtx): Riverfront {
  const north = STREETS_Z[0] - ROAD_HALF;
  const inner = north - 3.5;

  // Surfaces. The promenade and the HQ plaza are the dark wet stone from the concept art.
  lotSurface(ctx, rect(-230, 230, RIVER_Z, RIVER_Z + 6), "plaza");
  lotSurface(ctx, rect(PLAZA.minX, PLAZA.maxX, RIVER_Z + 6, north), "plaza");
  lotSurface(ctx, rect(-230, -112, RIVER_Z + 6, inner), "grass");
  lotSurface(ctx, rect(-112, -70, RIVER_Z + 6, inner), "concrete");
  lotSurface(ctx, rect(-70, PLAZA.minX, RIVER_Z + 6, inner), "grass");
  lotSurface(ctx, rect(PLAZA.maxX, 50, RIVER_Z + 6, inner), "grass");
  lotSurface(ctx, rect(50, 78, RIVER_Z + 6, inner), "concrete");
  lotSurface(ctx, rect(78, 230, RIVER_Z + 6, inner), "grass");

  // River wall and railing with a gap at the pier.
  ctx.solid.wall(460, 2.2, 0, Y0 - 1.1, RIVER_Z, MAT.brick("#3a3632", 5), YAW.north, 60, 1);
  const rail = MAT.black();
  const railZ = RIVER_Z + 0.5;
  const span = (a: number, b: number) => {
    ctx.solid.box(b - a, 0.09, 0.09, (a + b) / 2, Y0 + 1.08, railZ, rail);
    ctx.solid.box(b - a, 0.06, 0.06, (a + b) / 2, Y0 + 0.6, railZ, rail);
    for (let x = a; x <= b + 0.01; x += 2.4) ctx.solid.box(0.1, 1.1, 0.1, x, Y0 + 0.55, railZ, rail);
    addSolid(ctx, a, b, RIVER_Z - 0.4, railZ + 0.12);
  };
  span(-200, PIER.x - PIER.half);
  span(PIER.x + PIER.half, 200);
  for (let x = -146; x <= 146; x += 18) {
    if (Math.abs(x - PIER.x) < 6) continue;
    globeLamp(ctx, x, RIVER_Z + 1.5, Y0, 0xffd9a0);
    ctx.solid.cyl(0.24, 0.3, 0.9, x + 9, Y0 + 0.45, RIVER_Z + 1.2, MAT.black(), 8);
  }
  for (let x = -138; x <= 138; x += 36) {
    if (x > PLAZA.minX - 4 && x < PLAZA.maxX + 4) continue;
    bench(ctx, x, RIVER_Z + 4.6, YAW.north, Y0);
  }

  const hqDoor = buildHqExterior(ctx);
  const court = buildCourt(ctx);
  const pier = buildPier(ctx);
  const trucks = buildTrucks(ctx);
  buildMemphisSign(ctx);

  // Park planting.
  const r = ctx.rand;
  const groves: [number, number, number, number, number][] = [
    [-148, -116, -190, -152, 9],
    [-68, -44, -176, -152, 5],
    [36, 48, -190, -152, 4],
    [82, 150, -192, -168, 12],
    [124, 150, -166, -152, 4],
  ];
  for (const [x0, x1, z0, z1, n] of groves) {
    for (let i = 0; i < n; i++) tree(ctx, x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), 1 + r() * 0.5, Y0);
    for (let i = 0; i < n; i++) bush(ctx, x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), 0.9 + r() * 0.6, Y0);
  }

  return { ...court, hqDoor, baitCounter: pier.baitCounter, castSpots: pier.castSpots, uncStand: pier.uncStand, trucks };
}

/**
 * The boutique from the concept art: black brick, the green script sign, a lit window full of
 * clothes, wet stone out front. The sign and the window are lifted from the artwork itself.
 */
function buildHqExterior(ctx: BuildCtx) {
  const w = HQ.maxX - HQ.minX;
  const d = HQ.maxZ - HQ.minZ;
  const cx = (HQ.minX + HQ.maxX) / 2;
  const cz = (HQ.minZ + HQ.maxZ) / 2;
  const h = HQ.height;
  const brick = MAT.brick("#1c1816", 7);
  ctx.solid.walls(w, h, d, cx, Y0, cz, brick, 4, 4);
  ctx.solid.flat(w, d, cx, Y0 + h, cz, MAT.roof());
  ctx.solid.box(w + 0.5, 0.5, d + 0.5, cx, Y0 + h - 0.05, cz, MAT.black());
  addSolid(ctx, HQ.minX, HQ.maxX, HQ.minZ, HQ.maxZ);

  const f = new Frame(ctx, cx, HQ.frontZ, YAW.south);
  const lx = (worldX: number) => worldX - cx;
  const green = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 2.6, 0.18), toneMapped: false });
  ctx.glow.basic(green, 0.55, 1.15);

  // Script sign, straight from the artwork. Black in the crop adds nothing, so only the tubes show.
  const signMat = new THREE.MeshBasicMaterial({ map: cropTex(OPENING, 0.272, 0.05, 0.536, 0.232, 1024, 512), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  ctx.glow.basic(signMat, 1.25, 2.3);
  f.wall(11.2, 5.4, lx(-14.2), Y0 + 6.72, 0.12, signMat, ctx.flat);

  // Display window with the green tube frame.
  const winX0 = -18.6;
  const winX1 = -8.4;
  const winY0 = 0.55;
  const winH = 3.55;
  const winTex = cropTex(OPENING, 0.386, 0.232, 0.507, 0.468, 512, 512);
  winTex.wrapS = THREE.RepeatWrapping;
  const winMat = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false });
  ctx.glow.basic(winMat, 0.85, 1.55);
  f.wall(winX1 - winX0, winH, lx((winX0 + winX1) / 2), Y0 + winY0 + winH / 2, 0.05, winMat, ctx.flat, 0, 3, 1);
  // The new drop, postered on the brick beside the door.
  const loader = new THREE.TextureLoader();
  ["/game/products/sr-black-gold-tee.webp", "/game/products/sr-moneybag-hoodie.webp"].forEach((src, i) => {
    const map = loader.load(src);
    map.colorSpace = THREE.SRGBColorSpace;
    const poster = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    ctx.glow.basic(poster, 0.5, 1.05);
    const px = lx(-28.2 + i * 3.1);
    f.box(2.3, 3.3, 0.1, px, Y0 + 2.5, 0.06, MAT.black());
    f.wall(2.1, 3.1, px, Y0 + 2.5, 0.13, poster, ctx.flat);
    f.box(1.2, 0.08, 0.3, px, Y0 + 4.35, 0.2, MAT.gold());
  });
  const tube = 0.09;
  const mid = lx((winX0 + winX1) / 2);
  f.box(winX1 - winX0 + tube, tube, tube, mid, Y0 + winY0 + winH, 0.14, green, ctx.flat);
  f.box(winX1 - winX0 + tube, tube, tube, mid, Y0 + winY0, 0.14, green, ctx.flat);
  for (const x of [winX0, winX1, winX0 + (winX1 - winX0) / 3, winX0 + ((winX1 - winX0) * 2) / 3]) f.box(tube, winH, tube, lx(x), Y0 + winY0 + winH / 2, 0.14, green, ctx.flat);
  f.box(winX1 - winX0 + 0.5, winY0, 0.5, mid, Y0 + winY0 / 2, 0.1, brick);

  // Glass door.
  const doorMat = new THREE.MeshBasicMaterial({ map: cropTex(OPENING, 0.316, 0.262, 0.378, 0.498, 256, 512), toneMapped: false });
  ctx.glow.basic(doorMat, 0.8, 1.45);
  f.wall(2.3, 3.5, lx(HQ.doorX), Y0 + 1.75, 0.05, doorMat, ctx.flat);
  f.box(2.5, 0.12, 0.3, lx(HQ.doorX), Y0 + 3.56, 0.1, MAT.black());
  for (const s of [-1, 1]) f.box(0.12, 3.6, 0.3, lx(HQ.doorX) + s * 1.2, Y0 + 1.8, 0.1, MAT.black());
  f.box(0.06, 1.2, 0.1, lx(HQ.doorX) + 0.8, Y0 + 1.4, 0.22, MAT.gold());

  // Planters either side of the door, as in the artwork.
  for (const px of [HQ.doorX - 2.2, winX1 + 1.1]) {
    f.add(new THREE.CylinderGeometry(0.48, 0.38, 0.9, 10), std(0x4a4640, 0.9), lx(px), Y0 + 0.45, 0.9);
    for (let i = 0; i < 5; i++) {
      f.add(new THREE.ConeGeometry(0.2, 1.5 + (i % 3) * 0.3, 5), MAT.leaf(i), lx(px) + Math.cos(i * 1.3) * 0.2, Y0 + 1.6, 0.9 + Math.sin(i * 1.3) * 0.2, ctx.solid, 0, Math.cos(i) * 0.35, Math.sin(i * 2) * 0.35);
    }
  }
  // Sconces.
  for (const sx of [HQ.minX + 0.9, HQ.maxX - 0.9]) {
    f.box(0.2, 0.5, 0.2, lx(sx), Y0 + 3.2, 0.14, MAT.black());
    f.add(new THREE.SphereGeometry(0.13, 8, 6), emissiveMat(ctx, 0xffc27a, 0.4, 3.4), lx(sx), Y0 + 2.95, 0.18);
  }

  // What the art is really about: green and warm light lying on wet stone.
  const pool = (color: number, k: number) => poolMat(ctx, color, k);
  f.flat(17, 14, lx(-14), Y0 + 0.02, 6.6, pool(0x39ff14, 0.5), ctx.flat);
  f.flat(12, 8, lx(-14), Y0 + 0.025, 4.2, pool(0xffb46a, 0.3), ctx.flat);
  const streak = new THREE.MeshBasicMaterial({
    map: tex(64, 256, (g, tw, th) => {
      const grd = g.createLinearGradient(0, 0, 0, th);
      grd.addColorStop(0, "rgba(57,255,20,0.95)");
      grd.addColorStop(0.5, "rgba(57,255,20,0.3)");
      grd.addColorStop(1, "rgba(57,255,20,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, tw, th);
      const side = g.createLinearGradient(0, 0, tw, 0);
      side.addColorStop(0, "rgba(0,0,0,1)");
      side.addColorStop(0.5, "rgba(0,0,0,0)");
      side.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = side;
      g.fillRect(0, 0, tw, th);
    }),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  ctx.glow.fade(streak, 0.12, 0.62);
  for (const x of [winX0, winX0 + (winX1 - winX0) / 3, winX0 + ((winX1 - winX0) * 2) / 3, winX1]) {
    const g = new THREE.PlaneGeometry(1.5, 11);
    g.rotateX(-Math.PI / 2);
    ctx.flat.add(g, streak, x, Y0 + 0.03, HQ.frontZ + 5.9);
  }
  ctx.lamps.push({ x: -13.5, y: Y0 + 3, z: HQ.frontZ + 3, color: 0x39ff14 });
  ctx.lamps.push({ x: HQ.doorX, y: Y0 + 2.6, z: HQ.frontZ + 2, color: 0xffc27a });

  // East wall faces the open plaza and the river view.
  const east = new Frame(ctx, HQ.maxX, cz, YAW.east);
  east.wall(9, 3.4, 0, Y0 + 4, 0.08, neon(ctx, "MEMPHIS", "#39ff14", { sub: "EST. 901 · KLOTHING", w: 768, h: 288, board: "#0c0b0a" }), ctx.flat);
  east.flat(9, 9, 0, Y0 + 0.02, 5, pool(0x39ff14, 0.3), ctx.flat);
  // Bollards along the plaza edge by the road.
  for (let x = PLAZA.minX + 3; x <= PLAZA.maxX - 3; x += 5.2) ctx.solid.cyl(0.16, 0.2, 0.85, x, Y0 + 0.42, STREETS_Z[0] - ROAD_HALF - 0.8, MAT.black(), 8);
  for (const [x, z] of [
    [8, -160],
    [22, -176],
    [8, -190],
    [-36, -160],
  ] as const) globeLamp(ctx, x, z, Y0);
  bench(ctx, 16, -168, YAW.west, Y0);
  bench(ctx, 16, -184, YAW.west, Y0);
  return { x: HQ.doorX, z: HQ.frontZ + 1.1 };
}

/** The script sign lifted off the concept art, keyed out of its brick wall so it can be painted on a floor. */
function stampLogo(g: CanvasRenderingContext2D, t: THREE.Texture, spots: { x: number; y: number; w: number; h: number; flip?: boolean }[]) {
  const img = new Image();
  img.onload = () => {
    const sw = Math.round(0.264 * img.naturalWidth);
    const sh = Math.round(0.182 * img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const k = c.getContext("2d")!;
    k.drawImage(img, 0.272 * img.naturalWidth, 0.05 * img.naturalHeight, sw, sh, 0, 0, sw, sh);
    const d = k.getImageData(0, 0, sw, sh);
    for (let i = 0; i < d.data.length; i += 4) {
      const lum = 0.3 * d.data[i]! + 0.6 * d.data[i + 1]! + 0.1 * d.data[i + 2]!;
      d.data[i + 3] = Math.max(0, Math.min(1, (lum - 84) / 80)) * 255;
    }
    k.putImageData(d, 0, 0);
    for (const s of spots) {
      g.save();
      g.translate(s.x, s.y);
      if (s.flip) g.rotate(Math.PI);
      g.drawImage(c, -s.w / 2, -s.h / 2, s.w, s.h);
      g.restore();
    }
    t.needsUpdate = true;
  };
  img.src = "/game/opening-title.webp";
}

/** The 901 Court in SackReligious colours: green floor, clay keys, the script at centre and above each arc. */
function courtTexture() {
  const W = 1024;
  const H = 2048;
  const px = (m: number) => (m / 15.2) * W;
  const pz = (m: number) => (m / 28) * H;
  let ctx2: CanvasRenderingContext2D | null = null;
  const t = tex(
    W,
    H,
    (g, w, h) => {
      ctx2 = g;
      // Black apron with the name down both sidelines.
      g.fillStyle = "#0c0f0d";
      g.fillRect(0, 0, w, h);
      const line = "#f2efe6";
      const gold = "#d8a93a";
      g.fillStyle = "#1f5a39";
      g.fillRect(px(0.6), pz(0.6), px(14), pz(26.8));
      // Broad paint strokes so the green is not one flat fill.
      for (let i = 0; i < 46; i++) {
        g.fillStyle = `rgba(${i % 2 ? "57,255,20" : "0,0,0"},${0.025 + (i % 5) * 0.006})`;
        g.fillRect(px(0.6), pz(0.6 + (i / 46) * 26.8), px(14), pz(0.6));
      }
      g.lineWidth = px(0.09);
      g.strokeStyle = line;
      g.strokeRect(px(0.6), pz(0.6), px(14), pz(26.8));
      for (const end of [0, 1]) {
        g.save();
        if (end) {
          g.translate(0, h);
          g.scale(1, -1);
        }
        g.fillStyle = "#9c3a28";
        g.fillRect(px(7.6 - 2.45), pz(0.6), px(4.9), pz(5.8));
        g.strokeRect(px(7.6 - 2.45), pz(0.6), px(4.9), pz(5.8));
        g.beginPath();
        g.ellipse(px(7.6), pz(6.4), px(1.8), pz(1.8), 0, 0, Math.PI);
        g.stroke();
        // Three-point arc: 6.75 m from the rim, flattened at the sidelines.
        g.beginPath();
        g.moveTo(px(7.6 - 6.6), pz(0.6));
        g.lineTo(px(7.6 - 6.6), pz(3));
        g.ellipse(px(7.6), pz(1.6), px(6.75), pz(6.75), 0, Math.PI - 0.2112, 0.2112, true);
        g.lineTo(px(7.6 + 6.6), pz(0.6));
        g.stroke();
        // Gold dollar sign in the lane.
        g.fillStyle = "rgba(216,169,58,0.6)";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 ${pz(2.5)}px Georgia, "Times New Roman", serif`;
        g.fillText("$", px(7.6), pz(3.9));
        g.restore();
      }
      g.beginPath();
      g.moveTo(px(0.6), h / 2);
      g.lineTo(px(14.6), h / 2);
      g.stroke();
      // Centre medallion: clay ring, black disc, gold rim. The script lands on it when the art loads.
      g.beginPath();
      g.ellipse(w / 2, h / 2, px(3.1), pz(3.1), 0, 0, Math.PI * 2);
      g.fillStyle = "#9c3a28";
      g.fill();
      g.stroke();
      g.beginPath();
      g.ellipse(w / 2, h / 2, px(2.6), pz(2.6), 0, 0, Math.PI * 2);
      g.fillStyle = "#0c0f0d";
      g.fill();
      g.strokeStyle = gold;
      g.lineWidth = px(0.07);
      g.stroke();
      g.fillStyle = gold;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `900 ${pz(0.42)}px Impact, "Arial Black", sans-serif`;
      g.fillText("MEMPHIS  ·  901  ·  EST. 2020", w / 2, h / 2 + pz(1.75));
      g.fillText("KLOTHING KOMPANY WORLDWIDE", w / 2, h / 2 - pz(1.75));
      // Sideline lettering, read from inside the court.
      g.font = `900 ${px(0.36)}px Impact, "Arial Black", sans-serif`;
      for (const side of [0, 1]) {
        g.save();
        g.translate(side ? w - px(0.3) : px(0.3), h / 2);
        g.rotate(side ? Math.PI / 2 : -Math.PI / 2);
        g.fillStyle = "#39ff14";
        g.fillText("SACKRELIGIOUS   ·   901 COURT   ·   SACKRELIGIOUS   ·   MEMPHIS   ·   SACKRELIGIOUS", 0, 0);
        g.restore();
      }
      // Scuffs so it reads as a street court.
      for (let i = 0; i < 5200; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    },
    { repeat: false },
  );
  if (ctx2) {
    const aspect = 0.182 / 0.264 / (16 / 9);
    const mark = (cyM: number, wM: number, flip = false) => ({ x: W / 2, y: pz(cyM), w: px(wM), h: pz(wM * aspect), flip });
    stampLogo(ctx2, t, [mark(14, 4.5), mark(9.62, 5.2), mark(18.38, 5.2, true)]);
  }
  return t;
}

/** Spray-can lettering on plywood: fat outlined letters with a drop shadow and a shine. */
function graffitiMat(ctx: BuildCtx, lines: string[], fills: [string, string], accent: string) {
  const map = tex(
    1024,
    320,
    (g, w, h) => {
      g.fillStyle = "#2a2622";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = `rgba(${90 + i * 9},${70 + i * 6},${48 + i * 4},0.5)`;
        g.fillRect((i * w) / 9 + 2, 0, w / 9 - 4, h);
      }
      for (let i = 0; i < 26; i++) {
        g.fillStyle = [accent, fills[0], "#ffffff", "#101010"][i % 4]!;
        g.globalAlpha = 0.5;
        g.beginPath();
        g.arc((i * 131) % w, (i * 71) % h, 3 + (i % 5) * 2.4, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineJoin = "round";
      const size = lines.length > 1 ? 150 : 220;
      g.font = `italic 900 ${size}px Impact, "Arial Black", sans-serif`;
      lines.forEach((text, i) => {
        const y = lines.length > 1 ? h * (0.3 + i * 0.42) : h / 2;
        const x = w / 2 + (i ? 40 : -30);
        g.save();
        g.translate(x, y);
        g.rotate(-0.045);
        g.fillStyle = "#050505";
        g.fillText(text, 12, 12);
        g.lineWidth = 26;
        g.strokeStyle = "#070707";
        g.strokeText(text, 0, 0);
        g.lineWidth = 12;
        g.strokeStyle = accent;
        g.strokeText(text, 0, 0);
        const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
        grad.addColorStop(0, fills[0]);
        grad.addColorStop(1, fills[1]);
        g.fillStyle = grad;
        g.fillText(text, 0, 0);
        g.globalAlpha = 0.5;
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.rect(-w / 2, -size * 0.36, w, size * 0.1);
        g.save();
        g.clip();
        g.fillText(text, 0, 0);
        g.restore();
        g.globalAlpha = 1;
        g.restore();
      });
    },
    { repeat: false },
  );
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.1 });
  ctx.glow.emissive(mat, 0.1, 0.5);
  return mat;
}

function chainMat() {
  const map = tex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(190,196,204,0.9)";
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, h);
    g.moveTo(w, 0);
    g.lineTo(0, h);
    g.stroke();
  });
  return new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 });
}

function buildCourt(ctx: BuildCtx) {
  const { cx, cz, halfW, halfL, rimY, rimIn } = COURT;
  const surface = new THREE.MeshStandardMaterial({ map: courtTexture(), roughnessMap: MAT.plaza(ctx.glow).roughnessMap, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  surface.userData.roughScale = 1.1;
  ctx.glow.wetSurface(surface);
  ctx.ground.flat(halfW * 2, halfL * 2, cx, Y0 + 0.006, cz, surface);

  const hoops: Hoop[] = [];
  const nets: THREE.Mesh[] = [];
  const rims: THREE.Mesh[] = [];
  const orange = new THREE.MeshStandardMaterial({ color: 0xff5a1e, emissive: 0xff3a00, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.5 });
  const board = new THREE.MeshStandardMaterial({
    map: tex(
      256,
      160,
      (g, w, h) => {
        g.fillStyle = "rgba(226,236,244,0.94)";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#ff4a12";
        g.lineWidth = 7;
        g.strokeRect(4, 4, w - 8, h - 8);
        g.strokeRect(w / 2 - 42, h - 76, 84, 62);
        g.fillStyle = "#101010";
        g.textAlign = "center";
        g.font = '900 30px "Bebas Neue", Impact, sans-serif';
        g.fillText("901 COURT", w / 2, 40);
        g.fillStyle = "#1e8a2a";
        g.font = 'italic 900 17px Georgia, serif';
        g.fillText("$ackReligious", w / 2, 64);
      },
      { repeat: false },
    ),
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 0.06,
  });
  ctx.glow.emissive(board, 0.05, 0.5);
  const netMap = tex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, h);
    g.moveTo(w, 0);
    g.lineTo(0, h);
    g.stroke();
  });
  netMap.repeat.set(10, 3);

  for (const dir of [-1, 1] as const) {
    const rimZ = cz + dir * (halfL - rimIn);
    const boardZ = rimZ + dir * 0.38;
    const poleZ = cz + dir * (halfL + 0.7);
    ctx.solid.cyl(0.11, 0.13, 3.9, cx, Y0 + 1.95, poleZ, MAT.black(), 10);
    ctx.solid.box(0.9, 0.5, 0.9, cx, Y0 + 0.25, poleZ, std(0x1a3a2a, 0.8));
    ctx.solid.box(0.14, 0.14, Math.abs(poleZ - boardZ) + 0.1, cx, Y0 + 3.75, (poleZ + boardZ) / 2, MAT.black());
    ctx.solid.box(1.86, 1.1, 0.06, cx, 3.44, boardZ + dir * 0.03, board);
    ctx.solid.box(0.12, 0.1, 0.4, cx, rimY, rimZ + dir * 0.2, orange);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 8, 28), orange);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, rimY, rimZ);
    rim.castShadow = true;
    rims.push(rim);
    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.13, 0.46, 14, 3, true),
      new THREE.MeshBasicMaterial({ map: netMap, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
    );
    net.position.set(cx, rimY - 0.24, rimZ);
    nets.push(net);
    hoops.push({ x: cx, y: rimY, z: rimZ, dir, boardZ, boardHalfW: 0.93, boardMinY: 2.89, boardMaxY: 3.99, rimR: 0.23 });
    addSolid(ctx, cx - 0.45, cx + 0.45, poleZ - 0.45, poleZ + 0.45);
  }

  // Fence, with a gate on the south side.
  const chain = chainMat();
  const post = MAT.steel();
  const fx0 = cx - halfW - 1.6;
  const fx1 = cx + halfW + 1.6;
  const fz0 = cz - halfL - 1.6;
  const fz1 = cz + halfL + 1.6;
  const fence = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = Math.abs(bx - ax) > 0.1 ? 0 : Math.PI / 2;
    ctx.solid.wall(len, 3.4, (ax + bx) / 2, Y0 + 1.7, (az + bz) / 2, chain, yaw, len / 0.5, 3.4 / 0.5);
    ctx.solid.box(Math.abs(bx - ax) + 0.08, 0.08, Math.abs(bz - az) + 0.08, (ax + bx) / 2, Y0 + 3.4, (az + bz) / 2, post);
    const n = Math.max(1, Math.round(len / 3.2));
    for (let i = 0; i <= n; i++) ctx.solid.cyl(0.05, 0.05, 3.4, ax + ((bx - ax) * i) / n, Y0 + 1.7, az + ((bz - az) * i) / n, post, 6);
    addSolid(ctx, Math.min(ax, bx) - 0.08, Math.max(ax, bx) + 0.08, Math.min(az, bz) - 0.08, Math.max(az, bz) + 0.08);
  };
  fence(fx0, fz0, fx1, fz0);
  fence(fx0, fz0, fx0, fz1);
  fence(fx1, fz0, fx1, fz1);
  fence(fx0, fz1, cx - 2.2, fz1);
  fence(cx + 2.2, fz1, fx1, fz1);

  // Painted boards on the long sides, like the walls round every Memphis court.
  ctx.solid.box(0.08, 3.1, 12.2, fx1 - 0.14, Y0 + 1.75, cz - 6.6, MAT.wood());
  ctx.solid.wall(12, 3, fx1 - 0.2, Y0 + 1.75, cz - 6.6, graffitiMat(ctx, ["SACK", "RELIGIOUS"], ["#7dff3a", "#1e8a2a"], "#e0261c"), YAW.west);
  ctx.solid.box(0.08, 3.1, 12.2, fx0 + 0.14, Y0 + 1.75, cz - 6.6, MAT.wood());
  ctx.solid.wall(12, 3, fx0 + 0.2, Y0 + 1.75, cz - 6.6, graffitiMat(ctx, ["901 MEMPHIS"], ["#ff7ad8", "#b3267a"], "#35e0d0"), YAW.east);
  ctx.solid.box(0.08, 3.1, 9.2, fx1 - 0.14, Y0 + 1.75, cz + 7.4, MAT.wood());
  ctx.solid.wall(9, 3, fx1 - 0.2, Y0 + 1.75, cz + 7.4, graffitiMat(ctx, ["$ACKROW"], ["#ffe07a", "#c9962a"], "#101010"), YAW.west);

  // Floodlights on the four corners.
  for (const [lx, lz] of [
    [fx0, fz0],
    [fx1, fz0],
    [fx0, fz1],
    [fx1, fz1],
  ] as const) {
    ctx.solid.cyl(0.1, 0.14, 8.6, lx, Y0 + 4.3, lz, MAT.black(), 8);
    ctx.solid.box(1.5, 0.5, 0.4, lx, Y0 + 8.7, lz, emissiveMat(ctx, 0xfff0d0, 0.2, 4));
    ctx.lamps.push({ x: lx + (cx - lx) * 0.4, y: Y0 + 7.5, z: lz + (cz - lz) * 0.4, color: 0xfff0d0 });
  }
  ctx.flat.flat(22, 34, cx, Y0 + 0.03, cz, poolMat(ctx, 0xffe0b0, 0.36));

  // Bleachers on the east side, outside the fence.
  for (let i = 0; i < 4; i++) ctx.solid.box(1, 0.4 + i * 0.4, 16, fx1 + 1.2 + i, Y0 + (0.4 + i * 0.4) / 2, cz, std(0x3a3d42, 0.7, 0.4));
  addSolid(ctx, fx1 + 0.6, fx1 + 4.8, cz - 8, cz + 8);
  ctx.solid.wall(7, 1.5, cx, Y0 + 4.4, fz1 + 0.05, neon(ctx, "901 COURT", "#ff8a1e", { sub: "RIVERFRONT" }), YAW.south);
  addGround({ minX: fx0, maxX: fx1, minZ: fz0, maxZ: fz1, y: Y0 });
  // The sign-up table by the gate, against the fence. Court OG runs the court from behind it.
  const ox = cx + 4.6;
  const table = std(0x121214, 0.6);
  ctx.solid.box(2.8, 1.02, 0.1, ox, Y0 + 0.51, fz1 + 1.3, table);
  for (const s of [-1, 1]) ctx.solid.box(0.1, 1.02, 1.2, ox + s * 1.4, Y0 + 0.51, fz1 + 0.7, table);
  ctx.solid.box(2.9, 0.06, 0.46, ox, Y0 + 1.05, fz1 + 1.12, MAT.wood());
  ctx.flat.wall(2.6, 0.8, ox, Y0 + 0.52, fz1 + 1.36, sign("901 COURT", "#ff8a1e", "#121214", { sub: "SHOOTOUT · PRACTICE · RUN ONE", w: 512, h: 160 }), YAW.south);
  for (const bx of [-0.9, -0.55, 0.85]) ctx.solid.add(new THREE.SphereGeometry(0.17, 12, 10), std(0xc8611c, 0.7), ox + bx, Y0 + 1.25, fz1 + 1.12);
  ctx.solid.box(0.34, 0.26, 0.24, ox + 0.3, Y0 + 1.21, fz1 + 1.12, std(0x1f6a3c, 0.6));
  addSolid(ctx, ox - 1.5, ox + 1.5, fz1, fz1 + 1.4);
  return { hoops, nets, rims, ogSpot: { x: ox, z: fz1 + 2.2 }, ogStand: { x: ox, z: fz1 + 0.62 } };
}

function buildPier(ctx: BuildCtx) {
  const { x, half, z0, z1 } = PIER;
  const wood = MAT.wood();
  const dark = MAT.darkWood();
  const len = z0 - z1;
  const plank = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#6b4a2e";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = `rgba(${40 + i * 12},${26 + i * 6},14,0.5)`;
        g.fillRect(0, i * 32, w, 30);
        g.fillStyle = "rgba(0,0,0,0.6)";
        g.fillRect(0, i * 32 + 30, w, 2);
      }
    }),
    roughness: 0.85,
  });
  ctx.solid.box(half * 2, 0.3, len, x, Y0 - 0.15, (z0 + z1) / 2, dark);
  ctx.ground.flat(half * 2, len, x, Y0 + 0.004, (z0 + z1) / 2, plank, 0, 2);
  for (let z = z0 - 2; z > z1; z -= 5) {
    for (const s of [-1, 1]) ctx.solid.cyl(0.2, 0.2, 3.4, x + s * (half - 0.1), Y0 - 1.3, z, dark, 7);
  }
  for (const s of [-1, 1]) {
    const rx = x + s * (half - 0.08);
    ctx.solid.box(0.1, 0.1, len, rx, Y0 + 1.05, (z0 + z1) / 2, wood);
    ctx.solid.box(0.07, 0.07, len, rx, Y0 + 0.55, (z0 + z1) / 2, wood);
    for (let z = z0; z >= z1; z -= 2.6) ctx.solid.box(0.12, 1.1, 0.12, rx, Y0 + 0.55, z, wood);
    addSolid(ctx, rx - 0.12, rx + 0.12 + (s > 0 ? 0.3 : 0), z1, z0);
    if (s < 0) addSolid(ctx, rx - 0.42, rx + 0.12, z1, z0);
  }
  ctx.solid.box(half * 2, 0.1, 0.1, x, Y0 + 1.05, z1 + 0.08, wood);
  ctx.solid.box(half * 2, 0.07, 0.07, x, Y0 + 0.55, z1 + 0.08, wood);
  addSolid(ctx, x - half, x + half, z1 - 0.4, z1 + 0.14);
  addGround({ minX: x - half, maxX: x + half, minZ: z1, maxZ: z0 + 0.5, y: Y0 });
  globeLamp(ctx, x - half + 0.35, z1 + 0.6, Y0);
  globeLamp(ctx, x + half - 0.35, (z0 + z1) / 2, Y0);
  // A cooler and a tackle box where the regulars stand.
  ctx.solid.box(0.7, 0.45, 0.45, x + 1.2, Y0 + 0.23, z1 + 3, std(0xc8402c, 0.6));
  ctx.solid.box(0.72, 0.08, 0.47, x + 1.2, Y0 + 0.49, z1 + 3, MAT.white());
  ctx.solid.box(0.4, 0.22, 0.24, x - 1.3, Y0 + 0.11, z1 + 5, std(0x2a4a3a, 0.6));

  // Bait shack.
  const bx = BAIT_SHOP.x;
  const bz = BAIT_SHOP.z;
  const f = new Frame(ctx, bx, bz, YAW.east);
  f.box(5.4, 3.1, 4.2, 0, Y0 + 1.55, -2.1, MAT.wood());
  f.add(new THREE.BoxGeometry(6.2, 0.14, 3), std(0x2f4a38, 0.8), 0, Y0 + 3.45, -0.9, ctx.solid, 0, 0.3);
  f.add(new THREE.BoxGeometry(6.2, 0.14, 3), std(0x2f4a38, 0.8), 0, Y0 + 3.45, -3.3, ctx.solid, 0, -0.3);
  f.box(3.2, 1.3, 0.1, 0, Y0 + 1.9, 0.02, emissiveMat(ctx, 0xffc27a, 0.5, 2.4));
  f.box(3.6, 0.12, 0.7, 0, Y0 + 1.2, 0.3, dark);
  // A proper counter under the shelf. Unc J serves from behind it, in the window.
  f.box(3.6, 1.14, 0.1, 0, Y0 + 0.57, 0.6, MAT.wood());
  for (const sx of [-1.8, 1.8]) f.box(0.1, 1.14, 0.62, sx, Y0 + 0.57, 0.3, MAT.wood());
  f.wall(3.2, 0.6, 0, Y0 + 0.6, 0.66, sign("LIVE BAIT", "#35e0d0", "#17110e", { sub: "WORMS · MINNOWS · ICE", w: 512, h: 110 }), ctx.flat);
  f.solid(-1.85, 1.85, 0, 0.7);
  f.wall(4.4, 0.95, 0, Y0 + 3.05, 0.08, neon(ctx, "BAIT & TACKLE", "#35e0d0", { w: 512, h: 112 }), ctx.flat);
  f.flat(5, 5, 0, Y0 + 0.02, 2.4, poolMat(ctx, 0xffb46a, 0.36), ctx.flat);
  f.lamp(0, Y0 + 2.6, 1.2, 0xffc27a);
  f.solid(-2.7, 2.7, -4.2, 0);
  bench(ctx, bx + 6, bz - 6, YAW.north, Y0);
  const baitCounter = { x: f.wx(0, 1.3), z: f.wz(0, 1.3) };
  const castSpots = [
    { x, z: z1 + 1.3 },
    { x: x - half + 0.7, z: z1 + 7 },
    { x: x + half - 0.7, z: z1 + 12 },
  ];
  return { baitCounter, castSpots, uncStand: { x: f.wx(0.75, 0.22), z: f.wz(0.75, 0.22), heading: Math.PI / 2 } };
}

/** The menu board beside a truck: its own dishes at its own prices. */
function menuBoard(truck: Truck) {
  const items = FOOD.filter((f) => f.at === truck.id);
  return new THREE.MeshBasicMaterial({
    map: tex(384, 512, (g) => {
      g.fillStyle = "#14100c";
      g.fillRect(0, 0, 384, 512);
      g.strokeStyle = truck.color;
      g.lineWidth = 8;
      g.strokeRect(8, 8, 368, 496);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = truck.color;
      g.font = `900 46px Impact, "Arial Narrow Bold", "Arial Black", sans-serif`;
      g.fillText("MENU", 192, 52);
      g.fillStyle = "#ffe9b8";
      g.font = `800 20px ui-sans-serif, system-ui, sans-serif`;
      g.fillText(truck.tag, 192, 92, 340);
      const step = Math.min(120, 380 / Math.max(1, items.length));
      items.forEach((it, i) => {
        const y = 150 + i * step;
        g.textAlign = "left";
        g.fillStyle = "#ffffff";
        g.font = `800 25px ui-sans-serif, system-ui, sans-serif`;
        g.fillText(it.name, 28, y, 250);
        g.textAlign = "right";
        g.fillStyle = truck.color;
        g.font = `900 28px "Arial Black", Impact, sans-serif`;
        g.fillText(`$${it.cost}`, 356, y);
        g.textAlign = "left";
        g.fillStyle = "rgba(255,233,184,0.72)";
        g.font = `500 16px ui-sans-serif, system-ui, sans-serif`;
        g.fillText(it.line, 28, y + 28, 328);
      });
    }),
    toneMapped: false,
    color: 0xdedad0,
  });
}

export type TruckLot = {
  /** Where to stand to order, by truck. */
  windows: Record<TruckId, { x: number; z: number }>;
  /** The big screen at Veli's: the game puts the video on this material once it is playing. */
  screen: { x: number; z: number; mat: THREE.MeshBasicMaterial };
};

function buildTrucks(ctx: BuildCtx): TruckLot {
  lotSurface(ctx, rect(TRUCKS.x - 22, TRUCKS.x + 22, TRUCKS.z - 16, TRUCKS.z + 5.5), "concrete");
  const windows = {} as TruckLot["windows"];
  const offsets: Record<TruckId, number> = { catch: -13, velis: -1, brothers: 13 };
  for (const truck of FOOD_TRUCKS) {
    const off = offsets[truck.id];
    const f = new Frame(ctx, TRUCKS.x + off, TRUCKS.z, YAW.north);
    const body = std(truck.body, 0.55, 0.2);
    const trim = std(truck.trim, 0.4, 0.5);
    const logo = new THREE.MeshBasicMaterial({ map: cropTex(truck.logo, 0, 0, 1, 1, 512, 340), toneMapped: false, color: 0xe6e2da });
    f.box(6.4, 2.7, 2.5, 0, Y0 + 1.95, 0, body);
    f.box(1.9, 2, 2.4, 4, Y0 + 1.5, 0, body);
    f.box(1.7, 0.8, 2.2, 4.1, Y0 + 2.05, 0, MAT.glassDark());
    f.box(6.44, 0.12, 2.54, 0, Y0 + 0.72, 0, trim);
    f.box(6.44, 0.1, 2.54, 0, Y0 + 3.26, 0, trim);
    for (const wx of [-2.1, 3.7]) for (const wz of [-1.15, 1.15]) f.add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), MAT.black(), wx, Y0 + 0.42, wz, ctx.solid, 0, 0, Math.PI / 2);
    // Serving window on the park side, awning, counter, and the truck's own art beside it.
    f.box(3.2, 1.1, 0.08, -1.2, Y0 + 2.35, 1.27, emissiveMat(ctx, 0xffd9a0, 0.4, 1.2));
    f.add(new THREE.BoxGeometry(3.8, 0.08, 1.5), std(truck.trim, 0.8), -1.2, Y0 + 3.1, 1.95, ctx.solid, 0, 0.22);
    f.box(3.4, 0.1, 0.5, -1.2, Y0 + 1.75, 1.5, MAT.chrome());
    f.box(2.36, 1.62, 0.06, 1.85, Y0 + 2.12, 1.27, MAT.black());
    f.wall(2.24, 1.5, 1.85, Y0 + 2.12, 1.31, logo, ctx.flat);
    f.wall(2.24, 1.5, 0, Y0 + 2.05, -1.27, logo, ctx.flat, Math.PI);
    f.wall(5.8, 1, 0, Y0 + 3.9, 1.28, neon(ctx, truck.tag, truck.color, { w: 640, h: 110 }), ctx.flat);
    f.wall(3.2, 0.34, -1.2, Y0 + 1.36, 1.28, sign(truck.social.toUpperCase(), "#ffe9b8", "#17110e", { w: 640, h: 68 }), ctx.flat);
    // Menu on a board by the window.
    f.box(0.08, 2.1, 0.08, -3.9, Y0 + 1.05, 1.7, MAT.black());
    f.box(1.34, 1.8, 0.06, -3.9, Y0 + 1.5, 1.74, MAT.black());
    f.wall(1.26, 1.7, -3.9, Y0 + 1.5, 1.78, menuBoard(truck), ctx.flat);
    f.solid(-4.5, -3.3, 1.5, 2);
    f.flat(6.5, 5.5, 0, Y0 + 0.02, 3.4, poolMat(ctx, 0xffb46a, 0.42), ctx.flat);
    f.lamp(0, Y0 + 2.8, 2.2, 0xffc27a);
    f.solid(-3.3, 5, -1.3, 1.3);
    windows[truck.id] = { x: f.wx(-1.2, 2.6), z: f.wz(-1.2, 2.6) };
  }

  // Veli's stage screen: the video plays here whenever someone is on the lot.
  const vf = new Frame(ctx, TRUCKS.x + offsets.velis + 6.6, TRUCKS.z, YAW.north);
  const screenMat = new THREE.MeshBasicMaterial({ map: cropTex("/game/food/velis-wings.webp", 0, 0, 1, 1, 512, 288), toneMapped: false });
  for (const sx of [-1.75, 1.75]) vf.box(0.14, 4.1, 0.14, sx, Y0 + 2.05, 0.9, MAT.black());
  vf.box(3.84, 2.24, 0.16, 0, Y0 + 2.95, 0.9, MAT.black());
  vf.wall(3.64, 2.05, 0, Y0 + 2.95, 0.99, screenMat, ctx.flat);
  vf.wall(3.6, 0.42, 0, Y0 + 1.56, 0.99, sign("NOW PLAYING  ·  YUNG VELI  ·  GO GIRL", "#d4af37", "#0b0a08", { w: 768, h: 84 }), ctx.flat);
  vf.box(3.84, 0.06, 0.06, 0, Y0 + 4.1, 0.98, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.5), toneMapped: false }), ctx.flat);
  for (const sx of [-1.75, 1.75]) vf.box(0.5, 0.9, 0.5, sx, Y0 + 0.45, 0.9, std(0x101012, 0.5));
  vf.solid(-2, 2, 0.6, 1.2);
  vf.lamp(0, Y0 + 2.6, 2.6, 0xd4af37);
  const screen = { x: vf.wx(0, 3.2), z: vf.wz(0, 3.2), mat: screenMat };

  // Picnic tables and string lights.
  const bulb = emissiveMat(ctx, 0xffd9a0, 0.5, 3.6);
  for (const tx of [-14, -4, 6, 16]) {
    const z = TRUCKS.z - 9.5;
    const x = TRUCKS.x + tx;
    ctx.solid.box(2.2, 0.08, 0.9, x, Y0 + 0.78, z, MAT.wood());
    for (const s of [-1, 1]) {
      ctx.solid.box(2.2, 0.07, 0.34, x, Y0 + 0.46, z + s * 0.78, MAT.wood());
      ctx.solid.box(0.1, 0.78, 1.7, x + s * 0.9, Y0 + 0.39, z, MAT.black());
    }
    addSolid(ctx, x - 1.1, x + 1.1, z - 0.9, z + 0.9);
  }
  for (const px of [-20, 20]) ctx.solid.cyl(0.07, 0.09, 4.6, TRUCKS.x + px, Y0 + 2.3, TRUCKS.z - 6, MAT.black(), 6);
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const y = Y0 + 4.5 - Math.sin(t * Math.PI) * 0.9;
    ctx.solid.add(new THREE.SphereGeometry(0.09, 6, 4), bulb, TRUCKS.x - 20 + t * 40, y, TRUCKS.z - 6);
  }
  ctx.flat.flat(40, 12, TRUCKS.x, Y0 + 0.025, TRUCKS.z - 7, poolMat(ctx, 0xffc98a, 0.28));
  return { windows, screen };
}

function buildMemphisSign(ctx: BuildCtx) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.5, emissive: 0xfff0d0, emissiveIntensity: 0.03 });
  ctx.glow.emissive(white, 0.03, 0.3);
  const z = -184;
  const total = blockText(ctx, "MEMPHIS", -55, Y0 + 0.5, z, YAW.south, 0.5, white, 0.8);
  ctx.solid.box(total + 1.4, 0.5, 1.6, -55, Y0 + 0.25, z, MAT.concrete());
  addSolid(ctx, -55 - total / 2 - 0.7, -55 + total / 2 + 0.7, z - 0.8, z + 0.8);
  ctx.flat.flat(total + 6, 8, -55, Y0 + 0.02, z + 4.4, poolMat(ctx, 0xfff0d0, 0.34));
  void paintMat;
}
