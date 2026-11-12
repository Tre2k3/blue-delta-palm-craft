import { ARENA, BOWL, COURT, FAR_BANK_Z, FUN, HOME, HQ, KART_TRACK, PIER, POIS, RACE_LOOP, RIVER_Z, ROAD_HALF, STREETS_X, STREETS_Z, STREET_NAMES_X, STREET_NAMES_Z, TRUCKS, slab } from "../world/map";

export type MapView = { cx: number; cz: number; scale: number };
export type MapDots = { x: number; z: number; heading: number; car: { x: number; z: number }; target: { id: string; x: number; z: number } | null; time: number };

/** North-up plan of the city. Used small in the corner and large on the map screen. */
export function drawMap(g: CanvasRenderingContext2D, w: number, h: number, v: MapView, d: MapDots, labels: boolean) {
  const X = (x: number) => w / 2 + (x - v.cx) * v.scale;
  const Z = (z: number) => h / 2 + (z - v.cz) * v.scale;
  const S = v.scale;
  const box = (x0: number, z0: number, x1: number, z1: number, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(x0), Z(z0), (x1 - x0) * S, (z1 - z0) * S);
  };
  g.fillStyle = "#0d1114";
  g.fillRect(0, 0, w, h);
  box(-420, FAR_BANK_Z, 420, RIVER_Z, "#12384f");
  box(-420, FAR_BANK_Z - 200, 420, FAR_BANK_Z, "#141a1e");
  box(-160, RIVER_Z, 160, STREETS_Z[0] - ROAD_HALF, "#20262c");
  // Streets as one slab, blocks cut out of it.
  box(STREETS_X[0] - ROAD_HALF, STREETS_Z[0] - ROAD_HALF, STREETS_X[4] + ROAD_HALF, STREETS_Z[4] + ROAD_HALF, "#3b424b");
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      const s = slab(c, r);
      box(s.minX, s.minZ, s.maxX, s.maxZ, r === 3 ? "#1d2a22" : r === 2 ? "#1f2329" : "#1a1e24");
    }
  box(HQ.minX, HQ.minZ, HQ.maxX, HQ.maxZ, "#1e7a14");
  box(COURT.cx - COURT.halfW, COURT.cz - COURT.halfL, COURT.cx + COURT.halfW, COURT.cz + COURT.halfL, "#9a5a22");
  box(PIER.x - PIER.half, PIER.z1, PIER.x + PIER.half, PIER.z0, "#6b4a2e");
  box(BOWL.minX, BOWL.minZ, BOWL.maxX, BOWL.maxZ, "#8a2a72");
  box(FUN.minX, FUN.minZ, FUN.maxX, FUN.maxZ, "#5a3a9a");
  box(HOME.x - HOME.w / 2, HOME.z - HOME.d / 2, HOME.x + HOME.w / 2, HOME.z + HOME.d / 2, "#8a6a1e");
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
    STREETS_Z.forEach((z, i) => g.fillText(STREET_NAMES_Z[i]!.toUpperCase(), X(-32), Z(z)));
    STREETS_X.forEach((x, i) => {
      g.save();
      g.translate(X(x), Z(84));
      g.rotate(-Math.PI / 2);
      g.fillText(STREET_NAMES_X[i]!.toUpperCase(), 0, 0);
      g.restore();
    });
    g.fillStyle = "rgba(160,210,255,0.5)";
    g.font = `italic 700 ${Math.max(11, 9 * S)}px ui-sans-serif, system-ui, sans-serif`;
    g.fillText("MISSISSIPPI RIVER", X(0), Z(-262));
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
    g.fillText("RACE CIRCUIT  ·  3 LAPS", X(0) + 1, Z(-12) - 12);
    g.fillStyle = "#ff8a8a";
    g.fillText("RACE CIRCUIT  ·  3 LAPS", X(0), Z(-12) - 13);
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
      g.fillText(p.name, X(p.x) + 11, Z(p.z) + 1);
      g.fillStyle = "#fff";
      g.fillText(p.name, X(p.x) + 10, Z(p.z));
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
}
