import { app, BrowserWindow, Tray, ipcMain, Menu, clipboard, nativeImage } from "electron"
import path from "path"
import fs from "fs/promises"
import { addLinkItem, deleteLinkItem, type LinkItem, updateLinkItem } from "./utils/links"

const LINKS_FILE = "links.json"

let tray: Tray
let window: BrowserWindow | null = null

const createTrayIcon = (): Electron.NativeImage => {
  const iconPath = path.join(__dirname, "assets", "icon.png")
  const icon = nativeImage.createFromPath(iconPath)
  const resizedIcon = icon.resize({ height: 18, width: 18 })
  resizedIcon.setTemplateImage(true)
  return resizedIcon
}

const linksPath = (): string => path.join(app.getPath("userData"), LINKS_FILE)

const loadLinks = async (): Promise<LinkItem[]> => {
  try {
    const raw = await fs.readFile(linksPath(), "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LinkItem[]) : []
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }

    throw error
  }
}

const saveLinks = async (links: LinkItem[]): Promise<void> => {
  await fs.writeFile(linksPath(), JSON.stringify(links, null, 2), "utf8")
}

const buildTrayMenu = (links: LinkItem[] = []): void => {
  const items: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Add/Edit Links",
      click: (): void => openWindow(),
    },
    { type: "separator" },
  ]

  if (links.length === 0) {
    items.push({
      label: "No links yet",
      enabled: false,
    })
  } else {
    const quickItems = links.slice(0, 8).map((link) => ({
      label: `${link.name}`,
      click: (): void => clipboard.writeText(link.url),
    }))

    items.push(...quickItems)
  }

  items.push(
    { type: "separator" },
    {
      label: "Quit EasyCopy",
      role: "quit",
    },
  )

  tray.setContextMenu(Menu.buildFromTemplate(items))
}

const createWindow = (): void => {
  window = new BrowserWindow({
    width: 420,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  void window.loadFile(path.join(__dirname, "renderer", "index.html"))

  window.on("blur", () => {
    if (window?.isVisible()) {
      window.hide()
    }
  })
}

const openWindow = (): void => {
  if (!window) {
    return
  }

  if (!window.isVisible()) {
    const trayBounds = tray.getBounds()
    const windowBounds = window.getBounds()
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
    const y = Math.round(trayBounds.y + trayBounds.height + 6)

    window.setPosition(x, y, false)
    window.show()
  }

  window.focus()
}

const createTray = (): void => {
  tray = new Tray(createTrayIcon())
  tray.setToolTip("EasyCopy")
  tray.on("click", () => {
    if (window?.isVisible()) {
      window.hide()
    }
  })
}

void app.whenReady().then(async () => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.hide()
  }

  createTray()
  createWindow()

  const links = await loadLinks()
  buildTrayMenu(links)
})

app.on("window-all-closed", () => {})

ipcMain.handle("links:list", async () => loadLinks())

ipcMain.handle("links:add", async (_event, payload: { name: string; url: string }) => {
  const links = await loadLinks()
  const next = addLinkItem(links, payload)
  await saveLinks(next)
  buildTrayMenu(next)
  return next
})

ipcMain.handle("links:delete", async (_event, id: string) => {
  const links = await loadLinks()
  const filtered = deleteLinkItem(links, id)
  await saveLinks(filtered)
  buildTrayMenu(filtered)
  return filtered
})

ipcMain.handle("links:update", async (_event, payload: { id: string; name: string; url: string }) => {
  const links = await loadLinks()
  const next = updateLinkItem(links, payload)

  await saveLinks(next)
  buildTrayMenu(next)
  return next
})

ipcMain.handle("links:reorder", async (_event, orderedIds: string[]) => {
  const links = await loadLinks()
  const byId = new Map(links.map((item) => [item.id, item]))

  const reordered: LinkItem[] = []
  for (const id of orderedIds) {
    const item = byId.get(id)
    if (item) {
      reordered.push(item)
      byId.delete(id)
    }
  }

  // Keep any unknown/missing items at the end to avoid accidental data loss.
  reordered.push(...Array.from(byId.values()))

  await saveLinks(reordered)
  buildTrayMenu(reordered)
  return reordered
})

ipcMain.handle("clipboard:copy", async (_event, value: string) => {
  clipboard.writeText(value || "")
  return true
})
