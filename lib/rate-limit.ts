import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;

function getLimiter() {
  if (limiter !== undefined) return limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    limiter = null;
    return limiter;
  }
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    prefix: "cvd-ai",
  });
  return limiter;
}

export async function limitAiCalls(key: string): Promise<{ success: boolean; remaining?: number }> {
  const rl = getLimiter();
  if (!rl) return { success: true };
  const res = await rl.limit(key);
  return { success: res.success, remaining: res.remaining };
}

export function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
