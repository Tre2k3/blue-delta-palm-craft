import { useEffect, useRef, useState } from "react";
import type { HudState } from "./core/types";
import type { Game } from "./game";
import { prelude } from "./net/prelude";
import { initStore } from "./play/store";
import { Hud } from "./ui/Hud";

export function GameV2() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [error, setError] = useState("");
  const [bare, setBare] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let dead = false;
    let stop = () => {};
    const params = new URLSearchParams(window.location.search);
    if (params.get("cityview")) {
      setBare(true);
      void import("./dev/cityview").then(({ startCityView }) => {
        if (!dead && canvas.current) stop = startCityView(canvas.current);
      });
    } else {
      initStore();
      // A device tied to an account gets the account's newest progress while the game itself is loading.
      void Promise.all([import("./game"), prelude()])
        .then(([{ Game }]) => {
          if (dead || !canvas.current) return;
          const g = new Game(canvas.current, (h) => setHud(h));
          stop = () => g.dispose();
          setGame(g);
          g.push();
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "The game could not start."));
    }
    return () => {
      dead = true;
      stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#071018]">
      <canvas ref={canvas} className="block h-full w-full" />
      {game && hud && <Hud game={game} hud={hud} />}
      {!game && !error && !bare && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050608]" style={{ backgroundImage: "linear-gradient(180deg, rgba(5,6,8,0.55), rgba(5,6,8,0.9)), url(/game/opening-title.webp)", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#39ff14]" />
          <div className="text-sm font-extrabold uppercase tracking-[0.3em] text-white/80">Loading Memphis</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050608] p-6 text-center">
          <div>
            <div className="text-lg font-extrabold text-white">Memphis could not load on this device.</div>
            <div className="mt-2 text-sm text-white/60">{error}</div>
            <button className="mt-4 rounded-lg bg-[#39ff14] px-5 py-2 font-extrabold text-black" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
