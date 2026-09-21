# AnimeLore Design System

## Product Character

AnimeLore is a mobile-first anime knowledge archive guided by Mei, a warm and
curious research companion. The interface should feel like a living editorial
archive: tactile, literary, quietly playful, and trustworthy. It must not look
like a generic neon gaming dashboard.

## Platform and Layout

- Platform: responsive web / installable PWA.
- Mobile first: 360–430 px, thumb-friendly controls, bottom navigation, bottom sheets.
- Tablet: 768–1023 px, two-column content where useful.
- Desktop: 1024 px and above, centered reading canvas with persistent top navigation
  and split-view dossier layouts.
- Reading width: 680–760 px for long text; application shell up to 1180 px.
- Respect `env(safe-area-inset-*)` on mobile.

## Theme: Day — Paper Archive

| Semantic role | Token | Value |
| --- | --- | --- |
| Canvas | `--canvas` | `#F7F1E7` |
| Canvas tint | `--canvas-tint` | `#EEE4D4` |
| Surface | `--surface` | `#FFFDF8` |
| Elevated surface | `--elevated` | `#FFFFFF` |
| Soft surface | `--soft` | `#EDE4D7` |
| Primary ink | `--ink` | `#292722` |
| Body ink | `--body` | `#4E4941` |
| Muted ink | `--muted` | `#756F66` |
| Border | `--line` | `#D8CCBC` |
| Brand action | `--brand` | `#A64B37` |
| Brand hover | `--brand-strong` | `#843727` |
| Secondary accent | `--sage` | `#66725B` |
| Focus ring | `--focus` | `#B65B43` |

## Theme: Night — Starlit Reading Room

| Semantic role | Token | Value |
| --- | --- | --- |
| Canvas | `--canvas` | `#111713` |
| Canvas tint | `--canvas-tint` | `#171D18` |
| Surface | `--surface` | `#1A211C` |
| Elevated surface | `--elevated` | `#202820` |
| Soft surface | `--soft` | `#293129` |
| Primary ink | `--ink` | `#F2EBDD` |
| Body ink | `--body` | `#D4CABB` |
| Muted ink | `--muted` | `#A59B8D` |
| Border | `--line` | `#394239` |
| Brand action | `--brand` | `#D7835F` |
| Brand hover | `--brand-strong` | `#E79A75` |
| Secondary accent | `--sage` | `#94A083` |
| Focus ring | `--focus` | `#E19A78` |

Both themes share semantic contrast and hierarchy. Theme changes must not alter
layout or meaning.

## Typography

- Display: `"Noto Serif SC"`, `"Songti SC"`, Georgia, serif.
- UI/body: Inter, `"Noto Sans SC"`, system-ui, sans-serif.
- Metadata: `"IBM Plex Mono"`, `"SFMono-Regular"`, Consolas, monospace.
- Headlines use restrained serif typography; body copy remains highly readable.
- Minimum mobile body size: 15 px; long-form line height: 1.75.

## Shape, Depth, and Texture

- Cards: softly rounded 18–24 px, fine borders, whisper-soft elevation.
- Buttons: 12–16 px corners; pills only for filters, tags, and compact actions.
- Paper grain may appear as a low-opacity CSS texture; never reduce text contrast.
- Use archive tabs, index numbers, stamped labels, bookmarks, and fine rules as
  recurring motifs.
- Avoid excessive glassmorphism, neon glows, and oversized gradients.

## Motion

- Duration: 160–260 ms for controls, up to 420 ms for page/card transitions.
- Easing: natural ease-out or restrained spring.
- Roam cards support horizontal drag; dossier cards support mobile swipe.
- Respect `prefers-reduced-motion`.
- Delight should come from small archive interactions: a stamped selection,
  bookmark movement, card-edge shimmer, or Mei reaction.

## Mei Character System

Identity anchors:

- long wavy black hair;
- round glasses;
- star bookmark hair clip;
- cream knit cardigan over dark clothing;
- archive notebook and olive research bag;
- warm, observant, slightly playful personality.

Usage:

- compact avatar in AI chat;
- half-body illustration in onboarding and large empty states;
- chibi reactions for loading, source checking, success, and retry;
- subtle watermark or archive stamp in share cards;
- never place a busy full illustration behind long-form text.

## Accessibility

- WCAG AA text contrast in both themes.
- Visible keyboard focus for every interactive element.
- 44 × 44 px minimum touch target.
- Semantic headings and landmarks.
- Dialog focus management and Escape close.
- Do not communicate state by color alone.
