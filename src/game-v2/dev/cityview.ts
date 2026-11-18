import * as THREE from "three";
import { makeStage } from "../gfx/render";
import { Sky, type Phase } from "../gfx/sky";
import { buildCity } from "../world/city";

/** Fly-through of the bare city for art checks. `?cityview=1`. */
export function startCityView(canvas: HTMLCanvasElement) {
  const city = buildCity();
  const q = new URLSearchParams(window.location.search).get("q");
  const stage = makeStage(canvas, city.scene, q === "high" || q === "medium" ? q : "low");
  const sky = new Sky(city.scene, stage.renderer);
  const eye = new THREE.Vector3(10, 3, -150);
  const look = new THREE.Vector3(-14, 3, -176);
  let time = 0;
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    stage.resize();
    stage.camera.position.copy(eye);
    stage.camera.lookAt(look);
    sky.update(dt, look, stage.camera);
    city.update(dt, time);
    city.glow.apply(sky.look.lights, sky.look.roadRough);
    city.water.update(dt, sky.look);
    stage.renderer.toneMappingExposure = sky.look.exposure;
    stage.setBloom(sky.look.bloom);
    stage.render();
  };
  raf = requestAnimationFrame(loop);
  const api = {
    cam(x: number, y: number, z: number, tx: number, ty: number, tz: number, fov = 42) {
      eye.set(x, y, z);
      look.set(tx, ty, tz);
      stage.camera.fov = fov;
      stage.camera.updateProjectionMatrix();
    },
    phase(p: Phase) {
      sky.auto = false;
      sky.setPhase(p, true);
    },
    info() {
      const i = stage.renderer.info;
      return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, solids: city.solids.length, lamps: city.lamps.length };
    },
  };
  (window as unknown as { __CITY__?: typeof api }).__CITY__ = api;
  return () => {
    cancelAnimationFrame(raf);
    stage.dispose();
  };
}
