import * as THREE from "three";

/**
 * The lightest graphics level. Nearly all of a frame's cost in this game is the lighting maths
 * on each pixel, not the amount of geometry, so the cheapest setting swaps every physically
 * lit surface for a plainly lit twin of the same colour, texture and glow. On a machine with
 * no real graphics chip that is several times faster, which buys back full resolution.
 *
 * The original materials stay the source of truth: the game keeps animating them (window
 * lights at dusk, car lamps) and `sync` copies what changed across each frame.
 */
export class Lite {
  on = false;
  private twins = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  private pairs: [THREE.MeshStandardMaterial, THREE.MeshLambertMaterial][] = [];
  /** Polished surfaces: twin and how strongly it used to mirror the sky. */
  private shiny: [THREE.MeshStandardMaterial, THREE.MeshLambertMaterial, number][] = [];

  private twin(m: THREE.Material): THREE.Material {
    const s = m as THREE.MeshStandardMaterial;
    if (!s.isMeshStandardMaterial) return m;
    let t = this.twins.get(m);
    if (!t) {
      t = new THREE.MeshLambertMaterial({
        color: s.color.clone(),
        map: s.map,
        emissive: s.emissive.clone(),
        emissiveMap: s.emissiveMap,
        emissiveIntensity: s.emissiveIntensity,
        alphaMap: s.alphaMap,
        alphaTest: s.alphaTest,
        transparent: s.transparent,
        opacity: s.opacity,
        side: s.side,
        flatShading: s.flatShading,
        vertexColors: s.vertexColors,
        fog: s.fog,
        depthWrite: s.depthWrite,
        depthTest: s.depthTest,
        blending: s.blending,
        polygonOffset: s.polygonOffset,
        polygonOffsetFactor: s.polygonOffsetFactor,
        polygonOffsetUnits: s.polygonOffsetUnits,
        toneMapped: s.toneMapped,
      });
      t.name = s.name;
      // Glass, metal and polished stone get their look from the sky they mirror. The twin has no
      // mirror, so it is given a wash of sky colour instead of going black.
      const gloss = Math.max(0, 1 - s.roughness) * (0.35 + s.metalness * 0.65);
      this.twins.set(m, t);
      if (gloss > 0.12 && !s.emissiveMap) this.shiny.push([s, t, gloss]);
      else this.pairs.push([s, t]);
    }
    return t;
  }

  /** Put the cheap twins on (or take them off) everything under `root`. Safe to call again. */
  apply(root: THREE.Object3D, on: boolean) {
    this.on = on;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const cur = mesh.material;
      if (on) {
        if (Array.isArray(cur)) mesh.material = cur.map((m) => this.twin(this.full(m)));
        else mesh.material = this.twin(this.full(cur));
      } else if (Array.isArray(cur)) mesh.material = cur.map((m) => this.full(m));
      else mesh.material = this.full(cur);
    });
  }

  /** The original behind a twin; anything else is returned as it is. */
  private full(m: THREE.Material): THREE.Material {
    for (const [s, t] of this.pairs) if (t === m) return s;
    for (const [s, t] of this.shiny) if (t === m) return s;
    return m;
  }

  /**
   * Carry over what the game changed on the originals since the last frame. `sky` is the
   * colour overhead and `strength` how much of it polished surfaces should pick up.
   */
  sync(sky: THREE.Color, strength: number) {
    if (!this.on) return;
    for (const [s, t] of this.pairs) {
      t.emissiveIntensity = s.emissiveIntensity;
      t.opacity = s.opacity;
      t.visible = s.visible;
      if (!t.emissive.equals(s.emissive)) t.emissive.copy(s.emissive);
    }
    for (const [s, t, gloss] of this.shiny) {
      t.opacity = s.opacity;
      t.visible = s.visible;
      t.emissiveIntensity = 1;
      t.emissive.copy(s.emissive).multiplyScalar(s.emissiveIntensity);
      t.emissive.r += sky.r * gloss * strength;
      t.emissive.g += sky.g * gloss * strength;
      t.emissive.b += sky.b * gloss * strength;
    }
  }
}
