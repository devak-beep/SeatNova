import React, { useContext, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../App'

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
  { id: 'select', label: '↖ Select', title: 'Select & edit sections' },
  { id: 'multiselect', label: '☑ Multi', title: 'Multi-select sections for spacing' },
  { id: 'arc',    label: '◔ Arc',    title: 'Click start, move, click end to draw arc section' },
  { id: 'rect',   label: '▭ Rect',   title: 'Drag to draw rectangular section' },
  { id: 'poly',   label: '✦ Poly',   title: 'Click to place points, double-click or click first point to close' },
]

export default function Toolbar({ onPreview }) {
  const { tool, setTool, venueName, exportJSON, importJSON, undo, redo, past, future, selectedId, selectedIds, duplicateSection, theme, toggleTheme, applySpacing } = useStore()
  const t = useContext(ThemeContext)
  const [showValidate, setShowValidate] = useState(false)
  const [showSpacing, setShowSpacing] = useState(false)

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

  const bar = { height: 64, background: t.panelBg, borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0 }
  const btn = { padding: '5px 12px', borderRadius: 6, border: `1px solid ${t.btnBorder}`, background: t.btnBg, color: t.btnColor, fontSize: 13, cursor: 'pointer' }
  const active = { background: '#1d4ed8', borderColor: '#3b82f6', color: '#fff' }

  return (
    <div style={bar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <svg width="40" height="40" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" fill="url(#tbBg)" opacity={theme === 'dark' ? 0.15 : 0.08} />
          <circle cx="40" cy="40" r="36" stroke="url(#tbMain)" strokeWidth="2.5" opacity={theme === 'dark' ? 0.7 : 0.6} />
          <rect x="27" y="32" width="26" height="16" rx="1.5" fill="url(#tbStage)" opacity="0.4" />
          <rect x="29" y="34" width="22" height="12" rx="1" fill="url(#tbStageC)" opacity={theme === 'dark' ? 0.5 : 0.7} />
          <line x1="40" y1="34" x2="40" y2="46" stroke="url(#tbMain)" strokeWidth="0.5" opacity="0.5" />
          <g opacity="0.95">
            <circle cx="38" cy="12" r="2.5" fill="url(#tbSeat)" /><circle cx="44" cy="12" r="2.5" fill="url(#tbSeat)" />
            <circle cx="35" cy="16" r="2" fill="url(#tbSeat)" opacity="0.85" /><circle cx="41" cy="16" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="47" cy="16" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="68" cy="38" r="2.5" fill="url(#tbSeat)" /><circle cx="68" cy="44" r="2.5" fill="url(#tbSeat)" />
            <circle cx="64" cy="35" r="2" fill="url(#tbSeat)" opacity="0.85" /><circle cx="64" cy="41" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="64" cy="47" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="44" cy="68" r="2.5" fill="url(#tbSeat)" /><circle cx="38" cy="68" r="2.5" fill="url(#tbSeat)" />
            <circle cx="47" cy="64" r="2" fill="url(#tbSeat)" opacity="0.85" /><circle cx="41" cy="64" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="35" cy="64" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="12" cy="44" r="2.5" fill="url(#tbSeat)" /><circle cx="12" cy="38" r="2.5" fill="url(#tbSeat)" />
            <circle cx="16" cy="47" r="2" fill="url(#tbSeat)" opacity="0.85" /><circle cx="16" cy="41" r="2" fill="url(#tbSeat)" opacity="0.85" />
            <circle cx="16" cy="35" r="2" fill="url(#tbSeat)" opacity="0.85" />
          </g>
          <defs>
            {theme === 'dark' ? <>
              <radialGradient id="tbBg"><stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#a78bfa" /></radialGradient>
              <linearGradient id="tbMain"><stop offset="0%" stopColor="#d8b4fe" /><stop offset="50%" stopColor="#f0abfc" /><stop offset="100%" stopColor="#c084fc" /></linearGradient>
              <linearGradient id="tbSeat"><stop offset="0%" stopColor="#e9d5ff" /><stop offset="50%" stopColor="#d8b4fe" /><stop offset="100%" stopColor="#c084fc" /></linearGradient>
              <linearGradient id="tbStage"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
              <linearGradient id="tbStageC"><stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
            </> : <>
              <radialGradient id="tbBg"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#9333ea" /></radialGradient>
              <linearGradient id="tbMain"><stop offset="0%" stopColor="#7c3aed" /><stop offset="50%" stopColor="#a855f7" /><stop offset="100%" stopColor="#9333ea" /></linearGradient>
              <linearGradient id="tbSeat"><stop offset="0%" stopColor="#7c3aed" /><stop offset="50%" stopColor="#9333ea" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient>
              <linearGradient id="tbStage"><stop offset="0%" stopColor="#e9d5ff" /><stop offset="100%" stopColor="#d8b4fe" /></linearGradient>
              <linearGradient id="tbStageC"><stop offset="0%" stopColor="#faf5ff" /><stop offset="100%" stopColor="#f3e8ff" /></linearGradient>
            </>}
          </defs>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: theme === 'dark' ? '#d8b4fe' : '#7c3aed' }}>SeatNova</span>
          <span style={{ fontSize: 11, color: t.labelColor, letterSpacing: '0.05em', marginTop: 2 }}>Venue Layout Builder</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 4 }}>
        {TOOLS.map(tool_ => (
          <button key={tool_.id} title={tool_.title} onClick={() => setTool(tool_.id)}
            style={{ ...btn, ...(tool === tool_.id ? active : {}) }}>
            {tool_.label}
          </button>
        ))}
      </div>

      <button onClick={toggleTheme} style={{ ...btn, fontSize: 16 }} title="Toggle light/dark mode">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <button onClick={onPreview} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>▶ Preview</button>
      {selectedIds.length > 1 && <button onClick={() => setShowSpacing(true)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#ea580c', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>⚡ Spacing</button>}
      <button onClick={() => setShowValidate(true)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#0891b2', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>✓ Validate</button>
      <button onClick={handleImport} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>⬆ Import</button>
      <button onClick={handleExport} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>⬇ Export</button>
      {showValidate && <ValidateModal onClose={() => setShowValidate(false)} t={t} />}
      {showSpacing && <SpacingModal onClose={() => setShowSpacing(false)} t={t} ids={selectedIds} applySpacing={applySpacing} />}
    </div>
  )
}
