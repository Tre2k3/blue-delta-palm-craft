import type { ApparelId, TrophyId } from "./types";

export type UnlockId =
  | "gold_alley"
  | "night_run"
  | "van_chrome"
  | "van_gold"
  | "sackrow_night"
  | "cover_shot";

export type VerifiedGrant = {
  sackdollars?: number;
  respect?: number;
  apparelId?: ApparelId;
  badge?: TrophyId;
  colorway?: ApparelId;
  vanSkin?: "chrome" | "gold";
};

export type VerifiedReward = {
  orderId: string;
  verified: true;
  productId?: string;
  grants: VerifiedGrant;
};

export const RESPECT_MILESTONES: { at: number; unlock: UnlockId; label: string; toast: string }[] = [
  { at: 18, unlock: "cover_shot", label: "Cover Shot", toast: "Block photographer is outside HQ" },
  { at: 25, unlock: "gold_alley", label: "Gold Alley", toast: "Hidden alley unlocked behind HQ" },
  { at: 30, unlock: "night_run", label: "Night Run fit", toast: "Night Run colorway on the wall" },
  { at: 35, unlock: "sackrow_night", label: "Sackrow Night Court", toast: "Sackrow difficulty unlocked on the court" },
  { at: 40, unlock: "van_chrome", label: "Chrome Van", toast: "Drop van chrome wrap unlocked" },
  { at: 55, unlock: "van_gold", label: "Gold Van", toast: "Gold drop van wrap — legend status" },
];

export function nextMilestone(respect: number, have: Set<string>) {
  return RESPECT_MILESTONES.find((m) => respect < m.at || !have.has(m.unlock)) ?? null;
}

export function dueMilestones(respect: number, have: Set<string>) {
  return RESPECT_MILESTONES.filter((m) => respect >= m.at && !have.has(m.unlock));
}

export function parseVerifiedReward(payload: Record<string, unknown>): VerifiedReward | null {
  if (payload.verified !== true) return null;
  const orderId = typeof payload.orderId === "string" ? payload.orderId.trim() : "";
  if (!orderId || orderId.length < 6) return null;
  const raw = (payload.grants && typeof payload.grants === "object" ? payload.grants : {}) as Record<string, unknown>;
  const grants: VerifiedGrant = {};
  if (typeof raw.sackdollars === "number" && raw.sackdollars > 0 && raw.sackdollars <= 5000) grants.sackdollars = Math.round(raw.sackdollars);
  if (typeof raw.respect === "number" && raw.respect > 0 && raw.respect <= 100) grants.respect = Math.round(raw.respect);
  if (typeof raw.apparelId === "string") grants.apparelId = raw.apparelId as ApparelId;
  if (typeof raw.colorway === "string") grants.colorway = raw.colorway as ApparelId;
  if (typeof raw.badge === "string") grants.badge = raw.badge as TrophyId;
  if (raw.vanSkin === "chrome" || raw.vanSkin === "gold") grants.vanSkin = raw.vanSkin;
  if (typeof payload.productId === "string" && payload.productId.includes("hoodie")) {
    grants.colorway = grants.colorway ?? "gold_drop";
  }
  if (!grants.sackdollars && !grants.respect && !grants.apparelId && !grants.colorway && !grants.badge && !grants.vanSkin) {
    grants.sackdollars = 120;
    grants.respect = 8;
    grants.colorway = "gold_drop";
    grants.badge = "irl_family";
  }
  return { orderId, verified: true, productId: typeof payload.productId === "string" ? payload.productId : undefined, grants };
}
