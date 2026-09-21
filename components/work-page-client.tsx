"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { WorkLoreClient } from "@/components/work-lore-client";
import { WorkPageSkeleton } from "@/components/work-page-skeleton";
import { WorkSupplementalSections } from "@/components/work-supplemental-sections";
import type { LoadWorkCoreSuccess } from "@/lib/load-work-core";

type WorkPageState =
  | { status: "loading" }
  | { status: "error"; code: string; message: string }
  | { status: "ready"; data: LoadWorkCoreSuccess };

function WorkPageError({
  query,
  code,
  message
}: {
  query: string;
  code: string;
  message: string;
}) {
  const keyHint =
    code === "missing_api_key" ? (
      <>
        请确认项目根目录的 `.env` 或 `.env.local` 里已配置{" "}
        <code className="rounded bg-soft px-1">DEEPSEEK_API_KEY</code>
        ，保存后重启 <code className="rounded bg-soft px-1">npm run dev</code>。
      </>
    ) : (
      <>
        服务端错误代码：<code className="rounded bg-soft px-1">{code}</code>
        。请查看运行 <code className="rounded bg-soft px-1">npm run dev</code> 的终端日志。
      </>
    );

  return (
    <>
      <p className="mt-8 text-body">
        暂时没取到《{query}》的数据。{keyHint}
      </p>
      <p className="mt-4 rounded-lg border border-line bg-surface/85 p-3 font-mono text-xs text-muted">
        {message}
      </p>
    </>
  );
}

export function WorkPageClient({ query }: { query: string }) {
  const [state, setState] = useState<WorkPageState>({ status: "loading" });

  useEffect(() => {
    const ac = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch(`/api/work?q=${encodeURIComponent(query)}`, {
          signal: ac.signal,
          cache: "no-store"
        });
        const data = (await res.json()) as LoadWorkCoreSuccess & {
          ok?: boolean;
          code?: string;
          message?: string;
          error?: string;
          detail?: string;
        };

        if (ac.signal.aborted) return;

        if (!res.ok || data.ok === false) {
          setState({
            status: "error",
            code: data.code ?? "pipeline_error",
            message:
              data.message ??
              data.detail ??
              (typeof data.error === "string" ? data.error : `HTTP ${res.status}`)
          });
          return;
        }

        if (!data.meta || !data.lore) {
          setState({
            status: "error",
            code: "invalid_response",
            message: "作品数据格式异常"
          });
          return;
        }

        setState({
          status: "ready",
          data: {
            meta: data.meta,
            lore: data.lore,
            evidenceForRegenerate: data.evidenceForRegenerate ?? null,
            pipeline: data.pipeline,
            rag: data.rag
          }
        });
      } catch (err) {
        if (ac.signal.aborted) return;
        setState({
          status: "error",
          code: "network",
          message: err instanceof Error ? err.message : String(err)
        });
      }
    })();

    return () => ac.abort();
  }, [query]);

  const bangumiNameCn = useMemo(() => {
    if (state.status !== "ready") return undefined;
    const bg = state.data.rag?.evidence_pack?.items?.find((e) => e.source === "bangumi");
    return bg && typeof bg.structured?.name_cn === "string" ? bg.structured.name_cn : undefined;
  }, [state]);

  if (state.status === "loading") {
    return <WorkPageSkeleton query={query} />;
  }

  if (state.status === "error") {
    return <WorkPageError query={query} code={state.code} message={state.message} />;
  }

  const { meta, lore, evidenceForRegenerate } = state.data;

  return (
    <>
      <section className="mt-8 flex gap-6 rounded-2xl border border-line bg-surface/85 p-5">
        {meta.coverImage ? (
          <Image
            src={meta.coverImage}
            alt={meta.title}
            width={180}
            height={250}
            className="rounded-xl object-cover"
          />
        ) : null}
        <WorkMetaHeader meta={meta} />
      </section>

      <WorkLoreClient
        meta={meta}
        initialCards={lore.cards}
        evidenceForRegenerate={evidenceForRegenerate}
      />

      <WorkSupplementalSections
        query={query}
        meta={meta}
        bottomHook={lore.bottom_hook}
        bangumiNameCn={bangumiNameCn}
      />
    </>
  );
}

function WorkMetaHeader({ meta }: { meta: LoadWorkCoreSuccess["meta"] }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">{meta.title}</h1>
      <p className="mt-1 text-muted">
        {meta.nativeTitle || "N/A"} · {meta.seasonYear || "未知年份"}
      </p>
      <p className="mt-3 text-sm text-body">
        {(meta.studios || []).join(" · ") || "制作信息待补充"}
      </p>
    </div>
  );
}
