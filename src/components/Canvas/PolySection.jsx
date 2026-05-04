import React, { useMemo } from 'react'
import { generatePolySeats } from '../../utils/geometry'

export default function PolySection({ section, selected, multiSelected, onClick, onPointerDown, onPointPointerDown, onContextMenu, onToggleBlockSeat }) {
  const { points, color, label, rotation = 0, blockedSeats = [], showSeats = true } = section

  const d = points?.length ? 'M ' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') + ' Z' : ''
  const cx = points?.length ? points.reduce((s, p) => s + p.x, 0) / points.length : 0
  const cy = points?.length ? points.reduce((s, p) => s + p.y, 0) / points.length : 0
  const xs = points?.length ? points.map(p => p.x) : [0]
  const ys = points?.length ? points.map(p => p.y) : [0]
  const minY = Math.min(...ys)
  const hs = Math.max(6, (Math.max(...xs) - Math.min(...xs)) * 0.02)

  const { seats, seatR } = useMemo(() => generatePolySeats(section), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(points), JSON.stringify(section.rowGroups)])

  if (!points?.length) return null

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <path
        d={d}
        fill={color} fillOpacity={selected ? 0.85 : multiSelected ? 0.75 : 0.6}
        stroke={selected ? '#fff' : multiSelected ? '#f59e0b' : '#1e293b'}
        strokeWidth={selected ? 2 : multiSelected ? 2.5 : 1}
        style={{ cursor: 'move' }}
        onClick={onClick}
        onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e) }}
        onContextMenu={onContextMenu}
      />

      {/* Seat dots — only when selected */}
      {selected && showSeats && <g>
        {seats.map((s, i) => {
          const blocked = blockedSeats.includes(s.id)
          return (
            <circle key={i} cx={s.x} cy={s.y} r={seatR * 1.1}
              fill={blocked ? '#ef4444' : (s.color || '#fff')}
              fillOpacity={blocked ? 0.9 : 0.85}
              stroke={blocked ? '#b91c1c' : 'rgba(0,0,0,0.2)'}
              strokeWidth={seatR * 0.2}
              style={{ cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); onToggleBlockSeat?.(s.id) }}
            />
          )
        })}
      </g>}

      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fill="#fff" fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {label}
      </text>

      {/* Rotation handle */}
      {selected && <>
        <line x1={cx} y1={minY} x2={cx} y2={minY - hs * 3} stroke="#fff" strokeWidth={Math.max(1, hs * 0.1)} strokeDasharray={`${hs} ${hs * 0.5}`} style={{ pointerEvents: 'none' }} />
        <circle cx={cx} cy={minY - hs * 3} r={hs}
          fill="#7c3aed" stroke="#fff" strokeWidth={Math.max(1.5, hs * 0.15)}
          data-handle="1"
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'rotate') }}
        />
      </>}
      {selected && points.map((p, i) => {
        const xs = points.map(pt => pt.x), ys = points.map(pt => pt.y)
        const size = Math.max(6, (Math.max(...xs) - Math.min(...xs)) * 0.02)
        return (
          <rect key={i}
            x={p.x - size} y={p.y - size} width={size * 2} height={size * 2} rx={size * 0.3}
            fill="#fff" stroke="#1d4ed8" strokeWidth={Math.max(1.5, size * 0.15)}
            data-handle="1"
            style={{ cursor: 'move' }}
            onPointerDown={(e) => { e.stopPropagation(); onPointPointerDown(e, i) }}
          />
        )
      })}
    </g>
  )
}
