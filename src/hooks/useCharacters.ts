import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { CharacterFilter } from "rickmortyapi"

import { getCharactersPage } from "@/lib/api"
import type { Character, PaginatedResult } from "@/types"

export interface UseCharactersOptions {
  page?: number
  name?: string
  status?: CharacterFilter["status"]
  gender?: CharacterFilter["gender"]
}

const getErrorMessage = (response: {
  status: number
  statusMessage: string
}) => `Failed to fetch characters: ${response.status} ${response.statusMessage}`

export async function fetchCharactersPage(
  options: UseCharactersOptions = {}
): Promise<PaginatedResult<Character>> {
  const { page = 1, name, status, gender } = options

  const response = await getCharactersPage({
    page,
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(gender ? { gender } : {}),
  })

  if (response.status === 404) {
    return { info: { count: 0, pages: 0, next: null, prev: null }, results: [] }
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(getErrorMessage(response))
  }

  const { info, results } = response.data

  if (!results) {
    throw new Error(getErrorMessage({ status: 200, statusMessage: "Malformed response: missing results" }))
  }

  return {
    info: info ?? { count: 0, pages: 0, next: null, prev: null },
    results,
  }
}

export function useCharacters(options: UseCharactersOptions = {}) {
  const { page = 1, name, status, gender } = options

  return useQuery({
    queryKey: ["characters", { page, name, status, gender }],
    queryFn: () => fetchCharactersPage({ page, name, status, gender }),
    placeholderData: keepPreviousData,
  })
}