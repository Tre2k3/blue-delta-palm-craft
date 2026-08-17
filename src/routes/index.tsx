import { createFileRoute } from "@tanstack/react-router";
import "../game/gameplayIntegrity";
import { GameApp } from "../game/GameApp";

export const Route = createFileRoute("/")({
  component: GameApp,
});
