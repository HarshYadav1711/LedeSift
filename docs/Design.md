# Design — LedeSift

## Direction

**Editorial clarity with technical precision.** LedeSift should feel like a carefully designed reading utility—not a generic AI SaaS dashboard.

## Brand

- **Name:** LedeSift (hero-level signal on the first viewport)
- **Tagline:** The page, distilled.

## Color system

| Token | Hex | Role |
| --- | --- | --- |
| Background | `#F7F5F0` | Page ground |
| Primary ink | `#24322D` | Headings, body emphasis |
| Accent | `#A64E37` | Primary actions, focus accents |
| Muted text | `#66716B` | Supporting copy, hints |
| Borders | `#D8DCD5` | Dividers, input borders |

CSS variables in `src/app/globals.css` are the source of truth for implementation.

## Typography

- Deliberate, readable pairing: editorial serif for display/brand; clean sans for UI and body.
- Comfortable reading width for summary text (roughly 60–75 characters).
- Clear hierarchy: brand → tagline → form → result.
- Avoid default system/Inter-only SaaS look; use loaded web fonts via `next/font`.

## Layout

- One composition on the first viewport: brand, tagline, URL form, and space for result—not a multi-widget dashboard.
- Semantic HTML: landmark regions, labeled inputs, associated error text.
- Responsive: usable from ~320px width upward; stacked form on small screens; generous padding.
- Cards only if they aid interaction (e.g. grouping the form). Prefer open layout over nested panels.

## Interaction

- Accessible controls: visible labels, `:focus-visible` styles using accent/ink, adequate hit targets.
- Loading: disable submit, announce busy state (e.g. `aria-busy` / live region).
- Errors: adjacent to the form or result region; plain language; no alarming noise.
- Motion: minimal and purposeful (optional short opacity/height for result appearance). No decorative glow or excessive animation.

## Explicit avoidances

Generic AI SaaS templates, gradient mesh backgrounds, glassmorphism, decorative glow, heavy multi-layer shadows, fake analytics, nonfunctional chrome, emoji ornamentation.

## Phase 3 UI

- Header wordmark + tagline; no fake navigation.
- Headline: “The internet is loud. Find the point.”
- Primary action: “Distill this page”.
- Results: title, domain, summary, key takeaways count, partial-coverage notice, copy, open source, collapsible text preview.
- Responsive single-column reading layout from ~320px upward.
- Focus rings use accent/ink; reduced-motion respected.
