import { CATALOG, type Product } from "./catalog";

/**
 * What a real SackReligious piece costs at checkout. The browser shows it and the server
 * charges it, from this one place, so the two can never disagree.
 */

/** Flat shipping on every order, in US dollars. */
export const SHIPPING_USD = 8;
/** Orders at or over this ship free. */
export const FREE_SHIPPING_AT = 100;
/**
 * Sales tax on orders shipped to Tennessee: 7% state plus Shelby County's 2.75%. Orders
 * shipped anywhere else are not taxed here.
 */
export const TN_TAX_RATE = 0.0975;

const cents = (n: number) => Math.round(n * 100) / 100;
export const usd = (n: number) => cents(n).toFixed(2);

export type Quote = { item: number; shipping: number; tax: number; total: number; taxed: boolean };

/** The price of one piece, shipped to `state` in `country` (two-letter codes); no address yet means no tax yet. */
export function quote(p: Product, state?: string, country = "US"): Quote {
  const item = cents(p.usd);
  const shipping = item >= FREE_SHIPPING_AT ? 0 : SHIPPING_USD;
  const taxed = country.toUpperCase() === "US" && (state ?? "").trim().toUpperCase() === "TN";
  const tax = taxed ? cents((item + shipping) * TN_TAX_RATE) : 0;
  return { item, shipping, tax, total: cents(item + shipping + tax), taxed };
}

/** A piece and size that are really in the catalog, or null. */
export function realPiece(id: unknown, size: unknown) {
  const p = CATALOG.find((x) => x.id === id);
  if (!p || typeof size !== "string" || !p.sizes.includes(size)) return null;
  return { p, size };
}

/** The amount PayPal is told, with its breakdown. */
export function amountOf(q: Quote) {
  return {
    currency_code: "USD",
    value: usd(q.total),
    breakdown: {
      item_total: { currency_code: "USD", value: usd(q.item) },
      shipping: { currency_code: "USD", value: usd(q.shipping) },
      tax_total: { currency_code: "USD", value: usd(q.tax) },
    },
  };
}

/** The whole order PayPal is asked to create for one piece in one size. */
export function orderBody(p: Product, size: string, q: Quote) {
  const label = `${p.name}${size === "OS" ? "" : ` · ${size}`}`;
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "default",
        description: `SackReligious · ${label}`,
        custom_id: `${p.id}:${size}`,
        amount: amountOf(q),
        items: [
          {
            name: label,
            sku: `${p.id}-${size}`,
            quantity: "1",
            category: "PHYSICAL_GOODS",
            unit_amount: { currency_code: "USD", value: usd(q.item) },
          },
        ],
      },
    ],
    application_context: {
      brand_name: "SackReligious",
      shipping_preference: "GET_FROM_FILE",
      user_action: "PAY_NOW",
    },
  };
}

/** The change to send PayPal when the shipping address changes the tax. */
export function amountPatch(q: Quote) {
  return [
    { op: "replace", path: "/purchase_units/@reference_id=='default'/amount", value: amountOf(q) },
  ];
}
