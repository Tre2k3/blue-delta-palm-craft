import { createFileRoute } from "@tanstack/react-router";
import { installApartmentLayoutPass } from "../game/apartmentLayoutPass";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { GameApp } from "../game/GameApp";
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

export const Route = createFileRoute("/")({
  component: GameApp,
});
