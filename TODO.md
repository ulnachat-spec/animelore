# AnimeLore 项目 TODO 清单

> 与 `PROJECT_CONTEXT.md` 对照使用；完成项请勾选或删除。

## 文档与开发者体验

- [ ] 新增 **`.env.example`**，与 `PROJECT_CONTEXT.md` 第四节环境变量表对齐，便于新成员配置。
- [ ] 根目录 **README.md**（可选）：本地运行、常见错误（缺 Key、`Premature close`、清理 `.next`）、`ADAPTIVE_RAG_WORK` 说明。
- [ ] 大版本或目录变更后同步更新 **`PROJECT_CONTEXT.md`**。

## 质量与稳定性

- [ ] 为 **`lib/work-rec-utils.ts`** 补充单元测试（标题归一化、同作判断、过滤列表边界情况）。
- [ ] 为 **`getWorkLore`** 或 `/api/work` 增加集成测试（mock LLM / 外源），避免回归。
- [ ] 评估 **`lib/prompt.ts`** 中 `MoegirlContext` 改为 `import type`，减少与 `@/lib/data-sources` 的运行时耦合（若团队接受小改动）。

## 功能与产品

- [ ] **RAG**：`planner` 中 Bangumi / Web 源当前多为占位；若需多源，补 retriever 与评估逻辑并与 planner 对齐。
- [ ] **相关推荐**：无 AniList 条目时是否隐藏「相关条目」副标题（纯 UI 微调，按产品决定）。
- [ ] **LLM schema**：若产品确认不再需要 `bottom_hook`，可从 prompt / Zod 中精简以省 token（需与作品页 UI 约定一致）。
- [ ] **首页冷区**：`/cold` 与首页 `getHomeHookPayload` 的体验与错误兜底是否统一（文案、重试、空状态）。

## 运维与性能

- [ ] 生产环境对 **AniList / 维基 / 萌娘** 请求考虑 **超时、重试、简单缓存**（减轻冷启动与重复进页压力）。
- [ ] **CI**：`npm run lint` + `npm run build` 在 PR 上跑通（GitHub Actions 等）。

## 安全与合规

- [ ] 确认日志与 API 响应中**不泄露** API Key 或用户敏感输入。
- [ ] 外源 API 的 **User-Agent**、速率与 ToS 符合各站政策。

---

*清单由维护者根据当前代码库整理；欢迎按优先级增删。*
