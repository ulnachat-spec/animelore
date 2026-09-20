"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShareModal } from "@/components/share/ShareModal";
import { MeiState } from "@/components/mei-state";
import { LibraryActions } from "@/components/library-actions";
import { AniListPoster } from "@/components/anilist-poster";
import { formatColdInsightForDisplay } from "@/lib/cold-insight-display";
import {
  coldSessionStaleMessage,
  COLD_SESSION_STORAGE_KEY,
  parseColdSession
} from "@/lib/cold-session";
import { ROAM_RETURN_STORAGE_KEY } from "@/lib/roam/roam-session";
import type { ColdHookPayload } from "@/lib/types";
import { recordLibraryHistory } from "@/lib/user-library-client";

const topicLabel: Record<string, string> = {
  work: "作品向",
  concept: "文化概念",
  phenomenon: "行业 / 现象"
};

export function ColdKnowledgeClient({
  initialData = null
}: {
  initialData?: ColdHookPayload | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<ColdHookPayload | null>(initialData);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [quizChoice, setQuizChoice] = useState<boolean | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialData) return;
    try {
      const raw = sessionStorage.getItem(COLD_SESSION_STORAGE_KEY);
      const parsed = parseColdSession(raw);
      if (!parsed.ok) {
        setStaleMessage(coldSessionStaleMessage(parsed.reason));
        return;
      }
      setData(parsed.envelope.payload);
      setQuizChoice(null);
    } catch {
      setStaleMessage(coldSessionStaleMessage("invalid_json"));
    }
  }, [initialData, router]);

  useEffect(() => {
    if (!data) return;
    const href = data.record_id ? `/cold/${encodeURIComponent(data.record_id)}` : "/cold";
    recordLibraryHistory({
      id: `cold:${data.record_id || data.topic_key || data.hook}`,
      kind: "cold",
      title: data.hook,
      subtitle: data.blurb,
      href
    });
  }, [data]);

  if (staleMessage) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6">
        <MeiState
          eyebrow="这张临时书签已经失效"
          title="芽衣找不到刚才那份档案"
          description={staleMessage}
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="archive-button-primary">
              回首页重新抽取
            </Link>
            <Link href="/roam" className="archive-button">
              去漫游发现
            </Link>
          </div>
        </MeiState>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6">
        <MeiState
          eyebrow="正在读取冷知识"
          title="芽衣正在核对这份档案"
          description="来源、推荐和正文会一起准备好。"
        />
      </main>
    );
  }

  const hasRecs = data.recommendations.length > 0;
  const sourceUrls = (data.source_urls ?? []).filter((url) => /^https?:\/\//.test(url));
  const confidence = data.confidence ? Math.round(data.confidence * 100) : null;
  const showInsight = !data.quiz || quizChoice !== null;
  const quizFeedback =
    data.quiz && quizChoice !== null
      ? quizChoice === data.quiz.answer
        ? "猜对了"
        : quizChoice
          ? "被它骗到了"
          : data.quiz.answer
            ? "其实是真的"
            : "这条还真不是"
      : null;

  const onBack = () => {
    try {
      const returnTo = sessionStorage.getItem(ROAM_RETURN_STORAGE_KEY);
      if (returnTo === "/roam") {
        sessionStorage.removeItem(ROAM_RETURN_STORAGE_KEY);
        router.push("/roam");
        return;
      }
    } catch {
      /* ignore private mode */
    }
    router.push("/");
  };

  const copyPermanentLink = async () => {
    if (!data.record_id) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/cold/${encodeURIComponent(data.record_id)}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="archive-button"
        >
          ← 返回
        </button>
        <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
          {topicLabel[data.topic_type] || data.topic_type}
        </span>
      </header>

      <section className="archive-card relative overflow-hidden p-5 sm:p-8">
        <span className="absolute -right-4 -top-10 font-display text-[10rem] leading-none text-brand/5" aria-hidden="true">
          ?
        </span>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <p className="archive-kicker text-brand">Cold knowledge dossier</p>
            {data.record_id ? (
              <span className="font-mono text-[0.62rem] text-muted">
                #{data.record_id.slice(-8).toUpperCase()}
              </span>
            ) : null}
          </div>
          <h1 className="archive-title mt-4 max-w-3xl text-3xl leading-tight sm:text-4xl">
            {data.hook}
          </h1>
          {data.blurb ? (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-body sm:text-base">
              {data.blurb}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full bg-soft px-3 py-1.5">
              {data.verification_status === "verified" ? "已校验" : "内容兜底"}
            </span>
            {confidence ? <span className="rounded-full bg-soft px-3 py-1.5">置信度 {confidence}%</span> : null}
            {sourceUrls.length ? (
              <span className="rounded-full bg-soft px-3 py-1.5">来源 {sourceUrls.length} 个</span>
            ) : null}
          </div>
          <div className="mt-5">
            <LibraryActions
              compact
              item={{
                id: `cold:${data.record_id || data.topic_key || data.hook}`,
                kind: "cold",
                title: data.hook,
                subtitle: data.blurb,
                href: data.record_id ? `/cold/${encodeURIComponent(data.record_id)}` : "/cold"
              }}
            />
          </div>
        </div>
      </section>

      {data.quiz ? (
        <section className="archive-card mt-5 p-5 sm:p-6">
          <p className="archive-kicker">先猜一下 · Quick quiz</p>
          <p className="mt-3 font-display text-lg font-semibold text-ink">你觉得这是真的吗？</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuizChoice(true)}
              className="archive-button"
            >
              像真的
            </button>
            <button
              type="button"
              onClick={() => setQuizChoice(false)}
              className="archive-button"
            >
              感觉在骗我
            </button>
          </div>
          {quizChoice !== null ? (
            <div className="mt-5 rounded-xl bg-ink/5 p-4 text-sm leading-7 text-body animate-[pulse_0.8s_ease-in-out_1]">
              <p className="font-medium text-ink">{quizFeedback}</p>
              <p className="mt-2">{data.quiz.explanation}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {showInsight ? (
        <article className="mx-auto mt-8 w-full max-w-3xl space-y-5 font-display text-[1.04rem] leading-8 text-ink sm:text-lg sm:leading-9">
          {formatColdInsightForDisplay(data.insight)
            .split(/\n\n+/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="whitespace-pre-line">
                {para.trim()}
              </p>
            ))}
        </article>
      ) : null}

      {sourceUrls.length > 0 && showInsight ? (
        <section className="mt-9 rounded-2xl border border-line bg-canvas-tint/45 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="archive-kicker">资料来源 · Sources</p>
            <span className="text-xs text-muted">建议交叉阅读</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {sourceUrls.map((url, index) => {
              let host = `来源 ${index + 1}`;
              try {
                host = new URL(url).hostname.replace(/^www\./, "");
              } catch {
                // Keep fallback label.
              }
              return (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="archive-button min-h-10 text-xs"
                >
                  {host} ↗
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasRecs && showInsight ? (
        <>
          <div className="my-10 border-t border-line" />

          <p className="text-center text-sm font-medium text-muted">用这几部看懂它</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.recommendations.map((rec, idx) => (
              <Link
                key={`${rec.candidate_id || rec.searchQuery}-${idx}`}
                href={`/work/${encodeURIComponent(rec.searchQuery)}`}
                className="archive-card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand/50"
              >
                <div className="relative h-[120px] w-[85px] shrink-0 overflow-hidden rounded-lg bg-soft">
                  <AniListPoster title={rec.searchQuery} initialSrc={rec.coverImage} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-ink">{rec.displayTitle}</h2>
                  {rec.nativeTitle ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{rec.nativeTitle}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-body line-clamp-none">
                    {rec.reason}
                  </p>
                  <p className="mt-3 text-xs text-brand">查看图鉴 →</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {showInsight ? (
        <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-line/70 pt-8">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="archive-button-primary"
          >
            分享这条冷知识
          </button>
          {data.record_id ? (
            <button type="button" onClick={copyPermanentLink} className="archive-button">
              {copied ? "链接已复制" : "复制永久链接"}
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
    <ShareModal
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      kind="cold"
      hook={data.hook}
      insight={data.insight}
    />
    </>
  );
}
