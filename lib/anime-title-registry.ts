export type AnimeTitleEntry = {
  anilistId: number;
  zh: string;
  aliases: string[];
};

const entries: AnimeTitleEntry[] = [
  { anilistId: 16918, zh: "银之匙", aliases: ["银之匙", "白银之匙", "Silver Spoon", "Gin no Saji", "銀の匙"] },
  { anilistId: 8630, zh: "绯弹的亚里亚", aliases: ["绯弹的亚里亚", "緋彈的亞莉亞", "Aria the Scarlet Ammo", "Hidan no Aria", "緋弾のアリア"] },
  { anilistId: 849, zh: "凉宫春日的忧郁", aliases: ["凉宫春日", "凉宫春日的忧郁", "The Melancholy of Haruhi Suzumiya", "Suzumiya Haruhi no Yuuutsu"] },
  { anilistId: 235, zh: "名侦探柯南", aliases: ["名侦探柯南", "Detective Conan", "Case Closed"] },
  { anilistId: 30, zh: "新世纪福音战士", aliases: ["EVA", "新世纪福音战士", "Neon Genesis Evangelion", "Shinseiki Evangelion"] },
  { anilistId: 199, zh: "千与千寻", aliases: ["千与千寻", "千與千尋", "Spirited Away", "Sen to Chihiro no Kamikakushi"] },
  { anilistId: 20812, zh: "白箱", aliases: ["白箱", "SHIROBAKO"] },
  { anilistId: 21202, zh: "为美好的世界献上祝福！", aliases: ["素晴", "为美好的世界献上祝福", "KONOSUBA", "Kono Subarashii Sekai ni Shukufuku wo!"] },
  { anilistId: 9756, zh: "魔法少女小圆", aliases: ["小圆", "魔法少女小圆", "Puella Magi Madoka Magica", "Mahou Shoujo Madoka Magica"] },
  { anilistId: 21519, zh: "你的名字。", aliases: ["你的名字", "你的名字。", "Your Name.", "Kimi no Na wa."] },
  { anilistId: 523, zh: "龙猫", aliases: ["龙猫", "My Neighbor Totoro", "Tonari no Totoro"] },
  { anilistId: 529, zh: "最终兵器彼女", aliases: ["最终兵器彼女", "Saikano", "Saishuu Heiki Kanojo"] },
  { anilistId: 457, zh: "虫师", aliases: ["虫师", "MUSHI-SHI", "Mushishi"] },
  { anilistId: 99420, zh: "少女终末旅行", aliases: ["少女终末旅行", "Girls' Last Tour", "Shoujo Shuumatsu Ryokou"] },
  { anilistId: 4224, zh: "龙与虎", aliases: ["龙与虎", "虎与龙", "Toradora!"] },
  { anilistId: 355, zh: "灼眼的夏娜", aliases: ["灼眼的夏娜", "Shakugan no Shana"] },
  { anilistId: 20657, zh: "路人女主的养成方法", aliases: ["路人女主", "路人女主的养成方法", "Saekano: How to Raise a Boring Girlfriend", "Saenai Heroine no Sodatekata"] },
  { anilistId: 103572, zh: "五等分的新娘", aliases: ["五等分的新娘", "The Quintessential Quintuplets", "5-toubun no Hanayome"] },
  { anilistId: 21584, zh: "Love Live! Sunshine!!", aliases: ["Love Live! Sunshine!!", "LoveLive Sunshine", "ラブライブ！サンシャイン!!"] },
  { anilistId: 9253, zh: "命运石之门", aliases: ["命运石之门", "石头门", "Steins;Gate"] },
  { anilistId: 5114, zh: "钢之炼金术师 FULLMETAL ALCHEMIST", aliases: ["钢之炼金术师", "钢炼", "Fullmetal Alchemist: Brotherhood", "Hagane no Renkinjutsushi: FULLMETAL ALCHEMIST"] },
  { anilistId: 12189, zh: "冰菓", aliases: ["冰菓", "冰果", "Hyouka"] },
  { anilistId: 20665, zh: "四月是你的谎言", aliases: ["四月是你的谎言", "Your Lie in April", "Shigatsu wa Kimi no Uso"] },
  { anilistId: 100388, zh: "紫罗兰永恒花园", aliases: ["紫罗兰永恒花园", "Violet Evergarden"] },
  { anilistId: 10165, zh: "日常", aliases: ["日常", "Nichijou"] },
  { anilistId: 20931, zh: "死亡游行", aliases: ["死亡游行", "Death Parade"] },
  { anilistId: 20954, zh: "声之形", aliases: ["声之形", "A Silent Voice", "Koe no Katachi"] },
  { anilistId: 436, zh: "攻壳机动队 STAND ALONE COMPLEX", aliases: ["攻壳机动队", "Ghost in the Shell: Stand Alone Complex", "Koukaku Kidoutai: STAND ALONE COMPLEX"] },
  { anilistId: 1, zh: "星际牛仔", aliases: ["星际牛仔", "Cowboy Bebop"] },
  { anilistId: 11061, zh: "全职猎人（2011）", aliases: ["全职猎人", "Hunter x Hunter (2011)"] },
  { anilistId: 21, zh: "海贼王", aliases: ["海贼王", "航海王", "One Piece"] },
  { anilistId: 1943, zh: "红辣椒", aliases: ["红辣椒", "红辣椒电影", "Paprika", "パプリカ"] },
  {
    anilistId: 97917,
    zh: "春宵苦短，少女前进吧！",
    aliases: [
      "春宵苦短少女前进吧",
      "春宵苦短，少女前进吧",
      "春宵苦短少女前進吧",
      "夜は短し歩けよ乙女",
      "Yoru wa Mijikashi Arukeyo Otome",
      "The Night is Short, Walk on Girl"
    ]
  }
];

export function normalizeAnimeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s·・:：!！?？。,.，'"“”‘’《》〈〉【】\[\]()（）\-_]/g, "");
}

const byAlias = new Map<string, AnimeTitleEntry>();
const byId = new Map<number, AnimeTitleEntry>();
for (const entry of entries) {
  byId.set(entry.anilistId, entry);
  for (const alias of [entry.zh, ...entry.aliases]) {
    byAlias.set(normalizeAnimeTitle(alias), entry);
  }
}

export function findAnimeTitleEntry(query: string): AnimeTitleEntry | undefined {
  const normalized = normalizeAnimeTitle(query);
  const exact = byAlias.get(normalized);
  if (exact) return exact;

  // 支持“中文名 + 英文名”组合输入，但禁止单个短词模糊命中。
  return entries.find((entry) =>
    entry.aliases.some((alias) => {
      const candidate = normalizeAnimeTitle(alias);
      return candidate.length >= 4 && normalized.includes(candidate);
    })
  );
}

export function chineseAnimeTitle(anilistId: number | undefined, fallback: string): string {
  return (anilistId ? byId.get(anilistId)?.zh : undefined) || fallback;
}

export function animeTitleAliases(query: string): string[] {
  const entry = findAnimeTitleEntry(query);
  return entry ? [entry.zh, ...entry.aliases] : [];
}

/**
 * 本地别名表的保守型“你可能在找”候选。
 *
 * 这里只接受很接近的拼写/标点/简繁偏差，避免把一部无关作品伪装成搜索结果；
 * 更宽泛的中文名解析则交给 Bangumi → 日文原名 → AniList 的在线桥接。
 */
export function findSimilarAnimeTitleEntries(query: string, limit = 3): AnimeTitleEntry[] {
  const needle = normalizeAnimeTitle(query);
  if (needle.length < 3) return [];
  const queryHasCjk = /[\u3400-\u9fff]/.test(needle);

  const ranked = entries
    .map((entry) => {
      const aliases = [entry.zh, ...entry.aliases]
        .map(normalizeAnimeTitle)
        // 不跨文字体系算编辑距离：中文标题和一长串英文原名会造成虚假的“相似”。
        .filter((alias) => /[\u3400-\u9fff]/.test(alias) === queryHasCjk);
      if (aliases.length === 0) return { entry, similarity: 0 };
      const distance = Math.min(...aliases.map((alias) => levenshtein(needle, alias)));
      const longest = Math.max(needle.length, ...aliases.map((alias) => alias.length));
      const similarity = longest === 0 ? 0 : 1 - distance / longest;
      const contains = aliases.some(
        (alias) => Math.min(alias.length, needle.length) >= 4 && (alias.includes(needle) || needle.includes(alias))
      );
      return { entry, similarity: contains ? Math.max(similarity, 0.86) : similarity };
    })
    .filter(({ similarity }) => similarity >= 0.72)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, Math.min(limit, 5)));

  return ranked.map(({ entry }) => entry);
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = prev[j]!;
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return prev[b.length]!;
}
