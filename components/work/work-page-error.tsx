import Link from "next/link";
import { MeiState } from "@/components/mei-state";

function publicMessage(code: string): string {
  if (code === "missing_api_key") {
    return "服务配置暂时不可用，不是你的操作有问题。可以先浏览其他档案，稍后再回来。";
  }
  if (code.includes("timeout") || code.includes("network")) {
    return "资料源这次响应得太慢了。换个网络或稍后重试，刚才的检索词不用重新输入。";
  }
  if (code.includes("not_found")) {
    return "可能是标题、译名或罗马音没有匹配上。试试去掉书名号，或使用官方英文标题。";
  }
  return "这次取档没有完成。你可以再试一次，或者换用日文原名、英文名或常见简称。";
}

export function WorkPageError({
  query,
  code,
  message
}: {
  query: string;
  code: string;
  message: string;
}) {
  return (
    <div className="mt-8">
      <MeiState
        eyebrow="档案暂时卡住了"
        title={`芽衣还没取到《${query}》`}
        description={publicMessage(code)}
      >
        <div className="flex flex-wrap justify-center gap-3">
          <a href={`/work/${encodeURIComponent(query)}`} className="archive-button-primary">
            再试一次
          </a>
          <Link href="/" className="archive-button">
            换个检索词
          </Link>
          <Link href="/roam" className="archive-button">
            先去知识漫游
          </Link>
        </div>
      </MeiState>
      {process.env.NODE_ENV === "development" ? (
        <details className="mt-4 rounded-lg border border-line bg-surface/85 p-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium">开发环境技术信息</summary>
          <p className="mt-2 font-mono">code: {code}</p>
          <p className="mt-2 break-words font-mono">{message}</p>
        </details>
      ) : null}
    </div>
  );
}
