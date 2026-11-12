import { useEffect, useRef, useState } from "react";
import { Camera, Download, Share2, X } from "lucide-react";
import type { HudState } from "../core/types";
import type { Game } from "../game";

type Shot = { url: string; blob: Blob; name: string };

let icon: HTMLImageElement | null = null;
function sackIcon() {
  if (!icon && typeof Image !== "undefined") {
    icon = new Image();
    icon.src = "/game/sack-icon.png";
  }
  return icon;
}

/** The game's picture as it stands, with the SackReligious frame drawn over it. */
function framed(scene: HTMLCanvasElement, place: string): HTMLCanvasElement {
  const W = Math.min(1920, scene.width);
  const H = Math.round((W * scene.height) / scene.width);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.drawImage(scene, 0, 0, W, H);
  const u = W / 1600;
  // The band along the bottom the name sits on.
  const band = g.createLinearGradient(0, H * 0.7, 0, H);
  band.addColorStop(0, "rgba(0,0,0,0)");
  band.addColorStop(1, "rgba(0,0,0,0.86)");
  g.fillStyle = band;
  g.fillRect(0, H * 0.7, W, H * 0.3);
  g.strokeStyle = "rgba(255,255,255,0.3)";
  g.lineWidth = Math.max(1, 2 * u);
  g.strokeRect(18 * u, 18 * u, W - 36 * u, H - 36 * u);
  g.textBaseline = "alphabetic";
  g.shadowColor = "rgba(57,255,20,0.75)";
  g.shadowBlur = 26 * u;
  g.fillStyle = "#ffffff";
  g.font = `${Math.round(78 * u)}px "Bebas Neue", Impact, "Arial Narrow", sans-serif`;
  const img = sackIcon();
  const drawn = !!img && img.complete && img.naturalWidth > 0;
  const x0 = 48 * u + (drawn ? 92 * u : 0);
  g.fillText("SACKRELIGIOUS", x0, H - 62 * u);
  g.shadowBlur = 0;
  g.fillStyle = "#39ff14";
  g.font = `800 ${Math.round(20 * u)}px "DM Sans", system-ui, sans-serif`;
  g.fillText(`MEMPHIS  ·  ${place.toUpperCase()}`, x0 + 3 * u, H - 36 * u);
  if (drawn && img) g.drawImage(img, 44 * u, H - 124 * u, 80 * u, 80 * u);
  g.textAlign = "right";
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = `700 ${Math.round(20 * u)}px "DM Sans", system-ui, sans-serif`;
  g.fillText("play.10letters.store", W - 48 * u, H - 40 * u);
  return c;
}

/**
 * Photo mode. The day stops, the lens comes off Benji's shoulder and goes wherever it is
 * dragged, and the picture it takes is framed and handed over to keep or to send.
 */
export function Photo({ game, hud }: { game: Game; hud: HudState }) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [flash, setFlash] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef(new Map<number, { x: number; y: number }>());
  const spread = useRef(0);

  useEffect(() => {
    sackIcon();
  }, []);
  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  const take = () => {
    const scene = game.shoot();
    const out = framed(scene, hud.district || "The 901");
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    game.sound.shutter();
    game.buzz(25);
    game.photoTaken();
    out.toBlob(
      (blob) => {
        if (!blob) return;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        setShot({ url: URL.createObjectURL(blob), blob, name: `sackreligious-memphis-${stamp}.jpg` });
      },
      "image/jpeg",
      0.92,
    );
  };

  const file = shot ? new File([shot.blob], shot.name, { type: "image/jpeg" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  const share = () => {
    if (!file) return;
    void navigator.share({ files: [file], title: "SackReligious: Memphis", text: "Benji out in the 901." }).catch(() => undefined);
  };

  return (
    <div data-menu className="pointer-events-auto absolute inset-0 z-40">
      {/* Drag to swing the lens round, pinch or wheel to move it in and out. */}
      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          spread.current = 0;
        }}
        onPointerMove={(e) => {
          const pts = pinch.current;
          if (!pts.has(e.pointerId)) return;
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.size >= 2) {
            const [a, b] = [...pts.values()];
            const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
            if (spread.current > 0) game.photoZoom((spread.current - d) * 0.012);
            spread.current = d;
            return;
          }
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          game.photoOrbit((e.clientX - d.x) * 0.006, (e.clientY - d.y) * 0.005);
          d.x = e.clientX;
          d.y = e.clientY;
        }}
        onPointerUp={(e) => {
          pinch.current.delete(e.pointerId);
          drag.current = null;
          spread.current = 0;
        }}
        onPointerCancel={(e) => {
          pinch.current.delete(e.pointerId);
          drag.current = null;
          spread.current = 0;
        }}
        onWheel={(e) => game.photoZoom(e.deltaY * 0.004)}
      />
      {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}

      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/85">Photo mode · drag to look · {hud.touch ? "pinch" : "scroll"} to zoom</div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 pb-4 pt-10">
        <button className="sr-btn sr-btn-ghost px-4 py-2.5" onClick={() => game.setPhase(hud.phase === "golden" ? "night" : hud.phase === "night" ? "day" : "golden")}>
          Light: {hud.phase === "golden" ? "sunset" : hud.phase === "night" ? "night" : "day"}
        </button>
        <button className="sr-btn sr-btn-ghost px-4 py-2.5" onClick={() => game.orderRain(!hud.rain)}>
          Rain: {hud.rain ? "on" : "off"}
        </button>
        <button className="sr-btn sr-btn-ghost px-4 py-2.5" onClick={() => game.photoZoom(-0.8)}>
          Closer
        </button>
        <button data-primary className="sr-btn sr-btn-green flex items-center gap-2 px-7 py-3 text-lg" onClick={take}>
          <Camera size={20} /> Take it
        </button>
        <button className="sr-btn sr-btn-ghost px-4 py-2.5" onClick={() => game.photoZoom(0.8)}>
          Further
        </button>
        <button className="sr-btn sr-btn-ghost px-4 py-2.5" onClick={() => game.close()}>
          Back
        </button>
      </div>

      {shot && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 p-3">
          <img src={shot.url} alt="Your picture" className="max-h-[72%] max-w-full rounded-lg border border-white/20 shadow-2xl" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a data-primary className="sr-btn sr-btn-green flex items-center gap-2 px-6 py-2.5" href={shot.url} download={shot.name}>
              <Download size={18} /> Save
            </a>
            {canShare && (
              <button className="sr-btn sr-btn-gold flex items-center gap-2 px-6 py-2.5" onClick={share}>
                <Share2 size={18} /> Share
              </button>
            )}
            <button className="sr-btn sr-btn-ghost flex items-center gap-2 px-6 py-2.5" onClick={() => setShot(null)}>
              <X size={18} /> Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
