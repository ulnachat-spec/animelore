import type { ColdHookPayload } from "@/lib/types";
import type { RoamCard } from "@/lib/roam/roam-types";

const FALLBACK_ROAM_CARD_SEEDS: RoamCard[] = [
  {
    id: "fallback-cel",
    type: "term_origin",
    tag: "概念",
    hook: "赛璐璐味，不只是老动画滤镜。",
    blurb: "大家说一部片有「赛璐璐味」时，常是在夸线条、上色和摄影层次像手工时代留下的质感，而不只是画面旧哦。",
    target: { kind: "cold", title: "赛璐璐", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E8%B5%9B%E7%92%90%E7%8F%9E"],
    confidence: 0.66,
    verification_status: "fallback",
    next_seeds: ["赛璐璐", "作画", "摄影"],
    topic_key: "fallback:赛璐璐"
  },
  {
    id: "fallback-sekaikei",
    type: "term_origin",
    tag: "概念",
    hook: "「世界系」不是所有拯救世界的番。",
    blurb: "有说法认为，世界系更在意「少男少女关系」和「世界危机」被直接连起来，中间社会层被故意淡化。",
    target: { kind: "cold", title: "世界系", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E4%B8%96%E7%95%8C%E7%B3%BB"],
    confidence: 0.68,
    verification_status: "fallback",
    next_seeds: ["世界系", "EVA", "最终兵器彼女"],
    topic_key: "fallback:世界系"
  },
  {
    id: "fallback-mahou-deconstruct",
    type: "term_origin",
    tag: "谱系",
    hook: "魔法少女也会被「拆开重装」。",
    blurb: "从守护爱与希望，到追问契约、代价和创伤，魔法少女解构向作品常把可爱外壳翻到背面给你看。",
    target: { kind: "cold", title: "魔法少女解构", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E9%AD%94%E6%B3%95%E5%B0%91%E5%A5%B3"],
    confidence: 0.64,
    verification_status: "fallback",
    next_seeds: ["魔法少女", "小圆", "解构"],
    topic_key: "fallback:魔法少女解构"
  },
  {
    id: "fallback-lifespan",
    type: "community_take",
    tag: "社区",
    hook: "寿命论的刀，常常不是死别本身。",
    blurb: "社区说法里，「寿命论」真正戳人的点，是两个人明明相爱，却从设定上注定无法用同一种时间生活。",
    target: { kind: "cold", title: "寿命论", href: "/cold" },
    source_urls: ["https://zh.moegirl.org.cn/%E5%AF%BF%E5%91%BD%E8%AE%BA"],
    confidence: 0.6,
    verification_status: "fallback",
    next_seeds: ["寿命论", "人外", "时间差"],
    topic_key: "fallback:寿命论"
  },
  {
    id: "fallback-pilgrimage",
    type: "production_note",
    tag: "幕后",
    hook: "圣地巡礼，是把分镜带回现实。",
    blurb: "不少动画会参考真实街景、车站和坡道；粉丝再拿着画面去现实中对位，作品就多了一层可触摸的记忆。",
    target: { kind: "cold", title: "圣地巡礼", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E8%81%96%E5%9C%B0%E5%B7%A1%E7%A6%AE"],
    confidence: 0.7,
    verification_status: "fallback",
    next_seeds: ["圣地巡礼", "取景地", "背景美术"],
    topic_key: "fallback:圣地巡礼"
  },
  {
    id: "fallback-seiyuu",
    type: "meme_origin",
    tag: "梗",
    hook: "声优梗有时像隐藏的第二字幕。",
    blurb: "同一位声优配过的角色被观众串起来玩梗，是社区常见玩法；但涉及本人私生活时就要谨慎啦。",
    target: { kind: "cold", title: "声优梗", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E5%A3%B0%E4%BC%98"],
    confidence: 0.62,
    verification_status: "fallback",
    next_seeds: ["声优梗", "角色联想", "配音"],
    topic_key: "fallback:声优梗"
  },
  {
    id: "fallback-sakuga-collapse",
    type: "community_take",
    tag: "社区",
    hook: "作画崩坏，后来也能变成名场面。",
    blurb: "社区说法里，「崩」不总是单纯嘲笑；有些镜头因为太离谱反而被反复截图，成了观众共同记忆。",
    target: { kind: "cold", title: "作画崩坏", href: "/cold" },
    source_urls: ["https://zh.moegirl.org.cn/%E4%BD%9C%E7%94%BB%E5%B4%A9%E5%9D%8F"],
    confidence: 0.63,
    verification_status: "fallback",
    next_seeds: ["作画崩坏", "万策尽", "制作现场"],
    topic_key: "fallback:作画崩坏"
  },
  {
    id: "fallback-committee",
    type: "production_note",
    tag: "幕后",
    hook: "制作委员会不是一个神秘导演组。",
    blurb: "它更像多个出资方一起承担风险、分配权益的机制；观众讨论企划取舍时，经常会提到它。",
    target: { kind: "cold", title: "制作委员会", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E8%A3%BD%E4%BD%9C%E5%A7%94%E5%93%A1%E6%9C%83%E6%96%B9%E5%BC%8F"],
    confidence: 0.72,
    verification_status: "fallback",
    next_seeds: ["制作委员会", "出资", "动画企划"],
    topic_key: "fallback:制作委员会"
  },
  {
    id: "fallback-recap",
    type: "production_note",
    tag: "幕后",
    hook: "总集篇不一定只是「水一集」。",
    blurb: "它常被观众吐槽，但也可能承担回顾剧情、调整播出节奏的功能；具体是不是救火，要看作品和档期证据。",
    target: { kind: "cold", title: "总集篇", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E7%B8%BD%E9%9B%86%E7%AF%87"],
    confidence: 0.66,
    verification_status: "fallback",
    next_seeds: ["总集篇", "播出节奏", "制作现场"],
    topic_key: "fallback:总集篇"
  },
  {
    id: "fallback-bansaku",
    type: "meme_origin",
    tag: "梗",
    hook: "「万策尽」本来不是万能甩锅词。",
    blurb: "这个梗在社区里常被用来吐槽制作赶不上进度，但真遇到延期或停播，最好还是看官方公告再下结论。",
    target: { kind: "cold", title: "万策尽", href: "/cold" },
    source_urls: ["https://zh.moegirl.org.cn/%E4%B8%87%E7%AD%96%E5%B0%BD"],
    confidence: 0.62,
    verification_status: "fallback",
    next_seeds: ["万策尽", "延期", "制作进度"],
    topic_key: "fallback:万策尽"
  },
  {
    id: "fallback-road-movie",
    type: "term_origin",
    tag: "概念",
    hook: "动画里的公路片感，不一定真的有公路。",
    blurb: "很多时候它说的是「边走边遇见人」的结构：旅途把角色和世界观一站一站展开，而不是直奔终点。",
    target: { kind: "cold", title: "公路片", href: "/cold" },
    source_urls: ["https://zh.wikipedia.org/wiki/%E5%85%AC%E8%B7%AF%E9%9B%BB%E5%BD%B1"],
    confidence: 0.6,
    verification_status: "fallback",
    next_seeds: ["公路片", "旅途", "单元剧"],
    topic_key: "fallback:公路片"
  },
  {
    id: "fallback-kuuki",
    type: "term_origin",
    tag: "概念",
    hook: "空气系看的不是大事件，是停顿。",
    blurb: "社区说法里，「空气感」常指弱冲突、慢节奏和角色之间的生活气息；喜欢的人会觉得很治愈。",
    target: { kind: "cold", title: "空气系", href: "/cold" },
    source_urls: ["https://zh.moegirl.org.cn/%E7%A9%BA%E6%B0%94%E7%B3%BB"],
    confidence: 0.6,
    verification_status: "fallback",
    next_seeds: ["空气系", "日常系", "治愈"],
    topic_key: "fallback:空气系"
  }
];

type FallbackDetail = {
  insight: string;
  recommendations: ColdHookPayload["recommendations"];
};

function rec(title: string, reason: string, nativeTitle?: string): ColdHookPayload["recommendations"][number] {
  return {
    candidate_id: `fallback-${title}`,
    anime_title: title,
    displayTitle: title,
    nativeTitle,
    searchQuery: title,
    reason
  };
}

const FALLBACK_DETAILS: Record<string, FallbackDetail> = {
  "fallback:赛璐璐": {
    insight:
      "你知道吗，大家说「赛璐璐味」时，很多时候不是在说画面老，而是在怀念一种手工动画留下来的厚度：线条、上色、摄影层次都像真的被光打过。\n\n这种味道在老动画和胶片时代作品里特别明显，颜色不会像现在这么锐，阴影也常常带一点颗粒感。想感受它，可以先从《星际牛仔》和《AKIRA》这类作品看起：一个是 TV 动画里很成熟的质感样本，一个则把手绘时代的大场面推到很夸张的程度。",
    recommendations: [
      rec("Cowboy Bebop", "看它很容易理解所谓「赛璐璐味」的成熟质感：线条、色块和摄影不会抢戏，但每一帧都有旧时代动画的厚度。", "カウボーイビバップ"),
      rec("AKIRA", "这部几乎是手绘动画大场面的标志样本，拿来看「赛璐璐时代能做到什么程度」非常直观。", "AKIRA")
    ]
  },
  "fallback:世界系": {
    insight:
      "「世界系」容易被误会成所有拯救世界的故事，其实它更像一种叙事压力锅：少男少女的亲密关系、心理创伤和世界危机被直接压在一起，中间的社会层常常被淡化。\n\n所以中文社区聊世界系时总绕不开《EVA》和《最终兵器彼女》。前者把少年心理、使徒危机和人类补完塞进同一个房间，后者则更直白：恋爱和战争几乎绑成了一件事。它不是考试定义，更像观众用来形容「个人情绪突然背上世界重量」的 shorthand。",
    recommendations: [
      rec("Neon Genesis Evangelion", "它常被中文社区拿来当世界系参照：角色心理和世界存亡一起压上来，看完很容易懂这个标签为什么绕不开它。", "新世紀エヴァンゲリオン"),
      rec("She, The Ultimate Weapon", "这部把恋爱和战争绑得很紧，适合感受「个人关系直接连到世界危机」那种世界系压力。", "最終兵器彼女")
    ]
  },
  "fallback:魔法少女解构": {
    insight:
      "魔法少女不总是挥挥魔杖、守护爱与希望。有些作品会故意把这套可爱外壳翻过来，问你一句：如果变身真的要付代价呢？如果拯救别人也会伤到自己呢？\n\n《魔法少女小圆》就是最常被提到的入口，它把契约、愿望和代价讲得很狠；《少女革命》则更像从童话和王子梦里拆出权力关系。看这类作品时，最有意思的不是「黑化」，而是它们把熟悉的糖纸拆开，里面可能真有刀。",
    recommendations: [
      rec("Puella Magi Madoka Magica", "它几乎是现代观众理解魔法少女解构的快捷入口：愿望、契约和代价一层层翻出来，后劲很强。", "魔法少女まどか☆マギカ"),
      rec("Revolutionary Girl Utena", "这部更像把童话、王子和少女成长拆开重看，适合感受魔法少女/少女叙事背后的另一面。", "少女革命ウテナ")
    ]
  },
  "fallback:寿命论": {
    insight:
      "寿命论的刀，常常不是「有人会死」这么简单，而是两个人从设定上就没法用同一种时间生活。一个人的一生，对另一个人来说可能只是很短一段回忆，这种不对称最扎心。\n\n《葬送的芙莉莲》很适合理解这种感觉：芙莉莲不是不在意，只是她反应过来时，很多人已经走远了。《可塑性记忆》则更直接，把有限寿命和亲密关系绑在一起。看完你会发现，寿命论最狠的地方不是分别，而是明明相遇过，却注定不能同步走完。",
    recommendations: [
      rec("Frieren: Beyond Journey's End", "芙莉莲和人类同伴的时间差，是理解寿命论最温柔也最扎心的入口。", "葬送のフリーレン"),
      rec("Plastic Memories", "这部直接把有限寿命和恋爱关系绑在一起，适合感受寿命论为什么会让观众后劲很大。", "プラスティック・メモリーズ")
    ]
  },
  "fallback:圣地巡礼": {
    insight:
      "圣地巡礼最有意思的地方，是它把分镜从屏幕里带回现实。动画里一个车站、一段坡道、一家店，粉丝拿着画面去现场对位时，作品就突然多了一层可以触摸的记忆。\n\n《幸运星》让鹫宫町成了早期经典案例，《少女与战车》则把大洗町和作品绑定得更紧。它不是普通旅游，也不是单纯打卡，更像观众在现实里补上一句：「原来他们真的站在这里啊。」",
    recommendations: [
      rec("Lucky Star", "鹫宫町相关巡礼常被拿来当早期代表，看它能理解动画地点如何变成粉丝记忆。", "らき☆すた"),
      rec("Girls und Panzer", "大洗町和作品绑定很深，是理解圣地巡礼如何带动地方讨论的好例子。", "ガールズ&パンツァー")
    ]
  },
  "fallback:声优梗": {
    insight:
      "声优梗有时像隐藏的第二字幕：角色明明不认识，观众却因为同一个声音自动串戏。一个声线、一句台词，突然就能把另一部作品的记忆拽出来。\n\n这类梗玩得好会很亲切，玩过头也容易冒犯本人，所以最好停在角色联想和作品内梗上。《白箱》适合看声优和动画行业怎么运转，《阿松》这类声优阵容强的作品，则很容易让观众在弹幕里玩起声音联想。",
    recommendations: [
      rec("SHIROBAKO", "它能让你看到配音工作和动画制作的关系，理解声优为什么会被观众和角色绑得那么紧。", "SHIROBAKO"),
      rec("Mr. Osomatsu", "声优阵容存在感很强，适合感受观众如何把声音、角色和玩梗连起来。", "おそ松さん")
    ]
  },
  "fallback:作画崩坏": {
    insight:
      "作画崩坏本来是事故，但有些镜头离谱到一定程度，反而会被观众截图、转发、反复玩成名场面。大家嘴上说「崩了崩了」，手却很诚实地把图存了下来。\n\n《约会大作战 III》常被拿来聊作画质量争议，《pop子和pipi美的日常》则更狠：它干脆把破坏画面规则变成搞笑手段。前者像翻车现场，后者像故意开车上墙，放在一起看就很容易懂「崩」为什么有时也能出圈。",
    recommendations: [
      rec("Date A Live III", "它常被拿来讨论作画崩坏出圈，适合感受观众为什么会一边吐槽一边传播截图。", "デート・ア・ライブIII"),
      rec("Pop Team Epic", "这部把画面规则破坏做成搞笑风格，能对照理解「事故」和「故意崩坏」的差别。", "ポプテピピック")
    ]
  },
  "fallback:制作委员会": {
    insight:
      "制作委员会听起来像一个神秘导演组，其实更像多个出资方一起承担风险、分配权益的机制。观众讨论动画为什么这么拍、为什么续作难等时，经常会把它搬出来。\n\n但它不是万能背锅侠。企划、版权、宣发、音乐、周边都可能牵涉其中，最后呈现出来的作品，是很多利益和风险一起推出来的结果。想感受动画制作不是魔法，《白箱》会很直观；想看大型企划的复杂性，《EVA》相关讨论也常被拿来对照。",
    recommendations: [
      rec("SHIROBAKO", "它把动画制作流程拍得很直观，适合先理解一部动画背后不是只有导演和原画。", "SHIROBAKO"),
      rec("Neon Genesis Evangelion", "大型企划、制作背景和后续商业展开都很有讨论度，适合对照理解作品背后的复杂结构。", "新世紀エヴァンゲリオン")
    ]
  },
  "fallback:总集篇": {
    insight:
      "总集篇一出现，观众心里经常会咯噔一下：是不是赶不上了？但它不一定只是「水一集」，有时也承担回顾剧情、调整播出节奏、给后面内容缓冲的作用。\n\n当然，观众会紧张也不是没理由。追番时好不容易等到新一集，结果发现大半都在复盘前情，难免想吐槽。像《EVA》《凉宫春日的忧郁》这类作品的播出结构和重复体验，经常会被拿来讨论「重复」「回顾」到底是在偷懒还是在服务表达。",
    recommendations: [
      rec("Neon Genesis Evangelion", "它的后期表达和制作背景常被讨论，适合感受观众为什么会对播出结构特别敏感。", "新世紀エヴァンゲリオン"),
      rec("The Melancholy of Haruhi Suzumiya", "漫无止境的八月让重复本身成了观看体验，适合对照理解观众对重复内容的复杂反应。", "涼宮ハルヒの憂鬱")
    ]
  },
  "fallback:万策尽": {
    insight:
      "「万策尽」现在像动画工期梗里的万能表情包，但它本来不是官方公告用语。观众看到延期、停播、总集篇时，会半开玩笑地说一句：完了，万策尽了。\n\n真正让这个词好用的，是它把复杂的制作压力压成四个字：方法都用光了。看《白箱》会很容易理解这种现场感，制作进行、分镜、原画、交付时间全都挤在一起时，真的会让人替工作人员冒汗。",
    recommendations: [
      rec("SHIROBAKO", "这部几乎是理解「万策尽」的最佳入口：制作进度、交付压力和现场救火都拍得很直观。", "SHIROBAKO"),
      rec("Girls und Panzer", "它的播出延期讨论经常和制作进度联系在一起，适合对照理解观众为什么会喊万策尽。", "ガールズ&パンツァー")
    ]
  },
  "fallback:公路片": {
    insight:
      "动画里的公路片感，不一定真的有公路，也不一定有人开车。它更像一种「边走边遇见人」的结构：角色一路移动，世界观也一站一站展开。\n\n《虫师》很典型，银古每到一个地方，就遇见一种怪异和一段人的心事；《少女终末旅行》则更像末世里的边走边聊。它们的重点都不在终点，而在路上那些慢慢浮出来的东西。",
    recommendations: [
      rec("MUSHI-SHI", "每一站遇见不同的人与怪异，重点在路途见闻而非终点，很适合理解动画里的公路片感。", "蟲師"),
      rec("Girls' Last Tour", "它把旅途变成末世里的观察和对话，适合感受「边走边看世界」的另一种入口。", "少女終末旅行")
    ]
  },
  "fallback:空气系": {
    insight:
      "空气系看的不是大事件，而是停顿。它不急着让角色拯救世界，也不靠强冲突推剧情，很多时候只是让你待在一群人的生活节奏里。\n\n喜欢的人会觉得它很治愈，不喜欢的人可能会问：这集到底发生了什么？《ARIA》像一杯慢慢喝的温水，《摇曳露营》则把露营、聊天和风景变成主菜。空气系不是没内容，而是内容藏在气氛里。",
    recommendations: [
      rec("ARIA The ANIMATION", "它很适合理解空气系的慢节奏和陪伴感：没有大冲突，但每一集都像在同一个世界里多待了一会儿。", "ARIA The ANIMATION"),
      rec("Yuru Camp", "露营、吃饭、聊天和风景就是主菜，看它能直观看到日常氛围为什么也能撑起一部番。", "ゆるキャン△")
    ]
  }
};

function fallbackPayload(card: RoamCard): ColdHookPayload {
  const detail = FALLBACK_DETAILS[card.topic_key] ?? {
    insight: card.blurb,
    recommendations: []
  };
  return {
    topic_type:
      card.type === "work_fact" || card.type === "character_fact"
        ? "work"
        : card.type === "production_note" || card.type === "community_take"
          ? "phenomenon"
          : "concept",
    cold_subtype: card.type,
    topic_key: card.topic_key,
    hook: card.hook,
    blurb: card.blurb,
    insight: detail.insight,
    source_urls: card.source_urls,
    verification_status: "fallback",
    confidence: card.confidence,
    recommendations: detail.recommendations
  };
}

export const FALLBACK_ROAM_CARDS: RoamCard[] = FALLBACK_ROAM_CARD_SEEDS.map((card) => ({
  ...card,
  cold_payload: fallbackPayload(card)
}));
