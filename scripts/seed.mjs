// One-time: seed an EMPTY Supabase database from the frontend data modules.
// Idempotent — a no-op once data exists. Run after creating the project and
// applying server/schema.sql:
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed.mjs
//   (or put them in .env.local / .env and just: node scripts/seed.mjs)
import '../server/env.mjs'
import { seedSupabaseIfEmpty } from '../server/store.mjs'

try {
  const result = await seedSupabaseIfEmpty()
  if (result.seeded) {
    console.log('Seeded Supabase from src/data:', result.counts)
  } else {
    console.log(`Database already has ${result.existingRows} rows — nothing to seed.`)
  }
  process.exit(0)
} catch (e) {
  console.error('Seed failed:', e.message)
  process.exit(1)
}
