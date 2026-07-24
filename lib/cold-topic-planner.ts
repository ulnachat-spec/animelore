import type {
  ColdContrastAngle,
  ColdTopicPlan,
  ConceptWritingAngle
} from "@/lib/cold-types";
import type { ColdTopicType } from "@/lib/types";

type SeedEntry = {
  seed_keyword: string;
  search_queries: string[];
  angle_hint: string;
};

const CONCEPT_ANGLES: ConceptWritingAngle[] = [
  "etymology",
  "archetype",
  "misuse",
  "lineage",
  "counterintuitive"
];

const CONTRAST_ANGLES: ColdContrastAngle[] = [
  "expectation",
  "identity",
  "reputation",
  "production",
  "community"
];

const WORK_SEEDS: SeedEntry[] = [
  {
    seed_keyword: "作画崩坏出圈",
    search_queries: ["作画崩坏 名场面", "作画崩坏 梗"],
    angle_hint: "常识/评价反差：崩坏镜头如何被玩成梗，甚至带火讨论。"
  },
  {
    seed_keyword: "柯南黑衣人",
    search_queries: ["名侦探柯南 黑衣组织", "黑衣人 名字"],
    angle_hint: "身份反差：路人脸黑衣人其实在作品里有名字与分工。"
  },
  {
    seed_keyword: "时间循环番",
    search_queries: ["时间循环 动画", "漫无止境的八月"],
    angle_hint: "反常识追问：循环的到底是时间、记忆还是叙事结构？"
  },
  {
    seed_keyword: "分季口碑反转",
    search_queries: ["动画 第二季 口碑", "续作 评价 反转"],
    angle_hint: "评价反差：前后季风评落差，社区如何解释。"
  },
  {
    seed_keyword: "冷门佳作",
    search_queries: ["冷门动画", "高分冷门番剧"],
    angle_hint: "社区反差：播放不高却被反复安利的「冷」在哪里。"
  }
];

const CONCEPT_SEEDS: SeedEntry[] = [
  {
    seed_keyword: "傲娇",
    search_queries: ["傲娇 语源", "傲娇 角色 拉姆 夏娜"],
    angle_hint: "角色原型+谱系：从早期角色反差到 gal/论坛标签，拉姆、明日香、夏娜作入口。"
  },
  {
    seed_keyword: "世界系",
    search_queries: ["世界系", "世界系 动画 EVA"],
    angle_hint: "社区误用+参照：为何 EVA 常被中文社区当世界系讨论，且非严格学术分类。"
  },
  {
    seed_keyword: "公路片",
    search_queries: ["公路片 动画", "旅途 单元剧 动画"],
    angle_hint: "社区误用：动画里「公路片感」指旅途见闻结构，不是电影分类。"
  },
  {
    seed_keyword: "时间循环",
    search_queries: ["时间循环 动画", "漫无止境的八月"],
    angle_hint: "语源/谱系：循环叙事在动画里的常见结构与凉宫、石头门等入口。"
  },
  {
    seed_keyword: "作画崩坏",
    search_queries: ["作画崩坏", "作画 崩坏 梗"],
    angle_hint: "社区印象：「崩」在工期/玩梗语境下的用法，与故意风格化区分。"
  },
  {
    seed_keyword: "空气系",
    search_queries: ["空气系", "日常 空气感 动画"],
    angle_hint: "语源型：空气感作为观看节奏标签从何而来。"
  },
  {
    seed_keyword: "日常系",
    search_queries: ["日常系 动画", "日常 番"],
    angle_hint: "社区误用：弱冲突日常标签与类型学的差别。"
  },
  {
    seed_keyword: "赛璐璐",
    search_queries: ["赛璐璐 作画", "赛璐珞 动画"],
    angle_hint: "语源型：赛璐璐工艺与「赛璐璐味」在社区指什么。"
  },
  {
    seed_keyword: "圣地巡礼",
    search_queries: ["圣地巡礼", "动画 取景地"],
    angle_hint: "谱系：从 pilgrimage 到打卡文化的社区用法。"
  },
  {
    seed_keyword: "党争",
    search_queries: ["党争 动画", "CP 党争"],
    angle_hint: "社区印象：多线感情里的站队文化。"
  },
  {
    seed_keyword: "异世界",
    search_queries: ["异世界 转生 动画", "异世界 轻改"],
    angle_hint: "谱系：异世界标签如何与转生/升级模板绑在一起。"
  },
  {
    seed_keyword: "电波系",
    search_queries: ["电波系", "电波 动画"],
    angle_hint: "反直觉：电波不是「好看与否」，而是审美门槛差异。"
  },
  {
    seed_keyword: "群像剧",
    search_queries: ["群像剧 动画", "群像 番剧"],
    angle_hint: "社区误用：群像作为叙事密度标签。"
  },
  {
    seed_keyword: "机战",
    search_queries: ["机战 动画", "机器人 动画"],
    angle_hint: "语源/谱系：机战标签在中文社区的泛指范围。"
  },
  {
    seed_keyword: "废萌",
    search_queries: ["废萌", "萌系 日常"],
    angle_hint: "社区印象：废萌作为戏称而非贬损。"
  },
  {
    seed_keyword: "胃疼番",
    search_queries: ["胃疼番", "虐心 动画"],
    angle_hint: "社区印象：情感不适感的观看体验标签。"
  },
  {
    seed_keyword: "有生之年",
    search_queries: ["有生之年 续作", "第二季 等待"],
    angle_hint: "社区印象：等续作的半吐槽说法。"
  },
  {
    seed_keyword: "原创动画",
    search_queries: ["原创动画", "原创 番剧"],
    angle_hint: "反直觉：原创不等于高风险，社区在讨论什么。"
  },
  {
    seed_keyword: "漫画改",
    search_queries: ["漫画改 动画", "改编 争议"],
    angle_hint: "社区误用：改编幅度与期待管理。"
  },
  {
    seed_keyword: "轻改",
    search_queries: ["轻小说改编 动画", "轻改 动画"],
    angle_hint: "谱系：轻改标签与模板化吐槽。"
  },
  {
    seed_keyword: "游戏改",
    search_queries: ["游戏改 动画", "游戏 改编"],
    angle_hint: "语源/谱系：跨媒体改编的社区讨论点。"
  },
  {
    seed_keyword: "声优梗",
    search_queries: ["声优 梗", "声优 二次元 讨论"],
    angle_hint: "社区印象：声优与角色/粉丝投射相关的梗，不写未经证实的私生活。"
  },
  {
    seed_keyword: "总集篇",
    search_queries: ["总集篇 动画", "总集篇 电视"],
    angle_hint: "语源型：总集篇在播出结构里指什么，观众为何吐槽。"
  },
  {
    seed_keyword: "万策尽",
    search_queries: ["万策尽 梗", "为美好的世界献上祝福 万策尽"],
    angle_hint: "梗源型：台词如何脱离原作成为社区表情包。"
  }
];

const PHENOMENON_SEEDS: SeedEntry[] = [
  {
    seed_keyword: "声优结婚",
    search_queries: ["声优 结婚 粉丝", "声优 结婚 反应"],
    angle_hint: "社区反差：粉丝比本人还激动的讨论文化；不写未经证实的具体婚事细节。"
  },
  {
    seed_keyword: "PV欺诈",
    search_queries: ["PV 欺诈", "宣传 PV 差异"],
    angle_hint: "常识反差：PV 把预期抬太高，正片对不上。"
  },
  {
    seed_keyword: "轻改热潮",
    search_queries: ["轻小说改编 动画", "轻改 动画"],
    angle_hint: "产业印象：轻改扎堆季度，观众疲劳与安利并存。"
  },
  {
    seed_keyword: "续作断档",
    search_queries: ["动画 续作 等待", "第二季 不出"],
    angle_hint: "社区反差：「第二季呢」半吐槽与真实企划因素。"
  },
  {
    seed_keyword: "番剧评分膨胀",
    search_queries: ["动画 评分 社区", "刷分 动画"],
    angle_hint: "评价反差：分数与讨论热度不完全一致。"
  },
  {
    seed_keyword: "原创动画风险",
    search_queries: ["原创动画", "原创 番剧"],
    angle_hint: "反直觉：原创被说「 risky 」时社区其实在担心什么。"
  },
  {
    seed_keyword: "动画工房化",
    search_queries: ["京都动画 风格", "动画公司 画风"],
    angle_hint: "社区反差：「XX 社味」如何变成观众预期。"
  },
  {
    seed_keyword: "制作委员会",
    search_queries: ["制作委员会 动画", "动画 出资"],
    angle_hint: "语源/制度：委员会在讨论里常被用来解释什么。"
  }
];

/** concept 55% / phenomenon 30% / work 15% */
const TYPE_WEIGHTS: ColdTopicType[] = [
  ...Array<ColdTopicType>(55).fill("concept"),
  ...Array<ColdTopicType>(30).fill("phenomenon"),
  ...Array<ColdTopicType>(15).fill("work")
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function poolForType(t: ColdTopicType): SeedEntry[] {
  if (t === "work") return WORK_SEEDS;
  if (t === "concept") return CONCEPT_SEEDS;
  return PHENOMENON_SEEDS;
}

function pickTopicType(
  date: string,
  rotationSalt: string,
  recentTopicKeys: string[]
): ColdTopicType {
  const idx = hashString(`${date}:${rotationSalt}:type`) % TYPE_WEIGHTS.length;
  let chosen = TYPE_WEIGHTS[idx];
  const recentTypes = recentTopicKeys
    .map((k) => k.split(":")[0] as ColdTopicType)
    .filter((t) => t === "work" || t === "concept" || t === "phenomenon");
  const lastTwo = recentTypes.slice(-2);
  if (lastTwo.length >= 2 && lastTwo.every((t) => t === chosen)) {
    const alts = (["work", "concept", "phenomenon"] as const).filter((t) => t !== chosen);
    chosen = alts[hashString(`${date}:${rotationSalt}:alt`) % alts.length];
  }
  return chosen;
}

function pickSeed(
  topic_type: ColdTopicType,
  date: string,
  rotationSalt: string,
  recentTopicKeys: string[]
): SeedEntry {
  const pool = poolForType(topic_type);
  const blocked = new Set(recentTopicKeys.map((k) => k.toLowerCase()));
  const candidates = pool.filter(
    (s) => !blocked.has(`${topic_type}:${s.seed_keyword}`.toLowerCase())
  );
  const list = candidates.length > 0 ? candidates : pool;
  const idx = hashString(`${rotationSalt}:${date}:${topic_type}`) % list.length;
  return list[idx];
}

function pickWritingAngle(
  topic_type: ColdTopicType,
  rotationSalt: string,
  seed_keyword: string
): ConceptWritingAngle | ColdContrastAngle {
  const h = hashString(`${rotationSalt}:${seed_keyword}:angle`);
  if (topic_type === "concept") {
    return CONCEPT_ANGLES[h % CONCEPT_ANGLES.length];
  }
  return CONTRAST_ANGLES[h % CONTRAST_ANGLES.length];
}

export function planColdTopic(input?: {
  date?: string;
  recentTopics?: string[];
  rotationSalt?: string;
}): ColdTopicPlan {
  const date = input?.date ?? new Date().toISOString().slice(0, 10);
  const recentTopics = input?.recentTopics ?? [];
  const rotationSalt =
    input?.rotationSalt ?? `${date}-r${recentTopics.length}-${hashString(String(Date.now()))}`;

  const topic_type = pickTopicType(date, rotationSalt, recentTopics);
  const seed = pickSeed(topic_type, date, rotationSalt, recentTopics);
  const topic_key = `${topic_type}:${seed.seed_keyword}`;
  const writing_angle = pickWritingAngle(topic_type, rotationSalt, seed.seed_keyword);

  return {
    topic_type,
    seed_keyword: seed.seed_keyword,
    search_queries: seed.search_queries.slice(0, 3),
    angle_hint: seed.angle_hint,
    topic_key,
    writing_angle
  };
}
