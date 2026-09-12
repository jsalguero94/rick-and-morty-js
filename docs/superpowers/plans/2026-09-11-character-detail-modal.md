# Character Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users click a whole character card to open a modal showing identity metadata, origin/current-location dimension + type, and a sorted episode list, backed by a new parallel-fetch data layer.

**Architecture:** The card calls `onSelect(character)` held as `selectedCharacter` state in `CharactersList`, which mounts a controlled `CharacterDetailModal`. The modal drives a new `useCharacterDetails` hook that extracts ids from the character's episode/location URLs and fires two parallel react-query fetches (batch `/episode/id,id`, `/location/id,id`), returning sorted episodes plus the origin/current-location resources. Identity/metadata render from the already-loaded `Character` object with zero extra network.

**Tech Stack:** React 19, react-query (`@tanstack/react-query`), radix-ui `Dialog`, shadcn-style `cn`/CVA UI, tailwind css + two-animate, vitest + testing-library + happy-dom, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-11-character-detail-modal-design.md`

## Global Constraints

- All api.ts functions return the `ApiResponse<T>` shape and, on non-2xx, `{ status, statusMessage, data: <empty-ish> }`; hooks normalize into typed results or throw.
- Hook fetch helpers are exported (mirroring `useCharacters`'s exported `fetchCharactersPage`) so tests target fetch shape without rendering.
- Batch URLs built manually — single segment `/episode/1,2,3`, never a double slash.
- Empty/`""`/unparseable episode or location URLs → no request fires and the value is `undefined`/empty, never an error.
- Episode list sorted by season then episode number from `code`; unparseable codes sort after coded ones, stable.
- Modal identity + metadata (+ episode count) render from the `Character` object alone; only episodes and origin/location resources are fetched (skeleton → data or inline error per section).
- Radix Dialog provides focus trap, `Esc` close, `role="dialog"`, body-scroll lock; close button labeled via `aria-label`.
- Whole-card button must be a real `<button type="button">` (focusable, Enter/Space works).
- Spec amendment (type-level necessity): where the spec says non-2xx returns `data: {}`, the array endpoints instead return `data: []` — `{}` is not assignable to `Episode[]`. Hooks never read `data` on non-2xx; they throw on `status` first.
- Spec amendment (determinism): episode air dates render from the API's own `air_date` string (already display-ready, e.g. "December 2, 2013") instead of `toLocaleDateString()` re-parsing, keeping tests locale-independent.

---

### Task 1: Types + batch fetch functions

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/api.ts`
- Test: `src/hooks/useCharacterDetails.test.ts` (written in Task 2)

**Interfaces:**
- Consumes: existing `api.ts` conventions — `API_BASE_URL`, `ApiResponse` from `rickmortyapi`.
- Produces:
  - `src/lib/api.ts` exports `getEpisodesByIds(ids: number[]): Promise<ApiResponse<Episode[]>>`
  - `src/lib/api.ts` exports `getLocationsByIds(ids: number[]): Promise<ApiResponse<Location[]>>`
  - `src/types/index.ts` re-exports `Episode` and `Location` from `rickmortyapi`

- [ ] **Step 1: Add type re-exports to `src/types/index.ts`**

```ts
export type { Character } from "rickmortyapi"
export type { Episode, Location } from "rickmortyapi"
```

(The file's import block stays under the export block as-is.)

- [ ] **Step 2: Add the batch fetch functions to `src/lib/api.ts`**

Append after `getCharactersPage`. Update the top import to include `Episode`, `Location`:

```ts
import type {
  ApiResponse,
  Character,
  CharacterFilter,
  Episode,
  Info,
  Location,
} from "rickmortyapi"
```

Append:

```ts
/**
 * Fetches a batch of episodes by ids via a single comma-joined URL.
 * Mirrors `getCharactersPage`'s error convention: non-2xx returns an
 * `ApiResponse` carrying the status instead of throwing.
 */
export async function getEpisodesByIds(
  ids: number[]
): Promise<ApiResponse<Episode[]>> {
  if (ids.length === 0) {
    return { status: 200, statusMessage: "OK", data: [] }
  }

  const response = await fetch(`${API_BASE_URL}/episode/${ids.join(",")}`)

  if (!response.ok) {
    return { status: response.status, statusMessage: response.statusText, data: [] }
  }

  const data: Episode[] = await response.json()

  return {
    status: response.status,
    statusMessage: response.statusText,
    data,
  }
}

/**
 * Fetches a batch of locations by ids via a single comma-joined URL.
 * Same error convention as `getEpisodesByIds`.
 */
export async function getLocationsByIds(
  ids: number[]
): Promise<ApiResponse<Location[]>> {
  if (ids.length === 0) {
    return { status: 200, statusMessage: "OK", data: [] }
  }

  const response = await fetch(`${API_BASE_URL}/location/${ids.join(",")}`)

  if (!response.ok) {
    return { status: response.status, statusMessage: response.statusText, data: [] }
  }

  const data: Location[] = await response.json()

  return {
    status: response.status,
    statusMessage: response.statusText,
    data,
  }
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: PASS (typecheck + vite build succeed)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/api.ts
git commit -m "feat: add batch episode/location fetch functions"
```

---

### Task 2: `useCharacterDetails` hook + tests

**Files:**
- Create: `src/hooks/useCharacterDetails.ts`
- Create: `src/hooks/useCharacterDetails.test.ts`

**Interfaces:**
- Consumes: `getEpisodesByIds`, `getLocationsByIds` (Task 1); `Character`, `Episode`, `Location` types.
- Produces:
  - `fetchEpisodesByIds(ids: number[]): Promise<Episode[]>` — normalized; throws on non-2xx.
  - `fetchLocationsByIds(ids: number[]): Promise<Location[]>` — normalized; throws on non-2xx.
  - `sortEpisodes(episodes: Episode[]): Episode[]` — sorted copy by season/episode from `code`.
  - `idFromUrl(url: string): number | undefined` — trailing-numeric-id parser; `undefined` for `""`/malformed/non-positive.
  - `useCharacterDetails(character: Character): { episodes: Episode[] | undefined; origin: Location | undefined; location: Location | undefined; isPending: boolean; isError: boolean; error: Error | null }`

- [ ] **Step 1: Write the failing tests**

`src/hooks/useCharacterDetails.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  fetchEpisodesByIds,
  fetchLocationsByIds,
  idFromUrl,
  sortEpisodes,
} from "@/hooks/useCharacterDetails"
import type { Episode, Location } from "@/types"

const mockFetchResponse = (
  status: number,
  statusText: string,
  body: unknown
) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  }) as Response

const makeEpisode = (
  id: number,
  name: string,
  code: string,
  airDate = "December 2, 2013"
): Episode => ({
  id,
  name,
  episode: code,
  air_date: airDate,
  characters: [],
  url: `https://example.com/episode/${id}`,
  created: "2017-11-10T12:56:34.000Z",
})

const makeLocation = (id: number, name: string): Location => ({
  id,
  name,
  type: "Planet",
  dimension: "Dimension C-137",
  residents: [],
  url: `https://example.com/location/${id}`,
  created: "2017-11-10T12:56:34.000Z",
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("fetchEpisodesByIds", () => {
  it("requests a comma-joined batch endpoint", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, "OK", [makeEpisode(1, "Pilot", "S01E01")])
    )

    const result = await fetchEpisodesByIds([1])

    expect(String(spy.mock.calls[0][0])).toContain("/episode/1")
    expect(result).toEqual([makeEpisode(1, "Pilot", "S01E01")])
  })

  it("returns an empty array without fetching when ids are empty", async () => {
    const spy = vi.spyOn(globalThis, "fetch")

    await expect(fetchEpisodesByIds([])).resolves.toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it("throws a normalized error for non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(500, "Internal Server Error", {})
    )

    await expect(fetchEpisodesByIds([1])).rejects.toThrow(
      "Failed to fetch episodes: 500 Internal Server Error"
    )
  })
})

describe("fetchLocationsByIds", () => {
  it("requests a comma-joined batch endpoint", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, "OK", [makeLocation(1, "Earth (C-137)")])
    )

    const result = await fetchLocationsByIds([1, 2])

    expect(String(spy.mock.calls[0][0])).toContain("/location/1,2")
    expect(result[0]?.name).toBe("Earth (C-137)")
  })

  it("throws a normalized error for non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(404, "Not Found", {})
    )

    await expect(fetchLocationsByIds([1])).rejects.toThrow(
      "Failed to fetch locations: 404 Not Found"
    )
  })
})

describe("sortEpisodes", () => {
  it("sorts by season then episode number from the code", () => {
    const s03e01 = makeEpisode(1, "The Rickshank Rickdemption", "S03E01")
    const s01e09 = makeEpisode(2, "Something Ricked...", "S01E09")
    const s01e10 = makeEpisode(3, "Close Rick-counters", "S01E10")

    expect(sortEpisodes([s03e01, s01e09, s01e10]).map((e) => e.name)).toEqual([
      "Something Ricked...",
      "Close Rick-counters",
      "The Rickshank Rickdemption",
    ])
  })

  it("puts episodes without a parseable code after coded ones, stable", () => {
    const coded = makeEpisode(1, "Pilot", "S01E01")
    const unparsed = makeEpisode(2, "Weird One", "UNKNOWN")

    expect(sortEpisodes([unparsed, coded]).map((e) => e.name)).toEqual([
      "Pilot",
      "Weird One",
    ])
  })
})

describe("idFromUrl", () => {
  it("parses the trailing numeric id from an API url", () => {
    expect(
      idFromUrl("https://rickandmortyapi.com/api/episode/28")
    ).toBe(28)
  })

  it("returns undefined for empty, unparseable, and non-positive urls", () => {
    expect(idFromUrl("")).toBeUndefined()
    expect(idFromUrl("https://example.com/episode/abc")).toBeUndefined()
    expect(idFromUrl("https://example.com/episode/0")).toBeUndefined()
    expect(idFromUrl("https://example.com/episode/-3")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/useCharacterDetails.test.ts`
Expected: FAIL — `@/hooks/useCharacterDetails` module not found

- [ ] **Step 3: Write the hook implementation**

`src/hooks/useCharacterDetails.ts`:

```ts
import { useQuery } from "@tanstack/react-query"
import type { Episode, Location } from "rickmortyapi"

import { getEpisodesByIds, getLocationsByIds } from "@/lib/api"
import type { Character } from "@/types"

const getErrorMessage = (response: {
  status: number
  statusMessage: string
}, resource: "episodes" | "locations") =>
  `Failed to fetch ${resource}: ${response.status} ${response.statusMessage}`

/**
 * Parses the trailing numeric id out of an API resource URL.
 * Returns undefined for "", malformed URLs, and non-positive ids.
 */
export function idFromUrl(url: string): number | undefined {
  const match = /\/(\d+)\/?$/.exec(url)
  if (!match) return undefined
  const id = Number(match[1])
  return Number.isInteger(id) && id > 0 ? id : undefined
}

export async function fetchEpisodesByIds(ids: number[]): Promise<Episode[]> {
  if (ids.length === 0) return []

  const response = await getEpisodesByIds(ids)
  if (response.status < 200 || response.status >= 300) {
    throw new Error(getErrorMessage(response, "episodes"))
  }
  return response.data
}

export async function fetchLocationsByIds(ids: number[]): Promise<Location[]> {
  if (ids.length === 0) return []

  const response = await getLocationsByIds(ids)
  if (response.status < 200 || response.status >= 300) {
    throw new Error(getErrorMessage(response, "locations"))
  }
  return response.data
}

export interface EpisodeCode {
  season: number
  episode: number
}

export function parseEpisodeCode(code: string): EpisodeCode | null {
  const match = /^S(\d+)E(\d+)$/i.exec(code.trim())
  if (!match) return null
  return { season: Number(match[1]), episode: Number(match[2]) }
}

export function sortEpisodes(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => {
    const aCode = parseEpisodeCode(a.episode)
    const bCode = parseEpisodeCode(b.episode)
    if (aCode && bCode) {
      return aCode.season - bCode.season || aCode.episode - bCode.episode
    }
    if (aCode) return -1
    if (bCode) return 1
    return 0
  })
}

export interface CharacterDetails {
  episodes: Episode[] | undefined
  origin: Location | undefined
  location: Location | undefined
  isPending: boolean
  isError: boolean
  error: Error | null
}

export function useCharacterDetails(character: Character): CharacterDetails {
  const episodeIds = character.episode
    .map(idFromUrl)
    .filter((id): id is number => id !== undefined)

  const originId = idFromUrl(character.origin.url)
  const currentLocationId = idFromUrl(character.location.url)
  const locationIds = [
    ...(originId !== undefined ? [originId] : []),
    ...(currentLocationId !== undefined ? [currentLocationId] : []),
  ]

  const episodesQuery = useQuery({
    queryKey: ["episodes", { ids: episodeIds }],
    queryFn: () => fetchEpisodesByIds(episodeIds),
    enabled: episodeIds.length > 0,
  })

  const locationsQuery = useQuery({
    queryKey: ["locations", { ids: locationIds }],
    queryFn: () => fetchLocationsByIds(locationIds),
    enabled: locationIds.length > 0,
  })

  const locationsById = new Map(
    (locationsQuery.data ?? []).map((location) => [location.id, location])
  )

  return {
    episodes: episodesQuery.data
      ? sortEpisodes(episodesQuery.data)
      : undefined,
    origin: originId !== undefined ? locationsById.get(originId) : undefined,
    location:
      currentLocationId !== undefined
        ? locationsById.get(currentLocationId)
        : undefined,
    isPending: episodesQuery.isPending || locationsQuery.isPending,
    isError: episodesQuery.isError || locationsQuery.isError,
    error: episodesQuery.error ?? locationsQuery.error,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/useCharacterDetails.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCharacterDetails.ts src/hooks/useCharacterDetails.test.ts
git commit -m "feat: add useCharacterDetails hook with episode/location fetches"
```

---

### Task 3: Shadcn-style Dialog wrapper

**Files:**
- Create: `src/components/ui/dialog.tsx`

**Interfaces:**
- Consumes: `radix-ui` `Dialog` namespace, `cn`, lucide `XIcon`.
- Produces: named exports `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogTitle`, `DialogDescription`.

- [ ] **Step 1: Write the wrapper**

`src/components/ui/dialog.tsx`:

```tsx
"use client"

import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(
  props: React.ComponentProps<typeof DialogPrimitive.Portal>
) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "glass-panel fixed top-1/2 left-1/2 z-50 grid w-full max-w-xl -translate-x-1/2 -translate-y-1/2 gap-4 max-h-[85dvh] overflow-y-auto rounded-xl p-6 shadow-lg duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-xl font-extrabold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: PASS (typecheck + vite build succeed)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: add shadcn-style dialog ui wrapper"
```

---

### Task 4: `CharacterDetailModal` component + tests

**Files:**
- Create: `src/components/character-detail-modal.tsx`
- Create: `src/components/character-detail-modal.test.tsx`

**Interfaces:**
- Consumes: `Dialog` + `DialogContent` (Task 3), `useCharacterDetails` (Task 2), `StatusPill`, `Skeleton`, `Character` type.
- Produces: `CharacterDetailModal(props: { character: Character | null; open: boolean; onOpenChange: (open: boolean) => void })`. Renders nothing when `character` is null. Uses the sibling `CharacterDetailDialog` (internal) to hold the hook; keyed by character id outside.

- [ ] **Step 1: Write the failing component test**

`src/components/character-detail-modal.test.tsx`:

```tsx
// @vitest-environment happy-dom
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CharacterDetailModal } from "@/components/character-detail-modal"
import type { Character } from "@/types"

const mockFetchResponse = (
  status: number,
  statusText: string,
  body: unknown
) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  }) as Response

const makeCharacter = (): Character => ({
  id: 1,
  name: "Rick Sanchez",
  status: "Alive",
  species: "Human",
  type: "",
  gender: "Male",
  origin: { name: "Earth (C-137)", url: "https://rickandmortyapi.com/api/location/1" },
  location: { name: "Citadel of Ricks", url: "" },
  image: "https://rickandmortyapi.com/api/character/avatar/1.jpeg",
  episode: ["https://rickandmortyapi.com/api/episode/1"],
  url: "https://rickandmortyapi.com/api/character/1",
  created: "2017-11-04T18:48:46.250Z",
})

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

describe("CharacterDetailModal", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders metadata, origin, and episodes from fetched data", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes("/episode/")) {
          return mockFetchResponse(200, "OK", [
            {
              id: 1,
              name: "Pilot",
              episode: "S01E01",
              air_date: "December 2, 2013",
              characters: [],
              url: "https://rickandmortyapi.com/api/episode/1",
              created: "2017-11-10T12:56:34.000Z",
            },
          ])
        }
        return mockFetchResponse(200, "OK", [
          {
            id: 1,
            name: "Earth (C-137)",
            type: "Planet",
            dimension: "Dimension C-137",
            residents: [],
            url: "https://rickandmortyapi.com/api/location/1",
            created: "2017-11-10T12:56:34.000Z",
          },
        ])
      })

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CharacterDetailModal
          character={makeCharacter()}
          open
          onOpenChange={() => {}}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText("Rick Sanchez")).not.toBeNull()
    expect(screen.getByText("Human")).not.toBeNull()

    await screen.findByText("Pilot")
    expect(screen.getByText("S01E01")).not.toBeNull()
    expect(screen.getByText("December 2, 2013")).not.toBeNull()
    expect(await screen.findByText("Dimension C-137")).not.toBeNull()
  })

  it("shows Unknown for locations without a url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, "OK", [])
    )

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CharacterDetailModal
          character={makeCharacter()}
          open
          onOpenChange={() => {}}
        />
      </QueryClientProvider>
    )

    const unknownLabels = await screen.findAllByText("Unknown")
    expect(unknownLabels.length).toBeGreaterThan(0)
  })

  it("shows an inline error when the episode fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(500, "Internal Server Error", {})
    )

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CharacterDetailModal
          character={makeCharacter()}
          open
          onOpenChange={() => {}}
        />
      </QueryClientProvider>
    )

    await screen.findByText(/Failed to load episodes/i)
  })

  it("renders nothing when character is null", () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CharacterDetailModal character={null} open={false} onOpenChange={() => {}} />
      </QueryClientProvider>
    )

    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/character-detail-modal.test.tsx`
Expected: FAIL — module `@/components/character-detail-modal` not found

- [ ] **Step 3: Write the component**

`src/components/character-detail-modal.tsx`:

```tsx
import { StatusPill } from "@/components/status-pill"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCharacterDetails } from "@/hooks/useCharacterDetails"
import type { Character, Episode, Location } from "@/types"

export interface CharacterDetailModalProps {
  character: Character | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        data-slot="meta-value"
        className="font-medium text-foreground"
      >
        {value}
      </dd>
    </div>
  )
}

function LocationRow({
  title,
  name,
  detail,
}: {
  title: string
  name: string
  detail: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">
        {title}
      </dt>
      <dd className="font-medium text-foreground">{name}</dd>
      <dd className="text-sm text-muted-foreground">{detail}</dd>
    </div>
  )
}

function EpisodeRow({ episode }: { episode: Episode }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-primary">{episode.episode}</span>
      <span className="flex-1 text-foreground">{episode.name}</span>
      <span className="text-muted-foreground">{episode.air_date}</span>
    </li>
  )
}

function CharacterDetailDialog({
  character,
  open,
  onOpenChange,
}: CharacterDetailModalProps) {
  const { episodes, origin, location, isPending, isError } =
    useCharacterDetails(character)

  const locationDetail = (
    resource: Location | undefined,
    fallbackName: string
  ) =>
    resource
      ? {
          name: resource.name,
          detail: [resource.type, resource.dimension]
            .filter(Boolean)
            .join(" · ") || "Unknown",
        }
      : { name: fallbackName, detail: "Unknown" }

  const originInfo = locationDetail(origin, character.origin.name)
  const locationInfo = locationDetail(location, character.location.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">
          Details for {character.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Origin, current location, and episode appearances for{" "}
          {character.name}.
        </DialogDescription>
        <div className="flex items-start gap-4">
          <img
            src={character.image}
            alt={`${character.name} portrait`}
            className="size-24 shrink-0 rounded-lg object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-heading text-3xl leading-none font-extrabold tracking-wide italic uppercase">
              {character.name}
            </h2>
            <StatusPill status={character.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <MetaRow label="Species" value={character.species} />
          <MetaRow
            label="Type"
            value={character.type || "Unknown"}
          />
          <MetaRow label="Gender" value={character.gender} />
          <MetaRow
            label="Created"
            value={new Date(character.created).toLocaleDateString()}
          />
          <MetaRow
            label="Episodes"
            value={String(
              episodes?.length ?? character.episode.length
            )}
          />
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <LocationRow
            title="Origin"
            name={originInfo.name}
            detail={originInfo.detail}
          />
          <LocationRow
            title="Last known location"
            name={locationInfo.name}
            detail={locationInfo.detail}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs tracking-widest text-muted-foreground uppercase">
            Episodes
          </h3>
          {isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load episodes.
            </p>
          ) : episodes && episodes.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {episodes.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No known episodes.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CharacterDetailModal({
  character,
  open,
  onOpenChange,
}: CharacterDetailModalProps) {
  if (!character) return null

  return (
    <CharacterDetailDialog
      key={character.id}
      character={character}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/character-detail-modal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/character-detail-modal.tsx src/components/character-detail-modal.test.tsx
git commit -m "feat: add character detail modal with episode and location sections"
```

---

### Task 5: Clickable card + list wiring + tests

**Files:**
- Modify: `src/components/character-card.tsx`
- Modify: `src/components/characters-list.tsx`
- Modify: `src/components/characters-list.test.tsx`

**Interfaces:**
- Consumes: `CharacterDetailModal` (Task 4), `Character` type.
- Produces: `CharacterCard({ character, onSelect?: (c) => void })` — renders whole card as a `<button>` when `onSelect` is provided.

- [ ] **Step 1: Write the failing card-click test in `src/components/characters-list.test.tsx`**

Add inside the existing `describe("CharactersList", ...)` block (the file already has `installFetchMock`, `renderWithQueryClient`, `makeCharacter`):

```tsx
it("opens the detail modal when a card is clicked", async () => {
  installFetchMock()
  renderWithQueryClient(<PageNavigationHarness />)

  await screen.findByText("Character 1-1", undefined, { timeout: 3000 })
  await waitUntilVisible("Character 1-1")

  const title = screen
    .getAllByText("Character 1-1")
    .find((el) => el.getAttribute("data-slot") === "card-title")
  expect(title).toBeDefined()

  const card = title!.closest('button[data-slot="character-card-button"]')
  expect(card).not.toBeNull()

  act(() => {
    card!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })

  await screen.findByRole("dialog")
  expect(screen.getByText(/Details for Character 1-1/i)).not.toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/characters-list.test.tsx`
Expected: FAIL — no `button[data-slot="character-card-button"]` found (card is not yet a button)

- [ ] **Step 3: Modify `src/components/character-card.tsx`**

Add the `onSelect` prop and render the card as a button when present:

```tsx
import { motion, useReducedMotion } from "motion/react"

import { StatusPill } from "@/components/status-pill"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Character } from "@/types"

export interface CharacterCardProps {
  character: Character
  onSelect?: (character: Character) => void
}

export function CharacterCard({
  character,
  onSelect,
}: CharacterCardProps) {
  const reducedMotion = useReducedMotion()

  const card = (
    <Card className="card-hover card-glow group/card h-full overflow-hidden">
      <img
        src={character.image}
        alt={`${character.name} portrait`}
        loading="lazy"
        className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.03]"
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl leading-none font-extrabold tracking-wide italic uppercase line-clamp-1">
            {character.name}
          </CardTitle>
          <StatusPill status={character.status} className="shrink-0" />
        </div>
        <CardDescription className="text-xs tracking-widest uppercase">
          {character.species} · {character.gender}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <p className="line-clamp-1">
          <span className="font-medium text-foreground">
            Last known location:
          </span>{" "}
          {character.location.name}
        </p>
        <p className="line-clamp-1">
          <span className="font-medium text-foreground">Origin:</span>{" "}
          {character.origin.name}
        </p>
      </CardContent>
    </Card>
  )

  return (
    <motion.div
      whileHover={
        reducedMotion ? undefined : { rotate: 1, scale: 1.02, y: -2 }
      }
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="h-full"
    >
      {onSelect ? (
        <button
          type="button"
          data-slot="character-card-button"
          onClick={() => onSelect(character)}
          aria-haspopup="dialog"
          className="block h-full w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {card}
        </button>
      ) : (
        card
      )}
    </motion.div>
  )
}
```

- [ ] **Step 4: Modify `src/components/characters-list.tsx`**

At the top add state and import the modal:

```tsx
import { CharacterDetailModal } from "@/components/character-detail-modal"
import type { Character } from "@/types"
```

Inside the component, next to the existing `inputPage` state:

```tsx
const [selectedCharacter, setSelectedCharacter] =
  useState<Character | null>(null)
```

Pass `onSelect` to the card:

```tsx
<CharacterCard character={character} onSelect={setSelectedCharacter} />
```

Render the modal at the end of the section, after the pagination div:

```tsx
<CharacterDetailModal
  key={selectedCharacter?.id}
  character={selectedCharacter}
  open={selectedCharacter !== null}
  onOpenChange={(open) => {
    if (!open) setSelectedCharacter(null)
  }}
/>
```

- [ ] **Step 5: Run the list tests to verify they pass**

Run: `npm test -- src/components/characters-list.test.tsx`
Expected: PASS (3 tests — 2 existing + the new card-click test)

- [ ] **Step 6: Commit**

```bash
git add src/components/character-card.tsx src/components/characters-list.tsx src/components/characters-list.test.tsx
git commit -m "feat: open character detail modal on card click"
```

---

### Task 6: Full verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — `useCharacters.test.ts` (2), `useCharacterDetails.test.ts` (9), `character-detail-modal.test.tsx` (4), `characters-list.test.tsx` (3)

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: PASS — no oxlint warnings

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: PASS — tsc and vite build succeed

- [ ] **Step 4: Manual checklist**

Run: `npm run dev` and verify:
- [ ] Clicking a card opens the modal; metadata renders immediately
- [ ] Origin/location dimension + type load in; "Unknown" fallback for URL-less locations
- [ ] Episodes list is sorted by code with title + air date; skeleton while loading
- [ ] Long episode lists scroll within the modal; page behind is scroll-locked
- [ ] Esc closes; close button (labeled) closes; click-outside closes
- [ ] Focus lands inside the modal and returns to the card on close
- [ ] Keyboard: Tab to a card, Enter/Space opens
- [ ] `prefers-reduced-motion`: no modal animation; card hover transform reduced

- [ ] **Step 5: Commit any manual-checklist fixes**

Only if fixes were needed; never an empty commit.