import { describe, expect, it } from "vitest"
import { moveItemByIndex } from "../src/utils/reorder"
import { type LinkItem } from "../src/types/link"

const sample: LinkItem[] = [
  { id: "a", name: "One", url: "https://one.test" },
  { id: "b", name: "Two", url: "https://two.test" },
  { id: "c", name: "Three", url: "https://three.test" },
]

describe("moveItemByIndex", () => {
  it("moves an item from higher index to lower index", (): void => {
    const next = moveItemByIndex(sample, 2, 0)
    expect(next.map((item) => item.id)).toEqual([sample[2].id, sample[0].id, sample[1].id])
  })

  it("moves an item from lower index to higher index", (): void => {
    const next = moveItemByIndex(sample, 0, 2)
    expect(next.map((item) => item.id)).toEqual([sample[1].id, sample[2].id, sample[0].id])
  })

  it("returns the same reference for invalid moves", (): void => {
    expect(moveItemByIndex(sample, 1, 1)).toBe(sample)
    expect(moveItemByIndex(sample, -1, 1)).toBe(sample)
    expect(moveItemByIndex(sample, 1, 5)).toBe(sample)
  })
})
