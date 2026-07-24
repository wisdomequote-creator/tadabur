import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { SurahData } from '../../lib/types'
import { toArabicNumerals } from '../../lib/numerals'
import {
  initWorkspace,
  workspaceReducer,
} from '../../lib/workspace/reducer'
import { clearState, loadState, saveState } from '../../lib/workspace/storage'
import { buildExportText, downloadText } from '../../lib/workspace/exportText'
import AyahStar from '../AyahStar'
import AxisColumn from './AxisColumn'
import AyahBank from './AyahBank'

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SurahWorkspace({ surah }: { surah: SurahData }) {
  const [state, dispatch] = useReducer(workspaceReducer, surah, initWorkspace)
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
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

  // Where does each ayah currently live? 'bank' or an axis id.
  const location = useMemo(() => {
    const m = new Map<number, string>()
    for (const n of state.bank) m.set(n, 'bank')
    for (const a of state.axes) for (const n of a.ayat) m.set(n, a.id)
    return m
  }, [state])

  const selectionAssigned =
    selectedAyah !== null && location.get(selectedAyah) !== 'bank'

  function toggleSelect(n: number) {
    setSelectedAyah((prev) => (prev === n ? null : n))
  }

  function placeInAxis(n: number, axisId: string) {
    dispatch({ type: 'moveToAxis', n, axisId })
    setSelectedAyah(null)
  }

  function returnToBank(n: number) {
    dispatch({ type: 'moveToBank', n })
    setSelectedAyah(null)
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
    setSelectedAyah(null)
  }

  function handleExport() {
    const text = buildExportText(surah, state)
    downloadText(`tadabur-${surah.number}-${surah.englishName}.txt`, text)
  }

  const assignedCount = surah.ayahCount - state.bank.length

  return (
    <div className="workspace">
      {/* Reader — the selected ayah's text appears here on tap (sticky) */}
      <div className="container">
        <div className={`reader${selectedAyah !== null ? ' reader--active' : ''}`} aria-live="polite">
          {selectedAyah !== null ? (
            <>
              <AyahStar n={selectedAyah} size={48} />
              <p className="reader__text" lang="ar">
                {textOf(selectedAyah)}
              </p>
              <button
                type="button"
                className="reader__close"
                aria-label="إلغاء التحديد"
                onClick={() => setSelectedAyah(null)}
              >
                ×
              </button>
            </>
          ) : (
            <p className="reader__placeholder">اضغط رقم أيّ آية لقراءتها، ثم ضعها في محور.</p>
          )}
        </div>
      </div>

      {/* Tree: موضوع السورة is the root; المحاور branch out below it */}
      <section className="tree-wrap container" aria-label="شجرة المحاور">
        <div className="tree-wrap__bar">
          <span className="eyebrow">شجرة المحاور</span>
          <span className="save-indicator" aria-live="polite">
            {status === 'saved' ? '✓ حُفظ' : status === 'saving' ? '…يُحفظ' : ''}
          </span>
        </div>

        <div className="tree">
          <div className="tree__root">
            <label className="tree__root-label eyebrow" htmlFor="surah-theme">
              موضوع السورة
            </label>
            <textarea
              id="surah-theme"
              className="tree__root-input"
              value={state.surahTheme}
              placeholder="ما الخيط الجامع الذي تدور حوله السورة كلها؟"
              rows={2}
              onChange={(e) => dispatch({ type: 'setSurahTheme', value: e.target.value })}
            />
          </div>

          <div className="tree__scroll">
            <ul className="tree__level" aria-label="محاور السورة">
              {state.axes.map((axis, i) => (
                <li className="tree__node" key={axis.id}>
                  <AxisColumn
                    axis={axis}
                    index={i}
                    textOf={textOf}
                    selectedAyah={selectedAyah}
                    onSelectAyah={toggleSelect}
                    onSetTitle={(id, value) => dispatch({ type: 'setAxisTitle', axisId: id, value })}
                    onSetNotes={(id, value) => dispatch({ type: 'setAxisNotes', axisId: id, value })}
                    onPlaceHere={placeInAxis}
                    onDelete={handleDeleteAxis}
                  />
                </li>
              ))}
              <li className="tree__node tree__node--add">
                <button
                  type="button"
                  className="add-node"
                  onClick={() => dispatch({ type: 'addAxis' })}
                >
                  <span className="add-node__plus" aria-hidden="true">
                    +
                  </span>
                  <span>محور جديد</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bank */}
      <div className="container">
        <AyahBank
          bank={state.bank}
          ayahCount={surah.ayahCount}
          textOf={textOf}
          selectedAyah={selectedAyah}
          selectionAssigned={selectionAssigned}
          onSelectAyah={toggleSelect}
          onReturnToBank={returnToBank}
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
    </div>
  )
}
