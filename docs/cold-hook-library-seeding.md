# Cold Hook Library Seeding Plan

这份文档用于指导 Cursor 改造 AnimeLore 的首页冷知识和知识漫游内容逻辑。目标不是继续微调单条 prompt，而是把冷知识变成一个可预生成、可验证、可复用的精品内容库。

## 背景问题

现在首页冷知识和知识漫游存在几个核心问题：

1. 首页冷知识加载慢，因为它经常依赖实时生成、联网检索或服务端生成链路。
2. 已生成的旧版本冷知识会继续出现在测试里，导致 prompt 改了但页面看起来没变。
3. 内容过度偏向“概念解释”，缺少真正像冷知识的硬事实条目，例如：
   - 某部作品拿过什么大奖
   - 某部动画 OP/ED 里藏了什么彩蛋
   - 某个角色、制作、声优、标题、梗的幕后事实
4. 因为事实型条目太少，`quiz` / “是真的吗” 判断题几乎刷不到。
5. 知识漫游也需要更多可快速吸引用户的事实型卡片，而不是全是概念介绍。

## 总体方向

把冷知识改成“预生成精品库 + 前端快速读取”的模式。

首页默认不应该每次都联网搜索或实时生成新内容，而是优先从 `data/cold-hooks.json` 或等价持久化库里抽取已经验证过的内容。实时生成只作为开发/补库工具，不作为用户打开首页时的默认路径。

推荐模式：

```ts
type HomeHookMode = "library_only" | "library_first" | "generate_only";
```

默认使用：

```ts
HOME_HOOK_MODE=library_only
```

含义：

- `library_only`: 首页只从精品库读取，速度最快，质量最稳定。库为空时显示本地 fallback 或提示开发者补库。
- `library_first`: 先读库，库不足时才生成。适合开发阶段。
- `generate_only`: 强制实时生成。只用于调试 prompt，不用于常规体验。

## 内容库目标

先生成 50 条新的高质量冷知识，全部弃用旧版本内容。

50 条内容建议比例：

- 20 条左右：事实型冷知识，可以生成判断题
- 15 条左右：文化概念、社区用语、梗的起源
- 10 条左右：制作、行业、企划、播出、声优相关
- 5 条左右：作品结构、类型、叙事手法类

不要让内容池只剩“世界系、傲娇、公路片、作画崩坏”这类概念解释。概念可以保留，但必须扩大事实型内容的比重。

## 数据字段要求

每条冷知识都必须满足冷知识详情页的完整展示水平，不能只生成两行内容。

建议字段：

```ts
type ColdHookPayload = {
  hook: string;
  subtitle?: string;
  topic_type: "culture" | "industry" | "work" | "character" | "staff" | "trope" | "meme";
  cold_subtype:
    | "concept_origin"
    | "meme_origin"
    | "work_fact"
    | "character_fact"
    | "production_note"
    | "staff_fact"
    | "genre_trope";
  blurb: string;
  insight: string;
  recommendations: ColdRecommendationEnriched[];
  quiz?: {
    statement: string;
    answer: boolean;
    explanation: string;
  };
  is_fact_checkable?: boolean;
  prompt_version: string;
};
```

字段要求：

- `hook`: 有吸引力，但不要标题党到失真。
- `subtitle`: 一句话解释角度，不要写成论文副标题。
- `blurb`: 给知识漫游卡片用，1-2 句，40-80 字左右。
- `insight`: 给冷知识详情页用，150-320 字左右，语气像朋友安利和讲梗，不要像百科词条。
- `recommendations`: 至少 1 个，优先 2 个。必须和正文有明确关联。
- `quiz`: 只给事实型内容生成，不要强行给概念类内容加判断题。
- `prompt_version`: 必须等于当前 `COLD_PROMPT_VERSION`，读取库时过滤旧版本。

## 事实型冷知识要求

新增内容要明显增加这类条目：

- 某部动画得过某个重要奖项
- 某部作品的 OP/ED、片头画面、标题、台词、角色名有隐藏含义
- 某个角色、组织、设定在原作/访谈/设定资料里有容易被忽略的信息
- 某个声优、制作人员、制作方式、播出事故、企划背景有可验证事实
- 某个梗的出处、语源、首次流行语境

示例方向，不要求逐条照抄：

- 《名侦探柯南》黑衣组织成员的代号与命名规则
- 某个经典 OP 里出现的画面后来被正片回收
- 《EVA》标题、术语或宗教意象在社区讨论中的误读
- 《凉宫春日的忧郁》播出顺序和观看顺序的差异
- 《魔法少女小圆》前三集结构为什么常被拿来举例
- 《SHIROBAKO》如何把动画制作流程做成剧情
- 某部动画获奖后为何反而引发争议
- 某个角色原型、早期设定、名字梗

事实型内容必须更谨慎：

- 没有把握就不要写成确定事实。
- 来源不足时改成“常见说法”“社区常这么聊”，并且不要生成 `quiz`。
- 涉及奖项、年份、人员、官方设定时，必须经过检索或可靠来源确认。

## Quiz 生成规则

只有以下子类型优先生成 `quiz`：

- `work_fact`
- `character_fact`
- `staff_fact`
- 可验证的 `production_note`
- 可验证的 `meme_origin`

不要给这类内容强行生成判断题：

- `concept_origin`
- `genre_trope`
- 主观争议类解释
- “为什么大家觉得……”式讨论

目标：

- 50 条里至少 15 条带 `quiz`
- 带 `quiz` 的条目必须有明确真假答案
- `statement` 必须是陈述句，例如：
  - “柯南里的黑衣人有过官方名字。”
  - “《凉宫春日的忧郁》的 TV 播出顺序和故事时间顺序完全一致。”
  - “某部作品的 OP 画面在正片里从未回收。”

`explanation` 要短，像揭晓答案时说给朋友听，不要写成考试解析。

## 推荐作品要求

所有条目都必须有推荐内容。不要出现只有两行正文、没有推荐作品的冷知识详情。

推荐作品的关联必须在正文里提前埋好，不要只在卡片里突然出现。

例如：

- 如果底部推荐《EVA》，正文必须解释为什么这个话题会绕到《EVA》。
- 如果推荐《虫师》和《少女终末旅行》来解释“公路片感”，正文必须先说明“公路片感”不是电影分类，而是旅途见闻结构，然后再带到这两部作品。
- 如果推荐《SHIROBAKO》解释制作委员会或声优生态，正文必须提前说清它为什么适合作为入口。

推荐理由可以短，但必须有信息量，不能只写“适合理解这个概念”。

## 文风要求

保留用户认可的语气：

- 像芽衣或者朋友在安利，不像说明文。
- 可以有“你知道吗”“有意思的是”“说到底”“想想也挺……”这类口语。
- 可以吐槽，但不要有优越感，不要教育用户。
- 不要写成“建议观看”“若想理解”“由此可见”这种教程腔。
- 不要每条都复刻同一个模板。

为了避免结构雷同，生成时从几种叙述结构里随机选择：

1. 误解纠偏型：先说大家常怎么误会，再解释为什么更复杂。
2. 语源探寻型：从词的来源、早期用法、社区传播讲起。
3. 作品入口型：用一部作品带出一个现象。
4. 幕后八卦型：从制作、声优、企划、播出事故切入。
5. 彩蛋揭晓型：先抛一个小事实，再解释它为什么有趣。
6. 社区吐槽型：解释一个梗为什么会被反复提起。

生成时应禁止连续多条使用相同结构。

## 工程改动建议

### 1. 清空旧库

旧内容必须弃用。可以直接清空：

```bash
npm run cold:clear
```

同时确认：

```bash
type data\cold-hooks.json
```

应该只剩：

```json
[]
```

### 2. 新增补库脚本

新增：

```txt
scripts/seed-cold-hooks.mjs
```

并在 `package.json` 增加：

```json
{
  "scripts": {
    "cold:seed": "node scripts/seed-cold-hooks.mjs",
    "cold:stats": "node scripts/cold-stats.mjs"
  }
}
```

目标命令：

```bash
npm run cold:seed -- --count=50 --reset --fact-heavy
```

脚本要求：

- `--reset`: 先清空旧库。
- `--count=50`: 生成 50 条。
- `--fact-heavy`: 提高事实型条目比例。
- 每生成一条都跑 verifier。
- verifier 不通过则丢弃并重试。
- 最终写入 `data/cold-hooks.json`。
- 所有条目必须带当前 `COLD_PROMPT_VERSION`。
- 生成结束后打印统计：
  - 总条数
  - 各 `cold_subtype` 数量
  - quiz 数量
  - 每条推荐作品数量
  - 当前 prompt version

### 3. 新增统计脚本

新增：

```txt
scripts/cold-stats.mjs
```

输出：

- 当前库总数
- 当前 prompt version 可用数量
- 旧 prompt version 数量
- `cold_subtype` 分布
- 带 quiz 的数量
- 无 recommendations 的数量
- insight 字数过短/过长的数量
- blurb 缺失数量

这个脚本用于判断“为什么我明明改了 prompt，页面还是旧内容”。

### 4. 首页读取逻辑

首页默认改为：

```ts
HOME_HOOK_MODE=library_only
```

读取库时必须过滤：

- `prompt_version !== COLD_PROMPT_VERSION`
- `recommendations` 为空
- `insight` 过短
- `blurb` 缺失
- 当前条目不满足 verifier

如果过滤后为空，不要偷偷实时生成旧风格内容。应该：

- 开发环境显示明确提示：冷知识库为空，请运行 `npm run cold:seed -- --count=50 --reset --fact-heavy`
- 生产环境使用 fallback 精品内容

### 5. 知识漫游复用冷知识库

知识漫游可以复用冷知识池，但卡片只显示：

- `hook`
- `subtitle`
- `blurb`

点击“深入了解”：

- 概念/梗/文化类内容进入 `/cold`
- 作品硬事实类内容可以进入作品图鉴页，或先进入 `/cold` 展开完整解释，再从推荐作品进入图鉴页

现阶段为了保证内容完整，建议统一先进入 `/cold`，除非该条目明确是单一作品页的补充事实。

漫游卡片不得只生成两行内容后结束。它背后必须有完整的 `ColdHookPayload`。

### 6. 调试接口

建议给 `/api/hook?debug=1` 和 `/api/roam?debug=1` 增加调试信息：

```json
{
  "source": "library",
  "mode": "library_only",
  "promptVersion": "2025-05-v...",
  "libraryTotal": 50,
  "usableCount": 50,
  "quizCount": 18,
  "subtypeStats": {
    "work_fact": 14,
    "character_fact": 5,
    "concept_origin": 12
  },
  "selectedId": "..."
}
```

这样测试时可以立刻知道页面到底读的是旧缓存、新库，还是实时生成结果。

## 验收标准

完成后请验证：

1. 运行 `npm run cold:clear` 后，旧冷知识不再出现。
2. 运行 `npm run cold:seed -- --count=50 --reset --fact-heavy` 后，`data/cold-hooks.json` 有 50 条当前版本内容。
3. `npm run cold:stats` 显示：
   - 当前版本可用条目不少于 50
   - 带 quiz 条目不少于 15
   - 无 recommendations 条目为 0
   - 无 blurb 条目为 0
4. 首页冷知识加载明显变快，不再依赖实时生成。
5. 知识漫游刷到的内容不再只有概念，也会出现作品事实、彩蛋、制作、声优、奖项等内容。
6. `/cold` 详情页每条都有完整正文和推荐作品。
7. 判断题能在事实型冷知识里稳定出现。

## Cursor 执行重点

请优先做工程闭环，不要继续只调 prompt。

优先级：

1. 清掉旧库和旧版本过滤。
2. 加 `library_only` 默认模式。
3. 加 `cold:seed` 补库脚本。
4. 加 `cold:stats` 统计脚本。
5. 调整 prompt，让 50 条里事实型、可判断题内容比例明显提高。
6. 确保知识漫游卡片背后一定有完整冷知识详情和推荐内容。

