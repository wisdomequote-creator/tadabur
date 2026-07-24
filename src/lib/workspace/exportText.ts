import type { SurahData, WorkspaceState } from '../types'
import { toArabicNumerals } from '../numerals'

/** Build a formatted, human-readable .txt of the whole tadabur session. */
export function buildExportText(surah: SurahData, state: WorkspaceState): string {
  const textOf = new Map(surah.ayat.map((a) => [a.n, a.text]))
  const L: string[] = []

  L.push('تدبُّر سورة ' + surah.name)
  L.push('عدد الآيات: ' + toArabicNumerals(surah.ayahCount))
  L.push('═'.repeat(40))
  L.push('')

  if (state.surahTheme.trim()) {
    L.push('موضوع السورة:')
    L.push(state.surahTheme.trim())
    L.push('')
  }

  state.axes.forEach((axis, i) => {
    const heading = axis.title.trim() || '(بدون عنوان)'
    L.push(`المحور ${toArabicNumerals(i + 1)}: ${heading}`)
    L.push('─'.repeat(30))
    if (axis.ayat.length === 0) {
      L.push('  (لا آيات)')
    } else {
      for (const n of axis.ayat) {
        L.push(`  [${toArabicNumerals(n)}] ${textOf.get(n) ?? ''}`)
      }
    }
    if (axis.notes.trim()) {
      L.push('')
      L.push('  ملاحظات: ' + axis.notes.trim())
    }
    L.push('')
  })

  if (state.bank.length > 0) {
    L.push('آيات لم تُوزَّع بعد:')
    L.push('─'.repeat(30))
    for (const n of state.bank) {
      L.push(`  [${toArabicNumerals(n)}] ${textOf.get(n) ?? ''}`)
    }
    L.push('')
  }

  const answeredOrAsked = state.questions.filter((q) => q.q.trim() || q.a.trim())
  if (answeredOrAsked.length > 0) {
    L.push('أسئلة التدبّر:')
    L.push('─'.repeat(30))
    answeredOrAsked.forEach((item, i) => {
      L.push(`  س${toArabicNumerals(i + 1)}: ${item.q.trim() || '(بدون سؤال)'}`)
      if (item.a.trim()) L.push(`  ج: ${item.a.trim()}`)
      L.push('')
    })
  }

  L.push('═'.repeat(40))
  L.push('أُنشئ بمساعدة «تدبر»')

  return L.join('\n')
}

/** Trigger a client-side download of the export text. No-op during SSR. */
export function downloadText(filename: string, contents: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
