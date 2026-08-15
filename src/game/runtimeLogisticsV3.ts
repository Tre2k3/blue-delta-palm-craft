// @ts-nocheck
import * as THREE from "three";
import { POIS, PLAYER_RUN, PLAYER_SPEED } from "./data";
import { ensureWorldRuntimeFixes } from "./runtimeFixesV2";

const S = 1 / 16;
const wx = (x) => x * S;
const wz = (y) => y * S;

const APARTMENT = { cx: -3200, cy: -3200, halfW: 112, halfD: 86, doorW: 34 };
const roomGroups = new WeakMap();
const namedNpcRigs = new WeakMap();
const courtDecorated = new WeakSet();

const blockers = [
  { x: APARTMENT.cx - 92, y: APARTMENT.cy - 60, w: 70, h: 46 },
  { x: APARTMENT.cx + 52, y: APARTMENT.cy - 68, w: 46, h: 30 },
  { x: APARTMENT.cx + 64, y: APARTMENT.cy + 4, w: 34, h: 52 },
];

function circleRect(x, y, r, q) {
  const nx = Math.max(q.x, Math.min(x, q.x + q.w));
  const ny = Math.max(q.y, Math.min(y, q.y + q.h));
  return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
}

function m(color, roughness = 0.78, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function limb(material, radius, length) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 8), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

function makePerson(id, index = 0) {
  const base = [
    { skin: 0x6f402c, shirt: 0x1f6b3d, pants: 0x253649, shoes: 0xf2eee4 },
    { skin: 0x925a3d, shirt: 0x222222, pants: 0x30343a, shoes: 0xe8e3da },
    { skin: 0x593526, shirt: 0xe6e0d7, pants: 0x26384d, shoes: 0x171717 },
    { skin: 0xa46a49, shirt: 0x703e2d, pants: 0x26282d, shoes: 0xeee9df },
    { skin: 0x75452f, shirt: 0x263d5c, pants: 0x20262d, shoes: 0xf1ede6 },
    { skin: 0x8d573c, shirt: 0x4e5f34, pants: 0x24282d, shoes: 0x151515 },
  ];
  const roles = {
    k_blanco: { skin: 0x9f6546, shirt: 0x161412, pants: 0x171717, shoes: 0xe8e2d8, hair: 0xf7f0df, gold: true },
    court_coach: { skin: 0x75452f, shirt: 0x111111, pants: 0x202327, shoes: 0xf2eee4, hat: 0x181818, gold: true },
    supporter_1: { skin: 0x7e4b33, shirt: 0xf0ece4, pants: 0x26384d, shoes: 0xf2eee4, hat: 0x1a1a1a },
    downtown_fan: { skin: 0x5d3829, shirt: 0x1f6b3d, pants: 0x20262d, shoes: 0xf1eee7, gold: true },
    culture_host: { skin: 0x8d5438, shirt: 0x202020, pants: 0x181818, shoes: 0xd8d2c7 },
    street_npc: { skin: 0x70402e, shirt: 0x525960, pants: 0x253649, shoes: 0xede8df },
    beale_dj: { skin: 0x5e3526, shirt: 0x171717, pants: 0x202020, shoes: 0xe5dfd6, hat: 0x111111, gold: true },
  };
  const look = { ...base[index % base.length], ...(roles[id] ?? {}) };
  const skin = m(look.skin, 0.7);
  const shirt = m(look.shirt, 0.84);
  const pants = m(look.pants, 0.88);
  const shoeMat = m(look.shoes, 0.74);
  const hair = m(look.hair ?? 0x151311, 0.95);
  const gold = m(0xd4af37, 0.28, 0.7);

  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.28), shirt);
  torso.position.y = 0.98;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 12), skin);
  head.scale.set(0.92, 1.06, 0.9);
  head.position.y = 1.56;
  head.castShadow = true;
  g.add(head);
  const capHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  capHair.position.y = 1.64;
  capHair.castShadow = true;
  g.add(capHair);

  const la = limb(skin, 0.058, 0.54);
  la.position.set(-0.28, 1.22, 0);
  la.rotation.z = 0.08;
  g.add(la);
  const ra = limb(skin, 0.058, 0.54);
  ra.position.set(0.28, 1.22, 0);
  ra.rotation.z = -0.08;
  g.add(ra);
  const ll = limb(pants, 0.087, 0.59);
  ll.position.set(-0.11, 0.69, 0);
  g.add(ll);
  const rl = limb(pants, 0.087, 0.59);
  rl.position.set(0.11, 0.69, 0);
  g.add(rl);

  for (const x of [-0.11, 0.11]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.09, 0.31), shoeMat);
    shoe.position.set(x, 0.09, 0.06);
    shoe.castShadow = true;
    g.add(shoe);
  }

  if (look.hat !== undefined) {
    const hm = m(look.hat, 0.65);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), hm);
    crown.position.y = 1.79;
    g.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.035, 0.14), hm);
    brim.position.set(0, 1.755, 0.18);
    g.add(brim);
  }
  if (look.gold) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 7, 18), gold);
    chain.rotation.x = Math.PI / 2;
    chain.position.set(0, 1.25, 0.15);
    g.add(chain);
  }
  if (id === "k_blanco") {
    const curlGeo = new THREE.SphereGeometry(0.076, 8, 7);
    for (const [x, y, z] of [[-0.18, 1.71, 0.03], [-0.1, 1.79, 0.08], [0, 1.81, 0.08], [0.11, 1.77, 0.04], [0.18, 1.7, 0]]) {
      const curl = new THREE.Mesh(curlGeo, hair);
      curl.position.set(x, y, z);
      g.add(curl);
    }
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  g.add(shadow);
  g.userData.leftArm = la;
  g.userData.rightArm = ra;
  g.userData.leftLeg = ll;
  g.userData.rightLeg = rl;
  return g;
}

function buildApartment(world) {
  if (roomGroups.has(world)) return roomGroups.get(world);
  const g = new THREE.Group();
  const cx = wx(APARTMENT.cx);
  const cz = wz(APARTMENT.cy);
  const w = wx(APARTMENT.halfW * 2);
  const d = wz(APARTMENT.halfD * 2);
  const wall = m(0x201a17, 0.92);
  const green = m(0x1f6b3d, 0.72);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), m(0x2d251f, 0.82));
  floor.position.set(cx, 0.02, cz);
  floor.receiveShadow = true;
  g.add(floor);

  const wh = 3.0;
  const north = new THREE.Mesh(new THREE.BoxGeometry(w, wh, 0.16), wall);
  north.position.set(cx, wh / 2, cz - d / 2);
  g.add(north);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, wh, d), wall);
  side.position.set(cx - w / 2, wh / 2, cz);
  g.add(side);
  const side2 = side.clone();
  side2.position.x = cx + w / 2;
  g.add(side2);
  const dw = wx(APARTMENT.doorW);
  const sw = (w - dw) / 2;
  const sl = new THREE.Mesh(new THREE.BoxGeometry(sw, wh, 0.16), wall);
  sl.position.set(cx - dw / 2 - sw / 2, wh / 2, cz + d / 2);
  g.add(sl);
  const sr = sl.clone();
  sr.position.x = cx + dw / 2 + sw / 2;
  g.add(sr);
  const head = new THREE.Mesh(new THREE.BoxGeometry(dw, 0.52, 0.17), green);
  head.position.set(cx, 2.74, cz + d / 2);
  g.add(head);

  const bedBase = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.42, 2.5), m(0x171717, 0.86));
  bedBase.position.set(cx - 4.35, 0.28, cz - 3.2);
  g.add(bedBase);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.16, 2.3), green);
  blanket.position.set(cx - 4.35, 0.58, cz - 3.2);
  g.add(blanket);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.64), m(0xece5db, 0.96));
  pillow.position.set(cx - 5.45, 0.7, cz - 3.78);
  g.add(pillow);

  const dresser = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.88, 1.05), m(0x3b2b20, 0.84));
  dresser.position.set(cx + 4.35, 0.45, cz - 3.5);
  g.add(dresser);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.43), m(0x111111, 0.3, 0.2));
  phone.position.set(cx + 4.35, 0.91, cz - 3.5);
  g.add(phone);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.7, 8), green);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(cx + 4.25, 1.85, cz + 0.55);
  g.add(rail);
  for (let i = 0; i < 5; i++) {
    const tee = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.08), m(i % 2 ? 0x171717 : 0x1f6b3d, 0.88));
    tee.position.set(cx + 3.25 + i * 0.48, 1.42, cz + 0.55);
    g.add(tee);
  }

  const window = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 1.55), new THREE.MeshStandardMaterial({ color: 0x6e3926, emissive: 0xb96134, emissiveIntensity: 0.4 }));
  window.position.set(cx, 1.8, cz - d / 2 + 0.09);
  g.add(window);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.2), green);
  sill.position.set(cx, 1.0, cz - d / 2 + 0.14);
  g.add(sill);

  const light = new THREE.PointLight(0xffc878, 2.6, 13, 2);
  light.position.set(cx, 2.65, cz);
  g.add(light);
  const exit = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 28), new THREE.MeshBasicMaterial({ color: 0x1db954, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  exit.rotation.x = -Math.PI / 2;
  exit.position.set(cx, 0.08, cz + d / 2 - 0.58);
  g.add(exit);

  g.visible = false;
  world.scene.add(g);
  roomGroups.set(world, g);
  return g;
}

function textTexture(lines) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const q = c.getContext("2d");
  q.fillStyle = "#11100f";
  q.fillRect(0, 0, c.width, c.height);
  q.strokeStyle = "#d4af37";
  q.lineWidth = 18;
  q.strokeRect(10, 10, c.width - 20, c.height - 20);
  q.textAlign = "center";
  q.textBaseline = "middle";
  q.fillStyle = "#f5f1e8";
  q.font = "900 132px Arial Black, sans-serif";
  q.fillText(lines[0], c.width / 2, 185);
  q.fillStyle = "#d4af37";
  q.font = "900 118px Arial Black, sans-serif";
  q.fillText(lines[1], c.width / 2, 340);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function decorateCourt(world) {
  if (courtDecorated.has(world)) return;
  courtDecorated.add(world);
  const court = POIS.find((p) => p.id === "court");
  if (!court) return;
  const cx = wx(court.x + court.w / 2);
  const cz = wz(court.y + court.h / 2);
  const cw = wx(court.w);
  const cd = wz(court.h);
  const g = new THREE.Group();
  const dark = m(0x171411, 0.75);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x4c3208, emissiveIntensity: 0.18, roughness: 0.52 });
  const cream = m(0xeee7dc, 0.78);

  const surface = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.965, cd * 0.965), dark);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(cx, 0.126, cz);
  surface.receiveShadow = true;
  g.add(surface);

  const line = (w, d, x, z, material = gold) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), material);
    a.position.set(x, 0.154, z);
    g.add(a);
  };
  line(cw * 0.91, 0.055, cx, cz - cd * 0.44);
  line(cw * 0.91, 0.055, cx, cz + cd * 0.44);
  line(0.055, cd * 0.88, cx - cw * 0.455, cz);
  line(0.055, cd * 0.88, cx + cw * 0.455, cz);
  line(cw * 0.91, 0.04, cx, cz, cream);
  const circle = new THREE.Mesh(new THREE.RingGeometry(1.16, 1.24, 48), gold);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(cx, 0.16, cz);
  g.add(circle);

  const logo = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.55), new THREE.MeshBasicMaterial({ map: textTexture(["SACKROW", "BALLERS"]), toneMapped: false }));
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(cx, 0.166, cz);
  g.add(logo);

  for (const [z, rot] of [[cz - cd * 0.34, 0], [cz + cd * 0.34, Math.PI]]) {
    const word = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: textTexture(["SACKROW", "BALLERS"]), toneMapped: false }));
    word.rotation.x = -Math.PI / 2;
    word.rotation.z = rot;
    word.position.set(cx, 0.168, z);
    g.add(word);
  }
  world.scene.add(g);
}

function installEngine(GameEngine) {
  const p = GameEngine.prototype;
  if (p.__logisticsV3Installed) return;
  p.__logisticsV3Installed = true;
  const start = p.start;
  const move = p.updatePlayer;
  const proximity = p.updateProximity;
  const interact = p.tryInteract;
  const missionAuto = p.checkMissionAuto;
  const getHud = p.getHud;

  p.start = function startV3(fresh = false) {
    start.call(this, fresh);
    const step = this.mission?.steps?.[this.mission.activeStep];
    if (step?.id === "wake" && !step.done) {
      this.mode = "interior";
      this.__interiorKind = "apartment";
      this.px = APARTMENT.cx;
      this.py = APARTMENT.cy - 4;
      this.vx = 0;
      this.vy = 0;
      this.yaw = Math.PI;
      this.facing = "down";
      this.dir = "down";
      this.leftSpawn = false;
      this.cinematic = null;
      this.letterbox = 0;
      this.__interiorAtDoor = false;
      this.interactHint = "Head to the front door";
      this.showToast?.("NEW MISSION · THE DROP DAY", 2.5);
      this.emitHud?.();
    }
  };

  p.updatePlayer = function moveV3(dt, mx, my, runHeld) {
    if (this.mode !== "interior" || this.__interiorKind !== "apartment") return move.call(this, dt, mx, my, runHeld);
    const f = this.fwd();
    const r = this.right();
    const len = Math.hypot(mx, my);
    let dx = 0;
    let dy = 0;
    if (len > 0.01) {
      mx /= len;
      my /= len;
      dx = mx * r.x + -my * f.x;
      dy = mx * r.y + -my * f.y;
      this.moving = true;
    } else this.moving = false;
    const speed = runHeld ? PLAYER_RUN * 0.82 : PLAYER_SPEED * 0.86;
    this.vx = dx * speed;
    this.vy = dy * speed;
    if (Math.abs(this.vx) > Math.abs(this.vy) && Math.abs(this.vx) > 1) this.facing = this.vx < 0 ? "left" : "right";
    else if (Math.abs(this.vy) > 1) this.facing = this.vy < 0 ? "up" : "down";
    this.dir = this.facing;

    const rad = 13;
    const minX = APARTMENT.cx - APARTMENT.halfW + 14;
    const maxX = APARTMENT.cx + APARTMENT.halfW - 14;
    const minY = APARTMENT.cy - APARTMENT.halfD + 14;
    const maxY = APARTMENT.cy + APARTMENT.halfD - 8;
    let nx = Math.max(minX, Math.min(maxX, this.px + this.vx * dt));
    let ny = Math.max(minY, Math.min(maxY, this.py + this.vy * dt));
    if (blockers.some((q) => circleRect(nx, this.py, rad, q))) nx = this.px;
    if (blockers.some((q) => circleRect(this.px, ny, rad, q))) ny = this.py;
    this.px = nx;
    this.py = ny;
    this.animT += dt * (this.moving ? 9 : 2);
    this.bob = this.moving ? Math.sin(this.animT * 2) * 3 : Math.sin(this.animT) * 0.5;
  };

  p.updateProximity = function proximityV3() {
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      this.__interiorAtDoor = Math.abs(this.px - APARTMENT.cx) < APARTMENT.doorW * 0.72 && this.py > APARTMENT.cy + APARTMENT.halfD - 40;
      this.nearPoi = "apartment";
      this.nearNpc = null;
      this.interactHint = this.__interiorAtDoor ? "Leave Benji's Apartment" : "Head to the front door";
      return;
    }
    proximity.call(this);
  };

  p.checkMissionAuto = function missionAutoV3() {
    if (this.mode === "interior") return;
    missionAuto.call(this);
  };

  p.tryInteract = function interactV3() {
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      if (!this.__interiorAtDoor) {
        this.showToast?.("Head to the front door to step into Memphis.", 1.5);
        return;
      }
      const apt = POIS.find((q) => q.id === "apartment");
      if (!apt) return;
      this.mode = "world";
      this.__interiorKind = null;
      this.px = apt.x + apt.w / 2;
      this.py = apt.y + apt.h + 76;
      this.vx = 0;
      this.vy = 0;
      this.leftSpawn = true;
      const step = this.mission?.steps?.[this.mission.activeStep];
      if (step?.id === "wake" && !step.done) this.completeStep?.("wake");
      this.updateProximity?.();
      this.showToast?.("Memphis is open. Link up with K Blanco at HQ.", 2.8);
      this.emitHud?.();
      return;
    }
    interact.call(this);
  };

  p.getHud = function hudV3() {
    const hud = getHud.call(this);
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      hud.mode = "world";
      hud.interactHint = this.interactHint;
      hud.locationName = "Benji's Apartment";
      hud.district = "West Side";
    }
    return hud;
  };
}

function installWorld(World3D) {
  const p = World3D.prototype;
  if (p.__logisticsV3Installed) return;
  p.__logisticsV3Installed = true;

  p.ensurePeds = function ensurePedsV3(n) {
    while (this.peds.length < n) {
      const rig = makePerson(`ambient_${this.peds.length}`, this.peds.length);
      this.scene.add(rig);
      this.peds.push(rig);
    }
  };

  const build = p.buildCity;
  p.buildCity = function buildV3(walls, trees) {
    build.call(this, walls, trees);
    buildApartment(this);
    decorateCourt(this);
  };

  const sync = p.sync;
  p.sync = function syncV3(frame) {
    sync.call(this, frame);
    const room = buildApartment(this);
    room.visible = frame.mode === "interior";

    // Remove the old blank SpriteMaterial NPC cards completely.
    for (const sprite of this.npcSprites?.values?.() ?? []) sprite.visible = false;

    let rigs = namedNpcRigs.get(this);
    if (!rigs) {
      rigs = new Map();
      namedNpcRigs.set(this, rigs);
    }
    for (let i = 0; i < frame.npcs.length; i++) {
      const npc = frame.npcs[i];
      let rig = rigs.get(npc.id);
      if (!rig) {
        rig = makePerson(npc.id, i);
        this.scene.add(rig);
        rigs.set(npc.id, rig);
      }
      rig.visible = frame.mode !== "interior";
      rig.position.set(wx(npc.x), 0, wz(npc.y));
      const dx = frame.px - npc.x;
      const dy = frame.py - npc.y;
      if (Math.hypot(dx, dy) < 180) rig.rotation.y = Math.atan2(-dy, dx) - Math.PI / 2;
    }
    this.player.scale.setScalar(frame.mode === "interior" ? 0.94 : 1);
  };
}

async function install() {
  await ensureWorldRuntimeFixes();
  const [{ GameEngine }, { World3D }] = await Promise.all([import("./engine"), import("./world3d")]);
  installEngine(GameEngine);
  installWorld(World3D);
}

void install().catch((err) => console.error("Unable to install logistics v3", err));
