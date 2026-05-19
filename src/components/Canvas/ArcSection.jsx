import React, { useMemo } from 'react'
import { arcPath, arcCentroid, polar, generateArcSeats, CX, CY } from '../../utils/geometry'

export default function ArcSection({ section, selected, multiSelected, onClick, onHandlePointerDown, onContextMenu, onToggleBlockSeat }) {
  const { startAngle, endAngle, innerR, outerR, color, label, blockedSeats = [], showSeats = true } = section
  const cx = section.cx ?? CX, cy = section.cy ?? CY
  const H = Math.max(7, outerR * 0.025)  // scale handle size with section

  let sweep = endAngle - startAngle
  if (sweep <= 0) sweep += 360
  const midAngle = startAngle + sweep / 2

  const d = arcPath(startAngle, endAngle, innerR, outerR, cx, cy)
  const c = arcCentroid(startAngle, endAngle, innerR, outerR, cx, cy)

  const startOuter = polar(startAngle, outerR, cx, cy)
  const endOuter   = polar(endAngle,   outerR, cx, cy)
  const midOuter   = polar(midAngle,   outerR, cx, cy)
  const midInner   = polar(midAngle,   innerR, cx, cy)

  const { seats, seatR } = useMemo(() => generateArcSeats(section), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startAngle, endAngle, innerR, outerR, cx, cy, section.rowSpacing, section.colSpacing, JSON.stringify(section.rowGroups), JSON.stringify(section.colGroups), JSON.stringify(section.gridLayout)])

  return (
    <g>
      <path
        d={d}
        fill={color} fillOpacity={selected ? 0.85 : multiSelected ? 0.75 : 0.6}
        stroke={selected ? '#fff' : multiSelected ? '#f59e0b' : '#1e293b'}
        strokeWidth={selected ? 2 : multiSelected ? 2.5 : 1}
        style={{ cursor: 'move' }}
        onPointerDown={(e) => { e.stopPropagation(); onHandlePointerDown(e, 'move') }}
        onContextMenu={onContextMenu}
      />
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
      <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.max(8, innerR * 0.06)} fill="#fff" fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >{label}</text>

      {selected && <>
        <Handle H={H} x={midOuter.x} y={midOuter.y} cursor="ns-resize" onPointerDown={(e) => onHandlePointerDown(e, 'outerR')} />
        <Handle H={H} x={midInner.x} y={midInner.y} cursor="ns-resize" onPointerDown={(e) => onHandlePointerDown(e, 'innerR')} />
        <Handle H={H} x={startOuter.x} y={startOuter.y} cursor="ew-resize" onPointerDown={(e) => onHandlePointerDown(e, 'startAngle')} />
        <Handle H={H} x={endOuter.x} y={endOuter.y} cursor="ew-resize" onPointerDown={(e) => onHandlePointerDown(e, 'endAngle')} />
      </>}
    </g>
  )
}

function Handle({ H, x, y, cursor, onPointerDown }) {
  return (
    <rect x={x - H} y={y - H} width={H * 2} height={H * 2} rx={H * 0.3}
      fill="#fff" stroke="#1d4ed8" strokeWidth={Math.max(1.5, H * 0.15)}
      data-handle="1"
      style={{ cursor }}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e) }}
    />
  )
}
