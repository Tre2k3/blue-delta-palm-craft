import type { ApparelId } from "./types";
import {
  ALLOWED_PARENT_ORIGIN,
  GAME_BUILD_VERSION,
  isEmbedded,
  PRODUCT_CATALOG_URL,
  storeProductUrl,
} from "./config";
import { analytics } from "./analytics";

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
}

type CatalogFile = {
  products?: StoreProduct[];
  storeBaseUrl?: string;
};

const BRIDGE_NS = "SACK";

export type StoreBridgeEvent =
  | { type: "SACK_GAME_READY"; version: string }
  | { type: "SACK_PRODUCT_VIEW"; productId: string; slug: string; name: string }
  | { type: "SACK_PRODUCT_BUY"; productId: string; slug: string; name: string; storeUrl: string }
  | { type: "SACK_MISSION_COMPLETE"; missionId: string; stepId: string }
  | { type: "SACK_CHAPTER_COMPLETE"; chapter: string };

class ProductCatalog {
  products: StoreProduct[] = [];
  loaded = false;
  error: string | null = null;

  byId(id: string) {
    return this.products.find((p) => p.id === id) ?? null;
  }

  byVirtual(id: ApparelId) {
    return this.products.find((p) => p.virtualOutfitId === id) ?? null;
  }

  async load(url = PRODUCT_CATALOG_URL) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const json = (await res.json()) as CatalogFile;
      this.products = Array.isArray(json.products) ? json.products.map(normalizeProduct) : [];
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

function normalizeProduct(raw: StoreProduct): StoreProduct {
  const slug = raw.slug || raw.id;
  return {
    ...raw,
    slug,
    storeUrl: raw.storeUrl || storeProductUrl(slug),
    available: raw.available !== false,
    currency: raw.currency ?? "USD",
    sizes: raw.sizes ?? ["S", "M", "L", "XL", "2XL"],
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
  },
];

class StoreBridge {
  post(event: StoreBridgeEvent) {
    if (typeof window === "undefined") return;
    if (!isEmbedded()) return;
    const target = ALLOWED_PARENT_ORIGIN;
    if (!target) return;
    try {
      window.parent.postMessage({ ns: BRIDGE_NS, ...event }, target);
    } catch {
      /* parent origin mismatch */
    }
  }

  openStore(url: string) {
    if (typeof window === "undefined") return;
    const abs = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).toString();
    window.open(abs, "_blank", "noopener,noreferrer");
  }
}

class CommerceService {
  catalog = new ProductCatalog();
  bridge = new StoreBridge();
  lastIntent: { kind: "view" | "buy"; productId: string; at: number } | null = null;

  async init() {
    await this.catalog.load();
    this.publishReady();
  }

  publishReady() {
    this.bridge.post({
      type: "SACK_GAME_READY",
      version: GAME_BUILD_VERSION,
    });
  }

  productForOutfit(id: ApparelId) {
    return this.catalog.byVirtual(id);
  }

  viewProduct(product: StoreProduct) {
    this.lastIntent = { kind: "view", productId: product.id, at: Date.now() };
    analytics.track("product_viewed", { productId: product.id, slug: product.slug });
    this.bridge.post({
      type: "SACK_PRODUCT_VIEW",
      productId: product.id,
      slug: product.slug,
      name: product.name,
    });
    if (!isEmbedded() || !ALLOWED_PARENT_ORIGIN) {
      this.bridge.openStore(product.storeUrl);
    }
  }

  buyIrl(product: StoreProduct) {
    this.lastIntent = { kind: "buy", productId: product.id, at: Date.now() };
    analytics.track("product_buy_clicked", { productId: product.id, slug: product.slug });
    this.bridge.post({
      type: "SACK_PRODUCT_BUY",
      productId: product.id,
      slug: product.slug,
      name: product.name,
      storeUrl: product.storeUrl,
    });
    if (!isEmbedded() || !ALLOWED_PARENT_ORIGIN) {
      this.bridge.openStore(product.storeUrl);
    }
  }

  notifyMissionComplete(missionId: string, stepId: string) {
    this.bridge.post({ type: "SACK_MISSION_COMPLETE", missionId, stepId });
  }

  notifyChapterComplete(chapter: string) {
    this.bridge.post({ type: "SACK_CHAPTER_COMPLETE", chapter });
  }
}

export const commerce = new CommerceService();

export function installCommerceTestHook() {
  if (typeof window === "undefined") return;
  (window as Window & { __SACK_COMMERCE__?: unknown }).__SACK_COMMERCE__ = {
    catalog: () => commerce.catalog.products,
    loaded: () => commerce.catalog.loaded,
    lastIntent: () => commerce.lastIntent,
    buyIrl: (id: string) => {
      const p = commerce.catalog.byId(id);
      if (p) commerce.buyIrl(p);
    },
    viewProduct: (id: string) => {
      const p = commerce.catalog.byId(id);
      if (p) commerce.viewProduct(p);
    },
  };
}
