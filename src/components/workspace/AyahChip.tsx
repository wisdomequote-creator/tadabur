import type { DragEvent, MouseEvent } from 'react'
import AyahStar from '../AyahStar'
import { toArabicNumerals } from '../../lib/numerals'

interface AyahChipProps {
  n: number
  text: string
  selected: boolean
  size?: number
  /** The current multi-selection — so dragging a selected chip drags the group. */
  selectedAyat?: number[]
  onSelect: (n: number, additive: boolean) => void
}

export const DRAG_MIME = 'application/x-ayah'

/** Parse a dragged payload (comma-separated ayah numbers) into a list. */
export function readDraggedAyat(e: DragEvent): number[] {
  const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain')
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

/**
 * A single ayah, shown compactly as its number inside the khātim star.
 * Click to select (Ctrl/⌘-click to add to a multi-selection); drag to move it —
 * or the whole selection — into an axis circle.
 */
export default function AyahChip({ n, text, selected, size = 44, selectedAyat, onSelect }: AyahChipProps) {
  function handleDragStart(e: DragEvent<HTMLButtonElement>) {
    const group =
      selected && selectedAyat && selectedAyat.length > 1 ? selectedAyat : [n]
    const payload = group.join(',')
    e.dataTransfer.setData(DRAG_MIME, payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    onSelect(n, e.ctrlKey || e.metaKey)
  }

  return (
    <button
      type="button"
      className={`chip${selected ? ' chip--selected' : ''}`}
      data-ayah={n}
      aria-pressed={selected}
      aria-label={`الآية ${toArabicNumerals(n)}${selected ? '، محدَّدة' : ''}. اضغط لتحديدها (Ctrl لإضافة أكثر من آية) ونقلها.`}
      title={text}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      <AyahStar n={n} size={size} />
    </button>
  )
}
