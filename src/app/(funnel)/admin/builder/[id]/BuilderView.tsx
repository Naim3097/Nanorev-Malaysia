'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Copy, ExternalLink, GripVertical, Monitor, Plus, Redo2,
  Smartphone, Trash2, Undo2,
} from 'lucide-react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/api/client'
import { SectionForm, type EditableProps } from '@/builder/fields'
import { SECTION_DEFS } from '@/builder/schema'
import { renderSection, type LandingCtx, type Pack } from '@/landing/sections'
import { FREE_DELIVERY_THRESHOLD } from '@/utils/pricing'
import { useIsMobile } from '@/utils/useIsMobile'
import type {
  AffiliateLink, LandingPage, PacksProps, PaymentGateway, Product, Section, SectionType, StoredProduct,
} from '@/types'

// Visual landing-page builder (/admin/builder/[id]): section library (left) →
// live WYSIWYG canvas with drag-to-reorder (middle) → schema-driven properties
// panel (right). Edits update the canvas instantly; Save publishes to the
// backend the storefront serves.

/** A section while it is being edited — `uid` is a client-only drag identity. */
type BuilderSection = Section & { uid: string }

/** Page fields the builder edits; sections are held in their own state. */
type PageMeta = Omit<LandingPage, 'sections'>

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'

const uid = () => crypto.randomUUID()
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const HISTORY_COALESCE_MS = 800

// Stand-in so the canvas still renders before the product list arrives.
const PLACEHOLDER_PRODUCT: Product = {
  id: '', name: '—', cat: '', price: 0, grade: '', tile: '?', volume: '', base: '', spec: '',
}

function SortableSection({
  section,
  selected,
  onSelect,
  children,
}: {
  section: BuilderSection
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.uid })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`bsec ${selected ? 'sel' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault() }}
    >
      <div className="bsec-handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <GripVertical size={15} />
      </div>
      <span className="bsec-tag">{SECTION_DEFS[section.type]?.label || section.type}</span>
      {children}
    </div>
  )
}

export default function BuilderView({ id }: { id: string }) {
  const isMobile = useIsMobile()
  const [key, setKey] = useState<string | null>(null)

  const [page, setPage] = useState<PageMeta | null>(null) // meta only
  const [sections, setSections] = useState<BuilderSection[]>([])
  const [products, setProducts] = useState<StoredProduct[]>([])
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [loadError, setLoadError] = useState('')

  const history = useRef<{ past: BuilderSection[][]; future: BuilderSection[][]; lastPush: number }>({
    past: [], future: [], lastPush: 0,
  })
  const sectionsRef = useRef<BuilderSection[]>([])
  useEffect(() => { sectionsRef.current = sections }, [sections])

  // localStorage is browser-only, so the key resolves after mount
  useEffect(() => { setKey(localStorage.getItem('nanorev.adminKey') || '') }, [])

  // ── load ──
  useEffect(() => {
    if (key === null) return
    if (!key) { setLoadError('auth'); return }
    Promise.all([
      api<LandingPage>(`/admin/pages/${id}`, { key }),
      api<StoredProduct[]>('/admin/products', { key }),
      api<AffiliateLink[]>('/admin/links', { key }),
    ])
      .then(([p, prods, lks]) => {
        const { sections: secs, ...meta } = p
        setPage(meta)
        setSections((secs || []).map((s) => ({ ...clone(s), uid: uid() })))
        setProducts(prods)
        setLinks(lks)
      })
      .catch((e: Error) => setLoadError(e.message === 'Invalid admin key' ? 'auth' : e.message))
  }, [id, key])

  // ── history + mutations ──
  // History side effects live OUTSIDE setState updaters: StrictMode
  // double-invokes updaters, so mutating refs inside them corrupts the stack.
  const commit = useCallback(
    (
      next: BuilderSection[] | ((prev: BuilderSection[]) => BuilderSection[]),
      { coalesce = false }: { coalesce?: boolean } = {},
    ) => {
      const prev = sectionsRef.current
      const value = typeof next === 'function' ? next(prev) : next
      if (value === prev) return
      const t = Date.now()
      if (!coalesce || t - history.current.lastPush > HISTORY_COALESCE_MS) {
        history.current.past.push(prev)
        if (history.current.past.length > 60) history.current.past.shift()
        history.current.lastPush = t
      }
      history.current.future = []
      sectionsRef.current = value
      setSections(value)
      setSaveState('unsaved')
    },
    [],
  )

  const undo = useCallback(() => {
    const last = history.current.past.pop()
    if (!last) return
    history.current.future.unshift(sectionsRef.current)
    history.current.lastPush = 0 // next edit starts a fresh history entry
    sectionsRef.current = last
    setSections(last)
    setSaveState('unsaved')
  }, [])
  const redo = useCallback(() => {
    const next = history.current.future.shift()
    if (!next) return
    history.current.past.push(sectionsRef.current)
    history.current.lastPush = 0
    sectionsRef.current = next
    setSections(next)
    setSaveState('unsaved')
  }, [])

  const persist = useCallback(
    async (meta: PageMeta) => {
      setSaveState('saving')
      try {
        await api(`/admin/pages/${id}`, {
          method: 'PUT',
          key: key ?? '',
          body: { ...meta, sections: sections.map(({ uid: _u, ...s }) => s) },
        })
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    },
    [id, key, sections],
  )

  const save = useCallback(() => { if (page) persist(page) }, [page, persist])

  // publish / unpublish in one click: flip status and save together
  const setStatus = useCallback(
    (status: LandingPage['status']) => {
      if (!page) return
      const next = { ...page, status }
      setPage(next)
      persist(next)
    },
    [page, persist],
  )

  // keyboard: undo/redo/save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
      if (k === 's') { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, save])

  // ── dnd ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    commit((prev) => {
      const from = prev.findIndex((s) => s.uid === active.id)
      const to = prev.findIndex((s) => s.uid === over.id)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  // ── canvas ctx (same shape the live landing page provides to sections) ──
  const product = useMemo(
    () => products.find((p) => p.id === page?.productId) || products[0] || null,
    [products, page?.productId],
  )
  const packsSection = sections.find((s) => s.type === 'packs')
  const quantities = (packsSection?.props as PacksProps | undefined)?.quantities ?? [{ qty: 1 }]
  const packs: Pack[] = quantities.map(({ qty: q, note, highlight }) => ({
    qty: q,
    note,
    highlight,
    total: (product?.price || 0) * q,
    freeDelivery: (product?.price || 0) * q >= FREE_DELIVERY_THRESHOLD,
  }))

  const selected = sections.find((s) => s.uid === selectedUid)
  const previewSlug = links.find((l) => l.pageId === id && !l.workshopId)?.slug

  const addSection = (type: SectionType) => {
    // defaultProps is the schema's own declaration of this section type's
    // shape, so it satisfies the union member `type` selects.
    const s = { uid: uid(), type, props: clone(SECTION_DEFS[type].defaultProps) } as unknown as BuilderSection
    commit((prev) => [...prev, s])
    setSelectedUid(s.uid)
  }
  const removeSelected = () => {
    commit((prev) => prev.filter((s) => s.uid !== selectedUid))
    setSelectedUid(null)
  }
  const duplicateSelected = () => {
    if (!selected) return
    const copy = { ...clone(selected), uid: uid() }
    commit((prev) => {
      const i = prev.findIndex((s) => s.uid === selectedUid)
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return next
    })
    setSelectedUid(copy.uid)
  }

  // the builder needs a desktop viewport — three panes don't fit a phone
  if (isMobile) {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <h2>Page builder is desktop-only</h2>
          <p>Open this on a laptop or desktop to design landing pages. Everything else in the admin works on mobile.</p>
          <Link href="/admin" className="btn btn-primary">Back to admin</Link>
        </div>
      </div>
    )
  }

  if (loadError === 'auth') {
    return (
      <div className="wrap page">
        <div className="empty-state">
          <h2>Admin sign-in required</h2>
          <p>Sign in at the admin panel first, then reopen the builder.</p>
          <Link href="/admin" className="btn btn-primary">Go to /admin</Link>
        </div>
      </div>
    )
  }
  if (loadError) return <div className="wrap page"><p>Failed to load page: {loadError}</p></div>
  if (!page) return <div className="wrap page"><p>Loading builder…</p></div>

  const ctx: LandingCtx = {
    product: product ?? PLACEHOLDER_PRODUCT,
    page: { ...page, sections },
    workshop: null,
    qty: packs[0]?.qty || 1,
    setQty: () => {},
    packs,
    selected: packs[0],
    buyNow: () => {},
    waHref: '#',
    buyLabel: page.buyLabel || 'Beli Sekarang',
  }

  const touch = (next: PageMeta) => { setPage(next); setSaveState('unsaved') }

  return (
    <div className="builder">
      {/* ── toolbar ── */}
      <div className="btoolbar">
        <div className="bt-left">
          <Link href="/admin" className="bicon" title="Back to admin"><ArrowLeft size={17} /></Link>
          <b>{page.name}</b>
          <span className={`pill ${page.status}`}>{page.status}</span>
        </div>
        <div className="bt-mid">
          <button className={`bicon ${viewport === 'desktop' ? 'on' : ''}`} title="Desktop" onClick={() => setViewport('desktop')}><Monitor size={16} /></button>
          <button className={`bicon ${viewport === 'mobile' ? 'on' : ''}`} title="Mobile (anggaran)" onClick={() => setViewport('mobile')}><Smartphone size={16} /></button>
          <span className="bt-sep" />
          <button className="bicon" title="Undo (Ctrl+Z)" onClick={undo}><Undo2 size={16} /></button>
          <button className="bicon" title="Redo (Ctrl+Y)" onClick={redo}><Redo2 size={16} /></button>
        </div>
        <div className="bt-right">
          {previewSlug && (
            <a className="btn btn-ghost" style={{ padding: '8px 14px' }} href={`/l/${previewSlug}/preview`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Preview
            </a>
          )}
          <button className="btn btn-ghost" style={{ padding: '9px 16px' }} onClick={save} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Retry save' : 'Save'}
          </button>
          {page.status === 'published' ? (
            <button
              className="btn btn-ghost"
              style={{ padding: '9px 16px' }}
              onClick={() => setStatus('draft')}
              disabled={saveState === 'saving'}
              title="Revert to draft — hides the page from the public"
            >
              Unpublish
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ padding: '9px 20px', background: '#16a34a', borderColor: '#16a34a' }}
              onClick={() => setStatus('published')}
              disabled={saveState === 'saving'}
              title="Publish — make this page live to the public"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="bbody">
        {/* ── section library ── */}
        <aside className="blib">
          <h4>Seksyen</h4>
          {Object.entries(SECTION_DEFS).map(([type, def]) => (
            <button key={type} className="blib-item" onClick={() => addSection(type as SectionType)}>
              <span className="t"><Plus size={13} /> {def.label}</span>
              <span className="d">{def.description}</span>
            </button>
          ))}
        </aside>

        {/* ── canvas ── */}
        <main className="bcanvas" onClick={() => setSelectedUid(null)}>
          <div
            className={`bpage landing ${viewport === 'mobile' ? 'vp-mobile' : ''}`}
            style={{ width: viewport === 'mobile' ? 390 : '100%' }}
          >
            {sections.length === 0 && (
              <div className="bempty">Halaman kosong — tambah seksyen dari senarai kiri.</div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                {sections.map((s) => (
                  <SortableSection key={s.uid} section={s} selected={selectedUid === s.uid} onSelect={() => setSelectedUid(s.uid)}>
                    {renderSection(s, ctx) ?? <div className="bempty">Unknown section: {s.type}</div>}
                  </SortableSection>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </main>

        {/* ── properties ── */}
        <aside className="bprops">
          {selected ? (
            <>
              <div className="bprops-head">
                <h4>{SECTION_DEFS[selected.type]?.label || selected.type}</h4>
                <span>
                  <button className="bicon" title="Duplicate" onClick={duplicateSelected}><Copy size={15} /></button>
                  <button className="bicon danger" title="Delete" onClick={removeSelected}><Trash2 size={15} /></button>
                </span>
              </div>
              <SectionForm
                def={SECTION_DEFS[selected.type] || { fields: [] }}
                props={(selected.props ?? {}) as unknown as EditableProps}
                onChange={(props) =>
                  commit(
                    // The form only writes keys the section's schema declares,
                    // so the edited props stay within the union member's shape.
                    (prev) => prev.map((s) => (s.uid === selected.uid ? ({ ...s, props } as unknown as BuilderSection) : s)),
                    { coalesce: true },
                  )
                }
              />
            </>
          ) : (
            <>
              <div className="bprops-head"><h4>Tetapan halaman</h4></div>
              <div className="bfield"><label>Nama halaman</label>
                <input value={page.name} onChange={(e) => touch({ ...page, name: e.target.value })} /></div>
              <div className="bfield"><label>Produk</label>
                <select value={page.productId} onChange={(e) => touch({ ...page, productId: e.target.value })}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.grade} ({p.id})</option>)}
                </select></div>
              <div className="bfield"><label>WhatsApp</label>
                <input value={page.whatsapp || ''} onChange={(e) => touch({ ...page, whatsapp: e.target.value })} /></div>
              <div className="bfield"><label>Mesej WhatsApp</label>
                <textarea rows={2} value={page.waText || ''} onChange={(e) => touch({ ...page, waText: e.target.value })} /></div>
              <div className="bfield"><label>Label butang beli</label>
                <input value={page.buyLabel || ''} onChange={(e) => touch({ ...page, buyLabel: e.target.value })} /></div>
              <div className="bfield">
                <label>Gerbang pembayaran</label>
                <select
                  value={page.paymentGateway || 'mock'}
                  onChange={(e) => touch({ ...page, paymentGateway: e.target.value as PaymentGateway })}
                >
                  <option value="mock">Simulasi (ujian sahaja)</option>
                  <option value="leanx">LeanX — bayaran sebenar</option>
                </select>
                {page.paymentGateway === 'leanx' && (
                  <p className="bhint" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    Halaman ini menerima bayaran SEBENAR melalui FPX / e-wallet.
                  </p>
                )}
              </div>
              <div className="bprops-head" style={{ marginTop: 18 }}><h4>SEO</h4></div>
              <div className="bfield"><label>Title</label>
                <input value={page.seo?.title || ''} onChange={(e) => touch({ ...page, seo: { ...page.seo, title: e.target.value } })} /></div>
              <div className="bfield"><label>Description</label>
                <textarea rows={3} value={page.seo?.description || ''} onChange={(e) => touch({ ...page, seo: { ...page.seo, description: e.target.value } })} /></div>
              <div className="bfield"><label>Keywords</label>
                <textarea rows={2} value={page.seo?.keywords || ''} onChange={(e) => touch({ ...page, seo: { ...page.seo, keywords: e.target.value } })} /></div>
              <p className="bhint">Klik seksyen di kanvas untuk edit kandungannya. Seret pemegang ⋮⋮ untuk susun semula.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
