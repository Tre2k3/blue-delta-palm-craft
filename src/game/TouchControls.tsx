import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Footprints } from "lucide-react";
import type { GameEngine } from "./engine";
import type { HudSnapshot } from "./types";
function HoldButton({
  label,
  children,
  onHold,
  primary = false,
}: {
  label: string;
  children: ReactNode;
  onHold: (held: boolean) => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`touch-button ${primary ? "primary" : ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >
      {children}
    </button>
  );
}
export function TouchControls({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  const pointer = useRef<number | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const update = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / 38,
      y = (e.clientY - r.top - r.height / 2) / 38;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length;
    y /= length;
    engine.input.touch.mx = x;
    engine.input.touch.my = y;
    engine.input.device = "touch";
    setStick({ x, y });
  };
  const reset = () => {
    pointer.current = null;
    engine.input.touch.mx = engine.input.touch.my = 0;
    setStick({ x: 0, y: 0 });
  };
  return (
    <div className={`touch-controls ${hud.settings.showTouch ? "force-touch" : ""}`}>
      <div
        className="touch-stick"
        role="group"
        aria-label={hud.driving ? "Steer and accelerate" : "Movement joystick"}
        onPointerDown={(e) => {
          e.preventDefault();
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={update}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <div
          className="touch-stick-thumb"
          style={{ transform: `translate(${stick.x * 36}px,${stick.y * 36}px)` }}
        />
        <span>{hud.driving ? "DRIVE" : "MOVE"}</span>
      </div>
      <div className="touch-actions">
        <div className="flex gap-2">
          <HoldButton
            label="Look left"
            onHold={(v) => {
              engine.input.touch.lookX = v ? -1 : 0;
            }}
          >
            <ArrowLeft size={18} />
          </HoldButton>
          <HoldButton
            label="Look right"
            onHold={(v) => {
              engine.input.touch.lookX = v ? 1 : 0;
            }}
          >
            <ArrowRight size={18} />
          </HoldButton>
          <HoldButton
            label="Sprint"
            onHold={(v) => {
              engine.input.touch.run = v;
            }}
          >
            <Footprints size={18} />
          </HoldButton>
        </div>
        {hud.driving ? (
          <HoldButton
            label="Brake"
            primary
            onHold={(v) => {
              engine.input.touch.brake = v;
            }}
          >
            BRAKE
          </HoldButton>
        ) : hud.mode === "basketball" ? (
          <HoldButton
            label="Hold to shoot, release in green"
            primary
            onHold={(v) => {
              engine.input.touch.shoot = v;
            }}
          >
            SHOOT
          </HoldButton>
        ) : (
          <button
            className="touch-button primary"
            aria-label={hud.interactHint ?? "Interact"}
            onClick={() => engine.tryInteract()}
          >
            ACT
          </button>
        )}
      </div>
    </div>
  );
}
