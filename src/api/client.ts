// Thin fetch wrapper for the NanoRev API (Next route handlers under /api).
// Storefront calls are best-effort: callers fall back to the static data
// modules when the API is unreachable, so the store never goes blank.

export interface ApiOptions {
  method?: string
  body?: unknown
  key?: string
}

/** Error carrying the HTTP status, so callers can tell 404 from a network failure. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = unknown>(path: string, { method = 'GET', body, key }: ApiOptions = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(key ? { 'x-admin-key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}) as { error?: string })
    throw new ApiError(payload.error || `${res.status} ${res.statusText}`, res.status)
  }
  return res.json() as Promise<T>
}

// fire-and-forget — telemetry/bookkeeping must never block the shopper
export function apiQuiet<T = unknown>(path: string, opts?: ApiOptions): Promise<T | null> {
  return api<T>(path, opts).catch(() => null)
}
