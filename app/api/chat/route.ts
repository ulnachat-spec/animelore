import { NextResponse } from "next/server";
import { buildWorkChatSystemPrompt } from "@/lib/chat/build-system-prompt";
import { prepareChatTurn } from "@/lib/chat/run-chat-turn";
import { chatRequestBodySchema } from "@/lib/chat/schemas";
import { assessChatReply, looksLikePromptInjection } from "@/lib/chat/grounding";
import { enforceRateLimitShared } from "@/lib/rate-limit-response";

export async function POST(req: Request) {
  const isLocalBenchmark =
    process.env.NODE_ENV !== "production" &&
    req.headers.get("x-animelore-benchmark") === "quality-harness";
  if (!isLocalBenchmark) {
    const { blocked } = await enforceRateLimitShared(req, "chat", 20, 10 * 60_000);
    if (blocked) return blocked;
  }

  try {
    const json = await req.json();
    const parsed = chatRequestBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", detail: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workTitle, workMeta, cards, messages } = parsed.data;
    const prepared = prepareChatTurn(messages);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error, detail: prepared.detail }, { status: 400 });
    }

    const latestUserMessage = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
    if (looksLikePromptInjection(latestUserMessage)) {
      return NextResponse.json(assessChatReply("", latestUserMessage, cards, workMeta));
    }

    const previousAssistant = [...messages].reverse().find((item) => item.role === "assistant")?.content ?? "";
    const avoidFollowUp = /[？?]\s*$/.test(previousAssistant.trim());
    const systemPrompt = buildWorkChatSystemPrompt(workTitle, cards, workMeta, avoidFollowUp);
    const rawMessage = await prepared.run(systemPrompt);
    const assessed = assessChatReply(rawMessage, latestUserMessage, cards, workMeta);

    return NextResponse.json(assessed);
  } catch (e) {
    console.error("[chat]", e);
    return NextResponse.json(
      { error: "chat_failed", detail: "芽衣暂时没有组织好回答，请稍后再试。" },
      { status: 500 }
    );
  }
}
