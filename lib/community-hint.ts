import type { Evidence } from "@/lib/rag/types";
import type { WorkMeta } from "@/lib/types";

export interface StableCommunityHintInput {
  meta: WorkMeta;
  evidence: Evidence[];
  userQuery?: string;
}

/**
 * 社区/MEME 语境提示：优先稳定来源（萌娘 / Bangumi / Wikipedia），
 * 不依赖 B站/NGA 必须抓取成功。
 */
export function buildStableCommunityHint(input: StableCommunityHintInput): string {
  const { meta, evidence } = input;
  const moegirl = evidence.filter((e) => e.source === "moegirl");
  const bangumi = evidence.find((e) => e.source === "bangumi");
  const hasUnstableCommunity = evidence.some(
    (e) => e.source === "bilibili" || e.source === "nga" || e.source === "aweidao"
  );

  const nameCn =
    typeof bangumi?.structured?.name_cn === "string"
      ? bangumi.structured.name_cn
      : bangumi?.title;

  const seed =
    input.userQuery?.trim() ||
    nameCn?.trim() ||
    meta.nativeTitle?.trim() ||
    meta.title?.trim() ||
    "作品";

  const lines: string[] = [`${seed} site:zh.moegirl.org.cn 梗 幕后 评价`];

  const stable: string[] = [];
  if (moegirl.length) {
    stable.push(`萌娘百科（${moegirl.map((m) => m.title).join("、")}）`);
  }
  if (bangumi) {
    stable.push(`Bangumi（${bangumi.title}）`);
  }
  if (evidence.some((e) => e.source === "wikipedia")) {
    stable.push("Wikipedia 叙述");
  }
  if (stable.length) {
    lines.push(`优先参考的稳定语境来源：${stable.join("；")}。`);
  }

  if (!hasUnstableCommunity) {
    lines.push(
      "B站专栏/NGA/阿苇岛未接入或抓取失败时：梗与社区说法请主要依据萌娘、Bangumi、Wikipedia，使用「中文社区常见说法」「讨论里常提到」等表述；勿捏造专栏/论坛出处，勿因缺少 B站/NGA 而对 MEME 卡写「资料不足」。"
    );
  }

  return lines.join("\n");
}
