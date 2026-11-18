import { createFileRoute } from "@tanstack/react-router";

/** Whether accounts are set up on this server. Says which kind of each setting is in use, never a value. */
export const Route = createFileRoute("/api/account")({
  server: {
    handlers: {
      GET: async () => {
        const { authSetup } = await import("@/game-v2/net/auth-env.server");
        const { emailAndPasswordEnabled } = await import("@/lib/auth/email-password");
        return Response.json({ accounts: emailAndPasswordEnabled, ...authSetup() }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
