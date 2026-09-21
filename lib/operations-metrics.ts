export type OperationsEvent =
  | "work_requested"
  | "work_succeeded"
  | "work_failed"
  | "roam_requested"
  | "roam_succeeded"
  | "hook_requested"
  | "hook_succeeded"
  | "lore_evidence_opened"
  | "lore_feedback_helpful"
  | "lore_feedback_flagged"
  | "roam_skipped"
  | "roam_opened";

type Metric = { count: number; lastSeenAt: string };
const metrics = new Map<OperationsEvent, Metric>();

/**
 * Privacy-preserving, aggregate-only product telemetry.
 * This intentionally never stores titles, prompts, IP addresses, or message text.
 * It is an in-process fallback; connect a shared store before multi-instance scale.
 */
export function recordOperationsEvent(event: OperationsEvent): void {
  const current = metrics.get(event) ?? { count: 0, lastSeenAt: new Date(0).toISOString() };
  metrics.set(event, { count: current.count + 1, lastSeenAt: new Date().toISOString() });
}

export function getOperationsMetrics(): Record<OperationsEvent, Metric> {
  return Object.fromEntries(metrics.entries()) as Record<OperationsEvent, Metric>;
}

export function resetOperationsMetricsForTests(): void {
  metrics.clear();
}
