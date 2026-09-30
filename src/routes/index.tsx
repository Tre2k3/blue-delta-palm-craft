import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { installApartmentLayoutPass } from "../game/apartmentLayoutPass";
import { installCityDetailPass } from "../game/cityDetailPass";
import { installConsoleLookPass } from "../game/consoleLookPass";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";
import { installInteriorCollisionPass } from "../game/interiorCollisionPass";
import { installMemphisEnvironmentPass } from "../game/memphisEnvironmentPass";
import { installRiverDetailPass } from "../game/riverDetailPass";
import { installStreetSanitationPass } from "../game/streetSanitationPass";
import { installVehicleVisualPass } from "../game/vehicleVisualPass";
import { installWorldHazardPass } from "../game/worldHazardPass";

installGameplayIntegrity();
installApartmentLayoutPass();
installInteriorCollisionPass();
installWorldHazardPass();
installCourtWorldIntegrity();
installMemphisEnvironmentPass();
installRiverDetailPass();
installStreetSanitationPass();
installVehicleVisualPass();
installConsoleLookPass();
installCityDetailPass();

const GameApp = lazy(() => import("../game/GameApp").then((m) => ({ default: m.GameApp })));

export const Route = createFileRoute("/")({
  component: () => (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-bg font-display text-3xl text-gold">MEMPHIS</div>}>
      <GameApp />
    </Suspense>
  ),
});
