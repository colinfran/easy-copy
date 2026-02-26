import { type JSX } from "react"
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type EditState, type LinkItem } from "../types/link"

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
  item: LinkItem
  editState: EditState | null
  onEditStateChange: (updater: (current: EditState | null) => EditState | null) => void
  onEdit: (item: LinkItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const LinkRow = ({
  item,
  editState,
  onEditStateChange,
  onEdit,
  onDelete,
}: LinkRowProps): JSX.Element => {
  const activeEdit = editState?.id === item.id ? editState : null

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: Boolean(activeEdit),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      className={`rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800 ${isDragging ? "opacity-60" : "opacity-100"}`}
      ref={(node): void => {
        setNodeRef(node)
      }}
      style={style}
    >
      {activeEdit ? (
        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
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
          <p
            className="cursor-move text-sm font-semibold"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            {item.name}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500 dark:text-zinc-400">{item.url}</p>
        </>
      )}

      <div className="mt-3 flex gap-2">
        {activeEdit ? (
          <button
            className="w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-zinc-700"
            type="button"
            onClick={(): Promise<void> => onEdit(item)}
          >
            Save
          </button>
        ) : (
          <>
            <button
              className="flex-1 rounded-lg border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-zinc-700"
              type="button"
              onClick={(): Promise<void> => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="flex-1 rounded-lg border border-red-200 px-2 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-zinc-700"
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const dragIndex = links.findIndex((item) => item.id === String(active.id))
    const hoverIndex = links.findIndex((item) => item.id === String(over.id))

    if (dragIndex < 0 || hoverIndex < 0) {
      return
    }

    onMove(dragIndex, hoverIndex)
    void onPersistOrder()
  }

  return (
    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={links.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="mt-4 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
          {!hasLinks ? (
            <li className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-500 dark:bg-zinc-700 dark:text-zinc-400">
              No links saved yet.
            </li>
          ) : null}

          {links.map((item) => (
            <LinkRow
              editState={editState}
              item={item}
              key={item.id}
              onDelete={onDelete}
              onEdit={onEdit}
              onEditStateChange={onEditStateChange}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
