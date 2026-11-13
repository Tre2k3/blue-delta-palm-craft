import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/** What a business, a food truck or an artist can ask to have put in the game. */
export const SPOT_KINDS = [
  { id: "billboard", name: "A billboard", line: "Your name and your art up over the plaza, the streets and Beale." },
  { id: "truck", name: "A food truck", line: "Your truck on the riverfront row: your logo, your menu, your crew in the window." },
  { id: "store", name: "A storefront", line: "Your shop on a Memphis block, with your sign over the door." },
  { id: "music", name: "Your music", line: "Your song on the car radio, on the stage screen or in the club." },
  { id: "other", name: "Something else", line: "A character, an event, a drop. Tell us what you have in mind." },
] as const;
export type SpotKind = (typeof SPOT_KINDS)[number]["id"];

export type Request = { kind: SpotKind; name: string; business: string; reach: string; note: string; website?: string };
export type Received = { id: number; kind: SpotKind; name: string; business: string; reach: string; note: string; at: string; done: boolean };

/** Runs first: the server's signing key is in place before the sign-in service is loaded to check who is asking. */
const authEnv = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { prepareAuthEnv } = await import("./auth-env.server");
  prepareAuthEnv();
  return next();
});

/** Only this site's own pages may send a request: another site cannot post them from a visitor's browser. */
const ownPages = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  assertSameSiteRequest();
  return next();
});

/** Send a request. Needs no account. What is kept is checked and cut down on the server. */
export const partnerSend = createServerFn({ method: "POST" })
  .validator((input: Request) => input)
  .middleware([ownPages])
  .handler(async ({ data }) => {
    const { checkAsk, keepAsk } = await import("./partners.server");
    let ask;
    try {
      ask = checkAsk(data);
    } catch (e) {
      return { ok: false as const, why: e instanceof Error ? e.message : "That could not be sent." };
    }
    return (await keepAsk(ask)) ? { ok: true as const, why: "" } : { ok: false as const, why: "A lot of requests have just come in. Try again in a little while." };
  });

/** The requests, for an owner. Anyone else gets nothing, and is told they are not an owner. */
export const partnerInbox = createServerFn({ method: "GET" })
  .middleware([authEnv, authMiddleware])
  .handler(async ({ context }): Promise<{ owner: boolean; asks: Received[] }> => {
    const { isOwner, readAsks } = await import("./partners.server");
    if (!(await isOwner(context.userId))) return { owner: false, asks: [] };
    return { owner: true, asks: await readAsks() };
  });

/** An owner ticks a request off, or puts it back. */
export const partnerMark = createServerFn({ method: "POST" })
  .validator((input: { id: number; done: boolean }) => ({ id: Math.floor(Number(input?.id)) || 0, done: !!input?.done }))
  .middleware([authEnv, authMiddleware])
  .handler(async ({ context, data }) => {
    const { isOwner, markAsk } = await import("./partners.server");
    if (!(await isOwner(context.userId))) return { ok: false };
    await markAsk(data.id, data.done);
    return { ok: true };
  });
