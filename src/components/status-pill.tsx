import { cn } from "cn"

import type { CharacterStatus } from "@/types"

const statusClass = (status: CharacterStatus) => {
  switch (status) {
    case "Alive":
      return "status-pill status-pill--alive"
    case "Dead":
      return "status-pill status-pill--dead"
    default:
      return "status-pill status-pill--unknown"
  }
}

export function StatusPill({
  status,
  className,
}: {
  status: CharacterStatus
  className?: string
}) {
  return (
    <span className={cn(statusClass(status), className)}>
      <span className="status-pill__dot" aria-hidden />
      {status}
    </span>
  )
}