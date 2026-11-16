import type { Product } from "./catalog";
import { amountPatch, orderBody, quote } from "./pricing";

/**
 * PayPal checkout for SackReligious clothing, paid straight to Mikey's PayPal. Only the HQ's
 * clothing uses it: ad spots and partner packages are booked another way.
 *
 * The client ID is the public half of a PayPal app: it is meant to sit in the page. The
 * secret half is never here.
 */
export const PAYPAL_CLIENT_ID =
  (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) ||
  "BAA9YvQmgWEoJZ_YgafMmFTW723Dy06Fwwi6XcE4fKcgFUM3wFLkDkX4eHHESfRH7_8Q7C9eVSmCBi6z";

type Address = { state?: string; countryCode?: string; city?: string; postalCode?: string };
type OrderActions = {
  order: {
    create(o: unknown): Promise<string>;
    capture(): Promise<{ id: string; status: string; payer?: { name?: { given_name?: string } } }>;
    patch?(ops: unknown): Promise<unknown>;
  };
};
type ShipActions = {
  reject?(reason?: unknown): Promise<void>;
  order?: { patch?(ops: unknown): Promise<unknown> };
};
type Buttons = {
  render(el: HTMLElement): Promise<void>;
  close?(): Promise<void>;
};
type PaypalSdk = {
  Buttons(o: {
    style?: Record<string, unknown>;
    createOrder(data: unknown, actions: OrderActions): Promise<string>;
    onShippingAddressChange?(
      data: { orderID?: string; shippingAddress?: Address },
      actions: ShipActions,
    ): Promise<void>;
    onApprove(data: { orderID?: string }, actions: OrderActions): Promise<void>;
    onCancel?(): void;
    onError?(e: unknown): void;
  }): Buttons;
};

let sdk: Promise<PaypalSdk> | null = null;

/** Load PayPal's script once. */
export function loadPaypal(): Promise<PaypalSdk> {
  if (sdk) return sdk;
  sdk = new Promise<PaypalSdk>((resolve, reject) => {
    const w = window as unknown as { paypal?: PaypalSdk };
    if (w.paypal) return resolve(w.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&components=buttons`;
    s.async = true;
    s.onload = () => (w.paypal ? resolve(w.paypal) : reject(new Error("PayPal did not load")));
    s.onerror = () => reject(new Error("PayPal did not load"));
    document.head.appendChild(s);
  }).catch((e) => {
    sdk = null;
    throw e;
  });
  return sdk;
}

/** Whether the server makes and checks the orders (its PayPal secret is set). Asked once. */
let locked: Promise<boolean> | null = null;
export function serverLocked() {
  locked ??= fetch("/api/paypal", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ locked?: boolean }>) : { locked: false }))
    .then((j) => !!j.locked)
    .catch(() => false);
  return locked;
}

async function server<T>(
  body: Record<string, unknown>,
): Promise<T & { ok: boolean; reason?: string }> {
  const r = await fetch("/api/paypal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await r.json()) as T & { ok: boolean; reason?: string };
}

/**
 * PayPal's buttons for one piece in one size, drawn into `el`. Shipping is added, and Tennessee
 * tax once PayPal knows the buyer ships there. When the server holds PayPal's secret it makes
 * the order and checks it before taking the money; until then the browser makes it.
 * Returns a function that takes the buttons down again.
 */
export async function paypalButtons(
  el: HTMLElement,
  p: Product,
  size: string,
  on: {
    paid(orderId: string, name: string): void;
    cancelled(): void;
    failed(reason?: string): void;
  },
) {
  const [paypal, onServer] = await Promise.all([loadPaypal(), serverLocked()]);
  const buttons = paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 40 },
    createOrder: async (_d, actions) => {
      if (onServer) {
        const r = await server<{ id: string }>({ op: "create", id: p.id, size });
        if (!r.ok) throw new Error(r.reason ?? "Could not start the order");
        return r.id;
      }
      return actions.order.create(orderBody(p, size, quote(p)));
    },
    onShippingAddressChange: async (data, actions) => {
      const a = data.shippingAddress ?? {};
      if (onServer) {
        const r = await server<{ total: string }>({
          op: "address",
          orderID: data.orderID,
          state: a.state,
          country: a.countryCode,
        });
        if (!r.ok) await actions.reject?.();
        return;
      }
      const patch = actions.order?.patch;
      if (patch) await patch(amountPatch(quote(p, a.state, a.countryCode)));
    },
    onApprove: async (data, actions) => {
      if (onServer) {
        const r = await server<{ id: string; name: string }>({
          op: "capture",
          orderID: data.orderID,
        });
        if (r.ok) on.paid(r.id, r.name);
        else on.failed(r.reason);
        return;
      }
      const order = await actions.order.capture();
      on.paid(order.id, order.payer?.name?.given_name ?? "");
    },
    onCancel: () => on.cancelled(),
    onError: () => on.failed(),
  });
  el.replaceChildren();
  await buttons.render(el);
  return () => {
    void buttons.close?.().catch(() => undefined);
    el.replaceChildren();
  };
}
