/** Client-safe game configuration. Never put secrets here. */

function env(name: string): string | undefined {
  try {
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    return meta.env?.[name];
  } catch {
    return undefined;
  }
}

function bool(name: string, fallback: boolean): boolean {
  const v = env(name);
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export const GAME_BUILD_VERSION = env("VITE_GAME_BUILD_VERSION") ?? "0.9.0-rc";
export const GAME_TITLE = "$ackReligious: Memphis";

export const STORE_BASE_URL = (env("VITE_STORE_BASE_URL") ?? "").replace(/\/$/, "");
export const PRODUCT_CATALOG_URL = env("VITE_PRODUCT_CATALOG_URL") ?? "/config/store-products.json";
export const ALLOWED_PARENT_ORIGIN = env("VITE_ALLOWED_PARENT_ORIGIN") ?? "";
export const ANALYTICS_ENABLED = bool("VITE_ANALYTICS_ENABLED", true);

export function storeProductUrl(slugOrPath: string): string {
  if (/^https?:\/\//i.test(slugOrPath)) return slugOrPath;
  const path = slugOrPath.startsWith("/") ? slugOrPath : `/product/${slugOrPath}`;
  return STORE_BASE_URL ? `${STORE_BASE_URL}${path}` : path;
}

export function isEmbedded(): boolean {
  try {
    return typeof window !== "undefined" && window.parent !== window;
  } catch {
    return false;
  }
}
