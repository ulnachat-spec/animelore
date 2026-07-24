import { notFound } from "next/navigation";
import { ColdKnowledgeClient } from "@/components/cold-knowledge-client";
import { readColdHookStore } from "@/lib/cold-hook-store";
import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import { coldPayloadFromRaw } from "@/lib/hook-enrich";

export const dynamic = "force-dynamic";

export default async function ShareableColdKnowledgePage({
  params
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const record = readColdHookStore().find((item) => item.id === id);
  if (!record) notFound();

  const payload = await coldPayloadFromRaw({
    topic_type: record.topic_type,
    cold_subtype: record.cold_subtype,
    topic_key: record.topic_key,
    hook: record.hook,
    blurb: record.blurb,
    angle: record.angle,
    example_bridge: record.example_bridge,
    insight: record.insight,
    quiz: record.quiz,
    source_urls: record.source_urls,
    confidence: record.confidence,
    verification_status: record.verification_status,
    recommendations: record.recommendations
  });

  return (
    <ColdKnowledgeClient
      initialData={{
        ...payload,
        record_id: record.id,
        prompt_version: record.prompt_version ?? COLD_PROMPT_VERSION
      }}
    />
  );
}
