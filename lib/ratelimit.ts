/** Per-IP fixed-window limiter (in-process). Swap for Redis/Upstash when running more than one instance. */
const hits = new Map<string, { n: number; reset: number }>();

export function limited(req: Request, max: number, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    return false;
  }
  h.n += 1;
  return h.n > max;
}
