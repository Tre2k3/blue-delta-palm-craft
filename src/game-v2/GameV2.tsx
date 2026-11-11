import { useEffect, useRef, useState } from "react";
import type { HudState } from "./core/types";
import { Hud } from "./ui/Hud";

const EMPTY: HudState = {
  place: "street",
  dollars: 240,
  respect: 12,
  mission: "Walk the block to SackReligious HQ",
  prompt: "",
  charge: 0,
  night: false,
  golden: false,
  made: 0,
  taken: 0,
  dialogue: "",
  carrying: false,
  x: -30.2,
  z: 5.55,
  fit: "default",
  bait: 0,
  boost: false,
  log: false,
  marks: { fish: false, bowl: false, food: false, race: false },
  bestBowl: 0,
  bestRace: 0,
};

export function GameV2() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const hudRef = useRef(setHud);
  hudRef.current = setHud;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let stop = () => {};
    let dead = false;
    void import("./runtime").then(({ startSackV2 }) => {
      if (dead || !canvas.current) return;
      stop = startSackV2(canvas.current, (next) => hudRef.current(next));
    });
    return () => {
      dead = true;
      stop();
    };
  }, [5]);

  return (
    <div className="fixed inset-0 bg-[#071018]">
      <canvas ref={canvas} className="h-full w-full" />
      <Hud
        state={hud}
        night={() => (window as unknown as { __SACK_V2_INPUT__?: { toggleNight: () => void } }).__SACK_V2_INPUT__?.toggleNight()}
        action={(code) => {
          const input = (window as unknown as { __SACK_V2_INPUT__?: { press: (code: string) => void; setCharge: (v: boolean) => void } }).__SACK_V2_INPUT__;
          if (code === "SpaceDown") input?.setCharge(true);
          else if (code === "SpaceUp") input?.setCharge(false);
          else input?.press(code);
        }}
      />
    </div>
  );
}
