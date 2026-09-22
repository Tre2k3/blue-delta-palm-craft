import { Pause, Map, SwitchCamera, Maximize, Car } from "lucide-react";
import type { GameEngine } from "./engine";
import type { HudSnapshot } from "./types";
export function UpgradeHUD({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  return (
    <>
      <div className="game-toolbar">
        <button aria-label="Pause game" onClick={() => engine.pause()}>
          <Pause size={18} />
          <span>Menu</span>
        </button>
        <button aria-label="Open city map" onClick={() => engine.pause("map")}>
          <Map size={18} />
          <span>Map</span>
        </button>
        <button aria-label="Change camera" onClick={() => engine.toggleView()}>
          <SwitchCamera size={18} />
          <span>{hud.cameraView === "first" ? "First person" : "Third person"}</span>
        </button>
        <button
          aria-label="Toggle fullscreen"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
            else
              void engine.canvas.parentElement
                ?.requestFullscreen?.()
                .catch(() => engine.showToast("Fullscreen unavailable in this browser."));
          }}
        >
          <Maximize size={18} />
        </button>
        {(hud.vehicleAvailable || hud.driving) && (
          <button onClick={() => engine.toggleVehicle()}>
            <Car size={18} />
            <span>{hud.driving ? "Exit van" : "Drive van"}</span>
          </button>
        )}
      </div>
      {hud.driving && (
        <div className="speedometer">
          <span className="eyebrow">DROP VAN</span>
          <strong>
            {hud.speed}
            <small>MPH</small>
          </strong>
          <span className="text-xs text-muted">Space brake · G exit</span>
        </div>
      )}
      {hud.courtResult && (
        <div className="court-results" role="status">
          <p className="eyebrow">901 COURT · RUN COMPLETE</p>
          <h2 className="font-display text-3xl">{hud.courtResult.score} POINTS</h2>
          <p className="text-sm text-muted">
            {hud.courtResult.shots} shots · Best streak {hud.courtResult.best}
          </p>
          <p className="mt-2 text-lg font-bold text-primary">
            +${hud.courtResult.payout} $ackdollars
          </p>
          <button
            className="secondary-button mt-3"
            onClick={() => {
              engine.courtResult = null;
              engine.emitHud();
            }}
          >
            Keep exploring
          </button>
        </div>
      )}
    </>
  );
}
