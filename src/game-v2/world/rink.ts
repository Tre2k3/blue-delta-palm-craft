import * as THREE from "three";
import { tex } from "../gfx/tex";
import { lotSurface } from "./buildings";
import {
  Frame,
  MAT,
  YAW,
  addSolid,
  emissiveMat,
  globeLamp,
  makeCtx,
  neon,
  poolMat,
  sign,
  std,
  tree,
  type BuildCtx,
} from "./kit";
import { CURB, RINK, ROOM, type Rect } from "./map";
import { finish, light, shell, type Room } from "./rooms";

const Y0 = CURB;

/** The skating floor: a rounded oblong. Skaters go round it anticlockwise, seen from above. */
export type RinkFloor = { x: number; z: number; halfX: number; halfZ: number; corner: number };

export type RinkRoom = Room & {
  floor: RinkFloor;
  /** Where skates are handed out, and where the snack bar serves. */
  rental: { x: number; z: number };
  snack: { x: number; z: number };
  dj: { x: number; z: number };
  /** Who works the counters, and the DJ. */
  staff: { x: number; z: number; heading: number }[];
  /** Benches round the floor where people sit and lace up, and the rail where they watch. */
  benches: { x: number; z: number; fx: number; fz: number }[];
  /** Lights, the mirror ball and the colours on the floor move with the music: `beat` is beats into the tune. */
  pulse(beat: number, time: number): void;
};

/**
 * The Crystal Palace from Third Street: a long, low hall in tan block and brick, flat roofed, the
 * name up on the roof in lights where it could be read from both ways down Third, a canopy over
 * the doors and the parking lot beside it.
 */
export function buildRinkExterior(ctx: BuildCtx, L: Rect) {
  lotSurface(ctx, L, "parking");
  const r = RINK;
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const h = r.height;
  const block = std(0xc9b48e, 0.9);
  ctx.solid.box(w, h, d, cx, Y0 + h / 2, cz, block);
  // A band of brown brick along the bottom, and a dark cap round the roof.
  ctx.solid.box(w + 0.2, 1.4, d + 0.2, cx, Y0 + 0.7, cz, MAT.brick("#5a3420", 6));
  ctx.solid.box(w + 0.6, 0.8, d + 0.6, cx, Y0 + h + 0.2, cz, std(0x3a2a22, 0.8));
  // Stripes down the front: the old purple and gold.
  for (const [y, c] of [
    [h - 1.6, 0x5a2a8a],
    [h - 2.3, 0xe0b030],
  ] as const)
    ctx.solid.box(w + 0.1, 0.45, 0.1, cx, Y0 + y, r.minZ - 0.06, std(c, 0.6));
  addSolid(ctx, r.minX, r.maxX, r.minZ, r.maxZ);

  // The doors and the canopy over them.
  const f = new Frame(ctx, r.doorX, r.frontZ, YAW.north);
  f.box(7, 3.1, 0.12, 0, Y0 + 1.55, 0.06, MAT.black());
  for (const s of [-1.6, -0.55, 0.55, 1.6])
    f.box(
      0.95,
      2.6,
      0.06,
      s,
      Y0 + 1.35,
      0.14,
      new THREE.MeshStandardMaterial({
        color: 0x1b2a3a,
        roughness: 0.1,
        metalness: 0.6,
        emissive: 0xff7ad8,
        emissiveIntensity: 0.25,
      }),
    );
  f.box(9, 0.35, 3.4, 0, Y0 + 3.5, 1.7, std(0x5a2a8a, 0.6));
  f.box(9, 0.12, 0.1, 0, Y0 + 3.3, 3.42, emissiveMat(ctx, 0xffd23a, 0.5, 3), ctx.flat);
  for (const s of [-4.2, 4.2]) {
    f.box(0.18, 3.4, 0.18, s, Y0 + 1.7, 3.3, MAT.steel());
    f.solid(s - 0.2, s + 0.2, 3.1, 3.5);
  }
  f.wall(
    6.4,
    1.1,
    0,
    Y0 + 4.6,
    0.12,
    neon(ctx, "SKATE NIGHT", "#ff4fd8", { sub: "ADULT NIGHT FRI · SAT", w: 640, h: 160 }),
    ctx.flat,
  );
  f.flat(10, 8, 0, Y0 + 0.02, 3.6, poolMat(ctx, 0xff7ad8, 0.45), ctx.flat);
  f.lamp(0, Y0 + 3, 2.4, 0xff9ae0);

  // The sign up on the roof: CRYSTAL PALACE in lights on a frame of steel, lit from both sides.
  const sy = Y0 + h + 0.6;
  const signW = 26;
  const signH = 5;
  const name = neon(ctx, "CRYSTAL PALACE", "#5ae0ff", {
    sub: "SKATING RINK",
    w: 1024,
    h: 224,
    border: true,
  });
  ctx.solid.box(signW + 0.6, signH + 0.6, 0.5, cx, sy + 1.6 + signH / 2, r.minZ + 4, MAT.black());
  ctx.flat.wall(signW, signH, cx, sy + 1.6 + signH / 2, r.minZ + 3.73, name, YAW.north);
  ctx.flat.wall(signW, signH, cx, sy + 1.6 + signH / 2, r.minZ + 4.27, name, YAW.south);
  for (const s of [-signW / 2 + 1.5, -signW / 6, signW / 6, signW / 2 - 1.5])
    ctx.solid.box(0.25, 1.8, 0.25, cx + s, sy + 0.9, r.minZ + 4, MAT.steel());
  // A star at each end, the way the old signs did it.
  for (const s of [-1, 1]) {
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? 0.7 : 1.6;
      if (i === 0) star.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr);
      else star.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr);
    }
    const geo = new THREE.ShapeGeometry(star);
    ctx.flat.add(
      geo,
      emissiveMat(ctx, 0xffd23a, 1.2, 3.4),
      cx + s * (signW / 2 + 2.2),
      sy + 1.6 + signH / 2,
      r.minZ + 3.72,
      Math.PI,
    );
    ctx.flat.add(
      geo,
      emissiveMat(ctx, 0xffd23a, 1.2, 3.4),
      cx + s * (signW / 2 + 2.2),
      sy + 1.6 + signH / 2,
      r.minZ + 4.28,
      0,
    );
  }
  ctx.lamps.push({ x: cx, y: sy + 4, z: r.minZ + 2, color: 0x5ae0ff });

  // The lot: stripes, lamps, a few trees along Third.
  for (let x = r.maxX + 4; x < L.maxX - 3; x += 3.2)
    ctx.ground.flat(
      0.14,
      5,
      x,
      Y0 + 0.012,
      L.minZ + 14,
      new THREE.MeshBasicMaterial({ color: 0xe8e4dc }),
    );
  for (let x = r.maxX + 4; x < L.maxX - 3; x += 3.2)
    ctx.ground.flat(
      0.14,
      5,
      x,
      Y0 + 0.012,
      L.minZ + 26,
      new THREE.MeshBasicMaterial({ color: 0xe8e4dc }),
    );
  for (const x of [r.maxX + 12, r.maxX + 34, r.maxX + 56]) {
    if (x > L.maxX - 4) continue;
    globeLamp(ctx, x, L.minZ + 20, Y0, 0xfff0d0);
    addSolid(ctx, x - 0.2, x + 0.2, L.minZ + 19.8, L.minZ + 20.2);
  }
  // Trees only along the lot: the hall itself faces Third Street with nothing in front of it.
  for (let x = r.maxX + 8; x < L.maxX - 2; x += 12)
    tree(ctx, x, L.minZ + 1.2, 1 + ctx.rand() * 0.3, Y0);
  // A sign on a pole at the street, for whoever is driving down Third.
  const px = r.maxX + 3;
  ctx.solid.cyl(0.2, 0.22, 7, px, Y0 + 3.5, L.minZ + 2.5, MAT.steel(), 8);
  ctx.solid.box(5.4, 2.6, 0.4, px, Y0 + 8, L.minZ + 2.5, MAT.black());
  ctx.flat.wall(
    5.2,
    2.4,
    px,
    Y0 + 8,
    L.minZ + 2.28,
    sign("CRYSTAL PALACE", "#5ae0ff", "#1a0e2a", { sub: "SKATE · PARTY · DJ", w: 512, h: 240 }),
    YAW.north,
  );
  addSolid(ctx, px - 0.3, px + 0.3, L.minZ + 2.2, L.minZ + 2.8);
}

/** A rounded oblong as a flat shape, lying on the floor. */
function oblong(cx: number, cz: number, hx: number, hz: number, r: number, y: number) {
  const s = new THREE.Shape();
  // Shape space: x right, y = -z.
  s.moveTo(-hx + r, hz);
  s.lineTo(hx - r, hz);
  s.quadraticCurveTo(hx, hz, hx, hz - r);
  s.lineTo(hx, -hz + r);
  s.quadraticCurveTo(hx, -hz, hx - r, -hz);
  s.lineTo(-hx + r, -hz);
  s.quadraticCurveTo(-hx, -hz, -hx, -hz + r);
  s.lineTo(-hx, hz - r);
  s.quadraticCurveTo(-hx, hz, -hx + r, hz);
  const geo = new THREE.ShapeGeometry(s, 8);
  geo.rotateX(-Math.PI / 2);
  // Planar UVs in metres, so the boards keep their size.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 4, pos.getZ(i) / 4);
  geo.translate(cx, y, cz);
  return geo;
}

/**
 * Inside the Crystal Palace: the maple floor under the mirror ball, carpet in loud colours all
 * round it, the DJ booth up on the north wall with the name in lights over it, the snack bar at
 * the east end, skate rental at the west, benches and lockers along the door wall.
 */
export function buildRinkRoom(): RinkRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(81);
  const C = ROOM.rink;
  const W = 42;
  const D = 30;
  const H = 7.5;
  const carpet = new THREE.MeshStandardMaterial({
    map: tex(256, 256, (g, w, h) => {
      g.fillStyle = "#14082a";
      g.fillRect(0, 0, w, h);
      const colors = ["#ff4fd8", "#5ae0ff", "#ffd23a", "#39ff14", "#ff7a2a"];
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = colors[i % colors.length]!;
        g.lineWidth = 3;
        const x = (i * 97) % w;
        const y = (i * 53) % h;
        g.beginPath();
        if (i % 3 === 0) g.arc(x, y, 9 + (i % 4) * 3, 0, Math.PI * 2);
        else if (i % 3 === 1) {
          g.moveTo(x - 12, y - 6);
          g.lineTo(x, y + 8);
          g.lineTo(x + 12, y - 6);
        } else {
          g.moveTo(x - 10, y);
          g.quadraticCurveTo(x, y - 14, x + 10, y);
        }
        g.stroke();
      }
    }),
    roughness: 0.95,
  });
  shell(ctx, C.x, C.z, W, D, H, carpet, MAT.brick("#2a1a3a", 16), std(0x07060c, 0.95), 5);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);

  // ---- The floor: maple boards, a painted line round the edge, a low rail with gaps to step on.
  const FX = 0;
  const FZ = -2;
  const HX = 15.5;
  const HZ = 8.5;
  const CR = 6;
  const maple = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#c99a5c";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = `rgba(${150 + (i % 3) * 20},${100 + (i % 4) * 10},${50 + (i % 2) * 10},0.35)`;
        g.fillRect(0, i * 8, w, 7.4);
        g.fillStyle = "rgba(60,30,10,0.4)";
        g.fillRect(0, i * 8 + 7.4, w, 0.6);
        g.fillRect(((i * 41) % w) | 0, i * 8, 0.8, 7.4);
      }
    }),
    roughness: 0.22,
    metalness: 0.08,
  });
  ctx.ground.add(oblong(C.x + FX, C.z + FZ, HX, HZ, CR, 0.012), maple);
  ctx.ground.add(
    oblong(C.x + FX, C.z + FZ, HX + 0.35, HZ + 0.35, CR + 0.3, 0.008),
    std(0xe8e4dc, 0.6),
  );
  ctx.ground.add(
    oblong(C.x + FX, C.z + FZ, 3.2, 1.6, 1.4, 0.016),
    new THREE.MeshStandardMaterial({
      color: 0x5ae0ff,
      emissive: 0x5ae0ff,
      emissiveIntensity: 0.2,
      roughness: 0.3,
    }),
  );
  // The rail: short posts and a top bar, open at the two ends of the near side.
  const railMat = MAT.chrome();
  const ry = 1.0;
  const rx = HX + 0.9;
  const rz = HZ + 0.9;
  f.box(rx * 2 - 2 * CR, 0.08, 0.08, FX, ry, FZ - rz, railMat);
  f.box(0.08, 0.08, rz * 2 - 2 * CR, FX - rx, ry, FZ, railMat);
  f.box(0.08, 0.08, rz * 2 - 2 * CR, FX + rx, ry, FZ, railMat);
  f.box(rx * 2 - 2 * CR - 8, 0.08, 0.08, FX, ry, FZ + rz, railMat);
  for (let x = -rx + CR; x <= rx - CR; x += 2.5) {
    f.box(0.06, ry, 0.06, FX + x, ry / 2, FZ - rz, railMat);
    if (Math.abs(x) < rx - CR - 4) f.box(0.06, ry, 0.06, FX + x, ry / 2, FZ + rz, railMat);
  }

  // ---- The mirror ball and the lights on a truss over the floor.
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 2),
    new THREE.MeshStandardMaterial({
      color: 0xdfe8f0,
      roughness: 0.05,
      metalness: 1,
      flatShading: true,
      emissive: 0x8090a0,
      emissiveIntensity: 0.4,
    }),
  );
  ball.position.set(C.x + FX, H - 1.6, C.z + FZ);
  group.add(ball);
  f.box(0.04, 0.9, 0.04, FX, H - 0.6, FZ, MAT.black());
  f.box(HX * 1.6, 0.18, 0.18, FX, H - 0.5, FZ - 3, MAT.black());
  f.box(HX * 1.6, 0.18, 0.18, FX, H - 0.5, FZ + 3, MAT.black());
  // Coloured spots that sweep the floor.
  const spotColors = [0xff4fd8, 0x5ae0ff, 0xffd23a, 0x39ff14, 0xff7a2a, 0x8a5aff];
  const spots: THREE.Mesh[] = spotColors.map((color) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    group.add(m);
    return m;
  });
  // Little points of light thrown off the ball.
  const sparkGeo = new THREE.BufferGeometry();
  const N = 140;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 * 7.3;
    const rr = 3 + ((i * 37) % 100) / 9;
    sp[i * 3] = Math.cos(a) * rr;
    sp[i * 3 + 1] = 0.03;
    sp[i * 3 + 2] = Math.sin(a) * rr * 0.6;
  }
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.14,
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
    }),
  );
  sparks.position.set(C.x + FX, 0, C.z + FZ);
  group.add(sparks);
  const pink = light(group, lights, C.x - 6, H - 1.4, C.z + FZ, 0xff4fd8, 40, 18);
  const blue = light(group, lights, C.x + 6, H - 1.4, C.z + FZ, 0x5ae0ff, 40, 18);
  light(group, lights, C.x, H - 1, C.z + D / 2 - 4, 0xffe0c0, 26, 14);

  // ---- The DJ booth on the north wall, the name in lights over it.
  const djZ = -D / 2 + 1.6;
  f.box(6.4, 1.3, 2, 0, 0.65, djZ, std(0x1a1028, 0.6));
  f.box(6.6, 0.08, 2.2, 0, 1.32, djZ, std(0x101010, 0.2, 0.4));
  for (const s of [-1.5, 1.5]) {
    f.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), std(0x0a0a0a, 0.3), s, 1.38, djZ);
    f.add(
      new THREE.CylinderGeometry(0.14, 0.14, 0.055, 16),
      emissiveMat(ctx, 0xff4fd8, 1, 2.4),
      s,
      1.39,
      djZ,
      ctx.flat,
    );
  }
  f.box(1.4, 0.12, 0.8, 0, 1.38, djZ, MAT.black());
  f.box(6.4, 0.1, 0.06, 0, 1.2, djZ + 1.02, emissiveMat(ctx, 0x5ae0ff, 0.8, 3), ctx.flat);
  for (const s of [-1, 1]) f.box(1.3, 2.4, 1.1, s * 4.6, 1.2, djZ, std(0x101012, 0.6));
  f.solid(-5.4, 5.4, -D / 2, djZ + 1.1);
  f.wall(
    16,
    3,
    0,
    H - 2.2,
    -D / 2 + 0.12,
    neon(ctx, "CRYSTAL PALACE", "#5ae0ff", { sub: "SKATING RINK · MEMPHIS", w: 1024, h: 224 }),
    ctx.flat,
  );
  f.wall(3, 0.8, 0, 2.3, djZ - 0.95, neon(ctx, "DJ", "#ff4fd8", { w: 256, h: 96 }), ctx.flat);

  // ---- Skate rental at the west end: the counter and the cubbies of skates behind it.
  const rentX = -W / 2 + 2.2;
  f.box(1.2, 1.15, 9, rentX, 0.58, 4.5, std(0x2a1a3a, 0.6));
  f.box(1.4, 0.08, 9.2, rentX, 1.18, 4.5, std(0xe0b030, 0.4, 0.2));
  const cub = new Frame(ctx, C.x - W / 2 + 0.02, C.z, YAW.east);
  cub.box(9, 3.2, 0.7, -4.5, 1.6, 0.35, std(0x3a2a22, 0.8));
  const skateCols = [0xf4f1ea, 0x1a1a1a, 0xff4fd8, 0x5ae0ff, 0xc9a24a];
  for (let row = 0; row < 5; row++)
    for (let i = 0; i < 12; i++)
      cub.box(
        0.5,
        0.36,
        0.3,
        -0.7 - i * 0.7,
        0.35 + row * 0.6,
        0.6,
        std(skateCols[(i + row) % 5]!, 0.5),
      );
  cub.wall(
    6,
    1.1,
    -4.5,
    4,
    0.06,
    neon(ctx, "SKATE RENTAL", "#ffd23a", { w: 640, h: 128 }),
    ctx.flat,
  );
  f.solid(-W / 2, rentX + 0.6, 0, 9);

  // ---- The snack bar at the east end.
  const snackX = W / 2 - 2.2;
  f.box(1.2, 1.15, 9, snackX, 0.58, 4.5, std(0x2a1a3a, 0.6));
  f.box(1.4, 0.08, 9.2, snackX, 1.18, 4.5, std(0xe0b030, 0.4, 0.2));
  const sb = new Frame(ctx, C.x + W / 2 - 0.02, C.z, YAW.west);
  sb.box(9, 2.6, 0.6, 4.5, 1.3, 0.3, std(0xd8d0c0, 0.5, 0.1));
  sb.wall(7, 2.2, 4.5, 4.3, 0.06, menuBoard(), ctx.flat);
  // A slushie machine and a popcorn cart.
  f.box(
    0.6,
    0.7,
    0.5,
    snackX - 0.1,
    1.55,
    2.4,
    new THREE.MeshStandardMaterial({
      color: 0x3ad2ff,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0x2a8aff,
      emissiveIntensity: 0.4,
    }),
  );
  f.box(
    0.6,
    0.7,
    0.5,
    snackX - 0.1,
    1.55,
    3.2,
    new THREE.MeshStandardMaterial({
      color: 0xff3a5a,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff2a4a,
      emissiveIntensity: 0.4,
    }),
  );
  f.box(0.9, 1.6, 0.9, snackX - 0.2, 0.8, 7.6, std(0xc0262a, 0.5));
  f.solid(snackX - 0.6, W / 2, 0, 9);

  // ---- Benches and lockers along the door wall, two cabinets in the corner.
  const benches: RinkRoom["benches"] = [];
  for (const x of [-14, -9.5, 9.5, 14]) {
    f.box(3.4, 0.45, 0.6, x, 0.23, D / 2 - 3, std(0x5a2a8a, 0.6));
    f.solid(x - 1.7, x + 1.7, D / 2 - 3.3, D / 2 - 2.7);
    benches.push({ x: C.x + x - 0.8, z: C.z + D / 2 - 3.6, fx: C.x + x - 0.8, fz: C.z + FZ });
    benches.push({ x: C.x + x + 0.8, z: C.z + D / 2 - 3.6, fx: C.x + x + 0.8, fz: C.z + FZ });
  }
  for (let x = -18; x <= 18; x += 1.1)
    if (Math.abs(x) > 4)
      f.box(
        1,
        2,
        0.5,
        x,
        1,
        D / 2 - 0.3,
        std([0x5a2a8a, 0xe0b030, 0x2a6ad0][Math.abs(Math.round(x)) % 3]!, 0.5, 0.3),
      );
  for (const s of [-1, 1]) {
    f.box(0.9, 1.9, 0.8, s * 18.5, 0.95, D / 2 - 6, MAT.black());
    f.wall(
      0.7,
      0.55,
      s * 18.5 - s * 0.46,
      1.4,
      D / 2 - 6,
      new THREE.MeshBasicMaterial({ color: s > 0 ? 0x39ff14 : 0xff4fd8, toneMapped: false }),
      ctx.flat,
      (-s * Math.PI) / 2,
    );
  }
  // The door back out to Third Street.
  f.box(4, 3.2, 0.1, 0, 1.6, D / 2 - 0.06, MAT.black());
  f.wall(
    1.6,
    0.36,
    0,
    3.6,
    D / 2 - 0.2,
    sign("EXIT", "#39ff14", "#0a0a0b", { w: 256, h: 64 }),
    ctx.flat,
    Math.PI,
  );

  finish(ctx, group);
  let lastSpin = 0;
  return {
    id: "rink",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x, z: C.z + D / 2 - 2.6, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 0.9 },
    lights,
    ambient: { sky: 0xb8a0ff, ground: 0x1a0a2a, power: 0.55 },
    boom: 5.4,
    floor: { x: C.x + FX, z: C.z + FZ, halfX: HX, halfZ: HZ, corner: CR },
    rental: { x: C.x + rentX + 1.6, z: C.z + 4.5 },
    snack: { x: C.x + snackX - 1.6, z: C.z + 4.5 },
    dj: { x: C.x, z: C.z + djZ + 1.9 },
    staff: [
      { x: C.x + rentX - 1, z: C.z + 4.5, heading: Math.PI / 2 },
      { x: C.x + snackX + 1, z: C.z + 5.5, heading: -Math.PI / 2 },
      { x: C.x + 0.4, z: C.z + djZ - 0.6, heading: 0 },
    ],
    benches,
    pulse(beat: number, time: number) {
      const b = beat >= 0 ? beat : time * 1.6;
      const hit = Math.pow(1 - (b - Math.floor(b)), 2.4);
      ball.rotation.y = time * 0.6;
      sparks.rotation.y = time * 0.6;
      (sparks.material as THREE.PointsMaterial).opacity = 0.5 + hit * 0.4;
      pink.intensity = 30 + hit * 22;
      blue.intensity = 30 + (1 - hit) * 16;
      spots.forEach((m, i) => {
        const a = time * (0.35 + i * 0.07) + i * 1.05;
        m.position.set(
          C.x + FX + Math.cos(a) * (HX - 4),
          0.02,
          C.z + FZ + Math.sin(a * 1.3) * (HZ - 3),
        );
        (m.material as THREE.MeshBasicMaterial).opacity = 0.18 + hit * 0.22;
      });
      if (Math.floor(b / 4) !== lastSpin) lastSpin = Math.floor(b / 4);
    },
  };
}

/** The menu over the snack bar, in the plastic letters such boards always had. */
function menuBoard() {
  const map = tex(512, 160, (g, w, h) => {
    g.fillStyle = "#0e0e10";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffd23a";
    g.font = '900 34px "Bebas Neue", Impact, sans-serif';
    g.textAlign = "center";
    g.fillText("SNACK BAR", w / 2, 38);
    g.font = '700 22px "Bebas Neue", Impact, sans-serif';
    g.fillStyle = "#f4f1ea";
    const rows = [
      ["NACHOS", "3.00"],
      ["HOT DOG", "2.50"],
      ["PIZZA SLICE", "2.50"],
      ["SLUSHIE", "1.50"],
    ];
    rows.forEach(([a, b], i) => {
      const x = i % 2 ? w * 0.75 : w * 0.25;
      const y = 82 + Math.floor(i / 2) * 42;
      g.fillText(`${a}  ${b}`, x, y);
    });
  });
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}
