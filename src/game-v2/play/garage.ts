import type { WrapPackName } from "../../game/vehicleWraps";
import type { CarKind } from "../actors/vehicle";

/**
 * What Benji can drive. Each one wears a SackReligious wrap and handles a little differently
 * on the street: `top`, `accel` and `grip` scale the street car's own numbers. In the street
 * race everyone runs the same engine, so a ride is what he shows up in, not a head start.
 */
export type Ride = { id: string; name: string; kind: CarKind; wrap: WrapPackName; paint: number; price: number; line: string; top: number; accel: number; grip: number };

export const RIDES: Ride[] = [
  { id: "coupe", name: "Klothing Coupe", kind: "coupe", wrap: "klothing-coupe", paint: 0x14592f, price: 0, line: "The one K Blanco handed over. Quick, light, a little loose.", top: 1, accel: 1, grip: 1 },
  { id: "sedan", name: "Klothing Sedan", kind: "sedan", wrap: "klothing-sedan", paint: 0x101114, price: 350, line: "Four doors and it sticks. The easy one to drive fast.", top: 0.97, accel: 0.96, grip: 1.16 },
  { id: "sackrow", name: "Sackrow Sedan", kind: "sedan", wrap: "sackrow-sedan", paint: 0x101114, price: 600, line: "The Sackrow car. More at the top end than anything else in the lot.", top: 1.1, accel: 1.02, grip: 1.02 },
  { id: "suv", name: "Klothing SUV", kind: "suv", wrap: "klothing-suv", paint: 0x101114, price: 800, line: "Sits high, pulls hard, leans in the corners.", top: 0.96, accel: 1.12, grip: 0.92 },
  { id: "sackrow-suv", name: "Sackrow SUV", kind: "suv", wrap: "sackrow-suv", paint: 0x101114, price: 1100, line: "The big one in Sackrow colours. Quick off the line and planted.", top: 1.02, accel: 1.14, grip: 1.06 },
  { id: "van", name: "Drop Van", kind: "van", wrap: "sackrow-van", paint: 0x101114, price: 1500, line: "The van the drops come in. Slow to get going, and then it does not stop.", top: 1.12, accel: 0.8, grip: 0.9 },
];

export const rideById = (id: string) => RIDES.find((r) => r.id === id) ?? RIDES[0]!;
