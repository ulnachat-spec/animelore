import { NextResponse } from "next/server";
import {
  rateLimitHeaders,
  requestClientKey,
  takeRateLimit,
  type RateLimitResult
} from "@/lib/rate-limit";
import { takeSharedRateLimit } from "@/lib/shared-rate-limit";

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): { blocked: NextResponse | null; result: RateLimitResult } {
  const result = takeRateLimit(scope, requestClientKey(request), limit, windowMs);
  if (result.allowed) return { blocked: null, result };

  return {
    blocked: NextResponse.json(
      {
        error: "rate_limited",
        message: "请求有点密集，芽衣需要几分钟整理档案，请稍后再试。"
      },
      { status: 429, headers: rateLimitHeaders(result) }
    ),
    result
  };
}

/** Uses Upstash when configured, otherwise retains the local limiter without blocking requests. */
export async function enforceRateLimitShared(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): Promise<{ blocked: NextResponse | null; result: RateLimitResult }> {
  const clientKey = requestClientKey(request);
  const result = (await takeSharedRateLimit(scope, clientKey, limit, windowMs)) ??
    takeRateLimit(scope, clientKey, limit, windowMs);
  if (result.allowed) return { blocked: null, result };
  return {
    blocked: NextResponse.json(
      { error: "rate_limited", message: "请求有点密集，芽衣需要几分钟整理档案，请稍后再试。" },
      { status: 429, headers: rateLimitHeaders(result) }
    ),
    result
  };
}
