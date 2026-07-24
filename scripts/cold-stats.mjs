import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storePath = path.join(root, "data", "cold-hooks.json");
const versionPath = path.join(root, "lib", "cold-prompt-version.ts");

function readPromptVersion() {
  const raw = fs.readFileSync(versionPath, "utf8");
  const match = raw.match(/COLD_PROMPT_VERSION\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Cannot read COLD_PROMPT_VERSION");
  return match[1];
}

function cjkLen(s = "") {
  return s.replace(/[^\u4e00-\u9fff]/g, "").length;
}

const promptVersion = readPromptVersion();
const records = fs.existsSync(storePath)
  ? JSON.parse(fs.readFileSync(storePath, "utf8") || "[]")
  : [];
const current = records.filter((r) => r.prompt_version === promptVersion);
const subtypeStats = {};
for (const r of current) {
  const key = r.cold_subtype || "missing";
  subtypeStats[key] = (subtypeStats[key] || 0) + 1;
}

const stats = {
  promptVersion,
  total: records.length,
  currentVersionCount: current.length,
  oldVersionCount: records.length - current.length,
  subtypeStats,
  quizCount: current.filter((r) => Boolean(r.quiz)).length,
  noRecommendationsCount: current.filter((r) => !Array.isArray(r.recommendations) || r.recommendations.length === 0).length,
  missingBlurbCount: current.filter((r) => !r.blurb?.trim()).length,
  shortInsightCount: current.filter((r) => cjkLen(r.insight) < 80).length,
  longInsightCount: current.filter((r) => cjkLen(r.insight) > 420).length,
  recommendationCounts: current.map((r) => r.recommendations?.length ?? 0)
};

console.log(JSON.stringify(stats, null, 2));
