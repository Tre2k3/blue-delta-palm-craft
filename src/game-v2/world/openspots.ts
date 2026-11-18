import * as THREE from "three";
import { tex } from "../gfx/tex";
import { emissiveMat, Frame, MAT, poolMat, YAW, type BuildCtx } from "./kit";
import { BEALE_STAGE, CURB, TRUCKS } from "./map";

const Y0 = CURB;

/**
 * The places in the city that are for sale to a real business: a pitch at the end of the food
 * truck row, a billboard on the plaza, and a board by the Beale stage for an artist's song.
 * Each is where Benji stands to open the "Get in the game" screen, already set to that kind.
 * Nothing here draws from the city's dice, so everything else stands exactly where it did.
 */
export const OPEN_SPOTS = {
  truck: { x: TRUCKS.x + 19.2, z: TRUCKS.z + 1.5, stand: { x: TRUCKS.x + 19.2, z: TRUCKS.z - 3 }, r: 2.6 },
  billboard: { x: 22, z: -148.2, stand: { x: 22, z: -151.4 }, r: 2.6 },
  music: { x: BEALE_STAGE.x - 10.5, z: BEALE_STAGE.z - 6.2, stand: { x: BEALE_STAGE.x - 10.5, z: BEALE_STAGE.z - 8.2 }, r: 2.2 },
} as const;

const DISPLAY = '"Bebas Neue", "Arial Narrow", Impact, sans-serif';
const BODY = '"DM Sans", Arial, sans-serif';

/** Text set as large as fits the width given, up to a height. */
function fit(g: CanvasRenderingContext2D, text: string, width: number, height: number, font: string) {
  let px = height;
  g.font = font.replace("%", String(px));
  const w = g.measureText(text).width;
  if (w > width) px = Math.floor((px * width) / w);
  g.font = font.replace("%", String(px));
}

type Art = { top: string; big: string; sub: string; foot: string; accent: string; note?: boolean };

/** A board for an open spot: a kicker, what could be here, and where to ask. */
function board(a: Art, W: number, H: number) {
  return new THREE.MeshBasicMaterial({
    toneMapped: false,
    color: 0xe9e5dc,
    map: tex(
      W,
      H,
      (g) => {
        g.fillStyle = "#0b0c0e";
        g.fillRect(0, 0, W, H);
        // A dashed frame, the way an empty bay is marked out.
        const m = Math.round(H * 0.05);
        g.strokeStyle = a.accent;
        g.lineWidth = Math.max(4, H * 0.018);
        g.setLineDash([H * 0.07, H * 0.045]);
        g.strokeRect(m, m, W - m * 2, H - m * 2);
        g.setLineDash([]);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = a.accent;
        fit(g, a.top, W * 0.8, H * 0.11, `700 %px ${BODY}`);
        g.fillText(a.top, W / 2, H * 0.17);
        g.fillStyle = "#ffffff";
        fit(g, a.big, W * 0.86, H * 0.4, `900 %px ${DISPLAY}`);
        g.fillText(a.big, W / 2, H * 0.44);
        g.fillStyle = "#f4d77a";
        fit(g, a.sub, W * 0.82, H * 0.13, `900 %px ${DISPLAY}`);
        g.fillText(a.sub, W / 2, H * 0.7);
        g.fillStyle = "rgba(255,255,255,0.78)";
        fit(g, a.foot, W * 0.8, H * 0.075, `700 %px ${BODY}`);
        g.fillText(a.foot, W / 2, H * 0.86);
      },
      { repeat: false, aniso: 8 },
    ),
  });
}

export function buildOpenSpots(ctx: BuildCtx) {
  const steel = MAT.black();
  const glow = emissiveMat(ctx, 0x9dff7a, 0.5, 3);

  // ---- the open pitch at the end of the truck row
  {
    const s = OPEN_SPOTS.truck;
    const f = new Frame(ctx, s.x, s.z, YAW.north);
    const art = board({ top: "THIS PITCH IS OPEN", big: "YOUR TRUCK HERE", sub: "PUT YOUR FOOD TRUCK IN THE GAME", foot: "Walk up and ask  ·  play.10letters.store", accent: "#39ff14" }, 768, 420);
    for (const sx of [-1.62, 1.62]) f.box(0.14, 4.5, 0.14, sx, Y0 + 2.25, 0, steel);
    f.box(3.5, 1.96, 0.12, 0, Y0 + 3.4, 0, steel);
    f.wall(3.36, 1.84, 0, Y0 + 3.4, 0.07, art, ctx.flat);
    f.wall(3.36, 1.84, 0, Y0 + 3.4, -0.07, art, ctx.flat, Math.PI);
    f.box(3.5, 0.06, 0.08, 0, Y0 + 4.42, 0.06, glow, ctx.flat);
    // The bay itself, painted on the lot.
    const bay = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      map: tex(
        384,
        256,
        (g, w, h) => {
          g.clearRect(0, 0, w, h);
          g.strokeStyle = "#f2c230";
          g.lineWidth = 10;
          g.setLineDash([34, 20]);
          g.strokeRect(10, 10, w - 20, h - 20);
          g.setLineDash([]);
          g.fillStyle = "rgba(242,194,48,0.9)";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.font = `900 96px ${DISPLAY}`;
          g.fillText("OPEN PITCH", w / 2, h * 0.54);
        },
        { repeat: false },
      ),
    });
    // Where a truck would stand, in line with the three that are here.
    f.flat(4.8, 3.2, 0, Y0 + 0.035, 1.9, bay, ctx.flat);
    f.flat(7, 6, 0, Y0 + 0.03, 3.2, poolMat(ctx, 0x7dff5a, 0.3), ctx.flat);
    f.lamp(0, Y0 + 2.9, 2.2, 0x9dff7a);
    for (const sx of [-1.62, 1.62]) f.solid(sx - 0.14, sx + 0.14, -0.14, 0.14);
  }

  // ---- the billboard on the plaza: seen from the boutique one way and from Riverside the other
  {
    const s = OPEN_SPOTS.billboard;
    const f = new Frame(ctx, s.x, s.z, YAW.north);
    const art = board({ top: "THIS BILLBOARD IS OPEN", big: "YOUR AD HERE", sub: "PUT YOUR BUSINESS IN THE GAME", foot: "Walk up and ask  ·  play.10letters.store", accent: "#39ff14" }, 1024, 440);
    for (const sx of [-2.5, 2.5]) f.box(0.3, 4.9, 0.3, sx, Y0 + 2.45, 0, steel);
    f.box(5.4, 0.18, 0.2, 0, Y0 + 4.7, 0, steel);
    f.box(7.5, 3.3, 0.3, 0, Y0 + 6.45, 0, steel);
    f.wall(7.2, 3.02, 0, Y0 + 6.45, 0.16, art, ctx.flat);
    f.wall(7.2, 3.02, 0, Y0 + 6.45, -0.16, art, ctx.flat, Math.PI);
    f.box(7.5, 0.07, 0.1, 0, Y0 + 8.14, 0.18, glow, ctx.flat);
    f.box(7.5, 0.07, 0.1, 0, Y0 + 8.14, -0.18, glow, ctx.flat);
    f.flat(8, 6, 0, Y0 + 0.03, 3, poolMat(ctx, 0x7dff5a, 0.26), ctx.flat);
    f.lamp(0, Y0 + 3.4, 2.4, 0x9dff7a);
    for (const sx of [-2.5, 2.5]) f.solid(sx - 0.22, sx + 0.22, -0.22, 0.22);
  }

  // ---- the board by the Beale stage, for an artist's song
  {
    const s = OPEN_SPOTS.music;
    const f = new Frame(ctx, s.x, s.z, YAW.north);
    const art = board({ top: "ARTISTS  ·  THIS SLOT IS OPEN", big: "YOUR SONG HERE", sub: "ON THE RADIO  ·  THE STAGE  ·  THE CLUB", foot: "Walk up and ask  ·  play.10letters.store", accent: "#ff4fd8" }, 640, 480);
    for (const sx of [-1.02, 1.02]) f.box(0.1, 3.3, 0.1, sx, Y0 + 1.65, 0, steel);
    f.box(2.24, 1.72, 0.1, 0, Y0 + 2.36, 0, steel);
    f.wall(2.12, 1.6, 0, Y0 + 2.36, 0.06, art, ctx.flat);
    f.wall(2.12, 1.6, 0, Y0 + 2.36, -0.06, art, ctx.flat, Math.PI);
    f.box(2.24, 0.05, 0.07, 0, Y0 + 3.26, 0.05, emissiveMat(ctx, 0xff4fd8, 0.5, 3), ctx.flat);
    f.flat(5, 5, 0, Y0 + 0.03, 2.2, poolMat(ctx, 0xff4fd8, 0.24), ctx.flat);
    f.lamp(0, Y0 + 2.6, 1.8, 0xff7ae0);
    for (const sx of [-1.02, 1.02]) f.solid(sx - 0.12, sx + 0.12, -0.12, 0.12);
  }
}
