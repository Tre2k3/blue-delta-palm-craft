import type { ApparelId } from "./types";
import { APPAREL } from "./data";
import { GAME_BUILD_VERSION, PRODUCT_CATALOG_URL, storeProductUrl } from "./config";
import { analytics } from "./analytics";
import { parseVerifiedReward, type VerifiedReward } from "./progression";
import {
  GAME_ID,
  StoreBridge,
  type LiveProduct,
  type ParentTheme,
  type StorePlayer,
} from "./storeBridge";

export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  sizes?: string[];
  available?: boolean;
  storeUrl: string;
  virtualOutfitId?: ApparelId;
  zone?: string;
}

type CatalogFile = { products?: StoreProduct[] };

export type CommerceSnapshot = {
  connected: boolean;
  signedIn: boolean;
  displayName: string | null;
  userId: string | null;
  sackBucks: number | null;
  currency: string;
  rewardsEnabled: boolean;
  catalogLive: boolean;
  lastAck: { forType: string; ok: boolean; error?: string; granted?: number } | null;
  signInHint: string | null;
};

const APPAREL_IDS = new Set(APPAREL.map((a) => a.id));

function asOutfit(id?: string | null): ApparelId | undefined {
  if (id && APPAREL_IDS.has(id as ApparelId)) return id as ApparelId;
  return undefined;
}

function outfitFromProduct(p: { id: string; name: string; virtualOutfitId?: string; zone?: string }): ApparelId | undefined {
  const explicit = asOutfit(p.virtualOutfitId);
  if (explicit) return explicit;
  const byId = APPAREL.find((a) => a.productId === p.id);
  if (byId) return byId.id;
  const n = p.name.toLowerCase();
  if (n.includes("night run")) return "night_run";
  if (n.includes("gold drop") || n.includes("irl gold")) return "gold_drop";
  if (n.includes("worldwide") || n.includes("tour tee") || n.includes("sacks giving")) {
    if (n.includes("white")) return "tour_white";
    if (n.includes("red")) return "tour_red";
    return "tour_black";
  }
  if (n.includes("kollab") || n.includes("veli jersey")) return "kollab_jersey";
  if (n.includes("jersey")) return "fresh_jersey";
  if (n.includes("moneybag") && n.includes("hoodie")) return "moneybag_hoodie";
  if (n.includes("midnight") || (n.includes("black") && n.includes("hoodie"))) return "black_hoodie";
  if (n.includes("sweat")) return "green_sweats";
  if (n.includes("snap") || n.includes("cap") || n.includes("hat")) return "white_cap";
  if (n.includes("chain")) return "gold_chain";
  if (n.includes("starter") || n.includes("green tee")) return "starter_tee";
  if (n.includes("tee") || n.includes("shirt")) return "classic_green";
  return undefined;
}

function liveToStore(p: LiveProduct): StoreProduct {
  const virtualOutfitId = outfitFromProduct(p);
  const slug = p.slug || p.id;
  return {
    id: p.id,
    slug,
    name: p.name,
    imageUrl: p.image,
    price: p.price,
    currency: "USD",
    sizes: p.sizes,
    available: p.available !== false,
    storeUrl: p.url || storeProductUrl(slug),
    virtualOutfitId,
    zone: p.zone,
  };
}

class ProductCatalog {
  products: StoreProduct[] = [];
  loaded = false;
  live = false;
  error: string | null = null;

  byId(id: string) {
    return this.products.find((p) => p.id === id) ?? null;
  }

  byVirtual(id: ApparelId) {
    return this.products.find((p) => p.virtualOutfitId === id) ?? null;
  }

  applyLive(products: LiveProduct[]) {
    this.products = products.map(liveToStore);
    this.loaded = true;
    this.live = true;
    this.error = null;
  }

  async loadFallback(url = PRODUCT_CATALOG_URL) {
    if (this.live) return this.products;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const json = (await res.json()) as CatalogFile;
      this.products = Array.isArray(json.products) ? json.products.map(normalizeFallback) : FALLBACK_CATALOG;
      this.loaded = true;
      this.error = null;
    } catch (err) {
      this.error = err instanceof Error ? err.message : "catalog failed";
      this.products = FALLBACK_CATALOG;
      this.loaded = true;
    }
    return this.products;
  }
}

function normalizeFallback(raw: StoreProduct): StoreProduct {
  const slug = raw.slug || raw.id;
  return {
    ...raw,
    slug,
    storeUrl: raw.storeUrl || storeProductUrl(slug),
    available: raw.available !== false,
    currency: raw.currency ?? "USD",
    sizes: raw.sizes ?? ["S", "M", "L", "XL", "2XL"],
    virtualOutfitId: raw.virtualOutfitId ?? outfitFromProduct(raw),
    imageUrl: raw.imageUrl,
    zone: raw.zone ?? "hq",
  };
}

const FALLBACK_CATALOG: StoreProduct[] = [
  {
    id: "sr-black-gold-tee",
    slug: "sr-black-gold-tee",
    name: "SackReligious Black & Gold Tee",
    storeUrl: storeProductUrl("sr-black-gold-tee"),
    virtualOutfitId: "classic_green",
    price: 48,
    currency: "USD",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    zone: "hq",
  },
];

type PauseHooks = {
  pause: (source: "parent" | "hidden") => void;
  resume: (source: "parent" | "hidden") => void;
  toast: (text: string) => void;
  grant?: (reward: VerifiedReward) => void;
};

class CommerceService {
  catalog = new ProductCatalog();
  bridge = new StoreBridge();
  player: StorePlayer = { signedIn: false, userId: null, displayName: null, sackBucks: 0 };
  currency = "Sack Bucks";
  lastAck: CommerceSnapshot["lastAck"] = null;
  lastIntent: { kind: "view" | "buy"; productId: string; size?: string; at: number } | null = null;
  lastRunId: string | null = null;
  private sentRuns = new Set<string>();
  private listeners = new Set<(snap: CommerceSnapshot) => void>();
  private hooks: PauseHooks | null = null;
  theme: ParentTheme | null = null;

  bind(hooks: PauseHooks) {
    this.hooks = hooks;
  }

  subscribe(fn: (snap: CommerceSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): CommerceSnapshot {
    const connected = this.bridge.connected;
    const signedIn = this.player.signedIn;
    return {
      connected,
      signedIn,
      displayName: this.player.displayName,
      userId: this.player.userId,
      sackBucks: connected ? this.player.sackBucks : null,
      currency: this.currency,
      rewardsEnabled: connected && signedIn,
      catalogLive: this.catalog.live,
      lastAck: this.lastAck,
      signInHint: connected && !signedIn ? "Sign in to earn Sack Bucks" : null,
    };
  }

  private emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  async init() {
    this.bridge.start({
      onInit: (payload) => {
        this.currency = payload.currency ?? "Sack Bucks";
        this.theme = {
          black: payload.theme?.black ?? "#0D0D0D",
          gold: payload.theme?.gold ?? "#C9A84C",
          neon: payload.theme?.neon ?? "#39FF14",
          cream: payload.theme?.cream ?? "#F5F0E1",
        };
        this.bridge.applyTheme(this.theme);
        this.bridge.post("GG_REQUEST_CATALOG", {});
        this.emit();
      },
      onPlayer: (player) => {
        this.player = player;
        this.emit();
      },
      onCatalog: (products) => {
        this.catalog.applyLive(products);
        this.emit();
      },
      onAck: (ack) => {
        this.lastAck = ack;
        if (typeof ack.sackBucks === "number") this.player = { ...this.player, sackBucks: ack.sackBucks };
        if (ack.forType === "GG_RUN_COMPLETE" && ack.ok && (ack.granted ?? 0) > 0) {
          this.hooks?.toast(`+${ack.granted} ${this.currency}`);
        }
        if (ack.ok === false && ack.error) this.hooks?.toast(ack.error);
        this.emit();
      },
      onPause: () => this.hooks?.pause("parent"),
      onResume: () => this.hooks?.resume("parent"),
      onReward: (payload) => {
        const reward = parseVerifiedReward(payload);
        if (!reward) return;
        this.hooks?.grant?.(reward);
      },
    });
    await this.catalog.loadFallback();
    this.emit();
  }

  productForOutfit(id: ApparelId) {
    return this.catalog.byVirtual(id);
  }

  inspectProduct(product: StoreProduct) {
    this.lastIntent = { kind: "view", productId: product.id, at: Date.now() };
    analytics.track("product_viewed", { productId: product.id, slug: product.slug });
  }

  addToCart(product: StoreProduct, size: string, qty = 1) {
    const allowed = product.sizes?.includes(size) ? size : product.sizes?.[0];
    if (!allowed) return;
    this.lastIntent = { kind: "buy", productId: product.id, size: allowed, at: Date.now() };
    analytics.track("product_buy_clicked", { productId: product.id, slug: product.slug, size: allowed });
    if (this.bridge.connected) {
      this.bridge.post("GG_ADD_TO_CART", { productId: product.id, size: allowed, qty });
      this.hooks?.toast(`Cart · ${product.name} · ${allowed}`);
      return;
    }
    if (typeof window !== "undefined") {
      window.open(product.storeUrl, "_blank", "noopener,noreferrer");
    }
  }

  /** @deprecated shop uses inspect + addToCart */
  viewProduct(product: StoreProduct) {
    this.inspectProduct(product);
    if (!this.bridge.connected && typeof window !== "undefined") {
      window.open(product.storeUrl, "_blank", "noopener,noreferrer");
    }
  }

  buyIrl(product: StoreProduct, size?: string) {
    this.addToCart(product, size ?? product.sizes?.[0] ?? "M");
  }

  notifyMissionComplete(missionId: string, stepId: string) {
    this.unlock(`mission:${missionId}:${stepId}`, `Mission · ${stepId}`);
  }

  notifyChapterComplete(chapter: string) {
    this.unlock(`chapter:${chapter}`, chapter);
  }

  unlock(rewardKey: string, label: string) {
    if (!this.snapshot().rewardsEnabled) return;
    this.bridge.post("GG_UNLOCK", { rewardKey, label });
  }

  runComplete(opts: { score: number; durationMs: number; level?: string }) {
    if (!this.snapshot().rewardsEnabled) return;
    if (opts.durationMs < 0) return;
    const runId = crypto.randomUUID?.() ?? `run-${GAME_ID}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    if (this.sentRuns.has(runId)) return;
    this.sentRuns.add(runId);
    this.lastRunId = runId;
    this.bridge.post("GG_RUN_COMPLETE", {
      runId,
      score: Math.max(0, Math.round(opts.score)),
      durationMs: Math.max(0, Math.round(opts.durationMs)),
      level: opts.level,
    });
  }

  requestCatalog() {
    this.bridge.post("GG_REQUEST_CATALOG", {});
  }
}

export const commerce = new CommerceService();

export function installCommerceTestHook() {
  if (typeof window === "undefined") return;
  (window as Window & { __SACK_COMMERCE__?: unknown }).__SACK_COMMERCE__ = {
    catalog: () => commerce.catalog.products,
    loaded: () => commerce.catalog.loaded,
    lastIntent: () => commerce.lastIntent,
    buyIrl: (id: string, size?: string) => {
      const p = commerce.catalog.byId(id);
      if (p) commerce.buyIrl(p, size);
    },
    viewProduct: (id: string) => {
      const p = commerce.catalog.byId(id);
      if (p) commerce.viewProduct(p);
    },
    addToCart: (id: string, size: string, qty = 1) => {
      const p = commerce.catalog.byId(id);
      if (p) commerce.addToCart(p, size, qty);
    },
    snapshot: () => commerce.snapshot(),
    player: () => commerce.player,
    lastRunId: () => commerce.lastRunId,
    requestCatalog: () => commerce.requestCatalog(),
    gameId: GAME_ID,
    build: GAME_BUILD_VERSION,
  };
}
