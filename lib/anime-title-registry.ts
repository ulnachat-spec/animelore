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
  { anilistId: 21, zh: "海贼王", aliases: ["海贼王", "航海王", "One Piece"] }
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
