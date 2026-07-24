"use client";

import { useCallback, useState } from "react";

export type ShareImageState = {
  saving: boolean;
  error: string | null;
  dataUrl: string | null;
};

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function safeFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "animelore-share";
}

export function useShareCard() {
  const [state, setState] = useState<ShareImageState>({
    saving: false,
    error: null,
    dataUrl: null
  });

  const saveCard = useCallback(
    async (node: HTMLElement | null, filenameBase: string) => {
      if (!node) return;
      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(node, {
          backgroundColor: null,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scale: 1,
          width: 1080,
          height: 1440,
          windowWidth: 1080,
          windowHeight: 1440
        });
        const dataUrl = canvas.toDataURL("image/png");
        setState({ saving: false, error: null, dataUrl });
        downloadDataUrl(dataUrl, `${safeFilename(filenameBase)}.png`);
      } catch (e) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: (e as Error).message || "生成图片失败，可能是封面跨域限制"
        }));
      }
    },
    []
  );

  const resetShareImage = useCallback(() => {
    setState({ saving: false, error: null, dataUrl: null });
  }, []);

  return { ...state, saveCard, resetShareImage };
}
