import { createHash } from "node:crypto";
import type { RateLimitResult } from "@/lib/rate-limit";

const STORE_TIMEOUT_MS = 900;

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function sharedRateLimitConfigured(): boolean {
  return Boolean(config());
}

function privateKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

/**
 * Optional Upstash REST fixed-window limiter. It stores only a one-way client hash,
 * and returns null on any remote issue so callers can safely fall back in-process.
 */
export async function takeSharedRateLimit(
  scope: string,
  clientKey: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const store = config();
  if (!store) return null;
  const now = Date.now();
  const key = `animelore:rl:${scope}:${privateKey(clientKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STORE_TIMEOUT_MS);
  try {
    const response = await fetch(`${store.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${store.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["set", key, "0", "px", String(windowMs), "nx"],
        ["incr", key],
        ["pttl", key]
      ]),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ result?: number | string | null }>;
    const count = Number(payload[1]?.result);
    const ttl = Number(payload[2]?.result);
    if (!Number.isFinite(count)) return null;
    const remainingMs = Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs;
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + remainingMs
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
