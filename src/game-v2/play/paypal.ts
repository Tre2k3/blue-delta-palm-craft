import type { Product } from "./catalog";

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

type OrderActions = {
  order: {
    create(o: unknown): Promise<string>;
    capture(): Promise<{ id: string; status: string; payer?: { name?: { given_name?: string } } }>;
  };
};
type Buttons = {
  render(el: HTMLElement): Promise<void>;
  close?(): Promise<void>;
  isEligible?(): boolean;
};
type PaypalSdk = {
  Buttons(o: {
    style?: Record<string, unknown>;
    createOrder(data: unknown, actions: OrderActions): Promise<string>;
    onApprove(data: unknown, actions: OrderActions): Promise<void>;
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
    s.dataset.namespace = "paypal";
    s.onload = () => (w.paypal ? resolve(w.paypal) : reject(new Error("PayPal did not load")));
    s.onerror = () => reject(new Error("PayPal did not load"));
    document.head.appendChild(s);
  }).catch((e) => {
    sdk = null;
    throw e;
  });
  return sdk;
}

/** What one piece costs at checkout, as PayPal wants the number. */
export const money = (usd: number) => usd.toFixed(2);

/**
 * PayPal's buttons for one piece in one size, drawn into `el`. PayPal asks for the shipping
 * address. Returns a function that takes the buttons down again.
 */
export async function paypalButtons(
  el: HTMLElement,
  p: Product,
  size: string,
  on: { paid(orderId: string, name: string): void; cancelled(): void; failed(): void },
) {
  const paypal = await loadPaypal();
  const value = money(p.usd);
  const label = `${p.name}${size === "OS" ? "" : ` · ${size}`}`;
  const buttons = paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 40 },
    createOrder: (_d, actions) =>
      actions.order.create({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `SackReligious · ${label}`,
            custom_id: `${p.id}:${size}`,
            amount: {
              currency_code: "USD",
              value,
              breakdown: { item_total: { currency_code: "USD", value } },
            },
            items: [
              {
                name: label,
                sku: `${p.id}-${size}`,
                quantity: "1",
                category: "PHYSICAL_GOODS",
                unit_amount: { currency_code: "USD", value },
              },
            ],
          },
        ],
        application_context: { brand_name: "SackReligious", shipping_preference: "GET_FROM_FILE" },
      }),
    onApprove: async (_d, actions) => {
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
