import * as THREE from "three";

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const ATTRS: WebGLContextAttributes[] = [
  {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
  },
  {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
  },
  {
    alpha: false,
    antialias: false,
    depth: true,
    failIfMajorPerformanceCaveat: false,
  },
];

function isUsable(gl: GL | null): gl is GL {
  return !!gl && typeof gl.isContextLost === "function" && !gl.isContextLost();
}

function tryContext(canvas: HTMLCanvasElement): { gl: GL; attrs: WebGLContextAttributes } | null {
  for (const attrs of ATTRS) {
    let gl: GL | null = null;
    try {
      gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as GL | null;
    } catch {
      gl = null;
    }
    if (isUsable(gl)) return { gl, attrs };
  }
  return null;
}

export function loseWebGL(canvas?: HTMLCanvasElement | null) {
  const list = canvas ? [canvas] : Array.from(document.querySelectorAll("canvas"));
  for (const node of list) {
    let gl: GL | null = null;
    try {
      gl = (node.getContext("webgl2") || node.getContext("webgl")) as GL | null;
    } catch {
      gl = null;
    }
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      /* already gone */
    }
  }
}

export function replaceCanvas(old: HTMLCanvasElement) {
  const next = old.cloneNode(false) as HTMLCanvasElement;
  next.className = old.className;
  next.style.cssText = old.style.cssText;
  old.replaceWith(next);
  return next;
}

function makeRenderer(canvas: HTMLCanvasElement, pack: { gl: GL; attrs: WebGLContextAttributes }, logDepth: boolean) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: pack.gl,
      antialias: !!pack.attrs.antialias,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: pack.attrs.powerPreference ?? "default",
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
      logarithmicDepthBuffer: logDepth,
    });
    renderer.debug.checkShaderErrors = false;
    return renderer;
  } catch {
    return null;
  }
}

export function createWebGLRenderer(canvas: HTMLCanvasElement) {
  if (canvas.clientWidth < 2 || canvas.clientHeight < 2) {
    canvas.width = Math.max(canvas.width, 960);
    canvas.height = Math.max(canvas.height, 540);
  }

  const attempts: { target: HTMLCanvasElement; logDepth: boolean }[] = [
    { target: canvas, logDepth: true },
    { target: canvas, logDepth: false },
  ];

  for (const attempt of attempts) {
    const pack = tryContext(attempt.target);
    if (!pack) continue;
    const renderer = makeRenderer(attempt.target, pack, attempt.logDepth);
    if (renderer) return renderer;
  }

  loseWebGL(canvas);
  const fresh = replaceCanvas(canvas);
  if (fresh.clientWidth < 2 || fresh.clientHeight < 2) {
    fresh.width = Math.max(fresh.width, 960);
    fresh.height = Math.max(fresh.height, 540);
  }
  for (const logDepth of [true, false]) {
    const pack = tryContext(fresh);
    if (!pack) break;
    const renderer = makeRenderer(fresh, pack, logDepth);
    if (renderer) return renderer;
    loseWebGL(fresh);
  }

  throw new Error("THREE.WebGLRenderer: Error creating WebGL context.");
}

export function disposeRenderer(renderer: THREE.WebGLRenderer) {
  try {
    renderer.setAnimationLoop(null);
  } catch {
    /* older three */
  }
  try {
    renderer.dispose();
  } catch {
    /* already disposed */
  }
  try {
    renderer.forceContextLoss();
  } catch {
    /* no extension */
  }
  try {
    const gl = renderer.getContext();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* already lost */
  }
}
