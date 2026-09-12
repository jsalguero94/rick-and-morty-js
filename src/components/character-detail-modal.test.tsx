// @vitest-environment happy-dom
import {
  cleanup,
  render,
  screen,
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
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input: RequestInfo | URL) => {
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
    expect(await screen.findByText(/Dimension C-137/)).not.toBeNull()
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