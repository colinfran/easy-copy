import { v4 as uuidv4 } from "uuid"

export type LinkItem = {
  id: string
  name: string
  url: string
}

type NewLinkInput = {
  name: string
  url: string
}

type UpdateLinkInput = {
  id: string
  name: string
  url: string
}

export const addLinkItem = (
  links: LinkItem[],
  payload: NewLinkInput,
  createId: () => string = uuidv4,
): LinkItem[] => {
  const next: LinkItem = {
    id: createId(),
    name: payload.name,
    url: payload.url,
  }

  return [next, ...links]
}

export const updateLinkItem = (links: LinkItem[], payload: UpdateLinkInput): LinkItem[] =>
  links.map((item) => {
    if (item.id !== payload.id) {
      return item
    }

    return {
      ...item,
      name: payload.name,
      url: payload.url,
    }
  })

export const deleteLinkItem = (links: LinkItem[], id: string): LinkItem[] =>
  links.filter((item) => item.id !== id)
