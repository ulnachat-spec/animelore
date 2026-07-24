"use client";

import { useEffect, useState } from "react";
import { WorkRelatedSection } from "@/components/work-related-section";
import {
  workCommunityRecsClientTimeoutMs,
  workRelatedClientTimeoutMs
} from "@/lib/work-page-timeouts";
import type { CommunityArticleRec, LorePayload, WorkMeta, WorkRelatedRec } from "@/lib/types";

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<T | null> {
  if (signal.aborted) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  signal.addEventListener("abort", onParentAbort);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", onParentAbort);
  }
}

export function WorkSupplementalSections({
  query,
  meta,
  bottomHook,
  bangumiNameCn
}: {
  query: string;
  meta: WorkMeta;
  bottomHook?: LorePayload["bottom_hook"];
  bangumiNameCn?: string;
}) {
  const [communityRecs, setCommunityRecs] = useState<CommunityArticleRec[] | undefined>(
    undefined
  );
  const [relatedRecs, setRelatedRecs] = useState<WorkRelatedRec[] | undefined>(undefined);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setCommunityLoading(true);
    setRelatedLoading(true);
    setCommunityRecs(undefined);
    setRelatedRecs(undefined);

    const communityQs = new URLSearchParams({
      q: query,
      title: meta.title || query
    });
    if (meta.nativeTitle) communityQs.set("nativeTitle", meta.nativeTitle);
    if (bangumiNameCn) communityQs.set("bangumiNameCn", bangumiNameCn);

    const relatedQs = new URLSearchParams({
      q: query,
      title: meta.title || query
    });
    if (meta.nativeTitle) relatedQs.set("nativeTitle", meta.nativeTitle);
    if (meta.anilistId != null) relatedQs.set("anilistId", String(meta.anilistId));

    void (async () => {
      const data = await fetchJsonWithTimeout<{ ok?: boolean; recs?: CommunityArticleRec[] }>(
        `/api/work/community-recs?${communityQs}`,
        workCommunityRecsClientTimeoutMs(),
        ac.signal
      );
      if (ac.signal.aborted) return;
      setCommunityRecs(data?.ok && data.recs?.length ? data.recs : []);
      setCommunityLoading(false);
    })();

    void (async () => {
      const data = await fetchJsonWithTimeout<{ ok?: boolean; recs?: WorkRelatedRec[] }>(
        `/api/work/related?${relatedQs}`,
        workRelatedClientTimeoutMs(),
        ac.signal
      );
      if (ac.signal.aborted) return;
      setRelatedRecs(data?.ok && data.recs?.length ? data.recs : []);
      setRelatedLoading(false);
    })();

    return () => ac.abort();
  }, [query, meta.title, meta.nativeTitle, meta.anilistId, bangumiNameCn]);

  return (
    <WorkRelatedSection
      recs={relatedRecs ?? []}
      bottomHook={bottomHook}
      communityRecs={communityRecs}
      pageContext={{
        title: meta.title,
        nativeTitle: meta.nativeTitle,
        urlQuery: query.trim()
      }}
      communityLoading={communityLoading}
      relatedLoading={relatedLoading}
    />
  );
}
