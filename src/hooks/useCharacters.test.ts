import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchCharactersPage } from "@/hooks/useCharacters"

const emptyInfo = { count: 0, pages: 0, next: null, prev: null }

const mockFetchResponse = (status: number, statusText: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
  }) as Response

afterEach(() => {
  vi.restoreAllMocks()
})

describe("fetchCharactersPage", () => {
  it("returns an empty result when the API returns 404 for zero matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(404, "Not Found")
    )

    const result = await fetchCharactersPage({ name: "no-such-name" })

    expect(result).toEqual({ info: emptyInfo, results: [] })
  })

  it("still throws for other non-2xx statuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(500, "Internal Server Error")
    )

    await expect(fetchCharactersPage({ name: "rick" })).rejects.toThrow(
      "Failed to fetch characters: 500 Internal Server Error"
    )
  })
})