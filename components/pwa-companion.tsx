"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "animelore.pwa-install-dismissed";

export function PwaCompanion() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  };

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5rem+var(--safe-bottom))] z-50 mx-auto max-w-sm rounded-2xl border border-line bg-elevated p-3 shadow-float md:bottom-5 md:left-auto md:right-5 md:mx-0">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-white">
          AL
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">把档案馆装到主屏幕</p>
          <p className="mt-0.5 text-xs text-muted">独立窗口打开，更像一款 App。</p>
        </div>
        <button type="button" onClick={install} className="archive-button-primary min-h-9 px-3 text-xs">
          安装
        </button>
        <button
          type="button"
          aria-label="关闭安装提示"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setInstallEvent(null);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
