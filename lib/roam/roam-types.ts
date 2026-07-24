import type { ColdVerificationStatus } from "@/lib/cold-types";
import type { ColdHookPayload, ColdSubtype } from "@/lib/types";

export type RoamCardType = ColdSubtype;

export type RoamCardTag = "作品" | "梗" | "幕后" | "概念" | "谱系" | "社区";

export interface RoamCard {
  id: string;
  type: RoamCardType;
  tag: RoamCardTag;
  hook: string;
  blurb: string;
  target:
    | { kind: "work"; title: string; href: string }
    | { kind: "cold"; title: string; href: "/cold" };
  cold_payload?: ColdHookPayload;
  source_urls: string[];
  confidence: number;
  verification_status: ColdVerificationStatus;
  next_seeds: string[];
  topic_key: string;
}

export interface RoamRequestPrefs {
  seed?: string;
  likedTags: RoamCardTag[];
  skippedTags: RoamCardTag[];
  recentTopicKeys: string[];
}

export interface RoamBatchDebug {
  requested_count: number;
  returned_count: number;
  library_candidates: number;
  fallback_used: boolean;
  blocked_recent_count: number;
}
