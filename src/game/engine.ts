import {
  APPAREL,
  NPCS,
  PLAYER_RUN,
  PLAYER_SPEED,
  POIS,
  SAVE_KEY,
  TILE,
  WORLD_H,
  WORLD_PX_H,
  WORLD_PX_W,
  WORLD_W,
  createDropDayMission,
} from "./data";
import type {
  ApparelId,
  Dir,
  GameMode,
  HudSnapshot,
  LocationId,
  Mission,
  SaveData,
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

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  images: ImgMap = {};
  keys = new Set<string>();
  touch = { mx: 0, my: 0, interact: false, shoot: false };

  started = false;
  paused = false;
  mode: GameMode = "world";
  toast: string | null = null;
  toastT = 0;

  px = 6 * TILE;
  py = 10 * TILE;
  vx = 0;
  vy = 0;
  dir: Dir = "down";
  facing: Dir = "down";
  moving = false;
  animT = 0;
  bob = 0;

  camX = 0;
  camY = 0;

  sackdollars = 25;
  respect = 0;
  owned: ApparelId[] = ["starter_tee"];
  equipped: ApparelId | null = "starter_tee";

  mission: Mission = createDropDayMission();
  missionComplete = false;

  dialogue: HudSnapshot["dialogue"] = null;
  dialogueNpcId: string | null = null;
  dialogueLines: string[] = [];
  dialogueIndex = 0;

  ball = {
    active: false,
    score: 0,
    timeLeft: 45,
    shots: 0,
    power: 0,
    charging: false,
    ballX: 0,
    ballY: 0,
    ballVx: 0,
    ballVy: 0,
    inFlight: false,
    made: false,
    flash: 0,
    targetScore: 8,
    missionCredited: false,
  };

  walls: { x: number; y: number; w: number; h: number }[] = [];
  trees: { x: number; y: number }[] = [];
  cars: { x: number; y: number; w: number; color: string }[] = [];

  shopOpen = false;

  interactHint: string | null = null;
  nearPoi: LocationId | null = null;
  nearNpc: string | null = null;
  lastInteract = 0;

  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
  }[] = [];

  running = false;
  raf = 0;
  lastT = 0;
  onHud: ((h: HudSnapshot) => void) | null = null;
  hudAcc = 0;

  mapCanvas: HTMLCanvasElement | null = null;
  leftSpawn = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context missing");
    this.ctx = ctx;
    this.buildWorld();
  }

  async init() {
    const paths: Record<string, string> = {
      front: "/game/benji-front-norm.png",
      back: "/game/benji-back-norm.png",
      left: "/game/benji-left-norm.png",
      right: "/game/benji-right-norm.png",
      icon: "/game/sack-icon.png",
      k: "/game/k-blanco-portrait.png",
      featured: "/game/featured-products.png",
    };
    await Promise.all(
      Object.entries(paths).map(async ([k, src]) => {
        try {
          this.images[k] = await loadImage(src);
        } catch {
          /* optional */
        }
      }),
    );
    this.loadSave();
    this.paintMap();
    this.bindInput();
    this.emitHud();
  }

  buildWorld() {
    this.walls.push(
      { x: 0, y: 0, w: WORLD_PX_W, h: TILE * 0.6 },
      { x: 0, y: WORLD_PX_H - TILE * 0.6, w: WORLD_PX_W, h: TILE * 0.6 },
      { x: 0, y: 0, w: TILE * 0.6, h: WORLD_PX_H },
      { x: WORLD_PX_W - TILE * 0.6, y: 0, w: TILE * 0.6, h: WORLD_PX_H },
    );

    for (let gy = 2; gy < WORLD_H - 2; gy += 5) {
      for (let gx = 2; gx < WORLD_W - 2; gx += 5) {
        if (gx % 10 === 2 || gy % 10 === 2) continue;
        const bx = gx * TILE;
        const by = gy * TILE;
        const bw = 3 * TILE;
        const bh = 2.5 * TILE;
        let blocked = false;
        for (const p of POIS) {
          if (
            bx < p.x + p.w + TILE * 1.5 &&
            bx + bw > p.x - TILE * 1.5 &&
            by < p.y + p.h + TILE * 1.5 &&
            by + bh > p.y - TILE * 1.5
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        if (bx < 14 * TILE && by < 16 * TILE) continue;
        this.walls.push({ x: bx, y: by, w: bw, h: bh - 18 });
      }
    }

    for (let i = 0; i < 40; i++) {
      this.trees.push({
        x: (3 + Math.random() * (WORLD_W - 6)) * TILE,
        y: (3 + Math.random() * (WORLD_H - 6)) * TILE,
      });
    }

    const carColors = ["#1db954", "#111", "#e5e5e5", "#3b82f6", "#ef4444"];
    for (let i = 0; i < 18; i++) {
      this.cars.push({
        x: (4 + Math.random() * (WORLD_W - 8)) * TILE,
        y: (4 + Math.random() * (WORLD_H - 8)) * TILE,
        w: 40 + Math.random() * 20,
        color: carColors[i % carColors.length]!,
      });
    }
  }

  paintMap() {
    const c = document.createElement("canvas");
    c.width = WORLD_PX_W;
    c.height = WORLD_PX_H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2a2e2b";
    g.fillRect(0, 0, c.width, c.height);

    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const isRoad =
          Math.abs(y - 20) <= 1 || y === 5 || Math.abs(x - 15) <= 1 || Math.abs(x - 32) <= 1;
        if (isRoad) {
          g.fillStyle = "#3a3f3c";
          g.fillRect(px, py, TILE, TILE);
          g.strokeStyle = "rgba(255,255,255,0.12)";
          g.setLineDash([8, 10]);
          g.beginPath();
          if (Math.abs(y - 20) <= 1) {
            g.moveTo(px, py + TILE / 2);
            g.lineTo(px + TILE, py + TILE / 2);
          } else {
            g.moveTo(px + TILE / 2, py);
            g.lineTo(px + TILE / 2, py + TILE);
          }
          g.stroke();
          g.setLineDash([]);
        } else {
          g.fillStyle = (x + y) % 2 === 0 ? "#4a524c" : "#454d47";
          g.fillRect(px, py, TILE, TILE);
        }
      }
    }

    g.fillStyle = "#2f4a36";
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.ellipse(
        Math.random() * WORLD_PX_W,
        Math.random() * WORLD_PX_H,
        40 + Math.random() * 60,
        30 + Math.random() * 40,
        0,
        0,
        Math.PI * 2,
      );
      g.fill();
    }

    for (const w of this.walls) {
      if (w.w >= WORLD_PX_W - 2 || w.h >= WORLD_PX_H - 2) continue;
      const grad = g.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      grad.addColorStop(0, "#1c2420");
      grad.addColorStop(1, "#141a17");
      g.fillStyle = grad;
      g.fillRect(w.x, w.y, w.w, w.h);
      g.strokeStyle = "#0a0c0b";
      g.lineWidth = 2;
      g.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      g.fillStyle = "rgba(253, 224, 71, 0.12)";
      for (let wy = w.y + 16; wy < w.y + w.h - 16; wy += 22) {
        for (let wx = w.x + 14; wx < w.x + w.w - 14; wx += 20) {
          g.fillRect(wx, wy, 10, 12);
        }
      }
    }

    for (const p of POIS) {
      if (p.id === "court") {
        g.fillStyle = "#c2410c";
        g.fillRect(p.x, p.y, p.w, p.h);
        g.strokeStyle = "#fff";
        g.lineWidth = 3;
        g.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
        g.strokeRect(p.x + p.w / 2 - 40, p.y + 8, 80, 70);
        g.beginPath();
        g.arc(p.x + p.w / 2, p.y + 78, 40, 0, Math.PI);
        g.stroke();
        g.fillStyle = "#f97316";
        g.fillRect(p.x + p.w / 2 - 22, p.y + 6, 44, 6);
        g.strokeStyle = "#ef4444";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(p.x + p.w / 2, p.y + 22, 12, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "rgba(255,255,255,0.25)";
        g.font = "bold 14px sans-serif";
        g.fillText("901 COURT", p.x + 20, p.y + p.h - 16);
      } else if (p.id === "dropvan") {
        g.fillStyle = "#1c1917";
        g.fillRect(p.x, p.y + 10, p.w, p.h - 10);
        g.fillStyle = "#292524";
        g.fillRect(p.x + 8, p.y, p.w - 16, 18);
        g.fillStyle = "#1db954";
        g.font = "bold 12px sans-serif";
        g.fillText("DROP VAN", p.x + 12, p.y + p.h / 2);
      } else {
        g.fillStyle = p.color;
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(p.x, p.y + p.h - 20, p.w, 20);
        g.fillStyle = "#0a0c0b";
        g.fillRect(p.x + p.w / 2 - 14, p.y + p.h - 36, 28, 36);
        g.fillStyle = "#1db954";
        g.font = "bold 13px sans-serif";
        g.fillText(p.label, p.x + 10, p.y + 22);
        if (p.id === "store") {
          g.fillStyle = "#f2f5f3";
          g.font = "bold 16px sans-serif";
          g.fillText("$ACKRELIGIOUS", p.x + 18, p.y + 48);
          g.fillStyle = "#1db954";
          g.font = "11px sans-serif";
          g.fillText("IN THE $ACK, WE TRUST", p.x + 18, p.y + 66);
        }
      }
    }

    const store = POIS.find((p) => p.id === "store")!;
    g.globalAlpha = 0.15;
    g.fillStyle = "#1db954";
    g.beginPath();
    g.arc(store.x + store.w / 2, store.y + store.h + 50, 36, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    for (const t of this.trees) {
      g.fillStyle = "#1a2e1f";
      g.beginPath();
      g.arc(t.x, t.y, 16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2d5a3a";
      g.beginPath();
      g.arc(t.x - 4, t.y - 4, 12, 0, Math.PI * 2);
      g.fill();
    }

    for (const car of this.cars) {
      g.fillStyle = car.color;
      g.fillRect(car.x, car.y, car.w, 22);
      g.fillStyle = "rgba(255,255,255,0.2)";
      g.fillRect(car.x + 6, car.y + 4, car.w * 0.35, 10);
    }

    const river = g.createLinearGradient(0, WORLD_PX_H - 80, 0, WORLD_PX_H);
    river.addColorStop(0, "rgba(30, 64, 100, 0)");
    river.addColorStop(1, "rgba(30, 64, 100, 0.55)");
    g.fillStyle = river;
    g.fillRect(0, WORLD_PX_H - 90, WORLD_PX_W, 90);

    g.fillStyle = "#0d1210";
    for (let i = 0; i < 20; i++) {
      g.fillRect(80 + i * 140, 40, 50 + (i % 3) * 20, 40 + ((i * 37) % 80));
    }
    g.fillStyle = "#151a18";
    g.beginPath();
    g.moveTo(WORLD_PX_W - 200, 120);
    g.lineTo(WORLD_PX_W - 120, 30);
    g.lineTo(WORLD_PX_W - 40, 120);
    g.closePath();
    g.fill();

    this.mapCanvas = c;
  }

  bindInput() {
    const down = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "KeyE" || e.code === "Enter") this.tryInteract();
      if (e.code === "Space") {
        if (this.mode === "basketball") this.beginCharge();
        else if (this.mode === "world" || this.mode === "dialogue") this.tryInteract();
      }
      if (e.code === "Escape") {
        if (this.mode === "shop") this.closeShop();
        else if (this.mode === "dialogue") this.advanceDialogue();
        else if (this.mode === "basketball") this.exitBasketball();
        else if (this.started) this.paused = !this.paused;
      }
    };
    const up = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      if (e.code === "Space" && this.mode === "basketball" && this.ball.charging) {
        this.releaseShot();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => this.keys.clear());
    (this as unknown as { _kd: typeof down; _ku: typeof up })._kd = down;
    (this as unknown as { _kd: typeof down; _ku: typeof up })._ku = up;

    if (typeof window !== "undefined") {
      (
        window as unknown as {
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
        }
      ).__controlsTest = {
        getYaw: () => {
          const map: Record<Dir, number> = {
            up: 0,
            right: Math.PI / 2,
            down: Math.PI,
            left: -Math.PI / 2,
          };
          return map[this.facing];
        },
        getSpeed: () => Math.hypot(this.vx, this.vy),
        setKeys: (codes: string[]) => {
          this.keys.clear();
          for (const c of codes) this.keys.add(c);
        },
      };
      (
        window as unknown as {
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
        }
      ).__gameTest = {
        teleport: (loc: LocationId) => {
          if (this.mode === "basketball") this.exitBasketball();
          if (this.mode === "shop") this.closeShop();
          if (this.mode === "dialogue") {
            this.mode = "world";
            this.dialogue = null;
          }
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
          missionComplete: this.missionComplete,
        }),
        setBallScore: (n: number) => {
          this.ball.score = n;
          this.tryCreditBasketball();
          this.emitHud();
        },
        advanceDialogue: () => this.advanceDialogue(),
        interact: () => this.tryInteract(),
        resetSave: () => {
          try {
            localStorage.removeItem(SAVE_KEY);
          } catch {
            /* ignore */
          }
          this.mission = createDropDayMission();
          this.missionComplete = false;
          this.sackdollars = 25;
          this.respect = 0;
          this.owned = ["starter_tee"];
          this.equipped = "starter_tee";
          this.px = 6 * TILE;
          this.py = 10 * TILE;
          this.leftSpawn = false;
          this.mode = "world";
          this.shopOpen = false;
          this.dialogue = null;
          this.ball.missionCredited = false;
          this.emitHud();
        },
      };
    }
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    const self = this as unknown as {
      _kd?: (e: KeyboardEvent) => void;
      _ku?: (e: KeyboardEvent) => void;
    };
    if (self._kd) window.removeEventListener("keydown", self._kd);
    if (self._ku) window.removeEventListener("keyup", self._ku);
  }

  start() {
    this.started = true;
    this.paused = false;
    this.showToast("Drop Day is live. Find K Blanco at HQ.");
    this.emitHud();
  }

  showToast(msg: string, t = 3.2) {
    this.toast = msg;
    this.toastT = t;
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1) return;
      this.sackdollars = data.sackdollars;
      this.respect = data.respect;
      this.owned = data.owned?.length ? data.owned : ["starter_tee"];
      this.equipped = data.equipped;
      this.mission.complete = data.missionComplete ?? false;
      this.missionComplete = this.mission.complete;
      for (const s of this.mission.steps) s.done = !!data.missionProgress?.[s.id];
      const firstUndone = this.mission.steps.findIndex((s) => !s.done);
      this.mission.activeStep = firstUndone === -1 ? this.mission.steps.length : firstUndone;
    } catch {
      /* ignore */
    }
  }

  save() {
    const progress: Record<string, boolean> = {};
    for (const s of this.mission.steps) progress[s.id] = s.done;
    const data: SaveData = {
      version: 1,
      sackdollars: this.sackdollars,
      respect: this.respect,
      owned: this.owned,
      equipped: this.equipped,
      missionProgress: progress,
      missionActiveStep: this.mission.activeStep,
      missionComplete: this.mission.complete,
      basketballHighScore: this.ball.score,
      tutorialDone: true,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  startLoop() {
    this.running = true;
    this.lastT = performance.now();
    const frame = (t: number) => {
      if (!this.running) return;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = Math.min(dt, 0.1);
      this.update(dt);
      this.draw();
      this.hudAcc += dt;
      if (this.hudAcc > 0.1) {
        this.hudAcc = 0;
        this.emitHud();
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  update(dt: number) {
    if (!this.started || this.paused) return;
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toast = null;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.mode === "dialogue" || this.mode === "shop" || this.mode === "menu") return;
    if (this.mode === "basketball") {
      this.updateBasketball(dt);
      return;
    }
    this.updatePlayer(dt);
    this.updateProximity();
    this.checkMissionAuto();
  }

  updatePlayer(dt: number) {
    let mx = 0;
    let my = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
    mx += this.touch.mx;
    my += this.touch.my;
    const len = Math.hypot(mx, my);
    if (len > 0.01) {
      mx /= len;
      my /= len;
      this.moving = true;
      this.leftSpawn = true;
      if (Math.abs(mx) > Math.abs(my)) this.facing = mx < 0 ? "left" : "right";
      else this.facing = my < 0 ? "up" : "down";
      this.dir = this.facing;
    } else this.moving = false;

    const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = run ? PLAYER_RUN : PLAYER_SPEED;
    this.vx = mx * speed;
    this.vy = my * speed;
    const r = 14;
    let nx = this.px + this.vx * dt;
    let ny = this.py + this.vy * dt;
    nx = clamp(nx, TILE + r, WORLD_PX_W - TILE - r);
    ny = clamp(ny, TILE + r, WORLD_PX_H - TILE - r);
    if (!this.collides(nx, this.py, r)) this.px = nx;
    if (!this.collides(this.px, ny, r)) this.py = ny;
    this.animT += dt * (this.moving ? 8 : 2);
    this.bob = this.moving ? Math.sin(this.animT * 2) * 3 : 0;
    const tw = this.canvas.clientWidth;
    const th = this.canvas.clientHeight;
    this.camX += (this.px - tw / 2 - this.camX) * Math.min(1, 6 * dt);
    this.camY += (this.py - th / 2 - this.camY) * Math.min(1, 6 * dt);
    this.camX = clamp(this.camX, 0, Math.max(0, WORLD_PX_W - tw));
    this.camY = clamp(this.camY, 0, Math.max(0, WORLD_PX_H - th));
  }

  collides(x: number, y: number, r: number) {
    for (const w of this.walls) {
      if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
    }
    return false;
  }

  updateProximity() {
    this.nearPoi = null;
    this.nearNpc = null;
    this.interactHint = null;
    let bestPoi = 9999;
    for (const p of POIS) {
      const d = dist(this.px, this.py, p.x + p.w / 2, p.y + p.h / 2);
      const reach = Math.max(p.w, p.h) * 0.55 + 40;
      if (d < reach && d < bestPoi) {
        bestPoi = d;
        this.nearPoi = p.id;
      }
    }
    let best = 90;
    for (const n of NPCS) {
      const d = dist(this.px, this.py, n.x, n.y);
      if (d < best) {
        best = d;
        this.nearNpc = n.id;
      }
    }
    if (this.nearNpc) {
      this.interactHint = `Talk to ${NPCS.find((x) => x.id === this.nearNpc)!.name}`;
    } else if (this.nearPoi === "store") this.interactHint = "Enter HQ · Shop apparel";
    else if (this.nearPoi === "court") this.interactHint = "Play basketball";
    else if (this.nearPoi === "dropvan") this.interactHint = "Secure the drop";
    else if (this.nearPoi) this.interactHint = `Explore ${POIS.find((x) => x.id === this.nearPoi)!.name}`;
  }

  tryInteract() {
    if (!this.started || this.paused) return;
    if (this.mode === "dialogue") {
      this.advanceDialogue();
      return;
    }
    const now = performance.now();
    if (now - this.lastInteract < 220) return;
    this.lastInteract = now;
    if (this.mode === "shop") return;
    if (this.mode === "basketball") {
      if (!this.ball.inFlight) this.beginCharge();
      return;
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
    this.dialogueNpcId = npcId;
    this.dialogueIndex = 0;
    const step = this.mission.steps[this.mission.activeStep];
    if (n.isKBlanco && step && step.kind === "talk" && !step.done) {
      this.dialogueLines = [
        n.missionTalk ?? "Lock in for Drop Day.",
        "Grab the drop from the van, hit three spots, then bounce back.",
      ];
    } else if (n.isKBlanco && step && step.kind === "return" && !step.done) {
      this.dialogueLines = [
        "You did it, Benji. Drop Day secured. Respect unlocked.",
        "Shop the wall anytime. In the sack, we trust.",
      ];
    } else this.dialogueLines = [...n.dialogue];
    this.dialogue = { speaker: n.name, text: this.dialogueLines[0] ?? "..." };
    this.mode = "dialogue";
    this.emitHud();
  }

  advanceDialogue() {
    if (!this.dialogue) {
      this.mode = "world";
      return;
    }
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      const n = NPCS.find((x) => x.id === this.dialogueNpcId);
      if (n?.isKBlanco) {
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
    this.dialogue = { speaker: this.dialogue.speaker, text: this.dialogueLines[this.dialogueIndex]! };
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
      this.burst(this.px, this.py, "#1db954");
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

  completeStep(id: string) {
    const step = this.mission.steps.find((s) => s.id === id);
    if (!step || step.done) return;
    step.done = true;
    this.sackdollars += step.reward;
    this.respect += Math.ceil(step.reward / 10);
    this.burst(this.px, this.py - 20, "#1db954");
    this.showToast(`+$${step.reward} $ackdollars · ${step.label}`);
    const next = this.mission.steps.findIndex((s) => !s.done);
    if (next === -1) {
      this.mission.complete = true;
      this.missionComplete = true;
      this.mission.activeStep = this.mission.steps.length;
      this.respect += 25;
      this.showToast("MISSION COMPLETE · Respect Power unlocked");
    } else this.mission.activeStep = next;
    this.save();
    this.emitHud();
  }

  openShop() {
    this.shopOpen = true;
    this.mode = "shop";
    this.emitHud();
  }
  closeShop() {
    this.shopOpen = false;
    this.mode = "world";
    this.emitHud();
  }

  buyItem(id: ApparelId) {
    const item = APPAREL.find((a) => a.id === id);
    if (!item) return;
    if (this.owned.includes(id)) {
      this.equipped = id;
      this.showToast(`Equipped ${item.name}`);
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
    this.burst(this.px, this.py, item.color);
    this.save();
    this.emitHud();
  }

  enterBasketball() {
    this.mode = "basketball";
    this.ball.active = true;
    this.ball.score = 0;
    this.ball.timeLeft = 45;
    this.ball.shots = 0;
    this.ball.inFlight = false;
    this.ball.charging = false;
    this.ball.power = 0;
    this.ball.flash = 0;
    this.ball.missionCredited = false;
    this.showToast("Ball up! Hold Space / Shoot, release in the green zone.");
    this.emitHud();
  }

  tryCreditBasketball() {
    const step = this.mission.steps[this.mission.activeStep];
    if (
      step?.kind === "basketball" &&
      this.ball.score >= this.ball.targetScore &&
      !step.done &&
      !this.ball.missionCredited
    ) {
      this.ball.missionCredited = true;
      this.completeStep(step.id);
      this.showToast("Respect earned. Return to HQ when ready.");
    }
  }

  exitBasketball() {
    this.tryCreditBasketball();
    const pay = this.ball.score * 5;
    if (pay > 0) {
      this.sackdollars += pay;
      this.showToast(`Court payout: +$${pay} $ackdollars`);
    }
    this.mode = "world";
    this.ball.active = false;
    this.ball.charging = false;
    this.ball.inFlight = false;
    const court = POIS.find((p) => p.id === "court")!;
    this.px = court.x + court.w / 2;
    this.py = court.y + court.h + 30;
    this.save();
    this.emitHud();
  }

  updateBasketball(dt: number) {
    this.ball.timeLeft -= dt;
    if (this.ball.flash > 0) this.ball.flash -= dt;
    if (this.ball.timeLeft <= 0) {
      this.ball.timeLeft = 0;
      this.exitBasketball();
      return;
    }
    if (this.ball.charging && !this.ball.inFlight) this.ball.power = Math.min(1, this.ball.power + dt * 0.85);
    if (this.ball.inFlight) {
      this.ball.ballX += this.ball.ballVx * dt;
      this.ball.ballY += this.ball.ballVy * dt;
      this.ball.ballVy += 520 * dt;
      const court = POIS.find((p) => p.id === "court")!;
      const hoopX = court.x + court.w / 2;
      const hoopY = court.y + 22;
      if (dist(this.ball.ballX, this.ball.ballY, hoopX, hoopY) < 24 && this.ball.ballVy > 0) {
        if (this.ball.made) {
          this.ball.score += 2;
          this.ball.flash = 0.4;
          this.burst(hoopX, hoopY, "#1db954");
          this.showToast("SWISH +2");
          this.tryCreditBasketball();
        } else {
          this.burst(hoopX, hoopY, "#e85d4c");
          this.showToast("Rim...");
        }
        this.ball.inFlight = false;
        this.ball.charging = false;
        this.ball.power = 0;
      }
      if (
        this.ball.ballY > court.y + court.h - 20 ||
        this.ball.ballX < court.x ||
        this.ball.ballX > court.x + court.w
      ) {
        this.ball.inFlight = false;
        this.ball.charging = false;
        this.ball.power = 0;
      }
    }
    const court = POIS.find((p) => p.id === "court")!;
    const tw = this.canvas.clientWidth;
    const th = this.canvas.clientHeight;
    this.camX += (court.x + court.w / 2 - tw / 2 - this.camX) * Math.min(1, 4 * dt);
    this.camY += (court.y + court.h / 2 - th / 2 - this.camY) * Math.min(1, 4 * dt);
    this.px = court.x + court.w / 2;
    this.py = court.y + court.h - 50;
    this.facing = "up";
  }

  releaseShot() {
    if (this.mode !== "basketball" || this.ball.inFlight) return;
    if (!this.ball.charging && this.ball.power <= 0) return;
    this.ball.charging = false;
    this.ball.shots++;
    const court = POIS.find((p) => p.id === "court")!;
    const hoopX = court.x + court.w / 2;
    const hoopY = court.y + 22;
    const pwr = this.ball.power;
    this.ball.made = pwr >= 0.52 && pwr <= 0.85;
    this.ball.ballX = this.px;
    this.ball.ballY = this.py - 30;
    const dx = hoopX - this.ball.ballX;
    const dy = hoopY - this.ball.ballY;
    const speed = 280 + pwr * 220;
    const ang = Math.atan2(dy, dx) - 0.35;
    this.ball.ballVx = Math.cos(ang) * speed * (0.7 + pwr * 0.5);
    this.ball.ballVy = Math.sin(ang) * speed - 180 - pwr * 80;
    if (!this.ball.made) this.ball.ballVx += (Math.random() - 0.5) * 120;
    this.ball.inFlight = true;
    this.ball.power = 0;
  }

  beginCharge() {
    if (this.mode === "basketball" && !this.ball.inFlight) {
      this.ball.charging = true;
      this.ball.power = 0;
    }
  }

  burst(x: number, y: number, color: string) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  getObjectiveTarget(): { x: number; y: number } | null {
    const step = this.mission.steps[this.mission.activeStep];
    if (!step?.target || this.mission.complete) return null;
    if (step.kind === "talk" || step.kind === "return") {
      const k = NPCS.find((n) => n.isKBlanco);
      if (k) return { x: k.x, y: k.y };
    }
    const p = POIS.find((x) => x.id === step.target);
    if (!p) return null;
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
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
    sky.addColorStop(0, "#1a2a22");
    sky.addColorStop(1, "#0a0c0b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));
    if (this.mapCanvas) ctx.drawImage(this.mapCanvas, 0, 0);
    const step = this.mission.steps[this.mission.activeStep];
    if (step?.target && !this.mission.complete) {
      const p = POIS.find((x) => x.id === step.target);
      if (p) {
        ctx.strokeStyle = "rgba(29,185,84,0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
        ctx.setLineDash([]);
        const t = performance.now() / 400;
        ctx.fillStyle = `rgba(29,185,84,${0.35 + Math.sin(t) * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y - 18, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const n of NPCS) this.drawNpc(ctx, n);
    this.drawPlayer(ctx);
    if (this.mode === "basketball" && this.ball.inFlight) {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(this.ball.ballX, this.ball.ballY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.mode === "basketball" && (this.ball.charging || this.ball.power > 0)) {
      const mw = 160;
      const mh = 14;
      const mx = w / 2 - mw / 2;
      const my = h - 120;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
      ctx.fillStyle = "#27272a";
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "rgba(29,185,84,0.35)";
      ctx.fillRect(mx + mw * 0.52, my, mw * 0.33, mh);
      ctx.fillStyle = "#1db954";
      ctx.fillRect(mx, my, mw * this.ball.power, mh);
    }
    if (this.ball.flash > 0) {
      ctx.fillStyle = `rgba(29,185,84,${this.ball.flash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.started && this.mode === "world") {
      this.drawCompass(ctx, w, h);
      this.drawMinimap(ctx, w, h);
    }
  }

  drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const target = this.getObjectiveTarget();
    if (!target) return;
    const sx = target.x - this.camX;
    const sy = target.y - this.camY;
    const margin = 48;
    const onScreen = sx > margin && sx < w - margin && sy > margin && sy < h - margin;
    if (onScreen) return;
    const cx = w / 2;
    const cy = h / 2;
    const ang = Math.atan2(target.y - this.py, target.x - this.px);
    const edgePad = 56;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    let ax = cx + cos * 1000;
    let ay = cy + sin * 1000;
    const tX = cos > 0 ? (w - edgePad - cx) / cos : cos < 0 ? (edgePad - cx) / cos : Infinity;
    const tY = sin > 0 ? (h - edgePad - cy) / sin : sin < 0 ? (edgePad - cy) / sin : Infinity;
    const t = Math.min(Math.abs(tX), Math.abs(tY));
    ax = cx + cos * t;
    ay = cy + sin * t;
    ax = clamp(ax, edgePad, w - edgePad);
    ay = clamp(ay, edgePad + 40, h - edgePad - 80);

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
    ctx.strokeStyle = "rgba(4,18,8,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const meters = Math.round(dist(this.px, this.py, target.x, target.y) / 12);
    ctx.fillStyle = "rgba(10,12,11,0.75)";
    ctx.font = "600 11px DM Sans, sans-serif";
    const label = `${meters}m`;
    const tw = ctx.measureText(label).width;
    const lx = clamp(ax - tw / 2, 8, w - tw - 8);
    const ly = clamp(ay + 22, 20, h - 20);
    ctx.fillRect(lx - 4, ly - 11, tw + 8, 16);
    ctx.fillStyle = "#1db954";
    ctx.fillText(label, lx, ly);
  }

  drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const size = Math.min(128, Math.max(96, w * 0.14));
    const pad = 12;
    const mx = pad;
    const my = h - size - pad - (w < 640 ? 100 : 8);
    const scaleX = size / WORLD_PX_W;
    const scaleY = size / WORLD_PX_H;

    ctx.fillStyle = "rgba(10,12,11,0.82)";
    ctx.beginPath();
    ctx.roundRect(mx - 3, my - 3, size + 6, size + 6, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(29,185,84,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mx, my, size, size, 10);
    ctx.clip();
    ctx.fillStyle = "#1a211c";
    ctx.fillRect(mx, my, size, size);

    // roads
    ctx.fillStyle = "#2a332c";
    ctx.fillRect(mx, my + 20 * TILE * scaleY - 2, size, 4);
    ctx.fillRect(mx + 15 * TILE * scaleX - 2, my, 4, size);
    ctx.fillRect(mx + 32 * TILE * scaleX - 2, my, 4, size);

    for (const p of POIS) {
      const step = this.mission.steps[this.mission.activeStep];
      const isTarget = step?.target === p.id;
      ctx.fillStyle = isTarget ? "#1db954" : p.color;
      const px = mx + p.x * scaleX;
      const py = my + p.y * scaleY;
      const pw = Math.max(4, p.w * scaleX);
      const ph = Math.max(4, p.h * scaleY);
      ctx.fillRect(px, py, pw, ph);
      if (isTarget) {
        const pulse = 0.4 + Math.sin(performance.now() / 250) * 0.3;
        ctx.strokeStyle = `rgba(29,185,84,${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
      }
    }

    // player
    const ppx = mx + this.px * scaleX;
    const ppy = my + this.py * scaleY;
    ctx.fillStyle = "#f2f5f3";
    ctx.beginPath();
    ctx.arc(ppx, ppy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1db954";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // facing wedge
    const fang =
      this.facing === "up"
        ? -Math.PI / 2
        : this.facing === "down"
          ? Math.PI / 2
          : this.facing === "left"
            ? Math.PI
            : 0;
    ctx.fillStyle = "#1db954";
    ctx.beginPath();
    ctx.moveTo(ppx + Math.cos(fang) * 8, ppy + Math.sin(fang) * 8);
    ctx.lineTo(ppx + Math.cos(fang + 2.5) * 4, ppy + Math.sin(fang + 2.5) * 4);
    ctx.lineTo(ppx + Math.cos(fang - 2.5) * 4, ppy + Math.sin(fang - 2.5) * 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(242,245,243,0.55)";
    ctx.font = "600 9px DM Sans, sans-serif";
    ctx.fillText("MEMPHIS", mx + 8, my + 14);
  }

  drawNpc(ctx: CanvasRenderingContext2D, n: (typeof NPCS)[0]) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(n.x, n.y + 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (n.isKBlanco && this.images.k) {
      const img = this.images.k;
      const ih = 72;
      const iw = (img.width / img.height) * ih;
      ctx.drawImage(img, n.x - iw / 2, n.y - ih + 4, iw, ih);
    } else {
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x - 12, n.y - 40, 24, 36);
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.arc(n.x, n.y - 48, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(10,12,11,0.75)";
    ctx.font = "600 11px DM Sans, sans-serif";
    const tw = ctx.measureText(n.name).width;
    ctx.fillRect(n.x - tw / 2 - 6, n.y - 78, tw + 12, 16);
    ctx.fillStyle = n.isKBlanco ? "#1db954" : "#f2f5f3";
    ctx.fillText(n.name, n.x - tw / 2, n.y - 66);
    if (this.nearNpc === n.id) {
      ctx.strokeStyle = "#1db954";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(n.x, n.y + 4, 18, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPlayer(ctx: CanvasRenderingContext2D) {
    const y = this.py + this.bob;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(this.px, this.py + 6, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const key =
      this.facing === "up"
        ? "back"
        : this.facing === "down"
          ? "front"
          : this.facing === "left"
            ? "left"
            : "right";
    const img = this.images[key];
    if (img) {
      const h = 78;
      const w = (img.width / img.height) * h;
      const sx = this.moving ? 1 + Math.sin(this.animT) * 0.04 : 1;
      const sy = this.moving ? 1 - Math.sin(this.animT) * 0.04 : 1;
      ctx.save();
      ctx.translate(this.px, y);
      ctx.scale(sx, sy);
      ctx.drawImage(img, -w / 2, -h + 4, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1db954";
      ctx.fillRect(this.px - 14, y - 48, 28, 40);
    }
    if (this.equipped && this.equipped !== "starter_tee") {
      const item = APPAREL.find((a) => a.id === this.equipped);
      if (item) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(this.px + 18, y - 60, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  getLocationName(): string {
    if (this.nearPoi) return POIS.find((p) => p.id === this.nearPoi)?.name ?? "Memphis";
    if (this.py > WORLD_PX_H - 120) return "Riverfront";
    if (this.px > WORLD_PX_W * 0.65) return "East Memphis";
    if (this.px < WORLD_PX_W * 0.35) return "West Side";
    return "Memphis Streets";
  }

  emitHud() {
    this.onHud?.(this.getHud());
  }

  getHud(): HudSnapshot {
    const step = this.mission.steps[this.mission.activeStep];
    const done = this.mission.steps.filter((s) => s.done).length;
    return {
      mode: this.mode,
      sackdollars: this.sackdollars,
      respect: this.respect,
      missionTitle: this.mission.title,
      missionStep: this.mission.complete ? "All objectives complete" : step ? step.label : "—",
      missionProgress: `${done}/${this.mission.steps.length}`,
      interactHint:
        this.mode === "world"
          ? this.interactHint
          : this.mode === "dialogue"
            ? "Tap / E to continue"
            : this.mode === "basketball"
              ? "Hold Shoot · release in green"
              : null,
      locationName: this.getLocationName(),
      dialogue: this.dialogue,
      shopOpen: this.shopOpen,
      toast: this.toast,
      equipped: this.equipped,
      owned: [...this.owned],
      basketball:
        this.mode === "basketball"
          ? {
              score: this.ball.score,
              timeLeft: Math.ceil(this.ball.timeLeft),
              shots: this.ball.shots,
              active: true,
            }
          : null,
      paused: this.paused,
      started: this.started,
      missionComplete: this.missionComplete,
    };
  }
}
