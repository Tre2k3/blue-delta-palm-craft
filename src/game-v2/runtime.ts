import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Facing, HudState, Place, Solid, V2Public } from "./core/types";
import { productionLanes, sampleLane, type Lane } from "./roads/lanes";
import { buildSlice, carBody, type SliceWorld } from "./world/slice";
import { presentVehicles } from "./world/kits/vehicles";
import { characters, frameSize } from "./assets/characters";
import { footMarker, plantFeet, seatOnGround, solePlane, solidCutout } from "./world/feet";
import {
  activityCharge,
  activityPrompt,
  cancelApproach,
  cityMission,
  crossFinish,
  freshCity,
  hookFish,
  locked,
  pullEarly,
  tickCity,
  useSpot,
  type City,
  type PlayEvent,
  type Spot,
} from "./play/city";

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
  renderer.toneMappingExposure = 1.08;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(world.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth || 1280, canvas.clientHeight || 720), 0.18, 0.42, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const player = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.scale.set(1, 0.72, 1);
  player.add(shadow);
  player.add(footMarker());
  const soft = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  soft.rotation.x = -Math.PI / 2;
  soft.position.y = 0.02;
  player.add(soft);
  const benji = frameSize(characters.benji, "front");
  const avatarMat = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: true });
  avatarMat.polygonOffset = true;
  avatarMat.polygonOffsetFactor = -2;
  avatarMat.polygonOffsetUnits = -2;
  const avatar = new THREE.Mesh(solePlane(benji.w, benji.h, benji.footPad, benji.pxH), avatarMat);
  avatar.position.y = 0;
  avatar.renderOrder = 3;
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

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 1.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: 0.7 }),
  );
  rod.position.set(0.38, 1.05, 0.05);
  rod.rotation.z = -0.7;
  rod.visible = false;
  player.add(rod);
  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe0b33a, emissive: 0xe0b33a, emissiveIntensity: 0.4 }),
  );
  bobber.visible = false;
  bobber.position.set(-16, 0.18, -81);
  world.scene.add(bobber);
  const bowlBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.4 }),
  );
  bowlBall.visible = false;
  world.scene.add(bowlBall);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.45 });
  const pinNeck = new THREE.MeshStandardMaterial({ color: 0xc4473a, roughness: 0.5 });
  const pins: THREE.Mesh[] = [];
  const pinHome: THREE.Vector3[] = [];
  const rack = [[0], [-0.26, 0.26], [-0.52, 0, 0.52], [-0.78, -0.26, 0.26, 0.78]];
  rack.forEach((row, i) => {
    row.forEach((ox) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.46, 8), pinMat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8), pinNeck);
      band.position.y = 0.08;
      pin.add(band);
      pin.position.set(92 + ox, 0.36, -29.4 - i * 0.34);
      pinHome.push(pin.position.clone());
      world.scene.add(pin);
      pins.push(pin);
    });
  });

  const textures: Partial<Record<Facing, THREE.Texture>> = {};
  let benjiWalk: THREE.Texture | null = null;
  const loader = new THREE.TextureLoader();
  for (const face of ["front", "back", "left", "right"] as const) {
    loader.load(characters.benji.views[face].src, (tex) => {
      solidCutout(tex);
      textures[face] = tex;
      if (face === facing) applyBenji(face);
    });
  }
  const benjiStride = characters.benji.views.walk;
  if (benjiStride) {
    loader.load(benjiStride.src, (tex) => {
      solidCutout(tex);
      benjiWalk = tex;
    });
  }
  let moving = false;
  let walkDist = 0;
  let glideX = 0;
  let glideZ = 0;

  const lanes = productionLanes();
  const cars = spawnTraffic(world, lanes);
  const keys = new Set<string>();
  const pulses = new Map<string, number>();
  let interactQueued = false;
  let touchX = 0;
  let touchY = 0;
  let night = false;
  let golden = false;
  const cycleLight = () => {
    if (!night && !golden) golden = true;
    else if (golden) {
      golden = false;
      night = true;
    } else {
      night = false;
    }
  };
  let place: Place = "street";
  let dollars = 240;
  let respect = 12;
  let made = 0;
  let taken = 0;
  let mission = "Walk the block to SackReligious HQ";
  let metK = false;
  let carrying = false;
  let delivered = false;
  let hauntTicket = false;
  let hauntCleared = false;
  let dialogue = "";
  let facing: Facing = "back";
  let camYaw = Math.PI / 2;
  let camDist: number | null = null;
  let camHeight: number | null = null;
  let camLookY: number | null = null;
  let charge = 0;
  let charging = false;
  let interactHeld = false;
  let ballHeld = false;
  let pinBall: THREE.Vector3 | null = null;
  let logOpen = false;
  const city: City = freshCity();
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
      bait?: number;
      fit?: City["fit"];
      fed?: boolean;
      fished?: boolean;
      bowled?: boolean;
      raced?: boolean;
      bestBowl?: number;
      bestRace?: number;
      hauntTicket?: boolean;
      hauntCleared?: boolean;
    } | null;
    if (saved && Number.isFinite(saved.dollars)) dollars = saved.dollars!;
    if (saved && Number.isFinite(saved.respect)) respect = saved.respect!;
    if (saved?.carrying) carrying = true;
    if (saved?.delivered) delivered = true;
    if (saved?.mission) mission = saved.mission;
    if (saved && Number.isFinite(saved.bait)) city.bait = saved.bait!;
    if (saved?.fit) city.fit = saved.fit;
    if (saved?.fed) city.fed = true;
    if (saved?.fished) city.fished = true;
    if (saved?.bowled) city.bowled = true;
    if (saved?.raced) city.raced = true;
    if (saved && Number.isFinite(saved.bestBowl)) city.bestBowl = saved.bestBowl!;
    if (saved && Number.isFinite(saved.bestRace)) city.bestRace = saved.bestRace!;
    if (saved?.hauntTicket) hauntTicket = true;
    if (saved?.hauntCleared) hauntCleared = true;
  } catch {
    /* fresh slice */
  }

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const code = e.code || e.key;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyN", "KeyE", "KeyM", "ShiftLeft", "ShiftRight"].includes(code) || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    const names = [code, e.key].filter(Boolean);
    if (down) names.forEach((name) => keys.add(name));
    else names.forEach((name) => keys.delete(name));
    if (down && (code === "KeyN" || e.key === "n" || e.key === "N")) cycleLight();
    if (down && (code === "KeyM" || e.key === "m" || e.key === "M")) logOpen = !logOpen;
  };
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);

  const api: V2Public = { x: player.position.x, y: player.position.y, z: player.position.z, facing, place, cars: [], dollars, respect, mission, carrying, dialogue };
  (window as unknown as { __SACK_V2__?: V2Public }).__SACK_V2__ = api;

  let hudAcc = 0;
  let last = performance.now();
  let frame = 0;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        dollars, respect, carrying, delivered, mission,
        bait: city.bait, fit: city.fit, fed: city.fed, fished: city.fished, bowled: city.bowled, raced: city.raced,
        bestBowl: city.bestBowl, bestRace: city.bestRace, hauntTicket, hauntCleared,
      }));
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
      charge: place === "court" ? charge : activityCharge(city),
      night,
      golden,
      made,
      taken,
      dialogue,
      carrying,
      x: player.position.x,
      z: player.position.z,
      fit: city.fit,
      bait: city.bait,
      boost: city.boost > 0,
      log: logOpen,
      marks: { fish: city.fished, bowl: city.bowled, food: city.fed, race: city.raced },
      bestBowl: city.bestBowl,
      bestRace: city.bestRace,
    };
  }

  function promptFor() {
    const live = activityPrompt(city);
    if (live) return live;
    if (place === "street" && near(world.homeDoor, 1.4)) return "E  Enter home";
    if (place === "street" && near(world.hqDoor, 1.6)) return "E  Enter SackReligious";
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) return "E  Leave home";
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) return "E  Leave HQ";
    if (place === "hq" && nearLocal(world.kAnchor, 2.2, 80, 200)) return delivered ? "E  Talk to K Blanco" : "E  Talk to K Blanco";
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) return "E  Change fit";
    if (near(world.courtOg, 1.8)) return carrying ? "E  Deliver to Court OG" : "E  Talk to Court OG";
    if (place === "street" && near(world.districts.bowlDoor, 2.4)) return "E  Roll at 901 Bowl";
    if (place === "street" && near(world.districts.pier, 2.2)) return city.bait > 0 ? "E  Cast (bait on)" : "E  Cast a line";
    if (place === "street" && near(world.districts.bait, 2.2)) return "E  Buy bait  $15";
    if (place === "street" && near(world.districts.meetStart, 2.6)) return "E  Run the strip";
    if (place === "street" && near(world.districts.truckOrder, 2.4)) return "E  Order at the window";
    if (place === "street" && near(world.haunt.ticket, 1.8)) return hauntTicket ? "E  Ticket punched" : "E  Buy a ticket  $10";
    if (place === "street" && near(world.haunt.gate, 1.8)) return hauntTicket ? "E  Enter the house" : "E  Need a ticket";
    if (place === "haunt" && nearLocal(world.haunt.exit, 1.5, 0, 500)) return "E  Leave the house";
    if (place === "court") return ballHeld ? "Hold to shoot" : "E  Pick up ball";
    if (namedPed(1.7)) return "E  Talk";
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
    const busy = locked(city);
    const right = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const forward = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const steer = right + touchX;
    const basis = cameraBasis();
    const sx = right + touchX;
    const sy = forward + touchY;
    const len = Math.hypot(sx, sy);
    const wantsMove = !busy && len > 0.15;
    if (wantsMove) {
      const ax = Math.abs(sx);
      const az = Math.abs(sy);
      if (ax > az * 1.2) facing = sx > 0 ? "right" : "left";
      else if (az > ax * 1.2) facing = sy > 0 ? "back" : "front";
      camDist = null;
      camHeight = null;
      camLookY = null;
    }
    const walkSpeed = 6.4;
    const sprintSpeed = 10.2;
    let speed = 0;
    if (wantsMove) {
      speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? sprintSpeed : walkSpeed) * Math.min(1, len);
      if (city.race) speed = city.fit === "night" ? 11.4 : 9.4;
      else if (city.fit === "night") speed *= 1.12;
      if (city.boost > 0) speed *= 1.22;
    }
    const wishX = wantsMove ? ((basis.right.x * sx + basis.fwd.x * sy) / len) * speed : 0;
    const wishZ = wantsMove ? ((basis.right.z * sx + basis.fwd.z * sy) / len) * speed : 0;
    const follow = 1 - Math.exp(-(wantsMove ? 7.5 : 9) * dt);
    glideX += (wishX - glideX) * follow;
    glideZ += (wishZ - glideZ) * follow;
    if (!wantsMove && Math.hypot(glideX, glideZ) < 0.06) {
      glideX = 0;
      glideZ = 0;
    }
    player.position.x += glideX * dt;
    player.position.z += glideZ * dt;
    const glide = Math.hypot(glideX, glideZ);
    moving = glide > 0.32;
    if (moving) walkDist += glide * dt;
    if (wantsMove) camYaw = dampAngle(camYaw, Math.atan2(wishX, wishZ), 1 - Math.exp(-2.6 * dt));
    const zone = collisionZone();
    resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    if (city.bowl) {
      player.position.x = 92;
      player.position.z = -17.6;
    }
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
    const play = tickCity(city, dt, hold, steer);
    if (play) grant(play);
    if (!city.bowl && /901 Bowl|on the lane/.test(dialogue)) {
      dialogue = "";
      talkLeft = 0;
    }
    if (talkLeft > 0) {
      talkLeft -= dt;
      if (talkLeft <= 0) dialogue = "";
    }
    if (city.race && player.position.x > -19.5 && player.position.z < -33 && player.position.z > -40.2) {
      const finish = crossFinish(city);
      if (finish) grant(finish);
    }
    rod.visible = Boolean(city.fish);
    bobber.visible = Boolean(city.fish);
    if (city.fish) bobber.position.y = 0.16 + Math.sin(performance.now() / 180) * 0.04;
    presentBowl(dt);
    if (place === "haunt" && !hauntCleared) {
      const room = world.haunt.finalRoom;
      if (player.position.x > room.minX && player.position.x < room.maxX && player.position.z > room.minZ && player.position.z < room.maxZ) {
        hauntCleared = true;
        respect += 8;
        say("Final court — You walked the house. The last rim is lit.", 4.2);
        mission = delivered ? mission : "The haunted house let you through.";
      }
    }
    updatePlace();
    updateBall(dt, hold, interact);
    updateTraffic(dt);
    updatePeds(dt);
    faceAvatar();
    placeCamera(dt);
    composer.render();

    api.x = player.position.x;
    api.y = player.position.y;
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
    if (place === "haunt") return { solids: world.solids.haunt, ox: 0, oz: 500 };
    return { solids: world.solids.street, ox: 0, oz: 0 };
  }

  function tryEnter() {
    if (city.fish) {
      grant(city.fish.phase === "bite" ? hookFish(city) : pullEarly(city));
      return;
    }
    if (city.bowl?.phase === "aim") {
      grant(cancelApproach(city));
      resetPins();
      return;
    }
    if (place === "haunt" && nearLocal(world.haunt.exit, 1.5, 0, 500)) {
      place = "street";
      player.position.set(world.haunt.out.x, 0, world.haunt.out.z);
      return;
    }
    if (place === "street" && near(world.haunt.ticket, 1.8)) {
      if (hauntTicket) say("Tickets — You're already on the list. Gate's open.");
      else if (dollars < 10) say("Tickets — Ten SackDollars. You're short.");
      else {
        dollars -= 10;
        hauntTicket = true;
        say("Tickets — Wristband's on. Don't touch the portraits.");
      }
      return;
    }
    if (place === "street" && near(world.haunt.gate, 1.8)) {
      if (!hauntTicket) {
        say("Gate — Ticket first. Booth is on the left.");
        return;
      }
      place = "haunt";
      player.position.set(world.haunt.inside.x, 0, world.haunt.inside.z);
      say("Foyer — Eleven rooms. The last one still has a rim.");
      return;
    }
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
    if (place === "hq" && nearLocal(world.kAnchor, 2.2, 80, 200)) {
      metK = true;
      if (delivered) {
        say("K Blanco — Court OG got the drop. The block is yours until the next one.");
      } else {
        carrying = true;
        say("K Blanco — Take this drop to Court OG. He is outside the 901 court. SackDollars and Respect when it lands.", 5.5);
        mission = "Deliver the package to Court OG";
      }
      return;
    }
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) {
      grant(useSpot(city, "wardrobe", dollars));
      return;
    }
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) {
      place = "street";
      player.position.set(world.hqOut.x, 0, world.hqOut.z);
      return;
    }
    if (place === "street" && near(world.districts.bowlDoor, 2.4)) {
      const play = useSpot(city, "bowl", dollars);
      if (play.teleport) {
        player.position.set(play.teleport.x, 0, play.teleport.z);
        resetPins();
      }
      grant(play);
      return;
    }
    if (place === "street" && near(world.districts.pier, 2.2)) {
      grant(useSpot(city, "pier", dollars));
      return;
    }
    if (place === "street" && near(world.districts.bait, 2.2)) {
      grant(useSpot(city, "bait", dollars));
      return;
    }
    if (place === "street" && near(world.districts.meetStart, 2.6)) {
      const play = useSpot(city, "meet", dollars);
      if (play.teleport) player.position.set(play.teleport.x, 0, play.teleport.z);
      grant(play);
      return;
    }
    if (place === "street" && near(world.districts.truckOrder, 2.4)) {
      grant(useSpot(city, "truck", dollars));
      return;
    }
    if (near(world.courtOg, 1.8)) {
      if (carrying) {
        carrying = false;
        delivered = true;
        dollars += 80;
        respect += 10;
        dialogue = "Court OG — Drop's in. Eighty SackDollars, and that's Respect.";
        talkLeft = 4.8;
        mission = "Delivery complete. The 901 court is open.";
        const next = cityMission(city, true);
        if (next) mission = next;
      } else if (delivered) {
        dialogue = "Court OG — We good. The 901 is open.";
        talkLeft = 4.2;
      } else {
        dialogue = "Court OG — K said a drop was coming. You holding it?";
        talkLeft = 4.2;
      }
      return;
    }
    const who = namedPed(1.7);
    if (who && place === "street") grant(useSpot(city, who, dollars));
  }

  let talkLeft = 0;

  function say(line: string, seconds = 4.2) {
    dialogue = line;
    talkLeft = line ? seconds : 0;
  }

  function grant(play: PlayEvent) {
    if (play.dollars) dollars = Math.max(0, dollars + play.dollars);
    if (play.respect) respect += play.respect;
    if (play.dialogue != null) say(play.dialogue, play.dialogue.includes(" — ") ? 4.2 : 2.6);
    if (play.mission && delivered) mission = play.mission;
    if (play.pins != null) knockPins(play.pins);
  }

  function namedPed(r: number): Spot | null {
    let best: Spot | null = null;
    let bestD = r;
    for (const ped of world.pedestrians) {
      const id = (ped.userData.asset as { id?: string } | undefined)?.id;
      const spot = id === "mama-dee" ? "mama" : id === "unc-j" ? "unc" : id === "nitro" ? "nitro" : id === "strike" ? "strike" : null;
      if (!spot) continue;
      const d = Math.hypot(player.position.x - ped.position.x, player.position.z - ped.position.z);
      if (d < bestD) {
        bestD = d;
        best = spot;
      }
    }
    return best;
  }

  function resetPins() {
    pins.forEach((pin, i) => {
      const home = pinHome[i];
      if (!home) return;
      pin.position.copy(home);
      pin.rotation.set(0, 0, 0);
      pin.visible = true;
    });
    bowlBall.visible = false;
  }

  function knockPins(count: number) {
    pins.forEach((pin, i) => {
      if (i >= count) return;
      pin.rotation.z = i % 2 === 0 ? 1.15 : -1.15;
      pin.position.y = 0.16;
      pin.position.z -= 0.18;
    });
  }

  function presentBowl(dt: number) {
    const bowl = city.bowl;
    if (!bowl) {
      bowlBall.visible = false;
      return;
    }
    const laneX = 92;
    const startZ = -18.15;
    const pinZ = -29.3;
    bowlBall.visible = true;
    if (bowl.phase === "aim") {
      bowlBall.position.set(laneX + bowl.aim * 0.42, 0.2, startZ);
      bowlBall.rotation.set(0, 0, 0);
      return;
    }
    const duration = bowl.phase === "roll" ? 1.65 : 0;
    const t = bowl.phase === "roll" ? 1 - Math.max(0, bowl.left) / duration : 1;
    bowlBall.position.set(laneX + bowl.aim * (0.42 + t * 0.85), 0.2, startZ + (pinZ - startZ) * t);
    bowlBall.rotation.x -= dt * 16;
  }

  function updatePlace() {
    world.home.visible = place === "home";
    world.hq.visible = place === "hq";
    world.exterior.visible = place === "street" || place === "court";
    world.haunt.group.visible = place === "haunt";
    for (const light of world.haunt.lights) light.visible = place === "haunt";
    for (const light of world.homeLights) light.visible = place === "home";
    for (const light of world.hqLights) light.visible = place === "hq";
    if (place === "home" || place === "hq" || place === "haunt") return;
    const onCourt = player.position.x > 55.2 && player.position.x < 76.8 && player.position.z < -15.1 && player.position.z > -28.9;
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
        if (city.fit === "court") {
          ballVel.x += (dx / dist) * 1.4;
          ballVel.z += (dz / dist) * 1.4;
        }
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
      car.mesh.position.set(sample.x, 0.06, sample.z);
      car.mesh.rotation.y = sample.yaw;
      if (car.speed > 0) {
        const moved = Math.atan2(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z);
        if (Math.hypot(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z) > 0.001) car.mesh.rotation.y = moved;
      }
    }
  }

  function updatePeds(dt: number) {
    for (const ped of world.pedestrians) {
      const route = ped.userData.route as
        | { pts: { x: number; z: number }[]; i: number; dir: number; speed: number; phase: number; wait?: number; gait?: number }
        | undefined;
      if (route && !ped.userData.idle) {
        const target = route.pts[route.i];
        if ((route.wait ?? 0) > 0) {
          route.wait = (route.wait ?? 0) - dt;
          route.gait = (route.gait ?? 0) * Math.exp(-7 * dt);
        } else if (target) {
          const dx = target.x - ped.position.x;
          const dz = target.z - ped.position.z;
          const dist = Math.hypot(dx, dz);
          const brake = 1.4;
          const want = dist < brake ? route.speed * Math.max(0.18, dist / brake) : route.speed;
          const gait = route.gait ?? 0;
          const next = gait + (want - gait) * (1 - Math.exp(-3.2 * dt));
          route.gait = next;
          if (dist <= 0.2 && next < route.speed * 0.45) {
            ped.position.x = target.x;
            ped.position.z = target.z;
            route.gait = 0;
            route.i += route.dir;
            if (route.i < 0 || route.i >= route.pts.length) {
              route.dir *= -1;
              route.i += route.dir * 2;
              route.i = Math.max(0, Math.min(route.pts.length - 1, route.i));
            }
            route.wait = 1.15 + ((ped.id % 5) + 1) * 0.22;
          } else if (dist > 0.02 && next > 0.02) {
            const step = Math.min(dist, next * dt);
            ped.position.x += (dx / dist) * step;
            ped.position.z += (dz / dist) * step;
            aimHeading(ped, Math.atan2(dx, dz), dt, 6);
            route.phase += step / 0.78;
          }
        }
      }
      ped.userData.life = ((ped.userData.life as number) ?? ped.id) + dt;
      ped.userData.gait = route && !ped.userData.idle ? (route.gait ?? 0) : 0;
      faceCompany(ped, dt);
    }
    for (const board of world.billboards) {
      if (!world.pedestrians.includes(board as THREE.Group)) faceCompany(board, dt);
    }
  }

  function aimHeading(ped: THREE.Object3D, aim: number, dt: number, sharp: number) {
    const cur = (ped.userData.heading as number) ?? aim;
    ped.userData.heading = dampAngle(cur, aim, 1 - Math.exp(-sharp * dt));
  }

  function faceCompany(ped: THREE.Object3D, dt: number) {
    const route = ped.userData.route as { wait?: number } | undefined;
    const movingAlong = Boolean(route) && !ped.userData.idle && (route?.wait ?? 0) <= 0 && ((ped.userData.gait as number) ?? 0) > 0.2;
    if (movingAlong) return;
    const life = (ped.userData.life as number) ?? 0;
    const partner = ped.userData.partner as THREE.Object3D | undefined;
    if (partner) {
      const aim = Math.atan2(partner.position.x - ped.position.x, partner.position.z - ped.position.z) + Math.sin(life * 1.5) * 0.1;
      aimHeading(ped, aim, dt, 3);
      return;
    }
    const look = ped.userData.look as { x: number; z: number } | undefined;
    if (look) {
      aimHeading(ped, Math.atan2(look.x - ped.position.x, look.z - ped.position.z), dt, 2.4);
      return;
    }
    if (!route) return;
    let best: THREE.Object3D | null = null;
    let bestD = 3.6;
    for (const other of world.billboards) {
      if (other === ped) continue;
      const d = Math.hypot(other.position.x - ped.position.x, other.position.z - ped.position.z);
      if (d < bestD) {
        bestD = d;
        best = other;
      }
    }
    if (best) aimHeading(ped, Math.atan2(best.position.x - ped.position.x, best.position.z - ped.position.z), dt, 3);
  }

  function applyBenji(face: Facing) {
    const mat = avatar.material as THREE.MeshBasicMaterial;
    const stride =
      face === "front" &&
      benjiStride &&
      benjiWalk &&
      moving &&
      ((walkDist / 0.78) % 1) > 0.2 &&
      ((walkDist / 0.78) % 1) < 0.62;
    if (stride && benjiStride && benjiWalk) {
      if (avatar.userData.face !== "walk") {
        const h = characters.benji.height;
        const w = h * (benjiStride.pxW / benjiStride.pxH);
        avatar.geometry.dispose();
        avatar.geometry = solePlane(w, h, benjiStride.footPad, benjiStride.pxH);
        avatar.position.y = 0;
        avatar.userData.face = "walk";
        mat.map = benjiWalk;
        mat.needsUpdate = true;
      }
      return;
    }
    const tex = textures[face];
    if (!tex) return;
    const size = frameSize(characters.benji, face);
    if (mat.map !== tex || avatar.userData.face === "walk") {
      mat.map = tex;
      mat.needsUpdate = true;
      avatar.geometry.dispose();
      avatar.geometry = solePlane(size.w, size.h, size.footPad, size.pxH);
      avatar.position.y = 0;
      avatar.userData.face = face;
    }
  }

  function presentScale(_host: THREE.Object3D) {
    return 1;
  }

  function applyCard(sprite: THREE.Object3D, host: THREE.Object3D) {
    const mesh = sprite as THREE.Mesh;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const asset = host.userData.asset as
      | {
          height: number;
          views: { front: { src: string; pxW: number; pxH: number; footPad: number } } & Partial<
            Record<Facing, { pxW: number; pxH: number; footPad: number }>
          >;
        }
      | undefined;
    const tex = host.userData.tex as Partial<Record<Facing, THREE.Texture>> | undefined;
    const heading = (host.userData.heading as number) ?? Math.PI;
    const toCam = yawTo(host, camera.position);
    let rel = toCam - heading;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const abs = Math.abs(rel);
    let face: Facing = "front";
    if (asset?.views.back && tex?.back) {
      face = abs < 0.75 ? "front" : abs > 2.35 ? "back" : rel > 0 ? "left" : "right";
      if (!tex[face]) face = "front";
    }
    const route = host.userData.route as { phase?: number } | undefined;
    const gait = (host.userData.gait as number) ?? 0;
    const phase = route?.phase ?? 0;
    const frac = ((phase % 1) + 1) % 1;
    const stepping = gait > 0.28 && frac > 0.18 && frac < 0.62;
    const walkTex = host.userData.walkTex as THREE.Texture | undefined;
    const walkView = host.userData.walkView as { pxW: number; pxH: number; footPad: number } | undefined;
    if (stepping && walkTex && walkView && asset) {
      if (mesh.userData.face !== "walk") {
        const h = asset.height;
        const w = h * (walkView.pxW / walkView.pxH);
        mesh.geometry.dispose();
        mesh.geometry = solePlane(w, h, walkView.footPad, walkView.pxH);
        mesh.position.y = 0;
        mesh.userData.face = "walk";
        mat.map = walkTex;
        mat.needsUpdate = true;
      }
    } else if (tex?.[face] && mesh.userData.face !== face) {
      const view = asset!.views[face] ?? asset!.views.front;
      const h = asset!.height;
      const w = h * (view.pxW / view.pxH);
      mesh.geometry.dispose();
      mesh.geometry = solePlane(w, h, view.footPad, view.pxH);
      mesh.position.y = 0;
      mesh.userData.face = face;
      mat.map = tex[face]!;
      mat.needsUpdate = true;
    }
    mesh.rotation.z = 0;
    seatOnGround(mesh, host, camera.position);
    const s = presentScale(host);
    mesh.scale.set(s, s, 1);
    const turnaround = Boolean(tex?.back && tex?.left && tex?.right);
    let cardYaw = toCam;
    if (!turnaround) {
      let rel = heading - toCam;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const limit = 1.25;
      if (rel > limit) rel = limit;
      else if (rel < -limit) rel = -limit;
      cardYaw = toCam + rel;
    }
    mesh.rotation.y = cardYaw - host.rotation.y;
    const life = (host.userData.life as number) ?? 0;
    if (gait > 0.28) {
      const cycle = phase * Math.PI * 2;
      const sway = Math.sin(cycle) * 0.045;
      const sideX = Math.cos(heading);
      const sideZ = -Math.sin(heading);
      mesh.position.x += sideX * sway;
      mesh.position.z += sideZ * sway;
      mesh.rotation.z = Math.sin(cycle) * 0.04;
    } else {
      const sway = Math.sin(life * 1.35) * 0.016;
      mesh.position.x += sway;
      mesh.rotation.z = Math.sin(life * 1.35) * 0.012;
    }
  }

  function faceAvatar() {
    const debug = Boolean((window as Window & { __SACK_CHARACTER_DEBUG__?: boolean }).__SACK_CHARACTER_DEBUG__);
    plantFeet(player);
    const playerMark = player.getObjectByName("foot-debug");
    if (playerMark) playerMark.visible = debug;
    applyBenji(facing);
    avatar.rotation.x = 0;
    avatar.rotation.z = 0;
    avatar.rotation.y = yawTo(avatar, camera.position);
    seatOnGround(avatar, player, camera.position);
    avatar.scale.set(presentScale(player), presentScale(player), 1);
    if (moving) {
      const cycle = (walkDist / 0.78) * Math.PI * 2;
      const sway = Math.sin(cycle) * 0.04;
      avatar.position.x += Math.cos(camYaw) * sway;
      avatar.position.z += -Math.sin(camYaw) * sway;
      avatar.rotation.z = Math.sin(cycle) * 0.04;
    }
    for (const board of world.billboards) {
      plantFeet(board);
      const mark = board.getObjectByName("foot-debug");
      if (mark) mark.visible = debug;
      const sprite = board.getObjectByName("sprite");
      if (!sprite) continue;
      sprite.rotation.x = 0;
      sprite.rotation.z = 0;
      applyCard(sprite, board);
    }
    const kHost = kSprite.parent ?? kSprite;
    plantFeet(kHost);
    const kMark = kHost.getObjectByName("foot-debug");
    if (kMark) kMark.visible = debug;
    kSprite.rotation.x = 0;
    kSprite.rotation.z = 0;
    applyCard(kSprite, kHost);
    presentVehicles(camera.position);
  }

  function placeCamera(dt: number) {
    if (city.bowl) {
      const aim = city.bowl.aim;
      avatar.visible = false;
      player.position.set(92, 0, -17.6);
      camera.position.set(92, 1.05, -17.15);
      camera.lookAt(92 + aim * 0.7, 0.16, -23.5);
      camYaw = Math.PI;
      return;
    }
    avatar.visible = true;
    const lookX = Math.sin(camYaw);
    const lookZ = Math.cos(camYaw);
    const talking = place === "hq" && dialogue.startsWith("K Blanco");
    const inside = place === "home" || place === "hq" || place === "haunt";
    const dist = camDist ?? (talking ? 3.35 : place === "haunt" ? 2.7 : inside ? 3.5 : 3.85);
    const height = camHeight ?? (talking ? 1.5 : inside ? 1.68 : 1.58);
    const side = talking ? 1.8 : 0;
    let destX = player.position.x - lookX * dist + lookZ * side;
    let destZ = player.position.z - lookZ * dist - lookX * side;
    if (place === "haunt") {
      const zone = collisionZone();
      const pulled = pullCamera(player.position.x, player.position.z, destX, destZ, zone.solids, zone.ox, zone.oz);
      destX = pulled.x;
      destZ = pulled.z;
    }
    const destY = player.position.y + height;
    camera.position.x += (destX - camera.position.x) * (1 - Math.exp(-4 * dt));
    camera.position.y += (destY - camera.position.y) * (1 - Math.exp(-4 * dt));
    camera.position.z += (destZ - camera.position.z) * (1 - Math.exp(-4 * dt));
    const ahead = talking ? 0.35 : 1.15;
    const lookY = player.position.y + (camLookY ?? (talking ? 1.12 : 1.22));
    camera.lookAt(player.position.x + lookX * ahead, lookY, player.position.z + lookZ * ahead);
  }

  function applyNight() {
    const outside = place === "street" || place === "court";
    world.sun.intensity = night ? 0.16 : golden ? 2.05 : outside ? 2.7 : 0.85;
    world.sun.color.set(night ? 0x1c2838 : golden ? 0xff8a3c : 0xfff1d6);
    world.sun.position.set(golden ? -46 : -22, golden ? 8.5 : 32, golden ? 18 : 14);
    world.hemi.intensity = night ? 0.34 : golden ? 0.48 : outside ? 0.72 : 0.7;
    world.hemi.color.set(night ? 0x243044 : golden ? 0xffc48a : 0xcfe6ff);
    world.hemi.groundColor.set(night ? 0x14110e : golden ? 0x6a4528 : 0x5d7a48);
    renderer.toneMappingExposure = night ? 0.92 : golden ? 1.16 : 1.08;
    bloom.strength = night ? 0.42 : golden ? 0.24 : 0.16;
    world.scene.background = night ? world.skyNight : golden ? world.skyGolden : world.skyDay;
    const fog = world.scene.fog as THREE.Fog;
    fog.color.setHex(night ? 0x12161e : golden ? 0xe7c4a0 : 0xc5d4e2);
    fog.near = night ? 18 : golden ? 14 : 26;
    fog.far = night ? 78 : golden ? 68 : 92;
    const hqDay = world.exterior.getObjectByName("hq-plate-day");
    const hqNight = world.exterior.getObjectByName("hq-plate-night");
    if (hqDay) hqDay.visible = !night || !hqNight;
    if (hqNight) hqNight.visible = night;
    for (const lamp of world.lamps) lamp.intensity = night ? 28 : golden ? 10 : 0;
    for (const lamp of world.courtLights) lamp.intensity = night ? 36 : golden ? 8 : 0;
    for (const light of world.homeLights) light.intensity = place === "home" ? 18 : 0;
    for (const light of world.hqLights) light.intensity = place === "hq" ? 26 : 0;
    for (const light of world.haunt.lights) light.intensity = place === "haunt" ? 18 : 0;
    for (const mat of world.headlightMats) mat.emissiveIntensity = night ? 3.1 : golden ? 1.4 : 0.35;
    for (const mat of world.glowMats) mat.emissiveIntensity = night ? 2.2 : golden ? 0.9 : 0.28;
    const tint = night ? 0xb7c7d8 : golden ? 0xffc898 : place === "hq" ? 0xffd2a8 : place === "home" ? 0xffe4c4 : 0xfff3e4;
    for (const mat of world.figureMats) mat.color.set(tint);
    (avatar.material as THREE.MeshBasicMaterial).color.set(tint);
  }

  world.pedestrians.forEach((ped, i) => {
    ped.userData.base = ped.position.x;
    ped.userData.t = i * 1.7;
  });
  camera.position.set(player.position.x - 3.85, 1.58, player.position.z);
  camera.lookAt(player.position.x + 1.15, 1.22, player.position.z);

  const touchApi = {
    setStick(x: number, y: number) {
      touchX = x;
      touchY = y;
    },
    setCharge(next: boolean) {
      charging = next;
    },
    press(code: string) {
      if (code === "KeyE") {
        interactQueued = true;
        return;
      }
      keys.add(code);
      pulses.set(code, 12);
    },
    toggleNight() {
      cycleLight();
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
      golden?: boolean;
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
      height?: number;
      lookY?: number;
    }) {
      if (opts.dollars != null) dollars = opts.dollars;
      if (opts.respect != null) respect = opts.respect;
      if (opts.mission != null) mission = opts.mission;
      if (opts.dialogue != null) dialogue = opts.dialogue;
      if (opts.carrying != null) carrying = opts.carrying;
      if (opts.delivered != null) delivered = opts.delivered;
      if (opts.golden) {
        golden = true;
        night = false;
      } else if (opts.night != null) {
        night = opts.night;
        golden = false;
      }
      if (opts.facing) facing = opts.facing;
      city.fish = null;
      city.bowl = null;
      city.race = null;
      rod.visible = false;
      bobber.visible = false;
      bowlBall.visible = false;
      if (opts.place === "home") {
        place = "home";
        player.position.set(opts.x ?? 0, 0, opts.z ?? 201.2);
      } else if (opts.place === "hq") {
        place = "hq";
        player.position.set(opts.x ?? 80.4, 0, opts.z ?? 203.4);
      } else if (opts.place === "haunt") {
        place = "haunt";
        player.position.set(opts.x ?? 4, 0, opts.z ?? 501.6);
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
        camDist = opts.dist ?? null;
        camHeight = opts.height ?? null;
        camLookY = opts.lookY ?? null;
        const lookX = Math.sin(camYaw);
        const lookZ = Math.cos(camYaw);
        const inside = place === "home" || place === "hq" || place === "haunt";
        const dist = camDist ?? (inside ? 3.5 : 3.85);
        const height = camHeight ?? (inside ? 1.68 : 1.58);
        plantFeet(player);
        let camX = player.position.x - lookX * dist;
        let camZ = player.position.z - lookZ * dist;
        if (place === "haunt") {
          const zone = collisionZone();
          const pulled = pullCamera(player.position.x, player.position.z, camX, camZ, zone.solids, zone.ox, zone.oz);
          camX = pulled.x;
          camZ = pulled.z;
        }
        camera.position.set(camX, player.position.y + height, camZ);
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
    peds() {
      return world.pedestrians.map((ped) => ({
        id: (ped.userData.asset as { id?: string } | undefined)?.id ?? "?",
        x: Math.round(ped.position.x * 10) / 10,
        y: Math.round(ped.position.y * 1000) / 1000,
        z: Math.round(ped.position.z * 10) / 10,
      }));
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
    mesh.position.set(sample.x, 0.06, sample.z);
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

function pullCamera(px: number, pz: number, destX: number, destZ: number, solids: { minX: number; maxX: number; minZ: number; maxZ: number }[], ox: number, oz: number) {
  const dx = destX - px;
  const dz = destZ - pz;
  const len = Math.hypot(dx, dz) || 1;
  let keep = 0.7;
  for (let t = 0.7; t <= len; t += 0.18) {
    const x = px + (dx / len) * t;
    const z = pz + (dz / len) * t;
    let blocked = false;
    for (const solid of solids) {
      if (x > solid.minX + ox - 0.2 && x < solid.maxX + ox + 0.2 && z > solid.minZ + oz - 0.2 && z < solid.maxZ + oz + 0.2) {
        blocked = true;
        break;
      }
    }
    if (blocked) break;
    keep = t;
  }
  return { x: px + (dx / len) * Math.min(keep, len), z: pz + (dz / len) * Math.min(keep, len) };
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
