"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShareCardCanvas,
  type ShareTag,
  type ShareTemplate
} from "@/components/share/ShareCardCanvas";
import { useShareCard } from "@/components/share/useShareCard";

const templateOptions: Array<{ id: ShareTemplate; label: string }> = [
  { id: "midnight", label: "深夜追番" },
  { id: "legend", label: "封神之作" },
  { id: "bittersweet", label: "意难平" }
];

const tagOptions: ShareTag[] = ["已完结", "二刷", "神作", "意难平", "安利必看", "还在追"];

export type ShareModalProps =
  | {
      open: boolean;
      onClose: () => void;
      kind: "work";
      workTitle: string;
      initialQuote: string;
      coverImage?: string;
    }
  | {
      open: boolean;
      onClose: () => void;
      kind: "cold";
      hook: string;
      insight: string;
    };

function summarizeInsight(insight: string): string {
  const clean = insight.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

function normalizeQuote(quote: string): string {
  const sentences = quote
    .split(/[。！？!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
  const picked = sentences.at(-1) ?? quote.trim();
  return picked.slice(0, 64);
}

export function ShareModal(props: ShareModalProps) {
  const [template, setTemplate] = useState<ShareTemplate>("midnight");
  const [quote, setQuote] = useState("");
  const [tags, setTags] = useState<ShareTag[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { saving, error, dataUrl, saveCard, resetShareImage } = useShareCard();

  const isWork = props.kind === "work";
  const title = isWork ? props.workTitle : props.hook;
  const workInitialQuote = props.kind === "work" ? props.initialQuote : "";

  useEffect(() => {
    if (!props.open) return;
    resetShareImage();
    setTemplate("midnight");
    setTags([]);
    if (isWork) {
      setQuote(normalizeQuote(workInitialQuote) || "这部值得留一张追番打卡。");
    }
  }, [props.open, isWork, workInitialQuote, resetShareImage]);

  useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [props.open, props.onClose]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const previewScale = useMemo(() => {
    if (typeof window === "undefined") return 0.28;
    return Math.min(0.34, Math.max(0.22, (window.innerWidth - 64) / 1080));
  }, [props.open]);

  const toggleTag = (tag: ShareTag) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 2) return prev;
      return [...prev, tag];
    });
  };

  const filename = isWork ? `AnimeLore-${props.workTitle}` : `AnimeLore-cold-${props.hook}`;

  return (
    <AnimatePresence>
      {props.open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭分享弹窗"
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={props.onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-title"
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-zinc-700 bg-zinc-950 p-4 shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:max-h-[90vh] md:w-[min(960px,92vw)] md:rounded-3xl md:border"
            initial={isDesktop ? { y: "calc(-50% + 60px)", x: "-50%", opacity: 0 } : { y: 60, opacity: 0 }}
            animate={isDesktop ? { y: "-50%", x: "-50%", opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { y: "calc(-50% + 60px)", x: "-50%", opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand">AnimeLore Share</p>
                <h2 id="share-card-title" className="mt-1 text-xl font-semibold text-paper">
                  {isWork ? "生成追番分享卡片" : "分享这条冷知识"}
                </h2>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-paper"
              >
                关闭
              </button>
            </header>

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,420px)_1fr]">
              <div className="mx-auto overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-3">
                <div
                  style={{
                    width: 1080 * previewScale,
                    height: 1440 * previewScale,
                    overflow: "hidden"
                  }}
                >
                  <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                    {props.kind === "work" ? (
                      <ShareCardCanvas
                        ref={cardRef}
                        kind="work"
                        template={template}
                        workTitle={props.workTitle}
                        quote={quote}
                        coverImage={props.coverImage}
                        tags={tags}
                      />
                    ) : (
                      <ShareCardCanvas
                        ref={cardRef}
                        kind="cold"
                        hook={props.hook}
                        summary={summarizeInsight(props.insight)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {props.kind === "work" ? (
                  <>
                    <section>
                      <p className="mb-2 text-sm font-medium text-zinc-300">模板</p>
                      <div className="grid grid-cols-3 gap-2">
                        {templateOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplate(opt.id)}
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              template === opt.id
                                ? "border-brand bg-brand/15 text-brand"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <label htmlFor="share-quote" className="text-sm font-medium text-zinc-300">
                        感想引语
                      </label>
                      <textarea
                        id="share-quote"
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-relaxed text-paper placeholder:text-zinc-600 focus:border-brand/70 focus:outline-none focus:ring-1 focus:ring-brand/40"
                        placeholder="写一句你想分享的追番感想"
                      />
                    </section>

                    <section>
                      <p className="mb-2 text-sm font-medium text-zinc-300">标签（最多 2 个）</p>
                      <div className="flex flex-wrap gap-2">
                        {tagOptions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            disabled={!tags.includes(tag) && tags.length >= 2}
                            className={`rounded-full border px-3 py-1.5 text-xs transition ${
                              tags.includes(tag)
                                ? "border-brand bg-brand/15 text-brand"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-7 text-zinc-300">
                    冷知识分享卡会使用「深夜追番」模板，自动截取 hook 和正文摘要。
                  </p>
                )}

                {error ? (
                  <p className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void saveCard(cardRef.current, filename)}
                  disabled={saving}
                  className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "正在生成图片..." : "保存图片"}
                </button>

                {dataUrl ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs leading-6 text-zinc-400">
                    如果浏览器没有自动下载，可以长按下方图片保存。
                    <img
                      src={dataUrl}
                      alt={`${title} 分享卡片`}
                      className="mt-3 max-h-64 w-auto rounded-lg border border-zinc-800"
                    />
                  </div>
                ) : (
                  <p className="text-xs leading-6 text-zinc-500">
                    iOS Safari 可能无法直接下载，会显示图片供你长按保存。
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
