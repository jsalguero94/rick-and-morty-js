import type {
  ApiResponse,
  Character,
  CharacterFilter,
  Episode,
  Info,
  Location,
} from "rickmortyapi"

const API_BASE_URL = "https://rickandmortyapi.com/api"

export type CharacterPageResponse = ApiResponse<Info<Character[]>>

/**
 * Fetches a paginated page of characters from the Rick and Morty API.
 *
 * This mirrors the `getCharacters` contract of the `rickmortyapi` package and
 * returns the same `ApiResponse` shape, but builds the request URL with a
 * single trailing slash. Published versions of `rickmortyapi` construct
 * `character//?…` (double slash) for object queries, which the live API
 * answers with 404; keeping the request here lets the hook stay free of that
 * defect while remaining typed against the SDK's own `CharacterFilter`,
 * `Info`, and `ApiResponse` types.
 */
export async function getCharactersPage(
  filters: CharacterFilter = {}
): Promise<CharacterPageResponse> {
  const query = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)] as [string, string])
  ).toString()

  const response = await fetch(
    `${API_BASE_URL}/character${query ? `/?${query}` : ""}`
  )

  if (!response.ok) {
    return {
      status: response.status,
      statusMessage: response.statusText,
      data: {},
    }
  }

  const data: Info<Character[]> = await response.json()

  return {
    status: response.status,
    statusMessage: response.statusText,
    data,
  }
}

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

  const episodeData = await response.json()
  const data: Episode[] = Array.isArray(episodeData) ? episodeData : [episodeData]

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

  const locationData = await response.json()
  const data: Location[] = Array.isArray(locationData) ? locationData : [locationData]

  return {
    status: response.status,
    statusMessage: response.statusText,
    data,
  }
}