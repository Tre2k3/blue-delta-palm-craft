import { createFileRoute } from "@tanstack/react-router";
import { handleSignaling } from "@/game-v2/net/signaling.server";

const handle = ({ request }: { request: Request }) => handleSignaling(request);

/** Where two devices in the same crew find each other. See `game-v2/net/signaling.server.ts`. */
export const Route = createFileRoute("/api/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
