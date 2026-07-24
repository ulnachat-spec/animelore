import { CHAT_ASSISTANT_NAME, CHAT_PERSONA_PROMPT } from "@/lib/chat/persona";
import { formatCardsForChatContext } from "@/lib/chat/format-cards-context";
import type { LoreCard } from "@/lib/types";

export function buildWorkChatSystemPrompt(workTitle: string, cards: LoreCard[]): string {
  const cardsBlock = formatCardsForChatContext(cards);
  return `${CHAT_PERSONA_PROMPT}

---
当前作品：《${workTitle.trim()}》

以下是本站为这部作品生成的四张图鉴卡片（你的首要事实依据）：

${cardsBlock}

---
再次提醒：回答本作问题时以四卡为准；四卡未提及的「硬事实」不要断言。你叫${CHAT_ASSISTANT_NAME}。`;
}
