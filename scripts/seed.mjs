// One-time: seed an EMPTY Supabase database from the frontend data modules.
// Idempotent — a no-op once data exists.
//
// The seed data lives in TypeScript modules that only Next can compile, so this
// script drives the admin endpoint instead of importing the store directly.
// Start the app (npm run dev / npm start), then:
//
//   ADMIN_KEY=… node scripts/seed.mjs
//   API_URL=https://your-deployment node scripts/seed.mjs
//
// Supabase itself is configured through the app's own env
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

const BASE = process.env.API_URL || 'http://localhost:3000'
const ADMIN_KEY = process.env.ADMIN_KEY || 'nanorev-admin'

try {
  const res = await fetch(`${BASE}/api/admin/seed`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || `${res.status} ${res.statusText}`)

  if (result.seeded) {
    console.log('Seeded Supabase from src/data:', result.counts)
  } else {
    console.log(`Database already has ${result.existingRows} rows — nothing to seed.`)
  }
  process.exit(0)
} catch (e) {
  console.error('Seed failed:', e.message)
  console.error(`(Is the app running at ${BASE} with the right ADMIN_KEY?)`)
  process.exit(1)
}
