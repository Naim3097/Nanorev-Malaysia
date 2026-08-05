import { json, requireAdmin } from '@/server/request'
import { TEMPLATES } from '@/server/templates'

export function GET(req: Request) {
  requireAdmin(req)
  return json(
    TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      sections: t.sections.map((s) => s.type),
    })),
  )
}
