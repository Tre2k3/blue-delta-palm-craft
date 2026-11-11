import type { GameEngine } from "./engine";
import { bootAssetCatalog } from "./assetRegistry";
import { POIS } from "./data";
import { clippedTrafficLanes, driveBlockers, inDeepWater } from "./worldTopology";
import { PLAYER_GROUND_RADIUS_PX } from "./worldScale";
import { HQ_ANCHORS, HQ_FRONT_DOOR, insideHQ, atHqShowroom } from "./hqLocation";

export function attachProductionDebug(engine: GameEngine) {
  if (!import.meta.env.DEV && new URLSearchParams(window.location.search).get("qa") !== "1") return;
  window.__SACK_DEBUG__ = {
    snapshot: () => ({
      fps: engine.fpsEma,
      player: { x: engine.px, y: engine.py, radius: PLAYER_GROUND_RADIUS_PX, facing: engine.facing, deepWater: inDeepWater(engine.px, engine.py, PLAYER_GROUND_RADIUS_PX) },
      inputMode: engine.input.device,
      outfit: engine.equipped,
      mission: engine.mission.steps[engine.mission.activeStep]?.id ?? null,
      activity: engine.haunt ? "haunt" : engine.fish.active ? "fishing" : engine.bowl.active ? "bowling" : engine.race.active ? "racing" : engine.mode,
      npcCount: engine.npcLive.length,
      pedestrianCount: engine.peds.length,
      vehicleCount: engine.cars.length,
      assets: bootAssetCatalog().map((asset) => ({ ...asset, status: engine.assetLoads.get(asset.id) ?? "pending" })),
    }),
  };
  window.__SACK_TRAFFIC_DEBUG__ = {
    snapshot: () => ({
      lanes: clippedTrafficLanes(),
      blockers: driveBlockers(),
      vehicles: engine.cars.map((car) => ({ x: car.x, y: car.y, width: car.w, laneId: car.laneId, targetLane: car.turnTo, heading: car.yaw, velocity: { x: car.vx, y: car.vy }, braking: car.braking })),
    }),
  };
  window.__SACK_LOCATION_DEBUG__ = {
    snapshot: () => ({ current: engine.nearPoi, locations: POIS.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })), hq: { anchors: HQ_ANCHORS, frontDoor: HQ_FRONT_DOOR, inside: insideHQ(engine.px, engine.py), atShowroom: atHqShowroom(engine.px, engine.py) } }),
  };
}

declare global {
  interface Window {
    __SACK_DEBUG__?: { snapshot: () => unknown };
    __SACK_TRAFFIC_DEBUG__?: { snapshot: () => unknown };
    __SACK_LOCATION_DEBUG__?: { snapshot: () => unknown };
  }
}
