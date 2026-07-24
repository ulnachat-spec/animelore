/** RAG 检索是否跳过 B站/NGA/aweidao 社区源（首屏优先；延伸阅读由 /api/work/community-recs 异步拉取） */
export function ragDeferCommunityEvidence(): boolean {
  const v = process.env.RAG_DEFER_COMMUNITY_EVIDENCE?.trim();
  if (v == null || v === "") return true;
  return v === "true" || v === "1";
}
