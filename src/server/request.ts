// Request plumbing shared by every route handler: store lifecycle, admin auth,
// rate limiting and error shaping.
//
// Two persistence modes, chosen by environment — the same split the Express
// backend used, because the trade-off is unchanged:
//
// • Serverless (Vercel): an instance can be frozen or discarded between
//   invocations, so nothing may be left only in memory. Reload the working set
//   before each request and flush mutations BEFORE the response is sent.
//
// • Long-lived (next start / Railway / a VPS): prime the working set once, then
//   serve reads straight from memory — no per-request database round-trip.
//   Handlers mutate memory and a debounced background flush persists it. This
//   is what keeps high-frequency writes (affiliate click counters) cheap.
//
// Writes are serialised through a promise chain in both modes. Fluid Compute
// reuses one instance across CONCURRENT invocations, so two writes could
// otherwise interleave on the shared working set and lose an update.

import { getStore, type Store } from './store'

export const ADMIN_KEY = process.env.ADMIN_KEY || 'nanorev-admin'

const IS_SERVERLESS = !!process.env.VERCEL
const FLUSH_DEBOUNCE_MS = 300

/** Thrown by handlers to return a JSON error with a status. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const json = (body: unknown, status = 200) =>
  Response.json(body as Record<string, unknown>, { status })

export const bad = (message: string, status = 400) => new ApiError(status, message)

let writeChain: Promise<unknown> = Promise.resolve()

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.catch(() => undefined)
  return run
}

// ── long-lived mode: prime once, flush in the background ──────────
let primed: Promise<void> | null = null
const prime = (store: Store) => (primed ??= store.reload({ force: true }))

let flushTimer: ReturnType<typeof setTimeout> | null = null
function scheduleFlush(store: Store) {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    store.flush().catch((e: Error) => {
      console.error('[store] flush failed, will retry:', e.message)
      scheduleFlush(store)
    })
  }, FLUSH_DEBOUNCE_MS)
}

// Exit handlers can't await, so flush on the signals a host sends on shutdown.
if (!IS_SERVERLESS && !(globalThis as { __nanorevShutdown?: boolean }).__nanorevShutdown) {
  ;(globalThis as { __nanorevShutdown?: boolean }).__nanorevShutdown = true
  const shutdown = async () => {
    try {
      if (primed) await (await getStore()).flush()
    } catch { /* logged by flush */ }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

type Handler = (store: Store) => Promise<Response> | Response

async function run(handler: Handler, write: boolean, durable = false): Promise<Response> {
  const store = await getStore()
  try {
    if (IS_SERVERLESS) await store.reload({ force: write })
    else await prime(store)
  } catch (e) {
    primed = null // a failed prime must not be cached
    console.error('[store] reload failed:', (e as Error).message)
    return json({ error: 'Store temporarily unavailable' }, 503)
  }

  let res: Response
  try {
    res = await handler(store)
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Internal server error' }, 500)
  }

  if (write) {
    if (IS_SERVERLESS || durable) {
      try {
        await store.flush()
      } catch (e) {
        console.error('[store] flush failed:', (e as Error).message)
        return json({ error: 'Failed to save changes' }, 500)
      }
    } else {
      scheduleFlush(store)
    }
  }
  return res
}

/** Read path: no flush, no serialisation. */
export function withStore(handler: Handler): Promise<Response> {
  return run(handler, false)
}

/** Write path: serialised against other writes, then persisted. */
export function withStoreWrite(handler: Handler): Promise<Response> {
  return serialize(() => run(handler, true))
}

/**
 * Write path for money: never returns until the change is durable.
 *
 * The debounced flush on long-lived hosts is right for click counters and
 * wrong for payments. Two concrete failures it prevents:
 *
 *  • create-bill — the buyer is handed to the gateway before the pending order
 *    reaches disk. A crash in that window loses the order while the customer
 *    pays, and the webhook then matches nothing.
 *  • webhook — answering 200 tells the gateway to stop redelivering. If `paid`
 *    is still only in memory, a crash loses the sale with no retry coming.
 *
 * It also removes a visible race: page routes and route handlers are separate
 * module instances, so an unflushed write is invisible to the page the buyer
 * is redirected to.
 */
export function withStoreDurable(handler: Handler): Promise<Response> {
  return serialize(() => run(handler, true, true))
}

/** Throws 401 unless the request carries the admin key. */
export function requireAdmin(req: Request) {
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) throw new ApiError(401, 'Invalid admin key')
}

export function isAdmin(req: Request) {
  return req.headers.get('x-admin-key') === ADMIN_KEY
}

/**
 * Parse a JSON body, tolerating an empty one.
 *
 * Call this INSIDE a withStore/withStoreWrite callback: the ApiError it throws
 * on malformed JSON is only turned into a 400 by the wrapper's catch. Parsing
 * outside would let it escape as an unhandled 500.
 */
export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return ((await req.json()) ?? {}) as T
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
}

// Simple fixed-window rate limiter per IP — abuse guard on write endpoints.
// Per-instance, like the Express original: a best-effort brake, not a quota.
const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(req: Request, scope: string, limit: number, windowMs = 60_000) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const key = `${ip}:${scope}`
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count > limit) throw new ApiError(429, 'Too many requests — try again shortly')
}
