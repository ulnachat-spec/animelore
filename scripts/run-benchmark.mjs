/**
 * Run AnimeLore RAG benchmark against local dev server.
 * Usage:
 *   node scripts/run-benchmark.mjs [--base=http://localhost:3000] [--limit=5] [--work=eva] [--skip-judge]
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const ROOT = path.resolve(import.meta.dirname, "..");
const BENCHMARK_PATH = path.join(ROOT, "benchmark", "anime-rag-benchmark-v1.json");
const DEFAULT_OUT = path.join(ROOT, "benchmark", "anime-rag-benchmark-v1-results.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    base: "http://localhost:3000",
    limit: null,
    work: null,
    skipJudge: false,
    out: DEFAULT_OUT,
  };
  for (const arg of args) {
    if (arg.startsWith("--base=")) opts.base = arg.slice(7).replace(/\/$/, "");
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.slice(8));
    else if (arg.startsWith("--work=")) opts.work = arg.slice(7);
    else if (arg === "--skip-judge") opts.skipJudge = true;
    else if (arg.startsWith("--out=")) opts.out = path.resolve(arg.slice(6));
  }
  return opts;
}

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    for (const line of fs.readFileSync(fp, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

function getJudgeClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing in .env");
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: 120_000,
    maxRetries: 1,
  });
}

async function waitForServer(base, maxWaitMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${base}/api/hook?refresh=0`, { signal: AbortSignal.timeout(8000) });
      if (res.ok || res.status === 500) return;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  throw new Error(`Server not ready at ${base}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWorkLore(base, query) {
  const url = `${base}/api/work?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`work failed for "${query}": ${data.code} ${data.message}`);
  }
  return data;
}

async function askChat(base, workTitle, workMeta, cards, question) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-animelore-benchmark": "quality-harness"
    },
    body: JSON.stringify({
      workTitle,
      workMeta,
      cards,
      messages: [{ role: "user", content: question }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`chat failed: ${data.error || res.status} ${data.detail || ""}`);
  }
  return data.message?.content ?? data.message ?? String(data.message);
}

async function judgeAnswer(client, q, systemAnswer) {
  const acceptable =
    Array.isArray(q.acceptable_answers) && q.acceptable_answers.length
      ? `\n可接受答案范围：${q.acceptable_answers.join("；")}`
      : "";
  const conflict =
    q.conflict_note ? `\n冲突背景：${q.conflict_note}` : "";

  const prompt = `你是动漫问答评测员。根据标准答案判断系统回答是否准确、是否有幻觉。

题型：${q.type}
问题：${q.question}
标准答案：${q.gold_answer}${acceptable}${conflict}

系统回答：
${systemAnswer}

规则：
- is_accurate=Y：核心事实与标准答案一致，或 conflict 题正确呈现分歧/hedging 而非武断单一立场
- is_accurate=N：关键事实错误、答非所问、遗漏核心点
- has_hallucination=Y：编造不存在的 staff/年份/集数/情节/奖项，或将争议观点当作唯一客观事实
- has_hallucination=N：无上述捏造（允许不完整或保守表述）

只输出 JSON：{"is_accurate":"Y"|"N","has_hallucination":"Y"|"N","reason":"一句话"}`;

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "Output strict JSON only." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return {
    is_accurate: parsed.is_accurate === "Y" ? "Y" : "N",
    has_hallucination: parsed.has_hallucination === "Y" ? "Y" : "N",
    judge_reason: parsed.reason || "",
  };
}

function computeScoring(works, results) {
  const evaluated = results.filter((r) => r.is_accurate != null);
  const accurate = evaluated.filter((r) => r.is_accurate === "Y").length;
  const hallucination = evaluated.filter((r) => r.has_hallucination === "Y").length;
  const total = results.length;

  const byType = {};
  for (const type of ["hard_fact", "community_meme", "conflict"]) {
    const subset = evaluated.filter((r) => r.type === type);
    const acc = subset.filter((r) => r.is_accurate === "Y").length;
    const hal = subset.filter((r) => r.has_hallucination === "Y").length;
    byType[type] = {
      total: results.filter((r) => r.type === type).length,
      evaluated: subset.length,
      accurate_count: subset.length ? acc : null,
      accuracy_rate: subset.length ? Number((acc / subset.length).toFixed(4)) : null,
      hallucination_count: subset.length ? hal : null,
      hallucination_rate: subset.length ? Number((hal / subset.length).toFixed(4)) : null,
    };
  }

  const byWork = works.map((w) => {
    const subset = evaluated.filter((r) => r.work_id === w.id);
    const acc = subset.filter((r) => r.is_accurate === "Y").length;
    const hal = subset.filter((r) => r.has_hallucination === "Y").length;
    return {
      work_id: w.id,
      title_zh: w.title_zh,
      total: w.questions.length,
      evaluated: subset.length,
      accurate_count: subset.length ? acc : null,
      accuracy_rate: subset.length ? Number((acc / subset.length).toFixed(4)) : null,
      hallucination_count: subset.length ? hal : null,
      hallucination_rate: subset.length ? Number((hal / subset.length).toFixed(4)) : null,
    };
  });

  return {
    summary: {
      total_questions: total,
      evaluated: evaluated.length,
      accurate_count: evaluated.length ? accurate : null,
      inaccurate_count: evaluated.length ? evaluated.length - accurate : null,
      accuracy_rate: evaluated.length ? Number((accurate / evaluated.length).toFixed(4)) : null,
      hallucination_count: evaluated.length ? hallucination : null,
      no_hallucination_count: evaluated.length ? evaluated.length - hallucination : null,
      hallucination_rate: evaluated.length ? Number((hallucination / evaluated.length).toFixed(4)) : null,
      run_at: new Date().toISOString(),
      notes: "accuracy_rate = accurate_count / evaluated; hallucination_rate = hallucination_count / evaluated",
    },
    by_question_type: byType,
    by_work: byWork,
    results,
  };
}

function syncBenchmarkQuestions(benchmark, resultsMap) {
  for (const work of benchmark.works) {
    for (const q of work.questions) {
      const r = resultsMap.get(q.id);
      if (!r) continue;
      q.system_answer = r.system_answer;
      q.is_accurate = r.is_accurate;
      q.has_hallucination = r.has_hallucination;
      if (r.judge_reason) q.judge_reason = r.judge_reason;
      if (r.error) q.error = r.error;
      if (r.pipeline) q.pipeline = r.pipeline;
    }
  }
}

async function main() {
  loadEnv();
  const opts = parseArgs();
  const benchmark = JSON.parse(fs.readFileSync(BENCHMARK_PATH, "utf8"));
  let works = benchmark.benchmark.works;
  if (opts.work) works = works.filter((w) => w.id === opts.work);
  if (!works.length) throw new Error(`No works matched filter: ${opts.work}`);

  console.log(`[benchmark] waiting for ${opts.base} ...`);
  await waitForServer(opts.base);

  const judge = opts.skipJudge ? null : getJudgeClient();
  const resultsMap = new Map();
  const cardCache = new Map();
  let questionCount = 0;

  for (const work of works) {
    console.log(`\n[benchmark] work: ${work.title_zh}`);
    let cards;
    try {
      if (!cardCache.has(work.id)) {
        console.log(`  loading lore via RAG...`);
        const data = await fetchWorkLore(opts.base, work.title_zh);
        cards = data.lore.cards;
        cardCache.set(work.id, { cards, workMeta: data.meta, pipeline: data.pipeline, workTitle: data.lore.work_title || work.title_zh });
      } else {
        cards = cardCache.get(work.id).cards;
      }
    } catch (e) {
      console.error(`  lore failed: ${e.message}`);
      for (const q of work.questions) {
        resultsMap.set(q.id, {
          work_id: work.id,
          question_id: q.id,
          type: q.type,
          system_answer: null,
          gold_answer: q.gold_answer,
          is_accurate: null,
          has_hallucination: null,
          error: `lore_load_failed: ${e.message}`,
        });
      }
      continue;
    }

    const cached = cardCache.get(work.id);
    for (const q of work.questions) {
      if (opts.limit != null && questionCount >= opts.limit) break;
      questionCount++;
      process.stdout.write(`  Q ${q.id} ... `);
      const row = {
        work_id: work.id,
        question_id: q.id,
        type: q.type,
        system_answer: null,
        gold_answer: q.gold_answer,
        is_accurate: null,
        has_hallucination: null,
        pipeline: cached.pipeline,
      };

      try {
        row.system_answer = await askChat(opts.base, cached.workTitle, cached.workMeta, cards, q.question);
        if (judge && row.system_answer) {
          const verdict = await judgeAnswer(judge, q, row.system_answer);
          row.is_accurate = verdict.is_accurate;
          row.has_hallucination = verdict.has_hallucination;
          row.judge_reason = verdict.judge_reason;
          console.log(`${verdict.is_accurate}/${verdict.has_hallucination}`);
        } else {
          console.log("ok (no judge)");
        }
      } catch (e) {
        row.error = e.message;
        console.log(`ERR ${e.message}`);
      }

      resultsMap.set(q.id, row);
      await sleep(500);
    }

    if (opts.limit != null && questionCount >= opts.limit) break;
  }

  const results = [...resultsMap.values()].sort((a, b) => a.question_id.localeCompare(b.question_id));
  syncBenchmarkQuestions(benchmark.benchmark, resultsMap);
  benchmark.scoring = computeScoring(benchmark.benchmark.works, results);

  fs.writeFileSync(opts.out, JSON.stringify(benchmark, null, 2), "utf8");
  console.log(`\n[benchmark] wrote ${opts.out}`);
  console.log(JSON.stringify(benchmark.scoring.summary, null, 2));
}

main().catch((e) => {
  console.error("[benchmark] fatal:", e);
  process.exit(1);
});
