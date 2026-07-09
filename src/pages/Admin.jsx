import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../api/client'
import { rm } from '../utils/format'
import { useSeo } from '../utils/useSeo'
import { useIsMobile } from '../utils/useIsMobile'

// NanoRev admin — the "mini WooCommerce": dashboard, orders, inventory,
// dynamic landing pages, affiliate links and workshop partners.
// Pages (and the builder) are desktop-only; every other tab adapts to
// mobile as stacked cards. Auth: x-admin-key header (ADMIN_KEY on server).

const KEY_STORAGE = 'nanorev.adminKey'
const DESKTOP_ONLY_TABS = ['Pages']
const ALL_TABS = ['Dashboard', 'Orders', 'Products', 'Pages', 'Links', 'Workshops']

export default function Admin() {
  useSeo({ title: 'Admin | NanoRev Malaysia', robots: 'noindex, nofollow' }, [])
  const isMobile = useIsMobile()
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('Dashboard')

  const tabs = isMobile ? ALL_TABS.filter((t) => !DESKTOP_ONLY_TABS.includes(t)) : ALL_TABS
  useEffect(() => {
    if (isMobile && DESKTOP_ONLY_TABS.includes(tab)) setTab('Dashboard')
  }, [isMobile, tab])

  const tryAuth = async (k) => {
    try {
      await api('/admin/summary', { key: k })
      localStorage.setItem(KEY_STORAGE, k)
      setKey(k)
      setAuthed(true)
      setError('')
    } catch {
      setAuthed(false)
      setError('Invalid key, or the API is not running (start it with: npm run server)')
    }
  }
  useEffect(() => { if (key) tryAuth(key) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authed) {
    return (
      <div className="wrap page admin">
        <h1 className="page-title">NanoRev Admin</h1>
        <div className="panel" style={{ maxWidth: 420 }}>
          <div className="field">
            <label>Admin key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryAuth(key)}
              placeholder="ADMIN_KEY"
            />
            {error && <div className="msg">{error}</div>}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => tryAuth(key)}>Sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap page admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>NanoRev Admin</h1>
        <span style={{ fontSize: '0.82rem' }}>
          <Link to="/" style={{ color: 'var(--blue)' }}>← Storefront</Link>
        </span>
      </div>
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Dashboard' && <Dashboard k={key} goTo={setTab} />}
      {tab === 'Orders' && <Orders k={key} />}
      {tab === 'Products' && <Products k={key} />}
      {tab === 'Pages' && !isMobile && <Pages k={key} />}
      {tab === 'Links' && <Links k={key} isMobile={isMobile} />}
      {tab === 'Workshops' && <Workshops k={key} />}
    </div>
  )
}

/* ── Dashboard ─────────────────────────────────────────────────── */
function Dashboard({ k, goTo }) {
  const [s, setS] = useState(null)
  useEffect(() => { api('/admin/summary', { key: k }).then(setS).catch(() => {}) }, [k])
  if (!s) return <p>Loading…</p>
  return (
    <>
      <div className="stat-grid">
        <div className="stat"><div className="v">{s.orders}</div><div className="l">Orders</div></div>
        <div className="stat"><div className="v">{rm(s.revenue)}</div><div className="l">Revenue</div></div>
        <div className="stat"><div className="v">{s.clicks}</div><div className="l">Affiliate clicks</div></div>
        <div className="stat"><div className="v">{rm(s.pendingCommissions)}</div><div className="l">Commissions pending</div></div>
      </div>
      <div className="admin-cols">
        <div className="panel">
          <h3>Top affiliate links</h3>
          {s.topLinks.length === 0 ? <p className="hint">No links yet.</p> : (
            <table className="atable mini"><tbody>
              {s.topLinks.map((l) => (
                <tr key={l.slug}><td>/l/{l.slug}</td><td style={{ textAlign: 'right' }}>{l.clicks} clicks</td></tr>
              ))}
            </tbody></table>
          )}
        </div>
        <div className="panel">
          <h3>Low stock (≤ 10)</h3>
          {s.lowStock.length === 0 ? <p className="hint">All products sufficiently stocked.</p> : (
            <>
              <table className="atable mini"><tbody>
                {s.lowStock.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 700 }}>{p.stock}</td></tr>
                ))}
              </tbody></table>
              <button className="btn btn-ghost" style={{ marginTop: 12, padding: '8px 14px' }} onClick={() => goTo('Products')}>
                Restock in Products →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Orders ────────────────────────────────────────────────────── */
function OrderDetail({ o }) {
  const c = o.customer || {}
  const t = o.totals || {}
  return (
    <div className="odetail-grid">
      <div>
        <h5>{c.mode === 'pickup' ? 'Pickup' : 'Delivery'}</h5>
        {c.mode === 'pickup'
          ? <p>Collect in store ({c.locationId || '—'})</p>
          : <p>{c.address || '—'}{c.unit ? `, ${c.unit}` : ''}<br />{c.postcode || ''}</p>}
        {c.note && <p><b>Note:</b> {c.note}</p>}
      </div>
      <div>
        <h5>Contact</h5>
        <p>{c.name}{c.company ? ` · ${c.company}` : ''}<br />{c.phone}<br />{c.email || '—'}</p>
      </div>
      <div>
        <h5>Payment</h5>
        <p>{o.payment?.method || '—'} · {o.payment?.receiptId || 'no receipt id'}</p>
        <p>
          Subtotal {rm(t.subtotal || 0)}<br />
          Delivery {t.delivery === 0 ? 'FREE' : rm(t.delivery || 0)} · SST {rm(t.sst || 0)}<br />
          <b>Total {rm(t.total || 0)}</b>
        </p>
      </div>
      <div>
        <h5>Affiliate</h5>
        <p>
          {o.linkSlug ? <>via /l/{o.linkSlug}<br /></> : 'no landing attribution'}
          {o.workshopId ? <>{o.workshopId} · commission {rm(o.commission)}</> : ''}
        </p>
        {o.oversold && <span className="pill draft">OVERSOLD — stock was short</span>}
      </div>
    </div>
  )
}

function Orders({ k }) {
  const [orders, setOrders] = useState(null)
  const [open, setOpen] = useState(null)
  useEffect(() => { api('/admin/orders', { key: k }).then(setOrders).catch(() => {}) }, [k])
  const setStatus = async (ref, status) => {
    const updated = await api(`/admin/orders/${ref}`, { method: 'PUT', body: { status }, key: k })
    setOrders((os) => os.map((o) => (o.ref === ref ? updated : o)))
  }
  if (!orders) return <p>Loading…</p>
  if (orders.length === 0) return <p className="hint">No orders yet — place one through the storefront checkout.</p>
  return (
    <div className="tscroll">
      <table className="atable">
        <thead><tr><th></th><th>Ref</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <FragmentRow key={o.ref} o={o} open={open === o.ref}
              onToggle={() => setOpen(open === o.ref ? null : o.ref)}
              onStatus={(s) => setStatus(o.ref, s)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FragmentRow({ o, open, onToggle, onStatus }) {
  return (
    <>
      <tr className="orow" onClick={onToggle}>
        <td className="chev-cell">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</td>
        <td data-l="Ref"><b>{o.ref}</b> {o.oversold && <span className="pill draft" title="Stock was short">!</span>}</td>
        <td data-l="Date">{o.createdAt.slice(0, 10)}</td>
        <td data-l="Customer">{o.customer?.name}</td>
        <td data-l="Items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
        <td data-l="Total"><b>{rm(o.totals?.total || 0)}</b></td>
        <td data-l="Status" onClick={(e) => e.stopPropagation()}>
          <select value={o.status} onChange={(e) => onStatus(e.target.value)}>
            {['paid', 'packing', 'dispatched', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </td>
      </tr>
      {open && (
        <tr className="odetail"><td colSpan={7}><OrderDetail o={o} /></td></tr>
      )}
    </>
  )
}

/* ── Products (inventory) ──────────────────────────────────────── */
const BADGES = ['', 'bestseller', 'new', 'pro', 'bulk']
const PRODUCT_FIELDS = [
  ['name', 'Name'], ['grade', 'Grade (e.g. 5W-40 / NANO)'], ['volume', 'Volume (e.g. 200ml)'],
  ['base', 'Base / type'], ['spec', 'Specification'], ['tile', 'Tile text (placeholder visual)'],
]

function ProductEditor({ k, product, cats, onDone }) {
  const [p, setP] = useState({ ...product })
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const set = (field) => (e) => setP({ ...p, [field]: e.target.value })

  const uploadImage = (file) => {
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { url } = await api('/admin/upload', { method: 'POST', key: k, body: { name: file.name, dataBase64: reader.result } })
        setP((prev) => ({ ...prev, image: url }))
        setMsg('')
      } catch (e) { setMsg(e.message) }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    try {
      await api(`/admin/products/${p.id}`, {
        method: 'PUT',
        key: k,
        body: {
          name: p.name, cat: p.cat, grade: p.grade || '', tile: p.tile || p.grade || '',
          volume: p.volume || '', base: p.base || '', spec: p.spec || '',
          badge: p.badge || undefined, image: p.image || undefined,
          price: Number(p.price), stock: Number(p.stock), active: !!p.active,
        },
      })
      onDone()
    } catch (e) { setMsg(e.message) }
  }
  const del = async () => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return
    try { await api(`/admin/products/${p.id}`, { method: 'DELETE', key: k }); onDone() }
    catch (e) { setMsg(e.message) }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={onDone}>← All products</button>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Edit: {p.id}</h3>
        <div className="grid-2">
          {PRODUCT_FIELDS.map(([f, label]) => (
            <div className="field" key={f}><label>{label}</label>
              <input value={p[f] || ''} onChange={set(f)} /></div>
          ))}
          <div className="field"><label>Category</label>
            <select value={p.cat} onChange={set('cat')}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="field"><label>Badge</label>
            <select value={p.badge || ''} onChange={set('badge')}>
              {BADGES.map((b) => <option key={b} value={b}>{b || '— none —'}</option>)}
            </select></div>
          <div className="field"><label>Price (RM)</label>
            <input type="number" step="0.01" min="0" value={p.price} onChange={set('price')} /></div>
          <div className="field"><label>Stock</label>
            <input type="number" min="0" value={p.stock} onChange={set('stock')} /></div>
        </div>
        <div className="field"><label>Photo</label>
          <div className="pimg-row">
            <div className="pimg-preview">
              {p.image ? <img src={p.image} alt="" /> : <span>{p.tile || p.grade || '—'}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <input value={p.image || ''} placeholder="/assets/products/… or upload →"
                onChange={set('image')} style={{ marginBottom: 8 }} />
              <label className="btn btn-ghost" style={{ padding: '8px 14px', cursor: 'pointer' }}>
                {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                  onChange={(e) => uploadImage(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />
          <span style={{ fontWeight: 600 }}>Active (visible & purchasable in the store)</span>
        </label>
        {msg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={save}>Save product</button>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={del}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function Products({ k }) {
  const [products, setProducts] = useState(null)
  const [cats, setCats] = useState([])
  const [editing, setEditing] = useState(null)
  const [saved, setSaved] = useState('')
  const [form, setForm] = useState({ name: '', id: '', cat: '', price: '', stock: '' })
  const [createMsg, setCreateMsg] = useState('')
  const load = () => api('/admin/products', { key: k }).then(setProducts).catch(() => {})
  useEffect(() => { load(); api('/categories').then(setCats).catch(() => {}) }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id, field, value) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  const saveRow = async (p) => {
    await api(`/admin/products/${p.id}`, {
      method: 'PUT',
      body: { price: Number(p.price), stock: Number(p.stock), active: !!p.active },
      key: k,
    }).catch(() => {})
    setSaved(p.id)
    setTimeout(() => setSaved(''), 1500)
  }
  const createProduct = async () => {
    try {
      const created = await api('/admin/products', {
        method: 'POST', key: k,
        body: { ...form, price: Number(form.price) || 0, stock: Number(form.stock) || 0 },
      })
      setForm({ name: '', id: '', cat: '', price: '', stock: '' })
      setCreateMsg('')
      await load()
      setEditing(created)
    } catch (e) { setCreateMsg(e.message) }
  }

  if (!products) return <p>Loading…</p>
  if (editing) {
    return <ProductEditor k={k} product={editing} cats={cats} onDone={() => { setEditing(null); load() }} />
  }
  return (
    <>
      <div className="panel">
        <h3>New product</h3>
        <div className="grid-2">
          <div className="field"><label>Name</label>
            <input value={form.name} placeholder="e.g. Nano Radiator Coolant"
              onChange={(e) => setForm({ ...form, name: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) })} /></div>
          <div className="field"><label>ID (SKU)</label>
            <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Category</label>
            <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
              <option value="">— choose —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="field"><label>Price (RM) & stock</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" step="0.01" min="0" placeholder="Price" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input type="number" min="0" placeholder="Stock" value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div></div>
        </div>
        {createMsg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{createMsg}</p>}
        <button className="btn btn-primary" onClick={createProduct} disabled={!form.name || !form.id || !form.cat}>
          Create & edit details
        </button>
      </div>
      <div className="tscroll">
        <table className="atable">
          <thead><tr><th></th><th>Product</th><th>Category</th><th>Price (RM)</th><th>Stock</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ opacity: p.active ? 1 : 0.45 }}>
                <td className="thumb-cell"><div className="pthumb">{p.image ? <img src={p.image} alt="" /> : <span>{p.tile || p.grade}</span>}</div></td>
                <td data-l="Product"><b>{p.name} {p.grade}</b><br /><small style={{ color: 'var(--muted)' }}>{p.id} · {p.volume} · {p.base}</small></td>
                <td data-l="Category">{p.cat}</td>
                <td data-l="Price (RM)"><input type="number" step="0.01" value={p.price} onChange={(e) => patch(p.id, 'price', e.target.value)} /></td>
                <td data-l="Stock"><input type="number" value={p.stock} onChange={(e) => patch(p.id, 'stock', e.target.value)}
                  style={{ borderColor: p.stock <= 10 ? 'var(--danger)' : undefined }} /></td>
                <td data-l="Active"><input type="checkbox" checked={!!p.active} onChange={(e) => patch(p.id, 'active', e.target.checked)} /></td>
                <td className="actions-cell">
                  <button className="btn btn-primary" style={{ padding: '7px 12px', marginRight: 8 }} onClick={() => saveRow(p)}>
                    {saved === p.id ? 'Saved ✓' : 'Save'}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px' }} onClick={() => setEditing(p)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Pages (desktop only) ──────────────────────────────────────── */
function Pages({ k }) {
  const navigate = useNavigate()
  const [pages, setPages] = useState(null)
  const [products, setProducts] = useState([])
  const [templates, setTemplates] = useState([])
  const [editing, setEditing] = useState(null)
  const [sectionsText, setSectionsText] = useState('')
  const [msg, setMsg] = useState('')
  const [listMsg, setListMsg] = useState('')
  const [draft, setDraft] = useState({ name: '', productId: '', slug: '', templateId: '' })
  const [createMsg, setCreateMsg] = useState('')
  const load = () => api('/admin/pages', { key: k }).then(setPages).catch(() => {})
  useEffect(() => {
    load()
    api('/admin/products', { key: k }).then(setProducts).catch(() => {})
    api('/admin/templates', { key: k }).then(setTemplates).catch(() => {})
  }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const createPage = async () => {
    try {
      const { page } = await api('/admin/pages', { method: 'POST', key: k, body: draft })
      navigate(`/admin/builder/${page.id}`)
    } catch (e) { setCreateMsg(e.message) }
  }
  const open = (p) => { setEditing(JSON.parse(JSON.stringify(p))); setSectionsText(JSON.stringify(p.sections, null, 2)); setMsg('') }
  const dup = async (p) => { await api(`/admin/pages/${p.id}/duplicate`, { method: 'POST', key: k }); load() }
  const delPage = async (p) => {
    if (!window.confirm(`Delete page "${p.name}"?`)) return
    try { await api(`/admin/pages/${p.id}`, { method: 'DELETE', key: k }); setListMsg(''); load() }
    catch (e) { setListMsg(e.message) }
  }
  const savePage = async () => {
    let sections
    try { sections = JSON.parse(sectionsText) } catch { setMsg('Sections JSON is invalid — fix it before saving.'); return }
    try {
      await api(`/admin/pages/${editing.id}`, { method: 'PUT', key: k, body: { ...editing, sections } })
      setMsg('Saved ✓'); load()
    } catch (e) { setMsg(e.message) }
  }
  const set = (field) => (e) => setEditing((p) => ({ ...p, [field]: e.target.value }))
  const setSeo = (field) => (e) => setEditing((p) => ({ ...p, seo: { ...p.seo, [field]: e.target.value } }))

  if (!pages) return <p>Loading…</p>
  if (editing) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => setEditing(null)}>← All pages</button>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Edit (advanced JSON): {editing.id}</h3>
          <p className="hint">Prefer the visual <Link to={`/admin/builder/${editing.id}`} style={{ color: 'var(--blue)' }}>Builder</Link> — this raw view is for power users.</p>
          <div className="grid-2">
            <div className="field"><label>Name</label><input value={editing.name} onChange={set('name')} /></div>
            <div className="field"><label>Product</label>
              <select value={editing.productId} onChange={set('productId')}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.grade} ({p.id})</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Status</label>
              <select value={editing.status} onChange={set('status')}>
                <option value="published">published</option><option value="draft">draft</option>
              </select>
            </div>
            <div className="field"><label>WhatsApp (default)</label><input value={editing.whatsapp} onChange={set('whatsapp')} /></div>
          </div>
          <div className="field"><label>WhatsApp pre-filled message</label><input value={editing.waText} onChange={set('waText')} /></div>
          <div className="field"><label>SEO title</label><input value={editing.seo?.title || ''} onChange={setSeo('title')} /></div>
          <div className="field"><label>SEO description</label><textarea value={editing.seo?.description || ''} onChange={setSeo('description')} /></div>
          <div className="field"><label>SEO keywords</label><input value={editing.seo?.keywords || ''} onChange={setSeo('keywords')} /></div>
          <div className="field"><label>Sections (JSON — order, copy and offers)</label>
            <textarea className="json" value={sectionsText} onChange={(e) => setSectionsText(e.target.value)} />
          </div>
          {msg && <p style={{ fontWeight: 700, color: msg.includes('✓') ? 'var(--green)' : 'var(--danger)' }}>{msg}</p>}
          <button className="btn btn-primary" onClick={savePage}>Save page</button>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="panel">
        <h3>New landing page</h3>
        <p className="hint">Pick a template (or start from zero) — you land in the visual builder. The slug becomes its public URL (/l/…), optional.</p>
        <div className="grid-2">
          <div className="field"><label>Page name</label>
            <input value={draft.name} placeholder="e.g. Promo Merdeka Flush"
              onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: suggestSlug(e.target.value) })} /></div>
          <div className="field"><label>Product</label>
            <select value={draft.productId} onChange={(e) => setDraft({ ...draft, productId: e.target.value })}>
              <option value="">— choose —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.grade} ({p.id})</option>)}
            </select></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Template</label>
            <select value={draft.templateId} onChange={(e) => setDraft({ ...draft, templateId: e.target.value })}>
              <option value="">Kosong — mula dari sifar</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.sections.length} seksyen)</option>)}
            </select>
            {draft.templateId && (
              <p className="hint" style={{ marginTop: 6 }}>
                {templates.find((t) => t.id === draft.templateId)?.description}
              </p>
            )}
          </div>
          <div className="field"><label>Slug (public URL — optional)</label>
            <input value={draft.slug} placeholder="promo-merdeka-flush"
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></div>
        </div>
        {createMsg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{createMsg}</p>}
        <button className="btn btn-primary" onClick={createPage} disabled={!draft.name || !draft.productId}>
          Create & open builder
        </button>
      </div>
      {listMsg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{listMsg}</p>}
      <div className="tscroll">
        <table className="atable">
          <thead><tr><th>ID</th><th>Name</th><th>Product</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--muted)' }}>{p.id}</td>
                <td><b>{p.name}</b></td>
                <td>{p.productId}</td>
                <td><span className={`pill ${p.status}`}>{p.status}</span></td>
                <td>{(p.updatedAt || '').slice(0, 10)}</td>
                <td className="actions-cell" style={{ whiteSpace: 'nowrap' }}>
                  <Link className="btn btn-primary" style={{ padding: '7px 12px', marginRight: 8 }} to={`/admin/builder/${p.id}`}>Builder</Link>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', marginRight: 8 }} onClick={() => open(p)}>JSON</button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', marginRight: 8 }} onClick={() => dup(p)}>Duplicate</button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', color: 'var(--danger)' }} onClick={() => delPage(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Links ─────────────────────────────────────────────────────── */
function Links({ k }) {
  const [links, setLinks] = useState(null)
  const [pages, setPages] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [form, setForm] = useState({ slug: '', pageId: '', workshopId: '' })
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')
  const load = () => api('/admin/links', { key: k }).then(setLinks).catch(() => {})
  useEffect(() => {
    load()
    api('/admin/pages', { key: k }).then(setPages).catch(() => {})
    api('/admin/workshops', { key: k }).then(setWorkshops).catch(() => {})
  }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  // slug auto-suggested from workshop + page — still editable
  const suggest = (pageId, workshopId) => {
    const page = pages.find((p) => p.id === pageId)
    const base = page ? page.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''
    return workshopId ? `${workshopId}-${base}` : base
  }
  const setPage = (pageId) => setForm((f) => ({ ...f, pageId, slug: suggest(pageId, f.workshopId) }))
  const setWorkshop = (workshopId) => setForm((f) => ({ ...f, workshopId, slug: suggest(f.pageId, workshopId) }))

  const create = async () => {
    try {
      await api('/admin/links', { method: 'POST', key: k, body: { ...form, workshopId: form.workshopId || null } })
      setForm({ slug: '', pageId: '', workshopId: '' }); setMsg(''); load()
    } catch (e) { setMsg(e.message) }
  }
  const toggle = async (l) => {
    await api(`/admin/links/${l.slug}`, { method: 'PUT', key: k, body: { active: !l.active } })
    load()
  }
  const del = async (l) => {
    if (!window.confirm(`Delete link /l/${l.slug}? Anyone holding this URL will get "not found".`)) return
    await api(`/admin/links/${l.slug}`, { method: 'DELETE', key: k }).catch(() => {})
    load()
  }
  const copy = (slug) => {
    navigator.clipboard?.writeText(`${window.location.origin}/l/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(''), 1500)
  }

  if (!links) return <p>Loading…</p>
  return (
    <>
      <div className="panel">
        <h3>New affiliate link</h3>
        <p className="hint">A link is a landing page, optionally co-branded for a workshop. The slug is auto-suggested — edit it if you like.</p>
        <div className="grid-2">
          <div className="field"><label>Landing page</label>
            <select value={form.pageId} onChange={(e) => setPage(e.target.value)}>
              <option value="">— choose —</option>
              {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Workshop (optional — co-brand & commission)</label>
            <select value={form.workshopId} onChange={(e) => setWorkshop(e.target.value)}>
              <option value="">— none (HQ link) —</option>
              {workshops.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.city}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Slug → {window.location.origin}/l/…</label>
          <input value={form.slug} placeholder="auto-suggested when you pick a page" onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
        {msg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{msg}</p>}
        <button className="btn btn-primary" onClick={create} disabled={!form.slug || !form.pageId}>Create link</button>
      </div>
      <div className="tscroll">
        <table className="atable">
          <thead><tr><th>Slug</th><th>Page</th><th>Workshop</th><th>Clicks</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.slug} style={{ opacity: l.active ? 1 : 0.45 }}>
                <td data-l="Slug"><b>/l/{l.slug}</b></td>
                <td data-l="Page">{l.pageId}</td>
                <td data-l="Workshop">{l.workshopId || '— HQ'}</td>
                <td data-l="Clicks">{l.clicks}</td>
                <td data-l="Active"><input type="checkbox" checked={!!l.active} onChange={() => toggle(l)} /></td>
                <td className="actions-cell" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', marginRight: 8 }} onClick={() => copy(l.slug)}>
                    {copied === l.slug ? 'Copied ✓' : 'Copy URL'}
                  </button>
                  <a className="btn btn-ghost" style={{ padding: '7px 12px', marginRight: 8 }} href={`/l/${l.slug}`} target="_blank" rel="noreferrer">Open</a>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', color: 'var(--danger)' }} onClick={() => del(l)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Workshops (affiliates / salesmen) ─────────────────────────── */
function Workshops({ k }) {
  const [rows, setRows] = useState(null)
  const [form, setForm] = useState({ id: '', name: '', city: '', whatsapp: '', pct: 10 })
  const [msg, setMsg] = useState('')
  const load = () => api('/admin/workshops', { key: k }).then(setRows).catch(() => {})
  useEffect(() => { load() }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    try {
      await api('/admin/workshops', {
        method: 'POST', key: k,
        body: { id: form.id, name: form.name, city: form.city, whatsapp: form.whatsapp, commissionRate: (Number(form.pct) || 0) / 100 },
      })
      setForm({ id: '', name: '', city: '', whatsapp: '', pct: 10 }); setMsg(''); load()
    } catch (e) { setMsg(e.message) }
  }
  const update = async (w, fields) => {
    await api(`/admin/workshops/${w.id}`, { method: 'PUT', key: k, body: fields })
    load()
  }
  const del = async (w) => {
    if (!window.confirm(`Delete workshop ${w.name}?`)) return
    try { await api(`/admin/workshops/${w.id}`, { method: 'DELETE', key: k }); setMsg(''); load() }
    catch (e) { setMsg(e.message) }
  }

  if (!rows) return <p>Loading…</p>
  return (
    <>
      <div className="panel">
        <h3>New workshop / salesman (affiliate)</h3>
        <div className="grid-2">
          <div className="field"><label>ID (slug)</label><input value={form.id} placeholder="e.g. mesin-maju" onChange={(e) => setForm({ ...form, id: e.target.value })} /></div>
          <div className="field"><label>Name</label><input value={form.name} placeholder="Mesin Maju Auto" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>WhatsApp (60…)</label><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Commission (%)</label>
          <input type="number" step="1" min="0" max="90" value={form.pct}
            onChange={(e) => setForm({ ...form, pct: e.target.value })} />
        </div>
        {msg && <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{msg}</p>}
        <button className="btn btn-primary" onClick={create} disabled={!form.id || !form.name}>Add workshop</button>
      </div>
      <div className="tscroll">
        <table className="atable">
          <thead><tr><th>Workshop</th><th>WhatsApp</th><th>Commission %</th><th>Links</th><th>Orders</th><th>Earned</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} style={{ opacity: w.active ? 1 : 0.45 }}>
                <td data-l="Workshop"><b>{w.name}</b><br /><small style={{ color: 'var(--muted)' }}>{w.id} · {w.city}</small></td>
                <td data-l="WhatsApp">{w.whatsapp}</td>
                <td data-l="Commission %"><input type="number" step="1" min="0" max="90" style={{ maxWidth: 70 }}
                  defaultValue={Math.round(w.commissionRate * 100)}
                  onBlur={(e) => update(w, { commissionRate: (Number(e.target.value) || 0) / 100 })} /></td>
                <td data-l="Links">{w.links}</td>
                <td data-l="Orders">{w.orders}</td>
                <td data-l="Earned"><b>{rm(w.earned)}</b></td>
                <td data-l="Active"><input type="checkbox" checked={!!w.active} onChange={(e) => update(w, { active: e.target.checked })} /></td>
                <td className="actions-cell">
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', color: 'var(--danger)' }} onClick={() => del(w)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
