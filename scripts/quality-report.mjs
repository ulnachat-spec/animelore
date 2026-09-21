import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "data", "cold-hooks.json"), "utf8"));
const cjkLength = (value = "") => value.replace(/[^\u4e00-\u9fff]/g, "").length;
const current = records.filter((record) => record.prompt_version === "2025-05-v6-roam-blurb-quiz");
const checks = {
  total: current.length,
  usable: current.filter((record) => record.source_urls?.length && record.recommendations?.length && cjkLength(record.insight) >= 80).length,
  missingSources: current.filter((record) => !record.source_urls?.length).map((record) => record.id),
  missingRecommendations: current.filter((record) => !record.recommendations?.length).map((record) => record.id),
  invalidInsightLength: current.filter((record) => cjkLength(record.insight) < 80 || cjkLength(record.insight) > 420).map((record) => record.id),
  unverified: current.filter((record) => !["verified", "skipped"].includes(record.verification_status)).map((record) => record.id)
};

console.log(JSON.stringify(checks, null, 2));
if (checks.missingSources.length || checks.missingRecommendations.length || checks.invalidInsightLength.length) {
  process.exitCode = 1;
}
