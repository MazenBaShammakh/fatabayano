import "server-only";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

type Limiter = "analyze" | "cards";

const LIMITS: Record<Limiter, { requests: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  analyze: { requests: 10, window: "1 m" },
  cards: { requests: 20, window: "1 h" },
};

const limiters = new Map<Limiter, Ratelimit>();

/** Hashed client IP, so the limiter never stores raw addresses (as the privacy page states). */
function clientKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("base64url").slice(0, 32);
}

/** Returns seconds to wait when over the limit, or 0. Without Redis (local dev) nothing is limited. */
export async function checkRateLimit(name: Limiter, request: Request): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      prefix: `ratelimit:${name}`,
      limiter: Ratelimit.slidingWindow(LIMITS[name].requests, LIMITS[name].window),
    });
    limiters.set(name, limiter);
  }
  const { success, reset } = await limiter.limit(clientKey(request));
  return success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
