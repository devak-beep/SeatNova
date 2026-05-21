import React, { useContext, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../EditorApp'

import GridBlockEditor from './GridBlockEditor'
function Field({ label, children, t }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, color: t.labelColor, marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  )
}

function ColGroupsPanel({ sec, update, categories, inp, t }) {
  const colGroups = sec.colGroups || []
  const hasGroups = colGroups.length > 0

  const updateColGroup = (i, key, val) => {
    const next = colGroups.map((g, idx) => idx === i ? { ...g, [key]: val } : g)
    // sync color from category
    if (key === 'category') {
      const cat = val ? categories.find(c => c.id === val) : null
      next[i].color = cat?.color || null
    }
    // Auto-resize section width to fit all seats + gaps
    const inset = 6
    const uw = sec.w - inset * 2
    const totalSeats = next.reduce((s, g) => s + (g.seats || 1), 0)
    const totalGaps = next.reduce((s, g) => s + (g.gap || 0), 0)
    const colStep = totalSeats > 1 ? (uw - totalGaps) / (totalSeats - 1) : uw
    const requiredW = inset * 2 + Math.max(colStep, 20) * (totalSeats - 1) + totalGaps
    const patch = { colGroups: next }
    if (requiredW > sec.w) patch.w = Math.ceil(requiredW)
    updateSection(sec.id, patch)
  }

  const addColGroup = () => {
    const defaultSeats = colGroups.length === 0
      ? Math.ceil((sec.rowGroups?.[0]?.seatsPerRow || 10) / 2)
      : 5
    const next = [...colGroups, { seats: defaultSeats, category: '', color: null, gap: 20 }]
    const inset = 6
    const uw = sec.w - inset * 2
    const totalSeats = next.reduce((s, g) => s + (g.seats || 1), 0)
    const totalGaps = next.reduce((s, g) => s + (g.gap || 0), 0)
    const colStep = totalSeats > 1 ? (uw - totalGaps) / (totalSeats - 1) : uw
    const requiredW = inset * 2 + Math.max(colStep, 20) * (totalSeats - 1) + totalGaps
    const patch = { colGroups: next }
    if (requiredW > sec.w) patch.w = Math.ceil(requiredW)
    updateSection(sec.id, patch)
  }

  const removeColGroup = (i) => {
    const next = colGroups.filter((_, idx) => idx !== i)
    update('colGroups', next.length ? next : undefined)
  }

  return (
    <SectionBlock title="Column Groups" t={t}>
      {/* Info / toggle */}
      <div style={{ fontSize: 11, color: t.labelColor, lineHeight: 1.6, marginBottom: 8 }}>
        Color columns by category (e.g. columns 1–8 = Premium, 9–11 = Gold). Seat count comes from Row Groups above.
      </div>

      {!hasGroups ? (
        <button onClick={addColGroup}
          style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px dashed ${t.inputBorder}`, background: 'none', color: t.accentText, fontSize: 11, cursor: 'pointer' }}>
          + Add column partition
        </button>
      ) : (<>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 18px', gap: 4, marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: t.labelColor }}>Category</span>
          <span style={{ fontSize: 10, color: t.labelColor }}>Seats</span>
          <span style={{ fontSize: 10, color: t.labelColor }}>Gap→</span>
          <span />
        </div>

        {colGroups.map((g, i) => {
          const cat = g.category ? categories.find(c => c.id === g.category) : null
          const dotColor = cat?.color || g.color || '#64748b'
          return (
            <div key={i} style={{ marginBottom: 5, borderRadius: 6, border: `1px solid ${t.cardBorder}`, background: t.cardBg, padding: '6px' }}>
              {/* Row 1: category + seats + gap + delete */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 18px', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <select style={{ ...inp, padding: '3px 4px', fontSize: 11 }}
                  value={g.category || ''}
                  onChange={e => updateColGroup(i, 'category', e.target.value || null)}>
                  <option value="">— Default</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input style={{ ...inp, padding: '3px 5px', fontSize: 11 }} type="number" min="1" value={g.seats}
                  onChange={e => updateColGroup(i, 'seats', Math.max(1, +e.target.value))} />
                <input style={{ ...inp, padding: '3px 5px', fontSize: 11 }} type="number" min="0" value={g.gap ?? 20}
                  title="Gap (px) after this partition"
                  onChange={e => updateColGroup(i, 'gap', Math.max(0, +e.target.value))} />
                <button onClick={() => removeColGroup(i)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, padding: 0, opacity: 0.7 }}>✕</button>
              </div>
              {/* Row 2: color dot + color picker + seat range label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 5px ${dotColor}80` }} />
                <input type="color" value={g.color || dotColor}
                  onChange={e => updateColGroup(i, 'color', e.target.value)}
                  style={{ width: 24, height: 20, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: t.labelColor }}>
                  Seats {colGroups.slice(0, i).reduce((s, x) => s + x.seats, 1)}–{colGroups.slice(0, i + 1).reduce((s, x) => s + x.seats, 0)}
                </span>
              </div>
            </div>
          )
        })}

        <button onClick={addColGroup}
          style={{ width: '100%', marginTop: 2, padding: '5px', borderRadius: 6, border: `1px dashed ${t.inputBorder}`, background: 'none', color: t.labelColor, fontSize: 11, cursor: 'pointer' }}>
          + Add partition
        </button>

        <button onClick={() => update('colGroups', undefined)}
          style={{ width: '100%', marginTop: 4, padding: '5px', borderRadius: 6, border: `1px solid rgba(248,113,113,0.2)`, background: 'rgba(248,113,113,0.05)', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
          ✕ Remove all partitions
        </button>
      </>)}
    </SectionBlock>
  )
}

function SectionBlock({ title, children, t }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, marginTop: 16, paddingBottom: 5, borderBottom: `1px solid ${t.panelBorder}` }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function RightPanel() {
  const { sections, selectedId, updateSection, categories } = useStore()
  const { selectedRowIdx, selectedRowIdxs, rowSelectMode, setRowSelectMode, setSelectedRowIdx, blockRowMode, setBlockRowMode } = useStore()
  const t = useContext(ThemeContext)
  const sec = sections.find(s => s.id === selectedId)
  const dragIdx = useRef(null)
  const [overIdx, setOverIdx] = useState(null)
  const [panelWidth, setPanelWidth] = useState(248)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onResizeMouseDown = (e) => {
    resizing.current = true
    startX.current = e.clientX
    startW.current = panelWidth
    const onMove = (e) => {
      if (!resizing.current) return
      const delta = startX.current - e.clientX
      setPanelWidth(Math.max(200, Math.min(600, startW.current + delta)))
    }
    const onUp = () => {
      resizing.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const inp = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 6, color: t.inputColor, padding: '5px 8px', fontSize: 12,
    boxSizing: 'border-box', outline: 'none',
  }

  const panel = {
    width: panelWidth, background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`,
    padding: '14px 14px', overflowY: 'auto', flexShrink: 0, position: 'relative',
  }

  const resizeHandle = (
    <div
      onMouseDown={onResizeMouseDown}
      style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        cursor: 'ew-resize', zIndex: 10,
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = t.panelBorder}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    />
  )

  if (!sec) return (
    <div style={panel}>
      {resizeHandle}
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>◻</div>
        <div style={{ fontSize: 12, color: t.labelColor, lineHeight: 1.7 }}>Select a section<br />to edit its properties</div>
      </div>
    </div>
  )

  if (sec.locked) return (
    <div style={panel}>
      {resizeHandle}
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.7 }}>Section is locked.<br />Unlock from Layers to edit.</div>
      </div>
    </div>
  )

  const update = (key, val) => updateSection(sec.id, { [key]: val })

  // ── Table type ────────────────────────────────────────────────────────────
  if (sec.type === 'table') {
    const totalChairs = sec.chairs ?? 8
    const openSpaces = sec.openSpaces ?? 0

    // Clean number input with inline +/- as subtle text buttons on the sides
    const NumInput = ({ value, min = 0, max = 99, onChange, suffix = '' }) => (
      <div style={{ display: 'flex', alignItems: 'center', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, overflow: 'hidden', height: 30 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 28, height: '100%', border: 'none', background: 'none', color: t.labelColor, cursor: 'pointer', fontSize: 16, fontWeight: 300, flexShrink: 0 }}>−</button>
        <input type="number" value={value} min={min} max={max}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))) }}
          style={{ width: 36, border: 'none', background: 'none', color: t.inputColor, fontSize: 13, fontWeight: 600, textAlign: 'center', outline: 'none' }} />
        {suffix && <span style={{ fontSize: 11, color: t.labelColor, paddingRight: 4 }}>{suffix}</span>}
        <button onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width: 28, height: '100%', border: 'none', background: 'none', color: t.labelColor, cursor: 'pointer', fontSize: 16, fontWeight: 300, flexShrink: 0 }}>+</button>
      </div>
    )

    const Toggle = ({ value, onChange }) => (
      <button onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', background: value ? t.accent : t.inputBorder, transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    )

    return (
      <div style={panel}>
        {resizeHandle}
        <div style={{ fontSize: 11, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Table</div>

        <SectionBlock title="Shape" t={t}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[{ id: 'round', icon: '⬤', label: 'Round' }, { id: 'rect', icon: '▬', label: 'Rect' }].map(s => (
              <button key={s.id} onClick={() => {
                if (s.id === sec.tableShape) return
                if (s.id === 'rect') {
                  // round → rect: distribute chairs across 4 sides
                  const c = sec.chairs ?? 8
                  const side = Math.floor(c / 4)
                  const extra = c % 4
                  update('tableShape', 'rect')
                  updateSection(sec.id, {
                    tableShape: 'rect',
                    seatsTop:    side + (extra > 0 ? 1 : 0),
                    seatsBottom: side + (extra > 1 ? 1 : 0),
                    seatsLeft:   side + (extra > 2 ? 1 : 0),
                    seatsRight:  side,
                  })
                } else {
                  // rect → round: sum all sides into chairs
                  const total = (sec.seatsTop ?? 2) + (sec.seatsBottom ?? 2) + (sec.seatsLeft ?? 1) + (sec.seatsRight ?? 1)
                  updateSection(sec.id, { tableShape: 'round', chairs: total })
                }
              }}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${sec.tableShape === s.id ? t.accent : t.inputBorder}`, background: sec.tableShape === s.id ? `${t.accent}22` : t.inputBg, color: sec.tableShape === s.id ? t.accent : t.labelColor, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: sec.tableShape === s.id ? 700 : 400 }}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          <Field label={`Rotation — ${Math.round(sec.rotation ?? 0)}°`} t={t}>
            <input type="range" min={0} max={359} value={sec.rotation ?? 0}
              onChange={e => update('rotation', +e.target.value)}
              style={{ width: '100%', accentColor: t.accent }} />
          </Field>

          {sec.tableShape === 'rect' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Width" t={t}>
                <NumInput value={sec.tableW ?? 100} min={30} max={400} onChange={v => update('tableW', v)} />
              </Field>
              <Field label="Height" t={t}>
                <NumInput value={sec.tableH ?? 60} min={20} max={400} onChange={v => update('tableH', v)} />
              </Field>
            </div>
          )}

          {sec.tableShape === 'round' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Diameter" t={t}>
                <NumInput value={sec.tableW ?? 80} min={20} max={400} onChange={v => update('tableW', v)} />
              </Field>
              <Field label="Auto-fit" t={t}>
                <div style={{ display: 'flex', alignItems: 'center', height: 30 }}>
                  <Toggle value={sec.autoRadius ?? true} onChange={v => update('autoRadius', v)} />
                  <span style={{ fontSize: 11, color: t.labelColor, marginLeft: 6 }}>{(sec.autoRadius ?? true) ? 'On' : 'Off'}</span>
                </div>
              </Field>
            </div>
          )}

          {/* Seat size — both table types */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: t.labelColor }}>Seat Size</span>
            <NumInput value={sec.chairSize ?? Math.max(6, Math.min(sec.tableW ?? 100, sec.tableH ?? 60) * 0.12) | 0} min={4} max={40}
              onChange={v => update('chairSize', v)} />
          </div>
        </SectionBlock>

        <SectionBlock title="Chairs & Spaces" t={t}>
          {sec.tableShape === 'rect' ? (<>
            <div style={{ fontSize: 11, color: t.labelColor, marginBottom: 8 }}>Seats per side</div>
            {[
              { label: '↑ Top',    key: 'seatsTop',    def: 2 },
              { label: '↓ Bottom', key: 'seatsBottom', def: 2 },
              { label: '← Left',   key: 'seatsLeft',   def: 1 },
              { label: '→ Right',  key: 'seatsRight',  def: 1 },
            ].map(({ label, key, def }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: t.labelColor }}>{label}</span>
                <NumInput value={sec[key] ?? def} min={0} max={20} onChange={v => update(key, v)} />
              </div>
            ))}
            <div style={{ fontSize: 11, color: t.labelColor, marginTop: 4, padding: '5px 8px', background: t.cardBg, borderRadius: 6, border: `1px solid ${t.cardBorder}` }}>
              Total: {(sec.seatsTop ?? 2) + (sec.seatsBottom ?? 2) + (sec.seatsLeft ?? 1) + (sec.seatsRight ?? 1)} seats
            </div>
          </>) : (<>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: t.labelColor }}>Chairs</span>
              <NumInput value={totalChairs} min={0} max={50} onChange={v => update('chairs', v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: t.labelColor }}>Open spaces</span>
              <NumInput value={openSpaces} min={0} max={20} onChange={v => { update('openSpaces', v); update('openSpaceIndices', null) }} />
            </div>
            {openSpaces > 0 && (
              <div style={{ fontSize: 11, color: t.labelColor, marginTop: 6, lineHeight: 1.5 }}>
                💡 Shift+click any chair on canvas to move an open space to that position.
              </div>
            )}
          </>)}
        </SectionBlock>

        <SectionBlock title="Table Label" t={t}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={sec.label} onChange={e => update('label', e.target.value)} placeholder="Table number" />
            <button onClick={() => update('labelVisible', !(sec.labelVisible ?? true))}
              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: (sec.labelVisible ?? true) ? `${t.accent}22` : t.inputBg, color: (sec.labelVisible ?? true) ? t.accent : t.labelColor, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {(sec.labelVisible ?? true) ? '👁 Visible' : '👁 Hidden'}
            </button>
          </div>
          <Field label="Category" t={t}>
            <select style={inp} value={sec.categoryId || 'general'} onChange={e => {
              const cat = categories.find(c => c.id === e.target.value)
              update('categoryId', e.target.value)
              if (cat) update('color', cat.color)
            }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Price (₹)" t={t}>
            <input style={inp} type="number" min={0} value={sec.price ?? 0} onChange={e => update('price', +e.target.value)} />
          </Field>
          <Field label="Color" t={t}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color" value={sec.color ?? '#7c3aed'} onChange={e => update('color', e.target.value)}
                style={{ width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }} />
              <input style={{ ...inp, flex: 1 }} value={sec.color ?? '#7c3aed'}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update('color', e.target.value) }}
                maxLength={7} />
            </div>
          </Field>
        </SectionBlock>

        <SectionBlock title="Booking" t={t}>
          <div style={{ borderRadius: 8, border: `1px solid ${sec.bookBySeat ? t.accent : t.inputBorder}`, background: sec.bookBySeat ? `${t.accent}11` : t.inputBg, padding: '10px 12px', cursor: 'pointer' }}
            onClick={() => update('bookBySeat', !sec.bookBySeat)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: sec.bookBySeat ? t.accent : t.inputColor }}>Book by seat</span>
              <Toggle value={sec.bookBySeat ?? false} onChange={v => update('bookBySeat', v)} />
            </div>
            <div style={{ fontSize: 11, color: t.labelColor, lineHeight: 1.5 }}>
              Users select individual seats. The seats get booked, not the table.
            </div>
          </div>
        </SectionBlock>

        {(() => {
          const totalSeats = sec.tableShape === 'rect'
            ? (sec.seatsTop ?? 2) + (sec.seatsBottom ?? 2) + (sec.seatsLeft ?? 1) + (sec.seatsRight ?? 1)
            : totalChairs
          return (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {[
                { val: totalSeats, label: 'Chairs' },
                { val: sec.tableShape === 'rect' ? 0 : openSpaces, label: 'Open' },
                { val: sec.blockedSeats?.length ?? 0, label: 'Blocked', warn: true },
              ].map(({ val, label, warn }) => (
                <div key={label} style={{ flex: 1, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: warn && val ? '#f87171' : t.inputColor }}>{val}</div>
                  <div style={{ fontSize: 10, color: t.labelColor }}>{label}</div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    )
  }

  // ── Row type ──────────────────────────────────────────────────────────────
  if (sec.type === 'row') return (
    <div style={panel}>
      {resizeHandle}
      <div style={{ fontSize: 11, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Row Properties</div>

      <SectionBlock title="Identity" t={t}>
        <Field label="Label" t={t}>
          <input style={inp} value={sec.label} onChange={e => update('label', e.target.value)} />
        </Field>
        <Field label="Category" t={t}>
          <select style={inp} value={sec.categoryId || 'general'} onChange={e => {
            const cat = categories.find(c => c.id === e.target.value)
            update('categoryId', e.target.value)
            if (cat) update('color', cat.color)
          }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Color" t={t}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={sec.color} onChange={e => update('color', e.target.value)}
              style={{ width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }} />
            <input style={{ ...inp, flex: 1 }} value={sec.color}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update('color', e.target.value) }}
              maxLength={7} />
          </div>
        </Field>
        <Field label="Price (₹)" t={t}>
          <input style={inp} type="number" min={0} value={sec.price ?? 0}
            onChange={e => update('price', +e.target.value)} />
        </Field>
      </SectionBlock>

      <SectionBlock title="Seats" t={t}>
        <Field label="Count" t={t}>
          <input style={inp} type="number" min={1} max={200} value={sec.seats}
            onChange={e => update('seats', Math.max(1, Math.min(200, +e.target.value)))} />
        </Field>
        <Field label={`Spacing — ${sec.seatSpacing}px`} t={t}>
          <input type="range" min={10} max={100} value={sec.seatSpacing}
            onChange={e => update('seatSpacing', +e.target.value)}
            style={{ width: '100%', accentColor: t.accent }} />
        </Field>
        <Field label={`Size — ${Math.round(sec.seatSize ?? sec.seatSpacing * 0.35)}px`} t={t}>
          <input type="range" min={3} max={30} value={Math.round(sec.seatSize ?? sec.seatSpacing * 0.35)}
            onChange={e => update('seatSize', +e.target.value)}
            style={{ width: '100%', accentColor: t.accent }} />
        </Field>
      </SectionBlock>

      <SectionBlock title="Shape" t={t}>
        <Field label={`Curve — ${sec.curve ?? 0}`} t={t}>
          <input type="range" min={-200} max={200} value={sec.curve ?? 0}
            onChange={e => update('curve', +e.target.value)}
            style={{ width: '100%', accentColor: t.accent }} />
        </Field>
        <Field label={`Rotation — ${Math.round(sec.rotation ?? 0)}°`} t={t}>
          <input type="range" min={0} max={359} value={sec.rotation ?? 0}
            onChange={e => update('rotation', +e.target.value)}
            style={{ width: '100%', accentColor: t.accent }} />
        </Field>
      </SectionBlock>
    </div>
  )

  // ── Section types (arc / rect / poly) ─────────────────────────────────────
  const rowGroups = sec.rowGroups || [{ rows: 1, seatsPerRow: sec.totalSeats || 10 }]
  const totalSeats = sec.gridLayout?.blocks?.length > 0
    ? sec.gridLayout.blocks.reduce((s, b) => s + (b.rowEnd - b.rowStart + 1) * (b.colEnd - b.colStart + 1), 0)
    : rowGroups.reduce((s, g) => s + (g.rows || 1) * (g.seatsPerRow || 0), 0)

  const updateGroup = (i, key, val) => {
    const num = Number(val) || 1
    let clamped
    if (key === 'spacing') {
      const g = rowGroups[i]
      const c = Math.max(2, g.seatsPerRow || 1)
      let maxSpacing = 2, minSpacing = 0.1
      if (sec.type === 'rect' && sec.w) {
        const inset = 6, uw = sec.w - inset * 2
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
    dragIdx.current = null; setOverIdx(null)
  }
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null) }

  return (
    <div style={panel}>
      {resizeHandle}
      <div style={{ fontSize: 11, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Section Properties</div>

      <SectionBlock title="Identity" t={t}>
        <Field label="Label" t={t}>
          <input style={inp} value={sec.label} onChange={e => update('label', e.target.value)} />
        </Field>
        <Field label="Category" t={t}>
          <select style={inp} value={sec.category} onChange={e => {
            const cat = categories.find(c => c.id === e.target.value)
            update('category', e.target.value)
            if (cat) update('color', cat.color)
          }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Color" t={t}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={sec.color} onChange={e => update('color', e.target.value)}
              style={{ width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }} />
            <input style={{ ...inp, flex: 1 }} value={sec.color}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update('color', e.target.value) }}
              maxLength={7} />
          </div>
        </Field>
        <Field label="Price (₹)" t={t}>
          <input style={inp} type="number" value={sec.price} onChange={e => update('price', Number(e.target.value))} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Status" t={t}>
            <select style={inp} value={sec.status || 'available'} onChange={e => update('status', e.target.value)}>
              <option value="available">Available</option>
              <option value="sold">Sold Out</option>
              <option value="reserved">Reserved</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Rows" t={t}>
            <input style={inp} type="number" min={1} max={500}
              value={rowGroups.reduce((s, g) => s + (g.rows || 1), 0)}
              onChange={e => {
                const rows = Math.max(1, Math.min(500, +e.target.value) || 1)
                const seatsPerRow = Math.max(...rowGroups.map(g => g.seatsPerRow || 1))
                update('rowGroups', [{ ...rowGroups[0], rows, seatsPerRow }])
                if (sec.gridLayout) updateSection(sec.id, { gridLayout: { ...sec.gridLayout, totalRows: rows } })
              }} />
          </Field>
          <Field label="Columns" t={t}>
            <input style={inp} type="number" min={1} max={500}
              value={Math.max(...rowGroups.map(g => g.seatsPerRow || 1))}
              onChange={e => {
                const seatsPerRow = Math.max(1, Math.min(500, +e.target.value) || 1)
                const rows = rowGroups.reduce((s, g) => s + (g.rows || 1), 0)
                update('rowGroups', [{ ...rowGroups[0], rows, seatsPerRow }])
                if (sec.gridLayout) updateSection(sec.id, { gridLayout: { ...sec.gridLayout, totalCols: seatsPerRow } })
              }} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Seat Layout" t={t}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <div style={{ flex: 1, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.inputColor }}>{totalSeats}</div>
            <div style={{ fontSize: 10, color: t.labelColor }}>Total</div>
          </div>
          <div style={{ flex: 1, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: sec.blockedSeats?.length ? '#f87171' : t.inputColor }}>{sec.blockedSeats?.length || 0}</div>
            <div style={{ fontSize: 10, color: t.labelColor }}>Blocked</div>
          </div>
          <div style={{ flex: 1, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{totalSeats - (sec.blockedSeats?.length || 0)}</div>
            <div style={{ fontSize: 10, color: t.labelColor }}>Open</div>
          </div>
        </div>

        {/* Show seats toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: t.inputColor }}>Show seats</span>
          <button onClick={() => update('showSeats', !(sec.showSeats ?? true))}
            style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', background: (sec.showSeats ?? true) ? t.accent : t.inputBorder, transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: (sec.showSeats ?? true) ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>

        {totalSeats > 3000 && (sec.showSeats ?? true) && (
          <div style={{ fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 8px', marginBottom: 8, lineHeight: 1.5 }}>
            ⚠️ Only first 3,000 seats rendered for performance.
          </div>
        )}

        {(sec.type === 'rect' || sec.type === 'arc') ? (
          <>
        {sec.type === 'rect' && (() => {
              const hasSelection = selectedRowIdxs.length > 0
              const rowCurves = sec.rowCurves || []
              const curveVal = hasSelection ? (rowCurves[selectedRowIdx] ?? 0) : 0
              return (
                <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Row curve button */}
                  <button
                    onClick={() => { setRowSelectMode(!rowSelectMode); setBlockRowMode(false); if (rowSelectMode) setSelectedRowIdx(null) }}
                    style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px solid ${rowSelectMode ? '#22d3ee' : t.inputBorder}`, background: rowSelectMode ? '#22d3ee22' : t.inputBg, color: rowSelectMode ? '#22d3ee' : t.labelColor, fontSize: 11, cursor: 'pointer', fontWeight: rowSelectMode ? 700 : 400 }}>
                    {rowSelectMode ? `✦ Row Select ON${hasSelection ? ` — ${selectedRowIdxs.length} row${selectedRowIdxs.length > 1 ? 's' : ''} selected` : ' — click rows'}` : '⊹ Select Rows to Adjust Curve'}
                  </button>
                  {rowSelectMode && hasSelection && (
                    <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22d3ee44', background: '#22d3ee0a' }}>
                      <label style={{ display: 'block', fontSize: 11, color: '#22d3ee', marginBottom: 4, fontWeight: 600 }}>
                        {selectedRowIdxs.length > 1 ? `Rows ${selectedRowIdxs.map(i => i+1).join(', ')}` : `Row ${selectedRowIdx + 1}`} Curve — {curveVal}
                      </label>
                      <input type="range" min={-200} max={200} value={curveVal}
                        onChange={e => {
                          const curves = [...(sec.rowCurves || [])]
                          selectedRowIdxs.forEach(i => { curves[i] = +e.target.value })
                          updateSection(sec.id, { rowCurves: curves })
                        }}
                        style={{ width: '100%', accentColor: '#22d3ee' }} />
                    </div>
                  )}
                  {rowSelectMode && !hasSelection && (
                    <div style={{ fontSize: 11, color: t.labelColor, textAlign: 'center' }}>Click seats to select rows (click again to deselect)</div>
                  )}
                  {/* Block row button */}
                  <button
                    onClick={() => { setBlockRowMode(!blockRowMode); setRowSelectMode(false) }}
                    style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px solid ${blockRowMode ? '#f87171' : t.inputBorder}`, background: blockRowMode ? '#f8717122' : t.inputBg, color: blockRowMode ? '#f87171' : t.labelColor, fontSize: 11, cursor: 'pointer', fontWeight: blockRowMode ? 700 : 400 }}>
                    {blockRowMode ? '✦ Block Row ON — click any seat in a row' : '⊘ Block / Unblock Entire Row'}
                  </button>
                  {blockRowMode && (
                    <div style={{ fontSize: 11, color: t.labelColor, textAlign: 'center' }}>Click any seat to block/unblock its entire row</div>
                  )}
                </div>
              )
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 3, fontWeight: 600 }}>Seat Size (px)</label>
                <input type="number" step="0.5" min="1" max="50" placeholder="auto"
                  value={sec.seatSize ?? ''}
                  onChange={e => update('seatSize', e.target.value === '' ? null : Math.max(1, Number(e.target.value)))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '4px 6px', fontSize: 11, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 3, fontWeight: 600 }}>Row Gap (px)</label>
                <input type="number" step="0.5" min="0" max="200" placeholder="auto"
                  value={sec.seatRowGap ?? ''}
                  onChange={e => update('seatRowGap', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '4px 6px', fontSize: 11, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 3, fontWeight: 600 }}>Col Gap (px)</label>
                <input type="number" step="0.5" min="0" max="200" placeholder="auto"
                  value={sec.seatColGap ?? ''}
                  onChange={e => update('seatColGap', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '4px 6px', fontSize: 11, boxSizing: 'border-box' }} />
              </div>
            </div>
          </>
        ) : (
          (sec.showSeats ?? true) ? (
            <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 1fr 1fr 18px', gap: 4, marginBottom: 3 }}>
            <span /><span style={{ fontSize: 10, color: t.labelColor }}>Rows</span>
            <span style={{ fontSize: 10, color: t.labelColor }}>Seats</span>
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
                style={{ marginBottom: 5, borderRadius: 6, border: overIdx === i ? `1px solid ${t.accent}` : `1px solid ${t.cardBorder}`, background: t.cardBg, padding: '5px 5px 4px', opacity: dragIdx.current === i ? 0.4 : 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 1fr 1fr 18px', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: t.gripColor, cursor: 'grab', fontSize: 11, textAlign: 'center' }}>⠿</span>
                  <input style={{ ...inp, padding: '3px 5px', fontSize: 11 }} type="number" min="1" value={g.rows}
                    onChange={e => updateGroup(i, 'rows', e.target.value)} />
                  <input style={{ ...inp, padding: '3px 5px', fontSize: 11 }} type="number" min="1" value={g.seatsPerRow}
                    onChange={e => updateGroup(i, 'seatsPerRow', e.target.value)} />
                  <input style={{ ...inp, padding: '3px 5px', fontSize: 11 }} type="number" min="0.1" max="2" step="0.1"
                    value={(g.spacing ?? 1).toFixed(1)}
                    onChange={e => updateGroup(i, 'spacing', Math.max(0.1, Math.min(2, Number(e.target.value))))} />
                  <button onClick={() => removeGroup(i)} disabled={rowGroups.length === 1}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: rowGroups.length === 1 ? 'default' : 'pointer', fontSize: 12, padding: 0, opacity: rowGroups.length === 1 ? 0.2 : 0.7 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 1fr 18px', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', margin: '0 auto', boxShadow: `0 0 4px ${dotColor}80` }} />
                  <select style={{ ...inp, padding: '2px 4px', fontSize: 10 }} value={g.category || ''}
                    onChange={e => updateGroup(i, 'category', e.target.value || null)}>
                    <option value="">Default</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <input style={{ ...inp, padding: '2px 5px', fontSize: 10 }} type="number" placeholder={`₹${sec.price}`}
                    value={g.price ?? ''}
                    onChange={e => updateGroup(i, 'price', e.target.value === '' ? null : Number(e.target.value))} />
                  <span />
                </div>
              </div>
            )
          })}

          <button onClick={addGroup} style={{ width: '100%', marginTop: 4, padding: '6px', borderRadius: 6, border: `1px dashed ${t.inputBorder}`, background: 'none', color: t.labelColor, fontSize: 11, cursor: 'pointer' }}>
            + Add row group
          </button>
            </>
          ) : (
            <Field label="Total Seats" t={t}>
              <input style={inp} type="number" min="1" value={sec.totalSeats || 0} onChange={e => update('totalSeats', Math.max(1, Number(e.target.value)))} />
            </Field>
          )
        )}
      </SectionBlock>

      {sec.type === 'rect' && (
        <GridBlockEditor section={sec} onUpdate={(updates) => updateSection(sec.id, updates)} />
      )}

      {sec.type === 'arc' && (
        <SectionBlock title="Arc Geometry" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Start °" t={t}><input style={inp} type="number" value={Math.round(sec.startAngle)} onChange={e => update('startAngle', Number(e.target.value))} /></Field>
            <Field label="End °" t={t}><input style={inp} type="number" value={Math.round(sec.endAngle)} onChange={e => update('endAngle', Number(e.target.value))} /></Field>
            <Field label="Inner R" t={t}><input style={inp} type="number" step="0.05" value={(sec.innerR ?? 0).toFixed(2)} onChange={e => update('innerR', Number(e.target.value))} /></Field>
            <Field label="Outer R" t={t}><input style={inp} type="number" step="0.05" value={(sec.outerR ?? 0).toFixed(2)} onChange={e => update('outerR', Number(e.target.value))} /></Field>
          </div>
        </SectionBlock>
      )}

      {sec.type === 'rect' && (
        <SectionBlock title="Position & Size" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="X" t={t}><input style={inp} type="number" value={Math.round(sec.x)} onChange={e => update('x', Number(e.target.value))} /></Field>
            <Field label="Y" t={t}><input style={inp} type="number" value={Math.round(sec.y)} onChange={e => update('y', Number(e.target.value))} /></Field>
            <Field label="Width" t={t}><input style={inp} type="number" value={Math.round(sec.w)} onChange={e => update('w', Number(e.target.value))} /></Field>
            <Field label="Height" t={t}><input style={inp} type="number" value={Math.round(sec.h)} onChange={e => update('h', Number(e.target.value))} /></Field>
          </div>
        </SectionBlock>
      )}

      {sec.type === 'rect' && (
        <SectionBlock title="Section Spacing" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 4, fontWeight: 600 }}>H Gap (sections)</label>
              <input type="number" step="1" min="0" value={sec._hGap ?? 0} onChange={(e) => {
                const gap = Math.max(0, Number(e.target.value) || 0)
                updateSection(sec.id, { _hGap: gap })
                const rectSecs = sections.filter(s => s.type === 'rect')
                if (rectSecs.length < 2) return
                const sorted = [...rectSecs].sort((a, b) => a.x - b.x)
                let cursor = sorted[0].x
                sorted.forEach(s => { updateSection(s.id, { x: cursor }); cursor += s.w + gap })
              }} style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 4, fontWeight: 600 }}>V Gap (sections)</label>
              <input type="number" step="1" min="0" value={sec._vGap ?? 0} onChange={(e) => {
                const gap = Math.max(0, Number(e.target.value) || 0)
                updateSection(sec.id, { _vGap: gap })
                const rectSecs = sections.filter(s => s.type === 'rect')
                if (rectSecs.length < 2) return
                const sorted = [...rectSecs].sort((a, b) => a.y - b.y)
                let cursor = sorted[0].y
                sorted.forEach(s => { updateSection(s.id, { y: cursor }); cursor += s.h + gap })
              }} style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => {
                const rectSecs = sections.filter(s => s.type === 'rect')
                if (rectSecs.length < 2) return
                const hGap = sec._hGap ?? 0
                const vGap = sec._vGap ?? 0
                const sorted = [...rectSecs].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y)
                let cursor = sorted[0].x
                sorted.forEach(s => { updateSection(s.id, { x: cursor }); cursor += s.w + hGap })
                const sortedV = [...rectSecs].sort((a, b) => a.y - b.y)
                let cursorV = sortedV[0].y
                sortedV.forEach(s => { updateSection(s.id, { y: cursorV }); cursorV += s.h + vGap })
              }} style={{ width: '100%', padding: '5px 4px', fontSize: 11, background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputColor, borderRadius: 4, cursor: 'pointer' }}>
                ↔ Redistribute
              </button>
            </div>
          </div>
        </SectionBlock>
      )}
    </div>
  )
}