// @ts-nocheck
/**
 * Responsive Character Guard V8
 *
 * The 2.5D actors are projected DOM elements anchored to the 3D world. Some
 * embedded/mobile preview shells keep the game canvas at its previous desktop
 * width for a short period after a viewport change. This guard keeps the player
 * actor inside the actually visible browser viewport without altering the game
 * camera, physics or world position.
 */

let raf = 0;

function clampPlayerToViewport() {
  raf = 0;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const el = document.querySelector('[data-sack-character-v8="benji"]');
  if (!(el instanceof HTMLElement) || getComputedStyle(el).display === "none") return;

  const parent = el.offsetParent instanceof HTMLElement ? el.offsetParent : el.parentElement;
  const parentRect = parent?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
  const rect = el.getBoundingClientRect();
  const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

  // Only intervene when the actor would otherwise be outside the visible area.
  // Preserve the normal projected 3D position whenever it already intersects.
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

  window.__SACK_RESPONSIVE_CHARACTERS_V8__ = {
    installed: true,
    viewport: { width: vw, height: vh },
    playerRect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    },
    corrected: Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25,
    parentOffset: { left: parentRect.left || 0, top: parentRect.top || 0 },
  };
}

function scheduleClamp() {
  if (raf || typeof requestAnimationFrame === "undefined") return;
  raf = requestAnimationFrame(clampPlayerToViewport);
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", scheduleClamp, { passive: true });
  window.addEventListener("orientationchange", scheduleClamp, { passive: true });

  // The game continuously changes actor position through inline styles. Watch
  // the player actor so a stale desktop projection is corrected immediately,
  // including in automation shells where resize can happen between engine ticks.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target;
      if (target instanceof HTMLElement && target.dataset?.sackCharacterV8 === "benji") {
        scheduleClamp();
        break;
      }
    }
  });

  const attach = () => {
    const el = document.querySelector('[data-sack-character-v8="benji"]');
    if (el instanceof HTMLElement) {
      observer.observe(el, { attributes: true, attributeFilter: ["style"] });
      scheduleClamp();
      return true;
    }
    return false;
  };

  if (!attach()) {
    const bootObserver = new MutationObserver(() => {
      if (attach()) bootObserver.disconnect();
    });
    bootObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.__SACK_RESPONSIVE_CHARACTERS_V8__ = { installed: true };
}
