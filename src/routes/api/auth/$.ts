import { createFileRoute } from "@tanstack/react-router";

/**
 * The project's own sign-in service, mounted where its client looks for it. It is loaded on
 * first use and not before, so the server's signing key is in place when it starts (see
 * `game-v2/net/auth-env.server.ts`).
 */
const handle = async ({ request }: { request: Request }) => {
  const { prepareAuthEnv } = await import("@/game-v2/net/auth-env.server");
  prepareAuthEnv();
  const { auth } = await import("@/lib/auth/server");
  return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
