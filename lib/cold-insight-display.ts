/**
 * 详情页展示用：仅做 trim，不再注入安利式前缀（文案风格由 prompt 控制）。
 */
export function formatColdInsightForDisplay(insight: string): string {
  return insight.trim();
}
