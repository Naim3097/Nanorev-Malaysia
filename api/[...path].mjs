// Vercel serverless entry for the NanoRev API.
//
// vercel.json routes every /api/* request here; Vercel invokes this function
// per request. The Express app is stateless per request (server/store.mjs
// reloads from Supabase before each request and flushes after), so ephemeral
// serverless instances are safe — nothing has to survive between invocations.
//
// The app also guards `app.listen` behind !process.env.VERCEL, so importing it
// here does not try to bind a port.
import app from '../server/index.mjs'

export default function handler(req, res) {
  // The Express routes are defined under /api/*. Vercel normally preserves the
  // original path; guard in case a rewrite delivers it without the prefix.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url)
  }
  return app(req, res)
}
