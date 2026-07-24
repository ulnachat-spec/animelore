export type CardStreamStats = {
  delta_event_count: number;
  point_delta_event_count: number;
  first_delta_at: number | null;
  last_delta_at: number | null;
  card_done_at: number | null;
  chunk_count: number;
  delta_length_total: number;
  parser_emit_count: number;
};

export function createCardStreamStats(): CardStreamStats {
  return {
    delta_event_count: 0,
    point_delta_event_count: 0,
    first_delta_at: null,
    last_delta_at: null,
    card_done_at: null,
    chunk_count: 0,
    delta_length_total: 0,
    parser_emit_count: 0
  };
}

export function touchDeltaStats(stats: CardStreamStats, cardT0: number, isPoint: boolean): void {
  const elapsed = Date.now() - cardT0;
  if (isPoint) {
    stats.point_delta_event_count += 1;
  } else {
    stats.delta_event_count += 1;
  }
  if (stats.first_delta_at == null) stats.first_delta_at = elapsed;
  stats.last_delta_at = elapsed;
}

export function logCardStreamStats(cardId: string, stats: CardStreamStats): void {
  console.log(
    `[work-stream] card=${cardId} stream_stats ${JSON.stringify({
      delta_event_count: stats.delta_event_count,
      point_delta_event_count: stats.point_delta_event_count,
      first_delta_at: stats.first_delta_at,
      last_delta_at: stats.last_delta_at,
      card_done_at: stats.card_done_at,
      chunk_count: stats.chunk_count,
      delta_length_total: stats.delta_length_total,
      parser_emit_count: stats.parser_emit_count
    })}`
  );
}
