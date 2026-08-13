import {
  APPAREL,
  DEFAULT_SETTINGS,
  NPCS,
  PAL,
  PLAYER_RUN,
  PLAYER_SPEED,
  POIS,
  SAVE_KEY,
  SAVE_KEY_LEGACY,
  STREETS,
  TILE,
  TROPHIES,
  WORLD_H,
  WORLD_PX_H,
  WORLD_PX_W,
  WORLD_W,
  createDropDayMission,
  createSideMissions,
} from "./data";
import { audio } from "./audio";
import { InputManager } from "./input";
import type {
  ApparelId,
  CinematicState,
  Dir,
  Floater,
  GameMode,
  GameSettings,
  HudSnapshot,
  LocationId,
  Mission,
  PauseTab,
  SideMission,
  TrophyId,
  WorldPoi,
} from "./types";

type ImgMap = Record<string, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function insidePoi(x: number, y: number, p: WorldPoi, pad = 8) {
  return x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.rect(x, y, w, h);
}

function nightAmount(hour: number) {
  if (hour < 5.5) return 0.78;
  if (hour < 7) return 0.78 * (1 - (hour - 5.5) / 1.5);
  if (hour < 18) return 0;
  if (hour < 20.5) return ((hour - 18) / 2.5) * 0.78;
  return 0.78;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  images: ImgMap = {};
  input = new InputManager();

  started = false;
  paused = false;
  mode: GameMode = "world";
  toast: string | null = null;
  toastT = 0;
  pauseTab: PauseTab = "resume";

  px = 6 * TILE;
  py = 11 * TILE;
  vx = 0;
  vy = 0;
  dir: Dir = "down";
  facing: Dir = "down";
  moving = false;
  animT = 0;
  bob = 0;

  camX = 0;
  camY = 0;
  lookX = 0;
  lookY = 0;
  yaw = 0;
  trauma = 0;
  hitstop = 0;

  sackdollars = 25;
  respect = 0;
  owned: ApparelId[] = ["starter_tee"];
  equipped: ApparelId | null = "starter_tee";

  mission: Mission = createDropDayMission();
  missionComplete = false;
  side: SideMission[] = createSideMissions();
  trophies: TrophyId[] = [];
  trophyPopup: { name: string; rank: string; t: number } | null = null;
  talked = new Set<string>();

  dialogue: HudSnapshot["dialogue"] = null;
  dialogueNpcId: string | null = null;
  dialogueLines: string[] = [];
  dialogueIndex = 0;

  ball = {
    active: false,
    score: 0,
    timeLeft: 50,
    shots: 0,
    power: 0,
    charging: false,
    ballX: 0,
    ballY: 0,
    ballZ: 0,
    ballVx: 0,
    ballVy: 0,
    ballVz: 0,
    inFlight: false,
    held: true,
    made: false,
    flash: 0,
    targetScore: 8,
    missionCredited: false,
    combo: 0,
    best: 0,
    shotDist: 0,
    grade: "" as "" | "PERFECT" | "GOOD" | "LATE",
  };
  highScore = 0;

  walls: { x: number; y: number; w: number; h: number }[] = [];
  trees: { x: number; y: number }[] = [];
  cars: { x: number; y: number; vx: number; vy: number; w: number; color: string }[] = [];
  peds: { x: number; y: number; vx: number; vy: number; color: string; t: number }[] = [];
  npcLive: { id: string; x: number; y: number; ox: number; oy: number; t: number }[] = [];

  shopOpen = false;
  cinematic: CinematicState | null = null;
  letterbox = 0;
  worldHour = 16.2;
  settings: GameSettings = { ...DEFAULT_SETTINGS };

  interactHint: string | null = null;
  nearPoi: LocationId | null = null;
  nearNpc: string | null = null;
  lastInteract = 0;

  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];
  floaters: Floater[] = [];

  running = false;
  raf = 0;
  lastT = 0;
  onHud: ((h: HudSnapshot) => void) | null = null;
  hudAcc = 0;
  clock = 0;

  mapCanvas: HTMLCanvasElement | null = null;
  leftSpawn = false;
  hasSave = false;

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context missing");
      this.ctx = ctx;
      this.buildWorld();
    }
    async init() {
      await Promise.all(Object.entries({
        front: "/game/benji-front-norm.png",
        back: "/game/benji-back-norm.png",
        left: "/game/benji-left-norm.png",
        right: "/game/benji-right-norm.png",
        icon: "/game/sack-icon.png",
        k: "/game/k-blanco-portrait.png",
        featured: "/game/featured-products.png",
        courtfp: "/game/court-fp.jpg",
      }).map(async ([k, src]) => {
        try {
          this.images[k] = await loadImage(src);
        } catch {
          /* ignore */
        }
      }));
      this.loadSave();
      this.paintMap();
      this.input.bind();
      this.wireQa();
      this.emitHud();
    }
    buildWorld() {
      this.walls.push({
        x: 0,
        y: 0,
        w: WORLD_PX_W,
        h: 48 * .55
      }, {
        x: 0,
        y: WORLD_PX_H - 48 * .55,
        w: WORLD_PX_W,
        h: 48 * .55
      }, {
        x: 0,
        y: 0,
        w: 48 * .55,
        h: WORLD_PX_H
      }, {
        x: WORLD_PX_W - 48 * .55,
        y: 0,
        w: 48 * .55,
        h: WORLD_PX_H
      });
      for (let gy = 2; gy < 46; gy += 5) for (let gx = 2; gx < 62; gx += 5) {
        if (gx % 10 === 2 || gy % 10 === 2) continue;
        const bx = gx * 48;
        const by = gy * 48;
        const bw = 144;
        const bh = 2.5 * 48;
        let blocked = false;
        for (const p of POIS) if (bx < p.x + p.w + 48 * 1.5 && bx + bw > p.x - 48 * 1.5 && by < p.y + p.h + 48 * 1.5 && by + bh > p.y - 48 * 1.5) {
          blocked = true;
          break;
        }
        if (blocked) continue;
        if (bx < 768 && by < 768) continue;
        this.walls.push({
          x: bx,
          y: by,
          w: bw,
          h: bh - 18
        });
      }
      for (let i = 0; i < 48; i++) this.trees.push({
        x: (3 + i * 17 % 58) * 48,
        y: (3 + i * 29 % 42) * 48
      });
      const carColors = ["#5c5148", "#1a1816", "#c4b8a8", "#3a4550", "#6b3a32", "#6b5c4a"];
      const lanes = [];
      for (let i = 0; i < 10; i++) {
        lanes.push({
          x: (4 + i * 6) * 48,
          y: 968,
          vx: 90,
          vy: 0
        });
        lanes.push({
          x: (2 + i * 6) * 48,
          y: 942,
          vx: -80,
          vy: 0
        });
      }
      for (let i = 0; i < 6; i++) {
        lanes.push({
          x: 774,
          y: (3 + i * 7) * 48,
          vx: 0,
          vy: 85
        });
        lanes.push({
          x: 1622,
          y: (4 + i * 7) * 48,
          vx: 0,
          vy: -78
        });
      }
      lanes.forEach((l, i) => {
        this.cars.push({
          x: l.x,
          y: l.y,
          vx: l.vx,
          vy: l.vy,
          w: 38 + i % 3 * 8,
          color: carColors[i % carColors.length]
        });
      });
      const pedColors = ["#c4b8a8", "#8a8074", "#5c564e", "#6b5c4a", "#3a3632", "#d9d0c4"];
      for (let i = 0; i < 14; i++) this.peds.push({
        x: (6 + i * 11 % 50) * 48,
        y: (8 + i * 7 % 34) * 48,
        vx: (i % 2 === 0 ? 1 : -1) * (22 + i % 5 * 4),
        vy: (i % 3 === 0 ? 1 : -1) * (10 + i % 4 * 3),
        color: pedColors[i % pedColors.length],
        t: i
      });
      this.npcLive = NPCS.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        ox: n.x,
        oy: n.y,
        t: Math.random() * 10
      }));
    }
    paintMap() {
      const c = document.createElement("canvas");
      c.width = WORLD_PX_W;
      c.height = WORLD_PX_H;
      const g = c.getContext("2d")!;

      const isRoadAt = (x: number, y: number) =>
        x >= 0 &&
        y >= 0 &&
        x < WORLD_W &&
        y < WORLD_H &&
        (Math.abs(y - 20) <= 1 ||
          y === 6 ||
          y === 34 ||
          Math.abs(x - 16) <= 1 ||
          Math.abs(x - 34) <= 1 ||
          x === 50);

      // Band 1 — dusty asphalt
      g.fillStyle = PAL.asphalt;
      g.fillRect(0, 0, c.width, c.height);

      for (let y = 0; y < WORLD_H; y++) {
        for (let x = 0; x < WORLD_W; x++) {
          const px = x * TILE;
          const py = y * TILE;
          if (isRoadAt(x, y)) {
            g.fillStyle = (x + y) % 2 === 0 ? PAL.asphalt : PAL.asphaltAlt;
            g.fillRect(px, py, TILE, TILE);
            g.strokeStyle = PAL.lane;
            g.lineWidth = 3;
            g.setLineDash([10, 12]);
            g.beginPath();
            if (Math.abs(y - 20) <= 1 || y === 6 || y === 34) {
              g.moveTo(px, py + TILE / 2);
              g.lineTo(px + TILE, py + TILE / 2);
            } else {
              g.moveTo(px + TILE / 2, py);
              g.lineTo(px + TILE / 2, py + TILE);
            }
            g.stroke();
            g.setLineDash([]);
          } else {
            // Band 2 — sidewalk / lots
            g.fillStyle = (x + y) % 2 === 0 ? PAL.sidewalk : PAL.sidewalkAlt;
            g.fillRect(px, py, TILE, TILE);
          }
        }
      }

      // 2px curb where sidewalk meets the street
      g.fillStyle = PAL.curb;
      for (let y = 0; y < WORLD_H; y++) {
        for (let x = 0; x < WORLD_W; x++) {
          if (!isRoadAt(x, y)) continue;
          const px = x * TILE;
          const py = y * TILE;
          if (!isRoadAt(x, y - 1)) g.fillRect(px, py, TILE, 2);
          if (!isRoadAt(x, y + 1)) g.fillRect(px, py + TILE - 2, TILE, 2);
          if (!isRoadAt(x - 1, y)) g.fillRect(px, py, 2, TILE);
          if (!isRoadAt(x + 1, y)) g.fillRect(px + TILE - 2, py, 2, TILE);
        }
      }

      for (let i = 0; i < 36; i++) {
        const gx = (i * 173) % WORLD_PX_W;
        const gy = (i * 241) % WORLD_PX_H;
        g.fillStyle = PAL.grass;
        g.beginPath();
        g.ellipse(gx, gy, 36 + (i % 5) * 12, 24 + (i % 4) * 10, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = PAL.grassTip;
        g.beginPath();
        g.ellipse(gx - 6, gy - 6, 14 + (i % 3) * 4, 10, 0, 0, Math.PI * 2);
        g.fill();
      }

      const dropShadow = (x: number, y: number, w: number, h: number) => {
        g.save();
        g.globalCompositeOperation = "multiply";
        g.fillStyle = "rgba(13,11,10,0.45)";
        g.fillRect(x + 6, y + 10, w, h);
        g.restore();
        g.fillStyle = PAL.shadow;
        g.fillRect(x + w, y + 8, 8, h);
        g.fillRect(x + 6, y + h, w, 10);
      };

      const drawVolume = (x: number, y: number, w: number, h: number, wallFace: string = PAL.wall) => {
        dropShadow(x, y, w, h);
        const faceH = Math.max(18, Math.round(h * 0.34));
        const roofH = Math.max(14, h - faceH);
        g.fillStyle = wallFace;
        g.fillRect(x, y + roofH, w, faceH);
        g.fillStyle = PAL.ink;
        g.globalAlpha = 0.22;
        g.fillRect(x, y + roofH, w, 2);
        g.globalAlpha = 1;
        g.fillStyle = PAL.roof;
        g.fillRect(x, y, w, roofH);
        g.fillStyle = PAL.roofEdge;
        g.fillRect(x, y, w, 1);
        g.fillRect(x, y, 1, h);
        let wi = 0;
        for (let wx = x + 10; wx < x + w - 12; wx += 16) {
          const seed = wi * 17 + Math.floor(x) + Math.floor(y);
          const lit = seed % 10 > 3;
          const a = 0.15 + ((wi * 37 + Math.floor(wx)) % 71) / 100;
          g.fillStyle = lit ? PAL.windowLit : PAL.windowDark;
          g.globalAlpha = lit ? Math.min(0.85, Math.max(0.15, a)) : 1;
          g.fillRect(wx, y + roofH + 5, 8, Math.max(7, faceH - 10));
          g.globalAlpha = 1;
          wi++;
        }
        g.strokeStyle = PAL.ink;
        g.lineWidth = 2.5;
        g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        g.beginPath();
        g.moveTo(x, y + roofH);
        g.lineTo(x + w, y + roofH);
        g.stroke();
        return { faceH, roofH };
      };

      for (const wall of this.walls) {
        if (wall.w >= WORLD_PX_W - 2 || wall.h >= WORLD_PX_H - 2) continue;
        const face =
          (Math.floor(wall.x / TILE) + Math.floor(wall.y / TILE)) % 2 === 0 ? PAL.wall : PAL.wallAlt;
        drawVolume(wall.x, wall.y, wall.w, wall.h, face);
      }

      for (const poi of POIS) {
        if (poi.id === "court") {
          dropShadow(poi.x, poi.y, poi.w, poi.h);
          g.fillStyle = "#7a4a32";
          g.fillRect(poi.x, poi.y, poi.w, poi.h);
          g.fillStyle = "#8a5640";
          g.fillRect(poi.x + 10, poi.y + 10, poi.w - 20, poi.h - 20);
          g.strokeStyle = "#d9d0c4";
          g.lineWidth = 3;
          g.strokeRect(poi.x + 8, poi.y + 8, poi.w - 16, poi.h - 16);
          g.strokeRect(poi.x + poi.w / 2 - 42, poi.y + 8, 84, 72);
          g.beginPath();
          g.arc(poi.x + poi.w / 2, poi.y + 80, 42, 0, Math.PI);
          g.stroke();
          g.fillStyle = "#c4a574";
          g.fillRect(poi.x + poi.w / 2 - 24, poi.y + 4, 48, 7);
          g.strokeStyle = "#a85a48";
          g.lineWidth = 3;
          g.beginPath();
          g.arc(poi.x + poi.w / 2, poi.y + 22, 13, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = PAL.label;
          g.font = "bold 13px sans-serif";
          g.fillText("901 COURT", poi.x + 22, poi.y + poi.h - 14);
        } else if (poi.id === "dropvan") {
          dropShadow(poi.x, poi.y, poi.w, poi.h);
          g.fillStyle = PAL.wall;
          g.fillRect(poi.x, poi.y + 10, poi.w, poi.h - 10);
          g.fillStyle = PAL.roof;
          g.fillRect(poi.x + 8, poi.y, poi.w - 16, 18);
          g.fillStyle = PAL.roofEdge;
          g.fillRect(poi.x + 8, poi.y, poi.w - 16, 1);
          g.fillRect(poi.x + 8, poi.y, 1, 18);
          g.fillStyle = PAL.windowDark;
          g.fillRect(poi.x + 14, poi.y + 22, 22, 10);
          g.fillStyle = PAL.label;
          g.font = "bold 12px sans-serif";
          g.fillText("DROP VAN", poi.x + 10, poi.y + poi.h / 2);
        } else if (poi.id === "pyramid") {
          g.save();
          g.globalCompositeOperation = "multiply";
          g.fillStyle = "rgba(13,11,10,0.45)";
          g.beginPath();
          g.moveTo(poi.x + poi.w / 2 + 6, poi.y + 10);
          g.lineTo(poi.x + poi.w + 8, poi.y + poi.h + 10);
          g.lineTo(poi.x + 8, poi.y + poi.h + 10);
          g.closePath();
          g.fill();
          g.restore();
          g.fillStyle = PAL.wall;
          g.beginPath();
          g.moveTo(poi.x + poi.w / 2, poi.y);
          g.lineTo(poi.x + poi.w, poi.y + poi.h);
          g.lineTo(poi.x, poi.y + poi.h);
          g.closePath();
          g.fill();
          g.fillStyle = PAL.roof;
          g.beginPath();
          g.moveTo(poi.x + poi.w / 2, poi.y + 18);
          g.lineTo(poi.x + poi.w - 16, poi.y + poi.h);
          g.lineTo(poi.x + 16, poi.y + poi.h);
          g.closePath();
          g.fill();
          g.strokeStyle = PAL.roofEdge;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(poi.x + poi.w / 2, poi.y);
          g.lineTo(poi.x, poi.y + poi.h);
          g.stroke();
          g.fillStyle = PAL.label;
          g.font = "bold 12px sans-serif";
          g.fillText("PYRAMID", poi.x + 18, poi.y + poi.h - 10);
        } else if (poi.id === "river") {
          const river = g.createLinearGradient(poi.x, poi.y, poi.x, poi.y + poi.h);
          river.addColorStop(0, PAL.river0);
          river.addColorStop(1, PAL.river1);
          g.fillStyle = river;
          g.fillRect(poi.x, poi.y, poi.w, poi.h);
        } else if (poi.id === "beale") {
          const { roofH } = drawVolume(poi.x, poi.y, poi.w, poi.h, PAL.wall);
          g.fillStyle = PAL.windowLit;
          g.globalAlpha = 0.55;
          for (let i = 0; i < 5; i++) g.fillRect(poi.x + 16 + i * 70, poi.y + 6, 36, 8);
          g.globalAlpha = 1;
          g.fillStyle = PAL.label;
          g.font = "bold 14px sans-serif";
          g.fillText("BEALE STREET", poi.x + 24, poi.y + roofH + 22);
        } else {
          const { roofH } = drawVolume(poi.x, poi.y, poi.w, poi.h, PAL.wall);
          g.fillStyle = poi.color;
          g.fillRect(poi.x + 8, poi.y + 8, poi.w - 16, 4);
          g.fillStyle = PAL.ink;
          g.fillRect(poi.x + poi.w / 2 - 14, poi.y + poi.h - 28, 28, 28);
          g.fillStyle = PAL.label;
          g.font = "bold 13px sans-serif";
          g.fillText(poi.label, poi.x + 10, poi.y + roofH + 16);
          if (poi.id === "store") {
            g.fillStyle = PAL.label;
            g.font = "bold 15px sans-serif";
            g.fillText("$ACKRELIGIOUS", poi.x + 16, poi.y + roofH + 36);
            g.fillStyle = "rgba(196,184,168,0.7)";
            g.font = "11px sans-serif";
            g.fillText("IN THE $ACK, WE TRUST", poi.x + 16, poi.y + roofH + 52);
          }
        }
      }

      for (const t of this.trees) {
        g.fillStyle = PAL.shadow;
        g.beginPath();
        g.ellipse(t.x + 6, t.y + 8, 14, 7, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = PAL.grass;
        g.beginPath();
        g.arc(t.x, t.y, 16, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = PAL.grassTip;
        g.beginPath();
        g.arc(t.x - 5, t.y - 5, 10, 0, Math.PI * 2);
        g.fill();
      }

      const river = g.createLinearGradient(0, WORLD_PX_H - 110, 0, WORLD_PX_H);
      river.addColorStop(0, "rgba(42,56,64,0)");
      river.addColorStop(1, "rgba(26,36,44,0.7)");
      g.fillStyle = river;
      g.fillRect(0, WORLD_PX_H - 110, WORLD_PX_W, 110);

      for (let i = 0; i < 22; i++) {
        const bx = 90 + i * 130;
        const bw = 44 + (i % 3) * 18;
        const bh = 36 + ((i * 37) % 72);
        drawVolume(bx, 28, bw, bh, i % 2 === 0 ? PAL.wall : PAL.wallAlt);
      }

      const dusk = g.createLinearGradient(0, 0, WORLD_PX_W * 0.35, WORLD_PX_H * 0.45);
      dusk.addColorStop(0, "rgba(242,198,106,0.10)");
      dusk.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = dusk;
      g.fillRect(0, 0, WORLD_PX_W, WORLD_PX_H);

      for (let i = 3; i < WORLD_W; i += 7) {
        for (const yTile of [6, 20, 34]) {
          const lx = i * TILE + 12;
          const ly = yTile * TILE + 10;
          const glow = g.createRadialGradient(lx, ly - 26, 3, lx, ly - 10, 72);
          glow.addColorStop(0, "rgba(255,179,71,0.2)");
          glow.addColorStop(1, "rgba(255,179,71,0)");
          g.fillStyle = glow;
          g.beginPath();
          g.arc(lx, ly - 10, 72, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = PAL.ink;
          g.fillRect(lx - 2, ly - 30, 4, 30);
          g.fillStyle = PAL.windowLit;
          g.beginPath();
          g.arc(lx, ly - 30, 5, 0, Math.PI * 2);
          g.fill();
        }
      }

      g.fillStyle = "rgba(196,184,168,0.28)";
      g.font = "bold 11px sans-serif";
      for (const s of STREETS) {
        if (s.axis === "y") g.fillText(s.name, 80, s.tile * TILE - 8);
        else g.fillText(s.name, s.tile * TILE + 8, 70);
      }

      this.mapCanvas = c;
    }

    wireQa() {
      if (typeof window === "undefined") return;
      const w = window as unknown as {
        __controlsTest: {
          getYaw: () => number;
          getSpeed: () => number;
          setKeys: (codes: string[]) => void;
        };
        __gameTest: {
          teleport: (loc: LocationId) => void;
          getState: () => {
            sackdollars: number;
            step: string;
            mode: string;
            score: number;
            missionComplete: boolean;
          };
          setBallScore: (n: number) => void;
          advanceDialogue: () => void;
          interact: () => void;
          resetSave: () => void;
        };
      };
      w.__controlsTest = {
        getYaw: () => this.yaw,
        getSpeed: () => Math.hypot(this.vx, this.vy),
        setKeys: (codes: string[]) => {
          this.input.keys.clear();
          for (const c of codes) this.input.keys.add(c);
        }
      };
      w.__gameTest = {
        teleport: (loc: LocationId) => {
          if (this.mode === "basketball") this.exitBasketball();
          if (this.mode === "shop") this.closeShop();
          if (this.mode === "dialogue") {
            this.mode = "world";
            this.dialogue = null;
          }
          this.cinematic = null;
          const p = POIS.find((x) => x.id === loc);
          if (!p) return;
          this.px = p.x + p.w / 2;
          this.py = p.y + p.h + 24;
          this.leftSpawn = true;
          this.updateProximity();
          this.emitHud();
        },
        getState: () => ({
          sackdollars: this.sackdollars,
          step: this.mission.steps[this.mission.activeStep]?.id ?? "done",
          mode: this.mode,
          score: this.ball.score,
          missionComplete: this.missionComplete
        }),
        setBallScore: (n: number) => {
          this.ball.score = n;
          this.tryCreditBasketball();
          this.emitHud();
        },
        advanceDialogue: () => this.advanceDialogue(),
        interact: () => {
          this.lastInteract = 0;
          this.tryInteract();
        },
        resetSave: () => this.resetProgress()
      };
    }
    destroy() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.input.unbind();
    }
    start(fresh = false) {
      audio.unlock();
      audio.confirm();
      if (fresh) this.resetProgress(false);
      this.started = true;
      this.paused = false;
      this.cinematic = {
        kind: "briefing",
        title: "THE DROP DAY",
        subtitle: this.missionComplete ? "MEMPHIS  ·  FREE ROAM" : "CHAPTER 01  ·  MEMPHIS 901",
        t: 0,
        duration: 3.4
      };
      this.letterbox = 1;
      this.paintMap();
      this.emitHud();
    }
    resetProgress(emit = true) {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SAVE_KEY_LEGACY);
      } catch {
          /* ignore */
        }
      this.mission = createDropDayMission();
      this.side = createSideMissions();
      this.missionComplete = false;
      this.sackdollars = 25;
      this.respect = 0;
      this.owned = ["starter_tee"];
      this.equipped = "starter_tee";
      this.trophies = [];
      this.talked.clear();
      this.px = 288;
      this.py = 528;
      this.leftSpawn = false;
      this.mode = "world";
      this.shopOpen = false;
      this.dialogue = null;
      this.ball.missionCredited = false;
      this.ball.best = 0;
      this.worldHour = 16.2;
      this.hasSave = false;
      if (emit) this.emitHud();
    }
    showToast(msg: string, t = 3.1) {
      this.toast = msg;
      this.toastT = t;
    }
    float(text: string, color: string, x = this.px, y = this.py - 50) {
      this.floaters.push({
        x,
        y,
        vy: -38,
        life: 1.15,
        text,
        color,
        scale: 1.15
      });
    }
    addTrauma(v: number) {
      if (!this.settings.shake) return;
      this.trauma = clamp(this.trauma + v, 0, 1);
    }
    loadSave() {
      try {
        let raw = localStorage.getItem(SAVE_KEY);
        if (!raw) raw = localStorage.getItem(SAVE_KEY_LEGACY);
        this.hasSave = !!raw;
        if (!raw) return;
        const data = JSON.parse(raw);
        this.sackdollars = data.sackdollars ?? 25;
        this.respect = data.respect ?? 0;
        this.owned = data.owned?.length ? data.owned : ["starter_tee"];
        this.equipped = data.equipped;
        this.mission.complete = data.missionComplete ?? false;
        this.missionComplete = this.mission.complete;
        for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
        const firstUndone = this.mission.steps.findIndex((s) => !s.done);
        this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
        this.trophies = data.trophies ?? [];
        this.highScore = data.basketballHighScore ?? 0;
        this.worldHour = data.worldHour ?? 16.2;
        if (data.settings) this.settings = {
          ...DEFAULT_SETTINGS,
          ...data.settings
        };
        if (data.sideProgress) for (const s of this.side) s.done = !!data.sideProgress[s.id];
      } catch {
          /* ignore */
        }
    }
    save() {
      const progress: Record<string, boolean> = {};
      for (const s of this.mission.steps) progress[s.id] = s.done;
      const sideProgress: Record<string, boolean> = {};
      for (const s of this.side) sideProgress[s.id] = s.done;
      const data = {
        version: 2,
        sackdollars: this.sackdollars,
        respect: this.respect,
        owned: this.owned,
        equipped: this.equipped,
        missionProgress: progress,
        missionActiveStep: this.mission.activeStep,
        missionComplete: this.mission.complete,
        basketballHighScore: this.highScore,
        tutorialDone: true,
        trophies: this.trophies,
        sideProgress,
        worldHour: this.worldHour,
        settings: this.settings
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        this.hasSave = true;
      } catch {
          /* ignore */
        }
    }
    applySettings(next: Partial<GameSettings>) {
      this.settings = {
        ...this.settings,
        ...next
      };
      audio.setVolumes(this.settings);
      this.save();
      this.emitHud();
    }
    setPauseTab(tab: PauseTab) {
      this.pauseTab = tab;
      audio.ui();
      this.emitHud();
    }
    resume() {
      this.paused = false;
      audio.ui();
      this.emitHud();
    }
    startLoop() {
      this.running = true;
      this.lastT = performance.now();
      const frame = (t: number) => {
        if (!this.running) return;
        let dt = (t - this.lastT) / 1e3;
        this.lastT = t;
        dt = Math.min(dt, .1);
        this.update(dt);
        this.draw();
        this.hudAcc += dt;
        if (this.hudAcc > .08) {
          this.hudAcc = 0;
          this.emitHud();
        }
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }
    update(dt: number) {
      this.clock += dt;
      const act = this.input.poll();
      audio.tick(dt, this.started && !this.paused, nightAmount(this.worldHour));
      if (this.started && act.pausePressed && !this.cinematic) if (this.mode === "shop") this.closeShop();
      else if (this.mode === "dialogue") this.advanceDialogue();
      else if (this.mode === "basketball" && act.backPressed) this.exitBasketball();
      else {
        this.paused = !this.paused;
        this.pauseTab = "resume";
        audio.ui();
        this.emitHud();
      }
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        this.trauma = Math.max(0, this.trauma - dt * 1.6);
        return;
      }
      if (this.toastT > 0) {
        this.toastT -= dt;
        if (this.toastT <= 0) this.toast = null;
      }
      if (this.trophyPopup) {
        this.trophyPopup.t -= dt;
        if (this.trophyPopup.t <= 0) this.trophyPopup = null;
      }
      this.trauma = Math.max(0, this.trauma - dt * 1.7);
      this.letterbox += ((this.cinematic ? 1 : 0) - this.letterbox) * (1 - Math.exp(-8 * dt));
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.y += f.vy * dt;
        f.life -= dt;
        f.scale += (1 - f.scale) * (1 - Math.exp(-10 * dt));
        if (f.life <= 0) this.floaters.splice(i, 1);
      }
      if (this.cinematic) {
        this.cinematic.t += dt;
        if (this.cinematic.t >= this.cinematic.duration) {
          const kind = this.cinematic.kind;
          this.cinematic = null;
          if (kind === "briefing") this.showToast("Drop Day is live. Find K Blanco at HQ.");
          this.emitHud();
        }
      }
      if (!this.started || this.paused) return;
      if (act.viewPressed) this.toggleView();
      this.yaw += act.lookX * 2.35 * dt;
      this.worldHour = (this.worldHour + dt * .042) % 24;
      if (this.worldHour >= 20 && this.worldHour < 20.1) this.unlockTrophy("night_owl");
      this.updateTraffic(dt);
      this.updatePeds(dt);
      if (this.mode === "dialogue") {
        if (act.interactPressed || act.shootPressed) this.advanceDialogue();
        return;
      }
      if (this.mode === "shop" || this.mode === "menu") return;
      if (this.mode === "basketball") {
        if (act.shootPressed) this.beginCharge();
        if (act.shootReleased) this.releaseShot();
        if (act.backPressed) this.exitBasketball();
        this.updatePlayer(dt, act.mx, act.my, act.run);
        this.updateBasketball(dt);
        return;
      }
      if (this.cinematic) return;
      this.updatePlayer(dt, act.mx, act.my, act.run);
      this.updateProximity();
      this.checkMissionAuto();
      this.checkSideVisits();
      if (act.interactPressed) this.tryInteract();
    }
    updateTraffic(dt: number) {
      for (const c of this.cars) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.x > 3112) c.x = -50;
        if (c.x < -50) c.x = WORLD_PX_W + 40;
        if (c.y > 2344) c.y = -40;
        if (c.y < -40) c.y = WORLD_PX_H + 40;
      }
    }
    updatePeds(dt: number) {
      for (const p of this.peds) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 96 || p.x > 2976) p.vx *= -1;
        if (p.y < 96 || p.y > 2112) p.vy *= -1;
      }
      for (const n of this.npcLive) {
        if (!NPCS.find((x) => x.id === n.id)?.wander) continue;
        n.t += dt;
        n.x = n.ox + Math.sin(n.t * .35) * 36;
        n.y = n.oy + Math.cos(n.t * .28) * 22;
      }
    }
    toggleView() {
      this.settings.cameraView = this.settings.cameraView === "first" ? "third" : "first";
      this.showToast(this.settings.cameraView === "first" ? "First person" : "Third person", 1.4);
      audio.ui();
      this.save();
      this.emitHud();
    }
    fwd() {
      return { x: Math.sin(this.yaw), y: -Math.cos(this.yaw) };
    }
    right() {
      return { x: Math.cos(this.yaw), y: Math.sin(this.yaw) };
    }
    applyYawToFacing() {
      this.facingFromAngle(this.yaw);
    }
    facingFromAngle(angle: number) {
      const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (a >= Math.PI * 1.75 || a < Math.PI * 0.25) this.facing = "up";
      else if (a < Math.PI * 0.75) this.facing = "right";
      else if (a < Math.PI * 1.25) this.facing = "down";
      else this.facing = "left";
      this.dir = this.facing;
    }
    updatePlayer(dt: number, mx: number, my: number, runHeld: boolean) {
      const f = this.fwd();
      const r = this.right();
      const len = Math.hypot(mx, my);
      let wx = 0;
      let wy = 0;
      if (len > 0.01) {
        mx /= len;
        my /= len;
        wx = mx * r.x + -my * f.x;
        wy = mx * r.y + -my * f.y;
        this.moving = true;
        this.leftSpawn = true;
        if (this.settings.cameraView === "third") this.facingFromAngle(Math.atan2(wx, -wy));
        else this.applyYawToFacing();
        audio.foot(this.clock);
        if (runHeld && Math.random() < 0.08) {
          this.particles.push({
            x: this.px,
            y: this.py + 4,
            vx: -wx * 20,
            vy: -10,
            life: 0.35,
            color: "rgba(200,200,180,0.45)",
            size: 3,
          });
        }
      } else {
        this.moving = false;
        this.applyYawToFacing();
      }
      const speed = runHeld ? PLAYER_RUN : PLAYER_SPEED;
      this.vx = wx * speed;
      this.vy = wy * speed;
      const rad = 14;
      let nx = this.px + this.vx * dt;
      let ny = this.py + this.vy * dt;
      if (this.mode === "basketball") {
        const court = POIS.find((p) => p.id === "court")!;
        nx = clamp(nx, court.x + 18, court.x + court.w - 18);
        ny = clamp(ny, court.y + 36, court.y + court.h - 16);
      } else {
        nx = clamp(nx, 62, WORLD_PX_W - 48 - rad);
        ny = clamp(ny, 62, WORLD_PX_H - 48 - rad);
      }
      if (!this.collides(nx, this.py, rad)) this.px = nx;
      if (!this.collides(this.px, ny, rad)) this.py = ny;
      this.animT += dt * (this.moving ? 9 : 2);
      this.bob = this.moving ? Math.sin(this.animT * 2) * 3.2 : Math.sin(this.animT) * 0.6;
      const tw = this.canvas.clientWidth;
      const th = this.canvas.clientHeight;
      this.lookX += (this.vx * 0.22 - this.lookX) * (1 - Math.exp(-4 * dt));
      this.lookY += (this.vy * 0.22 - this.lookY) * (1 - Math.exp(-4 * dt));
      const tx = this.px + this.lookX - tw / 2;
      const ty = this.py + this.lookY - th / 2;
      const k = 1 - Math.exp(-7 * dt);
      this.camX += (tx - this.camX) * k;
      this.camY += (ty - this.camY) * k;
      this.camX = clamp(this.camX, 0, Math.max(0, WORLD_PX_W - tw));
      this.camY = clamp(this.camY, 0, Math.max(0, WORLD_PX_H - th));
    }
    collides(x: number, y: number, r: number) {
      for (const w of this.walls) if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
      return false;
    }
    npcPos(id: string) {
      return this.npcLive.find((n) => n.id === id) ?? {
        x: 0,
        y: 0,
        id
      };
    }
    updateProximity() {
      this.nearPoi = null;
      this.nearNpc = null;
      this.interactHint = null;
      let bestPoi = 9999;
      for (const p of POIS) {
        const d = dist(this.px, this.py, p.x + p.w / 2, p.y + p.h / 2);
        if (d < Math.max(p.w, p.h) * .55 + 44 && d < bestPoi) {
          bestPoi = d;
          this.nearPoi = p.id;
        }
      }
      let best = 92;
      for (const n of this.npcLive) {
        const d = dist(this.px, this.py, n.x, n.y);
        if (d < best) {
          best = d;
          this.nearNpc = n.id;
        }
      }
      if (this.nearNpc) {
        const name = NPCS.find((x) => x.id === this.nearNpc)!.name;
        this.interactHint = `Talk to ${name}`;
      } else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
      else if (this.nearPoi === "court") this.interactHint = "Play basketball";
      else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
      else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi)?.name ?? "Memphis"}`;
    }
    tryInteract() {
      if (!this.started || this.paused || this.cinematic) return;
      if (this.mode === "dialogue") {
        this.advanceDialogue();
        return;
      }
      const now = performance.now();
      if (now - this.lastInteract < 140) return;
      this.lastInteract = now;
      if (this.mode === "shop") return;
      if (this.mode === "basketball") {
        if (!this.ball.inFlight) this.beginCharge();
        return;
      }
      if (this.nearPoi) {
        const step = this.mission.steps[this.mission.activeStep];
        if (step && !step.done && step.target === this.nearPoi && (step.kind === "deliver" || step.kind === "pickup" || step.kind === "goto")) {
          this.tryMissionAction(this.nearPoi);
          return;
        }
      }
      if (this.nearNpc) {
        this.openDialogue(this.nearNpc);
        return;
      }
      if (this.nearPoi === "court") {
        this.enterBasketball();
        return;
      }
      if (this.nearPoi === "store") {
        const step = this.mission.steps[this.mission.activeStep];
        if (step && (step.kind === "talk" || step.kind === "return") && !step.done) {
          this.openDialogue("k_blanco");
          return;
        }
        this.openShop();
        return;
      }
      if (this.nearPoi === "dropvan") {
        this.tryMissionAction("dropvan");
        return;
      }
      if (this.nearPoi) this.tryMissionAction(this.nearPoi);
    }
    openDialogue(npcId: string) {
      const n = NPCS.find((x) => x.id === npcId);
      if (!n) return;
      audio.talk();
      this.talked.add(npcId);
      this.checkSideTalk();
      this.dialogueNpcId = npcId;
      this.dialogueIndex = 0;
      const step = this.mission.steps[this.mission.activeStep];
      if (n.isKBlanco && step && step.kind === "talk" && !step.done) this.dialogueLines = [n.missionTalk ?? "Lock in for Drop Day.", "Grab the drop from the van, hit three spots, then bounce back."];
      else if (n.isKBlanco && step && step.kind === "return" && !step.done) this.dialogueLines = ["You did it, Benji. Drop Day secured. Respect unlocked.", "Shop the wall anytime. In the sack, we trust."];
      else this.dialogueLines = [...n.dialogue];
      this.dialogue = {
        speaker: n.name,
        text: this.dialogueLines[0] ?? "..."
      };
      this.mode = "dialogue";
      this.emitHud();
    }
    advanceDialogue() {
      if (!this.dialogue) {
        this.mode = "world";
        return;
      }
      audio.talk();
      this.dialogueIndex++;
      if (this.dialogueIndex >= this.dialogueLines.length) {
        if (NPCS.find((x) => x.id === this.dialogueNpcId)?.isKBlanco) {
          const step = this.mission.steps[this.mission.activeStep];
          if (step && step.kind === "talk" && !step.done) this.completeStep(step.id);
          if (step && step.kind === "return" && !step.done) this.completeStep(step.id);
        }
        if (this.dialogueNpcId === "supporter_1") this.tryMissionAction("neighborhood");
        if (this.dialogueNpcId === "downtown_fan") this.tryMissionAction("downtown");
        if (this.dialogueNpcId === "culture_host") this.tryMissionAction("culture");
        this.mode = "world";
        this.dialogue = null;
        this.dialogueNpcId = null;
        this.dialogueLines = [];
        this.emitHud();
        return;
      }
      this.dialogue = {
        speaker: this.dialogue.speaker,
        text: this.dialogueLines[this.dialogueIndex]
      };
      this.emitHud();
    }
    tryMissionAction(loc: LocationId) {
      const step = this.mission.steps[this.mission.activeStep];
      if (!step || step.done) {
        if (loc === "dropvan") this.showToast("Van's locked. Keep moving the brand.");
        return;
      }
      if (step.target && step.target !== loc) {
        this.showToast(`Objective: ${step.label}`);
        return;
      }
      if (step.kind === "pickup" && loc === "dropvan") {
        this.completeStep(step.id);
        this.burst(this.px, this.py, PAL.gold);
        this.showToast("Drop secured. Hit the Neighborhood.");
        return;
      }
      if (step.kind === "deliver" && step.target === loc) {
        this.completeStep(step.id);
        this.burst(this.px, this.py, "#d4af37");
        this.showToast(`Moved product at ${POIS.find((p) => p.id === loc)?.name ?? loc}`);
        return;
      }
      if (step.kind === "goto") this.completeStep(step.id);
    }
    checkMissionAuto() {
      const step = this.mission.steps[this.mission.activeStep];
      if (!step || step.done) return;
      if (step.id === "wake" && this.leftSpawn) {
        const apt = POIS.find((p) => p.id === "apartment")!;
        if (!insidePoi(this.px, this.py, apt, 50)) {
          this.completeStep("wake");
          this.showToast("Memphis is open. Head to SackReligious HQ.");
        }
      }
    }
    checkSideVisits() {
      for (const s of this.side) {
        if (s.done || s.kind !== "visit" || !s.target) continue;
        if (this.nearPoi === s.target) this.completeSide(s.id);
      }
    }
    checkSideTalk() {
      const s = this.side.find((x) => x.id === "city_tour");
      if (s && !s.done && this.talked.size >= (s.need ?? 6)) this.completeSide("city_tour");
    }
    checkSideOwn() {
      const s = this.side.find((x) => x.id === "full_fit");
      if (s && !s.done && this.owned.length >= (s.need ?? 4)) this.completeSide("full_fit");
      if (this.owned.length >= APPAREL.length) this.unlockTrophy("full_closet");
    }
    completeSide(id: string) {
      const s = this.side.find((x) => x.id === id);
      if (!s || s.done) return;
      s.done = true;
      this.sackdollars += s.reward;
      this.respect += 4;
      this.float(`+$${s.reward}`, PAL.gold);
      this.showToast(`SIDE MISSION · ${s.title}`);
      audio.mission();
      this.save();
    }
    completeStep(id: string) {
      const step = this.mission.steps.find((s) => s.id === id);
      if (!step || step.done) return;
      step.done = true;
      this.sackdollars += step.reward;
      this.respect += Math.ceil(step.reward / 10);
      this.burst(this.px, this.py - 20, PAL.gold);
      this.float(`+$${step.reward}`, PAL.gold);
      this.addTrauma(.28);
      if (this.settings.rumble) this.input.rumble(90, .25, .4);
      audio.cash();
      this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
      if (id === "wake") this.unlockTrophy("first_steps");
      if (id === "link_k") this.unlockTrophy("family");
      if (id === "ball") this.unlockTrophy("baller");
      const next = this.mission.steps.findIndex((s) => !s.done);
      if (next === -1) {
        this.mission.complete = true;
        this.missionComplete = true;
        this.mission.activeStep = this.mission.steps.length;
        this.respect += 25;
        this.unlockTrophy("drop_day");
        this.cinematic = {
          kind: "complete",
          title: "MISSION COMPLETE",
          subtitle: "THE DROP DAY  ·  RESPECT UNLOCKED",
          t: 0,
          duration: 3.6
        };
        audio.mission();
      } else this.mission.activeStep = next;
      if (this.respect >= 40) this.unlockTrophy("city_legend");
      if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
      this.save();
      this.emitHud();
    }
    unlockTrophy(id: TrophyId) {
      if (this.trophies.includes(id)) return;
      const def = TROPHIES.find((t) => t.id === id);
      if (!def) return;
      this.trophies.push(id);
      this.trophyPopup = {
        name: def.name,
        rank: def.rank,
        t: 4.2
      };
      audio.trophy();
      this.save();
      this.emitHud();
    }
    openShop() {
      audio.confirm();
      this.cinematic = {
        kind: "enter",
        title: "SACKRELIGIOUS HQ",
        subtitle: "IN THE $ACK, WE TRUST",
        t: 0,
        duration: 1.15
      };
      this.shopOpen = true;
      this.mode = "shop";
      this.emitHud();
    }
    closeShop() {
      this.shopOpen = false;
      this.mode = "world";
      audio.ui();
      this.emitHud();
    }
    buyItem(id: ApparelId) {
      const item = APPAREL.find((a) => a.id === id);
      if (!item) return;
      if (this.owned.includes(id)) {
        this.equipped = id;
        this.showToast(`Equipped ${item.name}`);
        audio.ui();
        this.save();
        this.emitHud();
        return;
      }
      if (this.sackdollars < item.price) {
        this.showToast("Not enough $ackdollars");
        return;
      }
      this.sackdollars -= item.price;
      this.owned.push(id);
      this.equipped = id;
      this.respect += 3;
      this.showToast(`Bought ${item.name}`);
      this.float(item.name, item.color);
      this.burst(this.px, this.py, item.color);
      audio.cash();
      if (this.settings.rumble) this.input.rumble(70, .2, .35);
      this.unlockTrophy("fresh_fit");
      this.checkSideOwn();
      if (this.sackdollars >= 400) this.unlockTrophy("deep_pockets");
      this.save();
      this.emitHud();
    }
    enterBasketball() {
      audio.whoosh();
      this.mode = "basketball";
      const court = POIS.find((p) => p.id === "court")!;
      this.px = court.x + court.w / 2;
      this.py = court.y + court.h - 58;
      this.yaw = 0;
      this.applyYawToFacing();
      this.ball.active = true;
      this.ball.score = 0;
      this.ball.timeLeft = 50;
      this.ball.shots = 0;
      this.ball.inFlight = false;
      this.ball.held = true;
      this.ball.charging = false;
      this.ball.power = 0;
      this.ball.flash = 0;
      this.ball.combo = 0;
      this.ball.missionCredited = false;
      this.ball.grade = "";
      this.ball.ballZ = 36;
      this.showToast("Move · Q/R look · V camera · hold shoot");
      this.emitHud();
    }
    tryCreditBasketball() {
      const step = this.mission.steps[this.mission.activeStep];
      if (step?.kind === "basketball" && this.ball.score >= this.ball.targetScore && !step.done && !this.ball.missionCredited) {
        this.ball.missionCredited = true;
        this.completeStep(step.id);
        this.showToast("Respect earned. Return to HQ when ready.");
      }
      const side = this.side.find((s) => s.id === "pickup_kings");
      if (side && !side.done && this.ball.score >= (side.need ?? 16)) this.completeSide("pickup_kings");
      if (this.ball.score >= 20) this.unlockTrophy("court_king");
      if (this.ball.score > this.highScore) this.highScore = this.ball.score;
    }
    exitBasketball() {
      this.tryCreditBasketball();
      const comboPay = Math.max(0, this.ball.combo) * 4;
      const pay = this.ball.score * 5 + comboPay;
      if (pay > 0) {
        this.sackdollars += pay;
        this.float(`+$${pay}`, PAL.gold);
        this.showToast(`Court payout: +$${pay} $ackdollars`);
        audio.cash();
      }
      this.mode = "world";
      this.ball.active = false;
      this.ball.charging = false;
      this.ball.inFlight = false;
      this.ball.held = true;
      const court = POIS.find((p) => p.id === "court")!;
      this.px = court.x + court.w / 2;
      this.py = court.y + court.h + 30;
      this.save();
      this.emitHud();
    }
    hoop() {
      const court = POIS.find((p) => p.id === "court")!;
      return { x: court.x + court.w / 2, y: court.y + 26, z: 86, court };
    }
    updateBasketball(dt: number) {
      this.ball.timeLeft -= dt;
      if (this.ball.flash > 0) this.ball.flash -= dt;
      if (this.ball.timeLeft <= 0) {
        this.ball.timeLeft = 0;
        this.exitBasketball();
        return;
      }
      if (this.ball.charging && this.ball.held) this.ball.power = Math.min(1, this.ball.power + dt * 0.78);

      if (this.ball.held) {
        this.ball.ballX = this.px;
        this.ball.ballY = this.py;
        this.ball.ballZ = 36 + (this.ball.charging ? this.ball.power * 18 : Math.sin(this.clock * 3) * 2);
        return;
      }

      if (this.ball.inFlight || this.ball.ballZ > 8) {
        this.ball.ballX += this.ball.ballVx * dt;
        this.ball.ballY += this.ball.ballVy * dt;
        this.ball.ballZ += this.ball.ballVz * dt;
        this.ball.ballVz -= 780 * dt;

        const hoop = this.hoop();
        const dx = this.ball.ballX - hoop.x;
        const dy = this.ball.ballY - hoop.y;
        const planar = Math.hypot(dx, dy);

        if (this.ball.ballVz < 0 && this.ball.ballZ <= hoop.z + 10 && this.ball.ballZ >= hoop.z - 14) {
          if (planar < 11) {
            const pts = this.ball.shotDist > 158 ? 3 : 2;
            const perfect = this.ball.grade === "PERFECT";
            this.ball.score += perfect ? pts + 1 : pts;
            this.ball.combo += 1;
            this.ball.best = Math.max(this.ball.best, this.ball.combo);
            this.ball.flash = 0.5;
            this.burst(hoop.x, hoop.y, PAL.gold);
            this.float(perfect ? `SWISH +${pts + 1}` : `+${pts}`, PAL.gold, hoop.x, hoop.y);
            this.addTrauma(perfect ? 0.45 : 0.28);
            this.hitstop = perfect ? 0.07 : 0.04;
            audio.swish();
            if (this.settings.rumble) this.input.rumble(perfect ? 140 : 80, 0.3, 0.55);
            this.tryCreditBasketball();
            this.ball.inFlight = false;
            this.ball.ballVz = -40;
            this.ball.ballVx *= 0.2;
            this.ball.ballVy *= 0.2;
          } else if (planar < 20) {
            this.ball.combo = 0;
            this.burst(hoop.x, hoop.y, "#e85d4c");
            this.float("RIM", "#e85d4c", hoop.x, hoop.y);
            audio.rim();
            this.addTrauma(0.18);
            const nx = dx / (planar || 1);
            const ny = dy / (planar || 1);
            this.ball.ballVx = nx * 90 + (Math.random() - 0.5) * 40;
            this.ball.ballVy = ny * 90;
            this.ball.ballVz = Math.abs(this.ball.ballVz) * 0.35 + 40;
          }
        }

        if (this.ball.ballY < hoop.y - 6 && this.ball.ballZ > 50 && this.ball.ballZ < 120 && Math.abs(dx) < 28 && this.ball.ballVy < 0) {
          this.ball.ballVy = Math.abs(this.ball.ballVy) * 0.45;
          this.ball.ballVx *= 0.7;
          this.float("BOARD", PAL.label, hoop.x, hoop.y + 8);
          audio.rim();
        }

        const court = hoop.court;
        if (this.ball.ballX < court.x + 6 || this.ball.ballX > court.x + court.w - 6) {
          this.ball.ballVx *= -0.4;
          this.ball.ballX = clamp(this.ball.ballX, court.x + 6, court.x + court.w - 6);
        }
        if (this.ball.ballY < court.y + 8 || this.ball.ballY > court.y + court.h - 8) {
          this.ball.ballVy *= -0.4;
          this.ball.ballY = clamp(this.ball.ballY, court.y + 8, court.y + court.h - 8);
        }
      }

      if (this.ball.ballZ <= 8) {
        this.ball.ballZ = 8;
        if (Math.abs(this.ball.ballVz) > 80) {
          this.ball.ballVz = Math.abs(this.ball.ballVz) * 0.48;
          this.ball.ballVx *= 0.72;
          this.ball.ballVy *= 0.72;
          audio.bounce();
        } else {
          this.ball.ballVz = 0;
          this.ball.ballVx *= 0.9;
          this.ball.ballVy *= 0.9;
          this.ball.inFlight = false;
        }
      }

      if (!this.ball.held && !this.ball.inFlight && dist(this.px, this.py, this.ball.ballX, this.ball.ballY) < 32 && this.ball.ballZ < 22) {
        this.ball.held = true;
        this.ball.power = 0;
        this.ball.charging = false;
      }
    }
    releaseShot() {
      if (this.mode !== "basketball" || this.ball.inFlight) return;
      if (!this.ball.held) {
        if (dist(this.px, this.py, this.ball.ballX, this.ball.ballY) < 40) {
          this.ball.held = true;
        }
        return;
      }
      if (!this.ball.charging && this.ball.power <= 0) return;
      this.ball.charging = false;
      this.ball.shots++;
      audio.bounce();
      const hoop = this.hoop();
      const pwr = this.ball.power;
      const perfect = pwr >= 0.54 && pwr <= 0.76;
      const good = pwr >= 0.42 && pwr <= 0.88;
      this.ball.grade = perfect ? "PERFECT" : good ? "GOOD" : pwr < 0.42 ? "LATE" : "LATE";
      const d = dist(this.px, this.py, hoop.x, hoop.y);
      const lookTo = Math.atan2(hoop.x - this.px, -(hoop.y - this.py));
      let err = this.yaw - lookTo;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      const assist = (perfect ? 0.72 : good ? 0.42 : 0.08) * clamp(1 - Math.abs(err) / 0.9, 0, 1);
      const shootYaw = this.yaw + (lookTo - this.yaw) * assist;
      const speedErr = perfect ? 1 : good ? 0.94 + pwr * 0.08 : 0.62 + pwr * 0.55;
      const horiz = (155 + d * 0.92) * speedErr;
      this.ball.ballX = this.px + this.fwd().x * 10;
      this.ball.ballY = this.py + this.fwd().y * 10;
      this.ball.ballZ = 42;
      this.ball.ballVx = Math.sin(shootYaw) * horiz;
      this.ball.ballVy = -Math.cos(shootYaw) * horiz;
      this.ball.ballVz = 240 + pwr * 210 + d * 0.12;
      this.ball.shotDist = d;
      this.ball.inFlight = true;
      this.ball.held = false;
      this.ball.power = 0;
      this.ball.made = good;
    }
    beginCharge() {
      if (this.mode === "basketball" && this.ball.held && !this.ball.inFlight) {
        this.ball.charging = true;
        this.ball.power = 0;
      }
    }
    burst(x: number, y: number, color: string) {
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 50 + Math.random() * 140;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: .4 + Math.random() * .55,
          color,
          size: 2 + Math.random() * 4
        });
      }
    }
    getObjectiveTarget() {
      const step = this.mission.steps[this.mission.activeStep];
      if (!step?.target || this.mission.complete) return null;
      if (step.kind === "talk" || step.kind === "return") {
        const k = this.npcPos("k_blanco");
        if (k) return {
          x: k.x,
          y: k.y
        };
      }
      const p = POIS.find((x) => x.id === step.target);
      if (!p) return null;
      return {
        x: p.x + p.w / 2,
        y: p.y + p.h / 2
      };
    }
    draw() {
      const ctx = this.ctx;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
        this.canvas.width = Math.floor(w * dpr);
        this.canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      const night = nightAmount(this.worldHour);
      sky.addColorStop(0, night > 0.4 ? "#1a1618" : PAL.skyTop);
      sky.addColorStop(1, PAL.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const shake = this.trauma * this.trauma;
      const ox = shake * 11 * Math.sin(this.clock * 47);
      const oy = shake * 9 * Math.cos(this.clock * 39);
      const first = this.settings.cameraView === "first";
      ctx.save();
      if (first) {
        ctx.translate(w / 2 + ox, h * 0.8 + oy);
        ctx.scale(2.05, 0.68);
      } else {
        ctx.translate(w / 2 + ox, h * 0.7 + oy);
        ctx.scale(1.18, 0.72);
      }
      ctx.rotate(-this.yaw);
      ctx.translate(-this.px, -this.py);
      if (this.mapCanvas) ctx.drawImage(this.mapCanvas, 0, 0);
      const step = this.mission.steps[this.mission.activeStep];
      if (step?.target && !this.mission.complete) {
        const p = POIS.find((x) => x.id === step.target);
        if (p) {
          ctx.strokeStyle = "rgba(29,185,84,0.75)";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
          ctx.setLineDash([]);
          const t = this.clock * 3;
          ctx.fillStyle = `rgba(29,185,84,${0.35 + Math.sin(t) * 0.2})`;
          ctx.beginPath();
          ctx.arc(p.x + p.w / 2, p.y - 18, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const car of this.cars) this.drawCar(ctx, car);
      for (const ped of this.peds) this.drawPed(ctx, ped);
      for (const n of NPCS) this.drawNpc(ctx, n);
      this.drawWorldBall(ctx);
      if (!first) this.drawPlayer(ctx);
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const f of this.floaters) {
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.fillStyle = f.color;
        ctx.font = `700 ${Math.round(15 * f.scale)}px DM Sans, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.textAlign = "start";
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (night > 0.05) {
        ctx.fillStyle = `rgba(13,11,10,${night * 0.42})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (first) this.drawFirstPersonOverlay(ctx, w, h);
      if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) this.drawShotMeter(ctx, w, h);
      if (this.ball.flash > 0 && this.mode === "basketball") {
        ctx.fillStyle = `rgba(242,198,106,${this.ball.flash * 0.28})`;
        ctx.fillRect(0, 0, w, h);
        if (this.ball.grade) {
          ctx.fillStyle = PAL.gold;
          ctx.font = "700 48px Bebas Neue, DM Sans, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(this.ball.grade, w / 2, h * 0.16);
          ctx.textAlign = "start";
        }
      }
      if (this.started && (this.mode === "world" || this.mode === "basketball")) {
        this.drawCompass(ctx, w, h);
        this.drawMinimap(ctx, w, h);
      }
    }
    projectWorld(x: number, y: number, z: number, w: number, h: number) {
      const f = this.fwd();
      const r = this.right();
      const dx = x - this.px;
      const dy = y - this.py;
      const relR = dx * r.x + dy * r.y;
      const relF = dx * f.x + dy * f.y;
      const d = relF + 64;
      if (d < 10) return null;
      const s = 230 / d;
      return {
        x: w / 2 + relR * s,
        y: h / 2 - z * s * 0.82 - (relF - 30) * 0.12,
        s,
        d,
        relF,
      };
    }
    drawWorldBall(ctx: CanvasRenderingContext2D) {
      if (this.mode !== "basketball") return;
      if (this.ball.held && this.settings.cameraView === "first") return;
      const bx = this.ball.ballX;
      const by = this.ball.ballY;
      const z = this.ball.ballZ;
      ctx.fillStyle = "rgba(13,11,10,0.35)";
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      const size = 9 + z * 0.04;
      ctx.fillStyle = "#c46a32";
      ctx.beginPath();
      ctx.arc(bx, by - z * 0.55, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    drawFirstPersonOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
      if (this.mode === "basketball") {
        const hoop = this.hoop();
        const hp = this.projectWorld(hoop.x, hoop.y, hoop.z, w, h);
        if (hp && hp.relF > 20) {
          ctx.strokeStyle = "rgba(29,185,84,0.55)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(hp.x, hp.y, 16 * hp.s * 0.12, 6 * hp.s * 0.12, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (!this.ball.held) {
          const bp = this.projectWorld(this.ball.ballX, this.ball.ballY, this.ball.ballZ, w, h);
          if (bp && bp.relF > 8) {
            ctx.fillStyle = "#c46a32";
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, clamp(22 * bp.s * 0.12, 4, 26), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = PAL.ink;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = "rgba(232,226,214,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h / 2);
      ctx.lineTo(w / 2 + 8, h / 2);
      ctx.moveTo(w / 2, h / 2 - 8);
      ctx.lineTo(w / 2, h / 2 + 8);
      ctx.stroke();

      const vm = this.images.front;
      if (vm) {
        const vh = 168;
        const vw = (vm.width / vm.height) * vh;
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.drawImage(vm, w / 2 - vw / 2, h - vh + 36, vw, vh);
        ctx.restore();
      } else {
        ctx.fillStyle = "#c4a574";
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h + 4);
        ctx.quadraticCurveTo(w * 0.18, h - 110, w * 0.4, h - 42);
        ctx.lineTo(w * 0.36, h + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.92, h + 4);
        ctx.quadraticCurveTo(w * 0.82, h - 110, w * 0.58, h - 42);
        ctx.lineTo(w * 0.64, h + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (this.mode === "basketball" && this.ball.held) {
        const lift = this.ball.charging ? this.ball.power * -48 : Math.sin(this.clock * 3) * 2;
        ctx.fillStyle = "#c46a32";
        ctx.beginPath();
        ctx.arc(w / 2 + 16, h - 78 + lift, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    drawShotMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const mw = 188;
      const mh = 16;
      const mx = w / 2 - mw / 2;
      const my = h - 128;
      ctx.fillStyle = "rgba(13,11,10,0.7)";
      ctx.beginPath();
      rr(ctx, mx - 5, my - 5, 198, 26, 8);
      ctx.fill();
      ctx.fillStyle = PAL.windowDark;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "rgba(109,130,80,0.35)";
      ctx.fillRect(mx + mw * .48, my, mw * .4, mh);
      ctx.fillStyle = "rgba(109,130,80,0.7)";
      ctx.fillRect(mx + mw * .56, my, mw * .22, mh);
      ctx.fillStyle = PAL.label;
      ctx.fillRect(mx, my, mw * this.ball.power, mh);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 10px DM Sans, sans-serif";
      ctx.fillText("RELEASE IN THE GREEN", mx, my - 10);
    }
    drawCar(ctx: CanvasRenderingContext2D, car: { x: number; y: number; vx: number; vy: number; w: number; color: string }) {
      ctx.save();
      ctx.translate(car.x, car.y);
      if (Math.abs(car.vy) > Math.abs(car.vx)) ctx.rotate(car.vy > 0 ? Math.PI / 2 : -Math.PI / 2);
      else if (car.vx < 0) ctx.rotate(Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(13,11,10,0.45)";
      ctx.fillRect(6, 10, car.w, 16);
      ctx.restore();
      ctx.fillStyle = car.color;
      ctx.fillRect(0, 0, car.w, 18);
      ctx.fillStyle = PAL.roof;
      ctx.fillRect(2, 2, car.w - 4, 6);
      ctx.fillStyle = PAL.roofEdge;
      ctx.fillRect(2, 2, car.w - 4, 1);
      ctx.fillStyle = "rgba(26,23,21,0.55)";
      ctx.fillRect(car.w * 0.45, 9, car.w * 0.28, 7);
      ctx.fillStyle = PAL.windowLit;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(car.w - 3, 3, 3, 5);
      ctx.fillRect(car.w - 3, 10, 3, 5);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    drawPed(ctx: CanvasRenderingContext2D, p: { x: number; y: number; color: string; t: number }) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 3, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 6, p.y - 20 + Math.sin(p.t * 6) * 1.2, 12, 18);
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const target = this.getObjectiveTarget();
      if (!target) return;
      const f = this.fwd();
      const r = this.right();
      const dx = target.x - this.px;
      const dy = target.y - this.py;
      const relR = dx * r.x + dy * r.y;
      const relF = dx * f.x + dy * f.y;
      const margin = 70;
      const sx = w / 2 + relR;
      const sy = h / 2 - relF;
      if (sx > margin && sx < w - margin && sy > margin && sy < h - margin && relF > 0) return;
      const ang = Math.atan2(-relF, relR);
      const cx = w / 2;
      const cy = h / 2;
      const edgePad = 56;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const tX = cos > 0 ? (w - edgePad - cx) / cos : cos < 0 ? (edgePad - cx) / cos : Infinity;
      const tY = sin > 0 ? (h - edgePad - cy) / sin : sin < 0 ? (edgePad - cy) / sin : Infinity;
      const t = Math.min(Math.abs(tX), Math.abs(tY));
      const ax = clamp(cx + cos * t, edgePad, w - edgePad);
      const ay = clamp(cy + sin * t, 96, h - edgePad - 80);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(29,185,84,0.95)";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, 9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, -9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const meters = Math.round(dist(this.px, this.py, target.x, target.y) / 12);
      ctx.fillStyle = "rgba(10,12,11,0.75)";
      ctx.font = "600 11px DM Sans, sans-serif";
      const label = `${meters}m`;
      const tw = ctx.measureText(label).width;
      const lx = clamp(ax - tw / 2, 8, w - tw - 8);
      const ly = clamp(ay + 22, 20, h - 20);
      ctx.fillRect(lx - 4, ly - 11, tw + 8, 16);
      ctx.fillStyle = PAL.label;
      ctx.fillText(label, lx, ly);
    }
    drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const size = Math.min(136, Math.max(100, w * .15));
      const pad = 12;
      const mx = pad;
      const my = h - size - pad - (w < 640 ? 108 : 10);
      const scaleX = size / WORLD_PX_W;
      const scaleY = size / WORLD_PX_H;
      ctx.fillStyle = "rgba(10,12,11,0.86)";
      ctx.beginPath();
      rr(ctx, mx - 3, my - 3, size + 6, size + 6, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(107,92,74,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      rr(ctx, mx, my, size, size, 10);
      ctx.clip();
      ctx.fillStyle = PAL.asphalt;
      ctx.fillRect(mx, my, size, size);
      ctx.fillStyle = PAL.sidewalk;
      ctx.fillRect(mx, my + 960 * scaleY - 2, size, 4);
      ctx.fillRect(mx + 768 * scaleX - 2, my, 4, size);
      ctx.fillRect(mx + 1632 * scaleX - 2, my, 4, size);
      for (const p of POIS) {
        const isTarget = this.mission.steps[this.mission.activeStep]?.target === p.id;
        ctx.fillStyle = isTarget ? PAL.accent : PAL.wall;
        const px = mx + p.x * scaleX;
        const py = my + p.y * scaleY;
        const pw = Math.max(4, p.w * scaleX);
        const ph = Math.max(4, p.h * scaleY);
        ctx.fillRect(px, py, pw, ph);
        if (isTarget) {
          ctx.strokeStyle = `rgba(29,185,84,${.4 + Math.sin(this.clock * 5) * .3})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
        }
      }
      const ppx = mx + this.px * scaleX;
      const ppy = my + this.py * scaleY;
      ctx.fillStyle = PAL.accent;
      ctx.beginPath();
      ctx.arc(ppx, ppy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const fang = this.facing === "up" ? -Math.PI / 2 : this.facing === "down" ? Math.PI / 2 : this.facing === "left" ? Math.PI : 0;
      ctx.fillStyle = PAL.accent;
      ctx.lineTo(ppx + Math.cos(fang + 2.5) * 4, ppy + Math.sin(fang + 2.5) * 4);
      ctx.lineTo(ppx + Math.cos(fang - 2.5) * 4, ppy + Math.sin(fang - 2.5) * 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 9px DM Sans, sans-serif";
      ctx.fillText("MEMPHIS 901", 20, my + 14);
    }
    drawNpc(ctx: CanvasRenderingContext2D, n: (typeof NPCS)[0]) {
      const live = this.npcPos(n.id);
      const x = live.x;
      const y = live.y;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (n.isKBlanco && this.images.k) {
        const img = this.images.k;
        const ih = 72;
        const iw = img.width / img.height * ih;
        ctx.drawImage(img, x - iw / 2, y - ih + 4, iw, ih);
      } else {
        ctx.fillStyle = n.color;
        ctx.fillRect(x - 12, y - 40, 24, 36);
        ctx.fillStyle = "#1c1917";
        ctx.beginPath();
        ctx.arc(x, y - 48, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(10,12,11,0.78)";
      ctx.font = "600 11px DM Sans, sans-serif";
      const tw = ctx.measureText(n.name).width;
      ctx.fillRect(x - tw / 2 - 6, y - 78, tw + 12, 16);
      ctx.fillStyle = PAL.label;
      ctx.fillText(n.name, x - tw / 2, y - 66);
      if (this.nearNpc === n.id) {
        ctx.strokeStyle = "#1db954";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 18, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    drawPlayer(ctx: CanvasRenderingContext2D) {
      const y = this.py + this.bob;
      ctx.fillStyle = "rgba(13,11,10,0.4)";
      ctx.beginPath();
      ctx.ellipse(this.px + 2, this.py + 8, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      const side = this.images.left;
      const img =
        this.facing === "up" ? this.images.back : this.facing === "down" ? this.images.front : side;
      if (img) {
        const hgt = 64;
        const wdt = (img.width / img.height) * hgt;
        const sx = this.moving ? 1 + Math.sin(this.animT) * 0.05 : 1;
        const sy = this.moving ? 1 - Math.sin(this.animT) * 0.05 : 1;
        // Left-profile sheet is a camera-left view: nose points right. Flip on A.
        const flip = this.facing === "left" ? -1 : 1;
        ctx.save();
        ctx.translate(this.px, y);
        ctx.scale(flip * sx, sy);
        ctx.drawImage(img, -wdt / 2, -hgt + 4, wdt, hgt);
        ctx.restore();
      } else {
        ctx.fillStyle = PAL.wallAlt;
        ctx.fillRect(this.px - 14, y - 48, 28, 40);
      }
      if (this.equipped && this.equipped !== "starter_tee") {
        const item = APPAREL.find((a) => a.id === this.equipped);
        if (item) {
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(this.px + 18 * (this.facing === "left" ? -1 : 1), y - 62, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.stroke();
        }
      }
    }
    getLocationName() {
      if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.name ?? "Memphis";
      if (this.py > 2164) return "Riverfront";
      if (this.px > 3072 * .7) return "East Memphis";
      if (this.px < 3072 * .28) return "West Side";
      return "Memphis Streets";
    }
    getDistrict() {
      if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.district ?? "901";
      return "901";
    }
    hourLabel() {
      const h = Math.floor(this.worldHour);
      const m = Math.floor((this.worldHour - h) * 60);
      const ap = h >= 12 ? "PM" : "AM";
      return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, "0")} ${ap}`;
    }
    emitHud() {
      this.onHud?.(this.getHud());
    }
    getHud(): HudSnapshot {
      const step = this.mission.steps[this.mission.activeStep];
      const done = this.mission.steps.filter((s) => s.done).length;
      const prompts = this.input.prompt(this.input.device);
      return {
        mode: this.mode,
        sackdollars: this.sackdollars,
        respect: this.respect,
        missionTitle: this.mission.title,
        missionChapter: this.mission.chapter,
        missionStep: this.mission.complete ? "Free roam · side missions live" : step ? step.label : "—",
        missionProgress: `${done}/${this.mission.steps.length}`,
        interactHint: this.mode === "world" ? this.interactHint : this.mode === "dialogue" ? `${prompts.interact} to continue` : this.mode === "basketball" ? `Hold ${prompts.shoot} · aim at rim · V camera` : null,
        locationName: this.getLocationName(),
        district: this.getDistrict(),
        dialogue: this.dialogue,
        shopOpen: this.shopOpen,
        toast: this.toast,
        equipped: this.equipped,
        owned: [...this.owned],
        basketball: this.mode === "basketball" ? {
          score: this.ball.score,
          timeLeft: Math.ceil(this.ball.timeLeft),
          shots: this.ball.shots,
          active: true,
          combo: this.ball.combo,
          power: this.ball.power,
          charging: this.ball.charging,
          best: this.ball.best
        } : null,
        paused: this.paused,
        started: this.started,
        missionComplete: this.missionComplete,
        cinematic: this.cinematic,
        letterbox: this.letterbox,
        worldHour: this.worldHour,
        inputDevice: this.input.device,
        promptButton: prompts.interact,
        trophies: [...this.trophies],
        trophyPopup: this.trophyPopup,
        pauseTab: this.pauseTab,
        settings: this.settings,
        sideMissions: this.side.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          done: s.done,
          reward: s.reward
        })),
        highScore: this.highScore,
        hasSave: this.hasSave,
        cameraView: this.settings.cameraView,
        steps: this.mission.steps.map((s) => ({
          id: s.id,
          label: s.label,
          done: s.done,
          description: s.description
        }))
      };
    }
}
