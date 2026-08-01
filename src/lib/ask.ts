// Client for the Supabase "ask" Edge Function (the AI helper). The edge function
// holds the Anthropic key server-side; here we only send the conversation.
// verify_jwt is on, so we authenticate with the public legacy anon JWT.

const BASE =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://trayvufbjxkkntbpdtie.supabase.co'
const ANON_JWT =
  (import.meta.env.VITE_SUPABASE_ANON_JWT as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYXl2dWZianhra250YnBkdGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTc0MzIsImV4cCI6MjEwMDYzMzQzMn0.nvyyMZ2fmjW4sw8FO6twgh94JRiULMDsz71Xv5jmQrg'

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function ask(messages: ChatMsg[]): Promise<string> {
  const res = await fetch(`${BASE}/functions/v1/ask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_JWT}`,
      apikey: ANON_JWT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })
  const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string }
  if (!res.ok) throw new Error(data.error || 'تعذّر الاتصال بالمساعد.')
  return data.answer ?? ''
}
