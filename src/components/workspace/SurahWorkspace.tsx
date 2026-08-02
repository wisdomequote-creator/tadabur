import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { SurahData } from '../../lib/types'
import { toArabicNumerals } from '../../lib/numerals'
import {
  initWorkspace,
  workspaceReducer,
} from '../../lib/workspace/reducer'
import { clearState, loadState, saveState } from '../../lib/workspace/storage'
import { buildExportText, downloadText } from '../../lib/workspace/exportText'
import AyahReader from '../AyahReader'
import { asbabForAyah } from '../../lib/asbab'
import SearchModal from '../SearchModal'
import MindMap from './MindMap'
import AyahBank from './AyahBank'
import QuestionsSection from './QuestionsSection'
import VocabSection from './VocabSection'

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SurahWorkspace({ surah }: { surah: SurahData }) {
  const [state, dispatch] = useReducer(workspaceReducer, surah, initWorkspace)
  const [selected, setSelected] = useState<number[]>([])
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [searchOpen, setSearchOpen] = useState(false)
  const hydrated = useRef(false)

  // Hydrate from localStorage once, client-side only.
  useEffect(() => {
    const saved = loadState(surah.number)
    if (saved) dispatch({ type: 'hydrate', state: saved })
    hydrated.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced autosave (~500ms).
  useEffect(() => {
    if (!hydrated.current) return
    setStatus('saving')
    const t = setTimeout(() => {
      saveState(state)
      setStatus('saved')
    }, 500)
    return () => clearTimeout(t)
  }, [state])

  const textMap = useMemo(
    () => new Map(surah.ayat.map((a) => [a.n, a.text])),
    [surah],
  )
  const textOf = (n: number): string => textMap.get(n) ?? ''

  // A single tapped ayah opens the reader; Ctrl/⌘-click builds a multi-selection.
  const readerAyah = selected.length === 1 ? (selected[0] as number) : null

  function toggleSelect(n: number, additive: boolean) {
    setSelected((prev) => {
      if (additive) {
        return prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
      }
      return prev.length === 1 && prev[0] === n ? [] : [n]
    })
  }

  function placeInAxis(ns: number[], axisId: string) {
    dispatch({ type: 'moveManyToAxis', ns, axisId })
    setSelected([])
  }

  function returnToBank(ns: number[]) {
    dispatch({ type: 'moveManyToBank', ns })
    setSelected([])
  }

  function handleDeleteAxis(axisId: string) {
    const axis = state.axes.find((a) => a.id === axisId)
    if (axis && (axis.ayat.length > 0 || axis.title.trim() || axis.notes.trim())) {
      const ok = window.confirm(
        'هذا المحور يحتوي على آيات أو ملاحظات. عند حذفه تعود آياته إلى البنك. هل تريد المتابعة؟',
      )
      if (!ok) return
    }
    dispatch({ type: 'deleteAxis', axisId })
  }

  function handleReset() {
    const ok = window.confirm('سيُمحى كل التوزيع والملاحظات لهذه السورة. هل أنت متأكد؟')
    if (!ok) return
    dispatch({ type: 'reset', ayahCount: surah.ayahCount })
    clearState(surah.number)
    setSelected([])
  }

  function handleExport() {
    const text = buildExportText(surah, state)
    downloadText(`tadabur-${surah.number}-${surah.englishName}.txt`, text)
  }

  const assignedCount = surah.ayahCount - state.bank.length

  return (
    <div className="workspace">
      {/* Tapping a single ayah shows its text in a card anchored right above it. */}
      {readerAyah !== null && (
        <AyahReader
          n={readerAyah}
          text={textOf(readerAyah)}
          asbab={asbabForAyah(surah.asbab, readerAyah)}
          onClose={() => setSelected([])}
        />
      )}

      {/* Ayah bank (right sidebar) + mind-map of topics & surah subject (left) */}
      <div className="container workspace-split">
        <aside className="workspace-split__bank">
          <AyahBank
            bank={state.bank}
            ayahCount={surah.ayahCount}
            textOf={textOf}
            selectedAyat={selected}
            onSelectAyah={toggleSelect}
            onReturnToBank={returnToBank}
          />
        </aside>

        <section className="workspace-split__map" aria-label="خريطة المحاور">
          <div className="mindmap-wrap__bar">
            <span className="eyebrow">خريطة المحاور</span>
            <div className="mindmap-wrap__meta">
              <span className="mindmap-hint">اسحب رأس المحور «⠿» لتحريكه</span>
              <span className="save-indicator" aria-live="polite">
                {status === 'saved' ? '✓ حُفظ' : status === 'saving' ? '…يُحفظ' : ''}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => dispatch({ type: 'addAxis' })}
              >
                + محور جديد
              </button>
            </div>
          </div>

          <MindMap
            state={state}
            textOf={textOf}
            selectedAyat={selected}
            onMoveNode={(id, x, y) => dispatch({ type: 'moveNode', id, x, y })}
            onResizeNode={(id, w, h) => dispatch({ type: 'resizeNode', id, w, h })}
            onSetTheme={(value) => dispatch({ type: 'setSurahTheme', value })}
            onSetAxisTitle={(id, value) => dispatch({ type: 'setAxisTitle', axisId: id, value })}
            onSetAxisNotes={(id, value) => dispatch({ type: 'setAxisNotes', axisId: id, value })}
            onPlaceHere={placeInAxis}
            onDelete={handleDeleteAxis}
            onSelectAyah={toggleSelect}
          />
        </section>
      </div>

      {/* Questions, vocabulary, actions — full width below */}
      <div className="container">
        {/* Questions & answers — the core of tadabur */}
        <QuestionsSection
          questions={state.questions}
          onAdd={() => dispatch({ type: 'addQuestion' })}
          onDelete={(id) => dispatch({ type: 'deleteQuestion', id })}
          onSet={(id, field, value) => dispatch({ type: 'setQuestion', id, field, value })}
        />

        {/* Vocabulary — word + meaning */}
        <VocabSection
          vocab={state.vocab}
          onAdd={() => dispatch({ type: 'addVocab' })}
          onDelete={(id) => dispatch({ type: 'deleteVocab', id })}
          onSet={(id, field, value) => dispatch({ type: 'setVocab', id, field, value })}
        />

        {/* Actions */}
        <div className="workspace-actions">
          <div className="workspace-actions__stat eyebrow">
            وُزِّع {toArabicNumerals(assignedCount)} من {toArabicNumerals(surah.ayahCount)}
          </div>
          <div className="workspace-actions__buttons">
            <button type="button" className="btn" onClick={handleExport}>
              تصدير (.txt)
            </button>
            <button type="button" className="btn btn-danger" onClick={handleReset}>
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Search the whole Quran without leaving your tadabur */}
      <button
        type="button"
        className="search-fab"
        onClick={() => setSearchOpen(true)}
        aria-label="بحث في القرآن كله"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>بحث في القرآن</span>
      </button>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        surahNumber={surah.number}
        allowKinds
      />
    </div>
  )
}
