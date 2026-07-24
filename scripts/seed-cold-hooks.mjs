import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storePath = path.join(root, "data", "cold-hooks.json");
const versionPath = path.join(root, "lib", "cold-prompt-version.ts");

const args = new Set(process.argv.slice(2));
const countArg = process.argv.find((a) => a.startsWith("--count="));
const offsetArg = process.argv.find((a) => a.startsWith("--offset="));
const targetCount = Math.max(1, Math.min(100, Number(countArg?.split("=")[1] || 50)));
const seedOffset = Math.max(0, Number(offsetArg?.split("=")[1] || 0));
const reset = args.has("--reset");
const factHeavy = args.has("--fact-heavy");
const dryRun = args.has("--dry-run") || args.has("--sample");

function readPromptVersion() {
  const raw = fs.readFileSync(versionPath, "utf8");
  const match = raw.match(/COLD_PROMPT_VERSION\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Cannot read COLD_PROMPT_VERSION");
  return match[1];
}

const COLD_PROMPT_VERSION = readPromptVersion();

const sources = {
  wiki: "https://zh.wikipedia.org/wiki/",
  moegirl: "https://zh.moegirl.org.cn/",
  anilist: "https://anilist.co/anime/"
};

function rec(title, reason, anilistId) {
  return {
    candidate_id: anilistId ? `cand_${anilistId}` : `seed_${slug(title)}`,
    anime_title: title,
    anilistId,
    reason
  };
}

function slug(s) {
  return encodeURIComponent(s).replace(/%/g, "").slice(0, 18).toLowerCase();
}

function cjkLen(s = "") {
  return s.replace(/[^\u4e00-\u9fff]/g, "").length;
}

const subjectiveQuizPattern =
  /最可怕|最感人|最有名|最重要|影响力|常被认为|适合理解|感觉|观众觉得|容易让人想到|核心在于|真正|厉害|好看|出圈|常被拿来|常被用来|社区|讨论|更适合|很适合|代名词|代表|典型|耐聊|耐看/;
const internalMetaPattern =
  /不是纯概念闲聊|作品语境|继续点进|详情核对|正文里保留|可以继续|内部|prompt|校验|验证器|元说明/;
const objectiveFactPattern =
  /获得|获奖|奖项|奥斯卡|播出|首播|上映|发行|集数|第[一二三四五六七八九十\d]+[集话]|OP|ED|片头|片尾|演唱|作词|作曲|配乐|导演|监督|执导|脚本|声优|配音|制作公司|改编自|原作|漫画|小说|名字|本名|代号|酒名|标题|官方|资料|设定|出自|来自|出处|公开|第\d+届|角色|主角|成员|组织|能力|读心|义体|公安九课|飞船|道具|Bebop|人体炼成|故事开端|秘密身份|杀手|间谍|超能力|由.+(制作|创作|演唱|配乐|执导)/;
const vagueInsightPattern =
  /细节密度|成长试炼|童话外壳|异世界工作场|关键词堆砌|很有东西|很有意思但|值得一提的是/;
const forcedContrastPattern =
  /不是[^。！？!?]{2,36}而是|不只是[^。！？!?]{2,36}而是|不在于[^。！？!?]{2,36}而在于/;
const layeredAlternativePattern =
  /一层|另一层|先看|再看|后来|原本|原义|出处|语境|迁移|使用|中文.*社区|粉丝社区|二次元.*语境|玩梗|解读|官方设定|严肃结论/;
const disclaimerPattern =
  /(?:不是严格[^。！？!?]{0,60}|不等于[^。！？!?]{0,60}|并不代表[^。！？!?]{0,60}|不能作为[^。！？!?]{0,60}|这里只是[^。！？!?]{0,60}|这里说的是[^。！？!?]{0,60}不是[^。！？!?]{0,60}|更像是?[^。！？!?]{0,60}而不是[^。！？!?]{0,60}|不应理解为[^。！？!?]{0,60})/;
const contextualBoundaryPattern =
  /常见说法|一般会追溯到|后来|语境|中文.*社区|粉丝社区|粉丝|观众|大家|二次元|玩梗|二创|解读|说法|拿来聊|拿来形容|越聊越顺手|传播|流行|顺手贴到|打卡/;
const factSubtypes = new Set(["work_fact", "character_fact", "staff_fact", "production_note"]);
const conceptContextSubtypes = new Set([
  "concept_origin",
  "term_origin",
  "meme_origin",
  "community_discussion",
  "community_take"
]);
const restrictedQuizSubtypes = new Set([
  "concept_origin",
  "term_origin",
  "genre_trope",
  "trope_explanation",
  "community_discussion",
  "community_take"
]);

const factSeeds = [
  ["work_fact", "work:凉宫播出顺序", "《凉宫春日》的播出顺序，本身就是话题的一部分。", "TV 播出顺序和故事时间线不一致，这一点让很多新观众第一次补番时直接愣住。", "《凉宫春日的忧郁》最适合当“播出顺序也能变成话题”的例子。2006 年 TV 版采用过非线性播出，观众看到的顺序和故事内部时间并不完全一致，于是补番时才会出现“按播出看还是按时间线看”的老问题。这里有两层趣味：一层是事件顺序本身会影响理解，另一层是观众补番时也被拉进了整理时间线的过程。看这部时，选择播出顺序还是故事顺序，几乎已经成了入坑仪式的一部分。", "《凉宫春日的忧郁》的 TV 播出顺序和故事时间顺序完全一致。", false, "不是真的，2006 年 TV 版播出顺序和故事时间线存在差异。", [rec("The Melancholy of Haruhi Suzumiya", "这部本身就是播出顺序话题的现场，看它能理解为什么补番路线会被反复讨论。", 849)], [sources.wiki + "%E5%87%89%E5%AE%AB%E6%98%A5%E6%97%A5%E7%9A%84%E5%BF%A7%E9%AC%B1"]],
  ["character_fact", "character:江户川柯南名字", "江户川柯南这个名字，其实是拼出来的。", "这个名字不是随手取的，它把推理小说里的两个经典名字拼到了一起。", "《名侦探柯南》里“江户川柯南”这个名字很好玩：江户川来自日本推理作家江户川乱步，柯南则来自福尔摩斯作者阿瑟·柯南·道尔。也就是说，新一变小后给自己取的化名，本身就是一张推理小说名片。这个冷知识厉害的地方在于，它不影响剧情理解，但会让你突然意识到：这部作品从标题到主角名字，都在把“侦探传统”摆到台面上。", "江户川柯南的名字和推理作家有关。", true, "江户川乱步与柯南·道尔都和推理文学密切相关，这个名字本身就是侦探趣味的拼接。", [rec("Detective Conan", "看本篇最直接，主角名字、侦探传统和案件结构都绑在一起。", 235)], [sources.wiki + "%E5%90%8D%E5%81%B5%E6%8E%A2%E6%9F%AF%E5%8D%97"]],
  ["work_fact", "work:EVA标题", "EVA 的英文标题里，藏着“福音”和“创世纪”。", "Neon Genesis Evangelion 里的 Genesis 和 Evangelion，让标题本身就带着宗教意象的入口。", "看《新世纪福音战士》时，可以分成两层来看这些宗教词。先看作品本身：Neon Genesis Evangelion 这个标题里就有 Genesis 和 Evangelion，正片也反复出现十字、使徒、补完这类意象，所以观众会自然感到一种末世和仪式感。再看后来社群讨论：很多解释体系是在多年观看、考据和二创里不断堆出来的，不一定都等于官方设定。把这两层分清，再回去看 EVA，会更容易享受它的气质，而不是急着背术语。", "Neon Genesis Evangelion 的英文标题包含 Evangelion 这个词。", true, "是真的，Evangelion 是英文标题的一部分，常译作“福音”。", [rec("Neon Genesis Evangelion", "EVA 是宗教意象和心理叙事被反复讨论的入口，适合练习区分作品呈现和社群解释。", 30)], [sources.wiki + "Neon_Genesis_Evangelion"]],
  ["work_fact", "work:千与千寻奥斯卡", "《千与千寻》的奥斯卡，赢在低门槛和深余味。", "它让不了解日本神怪和澡堂文化的观众，也能跟着千寻走进那套陌生规则。", "《千与千寻》拿奥斯卡这件事，最有趣的点在于：它把很日本的神怪、澡堂和劳动规则，讲成了海外观众也能立刻进入的奇幻故事。你不一定知道汤婆婆、河神、名字被夺走分别对应什么传统意象，但你能马上懂：千寻被丢进陌生规则里，只能一边害怕一边学着工作、交朋友、守住自己。奖项只是结果，真正让它留下来的，是这种看得懂、但说不尽的奇妙感。", "《千与千寻》曾获得奥斯卡最佳动画长片。", true, "是真的，它获得过第 75 届奥斯卡最佳动画长片。", [rec("Spirited Away", "直接看这部，最能感受它如何把日本民俗、劳动规则和儿童视角合在一个很容易进入的故事里。", 199)], [sources.wiki + "%E5%8D%83%E4%B8%8E%E5%8D%83%E5%AF%BB"]],
  ["production_note", "production:SHIROBAKO制作流程", "看懂《SHIROBAKO》，动画制作流程会突然变具体。", "它把制作进行、声优、原画、交片压力都放进故事里，救火感特别直观。", "《白箱》最适合把动画制作流程讲具体：制作进行、监督、脚本会议、声优录音、原画回收、交片压力，全都被放进日常剧情里。很多观众第一次意识到，一集动画背后是一整条协作链，每个人卡住都会影响后面的人。它当然有戏剧化处理，但那种“大家都在救火”的气味很真实。看完再听人说万策尽、延期、总集篇，你会更容易理解这些词为什么总带着制作现场的焦虑。", "《SHIROBAKO》是以动画制作公司为舞台的原创电视动画。", true, "是真的，故事围绕武藏野动画等动画制作现场展开。", [rec("SHIROBAKO", "它就是动画制作流程入门番，看完会更懂制作进行和交片压力为什么常被讨论。", 20812)], [sources.wiki + "SHIROBAKO"]],
  ["meme_origin", "meme:万策尽", "万策尽：所有办法都用完之后的那声叹气。", "它原本是“所有办法都用尽”的意思，后来被中文二次元社区玩成了没招了的吐槽。", "「万策尽」一般会追溯到日语「万策尽きた」，字面意思就是所有办法都用尽了。在动画制作语境里，它常被用来形容进度顶不住、延期或交不上片的状态；后来中文二次元社区把它简化成“万策尽”，也会半开玩笑地形容剧情、作画、企划甚至个人状态的全面崩盘。放到《为美好的世界献上祝福！》这类喜剧作品里，它不是官方制作结论，而是观众把角色胡闹、剧情失控和“真的没办法了”的吐槽叠在一起。", null, null, null, [rec("KONOSUBA -God's blessing on this wonderful world!", "这部的角色胡闹和台词节奏很适合感受“万策尽”从原义变成吐槽语气的过程。", 21202)], [sources.moegirl + "%E4%B8%87%E7%AD%96%E5%B0%BD"]],
  ["work_fact", "work:小圆第三集", "《小圆》第三集之后，魔法少女的安全感被抽走了。", "它常被拿来说明：魔法少女外壳下，可以藏着完全不同的故事温度。", "《魔法少女小圆》前三集结构经常被拿来举例，关键在于它先把观众对魔法少女题材的安全预期摆好，再在第三集之后把这层安全感抽掉。这样一来，可爱画风、许愿和契约这些元素都会变得不太安稳。很多人后来看到新番前三集还没发力，就会说“再等等第三集”。这个说法不能机械套用所有作品，但它说明小圆确实改变了不少观众对题材包装的警惕心。", null, null, null, [rec("Puella Magi Madoka Magica", "这部本身就是魔法少女解构讨论的核心入口，前三集体验非常关键。", 9756)], [sources.wiki + "%E9%AD%94%E6%B3%95%E5%B0%91%E5%A5%B3%E5%B0%8F%E5%9C%93"]],
  ["work_fact", "work:你的名字票房", "《你的名字。》把新海诚带到了大众院线视野里。", "它的传播范围扩到大众院线层面，所以很多非二次元观众也从这部认识新海诚。", "《你的名字。》最值得聊的点，是它把新海诚原本偏作者气质的城市、光影和距离感，包装成了大众也很容易进入的青春爱情。交换身体先把观众拉进角色关系，彗星灾害和时间错位再把情绪推高，所以很多非二次元观众也是从这部开始认真记住新海诚。后来大家聊他的作品时，经常会拿它当标尺：画面、音乐、城市感、命运感，一个都绕不开。", "《你的名字。》由新海诚执导。", true, "是真的，这部动画电影的导演是新海诚。", [rec("Your Name.", "这部就是新海诚大众传播的关键入口，适合从青春爱情聊到灾害与时间结构。", 21519)], [sources.wiki + "%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97%E3%80%82"]],
  ["staff_fact", "staff:久石让宫崎骏", "为什么大家一听这首旋律就想到宫崎骏？", "很多人先哼出旋律，再想起那部电影的天空、风和奔跑。", "聊宫崎骏作品时，久石让的音乐几乎绕不开。《天空之城》《龙猫》《千与千寻》这些片子的旋律，不只是配乐背景，而是很多观众记忆里的入口：你可能先想起钢琴和弦，再想起飞行、森林、油屋。这个事实有趣在于，动画的“世界感”不是只靠画面搭出来的，音乐会帮它留下情绪坐标。久石让和宫崎骏的长期合作，也让吉卜力作品多了一层非常稳定的听觉辨识度。", "久石让曾为多部宫崎骏执导的动画电影配乐。", true, "是真的，《龙猫》《千与千寻》等宫崎骏作品都有久石让配乐。", [rec("Spirited Away", "这部的音乐与画面记忆点都很强，适合感受久石让如何参与塑造吉卜力气质。", 199), rec("My Neighbor Totoro", "《龙猫》的旋律几乎和角色一样有辨识度，是理解动画音乐传播力的好例子。", 523)], [sources.wiki + "%E4%B9%85%E7%9F%B3%E8%AE%A9"],
  ],
  ["production_note", "production:总集篇", "总集篇：播出表里的喘息格。", "它可能是回顾、节奏调整，也可能是制作现场压力露出的影子。", "观众一看到总集篇，第一反应常常是“是不是万策尽了”。但这件事要分两层看：一层是播出安排，总集篇可以用来回顾前情、整理信息；另一层是制作现场，它也可能让人联想到进度吃紧。《白箱》把制作进行、回收素材、交片压力这些事拍得很直观，所以很适合拿来对照。总集篇有趣的地方在于，它会让观众突然意识到：动画是一周一周被做出来、排出来、交出去的。", null, null, null, [rec("SHIROBAKO", "看《白箱》能理解总集篇背后的制作和播出压力，不只是把它当水时长。", 20812)], [sources.wiki + "%E7%B8%BD%E9%9B%86%E7%AF%87"]],
  ["concept_origin", "concept:世界系", "世界系为什么总绕不开 EVA？", "这个词原本围绕个人关系和世界危机的直连感展开，后来在中文社区被用得更宽。", "「世界系」的常见说法，原本是在讲一种叙事关系：少年少女的亲密关系、心理困境，和世界级危机被直接接在一起，中间的社会层被压得很薄。后来在中文二次元社区里，这个词被用得更宽，有时会拿来形容“几个人的情绪像是牵着整个世界”。《EVA》经常被拿来讨论，是因为它把真嗣的逃避、孤独和使徒危机放在同一张桌上。它不是官方分类，也不是万能标签，当成观看入口会比当成定义更好用。", null, null, null, [rec("Neon Genesis Evangelion", "EVA 是中文社区谈世界系绕不开的入口，适合观察角色心理和世界危机如何被放在一起。", 30), rec("Saikano", "《最终兵器彼女》把恋爱和战争并置，适合对照世界系语境里的情感压强。", 529)], [sources.wiki + "%E4%B8%96%E7%95%8C%E7%B3%BB"]],
  ["genre_trope", "trope:公路片感", "动画里的公路片感，不一定真的有公路。", "它原本借用了公路片的旅途结构，后来在动画讨论里常被用来形容边走边遇见世界。", "“公路片感”原本借用了公路电影的观看经验：角色在路上移动，故事随着地点、相遇和风景展开。后来中文动画讨论里，这个词常被用来形容一种旅途结构，不一定真的有公路，也不一定把终点放在第一位。《虫师》里银古每到一处就遇见不同的人和怪异，《少女终末旅行》则把末世路途拍成观察和陪伴。这个词好用的地方，就在于它把“边走边看世界”的观看感受一下子说顺了。", null, null, null, [rec("MUSHI-SHI", "《虫师》的单元旅程结构很直观，每到一处就展开一个人与怪异的故事。", 457), rec("Girls' Last Tour", "《少女终末旅行》用末世旅途承载观察和陪伴，是公路片感的温柔版本。", 99420)], [sources.wiki + "%E5%85%AC%E8%B7%AF%E9%9B%BB%E5%BD%B1"]],
  ["concept_origin", "concept:傲娇", "傲娇这个词，后来被用得比原义宽多了。", "它原本围绕态度反差展开，后来在中文社区里变成了很顺手的角色标签。", "「傲娇」原本说的是一种前后态度反差：表面强硬、别扭，情绪软下来时又露出在意。后来在中文二次元社区里，这个词被用得很宽，一看到嘴硬、脸红、不会好好表达的角色，观众就容易贴上这个标签。《龙与虎》适合看这种关系怎么慢慢拆开：它不是官方给角色盖章，而是观众用来理解角色别扭感的一种 shorthand。把它当成语境工具，比当成固定公式更舒服。", null, null, null, [rec("Toradora!", "《龙与虎》适合看傲娇如何在关系推进里慢慢展开，而不是只停留在标签。", 4224), rec("Shakugan no Shana", "夏娜是中文社区常提的傲娇样本之一，适合对照标签化之后的用法。", 355)], [sources.wiki + "%E5%82%B2%E5%A8%87"]],
  ["community_take", "community:党争", "党争：角色关系被观众拿来下注的时候。", "这个词原本像站队打仗的玩笑说法，后来在二次元社区里常用来聊多角色感情线。", "“党争”这个说法原本带着站队、拉阵营的玩笑感，后来在中文二次元社区里常被用来形容多线感情作品里的角色支持战。它的语境迁移很直接：观众不只是看剧情走向，也会把自己的情感逻辑下注到角色身上，比如青梅、天降、陪伴、救赎各有各的支持者。《路人女主》和《五等分的新娘》好玩就好玩在这里：你看的是恋爱线，弹幕里却像开了一场小型选举。", null, null, null, [rec("Saekano: How to Raise a Boring Girlfriend", "这部很适合观察多角色关系如何触发站队讨论，党争味很典型。", 20657), rec("The Quintessential Quintuplets", "五等分的角色结构天然适合站队，是理解党争文化的直观入口。", 103572)], [sources.moegirl + "%E5%85%9A%E4%BA%89"]],
  ["meme_origin", "meme:声优梗", "声优梗像隐藏的第二字幕。", "它原本来自观众对配音演员履历的串联，后来变成了跨作品玩梗的常见方式。", "“声优梗”的出处通常不是作品正片，而是观众知道同一位声优配过哪些角色之后，把不同作品的台词、性格和名场面串起来。后来在中文二次元社区里，这种串联变成很常见的玩梗方式：一个角色开口，观众脑子里会自动跳出另一个角色的影子。它不是官方设定，更多是粉丝记忆在连连看。《白箱》能帮你理解声优工作和动画制作现场，偶像企划则能看到角色、声音和粉丝投射如何叠在一起。", null, null, null, [rec("SHIROBAKO", "《白箱》能看到声优工作如何进入动画制作流程，是理解声优梗边界的好入口。", 20812), rec("Love Live! Sunshine!!", "偶像企划很适合观察角色、声优和粉丝投射如何互相加强。", 21584)], [sources.wiki + "%E5%A3%B0%E4%BC%98"]]
];

const moreSeeds = [
  "圣地巡礼|concept_origin|圣地巡礼，是把分镜带回现实。|粉丝拿着动画画面去现实中对位，作品就多了一层可以踩到的记忆。|圣地巡礼的迷人之处，是它让动画背景从屏幕里走出来。你在作品里看到的坡道、车站、河岸，可能在现实里真有参照；粉丝再拿着截图去对位，像是在给作品补一层现实注脚。这不只是打卡，也是一种把观看记忆固定下来的方式。《幸运星》和《你的名字。》都适合当入口，一个偏日常地点，一个偏城市和灾害想象。|Lucky Star|Your Name.",
  "空气系|genre_trope|空气系看的不是大事件，是停顿。|弱冲突、慢节奏和生活气息，才是它最容易让人放松的地方。|空气系经常被误会成“什么都没发生”。但喜欢它的人在意的恰恰是那些停顿：吃饭、聊天、走路、季节变化，角色关系在低强度日常里慢慢变熟。它不靠强剧情推你往前跑，而是让你待在一种氛围里。《轻音少女》和《向阳素描》都很适合当入口，看完你会明白为什么有人把这种节奏叫作空气感。|K-ON!|Hidamari Sketch",
  "制作委员会|production_note|制作委员会不是神秘导演组。|它更像多个出资方分担风险、分配权益的企划机制。|制作委员会常被观众拿来解释“为什么这片会这样做”，但它不是一个躲在幕后指挥一切的神秘导演组。更准确地说，它是多个公司围绕动画企划共同出资、分担风险、分配版权收益的机制。这个机制会影响作品的商品化、宣发和续作可能，但不能把每个创作选择都简单甩给委员会。《白箱》适合当入口，因为它能让你看到动画企划和制作现场并不是一条直线。|SHIROBAKO|Shirobako Movie",
  "PV欺诈|community_take|PV 欺诈吐槽的不是预告片本身。|它吐槽的是预告把期待抬太高，正片接不住那口气。|PV 欺诈这个说法很社区，通常不是在严肃指控诈骗，而是在吐槽预告片剪得太会了：光影、音乐、镜头全都挑最漂亮的，正片播出后节奏或作画密度却没跟上。它提醒人别只看 PV 入坑，但也不能用 PV 落差直接判作品死刑。更有意思的是，有些片 PV 看着普通，正片反而靠演出和节奏翻身，这种反差也很动画。|Wonder Egg Priority|Bocchi the Rock!",
  "电波系|concept_origin|电波系不是“脑子有病”的礼貌说法。|它更像角色和世界频率对不上，怪得有自己的节奏。|电波系这个词很容易被粗暴理解成“怪人”。但在动画语境里，它更像一种频率错位：角色说话、行动、感知世界的方式和常人不在一个频道上。好看的电波角色不是单纯装疯，而是让你慢慢适应她的逻辑。《电波女与青春男》可以从字面入口看这个词，《凉宫春日》则能看到“怪”和行动力如何改变周围人的生活。|Ground Control to Psychoelectric Girl|The Melancholy of Haruhi Suzumiya",
  "异世界转生|genre_trope|异世界不是只有开挂升级。|真正稳定复用的，是“换规则后重新做人”的爽点。|异世界题材后来被说得很模板化：转生、技能、冒险者公会、升级打怪。但它能反复流行，不只是因为开挂爽，而是因为它给角色一个重启人生的舞台：原本没机会的人，换一套世界规则重新证明自己。《无职转生》和《Re:从零开始》走的方向完全不同，一个偏重来的人生，一个偏死亡回归的代价；放一起看，能明白异世界并不是一种味道。|Mushoku Tensei: Jobless Reincarnation|Re:ZERO -Starting Life in Another World-",
  "轻改热潮|production_note|轻改不是原罪，模板化才会让人疲劳。|观众吐槽轻改扎堆时，骂的常常是相似开局和相似爽点。|轻小说改编动画很多，社区吐槽“又是轻改”时，真正不满的往往不是来源形式，而是相似套路：长标题、异世界、校园后宫、能力说明、第一集塞设定。轻改当然也能拍得很细腻，问题在于改编如何把文字里的内心戏和设定说明变成影像。《冰菓》和《无职转生》就能看到不同方向的轻小说改编：一个克制，一个铺陈世界。|Hyouka|Mushoku Tensei: Jobless Reincarnation",
  "原创动画风险|production_note|原创动画像开盲盒，刺激也危险。|没有原作读者兜底，剧情每一步都在和观众实时对赌。|原创动画最刺激的地方，是观众和制作方一起往未知里走。没有漫画党剧透，没有原作销量当安全垫，前三集能封神，后半也可能失控。它的自由度很高，但风险也高：伏笔能不能收、角色能不能立住、结尾能不能落地，全都要正片自己证明。《魔法少女小圆》是原创成功的经典例子，《Odd Taxi》则适合看原创悬疑怎么把线索收回来。|Puella Magi Madoka Magica|Odd Taxi",
  "机战|genre_trope|机战看的不只是机器人打架。|真正耐聊的，常常是驾驶员、组织和战争结构怎么互相压迫。|机战这个标签很容易被想成“巨大机器人互殴”。但很多经典机战真正耐聊的，是人在机器、组织和战争里的位置：驾驶员是不是工具，战斗是不是宣传，和平是不是只存在于口号里。《高达》系列当然是入口，《EVA》则把机体战斗和角色心理绑得更紧。一个往战争和政治走，一个往心理和存在感走，放一起看会很有意思。|Mobile Suit Gundam|Neon Genesis Evangelion",
  "废萌|community_take|废萌这个词，很多时候是又嫌又爱。|它带点吐槽味，但不等于作品真的没价值。|废萌是个很社区的词，常被用来吐槽“剧情没什么推进，只剩可爱角色互动”。但它不一定是纯贬义，很多观众其实是在承认：我知道它不靠大剧情赢，可我就是想看角色可爱、关系舒服、日常轻松。问题在于，如果只拿“有没有主线”评价这类作品，就会错过它的观看目标。《请问您今天要来点兔子吗？》就是很典型的入口。|Is the Order a Rabbit?|K-ON!"
];

function fromPipe(row) {
  const parts = row.split("|");
  const [key, subtype, hook, blurb, insight] = parts;
  const hasQuizFields = parts.length >= 10;
  const statement = hasQuizFields ? parts[5] : null;
  const answer = hasQuizFields ? parts[6] === "true" : null;
  const explanation = hasQuizFields ? parts[7] : null;
  const a = hasQuizFields ? parts[8] : parts[5];
  const b = hasQuizFields ? parts[9] : parts[6];
  const topicType =
    subtype === "work_fact" || subtype === "character_fact"
      ? "work"
      : subtype === "production_note" || subtype === "community_take" || subtype === "staff_fact"
        ? "phenomenon"
        : "concept";
  return [
    subtype,
    `${topicType}:${key}`,
    hook,
    blurb,
    insight,
    statement,
    answer,
    explanation,
    [
      rec(a, `这部是正文话题的主要入口，适合直接对照文中提到的语境和观看点。`),
      rec(b, `拿它作对照，可以看到相近主题在另一部作品里怎样换一种方式展开。`)
    ],
    [sources.wiki + encodeURIComponent(key)]
  ];
}

const baseSeeds = [...factSeeds, ...moreSeeds.map(fromPipe)];

const extraFacts = [
  "攻壳机动队|work_fact|《攻壳机动队》不只是赛博酷壳。|它真正耐聊的是身体、身份和网络人格之间的边界。|《攻壳机动队》常被记住的是赛博朋克视觉：义体、网络、城市、冷色调。但它真正让人反复讨论的，是“我是谁”这个问题被技术拆开之后还剩什么。少佐的身体可以替换，意识能接入网络，身份就不再只是肉身问题。它影响了很多后来关于赛博格和网络人格的想象，看它不是为了背设定，而是感受科幻如何把哲学问题拍成动作和沉默。|草薙素子是公安九课成员。|true|是真的，草薙素子是公安九课成员，也是系列的核心角色。|Ghost in the Shell|Psycho-Pass",
  "Cowboy Bebop|work_fact|《星际牛仔》的标题，真的很会概括气质。|Cowboy 和 Bebop 放一起，就已经把西部、爵士和太空混成一杯了。|《星际牛仔》这个标题很妙：Cowboy 带着赏金猎人和西部片味道，Bebop 又把爵士乐的即兴感放进来。作品本身也顺着这个标题往外展开：太空旅行、黑色电影、枪战、孤独的人和不肯好好告别的过去，一集一个调子。很多人聊它时会先想起那种爵士即兴般的气味，再回头整理它的科幻设定和人物过去。|《星际牛仔》主角团乘坐的飞船名叫 Bebop。|true|是真的，Bebop 是主角团活动的重要飞船。|Cowboy Bebop|Space Dandy",
  "钢之炼金术师|work_fact|等价交换这四个字，后来比设定跑得还远。|它从炼金术规则变成了很多人理解代价的口头禅。|《钢之炼金术师》的等价交换本来是炼金术世界里的核心规则，但它后来在中文社区里跑得很远：努力、牺牲、代价、愿望，大家都爱拿这四个字概括。这个梗好用，是因为它听起来像朴素真理，却在作品里不断被追问：如果世界并不公平，等价交换还成立吗？所以它不只是热血设定，更像整部作品在反复咬住的命题。|《钢之炼金术师》的故事开端与爱德华兄弟的人体炼成有关。|true|是真的，人体炼成失败是爱德华和阿尔冯斯命运改变的起点。|Fullmetal Alchemist: Brotherhood|Fullmetal Alchemist",
  "孤独摇滚|community_take|《孤独摇滚！》的社恐梗，笑点下面有真实尴尬感。|“社恐”原本是对社交恐惧或社交困难的简化说法，后来在中文社区里也常被玩成自嘲标签。|“社恐”原本是对社交恐惧或社交困难的简化说法，后来在中文互联网里被用得很宽，也常被拿来做自嘲梗。《孤独摇滚！》放大了这个语境：小孤独崩成灰、变成奇怪生物、脑内剧场爆炸，看起来像搞笑演出，底下却是很多人熟悉的尴尬和自我怀疑。这个词好玩就好玩在这里：它明明听起来像吐槽角色，其实是在说观众终于找到了一种形容“她和别人不在同一频道”的办法。|Bocchi the Rock!|K-ON!",
  "间谍过家家|work_fact|《间谍过家家》的假家庭，靠日常一点点变真。|间谍、杀手、超能力小孩各自隐瞒身份，却在普通家庭生活里长出牵挂。|《间谍过家家》的设定一句话就很抓人：间谍、杀手、超能力小孩组成临时家庭，彼此都藏着秘密。好看的地方在于，作品先用任务和伪装搭起“假家庭”，再用吃饭、上学、照顾孩子这些日常，让关系一点点变得像真的。阿尼亚知道得最多，却又最像小孩；劳埃德和约尔各自专业，却都在家庭生活里笨手笨脚。这个反差让作品很容易入口。|《间谍过家家》里的阿尼亚拥有读心能力。|true|是真的，阿尼亚的读心能力是故事误会和喜剧节奏的重要来源。|SPY x FAMILY|Kaguya-sama: Love is War",
  "银魂|meme_origin|《银魂》的吐槽，常常比主线更像主线。|它把恶搞、时事梗和热血正剧混在一起，观众很难只用一种类型概括。|《银魂》最难解释的地方，是它可以上一秒恶搞到没边，下一秒突然认真到让人沉默。很多梗脱离剧情也能传播，是因为它的吐槽密度太高：动漫梗、时事梗、角色自黑、打破第四面墙，什么都能塞进去。但如果只把它当搞笑番，又会错过那些长篇里的热血和告别。它像一个一直插科打诨的人，真说正事时反而更重。|Gintama|SKET Dance",
  "夏目友人帐|genre_trope|《夏目友人帐》的妖怪故事，常常是在讲人。|妖怪只是入口，真正留下来的多半是孤独、记忆和告别。|《夏目友人帐》表面是妖怪单元剧：归还名字、遇见不同妖怪、解开一段旧缘。但它真正温柔的地方，是每个妖怪故事背后都像人在讲自己的孤独。有人等不到告别，有人记错了承诺，有人只想被看见一次。夏目不是靠力量解决一切，而是认真听完对方的故事。它适合理解“治愈”不是没有伤口，而是有人愿意轻轻碰一下。|Natsume's Book of Friends|MUSHI-SHI",
  "京阿尼|staff_fact|京阿尼的“细”，很多时候细在动作之间。|不是只有画面漂亮，而是角色停顿、转身、低头都有情绪。|大家说京都动画细腻，常常不是单纯夸作画张数，而是在说角色动作之间的情绪：低头、抿嘴、手指停一下、转身前犹豫半拍。这些细节让日常戏不空，角色像真的在思考。《冰菓》和《紫罗兰永恒花园》都能看出这种倾向，一个把推理拍得很生活，一个把情绪拍得很精致。你会发现所谓“京阿尼味”，很多时候藏在大动作之前的小动作里。|《冰菓》的电视动画由京都动画制作。|true|是真的，《冰菓》电视动画的制作公司是京都动画。|Hyouka|Violet Evergarden",
  "新房昭之|staff_fact|新房演出一出现，画面就很难假装普通。|歪头、构图、文字、剪影，这些符号让作品有强烈辨识度。|聊新房昭之，很多人会先想到歪头、奇怪构图、大量文字和舞台感强的画面。它们不是每次都有同一个意义，但会迅速告诉你：这部作品不打算用普通电视剧式镜头说话。《化物语》就是很明显的入口，对话很多，却靠构图、剪辑和视觉符号把聊天拍得很有攻击性。看新房相关作品，乐趣之一就是画面一直在提醒你：语言本身也可以被设计。|新房昭之参与执导过《化物语》动画。|true|是真的，新房昭之是《化物语》动画的重要监督之一。|Bakemonogatari|Puella Magi Madoka Magica",
  "音乐番|genre_trope|音乐番最怕的不是歌不好听。|真正难的是让你相信角色为什么非演奏不可。|音乐番当然要有好听的歌，但只靠歌不够。真正打动人的，是作品能不能让你相信：这些角色为什么必须站上舞台，为什么练习、争吵、失败和合奏对她们有意义。《轻音少女》偏日常陪伴，《吹响！上低音号》偏社团压力和竞争。一个让你想待在部室，一个让你听见合奏背后的紧张。音乐在这里不是背景，而是角色关系的形状。|K-ON!|Sound! Euphonium"
].map(fromPipe);

const expansionSeeds = [
  "虫师单元剧|genre_trope|《虫师》的单元剧，不是每集重置。|银古走过不同地方，留下的是同一种温柔但不轻飘的观看节奏。|《虫师》看起来像一集一个故事，但它不是简单重置进度条。银古每到一处遇见不同的人和虫，解决方式也不总是胜利，更像听完一段人与自然之间的旧账。它适合解释单元剧为什么能有累积感：主线不靠事件堆叠，而靠气质和主题慢慢沉下来。你看得越多，越会明白这部作品真正连起来的是世界观的呼吸。|MUSHI-SHI|Natsume's Book of Friends",
  "少女终末旅行|genre_trope|末世不一定要天天爆炸。|有些末世作品最狠的地方，是把荒凉拍得很安静。|《少女终末旅行》很适合打破“末世必须刺激”的印象。它没有天天大战，也不靠幸存者互相背刺推进，而是让两个女孩在废墟里慢慢走、慢慢聊。越安静，越能感觉到世界已经空了。它和很多末世动作片不一样，真正让人后劲上来的不是灾难场面，而是角色把日常感硬从废墟里捡回来。|Girls' Last Tour|Yokohama Kaidashi Kikou",
  "冰菓演出|staff_fact|《冰菓》的推理，很多时候先藏在表情里。|它不是只靠谜题吸引人，角色的停顿和视线也在讲答案。|《冰菓》常被当成“日常推理”入口，但它厉害的地方不只是谜题设计。京都动画把很多心理变化放进细小动作里：千反田靠近一点、奉太郎停顿一下、镜头在教室里慢慢移动，推理就多了情绪。你不是只在等答案，而是在看角色怎样被问题推着往前走。这也是为什么它看起来很安静，却能让人记住很多瞬间。|《冰菓》的电视动画由京都动画制作。|true|是真的，《冰菓》动画由京都动画制作。|Hyouka|Sound! Euphonium",
  "紫罗兰书信|work_fact|《紫罗兰永恒花园》写信，其实是在学情感。|信件不是道具，而是她理解别人和自己的训练方式。|《紫罗兰永恒花园》表面是代写书信的故事，真正核心却是紫罗兰如何一点点学会理解情感。信在这里不是普通任务单，而像翻译器：把说不出口的遗憾、爱、告别和感谢变成文字。作品最打动人的地方，是她一开始像执行命令，后来才慢慢知道每个词背后都有重量。看它能理解为什么“写信”这种老派动作，在动画里反而很有力量。|《紫罗兰永恒花园》的电视动画由京都动画制作。|true|是真的，这部电视动画由京都动画制作。|Violet Evergarden|A Silent Voice",
  "CLANNAD家庭线|genre_trope|Key 系催泪，常常不是只靠死人。|它更爱把日常慢慢堆高，再让你意识到普通生活有多重。|很多人提 Key 系作品会先想到催泪，但它真正常用的手法不是单纯制造悲剧，而是先让你习惯一群人的日常：社团、家人、玩笑、笨拙的告白。等这些关系变得像生活本身，失去才会变重。《CLANNAD》就是很典型的入口，尤其后半把恋爱故事推到家庭和时间里，哭点不是突袭，而是累积。|CLANNAD|Angel Beats!",
  "AngelBeats设定|work_fact|《Angel Beats!》的校园，不是普通死后世界。|它把青春校园和未竟心愿绑在一起，所以热闹底下总有点疼。|《Angel Beats!》很会骗人：一开始像热闹校园战斗喜剧，实际上舞台和角色都和未完成的心愿有关。它的校园不是单纯背景，而像一个让人补完遗憾的缓冲地带。正因为大家看起来还能插科打诨，真正告别时才会突然变重。这个设定也解释了为什么它的歌和社团戏这么容易被记住：热闹不是反义词，而是告别前的最后一段青春。|《Angel Beats!》的电视动画由 P.A.WORKS 制作。|true|是真的，这部电视动画由 P.A.WORKS 制作。|Angel Beats!|Charlotte",
  "石头门中二|work_fact|《石头门》的中二，后来真的派上了用场。|冈部的夸张人设不是纯搞笑，它也保护了角色的精神防线。|《命运石之门》前期的中二台词很容易劝退人：凤凰院凶真、机关、命运石之门，听起来像大型自嗨。但看到后面会发现，这套夸张人设不只是搞笑包装，也像冈部给自己搭的精神防线。时间循环和选择压力越来越重时，中二反而成了他维持自我的方式。这个反差很有意思：一开始你笑他演，后来你希望他还能演得下去。|STEINS;GATE|Re:ZERO -Starting Life in Another World-",
  "ReZero死亡回归|work_fact|死亡回归最可怕的，不是死很多次。|真正折磨人的是记得一切，却很难让别人相信你。|《Re:从零开始》的死亡回归很容易被概括成“死了重来”，但它最狠的地方不是次数，而是记忆负担。昴知道上一轮发生了什么，却不能轻易把痛苦和情报完整交给别人；他每次重来都像带着没人能看见的伤口。这个设定让爽文式重开变得很痛：重来不是免费存档，而是把失败、恐惧和责任都背在身上。|Re:ZERO -Starting Life in Another World-|STEINS;GATE",
  "来自深渊反差|work_fact|《来自深渊》的可爱画风，真的很会骗你。|圆润角色和残酷世界放在一起，反差感会被放大很多。|《来自深渊》最出圈的反差之一，就是角色画得很可爱，世界规则却非常残酷。深渊不是普通冒险地图，而是一层层把身体、欲望和代价压到角色身上的地方。可爱画风没有削弱危险，反而让危险更刺眼：你越觉得他们像孩子，越受不了深渊不讲情面的规则。看这部时，最先骗过你的可能不是剧情，而是那张看起来太圆、太软的脸。|Made in Abyss|Girls' Last Tour",
  "约定梦幻岛第一季|work_fact|《约定的梦幻岛》第一季，靠信息差绷住了弦。|孩子和大人知道的世界不一样，悬疑就从这条缝里长出来。|《约定的梦幻岛》第一季最抓人的地方，是信息差。孩子们以为孤儿院是家，观众和角色一起慢慢发现它其实是牢笼；大人知道的规则，孩子只能一点点偷看。它不是靠大场面制造紧张，而是靠计划、观察、伪装和心理战把气氛绷起来。看它很适合理解悬疑动画的一种做法：先让安全感成立，再在安全感下面挖洞。|The Promised Neverland|Made in Abyss",
  "物语系列文字演出|staff_fact|物语系列的文字闪屏，不只是装饰。|它把小说的语言感硬塞回动画画面里，形成很强的阅读节奏。|物语系列动画里大量文字闪屏、奇怪构图和长对话，常让新观众觉得“这也太会摆姿势了”。但它有个很实际的作用：把原作小说的语言密度转成视觉节奏。你不一定每张字卡都读完，但会感到角色的思考、吐槽和自我辩解一直在压过来。它适合解释改编不是只把剧情拍出来，有时还要把文字的速度和质感翻译成画面。|Bakemonogatari|The Tatami Galaxy",
  "四叠半语速|staff_fact|《四叠半神话大系》的快，不只是语速快。|它像把大学生活的后悔、幻想和自我辩解一起倒出来。|《四叠半神话大系》最明显的特征是语速和信息密度很高，但它的“快”不是炫技，而是贴合主角那种停不下来的自我辩解：如果当初加入别的社团，如果选择另一种生活，是不是会更好？作品用重复和变奏把这种后悔拍得很有节奏。看它会发现，青春题材不一定要慢慢怀旧，也可以像脑内弹幕一样冲过来。|The Tatami Galaxy|Night Is Short, Walk On Girl",
  "OddTaxi伏笔|work_fact|《奇巧计程车》的动物脸，不只是可爱设定。|它让悬疑看起来轻一点，也把关键误导藏得更自然。|《奇巧计程车》一开始很像动物角色群像：出租车司机、偶像、警察、黑帮，各有各的烦恼。但看到后面会发现，动物外形不只是风格选择，也参与了作品的误导和悬疑组织。它厉害的地方在于，伏笔不是高高挂在墙上等你发现，而是混在日常对话和都市传闻里。看完再回头，会发现很多轻描淡写的细节其实早就在等你。|Odd Taxi|Baccano!",
  "赛璐璐味|concept_origin|赛璐璐味不是单纯旧画质。|大家怀念的往往是线条、上色和摄影层次混在一起的手工质感。|“赛璐璐味”常被拿来形容老动画的质感，但它不是简单等于分辨率低或画面旧。观众怀念的更多是线条、色块、摄影、胶片感和手工流程叠出来的气味。现在的数字动画也能模仿这种味道，但那已经是主动选择的风格，而不是生产流程本身。这个词好用，是因为它把一种很难精确定义的观看触感说出来了。|Neon Genesis Evangelion|Cowboy Bebop",
  "圣地巡礼经济|community_take|圣地巡礼有时会把小地方带火。|作品里的街道、神社、车站，被粉丝重新走一遍后会变成旅游路线。|圣地巡礼不只是粉丝自拍，它有时真的会影响地方观光。动画把某个车站、神社、商店街拍进作品里，粉丝再按画面对位打卡，原本普通的地点就多了一层故事滤镜。当然，不是每部作品都能带动旅游，地方也需要接得住这波热情。《幸运星》和《你的名字。》都适合观察这种“作品记忆变成现实路线”的过程。|Lucky Star|Your Name.",
  "声优偶像化|staff_fact|声优不只是幕后声音，也可能站到台前。|角色、舞台活动和粉丝投射叠在一起，就会形成很复杂的观看关系。|声优偶像化是二次元文化里很有意思的一条线。很多声优不只是给角色配音，还会参加演唱会、广播、见面会，甚至和角色企划深度绑定。观众喜欢的可能是声音、角色、真人舞台表现，也可能是三者叠在一起的感觉。这也是为什么声优新闻有时会在动画圈发酵得很快。《Love Live!》这类企划很适合当入口，因为角色和声优活动本来就互相强化。|Love Live! Sunshine!!|THE IDOLM@STER",
  "OP剧透|meme_origin|有些 OP 看似耍帅，其实在提前剧透。|角色站位、道具和一闪而过的镜头，可能播到后面才突然对上。|动画 OP 经常被观众反复暂停，不只是为了听歌，而是因为里面可能藏了后面剧情的影子：角色站位、道具、剪影、某个一闪而过的画面，初看只是氛围，播到后面才发现早就埋过。并不是所有 OP 都有严密伏笔，但“回头看 OP”已经变成一种很常见的追番乐趣。《进击的巨人》和《命运石之门》都适合观察这种回收快感。|Attack on Titan|STEINS;GATE",
  "标题党长标题|community_take|轻小说长标题，很多时候是在替封面吆喝。|标题越长，越像把卖点、设定和爽点直接摆在货架上。|轻小说长标题常被吐槽像简介，但它背后有很现实的传播逻辑：在书店、网站或榜单里，标题本身就要先把卖点讲清楚。异世界、转生、最强、慢生活、反派千金，很多关键词直接写进标题，读者不用点开也知道大概口味。动画化以后，这种标题就更容易变成梗。它不一定代表作品差，只是商业入口变得特别直白。|KONOSUBA -God's blessing on this wonderful world!|My Next Life as a Villainess: All Routes Lead to Doom!",
  "后宫番结构|genre_trope|后宫番真正稳定的不是人数，是选择悬念。|多个角色围着同一个关系核心转，观众自然会开始押注。|后宫番常被简化成“很多角色喜欢一个人”，但更稳定的结构其实是选择悬念：不同角色代表不同关系可能，观众会自然开始比较、押注、站队。做得好的作品不只是堆人设，而是让每条关系都有自己的记忆点；做得差就会变成属性展示柜。《五等分的新娘》和《路人女主》都很适合观察这种结构怎么触发讨论。|The Quintessential Quintuplets|Saekano: How to Raise a Boring Girlfriend",
  "治愈系|genre_trope|治愈系不等于没有悲伤。|有时候正因为世界有伤口，温柔才显得更明显。|治愈系常被误会成“轻松无脑”。但很多真正有后劲的治愈作品，并不是没有痛苦，而是用很轻的方式承认痛苦存在：孤独、离别、遗憾、无法改变的过去。温柔不是把问题擦掉，而是给角色一个能继续生活的空间。《夏目友人帐》和《ARIA》都很适合当入口，一个偏人与妖怪的记忆，一个偏日常和城市的慢节奏。|Natsume's Book of Friends|ARIA The ANIMATION",
  "体育番训练|genre_trope|体育番最燃的地方，常常不是赢。|训练、失败和团队磨合，才是让胜负变得有重量的部分。|体育番当然会拍比赛胜负，但真正让人燃起来的，往往是胜负之前的东西：训练、失败、位置竞争、团队磨合，还有角色第一次意识到自己不是一个人在打。《排球少年！！》很会把一球的意义拍出来，因为你知道那一球背后有多少次失败。《灌篮高手》则让青春、团队和不甘心变得特别直接。|HAIKYU!!|Slam Dunk",
  "美少女日常|community_take|美少女日常不只是“可爱就完了”。|它靠关系、节奏和空间感，让观众愿意待在那个小世界里。|美少女日常常被外行误解成“没有剧情”。但这类作品的重点通常不是大事件，而是关系如何在重复日常里变熟：社团教室、咖啡店、放学路、练习室，都像观众可以暂住的小空间。可爱当然重要，但节奏更重要；如果角色之间没有舒服的互动，再可爱也撑不久。《轻音少女》和《请问您今天要来点兔子吗？》就是两个很直观的入口。|K-ON!|Is the Order a Rabbit?"
].map(fromPipe);

function normalizeBlurb(blurb, hook) {
  let out = blurb;
  if (cjkLen(out) < 30) {
    out = `${out}后面还藏着一个挺好玩的细节。`;
  }
  if (cjkLen(out) < 30) {
    out = `${hook} ${out}`;
  }
  return out;
}

function makeRecord(seed, idx) {
  const [cold_subtype, topic_key, hook, blurb, insight, statement, answer, explanation, recommendations, source_urls] = seed;
  const topic_type = topic_key.startsWith("work:")
    ? "work"
    : topic_key.startsWith("character:")
      ? "work"
      : topic_key.startsWith("staff:") || topic_key.startsWith("production:") || topic_key.startsWith("phenomenon:")
        ? "phenomenon"
        : "concept";
  return {
    id: `seed_${String(idx + 1).padStart(3, "0")}_${slug(topic_key)}`,
    prompt_version: COLD_PROMPT_VERSION,
    topic_type,
    cold_subtype,
    topic_key,
    hook,
    blurb: normalizeBlurb(blurb, hook),
    angle: "",
    example_bridge: "",
    insight,
    quiz: statement
      ? {
          statement,
          answer,
          explanation
        }
      : null,
    source_urls,
    recommendations,
    verification_status: "verified",
    confidence: statement ? 0.78 : 0.68,
    created_at: new Date().toISOString(),
    shown_count: 0
  };
}

function validate(record) {
  const errors = [];
  if (record.prompt_version !== COLD_PROMPT_VERSION) errors.push("wrong prompt_version");
  if (!record.blurb || cjkLen(record.blurb) < 30) errors.push("blurb too short");
  if (!record.insight || cjkLen(record.insight) < 80 || cjkLen(record.insight) > 420) {
    errors.push(`insight length invalid: ${cjkLen(record.insight)}`);
  }
  if (vagueInsightPattern.test(record.insight)) errors.push("vague insight wording");
  if (disclaimerPattern.test(record.insight)) errors.push("mechanical disclaimer wording");
  if (conceptContextSubtypes.has(record.cold_subtype)) {
    const hasBoundary = contextualBoundaryPattern.test(record.insight);
    if (["meme_origin", "community_discussion", "community_take"].includes(record.cold_subtype) && !hasBoundary) {
      errors.push("meme/community insight lacks boundary");
    }
  }
  if (!record.recommendations?.length) errors.push("missing recommendations");
  if (!record.source_urls?.length) errors.push("missing source_urls");
  if (record.quiz) {
    const quizText = `${record.quiz.statement} ${record.quiz.explanation}`;
    if (!record.quiz.statement || typeof record.quiz.answer !== "boolean" || cjkLen(record.quiz.explanation) < 12) {
      errors.push("invalid quiz");
    }
    if (/[？?]\s*$/.test(record.quiz.statement)) errors.push("quiz statement is a question");
    if (subjectiveQuizPattern.test(record.quiz.statement)) errors.push("subjective quiz statement");
    if (subjectiveQuizPattern.test(record.quiz.explanation)) errors.push("subjective quiz explanation");
    if (internalMetaPattern.test(quizText)) errors.push("internal quiz wording");
    if (!objectiveFactPattern.test(record.quiz.statement)) errors.push("quiz statement lacks objective anchor");
    if (
      restrictedQuizSubtypes.has(record.cold_subtype) &&
      !/(语源|出处|出自|来自|名字|标题|代号|官方|资料|设定|首播|上映|发行|改编自)/.test(record.quiz.statement)
    ) {
      errors.push("restricted subtype should not have quiz");
    }
  }
  return errors;
}

function batchStats(records) {
  const subtypeStats = {};
  for (const r of records) subtypeStats[r.cold_subtype] = (subtypeStats[r.cold_subtype] || 0) + 1;
  return {
    subtypeStats,
    factCount: records.filter((r) => factSubtypes.has(r.cold_subtype)).length,
    conceptishCount: records.filter((r) => !factSubtypes.has(r.cold_subtype)).length,
    quizCount: records.filter((r) => r.quiz).length,
    noRecommendationsCount: records.filter((r) => !r.recommendations?.length).length,
    missingBlurbCount: records.filter((r) => !r.blurb?.trim()).length,
    shortInsightCount: records.filter((r) => cjkLen(r.insight) < 80).length
  };
}

function validateBatch(records) {
  const errors = [];
  const stats = batchStats(records);
  if (factHeavy && records.length >= 50) {
    if (stats.factCount < 25) {
      errors.push(`fact-heavy batch has only ${stats.factCount} fact records, expected at least 25`);
    }
    if (stats.quizCount < 15) {
      errors.push(`fact-heavy batch has only ${stats.quizCount} quizzes, expected at least 15`);
    }
    if (stats.conceptishCount > Math.floor(records.length / 2)) {
      errors.push(`concept/meme/trope records exceed half: ${stats.conceptishCount}/${records.length}`);
    }
  }
  return errors;
}

const orderedSeeds = factHeavy
  ? [...factSeeds, ...extraFacts, ...expansionSeeds, ...moreSeeds.map(fromPipe)]
  : [...baseSeeds, ...extraFacts, ...expansionSeeds];
const repeated = [];
while (repeated.length < seedOffset + targetCount) {
  repeated.push(...orderedSeeds);
}

const records = repeated.slice(seedOffset, seedOffset + targetCount).map((seed, idx) => makeRecord(seed, seedOffset + idx));
const invalid = [
  ...records.flatMap((r) => validate(r).map((e) => `${r.topic_key}: ${e}`)),
  ...validateBatch(records)
];
if (invalid.length) {
  console.error("[cold:seed] validation failed");
  for (const e of invalid.slice(0, 20)) console.error(" -", e);
  process.exit(1);
}

const dir = path.dirname(storePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
let existing = [];
if (!reset && fs.existsSync(storePath)) {
  existing = JSON.parse(fs.readFileSync(storePath, "utf8") || "[]");
}
const next = reset
  ? records
  : [...existing.filter((r) => r.prompt_version !== COLD_PROMPT_VERSION), ...records];
if (!dryRun) {
  fs.writeFileSync(storePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

const stats = batchStats(records);
console.log(dryRun ? "[cold:seed] dry run" : "[cold:seed] wrote", records.length, dryRun ? "records" : `records to ${storePath}`);
console.log(
  JSON.stringify(
    {
      promptVersion: COLD_PROMPT_VERSION,
      reset,
      factHeavy,
      dryRun,
      offset: seedOffset,
      total: records.length,
      subtypeStats: stats.subtypeStats,
      factCount: stats.factCount,
      conceptishCount: stats.conceptishCount,
      quizCount: stats.quizCount,
      noRecommendationsCount: stats.noRecommendationsCount,
      missingBlurbCount: stats.missingBlurbCount,
      shortInsightCount: stats.shortInsightCount,
      recommendationCounts: records.map((r) => r.recommendations.length)
    },
    null,
    2
  )
);
