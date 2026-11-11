import * as THREE from "three";
import { bark, canvasTex } from "./materials";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function canopy(seed: number, dark: string, mid: string, lite: string) {
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const blobs: [number, number, number, string][] = [
      [0.5, 0.62, 0.36, dark],
      [0.3, 0.5, 0.24, mid],
      [0.7, 0.48, 0.22, mid],
      [0.48, 0.3, 0.18, dark],
      [0.58, 0.72, 0.16, lite],
      [0.36, 0.7, 0.14, mid],
    ];
    blobs.forEach(([cx, cy, r, col], i) => {
      const ox = ((seed + i * 13) % 11) - 5;
      const grd = g.createRadialGradient(cx * w + ox, cy * h, 8, cx * w, cy * h, r * w);
      grd.addColorStop(0, col);
      grd.addColorStop(0.75, col);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx * w + ox, cy * h, r * w, r * h * 0.78, seed + i, 0, Math.PI * 2);
      g.fill();
    });
  }, 256, 256);
}

function crown(x: number, z: number, y: number, w: number, h: number, mat: THREE.Material, parent: THREE.Object3D) {
  for (const yaw of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const card = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
    card.rotation.y = yaw;
    card.castShadow = false;
  }
}

function trunk(x: number, z: number, h: number, r: number, parent: THREE.Object3D) {
  mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 8), bark(), x, h / 2, z, parent);
}

export function shadeTree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  trunk(x, z, 2.2 * scale, 0.18 * scale, parent);
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(Math.round(x + z), "#1b4a26", "#2f6b34", "#4e8a46"),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  crown(x, z, 2.7 * scale, 2.6 * scale, 2.1 * scale, mat, parent);
}

export function streetTree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  trunk(x, z, 2.6 * scale, 0.12 * scale, parent);
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(Math.round(x * 2), "#24562c", "#3d7a38", "#6aa45a"),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  crown(x, z, 3.15 * scale, 1.7 * scale, 1.9 * scale, mat, parent);
}

export function ornamental(x: number, z: number, parent: THREE.Object3D) {
  trunk(x, z, 1.5, 0.08, parent);
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(3, "#6a3048", "#8a4060", "#c46a58"),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });
  crown(x, z, 1.85, 1.15, 1.05, mat, parent);
}

export function matureTree(x: number, z: number, parent: THREE.Object3D) {
  trunk(x, z, 3.1, 0.26, parent);
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(9, "#163e22", "#2a6230", "#3f7a38"),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  crown(x, z, 3.8, 3.4, 2.6, mat, parent);
}

export function palmTree(x: number, z: number, parent: THREE.Object3D) {
  const t = mesh(new THREE.CylinderGeometry(0.09, 0.15, 4.4, 8), bark(), x, 2.2, z, parent);
  t.rotation.z = 0.05;
  const tex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.78;
    for (let i = 0; i < 9; i++) {
      g.save();
      g.translate(cx, cy);
      g.rotate(-2.5 + (i / 8) * 5);
      const grd = g.createLinearGradient(0, 0, 0, -h * 0.7);
      grd.addColorStop(0, "#1d5430");
      grd.addColorStop(0.55, "#3d8a48");
      grd.addColorStop(1, "rgba(61,138,72,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(22, -h * 0.3, 8, -h * 0.68);
      g.quadraticCurveTo(0, -h * 0.42, -8, -h * 0.68);
      g.quadraticCurveTo(-22, -h * 0.3, 0, 0);
      g.fill();
      g.restore();
    }
  }, 256, 256);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
  crown(x, z, 4.5, 3.2, 2.4, mat, parent);
}

export function shrub(x: number, z: number, parent: THREE.Object3D, s = 1) {
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(s * 4, "#1e4e28", "#347238", "#5a9450"),
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const h = 0.62 * s;
  const w = 0.9 * s;
  const a = mesh(new THREE.PlaneGeometry(w, h), mat, x, 0.28 * s, z, parent);
  const b = mesh(new THREE.PlaneGeometry(w * 0.85, h), mat, x, 0.28 * s, z, parent);
  a.castShadow = false;
  b.castShadow = false;
  b.rotation.y = Math.PI / 2;
}

export function crepeMyrtle(x: number, z: number, parent: THREE.Object3D) {
  for (const [ox, oz] of [[0, 0], [0.22, 0.08], [-0.16, 0.12]] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.7, 6), bark(), x + ox, 0.85, z + oz, parent);
    t.rotation.z = ox * 0.8;
  }
  const mat = new THREE.MeshStandardMaterial({
    map: canopy(5, "#8a3058", "#d06088", "#f0a0b8"),
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  crown(x, z, 1.85, 1.5, 1.15, mat, parent);
}
