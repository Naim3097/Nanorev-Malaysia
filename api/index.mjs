// Vercel serverless entry for the NanoRev API.
//
// vercel.json rewrites every /api/* request (any depth) to this single function
// via `{ "source": "/api/(.*)", "destination": "/api" }`. Vercel preserves the
// original request URL, so the Express routes (defined under /api/*) match as-is.
//
// The Express app is stateless per request (server/store.mjs reloads from
// Supabase before each request and flushes after), so ephemeral serverless
// instances are safe. `app.listen` is guarded behind !process.env.VERCEL, so
// importing the app here does not bind a port.
import app from '../server/index.mjs'

export default function handler(req, res) {
  // Defensive: ensure the path Express sees is under /api even if a rewrite
  // ever delivers it without the prefix.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url)
  }
  return app(req, res)
}
