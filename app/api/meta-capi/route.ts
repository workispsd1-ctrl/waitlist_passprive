import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import { META_PIXEL_ID } from "../../meta-events";

/* =====================================================================
   Meta Conversions API — server-side half of the Lead event.

   The browser Pixel already reports every sign-up, but ad blockers, iOS/ITP
   cookie limits and Safari swallow a large share of those calls. This route
   reports the same event server-to-server, where nothing can block it.

   Both reports carry the SAME event_id, so Meta merges them into one Lead
   instead of counting the sign-up twice. See `newEventId` in ../../meta-events.
   ===================================================================== */

// Newest version the /events endpoint accepts (verified against the Graph API).
// Meta retires versions after ~2 years — bump this, or override in .env.
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";

// Server-only secret. A NEXT_PUBLIC_ prefix here would hand anyone the ability
// to write fake conversions into the ad account.
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";

// When set, events land in Events Manager → Test events instead of real
// reporting. Must be UNSET in production or the events won't optimise ads.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_CODE || "";

/* Meta requires SHA-256 of a normalised value — never raw PII. Normalisation
   has to match what Meta does to its own records or nothing matches. */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/* Email: trimmed and lowercased. */
function hashEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email ? sha256(email) : null;
}

/* Phone: digits only, country code included, no leading "+" or zeros. */
function hashPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  return digits ? sha256(digits) : null;
}

/* The visitor's real IP. Vercel and most proxies put the client first in
   x-forwarded-for; everything after it is the proxy chain. */
function clientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || undefined;
}

/* Click id. Meta's own cookie (_fbc) is set only when the landing URL carried
   an fbclid AND the Pixel had a chance to run, so rebuild it from the URL when
   the cookie is missing — the format is fb.1.<unix_ms>.<fbclid>. */
function clickId(req: NextRequest, eventSourceUrl?: string): string | undefined {
  const cookie = req.cookies.get("_fbc")?.value;
  if (cookie) return cookie;

  if (!eventSourceUrl) return undefined;
  try {
    const fbclid = new URL(eventSourceUrl).searchParams.get("fbclid");
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  // Without the shared id Meta cannot dedupe, and every sign-up would be
  // counted twice. Refuse rather than corrupt the reporting.
  const eventId = asString(body.eventId).trim();
  if (!eventId) {
    return Response.json({ ok: false, error: "eventId required" }, { status: 400 });
  }

  // Let the site keep working before the token is configured: report the
  // sign-up as skipped instead of failing the request.
  if (!ACCESS_TOKEN) {
    console.warn("[meta-capi] META_CAPI_ACCESS_TOKEN not set — event not sent");
    return Response.json({ ok: false, skipped: "no access token" });
  }

  const eventSourceUrl = asString(body.eventSourceUrl) || undefined;
  const email = hashEmail(asString(body.email));
  const phone = hashPhone(asString(body.phone));

  const userData: Record<string, unknown> = {
    client_user_agent: req.headers.get("user-agent") || undefined,
    client_ip_address: clientIp(req),
    fbp: req.cookies.get("_fbp")?.value,
    fbc: clickId(req, eventSourceUrl),
  };
  // Meta expects hashed identifiers as arrays.
  if (email) userData.em = [email];
  if (phone) userData.ph = [phone];

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: userData,
      },
    ],
    access_token: ACCESS_TOKEN,
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Don't let a slow Graph API hold the connection open indefinitely.
        signal: AbortSignal.timeout(8000),
      }
    );

    const result = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      console.error("[meta-capi] Graph API rejected the event:", result);
      return Response.json({ ok: false, error: result }, { status: 502 });
    }

    return Response.json({ ok: true, result });
  } catch (err) {
    console.error("[meta-capi] request failed:", err);
    return Response.json({ ok: false, error: "request failed" }, { status: 502 });
  }
}
