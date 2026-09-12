// @vitest-environment happy-dom
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CharactersList } from "@/components/characters-list"
import type { CharacterFilterValues } from "@/lib/validations"
import type { Character } from "@/types"

const emptyFilters = {} as CharacterFilterValues

function makeCharacter(id: number, name: string): Character {
  return {
    id,
    name,
    status: "Alive",
    species: "Human",
    type: "",
    gender: "Male",
    origin: { name: "Earth (C-137)", url: "" },
    location: { name: "Earth (C-137)", url: "" },
    image: `https://example.com/${id}.png`,
    episode: [],
    url: `https://example.com/${id}`,
    created: "2017-11-04T18:48:46.250Z",
  }
}

function pageInfo(page: number) {
  return {
    count: 100,
    pages: 25,
    next: `https://example.com/?page=${page + 1}`,
    prev: page > 1 ? `https://example.com/?page=${page - 1}` : null,
  }
}

function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const query = new URL(String(input), "https://example.test")
        .searchParams
      const page = Number(query.get("page") ?? "1")
      const name = query.get("name")
      const idOffset = name ? 1000 : 0
      const results = Array.from({ length: 4 }, (_, i) =>
        makeCharacter(
          page * 10 + i + 1 + idOffset,
          name ? `${name} ${page}-${i}` : `Character ${page}-${i}`
        )
      )
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ info: pageInfo(page), results }),
      } as Response
    })
  )
}

/**
 * happy-dom has no IntersectionObserver. The grid no longer relies on it after
 * the whileInView → animate fix, but keeping it mocked with isIntersecting
 * preserves the "in view" assumption if the observer path regresses.
 */
class InViewportObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly scrollMargin = ""
  readonly thresholds = [0]
  private targets = new Set<Element>()
  private callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe(target: Element) {
    this.targets.add(target)
    setTimeout(() => {
      this.callback(
        [
          {
            isIntersecting: true,
            target,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        this
      )
    }, 0)
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
  disconnect() {
    this.targets.clear()
  }
  takeRecords() {
    return []
  }
}

/**
 * Whether the grid-item wrapper for the card titled `name` is visible.
 * The visible contract lives on the motion.div's inline opacity, so reading
 * the rendered style attribute is behavior, not implementation.
 */
function getItemOpacity(name: string): string {
  const title = screen
    .getAllByText(name)
    .find((el) => el.getAttribute("data-slot") === "card-title")
  if (!title) return "missing"
  let node: HTMLElement | null = title
  while (node) {
    const match = (node.getAttribute("style") || "").match(
      /opacity\s*:\s*([^;]+)/
    )
    if (match) return match[1].trim()
    node = node.parentElement
  }
  return "no-inline-opacity"
}

async function waitUntilVisible(name: string) {
  await waitFor(
    () => expect(getItemOpacity(name)).toBe("1"),
    { timeout: 4000 }
  )
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderWithQueryClient(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>
  )
}

function PageNavigationHarness() {
  const [page, setPage] = useState(1)
  return (
    <CharactersList filters={emptyFilters} page={page} onPageChange={setPage} />
  )
}

function SearchHarness() {
  const [filters, setFilters] = useState<CharacterFilterValues>(emptyFilters)
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          setFilters({ name: "rick", status: undefined, gender: undefined })
        }
      >
        apply search
      </button>
      <CharactersList filters={filters} page={1} onPageChange={() => {}} />
    </div>
  )
}

describe("CharactersList", () => {
  beforeAll(() => {
    vi.stubGlobal("IntersectionObserver", InViewportObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("keeps new page results visible after clicking Next", async () => {
    installFetchMock()
    renderWithQueryClient(<PageNavigationHarness />)

    await screen.findByText("Character 1-1", undefined, { timeout: 3000 })
    await waitUntilVisible("Character 1-1")

    act(() => {
      screen.getByRole("button", { name: "Next page" }).click()
    })

    await screen.findByText("Character 2-1", undefined, { timeout: 3000 })
    await waitUntilVisible("Character 2-1")
  })

  it("keeps search results visible after applying a name filter", async () => {
    installFetchMock()
    renderWithQueryClient(<SearchHarness />)

    await screen.findByText("Character 1-1", undefined, { timeout: 3000 })
    await waitUntilVisible("Character 1-1")

    act(() => {
      screen.getByRole("button", { name: "apply search" }).click()
    })

    await screen.findByText("rick 1-1", undefined, { timeout: 3000 })
    await waitUntilVisible("rick 1-1")
  })
})