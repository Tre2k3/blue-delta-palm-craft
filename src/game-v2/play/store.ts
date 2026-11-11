import { commerce } from "../../game/commerce";
import { PUBLIC_STORE_PAGE, isEmbedded, storeProductUrl } from "../../game/config";
import type { Product } from "./catalog";

/** Start the bridge to the real store. Safe to call more than once. */
let started = false;
export function initStore() {
  if (started) return;
  started = true;
  void commerce.init().catch(() => undefined);
}

/**
 * Send the player to the real piece. Inside the store's own page the item goes straight in the
 * cart; anywhere else the product page opens in a new tab so the game keeps running.
 */
export function buyReal(p: Product, size: string): "cart" | "tab" {
  if (isEmbedded()) {
    const known = commerce.catalog.byId(p.id);
    commerce.addToCart(known ?? { id: p.id, slug: p.id, name: p.name, imageUrl: p.image, price: p.usd, currency: "USD", sizes: p.sizes, available: true, storeUrl: storeProductUrl(p.storePath) }, size);
    return "cart";
  }
  window.open(storeProductUrl(p.storePath), "_blank", "noopener,noreferrer");
  return "tab";
}

/** The whole store, same tab. */
export function openStore() {
  try {
    commerce.confirmEnterStore();
  } catch {
    window.location.assign(PUBLIC_STORE_PAGE);
  }
}
