import { useMemo, useState } from "react";
import type { GameEngine } from "../engine";
import type { ApparelId, HudSnapshot } from "../types";
import { APPAREL } from "../data";
import {
  WARP_SPOTS,
  copyText,
  formatPlaytestDump,
  loadPins,
  savePins,
  saveTickerOn,
  type PlaytestPin,
} from "../playtest";

type Tab = "live" | "warp" | "cheats" | "report";

export function PlaytestKit({
  hud,
  engine,
  open,
  ticker,
  hideHud,
  onClose,
  onTicker,
  onHideHud,
}: {
  hud: HudSnapshot;
  engine: GameEngine | null;
  open: boolean;
  ticker: boolean;
  hideHud: boolean;
  onClose: () => void;
  onTicker: (on: boolean) => void;
  onHideHud: (on: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("live");
  const [pins, setPins] = useState<PlaytestPin[]>(() => loadPins());
  const [copied, setCopied] = useState(false);
  const dump = useMemo(() => formatPlaytestDump(hud), [hud]);
  const d = hud.playtest;

  const pin = (note: string) => {
    const next: PlaytestPin[] = [{ at: Date.now(), note, dump }, ...pins].slice(0, 24);
    setPins(next);
    savePins(next);
  };

  const copyDump = async () => {
    const ok = await copyText(dump);
    setCopied(ok);
    pin(ok ? "copied" : "pin");
    engine?.showToast(ok ? "Bug dump copied · paste it with the screenshot" : "Pinned · copy failed, dump is in Report");
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[60] flex max-h-[min(58dvh,34rem)] flex-col rounded-t-2xl border-t border-gold/40 bg-[#0c0b0a]/96 shadow-2xl backdrop-blur-md sm:inset-y-auto sm:bottom-3 sm:left-3 sm:right-auto sm:max-h-[min(78dvh,40rem)] sm:w-[22.5rem] sm:rounded-2xl sm:border"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <p className="font-display text-xl leading-none text-gold">PLAYTEST KIT</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">F3 / KIT · debug while you play</p>
        </div>
        <button type="button" className="min-h-9 rounded-lg px-2 text-xs text-muted" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex shrink-0 gap-1 border-b border-border px-2 py-1.5">
        {(["live", "warp", "cheats", "report"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-8 flex-1 rounded-md px-1 text-[10px] uppercase tracking-wider ${
              tab === id ? "bg-gold text-black" : "text-muted"
            }`}
          >
            {id}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {tab === "live" && (
          <div className="space-y-2 font-mono text-[11px] leading-relaxed text-fg">
            <p className="text-gold">
              {d ? `${Math.round(d.fps)} fps · ${d.dtMs.toFixed(1)} ms · ${d.quality}` : "waiting"}
            </p>
            {d && (
              <>
                <p>
                  pos {Math.round(d.px)}, {Math.round(d.py)}
                </p>
                <p>
                  tile {d.tileX.toFixed(2)}, {d.tileY.toFixed(2)} · yaw {d.yaw.toFixed(2)} · {d.facing}
                </p>
                <p>
                  {d.loco}
                  {d.air > 0.05 ? ` · air ${d.air.toFixed(2)}` : ""}
                  {d.indoor ? " · indoor" : ""} · {d.hour.toFixed(2)}h
                </p>
                <p>near {d.nearPoi ?? "—"}</p>
                <p className="text-muted">{d.hint ?? "no hint"}</p>
                <p>
                  fit {d.equipped ?? "none"} · vehicle {d.vehicle ?? "—"}
                </p>
              </>
            )}
            <p className="text-muted">
              {hud.mode} · {hud.locationName} / {hud.district}
            </p>
            <label className="mt-3 flex min-h-10 items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={ticker}
                onChange={(e) => {
                  onTicker(e.target.checked);
                  saveTickerOn(e.target.checked);
                }}
              />
              Live ticker on screen
            </label>
            <label className="flex min-h-10 items-center gap-2 text-xs text-fg">
              <input type="checkbox" checked={hideHud} onChange={(e) => onHideHud(e.target.checked)} />
              Hide game HUD (clean screenshot)
            </label>
            <label className="flex min-h-10 items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={!!hud.playtest?.noclip}
                onChange={(e) => engine?.setPlaytestNoclip(e.target.checked)}
              />
              Noclip · walk / drive through walls
            </label>
          </div>
        )}

        {tab === "warp" && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-gold">Landmarks</p>
            <div className="grid grid-cols-2 gap-1.5">
              {WARP_SPOTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="min-h-11 rounded-lg border border-border bg-panel px-2 py-1.5 text-left"
                  onClick={() => engine?.warpTo(s.id)}
                >
                  <p className="text-xs font-medium text-fg">{s.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">{s.tag}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "cheats" && (
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" className="min-h-11 rounded-lg bg-gold px-2 text-xs font-semibold text-black" onClick={() => engine?.grantCash(200)}>
              +$200
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.grantRespect(10)}>
              +10 Respect
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.setWorldHour(12)}>
              Noon
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.setWorldHour(17.4)}>
              Dusk
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.setWorldHour(21)}>
              Night
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.forceDropLive()}>
              Drop Live
            </button>
            <button type="button" className="col-span-2 min-h-11 rounded-lg border border-border bg-panel px-2 text-xs text-fg" onClick={() => engine?.unlockAllFits()}>
              Unlock every fit
            </button>
            <div className="col-span-2 mt-1">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Wear</p>
              <div className="flex flex-wrap gap-1">
                {APPAREL.filter((a) => hud.owned.includes(a.id) || a.price === 0).slice(0, 12).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`rounded-md border px-2 py-1 text-[10px] ${
                      hud.equipped === a.id ? "border-gold bg-gold/15 text-gold" : "border-border text-muted"
                    }`}
                    onClick={() => engine?.wearOutfit(a.id as ApparelId)}
                  >
                    {a.name.replace("$ack ", "")}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="col-span-2 mt-2 min-h-11 rounded-lg border border-red-800/60 bg-red-950/40 px-2 text-xs text-red-200"
              onClick={() => {
                if (window.confirm("Wipe save and restart Drop Day?")) engine?.resetProgress();
              }}
            >
              Reset save
            </button>
          </div>
        )}

        {tab === "report" && (
          <div>
            <p className="text-xs text-muted">Pin the live state, screenshot the bug, paste the dump with it.</p>
            <button
              type="button"
              className="mt-2 min-h-11 w-full rounded-lg bg-gold font-display text-lg text-black"
              onClick={() => void copyDump()}
            >
              {copied ? "COPIED" : "COPY BUG DUMP"}
            </button>
            <pre className="mt-2 max-h-36 overflow-auto rounded-lg border border-border bg-black/40 p-2 font-mono text-[10px] leading-snug text-gold/90">
              {dump}
            </pre>
            {pins.length > 0 && (
              <>
                <p className="mt-3 text-[10px] uppercase tracking-wider text-muted">Pinned this session</p>
                <ul className="mt-1 space-y-1">
                  {pins.slice(0, 6).map((p) => (
                    <li key={p.at} className="rounded-md border border-border bg-panel px-2 py-1 text-[10px] text-muted">
                      {new Date(p.at).toLocaleTimeString()} · {p.note}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-2 text-[10px] uppercase tracking-wider text-muted"
                  onClick={() => {
                    setPins([]);
                    savePins([]);
                  }}
                >
                  Clear pins
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlaytestTicker({ hud }: { hud: HudSnapshot }) {
  const d = hud.playtest;
  if (!d) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2">
      <div className="rounded-md border border-gold/30 bg-black/70 px-2 py-0.5 font-mono text-[10px] tabular text-gold shadow-lg">
        {Math.round(d.fps)}fps · {d.tileX.toFixed(1)}×{d.tileY.toFixed(1)} · {d.nearPoi ?? hud.district} · {d.equipped ?? "tee"}
        {d.vehicle ? ` · ${d.vehicle}` : ""}
      </div>
    </div>
  );
}
