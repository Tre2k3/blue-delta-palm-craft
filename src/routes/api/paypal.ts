import { createFileRoute } from "@tanstack/react-router";

/**
 * The SackReligious checkout's server half. GET says whether prices are locked on the server;
 * POST makes an order, sets the tax for an address, or captures, by `op`.
 */
export const Route = createFileRoute("/api/paypal")({
  server: {
    handlers: {
      GET: async () => {
        const { paypalLocked } = await import("@/game-v2/net/paypal.server");
        return Response.json(
          { locked: paypalLocked() },
          { headers: { "cache-control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const pp = await import("@/game-v2/net/paypal.server");
        if (!pp.paypalLocked())
          return Response.json({ ok: false, reason: "Not set up on the server." }, { status: 503 });
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, reason: "Bad request." }, { status: 400 });
        }
        try {
          const r =
            body.op === "create"
              ? await pp.createOrder(body.id, body.size)
              : body.op === "address"
                ? await pp.shipTo(body.orderID, body.state, body.country)
                : body.op === "capture"
                  ? await pp.captureOrder(body.orderID)
                  : { ok: false as const, status: 400, reason: "Unknown step." };
          const status =
            "status" in r && typeof r.status === "number" ? r.status : r.ok ? 200 : 502;
          return Response.json(r, { status, headers: { "cache-control": "no-store" } });
        } catch (e) {
          console.error("[paypal]", e instanceof Error ? e.message : e);
          return Response.json(
            { ok: false, reason: "PayPal didn't answer. Nothing was charged." },
            { status: 502 },
          );
        }
      },
    },
  },
});
