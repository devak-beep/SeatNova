import React, { useContext, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../EditorApp'

// Generate seat IDs for a section: {sectionLabel}-R{row}S{seat}
function getSeatIds(sec) {
  const ids = []
  const groups = sec.rowGroups || [{ rows: 1, seatsPerRow: sec.totalSeats || 0 }]
  let rowNum = 1
  for (const g of groups) {
    for (let r = 0; r < (g.rows || 1); r++) {
      for (let s = 1; s <= (g.seatsPerRow || 0); s++) {
        ids.push(`${sec.label}-Row${rowNum}-Seat${s}`)
      }
      rowNum++
    }
  }
  return ids
}

function validateLayout(sections) {
  const issues = []

  // 1. Duplicate seat IDs across sections
  const allIds = []
  for (const sec of sections) {
    const ids = getSeatIds(sec)
    for (const id of ids) {
      allIds.push({ id, secLabel: sec.label })
    }
  }
  const seen = {}
  for (const { id, secLabel } of allIds) {
    if (seen[id]) {
      issues.push({ type: 'duplicate', msg: `Duplicate seat ID "${id}" in section "${secLabel}" and "${seen[id]}"` })
    } else {
      seen[id] = secLabel
    }
  }

  // 2. Sections with same label (causes duplicate IDs by design)
  const labelCount = {}
  for (const sec of sections) {
    labelCount[sec.label] = (labelCount[sec.label] || 0) + 1
  }
  for (const [label, count] of Object.entries(labelCount)) {
    if (count > 1) issues.push({ type: 'label', msg: `${count} sections share the label "${label}" — seat IDs will collide` })
  }

  // 3. Overlapping rect sections (bounding box)
  const rects = sections.filter(s => s.type === 'rect')
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
      if (overlap) issues.push({ type: 'overlap', msg: `Sections "${a.label}" and "${b.label}" overlap` })
    }
  }

  // 4. Overlapping arc sections (angle + radius range)
  const arcs = sections.filter(s => s.type === 'arc')
  const norm = a => ((a % 360) + 360) % 360
  const angOverlap = (s1, e1, s2, e2) => {
    // Normalize both arcs to [0,360) and check if their angular spans intersect
    const inSpan = (angle, start, end) => {
      if (start <= end) return angle >= start && angle < end
      return angle >= start || angle < end  // wraps around 0
    }
    const n1s = norm(s1), n1e = norm(e1)
    const n2s = norm(s2), n2e = norm(e2)
    return inSpan(n2s, n1s, n1e) || inSpan(n1s, n2s, n2e)
  }
  for (let i = 0; i < arcs.length; i++) {
    for (let j = i + 1; j < arcs.length; j++) {
      const a = arcs[i], b = arcs[j]
      if (a.outerR <= b.innerR || b.outerR <= a.innerR) continue  // different rings
      if (angOverlap(a.startAngle, a.endAngle, b.startAngle, b.endAngle))
        issues.push({ type: 'overlap', msg: `Arc sections "${a.label}" and "${b.label}" overlap` })
    }
  }

  return issues
}

function ValidateModal({ onClose, t }) {
  const sections = useStore(s => s.sections)
  const issues = validateLayout(sections)

  // Build seat ID list per section for display
  const seatMap = sections.map(sec => ({ label: sec.label, ids: getSeatIds(sec), type: sec.type }))

  const iconFor = type => type === 'duplicate' ? '🔁' : type === 'label' ? '🏷️' : '⚠️'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 300, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: t.inputColor }}>✓ Layout Validation</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.labelColor, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {/* Issues */}
          <div style={{ fontSize: 12, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Issues {issues.length === 0 ? '✅' : `(${issues.length})`}
          </div>
          {issues.length === 0
            ? <div style={{ fontSize: 13, color: '#4ade80', marginBottom: 16 }}>No issues found. Layout is valid.</div>
            : <div style={{ marginBottom: 16 }}>
                {issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 12, color: iss.type === 'overlap' ? '#f87171' : '#fbbf24', background: iss.type === 'overlap' ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)', border: `1px solid ${iss.type === 'overlap' ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)'}`, borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}>
                    {iconFor(iss.type)} {iss.msg}
                  </div>
                ))}
              </div>
          }

          {/* Seat ID preview per section */}
          <div style={{ fontSize: 12, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Seat IDs by Section
          </div>
          {seatMap.map(sec => (
            <div key={sec.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.inputColor, marginBottom: 4 }}>
                {sec.label} <span style={{ fontWeight: 400, color: t.labelColor }}>({sec.ids.length} seats)</span>
              </div>
              <div style={{ fontSize: 11, color: t.labelColor, lineHeight: 1.8, wordBreak: 'break-all' }}>
                {sec.ids.slice(0, 30).join(', ')}{sec.ids.length > 30 ? ` … +${sec.ids.length - 30} more` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function SpacingModal({ onClose, t, ids, applySpacing }) {
  const sections = useStore(s => s.sections)
  const selected = ids.map(id => sections.find(s => s.id === id)).filter(Boolean)
  const arcSections = selected.filter(s => s.type === 'arc').sort((a, b) => a.startAngle - b.startAngle)
  
  const [spacing, setSpacing] = useState(5)
  const [startIdx, setStartIdx] = useState(0)
  const [endIdx, setEndIdx] = useState(arcSections.length - 1)

  const handleApply = () => {
    applySpacing(ids, spacing, startIdx, endIdx)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 300, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, width: 420, display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: t.inputColor }}>⚡ Apply Equal Spacing</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.labelColor, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {arcSections.length < 2 ? (
            <div style={{ fontSize: 13, color: '#f87171' }}>Select at least 2 arc sections.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: t.inputColor, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, padding: 10 }}>
                <strong>{arcSections.length} sections</strong> selected
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: t.inputColor, display: 'block', marginBottom: 6 }}>
                  Gap between sections (degrees)
                </label>
                <input type="number" value={spacing} onChange={e => setSpacing(+e.target.value)} 
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${t.panelBorder}`, background: t.inputBg, color: t.inputColor, fontSize: 14 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: t.inputColor, display: 'block', marginBottom: 6 }}>
                    Start from
                  </label>
                  <select value={startIdx} onChange={e => setStartIdx(+e.target.value)} 
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${t.panelBorder}`, background: t.inputBg, color: t.inputColor, fontSize: 13 }}>
                    {arcSections.map((sec, i) => (
                      <option key={i} value={i}>{sec.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: t.inputColor, display: 'block', marginBottom: 6 }}>
                    End at
                  </label>
                  <select value={endIdx} onChange={e => setEndIdx(+e.target.value)} 
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${t.panelBorder}`, background: t.inputBg, color: t.inputColor, fontSize: 13 }}>
                    {arcSections.map((sec, i) => (
                      <option key={i} value={i}>{sec.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 11, color: t.labelColor, background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)', borderRadius: 6, padding: 8 }}>
                💡 Sections from <strong>{arcSections[startIdx]?.label}</strong> to <strong>{arcSections[endIdx]?.label}</strong> will have {spacing}° gaps. Others stay in place.
              </div>

              <button onClick={handleApply} disabled={startIdx >= endIdx}
                style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: startIdx >= endIdx ? t.panelBorder : '#ea580c', color: '#fff', fontSize: 14, cursor: startIdx >= endIdx ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                Apply Spacing
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const TOOLS = [
  { id: 'select', icon: '↖', label: 'Select', title: 'Select & edit sections' },
  { id: 'multiselect', icon: '☑', label: 'Multi', title: 'Multi-select sections for spacing' },
  { id: 'arc', icon: '◔', label: 'Arc', title: 'Click start, move, click end to draw arc section' },
  { id: 'rect', icon: '▭', label: 'Rect', title: 'Drag to draw rectangular section' },
  { id: 'poly', icon: '✦', label: 'Poly', title: 'Click to place points, double-click or click first point to close' },
  { id: 'row', icon: '⋯', label: 'Row', title: 'Click to place a row of seats' },
  { id: 'table', icon: '⬡', label: 'Table', title: 'Click to place a table with chairs' },
]

function AuthModal({ onClose, onAuth, t }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true); setError('')
    try {
      const fn = mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })
      const { error: err } = await fn
      if (err) throw err
      onAuth()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${t.panelBorder}`, background: t.inputBg, color: t.inputColor, fontSize: 14, boxSizing: 'border-box' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 300, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, width: 360, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: t.inputColor }}>☁ {mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.labelColor, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} />
          {error && <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>}
          <button onClick={handle} disabled={loading} style={{ padding: '9px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
          <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: t.labelColor, fontSize: 12, cursor: 'pointer' }}>
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </>
  )
}

function CloudModal({ onClose, t, storeState, importJSON }) {
  const [venues, setVenues] = useState(null)
  const [status, setStatus] = useState('')

  React.useEffect(() => {
    loadVenues().then(setVenues).catch(e => setStatus(e.message))
  }, [])

  const handleSave = async () => {
    setStatus('Saving...')
    try {
      await saveVenue(storeState)
      setStatus('Saved ✓')
      loadVenues().then(setVenues)
    } catch (e) { setStatus('Error: ' + e.message) }
  }

  const handleLoad = async (id) => {
    setStatus('Loading...')
    try {
      const v = await loadVenue(id)
      importJSON(JSON.stringify({
        venue: { name: v.name, shape: v.shape, field: v.field_type, fieldX: v.field_x, fieldY: v.field_y, fieldScale: v.field_scale, stageX: v.stage_x, stageY: v.stage_y, stageW: v.stage_w, stageH: v.stage_h, canvasSize: v.canvas_size },
        categories: v.categories,
        sections: v.sections,
      }))
      setStatus('Loaded ✓')
      onClose()
    } catch (e) { setStatus('Error: ' + e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this venue?')) return
    try {
      await deleteVenue(id)
      setVenues(vs => vs.filter(v => v.id !== id))
    } catch (e) { setStatus('Error: ' + e.message) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 300, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, width: 460, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: t.inputColor }}>☁ Cloud Venues</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.labelColor, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleSave} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            ⬆ Save Current
          </button>
          {status && <span style={{ fontSize: 12, color: status.includes('Error') ? '#f87171' : '#4ade80' }}>{status}</span>}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {!venues ? <div style={{ fontSize: 13, color: t.labelColor }}>Loading...</div>
            : venues.length === 0 ? <div style={{ fontSize: 13, color: t.labelColor }}>No saved venues yet.</div>
            : venues.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${t.panelBorder}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.inputColor }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: t.labelColor }}>{new Date(v.updated_at).toLocaleString()}</div>
                </div>
                <button onClick={() => handleLoad(v.id)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Load</button>
                <button onClick={() => handleDelete(v.id)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}

export default function Toolbar({ onPreview, onSave, onHome, saveStatus }) {
  const { tool, setTool, venueName, exportJSON, importJSON, undo, redo, past, future, selectedId, selectedIds, duplicateSection, theme, toggleTheme, applySpacing } = useStore()
  const t = useContext(ThemeContext)
  const [showValidate, setShowValidate] = useState(false)
  const [showSpacing, setShowSpacing] = useState(false)

  const handleSave = async () => { if (onSave) await onSave() }

  const statusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'unsaved' ? 'Unsaved'
    : 'Saved'
  const statusColor = saveStatus === 'saving' ? '#f59e0b'
    : saveStatus === 'unsaved' ? '#f87171'
    : '#4ade80'
  const statusDot = saveStatus === 'saving' ? '#f59e0b'
    : saveStatus === 'unsaved' ? '#f87171'
    : '#4ade80'

  const handleExport = () => {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'venue.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json,application/json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try { importJSON(ev.target.result) }
        catch { alert('Invalid layout file. Please export a valid SeatNova JSON.') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const isDark = theme === 'dark'

  const bar = {
    height: 56,
    background: t.panelBg,
    borderBottom: `1px solid ${t.panelBorder}`,
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 16px',
    flexShrink: 0,
  }

  // Divider between groups
  const divider = {
    width: 1,
    height: 28,
    background: t.panelBorder,
    margin: '0 10px',
    flexShrink: 0,
  }

  const iconBtn = (active, color) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 7,
    border: active ? `1px solid ${color || '#3b82f6'}` : '1px solid transparent',
    background: active ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') : 'transparent',
    color: active ? (color || '#60a5fa') : t.btnColor,
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
  })

  const actionBtn = (bg, hoverBg) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 7,
    border: 'none',
    background: bg,
    color: '#fff',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  })

  const ghostBtn = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 7,
    border: `1px solid ${t.panelBorder}`,
    background: 'transparent',
    color: t.btnColor,
    fontSize: 12, fontWeight: 400,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }

  return (
    <div style={bar}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 4, flexShrink: 0 }}>
        <svg width="32" height="32" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke={isDark ? '#6d28d9' : '#7c3aed'} strokeWidth="2.5" opacity="0.6" />
          <rect x="27" y="32" width="26" height="16" rx="2" fill={isDark ? '#6d28d9' : '#7c3aed'} opacity="0.35" />
          <circle cx="38" cy="12" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="44" cy="12" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="68" cy="38" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="68" cy="44" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="44" cy="68" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="38" cy="68" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="12" cy="44" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
          <circle cx="12" cy="38" r="2.5" fill={isDark ? '#a78bfa' : '#7c3aed'} />
        </svg>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#a78bfa' : '#7c3aed', letterSpacing: '-0.02em' }}>SeatNova</div>
          <div style={{ fontSize: 9.5, color: t.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Layout Builder</div>
        </div>
      </div>

      <div style={divider} />

      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button title="Undo (Ctrl+Z)" onClick={() => useStore.getState().undo()} disabled={!past.length}
          style={{ ...ghostBtn, opacity: past.length ? 1 : 0.3, padding: '5px 8px', fontSize: 14 }}>↩</button>
        <button title="Redo (Ctrl+Y)" onClick={() => useStore.getState().redo()} disabled={!future.length}
          style={{ ...ghostBtn, opacity: future.length ? 1 : 0.3, padding: '5px 8px', fontSize: 14 }}>↪</button>
      </div>

      <div style={divider} />

      {/* Tools */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {TOOLS.map(t_ => (
          <button key={t_.id} title={t_.title} onClick={() => setTool(t_.id)}
            style={iconBtn(tool === t_.id)}>
            <span style={{ fontSize: 13 }}>{t_.icon}</span>
            <span>{t_.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Venue name pill */}
      {venueName && (
        <div style={{ fontSize: 12, color: t.textMuted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.panelBorder}`, borderRadius: 20, padding: '3px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {venueName}
        </div>
      )}

      <div style={divider} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {selectedIds.length > 1 && (
          <button onClick={() => setShowSpacing(true)} style={{ ...actionBtn('#ea580c'), fontSize: 12 }} title="Apply equal spacing">
            ⚡ Spacing
          </button>
        )}
        <button onClick={() => setShowValidate(true)} style={ghostBtn} title="Validate layout">
          ✓ Validate
        </button>
        <button onClick={handleImport} style={ghostBtn} title="Import JSON">
          ⬆ Import
        </button>
        <button onClick={handleExport} style={ghostBtn} title="Export JSON">
          ⬇ Export
        </button>
        {onSave && (
          <button onClick={handleSave} style={{ ...actionBtn(isDark ? '#6d28d9' : '#7c3aed') }}>
            ☁ Save
          </button>
        )}
        {saveStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: statusColor, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, display: 'inline-block' }} />
            {statusLabel}
          </div>
        )}
        <button onClick={() => onPreview()} style={{ ...actionBtn('#7c3aed'), padding: '5px 14px' }}>
          ▶ Preview
        </button>
        <button onClick={toggleTheme} style={{ ...ghostBtn, padding: '5px 8px', fontSize: 15 }} title="Toggle theme">
          {isDark ? '☀️' : '🌙'}
        </button>
        {onHome && (
          <button onClick={onHome} style={{ ...ghostBtn, padding: '5px 8px' }} title="Home">⌂</button>
        )}
      </div>

      {showValidate && <ValidateModal onClose={() => setShowValidate(false)} t={t} />}
      {showSpacing && <SpacingModal onClose={() => setShowSpacing(false)} t={t} ids={selectedIds} applySpacing={applySpacing} />}
    </div>
  )
}
