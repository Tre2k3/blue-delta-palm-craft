import * as THREE from "three";

export type GoalBoard = {
  x: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  nx: number;
};

const orange = new THREE.MeshStandardMaterial({
  color: 0xff4a12,
  emissive: 0xff3a00,
  emissiveIntensity: 0.85,
  roughness: 0.28,
  metalness: 0.55,
});
const pad = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.35 });
const white = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.32, metalness: 0.12 });
const steel = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.4, metalness: 0.7 });

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function boardTex() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e7eef4";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "#f7fbff";
  g.lineWidth = 28;
  g.strokeRect(16, 16, 480, 288);
  g.strokeStyle = "#d8e0e8";
  g.lineWidth = 6;
  g.strokeRect(34, 34, 444, 252);
  g.strokeStyle = "#e10600";
  g.lineWidth = 14;
  g.strokeRect(176, 168, 160, 108);
  g.fillStyle = "#101418";
  g.font = "800 46px sans-serif";
  g.textAlign = "center";
  g.fillText("901", 256, 92);
  g.font = "700 18px sans-serif";
  g.fillStyle = "#5c6770";
  g.fillText("SACKRELIGIOUS", 256, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function netTex() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 128, 256);
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 4;
  for (let x = 8; x < 128; x += 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 10, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x - 10, 256);
    g.stroke();
  }
  g.lineWidth = 3;
  for (let y = 12; y < 256; y += 28) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

const boardMap = boardTex();
const netMap = netTex();

function hangNet(rimX: number, rimY: number, z: number, parent: THREE.Object3D) {
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.12, 0.62, 20, 1, true),
    new THREE.MeshBasicMaterial({
      map: netMap,
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  skirt.position.set(rimX, rimY - 0.34, z);
  parent.add(skirt);
  const cord = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.8 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3),
      new THREE.Vector3(Math.cos(a) * 0.2, -0.28, Math.sin(a) * 0.2),
      new THREE.Vector3(Math.cos(a) * 0.12, -0.5, Math.sin(a) * 0.12),
    ];
    const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.012, 4, false), cord);
    strand.position.set(rimX, rimY - 0.02, z);
    parent.add(strand);
  }
}

/**
 * Outdoor glass goal. `dir` 1 puts the glass face and the rim toward +X.
 * Rim center stays at the playable height so existing shot scoring still lands.
 */
export function buildGoal(rimX: number, z: number, dir: 1 | -1, parent: THREE.Object3D) {
  const boardX = rimX - dir * 0.42;
  const poleX = rimX - dir * 1.85;
  const rimY = 2.72;
  const boardY = 3.28;
  const boardH = 1.48;
  const boardW = 2.2;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 3.85, 14), pad);
  pole.position.set(poleX, 1.92, z);
  pole.castShadow = true;
  parent.add(pole);
  box(0.7, 0.08, 0.7, poleX, 0.04, z, steel, parent);
  box(0.16, 0.06, 0.16, poleX - 0.22, 0.1, z - 0.22, steel, parent);
  box(0.16, 0.06, 0.16, poleX + 0.22, 0.1, z - 0.22, steel, parent);
  box(0.16, 0.06, 0.16, poleX - 0.22, 0.1, z + 0.22, steel, parent);
  box(0.16, 0.06, 0.16, poleX + 0.22, 0.1, z + 0.22, steel, parent);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.15, 12), pad);
  sleeve.position.set(poleX, 0.7, z);
  parent.add(sleeve);
  box(0.24, 0.08, 0.24, poleX, 1.28, z, orange, parent);

  const armLen = Math.abs(boardX - poleX);
  box(armLen + 0.12, 0.08, 0.12, (boardX + poleX) / 2, boardY + boardH / 2 + 0.08, z, steel, parent);
  const braceLen = Math.hypot(armLen * 0.72, 0.85);
  const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, braceLen, 8), steel);
  brace.position.set(poleX + dir * armLen * 0.38, boardY + 0.22, z);
  brace.rotation.z = dir * -0.55;
  parent.add(brace);
  box(0.08, 0.42, 0.16, boardX, boardY + boardH / 2 - 0.05, z, steel, parent);

  const face = new THREE.MeshStandardMaterial({
    map: boardMap,
    emissive: 0xffffff,
    emissiveMap: boardMap,
    emissiveIntensity: 0.42,
    roughness: 0.16,
    metalness: 0.06,
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, boardH, boardW), [face, face, white, white, white, white]);
  glass.position.set(boardX, boardY, z);
  glass.castShadow = true;
  parent.add(glass);
  box(0.09, 0.07, boardW + 0.1, boardX, boardY + boardH / 2, z, white, parent);
  box(0.09, 0.07, boardW + 0.1, boardX, boardY - boardH / 2, z, white, parent);
  box(0.09, boardH + 0.08, 0.07, boardX, boardY, z - boardW / 2, white, parent);
  box(0.09, boardH + 0.08, 0.07, boardX, boardY, z + boardW / 2, white, parent);

  box(0.02, 0.4, 0.04, boardX + dir * 0.05, boardY - 0.22, z - 0.22, orange, parent);
  box(0.02, 0.4, 0.04, boardX + dir * 0.05, boardY - 0.22, z + 0.22, orange, parent);
  box(0.02, 0.04, 0.48, boardX + dir * 0.05, boardY - 0.02, z, orange, parent);
  box(0.02, 0.04, 0.48, boardX + dir * 0.05, boardY - 0.42, z, orange, parent);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.052, 16, 36), orange);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(rimX, rimY, z);
  rim.castShadow = true;
  parent.add(rim);
  const neck = box(0.38, 0.07, 0.1, (boardX + rimX) / 2, rimY, z, orange, parent);
  neck.castShadow = true;
  box(0.1, 0.08, 0.16, boardX + dir * 0.08, rimY, z, steel, parent);

  hangNet(rimX, rimY, z, parent);

  return {
    hoop: { x: rimX, z, y: rimY },
    board: {
      x: boardX,
      minY: boardY - boardH / 2,
      maxY: boardY + boardH / 2,
      minZ: z - boardW / 2,
      maxZ: z + boardW / 2,
      nx: dir,
    } satisfies GoalBoard,
  };
}
