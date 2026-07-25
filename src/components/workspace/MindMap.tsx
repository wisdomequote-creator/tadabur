import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { WorkspaceState } from '../../lib/types'
import { ROOT_W } from '../../lib/workspace/reducer'
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
  onResizeNode: (id: string, w: number, h: number) => void
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
  onResizeNode,
  onSetTheme,
  onSetAxisTitle,
  onSetAxisNotes,
  onPlaceHere,
  onDelete,
  onSelectAyah,
}: MindMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; offX: number; offY: number; w: number; h: number } | null>(
    null,
  )
  const [dragging, setDragging] = useState<string | null>(null)
  const [sizes, setSizes] = useState<Record<string, Size>>({})
  const [zoom, setZoom] = useState(1)

  const clampZoom = (z: number) => Math.min(1.6, Math.max(0.4, Math.round(z * 100) / 100))
  const clientToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom }
  }

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

  // Trackpad pinch (and Ctrl+wheel) zoom. Browsers report pinch as ctrl+wheel;
  // the listener is non-passive so it can prevent the browser's page zoom.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      // Cap per-event change so a mouse-wheel notch doesn't jump, while
      // trackpad pinch (many tiny deltas) stays smooth.
      const step = Math.max(-0.25, Math.min(0.25, -e.deltaY * 0.01))
      setZoom((z) => clampZoom(z + step))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const p = clientToCanvas(e.clientX, e.clientY)
    const pos = posOf(id)
    const size = sizes[id] ?? { w: 220, h: FALLBACK_AXIS_H }
    dragRef.current = {
      id,
      offX: p.x - pos.x,
      offY: p.y - pos.y,
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
    // Map the pointer into canvas coordinates (accounting for zoom).
    const p = clientToCanvas(e.clientX, e.clientY)
    const x = Math.max(0, p.x - d.offX)
    const y = Math.max(0, p.y - d.offY)
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

  // ---- Resize (drag a node's corner) --------------------------------------
  const resizeRef = useRef<{ id: string; ax: number; ay: number } | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)

  function startResize(id: string, e: ReactPointerEvent) {
    if (!canvasRef.current) return
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const pos = posOf(id)
    resizeRef.current = { id, ax: pos.x, ay: pos.y }
    setResizing(id)
    e.preventDefault()
  }

  function resizeMove(e: ReactPointerEvent) {
    const d = resizeRef.current
    const canvas = canvasRef.current
    if (!d || !canvas) return
    const p = clientToCanvas(e.clientX, e.clientY)
    const w = Math.max(170, Math.round(p.x - d.ax))
    const h = Math.max(150, Math.round(p.y - d.ay))
    onResizeNode(d.id, w, h)
  }

  function resizeEnd(e: ReactPointerEvent) {
    if (resizeRef.current) {
      resizeRef.current = null
      setResizing(null)
    }
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const resizeProps = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent) => startResize(id, e),
    onPointerMove: resizeMove,
    onPointerUp: resizeEnd,
  })

  const axisW = (a: (typeof state.axes)[number]) => a.w ?? nodeWidth(a.ayat.length)
  const rootW = state.rootW ?? ROOT_W

  const rootSize = sizes.root ?? { w: rootW, h: FALLBACK_ROOT_H }

  // Lines flow from the root's bottom-middle to each group's top-middle.
  const startX = state.rootX + rootSize.w / 2
  const startY = state.rootY + rootSize.h

  // Canvas fits its content plus a margin to drag into (no huge fixed board).
  const { canvasW, canvasH } = useMemo(() => {
    let maxRight = state.rootX + rootSize.w
    let maxBottom = state.rootY + rootSize.h
    for (const a of state.axes) {
      const w = a.w ?? sizes[a.id]?.w ?? nodeWidth(a.ayat.length)
      const h = a.h ?? sizes[a.id]?.h ?? FALLBACK_AXIS_H
      maxRight = Math.max(maxRight, a.x + w)
      maxBottom = Math.max(maxBottom, a.y + h)
    }
    return {
      canvasW: Math.max(480, Math.round(maxRight + 120)),
      canvasH: Math.max(360, Math.round(maxBottom + 80)),
    }
  }, [state.axes, state.rootX, state.rootY, rootSize.w, rootSize.h, sizes])

  return (
    <div className="mindmap-view">
      <div className="mindmap__zoom" role="group" aria-label="تكبير وتصغير الخريطة">
        <button
          type="button"
          className="mindmap__zoom-btn"
          aria-label="تصغير"
          onClick={() => setZoom((z) => clampZoom(z - 0.1))}
        >
          −
        </button>
        <button
          type="button"
          className="mindmap__zoom-val"
          title="إعادة الحجم"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}٪
        </button>
        <button
          type="button"
          className="mindmap__zoom-btn"
          aria-label="تكبير"
          onClick={() => setZoom((z) => clampZoom(z + 0.1))}
        >
          +
        </button>
      </div>

      <div className="mindmap__scroll" ref={scrollRef}>
        <div
          className="mindmap__sizer"
          style={{ width: Math.round(canvasW * zoom), height: Math.round(canvasH * zoom) }}
        >
          <div
            className={`mindmap${dragging || resizing ? ' mindmap--dragging' : ''}`}
            ref={canvasRef}
            style={{
              width: canvasW,
              height: canvasH,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Connector lines (behind the nodes) */}
        <svg className="mindmap__lines" width={canvasW} height={canvasH} aria-hidden="true">
          {state.axes.map((a) => {
            const endX = a.x + axisW(a) / 2
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
          className={`node node--root${state.rootH ? ' node--sized' : ''}`}
          ref={getNodeRef('root')}
          style={{ left: state.rootX, top: state.rootY, width: rootW, height: state.rootH }}
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
          <span
            className="node__resize"
            {...resizeProps('root')}
            aria-hidden="true"
            title="اسحب لتغيير الحجم"
          />
        </div>

        {/* Axis nodes */}
        {state.axes.map((axis, i) => (
          <div
            key={axis.id}
            className={`node${axis.h ? ' node--sized' : ''}`}
            ref={getNodeRef(axis.id)}
            style={{ left: axis.x, top: axis.y, width: axisW(axis), height: axis.h }}
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
            <span
              className="node__resize"
              {...resizeProps(axis.id)}
              aria-hidden="true"
              title="اسحب لتغيير الحجم"
            />
          </div>
        ))}
          </div>
        </div>
      </div>
    </div>
  )
}
