import React, { useState, useRef, useCallback, useMemo } from 'react'
import { arcPath, arcCentroid, polar, generateArcSeats, generateRectSeats, generatePolySeats, getCanvasParams } from '../utils/geometry'
import { useStore } from '../store/useStore'
import { themes } from '../theme'
import SeatView3D from '../components/Canvas/SeatView3D'

class Safe extends React.Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? null : this.props.children }
}

// Status colors
const STATUS_COLOR = {
  available:  null,        // use section color
  reserved:   '#f59e0b',
  sold:       '#6b7280',
  hidden:     null,        // skip rendering
}
const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold: 'Sold Out', hidden: 'Hidden' }
const TYPE_BADGE = { vip: '⭐ VIP', standard: 'Standard', accessible: '♿ Accessible', standing: '🧍 Standing' }

function FieldShape({ type, x, y, scale = 1, stageW = 260, stageH = 120 }) {
  if (type === 'none') return null
  const content = (() => {
    if (type === 'cricket') return (<><ellipse rx={180} ry={180} fill="#4ade80" opacity={0.9} /><ellipse rx={140} ry={140} fill="#22c55e" /><rect x={-12} y={-60} width={24} height={120} rx={4} fill="#d4a96a" /></>)
    if (type === 'football') return (<><rect x={-180} y={-120} width={360} height={240} rx={6} fill="#4ade80" /><rect x={-180} y={-120} width={360} height={240} rx={6} fill="none" stroke="#fff" strokeWidth={2} /><circle r={50} fill="none" stroke="#fff" strokeWidth={2} /><line x1={0} y1={-120} x2={0} y2={120} stroke="#fff" strokeWidth={2} /></>)
    if (type === 'basketball') return (<><rect x={-150} y={-100} width={300} height={200} rx={4} fill="#f97316" opacity={0.85} /><circle r={40} fill="none" stroke="#fff" strokeWidth={2} /><line x1={0} y1={-100} x2={0} y2={100} stroke="#fff" strokeWidth={2} /></>)
    if (type === 'stage') { const hw = stageW/2, hh = stageH/2; return (<><rect x={-hw} y={-hh} width={stageW} height={stageH} rx={8} fill="#7c3aed" opacity={0.85} /><text textAnchor="middle" dominantBaseline="middle" fill="#e9d5ff" fontSize={18} fontWeight="bold">STAGE</text></>); }
    return null
  })()
  return <g transform={`translate(${x},${y}) scale(${scale})`} style={{ pointerEvents: 'none' }}>{content}</g>
}

// Generate seat ID same as validator
function seatId(secLabel, rowNum, seatNum) {
  return `${secLabel}-Row${rowNum}-Seat${seatNum}`
}

function generateSeatsWithIds(sec) {
  let positions
  if (sec.type === 'arc') positions = generateArcSeats(sec).seats
  else if (sec.type === 'rect') positions = generateRectSeats(sec).seats
  else if (sec.type === 'poly') positions = generatePolySeats(sec).seats
  else positions = []

  // Block-layout seats already have correct IDs (e.g. S2-Block1-S1, S2-Block1-R1C1)
  if (sec.gridLayout?.blocks?.length > 0) return positions

  const groups = sec.rowGroups || [{ rows: 1, seatsPerRow: sec.totalSeats || 0 }]
  const ids = []
  let rowNum = 1
  for (const g of groups) {
    for (let r = 0; r < (g.rows || 1); r++) {
      for (let s = 1; s <= (g.seatsPerRow || 0); s++) {
        ids.push(seatId(sec.label, rowNum, s))
      }
      rowNum++
    }
  }
  return positions.map((pos, i) => ({ ...pos, id: ids[i] || `${sec.id}-${i}` }))
}

export default function VenueRenderer({ venueData: _venueData }) {
  // Live data from store — reflects builder changes instantly
  const storeData = useStore(s => ({
    venue: { name: s.venueName, shape: s.venueShape, field: s.fieldType, fieldX: s.fieldX, fieldY: s.fieldY, fieldScale: s.fieldScale, canvasSize: s.canvasSize || 1000, stageX: s.stageX ?? s.fieldX, stageY: s.stageY ?? s.fieldY, stageW: s.stageW ?? 260, stageH: s.stageH ?? 120 },
    sections: s.sections,
    categories: s.categories,
    floorPlanImage: s.floorPlanImage,
    floorPlanOpacity: s.floorPlanOpacity ?? 0.35,
  }))
  const theme = useStore(s => s.theme)
  const t = themes[theme]

  // Use live store data if no venueData prop (builder preview), else use prop (exported view)
  const { venue, sections, categories, floorPlanImage, floorPlanOpacity } = _venueData
    ? { ..._venueData, floorPlanImage: null, floorPlanOpacity: 0.35 }
    : storeData

  const CS = venue.canvasSize || 1000
  const { cx: CX_, cy: CY_, maxR: MAX_R_ } = getCanvasParams(CS)

  const svgRef = useRef(null)
  const panRef = useRef(null)
  const viewRef = useRef({ x: 0, y: 0, w: CS, h: CS })
  const [view, setView] = useState({ x: 0, y: 0, w: CS, h: CS })

  // Cart: set of seat IDs + simple section entries {secId, qty}
  const [cart, setCart] = useState(new Set())
  const [simpleCart, setSimpleCart] = useState([]) // [{sec, qty}]
  // Quantity picker for simple sections
  const [qtyPicker, setQtyPicker] = useState(null) // {sec, qty}
  // Hovered section for tooltip
  const [hovered, setHovered] = useState(null)
  // Expanded section (zoomed in to show individual seats)
  const [expandedId, setExpandedId] = useState(null)
  // 3D view
  const [view3D, setView3D] = useState(null)

  const zoomLevel = CS / view.w  // 1 = full view, >4 = zoomed in enough to show seats

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const v = viewRef.current
    const mx = v.x + ((e.clientX - rect.left) / rect.width) * v.w
    const my = v.y + ((e.clientY - rect.top) / rect.height) * v.h
    const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85
    const newW = Math.min(Math.max(v.w * factor, CS / 500), CS / 0.05)
    const scale = newW / v.w
    const next = { x: mx - (mx - v.x) * scale, y: my - (my - v.y) * scale, w: newW, h: newW }
    viewRef.current = next
    setView(next)
  }, [CS])

  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Touch gestures: pan + pinch-zoom
  const touchRef = useRef({})
  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchRef.current = { type: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY, origView: { ...viewRef.current } }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchRef.current = { type: 'pinch', dist: Math.hypot(dx, dy), origView: { ...viewRef.current },
          mx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          my: (e.touches[0].clientY + e.touches[1].clientY) / 2 }
      }
    }

    const onTouchMove = (e) => {
      e.preventDefault()
      const tr = touchRef.current
      const rect = el.getBoundingClientRect()
      if (tr.type === 'pan' && e.touches.length === 1) {
        const dx = ((e.touches[0].clientX - tr.x) / rect.width) * tr.origView.w
        const dy = ((e.touches[0].clientY - tr.y) / rect.height) * tr.origView.h
        const next = { ...tr.origView, x: tr.origView.x - dx, y: tr.origView.y - dy }
        viewRef.current = next; setView(next)
      } else if (tr.type === 'pinch' && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const scale = tr.dist / dist
        const mx = tr.origView.x + ((tr.mx - rect.left) / rect.width) * tr.origView.w
        const my = tr.origView.y + ((tr.my - rect.top) / rect.height) * tr.origView.h
        const newW = Math.min(Math.max(tr.origView.w * scale, CS / 500), CS / 0.05)
        const s = newW / tr.origView.w
        const next = { x: mx - (mx - tr.origView.x) * s, y: my - (my - tr.origView.y) * s, w: newW, h: newW }
        viewRef.current = next; setView(next)
      }
    }

    const onTouchEnd = () => { touchRef.current = {} }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [CS])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 || e.button === 1) {
      panRef.current = { startX: e.clientX, startY: e.clientY, origView: { ...viewRef.current }, moved: false }
      e.preventDefault()
    }
  }, [])
  const handleMouseMove = useCallback((e) => {
    if (!panRef.current) return
    panRef.current.moved = true
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const ov = panRef.current.origView
    const dx = ((e.clientX - panRef.current.startX) / rect.width) * ov.w
    const dy = ((e.clientY - panRef.current.startY) / rect.height) * ov.h
    const next = { ...ov, x: ov.x - dx, y: ov.y - dy }
    viewRef.current = next
    setView(next)
  }, [])
  const didPanRef = useRef(false)
  const handleMouseUp = useCallback(() => {
    didPanRef.current = panRef.current?.moved ?? false
    panRef.current = null
  }, [])

  const zoomToSection = useCallback((sec) => {
    let x, y, w, h
    if (sec.type === 'arc') {
      const pad = (sec.outerR - sec.innerR) * 0.5
      x = CX_ - sec.outerR - pad; y = CY_ - sec.outerR - pad
      w = (sec.outerR + pad) * 2; h = w
    } else if (sec.type === 'rect') {
      const pad = Math.max(sec.w, sec.h) * 0.3
      x = sec.x - pad; y = sec.y - pad; w = sec.w + pad * 2; h = sec.h + pad * 2
    } else if (sec.type === 'poly' && sec.points?.length) {
      const xs = sec.points.map(p => p.x), ys = sec.points.map(p => p.y)
      const pad = (Math.max(...xs) - Math.min(...xs)) * 0.3
      x = Math.min(...xs) - pad; y = Math.min(...ys) - pad
      w = Math.max(...xs) - Math.min(...xs) + pad * 2; h = Math.max(...ys) - Math.min(...ys) + pad * 2
    } else return
    const size = Math.max(w, h)
    const next = { x, y, w: size, h: size }
    viewRef.current = next
    setView(next)
    setExpandedId(sec.id)
  }, [CX_, CY_])

  const resetZoom = useCallback(() => {
    const next = { x: 0, y: 0, w: CS, h: CS }
    viewRef.current = next
    setView(next)
    setExpandedId(null)
  }, [CS])

  // Seats for expanded section
  const expandedSeats = useMemo(() => {
    if (!expandedId) return null
    const sec = sections.find(s => s.id === expandedId)
    if (!sec) return null
    return { sec, seats: generateSeatsWithIds(sec) }
  }, [expandedId, sections])

  // Build a seatId → {price, category, color} map for the expanded section
  const seatMeta = useMemo(() => {
    if (!expandedSeats) return {}
    const { sec } = expandedSeats
    const map = {}
    const groups = sec.rowGroups || [{ rows: 1, seatsPerRow: sec.totalSeats || 0 }]
    let rowNum = 1
    for (const g of groups) {
      for (let r = 0; r < (g.rows || 1); r++) {
        for (let s = 1; s <= (g.seatsPerRow || 0); s++) {
          const id = seatId(sec.label, rowNum, s)
          map[id] = {
            price: g.price ?? sec.price,
            category: g.category || sec.category,
            color: g.color || null,
          }
        }
        rowNum++
      }
    }
    return map
  }, [expandedSeats])

  const toggleSeat = useCallback((id) => {
    setCart(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const cartSections = useMemo(() => {
    const map = {}
    for (const sec of sections) {
      if (sec.type === 'table') {
        if (sec.bookBySeat) {
          const count = [...cart].filter(id => id.startsWith(sec.label + '-Chair')).length
          if (count > 0) map[sec.id] = { sec, count, simple: false }
        } else {
          const entry = simpleCart.find(e => e.sec.id === sec.id)
          if (entry) map[sec.id] = { sec, count: entry.qty, simple: true }
        }
      } else if (!(sec.showSeats ?? true)) {
        const entry = simpleCart.find(e => e.sec.id === sec.id)
        if (entry) map[sec.id] = { sec, count: entry.qty, simple: true }
      } else {
        const count = [...cart].filter(id => id.startsWith(sec.label + '-')).length
        if (count > 0) map[sec.id] = { sec, count, simple: false }
      }
    }
    return Object.values(map)
  }, [cart, simpleCart, sections])

  const cartTotal = useMemo(() => {
    let total = 0
    for (const { sec, count, simple } of cartSections) {
      if (simple) total += (sec.price || 0) * count
      else if (sec.type === 'table') total += count * (sec.price || 0)
      else total += [...cart].filter(id => id.startsWith(sec.label + '-')).reduce((s, id) => s + (seatMeta[id]?.price ?? sec.price ?? 0), 0)
    }
    return total
  }, [cartSections, cart, seatMeta])

  const fieldScale = (venue.fieldScale ?? 1) * (CS / 1000)
  const showSeats = zoomLevel >= 4

  const isMobile = window.innerWidth < 768

  return (
  <>
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, padding: isMobile ? 12 : 24, background: t.appBg, minHeight: '100vh', alignItems: 'flex-start' }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          style={{ width: '100%', aspectRatio: '1', borderRadius: 12, cursor: panRef.current?.moved ? 'grabbing' : 'grab', display: 'block', maxHeight: '80vh' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onClick={e => { if (didPanRef.current) { didPanRef.current = false; return }; if (e.target.getAttribute('data-bg')) setHovered(null) }}>

          <rect x={0} y={0} width={CS} height={CS} fill={t.svgBg} data-bg="1" />
          {venue.shape === 'circular'
            ? <circle cx={CX_} cy={CY_} r={MAX_R_} fill={t.venueFill} data-bg="1" />
            : <rect x={CS*0.05} y={CS*0.05} width={CS*0.9} height={CS*0.9} rx={CS*0.018} fill={t.venueFill} data-bg="1" />
          }
          {floorPlanImage && <image href={floorPlanImage} x={0} y={0} width={CS} height={CS} opacity={floorPlanOpacity} style={{ pointerEvents: 'none' }} preserveAspectRatio="xMidYMid meet" />}

          {sections.filter(s => s.status !== 'hidden').map(sec => {
            const status = sec.status || 'available'
            const isSold = status === 'sold'
            const isReserved = status === 'reserved'
            const fillColor = STATUS_COLOR[status] || sec.color
            const isExpanded = sec.id === expandedId
            const rot = sec.rotation || 0

            const secCx = sec.type === 'rect' ? sec.x + sec.w / 2
              : sec.type === 'poly' ? sec.points?.reduce((s, p) => s + p.x, 0) / (sec.points?.length || 1)
              : 0
            const secCy = sec.type === 'rect' ? sec.y + sec.h / 2
              : sec.type === 'poly' ? sec.points?.reduce((s, p) => s + p.y, 0) / (sec.points?.length || 1)
              : 0

            const handleClick = () => {
              if (didPanRef.current) { didPanRef.current = false; return }
              if (isSold || isReserved) return
              // Table: bookBySeat chairs handle their own clicks; otherwise increment qty in cart
              if (sec.type === 'table') {
                if (sec.bookBySeat) return  // chairs handle clicks directly
                const maxSeats = sec.tableShape === 'rect'
                  ? (sec.seatsTop ?? 2) + (sec.seatsBottom ?? 2) + (sec.seatsLeft ?? 1) + (sec.seatsRight ?? 1)
                  : (sec.chairs ?? 8)
                const existing = simpleCart.find(e => e.sec.id === sec.id)
                if (existing) {
                  if (existing.qty >= maxSeats) return
                  setSimpleCart(p => p.map(e => e.sec.id === sec.id ? { ...e, qty: e.qty + 1 } : e))
                } else {
                  setSimpleCart(p => [...p, { sec, qty: 1, maxSeats }])
                }
                return
              }
              if (!(sec.showSeats ?? true)) {
                const existing = simpleCart.find(e => e.sec.id === sec.id)
                setQtyPicker({ sec, qty: existing?.qty || 1 })
                return
              }
              if (isExpanded) return
              zoomToSection(sec)
            }

            const handleHover = (e) => {
              if (isSold) return
              setHovered({ secId: sec.id, clientX: e.clientX, clientY: e.clientY })
            }

            const isSimpleSelected = !(sec.showSeats ?? true) && simpleCart.some(e => e.sec.id === sec.id)
            const shapeProps = {
              fill: fillColor,
              fillOpacity: isSold ? 0.4 : isExpanded || isSimpleSelected ? 0.95 : 0.75,
              stroke: isExpanded || isSimpleSelected ? '#22c55e' : isSold ? '#6b7280' : 'rgba(0,0,0,0.3)',
              strokeWidth: isExpanded || isSimpleSelected ? 2.5 : 1,
              style: { cursor: isSold || isReserved ? 'not-allowed' : 'pointer' },
              onMouseEnter: handleHover,
              onMouseLeave: () => setHovered(null),
              onClick: handleClick,
            }

            let shape = null
            if (sec.type === 'arc') {
              const c = arcCentroid(sec.startAngle, sec.endAngle, sec.innerR, sec.outerR, sec.cx ?? CX_, sec.cy ?? CY_)
              shape = (
                <g key={sec.id}>
                  <path d={arcPath(sec.startAngle, sec.endAngle, sec.innerR, sec.outerR, sec.cx ?? CX_, sec.cy ?? CY_)} {...shapeProps} />
                  {isSold && <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(6, sec.innerR * 0.05)} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none' }}>SOLD</text>}
                  {!isSold && <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(8, sec.innerR * 0.06)} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{sec.label}</text>}
                </g>
              )
            } else if (sec.type === 'rect') {
              shape = (
                <g key={sec.id} transform={`rotate(${rot},${secCx},${secCy})`}>
                  <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h} rx={4} {...shapeProps} />
                  {isSold && <text x={secCx} y={secCy} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(8, Math.min(sec.w, sec.h) * 0.1)} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none' }}>SOLD</text>}
                  {!isSold && <text x={secCx} y={secCy} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(8, Math.min(sec.w, sec.h) * 0.12)} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{sec.label}</text>}
                </g>
              )
            } else if (sec.type === 'poly' && sec.points?.length) {
              const d = 'M ' + sec.points.map(p => `${p.x},${p.y}`).join(' L ') + ' Z'
              shape = (
                <g key={sec.id} transform={`rotate(${rot},${secCx},${secCy})`}>
                  <path d={d} {...shapeProps} />
                  {isSold && <text x={secCx} y={secCy} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none' }}>SOLD</text>}
                  {!isSold && <text x={secCx} y={secCy} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{sec.label}</text>}
                </g>
              )
            } else if (sec.type === 'table') {
              // Generate chair positions inline (same logic as TableSection)
              const chairR = Math.max(6, Math.min(sec.tableW ?? 100, sec.tableH ?? 60) * 0.12)
              const gap = chairR * 0.6
              const blocked = new Set(sec.blockedSeats || [])
              let chairPositions = []
              if (sec.tableShape === 'round') {
                const total = (sec.chairs ?? 8) + (sec.openSpaces ?? 0)
                const tableRadius = (sec.autoRadius ?? true)
                  ? Math.max((sec.tableW ?? 80) / 2, (total * (chairR * 2 + gap)) / (2 * Math.PI))
                  : (sec.tableW ?? 80) / 2
                const orbitR = tableRadius + chairR + gap
                for (let i = 0; i < total; i++) {
                  const angle = (i / total) * 2 * Math.PI - Math.PI / 2
                  chairPositions.push({ cx: sec.x + Math.cos(angle) * orbitR, cy: sec.y + Math.sin(angle) * orbitR, isOpen: i >= (sec.chairs ?? 8), id: `${sec.label}-Chair${i + 1}` })
                }
              } else {
                const top = sec.seatsTop ?? 2, bottom = sec.seatsBottom ?? 2
                const left = sec.seatsLeft ?? 1, right = sec.seatsRight ?? 1
                const hw = (sec.tableW ?? 100) / 2, hh = (sec.tableH ?? 60) / 2
                const ox = hw + chairR + gap, oy = hh + chairR + gap
                const addSide = (count, getPos) => { for (let i = 0; i < count; i++) { const t2 = count > 1 ? (i + 0.5) / count : 0.5; chairPositions.push({ ...getPos(t2), isOpen: false, id: `${sec.label}-Chair${chairPositions.length + 1}` }) } }
                addSide(top,    t2 => ({ cx: sec.x - hw + t2 * (sec.tableW ?? 100), cy: sec.y - oy }))
                addSide(right,  t2 => ({ cx: sec.x + ox, cy: sec.y - hh + t2 * (sec.tableH ?? 60) }))
                addSide(bottom, t2 => ({ cx: sec.x - hw + t2 * (sec.tableW ?? 100), cy: sec.y + oy }))
                addSide(left,   t2 => ({ cx: sec.x - ox, cy: sec.y - hh + t2 * (sec.tableH ?? 60) }))
              }
              const tableRadius2 = (sec.autoRadius ?? true) && sec.tableShape === 'round'
                ? Math.max((sec.tableW ?? 80) / 2, (((sec.chairs ?? 8) + (sec.openSpaces ?? 0)) * (chairR * 2 + gap)) / (2 * Math.PI))
                : (sec.tableW ?? 80) / 2
              const tableInCart = !sec.bookBySeat && simpleCart.some(e => e.sec.id === sec.id)
              shape = (
                <g key={sec.id} transform={`rotate(${rot},${sec.x},${sec.y})`}
                  onClick={handleClick} onMouseEnter={handleHover} onMouseLeave={() => setHovered(null)}
                  style={{ cursor: isSold || isReserved ? 'not-allowed' : 'pointer', filter: tableInCart ? `drop-shadow(0 0 8px ${fillColor}) drop-shadow(0 0 16px ${fillColor}88)` : undefined }}>
                  {sec.tableShape === 'round'
                    ? <circle cx={sec.x} cy={sec.y} r={tableRadius2} fill={fillColor} fillOpacity={isSold ? 0.4 : tableInCart ? 1 : 0.75} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                    : <rect x={sec.x - (sec.tableW ?? 100) / 2} y={sec.y - (sec.tableH ?? 60) / 2} width={sec.tableW ?? 100} height={sec.tableH ?? 60} rx={8} fill={fillColor} fillOpacity={isSold ? 0.4 : tableInCart ? 1 : 0.75} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                  }
                  {(sec.labelVisible ?? true) && <text x={sec.x} y={sec.y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(8, Math.min(sec.tableW ?? 100, sec.tableH ?? 60) * 0.22)} fill="#fff" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>{sec.label}</text>}
                  {chairPositions.map((p, i) => {
                    const inCart = cart.has(p.id)
                    return (
                      <circle key={i} cx={p.cx} cy={p.cy} r={chairR}
                        fill={p.isOpen ? 'transparent' : blocked.has(p.id) ? '#6b7280' : inCart ? fillColor : '#f8fafc'}
                        fillOpacity={p.isOpen ? 0 : inCart ? 1 : 0.9}
                        stroke={p.isOpen ? 'rgba(255,255,255,0.15)' : blocked.has(p.id) ? '#4b5563' : inCart ? '#fff' : fillColor}
                        strokeWidth={inCart ? 2 : 1.5} strokeDasharray={p.isOpen ? '3 2' : undefined}
                        style={{ cursor: sec.bookBySeat && !p.isOpen ? 'pointer' : 'default' }}
                        onClick={sec.bookBySeat && !p.isOpen && !isSold ? e => { e.stopPropagation(); toggleSeat(p.id) } : undefined}
                      />
                    )
                  })}
                </g>
              )
            }
            return shape
          })}

          {/* Individual seats when zoomed in */}
          {expandedSeats && (() => {
            const { sec, seats } = expandedSeats
            const blocked = new Set(sec.blockedSeats || [])
            const rot = sec.rotation || 0
            const seatR = Math.max(0.5, (sec.type === 'arc'
              ? generateArcSeats(sec).seatR
              : sec.type === 'rect' ? generateRectSeats(sec).seatR
              : generatePolySeats(sec).seatR))
            
            const cx = sec.type === 'rect' ? sec.x + sec.w / 2
              : sec.type === 'poly' ? sec.points?.reduce((s, p) => s + p.x, 0) / (sec.points?.length || 1)
              : 0
            const cy = sec.type === 'rect' ? sec.y + sec.h / 2
              : sec.type === 'poly' ? sec.points?.reduce((s, p) => s + p.y, 0) / (sec.points?.length || 1)
              : 0
            
            const content = seats.filter(seat => !seat.removed).map(seat => {
              if (blocked.has(seat.id)) {
                return (
                  <circle key={seat.id} cx={seat.x} cy={seat.y} r={seatR * 1.1}
                    fill="#6b7280" fillOpacity={0.6}
                    style={{ cursor: 'not-allowed' }} />
                )
              }
              const inCart = cart.has(seat.id)
              const meta = seatMeta[seat.id]
              const dotColor = meta?.color || '#fff'
              return (
                <circle key={seat.id} cx={seat.x} cy={seat.y} r={seatR * 1.1}
                  fill={inCart ? '#22c55e' : dotColor}
                  fillOpacity={inCart ? 1 : 0.9}
                  stroke={inCart ? '#16a34a' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={seatR * 0.15}
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); toggleSeat(seat.id) }}
                  onMouseEnter={e => setHovered({ seatId: seat.id, meta, clientX: e.clientX, clientY: e.clientY })}
                  onMouseLeave={() => setHovered(null)}
                />
              )
            })
            
            return rot ? <g transform={`rotate(${rot},${cx},${cy})`}>{content}</g> : content
          })()}

          <FieldShape type={venue.field} x={venue.field === 'stage' ? (venue.stageX ?? venue.fieldX ?? CX_) : (venue.fieldX ?? CX_)} y={venue.field === 'stage' ? (venue.stageY ?? venue.fieldY ?? CY_) : (venue.fieldY ?? CY_)} scale={fieldScale} stageW={venue.stageW} stageH={venue.stageH} />
        </svg>

        {/* Zoom hint */}
        {!expandedId && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: t.labelColor, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 20, padding: '4px 12px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Click section to zoom • Scroll to zoom
        </div>}
        {expandedId && <button onClick={resetZoom} style={{ position: 'absolute', top: 12, left: 12, fontSize: 12, background: t.panelBg, border: `1px solid ${t.panelBorder}`, color: t.inputColor, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>← Back to full view</button>}

        {/* Zoom controls */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: '+', onClick: () => { const v = viewRef.current; const f = 0.75; const next = { x: v.x+v.w*(1-f)/2, y: v.y+v.h*(1-f)/2, w: v.w*f, h: v.h*f }; viewRef.current=next; setView(next) } },
            { label: '⊙', onClick: resetZoom },
            { label: '−', onClick: () => { const v = viewRef.current; const f = 1/0.75; const next = { x: v.x+v.w*(1-f)/2, y: v.y+v.h*(1-f)/2, w: Math.min(v.w*f, CS/0.05), h: Math.min(v.h*f, CS/0.05) }; viewRef.current=next; setView(next) } },
          ].map(b => (
            <button key={b.label} onClick={b.onClick} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${t.panelBorder}`, background: t.panelBg, color: t.inputColor, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>{b.label}</button>
          ))}
        </div>

        {/* Hover tooltip */}
        {hovered && (() => {
          const sec = hovered.secId ? sections.find(s => s.id === hovered.secId) : null
          const cat = sec ? categories.find(c => c.id === sec?.category) : null
          const status = sec?.status || 'available'
          if (!sec && !hovered.seatId) return null

          // Compute price display for section hover
          let priceDisplay = `₹${sec?.price?.toLocaleString()} / seat`
          if (sec && (sec.showSeats ?? true) && sec.rowGroups?.length) {
            const prices = sec.rowGroups.map(g => g.price ?? sec.price).filter(Boolean)
            const min = Math.min(...prices), max = Math.max(...prices)
            priceDisplay = min === max ? `₹${min.toLocaleString()} / seat` : `₹${min.toLocaleString()} – ₹${max.toLocaleString()} / seat`
          }

          return (
            <div style={{ position: 'fixed', left: hovered.clientX + 12, top: hovered.clientY - 8, zIndex: 999, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: t.inputColor, pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', minWidth: 140 }}>
              {sec && !hovered.seatId && <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{sec.label}</div>
                <div style={{ color: t.labelColor, marginBottom: 2 }}>{cat?.label || sec.category} · {TYPE_BADGE[sec.seatType] || 'Standard'}</div>
                <div style={{ color: t.labelColor, marginBottom: 2 }}>{priceDisplay}</div>
                <div style={{ marginTop: 4, display: 'inline-block', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600, color: '#fff', background: status === 'available' ? '#16a34a' : status === 'reserved' ? '#d97706' : '#6b7280' }}>{STATUS_LABEL[status]}</div>
              </>}
              {hovered.seatId && (() => {
                const meta = hovered.meta
                const seatCat = meta?.category ? categories.find(c => c.id === meta.category) : cat
                return <>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{hovered.seatId}</div>
                  {seatCat && <div style={{ color: t.labelColor, marginBottom: 2 }}>{seatCat.label}</div>}
                  <div style={{ color: t.labelColor, marginBottom: 2 }}>₹{(meta?.price ?? sec?.price)?.toLocaleString()} / seat</div>
                  <div style={{ color: cart.has(hovered.seatId) ? '#22c55e' : t.labelColor }}>{cart.has(hovered.seatId) ? '✓ In cart' : 'Click to select'}</div>
                </>
              })()}
            </div>
          )
        })()}
      </div>

      {/* Cart sidebar */}
      <div style={{ width: isMobile ? '100%' : 260, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, padding: 16, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 3D View Preview */}
        {expandedId && (
          <div style={{ width: '100%', height: 140, background: '#1a1a2e', borderRadius: 8, marginBottom: 12, overflow: 'hidden', position: 'relative' }}>
            <Safe><SeatView3D section={sections.find(s => s.id === expandedId)} fieldType={venue.field} preview stageX={venue.stageX} stageY={venue.stageY} stageW={venue.stageW} stageH={venue.stageH} venueShape={venue.shape} /></Safe>
            <div style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
              👁 View from this seat
            </div>
          </div>
        )}

        <div style={{ fontWeight: 700, fontSize: 15, color: t.inputColor, marginBottom: 12 }}>🛒 Cart <span style={{ fontSize: 12, fontWeight: 400, color: t.labelColor }}>({cart.size + simpleCart.reduce((s, e) => s + e.qty, 0)} seats)</span></div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['#16a34a', 'Available'], ['#22c55e', 'Selected'], ['#d97706', 'Reserved'], ['#6b7280', 'Sold']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: t.labelColor }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />{label}
            </div>
          ))}
        </div>

        {/* Inline quantity picker */}
        {qtyPicker && (
          <div style={{ background: t.inputBg, border: `1px solid #3b82f6`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: t.inputColor, marginBottom: 2 }}>{qtyPicker.sec.label}</div>
            <div style={{ fontSize: 11, color: t.labelColor, marginBottom: 10 }}>₹{(qtyPicker.sec.price || 0).toLocaleString()} / seat · {qtyPicker.sec.type === 'table' ? ((qtyPicker.sec.seatsTop ?? 2) + (qtyPicker.sec.seatsBottom ?? 2) + (qtyPicker.sec.seatsLeft ?? 1) + (qtyPicker.sec.seatsRight ?? 1)) : (qtyPicker.sec.totalSeats ?? '?')} available</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'center' }}>
              <button onClick={() => setQtyPicker(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}
                style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${t.inputBorder}`, background: t.panelBg, color: t.inputColor, fontSize: 16, cursor: 'pointer' }}>−</button>
              <input type="number" min={1} value={qtyPicker.qty}
                onChange={e => setQtyPicker(p => ({ ...p, qty: Math.max(1, Number(e.target.value) || 1) }))}
                style={{ width: 48, textAlign: 'center', background: t.panelBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.inputColor, padding: '4px', fontSize: 14, fontWeight: 700 }} />
              <button onClick={() => setQtyPicker(p => ({ ...p, qty: p.qty + 1 }))}
                style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${t.inputBorder}`, background: t.panelBg, color: t.inputColor, fontSize: 16, cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.labelColor, marginBottom: 10 }}>
              <span>Subtotal</span>
              <strong style={{ color: t.inputColor }}>₹{(qtyPicker.qty * (qtyPicker.sec.price || 0)).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setQtyPicker(null)}
                style={{ flex: 1, padding: '6px', borderRadius: 5, border: `1px solid ${t.inputBorder}`, background: 'none', color: t.labelColor, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={() => {
                setSimpleCart(p => [...p.filter(e => e.sec.id !== qtyPicker.sec.id), { sec: qtyPicker.sec, qty: qtyPicker.qty }])
                setQtyPicker(null)
              }} style={{ flex: 1, padding: '6px', borderRadius: 5, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Add to Cart</button>
            </div>
          </div>
        )}

        {cart.size === 0 && simpleCart.length === 0
          ? <div style={{ fontSize: 12, color: t.labelColor, textAlign: 'center', padding: '20px 0' }}>No seats selected.<br />Click a section to get started.</div>
          : <>
            {cartSections.map(({ sec, count, simple }) => {
              if (simple && sec.type !== 'table') return (
                <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: t.inputColor, marginBottom: 8, padding: '6px 8px', background: t.inputBg, borderRadius: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{sec.label}</div>
                    <div style={{ fontSize: 11, color: t.labelColor }}>{count} seats × ₹{sec.price?.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>₹{(count * (sec.price || 0)).toLocaleString()}</span>
                    <button onClick={() => setSimpleCart(p => p.filter(e => e.sec.id !== sec.id))}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                </div>
              )
              const cartSeats = [...cart].filter(id => id.startsWith(sec.label + '-'))
              // Table bookBySeat: simple display
              if (sec.type === 'table') {
                const maxSeats = sec.tableShape === 'rect'
                  ? (sec.seatsTop ?? 2) + (sec.seatsBottom ?? 2) + (sec.seatsLeft ?? 1) + (sec.seatsRight ?? 1)
                  : (sec.chairs ?? 8)
                return (
                <div key={sec.id} style={{ fontSize: 13, color: t.inputColor, marginBottom: 8, padding: '8px 10px', background: t.inputBg, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{sec.label}</span>
                    <button onClick={() => setSimpleCart(p => p.filter(e => e.sec.id !== sec.id))}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: t.panelBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={() => setSimpleCart(p => p.map(e => e.sec.id === sec.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))}
                        style={{ width: 30, height: 28, border: 'none', background: 'none', color: t.inputColor, cursor: 'pointer', fontSize: 16, fontWeight: 300 }}>−</button>
                      <span style={{ minWidth: 32, textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.inputColor }}>{count}</span>
                      <button onClick={() => setSimpleCart(p => p.map(e => e.sec.id === sec.id ? { ...e, qty: Math.min(maxSeats, e.qty + 1) } : e))}
                        disabled={count >= maxSeats}
                        style={{ width: 30, height: 28, border: 'none', background: 'none', color: count >= maxSeats ? t.labelColor : t.inputColor, cursor: count >= maxSeats ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 300, opacity: count >= maxSeats ? 0.4 : 1 }}>+</button>
                    </div>
                    <span style={{ fontSize: 11, color: t.labelColor }}>× ₹{(sec.price || 0).toLocaleString()} / {maxSeats} max</span>
                    <span style={{ fontWeight: 700 }}>₹{(count * (sec.price || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
              // Group by price
              const priceGroups = {}
              for (const id of cartSeats) {
                const price = seatMeta[id]?.price ?? sec.price ?? 0
                const catId = seatMeta[id]?.category || sec.category
                const key = `${price}-${catId}`
                if (!priceGroups[key]) priceGroups[key] = { price, catId, count: 0 }
                priceGroups[key].count++
              }
              return (
                <div key={sec.id} style={{ marginBottom: 8, padding: '6px 8px', background: t.inputBg, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: t.inputColor, marginBottom: 4 }}>{sec.label}</div>
                  {Object.values(priceGroups).map(({ price, catId, count }) => {
                    const cat = categories.find(c => c.id === catId)
                    return (
                      <div key={`${price}-${catId}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.labelColor }}>
                        <span>{cat?.label || catId} × {count} @ ₹{price?.toLocaleString()}</span>
                        <span style={{ color: t.inputColor, fontWeight: 600 }}>₹{(count * price).toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div style={{ borderTop: `1px solid ${t.panelBorder}`, marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: t.inputColor, marginBottom: 12 }}>
              <span>Total</span><span>₹{cartTotal.toLocaleString()}</span>
            </div>
            <button onClick={() => { setCart(new Set()); setSimpleCart([]) }} style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>Clear cart</button>
            <button style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Proceed to Checkout →</button>
          </>
        }
      </div>
    </div>

    {view3D && <SeatView3D section={view3D} fieldType={venue.field} onClose={() => setView3D(null)} />}
  </>
  )
}


