import type { LorePayload } from "@/lib/types";
import type { WorkMeta } from "@/lib/types";

/**
 * 证据不足时的诚实占位：不编造具体剧情或口碑，仅提示用户换关键词。
 */
export function insufficientEvidenceLore(meta: WorkMeta, reason: string): LorePayload {
  const title = meta.title || "这部作品";
  const note = `当前可检索到的公开资料不足以支撑可靠的四卡解读。原因：${reason}`;
  const cardBody = {
    headline: "公开资料不足",
    intro: note,
    points: [
      "请尝试使用日文原名、官方英文标题或在 AniList 上可搜到的罗马音译名。",
      "若作品过于冷门，维基与萌娘条目可能缺失，属于正常现象。"
    ],
    source: "AnimeLore RAG · 无足够证据",
    source_urls: []
  };

  return {
    work_title: title,
    cards: [
      {
        id: "legacy",
        en_label: "LEGACY",
        zh_name: "封神还是翻车",
        ...cardBody
      },
      {
        id: "meme",
        en_label: "MEME",
        zh_name: "梗从哪来",
        ...cardBody
      },
      {
        id: "behind",
        en_label: "BEHIND",
        zh_name: "幕后现场",
        ...cardBody
      },
      {
        id: "lineage",
        en_label: "LINEAGE",
        zh_name: "家族树",
        ...cardBody
      }
    ],
    bottom_hook: {
      work: title,
      hook: "换个检索词再试一次，更容易命中结构化资料。"
    }
  };
}
