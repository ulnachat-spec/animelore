"use client";

import { forwardRef, type CSSProperties } from "react";

export type ShareTemplate = "midnight" | "legend" | "bittersweet";
export type ShareOrientation = "portrait" | "landscape";
export type ShareTag = "已完结" | "二刷" | "神作" | "意难平" | "安利必看" | "还在追";
type Base = { template: ShareTemplate; orientation: ShareOrientation };
export type WorkShareCardProps = Base & { kind: "work"; workTitle: string; quote: string; coverImage?: string; tags: ShareTag[] };
export type ColdShareCardProps = Base & { kind: "cold"; hook: string; summary: string };
export type ShareCardCanvasProps = WorkShareCardProps | ColdShareCardProps;

export const SHARE_CARD_SIZES = {
  portrait: { width: 1080, height: 1440 },
  landscape: { width: 1600, height: 900 }
} as const;

const clip = (value: string, max: number) => value.trim().slice(0, max);

function Cover({ src, title, style }: { src?: string; title: string; style: CSSProperties }) {
  return src ? <img src={src} alt={title} crossOrigin="anonymous" style={{ objectFit: "cover", ...style }} /> : <div style={{ display: "grid", placeItems: "center", background: "rgba(127,127,127,.13)", fontSize: 42, fontWeight: 800, ...style }}>AnimeLore</div>;
}

function Mei({ size = 82 }: { size?: number }) {
  return <span style={{ display: "block", width: size, height: size, overflow: "hidden", border: "3px solid currentColor", borderRadius: 999 }}><img src="/brand/mei-avatar-v1.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span>;
}

function Footer({ accent, light }: { accent: string; light?: boolean }) {
  return <div style={{ position: "absolute", left: 78, right: 78, bottom: 38, display: "flex", justifyContent: "space-between", borderTop: `1px solid ${light ? "rgba(255,255,255,.18)" : "rgba(60,40,30,.2)"}`, paddingTop: 20, fontSize: 23 }}><strong>AnimeLore 动画档案馆</strong><span style={{ color: accent }}>把喜欢留成一页档案 ✦</span></div>;
}

function Midnight(props: ShareCardCanvasProps) {
  const { width, height } = SHARE_CARD_SIZES[props.orientation];
  const wide = props.orientation === "landscape";
  const accent = "#78aef8";
  return <div style={{ position: "relative", width, height, overflow: "hidden", color: "#f8fafc", background: "linear-gradient(145deg,#06142a,#0b1020 58%,#05070d)" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 12%,rgba(80,150,255,.38),transparent 30%),radial-gradient(circle at 82% 70%,rgba(110,76,255,.18),transparent 35%)" }} />
    <div style={{ position: "absolute", inset: 54, border: "1px solid rgba(255,255,255,.17)", borderRadius: 38 }} />
    <div style={{ position: "relative", height: "100%", padding: wide ? "70px 82px" : "82px 86px" }}>
      <div style={{ color: accent, letterSpacing: 5, fontSize: 23 }}>ANIMELORE · NIGHT ARCHIVE</div>
      {props.kind === "work" ? <div style={{ display: "grid", gridTemplateColumns: wide ? "520px 1fr" : "1fr", gap: 62, alignItems: "center", marginTop: 45 }}><Cover src={props.coverImage} title={props.workTitle} style={{ width: wide ? 500 : 520, height: wide ? 650 : 700, borderRadius: 34, boxShadow: "0 35px 100px rgba(0,0,0,.5)", justifySelf: "center" }} /><div style={{ textAlign: wide ? "left" : "center" }}><h1 style={{ margin: 0, fontFamily: '"Noto Serif SC","Songti SC",serif', fontSize: wide ? 74 : 58, lineHeight: 1.15 }}>{clip(props.workTitle, 34)}</h1><p style={{ marginTop: 38, fontSize: wide ? 47 : 44, lineHeight: 1.42, fontWeight: 750 }}>“{clip(props.quote || "这部值得留一张追番打卡。", wide ? 74 : 48)}”</p><div style={{ display: "flex", gap: 14, justifyContent: wide ? "flex-start" : "center" }}>{props.tags.slice(0,2).map(tag=><span key={tag} style={{ border: `1px solid ${accent}88`, borderRadius: 999, padding: "10px 20px", color: accent, fontSize: 25 }}>#{tag}</span>)}</div></div></div> : <div style={{ marginTop: wide ? 105 : 220, maxWidth: wide ? 1260 : 870 }}><div style={{ position: "absolute", right: 95, top: 72, color: accent }}><Mei size={116}/></div><h1 style={{ margin: 0, fontFamily: '"Noto Serif SC","Songti SC",serif', fontSize: wide ? 88 : 76, lineHeight: 1.2 }}>{clip(props.hook, wide ? 66 : 48)}</h1><div style={{ width: 110, height: 8, marginTop: 40, borderRadius: 9, background: accent }} /><p style={{ marginTop: 40, color: "#b6c2d4", fontSize: wide ? 42 : 38, lineHeight: 1.7 }}>{clip(props.summary, wide ? 190 : 125)}</p></div>}
      <Footer accent={accent} light />
    </div>
  </div>;
}

function Legend(props: ShareCardCanvasProps) {
  const { width, height } = SHARE_CARD_SIZES[props.orientation];
  const wide = props.orientation === "landscape";
  const accent = "#a83f30";
  return <div style={{ position: "relative", width, height, overflow: "hidden", color: "#2e211a", background: "#ead8bf" }}>
    <div style={{ position: "absolute", inset: 34, border: `2px solid ${accent}`, background: "#fff9ed", boxShadow: "inset 0 0 0 12px #f3e6d1" }} />
    <div style={{ position: "absolute", right: 62, top: 55, width: 126, height: 126, display: "grid", placeItems: "center", border: `6px double ${accent}`, borderRadius: 999, color: accent, fontWeight: 900, fontSize: 32, textAlign: "center", transform: "rotate(8deg)" }}>典藏<br/>印</div>
    <div style={{ position: "relative", height: "100%", padding: wide ? "76px 92px" : "90px 92px" }}><div style={{ color: accent, fontSize: 23, letterSpacing: 7 }}>ARCHIVE No. {props.kind === "work" ? "作品" : "冷知识"}</div>
      {props.kind === "work" ? <div style={{ display: "grid", gridTemplateColumns: wide ? "430px 1fr" : "1fr", gap: 70, marginTop: 46, alignItems: "center" }}><div style={{ position: "relative", justifySelf: "center" }}><Cover src={props.coverImage} title={props.workTitle} style={{ width: wide ? 400 : 470, height: wide ? 600 : 665, border: "14px solid #ead7bd", outline: `2px solid ${accent}`, transform: "rotate(-1.5deg)" }}/><span style={{ position: "absolute", left: -28, top: 30, writingMode: "vertical-rl", background: accent, color: "white", padding: "18px 10px", letterSpacing: 6, fontSize: 20 }}>动画档案</span></div><div><p style={{ color: accent, fontSize: 27, letterSpacing: 4 }}>本日收藏</p><h1 style={{ margin: "16px 0 0", fontFamily: '"Noto Serif SC","Songti SC",serif', fontSize: wide ? 80 : 62, lineHeight: 1.18 }}>{clip(props.workTitle, 36)}</h1><p style={{ marginTop: 40, paddingLeft: 28, borderLeft: `8px solid ${accent}`, fontFamily: '"Noto Serif SC","Songti SC",serif', fontSize: wide ? 46 : 43, lineHeight: 1.55 }}>“{clip(props.quote, wide ? 84 : 50)}”</p></div></div> : <div style={{ marginTop: wide ? 100 : 195, display: "grid", gridTemplateColumns: wide ? "1fr 340px" : "1fr", gap: 70 }}><div><p style={{ color: accent, fontSize: 28 }}>卷宗摘录 · 今日反常识</p><h1 style={{ fontFamily: '"Noto Serif SC","Songti SC",serif', fontSize: wide ? 82 : 72, lineHeight: 1.22 }}>{clip(props.hook, wide ? 70 : 48)}</h1><p style={{ fontSize: wide ? 38 : 36, lineHeight: 1.75 }}>{clip(props.summary, wide ? 190 : 125)}</p></div>{wide ? <div style={{ alignSelf: "center", border: "1px solid rgba(99,68,49,.22)", padding: 38, color: accent, textAlign: "center" }}><Mei size={116}/><p style={{ fontSize: 27, lineHeight: 1.6 }}>芽衣已核对<br/>适合收藏后慢慢读</p></div> : null}</div>}
      <Footer accent={accent}/></div>
  </div>;
}

function Scrapbook(props: ShareCardCanvasProps) {
  const { width, height } = SHARE_CARD_SIZES[props.orientation];
  const wide = props.orientation === "landscape";
  const accent = "#8b5969";
  return <div style={{ position: "relative", width, height, overflow: "hidden", color: "#312a2a", background: "linear-gradient(135deg,#d8c7b5,#efe2cf)" }}>
    <div style={{ position: "absolute", inset: 48, borderRadius: 30, background: "#fbf4e8", boxShadow: "0 25px 80px rgba(70,45,35,.22)" }}/><div style={{ position: "absolute", left: wide ? 700 : 110, top: 46, width: 220, height: 52, background: "rgba(188,151,112,.42)", transform: "rotate(-3deg)" }}/>
    <div style={{ position: "relative", height: "100%", padding: wide ? "76px 88px" : "86px 82px" }}><div style={{ display: "flex", alignItems: "center", gap: 20, color: accent }}><Mei/><div><strong style={{ fontSize: 31 }}>芽衣的观后手帐</strong><div style={{ fontSize: 20, letterSpacing: 4 }}>ANIMELORE SCRAPBOOK</div></div></div>
      {props.kind === "work" ? <div style={{ display: "grid", gridTemplateColumns: wide ? "560px 1fr" : "1fr", gap: 62, marginTop: 42, alignItems: "center" }}><div style={{ justifySelf: "center", transform: "rotate(-2deg)", padding: 20, background: "#fff", boxShadow: "0 22px 55px rgba(72,45,35,.25)" }}><Cover src={props.coverImage} title={props.workTitle} style={{ width: wide ? 500 : 540, height: wide ? 600 : 700 }}/><div style={{ padding: "16px 6px 4px", fontFamily: '"KaiTi",cursive', fontSize: 25, color: "#7b6b66" }}>今天也把喜欢留了下来。</div></div><div><h1 style={{ margin: 0, fontFamily: '"Noto Serif SC","KaiTi",serif', fontSize: wide ? 74 : 58, lineHeight: 1.2 }}>{clip(props.workTitle, 35)}</h1><p style={{ marginTop: 36, padding: "30px 34px", borderRadius: "8px 26px", background: "#f0dfca", fontFamily: '"KaiTi","Noto Serif SC",serif', fontSize: wide ? 43 : 40, lineHeight: 1.55, transform: "rotate(1deg)" }}>{clip(props.quote, wide ? 90 : 52)}</p><div style={{ display: "flex", gap: 12 }}>{props.tags.slice(0,2).map(tag=><span key={tag} style={{ padding: "10px 18px", border: `2px dashed ${accent}`, borderRadius: 12, color: accent, fontSize: 24 }}>#{tag}</span>)}</div></div></div> : <div style={{ marginTop: wide ? 75 : 175, display: "grid", gridTemplateColumns: wide ? "1fr 420px" : "1fr", gap: 70 }}><div><h1 style={{ margin: 0, fontFamily: '"Noto Serif SC","KaiTi",serif', fontSize: wide ? 78 : 70, lineHeight: 1.2 }}>{clip(props.hook, wide ? 70 : 48)}</h1><p style={{ marginTop: 45, fontFamily: '"KaiTi","Noto Serif SC",serif', fontSize: wide ? 39 : 37, lineHeight: 1.75 }}>{clip(props.summary, wide ? 190 : 125)}</p></div>{wide ? <div style={{ alignSelf: "center", padding: 36, background: "#f0dfca", fontFamily: '"KaiTi",serif', fontSize: 30, lineHeight: 1.65, transform: "rotate(2deg)" }}>“反常识最好玩的地方，不是把人考倒，而是让熟悉的作品突然多出一扇门。”<br/><span style={{ color: accent }}>— 芽衣</span></div> : null}</div>}
      <Footer accent={accent}/></div>
  </div>;
}

export const ShareCardCanvas = forwardRef<HTMLDivElement, ShareCardCanvasProps>(function ShareCardCanvas(props, ref) {
  return <div ref={ref} style={{ position: "relative", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif' }}>{props.template === "midnight" ? <Midnight {...props}/> : props.template === "legend" ? <Legend {...props}/> : <Scrapbook {...props}/>}</div>;
});
