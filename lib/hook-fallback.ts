import type { HomeHookRawV2 } from "@/lib/cold-types";
import type { ColdRecommendationRaw } from "@/lib/types";

export type FallbackColdHook = HomeHookRawV2 & {
  verification_status: "fallback";
};

function rec(anilistId: number, reason: string): ColdRecommendationRaw {
  return {
    candidate_id: `cand_${anilistId}`,
    anilistId,
    reason
  };
}

const FALLBACK_POOL: FallbackColdHook[] = [
  {
    topic_type: "concept",
    topic_key: "concept:傲娇",
    hook: "「傲娇」竟不是一开始就是固定萌属性？",
    angle: "角色原型 + 标签压缩：从角色反差到社区 shorthand",
    example_bridge:
      "正文先讲标签如何被压缩，再用福星小子/EVA/夏娜/龙虎作为不同阶段的观看入口，底部推荐对应两部。",
    insight:
      "你知道吗，「傲娇」这个词后来变得特别标签化，但它一开始更像是观众在角色身上看到的一种反差：嘴上不饶人，关键时刻又很在意。\n\n" +
      "拉姆、明日香、夏娜经常被拿来当不同阶段的例子——有人追原型，有人只看恋爱喜剧里的口是心非。《龙与虎》则更像看关系怎么变。想想也是，论坛把复杂互动压成一个词，好记就好传。",
    source_urls: ["https://zh.wikipedia.org/wiki/傲娇"],
    confidence: 0.38,
    verification_status: "fallback",
    recommendations: [
      rec(
        1293,
        "《福星小子》里拉姆常被拿来聊早期「嘴硬心软」原型：看它能感受标签诞生前，观众其实在描述角色反差，而不是背属性定义。"
      ),
      rec(
        355,
        "《灼眼的夏娜》是中文社区里很经典的傲娇样本之一：适合对照「标签化之后」大家怎么用这个梗形容角色互动。"
      )
    ]
  },
  {
    topic_type: "concept",
    topic_key: "concept:世界系",
    hook: "世界系为什么在中文社区总绕不开 EVA？",
    angle: "社区参照 + 反直觉：不是学术分类，而是叙事压力标签",
    example_bridge:
      "先解释世界系在中文社区的指法，再铺垫 EVA 与最终兵器彼女如何体现「个人心理与世界存亡同锅炖」。",
    insight:
      "「世界系」在中文动画讨论里，常被用来形容一种叙事压力：少年少女的心理困境、亲密关系纠葛，会和更大尺度的存亡危机绑在一起，观众往往和角色一起慢慢补全信息。\n\n" +
      "《新世纪福音战士》之所以总被提起，不是因为它「定义了世界系」，而是它把真嗣的封闭、绫波丽与明日香的关系张力，同使徒危机、补完计划放在同一层面——讨论很容易从角色心理一路谈到世界规则。《最终兵器彼女》则是另一种「恋爱与战争并置」的入口。也要说清楚：这不是严格学术分类，不同论坛用法会有差别。",
    source_urls: ["https://zh.wikipedia.org/wiki/世界系"],
    confidence: 0.4,
    verification_status: "fallback",
    recommendations: [
      rec(
        30,
        "看《新世纪福音战士》很适合理解中文社区为何常拿它谈世界系：心理困境与世界存亡同屏加压，是这条标签最常举的入口之一。"
      ),
      rec(
        529,
        "《最终兵器彼女》把个人情感与末日战争并置，能感受「世界系」在恋爱叙事里的另一种压强，而不只是背名词。"
      )
    ]
  },
  {
    topic_type: "concept",
    topic_key: "concept:公路片",
    hook: "动画里的「公路片感」到底在说什么？",
    angle: "社区误用：旅途见闻结构，不是电影分类",
    example_bridge: "解释公路片感后，用虫师与少女终末旅行承接「路上展开」的观看入口。",
    insight:
      "在动画讨论里，大家说「公路片」时，很多时候不是在查电影学的严格分类，而是在描述一种看番感受：角色一路移动，故事随着地点、相遇和路途见闻慢慢展开，重点常常不在「到达终点」。\n\n" +
      "《虫师》很典型：银古走到不同地方，每一集遇见不同的人和怪异，单元结构让「旅途」本身成为骨架。《少女终末旅行》则是末世路上的观察与陪伴。这里容易和「有冒险元素」混在一起，但不用太较真——想感受这种结构，下面两部是常见入口。",
    source_urls: ["https://zh.wikipedia.org/wiki/公路片"],
    confidence: 0.4,
    verification_status: "fallback",
    recommendations: [
      rec(
        457,
        "《虫师》很适合理解动画里的「公路片感」：每站遇见不同人与怪异，重点在路途见闻而非终点，单元旅程结构非常直观。"
      ),
      rec(
        99420,
        "《少女终末旅行》用末世旅途承载观察与陪伴，路上对话推动情绪，是感受「旅途结构」的另一个入口。"
      )
    ]
  },
  {
    topic_type: "concept",
    topic_key: "concept:时间循环",
    hook: "时间循环番，到底在循环什么？",
    angle: "反直觉：循环的是叙事结构，不只是时间表",
    example_bridge: "从循环叙事装置讲起，接石头门与凉宫八月作入口。",
    insight:
      "「时间循环」在动画里，常指角色反复回到同一时间段，带着部分或全部记忆重试事件；观众有时比角色更早知道「这一轮会怎么结束」。比较常见的说法是，它用重置制造信息差和因果悬念，而不只是炫技。\n\n" +
      "《命运石之门》很适合看信息差、伏笔和因果怎么被一轮轮拧紧；《凉宫春日的忧郁》里「漫无止境的八月」则是中文社区谈循环时绕不开的例子。不同作品对「代价」设定差很多，具体机制仍以正片为准。",
    source_urls: ["https://zh.wikipedia.org/wiki/时间循环"],
    confidence: 0.39,
    verification_status: "fallback",
    recommendations: [
      rec(
        9253,
        "《命运石之门》是理解时间循环叙事的常见入口：用信息差和因果回收推动故事，很适合感受「循环」如何服务悬念而不是单纯重置。"
      ),
      rec(
        849,
        "《凉宫春日的忧郁》「漫无止境的八月」是中文社区谈循环时的经典案例：看它能感受重复日常如何变成讨论焦点。"
      )
    ]
  },
  {
    topic_type: "work",
    topic_key: "work:作画崩坏出圈",
    hook: "作画崩坏出圈，竟也能变成梗？",
    angle: "评价反差：崩坏镜头从事故变成传播素材",
    example_bridge: "讲崩坏如何被玩成梗，接约会大作战III与 pop 子对比故意风格化。",
    insight:
      "有些动画因为作画崩坏反而火出圈了——《约会大作战 III》的脸崩一度被做成梗图疯传，大家一边骂一边追，讨论度反而爆表。据说和工期、预算有关，真假难辨，但「灾难现场」确实好看。\n\n" +
      "《pop子和pipi美的日常》则是另一路：故意把画面玩崩当搞笑，结果成了风格。你看，同样是「崩」，一个是事故出圈，一个是整活封神。",
    source_urls: ["https://zh.wikipedia.org/wiki/日本动画"],
    confidence: 0.36,
    verification_status: "fallback",
    recommendations: [
      rec(
        100722,
        "《约会大作战 III》的崩坏镜头在中文社区传疯了：你去看几集就知道，大家骂的是质量，玩的是梗，热度两不耽误。"
      ),
      rec(
        101198,
        "《pop子和pipi美的日常》把崩坏当武器：你看几话就明白，整活和事故完全是两码事，但都能让人笑出声。"
      )
    ]
  },
  {
    topic_type: "work",
    topic_key: "work:柯南黑衣人",
    hook: "柯南里的黑衣人，其实有名字？",
    angle: "身份反差：路人脸反派在设定里并不匿名",
    example_bridge: "点出黑衣组织并非纯路人，接柯南正片与魔术快斗宇宙。",
    insight:
      "不少路人观众对《名侦探柯南》黑衣组织的印象，是「一群穿黑西装的路人脸」。其实在作品设定里，许多成员有代号、分工甚至背景交代——讨论里有趣的反差是：视觉上像匿名反派，叙事上却并不完全「没有名字」。\n\n" +
      "常见的社区玩法是拿早期镜头玩梗，和后来设定信息对照。若你想顺着这个梗往下看，柯南本篇与相关短篇是更直接的入口；不必把梗当成完整设定科普。",
    source_urls: ["https://zh.wikipedia.org/wiki/名侦探柯南"],
    confidence: 0.37,
    verification_status: "fallback",
    recommendations: [
      rec(
        235,
        "《名侦探柯南》是理解「黑衣人」梗最直接的入口：看组织成员出场与后续设定补全，能感受视觉匿名和叙事命名之间的反差。"
      ),
      rec(
        1419,
        "《魔术快斗》与柯南共享作者宇宙：适合作为补充入口，理解反派符号与配角体系如何在不同篇章里被展开。"
      )
    ]
  },
  {
    topic_type: "phenomenon",
    topic_key: "phenomenon:声优结婚",
    hook: "声优结婚，为何粉丝有时比本人还激动？",
    angle: "社区反差：角色投射与「嫁娶」梗文化",
    example_bridge: "谈粉丝投射，不接未经证实的婚事细节，用白箱等作行业入口。",
    insight:
      "在中文二次元讨论里，「声优结婚」引发的热议，很多时候并不只是在八卦私生活，而是在动「角色—声优—粉丝投射」这条链：有人开玩笑式喊「嫁娶」，有人认真讨论角色会不会「被影响」。比较常见的说法是，这背后是日本声优生态里角色绑定与粉丝文化的长期积累。\n\n" +
      "若没有可靠公开信息，不必编造具体婚事细节。《白箱》这类作品则适合理解声优与制作现场的关系——下面推荐是「行业与投射」入口，不是八卦指南。",
    source_urls: ["https://zh.wikipedia.org/wiki/声优"],
    confidence: 0.35,
    verification_status: "fallback",
    recommendations: [
      rec(
        11654,
        "《白箱》适合理解声优与动画制作生态：看它能明白粉丝讨论「结婚」时，其实在碰角色、行业与投射，而不只是单条新闻。"
      ),
      rec(
        21584,
        "《Love Live! Sunshine!!》代表偶像/声优企划与粉丝投射的典型场域：适合感受角色形象与真人活动如何交织。"
      )
    ]
  },
  {
    topic_type: "phenomenon",
    topic_key: "phenomenon:PV欺诈",
    hook: "大家说的「PV 欺诈」到底在吐槽什么？",
    angle: "常识反差：宣传把预期抬太高",
    example_bridge: "解释 PV 预期管理，用迷宫饭与孤独摇滚作对照入口。",
    insight:
      "「PV 欺诈」是网友吐槽用语：宣传 PV 在光影、配乐、镜头挑选上把气质抬得很高，正片在节奏或作画密度上对不上，产生落差——不等于作品一定差，更像是预期管理问题。\n\n" +
      "在中文社区里，这类说法在原创企划中更常见，因为缺少原作参照。论坛多半用来提醒「别只看 PV 入坑」；是否值得看，仍以正片前几集为准。",
    source_urls: ["https://zh.wikipedia.org/wiki/预告片"],
    confidence: 0.38,
    verification_status: "fallback",
    recommendations: [
      rec(
        162033,
        "《迷宫饭》常被讨论 PV 与正片气质是否一致：看它能感受宣传镜头如何塑造预期，以及正片节奏如何回应这种预期。"
      ),
      rec(
        154587,
        "《孤独摇滚！》也有 PV 和正片节奏对不上的讨论——你对比前两集和 PV，就 get 到「宣传把预期抬太高」是什么感觉了。"
      )
    ]
  },
  {
    topic_type: "concept",
    topic_key: "concept:万策尽",
    hook: "「万策尽」竟和原作剧情没啥关系了？",
    angle: "朋友随口观察：词活下来，剧情死了",
    example_bridge: "先抛脱离原作的观察，第二段接素晴和阿库娅天然梗批。",
    insight:
      "你有没有发现，「万策尽」这个词现在完全脱离剧情了——明明是《为美好的世界献上祝福！》里阿库娅吐槽队友的台词，意思是「各种办法都穷尽了吗」，结果变成了所有人没招、想摆烂时甩出去的表情包。原来那段剧情反而没人提，就这个词活下来了。\n\n" +
      "这其实挺常见的，一句台词脱离上下文还能成立，就会自己生长。《为美好的世界献上祝福！》里这种时刻特别多，阿库娅就是个天然梗批，你去看会发现「万策尽」只是个开始。",
    source_urls: ["https://zh.wikipedia.org/wiki/为美好的世界献上祝福！"],
    confidence: 0.37,
    verification_status: "fallback",
    recommendations: [
      rec(
        21202,
        "《为美好的世界献上祝福！》就是这句梗的老家：你去看阿库娅怎么吐槽队友，再刷一眼现在的表情包用法，立刻明白词怎么「叛逃」出原剧情了。"
      ),
      rec(
        21355,
        "《Re:从零开始》也能对照着看异世界喜剧里台词怎么被摘成梗——和素晴放一起看，你会发现观众记住的往往是词，不是那一段剧情。"
      )
    ]
  }
];

let fallbackCursor = 0;

export function pickFallbackColdHook(recentTopicKeys: string[] = []): FallbackColdHook {
  const blocked = new Set(recentTopicKeys.map((k) => k.toLowerCase()));
  const candidates = FALLBACK_POOL.filter(
    (f) => !blocked.has(f.topic_key.toLowerCase())
  );
  const pool = candidates.length > 0 ? candidates : FALLBACK_POOL;
  const idx = (fallbackCursor + hashFallback(recentTopicKeys.join("|"))) % pool.length;
  fallbackCursor += 1;
  return pool[idx];
}

function hashFallback(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** @deprecated 兼容旧引用 */
export const FALLBACK_COLD_HOOK_RAW = FALLBACK_POOL[0];
