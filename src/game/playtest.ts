import { ART_REV, POIS, TILE } from "./data";
import { GAME_BUILD_VERSION } from "./config";
import type { HudSnapshot } from "./types";

export const PLAYTEST_TICKER_KEY = "sack-playtest-ticker";
export const PLAYTEST_PINS_KEY = "sack-playtest-pins";

export type PlaytestPin = {
  at: number;
  note: string;
  dump: string;
};

export const WARP_SPOTS: { id: string; name: string; tag: string }[] = [
  { id: "apartment", name: "Home", tag: "West Side" },
  { id: "store", name: "HQ", tag: "Midtown" },
  { id: "rcmworx", name: "RCM WORX", tag: "Union" },
  { id: "court", name: "901 Court", tag: "South Memphis" },
  { id: "lanes", name: "901 Lanes", tag: "east of court" },
  { id: "dropvan", name: "Drop Van", tag: "Union" },
  { id: "beale", name: "Beale", tag: "nightlife" },
  { id: "strip", name: "901 Strip", tag: "race Cam" },
  { id: "pyramid", name: "Pyramid", tag: "Harbor" },
  { id: "river", name: "River", tag: "fish" },
  { id: "welcome", name: "Welkome", tag: "sponsors" },
  { id: "velis", name: "Veli's", tag: "wings" },
  { id: "brothers", name: "Brothers", tag: "wingz" },
  { id: "foodtruck", name: "Catch Kitchen", tag: "grill" },
];

export function allWarpPois() {
  return POIS.filter((p) => p.id !== "river").map((p) => ({
    id: p.id,
    name: p.name,
    tag: p.district,
  }));
}

export function formatPlaytestDump(hud: HudSnapshot) {
  const d = hud.playtest;
  const lines = [
    `$ackReligious Playtest`,
    `build ${hud.buildVersion}  art ${ART_REV}  ${GAME_BUILD_VERSION}`,
    d
      ? `${Math.round(d.fps)}fps  ${d.dtMs.toFixed(1)}ms  ${d.quality}  ${d.hour.toFixed(2)}h`
      : `hour ${hud.worldHour.toFixed(2)}`,
    d
      ? `pos ${Math.round(d.px)}, ${Math.round(d.py)}  tile ${d.tileX.toFixed(2)}, ${d.tileY.toFixed(2)}`
      : "",
    `${hud.locationName} / ${hud.district}`,
    `mode ${hud.mode}  loco ${d?.loco ?? "—"}  facing ${d?.facing ?? "—"}  yaw ${d ? d.yaw.toFixed(2) : "—"}`,
    `fit ${hud.equipped ?? "none"}  vehicle ${d?.vehicle ?? (hud.driving ? "yes" : "—")}`,
    `near ${d?.nearPoi ?? "—"}  hint ${d?.hint ?? hud.interactHint ?? "—"}`,
    `dropLive ${hud.dropLive ? "yes" : "no"}  $${hud.sackdollars}  respect ${hud.respect}`,
    hud.missionStep ? `mission ${hud.missionTitle} · ${hud.missionStep}` : "",
    hud.bowling?.active ? `bowl f${hud.bowling.frame} ${hud.bowling.phase} ${hud.bowling.total}` : "",
    hud.rcm?.job ? `rcm ${hud.rcm.vehicle} → ${hud.rcm.destName}  runs ${hud.rcm.runs}` : "",
    hud.race?.active ? `race ${hud.race.phase} lap ${hud.race.lap}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function loadTickerOn() {
  try {
    const v = localStorage.getItem(PLAYTEST_TICKER_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function saveTickerOn(on: boolean) {
  try {
    localStorage.setItem(PLAYTEST_TICKER_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadPins(): PlaytestPin[] {
  try {
    const raw = localStorage.getItem(PLAYTEST_PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaytestPin[];
    return Array.isArray(parsed) ? parsed.slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function savePins(pins: PlaytestPin[]) {
  try {
    localStorage.setItem(PLAYTEST_PINS_KEY, JSON.stringify(pins.slice(0, 24)));
  } catch {
    /* ignore */
  }
}

export function tileOf(px: number, py: number) {
  return { x: px / TILE, y: py / TILE };
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
