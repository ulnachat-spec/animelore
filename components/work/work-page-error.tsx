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
        <code className="rounded bg-zinc-800 px-1">DEEPSEEK_API_KEY</code>
        ，保存后重启 <code className="rounded bg-zinc-800 px-1">npm run dev</code>。
      </>
    ) : (
      <>
        服务端错误代码：<code className="rounded bg-zinc-800 px-1">{code}</code>
        。请查看运行 <code className="rounded bg-zinc-800 px-1">npm run dev</code> 的终端日志。
      </>
    );

  return (
    <div className="mt-8">
      <p className="text-zinc-300">
        暂时没取到《{query}》的数据。{keyHint}
      </p>
      <p className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 font-mono text-xs text-zinc-400">
        {message}
      </p>
    </div>
  );
}

