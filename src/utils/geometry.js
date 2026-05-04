export const CX = 500
export const CY = 500
export const MAX_R = 450

/** Get dynamic center and max radius from canvasSize */
export function getCanvasParams(canvasSize = 1000) {
  const cx = canvasSize / 2
  return { cx, cy: cx, maxR: cx * 0.9 }
}

/** Polar → SVG cartesian. angleDeg: 0=top, clockwise. r: actual SVG units */
export function polar(angleDeg, r, cx = CX, cy = CY) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

/** SVG donut-arc path. All radii in SVG units (not normalized) */
export function arcPath(startAngle, endAngle, innerR, outerR, cx = CX, cy = CY) {
  let sweep = endAngle - startAngle
  if (sweep <= 0) sweep += 360
  if (sweep >= 360) sweep = 359.99

  const large = sweep > 180 ? 1 : 0
  const end = startAngle + sweep

  const os  = polar(startAngle, outerR, cx, cy)
  const oe  = polar(end,        outerR, cx, cy)
  const ie  = polar(end,        innerR, cx, cy)
  const is_ = polar(startAngle, innerR, cx, cy)

  const xy = ({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`

  return [
    `M ${xy(os)}`,
    `A ${outerR.toFixed(2)} ${outerR.toFixed(2)} 0 ${large} 1 ${xy(oe)}`,
    `L ${xy(ie)}`,
    `A ${innerR.toFixed(2)} ${innerR.toFixed(2)} 0 ${large} 0 ${xy(is_)}`,
    'Z',
  ].join(' ')
}

/** Label centroid of an arc section */
export function arcCentroid(startAngle, endAngle, innerR, outerR, cx = CX, cy = CY) {
  let sweep = endAngle - startAngle
  if (sweep <= 0) sweep += 360
  const midAngle = startAngle + sweep / 2
  const midR = (innerR + outerR) / 2
  return polar(midAngle, midR, cx, cy)
}

/** SVG-space point from a pointer event */
export function svgPoint(e, svgEl) {
  const rect = svgEl.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width)  * 1000,
    y: ((e.clientY - rect.top)  / rect.height) * 1000,
  }
}

/** Angle in degrees (0=top, clockwise) from canvas center to point */
export function angleFromCenter(x, y, cx = CX, cy = CY) {
  const dx = x - cx
  const dy = y - cy
  let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90
  if (deg < 0) deg += 360
  return deg
}

/** Distance from canvas center to point, in SVG units */
export function distFromCenter(x, y, cx = CX, cy = CY) {
  const dx = x - cx
  const dy = y - cy
  return Math.sqrt(dx * dx + dy * dy)
}

/** Get flat list of rows from rowGroups: [{rows, seatsPerRow}] → [{seatsPerRow}, ...] */
const MAX_RENDER_SEATS = 3000  // cap to prevent DOM overload

function expandRows(sec) {
  const groups = sec.rowGroups
  if (!groups?.length) {
    const total = sec.totalSeats || 0
    const rows = Math.max(1, Math.round(Math.sqrt(total)))
    return Array(rows).fill({ seatsPerRow: Math.ceil(total / rows), spacing: 1, color: null })
  }
  return groups.flatMap(g => Array(Math.max(1, g.rows || 1)).fill({
    seatsPerRow: Math.max(1, g.seatsPerRow || 1),
    spacing: g.spacing ?? 1,
    color: g.color || null,   // per-group color override
  }))
}

/** Generate seat positions for an arc section using rowGroups */
export function generateArcSeats(sec) {
  const rows = expandRows(sec)
  if (!rows.length) return { seats: [], seatR: 2 }
  const cx = sec.cx ?? CX, cy = sec.cy ?? CY

  let sweep = sec.endAngle - sec.startAngle
  if (sweep <= 0) sweep += 360

  const inset = sec.innerR * 0.03
  const radialSpan = sec.outerR - sec.innerR - inset * 2
  const rowStep = rows.length > 1 ? radialSpan / (rows.length - 1) : radialSpan
  const maxSeatsPerRow = Math.max(...rows.map(r => r.seatsPerRow))
  const innerArcLen = sec.innerR * sweep * (Math.PI / 180)
  const colSpacing = maxSeatsPerRow > 1 ? innerArcLen / (maxSeatsPerRow - 1) : innerArcLen
  const seatR = Math.max(0.5, Math.min(colSpacing, rowStep) * 0.35)

  const seats = []
  rows.forEach((row, ri) => {
    if (seats.length >= MAX_RENDER_SEATS) return
    const r = sec.innerR + inset + rowStep * ri
    const angInset = inset / r
    const startRad = (sec.startAngle - 90) * (Math.PI / 180) + angInset
    const endRad   = (sec.startAngle + sweep - 90) * (Math.PI / 180) - angInset
    const span = endRad - startRad
    if (span <= 0) return
    const c = Math.max(1, row.seatsPerRow)
    const sp = row.spacing ?? 1
    const arcLen = r * span
    const baseStep = c > 1 ? arcLen / (c - 1) : arcLen
    const step = baseStep * sp / r
    const totalSpan = step * (c - 1)
    const startOffset = (span - totalSpan) / 2
    for (let s = 0; s < c && seats.length < MAX_RENDER_SEATS; s++) {
      const angle = startRad + startOffset + step * s
      seats.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, id: `${sec.label}-Row${ri+1}-Seat${s+1}`, color: row.color })
    }
  })
  return { seats, seatR }
}

/** Generate seat positions for a rect section using rowGroups */
export function generateRectSeats(sec) {
  const rows = expandRows(sec)
  if (!rows.length) return { seats: [], seatR: 2 }

  const inset = 6
  const uw = sec.w - inset * 2, uh = sec.h - inset * 2
  const rowStep = rows.length > 1 ? uh / (rows.length - 1) : uh
  const maxSeatsPerRow = Math.max(...rows.map(r => r.seatsPerRow))
  const baseColStep = maxSeatsPerRow > 1 ? uw / (maxSeatsPerRow - 1) : uw
  const seatR = Math.max(0.5, Math.min(baseColStep / 2, rowStep / 2) * 0.9)

  const seats = []
  rows.forEach((row, ri) => {
    const y = sec.y + inset + rowStep * ri
    const c = Math.max(1, row.seatsPerRow)
    const sp = row.spacing ?? 1
    const colStep = c > 1 ? baseColStep * sp : 0
    const totalW = colStep * (c - 1)
    const startX = sec.x + inset + (uw - totalW) / 2
    for (let s = 0; s < c; s++)
      seats.push({ x: startX + colStep * s, y, id: `${sec.label}-Row${ri+1}-Seat${s+1}`, color: row.color })
  })
  return { seats, seatR }
}

/** Generate seat positions for a poly section using rowGroups */
export function generatePolySeats(sec) {
  const { points } = sec
  if (!points?.length) return { seats: [], seatR: 2 }
  const rows = expandRows(sec)
  if (!rows.length) return { seats: [], seatR: 2 }

  const ys = points.map(p => p.y)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rowStep = rows.length > 1 ? (maxY - minY) / (rows.length - 1) : (maxY - minY)
  const maxSeatsPerRow = Math.max(...rows.map(r => r.seatsPerRow))
  const spanWidth = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))
  const colSpacing = maxSeatsPerRow > 1 ? spanWidth / (maxSeatsPerRow - 1) : spanWidth
  const seatR = Math.max(0.5, Math.min(colSpacing / 2, rowStep / 2) * 0.9)

  const seats = []
  rows.forEach((row, ri) => {
    const y = minY + rowStep * ri
    const xs = polyXsAtY(points, y)
    if (xs.length < 2) return
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const c = Math.max(1, row.seatsPerRow)
    const colStep = c > 1 ? (xMax - xMin) / (c - 1) : 0
    for (let s = 0; s < c; s++)
      seats.push({ x: xMin + colStep * s, y })
  })
  return { seats, seatR }
}

function polyXsAtY(pts, y) {
  const xs = []
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const yi = pts[i].y, yj = pts[j].y
    if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
      xs.push(pts[i].x + (y - yi) / (yj - yi) * (pts[j].x - pts[i].x))
    }
  }
  return xs
}

