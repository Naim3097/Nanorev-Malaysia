// Closed funnels: /l/* landing pages have no navbar, drawer or footer — the
// only exits are checkout and WhatsApp. /admin is chrome-less for the same
// reason: it is a tool, not a storefront page.
export default function FunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <main className="app-main">{children}</main>
    </div>
  )
}
