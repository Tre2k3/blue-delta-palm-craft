import * as THREE from "three";
import { setAnisotropy } from "./materials";
import type { GameSettings } from "./types";

export type Quality = GameSettings["quality"];

let quality: Quality = "high";
let autoDropped = false;

/** Judge speed over a window of real frames, not frame-by-frame, so vsync jitter can't hide 20fps. */
const SLOW_DT = 0.042;
const WINDOW_S = 2;
const BOOT_GRACE_S = 4;
const DROP_GRACE_S = 2.5;
let windowTime = 0;
let windowFrames = 0;
let grace = BOOT_GRACE_S;

function resetFrameWindow(nextGrace: number) {
  windowTime = 0;
  windowFrames = 0;
  grace = nextGrace;
}

export function isHandheld() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const short = Math.min(window.innerWidth, window.innerHeight) <= 920;
  return mobileUa || ((coarse || touch) && short);
}

export function preferQuality(): Quality {
  if (isHandheld()) return "low";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 4) return "medium";
  return "high";
}

export function setQuality(next: Quality) {
  if (next !== quality) resetFrameWindow(DROP_GRACE_S);
  quality = next;
}

export function currentQuality() {
  return quality;
}

export function pixelRatio() {
  const raw = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  if (quality === "low") return Math.min(raw, 1);
  if (quality === "medium") return Math.min(raw, 1.25);
  return Math.min(raw, 1.5);
}

export function wantsAntialias() {
  return quality === "high" && !isHandheld();
}

export function wantsLogDepth() {
  return quality === "high" && !isHandheld();
}

type QualityWorld = {
  renderer: THREE.WebGLRenderer;
  sun: THREE.DirectionalLight;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  overlay?: HTMLCanvasElement;
};

export function applyRendererQuality(world: QualityWorld) {
  const dpr = pixelRatio();
  world.renderer.setPixelRatio(dpr);
  const shadows = quality === "high";
  const shadowsWere = world.renderer.shadowMap.enabled;
  world.renderer.shadowMap.enabled = shadows;
  world.renderer.shadowMap.type = quality === "high" ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  world.sun.castShadow = shadows;
  // Shadow on/off is baked into each compiled shader; flip it without a recompile and the ground goes black or stale.
  if (shadowsWere !== shadows) {
    world.scene.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material;
      if (!mat) return;
      for (const m of Array.isArray(mat) ? mat : [mat]) m.needsUpdate = true;
    });
  }
  if (shadows) world.sun.shadow.mapSize.set(quality === "high" ? 2048 : 512, quality === "high" ? 2048 : 512);
  world.sun.shadow.normalBias = 0.03;
  setAnisotropy(quality === "low" ? 1 : quality === "medium" ? 2 : Math.min(8, world.renderer.capabilities.getMaxAnisotropy()));
  world.camera.far = quality === "low" ? 110 : quality === "medium" ? 220 : 420;
  world.camera.updateProjectionMatrix();
}

/**
 * Step graphics down when the average frame over ~2s is slower than SLOW_DT (~24fps).
 * Driven by measured FPS only — the preview UA reads as desktop, so never trust isHandheld() here.
 * Returns the new quality or null.
 */
export function noteFrame(dt: number): Quality | null {
  if (quality === "low") return null;
  if (grace > 0) {
    grace -= dt;
    return null;
  }
  windowTime += dt;
  windowFrames += 1;
  if (windowTime < WINDOW_S) return null;
  const avgDt = windowTime / windowFrames;
  resetFrameWindow(0);
  if (avgDt <= SLOW_DT) return null;
  quality = quality === "high" ? "medium" : "low";
  resetFrameWindow(DROP_GRACE_S);
  autoDropped = true;
  return quality;
}

export function didAutoDrop() {
  return autoDropped;
}
