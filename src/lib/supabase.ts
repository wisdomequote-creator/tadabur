import { createClient } from '@supabase/supabase-js'

// Public project URL + publishable (anon) key — safe to ship in the client.
// Overridable via VITE_ env vars. The anon key can only read `search_docs`
// (RLS: public select), so exposing it is by design.
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://trayvufbjxkkntbpdtie.supabase.co'
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'sb_publishable_lAK4qJP1RvqGG_efufsO7A_73MCilpF'

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
