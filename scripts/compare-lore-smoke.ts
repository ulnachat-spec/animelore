/**
 * 一次性对比 legacy vs adaptive（字数、禁用占位句命中、adaptive 证据包是否含萌百、adaptive prompt 长度）。
 * 用法：在项目根目录执行两次或一次脚本内切换（会多次调用 DeepSeek，耗时与费用较高）。
 *
 *   npx --yes tsx scripts/compare-lore-smoke.ts
 */
import { buildCommunitySearchHint } from "@/lib/data-sources";
import { buildLorePromptFromAdaptive } from "@/lib/prompt";
import { getWorkLore } from "@/lib/work-service";
import type { LorePayload } from "@/lib/types";

const queries = ["魔法少女小圆", "进击的巨人", "孤独摇滚"];
const bad = /公开资料未提及|公开资料未显示/;

function cardTextLen(lore: LorePayload): number {
  return lore.cards.reduce(
    (n, c) =>
      n +
      c.headline.length +
      c.intro.length +
      c.points.join("").length +
      c.source.length +
      c.zh_name.length,
    0
  );
}

function hasBadPhrase(lore: LorePayload): boolean {
  return bad.test(JSON.stringify(lore));
}

function hasZiLiaoBuZu(lore: LorePayload): boolean {
  return /资料不足/.test(JSON.stringify(lore));
}

async function runMode(adaptive: boolean): Promise<string[]> {
  process.env.ADAPTIVE_RAG_WORK = adaptive ? "true" : "false";
  const out: string[] = [];
  for (const q of queries) {
    const outcome = await getWorkLore(q);
    if (!outcome.ok) {
      out.push(
        `${q}\t${adaptive ? "adaptive" : "legacy"}\tERROR\t${outcome.failure.code}\t${outcome.failure.message}`
      );
      continue;
    }
    const r = outcome.data;
    const chars = cardTextLen(r.lore);
    const badPhrase = hasBadPhrase(r.lore);
    const ziLiao = hasZiLiaoBuZu(r.lore);
    const moeInPack =
      r.rag?.evidence_pack?.items?.some((e) => e.source === "moegirl") ?? false;
    let promptChars = "n/a";
    if (r.rag?.evidence_pack?.items?.length) {
      promptChars = String(
        buildLorePromptFromAdaptive(
          r.meta,
          r.rag.evidence_pack.items,
          buildCommunitySearchHint(r.meta.title)
        ).length
      );
    }
    const pipeline = r.pipeline;
    out.push(
      [
        q,
        adaptive ? "adaptive" : "legacy",
        `pipeline=${pipeline}`,
        `cardChars=${chars}`,
        `badPlaceholder=${badPhrase}`,
        `ziLiaoBuZu=${ziLiao}`,
        `moeInEvidencePack=${moeInPack}`,
        `adaptivePromptChars=${promptChars}`
      ].join("\t")
    );
  }
  return out;
}

async function main() {
  console.log("compare-lore-smoke | ADAPTIVE_RAG_WORK toggled per block\n");
  console.log("--- legacy (ADAPTIVE_RAG_WORK=false) ---");
  for (const line of await runMode(false)) console.log(line);
  console.log("\n--- adaptive (ADAPTIVE_RAG_WORK=true) ---");
  for (const line of await runMode(true)) console.log(line);
  console.log(
    "\n说明：legacy 不返回 evidence_pack；「萌百进 prompt」对 legacy 为 buildLorePrompt 内嵌（本脚本仅标 adaptive 的 moeInEvidencePack）。"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
