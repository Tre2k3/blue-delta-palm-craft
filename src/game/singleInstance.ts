import type { GameEngine } from "./engine";

const CHANNEL = "sack-memphis-instance";
const LOCK = "sack-memphis-leader";

function isReturnLoad() {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  const spawn = q.get("spawn") || q.get("return");
  if (spawn === "hq-door" || spawn === "hq") return true;
  try {
    if (!document.referrer) return false;
    const host = new URL(document.referrer).hostname;
    return host === "10letters.store" || host === "www.10letters.store" || host === "lovable.app" || host.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

/** One live game. A store "back" load yields to the tab that is already running. */
export function claimGameInstance(getEngine: () => GameEngine | null): Promise<boolean> {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return Promise.resolve(true);
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = new BroadcastChannel(CHANNEL);
  const returning = isReturnLoad();
  let lead = false;
  let yielded = false;

  const beat = () => {
    if (!lead) return;
    try {
      localStorage.setItem(LOCK, JSON.stringify({ id, t: Date.now() }));
    } catch { /* private mode */ }
  };

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; id?: string } | null;
    if (!data || typeof data.type !== "string") return;
    if (data.type === "ping" && lead) {
      channel.postMessage({ type: "pong", id });
      return;
    }
    if (data.type === "focus-hq" && lead) {
      const eng = getEngine();
      eng?.placeOutsideHq();
      eng?.setPauseReason("parent", false);
      eng?.setPauseReason("hidden", false);
      try { window.focus(); } catch { /* ignore */ }
    }
  };

  channel.postMessage({ type: "ping" });

  return new Promise((resolve) => {
    const onPong = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string } | null;
      if (!data || data.type !== "pong" || data.id === id || lead || yielded) return;
      yielded = true;
      channel.postMessage({ type: "focus-hq" });
      window.setTimeout(() => {
        try { window.close(); } catch { /* not a script window */ }
      }, 50);
      resolve(false);
    };
    channel.addEventListener("message", onPong);
    window.setTimeout(() => {
      channel.removeEventListener("message", onPong);
      if (yielded) return;
      lead = true;
      window.name = "sackreligious-game";
      beat();
      window.setInterval(beat, 2000);
      resolve(true);
    }, returning ? 280 : 40);
  });
}
