import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/** Runs first: the server's signing key is in place before the sign-in service is loaded to check who is asking. */
const authEnv = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { prepareAuthEnv } = await import("./auth-env.server");
  prepareAuthEnv();
  return next();
});

/** A save is a few kilobytes. Anything much larger is not one. */
const MAX = 120_000;

/** Only a save gets in: text that reads as this game's save, and not a large one. */
function checked(input: unknown): { data: string; played: number; base: number | null } {
  const sent = (input ?? {}) as { data?: unknown; base?: unknown };
  const data = typeof sent.data === "string" ? sent.data : "";
  const base = typeof sent.base === "number" && Number.isInteger(sent.base) && sent.base > 0 ? sent.base : null;
  if (!data || data.length > MAX) throw new Error("Bad save");
  type Shape = { v?: unknown; dollars?: unknown; played?: unknown } | null;
  let s: Shape;
  try {
    s = JSON.parse(data) as Shape;
  } catch {
    throw new Error("Bad save");
  }
  if (!s || typeof s !== "object" || s.v !== 4 || typeof s.dollars !== "number") throw new Error("Bad save");
  const played = Number(s.played);
  return { data, played: Number.isFinite(played) ? Math.max(0, played) : 0, base };
}

/** The signed-in player's progress as their account has it, or null if it has none yet. */
export const cloudLoad = createServerFn({ method: "GET" })
  .middleware([authEnv, authMiddleware])
  .handler(async ({ context }) => {
    const { readSave } = await import("./saves.server");
    return readSave(context.userId);
  });

/**
 * Put the signed-in player's progress on their account, on top of the revision the device last
 * saw (or over anything, with no revision given). Whose it is comes from the session, never
 * from the caller.
 */
export const cloudStore = createServerFn({ method: "POST" })
  .validator(checked)
  .middleware([authEnv, authMiddleware])
  .handler(async ({ context, data }) => {
    const { writeSave } = await import("./saves.server");
    return writeSave(context.userId, data.data, data.played, data.base);
  });
