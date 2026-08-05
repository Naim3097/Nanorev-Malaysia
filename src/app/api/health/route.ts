// Cheap liveness probe — deliberately does no store I/O.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ ok: true, time: new Date().toISOString() })
}
