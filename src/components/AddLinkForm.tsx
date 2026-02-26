import { useState, type FormEvent, type JSX } from "react"

type AddLinkFormProps = {
  onSubmit: (name: string, url: string) => Promise<void>
  onInputStart: () => void
}

export const AddLinkForm = ({ onSubmit, onInputStart }: AddLinkFormProps): JSX.Element => {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    await onSubmit(name, url)

    if (name.trim() && url.trim()) {
      setName("")
      setUrl("")
    }
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        maxLength={80}
        placeholder="Name (e.g. Product docs)"
        value={name}
        required
        onChange={(event): void => {
          onInputStart()
          setName(event.target.value)
        }}
      />
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        placeholder="https://example.com"
        value={url}
        required
        onChange={(event): void => {
          onInputStart()
          setUrl(event.target.value)
        }}
      />
      <button
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        type="submit"
      >
        Add Link
      </button>
    </form>
  )
}
