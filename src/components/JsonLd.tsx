// Structured data for search engines and AI crawlers. Rendered server-side
// into the page HTML, replacing the old runtime document.head injection.
export default function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data.map((n) => ({ '@context': 'https://schema.org', ...n }))),
      }}
    />
  )
}
