"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ShareCardCanvas,
  SHARE_CARD_SIZES,
  type ShareOrientation,
  type ShareTag,
  type ShareTemplate
} from "@/components/share/ShareCardCanvas";
import { useShareCard } from "@/components/share/useShareCard";
import { useDialogFocus } from "@/lib/use-dialog-focus";

const templateOptions: Array<{ id: ShareTemplate; label: string }> = [
  { id: "midnight", label: "星夜书签" },
  { id: "legend", label: "典藏红章" },
  { id: "bittersweet", label: "芽衣手帐" }
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
  const sentences = clean.match(/[^。！？!?]+[。！？!?]?/g) ?? [];
  let summary = "";
  for (const sentence of sentences) {
    const candidate = `${summary}${sentence.trim()}`;
    if (candidate.length > 110) break;
    summary = candidate;
  }
  if (summary) return summary;

  const clipped = clean.slice(0, 106);
  const clauseEnd = Math.max(clipped.lastIndexOf("，"), clipped.lastIndexOf("；"), clipped.lastIndexOf("、"));
  return `${(clauseEnd >= 36 ? clipped.slice(0, clauseEnd) : clipped).replace(/[，；、\s]+$/, "")}。`;
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
  const { open, onClose } = props;
  const [template, setTemplate] = useState<ShareTemplate>("midnight");
  const [orientation, setOrientation] = useState<ShareOrientation>("portrait");
  const [quote, setQuote] = useState("");
  const [coldTitle, setColdTitle] = useState("");
  const [coldSummary, setColdSummary] = useState("");
  const [tags, setTags] = useState<ShareTag[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.28);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { saving, error, dataUrl, saveCard, resetShareImage } = useShareCard();

  const isWork = props.kind === "work";
  const title = isWork ? props.workTitle : props.hook;
  const workInitialQuote = props.kind === "work" ? props.initialQuote : "";
  const coldInitialTitle = props.kind === "cold" ? props.hook : "";
  const coldInitialSummary = props.kind === "cold" ? summarizeInsight(props.insight) : "";

  useDialogFocus({ open, onClose, dialogRef });

  useEffect(() => {
    if (!open) return;
    resetShareImage();
    setTemplate("midnight");
    setOrientation("portrait");
    setTags([]);
    if (isWork) {
      setQuote(normalizeQuote(workInitialQuote) || "这部值得留一张追番打卡。");
    } else {
      setColdTitle(coldInitialTitle.slice(0, 48));
      setColdSummary(coldInitialSummary);
    }
  }, [coldInitialSummary, coldInitialTitle, isWork, open, resetShareImage, workInitialQuote]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const cardWidth = SHARE_CARD_SIZES[orientation].width;
      const available = Math.min(window.innerWidth - 64, 390);
      setPreviewScale(Math.min(0.34, Math.max(0.16, available / cardWidth)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, orientation]);

  const toggleTag = (tag: ShareTag) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 2) return prev;
      return [...prev, tag];
    });
  };

  const filename = isWork ? `AnimeLore-${props.workTitle}-${orientation}` : `AnimeLore-cold-${props.hook}-${orientation}`;
  const cardSize = SHARE_CARD_SIZES[orientation];

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭分享弹窗"
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-title"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-[71] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-line bg-canvas p-4 shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:max-h-[90vh] md:w-[min(960px,92vw)] md:rounded-3xl md:border"
            initial={isDesktop ? { y: "calc(-50% + 60px)", x: "-50%", opacity: 0 } : { y: 60, opacity: 0 }}
            animate={isDesktop ? { y: "-50%", x: "-50%", opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { y: "calc(-50% + 60px)", x: "-50%", opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand">AnimeLore Share</p>
                <h2 id="share-card-title" className="mt-1 text-xl font-semibold text-ink">
                  {isWork ? "生成追番分享卡片" : "分享这条冷知识"}
                </h2>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-soft hover:text-ink"
              >
                关闭
              </button>
            </header>

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,420px)_1fr]">
              <div className="mx-auto self-start overflow-hidden rounded-2xl border border-line/70 bg-black/30 p-3">
                <div
                  style={{
                    width: cardSize.width * previewScale,
                    height: cardSize.height * previewScale,
                    overflow: "hidden"
                  }}
                >
                  <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                    {props.kind === "work" ? (
                      <ShareCardCanvas
                        ref={cardRef}
                        kind="work"
                        template={template}
                        orientation={orientation}
                        workTitle={props.workTitle}
                        quote={quote}
                        coverImage={props.coverImage}
                        tags={tags}
                      />
                    ) : (
                      <ShareCardCanvas
                        ref={cardRef}
                        kind="cold"
                        template={template}
                        orientation={orientation}
                        hook={coldTitle}
                        summary={coldSummary}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <section>
                  <p className="mb-2 text-sm font-medium text-body">卡片样式</p>
                  <div className="grid grid-cols-3 gap-2">
                    {templateOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTemplate(opt.id)}
                        className={`min-h-12 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                          template === opt.id
                            ? "border-brand bg-brand/15 text-brand"
                            : "border-line bg-surface text-body hover:border-brand/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="mb-2 text-sm font-medium text-body">画面比例</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["portrait", "landscape"] as ShareOrientation[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOrientation(value)}
                        className={`min-h-11 rounded-xl border px-3 text-sm transition ${orientation === value ? "border-brand bg-brand/15 font-semibold text-brand" : "border-line bg-surface text-body hover:border-brand/40"}`}
                      >
                        {value === "portrait" ? "竖屏海报 3:4" : "横屏分享 16:9"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">横屏版会展开更多文字与版式组件，适合桌面、动态头图和长文配图。</p>
                </section>
                {props.kind === "work" ? (
                  <>
                    <section>
                      <label htmlFor="share-quote" className="text-sm font-medium text-body">
                        感想引语
                      </label>
                      <textarea
                        id="share-quote"
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-brand/70 focus:outline-none focus:ring-1 focus:ring-brand/40"
                        placeholder="写一句你想分享的追番感想"
                      />
                    </section>

                    <section>
                      <p className="mb-2 text-sm font-medium text-body">标签（最多 2 个）</p>
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
                                : "border-line bg-surface text-body hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <>
                    <section>
                      <label htmlFor="cold-share-title" className="text-sm font-medium text-body">
                        分享标题 <span className="font-normal text-muted">{coldTitle.length}/48</span>
                      </label>
                      <textarea
                        id="cold-share-title"
                        value={coldTitle}
                        onChange={(event) => setColdTitle(event.target.value.slice(0, 48))}
                        rows={2}
                        className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:border-brand/70 focus:outline-none focus:ring-1 focus:ring-brand/40"
                      />
                    </section>
                    <section>
                      <label htmlFor="cold-share-summary" className="text-sm font-medium text-body">
                        分享正文 <span className="font-normal text-muted">{coldSummary.length}/120</span>
                      </label>
                      <textarea
                        id="cold-share-summary"
                        value={coldSummary}
                        onChange={(event) => setColdSummary(event.target.value.slice(0, 120))}
                        rows={5}
                        className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:border-brand/70 focus:outline-none focus:ring-1 focus:ring-brand/40"
                      />
                      <p className="mt-2 text-xs leading-5 text-muted">图片中只是推荐初稿，你可以改成真正想分享的内容。</p>
                    </section>
                  </>
                )}

                {error ? (
                  <p className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void saveCard(cardRef.current, filename, cardSize)}
                  disabled={saving}
                  className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "正在生成图片..." : "保存图片"}
                </button>

                {dataUrl ? (
                  <div className="rounded-xl border border-line/70 bg-surface/90 p-3 text-xs leading-6 text-muted">
                    如果浏览器没有自动下载，可以长按下方图片保存。
                    <img
                      src={dataUrl}
                      alt={`${title} 分享卡片`}
                      className="mt-3 max-h-64 w-auto rounded-lg border border-line/70"
                    />
                  </div>
                ) : (
                  <p className="text-xs leading-6 text-muted">
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
