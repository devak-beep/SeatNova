import React, { useRef, useCallback, useContext, useState } from 'react'
import { useStore } from '../../store/useStore'
import { svgPoint, angleFromCenter, distFromCenter, polar, MAX_R, getCanvasParams } from '../../utils/geometry'
import FieldShape from './FieldShape'
import ArcSection from './ArcSection'
import RectSection from './RectSection'
import PolySection from './PolySection'
import { ArcGhost, RectGhost, PolyGhost } from './DrawingGhost'
import RowSection from './RowSection'
import TableSection from './TableSection'
import { ThemeContext } from '../../EditorApp'

const ARC_THICKNESS = 80
const MIN_ZOOM = 0.05
const MAX_ZOOM = 500
const SNAP_THRESHOLD = 6  // SVG units — snap within this distance

// Compute smart guides when dragging a rect section
function computeGuides(moving, others, snapThreshold) {
  const mx1 = moving.x, mx2 = moving.x + moving.w, mcx = moving.x + moving.w / 2
  const my1 = moving.y, my2 = moving.y + moving.h, mcy = moving.y + moving.h / 2

  const lines = []   // { x1,y1,x2,y2 }
  const gaps  = []   // { x,y,value,axis }
  let snapX = null, snapY = null

  for (const o of others) {
    const ox1 = o.x, ox2 = o.x + o.w, ocx = o.x + o.w / 2
    const oy1 = o.y, oy2 = o.y + o.h, ocy = o.y + o.h / 2

    // ── Vertical alignment (same X edges / centers) ──
    const xPairs = [
      [mx1, ox1], [mx1, ox2], [mx1, ocx],
      [mx2, ox1], [mx2, ox2], [mx2, ocx],
      [mcx, ox1], [mcx, ox2], [mcx, ocx],
    ]
    for (const [a, b] of xPairs) {
      if (Math.abs(a - b) < snapThreshold) {
        if (snapX === null) snapX = b - a
        const yMin = Math.min(my1, oy1) - 20
        const yMax = Math.max(my2, oy2) + 20
        lines.push({ x1: b, y1: yMin, x2: b, y2: yMax, axis: 'x' })
      }
    }

    // ── Horizontal alignment (same Y edges / centers) ──
    const yPairs = [
      [my1, oy1], [my1, oy2], [my1, ocy],
      [my2, oy1], [my2, oy2], [my2, ocy],
      [mcy, oy1], [mcy, oy2], [mcy, ocy],
    ]
    for (const [a, b] of yPairs) {
      if (Math.abs(a - b) < snapThreshold) {
        if (snapY === null) snapY = b - a
        const xMin = Math.min(mx1, ox1) - 20
        const xMax = Math.max(mx2, ox2) + 20
        lines.push({ x1: xMin, y1: b, x2: xMax, y2: b, axis: 'y' })
      }
    }

    // ── Gap distances (horizontal) ──
    if (mx2 <= ox1) {
      const gap = ox1 - mx2
      const midY = (Math.max(my1, oy1) + Math.min(my2, oy2)) / 2
      if (Math.max(my1, oy1) < Math.min(my2, oy2))
        gaps.push({ x: mx2 + gap / 2, y: midY, value: Math.round(gap), axis: 'h' })
    } else if (ox2 <= mx1) {
      const gap = mx1 - ox2
      const midY = (Math.max(my1, oy1) + Math.min(my2, oy2)) / 2
      if (Math.max(my1, oy1) < Math.min(my2, oy2))
        gaps.push({ x: ox2 + gap / 2, y: midY, value: Math.round(gap), axis: 'h' })
    }

    // ── Gap distances (vertical) ──
    if (my2 <= oy1) {
      const gap = oy1 - my2
      const midX = (Math.max(mx1, ox1) + Math.min(mx2, ox2)) / 2
      if (Math.max(mx1, ox1) < Math.min(mx2, ox2))
        gaps.push({ x: midX, y: my2 + gap / 2, value: Math.round(gap), axis: 'v' })
    } else if (oy2 <= my1) {
      const gap = my1 - oy2
      const midX = (Math.max(mx1, ox1) + Math.min(mx2, ox2)) / 2
      if (Math.max(mx1, ox1) < Math.min(mx2, ox2))
        gaps.push({ x: midX, y: oy2 + gap / 2, value: Math.round(gap), axis: 'v' })
    }
  }

  return { lines, gaps, snapX, snapY }
}

function ArcGuideOverlay({ moving, others, CX_, CY_, CS }) {
  if (!moving || !others.length) return null

  // Normalize angle to [0,360)
  const norm = a => ((a % 360) + 360) % 360

  let movStart = norm(moving.startAngle)
  let movEnd   = norm(moving.endAngle)
  let movSweep = movEnd - movStart; if (movSweep <= 0) movSweep += 360

  const labels = []
  const lines  = []

  for (const o of others) {
    let oStart = norm(o.startAngle)
    let oEnd   = norm(o.endAngle)
    let oSweep = oEnd - oStart; if (oSweep <= 0) oSweep += 360

    // Gap: moving.end → other.start
    let gap1 = oStart - movEnd; if (gap1 < 0) gap1 += 360
    if (gap1 < 90) {
      const midAngle = movEnd + gap1 / 2
      const midR = (moving.outerR + (o.innerR ?? moving.innerR)) / 2 + CS * 0.04
      const pos = polar(midAngle, midR, CX_, CY_)
      labels.push({ x: pos.x, y: pos.y, text: `${Math.round(gap1)}°` })
      lines.push({ angle: movEnd, r1: moving.innerR, r2: moving.outerR })
      lines.push({ angle: oStart, r1: o.innerR, r2: o.outerR })
    }

    // Gap: other.end → moving.start
    let gap2 = movStart - oEnd; if (gap2 < 0) gap2 += 360
    if (gap2 < 90) {
      const midAngle = oEnd + gap2 / 2
      const midR = ((o.outerR ?? moving.outerR) + moving.innerR) / 2 + CS * 0.04
      const pos = polar(midAngle, midR, CX_, CY_)
      labels.push({ x: pos.x, y: pos.y, text: `${Math.round(gap2)}°` })
      lines.push({ angle: oEnd,    r1: o.innerR,      r2: o.outerR })
      lines.push({ angle: movStart, r1: moving.innerR, r2: moving.outerR })
    }
  }

  // Current arc angle label at midpoint
  const midAngle = movStart + movSweep / 2
  const labelR = moving.outerR + CS * 0.04
  const midPos = polar(midAngle, labelR, CX_, CY_)
  labels.push({ x: midPos.x, y: midPos.y, text: `${Math.round(movSweep)}°`, primary: true })

  const fs = CS * 0.012

  return (
    <g style={{ pointerEvents: 'none' }}>
      {lines.map((l, i) => {
        const p1 = polar(l.angle, l.r1, CX_, CY_)
        const p2 = polar(l.angle, l.r2, CX_, CY_)
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="#f43f5e" strokeWidth={CS * 0.0015} strokeDasharray={`${CS*0.004} ${CS*0.002}`} />
      })}
      {labels.map((l, i) => (
        <g key={i}>
          <rect x={l.x - fs * 1.6} y={l.y - fs * 0.8} width={fs * 3.2} height={fs * 1.6}
            rx={fs * 0.35} fill={l.primary ? '#7c3aed' : '#f43f5e'} fillOpacity={0.92} />
          <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={fs * 0.85} fill="#fff" fontWeight="600">{l.text}</text>
        </g>
      ))}
    </g>
  )
}

function SmartGuides({ guides, CS }) {
  if (!guides) return null
  const fs = CS * 0.012
  const pad = CS * 0.006
  return (
    <g style={{ pointerEvents: 'none' }}>
      {guides.lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#f43f5e" strokeWidth={CS * 0.0012} strokeDasharray={`${CS*0.004} ${CS*0.002}`} />
      ))}
      {guides.gaps.map((g, i) => (
        <g key={i}>
          <rect
            x={g.x - fs * 1.4} y={g.y - fs * 0.75}
            width={fs * 2.8} height={fs * 1.5}
            rx={fs * 0.3} fill="#f43f5e" fillOpacity={0.9}
          />
          <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={fs * 0.85} fill="#fff" fontWeight="600">
            {g.value}
          </text>
        </g>
      ))}
    </g>
  )
}

export default function BuilderCanvas() {
  const svgRef = useRef(null)
  const interactRef = useRef(null)
  const didInteractRef = useRef(false)

  const {
    fieldType, fieldX, fieldY, fieldScale, setFieldPos, setFieldScale,
    stageX, stageY, stageW, stageH, setStageSize,
    venueShape, sections, tool, selectedId, selectedIds, fieldSelected, selectField, drawingState,
    selectSection, toggleSelectSection, setDrawingState, addSection, updateSection, commitUpdate, categories,
    past, future, canvasSize, setCanvasSize, floorPlanImage, floorPlanOpacity,
    floorPlanX, floorPlanY, floorPlanW, floorPlanH, setFloorPlanTransform, toggleBlockSeat, toggleRemoveSeat,
    floorPlanLocked, stageLocked, addRow, addTable,
    selectedRowIdx, setSelectedRowIdx, selectedRowIdxs, toggleSelectedRowIdx, rowSelectMode,
    blockRowMode, toggleBlockRow,
  } = useStore()

  // Clear row selection when selected section changes
  React.useEffect(() => { setSelectedRowIdx(null) }, [selectedId])

  // Stage uses its own position; other fields are always centered
  const stageRenderX = stageX ?? fieldX
  const stageRenderY = stageY ?? fieldY

  const CS = canvasSize || 1000
  const { cx: CX_, cy: CY_, maxR: MAX_R_ } = getCanvasParams(CS)

  const getCategoryColor = (catId) => categories.find(c => c.id === catId)?.color || '#94a3b8'
  const pt = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const v = viewRef.current
    return {
      x: v.x + ((e.clientX - rect.left) / rect.width)  * v.w,
      y: v.y + ((e.clientY - rect.top)  / rect.height) * v.h,
    }
  }

  // ── Field drag / resize ───────────────────────────────────────────────────
  const handleFieldPointerDown = useCallback((e) => {
    if (fieldType !== 'stage' || stageLocked) return
    e.stopPropagation()
    didInteractRef.current = true
    commitUpdate()
    selectField(true)
    interactRef.current = { mode: 'field', startPt: pt(e), origField: { x: stageRenderX, y: stageRenderY } }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [fieldType, stageLocked, stageRenderX, stageRenderY, selectField, commitUpdate])

  const handleFieldResizePointerDown = useCallback((e, handle) => {
    if (fieldType !== 'stage' || stageLocked) return
    e.stopPropagation()
    didInteractRef.current = true
    commitUpdate()
    interactRef.current = { mode: 'field-resize-handle', handle, startPt: pt(e), origField: { x: stageRenderX, y: stageRenderY }, origW: stageW, origH: stageH }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [fieldType, stageLocked, stageRenderX, stageRenderY, stageW, stageH, commitUpdate])

  // ── Poly section: move body / drag vertex ────────────────────────────────
  const handlePolyPointerDown = useCallback((e, secId) => {
    if (tool === 'multiselect') {
      e.stopPropagation()
      toggleSelectSection(secId)
      return
    }
    if (tool !== 'select') return
    const sec = sections.find(s => s.id === secId)
    if (sec?.locked) return
    didInteractRef.current = true
    commitUpdate()
    selectSection(secId)
    interactRef.current = { mode: 'poly-move', id: secId, startPt: pt(e), origPoints: sec.points.map(p => ({ ...p })) }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [tool, sections, selectSection, toggleSelectSection, commitUpdate])

  const handlePolyPointPointerDown = useCallback((e, secId, pointIdx) => {
    if (tool !== 'select') return
    const sec = sections.find(s => s.id === secId)
    if (sec?.locked) return
    didInteractRef.current = true
    commitUpdate()
    interactRef.current = { mode: 'poly-vertex', id: secId, pointIdx, startPt: pt(e), origPoints: sec.points.map(p => ({ ...p })) }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [tool, sections, commitUpdate])

  // ── Arc section: move / handle drag ──────────────────────────────────────
  const handleArcPointerDown = useCallback((e, handleType, secId) => {
    if (tool === 'multiselect') {
      e.stopPropagation()
      toggleSelectSection(secId)
      return
    }
    if (tool !== 'select') return
    const sec = sections.find(s => s.id === secId)
    if (sec?.locked) return
    didInteractRef.current = true
    commitUpdate()
    selectSection(secId)
    setFloor(false)
    interactRef.current = { mode: 'arc-' + handleType, id: secId, startPt: pt(e), origSec: { ...sec } }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [tool, sections, selectSection, toggleSelectSection, commitUpdate])

  // ── Rect section: move / resize ───────────────────────────────────────────
  const handleSectionPointerDown = useCallback((e, mode, handle, secId) => {
    if (tool === 'multiselect') {
      e.stopPropagation()
      toggleSelectSection(secId)
      return
    }
    if (tool !== 'select') return
    const sec = sections.find(s => s.id === secId)
    if (sec?.locked) return
    didInteractRef.current = true
    commitUpdate()
    selectSection(secId)
    // handle is rowIdx for rect row-curve mode
    interactRef.current = { mode, handle, id: secId, startPt: pt(e), origSec: { ...sec } }
    svgRef.current.setPointerCapture(e.pointerId)
  }, [tool, sections, selectSection, toggleSelectSection, commitUpdate])
  // ── Pointer move ──────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e) => {
    const p = pt(e)

    // Arc: live preview
    if (tool === 'arc' && drawingState?.startAngle != null) {
      setDrawingState({ ...drawingState, currentAngle: angleFromCenter(p.x, p.y) })
      return
    }
    // Rect drawing
    if (tool === 'rect' && drawingState) {
      setDrawingState({ ...drawingState, x2: p.x, y2: p.y })
      return
    }
    // Poly: track mouse for live edge preview
    if (tool === 'poly' && drawingState?.points?.length) {
      setDrawingState({ ...drawingState, mouse: p })
      return
    }

    const ia = interactRef.current
    if (!ia) return
    // For resize only: unrotate pointer coords into section's local space
    const rot = ia.origSec?.rotation || 0
    let px = p.x, py = p.y, sx = ia.startPt.x, sy = ia.startPt.y
    if (rot && ia.mode === 'resize') {
      const o = ia.origSec
      const ocx = o.x + o.w / 2, ocy = o.y + o.h / 2
      const rad = -rot * Math.PI / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      const rotPt = (x, y) => ({
        x: ocx + (x - ocx) * cos - (y - ocy) * sin,
        y: ocy + (x - ocx) * sin + (y - ocy) * cos,
      })
      const rp = rotPt(p.x, p.y); px = rp.x; py = rp.y
      const rs = rotPt(ia.startPt.x, ia.startPt.y); sx = rs.x; sy = rs.y
    }
    const dx = px - sx
    const dy = py - sy

    if (ia.mode === 'floor-move') {
      setFloorPlanTransform(ia.origX + dx, ia.origY + dy, ia.origW, ia.origH)
    } else if (ia.mode === 'floor-resize') {
      const MIN = 50
      let { x, y, w, h } = { x: ia.origX, y: ia.origY, w: ia.origW, h: ia.origH }
      const hid = ia.handle
      if (hid.includes('e')) w = Math.max(MIN, ia.origW + dx)
      if (hid.includes('s')) h = Math.max(MIN, ia.origH + dy)
      if (hid.includes('w')) { x = ia.origX + dx; w = Math.max(MIN, ia.origW - dx) }
      if (hid.includes('n')) { y = ia.origY + dy; h = Math.max(MIN, ia.origH - dy) }
      setFloorPlanTransform(x, y, w, h)
    } else if (ia.mode === 'field') {
      setFieldPos(ia.origField.x + dx, ia.origField.y + dy)
    } else if (ia.mode === 'field-resize') {
      const origDist = distFromCenter(ia.startPt.x - ia.origField.x + 500, ia.startPt.y - ia.origField.y + 500)
      const newDist  = distFromCenter(p.x - ia.origField.x + 500, p.y - ia.origField.y + 500)
      if (origDist > 0) setFieldScale(ia.origScale * (newDist / origDist))
    } else if (ia.mode === 'field-resize-handle') {
      const MIN = 40, hid = ia.handle
      const s = CS / 1000  // canvas scale factor
      let w = ia.origW, h = ia.origH, fx = ia.origField.x, fy = ia.origField.y
      // dx/dy are in SVG coords; divide by scale to get stage-local units
      const ldx = dx / s, ldy = dy / s
      if (hid.includes('e')) w = Math.max(MIN, ia.origW + ldx * 2)
      if (hid.includes('w')) w = Math.max(MIN, ia.origW - ldx * 2)
      if (hid.includes('s')) h = Math.max(MIN, ia.origH + ldy * 2)
      if (hid.includes('n')) h = Math.max(MIN, ia.origH - ldy * 2)
      setStageSize(w, h)
    } else if (ia.mode === 'poly-move') {
      const newPoints = ia.origPoints.map(op => ({ x: op.x + dx, y: op.y + dy }))
      updateSection(ia.id, { points: newPoints })
    } else if (ia.mode === 'poly-vertex') {
      const newPoints = ia.origPoints.map((op, i) =>
        i === ia.pointIdx ? { x: op.x + dx, y: op.y + dy } : { ...op }
      )
      updateSection(ia.id, { points: newPoints })
    } else if (ia.mode === 'move') {
      const o = ia.origSec
      let nx = o.x + dx, ny = o.y + dy
      // Smart guides for rect sections
      if (o.w != null) {
        const others = sections.filter(s => s.id !== ia.id && s.type === 'rect')
        const snapPx = SNAP_THRESHOLD * (viewRef.current.w / CS)
        const g = computeGuides({ x: nx, y: ny, w: o.w, h: o.h }, others, snapPx * (CS / viewRef.current.w) * 8)
        if (g.snapX !== null) nx += g.snapX
        if (g.snapY !== null) ny += g.snapY
        // Recompute guides after snap for accurate line positions
        const g2 = computeGuides({ x: nx, y: ny, w: o.w, h: o.h }, others, 1)
        setGuides((g2.lines.length || g2.gaps.length) ? g2 : null)
      }
      updateSection(ia.id, { x: nx, y: ny })
    } else if (ia.mode === 'rotate') {
      const o = ia.origSec
      const ocx = (o.x ?? 0) + (o.w ?? 0) / 2 || (o.points?.reduce((s, p) => s + p.x, 0) / (o.points?.length || 1))
      const ocy = (o.y ?? 0) + (o.h ?? 0) / 2 || (o.points?.reduce((s, p) => s + p.y, 0) / (o.points?.length || 1))
      const startAngle = Math.atan2(ia.startPt.y - ocy, ia.startPt.x - ocx)
      const curAngle   = Math.atan2(p.y - ocy, p.x - ocx)
      const delta = (curAngle - startAngle) * (180 / Math.PI)
      updateSection(ia.id, { rotation: ((o.rotation || 0) + delta + 360) % 360 })
    } else if (ia.mode === 'arc-move') {
      const o = ia.origSec
      const origAngle = angleFromCenter(ia.startPt.x, ia.startPt.y, CX_, CY_)
      const curAngle  = angleFromCenter(p.x, p.y, CX_, CY_)
      let delta = curAngle - origAngle
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      const newStart = o.startAngle + delta
      const newEnd   = o.endAngle   + delta
      updateSection(ia.id, { startAngle: newStart, endAngle: newEnd })
      const others = sections.filter(s => s.id !== ia.id && s.type === 'arc')
      setArcGuideData({ moving: { ...o, startAngle: newStart, endAngle: newEnd }, others })
    } else if (ia.mode === 'arc-outerR') {
      const o = ia.origSec
      const newR = Math.min(Math.max(distFromCenter(p.x, p.y, CX_, CY_), o.innerR + 10), MAX_R_)
      updateSection(ia.id, { outerR: newR })
    } else if (ia.mode === 'arc-innerR') {
      const o = ia.origSec
      const newR = Math.min(Math.max(distFromCenter(p.x, p.y, CX_, CY_), 10), o.outerR - 10)
      updateSection(ia.id, { innerR: newR })
    } else if (ia.mode === 'arc-startAngle') {
      updateSection(ia.id, { startAngle: angleFromCenter(p.x, p.y, CX_, CY_) })
    } else if (ia.mode === 'arc-endAngle') {
      updateSection(ia.id, { endAngle: angleFromCenter(p.x, p.y, CX_, CY_) })
    } else if (ia.mode === 'resize') {
      const o = ia.origSec
      let { x, y, w, h } = o
      const MIN = 20, hid = ia.handle
      if (hid.includes('e')) w = Math.max(MIN, o.w + dx)
      if (hid.includes('s')) h = Math.max(MIN, o.h + dy)
      if (hid.includes('w')) { x = o.x + dx; w = Math.max(MIN, o.w - dx) }
      if (hid.includes('n')) { y = o.y + dy; h = Math.max(MIN, o.h - dy) }
      updateSection(ia.id, { x, y, w, h })
    } else if (ia.mode === 'row-spacing') {
      const o = ia.origSec
      // Unrotate dx into the row's local horizontal axis
      const rot = (o.rotation || 0) * Math.PI / 180
      const localDx = dx * Math.cos(rot) + dy * Math.sin(rot)
      const newSpacing = Math.max(10, Math.min(100, o.seatSpacing + localDx / Math.max(1, (o.seats - 1) / 2)))
      updateSection(ia.id, { seatSpacing: Math.round(newSpacing) })
    } else if (ia.mode === 'row-curve') {
      const o = ia.origSec
      // Unrotate dy into the row's local vertical axis
      const rot = (o.rotation || 0) * Math.PI / 180
      const localDy = -dx * Math.sin(rot) + dy * Math.cos(rot)
      const newCurve = Math.max(-200, Math.min(200, (o.curve || 0) - localDy * 1.5))
      updateSection(ia.id, { curve: Math.round(newCurve) })
    } else if (ia.mode === 'rect-row-curve') {
      const o = ia.origSec
      const rot = (o.rotation || 0) * Math.PI / 180
      const localDy = -dx * Math.sin(rot) + dy * Math.cos(rot)
      const newCurves = [...(o.rowCurves || [])]
      // apply to all selected rows
      const idxs = useStore.getState().selectedRowIdxs.length ? useStore.getState().selectedRowIdxs : [ia.handle]
      idxs.forEach(rowIdx => {
        const origCurve = newCurves[rowIdx] ?? 0
        newCurves[rowIdx] = Math.round(Math.max(-200, Math.min(200, origCurve - localDy * 1.5)))
      })
      updateSection(ia.id, { rowCurves: newCurves })
    }
  }, [tool, drawingState, setDrawingState, setFieldPos, setFieldScale, updateSection, CX_, CY_])

  // ── Pointer up ────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    interactRef.current = null
    setGuides(null)
    setArcGuideData(null)
    if (tool === 'rect' && drawingState) {
      const { x1, y1, x2, y2 } = drawingState
      const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
      if (w < 10 || h < 10) { setDrawingState(null); return }
      addSection({
        type: 'rect', label: `S${sections.length + 1}`,
        x: Math.min(x1, x2), y: Math.min(y1, y2), w, h,
        category: 'general', color: getCategoryColor('general'),
        price: 500, totalSeats: 100,
      })
    }
  }, [tool, drawingState, sections.length, setDrawingState, addSection, categories])

  // ── Background pointer down (rect draw start) ─────────────────────────────
  const handleBgPointerDown = useCallback((e) => {
    if (tool === 'rect') {
      const p = pt(e)
      setDrawingState({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })
    }
  }, [tool, setDrawingState])

  // ── Canvas click (arc tool + deselect) ────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    if (spaceRef.current) return
    if (didInteractRef.current) { didInteractRef.current = false; return }
    // If we panned (mouse moved), don't treat as click
    if (panRef.current?.moved) { panRef.current = null; return }
    if (!(e.target === svgRef.current || e.target.dataset.bg)) return

    if (tool === 'arc') {
      const p = pt(e)
      const angle = angleFromCenter(p.x, p.y, CX_, CY_)
      const dist  = distFromCenter(p.x, p.y, CX_, CY_)
      const arcThickness = MAX_R_ * 0.18

      if (!drawingState) {
        const outerR = Math.min(Math.max(dist + arcThickness / 2, MAX_R_ * 0.1), MAX_R_)
        const innerR = Math.max(outerR - arcThickness, MAX_R_ * 0.05)
        setDrawingState({ startAngle: angle, innerR, outerR, currentAngle: angle })
      } else {
        const { startAngle, innerR, outerR } = drawingState
        addSection({
          type: 'arc', label: `S${sections.length + 1}`,
          startAngle, endAngle: angle,
          innerR, outerR, cx: CX_, cy: CY_,
          category: 'general', color: getCategoryColor('general'),
          price: 500, totalSeats: 100,
        })
      }
    } else if (tool === 'poly') {
      const p = pt(e)
      const snapDist = CS * 0.012
      if (!drawingState) {
        setDrawingState({ points: [p], mouse: p })
      } else {
        const first = drawingState.points[0]
        const dist = Math.hypot(p.x - first.x, p.y - first.y)
        if (drawingState.points.length >= 3 && dist < snapDist) {
          addSection({
            type: 'poly', label: `S${sections.length + 1}`,
            points: drawingState.points,
            category: 'general', color: getCategoryColor('general'),
            price: 500, totalSeats: 100,
          })
        } else {
          setDrawingState({ ...drawingState, points: [...drawingState.points, p] })
        }
      }
    } else if (tool === 'row') {
      const p = pt(e)
      addRow({ x: p.x, y: p.y })
    } else if (tool === 'table') {
      const p = pt(e)
      addTable({ x: p.x, y: p.y })
    } else if (tool === 'select') {
      selectSection(null)
      selectField(false)
      setFloor(false)
    }
  }, [tool, drawingState, sections.length, setDrawingState, addSection, selectSection, selectField, categories, CX_, CY_, MAX_R_, CS])

  const handleCanvasDblClick = useCallback((e) => {
    if (tool === 'poly' && drawingState?.points?.length >= 3) {
      const points = drawingState.points.slice(0, -1)
      addSection({
        type: 'poly', label: `S${sections.length + 1}`,
        points,
        category: 'general', color: getCategoryColor('general'),
        price: 500, totalSeats: 100,
      })
    }
  }, [tool, drawingState, sections.length, addSection, categories])

  const t = useContext(ThemeContext)
  const [ctxMenu, setCtxMenu] = useState(null)
  const [guides, setGuides] = useState(null)
  const [arcGuideData, setArcGuideData] = useState(null)
  const [floorSelected, setFloorSelected] = useState(false)
  const floorSelectedRef = useRef(false)
  const setFloor = (v) => { floorSelectedRef.current = v; setFloorSelected(v) }

  // Zoom/pan state — always initialized to full canvas
  const [view, setView] = React.useState(() => ({ x: 0, y: 0, w: CS, h: CS }))
  const viewRef = React.useRef(view)
  React.useEffect(() => { viewRef.current = view }, [view])
  const prevCS = React.useRef(CS)
  React.useEffect(() => {
    if (prevCS.current !== CS) {
      prevCS.current = CS
      setView({ x: 0, y: 0, w: CS, h: CS })
    }
  }, [CS])
  const panRef = useRef(null)
  const spaceRef = useRef(false)

  // Track spacebar for pan mode
  React.useEffect(() => {
    const onKeyDown = (e) => { if (e.code === 'Space') { e.preventDefault(); spaceRef.current = true } }
    const onKeyUp   = (e) => { if (e.code === 'Space') spaceRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()

    // Trackpad pan: no ctrlKey = two-finger scroll → pan
    if (!e.ctrlKey && Math.abs(e.deltaX) + Math.abs(e.deltaY) < 60 && e.deltaMode === 0) {
      setView(v => ({
        ...v,
        x: v.x + (e.deltaX / rect.width)  * v.w,
        y: v.y + (e.deltaY / rect.height) * v.h,
      }))
      return
    }

    // Zoom (scroll wheel or pinch)
    const mx = viewRef.current.x + ((e.clientX - rect.left) / rect.width)  * viewRef.current.w
    const my = viewRef.current.y + ((e.clientY - rect.top)  / rect.height) * viewRef.current.h
    const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85
    const newW = Math.min(Math.max(viewRef.current.w * factor, CS / MAX_ZOOM), CS / MIN_ZOOM)
    const scale = newW / viewRef.current.w
    setView({ x: mx - (mx - viewRef.current.x) * scale, y: my - (my - viewRef.current.y) * scale, w: newW, h: newW })
  }, [CS])

  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback((e) => {
    const isBg = e.target === svgRef.current || e.target.getAttribute?.('data-bg') === '1'
    const isHandle = e.target.getAttribute?.('data-handle') === '1'
    if (isHandle) return
    if (e.button === 1 || (e.button === 0 && spaceRef.current) || (e.button === 0 && tool === 'select' && isBg)) {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, origView: { ...viewRef.current }, moved: false }
    }
  }, [tool])



  const handleMouseMove = useCallback((e) => {
    if (!panRef.current) return
    if (interactRef.current) { panRef.current = null; return }  // section interaction took over
    panRef.current.moved = true
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const dx = ((e.clientX - panRef.current.startX) / rect.width)  * panRef.current.origView.w
    const dy = ((e.clientY - panRef.current.startY) / rect.height) * panRef.current.origView.h
    const ov = panRef.current.origView
    setView({ ...ov, x: ov.x - dx, y: ov.y - dy })
  }, [])

  const handleMouseUp = useCallback(() => { panRef.current = null }, []) // { x, y }

  const handleContextMenu = useCallback((e, secId = null) => {
    e.preventDefault()
    e.stopPropagation()
    if (secId) selectSection(secId)
    setCtxMenu({ x: e.clientX, y: e.clientY, secId })
  }, [selectSection])
  const closeCtx = () => setCtxMenu(null)

  const cursor = panRef.current?.moved ? 'grabbing' : spaceRef.current ? 'grab' : tool === 'select' ? 'grab' : 'crosshair'

  // Guide lines while drawing arc
  const arcGuides = tool === 'arc' && drawingState?.startAngle != null && (() => {
    const { startAngle, innerR, outerR } = drawingState
    const s = polar(startAngle, innerR, CX_, CY_)
    const e = polar(startAngle, outerR, CX_, CY_)
    return <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#60a5fa" strokeWidth={CS*0.002} strokeDasharray={`${CS*0.005} ${CS*0.003}`} style={{ pointerEvents: 'none' }} />
  })()

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.canvasBg, overflow: 'hidden', position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        style={{ width: 'min(80vh, 80vw)', height: 'min(80vh, 80vw)', cursor: panRef.current ? 'grabbing' : spaceRef.current ? 'grab' : cursor }}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDblClick}
        onContextMenu={(e) => handleContextMenu(e)}
        onPointerDown={handleBgPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <rect x={0} y={0} width={CS} height={CS} fill={t.svgBg} data-bg="1" />
        {venueShape === 'circular'
          ? <circle cx={CX_} cy={CY_} r={MAX_R_} fill={t.venueFill} data-bg="1" />
          : <rect x={CS*0.05} y={CS*0.05} width={CS*0.9} height={CS*0.9} rx={CS*0.018} fill={t.venueFill} data-bg="1" />
        }
        {floorPlanImage && (() => {
          if (floorPlanLocked && floorSelected) setFloor(false)
          const fpX = floorPlanX ?? 0, fpY = floorPlanY ?? 0
          const fpW = floorPlanW ?? CS, fpH = floorPlanH ?? CS
          const hs = CS * 0.012  // handle size
          const handles = [
            { id: 'nw', cx: fpX,        cy: fpY,        cursor: 'nw-resize' },
            { id: 'ne', cx: fpX + fpW,  cy: fpY,        cursor: 'ne-resize' },
            { id: 'se', cx: fpX + fpW,  cy: fpY + fpH,  cursor: 'se-resize' },
            { id: 'sw', cx: fpX,        cy: fpY + fpH,  cursor: 'sw-resize' },
            { id: 'n',  cx: fpX + fpW/2, cy: fpY,       cursor: 'n-resize'  },
            { id: 's',  cx: fpX + fpW/2, cy: fpY + fpH, cursor: 's-resize'  },
            { id: 'e',  cx: fpX + fpW,  cy: fpY + fpH/2, cursor: 'e-resize' },
            { id: 'w',  cx: fpX,        cy: fpY + fpH/2, cursor: 'w-resize' },
          ]
          return (
            <g>
              <image href={floorPlanImage} x={fpX} y={fpY} width={fpW} height={fpH}
                opacity={floorPlanOpacity ?? 0.35} preserveAspectRatio="none"
                style={{ cursor: floorPlanLocked ? 'default' : 'move', pointerEvents: floorPlanLocked ? 'none' : 'all' }}
                onPointerDown={floorPlanLocked ? undefined : e => {
                  e.stopPropagation()
                  didInteractRef.current = true
                  setFloor(true)
                  selectSection(null)
                  interactRef.current = { mode: 'floor-move', startPt: pt(e), origX: fpX, origY: fpY, origW: fpW, origH: fpH }
                  svgRef.current.setPointerCapture(e.pointerId)
                }}
              />
              {floorSelected && !floorPlanLocked && <>
                <rect x={fpX} y={fpY} width={fpW} height={fpH}
                  fill="none" stroke="#60a5fa" strokeWidth={CS * 0.002}
                  strokeDasharray={`${CS*0.008} ${CS*0.004}`} style={{ pointerEvents: 'none' }} />
                {handles.map(h => (
                  <rect key={h.id}
                    x={h.cx - hs} y={h.cy - hs} width={hs*2} height={hs*2} rx={hs*0.3}
                    fill="#fff" stroke="#3b82f6" strokeWidth={CS*0.0015}
                    data-handle="1" style={{ cursor: h.cursor }}
                onPointerDown={e => {
                  e.stopPropagation()
                  didInteractRef.current = true
                  setFloor(true)
                  interactRef.current = { mode: 'floor-resize', handle: h.id, startPt: pt(e), origX: fpX, origY: fpY, origW: fpW, origH: fpH }
                  svgRef.current.setPointerCapture(e.pointerId)
                }}
                  />
                ))}
              </>}
            </g>
          )
        })()}

        {sections.map((sec) =>
          sec.type === 'arc'
            ? <ArcSection key={sec.id} section={sec} selected={sec.id === selectedId} multiSelected={selectedIds.includes(sec.id)}
                onHandlePointerDown={(e, handle) => handleArcPointerDown(e, handle, sec.id)}
                onContextMenu={(e) => handleContextMenu(e, sec.id)}
                onToggleBlockSeat={(seatId) => toggleBlockSeat(sec.id, seatId)} />
            : sec.type === 'poly'
            ? <PolySection key={sec.id} section={sec} selected={sec.id === selectedId} multiSelected={selectedIds.includes(sec.id)}
                onClick={(e) => { e.stopPropagation(); tool === 'multiselect' ? toggleSelectSection(sec.id) : selectSection(sec.id) }}
                onPointerDown={(e, mode) => mode === 'rotate'
                  ? handleSectionPointerDown(e, 'rotate', null, sec.id)
                  : handlePolyPointerDown(e, sec.id)}
                onPointPointerDown={(e, i) => handlePolyPointPointerDown(e, sec.id, i)}
                onContextMenu={(e) => handleContextMenu(e, sec.id)}
                onToggleBlockSeat={(seatId) => toggleBlockSeat(sec.id, seatId)} />
            : sec.type === 'row'
            ? <RowSection key={sec.id} section={sec} selected={sec.id === selectedId}
                onPointerDown={(e, mode, handle) => { e.stopPropagation(); selectSection(sec.id); handleSectionPointerDown(e, mode, handle, sec.id) }}
                onContextMenu={(e) => handleContextMenu(e, sec.id)}
                onToggleBlockSeat={(seatId) => toggleBlockSeat(sec.id, seatId)} />
            : sec.type === 'table'
            ? <TableSection key={sec.id} section={sec} selected={sec.id === selectedId}
                onPointerDown={(e, mode, handle) => { e.stopPropagation(); selectSection(sec.id); handleSectionPointerDown(e, mode, handle, sec.id) }}
                onContextMenu={(e) => handleContextMenu(e, sec.id)}
                onToggleBlockSeat={(seatId) => toggleBlockSeat(sec.id, seatId)}
                onToggleRemoveSeat={(seatId) => toggleRemoveSeat(sec.id, seatId)} />
            : <RectSection key={sec.id} section={sec} selected={sec.id === selectedId} multiSelected={selectedIds.includes(sec.id)}
                onPointerDown={(e, mode, handle) => handleSectionPointerDown(e, mode, handle, sec.id)}
                onContextMenu={(e) => handleContextMenu(e, sec.id)}
                onToggleBlockSeat={(seatId) => toggleBlockSeat(sec.id, seatId)}
                onToggleRemoveSeat={(seatId) => toggleRemoveSeat(sec.id, seatId)}
                selectedRowIdx={sec.id === selectedId ? selectedRowIdx : null}
                selectedRowIdxs={sec.id === selectedId ? selectedRowIdxs : []}
                onSelectRow={(rowIdx) => toggleSelectedRowIdx(rowIdx)}
                rowSelectMode={rowSelectMode}
                blockRowMode={blockRowMode}
                onToggleBlockRow={(rowSeatIds) => toggleBlockRow(sec.id, rowSeatIds)} />
        )}

        <FieldShape
          type={fieldType}
          x={fieldType === 'stage' ? stageRenderX : fieldX}
          y={fieldType === 'stage' ? stageRenderY : fieldY}
          scale={fieldScale * (CS / 1000)}
          stageW={stageW} stageH={stageH}
          selected={fieldSelected && fieldType === 'stage'}
          dragging={interactRef.current?.mode === 'field'}
          onPointerDown={fieldType === 'stage' && !stageLocked ? handleFieldPointerDown : null}
          onResizePointerDown={fieldType === 'stage' && !stageLocked ? handleFieldResizePointerDown : null}
        />

        {tool === 'arc'  && <ArcGhost  drawingState={drawingState} />}
        {tool === 'rect' && <RectGhost drawingState={drawingState} />}
        {tool === 'poly' && <PolyGhost drawingState={drawingState} />}
        {arcGuides}
        <SmartGuides guides={guides} CS={CS} />
        {arcGuideData && <ArcGuideOverlay moving={arcGuideData.moving} others={arcGuideData.others} CX_={CX_} CY_={CY_} CS={CS} />}
      </svg>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { label: '+', title: 'Zoom in', onClick: () => setView(v => { const f = 0.75; return { x: v.x + v.w*(1-f)/2, y: v.y + v.h*(1-f)/2, w: v.w*f, h: v.h*f } }) },
          { label: '⊙', title: 'Reset zoom', onClick: () => setView({ x: 0, y: 0, w: CS, h: CS }) },
          { label: '−', title: 'Zoom out', onClick: () => setView(v => { const f = 1/0.75; return { x: v.x + v.w*(1-f)/2, y: v.y + v.h*(1-f)/2, w: Math.min(v.w*f, CS/MIN_ZOOM), h: Math.min(v.h*f, CS/MIN_ZOOM) } }) },
        ].map(b => (
          <button key={b.label} title={b.title} onClick={b.onClick} style={{
            width: 32, height: 32, borderRadius: 6, border: `1px solid ${t.panelBorder}`,
            background: t.panelBg, color: t.inputColor, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
          }}>{b.label}</button>
        ))}
      </div>

      {/* Zoom % indicator */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: t.labelColor, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 6, padding: '3px 10px', pointerEvents: 'none' }}>
        {Math.round((CS / view.w) * 100)}%
      </div>

      {ctxMenu && (        <>
          <div onClick={closeCtx} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 100,
            background: t.panelBg, border: `1px solid ${t.panelBorder}`,
            borderRadius: 8, padding: '4px', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            {(() => {
              const lockedSec = ctxMenu.secId ? sections.find(s => s.id === ctxMenu.secId) : null
              const items = [
                { label: '↶ Undo', shortcut: 'Ctrl+Z', action: () => { useStore.getState().undo(); closeCtx() }, disabled: !past.length },
                { label: '↷ Redo', shortcut: 'Ctrl+Y', action: () => { useStore.getState().redo(); closeCtx() }, disabled: !future.length },
                { label: '⎘ Duplicate', shortcut: 'Ctrl+D', action: () => { selectedId && useStore.getState().duplicateSection(selectedId); closeCtx() }, disabled: !selectedId || lockedSec?.locked },
                ...(ctxMenu.secId ? [
                  { divider: true },
                  lockedSec?.locked
                    ? { label: '🔓 Unlock', action: () => { useStore.getState().toggleLock(ctxMenu.secId); closeCtx() }, disabled: false }
                    : { label: '🔒 Lock', action: () => { useStore.getState().toggleLock(ctxMenu.secId); closeCtx() }, disabled: false },
                ] : []),
              ]
              return items.map((item, i) =>
                item.divider
                  ? <div key={i} style={{ height: 1, background: t.panelBorder, margin: '3px 8px' }} />
                  : <button key={item.label} onClick={item.action} disabled={item.disabled} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', padding: '7px 12px', background: 'none', border: 'none',
                      color: item.disabled ? t.headingColor : t.inputColor,
                      fontSize: 13, cursor: item.disabled ? 'default' : 'pointer', borderRadius: 5,
                      opacity: item.disabled ? 0.4 : 1, gap: 24,
                    }}
                    onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = t.layerHover }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span style={{ fontSize: 11, color: t.labelColor }}>{item.shortcut}</span>}
                  </button>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
