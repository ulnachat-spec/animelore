import { describe, expect, it } from "vitest";
import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import { parseColdSession } from "@/lib/cold-session";

const payload = {
  hook: "测试钩子",
  blurb: "测试摘要",
  insight: "测试正文",
  topic_type: "work" as const,
  recommendations: []
};

describe("cold session envelope", () => {
  it("accepts a current envelope", () => {
    const result = parseColdSession(
      JSON.stringify({
        promptVersion: COLD_PROMPT_VERSION,
        savedAt: new Date().toISOString(),
        payload
      })
    );
    expect(result.ok).toBe(true);
  });

  it("rejects malformed and legacy payloads", () => {
    expect(parseColdSession("{").ok).toBe(false);
    expect(parseColdSession(JSON.stringify(payload))).toEqual({
      ok: false,
      reason: "prompt_version"
    });
  });

  it("rejects expired envelopes", () => {
    const result = parseColdSession(
      JSON.stringify({
        promptVersion: COLD_PROMPT_VERSION,
        savedAt: "2000-01-01T00:00:00.000Z",
        payload
      })
    );
    expect(result).toEqual({ ok: false, reason: "stale" });
  });
});
