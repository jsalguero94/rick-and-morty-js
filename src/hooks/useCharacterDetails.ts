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
  episodesPending: boolean
  episodesError: Error | null
  locationsPending: boolean
  locationsError: Error | null
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
    episodesPending: episodeIds.length > 0 && episodesQuery.isPending,
    episodesError: episodeIds.length > 0 ? episodesQuery.error : null,
    locationsPending: locationIds.length > 0 && locationsQuery.isPending,
    locationsError: locationIds.length > 0 ? locationsQuery.error : null,
  }
}