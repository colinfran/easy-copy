import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { type EditState, type LinkItem } from "../types/link"
import { moveItemByIndex } from "../utils/reorder"
import { isValidUrl, normalizeUrl } from "../utils/url"

type UseLinksResult = {
  links: LinkItem[]
  hasLinks: boolean
  editState: EditState | null
  error: string
  addLink: (name: string, url: string) => Promise<void>
  editLink: (item: LinkItem) => Promise<void>
  moveLink: (dragIndex: number, hoverIndex: number) => void
  persistOrder: () => Promise<void>
  deleteLink: (id: string) => Promise<void>
  setEditState: Dispatch<SetStateAction<EditState | null>>
  clearError: () => void
}

export const useLinks = (): UseLinksResult => {
  const [links, setLinks] = useState<LinkItem[]>([])
  const linksRef = useRef<LinkItem[]>([])
  const [editState, setEditState] = useState<EditState | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    linksRef.current = links
  }, [links])

  useEffect(() => {
    let isMounted = true

    window.easyCopy.listLinks().then((items) => {
      if (isMounted) {
        setLinks(items)
      }
    })

    return (): void => {
      isMounted = false
    }
  }, [])

  const hasLinks = useMemo((): boolean => links.length > 0, [links])

  const clearError = (): void => {
    setError("")
  }

  const addLink = async (name: string, url: string): Promise<void> => {
    clearError()

    const trimmedName = name.trim()
    const trimmedUrl = url.trim()

    if (!trimmedName || !trimmedUrl) {
      return
    }

    const normalizedUrl = normalizeUrl(trimmedUrl)

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL.")
      return
    }

    const next = await window.easyCopy.addLink({
      name: trimmedName,
      url: normalizedUrl,
    })

    setLinks(next)
  }

  const editLink = async (item: LinkItem): Promise<void> => {
    clearError()

    if (!editState || editState.id !== item.id) {
      setEditState({
        id: item.id,
        name: item.name,
        url: item.url,
      })
      return
    }

    const trimmedName = editState.name.trim()
    const trimmedUrl = editState.url.trim()

    if (!trimmedName || !trimmedUrl) {
      setError("Name and URL are required for edits.")
      return
    }

    const normalizedUrl = normalizeUrl(trimmedUrl)

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL.")
      return
    }

    const next = await window.easyCopy.updateLink({
      id: item.id,
      name: trimmedName,
      url: normalizedUrl,
    })

    setLinks(next)
    setEditState(null)
  }

  const moveLink = (dragIndex: number, hoverIndex: number): void => {
    setLinks((current) => {
      const reordered = moveItemByIndex(current, dragIndex, hoverIndex)
      linksRef.current = reordered
      return reordered
    })
  }

  const persistOrder = async (): Promise<void> => {
    const orderedIds = linksRef.current.map((item) => item.id)
    const next = await window.easyCopy.reorderLinks(orderedIds)
    setLinks(next)
  }

  const deleteLink = async (id: string): Promise<void> => {
    const next = await window.easyCopy.deleteLink(id)
    setLinks(next)

    if (editState?.id === id) {
      setEditState(null)
    }
  }

  return {
    links,
    hasLinks,
    editState,
    error,
    addLink,
    editLink,
    moveLink,
    persistOrder,
    deleteLink,
    setEditState,
    clearError,
  }
}
