import Link from 'next/link'
import { Store } from 'lucide-react'

export default function LandingNotFound() {
  return (
    <div className="wrap page">
      <div className="empty-state">
        <div className="big"><Store size={44} strokeWidth={1.4} /></div>
        <h2>Halaman tidak dijumpai</h2>
        <p>Pautan ini tidak sah atau telah tamat tempoh.</p>
        <Link href="/shop" className="btn btn-primary">Lihat semua produk</Link>
      </div>
    </div>
  )
}
