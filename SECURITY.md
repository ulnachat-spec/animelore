# Security Policy

## Supported version

AnimeLore 当前发布候选使用 Next.js 15.5.21 Maintenance LTS。公开部署前必须通过：

```powershell
npm run check
npm audit
```

## Secrets

- 不得提交 `.env`、`.env.local`、API Key 或站点 Cookie。
- AI 与社区数据源凭证只放在服务端加密环境变量中。
- `NEXT_PUBLIC_` 前缀仅用于可以公开给浏览器的值。

## Runtime protections

- Chat、作品生成和换一批接口有输入校验与单实例内存限流。
- 生产模式隐藏调试 API。
- 页面启用 `nosniff`、防 iframe、严格来源策略与浏览器权限限制。
- AI POST 响应不应由共享缓存保存。
- 冷知识与 AI 内容属于辅助信息，事实判断应回到界面列出的原始来源。

内存限流不能在多个 Serverless 实例之间共享。进入公开高流量阶段前，应迁移到共享限流存储并为 AI 调用增加用户级配额与费用告警。

## Known upstream audit findings

截至 2026-07-24，`npm audit` 剩余 3 个 high，来自 Next.js 15.5.21 内部固定的：

- `postcss@8.4.31`
- `sharp@0.34.x`

官方 Next.js 16.2.11 仍声明同一 PostCSS 版本和 `sharp ^0.34.5`，npm 给出的自动修复会错误地建议降级到 Next 9.3.3。项目不得运行 `npm audit fix --force`。

当前缓解条件：

- PostCSS 只在受控构建链路处理仓库内 CSS，不接受用户上传 CSS。
- Next Image 只允许配置中的 AniList、Wikimedia 域名与本地品牌资源。
- 不允许 SVG 远程优化，也没有用户图片上传入口。

应持续跟踪 Next.js 官方安全版本；一旦官方更新内部依赖，优先升级并重新运行完整门禁。

## Reporting

发现安全问题时，请通过项目所有者指定的私密渠道提交复现步骤、影响范围和建议修复方式，不要公开 API Key、用户内容或可利用细节。
