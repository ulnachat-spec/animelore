import { beforeEach, describe, expect, it } from "vitest";
import {
  requestClientKey,
  resetRateLimitsForTests,
  takeRateLimit
} from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows requests up to the configured limit", () => {
    expect(takeRateLimit("chat", "user-a", 2, 1_000, 10).allowed).toBe(true);
    expect(takeRateLimit("chat", "user-a", 2, 1_000, 20).allowed).toBe(true);
    expect(takeRateLimit("chat", "user-a", 2, 1_000, 30).allowed).toBe(false);
  });

  it("opens a new window after reset", () => {
    takeRateLimit("work", "user-a", 1, 100, 1_000);
    expect(takeRateLimit("work", "user-a", 1, 100, 1_050).allowed).toBe(false);
    expect(takeRateLimit("work", "user-a", 1, 100, 1_101).allowed).toBe(true);
  });

  it("prefers the first forwarded IP", () => {
    const request = new Request("https://animelore.example/api/chat", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" }
    });
    expect(requestClientKey(request)).toBe("203.0.113.8");
  });
});
