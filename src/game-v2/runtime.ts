import * as THREE from "three";
import type { Facing, HudState, Place, Solid, V2Public } from "./core/types";
import { productionLanes, sampleLane, type Lane } from "./roads/lanes";
import { buildSlice, carBody, type SliceWorld } from "./world/slice";

type Car = { lane: number; s: number; speed: number; mesh: THREE.Group };

const SAVE_KEY = "sack-v2";
let activeStop: (() => void) | null = null;

export function startSackV2(canvas: HTMLCanvasElement, push: (hud: HudState) => void): () => void {
  activeStop?.();
  const world = buildSlice();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 160);
  const player = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  player.add(shadow);
  const avatar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 1.78),
    new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.55, roughness: 0.86, side: THREE.DoubleSide }),
  );
  avatar.position.y = 0.89;
  avatar.castShadow = true;
  player.add(avatar);
  const carried = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.4, metalness: 0.55 }),
  );
  carried.position.set(0.32, 0.78, 0.12);
  carried.visible = false;
  player.add(carried);
  world.scene.add(player);

  const kSprite = world.kSprite;

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.55 }));
  ball.castShadow = true;
  ball.position.set(world.hoop.x + 4, 0.16, world.hoop.z);
  world.scene.add(ball);

  const textures: Partial<Record<Facing, THREE.Texture>> = {};
  const walk: Record<Facing, THREE.Texture[]> = { front: [], back: [], left: [], right: [] };
  const loader = new THREE.TextureLoader();
  for (const face of ["front", "back", "left", "right"] as const) {
    loader.load(`/game/benji-${face}.webp`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      textures[face] = tex;
      if (face === "front") (avatar.material as THREE.MeshStandardMaterial).map = tex;
      (avatar.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });
    for (let frame = 1; frame <= 4; frame++) {
      loader.load(`/game/benji/walk-${face}-${frame}.webp`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        walk[face][frame - 1] = tex;
      });
    }
  }
  let moving = false;
  let walkTime = 0;

  const lanes = productionLanes();
  const cars = spawnTraffic(world, lanes);
  const keys = new Set<string>();
  const pulses = new Map<string, number>();
  let interactQueued = false;
  let touchX = 0;
  let touchY = 0;
  let night = false;
  let place: Place = "street";
  let dollars = 240;
  let respect = 12;
  let made = 0;
  let taken = 0;
  let mission = "Walk the block to SackReligious HQ";
  let metK = false;
  let carrying = false;
  let delivered = false;
  let dialogue = "";
  let facing: Facing = "back";
  let camYaw = Math.PI / 2;
  let charge = 0;
  let charging = false;
  let interactHeld = false;
  let ballHeld = false;
  let pinBall: THREE.Vector3 | null = null;
  const ballVel = new THREE.Vector3();
  player.position.set(-30.2, 0, 5.55);

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as {
      dollars?: number;
      respect?: number;
      carrying?: boolean;
      delivered?: boolean;
      mission?: string;
      dialogue?: string;
    } | null;
    if (saved && Number.isFinite(saved.dollars)) dollars = saved.dollars!;
    if (saved && Number.isFinite(saved.respect)) respect = saved.respect!;
    if (saved?.carrying) carrying = true;
    if (saved?.delivered) delivered = true;
    if (saved?.mission) mission = saved.mission;
    if (saved?.dialogue) dialogue = saved.dialogue;
  } catch {
    /* fresh slice */
  }

  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyN", "KeyE", "ShiftLeft"].includes(e.code)) e.preventDefault();
    if (down) keys.add(e.code);
    else keys.delete(e.code);
    if (down && e.code === "KeyN") night = !night;
  };
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);

  const api: V2Public = { x: player.position.x, z: player.position.z, facing, place, cars: [], dollars, respect, mission, carrying, dialogue };
  (window as unknown as { __SACK_V2__?: V2Public }).__SACK_V2__ = api;

  let hudAcc = 0;
  let last = performance.now();
  let frame = 0;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    resize();

    const hold = keys.has("Space") || charging;
    for (const [code, left] of pulses) {
      if (left <= 1) {
        pulses.delete(code);
        keys.delete(code);
      } else pulses.set(code, left - 1);
    }
    const interact = keys.has("KeyE");
    const interactEdge = interactQueued || (interact && !interactHeld);
    interactQueued = false;
    interactHeld = interact;
    step(dt, hold, interactEdge);
    if (!hold) charging = false;

    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      push(hud());
      localStorage.setItem(SAVE_KEY, JSON.stringify({ dollars, respect, carrying, delivered, mission, dialogue }));
    }
  };
  frame = requestAnimationFrame(loop);
  push(hud());

  function hud(): HudState {
    return {
      place,
      dollars,
      respect,
      mission,
      prompt: promptFor(),
      charge: place === "court" ? charge : 0,
      night,
      made,
      taken,
      dialogue,
      carrying,
      x: player.position.x,
      z: player.position.z,
    };
  }

  function promptFor() {
    if (place === "street" && near(world.homeDoor, 1.4)) return "E  Enter home";
    if (place === "street" && near(world.hqDoor, 1.6)) return "E  Enter SackReligious";
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) return "E  Leave home";
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) return "E  Leave HQ";
    if (place === "hq" && nearLocal(world.kAnchor, 1.55, 80, 200)) return delivered ? "E  Talk to K Blanco" : "E  Talk to K Blanco";
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) return "E  Open wardrobe";
    if (near(world.courtOg, 1.8)) return carrying ? "E  Deliver to Court OG" : "E  Talk to Court OG";
    if (place === "court") return ballHeld ? "Hold to shoot" : "E  Pick up ball";
    return "";
  }

  function near(p: { x: number; z: number }, r: number) {
    return Math.hypot(player.position.x - p.x, player.position.z - p.z) < r;
  }

  function nearLocal(p: { x: number; z: number }, r: number, ox: number, oz: number) {
    return Math.hypot(player.position.x - (p.x + ox), player.position.z - (p.z + oz)) < r;
  }

  function step(dt: number, hold: boolean, interact: boolean) {
    applyNight();
    const basis = cameraBasis();
    const sx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) + touchX;
    const sy = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0) + touchY;
    const len = Math.hypot(sx, sy);
    moving = len > 0.15;
    if (moving) walkTime += dt;
    if (moving) {
      facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? "right" : "left") : sy > 0 ? "back" : "front";
      const speed = (keys.has("ShiftLeft") ? 6.4 : 4.1) * Math.min(1, len);
      const mx = (basis.right.x * sx + basis.fwd.x * sy) / len * speed;
      const mz = (basis.right.z * sx + basis.fwd.z * sy) / len * speed;
      player.position.x += mx * dt;
      player.position.z += mz * dt;
      const yaw = Math.atan2(mx, mz);
      camYaw = dampAngle(camYaw, yaw, 1 - Math.exp(-2.2 * dt));
    }
    const zone = collisionZone();
    resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    for (const car of cars) {
      const dx = player.position.x - car.mesh.position.x;
      const dz = player.position.z - car.mesh.position.z;
      const reach = (car.mesh.userData.radius as number) || 2.2;
      const d = Math.hypot(dx, dz);
      if (place === "street" && d < reach && d > 0.001) {
        player.position.x += (dx / d) * (reach - d);
        player.position.z += (dz / d) * (reach - d);
      }
    }
    carried.visible = carrying;
    world.counterPack.visible = !carrying && !delivered;

    if (interact) tryEnter();
    updatePlace();
    updateBall(dt, hold, interact);
    updateTraffic(dt);
    updatePeds(dt);
    faceAvatar();
    placeCamera(dt);
    renderer.render(world.scene, camera);

    api.x = player.position.x;
    api.z = player.position.z;
    api.facing = facing;
    api.place = place;
    api.cars = cars.map((car) => ({
      x: car.mesh.position.x,
      z: car.mesh.position.z,
      yaw: car.mesh.rotation.y,
      speed: car.speed,
    }));
    api.dollars = dollars;
    api.respect = respect;
    api.mission = mission;
    api.carrying = carrying;
    api.dialogue = dialogue;
  }

  function cameraBasis() {
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const fwd = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).multiplyScalar(-1);
    right.y = 0;
    fwd.y = 0;
    if (right.lengthSq() < 1e-4) right.set(0, 0, 1);
    if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0);
    right.normalize();
    fwd.normalize();
    return { right, fwd };
  }

  function collisionZone(): { solids: Solid[]; ox: number; oz: number } {
    if (place === "home") return { solids: world.solids.home, ox: 0, oz: 200 };
    if (place === "hq") return { solids: world.solids.hq, ox: 80, oz: 200 };
    return { solids: world.solids.street, ox: 0, oz: 0 };
  }

  function tryEnter() {
    if (place === "street" && near(world.homeDoor, 1.4)) {
      place = "home";
      player.position.set(world.homeIn.x, 0, 201.2);
      return;
    }
    if (place === "street" && near(world.hqDoor, 1.6)) {
      place = "hq";
      player.position.set(80, 0, 201.4);
      mission = metK ? mission : "Talk to K Blanco";
      return;
    }
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) {
      place = "street";
      player.position.set(world.homeOut.x, 0, world.homeOut.z);
      return;
    }
    if (place === "hq" && nearLocal(world.kAnchor, 1.55, 80, 200)) {
      metK = true;
      if (delivered) {
        dialogue = "K Blanco — Court OG got the drop. The block is yours until the next one.";
      } else {
        carrying = true;
        dialogue = "K Blanco — Take this drop to Court OG. He is outside the 901 court. SackDollars and Respect when it lands.";
        mission = "Deliver the package to Court OG";
      }
      return;
    }
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) {
      dialogue = "Wardrobe — Default fit stays on. Hat, chain, cross, and the green kicks.";
      return;
    }
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) {
      place = "street";
      player.position.set(world.hqOut.x, 0, world.hqOut.z);
      return;
    }
    if (near(world.courtOg, 1.8)) {
      if (carrying) {
        carrying = false;
        delivered = true;
        dollars += 80;
        respect += 10;
        dialogue = "Court OG — Drop's in. Eighty SackDollars, and that's Respect.";
        mission = "Delivery complete. The 901 court is open.";
      } else if (delivered) {
        dialogue = "Court OG — We good. The 901 is open.";
      } else {
        dialogue = "Court OG — K said a drop was coming. You holding it?";
      }
    }
  }

  function updatePlace() {
    world.home.visible = place === "home";
    world.hq.visible = place === "hq";
    world.exterior.visible = place === "street" || place === "court";
    for (const light of world.homeLights) light.visible = place === "home";
    for (const light of world.hqLights) light.visible = place === "hq";
    if (place === "home" || place === "hq") return;
    const onCourt = player.position.x > 41.2 && player.position.x < 62.8 && player.position.z < -15.1 && player.position.z > -28.9;
    place = onCourt ? "court" : "street";
  }

  function updateBall(dt: number, hold: boolean, interact: boolean) {
    if (place !== "court") {
      charge = 0;
      return;
    }
    if (pinBall) {
      ball.position.copy(pinBall);
      ballVel.set(0, 0, 0);
      return;
    }
    if (ballHeld) {
      ball.position.set(player.position.x, 1.05, player.position.z);
      ballVel.set(0, 0, 0);
      if (hold) charge = Math.min(1, charge + dt / 0.85);
      else if (charge > 0.02) {
        const dx = world.hoop.x - player.position.x;
        const dz = world.hoop.z - player.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const power = 4.2 + charge * 7.5;
        ballVel.set((dx / dist) * power, 4.2 + charge * 4.8, (dz / dist) * power);
        ballHeld = false;
        taken += 1;
        charge = 0;
      } else charge = 0;
      return;
    }
    ballVel.y -= 12 * dt;
    ball.position.addScaledVector(ballVel, dt);
    for (const board of world.backboards) {
      const hitting = ball.position.y > board.minY && ball.position.y < board.maxY && ball.position.z > board.minZ && ball.position.z < board.maxZ;
      if (hitting && Math.abs(ball.position.x - board.x) < 0.28 && Math.sign(ballVel.x) === -board.nx) {
        ballVel.x *= -0.62;
        ball.position.x = board.x + board.nx * 0.22;
      }
    }
    for (const hoop of world.hoops) {
      const rimDx = ball.position.x - hoop.x;
      const rimDz = ball.position.z - hoop.z;
      if (ballVel.y < 0 && ball.position.y < hoop.y + 0.2 && ball.position.y > hoop.y - 0.15 && Math.hypot(rimDx, rimDz) < 0.42) {
        made += 1;
        respect += 5;
        dollars += 25;
        mission = "Bucket. The 901 felt that.";
        ballHeld = true;
        charge = 0;
        return;
      }
    }
    if (ball.position.y < 0.16) {
      ball.position.y = 0.16;
      if (Math.abs(ballVel.y) < 1.4) ballVel.set(0, 0, 0);
      else ballVel.y *= -0.45;
      ballVel.x *= 0.7;
      ballVel.z *= 0.7;
    }
    if (interact && ball.position.distanceTo(player.position) < 1.6) ballHeld = true;
  }

  function updateTraffic(dt: number) {
    const junction = { x: 8, z: 0 };
    for (const car of cars) {
      const lane = lanes[car.lane]!;
      let blocked = false;
      if (lane.id === "cross") {
        const here = sampleLane(lane, car.s);
        if (Math.hypot(here.x - junction.x, here.z - junction.z) < 7) {
          blocked = cars.some((other) => other.lane === 0 && Math.hypot(other.mesh.position.x - junction.x, other.mesh.position.z - junction.z) < 6);
        }
      }
      const ahead = cars.find((other) => other !== car && other.lane === car.lane && gapAhead(lane, car.s, other.s) < 11);
      car.speed = blocked || ahead ? 0 : lane.id === "cross" ? 5.2 : 7.4;
      if (!blocked && !ahead) car.s += car.speed * dt;
      const sample = sampleLane(lane, car.s);
      const prev = car.mesh.position.clone();
      car.mesh.position.set(sample.x, 0, sample.z);
      car.mesh.rotation.y = sample.yaw;
      if (car.speed > 0) {
        const moved = Math.atan2(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z);
        if (Math.hypot(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z) > 0.001) car.mesh.rotation.y = moved;
      }
    }
  }

  function updatePeds(dt: number) {
    world.pedestrians.forEach((ped, i) => {
      const span = 8;
      const speed = 0.6 + (i % 3) * 0.15;
      const base = ped.userData.base as number;
      ped.userData.t = ((ped.userData.t as number) + dt * speed) % (span * 2);
      const t = ped.userData.t as number;
      const along = t < span ? t : span * 2 - t;
      ped.position.x = base + along - span / 2;
    });
  }

  function faceAvatar() {
    const mat = avatar.material as THREE.MeshStandardMaterial;
    const frames = walk[facing].filter(Boolean);
    const movingTex = moving && frames.length === 4 ? frames[Math.floor(walkTime / 0.14) % 4] : undefined;
    const tex = movingTex || textures[facing];
    if (tex && mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    avatar.rotation.x = 0;
    avatar.rotation.z = 0;
    avatar.rotation.y = yawTo(avatar, camera.position);
    for (const board of world.billboards) {
      const sprite = board.getObjectByName("sprite");
      if (!sprite) continue;
      sprite.rotation.x = 0;
      sprite.rotation.z = 0;
      sprite.rotation.y = yawTo(board, camera.position);
    }
    kSprite.rotation.x = 0;
    kSprite.rotation.z = 0;
    kSprite.rotation.y = yawTo(kSprite, camera.position);
  }

  function placeCamera(dt: number) {
    const lookX = Math.sin(camYaw);
    const lookZ = Math.cos(camYaw);
    const inside = place === "home" || place === "hq";
    const dist = inside ? 3.15 : 8.2;
    const height = inside ? 2.05 : 3.5;
    const destX = player.position.x - lookX * dist;
    const destZ = player.position.z - lookZ * dist;
    const destY = player.position.y + height;
    camera.position.x += (destX - camera.position.x) * (1 - Math.exp(-4 * dt));
    camera.position.y += (destY - camera.position.y) * (1 - Math.exp(-4 * dt));
    camera.position.z += (destZ - camera.position.z) * (1 - Math.exp(-4 * dt));
    camera.lookAt(player.position.x + lookX * 2.2, 1.15, player.position.z + lookZ * 2.2);
  }

  function applyNight() {
    const outside = place === "street" || place === "court";
    world.sun.intensity = night ? 0.5 : outside ? 5.5 : 1.15;
    world.hemi.intensity = night ? 0.85 : 2.15;
    world.scene.background = night ? world.skyNight : world.skyDay;
    (world.scene.fog as THREE.Fog).color.setHex(night ? 0x1a140e : 0xb7d4ef);
    for (const lamp of world.lamps) lamp.intensity = night ? 16 : 0;
    for (const lamp of world.courtLights) lamp.intensity = night ? 24 : 0;
    for (const light of world.homeLights) light.intensity = place === "home" ? 16 : 0;
    for (const light of world.hqLights) light.intensity = place === "hq" ? 18 : 0;
    for (const mat of world.headlightMats) mat.emissiveIntensity = night ? 2.6 : 0.45;
    for (const mat of world.glowMats) mat.emissiveIntensity = night ? 1.45 : 0.16;
  }

  world.pedestrians.forEach((ped, i) => {
    ped.userData.base = ped.position.x;
    ped.userData.t = i * 1.7;
  });
  camera.position.set(player.position.x - 8, 3.6, player.position.z);
  camera.lookAt(player.position.x + 4, 1.2, player.position.z);

  const touchApi = {
    setStick(x: number, y: number) {
      touchX = x;
      touchY = y;
    },
    setCharge(next: boolean) {
      charging = next;
    },
    press(code: string) {
      keys.add(code);
      pulses.set(code, 12);
      if (code === "KeyE") interactQueued = true;
    },
    toggleNight() {
      night = !night;
    },
    setPos(x: number, z: number, yaw?: number) {
      this.setShot({ x, z, yaw });
    },
    setShot(opts: {
      x?: number;
      z?: number;
      yaw?: number;
      facing?: Facing;
      night?: boolean;
      place?: Place;
      carrying?: boolean;
      delivered?: boolean;
      dialogue?: string;
      mission?: string;
      dollars?: number;
      respect?: number;
      ballHeld?: boolean;
      ballAt?: { x: number; y: number; z: number };
      dist?: number;
    }) {
      if (opts.dollars != null) dollars = opts.dollars;
      if (opts.respect != null) respect = opts.respect;
      if (opts.mission != null) mission = opts.mission;
      if (opts.dialogue != null) dialogue = opts.dialogue;
      if (opts.carrying != null) carrying = opts.carrying;
      if (opts.delivered != null) delivered = opts.delivered;
      if (opts.night != null) night = opts.night;
      if (opts.facing) facing = opts.facing;
      if (opts.place === "home") {
        place = "home";
        player.position.set(opts.x ?? 0, 0, opts.z ?? 201.2);
      } else if (opts.place === "hq") {
        place = "hq";
        player.position.set(opts.x ?? 80.4, 0, opts.z ?? 203.4);
      } else if (opts.x != null && opts.z != null) {
        player.position.set(opts.x, 0, opts.z);
        place = "street";
      }
      updatePlace();
      if (opts.place === "court") place = "court";
      if (opts.ballHeld != null) ballHeld = opts.ballHeld;
      if (opts.ballAt) {
        ballHeld = false;
        pinBall = new THREE.Vector3(opts.ballAt.x, opts.ballAt.y, opts.ballAt.z);
        ball.position.copy(pinBall);
        ballVel.set(0, 0, 0);
        place = "court";
      } else pinBall = null;
      if (opts.yaw != null) {
        camYaw = opts.yaw;
        const lookX = Math.sin(camYaw);
        const lookZ = Math.cos(camYaw);
        const inside = place === "home" || place === "hq";
        const dist = opts.dist ?? (inside ? 3.15 : 8.2);
        const height = inside ? 2.05 : 3.5;
        camera.position.set(player.position.x - lookX * dist, player.position.y + height, player.position.z - lookZ * dist);
      }
      carried.visible = carrying;
      world.counterPack.visible = !carrying && !delivered;
      applyNight();
      updatePlace();
      api.x = player.position.x;
      api.z = player.position.z;
      api.facing = facing;
      api.place = place;
      api.dollars = dollars;
      api.respect = respect;
      api.mission = mission;
      api.carrying = carrying;
      api.dialogue = dialogue;
      push(hud());
    },
  };
  (window as unknown as { __SACK_V2_INPUT__?: typeof touchApi }).__SACK_V2_INPUT__ = touchApi;

  const stop = () => {
    if (activeStop === stop) activeStop = null;
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("resize", resize);
    renderer.dispose();
  };
  activeStop = stop;
  return stop;
}

function ballTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d3542c";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(20, 0);
  g.bezierCurveTo(40, 40, 40, 88, 20, 128);
  g.moveTo(128, 0);
  g.bezierCurveTo(100, 40, 100, 88, 128, 128);
  g.moveTo(0, 64);
  g.lineTo(256, 64);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function spawnTraffic(world: SliceWorld, lanes: Lane[]): Car[] {
  const cars: Car[] = [];
  const spec = [
    { lane: 0, s: 8 },
    { lane: 0, s: 28 },
    { lane: 0, s: 52 },
    { lane: 0, s: 78 },
    { lane: 0, s: 110 },
    { lane: 1, s: 4 },
    { lane: 1, s: 22 },
    { lane: 1, s: 40 },
  ];
  spec.forEach((item, i) => {
    const mesh = carBody((["sedan", "sedan", "suv", "sedan", "van", "suv", "sedan", "sedan"] as const)[i]!);
    const lamps = mesh.userData.headlights as THREE.MeshStandardMaterial[] | undefined;
    if (lamps) world.headlightMats.push(...lamps);
    const sample = sampleLane(lanes[item.lane]!, item.s);
    mesh.position.set(sample.x, 0, sample.z);
    mesh.rotation.y = sample.yaw;
    world.exterior.add(mesh);
    cars.push({ lane: item.lane, s: item.s, speed: 7, mesh });
  });
  return cars;
}

function yawTo(obj: THREE.Object3D, cam: THREE.Vector3) {
  const pos = obj.getWorldPosition(new THREE.Vector3());
  return Math.atan2(cam.x - pos.x, cam.z - pos.z);
}

function gapAhead(lane: Lane, from: number, other: number) {
  return (other - from + lane.total) % lane.total;
}

function resolve(pos: THREE.Vector3, radius: number, solids: Solid[], ox: number, oz: number) {
  for (let pass = 0; pass < 3; pass++) {
    for (const solid of solids) {
      const minX = solid.minX + ox - radius;
      const maxX = solid.maxX + ox + radius;
      const minZ = solid.minZ + oz - radius;
      const maxZ = solid.maxZ + oz + radius;
      if (pos.x < minX || pos.x > maxX || pos.z < minZ || pos.z > maxZ) continue;
      const left = pos.x - minX;
      const right = maxX - pos.x;
      const back = pos.z - minZ;
      const front = maxZ - pos.z;
      const min = Math.min(left, right, back, front);
      if (min === left) pos.x = minX;
      else if (min === right) pos.x = maxX;
      else if (min === back) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
}

function dampAngle(current: number, target: number, amount: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * amount;
}
