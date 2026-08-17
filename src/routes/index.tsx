import { createFileRoute } from "@tanstack/react-router";
import { installCourtWorldIntegrity } from "../game/courtWorldIntegrity";
import { GameApp } from "../game/GameApp";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";

installGameplayIntegrity();
installCourtWorldIntegrity();

export const Route = createFileRoute("/")({
  component: GameApp,
});
