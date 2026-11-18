import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/**
 * Collects static geometry by material and merges each bucket into one mesh.
 * A city block is a few hundred boxes; unmerged that is a few hundred draw calls.
 */
export class Batch {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      const count = g.attributes.position!.count;
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    _e.set(pitch, yaw, roll, "YXZ");
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    let list = this.buckets.get(mat);
    if (!list) {
      list = [];
      this.buckets.set(mat, list);
    }
    list.push(g);
    return this;
  }

  box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, yaw = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, yaw);
  }

  /** Flat quad lying on the ground, facing up. `w` runs along X, `d` along Z before yaw. */
  flat(w: number, d: number, x: number, y: number, z: number, mat: THREE.Material, yaw = 0, tile = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    if (tile > 0) scaleUv(g, w / tile, d / tile);
    g.rotateX(-Math.PI / 2);
    return this.add(g, mat, x, y, z, yaw);
  }

  /** Upright quad. Faces +Z before yaw. */
  wall(w: number, h: number, x: number, y: number, z: number, mat: THREE.Material, yaw = 0, uw = 1, uh = 1) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uw !== 1 || uh !== 1) scaleUv(g, uw, uh);
    return this.add(g, mat, x, y, z, yaw);
  }

  cyl(rTop: number, rBot: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 8) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, x, y, z);
  }

  /**
   * Four walls of a building with the facade tiled in world units, so every building
   * shares the same texture at the same window size.
   */
  walls(w: number, h: number, d: number, x: number, y0: number, z: number, mat: THREE.Material, tileW: number, tileH: number, uOff = 0) {
    const y = y0 + h / 2;
    const faces: [number, number, number, number][] = [
      [w, x, z + d / 2, 0],
      [w, x, z - d / 2, Math.PI],
      [d, x + w / 2, z, Math.PI / 2],
      [d, x - w / 2, z, -Math.PI / 2],
    ];
    faces.forEach(([len, fx, fz, yaw], i) => {
      const g = new THREE.PlaneGeometry(len, h);
      scaleUv(g, len / tileW, h / tileH, uOff + i * 0.37);
      this.add(g, mat, fx, y, fz, yaw);
    });
    return this;
  }

  build(parent: THREE.Object3D, opts: { cast?: boolean; receive?: boolean; name?: string } = {}) {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.buckets) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = opts.cast ?? false;
      mesh.receiveShadow = opts.receive ?? true;
      mesh.matrixAutoUpdate = false;
      if (opts.name) mesh.name = opts.name;
      parent.add(mesh);
      out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}

export function scaleUv(g: THREE.BufferGeometry, su: number, sv: number, uOff = 0) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su + uOff, uv.getY(i) * sv);
  uv.needsUpdate = true;
}
