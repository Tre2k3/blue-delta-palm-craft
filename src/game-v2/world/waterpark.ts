import * as THREE from "three";
import { tex } from "../gfx/tex";
import { lotSurface } from "./buildings";
import { MAT, YAW, addSolid, neon, sign, std, tree, type BuildCtx } from "./kit";
import { CURB, WATERPARK } from "./map";

const Y0 = CURB;

export type Waterpark = {
  group: THREE.Group;
  /** Geronimo, from the top of the tower to the splash pool. */
  geronimo: THREE.CatmullRomCurve3;
  /** The lazy river's middle line, once round. */
  river: THREE.CatmullRomCurve3;
  /** Where Benji climbs the tower, where he gets a tube, and the gate in from Park Avenue. */
  stairs: { x: number; z: number };
  /** The high dive: where its ladder is, and the end of the board. */
  dive: { x: number; z: number; board: { x: number; y: number; z: number } };
  tubes: { x: number; z: number };
  gate: { x: number; z: number };
  /** Spots in the water and on the deck for people. */
  swim: { x: number; z: number }[];
  lounge: { x: number; z: number; fx: number; fz: number }[];
  /** The tubes going round the lazy river and the rafts on the wave pool: somebody can ride each. */
  floats: THREE.Mesh[];
  rafts: THREE.Mesh[];
  /** The Twister: the tallest of the spirals, wide enough for a tube, three turns into the splash pool. */
  twister: THREE.CatmullRomCurve3;
  /** Where to climb to the Twister, where to grab a raft on the beach. */
  twisterStart: { x: number; z: number };
  beach: { x: number; z: number };
  /** 0 calm, 1 the big waves: every forty seconds the horn goes and the wave pool comes alive. */
  surge: number;
  /** True for the frame the horn sounds. */
  horn: boolean;
  /** The height of the wave pool's surface at a point, this frame. */
  waveY(x: number, z: number): number;
  update(dt: number, time: number): void;
};

/** A rounded oblong loop, as points, `r` from the middle of each end, straights along Z. */
function loop(cx: number, cz: number, hs: number, r: number, steps = 18) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < steps; i++) {
    const a = Math.PI + (Math.PI * i) / steps;
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz - hs + Math.sin(a) * r));
  }
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI * i) / steps;
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + hs + Math.sin(a) * r));
  }
  return pts;
}

function ring(cx: number, cz: number, hs: number, r0: number, r1: number) {
  const outer = loop(0, 0, hs, r1, 24);
  const inner = loop(0, 0, hs, r0, 24);
  const shape = new THREE.Shape(outer.map((p) => new THREE.Vector2(p.x, -p.z)));
  shape.holes.push(new THREE.Path(inner.reverse().map((p) => new THREE.Vector2(p.x, -p.z))));
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, 0, cz);
  return geo;
}

/** An open flume along a curve: the bottom of a pipe, sides up past halfway, open to the sky. */
export function trough(curve: THREE.Curve<THREE.Vector3>, r: number, steps: number) {
  const ring = 12;
  const pos: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    curve.getPointAt(i / steps, p);
    curve.getTangentAt(i / steps, t);
    side.crossVectors(t, up).normalize();
    n.crossVectors(side, t).normalize();
    for (let j = 0; j <= ring; j++) {
      // From one lip, round the bottom, to the other: 110 degrees either side of straight down.
      const a = -1.92 + (3.84 * j) / ring;
      pos.push(
        p.x + side.x * Math.sin(a) * r - n.x * Math.cos(a) * r,
        p.y + side.y * Math.sin(a) * r - n.y * Math.cos(a) * r,
        p.z + side.z * Math.sin(a) * r - n.z * Math.cos(a) * r,
      );
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j;
      const b = a + ring + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function waterMat(color: number) {
  const map = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#2a9ad8";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.08 + (i % 4) * 0.04})`;
      g.lineWidth = 2;
      const x = (i * 47) % w;
      const y = (i * 29) % h;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 10, y - 6, x + 20, y + 6, x + 30, y);
      g.stroke();
    }
  });
  map.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({
    color,
    map,
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.86,
    emissive: 0x1a8ad0,
    emissiveIntensity: 0.55,
  });
}

/**
 * Adventure River, out by I-40: the gate on Park Avenue, the wave pool with its beach entry, the
 * lazy river round a sandy island with umbrellas, and the slide tower in the corner, a dozen
 * slides coiling off it into the splash pool. Geronimo is the tall red one that drops straight.
 */
export function buildWaterpark(ctx: BuildCtx): Waterpark {
  const P = WATERPARK;
  const L = P.lot;
  const group = new THREE.Group();
  lotSurface(ctx, L, "plaza");
  const deck = std(0xe8dcc4, 0.85);
  ctx.ground.flat(
    L.maxX - L.minX,
    L.maxZ - L.minZ,
    (L.minX + L.maxX) / 2,
    Y0 + 0.006,
    (L.minZ + L.maxZ) / 2,
    deck,
  );
  const wy = Y0 + P.waterY;
  const tile = std(0x5ac0e8, 0.4);
  const blue = waterMat(0x6ad0ff);

  // ---- The wave pool: tiled bottom, a beach going in at the north end, the wave machine house at the south.
  const W = P.wave;
  const ww = W.maxX - W.minX;
  const wd = W.maxZ - W.minZ;
  const wcx = (W.minX + W.maxX) / 2;
  const wcz = (W.minZ + W.maxZ) / 2;
  ctx.ground.flat(ww, wd, wcx, Y0 + 0.01, wcz, tile);
  ctx.ground.flat(ww, 6, wcx, Y0 + 0.02, W.minZ + 3, std(0xf0dca8, 0.9));
  for (const [x0, z0, x1, z1] of [
    [W.minX - 0.4, W.minZ, W.minX, W.maxZ],
    [W.maxX, W.minZ, W.maxX + 0.4, W.maxZ],
    [W.minX - 0.4, W.maxZ, W.maxX + 0.4, W.maxZ + 0.4],
  ] as const)
    ctx.solid.box(
      x1 - x0,
      P.waterY + 0.25,
      z1 - z0,
      (x0 + x1) / 2,
      Y0 + (P.waterY + 0.25) / 2,
      (z0 + z1) / 2,
      std(0xf4f1ea, 0.6),
    );
  const waveGeo = new THREE.PlaneGeometry(ww, wd, 24, 30);
  waveGeo.rotateX(-Math.PI / 2);
  const wave = new THREE.Mesh(waveGeo, blue);
  wave.position.set(wcx, wy, wcz);
  wave.renderOrder = 3;
  group.add(wave);
  const base = (waveGeo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array;
  // The wave house at the deep end, as the old photographs have it: white, a blue roof band, a
  // red and white striped awning along the bottom, and the Adventure River sign across its face.
  ctx.solid.box(ww + 0.8, 5.4, 3.4, wcx, Y0 + 2.7, W.maxZ + 2.1, std(0xf4f1ea, 0.7));
  ctx.solid.box(ww + 1.2, 0.9, 3.8, wcx, Y0 + 5.6, W.maxZ + 2.1, std(0x2a6ad0, 0.6));
  ctx.solid.add(
    new THREE.PlaneGeometry(ww + 0.8, 1),
    striped(),
    wcx,
    Y0 + 1.2,
    W.maxZ + 0.2,
    Math.PI,
    -0.5,
  );
  ctx.flat.wall(17, 3.6, wcx, Y0 + 3.6, W.maxZ + 0.38, logoMat(), YAW.north);
  addSolid(ctx, W.minX - 0.4, W.maxX + 0.4, W.maxZ + 0.4, W.maxZ + 3.8);

  // ---- The lazy river round its island.
  const R = P.river;
  const hs = R.halfZ - R.halfX;
  const r1 = R.halfX;
  const r0 = R.halfX - R.width;
  ctx.ground.add(ring(R.cx, R.cz, hs, r0 - 0.3, r1 + 0.3), std(0xf4f1ea, 0.6), 0, Y0 + 0.012, 0);
  ctx.ground.add(ring(R.cx, R.cz, hs, r0, r1), tile, 0, Y0 + 0.016, 0);
  const riverMat = waterMat(0x5ac8f0);
  const riverMesh = new THREE.Mesh(ring(R.cx, R.cz, hs, r0, r1), riverMat);
  riverMesh.position.y = wy;
  riverMesh.renderOrder = 3;
  group.add(riverMesh);
  // The island: sand, palms, umbrellas and loungers.
  const sand = std(0xf0dca8, 0.95);
  const islandShape = new THREE.Shape(
    loop(0, 0, hs, r0 - 0.3, 24).map((p) => new THREE.Vector2(p.x, -p.z)),
  );
  const island = new THREE.ShapeGeometry(islandShape, 1);
  island.rotateX(-Math.PI / 2);
  island.translate(R.cx, 0, R.cz);
  ctx.ground.add(island, sand, 0, Y0 + 0.02, 0);
  const umbrellas = [0xff4fd8, 0xffd23a, 0x39ff14, 0x5ae0ff, 0xff7a2a];
  const lounge: Waterpark["lounge"] = [];
  for (let i = 0; i < 5; i++) {
    const x = R.cx + (i % 2 ? 4 : -4);
    const z = R.cz - hs + 2 + i * ((hs * 2 - 4) / 4);
    ctx.solid.cyl(0.05, 0.05, 2.4, x, Y0 + 1.2, z, MAT.white(), 6);
    ctx.solid.add(
      new THREE.ConeGeometry(1.5, 0.6, 12),
      i % 2 ? striped() : std(umbrellas[i % 5]!, 0.7),
      x,
      Y0 + 2.5,
      z,
    );
    ctx.solid.box(0.7, 0.3, 1.9, x + (i % 2 ? -1.5 : 1.5), Y0 + 0.3, z, std(0xf4f1ea, 0.7));
    lounge.push({ x: x + (i % 2 ? -1.5 : 1.5), z: z + 1.4, fx: R.cx, fz: R.cz });
  }
  for (const dz of [-hs - 3, hs + 3]) tree(ctx, R.cx, R.cz + dz * 0.6, 1.1, Y0);
  // A bridge over the river to the island.
  ctx.solid.box(
    R.width + 1.2,
    0.3,
    2.4,
    R.cx - r0 - R.width / 2,
    Y0 + P.waterY + 0.4,
    R.cz,
    MAT.wood(),
  );
  for (const s of [-1.1, 1.1])
    ctx.solid.box(
      R.width + 1.2,
      0.8,
      0.08,
      R.cx - r0 - R.width / 2,
      Y0 + P.waterY + 0.95,
      R.cz + s,
      MAT.wood(),
    );
  // Tubes going round it.
  const tubeGeo = new THREE.TorusGeometry(0.62, 0.24, 10, 20);
  tubeGeo.rotateX(Math.PI / 2);
  const tubeCols = [0xff4fd8, 0xffd23a, 0x39ff14, 0x5ae0ff, 0xff3b3b, 0xff7a2a];
  const middle = loop(R.cx, R.cz, hs, r0 + R.width / 2, 24);
  const river = new THREE.CatmullRomCurve3(
    middle.map((p) => p.clone().setY(wy + 0.1)),
    true,
    "centripetal",
  );
  const floats: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Mesh(tubeGeo, std(tubeCols[i % tubeCols.length]!, 0.5));
    t.castShadow = true;
    group.add(t);
    floats.push(t);
  }

  // ---- The slide tower and its slides.
  const T = P.tower;
  const steel = std(0xc9a87a, 0.7, 0.1);
  for (const [dx, dz] of [
    [-2.4, -2.4],
    [2.4, -2.4],
    [-2.4, 2.4],
    [2.4, 2.4],
  ] as const) {
    ctx.solid.box(0.4, T.top, 0.4, T.x + dx, Y0 + T.top / 2, T.z + dz, steel);
  }
  for (let y = 4; y <= T.top; y += 4)
    ctx.solid.box(5.6, 0.3, 5.6, T.x, Y0 + y, T.z, std(0x2a6ad0, 0.6));
  ctx.solid.add(
    new THREE.ConeGeometry(4.6, 2.6, 4),
    std(0xffd23a, 0.6),
    T.x,
    Y0 + T.top + 2.8,
    T.z,
    Math.PI / 4,
  );
  for (const s of [-2.4, 2.4])
    ctx.solid.cyl(0.08, 0.08, 2.6, T.x + s, Y0 + T.top + 1.3, T.z - 2.4, steel, 6);
  // Stairs up the west side.
  for (let i = 0; i < 16; i++)
    ctx.solid.box(
      1.4,
      0.15,
      0.6,
      T.x - 3.6,
      Y0 + 1 + i,
      T.z -
        2.4 +
        (i % 8) * 0.6 * (Math.floor(i / 8) % 2 ? -1 : 1) +
        (Math.floor(i / 8) % 2 ? 4.8 : 0),
      std(0xd0d4d8, 0.6, 0.3),
    );
  addSolid(ctx, T.x - 4.4, T.x + 2.8, T.z - 2.8, T.z + 2.8);
  ctx.flat.wall(
    5.4,
    1.4,
    T.x,
    Y0 + T.top + 0.9,
    T.z - 2.65,
    neon(ctx, "GERONIMO", "#ff3b3b", { w: 512, h: 128 }),
    YAW.north,
  );

  // The splash pool the slides land in.
  const S = P.pool;
  const scx = (S.minX + S.maxX) / 2;
  const scz = (S.minZ + S.maxZ) / 2;
  ctx.ground.flat(S.maxX - S.minX, S.maxZ - S.minZ, scx, Y0 + 0.01, scz, tile);
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(S.maxX - S.minX, S.maxZ - S.minZ), blue);
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(scx, wy, scz);
  splash.renderOrder = 3;
  group.add(splash);

  // Geronimo: off the top, one hump, and a straight drop to the pool.
  const top = Y0 + T.top + 0.6;
  const geronimo = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(T.x + 2.2, top, T.z - 1),
      new THREE.Vector3(T.x + 4.2, top - 0.6, T.z - 1.2),
      new THREE.Vector3(T.x + 6.4, top - 4.8, T.z - 1.6),
      new THREE.Vector3(T.x + 9.5, Y0 + 5.2, T.z - 2.4),
      new THREE.Vector3(T.x + 13, Y0 + 1.6, T.z - 3.4),
      new THREE.Vector3(T.x + 17, wy + 0.25, T.z - 4.4),
      new THREE.Vector3(T.x + 22, wy + 0.1, T.z - 5),
    ],
    false,
    "centripetal",
  );
  const chute = (
    curve: THREE.Curve<THREE.Vector3>,
    radius: number,
    color: number,
    open: boolean,
  ) => {
    const geo = open
      ? trough(curve, radius, 90)
      : new THREE.TubeGeometry(curve, 80, radius, 12, false);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.1,
        side: open ? THREE.DoubleSide : THREE.FrontSide,
      }),
    );
    mesh.castShadow = true;
    group.add(mesh);
    // Legs under it every few metres.
    for (let i = 1; i < 10; i++) {
      const p = curve.getPoint(i / 10);
      if (p.y - Y0 < 1.4) continue;
      ctx.solid.cyl(0.1, 0.1, p.y - radius - Y0, p.x, Y0 + (p.y - radius - Y0) / 2, p.z, steel, 6);
    }
  };
  chute(geronimo, 0.75, 0xd8262a, true);
  // The rest: spirals off each face of the tower into the pool, in their colours.
  const TWISTER = 3;
  let twister: THREE.CatmullRomCurve3 | null = null;
  const colors = [
    0xf4f1ea, 0xe8e2d0, 0xf4f1ea, 0x2a8aff, 0xf4f1ea, 0xe8e2d0, 0xffd23a, 0xf4f1ea, 0xe8e2d0,
    0xf4f1ea, 0x2a8aff,
  ];
  colors.forEach((c, i) => {
    const turns = 0.8 + (i % 4) * 0.35;
    const startY = Y0 + 4 + (i % 4) * 4;
    const rr = 5 + (i % 3) * 1.6;
    const a0 = (i / colors.length) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    const n = 14;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const a = a0 + u * turns * Math.PI * 2;
      const r = rr * (1 - u * 0.35);
      pts.push(
        new THREE.Vector3(
          T.x + Math.cos(a) * r * (u < 0.9 ? 1 : 0.6),
          startY - (startY - wy - 0.2) * u,
          T.z + Math.sin(a) * r * 0.75,
        ),
      );
    }
    // Every one ends in the splash pool.
    pts.push(new THREE.Vector3(scx - 6 + (i % 4) * 3.5, wy + 0.15, S.minZ + 2 + (i % 3) * 3));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    if (i === TWISTER) twister = curve;
    chute(curve, i === TWISTER ? 1 : 0.55, i === TWISTER ? 0x2a8aff : c, i % 3 === 0);
  });
  const tw0 = twister!.getPointAt(0);
  // A platform at its mouth and the name over it.
  ctx.solid.box(2.6, 0.25, 2.6, tw0.x, tw0.y - 0.6, tw0.z, std(0x2a6ad0, 0.6));
  ctx.flat.wall(
    4.4,
    1.1,
    tw0.x,
    tw0.y + 1.6,
    tw0.z,
    neon(ctx, "TWISTER", "#5ae0ff", { w: 512, h: 128 }),
    YAW.north,
  );

  // ---- The gate on Park Avenue, the fence round the park, a snack hut and the tube rack.
  const G = P.gate;
  ctx.solid.box(0.8, 6, 0.8, G.x - 7, Y0 + 3, G.z, std(0x2a6ad0, 0.6));
  ctx.solid.box(0.8, 6, 0.8, G.x + 7, Y0 + 3, G.z, std(0x2a6ad0, 0.6));
  ctx.solid.box(15.6, 2.4, 0.6, G.x, Y0 + 6.6, G.z, std(0x2a6ad0, 0.6));
  ctx.flat.wall(15, 2.2, G.x, Y0 + 6.6, G.z - 0.32, logoMat(), YAW.north);
  addSolid(ctx, G.x - 7.4, G.x - 6.6, G.z - 0.4, G.z + 0.4);
  addSolid(ctx, G.x + 6.6, G.x + 7.4, G.z - 0.4, G.z + 0.4);
  const fence = std(0x2a6ad0, 0.6);
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    ctx.solid.box(
      Math.abs(x1 - x0) + 0.1,
      1.6,
      Math.abs(z1 - z0) + 0.1,
      (x0 + x1) / 2,
      Y0 + 0.8,
      (z0 + z1) / 2,
      fence,
    );
    addSolid(
      ctx,
      Math.min(x0, x1) - 0.06,
      Math.max(x0, x1) + 0.06,
      Math.min(z0, z1) - 0.06,
      Math.max(z0, z1) + 0.06,
    );
  };
  run(L.minX, L.minZ, G.x - 7.4, L.minZ);
  run(G.x + 7.4, L.minZ, L.maxX, L.minZ);
  run(L.minX, L.minZ, L.minX, L.maxZ);
  run(L.maxX, L.minZ, L.maxX, L.maxZ);
  run(L.minX, L.maxZ, L.maxX, L.maxZ);
  // Snack hut on the east side of the gate.
  ctx.solid.box(6, 3, 4, L.maxX - 5, Y0 + 1.5, L.minZ + 4.5, std(0xffd23a, 0.7));
  ctx.solid.box(7, 0.4, 5, L.maxX - 5, Y0 + 3.2, L.minZ + 4.5, std(0xd8262a, 0.6));
  ctx.flat.wall(
    5,
    1,
    L.maxX - 5,
    Y0 + 2.4,
    L.minZ + 2.48,
    neon(ctx, "SNACKS", "#ff3b3b", { w: 384, h: 96 }),
    YAW.north,
  );
  addSolid(ctx, L.maxX - 8, L.maxX - 2, L.minZ + 2.5, L.minZ + 6.5);
  // The tube rack by the river.
  const rackX = R.cx - r1 - 2.2;
  const rackZ = R.cz - hs - 6;
  ctx.solid.box(0.3, 2.6, 4, rackX - 0.6, Y0 + 1.3, rackZ, MAT.steel());
  for (let i = 0; i < 6; i++)
    ctx.solid.add(
      new THREE.TorusGeometry(0.6, 0.22, 8, 16),
      std(tubeCols[i % 6]!, 0.5),
      rackX,
      Y0 + 0.5 + (i % 3) * 0.75,
      rackZ - 1.2 + Math.floor(i / 3) * 2.2,
      Math.PI / 2,
    );
  addSolid(ctx, rackX - 0.9, rackX + 0.5, rackZ - 2.2, rackZ + 2.2);
  // Loungers along the wave pool's beach.
  for (let x = W.minX + 2; x < W.maxX - 1; x += 2.2) {
    for (const row of [0, 1]) {
      ctx.solid.box(0.7, 0.3, 1.9, x, Y0 + 0.3, W.minZ - 2.4 - row * 3.6, std(0xf4f1ea, 0.7));
      ctx.solid.box(0.7, 0.6, 0.1, x, Y0 + 0.6, W.minZ - 1.5 - row * 3.6, std(0xf4f1ea, 0.7), 0);
    }
    lounge.push({ x, z: W.minZ - 3.8, fx: wcx, fz: wcz });
  }
  for (let x = W.minX + 4; x < W.maxX - 2; x += 7) {
    ctx.solid.cyl(0.05, 0.05, 2.6, x, Y0 + 1.3, W.minZ - 4.2, MAT.white(), 6);
    ctx.solid.add(new THREE.ConeGeometry(1.7, 0.7, 12), striped(), x, Y0 + 2.75, W.minZ - 4.2);
  }
  // The high dive at the side of the wave pool: a concrete tower, a ladder, a board out over the water.
  const HD = { x: W.maxX + 3.2, z: W.minZ + 30 };
  ctx.solid.box(2.2, 8, 2.2, HD.x, Y0 + 4, HD.z, std(0xd8d2c4, 0.8));
  ctx.solid.box(4.2, 0.3, 1.6, HD.x - 2.6, Y0 + 8.1, HD.z, std(0xf4f1ea, 0.6));
  for (let y = 0.6; y < 8; y += 0.5)
    ctx.solid.box(0.06, 0.06, 0.9, HD.x + 1.18, Y0 + y, HD.z, MAT.steel());
  for (const s of [-0.45, 0.45])
    ctx.solid.box(0.06, 8.6, 0.06, HD.x + 1.2, Y0 + 4.3, HD.z + s, MAT.steel());
  for (const s of [-0.75, 0.75])
    ctx.solid.box(2.2, 0.9, 0.05, HD.x, Y0 + 8.7, HD.z + s, MAT.steel());
  addSolid(ctx, HD.x - 1.1, HD.x + 1.1, HD.z - 1.1, HD.z + 1.1);
  // Rafts and tubes, yellow and blue, all over the wave pool.
  const raftGeo = new THREE.TorusGeometry(0.6, 0.24, 8, 16);
  raftGeo.rotateX(Math.PI / 2);
  const rafts: THREE.Mesh[] = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(raftGeo, std(i % 4 === 3 ? 0x2a6ad0 : 0xffd23a, 0.5));
    m.position.set(W.minX + 2 + ((i * 7.3) % (ww - 4)), wy, W.minZ + 7 + ((i * 11.7) % (wd - 10)));
    group.add(m);
    rafts.push(m);
  }
  ctx.lamps.push({ x: wcx, y: Y0 + 6, z: wcz, color: 0xbfe8ff });
  ctx.lamps.push({ x: T.x, y: Y0 + T.top, z: T.z, color: 0xffe0b0 });

  // The surge: calm for thirty seconds, then the horn and ten seconds of big rollers.
  const CYCLE = 40;
  const BIG = 10;
  let lastCycle = -1;
  const park = { surge: 0, horn: false };
  const amp = () => 0.22 + 0.62 * park.surge;
  let clock = 0;
  const waveY = (x: number, z: number) => {
    void x;
    const zz = z - wcz;
    const toBeach = clamp01((zz + wd / 2) / wd);
    return wy + Math.sin(zz * 0.55 + clock * (2.4 + park.surge * 0.8)) * amp() * toBeach;
  };

  const swim: Waterpark["swim"] = [];
  for (let i = 0; i < 9; i++)
    swim.push({ x: W.minX + 4 + ((i * 7) % (ww - 8)), z: W.minZ + 8 + ((i * 11) % (wd - 12)) });
  for (let i = 0; i < 3; i++) swim.push({ x: scx - 6 + i * 6, z: scz + 3 });

  return {
    group,
    geronimo,
    river,
    stairs: { x: T.x - 3.6, z: T.z - 4.2 },
    dive: { x: HD.x + 1.9, z: HD.z, board: { x: HD.x - 4.4, y: Y0 + 8.25, z: HD.z } },
    tubes: { x: rackX + 1.4, z: rackZ },
    gate: { x: G.x, z: G.z + 2 },
    swim,
    lounge,
    floats,
    rafts,
    twister: twister!,
    twisterStart: { x: T.x - 3.6, z: T.z + 4.4 },
    beach: { x: wcx, z: W.minZ + 2.5 },
    get surge() {
      return park.surge;
    },
    get horn() {
      return park.horn;
    },
    waveY,
    update(_dt: number, time: number) {
      clock = time;
      const c = Math.floor(time / CYCLE);
      const into = time - c * CYCLE;
      park.horn = into >= CYCLE - BIG && c !== lastCycle;
      if (park.horn) lastCycle = c;
      // Up over two seconds, down over three.
      const k =
        into < CYCLE - BIG ? 0 : Math.min(1, (into - (CYCLE - BIG)) / 2, (CYCLE - into) / 3);
      park.surge = Math.max(0, k);
      // Waves roll in from the machine house at the south end and die on the beach.
      const pos = waveGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const z = base[i * 3 + 2]!;
        const toBeach = (z + wd / 2) / wd;
        arr[i * 3 + 1] = Math.sin(z * 0.55 + time * (2.4 + park.surge * 0.8)) * amp() * toBeach;
      }
      pos.needsUpdate = true;
      rafts.forEach((r, i) => {
        if (r.userData.held) return;
        r.position.y = waveY(r.position.x, r.position.z) + 0.1;
        r.rotation.y = time * 0.1 + i;
        // Tipped by the slope of the wave under it.
        r.rotation.x =
          (waveY(r.position.x, r.position.z + 0.6) - waveY(r.position.x, r.position.z - 0.6)) * 0.9;
      });
      blue.map!.offset.set(time * 0.02, time * 0.03);
      riverMat.map!.offset.set(0, -time * 0.05);
      floats.forEach((t, i) => {
        const u = (time * 0.012 + i / floats.length) % 1;
        river.getPoint(u, t.position);
        t.position.y = wy + 0.08 + Math.sin(time * 1.4 + i) * 0.04;
      });
    },
  };
}

/** Red and white awning stripes. */
let stripes: THREE.MeshStandardMaterial | null = null;
function striped() {
  if (!stripes)
    stripes = new THREE.MeshStandardMaterial({
      map: tex(64, 32, (g, w, h) => {
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? "#d8262a" : "#f6f2ea";
          g.fillRect((i * w) / 8, 0, w / 8 + 1, h);
        }
      }),
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
  return stripes;
}

/**
 * The Adventure River sign: a yellow sun behind a blue wave crest, a rider on a tube on top of it,
 * and "Adventure River" in red script with a white edge.
 */
let logo: THREE.MeshBasicMaterial | null = null;
function logoMat() {
  if (logo) return logo;
  const map = tex(1024, 256, (g, w, h) => {
    g.fillStyle = "#1e2a36";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f6c232";
    g.beginPath();
    g.arc(w * 0.5, h * 0.5, h * 0.42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a6ad0";
    g.beginPath();
    g.moveTo(w * 0.2, h * 0.62);
    g.bezierCurveTo(w * 0.32, h * 0.2, w * 0.5, h * 0.08, w * 0.62, h * 0.3);
    g.bezierCurveTo(w * 0.55, h * 0.22, w * 0.5, h * 0.36, w * 0.58, h * 0.44);
    g.bezierCurveTo(w * 0.7, h * 0.5, w * 0.8, h * 0.6, w * 0.82, h * 0.72);
    g.lineTo(w * 0.2, h * 0.72);
    g.closePath();
    g.fill();
    g.fillStyle = "#d8262a";
    g.beginPath();
    g.ellipse(w * 0.6, h * 0.24, 26, 9, -0.3, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(w * 0.6, h * 0.14, 9, 0, Math.PI * 2);
    g.fill();
    g.font = 'italic 900 118px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 16;
    g.strokeStyle = "#f6f2ea";
    g.strokeText("Adventure River", w / 2, h * 0.64, w * 0.92);
    g.fillStyle = "#d8262a";
    g.fillText("Adventure River", w / 2, h * 0.64, w * 0.92);
    g.font = "700 20px Arial, sans-serif";
    g.fillStyle = "#f6f2ea";
    g.fillText("MEMPHIS, TN", w * 0.86, h * 0.92);
  });
  logo = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  return logo;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
