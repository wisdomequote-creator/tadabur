import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { WorkspaceState } from '../../lib/types'
import { CANVAS_W, ROOT_W } from '../../lib/workspace/reducer'
import AxisColumn from './AxisColumn'

interface Size {
  w: number
  h: number
}

interface MindMapProps {
  state: WorkspaceState
  textOf: (n: number) => string
  selectedAyah: number | null
  onMoveNode: (id: string, x: number, y: number) => void
  onSetTheme: (value: string) => void
  onSetAxisTitle: (axisId: string, value: string) => void
  onSetAxisNotes: (axisId: string, value: string) => void
  onPlaceHere: (n: number, axisId: string) => void
  onDelete: (axisId: string) => void
  onSelectAyah: (n: number) => void
}

/** Circle nodes grow with their ayah count so they never overflow/scroll. */
function nodeWidth(ayatCount: number): number {
  return Math.round(Math.min(340, Math.max(200, 150 + ayatCount * 13)))
}

const FALLBACK_AXIS_H = 300
const FALLBACK_ROOT_H = 130

export default function MindMap({
  state,
  textOf,
  selectedAyah,
  onMoveNode,
  onSetTheme,
  onSetAxisTitle,
  onSetAxisNotes,
  onPlaceHere,
  onDelete,
  onSelectAyah,
}: MindMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; offX: number; offY: number; w: number; h: number } | null>(
    null,
  )
  const [dragging, setDragging] = useState<string | null>(null)
  const [sizes, setSizes] = useState<Record<string, Size>>({})

  // Measure node sizes so connector lines can anchor to their centers.
  const roRef = useRef<ResizeObserver | null>(null)
  const nodes = useRef<Map<string, HTMLElement>>(new Map())
  const refCbs = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map())

  const getRO = useCallback(() => {
    if (roRef.current === null && typeof ResizeObserver !== 'undefined') {
      roRef.current = new ResizeObserver((entries) => {
        setSizes((prev) => {
          let next = prev
          for (const e of entries) {
            const id = (e.target as HTMLElement).dataset.nodeId
            if (!id) continue
            const box = e.borderBoxSize?.[0]
            const w = box ? box.inlineSize : e.contentRect.width
            const h = box ? box.blockSize : e.contentRect.height
            const cur = prev[id]
            if (!cur || cur.w !== w || cur.h !== h) {
              if (next === prev) next = { ...prev }
              next[id] = { w, h }
            }
          }
          return next
        })
      })
    }
    return roRef.current
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

  // Stable callback ref per id, so React only runs it on mount/unmount.
  const getNodeRef = (id: string) => {
    let cb = refCbs.current.get(id)
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        const prev = nodes.current.get(id)
        if (prev && prev !== el) roRef.current?.unobserve(prev)
        if (el) {
          el.dataset.nodeId = id
          nodes.current.set(id, el)
          getRO()?.observe(el)
          // Seed an initial size on mount (ref is stable ⇒ runs once, no loop).
          const w = el.offsetWidth
          const h = el.offsetHeight
          setSizes((s) => (s[id]?.w === w && s[id]?.h === h ? s : { ...s, [id]: { w, h } }))
        } else {
          nodes.current.delete(id)
          refCbs.current.delete(id)
        }
      }
      refCbs.current.set(id, cb)
    }
    return cb
  }

  const posOf = useCallback(
    (id: string) => {
      if (id === 'root') return { x: state.rootX, y: state.rootY }
      const a = state.axes.find((ax) => ax.id === id)
      return a ? { x: a.x, y: a.y } : { x: 0, y: 0 }
    },
    [state],
  )

  function startDrag(id: string, e: ReactPointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const target = e.currentTarget as HTMLElement
    try {
      target.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const rect = canvas.getBoundingClientRect()
    const pos = posOf(id)
    const size = sizes[id] ?? { w: 220, h: FALLBACK_AXIS_H }
    dragRef.current = {
      id,
      offX: e.clientX - rect.left - pos.x,
      offY: e.clientY - rect.top - pos.y,
      w: size.w,
      h: size.h,
    }
    setDragging(id)
    e.preventDefault()
  }

  function dragMove(e: ReactPointerEvent) {
    const d = dragRef.current
    const canvas = canvasRef.current
    if (!d || !canvas) return
    const rect = canvas.getBoundingClientRect()
    let x = e.clientX - rect.left - d.offX
    let y = e.clientY - rect.top - d.offY
    x = Math.max(0, Math.min(x, CANVAS_W - d.w))
    y = Math.max(0, y)
    onMoveNode(d.id, Math.round(x), Math.round(y))
  }

  function dragEnd(e: ReactPointerEvent) {
    if (dragRef.current) {
      dragRef.current = null
      setDragging(null)
    }
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handleProps = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent) => startDrag(id, e),
    onPointerMove: dragMove,
    onPointerUp: dragEnd,
  })

  const rootSize = sizes.root ?? { w: ROOT_W, h: FALLBACK_ROOT_H }

  // Lines flow from the root's bottom-middle to each group's top-middle.
  const startX = state.rootX + rootSize.w / 2
  const startY = state.rootY + rootSize.h

  const canvasH = useMemo(() => {
    let maxBottom = state.rootY + rootSize.h
    for (const a of state.axes) {
      const h = sizes[a.id]?.h ?? FALLBACK_AXIS_H
      maxBottom = Math.max(maxBottom, a.y + h)
    }
    return Math.max(560, Math.round(maxBottom + 48))
  }, [state.axes, state.rootY, rootSize.h, sizes])

  return (
    <div className="mindmap__scroll">
      <div
        className={`mindmap${dragging ? ' mindmap--dragging' : ''}`}
        ref={canvasRef}
        style={{ width: CANVAS_W, height: canvasH }}
      >
        {/* Connector lines (behind the nodes) */}
        <svg className="mindmap__lines" width={CANVAS_W} height={canvasH} aria-hidden="true">
          {state.axes.map((a) => {
            const w = nodeWidth(a.ayat.length)
            const endX = a.x + w / 2
            const endY = a.y
            const midY = (startY + endY) / 2
            const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
            return (
              <g key={a.id}>
                <path d={d} className="mindmap__line" />
                <circle cx={endX} cy={endY} r={3.5} className="mindmap__anchor" />
              </g>
            )
          })}
          <circle cx={startX} cy={startY} r={4} className="mindmap__anchor mindmap__anchor--root" />
        </svg>

        {/* Root node — موضوع السورة */}
        <div
          className="node node--root"
          ref={getNodeRef('root')}
          style={{ left: state.rootX, top: state.rootY, width: ROOT_W }}
        >
          <header className="node__handle" {...handleProps('root')}>
            <span className="axis__grip" aria-hidden="true">
              ⠿
            </span>
            <span className="eyebrow">موضوع السورة</span>
          </header>
          <textarea
            className="tree__root-input"
            value={state.surahTheme}
            placeholder="ما الخيط الجامع الذي تدور حوله السورة كلها؟"
            aria-label="موضوع السورة"
            rows={2}
            onChange={(e) => onSetTheme(e.target.value)}
          />
        </div>

        {/* Axis nodes */}
        {state.axes.map((axis, i) => (
          <div
            key={axis.id}
            className="node"
            ref={getNodeRef(axis.id)}
            style={{ left: axis.x, top: axis.y, width: nodeWidth(axis.ayat.length) }}
          >
            <AxisColumn
              axis={axis}
              index={i}
              textOf={textOf}
              selectedAyah={selectedAyah}
              onSelectAyah={onSelectAyah}
              onSetTitle={onSetAxisTitle}
              onSetNotes={onSetAxisNotes}
              onPlaceHere={onPlaceHere}
              onDelete={onDelete}
              handleProps={handleProps(axis.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
