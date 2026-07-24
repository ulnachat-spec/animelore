# Changelog

## 2026-05-27

### 分享卡片

- 新增「追番打卡」分享卡片功能：
  - `components/share/ShareCardCanvas.tsx`：1080×1440 竖版卡片渲染，支持深夜追番、封神之作、意难平三套作品模板；冷知识固定使用深夜模板。
  - `components/share/ShareModal.tsx`：移动端底部抽屉 / 桌面端居中 Modal，支持预览、模板切换、感想编辑、标签选择和保存图片。
  - `components/share/useShareCard.ts`：封装 `html2canvas` 截图与 `<a download>` 下载；iOS Safari 等无法直接下载时显示图片供长按保存。
- 芽衣对话中，用户消息长度超过 20 字或包含明显情绪词时，在芽衣回复后于对话底部安静展示「生成分享卡片」按钮；感想默认取最近一句用户原话。
- `/cold` 详情页底部新增「分享这条冷知识」入口，生成 hook + insight 摘要的冷知识分享卡。
- 新增依赖：`html2canvas`。

### 冷知识 / 知识漫游内容库

- 将首页冷知识默认模式调整为 `HOME_HOOK_MODE=library_only`：首页优先读取 `data/cold-hooks.json` 的当前版本精品库，不再默认实时联网生成。
- 新增补库和统计脚本：
  - `npm run cold:seed`（支持 `--count`、`--offset`、`--reset`、`--fact-heavy`、`--dry-run` / `--sample`）
  - `npm run cold:stats`
- `GET /api/hook?debug=1` 和 `GET /api/roam?debug=1` 增加 library stats，便于判断当前读的是库、fallback 还是生成链路。
- 知识漫游复用冷知识库，Roam 卡片携带完整 `cold_payload`，点击深入了解可进入 `/cold` 展开完整正文与推荐。
- 正式生成 `data/cold-hooks.json` 当前版本 50 条 fact-heavy 冷知识库存：
  - 事实型合计 27 条：`work_fact` 16、`character_fact` 1、`production_note` 3、`staff_fact` 7。
  - 非事实型合计 23 条：`meme_origin` 4、`concept_origin` 4、`genre_trope` 10、`community_take` 5。
  - `quizCount=16`，无推荐缺失、无 blurb 缺失、无正文过短或过长。

### 冷知识 schema / prompt / verifier

- `COLD_PROMPT_VERSION` 更新为 `2025-05-v6-roam-blurb-quiz`。
- 扩展冷知识字段：`cold_subtype`、`blurb`、可选 `quiz`。
- 扩展 subtype：`concept_origin`、`term_origin`、`meme_origin`、`work_fact`、`character_fact`、`production_note`、`staff_fact`、`genre_trope`、`trope_explanation`、`community_discussion`、`community_take`。
- prompt 改为强调 **单一中心趣味点**：开头点明趣味，中间用因果/递进解释，结尾自然带到推荐作品或观看兴趣。
- 概念/术语/梗/社区类内容必须按「出处/原义 → 语境迁移 → 当前作品关系 → 事实与解读边界」写，避免直接抛聪明句子。
- 收紧「不是……而是……」句式：禁止把可并存的概念强行写成二分对立；优先使用分层/沿革表达。
- 收紧免责声明式结尾：禁止 insight 用「不是严格……」「不等于……」「并不代表……」「不能作为……」「这里只是……」「这里说的是……不是……」「更像是……而不是……」「不应理解为……」等叠甲句收束；事实谨慎需要融入正文语境。
- prompt 增加“事实型优先”目标：优先生成 `work_fact` / `character_fact` / `staff_fact` / `production_note`，quiz 只跟随客观可核验事实。
- verifier 增加以下拦截：
  - 空泛套话与无意义比喻
  - 关键词堆砌、多话题摘要
  - 强行二分转折
  - 概念/梗缺少出处原义或语境迁移
  - 社区/梗类缺少事实与解读边界
  - 主观、审美、影响力判断型 quiz
  - 机械免责声明和免责声明式结尾
  - 内部 prompt/校验器式文案泄漏
- quiz 规则：只给有唯一标准答案、可公开核验的事实生成；作品事实类优先角色设定、组织归属、能力、道具、故事开端、制作人员等具体细节。

### 当前库存状态

- 当前 `data/cold-hooks.json` 已写入 50 条当前版本库存（`npm run cold:seed -- --count=50 --reset --fact-heavy`）。
- `npm run cold:stats` 通过：总数 50、当前版本 50、旧版本 0、quiz 16、无推荐缺失、无 blurb 缺失、无正文长度异常。
- `npm run build` 的 Next 编译阶段通过，但类型检查仍被 `resume-tools/` 外部参考项目阻塞：`resume-tools/jsonresume.org/apps/docs/app/docs/[[...slug]]/page.tsx` 找不到 `@/lib/source`。

## 2026-05-26

### 首页「今日冷知识」

- 将冷知识生成重构为 **主题规划 → 证据包 → 推荐候选池 → few-shot prompt → verifier → AniList enrich → store/cache/fallback** 的流程。
- 推荐作品不再由 LLM 自由编写，只能从服务端候选池中选择 `candidate_id`；默认过滤非日本动画（`countryOfOrigin !== "JP"`）。
- 新增/扩充概念候选池，覆盖傲娇、世界系、公路片、时间循环、作画崩坏、万策尽、声优梗、总集篇等方向。
- 冷知识 prompt 迭代到 `COLD_PROMPT_VERSION = "2025-05-v5-patterns"`：
  - few-shot 只作为语气、吐槽感、信息密度参考，不作为固定句式模板。
  - 新增内部 `style_pattern`，支持 `misunderstanding`、`scene_first`、`etymology`、`audience_psychology`、`work_contrast` 五种叙事结构。
  - 删除过强的工程化写作约束，避免输出变成说明文/结构化报告。
- `cold-verifier` 放松为“只拦明显问题”：
  - 空内容、极端长度、来源句、硬事实无证据、推荐候选非法。
  - 不再因为第一句不够 punch、hook 不是反差断言、未满足固定模板而失败。
- `/cold` 页面不再展示内部 `angle` 字段，只展示标题、正文和推荐区。
- sessionStorage 增加 prompt version 校验；旧 payload 会提示回首页重新进入。

### 冷知识开发体验

- `development + refresh=1` 会强制新生成，不再读取 `data/cold-hooks.json` 旧库。
- `refresh=1` 生成成功后允许按 `topic_key` upsert 覆盖旧记录，避免被旧 store 拒绝保存。
- 新增 `npm run cold:clear`，清空 `data/cold-hooks.json`，并在 dev server 运行时尝试调用 `POST /api/hook/clear` 重置进程内 store/cache。
- `GET /api/hook?refresh=1&debug=1` 返回：
  - `debug.source` / `debug.mode`
  - `selected_from_library`
  - `library_pick_note`
  - `final_prompt`
  - `llm_raw`
  - `verification.reasons`
  - `candidates`

### 作品页 / SSE

- 保留此前作品页 SSE / `debugTyping=1` / `sse-probe` 调试链路与上下文；本次主要工作集中在首页冷知识模块。
