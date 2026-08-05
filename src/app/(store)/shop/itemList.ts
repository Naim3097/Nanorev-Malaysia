import { readStore } from '@/server/read'
import { SITE_URL } from '@/data/company'

/** ItemList structured data for a shop view, built from live catalogue data. */
export async function itemListJsonLd(catId?: string, name = 'All products') {
  const data = await readStore()
  const list = data.products.filter((p) => p.active && (!catId || p.cat === catId)).slice(0, 20)
  return [
    {
      '@type': 'ItemList',
      name,
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${p.name} ${p.grade}`,
        url: `${SITE_URL}/product/${p.id}`,
      })),
    },
  ]
}
