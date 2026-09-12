# UI Redesign — "Interdimensional Portal"

**Date:** 2026-09-11
**Status:** Approved, pending execution
**Scope:** Visual restyle only. No new views, no new state, no data-layer changes. Architecture stays identical; the skin is swapped.

## Direction (approved)

- **Visual language:** Interdimensional Portal — dark space background, starfield, acid/portal-green neon glow, animated portal swirl in the hero.
- **Scope:** Visual restyle only (no detail view, no favorites).
- **Typography:** Punchy display font (`@fontsource/barlow-condensed`) for headings, Geist for body/UI.
- **Animation:** `motion` (motion/react) for entrance reveals and micro-interactions.

## Design

### 1. Theme & background

**Theme tokens (`src/index.css`)**
- Permanent dark-space palette (default, no toggle). Remove light theme tokens entirely.
- `--background`: deep space navy-black with subtle indigo tint (oklch(0.08 0.02 260)).
- `--foreground`: near-white (oklch(0.98 0 0)).
- `--card`: translucent dark (oklch(0.12 0.01 260 / 0.8)); `--border` faint green-tinted (oklch(0.35 0.15 140 / 0.3)) so surfaces read as "holodeck glass."
- `--primary`: acid portal green (oklch(0.7 0.25 140)), darker hover state (oklch(0.6 0.22 140)).
- `--primary-foreground`: near-black (oklch(0.1 0 0)).
- Semantic status colors with glow tokens:
  - **Alive**: `--status-alive` (oklch(0.65 0.2 140)), `--status-alive-glow` (oklch(0.65 0.2 140 / 0.6))
  - **Dead**: `--status-dead` (oklch(0.6 0.25 25)), `--status-dead-glow` (oklch(0.6 0.25 25 / 0.6))
  - **Unknown**: `--status-unknown` (oklch(0.55 0 0)), `--status-unknown-glow` (oklch(0.55 0 0 / 0.4))
- Input/ring tokens updated for dark theme: `--input`, `--ring` with green tint.

**`src/components/portal-background.tsx` (new)** — fixed full-screen layer:
- Starfield: single pseudo-element with `box-shadow` generating static white dots (no canvas/lib, minimal DOM).
- Portal glow: large slowly-rotating conic-gradient green swirl, heavily blurred (`filter: blur(120px)`), behind the hero. `will-change: transform, filter`.
- Faint nebula gradient near the top (radial-gradient).
- Respects `prefers-reduced-motion`: pauses rotation, removes blur animation.

### 2. Hero (replaces header in `src/App.tsx`)

- Display-font headline (Barlow Condensed ExtraBold Italic) — big, condensed, poster-like.
- Rotating portal-ring logomark (motion spin, 20s linear infinite) beside the title. Pauses on `prefers-reduced-motion`.
- Tagline restyled as muted space text.
- Font preload in `index.html`: `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/barlow-condensed.woff2">`.

### 3. Filter panel (`src/components/character-filter-form.tsx`)

- Dark glass panel with faint green edge highlight (`border-border/50`, `box-shadow: 0 0 20px var(--primary)/0.1`).
- Inputs/selects inherit new tokens; green focus ring (`focus-visible:ring-[3px] focus-visible:ring-primary/50`).
- Reset becomes a labeled button (Eraser icon + "Reset" text) instead of bare icon button — improves accessibility.

### 4. Character cards (`src/components/character-card.tsx`)

- Image hover zoom (`transform: scale(1.03)`) + thin green border glow (`box-shadow: 0 0 0 1px var(--primary), 0 0 20px var(--primary)/0.3`) + soft motion tilt (3deg max).
- Status as glowing pill with pulsing color dot (green/red/slate), replacing flat `ui/badge` usage. Custom component using status tokens + CSS `animation: pulse 2s ease-in-out infinite` for Alive.
- Display-font name (Barlow Condensed), cleaner species·gender line, tightened location/origin.
- Staggered fade-up entrance via motion `whileInView` (wired in the grid). Respects `prefers-reduced-motion`.

### 5. Grid & pagination (`src/components/characters-list.tsx`)

- Same responsive grid; hover lift on cards (`transform: translateY(-4px)`).
- Pagination: Prev/Next with chevrons + page input for direct jump (total pages can exceed 40). Current page shown as "Page X of Y".
- Skeletons, error, and empty states restyled to match dark space theme (use `--card`, `--border`, `--muted-foreground`).

### 6. Shell (`index.html`)

- Updated title/meta/theme-color; apply `dark` class on `<html>` by default.
- Preload Barlow Condensed font.
- Viewport meta includes `color-scheme: dark`.

## Dependencies

- Add: `motion` (motion/react)
- Add: `@fontsource/barlow-condensed`

## Files touched

- New: `src/components/portal-background.tsx`
- New: `src/components/status-pill.tsx` (replaces badge usage for status)
- Modified: `src/index.css`, `index.html`, `src/App.tsx`, `src/components/character-card.tsx`, `src/components/characters-list.tsx`, `src/components/character-filter-form.tsx`

## Verification

- `npm run lint`
- `npm run build`
- `npm test` (existing hook tests must stay green)
- Manual checklist:
  - [ ] Dark theme renders correctly without flash of light theme
  - [ ] Animations respect `prefers-reduced-motion` (portal spin, card entrance, starfield)
  - [ ] Focus states visible on all interactive elements (inputs, selects, buttons, pagination)
  - [ ] Contrast ratios meet WCAG AA for primary/foreground combinations
  - [ ] Font loads without layout shift (preload works)
  - [ ] Status pills glow/pulse correctly for each state
- No new logic tests (visual-only change).

(End of file - total 112 lines)