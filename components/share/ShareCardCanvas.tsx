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
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export const ShareCardCanvas = forwardRef<HTMLDivElement, ShareCardCanvasProps>(
  function ShareCardCanvas(props, ref) {
    if (props.kind === "cold") {
      const styles = templateStyles.midnight;
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
          <div
            style={{
              position: "absolute",
              inset: 72,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: 58,
              background: "rgba(5, 9, 18, 0.64)",
              boxShadow: "0 36px 120px rgba(0,0,0,0.38)"
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: "96px 92px" }}>
            <div
              style={{
                display: "inline-flex",
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(96, 165, 250, 0.45)",
                background: styles.tag,
                color: "#bfdbfe",
                fontSize: 28,
                letterSpacing: 2
              }}
            >
              二次元冷知识 / AnimeLore
            </div>
            <h1
              style={{
                margin: "210px 0 0",
                fontSize: 78,
                lineHeight: 1.15,
                letterSpacing: -2,
                textAlign: "center",
                fontWeight: 800
              }}
            >
              {truncateText(props.hook, 42)}
            </h1>
            <p
              style={{
                margin: "80px auto 0",
                maxWidth: 820,
                color: "#d4d4d8",
                fontSize: 42,
                lineHeight: 1.65,
                textAlign: "center"
              }}
            >
              {truncateText(props.summary, 68)}
            </p>
            <div
              style={{
                margin: "220px auto 0",
                width: 720,
                borderTop: "1px solid rgba(148, 163, 184, 0.28)"
              }}
            />
            <p
              style={{
                marginTop: 34,
                textAlign: "center",
                color: "#e5e7eb",
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: 1
              }}
            >
              AnimeLore
            </p>
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
