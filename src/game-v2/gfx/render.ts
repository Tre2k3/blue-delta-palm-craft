import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export type Quality = "low" | "medium" | "high";

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.34 }, uPunch: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uPunch; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d) * (1.0 + uPunch * 0.4));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      gl_FragColor = c;
    }`,
};

export type Stage = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  quality: Quality;
  setQuality(q: Quality): void;
  setBloom(strength: number): void;
  setPunch(v: number): void;
  render(): void;
  resize(): void;
  dispose(): void;
};

export function pickQuality(): Quality {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("q");
  if (forced === "low" || forced === "medium" || forced === "high") return forced;
  try {
    const saved = localStorage.getItem("sack-v2-quality");
    if (saved === "low" || saved === "medium" || saved === "high") return saved;
  } catch {
    /* private mode */
  }
  const phone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
  return phone ? "medium" : "high";
}

export function makeStage(canvas: HTMLCanvasElement, scene: THREE.Scene, start: Quality): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 1400);

  let composer: EffectComposer;
  let bloom: UnrealBloomPass | null = null;
  let grade: ShaderPass;
  let quality: Quality = start;
  let w = 0;
  let h = 0;

  const build = () => {
    const ratio = quality === "high" ? Math.min(window.devicePixelRatio, 1.75) : quality === "medium" ? Math.min(window.devicePixelRatio, 1.25) : 1;
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = quality !== "low";
    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: quality === "high" ? 4 : 0 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = null;
    if (quality !== "low") {
      bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.4, 0.55, 1.0);
      composer.addPass(bloom);
    }
    grade = new ShaderPass(GRADE);
    composer.addPass(grade);
    composer.addPass(new OutputPass());
    w = 0;
    stage.resize();
  };

  const stage: Stage = {
    renderer,
    camera,
    get quality() {
      return quality;
    },
    setQuality(q) {
      if (q === quality) return;
      quality = q;
      try {
        localStorage.setItem("sack-v2-quality", q);
      } catch {
        /* private mode */
      }
      composer.dispose();
      build();
    },
    setBloom(strength) {
      if (bloom) bloom.strength = strength;
    },
    setPunch(v) {
      grade.uniforms.uPunch!.value = v;
    },
    render() {
      composer.render();
    },
    resize() {
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;
      if (cw === w && ch === h) return;
      w = cw;
      h = ch;
      renderer.setSize(cw, ch, false);
      composer.setSize(cw, ch);
      camera.aspect = cw / Math.max(1, ch);
      camera.updateProjectionMatrix();
    },
    dispose() {
      composer.dispose();
      renderer.dispose();
    },
  };
  build();
  return stage;
}
