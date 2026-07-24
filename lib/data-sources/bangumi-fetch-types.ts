import type { BangumiSubject } from "@/lib/data-sources/bangumi";

export type BangumiFetchPhase = "http" | "parse" | "api_error" | "empty" | "network";

export interface BangumiFetchFailure {
  query: string;
  ok: false;
  status: number | null;
  phase: BangumiFetchPhase;
  message: string;
}

export interface BangumiFetchSuccess {
  query: string;
  ok: true;
  data: BangumiSubject;
}

export type BangumiFetchOutcome = BangumiFetchSuccess | BangumiFetchFailure;

export function bangumiFetchFailure(
  query: string,
  args: { status: number | null; phase: BangumiFetchPhase; message: string }
): BangumiFetchFailure {
  return { query, ok: false, status: args.status, phase: args.phase, message: args.message };
}

export function bangumiFetchSuccess(query: string, data: BangumiSubject): BangumiFetchSuccess {
  return { query, ok: true, data };
}
