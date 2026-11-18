import { createFileRoute } from "@tanstack/react-router";
import { CABINETS } from "@/game-v2/play/goods";

/**
 * Where a cabinet's browser should point to play an itch.io game inside the page.
 *
 * A game page on itch.io cannot be framed, but the game on it can: the page itself shows the
 * game in a frame served from itch's game host, and itch offers an embed address for other
 * sites. The numbers in both change whenever the game is uploaded again, so nothing is
 * hard-coded: this route reads the game's page, finds the frame, checks which address may be
 * shown inside another site, and answers with that. The browser cannot do this itself (a page
 * may not read another site's HTML); a server can.
 */

type Probe = { kind: "embed" | "direct"; url: string; status: number; frames: boolean };

export type ItchEmbed =
  | { ok: true; id: string; kind: "embed" | "direct"; src: string; width: number; height: number; page: string; probes: Probe[] }
  | { ok: false; id: string; reason: string; page: string | null; probes: Probe[] };

const GOOD_FOR = 10 * 60_000;
const BAD_FOR = 60_000;
const cache = new Map<string, { until: number; value: ItchEmbed }>();

const AGENT = "Mozilla/5.0 (compatible; ArcadeCabinet/1.0)";

function get(url: string) {
  return fetch(url, { headers: { "user-agent": AGENT, accept: "text/html,application/xhtml+xml,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(7000) });
}

/** True when the response's own headers let another site show it in a frame. */
function mayFrame(h: Headers) {
  if (h.get("x-frame-options")) return false;
  const ancestors = /frame-ancestors([^;]*)/i.exec(h.get("content-security-policy") ?? "")?.[1];
  if (ancestors !== undefined && !/(^|\s)(\*|https:)(\s|$)/.test(ancestors)) return false;
  return true;
}

function decode(html: string) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function probe(kind: Probe["kind"], url: string): Promise<Probe> {
  try {
    const res = await get(url);
    // Only the headers matter; do not pull the whole game down.
    void res.body?.cancel().catch(() => undefined);
    return { kind, url, status: res.status, frames: res.ok && mayFrame(res.headers) };
  } catch {
    return { kind, url, status: 0, frames: false };
  }
}

async function resolve(id: string, page: string): Promise<ItchEmbed> {
  let html: string;
  try {
    const res = await get(page);
    if (!res.ok) return { ok: false, id, page, reason: `itch.io answered ${res.status} for the game page.`, probes: [] };
    html = decode(await res.text());
  } catch {
    return { ok: false, id, page, reason: "itch.io could not be reached.", probes: [] };
  }
  // The game frame: shown directly, or waiting inside the "Run game" button's data.
  const frame = /(?:https?:)?\/\/(?:[\w-]+\.)*(?:itch\.zone|hwcdn\.net)\/html\/(\d+)(?:-\d+)?\/[^"'<>\s\\]*/i.exec(html);
  if (!frame) return { ok: false, id, page, reason: "That page has no game that plays in a browser.", probes: [] };
  const direct = frame[0].replace(/^(?:https?:)?\/\//, "https://");
  const upload = frame[1]!;
  const holder = /<div[^>]*class="[^"]*\bgame_frame\b[^"]*"[^>]*>/i.exec(html)?.[0] ?? "";
  const size = (name: "width" | "height", fallback: number) => {
    const m = new RegExp(`data-${name}="(\\d+)"`, "i").exec(holder) ?? new RegExp(`${name}:\\s*(\\d+)px`, "i").exec(holder);
    const n = m ? Number(m[1]) : fallback;
    return n >= 200 && n <= 4000 ? n : fallback;
  };
  const width = size("width", 1280);
  const height = size("height", 720);

  // itch's own embed for other sites first; the frame its page uses second.
  const probes = await Promise.all([probe("embed", `https://itch.io/embed-upload/${upload}?color=0b0b0d`), probe("direct", direct)]);
  const pick = probes.find((p) => p.frames);
  if (!pick) return { ok: false, id, page, reason: "itch.io does not allow this game to be shown inside another site right now.", probes };
  // The embed carries a thin itch.io bar under the game.
  return { ok: true, id, page, kind: pick.kind, src: pick.url, width, height: pick.kind === "embed" ? height + 20 : height, probes };
}

export const Route = createFileRoute("/api/itch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        // Only the games on the floor, and only their own pages: never an address from the caller.
        const page = CABINETS.find((c) => c.id === id)?.link ?? null;
        let value: ItchEmbed;
        if (!page || !new URL(page).hostname.endsWith(".itch.io")) value = { ok: false, id, page: null, reason: "No such cabinet.", probes: [] };
        else {
          const hit = cache.get(id);
          if (hit && hit.until > Date.now()) value = hit.value;
          else {
            value = await resolve(id, page);
            cache.set(id, { until: Date.now() + (value.ok ? GOOD_FOR : BAD_FOR), value });
          }
        }
        return new Response(JSON.stringify(value), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": value.ok ? "public, max-age=120, s-maxage=600" : "no-store" },
        });
      },
    },
  },
});
