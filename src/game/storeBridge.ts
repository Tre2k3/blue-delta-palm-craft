/** postMessage bridge: grokgame ↔ 10letters.store / Lovable parent. Never use target "*". */

export const GAME_SOURCE = "grokgame" as const;
export const PARENT_SOURCE = "sackreligious" as const;
export const PROTOCOL_VERSION = 1 as const;
export const GAME_ID = "blue-delta-palm-craft";

export const STATIC_ALLOWED_ORIGINS = [
  "https://10letters.store",
  "https://www.10letters.store",
  "https://sackreligious.lovable.app",
] as const;

export type ParentTheme = {
  black: string;
  gold: string;
  neon: string;
  cream: string;
};

export type StorePlayer = {
  signedIn: boolean;
  userId: string | null;
  displayName: string | null;
  sackBucks: number;
};

export type LiveProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  zone: string;
  sizes: string[];
  url?: string;
  available?: boolean;
  slug?: string;
  virtualOutfitId?: string;
};

export type Envelope = {
  source: typeof GAME_SOURCE | typeof PARENT_SOURCE;
  version: typeof PROTOCOL_VERSION;
  type: string;
  payload: Record<string, unknown>;
};

export type GameMessageType = "GG_READY" | "GG_RUN_COMPLETE" | "GG_ADD_TO_CART" | "GG_UNLOCK" | "GG_REQUEST_CATALOG";
export type ParentMessageType = "SR_INIT" | "SR_PLAYER" | "SR_CATALOG" | "SR_ACK" | "SR_PAUSE" | "SR_RESUME" | "SR_REWARD";

const DEFAULT_THEME: ParentTheme = {
  black: "#0D0D0D",
  gold: "#C9A84C",
  neon: "#39FF14",
  cream: "#F5F0E1",
};

export function isAllowedOrigin(origin: string) {
  if (!origin) return false;
  if ((STATIC_ALLOWED_ORIGINS as readonly string[]).includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return url.hostname === "lovable.app" || url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

export function originFromReferrer() {
  if (typeof document === "undefined") return null;
  try {
    if (!document.referrer) return null;
    const origin = new URL(document.referrer).origin;
    return isAllowedOrigin(origin) ? origin : null;
  } catch {
    return null;
  }
}

function isEnvelope(data: unknown): data is Envelope {
  if (!data || typeof data !== "object") return false;
  const msg = data as Envelope;
  return (
    msg.source === PARENT_SOURCE &&
    msg.version === PROTOCOL_VERSION &&
    typeof msg.type === "string" &&
    !!msg.payload &&
    typeof msg.payload === "object"
  );
}

function envelope(type: GameMessageType, payload: Record<string, unknown>): Envelope {
  return { source: GAME_SOURCE, version: PROTOCOL_VERSION, type, payload };
}

export type BridgeHandlers = {
  onInit: (payload: { origin: string; gameId?: string; currency?: string; theme?: Partial<ParentTheme> }) => void;
  onPlayer: (player: StorePlayer) => void;
  onCatalog: (products: LiveProduct[]) => void;
  onAck: (ack: { forType: string; ok: boolean; error?: string; granted?: number; sackBucks?: number }) => void;
  onPause: () => void;
  onResume: () => void;
  onReward: (payload: Record<string, unknown>) => void;
};

export class StoreBridge {
  parentOrigin: string | null = originFromReferrer();
  connected = false;
  private unbind: (() => void) | null = null;

  start(handlers: BridgeHandlers) {
    if (typeof window === "undefined") return;
    this.stop();
    const onMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) return;
      if (!isEnvelope(event.data)) return;
      const { type, payload } = event.data;
      if (type === "SR_INIT") {
        const origin = typeof payload.origin === "string" ? payload.origin : event.origin;
        if (!isAllowedOrigin(origin)) return;
        this.parentOrigin = origin;
        this.connected = true;
        handlers.onInit({
          origin,
          gameId: typeof payload.gameId === "string" ? payload.gameId : undefined,
          currency: typeof payload.currency === "string" ? payload.currency : "Sack Bucks",
          theme: (payload.theme as Partial<ParentTheme> | undefined) ?? undefined,
        });
        return;
      }
      if (this.parentOrigin && event.origin !== this.parentOrigin) return;
      if (type === "SR_PLAYER") {
        handlers.onPlayer({
          signedIn: !!payload.signedIn,
          userId: typeof payload.userId === "string" ? payload.userId : null,
          displayName: typeof payload.displayName === "string" ? payload.displayName : null,
          sackBucks: typeof payload.sackBucks === "number" ? payload.sackBucks : 0,
        });
        return;
      }
      if (type === "SR_CATALOG") {
        const raw = Array.isArray(payload.products) ? payload.products : [];
        handlers.onCatalog(raw.map(normalizeLiveProduct).filter((p): p is LiveProduct => !!p));
        return;
      }
      if (type === "SR_ACK") {
        handlers.onAck({
          forType: String(payload.forType ?? ""),
          ok: payload.ok !== false,
          error: typeof payload.error === "string" ? payload.error : undefined,
          granted: typeof payload.granted === "number" ? payload.granted : undefined,
          sackBucks: typeof payload.sackBucks === "number" ? payload.sackBucks : undefined,
        });
        return;
      }
      if (type === "SR_PAUSE") handlers.onPause();
      if (type === "SR_RESUME") handlers.onResume();
      if (type === "SR_REWARD") handlers.onReward(payload);
    };
    window.addEventListener("message", onMessage);
    this.unbind = () => window.removeEventListener("message", onMessage);
    this.post("GG_READY", {
      gameId: GAME_ID,
      capabilities: ["rewards", "cart", "identity"],
    });
  }

  stop() {
    this.unbind?.();
    this.unbind = null;
  }

  post(type: GameMessageType, payload: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    if (window.parent === window) return;
    const msg = envelope(type, payload);
    const target = this.parentOrigin;
    if (target) {
      window.parent.postMessage(msg, target);
      return;
    }
    for (const origin of STATIC_ALLOWED_ORIGINS) {
      window.parent.postMessage(msg, origin);
    }
  }

  applyTheme(partial?: Partial<ParentTheme>) {
    if (typeof document === "undefined") return;
    const theme = { ...DEFAULT_THEME, ...partial };
    const root = document.documentElement;
    root.style.setProperty("--color-bg", theme.black);
    root.style.setProperty("--color-surface", mixHex(theme.black, theme.cream, 0.08));
    root.style.setProperty("--color-surface-2", mixHex(theme.black, theme.cream, 0.14));
    root.style.setProperty("--color-fg", theme.cream);
    root.style.setProperty("--color-gold", theme.gold);
    root.style.setProperty("--color-primary", theme.neon);
    root.style.setProperty("--color-primary-fg", theme.black);
    root.style.setProperty("--color-panel", `${theme.black}ee`);
    root.dataset.storeTheme = "on";
  }
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.replace("#", "").slice(0, 6), 16);
  const pb = parseInt(b.replace("#", "").slice(0, 6), 16);
  const ch = (shift: number) => {
    const av = (pa >> shift) & 255;
    const bv = (pb >> shift) & 255;
    return Math.round(av + (bv - av) * t);
  };
  const r = ch(16);
  const g = ch(8);
  const bl = ch(0);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeLiveProduct(raw: unknown): LiveProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id : "";
  const name = typeof p.name === "string" ? p.name : "";
  if (!id || !name) return null;
  const sizes = Array.isArray(p.sizes) ? p.sizes.filter((s): s is string => typeof s === "string" && s.length > 0) : [];
  return {
    id,
    name,
    price: typeof p.price === "number" ? p.price : 0,
    image: typeof p.image === "string" ? p.image : typeof p.imageUrl === "string" ? p.imageUrl : "",
    zone: typeof p.zone === "string" ? p.zone : "hq",
    sizes: sizes.length ? sizes : ["S", "M", "L", "XL"],
    url: typeof p.url === "string" ? p.url : typeof p.storeUrl === "string" ? p.storeUrl : undefined,
    available: p.available !== false,
    slug: typeof p.slug === "string" ? p.slug : undefined,
    virtualOutfitId: typeof p.virtualOutfitId === "string" ? p.virtualOutfitId : undefined,
  };
}

export const defaultTheme = DEFAULT_THEME;
