import * as THREE from "three";
import { rng } from "../core/util";
import { tex } from "../gfx/tex";
import { standHeight } from "../world/ground";
import { ROAD_HALF, STREETS_X, STREETS_Z, WALK, slab } from "../world/map";

/**
 * Gold coins hung in the air all over town: on every sidewalk, down the middle of the streets
 * for whoever is driving, along the river. Wherever Benji goes there is one in sight and the
 * next one past it, so no stretch of the city is just a walk. Run or drive through one to bank it.
 */
export class Sacks {
  readonly mesh: THREE.InstancedMesh;
  readonly total: number;
  private spots: { x: number; z: number; y: number; seed: number }[] = [];
  private taken: boolean[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(flags: Record<string, boolean>) {
    const rand = rng(901);
    const add = (x: number, z: number) => this.spots.push({ x, z, y: standHeight(x, z) + 1.05, seed: rand() * 6.28 });
    // Sidewalks: a few on each side of every block.
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        const sl = slab(c, r);
        const inset = WALK / 2;
        for (const t of [0.22, 0.5, 0.78]) {
          if (rand() < 0.75) add(sl.minX + (sl.maxX - sl.minX) * t, sl.minZ + inset);
          if (rand() < 0.75) add(sl.minX + (sl.maxX - sl.minX) * t, sl.maxZ - inset);
          if (rand() < 0.5) add(sl.minX + inset, sl.minZ + (sl.maxZ - sl.minZ) * t);
          if (rand() < 0.5) add(sl.maxX - inset, sl.minZ + (sl.maxZ - sl.minZ) * t);
        }
      }
    }
    // Streets: lines of three down the right-hand lane, for the car.
    for (const z of STREETS_Z) for (let c = 0; c < 4; c++) for (const t of [0.4, 0.5, 0.6]) add(STREETS_X[c]! + (STREETS_X[c + 1]! - STREETS_X[c]!) * t, z + ROAD_HALF * 0.45);
    for (const x of STREETS_X) for (let r = 0; r < 4; r++) for (const t of [0.4, 0.5, 0.6]) add(x - ROAD_HALF * 0.45, STREETS_Z[r]! + (STREETS_Z[r + 1]! - STREETS_Z[r]!) * t);
    // The riverfront walk.
    for (let x = -120; x <= 120; x += 12) add(x, -194 + Math.sin(x * 0.2) * 2.5);
    this.total = this.spots.length;
    this.taken = this.spots.map((_, i) => !!flags[`coin${i}`]);

    const geo = new THREE.CylinderGeometry(0.36, 0.36, 0.07, 22);
    geo.rotateX(Math.PI / 2);
    const face = tex(128, 128, (g, w, h) => {
      g.fillStyle = "#b9861a";
      g.fillRect(0, 0, w, h);
      const grd = g.createRadialGradient(w * 0.4, h * 0.35, 4, w / 2, h / 2, w * 0.55);
      grd.addColorStop(0, "#fff0a8");
      grd.addColorStop(0.55, "#f1c232");
      grd.addColorStop(1, "#b9861a");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#6b4a08";
      g.font = `900 ${h * 0.7}px "Arial Black", Impact, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("$", w / 2, h * 0.54);
    });
    const gold = new THREE.MeshBasicMaterial({ map: face, toneMapped: false, color: new THREE.Color(1.35, 1.2, 0.8) });
    const rim = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.95, 0.3), toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, [rim, gold, gold], this.total);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  get left() {
    return this.taken.filter((t) => !t).length;
  }

  /** Put every coin back. */
  reset(flags: Record<string, boolean>) {
    this.taken.fill(false);
    for (let i = 0; i < this.total; i++) delete flags[`coin${i}`];
  }

  /**
   * Spin the coins near the player and bank any within `reach`. Returns how many were picked up.
   * Coins far from the camera are parked out of sight rather than drawn.
   */
  update(time: number, px: number, pz: number, reach: number, flags: Record<string, boolean>) {
    let got = 0;
    for (let i = 0; i < this.total; i++) {
      const c = this.spots[i]!;
      const dx = c.x - px;
      const dz = c.z - pz;
      const d2 = dx * dx + dz * dz;
      if (!this.taken[i] && d2 < reach * reach) {
        this.taken[i] = true;
        flags[`coin${i}`] = true;
        got++;
      }
      if (this.taken[i] || d2 > 150 * 150) {
        this.s.setScalar(0);
        this.p.set(c.x, -50, c.z);
      } else {
        // Coins within arm's reach lean toward Benji, so a near miss still feels like a catch.
        const pull = d2 < 9 ? 1 - Math.sqrt(d2) / 3 : 0;
        this.s.setScalar(1 + pull * 0.35);
        this.p.set(c.x - dx * pull * 0.35, c.y + Math.sin(time * 2.4 + c.seed) * 0.14, c.z - dz * pull * 0.35);
      }
      this.q.setFromAxisAngle(this.up, time * 2.6 + c.seed);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return got;
  }
}
