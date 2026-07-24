/**
 * 开发环境冷知识测试辅助：强制 refresh、跳过旧库等。
 */
export function isColdHookDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

/** dev + refresh=1 / refreshHook=1 时必须走新生成，不读 cold-hooks.json 库 */
export function shouldForceColdRegenerate(refreshRequested: boolean): boolean {
  return refreshRequested && isColdHookDevEnvironment();
}
