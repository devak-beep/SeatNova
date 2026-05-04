import React, { useMemo } from 'react'
import { generateRectSeats } from '../../utils/geometry'

const HANDLES = [
  { id: 'nw', cx: 0,   cy: 0,   cursor: 'nw-resize' },
  { id: 'n',  cx: 0.5, cy: 0,   cursor: 'n-resize'  },
  { id: 'ne', cx: 1,   cy: 0,   cursor: 'ne-resize' },
  { id: 'e',  cx: 1,   cy: 0.5, cursor: 'e-resize'  },
  { id: 'se', cx: 1,   cy: 1,   cursor: 'se-resize' },
  { id: 's',  cx: 0.5, cy: 1,   cursor: 's-resize'  },
  { id: 'sw', cx: 0,   cy: 1,   cursor: 'sw-resize' },
  { id: 'w',  cx: 0,   cy: 0.5, cursor: 'w-resize'  },
]

export default function RectSection({ section, selected, multiSelected, onPointerDown, onContextMenu, onToggleBlockSeat }) {
  const { x, y, w, h, color, label, rotation = 0, blockedSeats = [], showSeats = true } = section
  const cx = x + w / 2, cy = y + h / 2
  const hs = Math.max(5, Math.min(w, h) * 0.04)

  const { seats, seatR } = useMemo(() => generateRectSeats(section), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, y, w, h, JSON.stringify(section.rowGroups)])

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <rect
        x={x} y={y} width={w} height={h}
        fill={color} fillOpacity={selected ? 0.85 : multiSelected ? 0.75 : 0.6}
        stroke={selected ? '#fff' : multiSelected ? '#f59e0b' : '#1e293b'}
        strokeWidth={selected ? 2 : multiSelected ? 2.5 : 1}
        rx={4}
        style={{ cursor: 'move' }}
        onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'move', null) }}
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

      <text
        x={cx} y={cy}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.max(8, Math.min(w, h) * 0.12)} fill="#fff" fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >{label}</text>

      {selected && <>
        {/* Resize handles */}
        {HANDLES.map(h_ => (
          <rect key={h_.id}
            x={x + h_.cx * w - hs} y={y + h_.cy * h - hs}
            width={hs * 2} height={hs * 2} rx={hs * 0.3}
            fill="#fff" stroke="#1d4ed8" strokeWidth={Math.max(1.5, hs * 0.15)}
            data-handle="1"
            style={{ cursor: h_.cursor }}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'resize', h_.id) }}
          />
        ))}
        {/* Rotation handle — above top-center */}
        <line x1={cx} y1={y} x2={cx} y2={y - hs * 3} stroke="#fff" strokeWidth={Math.max(1, hs * 0.1)} strokeDasharray={`${hs} ${hs * 0.5}`} style={{ pointerEvents: 'none' }} />
        <circle cx={cx} cy={y - hs * 3} r={hs}
          fill="#7c3aed" stroke="#fff" strokeWidth={Math.max(1.5, hs * 0.15)}
          data-handle="1"
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'rotate', null) }}
        />
      </>}
    </g>
  )
}
