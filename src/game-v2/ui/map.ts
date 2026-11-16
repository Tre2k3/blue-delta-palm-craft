import { COURTS_LOT, HOLES, PUTT_LOT, TENNIS, TENNIS_FENCE } from "../world/rec-map";
import {
  ARENA,
  BOWL,
  COURT,
  EAST_Z,
  FAIR,
  FAR_BANK_Z,
  FUN,
  HOME,
  HQ,
  KART_TRACK,
  LANDMARKS,
  OM_ROW,
  PARK,
  PARK_TERRACE,
  PIER,
  POIS,
  RACE_LOOP,
  RIVER_Z,
  ROAD_HALF,
  STREETS_X,
  STREETS_Z,
  STREET_NAMES_X,
  STREET_NAMES_X_EAST,
  STREET_NAMES_Z,
  TRUCKS,
  WORLD,
  slab,
} from "../world/map";

export type MapView = { cx: number; cz: number; scale: number };
export type MapDots = {
  x: number;
  z: number;
  heading: number;
  car: { x: number; z: number };
  target: { id: string; x: number; z: number } | null;
  time: number;
  friends?: { name: string; x: number; z: number; street: boolean; link: string }[];
};

/**
 * North-up plan of the city. Used small in the corner and large on the map screen. The world's +X
 * is real north and +Z real east, so the plan is drawn a quarter turn round: the river on the left.
 */
export function drawMap(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  v: MapView,
  d: MapDots,
  labels: boolean,
) {
  const X = (x: number) => w / 2 + (x - v.cx) * v.scale;
  const Z = (z: number) => h / 2 + (z - v.cz) * v.scale;
  const S = v.scale;
  const box = (x0: number, z0: number, x1: number, z1: number, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(x0), Z(z0), (x1 - x0) * S, (z1 - z0) * S);
  };
  /** Writing stays level on screen: turned back against the plan, then nudged by (dx, dy) in screen terms. */
  const text = (str: string, px: number, py: number, dx = 0, dy = 0, turn = 0) => {
    g.save();
    g.translate(px, py);
    g.rotate(Math.PI / 2 + turn);
    g.fillText(str, dx, dy);
    g.restore();
  };
  g.fillStyle = "#0d1114";
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(-Math.PI / 2);
  g.translate(-w / 2, -h / 2);
  const N0 = WORLD.minX - 400;
  const N1 = WORLD.maxX + 400;
  box(N0, FAR_BANK_Z, N1, RIVER_Z, "#12384f");
  box(N0, FAR_BANK_Z - 300, N1, FAR_BANK_Z, "#141a1e");
  box(WORLD.minX - 30, RIVER_Z, WORLD.maxX + 14, STREETS_Z[0] - ROAD_HALF, "#20262c");
  // Mud Island and the Pyramid, north along the river.
  const mud = LANDMARKS.mudIsland;
  box(mud.minX, mud.minZ, mud.maxX, mud.maxZ, "#1f3a26");
  const py = LANDMARKS.pyramid;
  box(py.x - py.base / 2, py.z - py.base / 2, py.x + py.base / 2, py.z + py.base / 2, "#5a6470");
  // Streets as one slab, blocks cut out of it.
  const nc = STREETS_X.length - 1;
  const nr = STREETS_Z.length - 1;
  box(
    STREETS_X[0] - ROAD_HALF,
    STREETS_Z[0] - ROAD_HALF,
    STREETS_X[nc] + ROAD_HALF,
    STREETS_Z[nr] + ROAD_HALF,
    "#3b424b",
  );
  for (let c = 0; c < nc; c++)
    for (let r = 0; r < nr; r++) {
      const s = slab(c, r);
      box(
        s.minX,
        s.minZ,
        s.maxX,
        s.maxZ,
        r >= OM_ROW ? "#1d2a22" : r === OM_ROW - 1 ? "#1f2329" : "#1a1e24",
      );
    }
  // The Mid-South Fair: the grounds, the midway down the middle, Libertyland's coaster on the west side.
  box(FAIR.minX, FAIR.minZ, FAIR.maxX, FAIR.maxZ, "#2a3a26");
  box(FAIR.midway.minX, FAIR.midway.minZ, FAIR.midway.maxX, FAIR.midway.maxZ, "#4a4640");
  box(
    FAIR.pippin.area.minX,
    FAIR.pippin.area.minZ,
    FAIR.pippin.area.maxX,
    FAIR.pippin.area.maxZ,
    "#5a4a3a",
  );
  box(FAIR.rodeo.minX, FAIR.rodeo.minZ, FAIR.rodeo.maxX, FAIR.rodeo.maxZ, "#7a5a3a");
  g.fillStyle = "#c0262a";
  g.beginPath();
  g.arc(X(FAIR.ferris.x), Z(FAIR.ferris.z), Math.max(2, FAIR.ferris.r * S), 0, Math.PI * 2);
  g.fill();
  // The big places downtown.
  for (const k of [
    "fedex",
    "peabody",
    "ballpark",
    "orpheum",
    "lorraine",
    "courtSquare",
    "cotton",
  ] as const) {
    const m = LANDMARKS[k];
    box(m.x - 9, m.z - 9, m.x + 9, m.z + 9, k === "courtSquare" ? "#245c2e" : "#2c333c");
  }
  box(HQ.minX, HQ.minZ, HQ.maxX, HQ.maxZ, "#1e7a14");
  box(
    COURT.cx - COURT.halfW,
    COURT.cz - COURT.halfL,
    COURT.cx + COURT.halfW,
    COURT.cz + COURT.halfL,
    "#9a5a22",
  );
  box(PIER.x - PIER.half, PIER.z1, PIER.x + PIER.half, PIER.z0, "#6b4a2e");
  box(BOWL.minX, BOWL.minZ, BOWL.maxX, BOWL.maxZ, "#8a2a72");
  box(FUN.minX, FUN.minZ, FUN.maxX, FUN.maxZ, "#5a3a9a");
  // The park: lawn, the two paths, the terrace with the tables and the fountain.
  box(PARK.minX, PARK.minZ, PARK.maxX, PARK.maxZ, "#245c2e");
  box(PARK.cx - 1.4, PARK.minZ, PARK.cx + 1.4, PARK.maxZ, "#4a4640");
  box(PARK.minX, PARK.cz - 1.4, PARK.maxX, PARK.cz + 1.4, "#4a4640");
  box(PARK_TERRACE.minX, PARK_TERRACE.minZ, PARK_TERRACE.maxX, PARK_TERRACE.maxZ, "#5a5148");
  // The rec grounds on Park Avenue: nine strips of felt, and the court with its net.
  box(PUTT_LOT.minX, PUTT_LOT.minZ, PUTT_LOT.maxX, PUTT_LOT.maxZ, "#245c2e");
  for (const h of HOLES) {
    const xs = h.outline.map((q) => q[0]);
    const zs = h.outline.map((q) => q[1]);
    box(
      h.at[0] + Math.min(...xs),
      h.at[1] + Math.min(...zs),
      h.at[0] + Math.max(...xs),
      h.at[1] + Math.max(...zs),
      "#2fae5c",
    );
  }
  box(COURTS_LOT.minX, COURTS_LOT.minZ, COURTS_LOT.maxX, COURTS_LOT.maxZ, "#245c2e");
  box(TENNIS_FENCE.minX, TENNIS_FENCE.minZ, TENNIS_FENCE.maxX, TENNIS_FENCE.maxZ, "#2f7d52");
  box(
    TENNIS.cx - TENNIS.half,
    TENNIS.cz - TENNIS.wide - TENNIS.alley,
    TENNIS.cx + TENNIS.half,
    TENNIS.cz + TENNIS.wide + TENNIS.alley,
    "#2a5ea8",
  );
  box(
    TENNIS.cx - 0.25,
    TENNIS.cz - TENNIS.wide - TENNIS.alley - 0.6,
    TENNIS.cx + 0.25,
    TENNIS.cz + TENNIS.wide + TENNIS.alley + 0.6,
    "#f4f1ea",
  );
  g.fillStyle = "#3aa6d0";
  g.beginPath();
  g.arc(X(PARK.cx), Z(PARK.cz), 3.2 * S, 0, Math.PI * 2);
  g.fill();
  box(
    HOME.x - HOME.w / 2,
    HOME.z - HOME.d / 2,
    HOME.x + HOME.w / 2,
    HOME.z + HOME.d / 2,
    "#8a6a1e",
  );
  box(TRUCKS.x - 16, TRUCKS.z - 2, TRUCKS.x + 16, TRUCKS.z + 2, "#8a7a2a");
  g.fillStyle = "#2a3038";
  g.beginPath();
  g.arc(X(ARENA.cx), Z(ARENA.cz), ARENA.r * S, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#7a6a9a";
  g.lineWidth = Math.max(1, KART_TRACK.width * S * 0.6);
  g.beginPath();
  const sx = KART_TRACK.halfX - KART_TRACK.halfZ;
  g.moveTo(X(KART_TRACK.cx - sx), Z(KART_TRACK.cz - KART_TRACK.halfZ));
  g.lineTo(X(KART_TRACK.cx + sx), Z(KART_TRACK.cz - KART_TRACK.halfZ));
  g.arc(X(KART_TRACK.cx + sx), Z(KART_TRACK.cz), KART_TRACK.halfZ * S, -Math.PI / 2, Math.PI / 2);
  g.lineTo(X(KART_TRACK.cx - sx), Z(KART_TRACK.cz + KART_TRACK.halfZ));
  g.arc(X(KART_TRACK.cx - sx), Z(KART_TRACK.cz), KART_TRACK.halfZ * S, Math.PI / 2, Math.PI * 1.5);
  g.stroke();

  if (labels) {
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.font = `700 ${Math.max(9, 5.2 * S)}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // Streets along the river run up the page; the names read along them.
    STREETS_Z.forEach((z, i) =>
      text(STREET_NAMES_Z[i]!.toUpperCase(), X(-32), Z(z), 0, 0, -Math.PI / 2),
    );
    STREETS_X.forEach((x, i) => {
      text(STREET_NAMES_X[i]!.toUpperCase(), X(x), Z(84));
      text(STREET_NAMES_X_EAST[i]!.toUpperCase(), X(x), Z(EAST_Z + 60));
    });
    g.fillStyle = "rgba(160,210,255,0.5)";
    g.font = `italic 700 ${Math.max(11, 9 * S)}px ui-sans-serif, system-ui, sans-serif`;
    text("MISSISSIPPI RIVER", X(110), Z((RIVER_Z + FAR_BANK_Z) / 2), 0, 0, -Math.PI / 2);
  }

  // The street race: the circuit it runs, which way round, and the line it starts from.
  g.save();
  g.strokeStyle = labels ? "rgba(255,70,70,0.95)" : "rgba(255,70,70,0.6)";
  g.lineWidth = labels ? 3.5 : 1.5;
  g.lineJoin = "round";
  g.setLineDash(labels ? [11, 8] : [4, 4]);
  // The dashes march the way the race runs.
  g.lineDashOffset = -d.time * (labels ? 22 : 9);
  g.beginPath();
  RACE_LOOP.forEach((p, i) => (i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))));
  g.closePath();
  g.stroke();
  g.setLineDash([]);
  if (labels) {
    // An arrowhead on every other leg, pointing the way round.
    g.fillStyle = "#ff4646";
    for (let i = 0; i < RACE_LOOP.length; i += 2) {
      const a = RACE_LOOP[i]!;
      const b = RACE_LOOP[(i + 1) % RACE_LOOP.length]!;
      g.save();
      g.translate(X((a.x + b.x) / 2), Z((a.z + b.z) / 2));
      g.rotate(Math.atan2(b.z - a.z, b.x - a.x));
      g.beginPath();
      g.moveTo(9, 0);
      g.lineTo(-5, -6.5);
      g.lineTo(-5, 6.5);
      g.closePath();
      g.fill();
      g.restore();
    }
    // The start line, chequered.
    const s0 = RACE_LOOP[0]!;
    const q = 4.5;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 2; c++) {
        g.fillStyle = (r + c) % 2 ? "#0b0b0d" : "#f4f1ea";
        g.fillRect(X(s0.x) + (c - 1) * q, Z(s0.z) + (r - 2) * q, q, q);
      }
    g.font = "800 11px ui-sans-serif, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#06080a";
    text("RACE CIRCUIT  ·  3 LAPS", X(0), Z(-12), 1, -12);
    g.fillStyle = "#ff8a8a";
    text("RACE CIRCUIT  ·  3 LAPS", X(0), Z(-12), 0, -13);
  }
  g.restore();

  for (const p of POIS) {
    const on = d.target?.id === p.id;
    const r = labels ? 6 : 4;
    g.fillStyle = "#06080a";
    g.beginPath();
    g.arc(X(p.x), Z(p.z), r + 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(X(p.x), Z(p.z), r, 0, Math.PI * 2);
    g.fill();
    if (on) {
      g.strokeStyle = p.color;
      g.lineWidth = 2;
      g.globalAlpha = 0.5 + Math.sin(d.time * 5) * 0.4;
      g.beginPath();
      g.arc(X(p.x), Z(p.z), r + 5 + Math.sin(d.time * 5) * 2, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (labels) {
      g.font = "800 12px ui-sans-serif, system-ui, sans-serif";
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillStyle = "#06080a";
      text(p.name, X(p.x), Z(p.z), 11, 1);
      g.fillStyle = "#fff";
      text(p.name, X(p.x), Z(p.z), 10, 0);
    }
  }

  // Off the edge of the corner map: pin the objective to the rim.
  if (!labels && d.target) {
    const tx = X(d.target.x) - w / 2;
    const tz = Z(d.target.z) - h / 2;
    const m = Math.max(Math.abs(tx), Math.abs(tz));
    if (m > w / 2 - 8) {
      const k = (w / 2 - 9) / m;
      g.fillStyle = "#39ff14";
      g.beginPath();
      g.arc(w / 2 + tx * k, h / 2 + tz * k, 5, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.fillStyle = "#f4f1ea";
  g.fillRect(X(d.car.x) - 3, Z(d.car.z) - 3, 6, 6);
  g.strokeStyle = "#06080a";
  g.lineWidth = 1;
  g.strokeRect(X(d.car.x) - 3, Z(d.car.z) - 3, 6, 6);

  // The crew: a blue dot each, named on the big map, pinned to the rim of the small one when they are far off.
  for (const f of d.friends ?? []) {
    if (!f.street || f.link !== "connected") continue;
    let fx = X(f.x);
    let fz = Z(f.z);
    if (!labels) {
      const m = Math.max(Math.abs(fx - w / 2), Math.abs(fz - h / 2));
      if (m > w / 2 - 8) {
        const k = (w / 2 - 9) / m;
        fx = w / 2 + (fx - w / 2) * k;
        fz = h / 2 + (fz - h / 2) * k;
      }
    }
    g.fillStyle = "#5ac8ff";
    g.strokeStyle = "#06080a";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(fx, fz, labels ? 6 : 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (labels) {
      g.font = "800 12px ui-sans-serif, system-ui, sans-serif";
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillStyle = "#06080a";
      text(f.name, fx, fz, 10, 1);
      g.fillStyle = "#bfe8ff";
      text(f.name, fx, fz, 9, 0);
    }
  }

  g.save();
  g.translate(X(d.x), Z(d.z));
  g.rotate(Math.PI - d.heading);
  g.fillStyle = "#39ff14";
  g.strokeStyle = "#06140a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -9);
  g.lineTo(6.5, 7);
  g.lineTo(0, 3.5);
  g.lineTo(-6.5, 7);
  g.closePath();
  g.stroke();
  g.fill();
  g.restore();
  g.restore();
}
