import type { LocationId, WorldPoi } from "./types";

export type RcmVehicleId = "sprinter" | "escalade";

export type RcmVehicle = {
  id: RcmVehicleId;
  name: string;
  line: string;
  tag: string;
  seats: number;
  fare: number;
  perks: string[];
  ideal: string;
};

export type RcmDrop = {
  id: LocationId;
  name: string;
  tag: string;
};

export const RCM = {
  name: "RCM WORX",
  line: "ELITE LUXURY TRANSPORT",
  motto: "ON TIME. EVERY TIME.",
  phone: "662.772.6345",
  web: "rcmworx.com",
  city: "Memphis, Tennessee",
  flyer: "/game/ads/rcm-worx.png",
  partner: "SackReligious × RCM WORX",
} as const;

export const RCM_VEHICLES: RcmVehicle[] = [
  {
    id: "sprinter",
    name: "Mercedes-Benz Sprinter",
    line: "Spacious. Comfortable. Impressive.",
    tag: "8 pax · Wi-Fi · captain chairs",
    seats: 8,
    fare: 85,
    perks: ["Up to 8 passengers", "Onboard Wi-Fi", "Captain chairs + benches", "Fridge · USB · climate", "Window shades"],
    ideal: "Corporate groups, VIP, airport & FBO",
  },
  {
    id: "escalade",
    name: "Cadillac Escalade ESV",
    line: "Executive comfort. Elevated.",
    tag: "5 pax · leather · tri-zone",
    seats: 5,
    fare: 60,
    perks: ["Up to 5 passengers", "Onboard Wi-Fi", "Spacious leather", "Tri-zone climate", "Premium sound · USB"],
    ideal: "Executive travel, airport, private events",
  },
];

export const RCM_DROPS: RcmDrop[] = [
  { id: "pyramid", name: "Harbor FBO", tag: "The Pyramid · airport energy" },
  { id: "downtown", name: "Downtown", tag: "Corporate · VIP clients" },
  { id: "store", name: "SackReligious HQ", tag: "Partner drop · Midtown" },
  { id: "court", name: "901 Court", tag: "After the game" },
  { id: "beale", name: "Beale Street", tag: "Nightlife · discreet" },
  { id: "river", name: "Riverfront", tag: "Private event" },
];

export const RCM_ARRIVE = 78;

export function rcmVehicle(id: string | null | undefined) {
  return RCM_VEHICLES.find((v) => v.id === id) ?? RCM_VEHICLES[0]!;
}

export function rcmDrop(id: string | null | undefined) {
  return RCM_DROPS.find((d) => d.id === id) ?? RCM_DROPS[0]!;
}

export function rcmFare(id: RcmVehicleId, runs: number) {
  const base = rcmVehicle(id).fare;
  return runs <= 0 ? Math.round(base * 0.5) : base;
}

export function rcmParked(lot: WorldPoi, id: RcmVehicleId) {
  const y = lot.y + lot.h * 0.52;
  const x = id === "sprinter" ? lot.x + lot.w * 0.3 : lot.x + lot.w * 0.7;
  return { x, y, yaw: 0 };
}

export type RcmHud = {
  open: boolean;
  vehicle: RcmVehicleId | null;
  destId: LocationId | null;
  destName: string | null;
  fare: number;
  runs: number;
  job: boolean;
  chauffeur: boolean;
  prompt: string;
  partner: boolean;
};

export function rcmHud(opts: {
  open: boolean;
  vehicle: RcmVehicleId | null;
  destId: LocationId | null;
  runs: number;
  job: boolean;
  chauffeur: boolean;
}): RcmHud {
  const v = opts.vehicle ? rcmVehicle(opts.vehicle) : null;
  const d = opts.destId ? rcmDrop(opts.destId) : null;
  const partner = opts.runs <= 0;
  const fare = v ? rcmFare(v.id, opts.runs) : 0;
  let prompt = "Pick a whip, then a drop.";
  if (opts.job && v && d) {
    prompt = opts.chauffeur ? `Rico driving · ${d.name}` : `VIP · ${d.name} · ${v.name.split(" ").pop()}`;
  } else if (v && d) {
    prompt = `${v.name.split(" ").pop()} → ${d.name} · $${fare}`;
  } else if (v) {
    prompt = `${v.name} · pick a drop`;
  }
  return {
    open: opts.open,
    vehicle: opts.vehicle,
    destId: opts.destId,
    destName: d?.name ?? null,
    fare,
    runs: opts.runs,
    job: opts.job,
    chauffeur: opts.chauffeur,
    prompt,
    partner,
  };
}
