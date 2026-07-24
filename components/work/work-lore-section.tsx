import { StreamingWorkLoreClient } from "@/components/StreamingWorkLoreClient";
import { WorkLoreClient } from "@/components/work-lore-client";
import { WorkBottomHookPanel } from "@/components/work/work-bottom-hook-panel";
import { WorkPageError } from "@/components/work/work-page-error";
import { workLoreStreamingEnabled } from "@/lib/work-streaming-config";
import { workLoreStreamClientIdleMs } from "@/lib/work-stream-timeouts";
import { getWorkCoreCached } from "@/lib/work-page-loaders";

/** 开发环境可用 ?debugTyping=1 单独走 SSE，无需 WORK_LORE_STREAMING */
function shouldUseStreamingClient(debugTyping: boolean): boolean {
  if (workLoreStreamingEnabled()) return true;
  if (
    process.env.NODE_ENV === "development" &&
    debugTyping
  ) {
    return true;
  }
  return false;
}

export async function WorkLoreSection({
  query,
  debugTyping = false
}: {
  query: string;
  debugTyping?: boolean;
}) {
  if (shouldUseStreamingClient(debugTyping)) {
    return (
      <StreamingWorkLoreClient
        query={query}
        debugTyping={debugTyping}
        clientIdleMs={workLoreStreamClientIdleMs()}
      />
    );
  }

  const core = await getWorkCoreCached(query);

  if (!core.ok) {
    return <WorkPageError query={query} code={core.code} message={core.message} />;
  }

  const pageContext = {
    title: core.meta.title,
    nativeTitle: core.meta.nativeTitle,
    urlQuery: query.trim()
  };

  return (
    <>
      <WorkLoreClient
        meta={core.meta}
        initialCards={core.lore.cards}
        evidenceForRegenerate={core.evidenceForRegenerate}
      />
      <WorkBottomHookPanel bottomHook={core.lore.bottom_hook} pageContext={pageContext} />
    </>
  );
}
