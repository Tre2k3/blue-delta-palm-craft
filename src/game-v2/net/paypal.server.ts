import { amountPatch, orderBody, quote, realPiece, usd } from "../play/pricing";
import { PAYPAL_CLIENT_ID } from "../play/paypal";

/**
 * The server side of the SackReligious checkout. With PayPal's secret set on the server
 * (PAYPAL_CLIENT_SECRET), orders are made here from the catalog's own prices, and each one is
 * checked against the price list before it is captured. Nothing the browser sends can change
 * what is charged.
 */

const secret = () => process.env.PAYPAL_CLIENT_SECRET?.trim() || "";
const clientId = () => process.env.PAYPAL_CLIENT_ID?.trim() || PAYPAL_CLIENT_ID;
const base = () =>
  process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

export const paypalLocked = () => secret() !== "";

let token: { value: string; until: number } | null = null;

async function accessToken() {
  if (token && token.until > Date.now()) return token.value;
  const auth = Buffer.from(`${clientId()}:${secret()}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PayPal sign-in failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, until: Date.now() + Math.max(60, j.expires_in - 120) * 1000 };
  return token.value;
}

async function call(path: string, method: "GET" | "POST" | "PATCH", body?: unknown) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok)
    throw new Error(
      `PayPal ${method} ${path.split("/").slice(0, 4).join("/")} failed (${res.status})`,
    );
  return json;
}

type Order = {
  id: string;
  status: string;
  purchase_units?: {
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    shipping?: { address?: { admin_area_1?: string; country_code?: string } };
    payments?: { captures?: { id: string; status: string }[] };
  }[];
  payer?: { name?: { given_name?: string } };
};

const isOrderId = (v: unknown): v is string => typeof v === "string" && /^[A-Z0-9]{10,24}$/.test(v);

/** A new order for one piece in one size, at the catalog's price. */
export async function createOrder(id: unknown, size: unknown) {
  const piece = realPiece(id, size);
  if (!piece) return { ok: false as const, status: 400, reason: "Unknown piece or size." };
  const order = (await call(
    "/v2/checkout/orders",
    "POST",
    orderBody(piece.p, piece.size, quote(piece.p)),
  )) as Order;
  return { ok: true as const, id: order.id };
}

/** The buyer picked or changed where it ships: set the tax for that address. */
export async function shipTo(orderID: unknown, state: unknown, country: unknown) {
  if (!isOrderId(orderID)) return { ok: false as const, status: 400, reason: "Bad order." };
  const order = (await call(`/v2/checkout/orders/${orderID}`, "GET")) as Order;
  const [id, size] = (order.purchase_units?.[0]?.custom_id ?? "").split(":");
  const piece = realPiece(id, size);
  if (!piece) return { ok: false as const, status: 400, reason: "Not one of ours." };
  const q = quote(
    piece.p,
    typeof state === "string" ? state : "",
    typeof country === "string" ? country : "US",
  );
  await call(`/v2/checkout/orders/${orderID}`, "PATCH", amountPatch(q));
  return { ok: true as const, total: usd(q.total), tax: usd(q.tax), shipping: usd(q.shipping) };
}

/**
 * Take the money, but only if the order is for a real piece at exactly the price list's total
 * for where it ships. Anything else is left uncaptured, so nothing is charged.
 */
export async function captureOrder(orderID: unknown) {
  if (!isOrderId(orderID)) return { ok: false as const, status: 400, reason: "Bad order." };
  const order = (await call(`/v2/checkout/orders/${orderID}`, "GET")) as Order;
  const unit = order.purchase_units?.[0];
  const [id, size] = (unit?.custom_id ?? "").split(":");
  const piece = realPiece(id, size);
  if (!piece || !unit?.amount)
    return { ok: false as const, status: 409, reason: "Not one of ours." };
  const addr = unit.shipping?.address;
  const want = quote(piece.p, addr?.admin_area_1 ?? "", addr?.country_code ?? "US");
  if (unit.amount.currency_code !== "USD" || unit.amount.value !== usd(want.total)) {
    // The tax may not have caught up with the address: set it, and have the buyer approve again.
    await call(`/v2/checkout/orders/${orderID}`, "PATCH", amountPatch(want)).catch(() => undefined);
    return {
      ok: false as const,
      status: 409,
      reason: `The total should be $${usd(want.total)}. Please try again.`,
    };
  }
  const done = (await call(`/v2/checkout/orders/${orderID}/capture`, "POST", {})) as Order;
  const cap = done.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    ok: done.status === "COMPLETED" && cap?.status === "COMPLETED",
    id: done.id,
    name: done.payer?.name?.given_name ?? "",
    status: done.status,
  };
}
