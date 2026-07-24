export type RagLogLevel = "debug" | "info" | "silent";

export function getRagLogLevel(): RagLogLevel {
  const v = process.env.RAG_LOG_LEVEL;
  if (v === "silent" || v === "debug") return v;
  return "info";
}

export function ragLog(step: string, payload: Record<string, unknown>): void {
  if (getRagLogLevel() === "silent") return;
  const line = {
    step,
    at: new Date().toISOString(),
    ...payload
  };
  console.info(`[RAG] ${step}`, JSON.stringify(line));
}
