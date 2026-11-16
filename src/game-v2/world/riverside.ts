import * as THREE from "three";
import { MAT, YAW, addSolid, bench, neon, sign, std, tree, type BuildCtx } from "./kit";
import { CROSSING, CURB, FAR_BANK_Z, LANDING, RIVER_Z, STREETS_Z, ROAD_HALF, WALK } from "./map";

const Y0 = CURB;

export type Riverside = {
  /** Spots for people round the new park and on the landing. */
  stops: {
    x: number;
    z: number;
    fx: number;
    fz: number;
    act: "watch" | "cheer" | "play" | "eat" | "dance";
  }[];
  /** The Big River Crossing's lights, cycling colour after dark. */
  update(dt: number, time: number): void;
};

/** The south end of the riverfront walk where the new park is, between Riverside Drive and the water. */
const PARK_Z0 = RIVER_Z + 6;
const PARK_Z1 = STREETS_Z[0] - ROAD_HALF - WALK - 3;

/**
 * The riverfront's three new attractions:
 *
 * Tom Lee Park as it was rebuilt: the great lawn, the Cove under its wave of a roof, a big
 * playground of towers, nets and slides, the sports courts, the fitness yard and the shade sails,
 * with the monument to Tom Lee in the middle of it all.
 *
 * Beale Street Landing at the foot of Beale: grass roofs stepping down to the water like lily
 * pads, the dock out into the river, and a riverboat tied up at it.
 *
 * The Big River Crossing on the old Harahan Bridge, just north of the I-55 bridge: the
 * walkway along its trusses lit end to end, the colours running across the river at night.
 */
export function buildRiverside(ctx: BuildCtx): Riverside {
  const stops: Riverside["stops"] = [];
  const grass = MAT.grass();
  const mid = (PARK_Z0 + PARK_Z1) / 2;
  const depth = PARK_Z1 - PARK_Z0;

  // ---- The great lawn at the south end.
  ctx.ground.flat(46, depth, -392, Y0 + 0.008, mid, grass, 0, 6);
  for (let i = 0; i < 6; i++)
    stops.push({ x: -405 + i * 6, z: mid + (i % 2 ? 4 : -3), fx: -392, fz: RIVER_Z, act: "watch" });

  // ---- The Cove: a long wave of a roof on slender columns, picnic tables in its shade.
  const cx = -350;
  const roofGeo = new THREE.PlaneGeometry(28, 14, 28, 6);
  roofGeo.rotateX(-Math.PI / 2);
  const rp = roofGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++)
    rp.setY(i, Math.sin(rp.getX(i) * 0.28) * 1.1 + Math.cos(rp.getZ(i) * 0.3) * 0.4);
  roofGeo.computeVertexNormals();
  ctx.solid.add(
    roofGeo,
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5, side: THREE.DoubleSide }),
    cx,
    Y0 + 5.2,
    mid,
  );
  for (let x = -12; x <= 12; x += 6)
    for (const z of [-5.5, 5.5]) {
      ctx.solid.cyl(0.14, 0.14, 5, cx + x, Y0 + 2.5, mid + z, MAT.steel(), 8);
      addSolid(ctx, cx + x - 0.2, cx + x + 0.2, mid + z - 0.2, mid + z + 0.2);
    }
  ctx.ground.flat(28, 14, cx, Y0 + 0.01, mid, MAT.concrete(), 0, 4);
  for (let x = -9; x <= 9; x += 6) {
    ctx.solid.box(2.4, 0.08, 1, cx + x, Y0 + 0.78, mid, MAT.wood());
    ctx.solid.box(2.4, 0.06, 0.32, cx + x, Y0 + 0.45, mid - 0.85, MAT.wood());
    ctx.solid.box(2.4, 0.06, 0.32, cx + x, Y0 + 0.45, mid + 0.85, MAT.wood());
    addSolid(ctx, cx + x - 1.2, cx + x + 1.2, mid - 0.5, mid + 0.5);
    stops.push(
      { x: cx + x - 0.6, z: mid - 1.1, fx: cx + x - 0.6, fz: mid, act: "eat" },
      { x: cx + x + 0.6, z: mid + 1.1, fx: cx + x + 0.6, fz: mid, act: "eat" },
    );
  }
  ctx.flat.wall(
    8,
    1.2,
    cx,
    Y0 + 3.4,
    mid + 7.1,
    sign("THE COVE", "#f3e9c8", "#1d3b24", { sub: "TOM LEE PARK", w: 512, h: 128 }),
    YAW.south,
  );

  // ---- The playground: towers joined by bridges, a rope pyramid, slides off the sides.
  const px = -312;
  ctx.ground.flat(30, depth - 4, px, Y0 + 0.01, mid, std(0x3a5a8a, 0.95), 0, 4);
  const towers = [
    [-9, -6, 0xff7a2a, 5],
    [-1, 5, 0x39c86a, 4],
    [8, -4, 0xffd23a, 6],
  ] as const;
  for (const [dx, dz, color, h] of towers) {
    for (const [ox, oz] of [
      [-1.2, -1.2],
      [1.2, -1.2],
      [-1.2, 1.2],
      [1.2, 1.2],
    ] as const)
      ctx.solid.cyl(0.1, 0.1, h, px + dx + ox, Y0 + h / 2, mid + dz + oz, std(color, 0.5, 0.2), 6);
    ctx.solid.box(2.8, 0.2, 2.8, px + dx, Y0 + h * 0.6, mid + dz, std(0x2a2d31, 0.7));
    ctx.solid.add(
      new THREE.ConeGeometry(2.2, 1.4, 4),
      std(color, 0.6),
      px + dx,
      Y0 + h + 0.7,
      mid + dz,
      Math.PI / 4,
    );
    // A slide off the south face.
    const s = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px + dx, Y0 + h * 0.6, mid + dz + 1.4),
      new THREE.Vector3(px + dx + 0.6, Y0 + h * 0.3, mid + dz + 3.6),
      new THREE.Vector3(px + dx + 0.8, Y0 + 0.3, mid + dz + 5.4),
    ]);
    ctx.solid.add(
      new THREE.TubeGeometry(s, 16, 0.45, 8, false),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, side: THREE.DoubleSide }),
      0,
      0,
      0,
    );
    addSolid(ctx, px + dx - 1.4, px + dx + 1.4, mid + dz - 1.4, mid + dz + 1.4);
    stops.push({ x: px + dx + 0.8, z: mid + dz + 6.2, fx: px + dx, fz: mid + dz, act: "cheer" });
  }
  // The rope pyramid.
  const rope = new THREE.Mesh(
    new THREE.ConeGeometry(4, 6, 6, 4, true),
    new THREE.MeshBasicMaterial({ color: 0xe0261c, wireframe: true }),
  );
  ctx.solid.add(rope.geometry, rope.material as THREE.Material, px + 3, Y0 + 3, mid + 5);
  ctx.solid.cyl(0.12, 0.12, 6.4, px + 3, Y0 + 3.2, mid + 5, MAT.steel(), 6);
  addSolid(ctx, px + 2.6, px + 3.4, mid + 4.6, mid + 5.4);
  ctx.flat.wall(
    7,
    1.2,
    px,
    Y0 + 1.1,
    PARK_Z1 - 0.6,
    sign("PLAYGROUND", "#ffd23a", "#2a6ad0", { w: 512, h: 96 }),
    YAW.south,
  );

  // ---- Sports courts: a half court with its hoop, and the sand court with a net.
  const sx = -244;
  ctx.ground.flat(14, 15, sx - 8, Y0 + 0.012, mid, std(0x2a6ad0, 0.8));
  ctx.ground.flat(
    13.2,
    0.12,
    sx - 8,
    Y0 + 0.016,
    mid + 7,
    new THREE.MeshBasicMaterial({ color: 0xf4f1ea }),
  );
  ctx.solid.cyl(0.1, 0.12, 3.6, sx - 8, Y0 + 1.8, mid - 7.6, MAT.black(), 8);
  ctx.solid.box(1.8, 1.05, 0.06, sx - 8, Y0 + 3.45, mid - 7.2, std(0xf4f1ea, 0.3));
  ctx.solid.add(
    new THREE.TorusGeometry(0.23, 0.02, 6, 16),
    std(0xff5a1e, 0.4),
    sx - 8,
    Y0 + 3.05,
    mid - 6.9,
    0,
    Math.PI / 2,
  );
  addSolid(ctx, sx - 8.3, sx - 7.7, mid - 7.9, mid - 7.3);
  stops.push(
    { x: sx - 9, z: mid - 2, fx: sx - 8, fz: mid - 7, act: "play" },
    { x: sx - 6, z: mid + 1, fx: sx - 8, fz: mid - 7, act: "play" },
  );
  ctx.ground.flat(10, 16, sx + 6, Y0 + 0.012, mid, std(0xe8d4a0, 0.95));
  for (const s of [-1, 1])
    ctx.solid.cyl(0.06, 0.06, 2.5, sx + 6 + s * 5.2, Y0 + 1.25, mid, MAT.steel(), 6);
  ctx.solid.box(
    10.4,
    0.9,
    0.04,
    sx + 6,
    Y0 + 2.05,
    mid,
    new THREE.MeshBasicMaterial({
      color: 0xf4f1ea,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  stops.push(
    { x: sx + 4, z: mid - 4, fx: sx + 6, fz: mid, act: "play" },
    { x: sx + 8, z: mid + 4, fx: sx + 6, fz: mid, act: "play" },
  );

  // ---- The fitness yard and the shade sails over the walk.
  const fx = -205;
  for (let i = 0; i < 4; i++) {
    const x = fx - 6 + i * 4;
    ctx.solid.cyl(0.06, 0.06, 2.2, x - 0.8, Y0 + 1.1, mid - 6, MAT.steel(), 6);
    ctx.solid.cyl(0.06, 0.06, 2.2, x + 0.8, Y0 + 1.1, mid - 6, MAT.steel(), 6);
    ctx.solid.box(1.7, 0.06, 0.06, x, Y0 + 2.2, mid - 6, MAT.steel());
  }
  stops.push({ x: fx - 4, z: mid - 4.6, fx: fx - 4, fz: mid - 6, act: "cheer" });
  const sailCols = [0xf4f1ea, 0xffd23a, 0x5ac8ff];
  for (let i = 0; i < 6; i++) {
    const x = -228 + i * 13;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-5, 4.6, -3, 5, 5.6, -2, 0, 4, 4]), 3),
    );
    tri.computeVertexNormals();
    ctx.solid.add(
      tri,
      new THREE.MeshStandardMaterial({
        color: sailCols[i % 3],
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
      x,
      Y0,
      mid + 8,
    );
    for (const [ox, oz, h] of [
      [-5, -3, 4.8],
      [5, -2, 5.8],
      [0, 4, 4.2],
    ] as const) {
      ctx.solid.cyl(0.08, 0.08, h, x + ox, Y0 + h / 2, mid + 8 + oz, MAT.steel(), 6);
      addSolid(ctx, x + ox - 0.15, x + ox + 0.15, mid + 8 + oz - 0.15, mid + 8 + oz + 0.15);
    }
  }
  // The welcome sign at the north gate of the park, by Beale.
  ctx.solid.box(9, 2.2, 0.8, -168, Y0 + 1.1, PARK_Z1 - 1, std(0x5a5450, 0.9));
  ctx.flat.wall(
    8.4,
    1.6,
    -168,
    Y0 + 1.2,
    PARK_Z1 - 0.58,
    sign("TOM LEE PARK", "#f3e9c8", "#1d3b24", { sub: "MEMPHIS RIVER PARKS", w: 768, h: 160 }),
    YAW.south,
  );
  addSolid(ctx, -172.6, -163.4, PARK_Z1 - 1.5, PARK_Z1 - 0.5);
  for (let x = -405; x <= -160; x += 22) tree(ctx, x, PARK_Z0 + 2, 1.1, Y0);

  // ---- Beale Street Landing: lily-pad grass roofs stepping down toward the water.
  const L = LANDING;
  const pads = [
    [L.x - 4, -184, 6.5, 2.4],
    [L.x + 4, -189, 5.5, 1.6],
    [L.x - 1, -194, 4.8, 0.9],
  ] as const;
  for (const [x, z, r, h] of pads) {
    ctx.solid.cyl(r, r, h, x, Y0 + h / 2, z, std(0xd8d2c4, 0.7), 28);
    ctx.solid.cyl(r - 0.2, r - 0.2, 0.12, x, Y0 + h + 0.06, z, grass, 28);
    addSolid(ctx, x - r * 0.75, x + r * 0.75, z - r * 0.75, z + r * 0.75);
  }
  // The dock out into the river and its ramp.
  ctx.solid.box(L.w, 0.6, L.z0 - L.z1, L.x, Y0 - 0.2, (L.z0 + L.z1) / 2, std(0x8a8f96, 0.7));
  for (const s of [-1, 1])
    ctx.solid.box(
      0.08,
      1,
      L.z0 - L.z1,
      L.x + (s * L.w) / 2,
      Y0 + 0.6,
      (L.z0 + L.z1) / 2,
      MAT.steel(),
    );
  for (let z = L.z1 + 2; z < L.z0; z += 5)
    for (const s of [-1, 1])
      ctx.solid.cyl(0.35, 0.35, 6, L.x + s * (L.w / 2 - 1), Y0 - 3, z, std(0x4a4e54, 0.6), 8);
  ctx.flat.wall(
    12,
    1.6,
    L.x,
    Y0 + 3.4,
    -178.6,
    neon(ctx, "BEALE STREET LANDING", "#5ac8ff", { w: 1024, h: 128, border: false }),
    YAW.south,
  );
  ctx.solid.box(12.6, 2, 0.4, L.x, Y0 + 3.4, -178.9, MAT.black());
  for (const s of [-5.6, 5.6]) ctx.solid.box(0.3, 3.4, 0.3, L.x + s, Y0 + 1.7, -178.9, MAT.black());
  addSolid(ctx, L.x - 6.3, L.x - 5.4, -179.2, -178.6);
  addSolid(ctx, L.x + 5.4, L.x + 6.3, -179.2, -178.6);
  stops.push(
    { x: L.x + 6, z: -197.5, fx: L.boat.x, fz: L.boat.z, act: "watch" },
    { x: L.x - 7, z: -197, fx: L.boat.x, fz: L.boat.z, act: "watch" },
  );
  riverboat(ctx, L.boat.x, L.boat.z, L.boat.len);

  // ---- The Big River Crossing: a steel truss on its piers, the walkway lit along the north side.
  const bx = CROSSING.x;
  const z0 = RIVER_Z - 2;
  const z1 = FAR_BANK_Z + 4;
  const len = z0 - z1;
  const steel = std(0x5a5e66, 0.6, 0.4);
  const deckY = 11;
  ctx.solid.box(12, 1, len + 20, bx, deckY, (z0 + z1) / 2, steel);
  for (const side of [-5.6, 5.6]) {
    ctx.solid.box(0.7, 0.7, len, bx + side, deckY + 12, (z0 + z1) / 2, steel);
    for (let z = z1; z <= z0; z += 9) {
      ctx.solid.box(0.5, 12, 0.5, bx + side, deckY + 6, z, steel);
      const diag = new THREE.BoxGeometry(0.4, 15, 0.4);
      ctx.solid.add(diag, steel, bx + side, deckY + 6, z + 4.5, 0, 0.64);
    }
  }
  for (let z = z1 + 10; z < z0; z += 32)
    ctx.solid.box(8, deckY + 6, 6, bx, deckY / 2 - 3, z, std(0x7a7068, 0.8));
  // The walkway and its rail of lights: these change colour.
  ctx.solid.box(3.4, 0.25, len + 20, bx + 7.6, deckY + 0.4, (z0 + z1) / 2, MAT.concrete());
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x5ac8ff, toneMapped: false });
  ctx.flat.box(0.2, 0.2, len + 20, bx + 9.3, deckY + 1.4, (z0 + z1) / 2, lightMat);
  const lightMat2 = new THREE.MeshBasicMaterial({ color: 0xff4fd8, toneMapped: false });
  ctx.flat.box(0.25, 0.25, len, bx + 5.9, deckY + 12.6, (z0 + z1) / 2, lightMat2);
  ctx.flat.wall(
    12,
    1.5,
    bx + 7.6,
    deckY + 3.4,
    z0 + 6,
    sign("BIG RIVER CROSSING", "#f3e9c8", "#1a1e24", {
      sub: "MEMPHIS TO ARKANSAS · WALK & BIKE",
      w: 1024,
      h: 160,
    }),
    YAW.south,
  );
  ctx.lamps.push({ x: bx + 8, y: deckY + 3, z: (z0 + z1) / 2, color: 0x5ac8ff });

  const c = new THREE.Color();
  return {
    stops,
    update(_dt: number, time: number) {
      c.setHSL((time * 0.05) % 1, 0.9, 0.6);
      lightMat.color.copy(c);
      c.setHSL((time * 0.05 + 0.5) % 1, 0.9, 0.6);
      lightMat2.color.copy(c);
    },
  };
}

/** A sternwheeler tied up at the landing: three white decks, red trim, the wheel at the back. */
function riverboat(ctx: BuildCtx, x: number, z: number, len: number) {
  const white = std(0xf2efe6, 0.6);
  const red = std(0xa3261c, 0.6);
  const lit = new THREE.MeshStandardMaterial({
    color: 0x332a1c,
    emissive: 0xffc878,
    emissiveIntensity: 0.25,
  });
  ctx.glow.emissive(lit, 0.15, 2.8);
  const y = 0.2;
  ctx.solid.box(len, 2.4, 10, x, y + 1.2, z, white);
  ctx.solid.box(len * 0.86, 2.6, 8.4, x - 1, y + 3.7, z, white);
  ctx.solid.box(len * 0.86 + 0.2, 1.2, 8.6, x - 1, y + 3.8, z, lit);
  ctx.solid.box(len * 0.66, 2.4, 7, x - 2, y + 6.2, z, white);
  ctx.solid.box(len * 0.66 + 0.2, 1.1, 7.2, x - 2, y + 6.3, z, lit);
  ctx.solid.box(6, 2.2, 4.4, x + 6, y + 8.6, z, white);
  ctx.solid.box(len * 0.9, 0.2, 10.2, x, y + 2.5, z, red);
  ctx.solid.box(len * 0.7, 0.2, 8.6, x - 1.5, y + 5.05, z, red);
  for (const s of [-1.6, 1.6]) {
    ctx.solid.cyl(0.5, 0.5, 7, x + 2, y + 11, z + s, MAT.black(), 8);
    ctx.solid.cyl(0.8, 0.5, 0.8, x + 2, y + 14.6, z + s, red, 8);
  }
  const paddle = new THREE.BoxGeometry(0.24, 5.4, 8);
  for (let i = 0; i < 4; i++)
    ctx.solid.add(paddle, red, x - len / 2 - 2.2, y + 2.6, z, 0, 0, (i / 4) * Math.PI);
  ctx.flat.wall(
    16,
    1.4,
    x - 1,
    y + 6.2,
    z + 3.58,
    neon(ctx, "SPIRIT OF THE 901", "#ffd23a", { w: 1024, h: 112, border: false }),
    YAW.south,
  );
  // A gangway across to the dock.
  ctx.solid.box(
    2,
    0.2,
    Math.abs(z - LANDING.z1) - 4.8,
    LANDING.x + LANDING.w / 2 - 2,
    y + 1.6,
    (z + 5 + LANDING.z1) / 2,
    MAT.steel(),
  );
  bench(ctx, LANDING.x - 4, -196, YAW.north, Y0);
}
