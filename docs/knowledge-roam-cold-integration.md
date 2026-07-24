# Knowledge Roam And Cold Hook Integration

## Background

AnimeLore now has two related experiences:

- Home cold hook: a single polished cold-knowledge item that links to `/cold`.
- Knowledge roam: a swipeable feed of lightweight knowledge cards.

The desired product direction is to let knowledge roam reuse the verified cold hook library instead of creating a separate generation pipeline. A roam card should feel like a teaser. The cold detail page should remain the full explanation, with recommended works shown afterward.

## Product Goals

1. Reuse the cold hook pool for knowledge roam.
2. Add a short `blurb` field for roam cards instead of truncating `insight`.
3. Split roam deep links by content type:
   - work-level facts go directly to the work encyclopedia page.
   - concepts, memes, community phenomena, and production notes go to `/cold`.
4. Add an optional "is this real?" interaction on `/cold`, but only for fact-checkable items.
5. Avoid forcing concept-explanation content into true/false quiz format.

## Data Model Changes

Add shared types in `lib/types.ts` and `lib/cold-types.ts`.

```ts
export type ColdSubtype =
  | "term_origin"
  | "meme_origin"
  | "work_fact"
  | "character_fact"
  | "production_note"
  | "community_take";

export interface ColdQuiz {
  statement: string;
  answer: boolean;
  explanation: string;
}
```

Extend cold hook payloads and records:

```ts
cold_subtype?: ColdSubtype;
blurb?: string;
quiz?: ColdQuiz | null;
```

These fields must survive the full chain:

```text
LLM raw
-> verify
-> recordFromRaw
-> cold-hooks.json
-> rawToPayload
-> coldPayloadFromRaw
-> sessionStorage
-> /cold
-> /api/roam
```

## Field Rules

### `blurb`

Purpose: short teaser for knowledge roam cards.

Rules:

- 35-70 Chinese characters.
- Must not be a simple substring of the first sentence of `insight`.
- Should have a hook, but not explain everything.
- Must not include source names such as Bangumi, Wikipedia, AniList.

Example:

```text
它不是单纯“脑子有病”，更像角色和世界频率对不上；看懂这个词，很多怪怪的角色会突然顺眼起来。
```

### `cold_subtype`

Use this to decide roam routing and UI behavior.

Suggested mapping:

- `term_origin`: culture terms and etymology, such as 傲娇, 世界系, 电波系.
- `meme_origin`: meme origin, line memes, expression-pack style topics.
- `work_fact`: a hard fact about a specific work.
- `character_fact`: a hard fact about a character, role, name, alias, or archetype.
- `production_note`: production, PV, animation quality, recap episodes, scheduling, committees.
- `community_take`: fan reactions, score debates, shipping wars, community labels.

Fallback mapping if missing:

- `topic_type === "concept"` -> `term_origin`
- `topic_type === "phenomenon"` -> `community_take` or `production_note`
- `topic_type === "work"` -> `work_fact`

### `quiz`

Purpose: optional true/false interaction for `/cold`.

Only generate `quiz` when the item can be judged as a clear factual claim.

Good candidates:

- 《名侦探柯南》里的小黑有官方名字。
- 某个梗确实出自某部作品。
- 某角色确实有某设定。
- 某部作品确实有某个 production or broadcast fact.

Bad candidates:

- 世界系为什么总绕不开 EVA？
- 电波系角色是不是脑子有病？
- PV 欺诈到底在吐槽什么？
- 空气系是不是什么都没发生？

Rules:

- `statement` must be a declarative sentence, not a question.
- `statement` must not contain "为什么", "如何", "怎么样", or similar discussion wording.
- `answer` is boolean.
- `explanation` is 30-80 Chinese characters.
- The concrete fact must be supported by evidence.
- If no reliable fact can be checked, output `quiz: null`.

## Prompt Changes

Update `lib/cold-hook-prompt.ts` so the LLM outputs:

```json
{
  "topic_type": "",
  "topic_key": "",
  "cold_subtype": "",
  "hook": "",
  "blurb": "",
  "style_pattern": "",
  "insight": "",
  "quiz": null,
  "source_urls": [],
  "confidence": 0,
  "recommendations": []
}
```

Prompt guidance:

- The few-shot examples define voice, warmth, and detail density.
- Do not force all content into quiz format.
- Do not force all hooks into fact-checkable claims.
- `blurb` is for roam cards.
- `insight` remains the full cold hook explanation.
- `quiz` only appears for fact-checkable content.

## Verifier Changes

Update `lib/cold-verifier.ts` and related fact rules.

Validate `blurb`:

- non-empty
- 35-80 Chinese characters
- not identical to the beginning of `insight`
- no source citation names

Validate `cold_subtype`:

- must be one of the allowed enum values
- may be filled by fallback mapping if absent

Validate `quiz` if present:

- `statement`, `answer`, `explanation` exist
- `statement` is not a question
- `statement` does not contain discussion wording such as "为什么", "如何理解"
- `explanation` is 30-100 Chinese characters
- fact is supported by evidence

Do not require every cold hook to include `quiz`.

## Knowledge Roam Routing

Current roam cards are built in `lib/roam/roam-store.ts`.

Update `RoamCard` target behavior:

```ts
target:
  | { kind: "work"; title: string; href: string }
  | { kind: "cold"; title: string; href: "/cold" };
```

Routing rules:

- `work_fact` and `character_fact`:
  - if a work title can be determined, go to `/work/[title]`.
- all other subtypes:
  - go to `/cold`.

Examples:

```text
work_fact / character_fact
-> 深入了解
-> /work/名侦探柯南

term_origin / meme_origin / production_note / community_take
-> 深入了解
-> /cold
-> recommended works inside cold page
```

## Roam Card Blurb

In `lib/roam/roam-store.ts`:

- Prefer `record.blurb`.
- Fall back to `trimBlurb(record.insight)` only when `blurb` is missing.

Do not rely on truncation as the primary card copy.

## Session Handling For `/cold`

Current `/cold` reads from `sessionStorage`.

For a first implementation, keep `/cold` and write the selected cold payload into session storage before navigation.

In `components/roam/RoamCardDeck.tsx`:

```ts
if (activeCard.target.kind === "cold") {
  sessionStorage.setItem(
    COLD_SESSION_STORAGE_KEY,
    JSON.stringify(buildColdSessionEnvelope(activeCard.cold_payload))
  );
  router.push("/cold");
} else {
  router.push(activeCard.target.href);
}
```

This requires `RoamCard` to carry either:

- a complete `cold_payload`, or
- enough information to fetch/build one by `cold_id`.

For the first version, passing `cold_payload` from `coldRecordToRoamCard` is the simplest.

Longer-term improvement:

```text
/cold/[id]
```

That would make cold detail pages refreshable and shareable, but it is not required for the first implementation.

## `/cold` Quiz Interaction

Update `app/cold/page.tsx`.

If `data.quiz` exists:

1. Show the hook title.
2. Show a quiz block:

```text
你觉得这是真的吗？
[像真的] [感觉在骗我]
```

3. Before the user picks, hide or collapse the full `insight`.
4. After selection, show:

```text
答案：是真的，不过细节比标题更有意思。
```

or:

```text
答案：不是哦，这次是个误会。
```

5. Then show `quiz.explanation`.
6. Then reveal `insight` and recommendations.

If `data.quiz` is absent:

- keep the existing behavior and show `insight` directly.

This interaction belongs only on `/cold`. Do not put it on roam cards.

## UI Copy

Quiz prompt:

```text
你觉得这是真的吗？
```

Buttons:

```text
像真的
感觉在骗我
```

True reveal:

```text
是真的，不过细节比标题更有意思。
```

False reveal:

```text
不是哦，这次是个误会，真相其实更绕一点。
```

Roam deep button can remain:

```text
深入了解
```

Cold detail recommendation heading:

```text
用这几部看懂它
```

## Implementation Steps

1. Add `ColdSubtype` and `ColdQuiz`.
2. Extend cold raw, record, and payload types with `cold_subtype`, `blurb`, and `quiz`.
3. Update cold prompt output schema.
4. Update verifier for `blurb`, `cold_subtype`, and optional `quiz`.
5. Preserve new fields through service, store, enrich, and session layers.
6. Update roam card type to carry `cold_payload` or equivalent cold detail data.
7. Update roam store:
   - use `record.blurb`
   - route `work_fact` / `character_fact` to work pages
   - route other subtypes to `/cold`
8. Update `RoamCardDeck.goDeep()` to write cold session payload before routing to `/cold`.
9. Update `/cold` page to display optional quiz.
10. Run build.

## Acceptance Criteria

- Roam cards show `hook + blurb`, not raw `insight` truncation.
- Concept, meme, production, and community cards go to `/cold`.
- Work-level and character-level fact cards can go directly to `/work/[title]`.
- `/cold` can receive payloads from both the home cold hook and knowledge roam.
- Quiz appears only when `quiz` exists.
- Concept explanation cards do not show true/false quiz.
- New fields survive persistence in `data/cold-hooks.json`.
- `npm run build` passes.

