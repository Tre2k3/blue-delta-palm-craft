import * as THREE from "three";
import { tex } from "../gfx/tex";
import { Frame, MAT, YAW, emissiveMat, makeCtx, neon, sign, std } from "./kit";
import { ROOM } from "./map";
import { finish, light, shell, type Room } from "./rooms";

export type ClubRoom = Room & {
  /** The middle of the stage boards, how high they are, and how much of them the band has. */
  stage: { x: number; z: number; top: number; w: number; d: number; heading: number };
  /** Where a request is put to the band, and the middle of the dance floor. */
  request: { x: number; z: number };
  floor: { x: number; z: number; halfW: number; halfD: number };
  /** Where Benji orders, and where whoever tends the bar stands. */
  bar: { x: number; z: number };
  barkeep: { x: number; z: number; heading: number };
  /** Every table, with the two seats at it. */
  tables: { x: number; z: number; seats: { x: number; z: number }[] }[];
  /** Places along the bar and by the stage where people stand. */
  rail: { x: number; z: number }[];
  /** The stage lights move with the band: `beat` is beats into the tune. */
  pulse(beat: number): void;
};

/**
 * The Memphian, inside: an old picture house turned blues room. The band is on the stage
 * under the curtain, the dance floor in front of it, tables with a candle each, the bar down
 * the west wall.
 */
export function buildClubRoom(): ClubRoom {
  const group = new THREE.Group();
  const ctx = makeCtx(91);
  const C = ROOM.club;
  const W = 24;
  const D = 20;
  const H = 6.2;
  const boards = new THREE.MeshStandardMaterial({
    map: tex(128, 128, (g, w, h) => {
      g.fillStyle = "#3b2416";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = `rgba(${38 + (i % 3) * 14},${22 + (i % 4) * 6},12,0.55)`;
        g.fillRect(0, i * 16, w, 15);
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(0, i * 16 + 15, w, 1.2);
        g.fillRect(((i * 53) % w) | 0, i * 16, 1.2, 15);
      }
    }),
    roughness: 0.5,
    metalness: 0.05,
  });
  shell(ctx, C.x, C.z, W, D, H, boards, MAT.brick("#3a1b1b", 23), std(0x0b0808, 0.95), 3);
  const lights: THREE.PointLight[] = [];
  const f = new Frame(ctx, C.x, C.z, YAW.south);
  const black = std(0x0c0a0a, 0.6, 0.2);
  const amberGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.5), toneMapped: false });

  // ---- The stage: boards, a rug, the curtain behind and the house name in lights on it.
  const SW = 11;
  const SD = 4.6;
  const ST = 0.6;
  const sz = -D / 2 + SD / 2;
  f.box(SW, ST, SD, 0, ST / 2, sz, MAT.darkWood());
  f.flat(SW - 2.4, SD - 1.2, 0, ST + 0.012, sz + 0.1, std(0x571522, 1), ctx.ground);
  f.box(SW + 0.06, 0.07, 0.07, 0, ST - 0.02, sz + SD / 2 + 0.03, amberGlow, ctx.flat);
  for (let i = -3; i <= 3; i++) {
    f.box(0.26, 0.12, 0.2, i * 1.55, ST + 0.06, sz + SD / 2 - 0.16, black);
    f.box(0.2, 0.07, 0.03, i * 1.55, ST + 0.09, sz + SD / 2 - 0.27, emissiveMat(ctx, i % 2 ? 0x6a9bff : 0xffc070, 1.2, 2.6), ctx.flat);
  }
  const velvet = new THREE.MeshStandardMaterial({
    map: tex(256, 32, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const k = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 4 + Math.sin(x * 0.11) * 0.8);
        g.fillStyle = `rgb(${Math.round(58 + 96 * k)},${Math.round(6 + 14 * k)},${Math.round(14 + 20 * k)})`;
        g.fillRect(x, 0, 1, h);
      }
    }),
    roughness: 0.95,
  });
  f.wall(SW + 1.6, H - ST, 0, ST + (H - ST) / 2, -D / 2 + 0.08, velvet, ctx.solid, 0, 3, 1);
  // The proscenium: a leg of curtain either side and a valance over the top.
  const drape = std(0x4a0c16, 0.95);
  for (const s of [-1, 1]) f.box(1.1, H, 0.34, s * (SW / 2 + 0.55), H / 2, -D / 2 + SD - 0.1, drape);
  f.box(SW + 2.2, 0.95, 0.34, 0, H - 0.47, -D / 2 + SD - 0.1, drape);
  f.box(SW + 2.2, 0.07, 0.36, 0, H - 0.97, -D / 2 + SD - 0.1, MAT.gold());
  // Signs in here are read from across a dark room: lit, but not driven as hard as the ones on the street.
  const tube = (text: string, color: string, sub: string, w: number, h: number) => {
    const m = neon(ctx, text, color, { sub, w, h }).clone();
    m.color.setScalar(1.15);
    return m;
  };
  f.wall(6.2, 1.55, 0, 4.35, -D / 2 + 0.16, tube("THE MEMPHIAN", "#ffb400", "BLUES REVUE · EVERY NIGHT", 768, 192), ctx.flat);
  // Amplifiers at the back, the house speakers on the floor either side.
  for (const [ax, w] of [
    [-4.5, 0.9],
    [-3.3, 0.7],
    [3.9, 0.9],
  ] as const) {
    f.box(w, 0.74, 0.42, ax, ST + 0.37, -D / 2 + 0.55, black);
    f.wall(w - 0.14, 0.5, ax, ST + 0.34, -D / 2 + 0.77, std(0x2a2622, 1), ctx.flat);
    f.box(0.05, 0.05, 0.02, ax + w / 2 - 0.12, ST + 0.66, -D / 2 + 0.77, emissiveMat(ctx, 0xff3b3b, 2, 3), ctx.flat);
  }
  for (const s of [-1, 1]) {
    f.box(1, 1.9, 0.8, s * (SW / 2 + 0.9), 0.95, -D / 2 + SD + 0.75, black);
    for (const y of [0.5, 1.35]) f.add(new THREE.CircleGeometry(0.3, 16), std(0x1f1c1a, 0.9), s * (SW / 2 + 0.9), y, -D / 2 + SD + 1.16, ctx.flat);
    f.solid(s * (SW / 2 + 0.9) - 0.55, s * (SW / 2 + 0.9) + 0.55, -D / 2 + SD + 0.3, -D / 2 + SD + 1.2);
  }
  f.solid(-SW / 2 - 1.2, SW / 2 + 1.2, -D / 2, -D / 2 + SD + 0.12);
  // The tip jar on the lip.
  f.add(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 12), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 }), 1.2, ST + 0.13, sz + SD / 2 - 0.5);
  f.add(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10), MAT.gold(), 1.2, ST + 0.06, sz + SD / 2 - 0.5);

  // The rig over the lip: cans in three colours, and the shafts of light they throw.
  const rigZ = -D / 2 + SD - 0.9;
  const rigY = H - 1.25;
  f.box(SW - 0.6, 0.1, 0.1, 0, rigY + 0.2, rigZ, black);
  const cans: { x: number; color: number }[] = [
    { x: -4.2, color: 0x4a7dff },
    { x: -2.1, color: 0xffb060 },
    { x: 0, color: 0xff4fd8 },
    { x: 2.1, color: 0xffb060 },
    { x: 4.2, color: 0x4a7dff },
  ];
  const beams: THREE.Mesh[] = [];
  for (const can of cans) {
    f.add(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 10), black, can.x, rigY, rigZ, ctx.solid, 0, 0.35);
    f.add(new THREE.CircleGeometry(0.17, 12), emissiveMat(ctx, can.color, 2.4, 3.4), can.x, rigY - 0.16, rigZ - 0.08, ctx.flat, 0, Math.PI / 2 + 0.35);
    const tall = rigY - ST;
    const cone = new THREE.ConeGeometry(1.5, tall, 20, 1, true);
    const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: can.color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.set(C.x + can.x, ST + tall / 2, C.z + rigZ - 0.9);
    beam.rotation.x = -0.2;
    beam.renderOrder = 4;
    group.add(beam);
    beams.push(beam);
  }
  const amber = light(group, lights, C.x, 4.5, C.z - D / 2 + SD - 0.2, 0xffb060, 44, 12);
  const blue = light(group, lights, C.x - 4.2, 4.2, C.z - D / 2 + SD - 1, 0x4a7dff, 30, 10);
  const pink = light(group, lights, C.x + 4.2, 4.2, C.z - D / 2 + SD - 1, 0xff4fd8, 30, 10);

  // ---- The dance floor: black and cream squares, waxed.
  const FW = 8;
  const FD = 5;
  const fz = -D / 2 + SD + 0.9 + FD / 2;
  const checks = new THREE.MeshStandardMaterial({
    map: tex(64, 64, (g, w, h) => {
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          g.fillStyle = (x + y) % 2 ? "#e9dcc0" : "#14100e";
          g.fillRect((x * w) / 2, (y * h) / 2, w / 2, h / 2);
        }
    }),
    roughness: 0.18,
    metalness: 0.15,
  });
  f.flat(FW, FD, 0, 0.012, fz, checks, ctx.ground, 1.6);
  f.flat(FW + 0.3, FD + 0.3, 0, 0.008, fz, MAT.gold(), ctx.ground);

  // ---- The bar down the west wall: counter, stools, the bottles lit from behind.
  const barX = -W / 2 + 2.7;
  const barZ0 = -2.4;
  const barZ1 = 6.4;
  const barMid = (barZ0 + barZ1) / 2;
  const barLen = barZ1 - barZ0;
  f.box(0.9, 1.08, barLen, barX, 0.54, barMid, std(0x2a160e, 0.5));
  f.box(1.16, 0.08, barLen + 0.2, barX, 1.12, barMid, std(0x1a0d08, 0.18, 0.3));
  f.box(0.05, 0.05, barLen, barX + 0.47, 0.2, barMid, MAT.gold());
  f.box(0.04, 0.04, barLen, barX + 0.5, 0.98, barMid, amberGlow, ctx.flat);
  const stools: number[] = [];
  for (let z = barZ0 + 0.9; z < barZ1 - 0.4; z += 1.5) {
    stools.push(z);
    f.add(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 12), std(0x6a1420, 0.6), barX + 1.05, 0.76, z);
    f.add(new THREE.CylinderGeometry(0.035, 0.035, 0.74, 6), MAT.chrome(), barX + 1.05, 0.37, z);
    f.add(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 12), MAT.chrome(), barX + 1.05, 0.02, z);
  }
  f.solid(-W / 2, barX + 0.6, barZ0 - 0.15, barZ1 + 0.15);
  const wf = new Frame(ctx, C.x - W / 2 + 0.02, C.z, YAW.east);
  // On this wall local +X runs toward the stage.
  wf.box(barLen, 3.3, 0.1, -barMid, 2.35, 0.05, black);
  wf.wall(barLen - 0.5, 1.5, -barMid, 2.3, 0.11, new THREE.MeshStandardMaterial({ color: 0x2c343a, roughness: 0.4, metalness: 0.55 }), ctx.solid);
  const glass = [0x3ad27a, 0xffb400, 0xb6602a, 0xe8e2d0, 0x7a1f1f, 0x35a0e0].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, emissive: color, emissiveIntensity: 0.22 }));
  [1.5, 2.25, 3].forEach((y, row) => {
    wf.box(barLen - 0.3, 0.05, 0.3, -barMid, y, 0.2, std(0x241208, 0.4));
    wf.box(barLen - 0.4, 0.03, 0.03, -barMid, y + 0.035, 0.34, emissiveMat(ctx, 0xffc070, 1.4, 2.4), ctx.flat);
    for (let i = 0; i < 22; i++) {
      const lx = -barZ0 - 0.4 - i * ((barLen - 0.8) / 21);
      const tall = 0.26 + ((i * 7 + row * 3) % 5) * 0.035;
      wf.add(new THREE.CylinderGeometry(0.06, 0.07, tall, 6), glass[(i + row * 2) % glass.length]!, lx, y + 0.03 + tall / 2, 0.2);
      wf.add(new THREE.CylinderGeometry(0.022, 0.03, 0.12, 6), glass[(i + row * 2) % glass.length]!, lx, y + 0.09 + tall, 0.2);
    }
  });
  wf.wall(4.6, 1.05, -barMid, 4.5, 0.08, tube("COLD DRINKS", "#35e0d0", "HOT BLUES", 640, 144), ctx.flat);
  light(group, lights, C.x + barX + 1.2, 3.1, C.z + barMid, 0xffc070, 26, 11);

  // ---- Tables: a round top, a candle, two seats turned to the stage.
  const tables: ClubRoom["tables"] = [];
  const top = std(0x1c100a, 0.3, 0.2);
  for (const [tx, tz] of [
    [6.4, -3.1],
    [9.6, -0.4],
    [5.4, 1.5],
    [8.6, 4.2],
    [4.2, 5.6],
    [-4.6, 3.4],
    [-4.2, 7],
  ] as const) {
    f.add(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 18), top, tx, 0.76, tz);
    f.add(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 6), black, tx, 0.37, tz);
    f.add(new THREE.CylinderGeometry(0.26, 0.3, 0.04, 12), black, tx, 0.02, tz);
    f.add(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8), std(0x7a1f1f, 0.3), tx, 0.83, tz);
    f.add(new THREE.SphereGeometry(0.035, 8, 6), emissiveMat(ctx, 0xffc060, 2.4, 3.2), tx, 0.91, tz, ctx.flat);
    f.solid(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4);
    tables.push({ x: C.x + tx, z: C.z + tz, seats: [-1, 1].map((s) => ({ x: C.x + tx + s * 0.92, z: C.z + tz + 0.34 })) });
  }
  light(group, lights, C.x + 7, 3.4, C.z + 2, 0xff9a50, 20, 13);
  light(group, lights, C.x - 3, 3.6, C.z + 6, 0xffb878, 16, 12);

  // ---- The walls: who is playing this month, and a string of bulbs across the room.
  const bill = (fr: Frame, lx: number, y: number, title: string, sub: string, fg: string, bg: string) => {
    fr.box(1.74, 2.3, 0.06, lx, y, 0.03, MAT.gold());
    fr.wall(1.6, 2.16, lx, y, 0.07, sign(title, fg, bg, { sub, w: 384, h: 512 }), ctx.flat);
  };
  const ef = new Frame(ctx, C.x + W / 2 - 0.02, C.z, YAW.west);
  bill(ef, -6.4, 2.6, "BIG RAY", "& THE RIVER RATS · FRIDAY", "#ffd23a", "#3a0d12");
  bill(ef, -3.2, 2.6, "MISS LULA", "SINGS THE BLUES · SATURDAY", "#f5f0e1", "#10233a");
  bill(ef, 0, 2.6, "BLUFF CITY", "HORNS · SUNDAY MATINEE", "#39ff14", "#141414");
  bill(ef, 3.2, 2.6, "FISH FRY", "& OPEN MIC · EVERY TUESDAY", "#ff8a3c", "#241208");
  const df = new Frame(ctx, C.x, C.z + D / 2 - 0.02, YAW.north);
  bill(df, -5.4, 2.6, "HOME OF", "THE BLUES · SINCE 1947", "#ffb400", "#1a0d08");
  bill(df, 5.4, 2.6, "NO COVER", "FOR ORANGE MOUND", "#f5f0e1", "#3a0d12");
  bill(df, 8.4, 2.6, "$ACK", "RELIGIOUS · PLAYS HERE", "#39ff14", "#0a0a0b");
  for (const lz of [-0.6, 3.4, 7.4]) {
    f.box(W - 1, 0.02, 0.02, 0, H - 1.02, lz, black);
    for (let i = 0; i < 15; i++) {
      const lx = -W / 2 + 1.2 + i * ((W - 2.4) / 14);
      // The string sags between its hooks.
      const sag = Math.sin((i / 14) * Math.PI * 3) ** 2 * 0.18;
      f.add(new THREE.SphereGeometry(0.06, 6, 5), emissiveMat(ctx, i % 3 === 1 ? 0xffb060 : 0xffe2b0, 2, 3), lx, H - 1.1 - sag, lz, ctx.flat);
    }
  }
  // The door back out to Union.
  // Two padded doors with a round window each, the street light coming through.
  f.box(2.9, 3.5, 0.1, 0, 1.75, D / 2 - 0.06, MAT.black());
  for (const s of [-1, 1]) {
    f.box(1.26, 3.2, 0.1, s * 0.66, 1.62, D / 2 - 0.12, std(0x4a1018, 0.7));
    f.add(new THREE.CircleGeometry(0.3, 18), emissiveMat(ctx, 0xffc98a, 0.9, 1.5), s * 0.66, 2.35, D / 2 - 0.18, ctx.flat, Math.PI);
    f.box(0.05, 0.5, 0.06, s * 0.14, 1.5, D / 2 - 0.19, MAT.gold());
  }
  f.box(2.9, 0.16, 0.2, 0, 3.48, D / 2 - 0.1, MAT.black());
  f.wall(1.6, 0.36, 0, 3.86, D / 2 - 0.2, sign("EXIT", "#39ff14", "#0a0a0b", { w: 256, h: 64 }), ctx.flat, Math.PI);
  // A rope and two posts where the doorman stands.
  for (const s of [-1, 1]) {
    f.add(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), MAT.gold(), s * 2.1, 0.5, D / 2 - 1.5);
    f.add(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 10), MAT.gold(), s * 2.1, 0.03, D / 2 - 1.5);
    f.box(0.05, 0.05, 1.3, s * 2.1, 0.86, D / 2 - 0.85, std(0x7a1f2a, 0.8));
  }

  finish(ctx, group);
  const rail = [...stools.filter((_, i) => i % 2 === 1).map((z) => ({ x: C.x + barX + 1.75, z: C.z + z + 0.75 })), { x: C.x - 5.2, z: C.z - D / 2 + SD + 1.1 }, { x: C.x + 5.2, z: C.z - D / 2 + SD + 1.1 }];
  return {
    id: "club",
    group,
    bounds: { minX: C.x - W / 2, maxX: C.x + W / 2, minZ: C.z - D / 2, maxZ: C.z + D / 2 },
    solids: ctx.solids,
    floorY: 0,
    spawn: { x: C.x, z: C.z + D / 2 - 3.4, heading: Math.PI },
    exit: { x: C.x, z: C.z + D / 2 - 0.9 },
    lights,
    ambient: { sky: 0xffb890, ground: 0x241010, power: 0.5 },
    boom: 4.8,
    stage: { x: C.x, z: C.z + sz + 0.1, top: ST + 0.03, w: SW - 1.4, d: SD - 0.9, heading: 0 },
    request: { x: C.x, z: C.z - D / 2 + SD + 0.95 },
    floor: { x: C.x, z: C.z + fz, halfW: FW / 2, halfD: FD / 2 },
    bar: { x: C.x + barX + 1.75, z: C.z + barMid + 0.25 },
    barkeep: { x: C.x + barX - 1.2, z: C.z + barMid + 0.25, heading: Math.PI / 2 },
    tables,
    rail,
    pulse(beat: number) {
      // A lift on every beat, the colours trading places bar by bar.
      const hit = Math.pow(1 - (beat - Math.floor(beat)), 2.2);
      const bar = Math.floor(beat / 4);
      amber.intensity = 34 + hit * 20;
      blue.intensity = (bar % 2 ? 36 : 20) + hit * 8;
      pink.intensity = (bar % 2 ? 20 : 36) + hit * 8;
      beams.forEach((b, i) => {
        const on = (i + bar) % 2 === 0;
        (b.material as THREE.MeshBasicMaterial).opacity = (on ? 0.085 : 0.035) + hit * 0.03;
        b.rotation.z = Math.sin(beat * 0.39 + i * 1.3) * 0.16;
      });
    },
  };
}
