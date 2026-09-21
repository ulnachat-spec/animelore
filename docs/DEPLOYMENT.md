# AnimeLore 上线操作手册

本文按「先预览、后生产」设计；生产环境不应使用本地 `.env` 文件，也不要把任何 Key 或 Cookie 提交进 Git。

## 1. 上线前准备

1. 安装 Node.js 20 LTS，并在项目根目录执行 `npm ci`。本地运行 `npm run build` 前请先停止 `npm run dev`；二者共享 `.next` 目录，同时运行会造成开发服务器引用已被构建重置的静态文件。
2. 将 `.env.example` 的生产值录入部署平台的加密环境变量。至少需要：
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `NEXT_PUBLIC_BASE_URL=https://你的正式域名`
3. 首次上线建议采用下列稳妥配置：

   ```dotenv
   ADAPTIVE_RAG_WORK=true
   WORK_LORE_STREAMING=false
   WORK_LORE_CACHE_ENABLED=true
   HOME_HOOK_MODE=library_only
   COMMUNITY_RECS_ENABLED=false
   GEMINI_VERIFY_LORE=false
   ```

   若部署会自动横向扩容，请同时设置 `UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN`。应用会只向 Upstash 写入不可逆的客户端哈希与限流计数；作品档案缓存会保存已生成的公开档案内容，不上传聊天消息或用户书架。

   `WORK_LORE_STREAMING` 只应在确认 CDN 不缓冲 SSE 后开启。社区 Cookie（如 B 站）属于敏感凭据；无必要时不要配置。
4. 本地执行 `npm run check`。再用 `npm run cold:stats` 确认冷知识库存正常。当前 `data/cold-hooks.json` 是随构建发布的只读数据。
   另外执行 `npm run quality:content`：它会阻止缺来源、缺推荐或正文长度异常的冷知识库存进入发布。

## 2. 推荐：Vercel 部署

1. 将仓库推送到 GitHub/GitLab/Bitbucket。当前仓库尚未配置远端，需先创建一个私有仓库并添加远端。
2. 在 Vercel 新建项目并导入仓库；框架选择会自动识别为 Next.js。
3. 保持默认构建配置：

   | 项目 | 值 |
   | --- | --- |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | 留空 |
   | Node.js | 20.x |

4. 在 Vercel 的 Environment Variables 中，为 **Preview** 和 **Production** 分别设置变量。Preview 的 `NEXT_PUBLIC_BASE_URL` 应填预览域名；Production 填正式 `https://` 域名。
5. 先部署 Preview，按第 4 节验收；通过后 Promote 到 Production，再绑定自定义域名。域名 DNS 记录以 Vercel 控制台给出的 A/CNAME 值为准。
6. 域名生效后，回到环境变量把 `NEXT_PUBLIC_BASE_URL` 改为最终域名并重新部署一次。

## 3. 自托管（Docker/云服务器）

平台必须支持 Node.js runtime、长连接和 `text/event-stream`。使用：

```powershell
npm ci
npm run build
$env:NODE_ENV = "production"
npm run start
```

反向代理需将请求转发到应用端口，并为 `/api/work/stream` 关闭代理缓冲、保留长连接。未完成这项配置前，保持 `WORK_LORE_STREAMING=false`。至少配置 HTTPS、进程守护（systemd/PM2）及健康检查；多个应用实例需要把当前内存限流迁移到 Redis/Upstash 等共享存储。

## 4. 发布验收清单

在 Preview 和 Production 各做一次：

- 打开首页：搜索、今日冷知识、随机档案、主题切换和手机底部导航均正常。
- 搜索一部常见作品，确认四张卡、相关推荐、错误降级和芽衣对话可用。
- 打开 `/roam`，完成一次「下一条」与「深入了解」。
- 手机 Safari/Chrome：安装 PWA、生成分享卡、深浅主题和安全区无底部遮挡。
- 在浏览器 Network 中确认：无 5xx、无泄露 Key 的响应，图片和 Manifest 均为 200。
- 如开启 SSE：访问一部作品，确认卡片增量出现；若超过 30 秒无事件或 CDN 缓冲，立即关闭 `WORK_LORE_STREAMING` 并重新部署。
- 验证 `https://你的域名/robots.txt` 与 `https://你的域名/sitemap.xml`。

## 5. 上线后观察与回退

发布后首 24 小时观察平台函数错误、DeepSeek 调用失败率、429 限流和外源超时。发布前保留上一个可工作的部署；遇到严重故障可在平台控制台直接回滚到上一生产部署。若仅流式异常，优先把 `WORK_LORE_STREAMING` 设为 `false` 并重新部署，页面会回退到非流式稳定路径。

开发环境可访问 `/api/ops/metrics` 查看匿名聚合事件；所有环境可访问 `/api/ops/health` 做不含敏感信息的存活探测。

## 6. 发布后的工程待办

- 为多实例流量接入 Redis/Upstash 共享限流。
- 将运行期内容/用户数据迁至数据库或对象存储；当前本地文件只适合随构建发布。
- 为 Preview/Production 增加独立的错误监控与外源调用告警。
- 在 CI 中强制运行 `npm run check`，再允许合并到生产分支。
