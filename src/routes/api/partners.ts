import { createFileRoute } from "@tanstack/react-router";

/** How "Get in the game" requests are handled on this server. Says which kind of each setting is in use, never an address. */
export const Route = createFileRoute("/api/partners")({
  server: {
    handlers: {
      GET: async () => {
        const { partnerSetup } = await import("@/game-v2/net/partners.server");
        const { PARTNER_EMAIL } = await import("@/game-v2/net/partners");
        return Response.json(partnerSetup(PARTNER_EMAIL), { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
