import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "data", "cold-hooks.json"), "utf8"));
const rubric = JSON.parse(fs.readFileSync(path.join(root, "benchmark", "cold-quality-rubric-v1.json"), "utf8"));
const outputPath = path.join(root, "benchmark", "cold-quality-results-v1.json");

const subjectiveQuizPattern = /最(可怕|感人|重要|厉害|好看|适合)|观众觉得|常被认为|感觉|核心在于|真正|出圈|很适合/;
const internalCopyPattern = /\b(prompt|hook|insight|fallback)\b|自动截取|后台内部|后面还藏着|挺好玩的细节|资料待补充/i;
const contrastPattern = /[？?：]|竟|原来|其实|不是|为什么|真的|本身|不只是|不等于|最|会|藏|只|没有|反而|却/;
const openQuizHookPattern = /[？?]|为什么|究竟|到底|真的|哪[位座家支次个部]|是否/;

function cjkLength(value = "") {
  return (value.match(/[\u3400-\u9fff]/g) || []).length;
}

function normalize(value = "") {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(value) {
  const clean = normalize(value);
  const set = new Set();
  for (let i = 0; i < clean.length - 1; i += 1) set.add(clean.slice(i, i + 2));
  return set;
}

function similarity(left, right) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

function auditRecord(record) {
  const failures = [];
  if (!record.hook?.trim()) failures.push("missing_hook");
  if (cjkLength(record.blurb) < 18) failures.push("blurb_too_short");
  if (cjkLength(record.insight) < 80 || cjkLength(record.insight) > 420) failures.push("insight_length");
  if (!Array.isArray(record.source_urls) || !record.source_urls.some((url) => /^https:\/\//.test(url))) failures.push("missing_https_source");
  if (!Array.isArray(record.recommendations) || record.recommendations.length === 0) failures.push("missing_recommendation");
  if ((record.confidence ?? 0) < 0.55) failures.push("low_confidence");
  if (!['verified', 'skipped'].includes(record.verification_status)) failures.push("untrusted_status");
  if (internalCopyPattern.test(`${record.hook} ${record.blurb} ${record.insight}`)) failures.push("internal_or_placeholder_copy");

  const recommendationIds = new Set();
  for (const recommendation of record.recommendations || []) {
    const identity = recommendation.anilistId || recommendation.anime_title || recommendation.candidate_id;
    if (!identity) failures.push("recommendation_without_identity");
    if (recommendationIds.has(identity)) failures.push("duplicate_recommendation");
    recommendationIds.add(identity);
    if (cjkLength(recommendation.reason) < 8) failures.push("recommendation_reason_too_thin");
  }

  if (record.quiz) {
    if (subjectiveQuizPattern.test(record.quiz.statement)) failures.push("subjective_quiz");
    if (typeof record.quiz.answer !== "boolean") failures.push("quiz_without_boolean_answer");
    if (cjkLength(record.quiz.explanation) < 8) failures.push("quiz_explanation_too_short");
    if (!openQuizHookPattern.test(record.hook || "")) failures.push("quiz_hook_reveals_or_closes_answer");
    if (normalize(record.hook).includes(normalize(record.quiz.statement))) failures.push("quiz_hook_copies_answer_statement");
  }

  return { id: record.id, topic_key: record.topic_key, failures: [...new Set(failures)] };
}

const rows = records.map(auditRecord);
const duplicatePairs = [];
for (let left = 0; left < records.length; left += 1) {
  for (let right = left + 1; right < records.length; right += 1) {
    const score = Math.max(
      similarity(records[left].hook, records[right].hook),
      similarity(records[left].blurb, records[right].blurb)
    );
    if (score >= 0.72) duplicatePairs.push({ left: records[left].id, right: records[right].id, score: Number(score.toFixed(3)) });
  }
}

const topicKeys = records.map((record) => normalize(record.topic_key));
const duplicateTopicKeys = [...new Set(topicKeys.filter((key, index) => topicKeys.indexOf(key) !== index))];
const passedRecords = rows.filter((row) => row.failures.length === 0).length;
const quizCount = records.filter((record) => record.quiz).length;
const contrastHookCount = records.filter((record) => contrastPattern.test(record.hook || "")).length;
const contrastHookRate = records.length ? contrastHookCount / records.length : 0;
const passRate = records.length ? passedRecords / records.length : 0;
const gates = {
  minimum_records: records.length >= rubric.thresholds.minimum_records,
  minimum_pass_rate: passRate >= rubric.thresholds.minimum_pass_rate,
  minimum_contrast_hook_rate: contrastHookRate >= rubric.thresholds.minimum_contrast_hook_rate,
  duplicate_topics: duplicateTopicKeys.length === 0,
  maximum_near_duplicates: duplicatePairs.length <= rubric.thresholds.maximum_near_duplicate_pairs,
  minimum_quiz_count: quizCount >= rubric.thresholds.minimum_quiz_count
};
const result = {
  benchmark: rubric.name,
  run_at: new Date().toISOString(),
  summary: {
    total_records: records.length,
    passed_records: passedRecords,
    failed_records: records.length - passedRecords,
    pass_rate: Number(passRate.toFixed(4)),
    quiz_count: quizCount,
    contrast_hook_count: contrastHookCount,
    contrast_hook_rate: Number(contrastHookRate.toFixed(4)),
    near_duplicate_pairs: duplicatePairs.length,
    duplicate_topic_keys: duplicateTopicKeys.length,
    gates,
    passed: Object.values(gates).every(Boolean)
  },
  failures: rows.filter((row) => row.failures.length),
  duplicate_pairs: duplicatePairs,
  duplicate_topic_keys: duplicateTopicKeys
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify(result.summary, null, 2));
console.log(`Report: ${outputPath}`);
if (!result.summary.passed) process.exitCode = 1;
