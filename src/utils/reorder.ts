import { type LinkItem } from "../types/link"

export const moveItemByIndex = (
  items: LinkItem[],
  dragIndex: number,
  hoverIndex: number,
): LinkItem[] => {
  if (dragIndex < 0 || hoverIndex < 0 || dragIndex >= items.length || hoverIndex >= items.length) {
    return items
  }

  if (dragIndex === hoverIndex) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(dragIndex, 1)
  next.splice(hoverIndex, 0, moved)
  return next
}
