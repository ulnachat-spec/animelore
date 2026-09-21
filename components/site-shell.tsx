"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { MotionPreferenceSync } from "@/components/motion-preference-sync";
import { PwaCompanion } from "@/components/pwa-companion";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  {
    href: "/",
    label: "动画档案馆",
    shortLabel: "档案馆",
    icon: <path d="M4 6.5h6l2 2h8V20H4V6.5Z" />
  },
  {
    href: "/roam",
    label: "知识漫游",
    shortLabel: "漫游",
    icon: (
      <>
        <path d="M7 4h10l3 5-8 11L4 9l3-5Z" />
        <path d="m8.2 9 3.8 11L15.8 9M4 9h16" />
      </>
    )
  },
  {
    href: "/library",
    label: "我的书架",
    shortLabel: "书架",
    icon: (
      <>
        <path d="M5 4h5v16H5zM10 6h5v14h-5zM15 3.5l4 1.5-1.2 15-4-1.5z" />
      </>
    )
  },
  {
    href: "/me",
    label: "我的档案",
    shortLabel: "我的",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
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
      <MotionPreferenceSync />
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandMark />
          <nav className="hidden items-center gap-1 md:flex" aria-label="主要导航">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-canvas/94 pb-[var(--safe-bottom)] backdrop-blur-xl md:hidden"
        aria-label="移动端导航"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="mobile-nav-indicator" aria-hidden="true" />
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
