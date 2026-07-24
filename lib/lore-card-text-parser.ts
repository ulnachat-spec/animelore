import { LORE_CARD_META } from "@/lib/lore-card-meta";
import type { LoreCard, LoreCardId } from "@/lib/types";

export type CardStreamEmit =
  | { type: "card_delta"; field: "headline" | "intro"; delta: string }
  | { type: "card_point_delta"; point_index: number; delta: string };

type SegmentKey = "headline" | "intro" | `point:${number}`;

const FIELD_MARKERS: Array<{
  key: "headline" | "intro" | "point";
  label: RegExp;
  pointIndex?: number;
}> = [
  { key: "headline", label: /^HEADLINE:\s*/im },
  { key: "intro", label: /^INTRO:\s*/im },
  { key: "point", label: /^POINT\s*1:\s*/im, pointIndex: 0 },
  { key: "point", label: /^POINT\s*2:\s*/im, pointIndex: 1 },
  { key: "point", label: /^POINT\s*3:\s*/im, pointIndex: 2 }
];

const STOP_MARKERS = [
  /^INTRO:\s*/im,
  /^POINT\s*1:\s*/im,
  /^POINT\s*2:\s*/im,
  /^POINT\s*3:\s*/im,
  /^SOURCE:\s*/im,
  /^SOURCE_URLS:\s*/im
];

function findNextMarkerIndex(text: string, from: number): number | null {
  let best: number | null = null;
  for (const re of STOP_MARKERS) {
    const slice = text.slice(from);
    const match = slice.match(re);
    if (match && match.index != null) {
      const idx = from + match.index;
      if (best == null || idx < best) best = idx;
    }
  }
  return best;
}

function activeSegment(
  text: string
): { field: "headline" | "intro" | "point"; pointIndex?: number; contentStart: number; contentEnd: number } | null {
  let last: {
    field: "headline" | "intro" | "point";
    pointIndex?: number;
    markerEnd: number;
  } | null = null;

  for (const m of FIELD_MARKERS) {
    const re = new RegExp(m.label.source, m.label.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (m.key === "headline" || m.key === "intro") {
        last = { field: m.key, markerEnd: match.index + match[0].length };
      } else if (m.key === "point" && m.pointIndex != null) {
        last = { field: "point", pointIndex: m.pointIndex, markerEnd: match.index + match[0].length };
      }
    }
  }

  if (!last) return null;
  const contentEnd = findNextMarkerIndex(text, last.markerEnd) ?? text.length;
  return {
    field: last.field,
    pointIndex: last.pointIndex,
    contentStart: last.markerEnd,
    contentEnd
  };
}

function segmentKey(seg: NonNullable<ReturnType<typeof activeSegment>>): SegmentKey {
  if (seg.field === "headline") return "headline";
  if (seg.field === "intro") return "intro";
  return `point:${seg.pointIndex ?? 0}`;
}

type EmitFn = (ev: CardStreamEmit) => void | Promise<void>;

export class LoreCardStreamParser {
  private buffer = "";
  private sentContentLen = 0;
  private lastSegmentKey: SegmentKey | null = null;
  emitCount = 0;

  constructor(private readonly cardId: LoreCardId) {}

  /** 按字符增量解析，进入 segment 后立即 emit 新内容 */
  async appendToken(token: string, emit: EmitFn): Promise<void> {
    for (const ch of token) {
      this.buffer += ch;
      await this.flushEmit(emit);
    }
  }

  private async flushEmit(emit: EmitFn): Promise<void> {
    const seg = activeSegment(this.buffer);
    if (!seg) return;

    const key = segmentKey(seg);
    if (this.lastSegmentKey !== key) {
      this.sentContentLen = 0;
      this.lastSegmentKey = key;
    }

    const content = this.buffer.slice(seg.contentStart, seg.contentEnd);
    const visible = content.replace(/^\s+/, "");
    const toSend = visible.slice(this.sentContentLen);
    if (!toSend) return;

    this.sentContentLen = visible.length;
    this.emitCount += 1;

    if (seg.field === "headline" || seg.field === "intro") {
      await emit({ type: "card_delta", field: seg.field, delta: toSend });
      return;
    }

    if (seg.field === "point" && seg.pointIndex != null) {
      await emit({
        type: "card_point_delta",
        point_index: seg.pointIndex,
        delta: toSend
      });
    }
  }

  getBuffer(): string {
    return this.buffer;
  }

  parseFinal(): LoreCard | null {
    const fullText = this.buffer;
    const pick = (label: RegExp, until: RegExp[]): string => {
      const m = fullText.match(label);
      if (!m || m.index == null) return "";
      const start = m.index + m[0].length;
      let end = fullText.length;
      for (const u of until) {
        const um = fullText.slice(start).match(u);
        if (um && um.index != null) {
          end = Math.min(end, start + um.index);
        }
      }
      return fullText.slice(start, end).trim();
    };

    const headline = pick(/^HEADLINE:\s*/im, [/^INTRO:\s*/im]);
    const intro = pick(/^INTRO:\s*/im, [/^POINT\s*1:\s*/im]);
    const p1 = pick(/^POINT\s*1:\s*/im, [/^POINT\s*2:\s*/im]);
    const p2 = pick(/^POINT\s*2:\s*/im, [/^POINT\s*3:\s*/im]);
    const p3 = pick(/^POINT\s*3:\s*/im, [/^SOURCE:\s*/im]);
    const source = pick(/^SOURCE:\s*/im, [/^SOURCE_URLS:\s*/im]);
    const urlsBlock = pick(/^SOURCE_URLS:\s*/im, []);

    const points = [p1, p2, p3].filter((p) => p.length > 0 && p !== "（略）");
    const source_urls = urlsBlock
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

    if (!headline && !intro && points.length === 0) return null;

    const meta = LORE_CARD_META[this.cardId];
    return {
      id: this.cardId,
      en_label: meta.en_label,
      zh_name: meta.zh_name,
      headline: headline || "—",
      intro: intro || "—",
      points: points.length > 0 ? points : ["—"],
      source: source || "AnimeLore",
      source_urls
    };
  }
}
