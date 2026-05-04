import React, { useRef, useState, useContext } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../App'

const FIELD_TYPES = ['cricket', 'football', 'basketball', 'stage', 'none']
const VENUE_SHAPES = ['circular', 'rectangular']

function LayerRow({ sec, selected, overIdx, idx, onDragStart, onDragOver, onDrop, onDragEnd, onClick, onDelete, onToggleLock }) {
  const [hovered, setHovered] = useState(false)
  const t = useContext(ThemeContext)
  const base = { display: 'flex', alignItems: 'center', gap: 7, padding: '4px 4px 4px 2px', borderRadius: 4, cursor: 'pointer', userSelect: 'none', borderLeft: '2px solid transparent', transition: 'background 0.1s' }
  const style = selected
    ? { ...base, background: t.layerActive, borderLeft: `2px solid ${t.layerActiveBorder}` }
    : overIdx === idx
    ? { ...base, background: t.layerOver, borderLeft: `2px dashed ${t.layerOverBorder}` }
    : hovered
    ? { ...base, background: t.layerHover }
    : base

  return (
    <div draggable={!sec.locked} onDragStart={e => onDragStart(e, sec.id)} onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, sec.id)} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={style}>
      <span style={{ color: t.gripColor, fontSize: 12, cursor: sec.locked ? 'default' : 'grab', flexShrink: 0, paddingLeft: 2, opacity: hovered && !sec.locked ? 1 : 0 }}>⠿</span>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: sec.color, opacity: sec.locked ? 0.5 : 1 }} />
      <span style={{ flex: 1, fontSize: 12, color: sec.locked ? t.labelColor : t.inputColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.label}</span>
      <button style={{ background: 'none', border: 'none', color: sec.locked ? '#f59e0b' : t.delColor, cursor: 'pointer', fontSize: 11, padding: '0 3px', lineHeight: 1, flexShrink: 0, opacity: hovered || sec.locked ? 1 : 0 }}
        onClick={e => { e.stopPropagation(); onToggleLock() }} title={sec.locked ? 'Unlock' : 'Lock'}>
        {sec.locked ? '🔒' : '🔓'}
      </button>
      {!sec.locked && <button style={{ background: 'none', border: 'none', color: t.delColor, cursor: 'pointer', fontSize: 11, padding: '0 3px', lineHeight: 1, flexShrink: 0, opacity: hovered ? 1 : 0 }}
        onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">✕</button>}
    </div>
  )
}

export default function LeftPanel() {
  const { venueName, setVenueName, venueShape, setVenueShape, fieldType, setFieldType, sections, selectedId, selectSection, deleteSection, canvasSize, setCanvasSize, toggleLock, clearSections, floorPlanImage, setFloorPlan, floorPlanOpacity, setFloorPlanOpacity, floorPlanLocked, toggleFloorPlanLock, stageLocked, toggleStageLock } = useStore()
  const t = useContext(ThemeContext)
  const dragId = useRef(null)
  const [overIdx, setOverIdx] = useState(null)
  const [pendingSize, setPendingSize] = useState(null)
  const reversed = [...sections].reverse()
  const sizeLocked = sections.length > 0

  const handleDragStart = (e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx) }
  const handleDrop = (e, targetId) => {
    e.preventDefault(); setOverIdx(null)
    if (!dragId.current || dragId.current === targetId) return
    const ids = reversed.map(s => s.id)
    const from = ids.indexOf(dragId.current), to = ids.indexOf(targetId)
    const steps = to - from, dir = steps > 0 ? -1 : 1, abs = Math.abs(steps)
    for (let i = 0; i < abs; i++) useStore.getState().reorderSection(dragId.current, dir)
    dragId.current = null
  }
  const handleDragEnd = () => { setOverIdx(null); dragId.current = null }

  const panel = { width: 200, background: t.panelBg, borderRight: `1px solid ${t.panelBorder}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const section = { padding: '12px', borderBottom: `1px solid ${t.panelBorder}` }
  const heading = { fontSize: 10, fontWeight: 700, color: t.headingColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }
  const label = { display: 'block', fontSize: 11, color: t.labelColor, marginBottom: 3, marginTop: 6 }
  const input = { width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.inputColor, padding: '4px 8px', fontSize: 12 }

  return (
    <div style={panel}>
      <div style={section}>
        <div style={heading}>Venue</div>
        <label style={label}>Name</label>
        <input style={input} value={venueName} onChange={e => setVenueName(e.target.value)} />
        <label style={label}>Shape</label>
        <select style={input} value={venueShape} onChange={e => setVenueShape(e.target.value)}>
          {VENUE_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={label}>Field / Stage</label>
        <select style={input} value={fieldType} onChange={e => setFieldType(e.target.value)}>
          {FIELD_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {fieldType === 'stage' && (
          <button
            onClick={toggleStageLock}
            title={stageLocked ? 'Unlock stage position' : 'Lock stage position'}
            style={{ marginTop: 6, width: '100%', padding: '4px 8px', borderRadius: 5, border: `1px solid ${t.inputBorder}`, background: stageLocked ? 'rgba(245,158,11,0.15)' : t.inputBg, color: stageLocked ? '#f59e0b' : t.labelColor, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            {stageLocked ? '🔒 Stage Locked' : '🔓 Lock Stage Position'}
          </button>
        )}

        <label style={label}>Stadium Size</label>
        <div style={{ position: 'relative' }}>
          <select style={{ ...input, paddingRight: sizeLocked ? 28 : 8, opacity: 1 }} value={canvasSize || 1000} onChange={e => {
            const val = Number(e.target.value)
            if (sizeLocked && val !== canvasSize) { setPendingSize(val); return }
            setCanvasSize(val)
          }}>
            <option value={1000}>Small (1k) — ~5,000 seats</option>
            <option value={5000}>Medium (5k) — ~30,000 seats</option>
            <option value={10000}>Large (10k) — ~60,000 seats</option>
            <option value={20000}>XL (20k) — ~100,000 seats</option>
            <option value={50000}>XXL (50k) — Narendra Modi</option>
          </select>
          {sizeLocked && <span title="Size locked — sections exist" style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', fontSize: 12, pointerEvents: 'none' }}>🔒</span>}
        </div>

        {pendingSize && (
          <>
            <div onClick={() => setPendingSize(null)} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.45)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 10, padding: 24, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.inputColor, marginBottom: 10 }}>⚠️ Change Stadium Size?</div>
              <div style={{ fontSize: 13, color: t.labelColor, lineHeight: 1.6, marginBottom: 20 }}>
                Switching the stadium size will <b style={{ color: '#f87171' }}>delete all sections</b> you've created. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setPendingSize(null)} style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: 'none', color: t.inputColor, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={() => { setCanvasSize(pendingSize); clearSections(); setPendingSize(null) }} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Yes, clear & resize</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floor Plan */}
      <div style={section}>
        <div style={heading}>Floor Plan</div>
        <label style={{ display: 'block', fontSize: 11, color: t.labelColor, marginBottom: 6 }}>
          Upload a reference image (PNG/JPG)
        </label>
        <label style={{ display: 'block', width: '100%', padding: '6px 0', borderRadius: 5, border: `1px dashed ${t.inputBorder}`, background: t.inputBg, color: t.labelColor, fontSize: 11, textAlign: 'center', cursor: 'pointer' }}>
          📁 Choose image
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => setFloorPlan(ev.target.result)
            reader.readAsDataURL(file)
          }} />
        </label>
        {floorPlanImage && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: t.labelColor }}>Opacity: {Math.round(floorPlanOpacity * 100)}%</label>
              <button onClick={toggleFloorPlanLock} title={floorPlanLocked ? 'Click to unlock and adjust' : 'Click to lock position'}
                style={{ background: 'none', border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: floorPlanLocked ? '#f59e0b' : t.labelColor, cursor: 'pointer', fontSize: 13, padding: '1px 7px' }}>
                {floorPlanLocked ? '🔒 Unlock' : '🔓 Lock'}
              </button>
            </div>
            <input type="range" min={0.05} max={1} step={0.05} value={floorPlanOpacity}
              onChange={e => setFloorPlanOpacity(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed' }} />
            <button onClick={() => setFloorPlan(null)} style={{ marginTop: 4, width: '100%', padding: '4px', borderRadius: 5, border: `1px solid ${t.inputBorder}`, background: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
              ✕ Remove image
            </button>
          </>
        )}
      </div>

      <div style={section}>
        <div style={heading}>
          Layers
          <span style={{ background: t.countBg, color: t.countColor, borderRadius: 8, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{sections.length}</span>
        </div>
        {sections.length === 0
          ? <div style={{ fontSize: 11, color: t.emptyColor, lineHeight: 1.7, padding: '4px 0' }}>No sections yet.<br />Use a draw tool to start.</div>
          : <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reversed.map((sec, idx) => (
                <LayerRow key={sec.id} sec={sec} selected={sec.id === selectedId} overIdx={overIdx} idx={idx}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
                  onClick={() => selectSection(sec.id)} onDelete={() => deleteSection(sec.id)}
                  onToggleLock={() => toggleLock(sec.id)} />
              ))}
            </div>
        }
      </div>
    </div>
  )
}
