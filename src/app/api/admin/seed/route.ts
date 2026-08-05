// One-off seeding of an empty Supabase database from the bundled data modules.
// Idempotent: a no-op once any row exists. Driven by `npm run seed`.
import { ApiError, json, requireAdmin } from '@/server/request'
import { seedSupabaseIfEmpty, usingSupabase } from '@/server/store'

export async function POST(req: Request) {
  try {
    requireAdmin(req)
    if (!usingSupabase) {
      return json({ error: 'Supabase is not configured — the file store seeds itself on first boot' }, 400)
    }
    return json(await seedSupabaseIfEmpty())
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: (e as Error).message || 'Seed failed' }, 500)
  }
}
