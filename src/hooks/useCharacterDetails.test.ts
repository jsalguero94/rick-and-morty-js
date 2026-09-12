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

  it("normalizes a single-object response into an array", async () => {
    const episode = makeEpisode(28, "The Ricklantis Mixup", "S03E07")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, "OK", episode)
    )

    const result = await fetchEpisodesByIds([28])

    expect(result).toEqual([episode])
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

  it("normalizes a single-object response into an array", async () => {
    const location = makeLocation(1, "Earth (C-137)")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, "OK", location)
    )

    const result = await fetchLocationsByIds([1])

    expect(result).toEqual([location])
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