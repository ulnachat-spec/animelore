import type { CardStreamEmit } from "@/lib/lore-card-text-parser";

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 超过该长度时对 delta 做打字机拆分 */
export function workLoreStreamTypewriterThreshold(): number {
  return envInt("WORK_LORE_STREAM_TYPEWRITER_THRESHOLD", 20);
}

/** 每片字符数 */
export function workLoreStreamTypewriterChars(): number {
  return envInt("WORK_LORE_STREAM_TYPEWRITER_CHARS", 4);
}

/** 片间延迟（毫秒） */
export function workLoreStreamTypewriterDelayMs(): number {
  return envInt("WORK_LORE_STREAM_TYPEWRITER_DELAY_MS", 20);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitText(text: string, chunkSize: number): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    pieces.push(text.slice(i, i + chunkSize));
  }
  return pieces;
}

/** 将较长 delta 拆成小片段逐次转发，保证前端可见逐字效果 */
export async function emitWithTypewriter(
  ev: CardStreamEmit,
  forward: (ev: CardStreamEmit) => void | Promise<void>
): Promise<void> {
  const text = ev.delta;
  if (!text) return;

  const threshold = workLoreStreamTypewriterThreshold();
  if (text.length <= threshold) {
    await forward(ev);
    return;
  }

  const chunkSize = workLoreStreamTypewriterChars();
  const delayMs = workLoreStreamTypewriterDelayMs();
  const pieces = splitText(text, chunkSize);

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (ev.type === "card_delta") {
      await forward({ type: "card_delta", field: ev.field, delta: piece });
    } else {
      await forward({
        type: "card_point_delta",
        point_index: ev.point_index,
        delta: piece
      });
    }
    if (i < pieces.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }
}
