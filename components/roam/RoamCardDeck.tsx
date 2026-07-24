"use client";

import { AnimatePresence, motion } from "framer-motion";
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

type RoamPrefs = {
  likedTags: RoamCardTag[];
  skippedTags: RoamCardTag[];
  recentTopicKeys: string[];
  likedSeeds: string[];
};

const STORAGE_KEY = "animelore.roam.prefs.v1";
const DECK_STATE_VERSION = 2;

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
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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
  const [cards, setCards] = useState<RoamCardData[]>(() => loadDeckState(initialCards).cards);
  const [index, setIndex] = useState(() => loadDeckState(initialCards).index);
  const [direction, setDirection] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCard = cards[index];
  const remaining = Math.max(0, cards.length - index - 1);

  const progressText = useMemo(() => {
    if (!activeCard) return "暂无卡片";
    return `${index + 1} / ${cards.length}`;
  }, [activeCard, cards.length, index]);

  const updatePrefs = useCallback((updater: (prefs: RoamPrefs) => RoamPrefs) => {
    const next = updater(loadPrefs());
    savePrefs(next);
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
    if (remaining <= 2) void fetchMore();
  }, [fetchMore, remaining]);

  useEffect(() => {
    saveDeckState(cards, index);
  }, [cards, index]);

  const goNext = useCallback(() => {
    if (!activeCard) return;
    setDirection(1);
    updatePrefs((prefs) => ({
      ...prefs,
      skippedTags: uniqLimit([...prefs.skippedTags, activeCard.tag], 8),
      recentTopicKeys: uniqLimit([...prefs.recentTopicKeys, activeCard.topic_key], 10)
    }));
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
    startTransition(() => {
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

      <div className="relative min-h-[430px]">
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
            <RoamCard card={activeCard} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={goNext}
          className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40 hover:bg-soft"
        >
          下一条
        </button>
        <button
          type="button"
          onClick={goDeep}
          className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          深入了解
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>左滑下一条，右滑深入了解</span>
        <span>{loadingMore ? "补充卡片中..." : `余 ${remaining} 条`}</span>
      </div>
      {error ? <p className="mt-3 text-center text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
