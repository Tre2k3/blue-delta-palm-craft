// @ts-nocheck
/**
 * Responsive Character Guard V8
 *
 * The 2.5D actors are projected DOM elements anchored to the 3D world. Some
 * embedded/mobile preview shells keep the game canvas at its previous desktop
 * width after a viewport change. Clamp Benji after the final character sync so
 * the character can never be stranded outside the actually visible viewport.
 */

function clampPlayerToViewport() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const el = document.querySelector('[data-sack-character-v8="benji"]');
  if (!(el instanceof HTMLElement) || getComputedStyle(el).display === "none") return;

  const rect = el.getBoundingClientRect();
  const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  const pad = 8;

  let dx = 0;
  let dy = 0;
  if (rect.left < pad) dx = pad - rect.left;
  else if (rect.right > vw - pad) dx = (vw - pad) - rect.right;
  if (rect.top < pad) dy = pad - rect.top;
  else if (rect.bottom > vh - pad) dy = (vh - pad) - rect.bottom;

  if (Math.abs(dx) > 0.25) {
    const left = Number.parseFloat(el.style.left || "0") || 0;
    el.style.left = `${left + dx}px`;
  }
  if (Math.abs(dy) > 0.25) {
    const top = Number.parseFloat(el.style.top || "0") || 0;
    el.style.top = `${top + dy}px`;
  }

  const finalRect = el.getBoundingClientRect();
  window.__SACK_RESPONSIVE_CHARACTERS_V8__ = {
    installed: true,
    viewport: { width: vw, height: vh },
    playerRect: {
      left: finalRect.left,
      top: finalRect.top,
      right: finalRect.right,
      bottom: finalRect.bottom,
    },
    corrected: Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25,
  };
}

function install(World3D) {
  const p = World3D?.prototype;
  if (!p || p.__responsiveCharactersV8Installed) return;
  p.__responsiveCharactersV8Installed = true;

  // runtimeCharacterDomV8 and runtimeWardrobeV8 install before this module's
  // delayed hook. Wrapping the final sync means our clamp runs synchronously
  // after those systems write Benji's projected left/top values every frame.
  const oldSync = p.sync;
  p.sync = function responsiveCharactersV8Sync(frame) {
    const result = oldSync.call(this, frame);
    clampPlayerToViewport();
    return result;
  };

  const refresh = () => clampPlayerToViewport();
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("orientationchange", refresh, { passive: true });
  clampPlayerToViewport();
}

if (typeof window !== "undefined") {
  window.__SACK_RESPONSIVE_CHARACTERS_V8__ = { installed: true, waitingForWorld: true };
  setTimeout(async () => {
    try {
      const { World3D } = await import("./world3d");
      install(World3D);
      window.__SACK_RESPONSIVE_CHARACTERS_V8__.waitingForWorld = false;
    } catch (err) {
      console.error("Responsive Character Guard V8 failed", err);
      window.__SACK_RESPONSIVE_CHARACTERS_V8__ = { installed: false, error: String(err) };
    }
  }, 1700);
}
