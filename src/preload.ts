import { contextBridge, ipcRenderer } from "electron"

type LinkItem = {
  id: string
  name: string
  url: string
}

contextBridge.exposeInMainWorld("easyCopy", {
  listLinks: (): Promise<LinkItem[]> => ipcRenderer.invoke("links:list"),
  addLink: (payload: Omit<LinkItem, "id">): Promise<LinkItem[]> => ipcRenderer.invoke("links:add", payload),
  updateLink: (payload: LinkItem): Promise<LinkItem[]> => ipcRenderer.invoke("links:update", payload),
  reorderLinks: (orderedIds: string[]): Promise<LinkItem[]> => ipcRenderer.invoke("links:reorder", orderedIds),
  deleteLink: (id: string): Promise<LinkItem[]> => ipcRenderer.invoke("links:delete", id),
})
