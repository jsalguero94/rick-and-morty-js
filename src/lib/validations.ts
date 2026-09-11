import { z } from "zod"

import type {
  CharacterGenderFilter,
  CharacterStatusFilter,
} from "@/types"

export const statusOptions = [
  { value: "alive", label: "Alive" },
  { value: "dead", label: "Dead" },
  { value: "unknown", label: "Unknown" },
] as const satisfies readonly { value: CharacterStatusFilter; label: string }[]

export const genderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "genderless", label: "Genderless" },
  { value: "unknown", label: "Unknown" },
] as const satisfies readonly { value: CharacterGenderFilter; label: string }[]

const statusValues = statusOptions.map(({ value }) => value)
const genderValues = genderOptions.map(({ value }) => value)

export const characterFilterSchema = z.object({
  name: z
    .string()
    .trim()
    .max(64, "Name must be 64 characters or fewer")
    .optional(),
  status: z.enum(statusValues).optional(),
  gender: z.enum(genderValues).optional(),
})

export type CharacterFilterValues = z.infer<typeof characterFilterSchema>

export const defaultCharacterFilter: CharacterFilterValues = {
  name: "",
  status: undefined,
  gender: undefined,
}