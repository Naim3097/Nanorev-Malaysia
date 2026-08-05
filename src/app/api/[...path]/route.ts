// Unknown /api routes answer with JSON, never Next's HTML 404 page — API
// clients parse every response as JSON. Concrete routes match first, so this
// only ever catches genuine misses.
const notFound = () => Response.json({ error: 'Not found' }, { status: 404 })

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
