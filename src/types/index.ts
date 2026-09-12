export type { Character } from "rickmortyapi"
export type { Episode, Location } from "rickmortyapi"

import type { Character } from "rickmortyapi"

export type CharacterStatus = Character["status"]
export type CharacterGender = Character["gender"]

export type CharacterStatusFilter = "alive" | "dead" | "unknown"
export type CharacterGenderFilter =
  | "female"
  | "male"
  | "genderless"
  | "unknown"

export interface PaginationInfo {
  count: number
  pages: number
  next: string | null
  prev: string | null
}

export interface PaginatedResult<T> {
  info: PaginationInfo
  results: T[]
}