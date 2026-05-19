import React, { useRef, useState, useContext } from 'react'
import { useStore } from '../../store/useStore'
import { ThemeContext } from '../../EditorApp'

const FIELD_TYPES = ['cricket', 'football', 'basketball', 'stage']
const VENUE_SHAPES = ['circular', 'rectangular']

const SECTION_ICONS = { arc: '◔', rect: '▭', poly: '✦', row: '⋯', table: '⬡' }

function LayerRow({ sec, selected, overIdx, idx, onDragStart, onDragOver, onDrop, onDragEnd, onClick, onDelete, onToggleLock }) {
  const [hovered, setHovered] = useState(false)
  const t = useContext(ThemeContext)

  const base = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
    userSelect: 'none', transition: 'background 0.1s',
    border: '1px solid transparent',
  }
  const style = selected
    ? { ...base, background: t.layerActive, border: `1px solid ${t.layerActiveBorder}` }
    : overIdx === idx
    ? { ...base, background: t.layerOver, border: `1px dashed ${t.layerOverBorder}` }
    : hovered
    ? { ...base, background: t.layerHover }
    : base

  return (
    <div draggable={!sec.locked}
      onDragStart={e => onDragStart(e, sec.id)} onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, sec.id)} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={style}>
      {/* Drag grip */}
      <span style={{ color: t.gripColor, fontSize: 11, cursor: sec.locked ? 'default' : 'grab', flexShrink: 0, opacity: hovered && !sec.locked ? 1 : 0, width: 10 }}>⠿</span>
      {/* Type icon */}
      <span style={{ fontSize: 10, color: t.labelColor, flexShrink: 0, width: 12, textAlign: 'center' }}>
        {SECTION_ICONS[sec.type] || '◻'}
      </span>
      {/* Color dot */}
      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: sec.color, opacity: sec.locked ? 0.4 : 1, boxShadow: `0 0 4px ${sec.color}60` }} />
      {/* Label */}
      <span style={{ flex: 1, fontSize: 12, color: sec.locked ? t.labelColor : t.inputColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sec.label}
      </span>
      {/* Lock */}
      <button style={{ background: 'none', border: 'none', color: sec.locked ? '#f59e0b' : t.delColor, cursor: 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1, flexShrink: 0, opacity: hovered || sec.locked ? 1 : 0 }}
        onClick={e => { e.stopPropagation(); onToggleLock() }} title={sec.locked ? 'Unlock' : 'Lock'}>
        {sec.locked ? '🔒' : '🔓'}
      </button>
      {/* Delete */}
      {!sec.locked && (
        <button style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1, flexShrink: 0, opacity: hovered ? 1 : 0 }}
          onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">✕</button>
      )}
    </div>
  )
}

// Reusable section block
function PanelSection({ title, children, t }) {
  return (
    <div style={{ padding: '14px 12px', borderBottom: `1px solid ${t.panelBorder}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children, t }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: t.labelColor, marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

export default function LeftPanel() {
  const {
    venueName, setVenueName, venueShape, setVenueShape,
    fieldType, setFieldType, sections, selectedId, selectSection,
    deleteSection, canvasSize, setCanvasSize, toggleLock, clearSections,
    floorPlanImage, setFloorPlan, floorPlanOpacity, setFloorPlanOpacity,
    floorPlanLocked, toggleFloorPlanLock, stageLocked, toggleStageLock,
  } = useStore()
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

  const inp = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 6, color: t.inputColor, padding: '5px 8px', fontSize: 12,
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ width: 210, background: t.panelBg, borderRight: `1px solid ${t.panelBorder}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

      <PanelSection title="Venue" t={t}>
        <FieldRow label="Name" t={t}>
          <input style={inp} value={venueName} onChange={e => setVenueName(e.target.value)} />
        </FieldRow>
        <FieldRow label="Shape" t={t}>
          <select style={inp} value={venueShape} onChange={e => setVenueShape(e.target.value)}>
            {VENUE_SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Field / Stage" t={t}>
          <select style={inp} value={fieldType} onChange={e => setFieldType(e.target.value)}>
            {FIELD_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </FieldRow>
        {fieldType === 'stage' && (
          <button onClick={toggleStageLock}
            style={{ marginTop: 4, width: '100%', padding: '5px 8px', borderRadius: 6, border: `1px solid ${stageLocked ? 'rgba(245,158,11,0.4)' : t.inputBorder}`, background: stageLocked ? 'rgba(245,158,11,0.08)' : 'transparent', color: stageLocked ? '#f59e0b' : t.labelColor, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {stageLocked ? '🔒 Stage Locked' : '🔓 Lock Stage'}
          </button>
        )}
        <FieldRow label="Stadium Size" t={t}>
          <div style={{ position: 'relative' }}>
            <select style={{ ...inp, paddingRight: sizeLocked ? 28 : 8 }} value={canvasSize || 1000} onChange={e => {
              const val = Number(e.target.value)
              if (sizeLocked && val !== canvasSize) { setPendingSize(val); return }
              setCanvasSize(val)
            }}>
              <option value={1000}>Small — ~5k seats</option>
              <option value={5000}>Medium — ~30k seats</option>
              <option value={10000}>Large — ~60k seats</option>
              <option value={20000}>XL — ~100k seats</option>
              <option value={50000}>XXL — Narendra Modi</option>
            </select>
            {sizeLocked && <span style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', fontSize: 11, pointerEvents: 'none' }}>🔒</span>}
          </div>
        </FieldRow>
      </PanelSection>

      {/* Floor Plan */}
      <PanelSection title="Floor Plan" t={t}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '7px 0', borderRadius: 6, border: `1px dashed ${t.inputBorder}`, background: t.inputBg, color: t.labelColor, fontSize: 11, textAlign: 'center', cursor: 'pointer' }}>
          📁 Choose image
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files[0]; if (!file) return
            const reader = new FileReader()
            reader.onload = ev => setFloorPlan(ev.target.result)
            reader.readAsDataURL(file)
          }} />
        </label>
        {floorPlanImage && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: t.labelColor }}>Opacity {Math.round(floorPlanOpacity * 100)}%</span>
              <button onClick={toggleFloorPlanLock}
                style={{ background: 'none', border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: floorPlanLocked ? '#f59e0b' : t.labelColor, cursor: 'pointer', fontSize: 10, padding: '2px 6px' }}>
                {floorPlanLocked ? '🔒' : '🔓'}
              </button>
            </div>
            <input type="range" min={0.05} max={1} step={0.05} value={floorPlanOpacity}
              onChange={e => setFloorPlanOpacity(Number(e.target.value))}
              style={{ width: '100%', accentColor: t.accent }} />
            <button onClick={() => setFloorPlan(null)}
              style={{ marginTop: 4, width: '100%', padding: '4px', borderRadius: 5, border: `1px solid rgba(248,113,113,0.3)`, background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>
              ✕ Remove
            </button>
          </div>
        )}
      </PanelSection>

      {/* Layers */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Layers</span>
          <span style={{ background: t.countBg, color: t.countColor, borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>{sections.length}</span>
        </div>
        {sections.length === 0
          ? <div style={{ fontSize: 11, color: t.emptyColor, lineHeight: 1.8, padding: '4px 0' }}>No sections yet.<br />Use a draw tool to start.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', flex: 1, paddingBottom: 12 }}>
              {reversed.map((sec, idx) => (
                <LayerRow key={sec.id} sec={sec} selected={sec.id === selectedId} overIdx={overIdx} idx={idx}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
                  onClick={() => selectSection(sec.id)} onDelete={() => deleteSection(sec.id)}
                  onToggleLock={() => toggleLock(sec.id)} />
              ))}
            </div>
        }
      </div>

      {/* Confirm resize modal */}
      {pendingSize && (
        <>
          <div onClick={() => setPendingSize(null)} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, padding: 24, width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.inputColor, marginBottom: 10 }}>⚠️ Change Stadium Size?</div>
            <div style={{ fontSize: 13, color: t.labelColor, lineHeight: 1.6, marginBottom: 20 }}>
              This will <b style={{ color: '#f87171' }}>delete all sections</b>. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPendingSize(null)} style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: 'none', color: t.inputColor, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => { setCanvasSize(pendingSize); clearSections(); setPendingSize(null) }} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Clear & Resize</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
