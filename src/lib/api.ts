import type {
  ApiResponse,
  Character,
  CharacterFilter,
  Info,
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