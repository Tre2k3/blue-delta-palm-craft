import { createFileRoute } from "@tanstack/react-router";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { GameApp } from "../game/GameApp";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";
import { installInteriorCollisionPass } from "../game/interiorCollisionPass";
import { installMemphisEnvironmentPass } from "../game/memphisEnvironmentPass";
import { installVehicleVisualPass } from "../game/vehicleVisualPass";
import { installWorldHazardPass } from "../game/worldHazardPass";

installGameplayIntegrity();
installInteriorCollisionPass();
installWorldHazardPass();
installCourtWorldIntegrity();
installMemphisEnvironmentPass();
installVehicleVisualPass();

export const Route = createFileRoute("/")({
  component: GameApp,
});
