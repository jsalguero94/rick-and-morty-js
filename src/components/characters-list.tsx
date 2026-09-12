import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { CharacterCard } from "@/components/character-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useCharacters } from "@/hooks/useCharacters"
import type { CharacterFilterValues } from "@/lib/validations"

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

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
  const reducedMotion = useReducedMotion()
  const [inputPage, setInputPage] = useState(String(page))

  useEffect(() => {
    setInputPage(String(page))
  }, [page])

  if (isError) {
    return (
      <section className="glass-panel flex flex-col items-center gap-2 rounded-xl p-8 text-center">
        <p className="font-medium text-destructive">
          Failed to load characters.
        </p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </section>
    )
  }

  const totalPages = data?.info.pages ?? 0
  const hasCharacters = (data?.results.length ?? 0) > 0

  const jumpToPage = () => {
    const parsed = Number.parseInt(inputPage, 10)
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed)
    } else {
      setInputPage(String(page))
    }
  }

  return (
    <section className="flex flex-col gap-6">
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="glass-panel flex flex-col gap-3 rounded-xl p-4"
            >
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : hasCharacters ? (
        <motion.div
          variants={gridVariants}
          initial={reducedMotion ? false : "hidden"}
          animate={reducedMotion ? false : "show"}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {data.results.map((character) => (
            <motion.div
              key={character.id}
              variants={itemVariants}
              className="h-full"
            >
              <CharacterCard character={character} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <p className="glass-panel rounded-xl p-8 text-center text-muted-foreground">
          No characters match your filters.
        </p>
      )}

      {totalPages > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Page</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              aria-label="Jump to page"
              className="w-20 text-center"
              value={inputPage}
              onChange={(event) =>
                setInputPage(event.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  jumpToPage()
                }
              }}
              onBlur={jumpToPage}
            />
            <span>of {totalPages}</span>
          </div>

          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      )}
    </section>
  )
}