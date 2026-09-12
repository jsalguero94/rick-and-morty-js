import { motion, useReducedMotion } from "motion/react"

import { StatusPill } from "@/components/status-pill"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Character } from "@/types"

export interface CharacterCardProps {
  character: Character
  onSelect?: (character: Character) => void
}

export function CharacterCard({
  character,
  onSelect,
}: CharacterCardProps) {
  const reducedMotion = useReducedMotion()

  const card = (
    <Card className="card-hover card-glow group/card h-full overflow-hidden">
      <img
        src={character.image}
        alt={`${character.name} portrait`}
        loading="lazy"
        className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.03]"
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl leading-none font-extrabold tracking-wide italic uppercase line-clamp-1">
            {character.name}
          </CardTitle>
          <StatusPill status={character.status} className="shrink-0" />
        </div>
        <CardDescription className="text-xs tracking-widest uppercase">
          {character.species} · {character.gender}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <p className="line-clamp-1">
          <span className="font-medium text-foreground">
            Last known location:
          </span>{" "}
          {character.location.name}
        </p>
        <p className="line-clamp-1">
          <span className="font-medium text-foreground">Origin:</span>{" "}
          {character.origin.name}
        </p>
      </CardContent>
    </Card>
  )

  return (
    <motion.div
      whileHover={
        reducedMotion ? undefined : { rotate: 1, scale: 1.02, y: -2 }
      }
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="h-full"
    >
      {onSelect ? (
        <button
          type="button"
          data-slot="character-card-button"
          onClick={() => onSelect(character)}
          aria-haspopup="dialog"
          className="block h-full w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {card}
        </button>
      ) : (
        card
      )}
    </motion.div>
  )
}