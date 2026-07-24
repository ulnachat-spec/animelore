"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ShareModal } from "@/components/share/ShareModal";
import { CHAT_ASSISTANT_NAME } from "@/lib/chat/persona";
import type { LoreCard } from "@/lib/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface WorkChatDrawerProps {
  workTitle: string;
  cards: LoreCard[];
  /** 四卡未就绪时仅可打开抽屉查看提示，不可发送 */
  ready?: boolean;
  readyHint?: string;
  coverImage?: string;
}

export function WorkChatDrawer({
  workTitle,
  cards,
  ready = true,
  readyHint = "图鉴卡片还在准备中，稍后再聊哦～",
  coverImage
}: WorkChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuote, setShareQuote] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobileSheet, setIsMobileSheet] = useState(false);

  const canSend = ready && cards.length > 0 && !loading;

  function pickSubstantiveQuote(text: string): string {
    const parts = text
      .split(/[。！？!?\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4);
    return (parts.at(-1) ?? text.trim()).slice(0, 64);
  }

  function shouldOfferShare(text: string): boolean {
    const emotionalWords =
      /推荐|神作|好看|喜欢|哭了|意难平|封神|烂尾|失望|二刷|安利|震撼|上头|治愈|虐|破防|感动|难受|补完|追完/;
    return text.trim().length > 20 || emotionalWords.test(text);
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileSheet(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      const t = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, messages, loading, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !canSend) return;

    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    const candidateQuote = shouldOfferShare(text) ? pickSubstantiveQuote(text) : "";
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workTitle,
          cards,
          messages: nextMessages
        })
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.error || `请求失败（${res.status}）`
        );
      }
      if (!data.message?.trim()) {
        throw new Error("空回复");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.message! }]);
      if (candidateQuote) {
        setShareQuote(candidateQuote);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.25rem+var(--safe-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-brand/40 bg-elevated py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink shadow-float transition hover:-translate-y-0.5 hover:border-brand md:bottom-6 md:right-6 md:z-40"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Image
          src="/brand/mei-avatar-v1.png"
          alt=""
          width={40}
          height={40}
          className="size-9 rounded-full border border-brand/20 object-cover"
        />
        问问芽衣
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭聊天"
              className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="work-chat-title"
              className="fixed z-50 flex w-full flex-col border-line bg-surface shadow-2xl inset-x-0 bottom-0 top-auto max-h-[min(88vh,720px)] rounded-t-2xl border-t md:inset-y-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0"
              initial={isMobileSheet ? { y: "100%", x: 0 } : { x: "100%", y: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={isMobileSheet ? { y: "100%", x: 0 } : { x: "100%", y: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/70 px-4 py-4 md:px-5">
                <motion.div
                  className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line md:hidden"
                  aria-hidden
                />
                <Image
                  src="/brand/mei-avatar-v1.png"
                  alt="芽衣"
                  width={44}
                  height={44}
                  className="mt-2 size-10 shrink-0 rounded-full border border-brand/20 object-cover md:mt-0"
                />
                <div className="min-w-0 pt-2 md:pt-0">
                  <h2 id="work-chat-title" className="text-base font-semibold text-paper">
                    和{CHAT_ASSISTANT_NAME}聊聊这部作品
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted">{workTitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-soft hover:text-paper"
                    aria-label="关闭"
                  >
                    ✕
                  </button>
                </div>
              </header>

              <motion.div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5"
              >
                {messages.length === 0 ? (
                  <div className="mx-auto max-w-xs rounded-2xl border border-line bg-soft/60 p-5 text-center">
                    <Image
                      src="/brand/mei-avatar-v1.png"
                      alt=""
                      width={64}
                      height={64}
                      className="mx-auto size-16 rounded-full border-2 border-elevated object-cover shadow-card"
                    />
                    <p className="mt-3 text-sm leading-relaxed text-body">
                    嗨～我是{CHAT_ASSISTANT_NAME}。关于《{workTitle}》的梗、幕后或观感，都可以问我。
                    {!ready ? (
                      <span className="mt-2 block text-amber-400/90">{readyHint}</span>
                    ) : null}
                    </p>
                  </div>
                ) : null}
                {messages.map((m, i) => (
                  <motion.div
                    key={`${m.role}-${i}-${m.content.slice(0, 24)}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <motion.div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-md bg-brand/90 text-white"
                          : "rounded-bl-md border border-line/80 bg-soft/90 text-ink"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <span className="mb-1 block text-[10px] font-medium text-brand/90">
                          {CHAT_ASSISTANT_NAME}
                        </span>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </motion.div>
                  </motion.div>
                ))}
                {loading ? (
                  <p className="text-center text-xs text-muted" aria-live="polite">
                    {CHAT_ASSISTANT_NAME}正在想怎么回答呢…
                  </p>
                ) : null}
              </motion.div>

              <footer className="shrink-0 border-t border-line/70 px-4 py-3 md:px-5">
                {!ready ? (
                  <p className="mb-2 text-center text-xs text-amber-400/90" role="status">
                    {readyHint}
                  </p>
                ) : null}
                {error ? (
                  <p className="mb-2 text-center text-xs text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
                <AnimatePresence>
                  {shareQuote ? (
                    <motion.div
                      className="mb-3 flex justify-end"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                    >
                      <button
                        type="button"
                        onClick={() => setShareOpen(true)}
                        className="rounded-full border border-brand/60 bg-brand/10 px-4 py-2 text-xs font-semibold text-brand shadow-lg shadow-black/20 transition hover:border-brand hover:bg-brand/15"
                      >
                        生成分享卡片
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    disabled={!canSend}
                    placeholder={
                      canSend ? "输入问题，Enter 发送" : "暂时还不能发送哦"
                    }
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-canvas/80 px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-brand/70 focus:outline-none focus:ring-1 focus:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!canSend || !input.trim()}
                    className="shrink-0 self-end rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    发送
                  </button>
                </div>
              </footer>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="work"
        workTitle={workTitle}
        initialQuote={shareQuote}
        coverImage={coverImage}
      />
    </>
  );
}
