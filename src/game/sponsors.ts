/** 30-day Welkome packages. Only 2 sponsors + 2 artists per cycle. */

export type PackageKind = "sponsor" | "artist";
export type PackageTier = "standard" | "deluxe" | "premium";
export type SlotStatus = "open" | "held";

export type PackageDef = {
  kind: PackageKind;
  tier: PackageTier;
  price: number;
  name: string;
  tag: string;
  perks: string[];
};

export type CycleSlot = {
  id: string;
  kind: PackageKind;
  tier: PackageTier | null;
  status: SlotStatus;
  name: string;
  handle: string;
  where: string;
  note: string;
};

export const CYCLE_LABEL = "AUG 24 – SEP 22";
export const CYCLE_DAYS = 30;
export const SPONSOR_CAP = 2;
export const ARTIST_CAP = 2;

export const SPONSOR_PACKAGES: PackageDef[] = [
  {
    kind: "sponsor",
    tier: "standard",
    price: 150,
    name: "Sponsor Standard",
    tag: "$150 · 30 DAYS",
    perks: [
      "Food truck in Welkome To $ackReligious World",
      "Real-time menu at the window",
      "Social media info posted in-world + on the site",
    ],
  },
  {
    kind: "sponsor",
    tier: "deluxe",
    price: 225,
    name: "Sponsor Deluxe",
    tag: "$225 · 30 DAYS",
    perks: [
      "Food truck AND a kharakter in the world",
      "Real-time menu + contact + socials",
      "One kustom $ackReligious x Sponsor kollab jersey on the site for 30 days",
      "You keep 100% of jersey profit",
    ],
  },
];

export const ARTIST_PACKAGES: PackageDef[] = [
  {
    kind: "artist",
    tier: "standard",
    price: 100,
    name: "Artist Standard",
    tag: "$100 · 30 DAYS",
    perks: [
      "Song on the site for 30 days",
      "Social media info posted",
      "Song MUST BE KLEAN",
    ],
  },
  {
    kind: "artist",
    tier: "deluxe",
    price: 180,
    name: "Artist Deluxe",
    tag: "$180 · 30 DAYS",
    perks: [
      "Song on the site AND in $ackReligious World",
      "Plays when Benji walks up (truck, listening post, or kharakter)",
      "Kharakter build in the world — you design it, we drop it in",
      "Socials + streaming links posted",
      "Song MUST BE KLEAN",
    ],
  },
  {
    kind: "artist",
    tier: "premium",
    price: 250,
    name: "Artist Premium",
    tag: "$250 · 30 DAYS",
    perks: [
      "Everything in Deluxe",
      "Your own billboard on the 901",
      "Listening post or food-truck screen — music video loops when Benji is close",
      "Song MUST BE KLEAN",
    ],
  },
];

export const ALL_PACKAGES = [...SPONSOR_PACKAGES, ...ARTIST_PACKAGES];

/** Live cycle. House truck (901 Catch) is not a paid slot. */
export const CYCLE_SLOTS: CycleSlot[] = [
  {
    id: "sponsor-a",
    kind: "sponsor",
    tier: "deluxe",
    status: "held",
    name: "Veli's Wings",
    handle: "@yungveli",
    where: "Beale · food truck + kharakter + Go Girl video",
    note: "Deluxe live. Walk up, the video plays, Benji bops.",
  },
  {
    id: "sponsor-b",
    kind: "sponsor",
    tier: "standard",
    status: "held",
    name: "Brothers Wingz N Things",
    handle: "@brotherswingznthings",
    where: "Beale · food truck + real-time menu",
    note: "Standard live. Window, cooks, socials on the board.",
  },
  {
    id: "artist-a",
    kind: "artist",
    tier: null,
    status: "open",
    name: "OPEN LISTENING POST",
    handle: "your song here",
    where: "Beale East · listening post",
    note: "Deluxe $180 puts your record + kharakter here. Plays when Benji is close.",
  },
  {
    id: "artist-b",
    kind: "artist",
    tier: null,
    status: "open",
    name: "OPEN BILLBOARD",
    handle: "your name here",
    where: "Union / Highland wall",
    note: "Premium $250 is Deluxe plus this billboard for 30 days.",
  },
];

export function slotsOpen(kind: PackageKind) {
  const cap = kind === "sponsor" ? SPONSOR_CAP : ARTIST_CAP;
  const held = CYCLE_SLOTS.filter((s) => s.kind === kind && s.status === "held").length;
  return Math.max(0, cap - held);
}

export function sponsorHud() {
  return {
    cycle: CYCLE_LABEL,
    days: CYCLE_DAYS,
    sponsorOpen: slotsOpen("sponsor"),
    artistOpen: slotsOpen("artist"),
    sponsorCap: SPONSOR_CAP,
    artistCap: ARTIST_CAP,
    packages: ALL_PACKAGES,
    slots: CYCLE_SLOTS,
    pitch: MIKEY_PITCH,
  };
}

export type SponsorHud = ReturnType<typeof sponsorHud>;

/** Copy-paste DM for booking. Public package copy only. */
export const MIKEY_PITCH = `Mikey Freshcobar

We live with the 30-day Welkome packages. Only 2 sponsors and 2 artists per cycle so it stays exclusive. Prices subject to change depending on the cut.

SPONSORS (2 slots / 30 days)
Standard $150 — food truck in Welkome To $ackReligious World, real-time menu, socials posted.
Deluxe $225 — truck + kharakter, real-time menu, contact + socials, and one kustom $ackReligious x Sponsor kollab jersey on the site for those 30 days. They keep 100% of the jersey profit.

ARTISTS (2 slots / 30 days, songs MUST BE KLEAN)
Standard $100 — song on the site, socials posted.
Deluxe $180 — song on the site AND in the world, kharakter build, socials + streaming links. We already have it where the music / music video plays on repeat when Benji walks up.
Premium $250 — Deluxe plus your own billboard. Some people gone want the truck screen, some gone want a billboard or a listening post.

HOW IT LOOKS IN THE WORLD RIGHT NOW
Veli's Wings is the Deluxe sponsor example — truck, cooks in the window, Go Girl looping only when you close, Benji boppin. Brothers Wingz N Things is Standard — legit truck, menu, socials. Two artist slots are open this cycle: a Beale listening post and a 901 billboard. You design the kharakters, send them, we drop them in.

Jersey sales: 100% to the Deluxe sponsor.

Tell who you want in. Clean records only. We book the two + two and run the cycle.`;
