import { useEffect, useState } from "react";

/** Portrait is playable. This is a hint, never a lock. */
export function RotatePrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const read = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const phone = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
      const narrow = window.innerWidth < 820;
      setShow(!dismissed && phone && portrait && narrow);
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, [dismissed]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center p-2">
      <button
        type="button"
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-gold/40 bg-bg/90 px-4 py-2 text-left shadow-lg backdrop-blur-md"
        onClick={() => setDismissed(true)}
      >
        <span className="font-display text-lg text-gold">LANDSCAPE</span>
        <span className="text-[11px] uppercase tracking-wider text-muted">Turn sideways for the full block · tap to play portrait</span>
      </button>
    </div>
  );
}
