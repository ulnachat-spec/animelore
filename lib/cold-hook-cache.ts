import { homeHookCacheTtlMs } from "@/lib/cold-hook-config";
import type { ColdHookPayload } from "@/lib/types";

type Slot = {
  payload: ColdHookPayload;
  expiresAt: number;
  dateKey: string;
};

let slot: Slot | null = null;

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCachedHomeHookPayload(dateKey: string): ColdHookPayload | null {
  if (!slot) return null;
  if (slot.dateKey !== dateKey) return null;
  if (Date.now() > slot.expiresAt) {
    slot = null;
    return null;
  }
  return slot.payload;
}

export function setCachedHomeHookPayload(dateKey: string, payload: ColdHookPayload): void {
  slot = {
    payload,
    dateKey,
    expiresAt: Date.now() + homeHookCacheTtlMs()
  };
}

export function clearHomeHookCache(): void {
  slot = null;
}
