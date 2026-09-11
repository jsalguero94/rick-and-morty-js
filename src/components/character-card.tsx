import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Character, CharacterStatus } from "@/types"

const statusVariant = (
  status: CharacterStatus
): "default" | "destructive" | "secondary" => {
  switch (status) {
    case "Alive":
      return "default"
    case "Dead":
      return "destructive"
    default:
      return "secondary"
  }
}

export function CharacterCard({ character }: { character: Character }) {
  return (
    <Card className="overflow-hidden">
      <img
        src={character.image}
        alt={`${character.name} portrait`}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{character.name}</CardTitle>
          <Badge variant={statusVariant(character.status)}>
            {character.status}
          </Badge>
        </div>
        <CardDescription>
          {character.species} · {character.gender}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-muted-foreground">
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
}