import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { CharacterFilterForm } from "@/components/character-filter-form"
import { CharactersList } from "@/components/characters-list"
import { PortalBackground } from "@/components/portal-background"
import {
  defaultCharacterFilter,
  type CharacterFilterValues,
} from "@/lib/validations"

function PortalRing() {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden
      className="size-16 shrink-0 rounded-full border-2 border-primary/50 shadow-[0_0_20px_var(--primary-glow)]"
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, transparent 285deg, var(--color-primary) 345deg, transparent 360deg)",
      }}
      animate={{ rotate: reducedMotion ? 0 : 360 }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 20, repeat: Infinity, ease: "linear" }
      }
    />
  )
}

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
      <PortalBackground />

      <header className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <PortalRing />
          <h1 className="font-heading text-5xl leading-none font-extrabold tracking-tight text-foreground italic uppercase md:text-7xl">
            Rick &amp; Morty
            <span className="block text-primary">Explorer</span>
          </h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">
          Browse characters from across the multiverse using the Rick and Morty
          API.
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