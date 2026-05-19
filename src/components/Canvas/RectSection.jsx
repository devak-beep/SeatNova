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

export default function RectSection({
  section, selected, multiSelected,
  onPointerDown, onContextMenu,
  onToggleBlockSeat, onToggleRemoveSeat, onToggleBlockRow,
  selectedRowIdx, selectedRowIdxs = [], onSelectRow, rowSelectMode, blockRowMode,
}) {
  const { x, y, w, h, color, label, rotation = 0, blockedSeats = [], removedSeats = [], showSeats = true } = section
  const cx = x + w / 2, cy = y + h / 2
  const hs = Math.max(5, Math.min(w, h) * 0.04)

  const { seats, seatR } = useMemo(() => generateRectSeats(section),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, y, w, h, section.seatSize, section.seatRowGap, section.seatColGap,
     JSON.stringify(section.rowGroups), JSON.stringify(section.colGroups),
     JSON.stringify(section.gridLayout), JSON.stringify(section.removedSeats),
     JSON.stringify(section.rowCurves)])

  // Group seats by row for curve handle positioning
  const rowMap = useMemo(() => {
    const map = {}
    seats.forEach(s => {
      if (!map[s.rowIdx]) map[s.rowIdx] = []
      map[s.rowIdx].push(s)
    })
    return map
  }, [seats])

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
          const removed = s.removed || removedSeats.includes(s.id)
          const rowSelected = selectedRowIdxs.includes(s.rowIdx)
          return (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r={seatR * 1.1}
                fill={removed ? '#6b7280' : blocked ? '#ef4444' : (s.color || '#fff')}
                fillOpacity={removed ? 0.3 : blocked ? 0.9 : 0.85}
                stroke={rowSelected ? '#22d3ee' : removed ? '#4b5563' : blocked ? '#b91c1c' : 'rgba(0,0,0,0.2)'}
                strokeWidth={rowSelected ? seatR * 0.4 : seatR * 0.2}
                style={{ cursor: 'pointer' }}
                onPointerDown={e => {
                  e.stopPropagation()
                  if (e.shiftKey) { onToggleRemoveSeat?.(s.id); return }
                  if (rowSelectMode) { onSelectRow?.(s.rowIdx); return }
                  if (blockRowMode) {
                    const rowIds = seats.filter(seat => seat.rowIdx === s.rowIdx).map(seat => seat.id)
                    onToggleBlockRow?.(rowIds)
                    return
                  }
                  onToggleBlockSeat?.(s.id)
                }}
              />
              {removed && <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="middle" fontSize={seatR * 1.5} fill="#ef4444" fontWeight="700" style={{ pointerEvents: 'none' }}>✕</text>}
            </g>
          )
        })}

        {/* Curve handle for selected row — only in row select mode, no gridLayout */}
        {rowSelectMode && !section.gridLayout?.blocks?.length && selectedRowIdx != null && rowMap[selectedRowIdx] && (() => {
          const rowSeats = rowMap[selectedRowIdx]
          const midSeat = rowSeats[Math.floor(rowSeats.length / 2)]
          const hx = midSeat.x
          const hy = midSeat.y - seatR * 3
          return (
            <>
              <line x1={hx} y1={midSeat.y - seatR * 1.2} x2={hx} y2={hy + seatR}
                stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 2" style={{ pointerEvents: 'none' }} />
              <rect
                x={hx - seatR} y={hy - seatR}
                width={seatR * 2} height={seatR * 2}
                fill="#22d3ee" stroke="#fff" strokeWidth={1.5}
                transform={`rotate(45, ${hx}, ${hy})`}
                style={{ cursor: 'ns-resize' }}
                onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'rect-row-curve', selectedRowIdx) }}
              />
            </>
          )
        })()}
      </g>}

      <text
        x={cx} y={cy}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.max(8, Math.min(w, h) * 0.12)} fill="#fff" fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >{label}</text>

      {selected && <>
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
