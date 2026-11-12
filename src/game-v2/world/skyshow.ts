import * as THREE from "three";
import { tex } from "../gfx/tex";
import { HQ } from "./map";

export type SkyShow = {
  group: THREE.Group;
  /** `lights` is how far on the city's lights are, 0 by day to 1 at night. */
  update(dt: number, time: number, lights: number): void;
  /** Where the blimp is, for anything that wants to look at it. */
  blimp: THREE.Group;
};

/** The circle the blimp flies: over downtown and out across the river. */
const ORBIT = { x: 0, z: -95, r: 150, y: 82, speed: 0.032 };

/**
 * What is up in the air over Memphis: the SackReligious blimp making slow laps of the city, its
 * name lit along both sides after dark, and two searchlights sweeping from the boutique's roof
 * once the sun is down, the way they do for an opening night.
 */
export function buildSkyShow(): SkyShow {
  const group = new THREE.Group();
  group.name = "skyshow";

  // ---- the blimp
  const blimp = new THREE.Group();
  const skin = tex(
    2048,
    512,
    (g, w, h) => {
      g.fillStyle = "#f4f1ea";
      g.fillRect(0, 0, w, h);
      // A green belly and a gold pinstripe, nose to tail.
      g.fillStyle = "#1d6b3a";
      g.fillRect(0, h * 0.66, w, h * 0.34);
      g.fillStyle = "#d8a93a";
      g.fillRect(0, h * 0.64, w, h * 0.022);
      g.fillStyle = "#14331f";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "900 132px Impact, 'Arial Black', sans-serif";
      for (const u of [0.25, 0.75]) g.fillText("$ACKRELIGIOUS", w * u, h * 0.44, w * 0.29);
    },
    { repeat: false, aniso: 8 },
  );
  const lit = tex(
    2048,
    512,
    (g, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#39ff14";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "900 132px Impact, 'Arial Black', sans-serif";
      for (const u of [0.25, 0.75]) g.fillText("$ACKRELIGIOUS", w * u, h * 0.44, w * 0.29);
      g.fillStyle = "#d8a93a";
      g.fillRect(0, h * 0.64, w, h * 0.022);
    },
    { repeat: false, aniso: 8 },
  );
  const hull = new THREE.MeshStandardMaterial({ map: skin, emissiveMap: lit, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.55, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), hull);
  body.scale.set(15, 4.6, 4.6);
  blimp.add(body);
  const dark = new THREE.MeshStandardMaterial({ color: 0x14331f, roughness: 0.6 });
  // Four fins at the tail and the cabin underneath.
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 0.22), dark);
    fin.position.set(-12.2, 0, 0);
    const pivot = new THREE.Group();
    pivot.add(fin);
    fin.position.y = 2.6;
    pivot.rotation.x = (i * Math.PI) / 2 + Math.PI / 4;
    blimp.add(pivot);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 1.8), dark);
  cabin.position.set(1, -5, 0);
  blimp.add(cabin);
  const glass = new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0xffe2a8, emissiveIntensity: 0, roughness: 0.2 });
  const windows = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 1.86), glass);
  windows.position.set(1.1, -4.8, 0);
  blimp.add(windows);
  // Running lights: red to port, green to starboard, a white strobe under the cabin.
  const lamp = (color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.position.set(x, y, z);
    blimp.add(m);
    return m;
  };
  const port = lamp(0xff3b3b, 0, 0, 4.7);
  const starboard = lamp(0x39ff14, 0, 0, -4.7);
  const strobe = lamp(0xffffff, 1, -5.9, 0);
  blimp.traverse((o) => {
    o.frustumCulled = false;
  });
  group.add(blimp);

  // ---- the searchlights
  const beams: THREE.Group[] = [];
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  // Long enough that the far end is lost in the sky.
  const cone = new THREE.CylinderGeometry(17, 0.5, 420, 20, 1, true);
  cone.translate(0, 210, 0);
  for (const dx of [-7.5, 7.5]) {
    const pivot = new THREE.Group();
    pivot.position.set((HQ.minX + HQ.maxX) / 2 + dx, HQ.height + 0.6, (HQ.minZ + HQ.maxZ) / 2);
    const beam = new THREE.Mesh(cone, beamMat);
    beam.frustumCulled = false;
    beam.renderOrder = 6;
    pivot.add(beam);
    // The lamp housing on the roof.
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 1, 12), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.5, metalness: 0.5 }));
    drum.position.y = 0.2;
    pivot.add(drum);
    group.add(pivot);
    beams.push(pivot);
  }

  let angle = 0.6;
  const show: SkyShow = {
    group,
    blimp,
    update(dt, time, lights) {
      angle += ORBIT.speed * dt;
      const x = ORBIT.x + Math.cos(angle) * ORBIT.r;
      const z = ORBIT.z + Math.sin(angle) * ORBIT.r * 0.82;
      blimp.position.set(x, ORBIT.y + Math.sin(time * 0.25) * 1.6, z);
      // Nose along the way it is going.
      blimp.rotation.y = Math.atan2(Math.sin(angle), -Math.cos(angle) * 0.82) + Math.PI / 2;
      blimp.rotation.z = Math.sin(time * 0.31) * 0.02;
      const night = Math.max(0, (lights - 0.25) / 0.75);
      hull.emissiveIntensity = night * 0.95;
      glass.emissiveIntensity = night * 1.2;
      port.visible = starboard.visible = night > 0.05;
      strobe.visible = night > 0.05 && time % 1.6 < 0.12;
      // Two beams crossing over the boutique, each on its own slow figure.
      beamMat.opacity = night * night * 0.06;
      beamMat.visible = beamMat.opacity > 0.002;
      beams.forEach((b, i) => {
        const s = i ? -1 : 1;
        b.rotation.z = s * (0.42 + Math.sin(time * 0.33 + i * 1.7) * 0.34);
        b.rotation.x = Math.sin(time * 0.24 + i * 2.6) * 0.45 - 0.1;
      });
    },
  };
  show.update(0, 0, 0);
  return show;
}
