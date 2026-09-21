import type { WorkLoreResult } from "@/lib/work-service";

const CACHE_TIMEOUT_MS = 900;
const MAX_CACHE_VALUE_CHARS = 220_000;

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(commands: string[][]): Promise<Array<{ result?: unknown }> | null> {
  const store = config();
  if (!store) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CACHE_TIMEOUT_MS);
  try {
    const response = await fetch(`${store.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${store.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal
    });
    return response.ok ? (await response.json()) as Array<{ result?: unknown }> : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSharedWorkLore(cacheKey: string): Promise<WorkLoreResult | null> {
  const result = await command([["get", `animelore:work:${cacheKey}`]]);
  const raw = result?.[0]?.result;
  if (typeof raw !== "string" || raw.length > MAX_CACHE_VALUE_CHARS) return null;
  try {
    return JSON.parse(raw) as WorkLoreResult;
  } catch {
    return null;
  }
}

export async function setSharedWorkLore(
  cacheKey: string,
  data: WorkLoreResult,
  ttlMs: number
): Promise<void> {
  const raw = JSON.stringify(data);
  if (raw.length > MAX_CACHE_VALUE_CHARS) return;
  await command([["set", `animelore:work:${cacheKey}`, raw, "px", String(ttlMs)]]);
}
