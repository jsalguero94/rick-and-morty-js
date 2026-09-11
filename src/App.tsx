import { useState } from "react"

import { CharacterFilterForm } from "@/components/character-filter-form"
import { CharactersList } from "@/components/characters-list"
import {
  defaultCharacterFilter,
  type CharacterFilterValues,
} from "@/lib/validations"

export default function App() {
  const [filters, setFilters] = useState<CharacterFilterValues>(
    defaultCharacterFilter
  )
  const [page, setPage] = useState(1)

  const applyFilters = (values: CharacterFilterValues) => {
    setFilters(values)
    setPage(1)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Rick &amp; Morty Explorer
        </h1>
        <p className="text-muted-foreground">
          Browse characters from the multiverse using the Rick and Morty API.
        </p>
      </header>

      <main className="flex flex-col gap-8">
        <CharacterFilterForm onSubmit={applyFilters} />
        <CharactersList
          filters={filters}
          page={page}
          onPageChange={setPage}
        />
      </main>
    </div>
  )
}