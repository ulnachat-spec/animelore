# AnimeLore

AnimeLore 是一座由 AI 档案员「芽衣」陪伴探索的动画作品档案馆。输入作品名后，可以查看社区梗、幕后故事、创作谱系与有来源的延伸阅读；也可以漫游冷知识、与芽衣继续讨论，并生成分享卡片。

当前产品采用移动端优先的响应式 Web/PWA 形态：同一套代码适配手机与桌面浏览器，支持日间、夜间和跟随系统三种主题状态。安装到手机主屏幕后可获得接近 App 的独立窗口体验。

## 已实现

- 响应式全站壳层：桌面顶部导航、手机底部导航、安全区适配。
- 双主题设计系统：纸张档案馆日间主题、星夜阅览室夜间主题。
- 品牌资产：AnimeLore 书页星标 Logo、芽衣概念图、头像与 Q 版状态形象。
- 首页：作品搜索、搜索建议、今日冷知识、最近浏览与随机档案。
- 作品档案：基础信息、四类知识卡、换一批、相关推荐与中文社区考据。
- 芽衣对话：基于当前作品知识卡继续讨论。
- 冷知识：可分享、可复制永久链接的 `/cold/[id]` 档案页。
- 知识漫游：卡片式随机发现并可继续阅读。
- PWA：Web App Manifest、主题色与可安装入口。
- 上线基线：输入校验、昂贵接口限流、安全响应头、生产环境调试入口隔离、robots 与 sitemap。

## 本地运行

环境要求：Node.js 20 LTS（最低需满足当前 Next.js 的 Node 版本要求）。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

至少在 `.env.local` 中填写：

```dotenv
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

不要提交 `.env` 或 `.env.local`。Bilibili、阿苇岛等 Cookie 也只允许放在部署平台的加密环境变量中。

## 质量门禁

```powershell
npm run lint
npm run test
npm run build
```

也可以一次执行：

```powershell
npm run check
```

当前单元测试覆盖冷知识会话兼容与接口限流核心逻辑。发布前还应完成桌面/手机端浏览器冒烟测试。

## 常用维护命令

- `npm run cold:stats`：检查冷知识库存数量与质量分布。
- `npm run cold:seed -- --count=50 --reset --fact-heavy`：重建冷知识库存。
- `npm run cold:clear`：清空本地冷知识库存（破坏性操作，执行前先备份）。
- `npm run benchmark:run`：运行现有 RAG 基准脚本。

## 部署

推荐使用支持 Next.js Node 运行时与流式响应的平台。部署时：

1. 使用 `npm ci` 按锁文件安装依赖。
2. 设置生产环境变量，特别是 `DEEPSEEK_API_KEY` 与公开站点的 `NEXT_PUBLIC_BASE_URL`。
3. 构建命令使用 `npm run build`，启动命令使用 `npm run start`。
4. 验证平台没有缓冲 `text/event-stream`，否则关闭 `WORK_LORE_STREAMING`。
5. 将 `data/cold-hooks.json` 视为随版本发布的只读内容；若未来允许在线写入，需要迁移到持久数据库。
6. 当前限流是单实例内存实现，适合作为首层保护。多实例正式流量应替换为 Redis/Upstash 等共享限流存储。

完整验收、后续功能边界和回退点见 `docs/RELEASE_CANDIDATE.md`，安全说明见 `SECURITY.md`。

## 数据来源与可信度

- AniList：作品年份、制作信息与封面等结构化元数据。
- Bangumi：中文标题和条目信息补充。
- Wikipedia、萌娘百科：背景叙述与交叉核对。
- 中文社区来源：仅作为社区语境和延伸阅读，不覆盖权威硬信息。

生成内容仍可能出错。涉及具体事实时，界面会尽可能附上来源、验证状态与置信度，用户应以原始来源为准。

## 版本与回退

改造工作位于 `codex/responsive-pwa-redesign` 分支，每个长跑阶段都有独立提交点。可使用 `git log --oneline` 查看阶段提交，并通过新分支或 `git revert <commit>` 做可审计回退；不建议直接重置或覆盖历史。
