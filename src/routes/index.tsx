import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "../game/GameApp";
import { installGameplayIntegrity } from "../game/gameplayIntegrity";

installGameplayIntegrity();

export const Route = createFileRoute("/")({
  component: GameApp,
});
