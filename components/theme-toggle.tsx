"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const choices: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "light", label: "日间", icon: "☀" },
  { mode: "dark", label: "夜间", icon: "☾" },
  { mode: "system", label: "跟随系统", icon: "◐" }
];

function applyTheme(mode: ThemeMode) {
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.dataset.themeMode = mode;
  localStorage.setItem("animelore.theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = localStorage.getItem("animelore.theme");
    const initial: ThemeMode =
      saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setMode(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("animelore.theme") || "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const active = choices.find((choice) => choice.mode === mode) ?? choices[2];

  return (
    <details className="group relative">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-body transition hover:border-brand/50 hover:text-ink [&::-webkit-details-marker]:hidden"
        aria-label={`主题：${active.label}`}
      >
        <span aria-hidden>{active.icon}</span>
        <span className="hidden sm:inline">{active.label}</span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-36 overflow-hidden rounded-xl border border-line bg-elevated p-1.5 shadow-float">
        {choices.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            onClick={(event) => {
              setMode(choice.mode);
              applyTheme(choice.mode);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition ${
              mode === choice.mode
                ? "bg-brand/12 font-semibold text-brand"
                : "text-body hover:bg-soft hover:text-ink"
            }`}
          >
            <span aria-hidden>{choice.icon}</span>
            {choice.label}
          </button>
        ))}
      </div>
    </details>
  );
}
