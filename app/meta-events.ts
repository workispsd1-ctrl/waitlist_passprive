/* =====================================================================
   Meta Pixel / Conversions API — shared constants and browser helpers.

   The Pixel ID is public: it ships in the page source and in every request
   to facebook.com. The CAPI *access token* is not — it stays server-side in
   META_CAPI_ACCESS_TOKEN and must never get a NEXT_PUBLIC_ prefix.
   ===================================================================== */

export const META_PIXEL_ID = "985504934482696";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/* One id per conversion, sent from BOTH the browser Pixel and the server.
   Meta merges the matching pair into a single event rather than counting the
   same sign-up twice — without this, cost-per-lead reads at half its real
   value and ad optimisation learns from inflated numbers. */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* Waitlist sign-up. `Lead` is the event Meta optimises ad delivery against,
   so it has to carry the same eventID the server sends for this submission. */
export function trackLead(eventId: string): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "Lead", {}, { eventID: eventId });
}
