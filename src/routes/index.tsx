import { createFileRoute } from "@tanstack/react-router";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { GameApp } from "../game/GameApp";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";
import { installVehicleVisualPass } from "../game/vehicleVisualPass";

installGameplayIntegrity();
installCourtWorldIntegrity();
installVehicleVisualPass();

export const Route = createFileRoute("/")({
  component: GameApp,
});
