"use client";

import { forwardRef } from "react";

export type ShareTemplate = "midnight" | "legend" | "bittersweet";

export type ShareTag =
  | "已完结"
  | "二刷"
  | "神作"
  | "意难平"
  | "安利必看"
  | "还在追";

export type WorkShareCardProps = {
  kind: "work";
  template: ShareTemplate;
  workTitle: string;
  quote: string;
  coverImage?: string;
  tags: ShareTag[];
};

export type ColdShareCardProps = {
  kind: "cold";
  template: ShareTemplate;
  hook: string;
  summary: string;
};

export type ShareCardCanvasProps = WorkShareCardProps | ColdShareCardProps;

const templateStyles: Record<
  ShareTemplate,
  {
    bg: string;
    glow: string;
    panel: string;
    accent: string;
    tag: string;
  }
> = {
  midnight: {
    bg: "linear-gradient(160deg, #050915 0%, #0b1328 48%, #05060b 100%)",
    glow:
      "radial-gradient(circle at 20% 12%, rgba(59,130,246,0.34), transparent 34%), radial-gradient(circle at 85% 34%, rgba(99,102,241,0.18), transparent 28%)",
    panel: "rgba(8, 13, 27, 0.78)",
    accent: "#60a5fa",
    tag: "rgba(96, 165, 250, 0.18)"
  },
  legend: {
    bg: "linear-gradient(155deg, #140707 0%, #32100b 46%, #110b04 100%)",
    glow:
      "radial-gradient(circle at 18% 14%, rgba(245,158,11,0.38), transparent 34%), radial-gradient(circle at 86% 30%, rgba(220,38,38,0.24), transparent 30%)",
    panel: "rgba(28, 10, 6, 0.78)",
    accent: "#fbbf24",
    tag: "rgba(251, 191, 36, 0.18)"
  },
  bittersweet: {
    bg: "linear-gradient(160deg, #090914 0%, #1c1a2e 48%, #09090f 100%)",
    glow:
      "radial-gradient(circle at 20% 14%, rgba(168,85,247,0.26), transparent 34%), radial-gradient(circle at 82% 30%, rgba(148,163,184,0.20), transparent 30%)",
    panel: "rgba(18, 17, 31, 0.80)",
    accent: "#c4b5fd",
    tag: "rgba(196, 181, 253, 0.18)"
  }
};

function truncateText(text: string, max: number): string {
  const clean = text.trim();
  return clean.slice(0, max);
}

export const ShareCardCanvas = forwardRef<HTMLDivElement, ShareCardCanvasProps>(
  function ShareCardCanvas(props, ref) {
    if (props.kind === "cold") {
      const styles = templateStyles[props.template];
      return (
        <div
          ref={ref}
          style={{
            position: "relative",
            width: 1080,
            height: 1440,
            overflow: "hidden",
            background: styles.bg,
            color: "#f8fafc",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: styles.glow }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24, background: styles.accent }} />
          <div style={{ position: "absolute", inset: 58, border: "1px solid rgba(255,255,255,0.20)", borderRadius: 44, background: styles.panel, boxShadow: "0 36px 120px rgba(0,0,0,0.34)" }} />
          <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "86px 88px" }}>
            <div
              style={{
                display: "inline-flex",
                padding: "12px 22px",
                borderRadius: 999,
                border: `1px solid ${styles.accent}88`,
                background: styles.tag,
                color: "#f8fafc",
                fontSize: 28,
                letterSpacing: 2
              }}
            >
              ANIMELORE · COLD NOTE
            </div>
            <div style={{ position: "absolute", right: 90, top: 76, width: 116, height: 116, borderRadius: 999, overflow: "hidden", border: `3px solid ${styles.accent}`, background: "rgba(255,255,255,.12)" }}>
              <img src="/brand/mei-avatar-v1.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1
              style={{
                margin: "230px 0 0",
                maxWidth: 860,
                fontFamily: '"Noto Serif SC", "Songti SC", Georgia, serif',
                fontSize: 76,
                lineHeight: 1.2,
                letterSpacing: -2,
                textAlign: "left",
                fontWeight: 700
              }}
            >
              {truncateText(props.hook, 48)}
            </h1>
            <div style={{ marginTop: 52, width: 92, height: 8, borderRadius: 999, background: styles.accent }} />
            <p
              style={{
                margin: "46px 0 0",
                maxWidth: 850,
                color: "#e7e1d7",
                fontSize: 39,
                lineHeight: 1.72,
                textAlign: "left"
              }}
            >
              {truncateText(props.summary, 120)}
            </p>
            <div style={{ position: "absolute", left: 88, right: 88, bottom: 108, borderTop: "1px solid rgba(255,255,255,.20)", paddingTop: 26, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#eee7dc", fontSize: 27 }}>
              <span style={{ fontFamily: '"Noto Serif SC", Georgia, serif', fontWeight: 700 }}>AnimeLore 动画档案馆</span>
              <span style={{ color: styles.accent }}>芽衣的今日书签 ✦</span>
            </div>
          </div>
        </div>
      );
    }

    const styles = templateStyles[props.template];
    const hasCover = Boolean(props.coverImage);
    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: 1080,
          height: 1440,
          overflow: "hidden",
          background: styles.bg,
          color: "#f8fafc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        }}
      >
        {hasCover ? (
          <img
            src={props.coverImage}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: -36,
              width: 1152,
              height: 1512,
              objectFit: "cover",
              filter: "blur(34px) saturate(1.18)",
              opacity: 0.28,
              transform: "scale(1.06)"
            }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: styles.glow }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.62) 100%)"
          }}
        />
        <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "62px 76px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.24)",
                color: "#d4d4d8",
                fontSize: 24,
                letterSpacing: 2
              }}
            >
              追番打卡 / AnimeLore
            </div>
          </div>

          <div
            style={{
              margin: "52px auto 0",
              width: 600,
              height: 790,
              borderRadius: 42,
              overflow: "hidden",
              background: styles.panel,
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 42px 110px rgba(0,0,0,0.48)"
            }}
          >
            {hasCover ? (
              <img
                src={props.coverImage}
                alt={props.workTitle}
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 52,
                  color: "#94a3b8",
                  fontSize: 42,
                  lineHeight: 1.3,
                  textAlign: "center"
                }}
              >
                AnimeLore
              </div>
            )}
          </div>

          <h1
            style={{
              margin: "46px auto 0",
              maxWidth: 880,
              textAlign: "center",
              fontSize: 56,
              lineHeight: 1.14,
              fontWeight: 800,
              letterSpacing: -1
            }}
          >
            {truncateText(props.workTitle, 28)}
          </h1>

          <p
            style={{
              margin: "34px auto 0",
              maxWidth: 850,
              minHeight: 150,
              textAlign: "center",
              fontSize: 56,
              lineHeight: 1.24,
              fontWeight: 800,
              letterSpacing: -1
            }}
          >
            “{truncateText(props.quote || "这部值得留一张追番打卡。", 42)}”
          </p>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 16,
              justifyContent: "center",
              minHeight: 54
            }}
          >
            {props.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: styles.tag,
                  border: `1px solid ${styles.accent}66`,
                  color: "#f8fafc",
                  fontSize: 26,
                  fontWeight: 700
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              left: 96,
              right: 96,
              bottom: 70,
              borderTop: "1px solid rgba(255,255,255,0.18)"
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 96,
              right: 96,
              bottom: 28,
              display: "flex",
              justifyContent: "space-between",
              color: "#e5e7eb",
              fontSize: 25,
              letterSpacing: 1
            }}
          >
            <span style={{ fontWeight: 800 }}>AnimeLore</span>
            <span style={{ color: "#a1a1aa" }}>作品图鉴 · 追番打卡</span>
          </div>
        </div>
      </div>
    );
  }
);
