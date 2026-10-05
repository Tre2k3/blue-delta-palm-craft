import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const GameV2 = lazy(() => import("../game-v2/GameV2").then((m) => ({ default: m.GameV2 })));

export const Route = createFileRoute("/")({
  component: () => (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0d0d0d] font-display text-4xl tracking-wide text-[#e0b33a]">$ACKRELIGIOUS</div>}>
      <GameV2 />
    </Suspense>
  ),
});
