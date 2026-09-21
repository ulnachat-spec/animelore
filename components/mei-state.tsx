import Image from "next/image";
import type { ReactNode } from "react";

export function MeiState({
  eyebrow = "芽衣的档案桌",
  title,
  description,
  children,
  compact = false
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`archive-card overflow-hidden ${
        compact ? "grid grid-cols-[88px_1fr] items-center gap-4 p-4" : "p-5 sm:p-7"
      }`}
    >
      <div
        className={
          compact
            ? "relative aspect-square overflow-hidden rounded-2xl bg-canvas-tint"
            : "mx-auto max-w-[230px]"
        }
      >
        <Image
          src="/brand/mei-chibi-research-v1.png"
          alt="Q 版芽衣正在档案桌前查找资料"
          width={512}
          height={512}
          sizes={compact ? "88px" : "(max-width: 640px) 58vw, 230px"}
          className="h-auto w-full object-contain"
        />
      </div>
      <div className={compact ? "min-w-0" : "mx-auto mt-4 max-w-xl text-center"}>
        <p className="archive-kicker text-brand">{eyebrow}</p>
        <h2
          className={`font-display font-semibold text-ink ${
            compact ? "mt-1 text-base" : "mt-2 text-xl sm:text-2xl"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <div className={`leading-7 text-body ${compact ? "mt-1 text-sm" : "mt-3 text-sm sm:text-base"}`}>
            {description}
          </div>
        ) : null}
        {children ? <div className={compact ? "mt-3" : "mt-5"}>{children}</div> : null}
      </div>
    </section>
  );
}
