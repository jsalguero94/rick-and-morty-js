# Character Detail Modal

**Date:** 2026-09-11
**Status:** Approved for implementation
**Scope:** Add a character detail modal opened by clicking an entire character card. New fetch layer for episodes + locations, new modal component, card/wiring changes, tests.

## Context

The app lists Rick and Morty characters on cards showing image, name, status, species, gender, origin, and current location (truncated). Each `Character` object also carries `episode: string[]` (URLs), `type`, `created`, and `origin`/`location` URLs that currently go unused.

A card click opens a modal with richer detail. The `Character` object already provides identity, status metadata, and location names without any network call; the modal additionally fetches (a) the character's episodes with codes/titles/dates and (b) origin + current location dimension/type.

## Approach

Approach A (approved): two small typed fetch functions in `api.ts` + a `useCharacterDetails` hook using two parallel `useQuery`s via `useQueries`. Granular loading/error per section, results cached per id-set by react-query. A whole-card click opens the modal.

## Data layer

### `src/types/index.ts`

Add `export type { Episode, Location } from "rickmortyapi"`.

### `src/lib/api.ts`

Two functions mirroring the existing `getCharactersPage` convention (returns `ApiResponse<T>`, non-2xx returns `{ status, statusMessage, data: {} }`):

- `getEpisodesByIds(ids: number[]): Promise<ApiResponse<Episode[]>>` — `GET ${API_BASE_URL}/episode/${ids.join(",")}`. Returns `{ status: 200, statusMessage: "", data: [] }` immediately when `ids` is empty.
- `getLocationsByIds(ids: number[]): Promise<ApiResponse<Location[]>>` — same shape against `/location/`.

Defect guidance from `getCharactersPage`: build the request URL manually and follow the single-trailing-slash rules (no `//`).

### `src/hooks/useCharacterDetails.ts`

Signature: `useCharacterDetails(character: Character)`.

Returns:
- `episodes: Episode[] | undefined`
- `origin: Location | undefined` (the origin resource; `undefined` when the character's `origin.url` is empty/malformed)
- `location: Location | undefined` (the current-location resource; `undefined` when URL is empty/malformed)
- `isPending`, `isError`, `error`

Behavior:
- Extract episode ids by parsing the trailing numeric segment of each `character.episode` URL; drop any that do not parse to a positive integer.
- Extract location ids from `character.origin.url` and `character.location.url` the same way; empty string or unparseable → the resource is `undefined` and no request fires.
- Fires two parallel `useQuery`s:
  - key `["episodes", { ids }]`, query fn `getEpisodesByIds(ids)` → normalized `Episode[]`
  - key `["locations", { ids }]`, query fn `getLocationsByIds(ids)` → normalized `Location[]`
  - `enabled` only when the corresponding id set is non-empty.
- Normalizes each `ApiResponse`: non-2xx or missing `data` → throw `Failed to fetch episodes: <status> <statusMessage>` / `Failed to fetch locations: …`.
- Sorts resolved episodes by season then episode number parsed from `code` (`"S03E01"` → season 3, episode 1). Episodes whose `code` does not match `S` + digits + `E` + digits appear after coded episodes, preserving original order.

## Components

### `src/components/ui/dialog.tsx` (new)

Thin shadcn-style wrapper over `radix-ui`'s `Dialog` (already a dependency), following how `select.tsx`/`button.tsx` wrap radix primitives. Exports `Dialog` namespace with `Root`, `Trigger`, `Portal`, `Overlay`, `Content`, `Title`, `Description`, `Close`. Style: dark `glass-panel` surfaces, primary-ring focus, portal-green accents consistent with the theme.

### `src/components/character-detail-modal.tsx` (new)

Props: `{ character: Character | null; open: boolean; onOpenChange: (open: boolean) => void }`.

Renders `Dialog.Root` and, when open, `Portal`/`Overlay`/`Content`. The `useCharacterDetails(character)` hook runs with whatever non-null character is provided; the dialog is keyed by `character.id` so switching characters always shows fresh data.

Content:
- **Header** — portrait image, full name (not truncated), `StatusPill`.
- **Metadata grid (no network)** — status, species, type, gender, created date. `type` and created-render fallbacks: empty `type` → "Unknown"; `created` formatted with `toLocaleDateString()`.
- **Origin / current location** — each a row with name (full), dimension, type. Shows the resource data once the location query resolves; "Unknown" fallback when the corresponding URL was empty/malformed.
- **Episodes** — while pending show skeleton lines; on error show inline `Failed to load episodes.` message; otherwise list each as `S03E01 · <title> · <air_date>` (air date formatted with `toLocaleDateString()`).
- **Close** — labeled icon button (`aria-label="Close"`).
- Scrolling content internally (long episode lists); radix provides body-scroll lock.

### `src/components/character-card.tsx`

Add optional `onSelect?: (character: Character) => void` prop. When present, the card root renders as a real `<button type="button">` (full-size, transparent, text-left) so the whole card is clickable and keyboard-accessible (focusable, Enter/Space triggers). Card content is the accessible name. Existing hover/entrance animations unchanged; reduced-motion respected.

### `src/components/characters-list.tsx`

- Own `selectedCharacter: Character | null` state.
- Pass `onSelect={setSelectedCharacter}` to each `CharacterCard`.
- Render `<CharacterDetailModal key={selectedCharacter?.id} character={selectedCharacter} open={!!selectedCharacter} onOpenChange={(open) => { if (!open) setSelectedCharacter(null) }} />`.

## Error handling

- Episode or location fetch failure → inline error message in that section only; the rest of the modal (metadata + other section) remains usable.
- Empty/malformed URLs → "Unknown" fallback, no request fired.
- Non-2xx from any batch request → normalized thrown error in the hook, matched against the "Failed to load …" section message.

## Accessibility

- Whole-card button: real `<button>`, focusable, Enter/Space opens.
- radix `Dialog`: focus trap, `Esc` close, `role="dialog"`, `aria-modal`, `Title`/`Description` wired.
- Close button labeled via `aria-label`.
- Modal entrance animation skipped under `prefers-reduced-motion`.

## Testing

- `src/hooks/useCharacterDetails.test.ts` — id extraction (including empty/malformed URLs), episode sorting, batch URL shape (`/episode/1,2,3`), 404/500 → thrown normalized error. Mirrors `useCharacters.test.ts` style (mock `globalThis.fetch`, `vi.restoreAllMocks()`).
- `src/components/character-detail-modal.test.tsx` — render with a real character + mocked fetch: metadata grid values, episodes after load, skeleton while pending, inline error on failure, "Unknown" fallback for empty URLs. Wrap in `QueryClientProvider`.
- `src/components/characters-list.test.tsx` — extend: clicking a card sets `selectedCharacter` and opens the dialog.

## Verification

- `npm run lint`
- `npm run build`
- `npm test` (existing tests stay green)

## Files touched

- New: `src/components/ui/dialog.tsx`
- New: `src/components/character-detail-modal.tsx`
- New: `src/hooks/useCharacterDetails.ts`
- New: `src/hooks/useCharacterDetails.test.ts`
- New: `src/components/character-detail-modal.test.tsx`
- Modified: `src/types/index.ts`, `src/lib/api.ts`, `src/components/character-card.tsx`, `src/components/characters-list.tsx`, `src/components/characters-list.test.tsx`