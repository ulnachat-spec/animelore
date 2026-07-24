import { LorePayload, WorkMeta } from "@/lib/types";

export function fallbackLore(meta: WorkMeta): LorePayload {
  const title = meta.title || "这部作品";
  return {
    work_title: title,
    cards: [
      {
        id: "legacy",
        en_label: "LEGACY",
        zh_name: "封神还是翻车",
        headline: "它最强的不是热度，而是争议后的长尾生命力",
        intro: `${title} 的评价并不总是一致，但每次讨论都会被重新拉回核心命题。`,
        points: [
          "早期口碑和后期评价存在明显分层，说明它并非只靠短期流量。",
          "讨论焦点常落在价值观和叙事取舍，而不是单一战力或设定细节。",
          "即使完结后，相关切片与二创仍长期活跃。"
        ],
        source: "via AniList · Wikipedia · community",
        source_urls: []
      },
      {
        id: "meme",
        en_label: "MEME",
        zh_name: "梗从哪来",
        headline: "它的梗不是一句台词，而是一整套社交暗号",
        intro: "很多人没看完作品，也能听懂其中几个高频梗。",
        points: [
          "梗的传播路径通常是名场面切片 -> 二创改编 -> 圈外扩散。",
          "同一个梗在不同社区会有不同语气，形成“圈内版”和“通用版”。",
          "据说部分梗的原始语境已被淡化，只保留情绪价值。"
        ],
        source: "via Wikipedia · zh.moegirl.org.cn",
        source_urls: []
      },
      {
        id: "behind",
        en_label: "BEHIND",
        zh_name: "幕后现场",
        headline: "制作组的关键选择，改变了你看到的节奏和情绪",
        intro: "这部作品的观感，很大程度来自制作端的取舍。",
        points: [
          "分镜节奏与音乐落点共同塑造了“名场面记忆点”。",
          "有说法认为，部分桥段在制作阶段做过明显重排以强化情绪。",
          "声优演出与配乐设计是角色讨论度持续走高的核心原因之一。"
        ],
        source: "via AniList · Wikipedia · community",
        source_urls: []
      },
      {
        id: "lineage",
        en_label: "LINEAGE",
        zh_name: "家族树",
        headline: "顺着创作谱系往回看，你会发现它不是孤例",
        intro: "这部作品背后的人和团队，往往在别的作品里留下了同样的风格指纹。",
        points: [
          "导演/监督谱系：同一创作者在其他作品中延续了类似的叙事节奏与主题偏好。",
          "制作公司档案：同工作室出品常共享演出风格和技术路线，能解释观感上的“熟悉感”。",
          "声优与原作者关联：如果你喜欢本作角色塑造，优先补这条谱系上的代表作。"
        ],
        source: "via AniList",
        source_urls: []
      }
    ],
    bottom_hook: {
      work: "Fullmetal Alchemist: Brotherhood",
      hook: "这部作品里最残酷的一课，其实第一集就偷偷埋下了。"
    }
  };
}
