import { describe, expect, it } from "vitest"
import { validate as uuidValidate } from "uuid"
import { addLinkItem, deleteLinkItem, type LinkItem, updateLinkItem } from "../src/utils/links"

const sample: LinkItem[] = [
  { id: "a", name: "One", url: "https://one.test" },
  { id: "b", name: "Two", url: "https://two.test" },
]

describe("link operations", () => {
  it("adds a link at the beginning", (): void => {
    const next = addLinkItem(sample, { name: "Three", url: "https://three.test" }, () => "c")

    expect(next).toEqual([
      { id: "c", name: "Three", url: "https://three.test" },
      { id: "a", name: "One", url: "https://one.test" },
      { id: "b", name: "Two", url: "https://two.test" },
    ])
  })

  it("generates a valid uuid by default when adding", (): void => {
    const next = addLinkItem([], { name: "One", url: "https://one.test" })
    expect(next).toHaveLength(1)
    expect(uuidValidate(next[0].id)).toBe(true)
  })

  it("updates only the matching link", (): void => {
    const next = updateLinkItem(sample, {
      id: "b",
      name: "Updated Two",
      url: "https://updated-two.test",
    })

    expect(next).toEqual([
      { id: "a", name: "One", url: "https://one.test" },
      { id: "b", name: "Updated Two", url: "https://updated-two.test" },
    ])
  })

  it("returns unchanged data when update id does not exist", (): void => {
    const next = updateLinkItem(sample, {
      id: "z",
      name: "Nope",
      url: "https://nope.test",
    })

    expect(next).toEqual(sample)
  })

  it("deletes the matching link", (): void => {
    const next = deleteLinkItem(sample, "a")

    expect(next).toEqual([{ id: "b", name: "Two", url: "https://two.test" }])
  })

  it("returns unchanged data when delete id does not exist", (): void => {
    const next = deleteLinkItem(sample, "z")

    expect(next).toEqual(sample)
  })
})
