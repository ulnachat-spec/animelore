"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShareModal } from "@/components/share/ShareModal";
import { formatColdInsightForDisplay } from "@/lib/cold-insight-display";
import {
  coldSessionStaleMessage,
  COLD_SESSION_STORAGE_KEY,
  parseColdSession
} from "@/lib/cold-session";
import { ROAM_RETURN_STORAGE_KEY } from "@/lib/roam/roam-session";
import type { ColdHookPayload } from "@/lib/types";

const topicLabel: Record<string, string> = {
  work: "作品向",
  concept: "文化概念",
  phenomenon: "行业 / 现象"
};

export default function ColdKnowledgePage() {
  const router = useRouter();
  const [data, setData] = useState<ColdHookPayload | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [quizChoice, setQuizChoice] = useState<boolean | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
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
  }, [router]);

  if (staleMessage) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
        <p className="text-base leading-relaxed text-body">{staleMessage}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-brand/60 bg-brand/10 px-4 py-2 text-sm text-brand hover:bg-brand/20"
          >
            回首页重新加载
          </Link>
          <Link
            href="/?refreshHook=1"
            className="rounded-lg border border-line px-4 py-2 text-sm text-body hover:bg-soft"
          >
            强制新生成（开发）
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
        <p className="text-muted">加载中…</p>
      </main>
    );
  }

  const hasRecs = data.recommendations.length > 0;
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

  return (
    <>
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-body hover:bg-soft"
        >
          ← 返回首页
        </button>
        <span className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">
          {topicLabel[data.topic_type] || data.topic_type}
        </span>
      </header>

      <h1 className="text-2xl font-bold leading-snug md:text-3xl">{data.hook}</h1>

      {data.quiz ? (
        <section className="mt-8 rounded-2xl border border-line bg-surface/90 p-5">
          <p className="text-sm font-medium text-ink">你觉得这是真的吗？</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuizChoice(true)}
              className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-ink transition hover:border-brand/70 hover:bg-soft"
            >
              像真的
            </button>
            <button
              type="button"
              onClick={() => setQuizChoice(false)}
              className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-ink transition hover:border-brand/70 hover:bg-soft"
            >
              感觉在骗我
            </button>
          </div>
          {quizChoice !== null ? (
            <div className="mt-5 rounded-xl bg-ink/5 p-4 text-sm leading-7 text-body animate-[pulse_0.8s_ease-in-out_1]">
              <p className="font-medium text-paper">{quizFeedback}</p>
              <p className="mt-2">{data.quiz.explanation}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {showInsight ? (
        <article className="mt-8 space-y-4 text-base leading-relaxed text-ink">
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

      {hasRecs && showInsight ? (
        <>
          <div className="my-10 border-t border-line" />

          <p className="text-center text-sm font-medium text-muted">用这几部看懂它</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.recommendations.map((rec, idx) => (
              <Link
                key={`${rec.candidate_id || rec.searchQuery}-${idx}`}
                href={`/work/${encodeURIComponent(rec.searchQuery)}`}
                className="flex gap-4 rounded-2xl border border-line bg-surface/85 p-4 transition hover:border-brand/60 hover:bg-surface"
              >
                <div className="relative h-[120px] w-[85px] shrink-0 overflow-hidden rounded-lg bg-soft">
                  {rec.coverImage ? (
                    <Image
                      src={rec.coverImage}
                      alt={rec.displayTitle}
                      fill
                      className="object-cover"
                      sizes="85px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-paper">{rec.displayTitle}</h2>
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
        <div className="mt-10 flex justify-center border-t border-line/70 pt-8">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="rounded-full border border-brand/60 bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brand/15"
          >
            分享这条冷知识
          </button>
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
