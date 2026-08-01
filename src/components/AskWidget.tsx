import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ask, type ChatMsg } from '../lib/ask'
import { toArabicNumerals } from '../lib/numerals'

/** Turn [surah:ayah] references in the answer into links to that ayah. */
function linkifyRefs(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[(\d{1,3}):(\d{1,3})(?:-\d{1,3})?\]/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const s = Number(m[1])
    const a = Number(m[2])
    if (s >= 1 && s <= 114) {
      out.push(
        <Link key={k++} to={`/surah/${s}#ayah-${a}`} className="ask-ref">
          {`${toArabicNumerals(s)}:${toArabicNumerals(a)}`}
        </Link>,
      )
    } else {
      out.push(m[0])
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Message({ msg }: { msg: ChatMsg }) {
  return (
    <div className={`ask-msg ask-msg--${msg.role}`}>
      {msg.content.split('\n').map((line, i) => (
        <p key={i} className="ask-msg__line">
          {msg.role === 'assistant' ? linkifyRefs(line) : line}
        </p>
      ))}
    </div>
  )
}

const SUGGESTIONS = [
  'ابحث عن آيات الصبر',
  'ما سبب نزول آية الكرسي؟',
  'آيات فيها ذكر الجنة',
]

export default function AskWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return
    setError(null)
    const next = [...messages, { role: 'user' as const, content: q }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const answer = await ask(next)
      setMessages([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button type="button" className="ask-fab" onClick={() => setOpen(true)} aria-label="اسأل مساعد تدبر">
          <span className="ask-fab__spark" aria-hidden="true">
            ✦
          </span>
          اسأل
        </button>
      )}

      {open && (
        <div className="ask-panel" role="dialog" aria-label="مساعد تدبر">
          <header className="ask-panel__head">
            <span className="ask-panel__title">
              <span className="ask-fab__spark" aria-hidden="true">
                ✦
              </span>
              مساعد تدبر
            </span>
            <button type="button" className="ask-panel__close" aria-label="إغلاق" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>

          <div className="ask-panel__body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="ask-intro">
                <p className="ask-intro__lead">
                  اسألني عن القرآن: ابحث عن موضوع، اطلب آياتٍ متشابهة، أو اسأل عن معنى آية أو سبب
                  نزولها. أستند في إجاباتي إلى نصّ القرآن والتفسير الميسر وأسباب النزول.
                </p>
                <div className="ask-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="ask-suggestion" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={i} msg={m} />
            ))}
            {loading && (
              <div className="ask-msg ask-msg--assistant">
                <p className="ask-msg__line ask-typing">…يبحث ويتدبّر</p>
              </div>
            )}
            {error && <p className="ask-error">{error}</p>}
          </div>

          <form
            className="ask-form"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="ask-input"
              placeholder="اكتب سؤالك…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="ask-send" disabled={loading || !input.trim()}>
              إرسال
            </button>
          </form>
          <p className="ask-disclaimer">
            إجاباتٌ آليّة مستندة إلى مصادر الموقع — راجِع أهل العلم في المسائل الشرعية.
          </p>
        </div>
      )}
    </>
  )
}
