import { StatusPill } from "@/components/status-pill"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCharacterDetails } from "@/hooks/useCharacterDetails"
import type { Character, Episode, Location } from "@/types"

export interface CharacterDetailModalProps {
  character: Character | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CharacterDetailDialogProps {
  character: Character
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        data-slot="meta-value"
        className="font-medium text-foreground"
      >
        {value}
      </dd>
    </div>
  )
}

function LocationRow({
  title,
  name,
  detail,
}: {
  title: string
  name: string
  detail: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">
        {title}
      </dt>
      <dd className="font-medium text-foreground">{name}</dd>
      <dd className="text-sm text-muted-foreground">{detail}</dd>
    </div>
  )
}

function EpisodeRow({ episode }: { episode: Episode }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-primary">{episode.episode}</span>
      <span className="flex-1 text-foreground">{episode.name}</span>
      <span className="text-muted-foreground">{episode.air_date}</span>
    </li>
  )
}

function CharacterDetailDialog({
  character,
  open,
  onOpenChange,
}: CharacterDetailDialogProps) {
  const { episodes, origin, location, episodesPending, episodesError } =
    useCharacterDetails(character)

  const locationDetail = (
    resource: Location | undefined,
    fallbackName: string
  ) =>
    resource
      ? {
          name: resource.name,
          detail: [resource.type, resource.dimension]
            .filter(Boolean)
            .join(" · ") || "Unknown",
        }
      : { name: fallbackName, detail: "Unknown" }

  const originInfo = locationDetail(origin, character.origin.name)
  const locationInfo = locationDetail(location, character.location.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">
          Details for {character.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Origin, current location, and episode appearances for{" "}
          {character.name}.
        </DialogDescription>
        <div className="flex items-start gap-4">
          <img
            src={character.image}
            alt={`${character.name} portrait`}
            className="size-24 shrink-0 rounded-lg object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-heading text-3xl leading-none font-extrabold tracking-wide italic uppercase">
              {character.name}
            </h2>
            <StatusPill status={character.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <MetaRow label="Species" value={character.species} />
          <MetaRow
            label="Type"
            value={character.type || "Unknown"}
          />
          <MetaRow label="Gender" value={character.gender} />
          <MetaRow
            label="Created"
            value={new Date(character.created).toLocaleDateString()}
          />
          <MetaRow
            label="Episodes"
            value={String(
              episodes?.length ?? character.episode.length
            )}
          />
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <LocationRow
            title="Origin"
            name={originInfo.name}
            detail={originInfo.detail}
          />
          <LocationRow
            title="Last known location"
            name={locationInfo.name}
            detail={locationInfo.detail}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs tracking-widest text-muted-foreground uppercase">
            Episodes
          </h3>
          {episodesPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          ) : episodesError ? (
            <p className="text-sm text-destructive">
              Failed to load episodes.
            </p>
          ) : episodes && episodes.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {episodes.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No known episodes.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CharacterDetailModal({
  character,
  open,
  onOpenChange,
}: CharacterDetailModalProps) {
  if (!character) return null

  return (
    <CharacterDetailDialog
      key={character.id}
      character={character}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}