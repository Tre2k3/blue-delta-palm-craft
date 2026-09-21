import * as THREE from "three";
import { setAnisotropy } from "./materials";
import type { GameSettings } from "./types";

export type Quality = GameSettings["quality"];

let quality: Quality = "high";
let slowFrames = 0;
let autoDropped = false;

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
  world.renderer.shadowMap.enabled = shadows;
  world.renderer.shadowMap.type = quality === "high" ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  world.sun.castShadow = shadows;
  if (shadows) world.sun.shadow.mapSize.set(quality === "high" ? 2048 : 512, quality === "high" ? 2048 : 512);
  world.sun.shadow.normalBias = 0.03;
  setAnisotropy(quality === "low" ? 1 : quality === "medium" ? 2 : Math.min(8, world.renderer.capabilities.getMaxAnisotropy()));
  world.camera.far = quality === "low" ? 110 : quality === "medium" ? 220 : 420;
  world.camera.updateProjectionMatrix();
}

/** If the phone can't hold 30fps, step graphics down. Returns the new quality or null. */
export function noteFrame(dt: number): Quality | null {
  if (!isHandheld()) return null;
  if (dt > 0.048) slowFrames += 1;
  else slowFrames = Math.max(0, slowFrames - 2);
  if (slowFrames < 40 || quality === "low") return null;
  quality = quality === "high" ? "medium" : "low";
  slowFrames = 0;
  autoDropped = true;
  return quality;
}

export function didAutoDrop() {
  return autoDropped;
}
