/** Seasonal layer switch. The regular Memphis world stays in the repo.
 *  Set this to "none" to ship the everyday city again.
 *  Preview override: ?season=none or ?season=halloween_2026
 */
export type SeasonalEventId = "none" | "halloween_2026";

export const SEASONAL_EVENT: SeasonalEventId = "halloween_2026";

export function halloweenOn() {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("season");
    if (q === "none") return false;
    if (q === "halloween_2026") return true;
  }
  return SEASONAL_EVENT === "halloween_2026";
}
