import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: {
    default: "AnimeLore · 动画档案馆",
    template: "%s · AnimeLore"
  },
  description: "和芽衣一起翻开动画作品的梗、幕后、争议与创作谱系。",
  applicationName: "AnimeLore",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnimeLore"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F1E7" },
    { media: "(prefers-color-scheme: dark)", color: "#111713" }
  ]
};

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem("animelore.theme") || "system";
    const dark = saved === "dark" || (saved === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.themeMode = saved;
  } catch {
    document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.themeMode = "system";
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="paper-grain">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
