# AnimeLore（animelore）项目简要说明

面向二次元作品的内容图鉴：结合 **AniList / Bangumi / Wikipedia / 萌娘百科**（及可选 **B站专栏 / NGA / 阿苇岛** 社区语境）等资料，通过 **DeepSeek** 生成「四卡」解读；可选 **Gemini** 做事实交叉验证（**作品主链路生产环境默认不阻塞**，仅 debug API 等路径启用）。支持自适应 RAG、Legacy 回退、作品页「换一批」按板块去重；作品页支持 **Suspense 分块** 与可选 **SSE 四卡流式**（`WORK_LORE_STREAMING`）。首页「今日冷知识」/「知识漫游」已调整为 **预生成精品库优先**：默认 `library_only` 读取 `data/cold-hooks.json`，通过 seed/stats 脚本补库和验库；当前库存为 **50 条 fact-heavy 冷知识**（27 条事实型、16 条 quiz）。作品页芽衣对话和 `/cold` 详情页支持 **html2canvas 分享卡片**，可保存 1080×1440 竖版图片。

**换窗口开发**：先看本文 **§7 换窗口速览**，再扫 **§8 待办事项**。

---

## 1. 项目整体架构

### 1.1 目录与职责（高层）

| 区域 | 路径 | 职责 |
| --- | --- | --- |
| **App Router 页面** | `app/` | `/` 首页、`/work/[query]` 作品图鉴（`searchParams.debugTyping`）、`/cold` 冷知识、`/debug/sse-probe`（SSE 最小探针） |
| **API Routes** | `app/api/` | `work`、`work/stream`（SSE）、`work/regenerate-cards`、`work/community-recs`、`work/related`、`work/debug`、`debug/sse-probe`、`hook`、`hook/debug`、`hook/clear`（dev 清库）、`anilist-cover` |
| **UI 组件** | `components/` | `WorkLoreClient`（四卡 + 换一批）、`StreamingWorkLoreClient`（SSE 流式 + fallback）、`StreamingLoreGrid`、`WorkBottomHookPanel`、`LoreGrid`、`SearchBox`、`WorkChatDrawer` |
| **分享卡片** | `components/share/` | `ShareCardCanvas`（1080×1440 卡片 DOM）、`ShareModal`（移动抽屉/桌面 Modal）、`useShareCard`（html2canvas 下载） |
| **作品页区块** | `components/work/` | `WorkLoreSection`、`WorkHeroSection`、`CommunityRecsSection`、`RelatedWorksSection`、`work-page-nav` 等 |
| **业务编排** | `lib/work-service.ts` | `getWorkLore`：adaptive → 成功/insufficient；insufficient 时 **legacy 回退**；异常时 legacy_fallback；可选内存缓存 |
| **Legacy 管线** | `lib/work-legacy.ts` | AniList + Wiki + 萌娘 + `buildLorePrompt` + `generateLore` |
| **自适应 RAG** | `lib/rag/` | analyzer → planner → retriever（并行多源）→ evaluator → `generateLore`；Gemini 校验主要在 **debug** 路径 |
| **换一批** | `lib/regenerate-work-lore.ts`、`lib/regenerate-dedupe.ts` | 仅用已有 evidence 再生成；`seenContentByCard` 按板块去重；**当前仍非流式** |
| **流式四卡** | `lib/llm-stream.ts`、`lib/lore-card-text-parser.ts`、`lib/work-lore-stream-pipeline.ts` | 单卡 plain-text 协议 → 服务端解析；超时/打字机拆分见 `lib/stream-typewriter.ts` |
| **流式调试** | `lib/work-lore-stream-debug-typing.ts` | `debugTyping=1`：不调用 DeepSeek，仅 LEGACY headline 逐段 `card_delta` |
| **Gemini 校验** | `lib/gemini-verifier.ts`、`lib/rag/adaptive.ts` | 生产作品页不阻塞；`GEMINI_VERIFY_LORE=false` 等 |
| **外源** | `lib/data-sources/`、`lib/rag/retriever.ts` | 多源并行、超时、可选 `RAG_DEFER_COMMUNITY_EVIDENCE` |
| **来源策略** | `lib/rag/source-policy.ts` | 硬事实 / 语境 / 社区 |
| **Prompt** | `lib/prompt.ts`、`lib/prompt-card-stream.ts` | adaptive/legacy；单卡流式 prompt |
| **LLM** | `lib/llm.ts` | DeepSeek（OpenAI 兼容）；非流式 `generateLore` |
| **SSE 工具** | `lib/sse.ts` | `createSseResponse`；`X-Accel-Buffering: no`、`: flush` comment |
| **作品相关** | `lib/work-rec-utils.ts` | 标题去重、相关推荐过滤 |
| **首页冷知识 / 知识漫游** | `lib/cold-*`、`lib/hook-*`、`lib/roam/`、`data/cold-hooks.json` | 默认从预生成库读取；生成链路 topic planner → RAG evidence → 推荐候选池 → prompt → verifier → AniList enrich → store/cache/fallback；Roam 复用冷知识库并携带完整 `cold_payload` |

### 1.2 请求路径（概念）

```
用户搜索作品 → /work/[query]
  ├─ Suspense：Hero / Lore / Community / Related 分块
  └─ Lore：
       WORK_LORE_STREAMING=true（或 dev + ?debugTyping=1）
         → StreamingWorkLoreClient
         → GET /api/work/stream?q=...[&debugTyping=1]
              → debugTyping：runDebugTypingStream（探针，无 DeepSeek）
              → 否则：retrieveWorkLoreContext → 每卡 generateLoreCardStream → done
         → 失败：GET /api/work?q=... fallback
       否则
         → getWorkCoreCached → WorkLoreClient + WorkBottomHookPanel

用户点击「换一批」
  → POST /api/work/regenerate-cards { meta, evidence, seenContentByCard }
  → regenerateLoreCardsFromEvidence（非流式，与首屏流式独立）

用户和芽衣聊天
  → WorkChatDrawer
  → 用户消息长度 > 20 或含情绪词，且芽衣回复后
  → 底部显示「生成分享卡片」
  → ShareModal + ShareCardCanvas
  → html2canvas 截图并下载 PNG

用户查看 /cold
  → sessionStorage 读取 cold payload
  → 正文底部「分享这条冷知识」
  → 固定深夜模板生成冷知识分享卡
```

---

## 2. 目前已实现的功能

### 2.1 页面与 API

- **首页**：搜索框、今日冷知识、知识漫游入口。
- **作品页**：AniList Hero（Suspense）；四卡区流式开关见 **§4**；中文社区推荐、AniList 相关推荐 **独立 Suspense**，失败不拖死四卡。
- **换一批**：有 RAG 证据包时显示；`seenContentByCard` 按板块去重。
- **调试**：`GET /api/work/debug?q=`（需 adaptive 开启）；`GET /api/debug/sse-probe`（每 200ms tick×20，验证基础 SSE）；`GET /api/work/stream?...&debugTyping=1`（验证作品页流式 UI，无 DeepSeek）。
- **今日冷知识**：`/` 首页展示 hook，点击进入 `/cold`；详情页展示标题、可选 quiz、正文、推荐区，不展示内部 `angle` / `example_bridge` / `style_pattern`。
- **知识漫游**：`/roam` 轻量卡片流，复用已验证冷知识库；深入了解会把完整 cold payload 写入 sessionStorage 后进入 `/cold` 或作品页。
- **分享卡片**：作品页芽衣对话满足触发条件后显示「生成分享卡片」；支持三套作品模板、感想预填充、最多 2 个标签、保存 PNG。`/cold` 底部支持生成冷知识分享卡。

### 2.2 首页「今日冷知识」与知识漫游（当前重点）

主入口：`resolveHomeHook()`（`lib/cold-hook-service.ts`），首页 `HomeColdSection` 和 `GET /api/hook` 共用。

```text
resolveHomeHook
  ├─ stable cache（仅 HOME_HOOK_ROTATION_MODE=stable 且非 refresh）
  ├─ library_only（默认）：从 data/cold-hooks.json 过滤当前版本可用内容后加权轮换
  ├─ library_first：先读库，库不足时才生成（开发/补库）
  ├─ generate_only：强制实时生成（仅调试 prompt）
  ├─ generate：planColdTopic → retrieveColdEvidence → buildColdRecommendationCandidates
  │          → buildColdHookPrompt → generateHomeHookRaw → finalizeColdRecommendations
  │          → verifyColdHook → coldPayloadFromRaw/enrichColdRecommendations → save/upsert store
  └─ fallback：pickFallbackColdHook
```

关键约束：

- **主题权重**：`concept 55% / phenomenon 30% / work 15%`，见 `lib/cold-topic-planner.ts`。
- **推荐候选池**：LLM 只能输出候选池内 `candidate_id`，不允许自由编作品名；默认只保留 `countryOfOrigin === "JP"` 的 AniList 条目。
- **prompt 版本**：`COLD_PROMPT_VERSION` 当前为 `2025-05-v6-roam-blurb-quiz`；旧 sessionStorage 会提示回首页刷新。
- **默认模式**：`HOME_HOOK_MODE=library_only`，首页不应默认实时联网生成；库为空或过滤后为空时走 fallback / 开发提示，补库用 `npm run cold:seed`。
- **库可用性过滤**：只读当前 prompt version；要求 `verified/skipped`、有 `recommendations`、有 `source_urls`、`blurb` 存在且正文长度合理。
- **内容字段**：`ColdSubtype` 包括 `concept_origin`、`term_origin`、`meme_origin`、`work_fact`、`character_fact`、`production_note`、`staff_fact`、`genre_trope`、`trope_explanation`、`community_discussion`、`community_take`；`ColdHookPayload` 额外带 `blurb` 和可选 `quiz`。
- **prompt 风格**：`lib/cold-hook-prompt.ts` 保留朋友聊天式语气，但当前重点不是“聪明句子”，而是**单一中心趣味点**：开头点明趣味，中间因果/递进解释，结尾自然带到推荐作品或观看兴趣。
- **术语/梗/概念结构**：`concept_origin` / `term_origin` / `meme_origin` / `genre_trope` / `community_*` 必须按「出处/原义 → 语境迁移 → 当前作品关系 → 事实与解读边界」进入语境，避免直接抛梗。
- **句式约束**：少用「不是……而是……」；若使用，前后必须同层级且确实对比。优先用「一层/另一层」「先看/再看」「原本/后来」等分层和沿革表达。
- **quiz 规则**：只给有唯一标准答案、可公开核验的事实生成 quiz。概念/社区/审美/影响力判断默认 `quiz=null`；`work_fact`、`character_fact`、`production_note`、`staff_fact` 优先尝试角色设定、组织、能力、道具、故事开端、制作人员等客观细节 quiz。
- **叙事结构**：LLM 输出内部字段 `style_pattern`（不展示），可选：
  `misunderstanding`、`scene_first`、`etymology`、`audience_psychology`、`work_contrast`。
- **verifier 当前重点**：除基础字段/来源/推荐候选外，拦截空泛套话、关键词堆砌、强行二分转折、免责声明式结尾、概念/梗缺少语境沿革、主观 quiz、内部提示语泄漏。
- **debug 能力**：`GET /api/hook?debug=1` 返回 library 统计；`GET /api/hook?refresh=1&debug=1` 还返回 `final_prompt`、`llm_raw`、`verification.reasons`、`candidates`。
- **知识漫游**：`GET /api/roam?count=8&debug=1` 会返回 `cards` 和 library stats；Roam 卡片背后必须有完整冷知识详情与推荐，不做每滑一张实时生成。
- **当前库存状态（2026-05-27）**：`data/cold-hooks.json` 已写入 50 条当前版本库存：`work_fact` 16、`character_fact` 1、`production_note` 3、`staff_fact` 7、`meme_origin` 4、`concept_origin` 4、`genre_trope` 10、`community_take` 5；事实型合计 27 条，`quizCount=16`，无推荐/无 blurb/正文长度异常均为 0。

### 2.3 RAG 数据源（adaptive）

（与先前一致；社区源可 `RAG_DEFER_COMMUNITY_EVIDENCE` 延后到首屏外。）

### 2.4 生成与校验规则（prompt）

- 四卡正文禁止百科式基础信息（平台/集数/制作公司/播出时间等）。
- 换一批按板块去重。

### 2.5 Gemini

- 作品主链路生产环境：**不阻塞**四卡（见 `adaptive.ts` trace `non_blocking_prod_path`）。
- 配置见 `.env.example`。

---

## 3. 技术栈

Next.js 14 · React 18 · TypeScript · Tailwind · Framer Motion · html2canvas · OpenAI SDK → DeepSeek · Zod

---

## 4. 环境变量（流式与作品页）

除 `.env.example` 全文外，与 **作品页流式** 强相关：

| 变量 | 作用 |
| --- | --- |
| `WORK_LORE_STREAMING` | `true` 时作品页走 `StreamingWorkLoreClient` + `/api/work/stream` |
| `WORK_LORE_STREAM_CARD_TIMEOUT_MS` | 单卡 LLM 流超时（默认 45000） |
| `WORK_LORE_STREAM_TOTAL_TIMEOUT_MS` | 整条 SSE 超时（默认 180000） |
| `WORK_LORE_STREAM_CLIENT_IDLE_MS` | 前端无事件（含 ping）后 fallback（默认 30000） |
| `WORK_LORE_STREAM_TYPEWRITER_*` | 大块 delta 拆字延迟（threshold / chars / delay_ms） |
| `WORK_LORE_CACHE_*` | `getWorkLore` 内存缓存 |

**开发环境特例**：`NODE_ENV=development` 且 URL **`?debugTyping=1`** 时，即使未开 `WORK_LORE_STREAMING`，也会挂载 `StreamingWorkLoreClient`，便于单独测 SSE/UI（见 `work-lore-section.tsx`）。

---

## 5. 开发与运维备忘

### 5.1 本地开发

```powershell
npm run dev:clean   # kill-port 3000 --method=tcp + next dev -p 3000
```

- 页面白屏、`_next/static` 404、`Cannot find module './xxx.js'`：先 **`rm -rf .next`** 再 `dev:clean`，浏览器硬刷新。
- 勿同时开多个 `npm run dev`。

### 5.2 冷知识开发调试

```powershell
npm run cold:clear
npm run cold:seed -- --count=50 --reset --fact-heavy
npm run cold:stats
```

- 清空 `data/cold-hooks.json`；若 dev server 正在运行，脚本会尝试 `POST /api/hook/clear` 同步重置进程内 store/cache。
- `cold:seed` 为本地补库/样本脚本：`--reset` 清库后写入，`--count` 控制条数，`--offset` 可取不同样本段，`--fact-heavy` 优先事实型内容，`--dry-run` / `--sample` 只校验不写库。
- `cold:stats` 输出当前库总数、当前 prompt version 可用数量、旧版本数量、`cold_subtype` 分布、quiz 数量、无推荐/无 blurb/正文长度异常数量。
- 当前已正式生成 50 条 fact-heavy 库存；如需重跑正式库存，先 `cold:clear`，再 `cold:seed -- --count=50 --reset --fact-heavy`，最后 `cold:stats`。
- 开发环境强制新生成：`/?refreshHook=1` 或 `GET /api/hook?refresh=1&debug=1`。
- `development + refresh=1` 会跳过旧库，不从 `data/cold-hooks.json` 读取；生成成功后按 `topic_key` upsert 覆盖旧记录。
- `/cold` 只接受带当前 `COLD_PROMPT_VERSION` 的 session payload；旧 session 会提示回首页。
- 快速判断来源：看 debug 里的 `source/mode/selected_from_library/library_pick_note/cache_hit/force_regenerate`。

### 5.3 流式调试清单（推荐顺序）

1. **基础 SSE**：打开 `http://localhost:3000/debug/sse-probe` — 应约每 200ms 多一行。
2. **作品页 UI + API**：`http://localhost:3000/work/葬送的芙莉莲?debugTyping=1`（dev）— 黄框应显示 **`GET /api/work/stream?q=...&debugTyping=1`**；控制台 `[StreamingWorkLoreClient] fetch ...`；终端 `[work-stream] debugTyping=1 stream_start`；LEGACY headline 逐字「测试流式输出」。
3. **真实流式**：`.env` 设 `WORK_LORE_STREAMING=true`，去掉 `debugTyping`，看四卡与终端 `stream_stats`（`delta_event_count`、`chunk_count` 等）。

### 5.4 关键类型

- `LoreCardId`：`legacy` \| `meme` \| `behind` \| `lineage`
- `SeenContentByCard`：`Record<LoreCardId, string[]>`
- 冷知识：`ColdHookPayload`、`HomeHookRawV2`、`ColdRecommendationRaw`、`ColdRecommendationCandidate`、`ColdSubtype`、`ColdQuiz`
- 冷知识 debug 内部字段：`style_pattern`（页面不展示）

### 5.5 已知限制

- `regenerate-cards` **不更新** `bottom_hook`（仅换四卡）。
- **换一批**尚未做 token 流式（有意延后）。
- 部分外源失败时走 insufficient / legacy；不崩。
- 冷知识的 `style_pattern` 当前由 LLM 自选，尚未做“最近 style 去重”的服务端强制轮换。
- 当前 seed 脚本是本地精品库/样本工具，不等于真实联网批量生成器；50 条库存已按 fact-heavy 静态种子写入。
- `npm run build` 的 Next 编译阶段通过，但类型检查会扫入 `resume-tools/` 外部参考项目，并因 `resume-tools/jsonresume.org/apps/docs/app/docs/[[...slug]]/page.tsx` 缺少 `@/lib/source` 失败；建议后续从 `tsconfig.json` 排除 `resume-tools/`。
- 分享卡片封面图使用 `html2canvas` + `useCORS`；跨域失败时卡片会 fallback 到纯色/渐变背景，但仍需浏览器实测不同移动端保存体验。

---

## 6. 相关配置文件

- `package.json`（含 `html2canvas`）、`tsconfig.json`（`@/*`）
- `tailwind.config.ts`、`postcss.config.mjs`
- `next.config.mjs`：远程图片域名

---

## 7. 换窗口速览（复制给新会话）

- **项目**：AnimeLore，Next 14 App Router，作品页 `/work/[query]`。
- **首页冷知识当前重点**：默认 `HOME_HOOK_MODE=library_only`；prompt 版本 `2025-05-v6-roam-blurb-quiz`；页面不展示 `angle/example_bridge/style_pattern`。
- **冷知识生成链路**：`cold-topic-planner` → `cold-rag` → `cold-recommendation-candidates` → `cold-hook-prompt` → `llm.generateHomeHookRaw` → `cold-verifier` → `hook-enrich` → `cold-hook-store`；首页默认读库，不实时生成。
- **冷知识/漫游字段**：`cold_subtype`、`blurb`、可选 `quiz`；Roam 复用冷知识库并携带完整 `cold_payload`。
- **冷知识推荐**：只从服务端候选池选 `candidate_id`；AniList enrich；默认 JP 过滤。
- **冷知识 prompt/verifier 重点**：事实型优先；单中心趣味点；术语/梗/概念按「出处/原义 → 语境迁移 → 当前作品关系 → 边界」；少用强行「不是……而是……」；禁止免责声明式结尾；quiz 只给客观可核验事实，作品事实类优先角色/能力/组织/道具/剧情前提等细节。
- **冷知识调试**：`npm run cold:clear` 清库；`npm run cold:seed -- --count=50 --reset --fact-heavy` 生成正式 50 条库存；`npm run cold:seed -- --count=10 --reset --fact-heavy --dry-run` 预览不写库；`npm run cold:stats` 看分布；`/api/hook?debug=1` 看 library stats。
- **当前数据状态**：`data/cold-hooks.json` 是 50 条当前版本 fact-heavy 库存，事实型 27 条、quiz 16 条；`cold:stats` 无推荐/blurb/正文长度异常。
- **分享卡片**：`components/share/ShareCardCanvas.tsx`、`ShareModal.tsx`、`useShareCard.ts`；芽衣对话触发作品分享卡，`/cold` 底部触发冷知识分享卡；依赖 `html2canvas`。
- **非流式主数据**：`getWorkLore` / `loadWorkCore` / `GET /api/work?q=`。
- **流式**：`WORK_LORE_STREAMING=true` → `StreamingWorkLoreClient` → `GET /api/work/stream`（`URLSearchParams` 拼 `q` + 可选 `debugTyping=1`）。
- **Dev 探针**：`?debugTyping=1` 可单独走流式客户端；API `debugTyping=1` 不调用 DeepSeek。
- **SSE 最小探针**：`/debug/sse-probe`、`/api/debug/sse-probe`。
- **核心文件**：`app/work/[query]/page.tsx`（`dynamic`、`searchParams`）、`work-lore-section.tsx`、`StreamingWorkLoreClient.tsx`、`streaming-lore-grid.tsx`、`app/api/work/stream/route.ts`、`lib/work-lore-stream-pipeline.ts`、`lib/llm-stream.ts`、`lib/lore-card-text-parser.ts`、`lib/sse.ts`。
- **产品上下文文件**：本仓库根目录 **`PROJECT_CONTEXT.md`**（即本文件）。

---

## 8. 待办事项（建议优先级）

| 优先级 | 事项 | 说明 |
| --- | --- | --- |
| P0 | **确认真实流式 UI** | `WORK_LORE_STREAMING=true`、无 `debugTyping` 时，四卡 headline/intro/points 是否逐步增长；对照终端 `stream_stats`（`chunk_count`、`delta_event_count`） |
| P0 | **若真实流式仍整块** | 查 DeepSeek `chunk_count`、parser emit、`emitWithTypewriter` 是否触发；勿先猜 Next 缓冲（sse-probe 已排除） |
| P1 | **生产环境调试开关** | 评估是否仅在 dev 显示黄框 / 限制 `debugTyping`（当前 dev 可无 `WORK_LORE_STREAMING`） |
| P1 | **Strict Mode 双请求** | dev 下 `sse-probe` / 流式页面可能 mount 两次；可用 `useRef` 防抖或接受仅 dev 现象 |
| P1 | **50 条库存人工抽检** | 已生成 50 条 fact-heavy 库存；建议抽检事实准确性、推荐关联和分享入口展示效果 |
| P1 | **构建范围修复** | `npm run build` 类型检查被 `resume-tools/` 阻塞；建议从 `tsconfig.json` exclude 外部参考目录 |
| P1 | **分享卡移动端实测** | 重点验证 iOS Safari 保存图片 fallback、封面跨域 fallback、三个模板截图是否与预览一致 |
| P2 | **「换一批」流式** | 用户曾明确「后续再做」；与 `regenerate-cards` 分离设计 |
| P2 | **冷知识 style 去重** | 若连续生成结构仍重复，可在服务端 recent memory 中记录 `style_pattern` 并传入 prompt/强制避开 |
| P2 | **README 继续扩写** | 若对外展示需要，可继续补截图、功能演示和部署说明 |
| P3 | **清理/整理** | 未再使用的旧客户端路径（若有）与注释对齐 |

---

*最后更新：2026-05-27（冷知识 v6：library_only、50 条 fact-heavy 库存、seed/stats dry-run、Roam 复用冷知识库、blurb/quiz/cold_subtype、单中心语境化 prompt、客观 quiz verifier、禁止免责声明式结尾；新增 html2canvas 分享卡片；保留作品页 SSE 上下文）*
