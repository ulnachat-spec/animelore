export const RANDOM_WORK_POOL = [
  "新世纪福音战士", "葬送的芙莉莲", "孤独摇滚！", "星际牛仔", "魔法少女小圆",
  "攻壳机动队 STAND ALONE COMPLEX", "命运石之门", "钢之炼金术师 FULLMETAL ALCHEMIST",
  "来自深渊", "Re:从零开始的异世界生活", "进击的巨人", "凉宫春日的忧郁",
  "冰菓", "轻音少女", "少女终末旅行", "虫师", "奇诺之旅", "水星领航员",
  "白箱", "吹响！上低音号", "CLANNAD", "紫罗兰永恒花园", "四叠半神话大系",
  "物语系列", "银魂", "间谍过家家", "辉夜大小姐想让我告白", "龙与虎",
  "白色相簿2", "比宇宙更远的地方", "你的名字。", "千与千寻", "夏目友人帐",
  "幸运星", "日常", "心理测量者", "昭和元禄落语心中", "异度侵入",
  "奇巧计程车", "宝石之国", "灵能百分百", "回转企鹅罐", "天元突破红莲螺岩",
  "普罗米亚", "言叶之庭", "声之形", "约定的梦幻岛", "赛马娘 Pretty Derby",
  "摇曳露营△", "宇宙兄弟"
] as const;

const BAG_KEY = "animelore.random-work-bag.v1";

function randomIndex(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % maxExclusive;
}

function shuffledPool(): string[] {
  const pool = [...RANDOM_WORK_POOL];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
}

/** 加密随机洗牌袋：一轮内 50 部作品不重复，耗尽后再重新洗牌。 */
export function takeRandomWork(): string {
  let bag: string[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem(BAG_KEY) || "[]") as unknown;
    if (Array.isArray(stored)) {
      bag = stored.filter((title): title is string =>
        typeof title === "string" && RANDOM_WORK_POOL.includes(title as (typeof RANDOM_WORK_POOL)[number])
      );
    }
  } catch {
    bag = [];
  }
  if (!bag.length) bag = shuffledPool();
  const picked = bag.shift() ?? RANDOM_WORK_POOL[randomIndex(RANDOM_WORK_POOL.length)];
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    // Private mode still gets a cryptographically shuffled in-memory pick.
  }
  return picked;
}
