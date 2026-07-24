# AnimeLore MVP

AnimeLore 是一个“二次元作品图鉴”MVP：输入作品名，生成四张社区语境卡片、相关推荐与中文社区语境，并提供首页冷知识、知识漫游、芽衣对话和分享卡片能力。

## 本地启动

1. 安装依赖
   - `npm install`
2. 复制环境变量
   - `copy .env.example .env.local`
3. 填写 `.env.local`
   - `DEEPSEEK_API_KEY=...`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
4. 启动
   - `npm run dev:clean`

## 常用脚本

- `npm run dev`：启动 Next dev server（端口 3000）。
- `npm run dev:clean`：先释放 3000 端口，再启动 dev server，推荐本地开发使用。
- `npm run build`：生产构建。
- `npm run cold:clear`：清空 `data/cold-hooks.json`，并尝试重置 dev 进程内冷知识缓存。
- `npm run cold:seed -- --count=50 --reset --fact-heavy`：生成 50 条偏事实型冷知识库存。
- `npm run cold:seed -- --count=10 --reset --fact-heavy --dry-run`：只预览/校验，不写入库存。
- `npm run cold:stats`：统计冷知识库存数量、subtype 分布、quiz 数量和质量缺口。

## 数据与融合策略

- 硬信息优先：AniList（年份、制作、封面）
- 叙述补充：Wikipedia（summary）
- 中文社区补充：通过联网检索提示词命中萌娘百科等社区页面
- 冲突处理：AniList/Wikipedia > 社区来源，社区信息保留“据说/有说法认为”标注

## 当前已实现

- 首页：品牌区、搜索框、今日冷知识 Hook，默认从 `data/cold-hooks.json` 读取预生成精品库。
- 知识漫游：复用冷知识库存，把 cold hook 转成 roam card，并可进入 `/cold` 查看详情。
- 结果页：顶部基础信息、四卡图鉴、换一批、底部关联 Hook、社区延伸阅读和 AniList 相关推荐。
- 芽衣对话：作品页 AI 对话助手，用户聊出实质感想后可生成「追番打卡」分享卡片。
- 分享卡片：`html2canvas` 截图生成 1080×1440 竖版图片；作品页支持深夜追番、封神之作、意难平三套模板；`/cold` 支持冷知识分享卡。
- API：
  - `GET /api/hook`
  - `GET /api/roam`
  - `GET /api/work?q=...`
  - `GET /api/work/stream?q=...`
  - `POST /api/work/regenerate-cards`
- Prompt：作品四卡强调来源优先级和不确定信息标注；冷知识 prompt 强调事实型优先、单中心趣味点、客观 quiz、避免免责声明式结尾。

## 冷知识库存状态

当前 `data/cold-hooks.json` 已生成 50 条当前版本库存（prompt version：`2025-05-v6-roam-blurb-quiz`）。

最近一次 `npm run cold:stats`：

- 总数：50
- 当前版本：50
- quiz：16
- subtype：`work_fact` 16、`character_fact` 1、`production_note` 3、`staff_fact` 7、`meme_origin` 4、`concept_origin` 4、`genre_trope` 10、`community_take` 5
- 无推荐缺失、无 blurb 缺失、无正文长度异常

## 已知注意事项

- `npm run build` 的 Next 编译阶段可以通过，但当前类型检查会扫到 `resume-tools/` 外部参考项目，并在 `resume-tools/jsonresume.org/apps/docs/app/docs/[[...slug]]/page.tsx` 因缺少 `@/lib/source` 失败。后续应把 `resume-tools/` 从主项目 `tsconfig.json` 检查范围排除。
- `html2canvas` 截图跨域封面时使用 `useCORS: true`；封面失败时分享卡会退回纯色/渐变背景。
