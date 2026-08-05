'use client'

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { FieldDef, SectionDef } from './schema'

// Schema-driven form controls for the properties panel. One engine renders
// every section type's form from its field declarations in schema.ts.

/** Section props while being edited: the builder addresses fields by key. */
export type EditableProps = Record<string, unknown>

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

export function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { kind, label } = field

  if (kind === 'text' || kind === 'number') {
    return (
      <div className="bfield">
        <label>{label}</label>
        <input
          type={kind === 'number' ? 'number' : 'text'}
          value={(value as string | number) ?? ''}
          onChange={(e) => onChange(kind === 'number' ? Number(e.target.value) : e.target.value)}
        />
      </div>
    )
  }

  if (kind === 'textarea') {
    return (
      <div className="bfield">
        <label>{label}</label>
        <textarea rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  if (kind === 'checkbox') {
    return (
      <label className="bfield bcheck">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    )
  }

  if (kind === 'select') {
    return (
      <div className="bfield">
        <label>{label}</label>
        <select value={(value as string) ?? field.options[0]} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  if (kind === 'strings') {
    const list = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="bfield">
        <label>{label}</label>
        {list.map((s, i) => (
          <div className="brow" key={i}>
            <input value={s} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="bicon" title="Buang" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        ))}
        <button className="badd" onClick={() => onChange([...list, ''])}><Plus size={14} /> Tambah</button>
      </div>
    )
  }

  if (kind === 'pairs') {
    const list = Array.isArray(value) ? (value as [string, string][]) : []
    const setAt = (i: number, col: 0 | 1, v: string) =>
      onChange(list.map((row, j) => (j === i ? (col === 0 ? [v, row[1]] : [row[0], v]) : row)))
    return (
      <div className="bfield">
        <label>{label}</label>
        {list.map((row, i) => (
          <div className="brow" key={i}>
            <input value={row[0] ?? ''} placeholder="Label" onChange={(e) => setAt(i, 0, e.target.value)} />
            <input value={row[1] ?? ''} placeholder="Nilai" onChange={(e) => setAt(i, 1, e.target.value)} />
            <button className="bicon" title="Buang" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        ))}
        <button className="badd" onClick={() => onChange([...list, ['', '']])}><Plus size={14} /> Tambah baris</button>
      </div>
    )
  }

  if (kind === 'items') {
    const list = Array.isArray(value) ? (value as EditableProps[]) : []
    const blank = (): EditableProps =>
      Object.fromEntries(
        field.itemFields.map((f) => [
          f.key,
          f.kind === 'number' ? 1 : f.kind === 'checkbox' ? false : f.kind === 'select' ? f.options[0] : '',
        ]),
      )
    return (
      <div className="bfield">
        <label>{label}</label>
        {list.map((item, i) => (
          <div className="bitem" key={i}>
            <div className="bitem-head">
              <span>#{i + 1}</span>
              <span>
                <button className="bicon" title="Naik" onClick={() => onChange(move(list, i, i - 1))}><ChevronUp size={14} /></button>
                <button className="bicon" title="Turun" onClick={() => onChange(move(list, i, i + 1))}><ChevronDown size={14} /></button>
                <button className="bicon" title="Buang" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </span>
            </div>
            {field.itemFields.map((f) => (
              <Field
                key={f.key}
                field={f}
                value={item[f.key]}
                onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))}
              />
            ))}
          </div>
        ))}
        <button className="badd" onClick={() => onChange([...list, blank()])}><Plus size={14} /> Tambah item</button>
      </div>
    )
  }

  return null
}

export function SectionForm({
  def,
  props,
  onChange,
}: {
  def: Pick<SectionDef, 'fields'>
  props: EditableProps
  onChange: (props: EditableProps) => void
}) {
  return (
    <>
      {def.fields.map((f) => (
        <Field key={f.key} field={f} value={props[f.key]} onChange={(v) => onChange({ ...props, [f.key]: v })} />
      ))}
    </>
  )
}
