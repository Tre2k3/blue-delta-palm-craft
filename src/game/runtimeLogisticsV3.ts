/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { NPCS, POIS, PLAYER_RUN, PLAYER_SPEED } from "./data";
import { ensureWorldRuntimeFixes } from "./runtimeFixesV2";

const S = 1 / 16;
const wx = (x: number) => x * S;
const wz = (y: number) => y * S;

const APARTMENT = {
  cx: -3200,
  cy: -3200,
  halfW: 112,
  halfD: 86,
  doorW: 34,
};

const apartmentBlockers = [
  { x: APARTMENT.cx - 86, y: APARTMENT.cy - 58, w: 62, h: 42 }, // bed
  { x: APARTMENT.cx + 54, y: APARTMENT.cy - 66, w: 42, h: 26 }, // dresser
  { x: APARTMENT.cx + 66, y: APARTMENT.cy + 12, w: 30, h: 48 }, // clothing rack
];

const roomGroups = new WeakMap<object, THREE.Group>();
const namedNpcRigs = new WeakMap<object, Map<string, THREE.Group>>();
const courtDecor = new WeakSet<object>();

function circleRect(x: number, y: number, r: number, q: { x: number; y: number; w: number; h: number }) {
  const nx = Math.max(q.x, Math.min(x, q.x + q.w));
  const ny = Math.max(q.y, Math.min(y, q.y + q.h));
  return (x - nx) ** 2 + (y - ny) ** 2 < r ** 2;
}

function mat(color: number, roughness = 0.76, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function limb(material: THREE.Material, radius: number, length: number) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, length, 8), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

function makeCharacterRig(id: string, index = 0) {
  const roles: Record<string, { skin: number; shirt: number; pants: number; shoes: number; hat?: number; hair?: number; gold?: boolean }> = {
    k_blanco: { skin: 0x9f6546, shirt: 0x161412, pants: 0x171717, shoes: 0xe7e2d8, hair: 0xf5efe3, gold: true },
    court_coach: { skin: 0x75452f, shirt: 0x111111, pants: 0x202327, shoes: 0xf2eee4, hat: 0x181818, gold: true },
    supporter_1: { skin: 0x7e4b33, shirt: 0xf0ece4, pants: 0x26384d, shoes: 0xf2eee4, hat: 0x1a1a1a },
    downtown_fan: { skin: 0x5d3829, shirt: 0x1f6b3d, pants: 0x20262d, shoes: 0xf1eee7, gold: true },
    culture_host: { skin: 0x8d5438, shirt: 0x202020, pants: 0x181818, shoes: 0xd8d2c7 },
    street_npc: { skin: 0x70402e, shirt: 0x525960, pants: 0x253649, shoes: 0xede8df },
    beale_dj: { skin: 0x5e3526, shirt: 0x171717, pants: 0x202020, shoes: 0xe5dfd6, hat: 0x111111, gold: true },
  };
  const palette = [
    { skin: 0x6d3f2c, shirt: 0x1f6b3d, pants: 0x253649, shoes: 0xf2eee4 },
    { skin: 0x945c3d, shirt: 0x252525, pants: 0x2f3439, shoes: 0xe8e4db },
    { skin: 0x5d3727, shirt: 0xe6e1d8, pants: 0x26384d, shoes: 0x191919 },
    { skin: 0xa66c49, shirt: 0x6c3d2e, pants: 0x26282d, shoes: 0xe8e4db },
    { skin: 0x75452f, shirt: 0x263d5c, pants: 0x20262d, shoes: 0xf1ede6 },
    { skin: 0x8d573c, shirt: 0x4e5f34, pants: 0x24282d, shoes: 0x151515 },
  ];
  const look = roles[id] ?? palette[index % palette.length]!;
  const skin = mat(look.skin, 0.72);
  const shirt = mat(look.shirt, 0.82);
  const pants = mat(look.pants, 0.86);
  const shoes = mat(look.shoes, 0.72);
  const hair = mat(look.hair ?? 0x151311, 0.94);
  const gold = mat(0xd4af37, 0.28, 0.7);

  const g = new THREE.Group() as THREE.Group & { userData: Record<string, any> };
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), shirt);
  torso.position.y = 0.96;
  torso.castShadow = true;
  g.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin);
  neck.position.y = 1.33;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skin);
  head.scale.set(0.92, 1.05, 0.9);
  head.position.y = 1.55;
  head.castShadow = true;
  g.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  hairCap.position.y = 1.62;
  hairCap.castShadow = true;
  g.add(hairCap);

  const leftArm = limb(skin, 0.055, 0.54);
  leftArm.position.set(-0.27, 1.23, 0);
  leftArm.rotation.z = 0.08;
  g.add(leftArm);
  const rightArm = limb(skin, 0.055, 0.54);
  rightArm.position.set(0.27, 1.23, 0);
  rightArm.rotation.z = -0.08;
  g.add(rightArm);

  const leftLeg = limb(pants, 0.085, 0.58);
  leftLeg.position.set(-0.11, 0.68, 0);
  g.add(leftLeg);
  const rightLeg = limb(pants, 0.085, 0.58);
  rightLeg.position.set(0.11, 0.68, 0);
  g.add(rightLeg);

  for (const x of [-0.11, 0.11]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.3), shoes);
    shoe.position.set(x, 0.09, 0.055);
    shoe.castShadow = true;
    g.add(shoe);
  }

  if (look.hat !== undefined) {
    const capMat = mat(look.hat, 0.66);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), capMat);
    crown.position.y = 1.78;
    g.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.14), capMat);
    brim.position.set(0, 1.75, 0.17);
    g.add(brim);
  }

  if (look.gold) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 7, 18), gold);
    chain.rotation.x = Math.PI / 2;
    chain.position.set(0, 1.25, 0.15);
    g.add(chain);
  }

  if (id === "k_blanco") {
    // Distinct blonde curl clusters so K Blanco is recognizable even before final map-based skinning.
    const curlGeo = new THREE.SphereGeometry(0.075, 8, 7);
    for (const [x, y, z] of [
      [-0.18, 1.7, 0.03], [-0.1, 1.78, 0.08], [0, 1.8, 0.08], [0.11, 1.76, 0.04], [0.18, 1.69, 0],
    ]) {
      const curl = new THREE.Mesh(curlGeo, hair);
      curl.position.set(x, y, z);
      g.add(curl);
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  g.add(shadow);

  g.userData.leftArm = leftArm;
  g.userData.rightArm = rightArm;
  g.userData.leftLeg = leftLeg;
  g.userData.rightLeg = rightLeg;
  return g;
}

function buildApartmentInterior(world: any) {
  if (roomGroups.has(world)) return roomGroups.get(world)!;
  const g = new THREE.Group();
  const cx = wx(APARTMENT.cx);
  const cz = wz(APARTMENT.cy);
  const w = wx(APARTMENT.halfW * 2);
  const d = wz(APARTMENT.halfD * 2);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b241f, roughness: 0.75 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x201a17, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1f6b3d, roughness: 0.68 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xf2c66a, emissive: 0xc27a2a, emissiveIntensity: 0.45, roughness: 0.5 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
  floor.position.set(cx, 0.02, cz);
  floor.receiveShadow = true;
  g.add(floor);

  const wallH = 3.0;
  const north = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.16), wallMat);
  north.position.set(cx, wallH / 2, cz - d / 2);
  g.add(north);
  const west = new THREE.Mesh(new THREE.BoxGeometry(0.16, wallH, d), wallMat);
  west.position.set(cx - w / 2, wallH / 2, cz);
  g.add(west);
  const east = west.clone();
  east.position.x = cx + w / 2;
  g.add(east);

  // South wall has a real exit gap instead of trapping Benji inside a solid box.
  const doorWidth = wx(APARTMENT.doorW);
  const sideWidth = (w - doorWidth) / 2;
  const southL = new THREE.Mesh(new THREE.BoxGeometry(sideWidth, wallH, 0.16), wallMat);
  southL.position.set(cx - doorWidth / 2 - sideWidth / 2, wallH / 2, cz + d / 2);
  g.add(southL);
  const southR = southL.clone();
  southR.position.x = cx + doorWidth / 2 + sideWidth / 2;
  g.add(southR);
  const header = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.55, 0.17), trimMat);
  header.position.set(cx, 2.72, cz + d / 2);
  g.add(header);

  // Bed.
  const bed = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.4, 2.4), mat(0x191919, 0.82));
  base.position.y = 0.28;
  bed.add(base);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 2.25), mat(0x1f6b3d, 0.9));
  blanket.position.y = 0.55;
  bed.add(blanket);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.62), mat(0xe9e3d8, 0.94));
  pillow.position.set(-1.1, 0.69, -0.55);
  bed.add(pillow);
  bed.position.set(cx - 4.2, 0, cz - 3.2);
  g.add(bed);

  // Clothing wall and sneaker shelf — story-relevant apartment dressing.
  const rack = new THREE.Group();
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 8), trimMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.y = 1.8;
  rack.add(rail);
  for (let i = 0; i < 5; i++) {
    const tee = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.08), mat(i % 2 ? 0x171717 : 0x1f6b3d, 0.88));
    tee.position.set(-0.95 + i * 0.48, 1.38, 0);
    rack.add(tee);
  }
  rack.position.set(cx + 4.5, 0, cz + 0.4);
  g.add(rack);

  const dresser = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.0), mat(0x3a2a20, 0.8));
  dresser.position.set(cx + 4.2, 0.45, cz - 3.5);
  g.add(dresser);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.42), mat(0x111111, 0.25, 0.18));
  phone.position.set(cx + 4.2, 0.9, cz - 3.5);
  g.add(phone);

  // Faux window with Memphis-like warm light beyond it.
  const window = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.55), new THREE.MeshStandardMaterial({ color: 0x6d3825, emissive: 0xb56235, emissiveIntensity: 0.38 }));
  window.position.set(cx, 1.8, cz - d / 2 + 0.09);
  g.add(window);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.22), trimMat);
  sill.position.set(cx, 1.0, cz - d / 2 + 0.14);
  g.add(sill);

  const ceilingLight = new THREE.PointLight(0xffc878, 2.5, 12, 2);
  ceilingLight.position.set(cx, 2.65, cz);
  g.add(ceilingLight);
  const lightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), warm);
  lightMesh.position.set(cx, 2.85, cz);
  g.add(lightMesh);

  // Exit glow/pad.
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 28), new THREE.MeshBasicMaterial({ color: 0x1db954, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(cx, 0.08, cz + d / 2 - 0.6);
  g.add(pad);

  g.visible = false;
  world.scene.add(g);
  roomGroups.set(world, g);
  return g;
}

function addCourtBranding(world: any) {
  if (courtDecor.has(world)) return;
  courtDecor.add(world);
  const court = POIS.find((p) => p.id === "court");
  if (!court) return;
  const cx = wx(court.x + court.w / 2);
  const cz = wz(court.y + court.h / 2);
  const cw = wx(court.w);
  const cd = wz(court.h);
  const group = new THREE.Group();

  // Black/gold overlay so the court starts reading Sackrow Ballers now; the full indoor gym remains a later pass.
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.96, cd * 0.96), new THREE.MeshStandardMaterial({ color: 0x171411, roughness: 0.72 }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(cx, 0.125, cz);
  surface.receiveShadow = true;
  group.add(surface);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x5a3b08, emissiveIntensity: 0.14, roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 0.72 });
  const line = (w: number, d: number, x: number, z: number, material = goldMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), material);
    m.position.set(x, 0.155, z);
    group.add(m);
  };
  line(cw * 0.92, 0.055, cx, cz - cd * 0.44);
  line(cw * 0.92, 0.055, cx, cz + cd * 0.44);
  line(0.055, cd * 0.88, cx - cw * 0.46, cz);
  line(0.055, cd * 0.88, cx + cw * 0.46, cz);
  line(cw * 0.92, 0.04, cx, cz, whiteMat);

  const center = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.22, 48), goldMat);
  center.rotation.x = -Math.PI / 2;
  center.position.set(cx, 0.16, cz);
  group.add(center);

  // Brand decal from the user-supplied Sackrow Ballers artwork. If it ever fails to load, geometry still renders.
  const tex = new THREE.TextureLoader().load("/game/branding/sackrow-ballers-logo.jpg", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
  });
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 3.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: false, toneMapped: false }),
  );
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(cx, 0.165, cz);
  group.add(logo);

  // Baseline wordmark panels are intentionally readable and not generated gibberish.
  const makeCanvasWord = (text: string) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#11100f";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
    ctx.fillStyle = "#f2eee4";
    ctx.font = "900 132px Arial Black, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, c.width / 2, c.height / 2 + 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  for (const [z, rot] of [[cz - cd * 0.34, 0], [cz + cd * 0.34, Math.PI]] as const) {
    const word = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.35), new THREE.MeshBasicMaterial({ map: makeCanvasWord("SACKROW BALLERS"), transparent: false, toneMapped: false }));
    word.rotation.x = -Math.PI / 2;
    word.rotation.z = rot;
    word.position.set(cx, 0.167, z);
    group.add(word);
  }

  world.scene.add(group);
}

function installEngineLogistics(GameEngine: any) {
  const proto = GameEngine.prototype;
  if (proto.__logisticsV3Installed) return;
  proto.__logisticsV3Installed = true;

  const originalStart = proto.start;
  const originalUpdatePlayer = proto.updatePlayer;
  const originalUpdateProximity = proto.updateProximity;
  const originalTryInteract = proto.tryInteract;
  const originalCheckMissionAuto = proto.checkMissionAuto;
  const originalGetHud = proto.getHud;

  proto.start = function startWithApartment(fresh = false) {
    originalStart.call(this, fresh);
    const step = this.mission?.steps?.[this.mission.activeStep];
    if (step?.id === "wake" && !step.done) {
      this.__interiorKind = "apartment";
      this.mode = "interior";
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
      this.interactHint = "Walk to the door to leave the apartment";
      this.showToast?.("NEW MISSION · THE DROP DAY", 2.6);
      this.emitHud?.();
    }
  };

  proto.updatePlayer = function updatePlayerLogistics(dt: number, mx: number, my: number, runHeld: boolean) {
    if (this.mode !== "interior" || this.__interiorKind !== "apartment") {
      return originalUpdatePlayer.call(this, dt, mx, my, runHeld);
    }
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
    } else {
      this.moving = false;
    }
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
    if (apartmentBlockers.some((q) => circleRect(nx, this.py, rad, q))) nx = this.px;
    if (apartmentBlockers.some((q) => circleRect(this.px, ny, rad, q))) ny = this.py;
    this.px = nx;
    this.py = ny;
    this.animT += dt * (this.moving ? 9 : 2);
    this.bob = this.moving ? Math.sin(this.animT * 2) * 3.0 : Math.sin(this.animT) * 0.5;
  };

  proto.updateProximity = function updateProximityLogistics() {
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      const atDoor = Math.abs(this.px - APARTMENT.cx) < APARTMENT.doorW * 0.7 && this.py > APARTMENT.cy + APARTMENT.halfD - 38;
      this.__interiorAtDoor = atDoor;
      this.nearPoi = "apartment";
      this.nearNpc = null;
      this.interactHint = atDoor ? "Leave Benji's Apartment" : "Head to the front door";
      return;
    }
    originalUpdateProximity.call(this);
  };

  proto.checkMissionAuto = function checkMissionAutoLogistics() {
    if (this.mode === "interior") return;
    originalCheckMissionAuto.call(this);
  };

  proto.tryInteract = function tryInteractLogistics() {
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      if (!this.__interiorAtDoor) {
        this.showToast?.("Head to the front door to step into Memphis.", 1.5);
        return;
      }
      const apt = POIS.find((p) => p.id === "apartment");
      if (!apt) return;
      this.mode = "world";
      this.__interiorKind = null;
      this.px = apt.x + apt.w / 2;
      this.py = apt.y + apt.h + 74;
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
    originalTryInteract.call(this);
  };

  proto.getHud = function getHudLogistics() {
    const hud = originalGetHud.call(this);
    if (this.mode === "interior" && this.__interiorKind === "apartment") {
      hud.interactHint = this.interactHint;
      hud.locationName = "Benji's Apartment";
      hud.district = "West Side";
    }
    return hud;
  };
}

function installWorldLogistics(World3D: any) {
  const proto = World3D.prototype;
  if (proto.__logisticsV3Installed) return;
  proto.__logisticsV3Installed = true;

  // Replace the generic ambient capsules with better-proportioned street characters.
  proto.ensurePeds = function ensurePedsV3(n: number) {
    while (this.peds.length < n) {
      const g = makeCharacterRig(`ambient_${this.peds.length}`, this.peds.length);
      this.scene.add(g);
      this.peds.push(g);
    }
  };

  const originalBuildCity = proto.buildCity;
  proto.buildCity = function buildCityV3(walls: any[], trees: any[]) {
    originalBuildCity.call(this, walls, trees);
    buildApartmentInterior(this);
    addCourtBranding(this);
  };

  const originalSync = proto.sync;
  proto.sync = function syncV3(frame: any) {
    originalSync.call(this, frame);
    const room = buildApartmentInterior(this);
    room.visible = frame.mode === "interior";

    // The old non-K NPC sprites were the source of the large white rectangles.
    // Keep them fully hidden and render role-specific 3D rigs instead.
    for (const sprite of this.npcSprites?.values?.() ?? []) sprite.visible = false;

    let rigs = namedNpcRigs.get(this);
    if (!rigs) {
      rigs = new Map();
      namedNpcRigs.set(this, rigs);
    }
    for (let i = 0; i < frame.npcs.length; i++) {
      const n = frame.npcs[i];
      let rig = rigs.get(n.id);
      if (!rig) {
        rig = makeCharacterRig(n.id, i);
        this.scene.add(rig);
        rigs.set(n.id, rig);
      }
      rig.visible = frame.mode !== "interior";
      rig.position.set(wx(n.x), 0, wz(n.y));
      const dx = frame.px - n.x;
      const dy = frame.py - n.y;
      if (Math.hypot(dx, dy) < 180) rig.rotation.y = Math.atan2(-dy, dx) - Math.PI / 2;
    }

    // Keep the interior character scale slightly tighter so Benji doesn't look pasted onto a giant room.
    if (frame.mode === "interior") this.player.scale.setScalar(0.93);
    else this.player.scale.setScalar(1);
  };
}

async function installLogisticsV3() {
  await ensureWorldRuntimeFixes();
  const [{ GameEngine }, { World3D }] = await Promise.all([import("./engine"), import("./world3d")]);
  installEngineLogistics(GameEngine);
  installWorldLogistics(World3D);
}

void installLogisticsV3().catch((err) => console.error("Unable to install logistics v3", err));
