import { ChevronLeft, ChevronRight } from "lucide-react"

import { CharacterCard } from "@/components/character-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCharacters } from "@/hooks/useCharacters"
import type { CharacterFilterValues } from "@/lib/validations"

export interface CharactersListProps {
  filters: CharacterFilterValues
  page: number
  onPageChange: (page: number) => void
}

export function CharactersList({
  filters,
  page,
  onPageChange,
}: CharactersListProps) {
  const {
    data,
    isPending,
    isError,
    error,
  } = useCharacters({
    page,
    name: filters.name,
    status: filters.status,
    gender: filters.gender,
  })

  if (isError) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">Failed to load characters.</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </section>
    )
  }

  const totalPages = data?.info.pages ?? 0
  const hasCharacters = (data?.results.length ?? 0) > 0

  return (
    <section className="flex flex-col gap-6">
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : hasCharacters ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.results.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No characters match your filters.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </section>
  )
}