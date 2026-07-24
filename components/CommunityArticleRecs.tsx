import type { CommunityArticleRec, CommunityArticleSource } from "@/lib/types";

const SOURCE_LABELS: Record<CommunityArticleSource, string> = {
  bilibili: "B站专栏",
  nga: "NGA",
  aweidao: "阿苇岛",
  zhihu: "知乎",
  douban: "豆瓣",
  bangumi: "Bangumi",
  manual: "精选",
  web: "外链"
};

function sourceLabel(source: CommunityArticleSource): string {
  return SOURCE_LABELS[source] || source;
}

export function CommunityArticleRecs({
  recs,
  showDivider = true
}: {
  recs: CommunityArticleRec[];
  /** 与上方 bottom_hook 之间是否显示分隔线 */
  showDivider?: boolean;
}) {
  if (!recs.length) return null;

  return (
    <section
      className={
        showDivider ? "mt-6 border-t border-zinc-800 pt-5" : "mt-5"
      }
    >
      <h2 className="text-sm font-medium text-zinc-300">中文社区考据与创作</h2>
      <p className="mt-1 text-xs text-zinc-500">
        延伸阅读，非官方事实来源；观点来自对应社区原文。
      </p>
      <ul className="mt-4 space-y-4">
        {recs.map((rec) => (
          <li key={rec.id} className="border-b border-zinc-800/80 pb-4 last:border-0 last:pb-0">
            <ArticleRow rec={rec} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function displayUrl(url: string): string {
  if (!url) return url;
  if (/\/opus\/\d+/i.test(url)) {
    const m = url.match(/\/opus\/(\d+)/i);
    if (m) return `https://www.bilibili.com/opus/${m[1]}`;
  }
  if (/\/read\/cv\d+/i.test(url)) {
    const m = url.match(/\/read\/cv(\d+)/i);
    if (m) return `https://www.bilibili.com/read/cv${m[1]}`;
  }
  return url;
}

function ArticleRow({ rec }: { rec: CommunityArticleRec }) {
  const metaParts = [rec.author, rec.published_at].filter(Boolean);
  const href = displayUrl(rec.url);
  const isBilibili = rec.source === "bilibili";

  return (
    <article>
      <SourceBadge source={rec.source} />
      <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-100">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand hover:underline"
        >
          {rec.title}
        </a>
      </h3>
      {metaParts.length > 0 ? (
        <p className="mt-1 text-xs text-zinc-500">{metaParts.join(" · ")}</p>
      ) : null}
      {isBilibili ? (
        <p className="mt-1 text-[11px] text-zinc-600">
          B站页面首次打开较慢时，可刷新重试
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{rec.reason}</p>
    </article>
  );
}

function SourceBadge({ source }: { source: CommunityArticleSource }) {
  return (
    <span className="inline-block rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
      {sourceLabel(source)}
    </span>
  );
}
