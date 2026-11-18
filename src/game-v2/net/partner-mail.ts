import { PARTNER_EMAIL, SPOT_KINDS, type Request, type SpotKind } from "./partners";

/**
 * Getting a request into the owner's inbox.
 *
 * The server keeps every request, and hands back the address of a form-to-email relay. The
 * sender's browser posts the request there and the relay emails it to the owner. Where there is
 * no relay, or it does not take the request, the sender is offered the same request already
 * written out as an email from their own mail app, so it can still be sent.
 */
export type Sent = Pick<Request, "kind" | "name" | "business" | "reach" | "note">;

const kindName = (k: SpotKind) => SPOT_KINDS.find((q) => q.id === k)?.name ?? "Something else";

/** The request as the lines of a message: only what was filled in. */
function lines(a: Sent): [string, string][] {
  const out: [string, string][] = [["Wants in the game", kindName(a.kind)]];
  if (a.name.trim()) out.push(["Name", a.name.trim()]);
  if (a.business.trim()) out.push(["Business or artist", a.business.trim()]);
  if (a.reach.trim()) out.push(["Reach them at", a.reach.trim()]);
  if (a.note.trim()) out.push(["Note", a.note.trim()]);
  return out;
}

const subject = (a: Sent) => `Get in the game: ${kindName(a.kind)}${a.business.trim() || a.name.trim() ? ` · ${a.business.trim() || a.name.trim()}` : ""}`;

/** A link that opens the sender's own mail app with the request written out to the owner. */
export function mailtoFor(a: Sent): string {
  const body = lines(a)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");
  return `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(subject(a))}&body=${encodeURIComponent(body)}`;
}

/** Only a secure address, or one on this site, is ever posted to. */
const safe = (url: string) => /^https:\/\/[^\s]+$/.test(url) || /^\/[^/\s][^\s]*$/.test(url);

/**
 * Post a kept request to the relay. True only when the relay says it took it: a relay that is
 * down, slow, or still waiting for the owner to confirm their address counts as not sent.
 */
export async function sendOn(relay: string | null, a: Sent): Promise<boolean> {
  if (!relay || !safe(relay)) return false;
  const body: Record<string, string> = { _subject: subject(a), _template: "table", _captcha: "false" };
  for (const [k, v] of lines(a)) body[k] = v;
  body["Sent from"] = "The Get in the game screen in SackReligious · Memphis 901";
  // An answer to the email goes to the sender where they left an email address.
  const reach = a.reach.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach)) body._replyto = reach;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 12000);
  try {
    const r = await fetch(relay, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: stop.signal });
    if (!r.ok) return false;
    const said = (await r.json()) as { success?: unknown };
    return said.success === true || said.success === "true";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
