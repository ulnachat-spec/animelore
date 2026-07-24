"use client";

import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";
import {
  emptyUserLibrary,
  exportLibrary,
  importLibrary,
  MotionPreference
} from "@/lib/user-library";
import { useUserLibrary } from "@/lib/use-user-library";

export function ProfilePage() {
  const { library, ready, update, updatePreferences } = useUserLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");

  const download = () => {
    const blob = new Blob([exportLibrary(library)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `animelore-library-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("本地档案已导出");
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      update(importLibrary(await file.text()));
      setNotice("档案已导入");
    } catch {
      setNotice("无法读取这份档案文件");
    }
    event.target.value = "";
  };

  const clear = () => {
    if (!window.confirm("确定清空本机的收藏、历史和偏好吗？此操作无法撤销。")) return;
    update(emptyUserLibrary());
    setNotice("本地数据已清空");
  };

  const tags = [...new Set([...library.preferences.likedTags, ...library.preferences.likedSeeds])].slice(0, 12);

  return (
    <main className="mx-auto min-h-[calc(100svh-4.5rem)] max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <section className="archive-card relative overflow-hidden p-5 sm:p-7">
        <div className="absolute inset-y-0 right-0 hidden w-64 sm:block">
          <Image
            src="/brand/mei-chibi-research-v1.png"
            alt=""
            fill
            sizes="256px"
            className="object-cover object-top opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/65 to-transparent" />
        </div>
        <div className="relative max-w-2xl">
          <p className="archive-kicker text-brand">My archive · 本地档案</p>
          <h1 className="archive-title mt-3 text-3xl sm:text-4xl">我的 AnimeLore</h1>
          <p className="mt-3 text-sm leading-7 text-body">
            这里不是账号中心，而是你在这台设备上的阅读习惯。数据默认不离开浏览器，你可以随时导出带走。
          </p>
          <div className="mt-5 flex gap-6 text-sm">
            <span><strong className="font-display text-2xl text-brand">{library.favorites.length}</strong><small className="ml-1 text-muted">收藏</small></span>
            <span><strong className="font-display text-2xl text-brand">{library.history.length}</strong><small className="ml-1 text-muted">足迹</small></span>
            <span><strong className="font-display text-2xl text-brand">{library.readLater.length}</strong><small className="ml-1 text-muted">稍后</small></span>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="archive-card p-5 sm:p-6">
          <p className="archive-kicker">阅读舒适度</p>
          <h2 className="archive-title mt-2 text-xl">页面动效</h2>
          <p className="mt-2 text-sm leading-6 text-body">跟随系统是默认选择；减少动画会保留必要的状态反馈。</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              ["system", "跟随系统"],
              ["full", "标准"],
              ["reduced", "减少"]
            ] as Array<[MotionPreference, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updatePreferences({ motion: value })}
                aria-pressed={library.preferences.motion === value}
                className={`min-h-11 rounded-xl border px-2 text-xs font-medium ${
                  library.preferences.motion === value
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-line text-body hover:bg-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="archive-card p-5 sm:p-6">
          <p className="archive-kicker">兴趣画像</p>
          <h2 className="archive-title mt-2 text-xl">漫游正在了解的你</h2>
          <div className="mt-4 flex min-h-16 flex-wrap content-start gap-2">
            {tags.length ? tags.map((tag) => (
              <span key={tag} className="rounded-full border border-sage/40 bg-sage/10 px-3 py-1.5 text-xs text-sage">
                {tag}
              </span>
            )) : <p className="text-sm leading-6 text-muted">多漫游几次后，感兴趣的主题会出现在这里。</p>}
          </div>
        </section>
      </div>

      <section className="archive-card mt-5 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="archive-kicker">数据与隐私</p>
            <h2 className="archive-title mt-2 text-xl">掌握自己的本地档案</h2>
            <p className="mt-2 text-sm text-body">导出文件可用于换设备、备份或恢复。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} disabled={!ready} className="archive-button-primary">
              导出档案
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="archive-button">
              导入档案
            </button>
            <button type="button" onClick={clear} className="archive-button text-muted">
              清空数据
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </div>
        </div>
        <p className="mt-3 min-h-5 text-xs text-brand" role="status" aria-live="polite">{notice}</p>
      </section>
    </main>
  );
}
