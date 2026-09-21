"use client";

type ClientOperationsEvent =
  | "lore_evidence_opened"
  | "lore_feedback_helpful"
  | "lore_feedback_flagged"
  | "roam_skipped"
  | "roam_opened";

/** Fire-and-forget aggregate events; deliberately excludes user-generated content. */
export function trackProductEvent(event: ClientOperationsEvent): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      keepalive: true
    });
  } catch {
    // Analytics must never affect the reading flow.
  }
}
