"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { PwaCompanion } from "@/components/pwa-companion";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  {
    href: "/",
    label: "档案馆",
    shortLabel: "首页",
    icon: (
      <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4v-9.5Z" />
    )
  },
  {
    href: "/roam",
    label: "知识漫游",
    shortLabel: "漫游",
    icon: (
      <>
        <path d="M7 4h10l3 5-8 11L4 9l3-5Z" />
        <path d="m8.2 9 3.8 11L15.8 9M4 9h16M7 4l1.2 5L12 4l3.8 5L17 4" />
      </>
    )
  }
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const debug = pathname.startsWith("/debug");

  if (debug) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandMark />
          <nav className="hidden items-center gap-1 md:flex" aria-label="主要导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive(pathname, item.href)
                    ? "bg-brand/10 text-brand"
                    : "text-body hover:bg-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <div className="pb-[calc(5.5rem+var(--safe-bottom))] md:pb-0">{children}</div>

      <footer className="hidden border-t border-line/70 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted">
          <p>AnimeLore · 和芽衣一起整理每一份动画记忆</p>
          <p className="font-mono tracking-wider">LEGACY · MEME · BEHIND · LINEAGE</p>
        </div>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-canvas/92 pb-[var(--safe-bottom)] backdrop-blur-xl md:hidden"
        aria-label="移动端导航"
      >
        <div className="mx-auto grid max-w-sm grid-cols-2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                  active ? "text-brand" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>
      <PwaCompanion />
    </div>
  );
}
