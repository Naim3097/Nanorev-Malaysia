'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { api } from '@/api/client'
import { useCart } from '@/context/CartContext'
import { rm } from '@/utils/format'
import type { OrderStatus, Totals } from '@/types'

export interface FunnelOrder {
  ref: string
  status: OrderStatus
  items: { id: string; name: string; volume: string; price: number; qty: number }[]
  totals: Totals
  payment: { method: string | null; receiptId: string | null }
}

const PAID: OrderStatus[] = ['paid', 'packing', 'dispatched', 'completed']
const POLL_MS = 3000
const MAX_POLLS = 20 // ~1 minute

/**
 * Payment result for a funnel buyer, in the funnel's own language and chrome.
 *
 * The buyer comes back from LeanX before (or instead of) the webhook, so the
 * order may still be `pending` on arrival — we poll our own status route, which
 * is the only thing allowed to decide. The browser's return is never proof.
 *
 * Crucially this NEVER shows an indefinite spinner: LeanX only calls back on
 * success, so a cancelled payment would otherwise hang here forever. After
 * MAX_POLLS we say plainly that no confirmation arrived and offer a retry.
 */
export default function FunnelReceipt({
  initial,
  token,
  slug,
  whatsapp,
}: {
  initial: FunnelOrder
  token: string
  slug: string
  whatsapp?: string
}) {
  const [order, setOrder] = useState(initial)
  const [polls, setPolls] = useState(0)
  const { clear } = useCart()

  const paid = PAID.includes(order.status)
  const failed = order.status === 'failed' || order.status === 'cancelled'
  const settled = paid || failed

  // The cart is kept through the redirect in case payment is abandoned; once
  // it's confirmed paid, it has served its purpose.
  useEffect(() => {
    if (paid) clear()
  }, [paid, clear])

  useEffect(() => {
    if (settled || polls >= MAX_POLLS) return undefined
    const id = setTimeout(async () => {
      try {
        setOrder(await api<FunnelOrder>(`/orders/${order.ref}/status?t=${encodeURIComponent(token)}`))
      } catch {
        /* transient — the next tick retries */
      }
      setPolls((n) => n + 1)
    }, POLL_MS)
    return () => clearTimeout(id)
  }, [order.ref, token, settled, polls])

  const wa = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hai NanoRev, saya ada soalan tentang pesanan ${order.ref}.`,
      )}`
    : null

  if (paid) {
    return (
      <Shell
        tone="ok"
        icon={<CheckCircle2 size={48} strokeWidth={1.5} />}
        title="Pembayaran berjaya!"
        lead={`Terima kasih. Pesanan ${order.ref} telah disahkan dan sedang diproses.`}
      >
        <div className="fr-lines">
          {order.items.map((i) => (
            <div key={i.id} className="fr-line">
              <span>
                {i.name} <em>{i.volume}</em> × {i.qty}
              </span>
              <span>{rm(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="fr-line fr-total">
            <span>Jumlah dibayar</span>
            <span>{rm(order.totals.total)}</span>
          </div>
        </div>
        <p className="fr-note">
          Resit {order.payment.receiptId ? <b>{order.payment.receiptId}</b> : null} dihantar melalui
          e-mel. Kami akan hubungi anda untuk penghantaran.
        </p>
        {wa && (
          <a className="btn btn-ghost btn-lg" href={wa} target="_blank" rel="noreferrer">
            Hubungi kami di WhatsApp
          </a>
        )}
      </Shell>
    )
  }

  if (failed) {
    return (
      <Shell
        tone="bad"
        icon={<XCircle size={48} strokeWidth={1.5} />}
        title="Pembayaran tidak selesai"
        lead={`Pesanan ${order.ref} ${
          order.status === 'cancelled' ? 'dibatalkan' : 'ditolak'
        } — anda TIDAK dicaj. Troli anda masih disimpan.`}
      >
        <Link href="/checkout" className="btn btn-primary btn-lg">
          Cuba bayar semula
        </Link>
        <Link href={`/l/${slug}`} className="fr-back">
          Kembali ke halaman produk
        </Link>
      </Shell>
    )
  }

  // Still pending. Be honest about which of the two it is.
  const gaveUp = polls >= MAX_POLLS
  return (
    <Shell
      tone="wait"
      icon={
        gaveUp ? <Clock size={48} strokeWidth={1.5} /> : <Loader2 size={48} strokeWidth={1.5} className="spin" />
      }
      title={gaveUp ? 'Pembayaran belum disahkan' : 'Mengesahkan pembayaran…'}
      lead={
        gaveUp
          ? `Kami belum menerima pengesahan untuk pesanan ${order.ref}. Jika anda membatalkan pembayaran, anda tidak dicaj. Jika anda sudah membayar, simpan nombor rujukan ini dan hubungi kami — kami akan semak.`
          : `Pesanan ${order.ref}. Biasanya mengambil beberapa saat. Jangan tutup halaman ini.`
      }
    >
      {gaveUp && (
        <>
          <Link href="/checkout" className="btn btn-primary btn-lg">
            Cuba bayar semula
          </Link>
          {wa && (
            <a className="fr-back" href={wa} target="_blank" rel="noreferrer">
              Hubungi kami di WhatsApp
            </a>
          )}
        </>
      )}
    </Shell>
  )
}

function Shell({
  tone,
  icon,
  title,
  lead,
  children,
}: {
  tone: 'ok' | 'bad' | 'wait'
  icon: React.ReactNode
  title: string
  lead: string
  children?: React.ReactNode
}) {
  return (
    <div className="landing">
      <div className="wrap">
        <div className={`fr-card fr-${tone}`}>
          <div className="fr-icon">{icon}</div>
          <h1>{title}</h1>
          <p className="fr-lead">{lead}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
