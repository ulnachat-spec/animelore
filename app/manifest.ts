import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AnimeLore · 动画档案馆",
    short_name: "AnimeLore",
    description: "和芽衣一起翻开动画作品的梗、幕后、争议与创作谱系。",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "zh-CN",
    display: "standalone",
    background_color: "#F7F1E7",
    theme_color: "#A64B37",
    orientation: "portrait-primary",
    categories: ["entertainment", "education", "lifestyle"],
    icons: [
      {
        src: "/brand/mei-avatar-v1.png",
        sizes: "1536x1536",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/brand/mei-avatar-v1.png",
        sizes: "1536x1536",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
