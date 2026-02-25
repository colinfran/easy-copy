type LinkItem = {
  id: string
  name: string
  url: string
}

type EasyCopyApi = {
  listLinks: () => Promise<LinkItem[]>
  addLink: (payload: Omit<LinkItem, "id">) => Promise<LinkItem[]>
  updateLink: (payload: LinkItem) => Promise<LinkItem[]>
  reorderLinks: (orderedIds: string[]) => Promise<LinkItem[]>
  deleteLink: (id: string) => Promise<LinkItem[]>
}

declare global {
  interface Window {
    easyCopy: EasyCopyApi
  }
}

export {}
