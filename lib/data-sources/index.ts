export * from "./sources";
export {
  fetchAniListMediaBrief,
  fetchAniListMediaBriefBatch,
  type AniListMediaBrief
} from "./anilist-brief";
export {
  fetchBangumiSubject,
  fetchBangumiSubjectBestEffort,
  fetchBangumiSubjectOutcome,
  bangumiSubjectToSnippet
} from "./bangumi";
export type { BangumiSubject } from "./bangumi";
export type {
  BangumiFetchFailure,
  BangumiFetchOutcome,
  BangumiFetchPhase,
  BangumiFetchSuccess
} from "./bangumi-fetch-types";
export {
  fetchAweidaoCommunityContext,
  fetchBilibiliColumnContext,
  fetchNgaCommunityContext
} from "./community-sources";
export type { CommunityArticleEvidence } from "./community-sources";
export { buildStableCommunityHint } from "@/lib/community-hint";
export type { StableCommunityHintInput } from "@/lib/community-hint";
export type {
  CommunityFetchFailure,
  CommunityFetchMeta,
  CommunityFetchOutcome,
  CommunityFetchPhase,
  CommunityFetchSuccess,
  CommunitySourceId
} from "./community-fetch-types";
export { communityOutcomeToDebug } from "./community-fetch-types";
export {
  filterWorkRelatedRecsForCurrentPage,
  isWorkTitleSameAsPage,
  normalizeWorkTitleKey
} from "../work-rec-utils";
