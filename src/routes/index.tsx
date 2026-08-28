import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { installApartmentLayoutPass } from "../game/apartmentLayoutPass";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";
import { installInteriorCollisionPass } from "../game/interiorCollisionPass";
import { installMemphisEnvironmentPass } from "../game/memphisEnvironmentPass";
import { installStreetSanitationPass } from "../game/streetSanitationPass";
import { installVehicleVisualPass } from "../game/vehicleVisualPass";
import { installWorldHazardPass } from "../game/worldHazardPass";

installGameplayIntegrity();
installApartmentLayoutPass();
installInteriorCollisionPass();
installWorldHazardPass();
installCourtWorldIntegrity();
installMemphisEnvironmentPass();
installStreetSanitationPass();
installVehicleVisualPass();

const GameApp = lazy(() => import("../game/GameApp").then((m) => ({ default: m.GameApp })));

export const Route = createFileRoute("/")({
  component: () => (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-bg font-display text-3xl text-gold">MEMPHIS</div>}>
      <GameApp />
    </Suspense>
  ),
});
