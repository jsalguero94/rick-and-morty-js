import type { CSSProperties } from "react"

import { cn } from "cn"

const STAR_COUNT = 140

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildStars() {
  const rand = mulberry32(20260911)
  const shadows: string[] = []
  for (let i = 0; i < STAR_COUNT; i += 1) {
    const x = Math.round(rand() * 980) / 10
    const y = Math.round(rand() * 980) / 10
    const alpha = Math.round((0.25 + rand() * 0.7) * 100) / 100
    shadows.push(`${x}vw ${y}vh 0 0 oklch(1 0 0 / ${alpha})`)
  }
  return shadows.join(", ")
}

const starShadows = buildStars()

export function PortalBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      <div
        className="starfield"
        style={{ "--star-shadows": starShadows } as CSSProperties}
      />
      <div className="portal-glow left-1/2 top-[-18vmin] translate-x-[-50%]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -12%, oklch(0.38 0.13 260 / 0.28), transparent 70%)",
        }}
      />
    </div>
  )
}