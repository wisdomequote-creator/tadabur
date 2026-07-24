import type { DragEvent } from 'react'
import AyahStar from '../AyahStar'
import { toArabicNumerals } from '../../lib/numerals'

interface AyahChipProps {
  n: number
  text: string
  selected: boolean
  size?: number
  onSelect: (n: number) => void
}

export const DRAG_MIME = 'application/x-ayah'

/**
 * A single ayah, shown compactly as just its number inside the khātim star.
 * Tap to select (its text opens in the reader); drag to move it into an axis.
 */
export default function AyahChip({ n, text, selected, size = 44, onSelect }: AyahChipProps) {
  function handleDragStart(e: DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData(DRAG_MIME, String(n))
    e.dataTransfer.setData('text/plain', String(n))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <button
      type="button"
      className={`chip${selected ? ' chip--selected' : ''}`}
      aria-pressed={selected}
      aria-label={`الآية ${toArabicNumerals(n)}${selected ? '، محدَّدة' : ''}. اضغط لقراءتها ونقلها.`}
      title={text}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(n)}
    >
      <AyahStar n={n} size={size} />
    </button>
  )
}
