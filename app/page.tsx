import WaitlistLanding from "./waitlist-landing";

const SPOTS_TOTAL = 1000;
const SHEET_URL = process.env.NEXT_PUBLIC_LAUNCH_SHEET_URL || "";

/* Fetch the real "passes claimed" count on the server so it is baked into the
   HTML every visitor receives. Doing it here (instead of only in the browser)
   means ad blockers, privacy extensions and locked-down networks that block the
   client-side call to Google Apps Script can no longer make the counter fall
   back to 0 — the correct number is already in the page.

   The Apps Script `?action=count` endpoint returns plain JSON ({"count":N})
   when called without a JSONP callback. `fetch` follows its 302 redirect to
   googleusercontent.com automatically. */
async function getClaimed(): Promise<number> {
  if (!SHEET_URL) return 0;
  try {
    const sep = SHEET_URL.includes("?") ? "&" : "?";
    const res = await fetch(`${SHEET_URL}${sep}action=count`, {
      // Refresh at most once a minute: keeps the page fast and avoids hammering
      // Apps Script, while staying close to the live number.
      next: { revalidate: 60 },
      // Don't let a slow/cold Apps Script hang the whole page render. Apps
      // Script cold starts can take several seconds, so give it real headroom.
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    if (typeof data.count === "number" && Number.isFinite(data.count)) {
      return Math.min(Math.max(0, Math.floor(data.count)), SPOTS_TOTAL);
    }
  } catch {
    // Network/endpoint failure — fall back to 0. The client-side JSONP fetch in
    // WaitlistLanding will still try to fill in the live number on its own.
  }
  return 0;
}

export default async function Page() {
  const initialClaimed = await getClaimed();
  return <WaitlistLanding initialClaimed={initialClaimed} />;
}
