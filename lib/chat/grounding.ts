import type { LoreCard } from "@/lib/types";

export type ChatGrounding =
  | "source_backed"
  | "archive_context"
  | "opinion"
  | "insufficient";

export interface ChatCitation {
  card: number;
  label: string;
  urls: string[];
}

export interface AssessedChatReply {
  message: string;
  grounding: ChatGrounding;
  citations: ChatCitation[];
}

const factualPattern =
  /谁|哪位|何时|什么时候|哪年|哪里|多少|销量|评分|票房|导演|监督|编剧|脚本|声优|制作|公司|工作室|官方|采访|原作|作者|首播|上映|获奖|数据|事实|真的|是否|是不是|为什么会|出处|来源/i;
const opinionPattern =
  /你觉得|你喜欢|怎么看|感受|观感|推荐|好看|难看|喜欢|共鸣|解读|主题|氛围|像不像|聊聊/i;

export function classifyChatQuestion(text: string): "fact" | "opinion" | "mixed" {
  const fact = factualPattern.test(text);
  const opinion = opinionPattern.test(text);
  if (fact && opinion) return "mixed";
  return fact ? "fact" : "opinion";
}

export function looksLikePromptInjection(text: string): boolean {
  return /忽略.{0,12}(之前|以上|系统|指令)|泄露.{0,8}(提示词|system|密钥)|进入.{0,8}(开发者|管理员)模式|ignore.{0,20}(previous|system|instructions)|reveal.{0,20}(prompt|secret)|you are now/i.test(
    text
  );
}

function validUrls(urls: string[] | undefined): string[] {
  return (urls ?? []).filter((url) => /^https?:\/\//i.test(url)).slice(0, 8);
}

export function assessChatReply(
  rawMessage: string,
  latestUserMessage: string,
  cards: LoreCard[]
): AssessedChatReply {
  if (looksLikePromptInjection(latestUserMessage)) {
    return {
      message: "这条消息像是在要求我绕过资料边界或透露内部提示，我不能照做。我们可以继续聊这部作品本身，或者一起核对某条档案内容。",
      grounding: "insufficient",
      citations: []
    };
  }

  const citedNumbers = [...rawMessage.matchAll(/\[卡(\d+)\]/g)].map((match) => Number(match[1]));
  const validNumbers = [...new Set(citedNumbers.filter((number) => number >= 1 && number <= cards.length))];
  const message = rawMessage.replace(/\[卡(\d+)\]/g, (token, rawNumber: string) => {
    const number = Number(rawNumber);
    return number >= 1 && number <= cards.length ? token : "";
  }).trim();
  const citations = validNumbers.map((number) => ({
    card: number,
    label: cards[number - 1].zh_name,
    urls: validUrls(cards[number - 1].source_urls)
  }));
  const mode = classifyChatQuestion(latestUserMessage);

  if ((mode === "fact" || mode === "mixed") && citations.length === 0) {
    return {
      message: "现有四张档案没有给出足够依据来确认这件事，我不想凭印象补答案。你可以换成作品主题或观感问题，或者先查看卡片下方的来源。",
      grounding: "insufficient",
      citations: []
    };
  }

  if (citations.some((citation) => citation.urls.length > 0)) {
    return { message, grounding: "source_backed", citations };
  }
  if (citations.length > 0) {
    return { message, grounding: "archive_context", citations };
  }
  return { message, grounding: "opinion", citations: [] };
}
