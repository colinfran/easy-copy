import { describe, expect, it } from "vitest"
import { isValidUrl, normalizeUrl } from "../src/utils/url"

describe("url utils", () => {
  it("adds https when protocol is missing", (): void => {
    expect(normalizeUrl("example.com")).toBe("https://example.com")
  })

  it("preserves existing protocol", (): void => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com")
    expect(normalizeUrl("http://example.com")).toBe("http://example.com")
  })

  it("validates URL strings", (): void => {
    expect(isValidUrl("https://example.com")).toBe(true)
    expect(isValidUrl("not-a-url")).toBe(false)
  })
})
