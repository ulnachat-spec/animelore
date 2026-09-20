import { afterEach, describe, expect, it, vi } from "vitest";

import { RANDOM_WORK_POOL, takeRandomWork } from "@/lib/random-work-pool";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("discovery pools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps a broad, duplicate-free random archive pool", () => {
    expect(RANDOM_WORK_POOL).toHaveLength(50);
    expect(new Set(RANDOM_WORK_POOL).size).toBe(50);
  });

  it("does not repeat an archive until the shuffle bag is exhausted", () => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    const picks = Array.from({ length: RANDOM_WORK_POOL.length }, () => takeRandomWork());

    expect(new Set(picks).size).toBe(RANDOM_WORK_POOL.length);
    expect(picks.every((title) => RANDOM_WORK_POOL.includes(title as (typeof RANDOM_WORK_POOL)[number]))).toBe(true);
  });
});
