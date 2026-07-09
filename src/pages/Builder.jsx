import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Copy, ExternalLink, GripVertical, Monitor, Plus, Redo2,
  Smartphone, Trash2, Undo2,
} from 'lucide-react'
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../api/client'
import { SECTIONS } from '../landing/sections'
import { SECTION_DEFS } from '../builder/schema'
import { SectionForm } from '../builder/fields'
import { FREE_DELIVERY_THRESHOLD } from '../utils/pricing'
import { useSeo } from '../utils/useSeo'
import { useIsMobile } from '../utils/useIsMobile'

// Visual landing-page builder (/admin/builder/:id) — Nexova-style:
// section library (left) → live WYSIWYG canvas with drag-to-reorder
// (middle) → schema-driven properties panel (right). Edits update the
// canvas instantly; Save publishes to the backend the storefront serves.

const uid = () => crypto.randomUUID()
const clone = (x) => JSON.parse(JSON.stringify(x))
const HISTORY_COALESCE_MS = 800

function SortableSection({ section, selected, onSelect, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.uid })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`bsec ${selected ? 'sel' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onClickCapture={(e) => { if (e.target.closest('a')) e.preventDefault() }}
    >
      <div className="bsec-handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <GripVertical size={15} />
      </div>
      <span className="bsec-tag">{SECTION_DEFS[section.type]?.label || section.type}</span>
      {children}
    </div>
  )
}

export default function Builder() {
  useSeo({ title: 'Page Builder | NanoRev Admin', robots: 'noindex, nofollow' }, [])
  const isMobile = useIsMobile()
  const { id } = useParams()
  const key = localStorage.getItem('nanorev.adminKey') || ''

  const [page, setPage] = useState(null) // meta only
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [links, setLinks] = useState([])
  const [selectedUid, setSelectedUid] = useState(null)
  const [viewport, setViewport] = useState('desktop')
  const [saveState, setSaveState] = useState('saved') // saved | unsaved | saving | error
  const [loadError, setLoadError] = useState('')

  const history = useRef({ past: [], future: [], lastPush: 0 })
  const sectionsRef = useRef([])
  useEffect(() => { sectionsRef.current = sections }, [sections])

  // ── load ──
  useEffect(() => {
    if (!key) { setLoadError('auth'); return }
    Promise.all([
      api(`/admin/pages/${id}`, { key }),
      api('/admin/products', { key }),
      api('/admin/links', { key }),
    ])
      .then(([p, prods, lks]) => {
        const { sections: secs, ...meta } = p
        setPage(meta)
        setSections((secs || []).map((s) => ({ ...clone(s), uid: uid() })))
        setProducts(prods)
        setLinks(lks)
      })
      .catch((e) => setLoadError(e.message === 'Invalid admin key' ? 'auth' : e.message))
  }, [id, key])

  // ── history + mutations ──
  // History side effects live OUTSIDE setState updaters: StrictMode
  // double-invokes updaters, so mutating refs inside them corrupts the stack.
  const commit = useCallback((next, { coalesce = false } = {}) => {
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
  }, [])

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

  const save = useCallback(async () => {
    setSaveState('saving')
    try {
      await api(`/admin/pages/${id}`, {
        method: 'PUT',
        key,
        body: { ...page, sections: sections.map(({ uid: _u, ...s }) => s) },
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [id, key, page, sections])

  // keyboard: undo/redo/save
  useEffect(() => {
    const onKey = (e) => {
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
  const onDragEnd = ({ active, over }) => {
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

  // ── canvas ctx (same shape SalesLanding provides to sections) ──
  const product = useMemo(
    () => products.find((p) => p.id === page?.productId) || products[0] || null,
    [products, page?.productId],
  )
  const packsProps = sections.find((s) => s.type === 'packs')?.props
  const packs = (packsProps?.quantities || [{ qty: 1 }]).map(({ qty: q, note, highlight }) => ({
    qty: q, note, highlight,
    total: (product?.price || 0) * q,
    freeDelivery: (product?.price || 0) * q >= FREE_DELIVERY_THRESHOLD,
  }))
  const ctx = {
    product: product || { name: '—', grade: '', price: 0, volume: '', base: '', spec: '', tile: '?' },
    page, workshop: null, qty: packs[0]?.qty || 1, setQty: () => {},
    packs, selected: packs[0], buyNow: () => {}, waHref: '#',
    buyLabel: page?.buyLabel || 'Beli Sekarang',
  }

  const selected = sections.find((s) => s.uid === selectedUid)
  const previewSlug = links.find((l) => l.pageId === id && !l.workshopId)?.slug

  const addSection = (type) => {
    const s = { uid: uid(), type, props: clone(SECTION_DEFS[type].defaultProps) }
    commit((prev) => [...prev, s])
    setSelectedUid(s.uid)
  }
  const removeSelected = () => {
    commit((prev) => prev.filter((s) => s.uid !== selectedUid))
    setSelectedUid(null)
  }
  const duplicateSelected = () => {
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
          <Link to="/admin" className="btn btn-primary">Back to admin</Link>
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
          <Link to="/admin" className="btn btn-primary">Go to /admin</Link>
        </div>
      </div>
    )
  }
  if (loadError) return <div className="wrap page"><p>Failed to load page: {loadError}</p></div>
  if (!page) return <div className="wrap page"><p>Loading builder…</p></div>

  return (
    <div className="builder">
      {/* ── toolbar ── */}
      <div className="btoolbar">
        <div className="bt-left">
          <Link to="/admin" className="bicon" title="Back to admin"><ArrowLeft size={17} /></Link>
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
            <a className="btn btn-ghost" style={{ padding: '8px 14px' }} href={`/l/${previewSlug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Pratonton
            </a>
          )}
          <select value={page.status} onChange={(e) => { setPage({ ...page, status: e.target.value }); setSaveState('unsaved') }}>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
          <button className="btn btn-primary" style={{ padding: '9px 20px' }} onClick={save} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Retry save' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bbody">
        {/* ── section library ── */}
        <aside className="blib">
          <h4>Seksyen</h4>
          {Object.entries(SECTION_DEFS).map(([type, def]) => (
            <button key={type} className="blib-item" onClick={() => addSection(type)}>
              <span className="t"><Plus size={13} /> {def.label}</span>
              <span className="d">{def.description}</span>
            </button>
          ))}
        </aside>

        {/* ── canvas ── */}
        <main className="bcanvas" onClick={() => setSelectedUid(null)}>
          <div className={`bpage landing ${viewport === 'mobile' ? 'vp-mobile' : ''}`}
            style={{ width: viewport === 'mobile' ? 390 : '100%' }}>
            {sections.length === 0 && (
              <div className="bempty">Halaman kosong — tambah seksyen dari senarai kiri.</div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                {sections.map((s) => {
                  const Section = SECTIONS[s.type]
                  return (
                    <SortableSection key={s.uid} section={s} selected={selectedUid === s.uid} onSelect={() => setSelectedUid(s.uid)}>
                      {Section ? <Section props={s.props || {}} ctx={ctx} /> : <div className="bempty">Unknown section: {s.type}</div>}
                    </SortableSection>
                  )
                })}
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
                props={selected.props || {}}
                onChange={(props) =>
                  commit((prev) => prev.map((s) => (s.uid === selected.uid ? { ...s, props } : s)), { coalesce: true })
                }
              />
            </>
          ) : (
            <>
              <div className="bprops-head"><h4>Tetapan halaman</h4></div>
              <div className="bfield"><label>Nama halaman</label>
                <input value={page.name} onChange={(e) => { setPage({ ...page, name: e.target.value }); setSaveState('unsaved') }} /></div>
              <div className="bfield"><label>Produk</label>
                <select value={page.productId} onChange={(e) => { setPage({ ...page, productId: e.target.value }); setSaveState('unsaved') }}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.grade} ({p.id})</option>)}
                </select></div>
              <div className="bfield"><label>WhatsApp</label>
                <input value={page.whatsapp || ''} onChange={(e) => { setPage({ ...page, whatsapp: e.target.value }); setSaveState('unsaved') }} /></div>
              <div className="bfield"><label>Mesej WhatsApp</label>
                <textarea rows={2} value={page.waText || ''} onChange={(e) => { setPage({ ...page, waText: e.target.value }); setSaveState('unsaved') }} /></div>
              <div className="bfield"><label>Label butang beli</label>
                <input value={page.buyLabel || ''} onChange={(e) => { setPage({ ...page, buyLabel: e.target.value }); setSaveState('unsaved') }} /></div>
              <div className="bprops-head" style={{ marginTop: 18 }}><h4>SEO</h4></div>
              <div className="bfield"><label>Title</label>
                <input value={page.seo?.title || ''} onChange={(e) => { setPage({ ...page, seo: { ...page.seo, title: e.target.value } }); setSaveState('unsaved') }} /></div>
              <div className="bfield"><label>Description</label>
                <textarea rows={3} value={page.seo?.description || ''} onChange={(e) => { setPage({ ...page, seo: { ...page.seo, description: e.target.value } }); setSaveState('unsaved') }} /></div>
              <div className="bfield"><label>Keywords</label>
                <textarea rows={2} value={page.seo?.keywords || ''} onChange={(e) => { setPage({ ...page, seo: { ...page.seo, keywords: e.target.value } }); setSaveState('unsaved') }} /></div>
              <p className="bhint">Klik seksyen di kanvas untuk edit kandungannya. Seret pemegang ⋮⋮ untuk susun semula.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
