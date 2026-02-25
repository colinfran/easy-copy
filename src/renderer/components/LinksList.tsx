import { useRef, type JSX } from "react"
import { useDrag, useDrop } from "react-dnd"
import { type EditState, type LinkItem } from "../types/link"

const DND_TYPE = "easycopy-link-item"

type DragItem = {
  id: string
  index: number
}

type LinksListProps = {
  links: LinkItem[]
  hasLinks: boolean
  editState: EditState | null
  onEditStateChange: (updater: (current: EditState | null) => EditState | null) => void
  onEdit: (item: LinkItem) => Promise<void>
  onMove: (dragIndex: number, hoverIndex: number) => void
  onPersistOrder: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type LinkRowProps = {
  index: number
  item: LinkItem
  editState: EditState | null
  onEditStateChange: (updater: (current: EditState | null) => EditState | null) => void
  onEdit: (item: LinkItem) => Promise<void>
  onMove: (dragIndex: number, hoverIndex: number) => void
  onPersistOrder: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const LinkRow = ({
  index,
  item,
  editState,
  onEditStateChange,
  onEdit,
  onMove,
  onPersistOrder,
  onDelete,
}: LinkRowProps): JSX.Element => {
  const rowRef = useRef<HTMLLIElement | null>(null)
  const activeEdit = editState?.id === item.id ? editState : null

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_TYPE,
      item: { id: item.id, index },
      end: async (_dragItem, monitor) => {
        if (monitor.didDrop()) {
          await onPersistOrder()
        }
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [item.id, index, onPersistOrder],
  )

  const [, drop] = useDrop(
    () => ({
      accept: DND_TYPE,
      hover: (dragged: DragItem, monitor) => {
        if (!rowRef.current) {
          return
        }

        const dragIndex = dragged.index
        const hoverIndex = index

        if (dragIndex === hoverIndex) {
          return
        }

        const hoverBoundingRect = rowRef.current.getBoundingClientRect()
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
        const clientOffset = monitor.getClientOffset()

        if (!clientOffset) {
          return
        }

        const hoverClientY = clientOffset.y - hoverBoundingRect.top

        // Only move when cursor crosses half of hovered row to prevent jitter.
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return
        }

        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return
        }

        onMove(dragIndex, hoverIndex)
        dragged.index = hoverIndex
      },
      drop: () => ({ moved: true }),
    }),
    [index, onMove],
  )

  drag(drop(rowRef))

  return (
    <li
      ref={rowRef}
      className={`rounded-xl border border-slate-200 bg-white p-3 ${isDragging ? "opacity-60" : "opacity-100"}`}
    >
      {activeEdit ? (
        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 transition focus:ring-2"
            value={activeEdit.name}
            onChange={(event): void =>
              onEditStateChange((current) =>
                current
                  ? {
                      ...current,
                      name: event.target.value,
                    }
                  : current,
              )
            }
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 transition focus:ring-2"
            value={activeEdit.url}
            onChange={(event): void =>
              onEditStateChange((current) =>
                current
                  ? {
                      ...current,
                      url: event.target.value,
                    }
                  : current,
              )
            }
          />
        </div>
      ) : (
        <>
          <p className="cursor-move text-sm font-semibold" title="Drag to reorder">
            {item.name}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{item.url}</p>
        </>
      )}

      <div className="mt-3 flex gap-2">
        {activeEdit ? (
          <button
            className="w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            type="button"
            onClick={(): Promise<void> => onEdit(item)}
          >
            Save
          </button>
        ) : (
          <>
            <button
              className="flex-1 rounded-lg border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              type="button"
              onClick={(): Promise<void> => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="flex-1 rounded-lg border border-red-200 px-2 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              type="button"
              onClick={(): Promise<void> => onDelete(item.id)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export const LinksList = ({
  links,
  hasLinks,
  editState,
  onEditStateChange,
  onEdit,
  onMove,
  onPersistOrder,
  onDelete,
}: LinksListProps): JSX.Element => {
  return (
    <ul className="mt-4 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
      {!hasLinks ? (
        <li className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-500">No links saved yet.</li>
      ) : null}

      {links.map((item, index) => (
        <LinkRow
          key={item.id}
          index={index}
          item={item}
          editState={editState}
          onEditStateChange={onEditStateChange}
          onEdit={onEdit}
          onMove={onMove}
          onPersistOrder={onPersistOrder}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
