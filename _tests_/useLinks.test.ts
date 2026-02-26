/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { invoke } from "@tauri-apps/api/core"
import { useLinks } from "../src/hooks/useLinks"
import { type LinkItem } from "../src/types/link"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

const invokeMock = vi.mocked(invoke)

describe("useLinks", () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it("adds a link and updates state", async (): Promise<void> => {
    const added: LinkItem[] = [{ id: "a", name: "Docs", url: "https://example.com" }]

    invokeMock.mockImplementation(async (command) => {
      if (command === "list_links") {
        return []
      }
      if (command === "add_link") {
        return added
      }
      return []
    })

    const { result } = renderHook(() => useLinks())

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("list_links")
    })

    await act(async () => {
      await result.current.addLink("Docs", "example.com")
    })

    expect(invokeMock).toHaveBeenCalledWith("add_link", {
      name: "Docs",
      url: "https://example.com",
    })
    expect(result.current.links).toEqual(added)
  })

  it("edits a link and clears edit state", async (): Promise<void> => {
    const initial: LinkItem[] = [{ id: "a", name: "Docs", url: "https://example.com" }]
    const updated: LinkItem[] = [{ id: "a", name: "Docs v2", url: "https://example.org" }]

    invokeMock.mockImplementation(async (command) => {
      if (command === "list_links") {
        return initial
      }
      if (command === "update_link") {
        return updated
      }
      return []
    })

    const { result } = renderHook(() => useLinks())

    await waitFor(() => {
      expect(result.current.links).toEqual(initial)
    })

    await act(async () => {
      await result.current.editLink(initial[0])
    })

    expect(result.current.editState).toEqual({
      id: "a",
      name: "Docs",
      url: "https://example.com",
    })

    act(() => {
      result.current.setEditState((current) =>
        current
          ? {
              ...current,
              name: "Docs v2",
              url: "example.org",
            }
          : current,
      )
    })

    await act(async () => {
      await result.current.editLink(initial[0])
    })

    expect(invokeMock).toHaveBeenCalledWith("update_link", {
      id: "a",
      name: "Docs v2",
      url: "https://example.org",
    })
    expect(result.current.links).toEqual(updated)
    expect(result.current.editState).toBeNull()
  })

  it("deletes a link and updates state", async (): Promise<void> => {
    const initial: LinkItem[] = [
      { id: "a", name: "Docs", url: "https://example.com" },
      { id: "b", name: "Site", url: "https://example.org" },
    ]
    const afterDelete: LinkItem[] = [{ id: "b", name: "Site", url: "https://example.org" }]

    invokeMock.mockImplementation(async (command) => {
      if (command === "list_links") {
        return initial
      }
      if (command === "delete_link") {
        return afterDelete
      }
      return []
    })

    const { result } = renderHook(() => useLinks())

    await waitFor(() => {
      expect(result.current.links).toEqual(initial)
    })

    await act(async () => {
      await result.current.deleteLink("a")
    })

    expect(invokeMock).toHaveBeenCalledWith("delete_link", { id: "a" })
    expect(result.current.links).toEqual(afterDelete)
  })
})
