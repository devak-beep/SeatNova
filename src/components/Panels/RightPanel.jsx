import React, { useContext, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../App'

export default function RightPanel() {
  const { sections, selectedId, updateSection, categories } = useStore()
  const t = useContext(ThemeContext)
  const sec = sections.find(s => s.id === selectedId)

  const dragIdx = useRef(null)
  const [overIdx, setOverIdx] = useState(null)

  const panel = { width: 240, background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`, padding: 14, overflowY: 'auto' }
  const input = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.inputColor, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }
  const heading = { fontSize: 11, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }
  const subheading = { fontSize: 11, fontWeight: 700, color: t.headingColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 14 }

  if (!sec) return (
    <div style={panel}>
      <div style={{ fontSize: 12, color: t.headingColor, marginTop: 20, lineHeight: 1.7 }}>Select a section to edit its properties.</div>
    </div>
  )

  if (sec.locked) return (
    <div style={panel}>
      <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 20, lineHeight: 1.7, display: 'flex', alignItems: 'center', gap: 6 }}>
        🔒 <span>This section is locked.<br/>Unlock it from the Layers panel to edit.</span>
      </div>
    </div>
  )

  const update = (key, val) => updateSection(sec.id, { [key]: val })

  const handleCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId)
    update('category', catId)
    if (cat) update('color', cat.color)
  }

  // Row groups helpers
  const rowGroups = sec.rowGroups || [{ rows: 1, seatsPerRow: sec.totalSeats || 10 }]
  const totalSeats = rowGroups.reduce((s, g) => s + (g.rows || 1) * (g.seatsPerRow || 0), 0)

  const updateGroup = (i, key, val) => {
    const num = Number(val) || 1
    let clamped
    if (key === 'spacing') {
      const g = rowGroups[i]
      const c = Math.max(2, g.seatsPerRow || 1)
      let maxSpacing = 2, minSpacing = 0.1
      if (sec.type === 'rect' && sec.w) {
        const inset = 6
        const uw = sec.w - inset * 2
        const maxSeatsPerRow = Math.max(...rowGroups.map(r => r.seatsPerRow))
        const baseColStep = maxSeatsPerRow > 1 ? uw / (maxSeatsPerRow - 1) : uw
        const totalRows = rowGroups.reduce((s, g) => s + (g.rows || 1), 0)
        const rowStep = totalRows > 1 ? (sec.h - inset * 2) / (totalRows - 1) : (sec.h - inset * 2)
        const seatR = Math.max(0.5, Math.min(baseColStep / 2, rowStep / 2) * 0.9)
        maxSpacing = baseColStep > 0 ? uw / (baseColStep * (c - 1)) : 2
        minSpacing = baseColStep > 0 ? (2 * seatR) / baseColStep : 0.1
      } else if (sec.type === 'arc') {
        let sweep = sec.endAngle - sec.startAngle
        if (sweep <= 0) sweep += 360
        const inset = sec.innerR * 0.03
        const radialSpan = sec.outerR - sec.innerR - inset * 2
        const totalRows = rowGroups.reduce((s, g) => s + (g.rows || 1), 0)
        const rowStep = totalRows > 1 ? radialSpan / (totalRows - 1) : radialSpan
        const r = sec.innerR + inset
        const angInset = inset / r
        const span = sweep * (Math.PI / 180) - angInset * 2
        const arcLen = r * span
        const baseStep = c > 1 ? arcLen / (c - 1) : arcLen
        const innerArcLen = sec.innerR * sweep * (Math.PI / 180)
        const colSpacing = c > 1 ? innerArcLen / (c - 1) : innerArcLen
        const seatR = Math.max(0.5, Math.min(colSpacing, rowStep) * 0.35)
        maxSpacing = baseStep > 0 ? arcLen / (baseStep * (c - 1)) : 2
        minSpacing = baseStep > 0 ? (2 * seatR) / baseStep : 0.1
      }
      clamped = Math.max(minSpacing, Math.min(maxSpacing, num))
    } else {
      clamped = Math.max(1, num)
    }

    let patch = { [key]: key === 'spacing' ? clamped : key === 'category' || key === 'price' ? val : clamped }
    // Auto-set color when category changes
    if (key === 'category') {
      const cat = val ? categories.find(c => c.id === val) : null
      patch.color = cat?.color || null
    }

    const next = rowGroups.map((g, idx) => idx === i ? { ...g, ...patch } : g)
    update('rowGroups', next)
    update('totalSeats', next.reduce((s, g) => s + (g.rows || 1) * (g.seatsPerRow || 0), 0))
  }
  const addGroup = () => {
    const next = [...rowGroups, { rows: 1, seatsPerRow: 10 }]
    update('rowGroups', next)
    update('totalSeats', next.reduce((s, g) => s + g.rows * g.seatsPerRow, 0))
  }
  const removeGroup = (i) => {
    if (rowGroups.length === 1) return
    const next = rowGroups.filter((_, idx) => idx !== i)
    update('rowGroups', next)
    update('totalSeats', next.reduce((s, g) => s + g.rows * g.seatsPerRow, 0))
  }

  const handleDragStart = (i) => { dragIdx.current = i }
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (i) => {
    if (dragIdx.current === null || dragIdx.current === i) { setOverIdx(null); return }
    const next = [...rowGroups]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(i, 0, moved)
    update('rowGroups', next)
    update('totalSeats', next.reduce((s, g) => s + g.rows * g.seatsPerRow, 0))
    dragIdx.current = null
    setOverIdx(null)
  }
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null) }

  return (
    <div style={panel}>
      <div style={heading}>Section Properties</div>

      <Field label="Label" t={t}>
        <input style={input} value={sec.label} onChange={e => update('label', e.target.value)} />
      </Field>
      <Field label="Category" t={t}>
        <select style={input} value={sec.category} onChange={e => handleCategoryChange(e.target.value)}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Color" t={t}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="color" value={sec.color} onChange={e => update('color', e.target.value)}
            style={{ width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }} />
          <input style={{ ...input, flex: 1 }} value={sec.color}
            onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update('color', v) }}
            onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) update('color', '#94a3b8') }}
            maxLength={7} spellCheck={false} />
        </div>
      </Field>
      <Field label="Price (₹)" t={t}>
        <input style={input} type="number" value={sec.price} onChange={e => update('price', Number(e.target.value))} />
      </Field>
      <Field label="Seat Type" t={t}>
        <select style={input} value={sec.seatType || 'standard'} onChange={e => update('seatType', e.target.value)}>
          <option value="standard">Standard</option>
          <option value="vip">VIP</option>
          <option value="accessible">Accessible</option>
          <option value="standing">Standing</option>
        </select>
      </Field>
      <Field label="Status" t={t}>
        <select style={input} value={sec.status || 'available'} onChange={e => update('status', e.target.value)}>
          <option value="available">Available</option>
          <option value="sold">Sold Out</option>
          <option value="reserved">Reserved</option>
          <option value="hidden">Hidden</option>
        </select>
      </Field>

      {/* Seat Layout */}
      <div style={subheading}>
        Seat Layout
        <span style={{ marginLeft: 6, fontSize: 10, color: t.labelColor, fontWeight: 400, textTransform: 'none' }}>
          {totalSeats} total{sec.blockedSeats?.length ? ` · ${sec.blockedSeats.length} blocked` : ''}
        </span>
      </div>

      {/* Show seats toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: t.inputColor }}>Show individual seats</span>
        <button onClick={() => update('showSeats', !(sec.showSeats ?? true))}
          style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', background: (sec.showSeats ?? true) ? '#7c3aed' : t.inputBorder, transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: 2, left: (sec.showSeats ?? true) ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {totalSeats > 3000 && (sec.showSeats ?? true) && (
        <div style={{ fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '7px 10px', marginBottom: 8, lineHeight: 1.5 }}>
          ⚠️ Seat limit exceeded. Only the first <b>3,000 seats</b> will be rendered per section to maintain performance.
        </div>
      )}

      {(sec.showSeats ?? true) ? (<>
      <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 1fr 1fr 20px', gap: 4, marginBottom: 4 }}>
        <span />
        <span style={{ fontSize: 10, color: t.labelColor }}>Rows</span>
        <span style={{ fontSize: 10, color: t.labelColor }}>Seats/row</span>
        <span style={{ fontSize: 10, color: t.labelColor }}>Spacing</span>
        <span />
      </div>

      {rowGroups.map((g, i) => {
        const groupCat = g.category ? categories.find(c => c.id === g.category) : null
        const dotColor = groupCat?.color || sec.color
        return (
        <div key={i} draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          style={{ marginBottom: 6, opacity: dragIdx.current === i ? 0.4 : 1, borderTop: overIdx === i ? `2px solid #7c3aed` : '2px solid transparent' }}>
          {/* Row 1: grip + rows + seats + spacing + delete */}
          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 1fr 1fr 20px', gap: 4, alignItems: 'center', marginBottom: 3 }}>
            <span style={{ color: t.gripColor, cursor: 'grab', fontSize: 12, textAlign: 'center' }}>⠿</span>
            <input style={{ ...input, padding: '4px 6px' }} type="number" min="1" value={g.rows}
              onChange={e => updateGroup(i, 'rows', e.target.value)} />
            <input style={{ ...input, padding: '4px 6px' }} type="number" min="1" value={g.seatsPerRow}
              onChange={e => updateGroup(i, 'seatsPerRow', e.target.value)} />
            <input style={{ ...input, padding: '4px 6px' }} type="number" min="0.1" max="2" step="0.1" value={(g.spacing ?? 1).toFixed(1)}
              title="Seat spacing multiplier (1.0 = normal)"
              onChange={e => updateGroup(i, 'spacing', Math.max(0.1, Math.min(2, Number(e.target.value))))} />
            <button onClick={() => removeGroup(i)} disabled={rowGroups.length === 1}
              style={{ background: 'none', border: 'none', color: t.delColor, cursor: rowGroups.length === 1 ? 'default' : 'pointer', fontSize: 14, padding: 0, opacity: rowGroups.length === 1 ? 0.3 : 1 }}>✕</button>
          </div>
          {/* Row 2: category + price override */}
          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 1fr 20px', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, display: 'inline-block', margin: '0 auto' }} />
            <select style={{ ...input, padding: '3px 4px', fontSize: 11 }}
              value={g.category || ''}
              onChange={e => updateGroup(i, 'category', e.target.value || null)}>
              <option value="">— Section default</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input style={{ ...input, padding: '3px 6px', fontSize: 11 }} type="number" placeholder={`₹${sec.price}`}
              value={g.price ?? ''}
              onChange={e => updateGroup(i, 'price', e.target.value === '' ? null : Number(e.target.value))} />
            <span />
          </div>
        </div>
        )
      })}

      <button onClick={addGroup} style={{
        width: '100%', marginTop: 4, padding: '5px', borderRadius: 5,
        border: `1px dashed ${t.inputBorder}`, background: 'none',
        color: t.labelColor, fontSize: 12, cursor: 'pointer',
      }}>+ Add row group</button>
      </>) : (
        <Field label="Total Seats" t={t}>
          <input style={input} type="number" min="1" value={sec.totalSeats || 0}
            onChange={e => update('totalSeats', Math.max(1, Number(e.target.value)))} />
        </Field>
      )}

      {sec.type === 'arc' && <>
        <div style={subheading}>Arc Geometry</div>
        <Field label="Start Angle (°)" t={t}><input style={input} type="number" value={Math.round(sec.startAngle)} onChange={e => update('startAngle', Number(e.target.value))} /></Field>
        <Field label="End Angle (°)" t={t}><input style={input} type="number" value={Math.round(sec.endAngle)} onChange={e => update('endAngle', Number(e.target.value))} /></Field>
        <Field label="Inner Radius" t={t}><input style={input} type="number" step="0.05" min="0.05" max="0.9" value={(sec.innerR ?? 0).toFixed(2)} onChange={e => update('innerR', Number(e.target.value))} /></Field>
        <Field label="Outer Radius" t={t}><input style={input} type="number" step="0.05" min="0.1" max="1" value={(sec.outerR ?? 0).toFixed(2)} onChange={e => update('outerR', Number(e.target.value))} /></Field>
      </>}

      {sec.type === 'rect' && <>
        <div style={subheading}>Position & Size</div>
        <Field label="X" t={t}><input style={input} type="number" value={Math.round(sec.x)} onChange={e => update('x', Number(e.target.value))} /></Field>
        <Field label="Y" t={t}><input style={input} type="number" value={Math.round(sec.y)} onChange={e => update('y', Number(e.target.value))} /></Field>
        <Field label="Width" t={t}><input style={input} type="number" value={Math.round(sec.w)} onChange={e => update('w', Number(e.target.value))} /></Field>
        <Field label="Height" t={t}><input style={input} type="number" value={Math.round(sec.h)} onChange={e => update('h', Number(e.target.value))} /></Field>
      </>}
    </div>
  )
}

function Field({ label, children, t }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, color: t.labelColor, marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  )
}
