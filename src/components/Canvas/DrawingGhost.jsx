import React from 'react'
import { arcPath } from '../../utils/geometry'

const THICKNESS = 80  // default ring thickness in SVG units

export function ArcGhost({ drawingState }) {
  if (!drawingState) return null
  const { startAngle, currentAngle, innerR, outerR } = drawingState
  if (currentAngle == null) return null

  const d = arcPath(startAngle, currentAngle, innerR, outerR)
  return (
    <path
      d={d}
      fill="#60a5fa" fillOpacity={0.3}
      stroke="#60a5fa" strokeWidth={1.5}
      strokeDasharray="6 3"
      style={{ pointerEvents: 'none' }}
    />
  )
}

export function RectGhost({ drawingState }) {
  if (!drawingState?.x1) return null
  const { x1, y1, x2, y2 } = drawingState
  const x = Math.min(x1, x2), y = Math.min(y1, y2)
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  return (
    <rect
      x={x} y={y} width={w} height={h}
      fill="#60a5fa" fillOpacity={0.2}
      stroke="#60a5fa" strokeWidth={1.5}
      strokeDasharray="6 3"
      rx={4}
      style={{ pointerEvents: 'none' }}
    />
  )
}

export function PolyGhost({ drawingState }) {
  if (!drawingState?.points?.length) return null
  const { points, mouse } = drawingState
  const all = mouse ? [...points, mouse] : points
  if (all.length < 2) {
    // just a dot at first point
    return <circle cx={points[0].x} cy={points[0].y} r={4} fill="#60a5fa" style={{ pointerEvents: 'none' }} />
  }
  const d = 'M ' + all.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} fill="#60a5fa" fillOpacity={0.15} stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="6 3" />
      {/* vertex dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 6 : 4}
          fill={i === 0 ? '#fff' : '#60a5fa'} stroke="#1d4ed8" strokeWidth={1.5} />
      ))}
    </g>
  )
}
