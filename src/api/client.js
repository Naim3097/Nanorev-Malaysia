// Thin fetch wrapper for the NanoRev backend (Vite proxies /api → :4000).
// Storefront calls are best-effort: callers fall back to the static data
// modules when the API is unreachable, so the store never goes blank.

export async function api(path, { method = 'GET', body, key } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(key ? { 'x-admin-key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `${res.status} ${res.statusText}`)
    err.status = res.status // callers distinguish 404 (gone) from network failure
    throw err
  }
  return res.json()
}

// fire-and-forget — telemetry/bookkeeping must never block the shopper
export function apiQuiet(path, opts) {
  return api(path, opts).catch(() => null)
}
