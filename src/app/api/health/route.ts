import { baseUrl, leanxConfigured } from '@/server/leanx'

// Cheap liveness probe — deliberately does no store I/O.
//
// It also reports the callback origin. That single value decides whether a
// payment can ever be confirmed: LeanX posts its result to `${callbackOrigin}
// /api/payments/leanx/webhook`, and if that origin is wrong or unreachable the
// customer is charged while the order stays pending forever, silently. It is
// not a secret — it is the public address of this deployment — but it is
// otherwise impossible to read back once the env var is marked sensitive.

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
    payments: {
      leanxConfigured: leanxConfigured(),
      callbackOrigin: baseUrl(),
      callbackUrl: `${baseUrl()}/api/payments/leanx/webhook`,
    },
  })
}
