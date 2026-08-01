// Supabase Edge Function: "ask" — the Tadabur AI helper.
//
// Runs Claude with a search tool over the project's `search_docs` table
// (Qur'an ayat + التفسير الميسر + أسباب النزول), so answers are grounded in the
// real texts and cited — no free-floating religious claims. The ANTHROPIC_API_KEY
// is read from the function's secrets and never reaches the browser.
//
// deno-lint-ignore-file no-explicit-any

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const RATE_LIMIT = 40 // requests per IP per hour

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `أنت "مساعد تدبر"، مساعدٌ ذكيٌّ داخل موقعٍ لدراسة القرآن الكريم وتدبّره. مهمتك أن تساعد القارئ على البحث في القرآن، والعثور على الآيات، وفهم معانيها، وتدبّرها.

لديك أدوات للبحث في:
- نصّ القرآن الكريم كاملًا.
- التفسير الميسر (تفسير مبسّط موثوق لكل آية).
- أسباب النزول (للإمام الواحدي).

قواعد صارمة:
1. اعتمد في كل ما تقوله على نتائج الأدوات فقط. لا تختلق آيةً ولا تفسيرًا ولا سبب نزول من عندك. إن لم تجده في الأدوات، فابحث؛ فإن لم تجد فقل بوضوح: "لم أجد في مصادر الموقع".
2. اذكر مصدرك دائمًا: اسم السورة ورقم الآية، ومن أين المعلومة (التفسير الميسر / أسباب النزول).
3. لا تُفتِ في الأحكام الشرعية ولا تُرجِّح بين المذاهب؛ وجّه القارئ إلى أهل العلم، واكتفِ بنقل ما في التفسير.
4. عند طلب "آيات مشابهة" أو "ابحث عن موضوع"، ابحث بكلماتٍ مفتاحية متنوّعة ثم اجمع ما وجدت.
5. أجب بالعربية الفصيحة، بإيجازٍ ووضوح، ورتّب الآيات المذكورة في قائمة عند الحاجة.`

function cors(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ---- Arabic normalization (must match the app's normalizeArabic exactly) ----
function normalizeArabic(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const cp = input.charCodeAt(i)
    if (
      (cp >= 0x0610 && cp <= 0x061a) ||
      (cp >= 0x064b && cp <= 0x065f) ||
      cp === 0x0670 ||
      (cp >= 0x06d6 && cp <= 0x06ed) ||
      cp === 0x0640 ||
      cp === 0x200e ||
      cp === 0x200f ||
      cp === 0x061c
    ) {
      continue
    }
    if (cp === 0x0622 || cp === 0x0623 || cp === 0x0625 || cp === 0x0671) out += 'ا'
    else if (cp === 0x0649) out += 'ي'
    else if (cp === 0x0629) out += 'ه'
    else out += input[i]
  }
  return out.trim()
}

async function rest(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) return []
  return await res.json()
}

// ---- Tools ----
const TOOLS = [
  {
    name: 'search',
    description:
      'ابحث في نصوص الموقع عن كلمةٍ أو عبارة. يعيد الآيات المطابقة مع مواضعها. استخدمه للعثور على آيات في موضوع، أو آيات مشابهة، أو ذكر شيءٍ في القرآن.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'كلمة أو عبارة عربية للبحث عنها' },
        in: {
          type: 'string',
          enum: ['quran', 'tafsir', 'asbab'],
          description: 'أين تبحث: نص القرآن (quran) أو التفسير (tafsir) أو أسباب النزول (asbab)',
        },
      },
      required: ['query', 'in'],
    },
  },
  {
    name: 'get_ayah',
    description: 'اجلب نصّ آيةٍ محددة مع تفسيرها الميسر وسبب نزولها إن وُجد.',
    input_schema: {
      type: 'object',
      properties: {
        surah: { type: 'number', description: 'رقم السورة (1-114)' },
        ayah: { type: 'number', description: 'رقم الآية' },
      },
      required: ['surah', 'ayah'],
    },
  },
]

async function runTool(name: string, input: any): Promise<string> {
  if (name === 'search') {
    const kind = input.in === 'tafsir' ? 'tafsir' : input.in === 'asbab' ? 'asbab' : 'ayah'
    const q = normalizeArabic(String(input.query ?? ''))
    if (q.length < 2) return 'استعلام قصير جدًا.'
    const pattern = '*' + encodeURIComponent(q) + '*'
    const rows = await rest(
      `search_docs?select=surah,ayah_from,ayah_to,body&kind=eq.${kind}&norm=ilike.${pattern}&order=surah,ayah_from&limit=12`,
    )
    if (!rows.length) return 'لا نتائج.'
    return rows
      .map((r) => {
        const ref = r.ayah_from === r.ayah_to ? `${r.surah}:${r.ayah_from}` : `${r.surah}:${r.ayah_from}-${r.ayah_to}`
        return `[${ref}] ${r.body}`
      })
      .join('\n\n')
  }
  if (name === 'get_ayah') {
    const s = Number(input.surah)
    const a = Number(input.ayah)
    const [ayah] = await rest(
      `search_docs?select=body&kind=eq.ayah&surah=eq.${s}&ayah_from=eq.${a}&limit=1`,
    )
    const [tafsir] = await rest(
      `search_docs?select=body&kind=eq.tafsir&surah=eq.${s}&ayah_from=eq.${a}&limit=1`,
    )
    const asbab = await rest(
      `search_docs?select=body,ayah_from,ayah_to&kind=eq.asbab&surah=eq.${s}&ayah_from=lte.${a}&ayah_to=gte.${a}&limit=3`,
    )
    if (!ayah) return 'لم أجد هذه الآية.'
    let out = `الآية [${s}:${a}]: ${ayah.body}`
    if (tafsir) out += `\n\nالتفسير الميسر: ${tafsir.body}`
    if (asbab.length) out += `\n\nسبب النزول: ${asbab.map((x) => x.body).join('\n')}`
    return out
  }
  return 'أداة غير معروفة.'
}

async function rateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString()
  const rows = await rest(`ask_rate?select=ts&ip=eq.${encodeURIComponent(ip)}&ts=gte.${since}`)
  if (rows.length >= RATE_LIMIT) return true
  await fetch(`${SUPABASE_URL}/rest/v1/ask_rate`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ip }),
  })
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return cors({ error: 'method' }, 405)
  if (!ANTHROPIC_KEY) return cors({ error: 'المساعد غير مُهيّأ بعد (مفتاح API مفقود).' }, 503)

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (await rateLimited(ip)) {
    return cors({ error: 'لقد أكثرت من الأسئلة. أعد المحاولة بعد قليل.' }, 429)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return cors({ error: 'bad request' }, 400)
  }
  const incoming: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : []
  // Keep the last ~10 turns to bound cost.
  const history = incoming.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? ''),
  }))
  if (!history.length) return cors({ error: 'no message' }, 400)

  const messages: any[] = [...history]

  // Tool-use loop.
  for (let step = 0; step < 6; step++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.2,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return cors({ error: 'تعذّر الاتصال بالمساعد.', detail: t.slice(0, 300) }, 502)
    }
    const data = await res.json()
    messages.push({ role: 'assistant', content: data.content })

    const toolUses = (data.content ?? []).filter((b: any) => b.type === 'tool_use')
    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const text = (data.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim()
      return cors({ answer: text || 'لم أستطع تكوين إجابة.' })
    }

    const results = []
    for (const tu of toolUses) {
      const out = await runTool(tu.name, tu.input)
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
    }
    messages.push({ role: 'user', content: results })
  }

  return cors({ answer: 'تعذّر إكمال البحث. حاول صياغة السؤال بشكل أوضح.' })
})
