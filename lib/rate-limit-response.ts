import { NextResponse } from "next/server";
import {
  rateLimitHeaders,
  requestClientKey,
  takeRateLimit,
  type RateLimitResult
} from "@/lib/rate-limit";

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
