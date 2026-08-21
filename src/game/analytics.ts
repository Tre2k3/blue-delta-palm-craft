import { ANALYTICS_ENABLED } from "./config";

export type AnalyticsEventName =
  | "game_started"
  | "new_game"
  | "mission_started"
  | "mission_completed"
  | "hq_entered"
  | "product_viewed"
  | "product_buy_clicked"
  | "basketball_started"
  | "basketball_completed"
  | "chapter_completed";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsSink {
  send(name: AnalyticsEventName, payload: AnalyticsPayload, at: number): void;
}

class ConsoleSink implements AnalyticsSink {
  send(name: AnalyticsEventName, payload: AnalyticsPayload) {
    if (typeof console === "undefined") return;
    if (importMetaDev()) console.debug("[sack:analytics]", name, payload);
  }
}

function importMetaDev() {
  try {
    return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

class AnalyticsService {
  enabled = ANALYTICS_ENABLED;
  events: { name: AnalyticsEventName; payload: AnalyticsPayload; at: number }[] = [];
  sinks: AnalyticsSink[] = [new ConsoleSink()];
  private last: Partial<Record<AnalyticsEventName, number>> = {};

  track(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
    if (!this.enabled) return;
    const at = Date.now();
    const prev = this.last[name] ?? 0;
    if (at - prev < 80 && name !== "product_viewed" && name !== "product_buy_clicked") return;
    this.last[name] = at;
    const rec = { name, payload, at };
    this.events.push(rec);
    if (this.events.length > 200) this.events.shift();
    for (const sink of this.sinks) sink.send(name, payload, at);
  }
}

export const analytics = new AnalyticsService();

export function installAnalyticsTestHook() {
  if (typeof window === "undefined") return;
  (window as Window & { __SACK_ANALYTICS__?: unknown }).__SACK_ANALYTICS__ = {
    events: () => analytics.events.slice(),
    track: (name: string, payload?: Record<string, unknown>) =>
      analytics.track(name as AnalyticsEventName, (payload ?? {}) as AnalyticsPayload),
  };
}
