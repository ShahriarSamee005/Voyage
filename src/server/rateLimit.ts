// Small in-memory sliding-window limiter for /api/chat, so a public demo URL can't burn the
// Gemini quota. Per serverless instance (not global) — enough to stop accidental or scripted
// hammering. Over the limit the route returns 429 and the game answers from its offline Q&A.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12; // a curious player asks far fewer than this per minute
const hits = new Map<string, number[]>();

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
}

/** Returns true if this request is allowed (and records it). */
export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep memory bounded on long-lived instances.
  if (hits.size > 5000) {
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return true;
}
