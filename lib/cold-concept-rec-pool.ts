/**
 * 概念类冷知识 → 高相关推荐候选（AniList ID，默认日本动画）。
 * priority 越小越优先；relation_seed 用于 prompt 与兜底 reason。
 */
export type ConceptRecEntry = {
  concept_key: string;
  anilistId: number;
  title: string;
  relation_seed: string;
  priority: number;
};

const pool = (concept_key: string, entries: Omit<ConceptRecEntry, "concept_key">[]): ConceptRecEntry[] =>
  entries.map((e) => ({ concept_key, ...e }));

export const CONCEPT_REC_POOL: Record<string, ConceptRecEntry[]> = {
  "公路片": pool("公路片", [
    {
      anilistId: 457,
      title: "虫师",
      relation_seed: "单元旅程、路上遇见不同人与怪异，重点在见闻而非终点",
      priority: 1
    },
    {
      anilistId: 99420,
      title: "少女终末旅行",
      relation_seed: "末世旅途结构、边走边观察世界与彼此",
      priority: 2
    },
    {
      anilistId: 486,
      title: "奇诺之旅",
      relation_seed: "旅行者到访不同国家的寓言式单元结构",
      priority: 3
    },
    {
      anilistId: 99426,
      title: "比宇宙更远的地方",
      relation_seed: "目标是去南极，但真正好看的其实是一路上几个女生慢慢混熟",
      priority: 4
    }
  ]),
  "世界系": pool("世界系", [
    {
      anilistId: 30,
      title: "新世纪福音战士",
      relation_seed: "真嗣那点少年心事，最后能一路扯到全人类的命运",
      priority: 1
    },
    {
      anilistId: 529,
      title: "最终兵器彼女",
      relation_seed: "个人恋爱与世界战争强绑定、情感与毁灭并置",
      priority: 2
    },
    {
      anilistId: 256,
      title: "星之声",
      relation_seed: "亲密关系与宇宙尺度距离并置的短篇幅范例",
      priority: 3
    }
  ]),
  "傲娇": pool("傲娇", [
    {
      anilistId: 1293,
      title: "福星小子",
      relation_seed: "拉姆常被追溯为早期「嘴硬心软」原型之一",
      priority: 1
    },
    {
      anilistId: 30,
      title: "新世纪福音战士",
      relation_seed: "明日香：强硬外壳与脆弱内心的组合极有辨识度",
      priority: 2
    },
    {
      anilistId: 355,
      title: "灼眼的夏娜",
      relation_seed: "夏娜嘴上凶、心里在意的反差特别直观",
      priority: 3
    },
    {
      anilistId: 4224,
      title: "龙与虎",
      relation_seed: "龙儿和大河那种吵着吵着靠近的关系，很适合聊傲娇",
      priority: 4
    }
  ]),
  "空气系": pool("空气系", [
    { anilistId: 10165, title: "ARIA", relation_seed: "留白多、节奏舒缓的日常空气感", priority: 1 },
    { anilistId: 5680, title: "幸运星", relation_seed: "对话与日常切片为主的观看节奏", priority: 2 },
    { anilistId: 2167, title: "水星领航员", relation_seed: "慢节奏、环境音与情绪留白", priority: 3 }
  ]),
  "日常系": pool("日常系", [
    { anilistId: 5680, title: "幸运星", relation_seed: "几个女生闲聊宅梗，没大事件也能看得很开心", priority: 1 },
    { anilistId: 10165, title: "ARIA", relation_seed: "治愈向日常、弱冲突观看体验", priority: 2 },
    { anilistId: 12189, title: "冰菓", relation_seed: "日常外壳下的轻推理与角色互动", priority: 3 }
  ]),
  "赛璐璐": pool("赛璐璐", [
    { anilistId: 1, title: "星际牛仔", relation_seed: "赛璐璐时期线条与色块对照常被提起", priority: 1 },
    { anilistId: 30, title: "新世纪福音战士", relation_seed: "老 TV 动画那种线条和色块感很明显", priority: 2 },
    { anilistId: 20507, title: "言叶之庭", relation_seed: "新海诚那种数字画面，拿来和老动画对比很直观", priority: 3 }
  ]),
  "赛璐珞": pool("赛璐珞", [
    { anilistId: 1, title: "星际牛仔", relation_seed: "赛璐璐时期线条与色块对照常被提起", priority: 1 },
    { anilistId: 30, title: "新世纪福音战士", relation_seed: "老 TV 动画那种线条和色块感很明显", priority: 2 },
    { anilistId: 20507, title: "言叶之庭", relation_seed: "新海诚那种数字画面，拿来和老动画对比很直观", priority: 3 }
  ]),
  "作画崩坏": pool("作画崩坏", [
    { anilistId: 100722, title: "约会大作战 III", relation_seed: "第三季那些崩脸截图传得很凶，骂声和热度一起上来了", priority: 1 },
    { anilistId: 101198, title: "pop子和pipi美的日常", relation_seed: "故意破坏画面规则成搞笑风格", priority: 2 },
    { anilistId: 21087, title: "一拳超人 第二季", relation_seed: "第二季和第一季一比，很多人立刻感觉到作画落差", priority: 3 }
  ]),
  "作画崩坏出圈": pool("作画崩坏出圈", [
    { anilistId: 100722, title: "约会大作战 III", relation_seed: "崩坏截图传得很凶，大家一边吐槽一边围观", priority: 1 },
    { anilistId: 101198, title: "pop子和pipi美的日常", relation_seed: "崩坏感被当作风格而非事故", priority: 2 },
    { anilistId: 21087, title: "一拳超人 第二季", relation_seed: "工期与作画密度落差", priority: 3 }
  ]),
  "圣地巡礼": pool("圣地巡礼", [
    { anilistId: 21698, title: "你的名字。", relation_seed: "取景地巡礼与实景对比热度", priority: 1 },
    { anilistId: 101291, title: "青春猪头少年", relation_seed: "都市取景与打卡攻略", priority: 2 },
    { anilistId: 12189, title: "冰菓", relation_seed: "关西取景与圣地帖", priority: 3 }
  ]),
  "买股": pool("买股", [
    { anilistId: 5081, title: "白色相簿2", relation_seed: "几个人的感情线拧在一起，观众很容易站队", priority: 1 },
    { anilistId: 849, title: "CLANNAD", relation_seed: "情感线选择与角色偏好", priority: 2 },
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "角色命运与观众情感投入", priority: 3 }
  ]),
  "党争": pool("党争", [
    { anilistId: 5081, title: "白色相簿2", relation_seed: "站冬马还是站雪菜，光这个就能吵很久", priority: 1 },
    { anilistId: 849, title: "CLANNAD", relation_seed: "角色线选择与偏好争论", priority: 2 },
    { anilistId: 4224, title: "龙与虎", relation_seed: "恋爱喜剧里的角色站队", priority: 3 }
  ]),
  "寿命论": pool("寿命论", [
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "契约、牺牲与命运代价", priority: 1 },
    { anilistId: 9253, title: "命运石之门", relation_seed: "时间线与牺牲代价", priority: 2 },
    { anilistId: 21355, title: "Re:从零开始", relation_seed: "轮回与心理负担", priority: 3 }
  ]),
  "异世界模板": pool("异世界模板", [
    { anilistId: 21355, title: "Re:从零开始", relation_seed: "轮回与异世界代价设定", priority: 1 },
    { anilistId: 101922, title: "关于我转生变成史莱姆", relation_seed: "异世界轻改商业高峰样本", priority: 2 },
    { anilistId: 11757, title: "妖精的尾巴", relation_seed: "冒险升级模板对照", priority: 3 }
  ]),
  "异世界": pool("异世界", [
    { anilistId: 101922, title: "关于我转生变成史莱姆", relation_seed: "转生升级与轻改热度", priority: 1 },
    { anilistId: 21355, title: "Re:从零开始", relation_seed: "异世界+轮回代价", priority: 2 },
    { anilistId: 11757, title: "妖精的尾巴", relation_seed: "冒险公会式异世界前身对照", priority: 3 }
  ]),
  "时间循环": pool("时间循环", [
    { anilistId: 9253, title: "命运石之门", relation_seed: "一次次改世界线，观众跟着主角一起被因果折磨", priority: 1 },
    { anilistId: 21355, title: "Re:从零开始", relation_seed: "轮回代价与角色心理负担", priority: 2 },
    { anilistId: 849, title: "凉宫春日的忧郁", relation_seed: "漫无止境的八月真的把同一段暑假播到观众记住了", priority: 3 }
  ]),
  "时间循环番": pool("时间循环番", [
    { anilistId: 9253, title: "命运石之门", relation_seed: "一次次改世界线，观众跟着主角一起被因果折磨", priority: 1 },
    { anilistId: 21355, title: "Re:从零开始", relation_seed: "轮回代价与角色心理负担", priority: 2 },
    { anilistId: 849, title: "凉宫春日的忧郁", relation_seed: "漫无止境的八月真的把同一段暑假播到观众记住了", priority: 3 }
  ]),
  "电波系": pool("电波系", [
    { anilistId: 5081, title: "白色相簿2", relation_seed: "情感浓烈、受众两极", priority: 1 },
    { anilistId: 2167, title: "水星领航员", relation_seed: "实验性节奏与审美差异", priority: 2 },
    { anilistId: 10165, title: "ARIA", relation_seed: "慢热日常电波观感", priority: 3 }
  ]),
  "群像剧": pool("群像剧", [
    { anilistId: 16498, title: "进击的巨人", relation_seed: "多角色视角与世界线群像", priority: 1 },
    { anilistId: 9253, title: "命运石之门", relation_seed: "实验室成员群像与分工", priority: 2 },
    { anilistId: 5081, title: "白色相簿2", relation_seed: "多角色关系网推进", priority: 3 }
  ]),
  "机战": pool("机战", [
    { anilistId: 30, title: "新世纪福音战士", relation_seed: "明明开机器人打怪，聊着聊着就变成少年心理问题", priority: 1 },
    { anilistId: 11757, title: "妖精的尾巴", relation_seed: "战斗与伙伴羁绊（非典型机战对照）", priority: 3 },
    { anilistId: 16498, title: "进击的巨人", relation_seed: "大型战斗与阵营群像", priority: 2 }
  ]),
  "废萌": pool("废萌", [
    { anilistId: 5680, title: "幸运星", relation_seed: "萌系日常与宅梗密集", priority: 1 },
    { anilistId: 849, title: "CLANNAD", relation_seed: "键系情感与萌点包装", priority: 2 },
    { anilistId: 10165, title: "ARIA", relation_seed: "治愈萌系日常对照", priority: 3 }
  ]),
  "胃疼番": pool("胃疼番", [
    { anilistId: 5081, title: "白色相簿2", relation_seed: "三个人越认真越拧巴，看着确实很胃疼", priority: 1 },
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "期待与反转的情绪冲击", priority: 2 },
    { anilistId: 849, title: "CLANNAD", relation_seed: "家庭线与情感释放", priority: 3 }
  ]),
  "有生之年": pool("有生之年", [
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "续作/剧场版长期等待", priority: 1 },
    { anilistId: 12189, title: "冰菓", relation_seed: "大家问第二季问了很多年，问到都快成梗了", priority: 2 },
    { anilistId: 16498, title: "进击的巨人", relation_seed: "分季间隔与企划消息", priority: 3 }
  ]),
  "原创动画": pool("原创动画", [
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "原创企划话题度", priority: 1 },
    { anilistId: 101349, title: "Promare", relation_seed: "原创电影口碑样本", priority: 2 },
    { anilistId: 154587, title: "孤独摇滚！", relation_seed: "近年原创日常话题", priority: 3 }
  ]),
  "漫画改": pool("漫画改", [
    { anilistId: 101922, title: "关于我转生变成史莱姆", relation_seed: "从小说到漫画再到动画，改编层层转手后味道会变", priority: 1 },
    { anilistId: 113415, title: "约定的梦幻岛", relation_seed: "原作与动画差异", priority: 2 },
    { anilistId: 21459, title: "银魂", relation_seed: "长篇漫画改编节奏", priority: 3 }
  ]),
  "轻改": pool("轻改", [
    { anilistId: 849, title: "凉宫春日的忧郁", relation_seed: "轻改黄金期代表", priority: 1 },
    { anilistId: 101922, title: "关于我转生变成史莱姆", relation_seed: "异世界轻改热度", priority: 2 },
    { anilistId: 11757, title: "妖精的尾巴", relation_seed: "套路很热闹，友情和开挂都摆在明面上", priority: 3 }
  ]),
  "游戏改": pool("游戏改", [
    { anilistId: 9756, title: "魔法少女小圆", relation_seed: "跨媒体企划与衍生", priority: 1 },
    { anilistId: 21698, title: "你的名字。", relation_seed: "电影与宣传节奏", priority: 2 },
    { anilistId: 849, title: "CLANNAD", relation_seed: "键系游戏改动画情感线", priority: 3 }
  ]),
  "声优梗": pool("声优梗", [
    { anilistId: 11654, title: "白箱", relation_seed: "能看到声优工作不是只进棚念台词，背后压力也不少", priority: 1 },
    { anilistId: 849, title: "凉宫春日的忧郁", relation_seed: "平野绫和凉宫这个角色绑得太深，聊声优梗很容易绕到它", priority: 2 },
    { anilistId: 5680, title: "幸运星", relation_seed: "声优梗与宅文化切片", priority: 3 }
  ]),
  "柯南黑衣人": pool("柯南黑衣人", [
    { anilistId: 235, title: "名侦探柯南", relation_seed: "黑衣组织成员其实有名字与分工", priority: 1 },
    { anilistId: 1419, title: "魔术快斗", relation_seed: "柯南宇宙反派与配角符号", priority: 2 }
  ]),
  "万策尽": pool("万策尽", [
    { anilistId: 21202, title: "为美好的世界献上祝福！", relation_seed: "阿库娅「万策尽」台词梗来源", priority: 1 },
    { anilistId: 21355, title: "Re:从零开始的异世界生活", relation_seed: "异世界喜剧梗二次传播对照", priority: 2 }
  ]),
  "总集篇": pool("总集篇", [
    { anilistId: 16498, title: "进击的巨人", relation_seed: "长篇播出中总集篇常见", priority: 1 },
    { anilistId: 11757, title: "妖精的尾巴", relation_seed: "长篇动画总集篇节奏", priority: 2 }
  ])
};

export function conceptRecEntriesForSeed(seedKeyword: string): ConceptRecEntry[] {
  return CONCEPT_REC_POOL[seedKeyword] ?? [];
}

export function findConceptRecByAniListId(anilistId: number): ConceptRecEntry | undefined {
  for (const entries of Object.values(CONCEPT_REC_POOL)) {
    const match = entries.find((entry) => entry.anilistId === anilistId);
    if (match) return match;
  }
  return undefined;
}
