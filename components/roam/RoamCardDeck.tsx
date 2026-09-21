"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoamCard } from "@/components/roam/RoamCard";
import {
  buildColdSessionEnvelope,
  COLD_SESSION_STORAGE_KEY
} from "@/lib/cold-session";
import {
  ROAM_DECK_STORAGE_KEY,
  ROAM_RETURN_STORAGE_KEY
} from "@/lib/roam/roam-session";
import type { RoamCard as RoamCardData, RoamCardTag } from "@/lib/roam/roam-types";
import type { ColdHookPayload, ColdTopicType } from "@/lib/types";
import { readLibrary, recordLibraryHistory, writeLibrary } from "@/lib/user-library-client";
import { trackProductEvent } from "@/lib/client-product-events";

type RoamPrefs = {
  likedTags: RoamCardTag[];
  skippedTags: RoamCardTag[];
  recentTopicKeys: string[];
  likedSeeds: string[];
};

const STORAGE_KEY = "animelore.roam.prefs.v1";
const DECK_STATE_VERSION = 3;

const emptyPrefs: RoamPrefs = {
  likedTags: [],
  skippedTags: [],
  recentTopicKeys: [],
  likedSeeds: []
};

function uniqLimit<T>(items: T[], limit: number): T[] {
  return [...new Set(items)].slice(-limit);
}

function loadPrefs(): RoamPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPrefs;
    const parsed = JSON.parse(raw) as Partial<RoamPrefs>;
    return {
      likedTags: (parsed.likedTags ?? []) as RoamCardTag[],
      skippedTags: (parsed.skippedTags ?? []) as RoamCardTag[],
      recentTopicKeys: parsed.recentTopicKeys ?? [],
      likedSeeds: parsed.likedSeeds ?? []
    };
  } catch {
    return emptyPrefs;
  }
}

function savePrefs(prefs: RoamPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const library = readLibrary();
    writeLibrary({
      ...library,
      preferences: {
        ...library.preferences,
        likedTags: prefs.likedTags,
        skippedTags: prefs.skippedTags,
        likedSeeds: prefs.likedSeeds
      }
    });
  } catch {
    /* ignore private mode / quota */
  }
}

type RoamDeckState = {
  version: number;
  cards: RoamCardData[];
  index: number;
  savedAt: string;
};

function loadDeckState(initialCards: RoamCardData[]): RoamDeckState {
  if (typeof window === "undefined") {
    return { version: DECK_STATE_VERSION, cards: initialCards, index: 0, savedAt: new Date().toISOString() };
  }
  try {
    const raw = sessionStorage.getItem(ROAM_DECK_STORAGE_KEY);
    if (!raw) {
      return { version: DECK_STATE_VERSION, cards: initialCards, index: 0, savedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw) as Partial<RoamDeckState>;
    if (parsed.version !== DECK_STATE_VERSION) {
      return { version: DECK_STATE_VERSION, cards: initialCards, index: 0, savedAt: new Date().toISOString() };
    }
    const cards = Array.isArray(parsed.cards) && parsed.cards.length ? parsed.cards : initialCards;
    const index = Number.isFinite(parsed.index)
      ? Math.max(0, Math.min(Number(parsed.index), Math.max(0, cards.length - 1)))
      : 0;
    return {
      cards,
      index,
      version: DECK_STATE_VERSION,
      savedAt: parsed.savedAt || new Date().toISOString()
    };
  } catch {
    return { version: DECK_STATE_VERSION, cards: initialCards, index: 0, savedAt: new Date().toISOString() };
  }
}

function saveDeckState(cards: RoamCardData[], index: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      ROAM_DECK_STORAGE_KEY,
      JSON.stringify({
        version: DECK_STATE_VERSION,
        cards,
        index,
        savedAt: new Date().toISOString()
      } satisfies RoamDeckState)
    );
  } catch {
    /* ignore private mode / quota */
  }
}

function queryFromPrefs(prefs: RoamPrefs): string {
  const params = new URLSearchParams({ count: "8" });
  if (prefs.likedTags.length) params.set("likedTags", prefs.likedTags.join(","));
  if (prefs.skippedTags.length) params.set("skippedTags", prefs.skippedTags.join(","));
  if (prefs.recentTopicKeys.length) {
    params.set("recentTopicKeys", prefs.recentTopicKeys.slice(-10).join(","));
  }
  if (prefs.likedSeeds.length) params.set("seed", prefs.likedSeeds[prefs.likedSeeds.length - 1]);
  return `/api/roam?${params.toString()}`;
}

function topicTypeFromCard(card: RoamCardData): ColdTopicType {
  if (card.type === "work_fact" || card.type === "character_fact") return "work";
  if (card.type === "community_take" || card.type === "production_note") return "phenomenon";
  return "concept";
}

function coldPayloadFromRoamCard(card: RoamCardData): ColdHookPayload {
  return (
    card.cold_payload ?? {
      topic_type: topicTypeFromCard(card),
      cold_subtype: card.type,
      topic_key: card.topic_key,
      hook: card.hook,
      blurb: card.blurb,
      insight: card.blurb,
      source_urls: card.source_urls,
      confidence: card.confidence,
      verification_status: card.verification_status,
      recommendations: []
    }
  );
}

export function RoamCardDeck({ initialCards }: { initialCards: RoamCardData[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [cards, setCards] = useState<RoamCardData[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [deckHydrated, setDeckHydrated] = useState(false);
  const [direction, setDirection] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<RoamPrefs>(emptyPrefs);
  const activeCard = cards[index];
  const remaining = Math.max(0, cards.length - index - 1);

  const progressText = useMemo(() => {
    if (!activeCard) return "暂无卡片";
    return `${index + 1} / ${cards.length}`;
  }, [activeCard, cards.length, index]);

  const updatePrefs = useCallback((updater: (prefs: RoamPrefs) => RoamPrefs) => {
    const next = updater(loadPrefs());
    savePrefs(next);
    setPrefs(next);
    return next;
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const prefs = loadPrefs();
      const res = await fetch(queryFromPrefs(prefs));
      const data = (await res.json()) as { cards?: RoamCardData[] };
      if (!res.ok || !data.cards?.length) throw new Error(`roam_http_${res.status}`);
      setCards((prev) => {
        const seen = new Set(prev.map((card) => card.topic_key));
        const fresh = data.cards!.filter((card) => !seen.has(card.topic_key));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    } catch (e) {
      setError((e as Error).message || "加载失败");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  useEffect(() => {
    const restored = loadDeckState(initialCards);
    setCards(restored.cards);
    setIndex(restored.index);
    setPrefs(loadPrefs());
    setDeckHydrated(true);
  }, [initialCards]);

  useEffect(() => {
    if (remaining <= 2) void fetchMore();
  }, [fetchMore, remaining]);

  useEffect(() => {
    if (!deckHydrated) return;
    saveDeckState(cards, index);
  }, [cards, deckHydrated, index]);

  const goNext = useCallback(() => {
    if (!activeCard) return;
    setDirection(1);
    updatePrefs((prefs) => ({
      ...prefs,
      skippedTags: uniqLimit([...prefs.skippedTags, activeCard.tag], 8),
      recentTopicKeys: uniqLimit([...prefs.recentTopicKeys, activeCard.topic_key], 10)
    }));
    trackProductEvent("roam_skipped");
    setIndex((current) => Math.min(current + 1, cards.length - 1));
  }, [activeCard, cards.length, updatePrefs]);

  const goDeep = useCallback(() => {
    if (!activeCard) return;
    updatePrefs((prefs) => ({
      ...prefs,
      likedTags: uniqLimit([...prefs.likedTags, activeCard.tag], 8),
      likedSeeds: uniqLimit([...prefs.likedSeeds, ...activeCard.next_seeds], 12),
      recentTopicKeys: uniqLimit([...prefs.recentTopicKeys, activeCard.topic_key], 10)
    }));
    trackProductEvent("roam_opened");
    startTransition(() => {
      recordLibraryHistory({
        id: `${activeCard.target.kind}:${activeCard.topic_key}`,
        kind: activeCard.target.kind === "work" ? "work" : "cold",
        title: activeCard.target.title || activeCard.hook,
        subtitle: activeCard.hook,
        href: activeCard.target.href
      });
      if (activeCard.target.kind === "cold") {
        try {
          sessionStorage.setItem(ROAM_RETURN_STORAGE_KEY, "/roam");
          sessionStorage.setItem(
            COLD_SESSION_STORAGE_KEY,
            JSON.stringify(buildColdSessionEnvelope(coldPayloadFromRoamCard(activeCard)))
          );
        } catch {
          /* ignore private mode / quota */
        }
      }
      router.push(activeCard.target.href);
    });
  }, [activeCard, router, updatePrefs]);

  const preferenceReason = useMemo(() => {
    if (!activeCard) return undefined;
    if (prefs.likedTags.includes(activeCard.tag)) return `你此前对「${activeCard.tag}」线索停留得更久`;
    if (prefs.skippedTags.includes(activeCard.tag)) return `换一个角度：这张会用不同入口聊「${activeCard.tag}」`;
    if (prefs.likedSeeds.some((seed) => activeCard.next_seeds.includes(seed))) return "它接在你之前点开的线索之后";
    return "芽衣先为你保留了一条可继续追下去的线索";
  }, [activeCard, prefs]);

  if (!activeCard) {
    return (
      <section className="mt-10 rounded-3xl border border-line bg-surface p-6 text-center">
        <p className="text-body">暂时没有可漫游的卡片，稍后再来刷一条。</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>知识漫游</span>
        <span>{progressText}</span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-surface/65 px-4 py-2.5 text-xs font-medium shadow-sm" aria-hidden="true">
        <motion.span className="text-muted" animate={{ x: [0, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.4 }}>← 左滑略过</motion.span>
        <span className="h-px flex-1 bg-line/70" />
        <motion.span className="text-brand" animate={{ x: [0, 4, 0] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.4 }}>右滑深入 →</motion.span>
      </div>
      <div className="relative min-h-[360px] sm:min-h-[430px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeCard.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80, rotate: direction > 0 ? 2 : -2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -120 : 120, rotate: direction > 0 ? -4 : 4 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90 || info.velocity.x < -500) goNext();
              if (info.offset.x > 90 || info.velocity.x > 500) goDeep();
            }}
            className="relative cursor-grab active:cursor-grabbing"
          >
            <RoamCard card={activeCard} preferenceReason={preferenceReason} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-[calc(5rem+var(--safe-bottom))] z-10 mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-canvas/90 p-2 backdrop-blur-lg md:static md:mt-6 md:bg-transparent md:p-0">
        <button
          type="button"
          onClick={goNext}
          className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40 hover:bg-soft"
        >
          略过这条
        </button>
        <button
          type="button"
          onClick={goDeep}
          className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          沿线深入
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>左滑下一条，右滑深入了解</span>
        {loadingMore ? (
          <span className="inline-flex items-center gap-1.5">
            <Image src="/brand/mei-avatar-v1.png" alt="" width={20} height={20} className="size-5 animate-pulse rounded-full object-cover" />
            芽衣正在补充卡片…
          </span>
        ) : <span>余 {remaining} 条</span>}
      </div>
      {error ? <p className="mt-3 text-center text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
