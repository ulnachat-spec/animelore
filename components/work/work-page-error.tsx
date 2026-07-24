import Link from "next/link";
import { MeiState } from "@/components/mei-state";

export function WorkPageError({
  query,
  code,
  message
}: {
  query: string;
  code: string;
  message: string;
}) {
  const keyHint =
    code === "missing_api_key" ? (
      <>
        请确认项目根目录的 `.env` 或 `.env.local` 里已配置{" "}
        <code className="rounded bg-soft px-1">DEEPSEEK_API_KEY</code>
        ，保存后重启 <code className="rounded bg-soft px-1">npm run dev</code>。
      </>
    ) : (
      <>
        服务端错误代码：<code className="rounded bg-soft px-1">{code}</code>
        。请查看运行 <code className="rounded bg-soft px-1">npm run dev</code> 的终端日志。
      </>
    );

  return (
    <div className="mt-8">
      <MeiState
        eyebrow="档案暂时卡住了"
        title={`芽衣还没取到《${query}》`}
        description={keyHint}
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="archive-button-primary">
            返回档案馆
          </Link>
          <Link href={`/work/${encodeURIComponent(query)}`} className="archive-button">
            再试一次
          </Link>
        </div>
      </MeiState>
      <details className="mt-4 rounded-lg border border-line bg-surface/85 p-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium">查看技术信息</summary>
        <p className="mt-2 break-words font-mono">{message}</p>
      </details>
    </div>
  );
}
