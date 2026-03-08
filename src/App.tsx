import { type JSX, useEffect } from "react"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import { AddLinkForm } from "./components/AddLinkForm"
import { LinksList } from "./components/LinksList"
import { useLinks } from "./hooks/useLinks"

export const App = (): JSX.Element => {
  const {
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
  } = useLinks()

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return
    }

    const checkForUpdates = async (): Promise<void> => {
      try {
        const update = await check()
        if (!update) {
          return
        }

        const notes = update.body ? `\n\n${update.body}` : ""
        const shouldInstall = window.confirm(
          `A new EasyCopy update (${update.version}) is available. Install now?${notes}`,
        )

        if (!shouldInstall) {
          return
        }

        await update.downloadAndInstall()
        await relaunch()
      } catch (err) {
        console.error("Updater check failed", err)
      }
    }

    void checkForUpdates()
  }, [])

  return (
    <main className="h-screen overflow-hidden bg-slate-100 px-4 py-4 text-slate-900 dark:bg-zinc-900 dark:text-zinc-100">
      <section className="mx-auto flex h-full w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-soft dark:border-zinc-700 dark:bg-zinc-800">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">EasyCopy</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Save links and manage them quickly.</p>
        </header>

        <AddLinkForm onInputStart={clearError} onSubmit={addLink} />

        {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p> : null}

        <LinksList
          editState={editState}
          hasLinks={hasLinks}
          links={links}
          onDelete={deleteLink}
          onEdit={editLink}
          onEditStateChange={setEditState}
          onMove={moveLink}
          onPersistOrder={persistOrder}
        />
      </section>
    </main>
  )
}

export default App
